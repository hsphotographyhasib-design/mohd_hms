import json
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
from app.core.exceptions import NotFoundException, ValidationException
from app.core.logging import get_logger
from app.utils.helpers import utcnow

log = get_logger(__name__)

DOC_TABLE = MODEL_TO_TABLE.get("document", "Document")
VERSION_TABLE = MODEL_TO_TABLE.get("documentVersion", "DocumentVersion")
AUDIT_TABLE = MODEL_TO_TABLE.get("documentAuditLog", "DocumentAuditLog")
USER_TABLE = MODEL_TO_TABLE.get("user", "User")


# ============================================================================
# LIST / GET / UPDATE / DELETE
# ============================================================================


async def list_documents(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    """GET /api/v1/documents — list documents."""
    page = params.get("page", 1)
    page_size = params.get("limit", 20)
    module = params.get("module", "")
    reference_id = params.get("referenceId", "")
    folder = params.get("folder", "")
    search = params.get("search", "")
    status = params.get("status", "active")
    sort_by = params.get("sortBy", "createdAt")
    sort_order = params.get("sortOrder", "desc")

    valid_sort_fields = ["createdAt", "updatedAt", "originalName", "size", "version"]
    if sort_by not in valid_sort_fields:
        sort_by = "createdAt"
    order = f"{sort_by}.{sort_order}"

    where: dict[str, Any] = {"isActive": True}
    if module:
        where["module"] = module
    if reference_id:
        where["referenceId"] = reference_id
    if folder:
        where["folder"] = folder
    if search:
        where["OR"] = [
            {"originalName": {"contains": search}},
            {"fileName": {"contains": search}},
        ]
    if status == "archived":
        where["isArchived"] = True
    elif status != "all":
        where["isArchived"] = False

    total = await count_records(DOC_TABLE, where=where, tenant_id=tenant_id)
    offset = (page - 1) * page_size

    result = await query_table(
        DOC_TABLE,
        where=where,
        order=order,
        limit=page_size,
        offset=offset,
        tenant_id=tenant_id,
    )
    items = result.get("data", [])

    return {
        "documents": items,
        "pagination": {
            "page": page,
            "limit": page_size,
            "total": total,
            "totalPages": (total + page_size - 1) // page_size if total > 0 else 0,
        },
    }


async def get_document(doc_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """GET /api/v1/documents/{id} — get document detail."""
    result = await query_table(
        DOC_TABLE,
        where={"id": doc_id},
        tenant_id=tenant_id,
        limit=1,
    )
    items = result.get("data", [])
    if not items:
        raise NotFoundException(resource="Document")
    return items[0]


async def update_document(doc_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """PUT /api/v1/documents/{id} — update document."""
    if isinstance(data.get("tags"), list):
        data["tags"] = json.dumps(data["tags"])
    return await update_record(DOC_TABLE, doc_id, data)


async def delete_document(doc_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """DELETE /api/v1/documents/{id} — soft-delete a document."""
    await update_record(DOC_TABLE, doc_id, {"isActive": False})
    return {"success": True}


# ============================================================================
# DOWNLOAD
# ============================================================================


async def get_download_url(doc_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """GET /api/v1/documents/{id}/download — get download URL."""
    result = await query_table(
        DOC_TABLE,
        where={"id": doc_id},
        select="id,fileName,originalName,mimeType,size,storagePath",
        tenant_id=tenant_id,
        limit=1,
    )
    items = result.get("data", [])
    if not items:
        raise NotFoundException(resource="Document")
    doc = items[0]
    return {
        "id": doc["id"],
        "fileName": doc.get("fileName"),
        "originalName": doc.get("originalName"),
        "mimeType": doc.get("mimeType"),
        "size": doc.get("size"),
        "downloadUrl": doc.get("storagePath"),
    }


# ============================================================================
# VERSIONS
# ============================================================================


async def list_versions(doc_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """GET /api/v1/documents/{id}/versions — list document versions."""
    result = await query_table(
        VERSION_TABLE,
        where={"documentId": doc_id},
        order="versionNumber.desc",
        limit=50,
        tenant_id=tenant_id,
    )
    items = result.get("data", [])
    return {"data": items}


async def create_version(doc_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """POST /api/v1/documents/{id}/versions — create a new version."""
    # Get current version number
    doc = await get_document(doc_id, tenant_id, user)
    current_version = doc.get("version", 1)

    version_data = {
        "tenantId": tenant_id,
        "documentId": doc_id,
        "versionNumber": current_version + 1,
        "fileName": data.get("fileName"),
        "mimeType": data.get("mimeType"),
        "size": data.get("size"),
        "storagePath": data.get("file"),
        "changelog": data.get("changelog"),
        "uploadedBy": user.userId,
    }
    record = await insert_record(VERSION_TABLE, version_data)

    # Update the parent document
    await update_record(DOC_TABLE, doc_id, {
        "version": current_version + 1,
        "fileName": data.get("fileName"),
        "mimeType": data.get("mimeType"),
        "size": data.get("size"),
        "storagePath": data.get("file"),
    })

    return {"success": True, "version": record}


async def restore_version(doc_id: str, version_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """POST /api/v1/documents/{id}/versions/{versionId}/restore — restore a version."""
    result = await query_table(
        VERSION_TABLE,
        where={"id": version_id, "documentId": doc_id},
        tenant_id=tenant_id,
        limit=1,
    )
    items = result.get("data", [])
    if not items:
        raise NotFoundException(resource="DocumentVersion")

    version = items[0]
    await update_record(DOC_TABLE, doc_id, {
        "version": version.get("versionNumber"),
        "fileName": version.get("fileName"),
        "mimeType": version.get("mimeType"),
        "size": version.get("size"),
        "storagePath": version.get("storagePath"),
    })

    return {"success": True, "restoredVersion": version.get("versionNumber")}


# ============================================================================
# AUDIT
# ============================================================================


async def list_audit_log(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    """GET /api/v1/documents/audit — list document audit logs."""
    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    offset = (page - 1) * page_size

    total = await count_records(AUDIT_TABLE, tenant_id=tenant_id)
    result = await query_table(
        AUDIT_TABLE,
        order="createdAt.desc",
        limit=page_size,
        offset=offset,
        tenant_id=tenant_id,
    )
    items = result.get("data", [])

    return {
        "data": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size if total > 0 else 0,
    }


# ============================================================================
# DUPLICATES
# ============================================================================


async def find_duplicates(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    """POST /api/v1/documents/duplicates — find duplicate documents."""
    result = await query_table(
        DOC_TABLE,
        where={"isActive": True},
        select="id,originalName,fileName,size,checksum,storagePath,uploadedBy,createdAt",
        order="checksum.asc",
        limit=500,
        tenant_id=tenant_id,
    )
    items = result.get("data", [])

    checksum_groups: dict[str, list] = {}
    for item in items:
        checksum = item.get("checksum")
        if checksum:
            checksum_groups.setdefault(checksum, []).append(item)

    duplicates = {k: v for k, v in checksum_groups.items() if len(v) > 1}

    return {
        "duplicates": duplicates,
        "totalDuplicates": sum(len(v) for v in duplicates.values()),
        "duplicateGroups": len(duplicates),
    }