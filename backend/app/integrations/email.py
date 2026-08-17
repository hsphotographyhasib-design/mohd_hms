"""Email integration with SMTP support and delivery logging.

MOHD.HMS ENTERPRISE

Supports SMTP via aiosmtplib. Falls back to log-only mode (stub)
if email is not configured.

All sent emails are logged to the EmailLog table.

Singleton access via get_email_service().
"""

from __future__ import annotations

import uuid
from email.message import EmailMessage
from typing import Any

from app.core.config import get_settings
from app.core.database import insert_record, query_table
from app.core.logging import get_logger
from app.utils.helpers import utcnow

log = get_logger(__name__)

# ── Singleton ──────────────────────────────────────────────────────────────────

_instance: EmailService | None = None


def get_email_service() -> EmailService:
    """Return the singleton EmailService.

    If email is not configured, returns a log-only (stub) service.
    """
    global _instance
    if _instance is not None:
        return _instance

    settings = get_settings()
    _instance = EmailService(
        host=settings.email_host,
        port=settings.email_port,
        username=settings.email_username,
        password=settings.email_password,
        is_configured=settings.email_configured,
    )
    return _instance


# ── Service ─────────────────────────────────────────────────────────────────────


class EmailService:
    """Email service with SMTP support and delivery logging.

    When not configured, all send operations are logged but not actually
    sent (stub mode). This allows the rest of the system to function
    without email configured.
    """

    def __init__(
        self,
        host: str | None,
        port: int,
        username: str | None,
        password: str | None,
        is_configured: bool,
    ) -> None:
        self._host = host
        self._port = port
        self._username = username
        self._password = password
        self._is_configured = is_configured

        if not is_configured:
            log.warning("Email not configured — emails will be logged but not sent")

    @property
    def is_configured(self) -> bool:
        return self._is_configured

    async def send_email(
        self,
        to: str | list[str],
        subject: str,
        body: str | None = None,
        html: str | None = None,
        cc: str | list[str] | None = None,
        bcc: str | list[str] | None = None,
        reply_to: str | None = None,
        tenant_id: str | None = None,
        user_id: str | None = None,
    ) -> bool:
        """Send an email.

        Args:
            to:       Recipient(s).
            subject:  Email subject.
            body:     Plain text body.
            html:     HTML body.
            cc:       CC recipient(s).
            bcc:      BCC recipient(s).
            reply_to: Reply-to address.
            tenant_id: Tenant ID for logging.
            user_id:  Sender user ID for logging.

        Returns:
            True if sent (or logged in stub mode), False on error.
        """
        # Normalize recipients
        if isinstance(to, str):
            to = [to]
        cc_list: list[str] = [cc] if isinstance(cc, str) else (cc or [])
        bcc_list: list[str] = [bcc] if isinstance(bcc, str) else (bcc or [])

        log_id = str(uuid.uuid4())[:8]
        log.info(
            f"Sending email [{log_id}] to {len(to)} recipient(s): {subject}",
            extra={"extra_fields": {
                "email_log_id": log_id,
                "recipients": len(to),
                "subject": subject,
            }},
        )

        sent = False
        error_msg: str | None = None

        if self._is_configured:
            try:
                sent = await self._send_smtp(
                    to=to,
                    subject=subject,
                    body=body,
                    html=html,
                    cc=cc_list,
                    bcc=bcc_list,
                    reply_to=reply_to,
                )
            except Exception as exc:
                error_msg = str(exc)
                log.error(f"Email send failed [{log_id}]: {exc}")
                sent = False
        else:
            log.info(f"Email stub mode [{log_id}]: would send to {to}")
            sent = True  # In stub mode, consider it "sent" for logging purposes

        # Log to EmailLog table (fire-and-forget)
        await self._log_email(
            tenant_id=tenant_id,
            user_id=user_id,
            to_addresses=to,
            cc_addresses=cc_list,
            bcc_addresses=bcc_list,
            subject=subject,
            body=body,
            html_body=html,
            status="sent" if sent and not error_msg else "failed",
            error=error_msg,
        )

        return sent

    async def send_template_email(
        self,
        template_id: str,
        to: str | list[str],
        variables: dict[str, Any] | None = None,
        cc: str | list[str] | None = None,
        bcc: str | list[str] | None = None,
        tenant_id: str | None = None,
        user_id: str | None = None,
    ) -> bool:
        """Send an email using a database template.

        Looks up the EmailTemplate record, substitutes variables,
        and sends the result.

        Args:
            template_id: EmailTemplate record ID.
            to:          Recipient(s).
            variables:   Key-value pairs for template substitution.
            cc:          CC recipient(s).
            bcc:         BCC recipient(s).
            tenant_id:   Tenant ID for logging.
            user_id:     Sender user ID for logging.

        Returns:
            True if sent, False on error.
        """
        # Fetch template
        try:
            result = await query_table(
                "emailTemplate",
                where={"id": template_id},
                limit=1,
            )
            templates = result.get("data", [])
            if not templates:
                log.error(f"Email template not found: {template_id}")
                return False

            template = templates[0]
            subject_template = template.get("subject", "")
            body_template = template.get("body", "")
            html_template = template.get("htmlBody", "")

            # Substitute variables
            variables = variables or {}
            subject = self._substitute(subject_template, variables)
            body = self._substitute(body_template, variables) if body_template else None
            html = self._substitute(html_template, variables) if html_template else None

            return await self.send_email(
                to=to,
                subject=subject,
                body=body,
                html=html,
                cc=cc,
                bcc=bcc,
                tenant_id=tenant_id,
                user_id=user_id,
            )

        except Exception as exc:
            log.error(f"Failed to send template email: {exc}")
            return False

    async def _send_smtp(
        self,
        to: list[str],
        subject: str,
        body: str | None = None,
        html: str | None = None,
        cc: list[str] | None = None,
        bcc: list[str] | None = None,
        reply_to: str | None = None,
    ) -> bool:
        """Send email via SMTP using aiosmtplib."""
        try:
            import aiosmtplib
        except ImportError:
            log.warning("aiosmtplib not installed — email sending disabled")
            return False

        # Build the email message
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = self._username or "noreply@hmshms.com"
        msg["To"] = ", ".join(to)
        if cc:
            msg["Cc"] = ", ".join(cc)
        if reply_to:
            msg["Reply-To"] = reply_to

        if html:
            msg.add_alternative(html, subtype="html")
        if body:
            msg.add_alternative(body, subtype="plain")
        elif not html:
            # At least one body is required
            msg.set_content("")

        # Collect all recipients
        all_recipients = list(to)
        if cc:
            all_recipients.extend(cc)
        if bcc:
            all_recipients.extend(bcc)

        await aiosmtplib.send(
            msg,
            hostname=self._host,
            port=self._port,
            username=self._username,
            password=self._password,
            start_tls=True,
            recipients=all_recipients,
        )
        return True

    @staticmethod
    def _substitute(template: str, variables: dict[str, Any]) -> str:
        """Simple {{variable}} template substitution.

        Replaces {{key}} with the value from variables dict.
        """
        result = template
        for key, value in variables.items():
            result = result.replace(f"{{{{{key}}}}}", str(value))
        return result

    async def _log_email(
        self,
        tenant_id: str | None,
        user_id: str | None,
        to_addresses: list[str],
        cc_addresses: list[str],
        bcc_addresses: list[str],
        subject: str,
        body: str | None,
        html_body: str | None,
        status: str,
        error: str | None = None,
    ) -> None:
        """Log an email to the EmailLog table (fire-and-forget).

        Never raises — errors are logged only.
        """
        try:
            record: dict[str, Any] = {
                "id": str(uuid.uuid4()),
                "to": ",".join(to_addresses),
                "cc": ",".join(cc_addresses) if cc_addresses else None,
                "bcc": ",".join(bcc_addresses) if bcc_addresses else None,
                "subject": subject,
                "body": body,
                "htmlBody": html_body,
                "status": status,
            }
            if tenant_id:
                record["tenantId"] = tenant_id
            if user_id:
                record["userId"] = user_id
            if error:
                record["error"] = error
            record["createdAt"] = utcnow().isoformat()

            await insert_record("emailLog", record)
        except Exception as exc:
            log.warning(f"Failed to log email: {exc}")
