"""
Centralized RBAC Permission Matrix.

MOHD.HMS ENTERPRISE

This is the SINGLE SOURCE OF TRUTH for all feature-level and
action-level permissions, ported 1:1 from the frontend
permissions-matrix.ts. Both frontend and backend MUST agree.

Supported roles:
  super_admin(100), admin(90), manager(80), supervisor(70),
  finance(60), hr(55), technician(50), user(40), customer(10),
  vendor(5), guest(0)
"""

from __future__ import annotations

from app.core.exceptions import ForbiddenException


# ── Role hierarchy ──────────────────────────────────────────────────────────
#
# Higher number = more privilege.

ROLE_HIERARCHY: dict[str, int] = {
    "super_admin": 100,
    "admin": 90,
    "manager": 80,
    "supervisor": 70,
    "finance": 60,
    "hr": 55,
    "technician": 50,
    "user": 40,
    "customer": 10,
    "vendor": 5,
    "guest": 0,
}

ALL_ROLES: list[str] = list(ROLE_HIERARCHY.keys())

VALID_ROLES: frozenset[str] = frozenset(ALL_ROLES)

#: Roles that can access the system (vendor and guest are deprecated).
ACTIVE_ROLES: frozenset[str] = frozenset({
    "super_admin", "admin", "manager", "supervisor",
    "technician", "finance", "hr", "user", "customer",
})

# ── Role transition matrix ──────────────────────────────────────────────────
#
# Key: operator role -> set of target roles they can assign.

ROLE_TRANSITION_MATRIX: dict[str, set[str]] = {
    "super_admin": {
        "customer", "technician", "supervisor", "finance",
        "hr", "manager", "admin", "super_admin",
    },
    "admin": {"customer", "technician", "hr", "finance"},
    # All other roles cannot change anyone's role
    "manager": set(),
    "supervisor": set(),
    "technician": set(),
    "finance": set(),
    "hr": set(),
    "user": set(),
    "customer": set(),
    "vendor": set(),
    "guest": set(),
}


# ── Feature-Level Permissions ───────────────────────────────────────────────
#
# Maps each feature/module name to the list of roles that can access it.
# Copied EXACTLY from frontend permissions-matrix.ts FEATURE_PERMISSIONS.

FEATURE_PERMISSIONS: dict[str, list[str]] = {
    # Core operational modules
    "dashboard": ["super_admin", "admin", "manager", "supervisor", "technician", "finance", "hr", "user", "customer"],
    "complaints": ["super_admin", "admin", "manager", "supervisor", "technician", "user", "customer"],
    "work-orders": ["super_admin", "admin", "manager", "supervisor", "technician"],
    "equipment": ["super_admin", "admin", "manager", "supervisor", "technician", "user", "customer"],
    "pm": ["super_admin", "admin", "manager", "supervisor", "technician"],

    # Commercial modules
    "invoices": ["super_admin", "admin", "finance", "user", "customer"],
    "quotations": ["super_admin", "admin", "supervisor", "user", "customer"],
    "finance": ["super_admin", "admin", "finance"],
    "customers": ["super_admin", "admin", "manager", "supervisor", "finance"],

    # Resource management
    "inventory": ["super_admin", "admin", "manager", "supervisor"],
    "purchases": ["super_admin", "admin", "manager"],
    "vehicles": ["super_admin", "admin", "manager"],

    # People management
    "employees": ["super_admin", "admin", "hr"],
    "technicians": ["super_admin", "admin", "manager", "supervisor"],
    "hr": ["super_admin", "admin", "hr"],

    # Communication
    "notifications": ["super_admin", "admin", "manager", "supervisor", "technician", "finance", "hr", "user", "customer"],
    "whatsapp": ["super_admin", "admin", "manager", "supervisor"],
    "email": ["super_admin", "admin"],
    "irms": ["super_admin", "admin", "manager", "supervisor", "technician"],

    # Intelligence
    "reports": ["super_admin", "admin", "manager", "supervisor", "finance"],

    # System (Super Admin only)
    "settings": ["super_admin"],
    "user-management": ["super_admin"],
    "cms": ["super_admin"],
    "documents": ["super_admin", "admin"],
    "sessions": ["super_admin", "admin"],
    "error-logs": ["super_admin"],
}


# ── Action-Level Permissions ───────────────────────────────────────────────
#
# Maps entity.action to the list of roles that can perform it.
# Copied EXACTLY from frontend permissions-matrix.ts ACTION_PERMISSIONS.

ACTION_PERMISSIONS: dict[str, dict[str, list[str]]] = {
    # Complaint actions
    "complaint": {
        "create": ["super_admin", "admin", "manager", "supervisor", "technician", "customer"],
        "view": ["super_admin", "admin", "manager", "supervisor", "technician", "finance", "user", "customer"],
        "update_fields": ["super_admin", "admin", "manager", "supervisor", "technician"],
        "delete": ["super_admin", "admin"],
        "assign_technician": ["super_admin", "admin", "supervisor", "manager"],
        "reassign_technician": ["super_admin", "admin", "supervisor", "manager"],
        "override_status": ["super_admin", "admin"],
        "approve_completion": ["super_admin", "admin", "supervisor", "manager"],
        "start_work": ["super_admin", "admin", "supervisor", "manager", "technician"],
        "complete_work": ["super_admin", "admin", "supervisor", "manager", "technician"],
        "client_confirm": ["customer", "super_admin", "admin"],
        "client_reject": ["customer", "super_admin", "admin"],
        "accept": ["technician", "super_admin", "admin", "supervisor", "manager"],
        "reject": ["technician", "super_admin", "admin", "supervisor", "manager"],
        "view_timeline": ["super_admin", "admin", "manager", "supervisor", "technician", "finance", "user", "customer"],
        "view_assignment_history": ["super_admin", "admin", "manager", "supervisor", "technician", "finance"],
        "escalate": ["super_admin", "admin", "manager", "supervisor"],
        "record_payment": ["super_admin", "admin", "finance", "manager"],
        "approve_invoice": ["super_admin", "admin", "finance", "manager"],
        "send_invoice": ["super_admin", "admin", "finance"],
        "close": ["super_admin", "admin", "supervisor", "manager"],
    },

    # Work Order actions
    "work-order": {
        "create": ["super_admin", "admin", "manager", "supervisor"],
        "view": ["super_admin", "admin", "manager", "supervisor", "technician"],
        "update": ["super_admin", "admin", "manager", "supervisor", "technician"],
        "delete": ["super_admin", "admin"],
        "assign": ["super_admin", "admin", "supervisor", "manager"],
        "start": ["super_admin", "admin", "supervisor", "manager", "technician"],
        "complete": ["super_admin", "admin", "supervisor", "manager", "technician"],
        "provide_feedback": ["customer", "super_admin", "admin"],
        "convert_to_wo": ["super_admin", "admin", "manager", "supervisor"],
    },

    # Invoice actions
    "invoice": {
        "create": ["super_admin", "admin", "finance"],
        "view": ["super_admin", "admin", "finance", "customer"],
        "update": ["super_admin", "admin", "finance"],
        "delete": ["super_admin", "admin"],
        "approve": ["super_admin", "admin", "finance"],
        "send": ["super_admin", "admin", "finance"],
        "send_whatsapp": ["super_admin", "admin", "finance"],
        "send_email": ["super_admin", "admin", "finance"],
        "record_payment": ["super_admin", "admin", "finance"],
        "generate_pdf": ["super_admin", "admin", "finance", "customer"],
        "print": ["super_admin", "admin", "finance", "customer"],
        "download": ["super_admin", "admin", "finance", "customer"],
    },

    # Quotation actions
    "quotation": {
        "create": ["super_admin", "admin", "supervisor"],
        "view": ["super_admin", "admin", "supervisor", "customer"],
        "update": ["super_admin", "admin", "supervisor"],
        "delete": ["super_admin", "admin"],
        "send": ["super_admin", "admin", "supervisor"],
        "send_whatsapp": ["super_admin", "admin", "supervisor"],
        "send_email": ["super_admin", "admin", "supervisor"],
        "convert_to_wo": ["super_admin", "admin", "supervisor"],
        "convert_to_invoice": ["super_admin", "admin", "finance"],
        "generate_pdf": ["super_admin", "admin", "supervisor", "customer"],
        "print": ["super_admin", "admin", "supervisor", "customer"],
    },

    # Equipment actions
    "equipment": {
        "create": ["super_admin", "admin", "manager"],
        "view": ["super_admin", "admin", "manager", "supervisor", "technician", "customer"],
        "update": ["super_admin", "admin", "manager", "supervisor", "technician"],
        "delete": ["super_admin", "admin"],
        "bulk_qr": ["super_admin", "admin"],
    },

    # Inventory actions
    "inventory": {
        "create": ["super_admin", "admin", "manager"],
        "view": ["super_admin", "admin", "manager", "supervisor"],
        "update": ["super_admin", "admin", "manager"],
        "delete": ["super_admin", "admin"],
        "adjust": ["super_admin", "admin", "manager"],
        "manage_warehouse": ["super_admin", "admin"],
        "manage_category": ["super_admin", "admin", "manager"],
        "manage_supplier": ["super_admin", "admin", "manager"],
        "manage_price_book": ["super_admin", "admin"],
        "manage_stock": ["super_admin", "admin", "manager", "supervisor"],
    },

    # Customer actions
    "customer": {
        "create": ["super_admin", "admin", "manager", "supervisor"],
        "view": ["super_admin", "admin", "manager", "supervisor", "finance"],
        "update": ["super_admin", "admin", "manager", "supervisor"],
        "delete": ["super_admin", "admin"],
        "export": ["super_admin", "admin", "manager"],
    },

    # Employee actions
    "employee": {
        "create": ["super_admin", "admin", "hr"],
        "view": ["super_admin", "admin", "hr"],
        "update": ["super_admin", "admin", "hr"],
        "delete": ["super_admin", "admin"],
    },

    # HR module actions
    "hr_module": {
        "manage_travel": ["super_admin", "admin", "hr"],
        "manage_leave": ["super_admin", "admin", "hr", "manager", "supervisor"],
        "manage_attendance": ["super_admin", "admin", "hr", "manager", "supervisor"],
        "manage_payroll": ["super_admin", "admin", "hr", "manager"],
        "manage_disciplinary": ["super_admin", "admin", "hr"],
        "manage_assets": ["super_admin", "admin", "hr"],
        "manage_medical": ["super_admin", "admin", "hr"],
        "manage_expenses": ["super_admin", "admin", "hr"],
        "manage_performance": ["super_admin", "admin", "hr"],
        "manage_recruitment": ["super_admin", "admin", "hr", "manager"],
        "manage_training": ["super_admin", "admin", "hr"],
        "manage_visitors": ["super_admin", "admin", "hr"],
        "manage_shifts": ["super_admin", "admin", "hr"],
        "manage_holidays": ["super_admin", "admin", "hr"],
        "manage_documents": ["super_admin", "admin", "hr"],
        "manage_announcements": ["super_admin", "admin", "hr", "manager"],
        "manage_settings": ["super_admin", "admin", "hr"],
        "view_reports": ["super_admin", "admin", "hr"],
        "view_employee_details": ["super_admin", "admin", "hr", "manager", "supervisor"],
    },

    # Purchase actions
    "purchase": {
        "create": ["super_admin", "admin", "manager"],
        "view": ["super_admin", "admin", "manager"],
        "update": ["super_admin", "admin", "manager"],
        "delete": ["super_admin", "admin"],
        "approve": ["super_admin", "admin", "manager"],
    },

    # Vehicle actions
    "vehicle": {
        "create": ["super_admin", "admin"],
        "view": ["super_admin", "admin", "manager"],
        "update": ["super_admin", "admin"],
        "delete": ["super_admin", "admin"],
    },

    # Finance module actions
    "finance_module": {
        "create": ["super_admin", "admin", "finance"],
        "view": ["super_admin", "admin", "finance"],
        "update": ["super_admin", "admin", "finance"],
        "delete": ["super_admin", "admin"],
        "record_payment": ["super_admin", "admin", "finance"],
        "approve": ["super_admin", "admin", "finance", "manager"],
        "export": ["super_admin", "admin", "finance", "manager"],
    },

    # Report actions
    "report": {
        "view": ["super_admin", "admin", "manager", "supervisor", "finance"],
        "export": ["super_admin", "admin", "manager", "finance"],
        "print": ["super_admin", "admin", "manager", "finance"],
    },

    # User management actions (Super Admin only)
    "user-management": {
        "create": ["super_admin"],
        "view": ["super_admin"],
        "update": ["super_admin"],
        "delete": ["super_admin"],
        "manage_roles": ["super_admin"],
        "deactivate": ["super_admin"],
    },

    # System actions (Super Admin only)
    "system": {
        "view_settings": ["super_admin"],
        "update_settings": ["super_admin"],
        "view_errors": ["super_admin"],
        "view_health": ["super_admin"],
        "manage_cms": ["super_admin"],
        "manage_whatsapp": ["super_admin"],
        "manage_email": ["super_admin"],
        "seed_data": ["super_admin"],
        "debug": ["super_admin"],
    },

    # Notification actions
    "notification": {
        "view": ["super_admin", "admin", "manager", "supervisor", "technician", "finance", "hr", "customer"],
        "mark_read": ["super_admin", "admin", "manager", "supervisor", "technician", "finance", "hr", "customer"],
        "send": ["super_admin", "admin", "manager", "supervisor"],
        "manage_devices": ["super_admin", "admin"],
    },

    # WhatsApp actions
    "whatsapp_module": {
        "view": ["super_admin", "admin", "manager", "supervisor"],
        "send": ["super_admin", "admin", "manager", "supervisor"],
        "manage_templates": ["super_admin", "admin"],
        "manage_campaigns": ["super_admin", "admin", "manager", "supervisor"],
        "manage_settings": ["super_admin", "admin"],
        "view_reports": ["super_admin", "admin", "manager", "supervisor"],
        "manage_ai": ["super_admin", "admin"],
    },

    # Email actions
    "email_module": {
        "view": ["super_admin", "admin"],
        "send": ["super_admin", "admin"],
        "manage_templates": ["super_admin", "admin"],
        "manage_campaigns": ["super_admin", "admin"],
        "view_logs": ["super_admin", "admin"],
        "manage_settings": ["super_admin", "admin"],
    },

    # CMS actions
    "cms_module": {
        "view": ["super_admin"],
        "create": ["super_admin"],
        "update": ["super_admin"],
        "delete": ["super_admin"],
        "publish": ["super_admin"],
        "manage_pages": ["super_admin"],
        "manage_seo": ["super_admin"],
        "manage_media": ["super_admin"],
        "manage_builder": ["super_admin"],
    },

    # IRMS / Inspection actions
    "inspection": {
        "create": ["super_admin", "admin", "manager", "supervisor", "technician"],
        "view": ["super_admin", "admin", "manager", "supervisor", "technician", "finance"],
        "update": ["super_admin", "admin", "manager", "supervisor", "technician"],
        "delete": ["super_admin", "admin"],
        "assign": ["super_admin", "admin", "manager", "supervisor"],
        "approve": ["super_admin", "admin", "supervisor", "manager"],
        "complete": ["super_admin", "admin", "supervisor", "manager", "technician"],
        "upload_photos": ["super_admin", "admin", "supervisor", "manager", "technician"],
        "sign": ["super_admin", "admin", "supervisor", "manager", "technician"],
        "export": ["super_admin", "admin", "manager", "supervisor", "finance"],
        "manage_templates": ["super_admin", "admin"],
        "view_analytics": ["super_admin", "admin", "manager", "supervisor"],
    },

    # PM actions
    "pm_module": {
        "create": ["super_admin", "admin", "manager"],
        "view": ["super_admin", "admin", "manager", "supervisor", "technician"],
        "update": ["super_admin", "admin", "manager"],
        "delete": ["super_admin", "admin"],
        "execute": ["super_admin", "admin", "supervisor", "manager", "technician"],
    },

    # Document actions
    "document": {
        "view": ["super_admin", "admin", "hr", "manager", "supervisor", "technician", "finance", "customer", "user"],
        "upload": ["super_admin", "admin", "hr", "manager", "supervisor", "technician", "finance", "user"],
        "delete": ["super_admin", "admin", "hr"],
        "manage": ["super_admin", "admin", "hr"],
    },
}


# ── Permission check functions ──────────────────────────────────────────────


def has_feature_access(user_role: str, feature: str) -> bool:
    """Check if a user role can access a named feature.

    Unknown features are denied by default.
    """
    allowed = FEATURE_PERMISSIONS.get(feature)
    if not allowed:
        return False
    return user_role in allowed


def has_action_permission(user_role: str, entity: str, action: str) -> bool:
    """Check if a user role can perform a specific action on an entity.

    Example: has_action_permission("admin", "complaint", "assign_technician") -> True
    """
    entity_actions = ACTION_PERMISSIONS.get(entity)
    if not entity_actions:
        return False
    allowed_roles = entity_actions.get(action)
    if not allowed_roles:
        return False
    return user_role in allowed_roles


def has_min_role_level(user_role: str, min_role: str) -> bool:
    """Check if a user role meets or exceeds a minimum role in the hierarchy."""
    user_level = ROLE_HIERARCHY.get(user_role)
    req_level = ROLE_HIERARCHY.get(min_role)
    if user_level is None or req_level is None:
        return False
    return user_level >= req_level


def can_assign_role(assigner_role: str, target_role: str) -> bool:
    """Check if assigner_role can assign target_role to a user.

    Based on ROLE_TRANSITION_MATRIX.
    """
    allowed_targets = ROLE_TRANSITION_MATRIX.get(assigner_role, set())
    return target_role in allowed_targets


def require_permission(permission: str, user_role: str) -> None:
    """Assert permission, raising ForbiddenException if denied.

    Args:
        permission: feature name ("complaints") or entity.action ("complaint.assign_technician").
        user_role: The authenticated user's role.

    Raises:
        ForbiddenException: If the user lacks the required permission.
    """
    if "." in permission:
        entity, action = permission.split(".", 1)
        if not has_action_permission(user_role, entity, action):
            raise ForbiddenException(
                message=f"No permission for {permission}",
                details={"permission": permission, "user_role": user_role},
            )
    else:
        if not has_feature_access(user_role, permission):
            raise ForbiddenException(
                message=f"No access to feature '{permission}'",
                details={"feature": permission, "user_role": user_role},
            )
