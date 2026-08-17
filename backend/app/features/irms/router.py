"""
IRMS feature router — matches Next.js API routes exactly.

MOHD.HMS ENTERPRISE

Endpoints:
  GET  /api/v1/irms/dashboard                — Dashboard stats and KPIs
  GET  /api/v1/irms/analytics                — Analytics with trends and performance
  GET  /api/v1/irms/activities               — Recent activity feed
  GET  /api/v1/irms/projects                 — List projects
  POST /api/v1/irms/projects                 — Create project
  GET  /api/v1/irms/projects/{id}            — Get project detail
  PUT  /api/v1/irms/projects/{id}            — Update project
  DELETE /api/v1/irms/projects/{id}          — Delete project
  GET  /api/v1/irms/reports                  — List reports
  POST /api/v1/irms/reports                  — Create report
  GET  /api/v1/irms/reports/{id}             — Get report detail
  PUT  /api/v1/irms/reports/{id}             — Update report
  DELETE /api/v1/irms/reports/{id}            — Delete report
  GET  /api/v1/irms/reports/{id}/photos      — List photos
  POST /api/v1/irms/reports/{id}/photos/bulk — Bulk photo operation
  POST /api/v1/irms/reports/{id}/photos/reorder — Reorder photos
  PATCH /api/v1/irms/reports/{id}/photos/{photoId} — Update photo
  DELETE /api/v1/irms/reports/{id}/photos/{photoId} — Delete photo
  GET  /api/v1/irms/reports/{id}/revisions   — List revisions
  POST /api/v1/irms/reports/{id}/revisions   — Rollback to revision
  POST /api/v1/irms/reports/{id}/status      — Advance/reject status
  PUT  /api/v1/irms/reports/{id}/signatures  — Update signatures
  GET  /api/v1/irms/reports/{id}/pdf         — Generate PDF (stub)
  GET  /api/v1/irms/templates                — List templates
  POST /api/v1/irms/templates                — Create template
  GET  /api/v1/irms/templates/{id}           — Get template
  PUT  /api/v1/irms/templates/{id}           — Update template
  DELETE /api/v1/irms/templates/{id}         — Delete template
  GET  /api/v1/irms/users                    — List IRM users
  POST /api/v1/irms/users                    — Create IRM user
  GET  /api/v1/irms/inspections              — List inspections
  POST /api/v1/irms/inspections              — Create inspection
  GET  /api/v1/irms/inspections/{id}         — Get inspection
  PUT  /api/v1/irms/inspections/{id}         — Update inspection
  DELETE /api/v1/irms/inspections/{id}        — Delete inspection
  POST /api/v1/irms/inspections/{id}/complete — Complete inspection
  GET  /api/v1/irms/inspections/reports      — Inspection reports list
  GET  /api/v1/irms/inspections/dashboard-stats — Inspection dashboard stats
  GET  /api/v1/irms/inspections/analytics    — Inspection analytics

IRMS access: super_admin, admin, manager, supervisor, technician.
Customers are explicitly excluded.
"""

from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, get_current_user, require_role
from app.features.irms import service
from app.features.irms.schemas import (
    IrmPhotoBulkAction,
    IrmPhotoCreate,
    IrmPhotoReorder,
    IrmPhotoUpdate,
    IrmProjectCreate,
    IrmProjectUpdate,
    IrmReportCreate,
    IrmReportSignatures,
    IrmReportStatusAction,
    IrmReportUpdate,
    IrmRevisionRollback,
    IrmTemplateCreate,
    IrmTemplateUpdate,
    IrmUserCreate,
    InspectionCreate,
    InspectionUpdate,
)

router = APIRouter(tags=["irms"])


# ============================================================================
# DASHBOARD & ANALYTICS
# ============================================================================


@router.get("/dashboard")
async def get_dashboard(
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """GET /api/v1/irms/dashboard"""
    return await service.get_dashboard(user)


@router.get("/analytics")
async def get_analytics(
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """GET /api/v1/irms/analytics"""
    return await service.get_analytics(user)


@router.get("/activities")
async def get_activities(
    user: AuthUser = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """GET /api/v1/irms/activities"""
    return await service.list_activities(user)


# ============================================================================
# PROJECTS
# ============================================================================


@router.get("/projects")
async def list_projects(
    user: AuthUser = Depends(get_current_user),
    q: str = Query(default=""),
    status: str = Query(default=""),
) -> list[dict[str, Any]]:
    """GET /api/v1/irms/projects"""
    return await service.list_projects(user, q=q, status=status)


@router.post("/projects", status_code=201)
async def create_project(
    body: IrmProjectCreate,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """POST /api/v1/irms/projects"""
    data = body.model_dump(exclude_unset=True)
    return await service.create_project(user, data)


@router.get("/projects/{project_id}")
async def get_project(
    project_id: str,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """GET /api/v1/irms/projects/{id}"""
    return await service.get_project(user, project_id)


@router.put("/projects/{project_id}")
async def update_project(
    project_id: str,
    body: IrmProjectUpdate,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """PUT /api/v1/irms/projects/{id}"""
    data = body.model_dump(exclude_unset=True, exclude_none=True)
    return await service.update_project(user, project_id, data)


@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
) -> dict[str, Any]:
    """DELETE /api/v1/irms/projects/{id}"""
    return await service.delete_project(user, project_id)


# ============================================================================
# REPORTS
# ============================================================================


@router.get("/reports")
async def list_reports(
    user: AuthUser = Depends(get_current_user),
    q: str = Query(default=""),
    status: str = Query(default=""),
    priority: str = Query(default=""),
    category: str = Query(default=""),
    projectId: str = Query(default=""),
) -> list[dict[str, Any]]:
    """GET /api/v1/irms/reports"""
    return await service.list_reports(
        user, q=q, status=status, priority=priority, category=category, project_id=projectId,
    )


@router.post("/reports", status_code=201)
async def create_report(
    body: IrmReportCreate,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """POST /api/v1/irms/reports"""
    data = body.model_dump(exclude_unset=True)
    return await service.create_report(user, data)


@router.get("/reports/{report_id}")
async def get_report(
    report_id: str,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """GET /api/v1/irms/reports/{id}"""
    return await service.get_report(user, report_id)


@router.put("/reports/{report_id}")
async def update_report(
    report_id: str,
    body: IrmReportUpdate,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """PUT /api/v1/irms/reports/{id}"""
    data = body.model_dump(exclude_unset=True, exclude_none=True)
    return await service.update_report(user, report_id, data)


@router.delete("/reports/{report_id}")
async def delete_report(
    report_id: str,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
) -> dict[str, Any]:
    """DELETE /api/v1/irms/reports/{id}"""
    return await service.delete_report(user, report_id)


# ============================================================================
# PHOTOS
# ============================================================================


@router.get("/reports/{report_id}/photos")
async def list_photos(
    report_id: str,
    user: AuthUser = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """GET /api/v1/irms/reports/{id}/photos"""
    return await service.list_photos(user, report_id)


@router.post("/reports/{report_id}/photos", status_code=201)
async def create_photo(
    report_id: str,
    body: IrmPhotoCreate,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """POST /api/v1/irms/reports/{id}/photos"""
    data = body.model_dump(exclude_unset=True)
    data["reportId"] = report_id
    return await service.create_photo(user, data)


@router.post("/reports/{report_id}/photos/bulk")
async def bulk_photo_action(
    report_id: str,
    body: IrmPhotoBulkAction,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """POST /api/v1/irms/reports/{id}/photos/bulk"""
    data = body.model_dump(exclude_unset=True)
    return await service.bulk_photo_action(
        user, report_id,
        action=data["action"],
        photo_ids=data["photoIds"],
        category=data.get("category"),
        room=data.get("room"),
        sw_ref=data.get("swRef"),
    )


@router.post("/reports/{report_id}/photos/reorder")
async def reorder_photos(
    report_id: str,
    body: IrmPhotoReorder,
    user: AuthUser = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """POST /api/v1/irms/reports/{id}/photos/reorder"""
    data = body.model_dump(exclude_unset=True)
    return await service.reorder_photos(user, report_id, data["photoIds"])


@router.patch("/reports/{report_id}/photos/{photo_id}")
async def update_photo(
    report_id: str,
    photo_id: str,
    body: IrmPhotoUpdate,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """PATCH /api/v1/irms/reports/{id}/photos/{photoId}"""
    data = body.model_dump(exclude_unset=True, exclude_none=True)
    return await service.update_photo(user, photo_id, data)


@router.delete("/reports/{report_id}/photos/{photo_id}")
async def delete_photo(
    report_id: str,
    photo_id: str,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """DELETE /api/v1/irms/reports/{id}/photos/{photoId}"""
    return await service.delete_photo(user, photo_id)


# ============================================================================
# REVISIONS
# ============================================================================


@router.get("/reports/{report_id}/revisions")
async def list_revisions(
    report_id: str,
    user: AuthUser = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """GET /api/v1/irms/reports/{id}/revisions"""
    return await service.list_revisions(user, report_id)


@router.post("/reports/{report_id}/revisions")
async def rollback_revision(
    report_id: str,
    body: IrmRevisionRollback,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """POST /api/v1/irms/reports/{id}/revisions"""
    data = body.model_dump(exclude_unset=True)
    return await service.rollback_revision(user, report_id, data["version"])


# ============================================================================
# STATUS
# ============================================================================


@router.post("/reports/{report_id}/status")
async def advance_report_status(
    report_id: str,
    body: IrmReportStatusAction,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """POST /api/v1/irms/reports/{id}/status"""
    data = body.model_dump(exclude_unset=True)
    return await service.advance_report_status(
        user, report_id,
        action=data["action"],
        comment=data.get("comment"),
        user_id=data.get("userId"),
    )


# ============================================================================
# SIGNATURES
# ============================================================================


@router.put("/reports/{report_id}/signatures")
async def update_signatures(
    report_id: str,
    body: IrmReportSignatures,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """PUT /api/v1/irms/reports/{id}/signatures"""
    data = body.model_dump(exclude_unset=True, exclude_none=True)
    return await service.update_signatures(user, report_id, data)


# ============================================================================
# PDF
# ============================================================================


@router.get("/reports/{report_id}/pdf")
async def generate_pdf(
    report_id: str,
    user: AuthUser = Depends(get_current_user),
    template: str = Query(default="government"),
    sort: str = Query(default="oldest"),
    download: str = Query(default="0"),
) -> dict[str, Any]:
    """GET /api/v1/irms/reports/{id}/pdf"""
    return await service.generate_pdf(user, report_id, template=template, sort=sort, download=download)


# ============================================================================
# TEMPLATES
# ============================================================================


@router.get("/templates")
async def list_templates(
    user: AuthUser = Depends(get_current_user),
    category: str = Query(default=""),
) -> list[dict[str, Any]]:
    """GET /api/v1/irms/templates"""
    return await service.list_templates(user, category=category)


@router.post("/templates", status_code=201)
async def create_template(
    body: IrmTemplateCreate,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """POST /api/v1/irms/templates"""
    data = body.model_dump(exclude_unset=True)
    return await service.create_template(user, data)


@router.get("/templates/{template_id}")
async def get_template(
    template_id: str,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """GET /api/v1/irms/templates/{id}"""
    return await service.get_template(user, template_id)


@router.put("/templates/{template_id}")
async def update_template(
    template_id: str,
    body: IrmTemplateUpdate,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """PUT /api/v1/irms/templates/{id}"""
    data = body.model_dump(exclude_unset=True, exclude_none=True)
    return await service.update_template(user, template_id, data)


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
) -> dict[str, Any]:
    """DELETE /api/v1/irms/templates/{id}"""
    return await service.delete_template(user, template_id)


# ============================================================================
# USERS
# ============================================================================


@router.get("/users")
async def list_irm_users(
    user: AuthUser = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """GET /api/v1/irms/users"""
    return await service.list_irm_users(user)


@router.post("/users", status_code=201)
async def create_irm_user(
    body: IrmUserCreate,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """POST /api/v1/irms/users"""
    data = body.model_dump(exclude_unset=True)
    return await service.create_irm_user(user, data)


# ============================================================================
# INSPECTIONS
# ============================================================================


@router.get("/inspections")
async def list_inspections(
    user: AuthUser = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    status: str = Query(default=""),
    priority: str = Query(default=""),
    type: str = Query(default=""),
    assignedToId: str = Query(default=""),
    equipmentId: str = Query(default=""),
    search: str = Query(default=""),
    view: str = Query(default=""),
    month: str = Query(default=""),
    fromDate: str = Query(default=""),
    toDate: str = Query(default=""),
) -> dict[str, Any]:
    """GET /api/v1/irms/inspections"""
    return await service.list_inspections(
        user,
        status=status, priority=priority, type=type,
        assigned_to_id=assignedToId, equipment_id=equipmentId,
        search=search, view=view, month=month,
        from_date=fromDate, to_date=toDate,
        page=page, page_size=pageSize,
    )


@router.post("/inspections", status_code=201)
async def create_inspection(
    body: InspectionCreate,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """POST /api/v1/irms/inspections"""
    data = body.model_dump(exclude_unset=True)
    return await service.create_inspection(user, data)


@router.get("/inspections/{inspection_id}")
async def get_inspection(
    inspection_id: str,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """GET /api/v1/irms/inspections/{id}"""
    return await service.get_inspection(user, inspection_id)


@router.put("/inspections/{inspection_id}")
async def update_inspection(
    inspection_id: str,
    body: InspectionUpdate,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """PUT /api/v1/irms/inspections/{id}"""
    data = body.model_dump(exclude_unset=True, exclude_none=True)
    return await service.update_inspection(user, inspection_id, data)


@router.delete("/inspections/{inspection_id}")
async def delete_inspection(
    inspection_id: str,
    user: AuthUser = Depends(require_role("super_admin", "admin")),
) -> dict[str, Any]:
    """DELETE /api/v1/irms/inspections/{id}"""
    return await service.delete_inspection(user, inspection_id)


@router.post("/inspections/{inspection_id}/complete")
async def complete_inspection(
    inspection_id: str,
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """POST /api/v1/irms/inspections/{id}/complete"""
    return await service.complete_inspection(user, inspection_id)


# ============================================================================
# INSPECTION REPORTS / STATS / ANALYTICS
# ============================================================================


@router.get("/inspections/reports")
async def get_inspection_reports(
    user: AuthUser = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """GET /api/v1/irms/inspections/reports"""
    return await service.get_inspection_reports(user)


@router.get("/inspections/dashboard-stats")
async def get_inspection_dashboard_stats(
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """GET /api/v1/irms/inspections/dashboard-stats"""
    return await service.get_inspection_dashboard_stats(user)


@router.get("/inspections/analytics")
async def get_inspection_analytics(
    user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    """GET /api/v1/irms/inspections/analytics"""
    return await service.get_inspection_analytics(user)
