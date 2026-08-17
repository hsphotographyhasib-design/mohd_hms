"""RBAC Audit Logging — fire-and-forget access attempt logging.

MOHD.HMS ENTERPRISE

Creates AuditLog records via Supabase PostgREST for every access attempt.
Fire-and-forget: errors are logged but never propagated to the caller.
"""

from __future__ import annotations

import json
from typing import Any

from app.core.database import insert_record
from app.core.logging import get_logger
from app.utils.helpers import utcnow

log = get_logger(__name__)


def _build_audit_record(
    tenant_id: str,
    user_id: str,
    role: str,
    path: str,
    method: str,
    success: bool,
    reason: str | None = None,
    ip_address: str | None = None,
    entity: str | None = None,
    entity_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build an AuditLog record dict."""
    import uuid
    return {
        "id": str(uuid.uuid4()),
        "tenantId": tenant_id,
        "userId": user_id,
        "action": f"{method} {path}",
        "entity": entity or "api_access",
        "entityId": entity_id,
        "details": json.dumps({
            "method": method,
            "path": path,
            "success": success,
            "reason": reason,
            "role": role,
            **(extra or {}),
        }),
        "ipAddress": ip_address,
        "createdAt": utcnow().isoformat(),
    }


async def log_access_attempt(
    tenant_id: str,
    user_id: str,
    role: str,
    path: str,
    method: str,
    success: bool,
    reason: str | None = None,
    ip_address: str | None = None,
    entity: str | None = None,
    entity_id: str | None = None,
) -> None:
    """Log an access attempt to the AuditLog table (fire-and-forget).

    This function never raises exceptions. If the database write fails,
    the error is logged but the calling code is not affected.
    """
    try:
        record = _build_audit_record(
            tenant_id=tenant_id,
            user_id=user_id,
            role=role,
            path=path,
            method=method,
            success=success,
            reason=reason,
            ip_address=ip_address,
            entity=entity,
            entity_id=entity_id,
        )
        await insert_record("auditLog", record)
    except Exception as exc:
        # Fire-and-forget: log but never propagate
        log.warning(f"Failed to write audit log: {exc}")


async def log_permission_denied(
    tenant_id: str,
    user_id: str,
    role: str,
    permission: str,
    path: str,
    method: str,
    ip_address: str | None = None,
) -> None:
    """Convenience wrapper for permission-denied audit entries."""
    await log_access_attempt(
        tenant_id=tenant_id,
        user_id=user_id,
        role=role,
        path=path,
        method=method,
        success=False,
        reason=f"Permission denied: {permission}",
        ip_address=ip_address,
        entity="rbac",
    )
