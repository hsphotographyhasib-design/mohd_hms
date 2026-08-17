"""
HR feature router — all 32+ sub-routes.

MOHD.HMS ENTERPRISE

Organized by sub-module matching the Next.js /api/hr/* routes.
All endpoints require authentication with super_admin, admin, or hr role.

Endpoints:
  /employees           GET, POST
  /employees/{id}      GET, PUT, DELETE
  /departments         GET, POST
  /attendance          GET, POST
  /leave               GET, POST
  /leave/{id}          PUT
  /overtime            GET, POST
  /overtime/{id}       PUT
  /payroll             GET, POST
  /training            GET, POST
  /training/{id}       GET, PUT, DELETE
  /travel              GET, POST
  /travel/{id}         GET, PUT, DELETE
  /medical             GET, POST
  /medical/{id}        GET, PUT, DELETE
  /expenses            GET, POST
  /expenses/{id}       GET, PUT, DELETE
  /documents           GET, POST
  /documents/{id}      GET, PUT, DELETE
  /announcements       GET, POST
  /announcements/{id}  GET, PUT, DELETE
  /assets              GET, POST
  /assets/{id}         GET, PUT, DELETE
  /shifts              GET, POST
  /holidays            GET, POST
  /visitors            GET, POST
  /visitors/{id}       GET, PUT, DELETE
  /performance         GET, POST
  /performance/{id}    GET, PUT, DELETE
  /disciplinary        GET, POST
  /disciplinary/{id}   GET, PUT, DELETE
  /settings            GET, POST
  /settings/{id}       GET, PUT, DELETE
  /reports             GET, POST
  /reports/{id}        GET, PUT, DELETE
  /dashboard           GET
  /recruitment/jobs            GET, POST
  /recruitment/jobs/{id}       GET, PUT, DELETE
  /recruitment/candidates      GET, POST
  /recruitment/candidates/{id} GET, PUT
"""

from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, get_current_user, require_role
from app.features.hr import service

router = APIRouter(tags=["hr"])

# Reusable HR auth dependency
_hr_auth = require_role("super_admin", "admin", "hr")


# ============================================================================
# EMPLOYEES
# ============================================================================


@router.get("/employees")
async def list_employees(
    user: AuthUser = Depends(_hr_auth),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    search: str = Query(default=""),
    department: str = Query(default=""),
    status: str = Query(default=""),
    employmentType: str = Query(default="", alias="employmentType"),
):
    """GET /api/v1/hr/employees"""
    return await service.list_employees(
        tenant_id=user.tenantId,
        page=page,
        page_size=pageSize,
        search=search,
        department=department,
        status=status,
        employment_type=employmentType,
    )


@router.post("/employees", status_code=201)
async def create_employee(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/employees"""
    return await service.create_employee(tenant_id=user.tenantId, user=user, data=body)


@router.get("/employees/{item_id}")
async def get_employee(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/employees/{id}"""
    return await service.get_employee(employee_id=item_id, tenant_id=user.tenantId)


@router.put("/employees/{item_id}")
async def update_employee(
    item_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """PUT /api/v1/hr/employees/{id}"""
    return await service.update_employee(employee_id=item_id, tenant_id=user.tenantId, data=body)


@router.delete("/employees/{item_id}")
async def delete_employee(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """DELETE /api/v1/hr/employees/{id}"""
    await service.delete_employee(employee_id=item_id, tenant_id=user.tenantId)
    return {"success": True}


# ============================================================================
# DEPARTMENTS
# ============================================================================


@router.get("/departments")
async def list_departments(
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/departments"""
    return await service.list_departments(tenant_id=user.tenantId)


@router.post("/departments", status_code=201)
async def create_department(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/departments"""
    return await service.create_department(tenant_id=user.tenantId, data=body)


# ============================================================================
# ATTENDANCE
# ============================================================================


@router.get("/attendance")
async def list_attendance(
    user: AuthUser = Depends(_hr_auth),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    search: str = Query(default=""),
    status: str = Query(default=""),
    dateFrom: str = Query(default="", alias="dateFrom"),
    dateTo: str = Query(default="", alias="dateTo"),
    view: str = Query(default=""),
    month: int = Query(default=0),
    year: int = Query(default=0),
):
    """GET /api/v1/hr/attendance"""
    return await service.list_attendance(
        tenant_id=user.tenantId,
        user_id=user.userId,
        page=page,
        page_size=pageSize,
        search=search,
        status=status,
        date_from=dateFrom,
        date_to=dateTo,
        view=view,
        month=month,
        year=year,
    )


@router.post("/attendance", status_code=201)
async def create_attendance(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/attendance — checkIn/checkOut action"""
    return await service.create_attendance_action(tenant_id=user.tenantId, user=user, data=body)


# ============================================================================
# LEAVE
# ============================================================================


@router.get("/leave")
async def list_leave(
    user: AuthUser = Depends(_hr_auth),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    search: str = Query(default=""),
    status: str = Query(default=""),
    leaveTypeId: str = Query(default="", alias="leaveTypeId"),
    view: str = Query(default=""),
):
    """GET /api/v1/hr/leave"""
    return await service.list_leave_requests(
        tenant_id=user.tenantId,
        page=page,
        page_size=pageSize,
        search=search,
        status=status,
        leave_type_id=leaveTypeId,
        view=view,
        user_id=user.userId,
    )


@router.post("/leave", status_code=201)
async def create_leave(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/leave"""
    return await service.create_leave_request(tenant_id=user.tenantId, user=user, data=body)


@router.put("/leave/{item_id}")
async def update_leave(
    item_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """PUT /api/v1/hr/leave/{id}"""
    return await service.update_leave_request(leave_id=item_id, tenant_id=user.tenantId, data=body)


# ============================================================================
# OVERTIME
# ============================================================================


@router.get("/overtime")
async def list_overtime(
    user: AuthUser = Depends(_hr_auth),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=50, ge=1, le=100),
    status: str = Query(default=""),
    employeeId: str = Query(default="", alias="employeeId"),
    dateFrom: str = Query(default="", alias="dateFrom"),
    dateTo: str = Query(default="", alias="dateTo"),
):
    """GET /api/v1/hr/overtime"""
    return await service.list_overtime(
        tenant_id=user.tenantId,
        page=page,
        page_size=pageSize,
        status=status,
        employee_id=employeeId,
        date_from=dateFrom,
        date_to=dateTo,
    )


@router.post("/overtime", status_code=201)
async def create_overtime(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/overtime"""
    return await service.create_overtime(tenant_id=user.tenantId, data=body)


@router.put("/overtime/{item_id}")
async def update_overtime(
    item_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """PUT /api/v1/hr/overtime/{id}"""
    return await service.update_overtime(overtime_id=item_id, tenant_id=user.tenantId, data=body)


# ============================================================================
# PAYROLL
# ============================================================================


@router.get("/payroll")
async def list_payroll(
    user: AuthUser = Depends(_hr_auth),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=50, ge=1, le=100),
    month: int = Query(default=0),
    year: int = Query(default=0),
):
    """GET /api/v1/hr/payroll"""
    return await service.list_payroll(
        tenant_id=user.tenantId,
        page=page,
        page_size=pageSize,
        month=month,
        year=year,
    )


@router.post("/payroll", status_code=201)
async def create_payroll(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/payroll — single record or batch process"""
    return await service.create_payroll(tenant_id=user.tenantId, user=user, data=body)


# ============================================================================
# TRAINING
# ============================================================================


@router.get("/training")
async def list_training(
    user: AuthUser = Depends(_hr_auth),
    view: str = Query(default=""),
):
    """GET /api/v1/hr/training"""
    return await service.list_training(tenant_id=user.tenantId, view=view)


@router.post("/training", status_code=201)
async def create_training(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/training"""
    return await service.create_training(tenant_id=user.tenantId, data=body)


@router.get("/training/{item_id}")
async def get_training(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/training/{id}"""
    return await service.get_training(training_id=item_id, tenant_id=user.tenantId)


@router.put("/training/{item_id}")
async def update_training(
    item_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """PUT /api/v1/hr/training/{id}"""
    return await service.update_training(training_id=item_id, tenant_id=user.tenantId, data=body)


@router.delete("/training/{item_id}")
async def delete_training(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """DELETE /api/v1/hr/training/{id}"""
    await service.delete_training(training_id=item_id, tenant_id=user.tenantId)
    return {"success": True}


# ============================================================================
# TRAVEL
# ============================================================================


@router.get("/travel")
async def list_travel(
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/travel"""
    return await service.list_travel(tenant_id=user.tenantId)


@router.post("/travel", status_code=201)
async def create_travel(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/travel"""
    return await service.create_travel(tenant_id=user.tenantId, data=body)


@router.get("/travel/{item_id}")
async def get_travel(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/travel/{id}"""
    return await service.get_travel(travel_id=item_id, tenant_id=user.tenantId)


@router.put("/travel/{item_id}")
async def update_travel(
    item_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """PUT /api/v1/hr/travel/{id}"""
    return await service.update_travel(travel_id=item_id, tenant_id=user.tenantId, data=body)


@router.delete("/travel/{item_id}")
async def delete_travel(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """DELETE /api/v1/hr/travel/{id}"""
    await service.delete_travel(travel_id=item_id, tenant_id=user.tenantId)
    return {"success": True}


# ============================================================================
# MEDICAL
# ============================================================================


@router.get("/medical")
async def list_medical(
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/medical"""
    return await service.list_medical(tenant_id=user.tenantId)


@router.post("/medical", status_code=201)
async def create_medical(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/medical"""
    return await service.create_medical(tenant_id=user.tenantId, data=body)


@router.get("/medical/{item_id}")
async def get_medical(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/medical/{id}"""
    return await service.get_medical(medical_id=item_id, tenant_id=user.tenantId)


@router.put("/medical/{item_id}")
async def update_medical(
    item_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """PUT /api/v1/hr/medical/{id}"""
    return await service.update_medical(medical_id=item_id, tenant_id=user.tenantId, data=body)


@router.delete("/medical/{item_id}")
async def delete_medical(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """DELETE /api/v1/hr/medical/{id}"""
    await service.delete_medical(medical_id=item_id, tenant_id=user.tenantId)
    return {"success": True}


# ============================================================================
# EXPENSES
# ============================================================================


@router.get("/expenses")
async def list_expenses(
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/expenses"""
    return await service.list_expenses(tenant_id=user.tenantId)


@router.post("/expenses", status_code=201)
async def create_expense(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/expenses"""
    return await service.create_expense(tenant_id=user.tenantId, data=body)


@router.get("/expenses/{item_id}")
async def get_expense(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/expenses/{id}"""
    return await service.get_expense(expense_id=item_id, tenant_id=user.tenantId)


@router.put("/expenses/{item_id}")
async def update_expense(
    item_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """PUT /api/v1/hr/expenses/{id}"""
    return await service.update_expense(expense_id=item_id, tenant_id=user.tenantId, data=body)


@router.delete("/expenses/{item_id}")
async def delete_expense(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """DELETE /api/v1/hr/expenses/{id}"""
    await service.delete_expense(expense_id=item_id, tenant_id=user.tenantId)
    return {"success": True}


# ============================================================================
# DOCUMENTS
# ============================================================================


@router.get("/documents")
async def list_documents(
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/documents"""
    return await service.list_documents(tenant_id=user.tenantId)


@router.post("/documents", status_code=201)
async def create_document(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/documents"""
    return await service.create_document(tenant_id=user.tenantId, data=body)


@router.get("/documents/{item_id}")
async def get_document(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/documents/{id}"""
    return await service.get_document(doc_id=item_id, tenant_id=user.tenantId)


@router.put("/documents/{item_id}")
async def update_document(
    item_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """PUT /api/v1/hr/documents/{id}"""
    return await service.update_document(doc_id=item_id, tenant_id=user.tenantId, data=body)


@router.delete("/documents/{item_id}")
async def delete_document(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """DELETE /api/v1/hr/documents/{id}"""
    await service.delete_document(doc_id=item_id, tenant_id=user.tenantId)
    return {"success": True}



# ============================================================================
# ANNOUNCEMENTS
# ============================================================================


@router.get("/announcements")
async def list_announcements(
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/announcements"""
    return await service.list_announcements(tenant_id=user.tenantId)


@router.post("/announcements", status_code=201)
async def create_announcement(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/announcements"""
    return await service.create_announcement(tenant_id=user.tenantId, user=user, data=body)


@router.get("/announcements/{item_id}")
async def get_announcement(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/announcements/{id}"""
    return await service.get_announcement(ann_id=item_id, tenant_id=user.tenantId)


@router.put("/announcements/{item_id}")
async def update_announcement(
    item_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """PUT /api/v1/hr/announcements/{id}"""
    return await service.update_announcement(ann_id=item_id, tenant_id=user.tenantId, user=user, data=body)


@router.delete("/announcements/{item_id}")
async def delete_announcement(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """DELETE /api/v1/hr/announcements/{id}"""
    await service.delete_announcement(ann_id=item_id, tenant_id=user.tenantId)
    return {"success": True}


# ============================================================================
# ASSETS
# ============================================================================


@router.get("/assets")
async def list_assets(
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/assets"""
    return await service.list_assets(tenant_id=user.tenantId)


@router.post("/assets", status_code=201)
async def create_asset(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/assets"""
    return await service.create_asset(tenant_id=user.tenantId, data=body)


@router.get("/assets/{item_id}")
async def get_asset(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/assets/{id}"""
    return await service.get_asset(asset_id=item_id, tenant_id=user.tenantId)


@router.put("/assets/{item_id}")
async def update_asset(
    item_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """PUT /api/v1/hr/assets/{id}"""
    return await service.update_asset(asset_id=item_id, tenant_id=user.tenantId, data=body)


@router.delete("/assets/{item_id}")
async def delete_asset(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """DELETE /api/v1/hr/assets/{id}"""
    await service.delete_asset(asset_id=item_id, tenant_id=user.tenantId)
    return {"success": True}


# ============================================================================
# SHIFTS
# ============================================================================


@router.get("/shifts")
async def list_shifts(
    user: AuthUser = Depends(_hr_auth),
    view: str = Query(default=""),
):
    """GET /api/v1/hr/shifts"""
    return await service.list_shifts(tenant_id=user.tenantId, view=view)


@router.post("/shifts", status_code=201)
async def create_shift(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/shifts — create shift or assign schedule"""
    action = body.get("action", "create")
    if action == "assign_schedule":
        return await service.create_shift_schedule(tenant_id=user.tenantId, data=body)
    return await service.create_shift(tenant_id=user.tenantId, data=body)


# ============================================================================
# HOLIDAYS
# ============================================================================


@router.get("/holidays")
async def list_holidays(
    user: AuthUser = Depends(_hr_auth),
    year: int = Query(default=0),
):
    """GET /api/v1/hr/holidays"""
    return await service.list_holidays(tenant_id=user.tenantId, year=year)


@router.post("/holidays", status_code=201)
async def create_holiday(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/holidays"""
    return await service.create_holiday(tenant_id=user.tenantId, data=body)


# ============================================================================
# VISITORS
# ============================================================================


@router.get("/visitors")
async def list_visitors(
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/visitors"""
    return await service.list_visitors(tenant_id=user.tenantId)


@router.post("/visitors", status_code=201)
async def create_visitor(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/visitors"""
    return await service.create_visitor(tenant_id=user.tenantId, data=body)


@router.get("/visitors/{item_id}")
async def get_visitor(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/visitors/{id}"""
    return await service.get_visitor(visitor_id=item_id, tenant_id=user.tenantId)


@router.put("/visitors/{item_id}")
async def update_visitor(
    item_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """PUT /api/v1/hr/visitors/{id}"""
    return await service.update_visitor(visitor_id=item_id, tenant_id=user.tenantId, data=body)


@router.delete("/visitors/{item_id}")
async def delete_visitor(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """DELETE /api/v1/hr/visitors/{id}"""
    await service.delete_visitor(visitor_id=item_id, tenant_id=user.tenantId)
    return {"success": True}


# ============================================================================
# PERFORMANCE
# ============================================================================


@router.get("/performance")
async def list_performance(
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/performance"""
    return await service.list_performance(tenant_id=user.tenantId)


@router.post("/performance", status_code=201)
async def create_performance(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/performance"""
    return await service.create_performance(tenant_id=user.tenantId, user=user, data=body)


@router.get("/performance/{item_id}")
async def get_performance(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/performance/{id}"""
    return await service.get_performance(perf_id=item_id, tenant_id=user.tenantId)


@router.put("/performance/{item_id}")
async def update_performance(
    item_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """PUT /api/v1/hr/performance/{id}"""
    return await service.update_performance(perf_id=item_id, tenant_id=user.tenantId, data=body)


@router.delete("/performance/{item_id}")
async def delete_performance(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """DELETE /api/v1/hr/performance/{id}"""
    await service.delete_performance(perf_id=item_id, tenant_id=user.tenantId)
    return {"success": True}


# ============================================================================
# DISCIPLINARY
# ============================================================================


@router.get("/disciplinary")
async def list_disciplinary(
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/disciplinary"""
    return await service.list_disciplinary(tenant_id=user.tenantId)


@router.post("/disciplinary", status_code=201)
async def create_disciplinary(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/disciplinary"""
    return await service.create_disciplinary(tenant_id=user.tenantId, user=user, data=body)


@router.get("/disciplinary/{item_id}")
async def get_disciplinary(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/disciplinary/{id}"""
    return await service.get_disciplinary(disc_id=item_id, tenant_id=user.tenantId)


@router.put("/disciplinary/{item_id}")
async def update_disciplinary(
    item_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """PUT /api/v1/hr/disciplinary/{id}"""
    return await service.update_disciplinary(disc_id=item_id, tenant_id=user.tenantId, data=body)


@router.delete("/disciplinary/{item_id}")
async def delete_disciplinary(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """DELETE /api/v1/hr/disciplinary/{id}"""
    await service.delete_disciplinary(disc_id=item_id, tenant_id=user.tenantId)
    return {"success": True}


# ============================================================================
# SETTINGS
# ============================================================================


@router.get("/settings")
async def list_settings(
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/settings"""
    return await service.list_settings(tenant_id=user.tenantId)


@router.post("/settings", status_code=201)
async def create_setting(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/settings — create leave type, shift, or holiday"""
    return await service.create_setting(tenant_id=user.tenantId, data=body)


@router.get("/settings/{item_id}")
async def get_setting(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/settings/{id}"""
    return await service.get_setting(setting_id=item_id, tenant_id=user.tenantId)


@router.put("/settings/{item_id}")
async def update_setting(
    item_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """PUT /api/v1/hr/settings/{id}"""
    return await service.update_setting(setting_id=item_id, tenant_id=user.tenantId, data=body)


@router.delete("/settings/{item_id}")
async def delete_setting(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """DELETE /api/v1/hr/settings/{id}"""
    await service.delete_setting(setting_id=item_id, tenant_id=user.tenantId)
    return {"success": True}


# ============================================================================
# REPORTS
# ============================================================================


@router.get("/reports")
async def list_reports(
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/reports"""
    return await service.list_reports()


@router.post("/reports", status_code=202)
async def generate_report(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/reports"""
    return await service.generate_report(data=body)


@router.get("/reports/{item_id}")
async def get_report(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/reports/{id}"""
    return await service.get_report(report_id=item_id)


@router.put("/reports/{item_id}")
async def update_report(
    item_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """PUT /api/v1/hr/reports/{id}"""
    return await service.update_report(report_id=item_id, data=body)


@router.delete("/reports/{item_id}")
async def delete_report(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """DELETE /api/v1/hr/reports/{id}"""
    await service.delete_report(report_id=item_id)
    return {"success": True}


# ============================================================================
# DASHBOARD
# ============================================================================


@router.get("/dashboard")
async def hr_dashboard(
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/dashboard"""
    return await service.get_dashboard(tenant_id=user.tenantId)


# ============================================================================
# RECRUITMENT — JOBS
# ============================================================================


@router.get("/recruitment/jobs")
async def list_jobs(
    user: AuthUser = Depends(_hr_auth),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=50, ge=1, le=100),
    status: str = Query(default=""),
    search: str = Query(default=""),
):
    """GET /api/v1/hr/recruitment/jobs"""
    return await service.list_jobs(
        tenant_id=user.tenantId,
        page=page,
        page_size=pageSize,
        status=status,
        search=search,
    )


@router.post("/recruitment/jobs", status_code=201)
async def create_job(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/recruitment/jobs"""
    return await service.create_job(tenant_id=user.tenantId, data=body)


@router.get("/recruitment/jobs/{item_id}")
async def get_job(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/recruitment/jobs/{id}"""
    return await service.get_job(job_id=item_id, tenant_id=user.tenantId)


@router.put("/recruitment/jobs/{item_id}")
async def update_job(
    item_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """PUT /api/v1/hr/recruitment/jobs/{id}"""
    return await service.update_job(job_id=item_id, tenant_id=user.tenantId, data=body)


@router.delete("/recruitment/jobs/{item_id}")
async def delete_job(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """DELETE /api/v1/hr/recruitment/jobs/{id}"""
    await service.delete_job(job_id=item_id, tenant_id=user.tenantId)
    return {"success": True}


# ============================================================================
# RECRUITMENT — CANDIDATES
# ============================================================================


@router.get("/recruitment/candidates")
async def list_candidates(
    user: AuthUser = Depends(_hr_auth),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=50, ge=1, le=100),
    status: str = Query(default=""),
    jobId: str = Query(default="", alias="jobId"),
    search: str = Query(default=""),
):
    """GET /api/v1/hr/recruitment/candidates"""
    return await service.list_candidates(
        tenant_id=user.tenantId,
        page=page,
        page_size=pageSize,
        status=status,
        job_id=jobId,
        search=search,
    )


@router.post("/recruitment/candidates", status_code=201)
async def create_candidate(
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """POST /api/v1/hr/recruitment/candidates"""
    return await service.create_candidate(tenant_id=user.tenantId, data=body)


@router.get("/recruitment/candidates/{item_id}")
async def get_candidate(
    item_id: str,
    user: AuthUser = Depends(_hr_auth),
):
    """GET /api/v1/hr/recruitment/candidates/{id}"""
    return await service.get_candidate(candidate_id=item_id, tenant_id=user.tenantId)


@router.put("/recruitment/candidates/{item_id}")
async def update_candidate(
    item_id: str,
    body: dict[str, Any],
    user: AuthUser = Depends(_hr_auth),
):
    """PUT /api/v1/hr/recruitment/candidates/{id}"""
    return await service.update_candidate(candidate_id=item_id, tenant_id=user.tenantId, data=body)
