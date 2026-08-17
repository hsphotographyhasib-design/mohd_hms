"""
Equipment business logic.

MOHD.HMS ENTERPRISE

Implements:
  - RBAC-scoped listing (customer→own, others→tenant wide)
  - Auto-generate assetNumber and QR code on create
  - Bulk QR code generation
  - QR code lookup and regeneration
  - QR scan analytics
  - Cache invalidation
"""

from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from typing import Any

from app.api.dependencies import AuthUser
from app.core.database import (
    MODEL_TO_TABLE,
    count_records,
    delete_record,
    insert_record,
    query_table,
    update_record,
)
from app.core.exceptions import (
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.core.logging import get_logger
from app.integrations.redis import get_redis
from app.rbac.data_scope import NEVER_MATCH, build_data_scope
from app.utils.helpers import build_cache_key, utcnow

log = get_logger(__name__)

# ── Table name constants ─────────────────────────────────────────────────────

EQUIP_TABLE = MODEL_TO_TABLE.get("equipment", "Equipment")
QR_TABLE = MODEL_TO_TABLE.get("equipmentQrCode", "EquipmentQrCode")
USER_TABLE = MODEL_TO_TABLE.get("user", "User")
CUSTOMER_TABLE = MODEL_TO_TABLE.get("customer", "Customer")
SCAN_LOG_TABLE = MODEL_TO_TABLE.get("scanLog", "ScanLog")
TENANT_TABLE = MODEL_TO_TABLE.get("tenant", "Tenant")


# ── Helper: generate asset number ──────────────────────────────────────────


def _generate_asset_number(category: str) -> str:
    """Generate an asset number: CAT-YYYYMMDD-XXXXX."""
    prefix = category[:3].upper() if category else "EQP"
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
    seq = secrets.randbelow(100000)
    return f"{prefix}-{date_part}-{seq:05d}"


# ── Helper: generate QR ID ─────────────────────────────────────────────────


def _generate_qr_id(category: str | None = None) -> str:
    """Generate a unique QR ID: QR-GEN-XXXXXXXXX."""
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    result = "QR-GEN-"
    for _ in range(9):
        result += secrets.choice(chars)
    return result


def _generate_qr_url(domain: str, qr_id: str) -> str:
    """Build the QR URL for scanning."""
    return f"https://{domain}/equipment/{qr_id}"


# ── Helper: resolve customer ID for customer role ───────────────────────────


async def _resolve_customer_id(user: AuthUser) -> str | None:
    try:
        result = await query_table(
            CUSTOMER_TABLE,
            select="id",
            where={"userId": user.userId},
            tenant_id=user.tenantId,
            limit=1,
        )
        rows = result.get("data", [])
        return rows[0]["id"] if rows else None
    except Exception:
        return None


# ── Helper: get tenant domain ───────────────────────────────────────────────


async def _get_tenant_domain(tenant_id: str) -> str:
    try:
        result = await query_table(
            TENANT_TABLE,
            select="domain",
            where={"id": tenant_id},
            limit=1,
        )
        rows = result.get("data", [])
        return rows[0].get("domain", "app.example.com") if rows else "app.example.com"
    except Exception:
        return "app.example.com"


# ── Helper: JSON serialize field ────────────────────────────────────────────


def _json_serialize(val: Any) -> str | None:
    if val is None:
        return None
    if isinstance(val, str):
        return val
    return json.dumps(val)


# ── Helper: JSON deserialize field ──────────────────────────────────────────


def _json_deserialize(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, (list, dict)):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return val
    return val


# ── List Equipment ──────────────────────────────────────────────────────────


async def list_equipment(
    tenant_id: str,
    user: AuthUser,
    params: dict[str, Any],
) -> dict[str, Any]:
    """List equipment with RBAC scoping and pagination."""
    page = params.get("page", 1)
    page_size = min(params.get("pageSize", 20), 100)
    search = params.get("search", "")
    category = params.get("category", "")
    status_filter = params.get("status", "")
    customer_id_filter = params.get("customerId", "")
    offset = (page - 1) * page_size

    # Build RBAC scope
    customer_id = None
    if user.role == "customer":
        customer_id = await _resolve_customer_id(user)

    base_scope = build_data_scope(
        role=user.role,
        user_id=user.userId,
        tenant_id=tenant_id,
        entity="equipment",
        customer_id=customer_id,
    )

    if base_scope is NEVER_MATCH:
        return {"data": [], "total": 0, "page": page, "pageSize": page_size, "totalPages": 0}

    where: dict[str, Any] = dict(base_scope)

    # Apply filters
    if search:
        search_or = [
            {"name": {"contains": search}},
            {"brand": {"contains": search}},
            {"model": {"contains": search}},
            {"assetNumber": {"contains": search}},
            {"location": {"contains": search}},
        ]
        if "OR" in where:
            where["AND"] = [{"OR": where.pop("OR")}, {"OR": search_or}]
        else:
            where["OR"] = search_or

    if category:
        where["category"] = category
    if status_filter:
        where["status"] = status_filter
    if customer_id_filter:
        where["customerId"] = customer_id_filter

    result = await query_table(
        EQUIP_TABLE,
        select="*",
        where=where,
        order="createdAt.desc",
        limit=page_size,
        offset=offset,
        count="exact",
        tenant_id=None,  # Already in where
    )

    rows = result.get("data", [])
    total_str = result.get("count", "0")
    try:
        total = int(total_str) if total_str not in ("*", None) else len(rows)
    except (ValueError, TypeError):
        total = len(rows)

    # Batch-fetch customer names
    cust_ids = {r.get("customerId") for r in rows if r.get("customerId")}
    cust_map: dict[str, str] = {}
    if cust_ids:
        try:
            c_result = await query_table(
                CUSTOMER_TABLE,
                select="id,name,companyName",
                where={"id": {"in": list(cust_ids)}},
                tenant_id=tenant_id,
                limit=len(cust_ids),
            )
            for c in c_result.get("data", []):
                cust_map[c["id"]] = c.get("companyName") or c.get("name") or ""
        except Exception:
            pass

    # Count related records per equipment
    data = []
    for r in rows:
        photos = _json_deserialize(r.get("photos"))
        documents = _json_deserialize(r.get("documents"))
        specifications = _json_deserialize(r.get("specifications"))

        item: dict[str, Any] = {
            "id": r["id"],
            "tenantId": r["tenantId"],
            "customerId": r.get("customerId"),
            "customerName": cust_map.get(r.get("customerId")),
            "name": r.get("name", ""),
            "category": r.get("category", ""),
            "assetNumber": r.get("assetNumber"),
            "qrCode": r.get("qrCode"),
            "qrId": r.get("qrId"),
            "brand": r.get("brand"),
            "model": r.get("model"),
            "serialNumber": r.get("serialNumber"),
            "location": r.get("location"),
            "building": r.get("building"),
            "room": r.get("room"),
            "installDate": r.get("installDate"),
            "warrantyExpiry": r.get("warrantyExpiry"),
            "warrantyInfo": r.get("warrantyInfo"),
            "status": r.get("status", "active"),
            "condition": r.get("condition"),
            "photos": photos,
            "documents": documents,
            "specifications": specifications,
            "notes": r.get("notes"),
            "createdAt": r.get("createdAt"),
            "updatedAt": r.get("updatedAt"),
            "_count": {
                "complaints": 0,
                "workOrders": 0,
                "pmSchedules": 0,
            },
        }
        data.append(item)

    return {
        "data": data,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": max(1, (total + page_size - 1) // page_size) if total > 0 else 0,
    }


# ── Create Equipment ─────────────────────────────────────────────────────────


async def create_equipment(
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Create new equipment with auto-generated asset number and QR code."""
    name = data.get("name", "").strip()
    category = data.get("category", "").strip()
    if not name or not category:
        raise ValidationException(message="Name and category are required")

    asset_number = data.get("assetNumber") or _generate_asset_number(category)
    qr_code_value = f"QR-{asset_number}"
    qr_id = _generate_qr_id(category)
    domain = await _get_tenant_domain(tenant_id)
    qr_url = _generate_qr_url(domain, qr_id)

    record: dict[str, Any] = {
        "tenantId": tenant_id,
        "name": name,
        "category": category,
        "customerId": data.get("customerId") or None,
        "assetNumber": asset_number,
        "qrCode": qr_code_value,
        "qrId": qr_id,
        "brand": data.get("brand") or None,
        "model": data.get("model") or None,
        "serialNumber": data.get("serialNumber") or None,
        "location": data.get("location") or None,
        "building": data.get("building") or None,
        "room": data.get("room") or None,
        "installDate": data.get("installDate") or None,
        "warrantyExpiry": data.get("warrantyExpiry") or None,
        "warrantyInfo": data.get("warrantyInfo") or None,
        "status": data.get("status") or "active",
        "condition": data.get("condition") or "good",
        "photos": _json_serialize(data.get("photos")),
        "documents": _json_serialize(data.get("documents")),
        "specifications": _json_serialize(data.get("specifications")),
        "notes": data.get("notes") or None,
    }

    equip = await insert_record(EQUIP_TABLE, record)

    # Create QR code record (best-effort)
    try:
        await insert_record(QR_TABLE, {
            "tenantId": tenant_id,
            "equipmentId": equip["id"],
            "qrId": qr_id,
            "qrUrl": qr_url,
            "isActive": True,
            "version": 1,
        })
    except Exception:
        log.warning(f"Failed to create QR record for equipment {equip['id']}")

    # Invalidate cache
    redis = get_redis()
    await redis.invalidate_pattern(build_cache_key(tenant_id, "equipment", "*"))
    await redis.invalidate_pattern(build_cache_key(tenant_id, "dashboard", "*"))

    return _map_equip_response(equip)


# ── Get Equipment ────────────────────────────────────────────────────────────


async def get_equipment(
    equip_id: str,
    tenant_id: str,
    user: AuthUser,
) -> dict[str, Any]:
    """Get a single equipment by ID with RBAC check."""
    result = await query_table(
        EQUIP_TABLE,
        select="*",
        where={"id": equip_id},
        tenant_id=tenant_id,
        limit=1,
    )
    rows = result.get("data", [])
    if not rows:
        raise NotFoundException(resource="Equipment")

    equip = rows[0]
    resp = _map_equip_detail_response(equip)

    # Fetch customer name
    if equip.get("customerId"):
        try:
            c_result = await query_table(
                CUSTOMER_TABLE,
                select="id,name,companyName",
                where={"id": equip["customerId"]},
                tenant_id=tenant_id,
                limit=1,
            )
            c_rows = c_result.get("data", [])
            if c_rows:
                resp["customerName"] = c_rows[0].get("companyName") or c_rows[0].get("name")
        except Exception:
            pass

    return resp


# ── Update Equipment ─────────────────────────────────────────────────────────


async def update_equipment(
    equip_id: str,
    tenant_id: str,
    user: AuthUser,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Update equipment fields."""
    # Verify existence
    result = await query_table(
        EQUIP_TABLE,
        select="id",
        where={"id": equip_id},
        tenant_id=tenant_id,
        limit=1,
    )
    if not result.get("data"):
        raise NotFoundException(resource="Equipment")

    update_data: dict[str, Any] = {}
    simple_fields = (
        "name", "category", "customerId", "brand", "model", "serialNumber",
        "location", "building", "room", "installDate", "warrantyExpiry",
        "warrantyInfo", "status", "condition", "notes",
    )
    for field in simple_fields:
        if field in data:
            update_data[field] = data[field] if data[field] is not None else None

    # JSON fields
    for json_field in ("photos", "documents", "specifications"):
        if json_field in data:
            update_data[json_field] = _json_serialize(data[json_field])

    if not update_data:
        raise ValidationException(message="No fields to update")

    updated = await update_record(EQUIP_TABLE, equip_id, update_data)

    # Invalidate cache
    redis = get_redis()
    await redis.invalidate_pattern(build_cache_key(tenant_id, "equipment", "*"))
    await redis.invalidate_pattern(build_cache_key(tenant_id, "dashboard", "*"))

    return _map_equip_response(updated)


# ── Delete Equipment ─────────────────────────────────────────────────────────


async def delete_equipment(
    equip_id: str,
    tenant_id: str,
    user: AuthUser,
) -> dict[str, str]:
    """Delete equipment (admin only)."""
    if user.role not in ("super_admin", "admin"):
        raise ForbiddenException(message="Insufficient permissions to delete equipment")

    result = await query_table(
        EQUIP_TABLE,
        select="id",
        where={"id": equip_id},
        tenant_id=tenant_id,
        limit=1,
    )
    if not result.get("data"):
        raise NotFoundException(resource="Equipment")

    await delete_record(EQUIP_TABLE, equip_id)

    redis = get_redis()
    await redis.invalidate_pattern(build_cache_key(tenant_id, "equipment", "*"))
    await redis.invalidate_pattern(build_cache_key(tenant_id, "dashboard", "*"))

    return {"message": "Equipment deleted successfully"}


# ── Bulk Generate QR ────────────────────────────────────────────────────────


async def bulk_generate_qr(
    tenant_id: str,
    user: AuthUser,
    equipment_ids: list[str],
) -> dict[str, Any]:
    """Generate/regenerate QR codes for multiple equipment items."""
    if not equipment_ids:
        raise ValidationException(message="equipmentIds must be a non-empty array")
    if len(equipment_ids) > 100:
        raise ValidationException(message="Maximum 100 equipment IDs per request")

    # Verify all equipment exist and belong to tenant
    result = await query_table(
        EQUIP_TABLE,
        select="id,assetNumber",
        where={"id": {"in": equipment_ids}},
        tenant_id=tenant_id,
        limit=len(equipment_ids),
    )
    equipment_list = result.get("data", [])
    if not equipment_list:
        raise NotFoundException(resource="Equipment", message="No valid equipment found")

    found_ids = {e["id"] for e in equipment_list}
    invalid_ids = [eid for eid in equipment_ids if eid not in found_ids]
    if invalid_ids:
        raise ValidationException(
            message="Some equipment IDs not found or not accessible",
            details={"invalidIds": invalid_ids},
        )

    domain = await _get_tenant_domain(tenant_id)
    results: list[dict[str, Any]] = []

    for equip in equipment_list:
        new_qr_id = _generate_qr_id()
        new_qr_url = _generate_qr_url(domain, new_qr_id)

        # Deactivate old QR records
        try:
            old_qr = await query_table(
                QR_TABLE,
                select="id,version",
                where={"equipmentId": equip["id"], "isActive": True},
                tenant_id=tenant_id,
                limit=1,
            )
            old_rows = old_qr.get("data", [])
            new_version = 1
            if old_rows:
                new_version = old_rows[0].get("version", 0) + 1
                try:
                    await update_record(QR_TABLE, old_rows[0]["id"], {"isActive": False})
                except Exception:
                    pass

            # Create new QR record
            await insert_record(QR_TABLE, {
                "tenantId": tenant_id,
                "equipmentId": equip["id"],
                "qrId": new_qr_id,
                "qrUrl": new_qr_url,
                "isActive": True,
                "lastRegeneratedAt": utcnow().isoformat(),
                "version": new_version,
            })
        except Exception:
            log.warning(f"Failed to create QR record for equipment {equip['id']}")

        # Update equipment with new QR
        try:
            await update_record(EQUIP_TABLE, equip["id"], {
                "qrId": new_qr_id,
                "qrCode": new_qr_url,
            })
        except Exception:
            pass

        results.append({
            "equipmentId": equip["id"],
            "qrId": new_qr_id,
            "qrUrl": new_qr_url,
            "assetNumber": equip.get("assetNumber"),
        })

    return {"success": True, "count": len(results), "data": results}


# ── QR Lookup ────────────────────────────────────────────────────────────────


async def lookup_qr(
    equip_id: str,
    tenant_id: str,
    user: AuthUser,
) -> dict[str, Any]:
    """Get QR code info for an equipment item."""
    result = await query_table(
        EQUIP_TABLE,
        select="id,name,assetNumber,qrId,qrCode,scanCount,lastScannedAt",
        where={"id": equip_id},
        tenant_id=tenant_id,
        limit=1,
    )
    rows = result.get("data", [])
    if not rows:
        raise NotFoundException(resource="Equipment")

    equip = rows[0]

    # Get QR code record
    qr_record = None
    try:
        qr_result = await query_table(
            QR_TABLE,
            select="*",
            where={"equipmentId": equip_id, "isActive": True},
            tenant_id=tenant_id,
            limit=1,
        )
        qr_rows = qr_result.get("data", [])
        if qr_rows:
            qr = qr_rows[0]
            qr_record = {
                "id": qr["id"],
                "qrId": qr.get("qrId"),
                "qrUrl": qr.get("qrUrl"),
                "isActive": qr.get("isActive"),
                "generatedAt": qr.get("createdAt"),
                "lastRegeneratedAt": qr.get("lastRegeneratedAt"),
                "version": qr.get("version"),
            }
    except Exception:
        pass

    # Get recent scan logs
    recent_scans = []
    try:
        scan_result = await query_table(
            SCAN_LOG_TABLE,
            select="id,qrId,scannedByName,device,browser,ipAddress,createdAt",
            where={"equipmentId": equip_id},
            order="createdAt.desc",
            tenant_id=tenant_id,
            limit=20,
        )
        recent_scans = scan_result.get("data", [])
    except Exception:
        pass

    return {
        "id": equip["id"],
        "name": equip.get("name", ""),
        "assetNumber": equip.get("assetNumber"),
        "qrId": equip.get("qrId"),
        "qrCode": equip.get("qrCode"),
        "scanCount": equip.get("scanCount"),
        "lastScannedAt": equip.get("lastScannedAt"),
        "qrCodeRecord": qr_record,
        "recentScans": recent_scans,
    }


# ── QR Regenerate ───────────────────────────────────────────────────────────


async def regenerate_qr(
    equip_id: str,
    tenant_id: str,
    user: AuthUser,
) -> dict[str, Any]:
    """Regenerate QR code for a single equipment item."""
    result = await query_table(
        EQUIP_TABLE,
        select="id,qrId,qrCode",
        where={"id": equip_id},
        tenant_id=tenant_id,
        limit=1,
    )
    rows = result.get("data", [])
    if not rows:
        raise NotFoundException(resource="Equipment")

    equip = rows[0]
    new_qr_id = _generate_qr_id()
    domain = await _get_tenant_domain(tenant_id)
    new_qr_url = _generate_qr_url(domain, new_qr_id)

    # Deactivate old QR record
    new_version = 1
    try:
        old_qr = await query_table(
            QR_TABLE,
            select="id,version",
            where={"equipmentId": equip_id, "isActive": True},
            tenant_id=tenant_id,
            limit=1,
        )
        old_rows = old_qr.get("data", [])
        if old_rows:
            new_version = old_rows[0].get("version", 0) + 1
            try:
                await update_record(QR_TABLE, old_rows[0]["id"], {"isActive": False})
            except Exception:
                pass
    except Exception:
        pass

    # Create new QR record
    new_qr_record = await insert_record(QR_TABLE, {
        "tenantId": tenant_id,
        "equipmentId": equip_id,
        "qrId": new_qr_id,
        "qrUrl": new_qr_url,
        "isActive": True,
        "lastRegeneratedAt": utcnow().isoformat(),
        "version": new_version,
    })

    # Update equipment
    await update_record(EQUIP_TABLE, equip_id, {
        "qrId": new_qr_id,
        "qrCode": new_qr_url,
    })

    return {
        "success": True,
        "message": "QR code regenerated successfully",
        "data": {
            "equipmentId": equip_id,
            "qrId": new_qr_record.get("qrId"),
            "qrUrl": new_qr_record.get("qrUrl"),
            "version": new_qr_record.get("version"),
            "regeneratedAt": new_qr_record.get("lastRegeneratedAt"),
        },
    }


# ── QR Analytics ────────────────────────────────────────────────────────────


def _get_period_start(period: str) -> str:
    """Get ISO timestamp for the start of the analytics period."""
    now = datetime.now(timezone.utc)
    delta_map = {
        "last_7_days": 7,
        "last_30_days": 30,
        "last_90_days": 90,
        "last_6_months": 180,
        "last_year": 365,
    }
    days = delta_map.get(period, 30)
    start = now - __import__("datetime").timedelta(days=days)
    return start.isoformat()


async def get_qr_analytics(
    tenant_id: str,
    user: AuthUser,
    equipment_id: str | None = None,
    period: str = "last_30_days",
) -> dict[str, Any]:
    """Get QR scan analytics."""
    period_start = _get_period_start(period)

    where: dict[str, Any] = {"createdAt": {"gte": period_start}}
    if equipment_id:
        where["equipmentId"] = equipment_id

    # Get total scans
    total_scans = await count_records(SCAN_LOG_TABLE, where=where, tenant_id=tenant_id)

    # Get recent scan logs with equipment names
    scan_result = await query_table(
        SCAN_LOG_TABLE,
        select="id,equipmentId,scannedByName,device,ipAddress,createdAt",
        where=where,
        order="createdAt.desc",
        limit=50,
        tenant_id=tenant_id,
    )
    scan_logs = scan_result.get("data", [])

    # Unique scanners by IP
    unique_ips = {s.get("ipAddress") for s in scan_logs if s.get("ipAddress")}
    unique_scanners = len(unique_ips)

    # Device breakdown
    device_breakdown: dict[str, int] = {"mobile": 0, "desktop": 0, "tablet": 0}
    for s in scan_logs:
        d = s.get("device", "desktop") or "desktop"
        if d in device_breakdown:
            device_breakdown[d] += 1

    # Recent scans (last 20)
    recent_scans = [
        {
            "id": s["id"],
            "scannedByName": s.get("scannedByName") or "Anonymous",
            "device": s.get("device") or "unknown",
            "createdAt": s.get("createdAt"),
        }
        for s in scan_logs[:20]
    ]

    # Top equipment by scan count (simplified — we aggregate from scan logs)
    equip_scan_counts: dict[str, int] = {}
    for s in scan_logs:
        eid = s.get("equipmentId")
        if eid:
            equip_scan_counts[eid] = equip_scan_counts.get(eid, 0) + 1

    top_equipment: list[dict[str, Any]] = []
    if equip_scan_counts:
        sorted_equips = sorted(equip_scan_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        equip_ids_top = [e[0] for e in sorted_equips]
        try:
            e_result = await query_table(
                EQUIP_TABLE,
                select="id,name",
                where={"id": {"in": equip_ids_top}},
                tenant_id=tenant_id,
                limit=10,
            )
            equip_name_map = {e["id"]: e.get("name", "Unknown") for e in e_result.get("data", [])}
            top_equipment = [
                {"name": equip_name_map.get(eid, "Unknown"), "scanCount": count}
                for eid, count in sorted_equips
            ]
        except Exception:
            top_equipment = [
                {"name": "Unknown", "scanCount": count}
                for _, count in sorted_equips
            ]

    return {
        "totalScans": total_scans,
        "uniqueScanners": unique_scanners,
        "topEquipment": top_equipment,
        "recentScans": recent_scans,
        "dailyTrend": [],  # Requires raw SQL; simplified for now
        "deviceBreakdown": device_breakdown,
    }


# ── Response mapping helpers ────────────────────────────────────────────────


def _map_equip_response(equip: dict[str, Any]) -> dict[str, Any]:
    """Map equipment record to list response shape."""
    return {
        "id": equip["id"],
        "tenantId": equip["tenantId"],
        "customerId": equip.get("customerId"),
        "name": equip.get("name", ""),
        "category": equip.get("category", ""),
        "assetNumber": equip.get("assetNumber"),
        "qrCode": equip.get("qrCode"),
        "qrId": equip.get("qrId"),
        "brand": equip.get("brand"),
        "model": equip.get("model"),
        "serialNumber": equip.get("serialNumber"),
        "location": equip.get("location"),
        "building": equip.get("building"),
        "room": equip.get("room"),
        "installDate": equip.get("installDate"),
        "warrantyExpiry": equip.get("warrantyExpiry"),
        "warrantyInfo": equip.get("warrantyInfo"),
        "status": equip.get("status", "active"),
        "condition": equip.get("condition"),
        "photos": _json_deserialize(equip.get("photos")),
        "documents": _json_deserialize(equip.get("documents")),
        "specifications": _json_deserialize(equip.get("specifications")),
        "notes": equip.get("notes"),
        "createdAt": equip.get("createdAt"),
        "updatedAt": equip.get("updatedAt"),
    }


def _map_equip_detail_response(equip: dict[str, Any]) -> dict[str, Any]:
    """Map equipment record to detail response shape."""
    resp = _map_equip_response(equip)
    resp["scanCount"] = equip.get("scanCount")
    resp["lastScannedAt"] = equip.get("lastScannedAt")
    resp["_count"] = {
        "complaints": 0,
        "workOrders": 0,
        "pmSchedules": 0,
    }
    return resp
