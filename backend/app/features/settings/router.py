from fastapi import APIRouter, Depends

from app.api.dependencies import AuthUser, require_role

from . import service

router = APIRouter(tags=["settings"])


@router.get("/system-info")
async def system_info(
    user: AuthUser = Depends(require_role("super_admin")),
):
    """GET /api/v1/settings/system-info — Get app version, environment, feature flags."""
    return await service.get_system_info()
