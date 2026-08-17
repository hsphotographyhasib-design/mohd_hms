"""Firebase FCM integration for push notifications.

MOHD.HMS ENTERPRISE

Uses firebase-admin for FCM. Graceful degradation: if Firebase
is not configured, all methods log a warning and continue.

Singleton access via get_firebase().
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.config import get_settings
from app.core.database import insert_record, query_table
from app.core.exceptions import InternalException, ServiceUnavailableException
from app.core.logging import get_logger
from app.utils.helpers import utcnow

log = get_logger(__name__)

# FCM multicast limit
MAX_MULTICAST_TOKENS = 500

# ── Singleton ──────────────────────────────────────────────────────────────────

_instance: FirebaseService | None = None
_initialized = False


def get_firebase() -> FirebaseService:
    """Return the singleton FirebaseService.

    If Firebase is not configured, returns a no-op service
    that logs warnings but never raises.
    """
    global _instance, _initialized
    if _initialized and _instance is not None:
        return _instance

    settings = get_settings()
    _instance = FirebaseService(
        project_id=settings.firebase_project_id,
        client_email=settings.firebase_client_email,
        private_key=settings.firebase_private_key,
        is_configured=settings.firebase_configured,
    )
    _initialized = True
    return _instance


# ── Service ─────────────────────────────────────────────────────────────────────


class FirebaseService:
    """Firebase Cloud Messaging service for push notifications.

    Supports single and multicast (batched at 500 tokens) push notifications,
    device token management, and notification logging.
    """

    def __init__(
        self,
        project_id: str | None,
        client_email: str | None,
        private_key: str | None,
        is_configured: bool,
    ) -> None:
        self._project_id = project_id
        self._client_email = client_email
        self._private_key = private_key
        self._is_configured = is_configured
        self._app = None
        self._messaging = None

        if is_configured:
            try:
                self._initialize_firebase()
            except Exception as exc:
                log.warning(f"Firebase initialization failed (push notifications disabled): {exc}")
                self._is_configured = False
        else:
            log.warning("Firebase not configured — push notifications disabled")

    def _initialize_firebase(self) -> None:
        """Initialize the firebase-admin SDK with service account credentials."""
        try:
            import firebase_admin
            from firebase_admin import credentials, messaging

            # Build the service account dict from env vars
            # The private key may contain escaped newlines
            private_key = self._private_key or ""
            # Replace literal \n with actual newlines
            if "\\n" in private_key and "\n" not in private_key:
                private_key = private_key.replace("\\n", "\n")

            cred_dict = {
                "type": "service_account",
                "project_id": self._project_id,
                "private_key_id": "",  # Not required for admin SDK
                "private_key": private_key,
                "client_email": self._client_email,
                "client_id": "",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }

            cred = credentials.Certificate(cred_dict)

            if not firebase_admin._apps:
                self._app = firebase_admin.initialize_app(cred)
            else:
                self._app = firebase_admin.get_app()

            self._messaging = messaging
            log.info("Firebase Admin SDK initialized")
        except ImportError:
            log.warning("firebase-admin package not installed — push notifications disabled")
            self._is_configured = False

    @property
    def is_configured(self) -> bool:
        return self._is_configured and self._messaging is not None

    async def send_notification(
        self,
        user_id: str,
        title: str,
        message: str,
        data: dict[str, Any] | None = None,
        tenant_id: str | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
    ) -> bool:
        """Send a push notification to a user.

        Looks up the user's device tokens and sends to all of them.
        Also creates a Notification record in the database.

        Args:
            user_id:     Target user ID.
            title:       Notification title.
            message:     Notification body.
            data:        Arbitrary payload data.
            tenant_id:   Tenant ID (for DB record).
            entity_type: Related entity type.
            entity_id:   Related entity ID.

        Returns:
            True if at least one notification was sent successfully.
        """
        if not self.is_configured:
            log.debug(f"Firebase not configured, skipping notification to user {user_id}")
            return False

        # Look up device tokens for the user
        try:
            tokens_result = await query_table(
                "deviceToken",
                select="token,platform",
                where={"userId": user_id, "isActive": True},
            )
            token_records = tokens_result.get("data", [])
        except Exception as exc:
            log.warning(f"Failed to fetch device tokens for user {user_id}: {exc}")
            return False

        if not token_records:
            log.debug(f"No active device tokens for user {user_id}")
            return False

        tokens = [r["token"] for r in token_records if r.get("token")]
        if not tokens:
            return False

        # Send multicast
        success = await self.send_multicast(
            tokens=tokens,
            title=title,
            message=message,
            data=data,
        )

        # Create Notification record in database (fire-and-forget)
        if success and tenant_id:
            await self._create_notification_record(
                tenant_id=tenant_id,
                user_id=user_id,
                title=title,
                message=message,
                data=data,
                entity_type=entity_type,
                entity_id=entity_id,
            )

        return success

    async def send_multicast(
        self,
        tokens: list[str],
        title: str,
        message: str,
        data: dict[str, Any] | None = None,
    ) -> bool:
        """Send a push notification to multiple device tokens.

        Batches tokens in groups of 500 (FCM limit).

        Args:
            tokens:  List of FCM device tokens.
            title:   Notification title.
            message: Notification body.
            data:    Arbitrary payload data.

        Returns:
            True if at least one token received the notification.
        """
        if not self.is_configured:
            return False

        if not tokens:
            return False

        any_success = False
        messaging = self._messaging

        # Build the notification message
        notification = messaging.Notification(
            title=title,
            body=message,
        )

        # Batch in groups of MAX_MULTICAST_TOKENS
        for i in range(0, len(tokens), MAX_MULTICAST_TOKENS):
            batch = tokens[i : i + MAX_MULTICAST_TOKENS]
            try:
                multicast_msg = messaging.MulticastMessage(
                    notification=notification,
                    tokens=batch,
                    data={k: str(v) for k, v in (data or {}).items()},
                )
                response = messaging.send_each_for_multicast(multicast_msg)

                if response.success_count > 0:
                    any_success = True
                    log.info(
                        f"FCM multicast: {response.success_count}/{len(batch)} succeeded",
                        extra={"extra_fields": {
                            "batch_size": len(batch),
                            "success_count": response.success_count,
                            "failure_count": response.failure_count,
                        }},
                    )

                # Log failed tokens for cleanup
                if response.failure_count > 0:
                    failed_tokens = []
                    for idx, resp in enumerate(response.responses):
                        if not resp.success:
                            failed_tokens.append(batch[idx])
                    log.warning(
                        f"FCM had {len(failed_tokens)} failed tokens",
                        extra={"extra_fields": {
                            "failed_count": len(failed_tokens),
                        }},
                    )
            except Exception as exc:
                log.error(f"FCM multicast failed for batch starting at index {i}: {exc}")

        return any_success

    async def register_device_token(
        self,
        user_id: str,
        token: str,
        platform: str,
        tenant_id: str | None = None,
        app_version: str | None = None,
        device_name: str | None = None,
    ) -> None:
        """Register a device token for push notifications.

        Creates or updates a DeviceToken record in the database.

        Args:
            user_id:      User ID.
            token:        FCM device token.
            platform:     Platform (ios, android, web).
            tenant_id:    Tenant ID.
            app_version:  App version string.
            device_name:  Device name.
        """
        try:
            # Check if token already exists
            existing = await query_table(
                "deviceToken",
                select="id",
                where={"token": token},
                limit=1,
            )
            existing_records = existing.get("data", [])

            record_data: dict[str, Any] = {
                "userId": user_id,
                "token": token,
                "platform": platform,
                "isActive": True,
            }
            if tenant_id:
                record_data["tenantId"] = tenant_id
            if app_version:
                record_data["appVersion"] = app_version
            if device_name:
                record_data["deviceName"] = device_name

            if existing_records:
                # Update existing token
                from app.core.database import update_record
                await update_record("deviceToken", existing_records[0]["id"], record_data)
            else:
                # Create new token record
                record_data["id"] = str(uuid.uuid4())
                record_data["createdAt"] = utcnow().isoformat()
                await insert_record("deviceToken", record_data)

            log.info(f"Device token registered for user {user_id} ({platform})")
        except Exception as exc:
            log.error(f"Failed to register device token: {exc}")
            raise InternalException(message="Failed to register device token") from exc

    async def unregister_device_token(self, token: str) -> None:
        """Unregister (deactivate) a device token.

        Marks the token as inactive rather than deleting it,
        so we can track token history.

        Args:
            token: FCM device token to deactivate.
        """
        try:
            existing = await query_table(
                "deviceToken",
                select="id",
                where={"token": token},
                limit=1,
            )
            existing_records = existing.get("data", [])

            if existing_records:
                from app.core.database import update_record
                await update_record("deviceToken", existing_records[0]["id"], {
                    "isActive": False,
                    "unregisteredAt": utcnow().isoformat(),
                })
                log.info(f"Device token unregistered: {token[:20]}...")
        except Exception as exc:
            log.error(f"Failed to unregister device token: {exc}")

    async def _create_notification_record(
        self,
        tenant_id: str,
        user_id: str,
        title: str,
        message: str,
        data: dict[str, Any] | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
    ) -> None:
        """Create a Notification record in the database (fire-and-forget).

        Never raises — errors are logged only.
        """
        try:
            record = {
                "id": str(uuid.uuid4()),
                "tenantId": tenant_id,
                "userId": user_id,
                "title": title,
                "message": message,
                "channel": "push",
                "isRead": False,
                "data": json.dumps(data or {}),
            }
            if entity_type:
                record["entityType"] = entity_type
            if entity_id:
                record["entityId"] = entity_id
            record["createdAt"] = utcnow().isoformat()

            await insert_record("notification", record)
        except Exception as exc:
            log.warning(f"Failed to create notification record: {exc}")
