"""
System settings service.

MOHD.HMS ENTERPRISE

Returns application version, environment, and feature flags.
"""

from typing import Any

from app.core.config import get_settings
from app.core.logging import get_logger

log = get_logger(__name__)

# ── Feature flags ─────────────────────────────────────────────────────────────
#
# Feature flags are controlled via environment variables.
# Default to True for all features unless explicitly disabled.

FEATURE_FLAGS: dict[str, bool] = {
    "whatsapp_enabled": True,
    "email_enabled": True,
    "firebase_enabled": False,
    "google_maps_enabled": False,
    "redis_enabled": False,
    "ai_enabled": False,
    "irms_enabled": True,
    "pm_enabled": True,
    "cms_enabled": True,
    "hr_enabled": True,
    "finance_enabled": True,
    "inventory_enabled": True,
    "vehicles_enabled": True,
    "purchases_enabled": True,
    "documents_enabled": True,
}


async def get_system_info() -> dict[str, Any]:
    """Get system information including version, environment, and feature flags.

    Reads settings from the cached Settings singleton and resolves
    feature flags based on which services are configured.
    """
    settings = get_settings()

    # Resolve feature flags based on configuration
    flags = dict(FEATURE_FLAGS)
    flags["whatsapp_enabled"] = settings.whatsapp.is_configured
    flags["email_enabled"] = settings.email.is_configured
    flags["firebase_enabled"] = settings.firebase.is_configured
    flags["google_maps_enabled"] = settings.maps.is_configured
    flags["redis_enabled"] = settings.redis.is_configured

    return {
        "success": True,
        "data": {
            "appVersion": settings.app_version,
            "environment": settings.app_env,
            "featureFlags": flags,
        },
    }
