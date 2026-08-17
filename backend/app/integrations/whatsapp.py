"""WhatsApp Business API integration with delivery logging.

MOHD.HMS ENTERPRISE

Uses the Meta WhatsApp Business Cloud API to send messages and templates.
Graceful degradation: if WhatsApp is not configured, all methods
log a warning and continue.

All sent messages are logged to the WhatsAppDeliveryLog table.

Singleton access via get_whatsapp_service().
"""

from __future__ import annotations

import uuid
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.database import insert_record
from app.core.logging import get_logger
from app.utils.helpers import utcnow

log = get_logger(__name__)

# ── Singleton ──────────────────────────────────────────────────────────────────

_instance: WhatsAppService | None = None


def get_whatsapp_service() -> WhatsAppService:
    """Return the singleton WhatsAppService.

    If WhatsApp is not configured, returns a no-op service.
    """
    global _instance
    if _instance is not None:
        return _instance

    settings = get_settings()
    _instance = WhatsAppService(
        api_url=settings.whatsapp_api_url,
        token=settings.whatsapp_token,
        is_configured=settings.whatsapp_configured,
    )
    return _instance


# ── Service ─────────────────────────────────────────────────────────────────────


class WhatsAppService:
    """WhatsApp Business API service for sending messages and templates.

    Uses the Meta WhatsApp Business Cloud API (v18.x+).
    When not configured, all operations are logged but not sent.
    """

    def __init__(
        self,
        api_url: str | None,
        token: str | None,
        is_configured: bool,
    ) -> None:
        self._api_url = (api_url or "").rstrip("/")
        self._token = token
        self._is_configured = is_configured
        self._client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {token}" if token else "",
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(15.0, connect=5.0),
        )

        if not is_configured:
            log.warning("WhatsApp not configured — messages will be logged but not sent")

    @property
    def is_configured(self) -> bool:
        return self._is_configured

    async def close(self) -> None:
        """Close the underlying httpx client."""
        await self._client.aclose()

    async def send_message(
        self,
        to_number: str,
        message: str,
        tenant_id: str | None = None,
        user_id: str | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
    ) -> dict[str, Any] | None:
        """Send a text message via WhatsApp.

        Args:
            to_number:   Recipient phone number (with country code).
            message:     Text message body.
            tenant_id:   Tenant ID for logging.
            user_id:     Sender user ID for logging.
            entity_type: Related entity type.
            entity_id:   Related entity ID.

        Returns:
            API response dict with message ID, or None on failure.
        """
        log.info(
            f"Sending WhatsApp message to {to_number[:4]}***",
            extra={"extra_fields": {
                "to": to_number[:4] + "***",
                "entity_type": entity_type,
                "entity_id": entity_id,
            }},
        )

        api_response: dict[str, Any] | None = None
        status = "sent"
        error_msg: str | None = None

        if self._is_configured:
            try:
                payload = {
                    "messaging_product": "whatsapp",
                    "to": to_number,
                    "type": "text",
                    "text": {"body": message},
                }

                response = await self._client.post(
                    f"{self._api_url}/messages",
                    json=payload,
                )

                if response.status_code in (200, 201):
                    data = response.json()
                    api_response = {
                        "message_id": data.get("messages", [{}])[0].get("id") if data.get("messages") else None,
                    }
                else:
                    status = "failed"
                    error_msg = f"API {response.status_code}: {response.text}"
                    log.error(f"WhatsApp send failed: {error_msg}")
            except Exception as exc:
                status = "failed"
                error_msg = str(exc)
                log.error(f"WhatsApp send error: {exc}")
        else:
            log.info(f"WhatsApp stub mode: would send to {to_number[:4]}***")
            status = "stub"

        # Log delivery
        await self._log_delivery(
            tenant_id=tenant_id,
            user_id=user_id,
            to_number=to_number,
            message=message,
            message_type="text",
            status=status,
            error=error_msg,
            api_response=api_response,
            entity_type=entity_type,
            entity_id=entity_id,
        )

        return api_response

    async def send_template(
        self,
        to_number: str,
        template_name: str,
        variables: dict[str, str] | None = None,
        tenant_id: str | None = None,
        user_id: str | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
    ) -> dict[str, Any] | None:
        """Send a template message via WhatsApp.

        Args:
            to_number:     Recipient phone number.
            template_name: WhatsApp template name.
            variables:     Template variable substitutions.
            tenant_id:     Tenant ID for logging.
            user_id:       Sender user ID for logging.
            entity_type:   Related entity type.
            entity_id:     Related entity ID.

        Returns:
            API response dict with message ID, or None on failure.
        """
        log.info(
            f"Sending WhatsApp template '{template_name}' to {to_number[:4]}***",
            extra={"extra_fields": {
                "template": template_name,
                "to": to_number[:4] + "***",
            }},
        )

        api_response: dict[str, Any] | None = None
        status = "sent"
        error_msg: str | None = None

        if self._is_configured:
            try:
                # Build template components from variables
                components: list[dict[str, Any]] = []
                if variables:
                    # Build a single body component with all params
                    param_values = []
                    for key, value in variables.items():
                        param_values.append({"type": "text", "text": str(value)})

                    if param_values:
                        components.append({
                            "type": "body",
                            "parameters": param_values,
                        })

                payload = {
                    "messaging_product": "whatsapp",
                    "to": to_number,
                    "type": "template",
                    "template": {
                        "name": template_name,
                        "language": {"code": "en"},
                    },
                }
                if components:
                    payload["template"]["components"] = components

                response = await self._client.post(
                    f"{self._api_url}/messages",
                    json=payload,
                )

                if response.status_code in (200, 201):
                    data = response.json()
                    api_response = {
                        "message_id": data.get("messages", [{}])[0].get("id") if data.get("messages") else None,
                    }
                else:
                    status = "failed"
                    error_msg = f"API {response.status_code}: {response.text}"
                    log.error(f"WhatsApp template send failed: {error_msg}")
            except Exception as exc:
                status = "failed"
                error_msg = str(exc)
                log.error(f"WhatsApp template send error: {exc}")
        else:
            log.info(f"WhatsApp stub mode: would send template '{template_name}' to {to_number[:4]}***")
            status = "stub"

        # Log delivery
        await self._log_delivery(
            tenant_id=tenant_id,
            user_id=user_id,
            to_number=to_number,
            message=template_name,
            message_type="template",
            status=status,
            error=error_msg,
            api_response=api_response,
            entity_type=entity_type,
            entity_id=entity_id,
        )

        return api_response

    async def _log_delivery(
        self,
        tenant_id: str | None,
        user_id: str | None,
        to_number: str,
        message: str,
        message_type: str,
        status: str,
        error: str | None = None,
        api_response: dict[str, Any] | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
    ) -> None:
        """Log a WhatsApp delivery attempt to WhatsAppDeliveryLog (fire-and-forget).

        Never raises — errors are logged only.
        """
        try:
            record: dict[str, Any] = {
                "id": str(uuid.uuid4()),
                "toNumber": to_number,
                "message": message,
                "messageType": message_type,
                "status": status,
            }
            if tenant_id:
                record["tenantId"] = tenant_id
            if user_id:
                record["userId"] = user_id
            if error:
                record["error"] = error
            if api_response:
                import json
                record["apiResponse"] = json.dumps(api_response)
            if entity_type:
                record["entityType"] = entity_type
            if entity_id:
                record["entityId"] = entity_id
            record["createdAt"] = utcnow().isoformat()

            await insert_record("whatsappDeliveryLog", record)
        except Exception as exc:
            log.warning(f"Failed to log WhatsApp delivery: {exc}")
