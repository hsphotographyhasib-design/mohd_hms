"""
HR feature business logic — all 21 sub-modules.

MOHD.HMS ENTERPRISE

Covers: employees, departments, attendance, leave, overtime, payroll,
training, travel, medical, expenses, documents, announcements, assets,
shifts, holidays, visitors, performance, disciplinary, settings, reports,
dashboard, recruitment (jobs + candidates).
"""

import math
from datetime import datetime, timezone
from typing import Any

from app.api.dependencies import AuthUser
from app.core.database import MODEL_TO_TABLE, count_records, delete_record, insert_record, query_table, update_record
from app.core.exceptions import InternalException, NotFoundException, ValidationException
from app.core.logging import get_logger
from app.integrations.supabase import get_supabase
from app.utils.helpers import generate_employee_id, sanitize_input, utcnow

log = get_logger(__name__)

# ── Table name constants ──────────────────────────────────────────────────

T_EMPLOYEE = MODEL_TO_TABLE.get("hrEmployee", "HrEmployee")
T_DEPARTMENT = MODEL_TO_TABLE.get("department", "Department")
T_ATTENDANCE = MODEL_TO_TABLE.get("attendance", "Attendance")
T_LEAVE_REQUEST = MODEL_TO_TABLE.get("hrLeaveRequest", "HrLeaveRequest")
T_LEAVE_TYPE = MODEL_TO_TABLE.get("hrLeaveType", "HrLeaveType")
T_LEAVE_BALANCE = MODEL_TO_TABLE.get("hrLeaveBalance", "HrLeaveBalance")
T_OVERTIME = MODEL_TO_TABLE.get("hrOvertimeRequest", "HrOvertimeRequest")
T_PAYROLL = MODEL_TO_TABLE.get("hrPayroll", "HrPayroll")
T_TRAINING = MODEL_TO_TABLE.get("hrTraining", "HrTraining")
T_TRAINING_RECORD = MODEL_TO_TABLE.get("hrTrainingRecord", "HrTrainingRecord")
T_TRAVEL = MODEL_TO_TABLE.get("hrTravelRequest", "HrTravelRequest")
T_MEDICAL = MODEL_TO_TABLE.get("hrMedicalRecord", "HrMedicalRecord")
T_EXPENSE = MODEL_TO_TABLE.get("hrExpenseClaim", "HrExpenseClaim")
T_DOCUMENT = MODEL_TO_TABLE.get("hrEmployeeDocument", "HrEmployeeDocument")
T_ANNOUNCEMENT = MODEL_TO_TABLE.get("hrAnnouncement", "HrAnnouncement")
T_ASSET = MODEL_TO_TABLE.get("hrAssetAssignment", "HrAssetAssignment")
T_SHIFT = MODEL_TO_TABLE.get("hrShift", "HrShift")
T_SHIFT_SCHEDULE = MODEL_TO_TABLE.get("hrShiftSchedule", "HrShiftSchedule")
T_HOLIDAY = MODEL_TO_TABLE.get("hrHoliday", "HrHoliday")
T_VISITOR = MODEL_TO_TABLE.get("hrVisitor", "HrVisitor")
T_PERFORMANCE = MODEL_TO_TABLE.get("hrPerformanceReview", "HrPerformanceReview")
T_DISCIPLINARY = MODEL_TO_TABLE.get("hrDisciplinaryAction", "HrDisciplinaryAction")
T_JOB = MODEL_TO_TABLE.get("hrJobPosition", "HrJobPosition")
T_CANDIDATE = MODEL_TO_TABLE.get("hrCandidate", "HrCandidate")
T_USER = MODEL_TO_TABLE.get("user", "User")

# Default select strings for common tables
USER_SELECT = "id,name,email,phone,avatar"


# ============================================================================
# HELPER: Resolve employee name → employee ID
# ============================================================================


async def _resolve_employee_id(tenant_id: str, employee_id: str = "", employee_name: str | None = None) -> str:
    """Resolve an employee ID from either a direct ID or an employee name lookup."""
    if employee_id:
        return employee_id
    if employee_name:
        db = get_supabase()
        # Look up HrEmployee by user name
        users = await db.query(
            T_USER,
            select="id",
            where={"tenantId": tenant_id, "name": {"contains": employee_name}},
            limit=1,
        )
        if users.get("data"):
            user_id = users["data"][0]["id"]
            emps = await db.query(T_EMPLOYEE, select="id", where={"userId": user_id}, limit=1)
            if emps.get("data"):
                return emps["data"][0]["id"]
    return ""


# ============================================================================
# EMPLOYEES
# ============================================================================


async def list_employees(
    tenant_id: str,
    page: int = 1,
    page_size: int = 20,
    search: str = "",
    department: str = "",
    status: str = "",
    employment_type: str = "",
) -> dict[str, Any]:
    where: dict[str, Any] = {}
    if department:
        where["departmentId"] = department
    if status:
        where["status"] = status
    if employment_type:
        where["employmentType"] = employment_type

    result = await query_table(
        T_EMPLOYEE,
        where=where if where else None,
        order="createdAt.desc",
        limit=page_size,
        offset=(page - 1) * page_size,
        count="exact",
        tenant_id=tenant_id,
    )
    data = result.get("data", [])
    total_str = result.get("count", "0")
    total = int(total_str) if total_str not in ("*", None) else len(data)

    # Apply search filtering in-memory (name is across relation)
    if search:
        # Try to enrich with user info
        user_ids = [d.get("userId") for d in data if d.get("userId")]
        user_map: dict[str, str] = {}
        if user_ids:
            u_res = await query_table(T_USER, select="id,name,email", where={"id": {"in": user_ids}})
            for u in u_res.get("data", []):
                user_map[u["id"]] = u.get("name", "")
        filtered = []
        s_lower = search.lower()
        for d in data:
            uid = d.get("userId", "")
            u_name = user_map.get(uid, "")
            if s_lower in (d.get("employeeId", "") or "").lower() \
               or s_lower in u_name.lower() \
               or s_lower in (d.get("designation", "") or "").lower():
                d["userName"] = u_name
                filtered.append(d)
        data = filtered

    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return {"data": data, "total": total, "page": page, "pageSize": page_size, "totalPages": total_pages}


async def get_employee(employee_id: str, tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_EMPLOYEE, where={"id": employee_id}, tenant_id=tenant_id)
    data = result.get("data", [])
    if not data:
        raise NotFoundException(resource="Employee")
    return data[0]


async def create_employee(tenant_id: str, user_id: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    if not data.get("userId"):
        raise ValidationException(message="User ID is required")
    emp_id = data.get("employeeId") or generate_employee_id(tenant_id)
    record = {
        "tenantId": tenant_id,
        "userId": sanitize_input(data.get("userId", "")),
        "employeeId": emp_id,
        "departmentId": data.get("departmentId") or None,
        "designation": sanitize_input(data.get("designation", "")),
        "employmentType": data.get("employmentType", "full_time"),
        "reportingToId": data.get("reportingToId") or None,
        "basicSalary": data.get("basicSalary") if data.get("basicSalary") is not None else None,
        "nationality": sanitize_input(data.get("nationality", "")),
        "passportNumber": sanitize_input(data.get("passportNumber", "")),
        "passportExpiry": data.get("passportExpiry") or None,
        "visaNumber": sanitize_input(data.get("visaNumber", "")),
        "visaExpiry": data.get("visaExpiry") or None,
        "drivingLicense": sanitize_input(data.get("drivingLicense", "")),
        "drivingLicenseExpiry": data.get("drivingLicenseExpiry") or None,
        "joiningDate": data.get("joiningDate") or utcnow().isoformat(),
        "probationEnds": data.get("probationEnds") or None,
        "contractEnd": data.get("contractEnd") or None,
        "bankName": sanitize_input(data.get("bankName", "")),
        "bankAccount": sanitize_input(data.get("bankAccount", "")),
        "bankBranch": sanitize_input(data.get("bankBranch", "")),
        "emergencyName": sanitize_input(data.get("emergencyName", "")),
        "emergencyPhone": sanitize_input(data.get("emergencyPhone", "")),
        "emergencyRelation": sanitize_input(data.get("emergencyRelation", "")),
        "dateOfBirth": data.get("dateOfBirth") or None,
        "gender": data.get("gender") or None,
        "maritalStatus": data.get("maritalStatus") or None,
        "bloodGroup": sanitize_input(data.get("bloodGroup", "")),
        "status": data.get("status", "active"),
        "shiftId": data.get("shiftId") or None,
        "photo": data.get("photo") or None,
    }
    result = await insert_record(T_EMPLOYEE, record)
    return {"id": result.get("id"), "employeeId": result.get("employeeId"), "status": result.get("status")}


async def update_employee(employee_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    update_data = {k: v for k, v in data.items() if v is not None and k != "id" and k != "tenantId"}
    if not update_data:
        raise ValidationException(message="No fields to update")
    return await update_record(T_EMPLOYEE, employee_id, update_data)


async def delete_employee(employee_id: str, tenant_id: str) -> None:
    await delete_record(T_EMPLOYEE, employee_id)


# ============================================================================
# DEPARTMENTS
# ============================================================================


async def list_departments(tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_DEPARTMENT, order="name.asc", tenant_id=tenant_id)
    data = result.get("data", [])
    # Also fetch active users for head assignment dropdown
    users_result = await query_table(T_USER, select="id,name,email", where={"tenantId": tenant_id, "isActive": True}, order="name.asc")
    return {"data": data, "users": users_result.get("data", [])}


async def create_department(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    name = sanitize_input(data.get("name", ""))
    if not name:
        raise ValidationException(message="Department name is required")
    record = {
        "tenantId": tenant_id,
        "name": name,
        "description": sanitize_input(data.get("description", "")),
        "headId": data.get("headId") or None,
        "isActive": data.get("isActive", True),
    }
    result = await insert_record(T_DEPARTMENT, record)
    return {"id": result.get("id"), "name": result.get("name")}


# ============================================================================
# ATTENDANCE
# ============================================================================


async def list_attendance(
    tenant_id: str,
    user_id: str,
    page: int = 1,
    page_size: int = 20,
    search: str = "",
    status: str = "",
    date_from: str = "",
    date_to: str = "",
    view: str = "",
    month: int = 0,
    year: int = 0,
) -> dict[str, Any]:
    db = get_supabase()

    # Calendar view
    if view == "calendar":
        now = datetime.now(timezone.utc)
        m = month or now.month
        y = year or now.year
        where: dict[str, Any] = {"tenantId": tenant_id, "userId": user_id}
        # Date range for the month
        start_str = f"{y}-{m:02d}-01"
        if m == 12:
            end_str = f"{y + 1}-01-01"
        else:
            end_str = f"{y}-{m + 1:02d}-01"
        where["date"] = {"gte": start_str, "lt": end_str}

        records = await db.query(T_ATTENDANCE, select="date,status", where=where, order="date.asc")
        days_in_month = (datetime(y, m + 1, 1) - datetime(y, m, 1)).days if m < 12 else 31
        calendar_days = []
        record_map = {r["date"][:10]: r["status"] for r in records.get("data", [])}
        for d in range(1, days_in_month + 1):
            full_date = f"{y}-{m:02d}-{d:02d}"
            calendar_days.append({"date": d, "fullDate": full_date, "status": record_map.get(full_date)})
        return {"calendarDays": calendar_days, "month": m, "year": y}

    # Standard paginated list
    where_list: dict[str, Any] = {}
    if status:
        where_list["status"] = status
    if date_from or date_to:
        date_filter: dict[str, Any] = {}
        if date_from:
            date_filter["gte"] = date_from
        if date_to:
            date_filter["lte"] = date_to + "T23:59:59.999Z"
        where_list["date"] = date_filter

    result = await query_table(
        T_ATTENDANCE,
        where=where_list if where_list else None,
        order="date.desc",
        limit=page_size,
        offset=(page - 1) * page_size,
        count="exact",
        tenant_id=tenant_id,
    )
    data = result.get("data", [])
    total_str = result.get("count", "0")
    total = int(total_str) if total_str not in ("*", None) else len(data)

    # Today stats
    today_str = utcnow().strftime("%Y-%m-%d")
    tomorrow_str = (utcnow().replace(hour=0, minute=0, second=0, microsecond=0)).isoformat()
    today_records = await db.query(
        T_ATTENDANCE,
        select="status",
        where={"tenantId": tenant_id, "date": {"gte": today_str, "lt": tomorrow_str}},
    )
    today_data = today_records.get("data", [])
    today_stats = {
        "present": sum(1 for r in today_data if r.get("status") == "present"),
        "absent": sum(1 for r in today_data if r.get("status") == "absent"),
        "late": sum(1 for r in today_data if r.get("status") == "late"),
        "half_day": sum(1 for r in today_data if r.get("status") == "half_day"),
        "leave": sum(1 for r in today_data if r.get("status") == "leave"),
    }

    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return {
        "data": data, "total": total, "page": page, "pageSize": page_size,
        "totalPages": total_pages, "todayStats": today_stats,
    }


async def create_attendance_action(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    db = get_supabase()
    target_user_id = data.get("userId", "")
    action = data.get("action", "")
    gps = data.get("gps")
    notes = data.get("notes")

    if not target_user_id or not action:
        raise ValidationException(message="userId and action are required")

    now = utcnow()
    today_str = now.strftime("%Y-%m-%d")
    now_iso = now.isoformat()

    # Find existing record for today
    existing = await db.query(
        T_ATTENDANCE,
        select="id,checkIn,status,notes",
        where={"tenantId": tenant_id, "userId": target_user_id, "date": {"gte": today_str, "lt": today_str + "T23:59:59.999Z"}},
        limit=1,
    )
    existing_records = existing.get("data", [])

    if action == "checkIn":
        if existing_records and existing_records[0].get("checkIn"):
            raise ValidationException(message="Already checked in today")
        # Determine status based on time (9:00 AM threshold)
        late_threshold = now.replace(hour=9, minute=0, second=0, microsecond=0)
        status = "late" if now > late_threshold else "present"

        if existing_records:
            updated = await db.update(T_ATTENDANCE, existing_records[0]["id"], {
                "checkIn": now_iso, "checkInGps": gps, "status": status, "notes": notes or existing_records[0].get("notes"),
            })
        else:
            updated = await db.insert(T_ATTENDANCE, {
                "tenantId": tenant_id, "userId": target_user_id, "date": today_str,
                "checkIn": now_iso, "checkInGps": gps, "status": status, "notes": notes,
            })
        return {"id": updated.get("id"), "status": updated.get("status"), "checkIn": updated.get("checkIn")}

    if action == "checkOut":
        if not existing_records or not existing_records[0].get("checkIn"):
            raise ValidationException(message="No check-in found for today")
        if existing_records[0].get("checkOut"):
            raise ValidationException(message="Already checked out today")

        check_in_time = datetime.fromisoformat(existing_records[0]["checkIn"].replace("Z", "+00:00"))
        hours_worked = (now - check_in_time).total_seconds() / 3600
        status = existing_records[0].get("status", "present")
        if hours_worked < 5:
            status = "half_day"

        updated = await db.update(T_ATTENDANCE, existing_records[0]["id"], {
            "checkOut": now_iso, "checkOutGps": gps, "hoursWorked": round(hours_worked, 2),
            "status": status, "notes": notes or existing_records[0].get("notes"),
        })
        return {"id": updated.get("id"), "status": updated.get("status"), "hoursWorked": updated.get("hoursWorked"), "checkOut": updated.get("checkOut")}

    raise ValidationException(message="Invalid action. Use checkIn or checkOut.")


# ============================================================================
# LEAVE
# ============================================================================


async def list_leave_requests(
    tenant_id: str,
    page: int = 1,
    page_size: int = 20,
    search: str = "",
    status: str = "",
    leave_type_id: str = "",
    view: str = "",
    user_id: str = "",
) -> dict[str, Any]:
    db = get_supabase()

    # Meta view — leave types and balances
    if view == "meta":
        leave_types = await db.query(T_LEAVE_TYPE, select="id,name,code,daysAllowed,isPaid", where={"tenantId": tenant_id, "isActive": True}, order="name.asc")
        # Get employee
        hr_emp = await db.query(T_EMPLOYEE, select="id", where={"userId": user_id}, limit=1, single=True)
        balances = []
        if hr_emp:
            year = datetime.now(timezone.utc).year
            bal_res = await db.query(T_LEAVE_BALANCE, where={"tenantId": tenant_id, "employeeId": hr_emp["id"], "year": year})
            for b in bal_res.get("data", []):
                lt = b.get("leaveTypeId")
                remaining = (b.get("totalDays", 0) or 0) - (b.get("usedDays", 0) or 0) + (b.get("carriedDays", 0) or 0)
                balances.append({
                    "leaveTypeId": lt, "totalDays": b.get("totalDays"),
                    "usedDays": b.get("usedDays"), "remaining": remaining,
                })
        return {"leaveTypes": leave_types.get("data", []), "balances": balances}

    # Standard list
    where: dict[str, Any] = {}
    if status:
        where["status"] = status
    if leave_type_id:
        where["leaveTypeId"] = leave_type_id

    result = await query_table(
        T_LEAVE_REQUEST, where=where if where else None,
        order="createdAt.desc", limit=page_size, offset=(page - 1) * page_size,
        count="exact", tenant_id=tenant_id,
    )
    data = result.get("data", [])
    total_str = result.get("count", "0")
    total = int(total_str) if total_str not in ("*", None) else len(data)

    if search:
        s_lower = search.lower()
        data = [d for d in data if s_lower in (d.get("employeeName", "") or "").lower()]

    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return {"data": data, "total": total, "page": page, "pageSize": page_size, "totalPages": total_pages}


async def create_leave_request(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    db = get_supabase()
    employee_id = data.get("employeeId", "")
    leave_type_id = data.get("leaveTypeId", "")
    start_date = data.get("startDate", "")
    end_date = data.get("endDate", "")

    if not employee_id or not leave_type_id or not start_date or not end_date:
        raise ValidationException(message="Employee, leave type, start date, and end date are required")

    # Resolve employee ID (could be user ID)
    resolved_id = employee_id
    try:
        emp = await db.query(T_EMPLOYEE, select="id,userId", where={"id": employee_id}, limit=1, single=True)
        if not emp:
            emp = await db.query(T_EMPLOYEE, select="id,userId", where={"userId": employee_id}, limit=1, single=True)
        if emp:
            resolved_id = emp["id"]
    except NotFoundException:
        pass

    # Calculate working days
    start = datetime.fromisoformat(start_date)
    end = datetime.fromisoformat(end_date)
    days = 0
    current = start
    while current <= end:
        if current.weekday() < 5:
            days += 1
        current = current.replace(day=current.day + 1) if current.day < 28 else (current.replace(month=current.month + 1, day=1) if current.month < 12 else current.replace(year=current.year + 1, month=1, day=1))

    if days <= 0:
        raise ValidationException(message="Leave must span at least 1 working day")

    record = {
        "tenantId": tenant_id, "employeeId": resolved_id, "leaveTypeId": leave_type_id,
        "startDate": start_date, "endDate": end_date, "days": days,
        "reason": data.get("reason") or None, "attachmentUrl": data.get("attachment") or None,
        "status": "PENDING",
    }
    result = await db.insert(T_LEAVE_REQUEST, record)
    return {"id": result.get("id"), "employeeId": resolved_id, "leaveTypeId": leave_type_id, "days": days, "status": "PENDING"}


async def update_leave_request(leave_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    update_data = {k: v for k, v in data.items() if v is not None and k not in ("id", "tenantId")}
    return await update_record(T_LEAVE_REQUEST, leave_id, update_data)


# ============================================================================
# OVERTIME
# ============================================================================


async def list_overtime(
    tenant_id: str,
    page: int = 1,
    page_size: int = 50,
    status: str = "",
    employee_id: str = "",
    date_from: str = "",
    date_to: str = "",
) -> dict[str, Any]:
    where: dict[str, Any] = {}
    if status:
        where["status"] = status
    if employee_id:
        where["employeeId"] = employee_id
    if date_from or date_to:
        date_filter: dict[str, Any] = {}
        if date_from:
            date_filter["gte"] = date_from
        if date_to:
            date_filter["lte"] = date_to
        where["date"] = date_filter

    result = await query_table(
        T_OVERTIME, where=where if where else None,
        order="createdAt.desc", limit=page_size, offset=(page - 1) * page_size,
        count="exact", tenant_id=tenant_id,
    )
    data = result.get("data", [])
    total_str = result.get("count", "0")
    total = int(total_str) if total_str not in ("*", None) else len(data)

    # Stats
    all_records = await query_table(T_OVERTIME, select="status,hours,totalPay", tenant_id=tenant_id)
    all_data = all_records.get("data", [])
    stats = {
        "pending": sum(1 for r in all_data if r.get("status") == "PENDING"),
        "supervisorApproved": sum(1 for r in all_data if r.get("status") == "SUPERVISOR_APPROVED"),
        "hrApproved": sum(1 for r in all_data if r.get("status") == "HR_APPROVED"),
        "rejected": sum(1 for r in all_data if r.get("status") == "REJECTED"),
        "totalHours": sum(r.get("hours", 0) or 0 for r in all_data),
        "totalAmount": sum(r.get("totalPay", 0) or 0 for r in all_data),
    }

    return {"data": data, "total": total, "stats": stats, "page": page, "pageSize": page_size}


async def create_overtime(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    db = get_supabase()
    employee_id = data.get("employeeId", "")
    ot_date = data.get("date", "")
    hours = data.get("hours", 0)

    if not employee_id or not ot_date or not hours or hours <= 0:
        raise ValidationException(message="employeeId, date, and hours (> 0) are required")

    # Get employee salary for hourly rate
    hourly_rate = data.get("rate")
    if not hourly_rate:
        emp = await db.query(T_EMPLOYEE, select="basicSalary", where={"id": employee_id}, limit=1)
        emp_data = emp.get("data", [])
        salary = emp_data[0].get("basicSalary", 0) if emp_data else 0
        hourly_rate = round((salary / 160) * 100) / 100 if salary else 0
    total_pay = round(hours * hourly_rate * 1.5 * 100) / 100

    record = {
        "tenantId": tenant_id, "employeeId": employee_id, "date": ot_date,
        "hours": hours, "reason": data.get("reason"), "rate": hourly_rate,
        "totalPay": total_pay, "status": "PENDING",
    }
    result = await db.insert(T_OVERTIME, record)
    return {"data": result, "message": "OT request created"}


async def update_overtime(overtime_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    update_data = {k: v for k, v in data.items() if v is not None and k not in ("id", "tenantId")}
    return await update_record(T_OVERTIME, overtime_id, update_data)


# ============================================================================
# PAYROLL
# ============================================================================


async def list_payroll(
    tenant_id: str,
    page: int = 1,
    page_size: int = 50,
    month: int = 0,
    year: int = 0,
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    m = month or now.month
    y = year or now.year

    where = {"month": m, "year": y}
    result = await query_table(
        T_PAYROLL, where=where, order="createdAt.desc",
        limit=page_size, offset=(page - 1) * page_size,
        count="exact", tenant_id=tenant_id,
    )
    data = result.get("data", [])
    total_str = result.get("count", "0")
    total = int(total_str) if total_str not in ("*", None) else len(data)

    # Stats
    all_records = await query_table(T_PAYROLL, select="netPay,status", where=where, tenant_id=tenant_id)
    all_data = all_records.get("data", [])
    stats = {
        "totalAmount": sum(r.get("netPay", 0) or 0 for r in all_data),
        "totalRecords": len(all_data),
        "draft": sum(1 for r in all_data if r.get("status") == "DRAFT"),
        "processed": sum(1 for r in all_data if r.get("status") == "PROCESSED"),
        "paid": sum(1 for r in all_data if r.get("status") == "PAID"),
    }

    return {"data": data, "total": total, "stats": stats, "page": page, "pageSize": page_size}


async def create_payroll(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    db = get_supabase()
    action = data.get("action", "")

    # Batch process payroll
    if action == "process":
        now = datetime.now(timezone.utc)
        m = data.get("month") or now.month
        y = data.get("year") or now.year

        employees = await db.query(
            T_EMPLOYEE, select="id,basicSalary",
            where={"tenantId": tenant_id, "status": "active"},
        )
        created = 0
        skipped = 0
        for emp in employees.get("data", []):
            basic_salary = emp.get("basicSalary") or 0
            allowances = round(basic_salary * 0.1 * 100) / 100
            tax = round(basic_salary * 0.05 * 100) / 100
            net_pay = round((basic_salary + allowances - tax) * 100) / 100

            try:
                await db.insert(T_PAYROLL, {
                    "tenantId": tenant_id, "employeeId": emp["id"], "month": m, "year": y,
                    "basicSalary": basic_salary, "allowances": allowances, "deductions": 0,
                    "overtimePay": 0, "bonus": 0, "loanDeduction": 0, "tax": tax,
                    "netPay": net_pay, "status": "DRAFT",
                    "processedBy": user.userId, "processedAt": utcnow().isoformat(),
                })
                created += 1
            except Exception:
                skipped += 1

        return {"message": f"Payroll processed: {created} records created, {skipped} skipped (already exist)", "created": created, "skipped": skipped}

    # Single record
    employee_id = data.get("employeeId", "")
    m = data.get("month")
    y = data.get("year")
    if not employee_id or not m or not y:
        raise ValidationException(message="employeeId, month, and year are required")

    record = {
        "tenantId": tenant_id, "employeeId": employee_id, "month": m, "year": y,
        "basicSalary": data.get("basicSalary", 0), "allowances": data.get("allowances", 0),
        "deductions": data.get("deductions", 0), "overtimePay": data.get("overtimePay", 0),
        "bonus": data.get("bonus", 0), "loanDeduction": data.get("loanDeduction", 0),
        "tax": data.get("tax", 0), "netPay": data.get("netPay", 0),
        "notes": data.get("notes"), "status": "DRAFT",
        "processedBy": user.userId, "processedAt": utcnow().isoformat(),
    }
    result = await db.insert(T_PAYROLL, record)
    return {"data": result, "message": "Payroll record created"}


# ============================================================================
# TRAINING
# ============================================================================


async def list_training(tenant_id: str, view: str = "") -> dict[str, Any]:
    db = get_supabase()
    if view == "records":
        records = await db.query(T_TRAINING_RECORD, where={"tenantId": tenant_id}, order="createdAt.desc")
        return {"data": records.get("data", []), "total": len(records.get("data", []))}
    records = await db.query(T_TRAINING, where={"tenantId": tenant_id}, order="createdAt.desc")
    return {"data": records.get("data", []), "total": len(records.get("data", []))}


async def get_training(training_id: str, tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_TRAINING, where={"id": training_id}, tenant_id=tenant_id)
    data = result.get("data", [])
    if not data:
        raise NotFoundException(resource="Training")
    return data[0]


async def create_training(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    title = data.get("title", "")
    start_date = data.get("startDate", "")
    if not title or not start_date:
        raise ValidationException(message="Title and start date required")
    record = {
        "tenantId": tenant_id, "title": title,
        "description": data.get("description"), "provider": data.get("provider"),
        "location": data.get("location"), "startDate": start_date,
        "endDate": data.get("endDate") or start_date,
        "cost": data.get("cost"), "maxParticipants": data.get("maxParticipants"),
        "status": data.get("status", "planned"),
    }
    result = await insert_record(T_TRAINING, record)
    return {"id": result.get("id"), "message": "Course created"}


async def update_training(training_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    update_data = {k: v for k, v in data.items() if v is not None and k not in ("id", "tenantId")}
    return await update_record(T_TRAINING, training_id, update_data)


async def delete_training(training_id: str, tenant_id: str) -> None:
    await delete_record(T_TRAINING, training_id)


# ============================================================================
# TRAVEL
# ============================================================================


async def list_travel(tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_TRAVEL, order="createdAt.desc", tenant_id=tenant_id)
    return {"data": result.get("data", []), "total": len(result.get("data", []))}


async def get_travel(travel_id: str, tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_TRAVEL, where={"id": travel_id}, tenant_id=tenant_id)
    data = result.get("data", [])
    if not data:
        raise NotFoundException(resource="Travel Request")
    return data[0]


async def create_travel(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    destination = data.get("destination", "")
    start_date = data.get("startDate", "")
    if not destination or not start_date:
        raise ValidationException(message="Destination and start date required")
    employee_id = await _resolve_employee_id(tenant_id, data.get("employeeId", ""), data.get("employeeName"))
    record = {
        "tenantId": tenant_id, "employeeId": employee_id, "destination": destination,
        "purpose": data.get("purpose", ""), "startDate": start_date,
        "endDate": data.get("endDate") or start_date,
        "budget": data.get("budget"), "notes": data.get("notes"),
    }
    result = await insert_record(T_TRAVEL, record)
    return {"id": result.get("id"), "message": "Travel request created"}


async def update_travel(travel_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    update_data = {k: v for k, v in data.items() if v is not None and k not in ("id", "tenantId")}
    return await update_record(T_TRAVEL, travel_id, update_data)


async def delete_travel(travel_id: str, tenant_id: str) -> None:
    await delete_record(T_TRAVEL, travel_id)


# ============================================================================
# MEDICAL
# ============================================================================


async def list_medical(tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_MEDICAL, order="createdAt.desc", tenant_id=tenant_id)
    return {"data": result.get("data", []), "total": len(result.get("data", []))}


async def get_medical(medical_id: str, tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_MEDICAL, where={"id": medical_id}, tenant_id=tenant_id)
    data = result.get("data", [])
    if not data:
        raise NotFoundException(resource="Medical Record")
    return data[0]


async def create_medical(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    med_date = data.get("date", "")
    if not med_date:
        raise ValidationException(message="Date required")
    employee_id = await _resolve_employee_id(tenant_id, data.get("employeeId", ""), data.get("employeeName"))
    record = {
        "tenantId": tenant_id, "employeeId": employee_id,
        "recordType": data.get("recordType", "checkup"), "provider": data.get("provider"),
        "date": med_date, "expiryDate": data.get("expiryDate"),
        "details": data.get("details"), "fileUrl": data.get("fileUrl"),
        "cost": data.get("cost"), "status": "active",
    }
    result = await insert_record(T_MEDICAL, record)
    return {"id": result.get("id"), "message": "Record created"}


async def update_medical(medical_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    update_data = {k: v for k, v in data.items() if v is not None and k not in ("id", "tenantId")}
    return await update_record(T_MEDICAL, medical_id, update_data)


async def delete_medical(medical_id: str, tenant_id: str) -> None:
    await delete_record(T_MEDICAL, medical_id)


# ============================================================================
# EXPENSES
# ============================================================================


async def list_expenses(tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_EXPENSE, order="createdAt.desc", tenant_id=tenant_id)
    return {"data": result.get("data", []), "total": len(result.get("data", []))}


async def get_expense(expense_id: str, tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_EXPENSE, where={"id": expense_id}, tenant_id=tenant_id)
    data = result.get("data", [])
    if not data:
        raise NotFoundException(resource="Expense Claim")
    return data[0]


async def create_expense(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    amount = data.get("amount")
    expense_date = data.get("expenseDate", "")
    if not amount or not expense_date:
        raise ValidationException(message="Amount and date required")
    employee_id = await _resolve_employee_id(tenant_id, data.get("employeeId", ""), data.get("employeeName"))
    record = {
        "tenantId": tenant_id, "employeeId": employee_id,
        "category": data.get("category", "other"), "amount": float(amount),
        "description": data.get("description", ""), "receiptUrl": data.get("receiptUrl"),
        "expenseDate": expense_date,
    }
    result = await insert_record(T_EXPENSE, record)
    return {"id": result.get("id"), "message": "Expense submitted"}


async def update_expense(expense_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    update_data = {k: v for k, v in data.items() if v is not None and k not in ("id", "tenantId")}
    return await update_record(T_EXPENSE, expense_id, update_data)


async def delete_expense(expense_id: str, tenant_id: str) -> None:
    await delete_record(T_EXPENSE, expense_id)


# ============================================================================
# DOCUMENTS
# ============================================================================


async def list_documents(tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_DOCUMENT, order="createdAt.desc", tenant_id=tenant_id)
    return {"data": result.get("data", []), "total": len(result.get("data", []))}


async def get_document(doc_id: str, tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_DOCUMENT, where={"id": doc_id}, tenant_id=tenant_id)
    data = result.get("data", [])
    if not data:
        raise NotFoundException(resource="Document")
    return data[0]


async def create_document(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    title = data.get("title", "")
    file_url = data.get("fileUrl", "")
    if not title or not file_url:
        raise ValidationException(message="Title and file URL required")
    employee_id = await _resolve_employee_id(tenant_id, data.get("employeeId", ""), data.get("employeeName"))
    record = {
        "tenantId": tenant_id, "employeeId": employee_id,
        "documentType": data.get("documentType", "other"), "title": title, "fileUrl": file_url,
        "expiryDate": data.get("expiryDate"), "reminderDays": data.get("reminderDays", 30),
        "status": "active",
    }
    result = await insert_record(T_DOCUMENT, record)
    return {"id": result.get("id"), "message": "Document uploaded"}


async def update_document(doc_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    update_data = {k: v for k, v in data.items() if v is not None and k not in ("id", "tenantId")}
    return await update_record(T_DOCUMENT, doc_id, update_data)


async def delete_document(doc_id: str, tenant_id: str) -> None:
    await delete_record(T_DOCUMENT, doc_id)


# ============================================================================
# ANNOUNCEMENTS
# ============================================================================


async def list_announcements(tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_ANNOUNCEMENT, order="createdAt.desc", tenant_id=tenant_id)
    return {"data": result.get("data", []), "total": len(result.get("data", []))}


async def get_announcement(ann_id: str, tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_ANNOUNCEMENT, where={"id": ann_id}, tenant_id=tenant_id)
    data = result.get("data", [])
    if not data:
        raise NotFoundException(resource="Announcement")
    return data[0]


async def create_announcement(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    title = data.get("title", "")
    content = data.get("content", "")
    if not title or not content:
        raise ValidationException(message="Title and content required")
    is_published = data.get("status") == "published"
    record = {
        "tenantId": tenant_id, "title": title, "content": content,
        "type": data.get("type", "info"), "priority": data.get("priority", "normal"),
        "status": data.get("status", "draft"),
        "publishedBy": user.userId if is_published else None,
        "publishedAt": utcnow().isoformat() if is_published else None,
    }
    result = await insert_record(T_ANNOUNCEMENT, record)
    return {"id": result.get("id"), "message": "Announcement created"}


async def update_announcement(ann_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    update_data = {k: v for k, v in data.items() if v is not None and k not in ("id", "tenantId")}
    if data.get("status") == "published" and not data.get("publishedBy"):
        update_data["publishedBy"] = user.userId
        update_data["publishedAt"] = utcnow().isoformat()
    return await update_record(T_ANNOUNCEMENT, ann_id, update_data)


async def delete_announcement(ann_id: str, tenant_id: str) -> None:
    await delete_record(T_ANNOUNCEMENT, ann_id)


# ============================================================================
# ASSETS
# ============================================================================


async def list_assets(tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_ASSET, order="createdAt.desc", tenant_id=tenant_id)
    return {"data": result.get("data", []), "total": len(result.get("data", []))}


async def get_asset(asset_id: str, tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_ASSET, where={"id": asset_id}, tenant_id=tenant_id)
    data = result.get("data", [])
    if not data:
        raise NotFoundException(resource="Asset")
    return data[0]


async def create_asset(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    asset_name = data.get("assetName", "")
    if not asset_name:
        raise ValidationException(message="Asset name required")
    employee_id = await _resolve_employee_id(tenant_id, data.get("employeeId", ""), data.get("employeeName"))
    record = {
        "tenantId": tenant_id, "employeeId": employee_id,
        "assetType": data.get("assetType", "laptop"), "assetName": asset_name,
        "serialNumber": data.get("serialNumber"), "condition": data.get("condition", "new"),
        "notes": data.get("notes"),
    }
    result = await insert_record(T_ASSET, record)
    return {"id": result.get("id"), "message": "Asset assigned"}


async def update_asset(asset_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    update_data = {k: v for k, v in data.items() if v is not None and k not in ("id", "tenantId")}
    return await update_record(T_ASSET, asset_id, update_data)


async def delete_asset(asset_id: str, tenant_id: str) -> None:
    await delete_record(T_ASSET, asset_id)


# ============================================================================
# SHIFTS
# ============================================================================


async def list_shifts(tenant_id: str, view: str = "") -> dict[str, Any]:
    db = get_supabase()
    if view == "schedules":
        schedules = await db.query(T_SHIFT_SCHEDULE, where={"tenantId": tenant_id}, order="effectiveFrom.desc")
        return {"schedules": schedules.get("data", [])}
    shifts = await db.query(T_SHIFT, where={"tenantId": tenant_id}, order="createdAt.desc")
    return {"shifts": shifts.get("data", [])}


async def create_shift(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    name = data.get("name", "")
    start_time = data.get("startTime", "")
    end_time = data.get("endTime", "")
    if not name or not start_time or not end_time:
        raise ValidationException(message="Name, start time, and end time are required")
    record = {
        "tenantId": tenant_id, "name": name, "startTime": start_time,
        "endTime": end_time, "breakMinutes": data.get("breakMinutes", 0),
        "color": data.get("color", "#3b82f6"), "isActive": data.get("isActive", True),
    }
    result = await insert_record(T_SHIFT, record)
    return {"id": result.get("id"), "name": result.get("name")}


async def create_shift_schedule(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    employee_id = data.get("employeeId", "")
    shift_id = data.get("shiftId", "")
    effective_from = data.get("effectiveFrom", "")
    if not employee_id or not shift_id or not effective_from:
        raise ValidationException(message="Employee, shift, and effective from date are required")
    record = {
        "tenantId": tenant_id, "employeeId": employee_id, "shiftId": shift_id,
        "effectiveFrom": effective_from, "effectiveTo": data.get("effectiveTo"),
        "weeklyOffDays": data.get("weeklyOffDays", "[]"),
    }
    result = await insert_record(T_SHIFT_SCHEDULE, record)
    return {"id": result.get("id"), "employeeId": employee_id, "shiftId": shift_id, "effectiveFrom": effective_from}


# ============================================================================
# HOLIDAYS
# ============================================================================


async def list_holidays(tenant_id: str, year: int = 0) -> dict[str, Any]:
    result = await query_table(T_HOLIDAY, order="date.asc", tenant_id=tenant_id)
    data = result.get("data", [])
    if year:
        data = [h for h in data if h.get("date", "").startswith(str(year))]
    return {"holidays": data, "total": len(data)}


async def create_holiday(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    name = data.get("name", "")
    h_date = data.get("date", "")
    if not name or not h_date:
        raise ValidationException(message="Name and date are required")
    record = {
        "tenantId": tenant_id, "name": name, "date": h_date,
        "type": data.get("type", "public"), "recurring": data.get("recurring", False),
    }
    result = await insert_record(T_HOLIDAY, record)
    return {"id": result.get("id"), "name": result.get("name"), "date": result.get("date")}


# ============================================================================
# VISITORS
# ============================================================================


async def list_visitors(tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_VISITOR, order="createdAt.desc", tenant_id=tenant_id)
    return {"data": result.get("data", []), "total": len(result.get("data", []))}


async def get_visitor(visitor_id: str, tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_VISITOR, where={"id": visitor_id}, tenant_id=tenant_id)
    data = result.get("data", [])
    if not data:
        raise NotFoundException(resource="Visitor")
    return data[0]


async def create_visitor(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    name = data.get("name", "")
    if not name:
        raise ValidationException(message="Name required")
    host_employee_id = await _resolve_employee_id(tenant_id, "", data.get("hostName"))
    record = {
        "tenantId": tenant_id, "name": name,
        "email": data.get("email"), "phone": data.get("phone"),
        "company": data.get("company"), "purpose": data.get("purpose"),
        "hostEmployeeId": host_employee_id or None,
        "idNumber": data.get("idNumber"), "status": "expected",
    }
    result = await insert_record(T_VISITOR, record)
    return {"id": result.get("id"), "message": "Visitor registered"}


async def update_visitor(visitor_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    update_data = {k: v for k, v in data.items() if v is not None and k not in ("id", "tenantId")}
    return await update_record(T_VISITOR, visitor_id, update_data)


async def delete_visitor(visitor_id: str, tenant_id: str) -> None:
    await delete_record(T_VISITOR, visitor_id)


# ============================================================================
# PERFORMANCE
# ============================================================================


async def list_performance(tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_PERFORMANCE, order="createdAt.desc", tenant_id=tenant_id)
    return {"data": result.get("data", []), "total": len(result.get("data", []))}


async def get_performance(perf_id: str, tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_PERFORMANCE, where={"id": perf_id}, tenant_id=tenant_id)
    data = result.get("data", [])
    if not data:
        raise NotFoundException(resource="Performance Review")
    return data[0]


async def create_performance(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    period = data.get("period", "")
    if not period:
        raise ValidationException(message="Period is required")
    employee_id = await _resolve_employee_id(tenant_id, data.get("employeeId", ""), data.get("employeeName"))
    kpi = data.get("kpiScore")
    goals = data.get("goalsScore")
    overall = data.get("overallScore") or ((kpi + goals) / 2 if kpi and goals else None)
    record = {
        "tenantId": tenant_id, "employeeId": employee_id, "period": period,
        "type": data.get("type", "quarterly"), "kpiScore": kpi, "goalsScore": goals,
        "overallScore": overall, "rating": data.get("rating"),
        "employeeComments": data.get("employeeComments"),
        "managerComments": data.get("managerComments"),
        "status": data.get("status", "draft"),
        "reviewerId": data.get("reviewerId") or user.userId,
    }
    result = await insert_record(T_PERFORMANCE, record)
    return {"id": result.get("id"), "message": "Review created"}


async def update_performance(perf_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    update_data = {k: v for k, v in data.items() if v is not None and k not in ("id", "tenantId")}
    if data.get("completedAt"):
        update_data["completedAt"] = data["completedAt"]
    return await update_record(T_PERFORMANCE, perf_id, update_data)


async def delete_performance(perf_id: str, tenant_id: str) -> None:
    await delete_record(T_PERFORMANCE, perf_id)


# ============================================================================
# DISCIPLINARY
# ============================================================================


async def list_disciplinary(tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_DISCIPLINARY, order="createdAt.desc", tenant_id=tenant_id)
    return {"data": result.get("data", []), "total": len(result.get("data", []))}


async def get_disciplinary(disc_id: str, tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_DISCIPLINARY, where={"id": disc_id}, tenant_id=tenant_id)
    data = result.get("data", [])
    if not data:
        raise NotFoundException(resource="Disciplinary Action")
    return data[0]


async def create_disciplinary(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    description = data.get("description", "")
    incident_date = data.get("incidentDate", "")
    if not description or not incident_date:
        raise ValidationException(message="Description and incident date required")
    employee_id = await _resolve_employee_id(tenant_id, data.get("employeeId", ""), data.get("employeeName"))
    record = {
        "tenantId": tenant_id, "employeeId": employee_id,
        "type": data.get("type", "warning"), "severity": data.get("severity", "minor"),
        "description": description, "incidentDate": incident_date,
        "actionTaken": data.get("actionTaken"), "issuedBy": user.userId,
    }
    result = await insert_record(T_DISCIPLINARY, record)
    return {"id": result.get("id"), "message": "Disciplinary action recorded"}


async def update_disciplinary(disc_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    update_data = {k: v for k, v in data.items() if v is not None and k not in ("id", "tenantId")}
    return await update_record(T_DISCIPLINARY, disc_id, update_data)


async def delete_disciplinary(disc_id: str, tenant_id: str) -> None:
    await delete_record(T_DISCIPLINARY, disc_id)


# ============================================================================
# SETTINGS
# ============================================================================


async def list_settings(tenant_id: str) -> dict[str, Any]:
    db = get_supabase()
    leave_types = await db.query(T_LEAVE_TYPE, where={"tenantId": tenant_id}, order="name.asc")
    shifts = await db.query(T_SHIFT, where={"tenantId": tenant_id}, order="name.asc")
    holidays = await db.query(T_HOLIDAY, where={"tenantId": tenant_id}, order="date.asc")
    return {
        "leaveTypes": leave_types.get("data", []),
        "shifts": shifts.get("data", []),
        "holidays": holidays.get("data", []),
    }


async def create_setting(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    section = data.get("section", "")
    db = get_supabase()

    if section == "leave_types":
        name = data.get("name", "")
        code = data.get("code", "")
        if not name or not code:
            raise ValidationException(message="Name and code required")
        result = await db.insert(T_LEAVE_TYPE, {
            "tenantId": tenant_id, "name": name, "code": code.upper(),
            "daysAllowed": float(data.get("daysAllowed", 0)),
            "isPaid": data.get("isPaid", True), "carryForward": data.get("carryForward", False),
            "maxCarryDays": float(data["maxCarryDays"]) if data.get("maxCarryDays") else None,
            "requiresDoc": data.get("requiresDoc", False),
        })
        return {"id": result.get("id"), "message": "Created"}

    if section == "shifts":
        name = data.get("name", "")
        if not name:
            raise ValidationException(message="Name required")
        result = await db.insert(T_SHIFT, {
            "tenantId": tenant_id, "name": name,
            "startTime": data.get("startTime", "08:00"),
            "endTime": data.get("endTime", "17:00"),
            "breakMinutes": int(data.get("breakMinutes", 60)),
        })
        return {"id": result.get("id"), "message": "Created"}

    if section == "holidays":
        name = data.get("name", "")
        h_date = data.get("date", "")
        if not name or not h_date:
            raise ValidationException(message="Name and date required")
        result = await db.insert(T_HOLIDAY, {
            "tenantId": tenant_id, "name": name, "date": h_date,
            "type": data.get("type", "public"), "recurring": data.get("recurring", False),
        })
        return {"id": result.get("id"), "message": "Created"}

    raise ValidationException(message="Invalid section")


async def get_setting(setting_id: str, tenant_id: str) -> dict[str, Any]:
    # Try leave types, shifts, holidays tables
    for table in (T_LEAVE_TYPE, T_SHIFT, T_HOLIDAY):
        result = await query_table(table, where={"id": setting_id}, tenant_id=tenant_id)
        if result.get("data"):
            return result["data"][0]
    raise NotFoundException(resource="HR Setting")


async def update_setting(setting_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    update_data = {k: v for k, v in data.items() if v is not None and k not in ("id", "tenantId", "section")}
    # Try each table
    for table in (T_LEAVE_TYPE, T_SHIFT, T_HOLIDAY):
        result = await query_table(table, where={"id": setting_id}, tenant_id=tenant_id, select="id")
        if result.get("data"):
            return await update_record(table, setting_id, update_data)
    raise NotFoundException(resource="HR Setting")


async def delete_setting(setting_id: str, tenant_id: str) -> None:
    for table in (T_LEAVE_TYPE, T_SHIFT, T_HOLIDAY):
        result = await query_table(table, where={"id": setting_id}, tenant_id=tenant_id, select="id")
        if result.get("data"):
            await delete_record(table, setting_id)
            return
    raise NotFoundException(resource="HR Setting")


# ============================================================================
# REPORTS
# ============================================================================


REPORT_TYPES = [
    {"id": "attendance", "title": "Attendance Report", "description": "Employee attendance summary, late arrivals, and absence patterns."},
    {"id": "leave", "title": "Leave Report", "description": "Leave usage by type and department-wise leave trends."},
    {"id": "payroll", "title": "Payroll Report", "description": "Salary disbursement, deductions, and net pay breakdown."},
    {"id": "department", "title": "Department Report", "description": "Headcount, turnover rate, and performance metrics."},
    {"id": "employee", "title": "Employee Report", "description": "Employee demographics, tenure distribution, and status."},
    {"id": "overtime", "title": "Overtime Report", "description": "Overtime hours, costs, and approval trends."},
    {"id": "training", "title": "Training Report", "description": "Training completion rates and certification status."},
    {"id": "performance", "title": "Performance Report", "description": "Performance scores and ratings distribution."},
]


async def list_reports() -> dict[str, Any]:
    data = [{**r, "exportFormats": ["pdf", "excel", "csv"]} for r in REPORT_TYPES]
    return {"data": data, "total": len(data)}


async def generate_report(data: dict[str, Any]) -> dict[str, Any]:
    report_id = data.get("reportId") or data.get("id", "")
    report = next((r for r in REPORT_TYPES if r["id"] == report_id), None)
    if not report:
        raise ValidationException(message="Invalid report type")
    return {"success": True, "message": f"{report['title']} generation initiated. Report will be available shortly.", "reportId": report["id"]}


async def get_report(report_id: str) -> dict[str, Any]:
    report = next((r for r in REPORT_TYPES if r["id"] == report_id), None)
    if not report:
        raise NotFoundException(resource="Report")
    return {**report, "exportFormats": ["pdf", "excel", "csv"]}


async def update_report(report_id: str, data: dict[str, Any]) -> dict[str, Any]:
    # Reports are config-based, not DB records — return updated metadata
    report = next((r for r in REPORT_TYPES if r["id"] == report_id), None)
    if not report:
        raise NotFoundException(resource="Report")
    return {**report, "exportFormats": ["pdf", "excel", "csv"]}


async def delete_report(report_id: str) -> None:
    report = next((r for r in REPORT_TYPES if r["id"] == report_id), None)
    if not report:
        raise NotFoundException(resource="Report")


# ============================================================================
# DASHBOARD
# ============================================================================


async def get_dashboard(tenant_id: str) -> dict[str, Any]:
    db = get_supabase()
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")
    month = now.month
    year = now.year

    # Run counts in parallel
    employees = await db.query(T_EMPLOYEE, select="id", where={"tenantId": tenant_id, "status": {"in": ["active", "on_probation"]}}, count="exact")
    total_employees = int(employees.get("count", 0)) if employees.get("count") not in ("*", None) else len(employees.get("data", []))

    attendance_today = await db.query(T_ATTENDANCE, select="id,status", where={"tenantId": tenant_id, "date": {"gte": today_str, "lt": today_str + "T23:59:59.999Z"}, "status": {"in": ["present", "late", "half_day"]}}, count="exact")
    present_today = int(attendance_today.get("count", 0)) if attendance_today.get("count") not in ("*", None) else len(attendance_today.get("data", []))

    absent_today_q = await db.query(T_ATTENDANCE, select="id", where={"tenantId": tenant_id, "date": {"gte": today_str, "lt": today_str + "T23:59:59.999Z"}, "status": "absent"}, count="exact")
    absent_today = int(absent_today_q.get("count", 0)) if absent_today_q.get("count") not in ("*", None) else len(absent_today_q.get("data", []))

    pending_leaves_q = await db.query(T_LEAVE_REQUEST, select="id", where={"tenantId": tenant_id, "status": "PENDING"}, count="exact")
    pending_leaves = int(pending_leaves_q.get("count", 0)) if pending_leaves_q.get("count") not in ("*", None) else len(pending_leaves_q.get("data", []))

    docs_q = await db.query(T_DOCUMENT, select="id", where={"tenantId": tenant_id, "status": "active"}, count="exact")
    total_docs = int(docs_q.get("count", 0)) if docs_q.get("count") not in ("*", None) else len(docs_q.get("data", []))

    payroll_q = await db.query(T_PAYROLL, select="id", where={"tenantId": tenant_id, "month": month, "year": year, "status": {"in": ["PROCESSED", "PAID"]}}, count="exact")
    payroll_status = int(payroll_q.get("count", 0)) if payroll_q.get("count") not in ("*", None) else len(payroll_q.get("data", []))

    shifts_q = await db.query(T_SHIFT, select="id", where={"tenantId": tenant_id, "isActive": True}, count="exact")
    active_shifts = int(shifts_q.get("count", 0)) if shifts_q.get("count") not in ("*", None) else len(shifts_q.get("data", []))

    ot_q = await db.query(T_OVERTIME, select="id", where={"tenantId": tenant_id, "status": {"in": ["PENDING", "APPROVED"]}}, count="exact")
    overtime_month = int(ot_q.get("count", 0)) if ot_q.get("count") not in ("*", None) else len(ot_q.get("data", []))

    training_q = await db.query(T_TRAINING_RECORD, select="id", where={"tenantId": tenant_id, "status": "completed"}, count="exact")
    training_records = int(training_q.get("count", 0)) if training_q.get("count") not in ("*", None) else len(training_q.get("data", []))

    dept_q = await db.query(T_DEPARTMENT, select="id", where={"tenantId": tenant_id, "isActive": True}, count="exact")
    dept_count = int(dept_q.get("count", 0)) if dept_q.get("count") not in ("*", None) else len(dept_q.get("data", []))

    return {
        "totalEmployees": total_employees,
        "presentToday": present_today,
        "absentToday": absent_today,
        "pendingLeaves": pending_leaves,
        "upcomingBirthdays": 0,
        "expiringDocuments": total_docs,
        "newHiresMonth": 0,
        "payrollStatus": payroll_status,
        "activeShifts": active_shifts,
        "overtimeMonth": overtime_month,
        "trainingRecords": training_records,
        "deptCount": dept_count,
    }


# ============================================================================
# RECRUITMENT — JOBS
# ============================================================================


async def list_jobs(
    tenant_id: str,
    page: int = 1,
    page_size: int = 50,
    status: str = "",
    search: str = "",
) -> dict[str, Any]:
    where: dict[str, Any] = {}
    if status:
        where["status"] = status
    if search:
        where["OR"] = [
            {"title": {"contains": search}},
            {"location": {"contains": search}},
        ]

    result = await query_table(
        T_JOB, where=where if where else None,
        order="postedDate.desc", limit=page_size, offset=(page - 1) * page_size,
        count="exact", tenant_id=tenant_id,
    )
    data = result.get("data", [])
    total_str = result.get("count", "0")
    total = int(total_str) if total_str not in ("*", None) else len(data)
    return {"data": data, "total": total, "page": page, "pageSize": page_size}


async def get_job(job_id: str, tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_JOB, where={"id": job_id}, tenant_id=tenant_id)
    data = result.get("data", [])
    if not data:
        raise NotFoundException(resource="Job Position")
    return data[0]


async def create_job(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    title = data.get("title", "")
    if not title:
        raise ValidationException(message="Job title is required")
    record = {
        "tenantId": tenant_id, "title": title,
        "departmentId": data.get("departmentId"), "type": data.get("type", "full_time"),
        "vacancies": data.get("vacancies", 1), "location": data.get("location"),
        "salaryMin": data.get("salaryMin"), "salaryMax": data.get("salaryMax"),
        "description": data.get("description"), "requirements": data.get("requirements"),
        "closingDate": data.get("closingDate"), "status": "open",
        "postedDate": utcnow().isoformat(),
    }
    result = await insert_record(T_JOB, record)
    return {"data": result, "message": "Job position created"}


async def update_job(job_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    update_data = {k: v for k, v in data.items() if v is not None and k not in ("id", "tenantId")}
    return await update_record(T_JOB, job_id, update_data)


async def delete_job(job_id: str, tenant_id: str) -> None:
    await delete_record(T_JOB, job_id)


# ============================================================================
# RECRUITMENT — CANDIDATES
# ============================================================================


async def list_candidates(
    tenant_id: str,
    page: int = 1,
    page_size: int = 50,
    status: str = "",
    job_id: str = "",
    search: str = "",
) -> dict[str, Any]:
    where: dict[str, Any] = {}
    if status:
        where["status"] = status
    if job_id:
        where["jobId"] = job_id
    if search:
        where["OR"] = [
            {"name": {"contains": search}},
            {"email": {"contains": search}},
        ]

    result = await query_table(
        T_CANDIDATE, where=where if where else None,
        order="appliedAt.desc", limit=page_size, offset=(page - 1) * page_size,
        count="exact", tenant_id=tenant_id,
    )
    data = result.get("data", [])
    total_str = result.get("count", "0")
    total = int(total_str) if total_str not in ("*", None) else len(data)
    return {"data": data, "total": total, "page": page, "pageSize": page_size}


async def get_candidate(candidate_id: str, tenant_id: str) -> dict[str, Any]:
    result = await query_table(T_CANDIDATE, where={"id": candidate_id}, tenant_id=tenant_id)
    data = result.get("data", [])
    if not data:
        raise NotFoundException(resource="Candidate")
    return data[0]


async def create_candidate(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    job_id = data.get("jobId", "")
    name = data.get("name", "")
    email = data.get("email", "")
    if not job_id or not name or not email:
        raise ValidationException(message="jobId, name, and email are required")
    record = {
        "tenantId": tenant_id, "jobId": job_id, "name": name, "email": email,
        "phone": data.get("phone"), "source": data.get("source"),
        "status": "applied", "resumeUrl": data.get("resumeUrl"),
        "coverLetterUrl": data.get("coverLetterUrl"), "notes": data.get("notes"),
        "appliedAt": utcnow().isoformat(),
    }
    result = await insert_record(T_CANDIDATE, record)
    return {"data": result, "message": "Candidate added"}


async def update_candidate(candidate_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    update_data = {k: v for k, v in data.items() if v is not None and k not in ("id", "tenantId")}
    return await update_record(T_CANDIDATE, candidate_id, update_data)
