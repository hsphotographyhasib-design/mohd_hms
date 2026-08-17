from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, get_current_user, require_role, require_permission
from app.features.documents import service
from app.features.documents.schemas import DocumentUpdate, DocumentVersionCreate

router = APIRouter(tags=["documents"])


# ============================================================================
# LIST / GET / UPDATE / DELETE
# ============================================================================


@router.get("")
async def list_documents(
    user: AuthUser = Depends(require_permission("document.view")),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    module: str = Query(default=""),
    referenceId: str = Query(default=""),
    folder: str = Query(default=""),
    search: str = Query(default=""),
    status: str = Query(default="active"),
    sortBy: str = Query(default="createdAt"),
    sortOrder: str = Query(default="desc"),
):
    """GET /api/v1/documents — list documents."""
    return await service.list_documents(user.tenantId, user, {
        "page": page, "limit": limit, "module": module,
        "referenceId": referenceId, "folder": folder, "search": search,
        "status": status, "sortBy": sortBy, "sortOrder": sortOrder,
    })


@router.get("/{doc_id}")
async def get_document(
    doc_id: str,
    user: AuthUser = Depends(require_permission("document.view")),
):
    """GET /api/v1/documents/{id} — get document detail."""
    return await service.get_document(doc_id, user.tenantId, user)


@router.put("/{doc_id}")
async def update_document(
    doc_id: str,
    body: DocumentUpdate,
    user: AuthUser = Depends(require_permission("document.manage")),
):
    """PUT /api/v1/documents/{id} — update document."""
    return await service.update_document(doc_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    user: AuthUser = Depends(require_permission("document.delete")),
):
    """DELETE /api/v1/documents/{id} — soft-delete a document."""
    return await service.delete_document(doc_id, user.tenantId, user)


# ============================================================================
# DOWNLOAD
# ============================================================================


@router.get("/{doc_id}/download")
async def download_document(
    doc_id: str,
    user: AuthUser = Depends(require_permission("document.view")),
):
    """GET /api/v1/documents/{id}/download — get download URL."""
    return await service.get_download_url(doc_id, user.tenantId, user)


# ============================================================================
# VERSIONS
# ============================================================================


@router.get("/{doc_id}/versions")
async def list_versions(
    doc_id: str,
    user: AuthUser = Depends(require_permission("document.view")),
):
    """GET /api/v1/documents/{id}/versions — list document versions."""
    return await service.list_versions(doc_id, user.tenantId, user)


@router.post("/{doc_id}/versions")
async def create_version(
    doc_id: str,
    body: DocumentVersionCreate,
    user: AuthUser = Depends(require_permission("document.upload")),
):
    """POST /api/v1/documents/{id}/versions — create a new version."""
    return await service.create_version(doc_id, user.tenantId, user, body.model_dump())


@router.post("/{doc_id}/versions/{version_id}/restore")
async def restore_version(
    doc_id: str,
    version_id: str,
    user: AuthUser = Depends(require_permission("document.manage")),
):
    """POST /api/v1/documents/{id}/versions/{versionId}/restore — restore a version."""
    return await service.restore_version(doc_id, version_id, user.tenantId, user)


# ============================================================================
# AUDIT
# ============================================================================


@router.get("/audit")
async def list_audit_log(
    user: AuthUser = Depends(require_permission("document.manage")),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
):
    """GET /api/v1/documents/audit — list document audit logs."""
    return await service.list_audit_log(user.tenantId, user, {
        "page": page, "pageSize": pageSize,
    })


# ============================================================================
# DUPLICATES
# ============================================================================


@router.post("/duplicates")
async def find_duplicates(
    user: AuthUser = Depends(require_permission("document.manage")),
):
    """POST /api/v1/documents/duplicates — find duplicate documents."""
    return await service.find_duplicates(user.tenantId, user, {})
