"""
Auth router — all auth endpoints matching the frontend API contract.

MOHD.HMS ENTERPRISE

Response format matches what the frontend expects:
  - Login/Register: { token, user: {...} }
  - Me/Profile/Refresh: { id, email, name, ... } (flat user object)
  - List users: { users: [...], pagination: { page, pageSize, total, totalPages } }
  - Errors: { error: str } or { success: false, error: { code, message } }
  - Success: plain JSON (NOT wrapped in {success: true})
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request

from app.api.dependencies import (
    AuthUser,
    get_current_user,
    require_min_role,
    require_permission,
)
from app.core.exceptions import AppException
from app.core.logging import get_logger

from . import service as auth_service
from .schemas import (
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    RegisterRequest,
    ResendResetOtpRequest,
    ResetPasswordRequest,
    TermsAcceptanceRequest,
    UserCreateRequest,
    UserProfileUpdateRequest,
    UserUpdateRequest,
    VerifyResetOtpRequest,
    WhatsAppRegisterRequest,
    WhatsAppSendOtpRequest,
    WhatsAppVerifyOtpRequest,
)

log = get_logger(__name__)

router = APIRouter()


# ── Unauthenticated endpoints ───────────────────────────────────────────────


@router.post('/login')
async def login(body: LoginRequest):
    """POST /api/v1/auth/login — Email/password authentication.

    Returns: { token, user: {...} }
    """
    result = await auth_service.authenticate_user(body.email, body.password)
    return result


@router.post('/register')
async def register(body: RegisterRequest):
    """POST /api/v1/auth/register — Self-registration (role forced to 'customer').

    Returns: { token, user: {...} }
    Status: 201
    """
    result = await auth_service.register_user(body.model_dump(exclude_unset=True))
    return result


@router.post('/forgot-password')
async def forgot_password(body: ForgotPasswordRequest):
    """POST /api/v1/auth/forgot-password — Request password reset OTP.

    Always returns success to avoid leaking account existence.
    Returns: { ok, message, email?, expiresIn? }
    """
    result = await auth_service.forgot_password(body.email)
    # Map to appropriate status code
    if result.get('ok') is False:
        code = result.get('code', '')
        if code == 'oauth_only':
            from fastapi import Response
            from fastapi.responses import JSONResponse
            return JSONResponse(content=result, status_code=400)
    return result


@router.post('/reset-password')
async def reset_password(body: ResetPasswordRequest):
    """POST /api/v1/auth/reset-password — Reset password with signed resetToken.

    Body: { resetToken, password, confirmPassword }
    Returns: { ok, message }
    """
    result = await auth_service.reset_password(body.resetToken, body.password, body.confirmPassword)
    if result.get('ok') is False:
        from fastapi.responses import JSONResponse
        code = result.get('code', '')
        if code in ('expired', 'mismatch', 'weak'):
            return JSONResponse(content=result, status_code=400)
    return result


@router.get('/reset-password/verify')
async def verify_reset_token_get():
    """GET /api/v1/auth/reset-password/verify — Placeholder for frontend compatibility."""
    return {'ok': True, 'message': 'Use POST /api/v1/auth/verify-reset-otp instead.'}


@router.post('/verify-reset-otp')
async def verify_reset_otp(body: VerifyResetOtpRequest):
    """POST /api/v1/auth/verify-reset-otp — Verify password reset OTP.

    Returns: { ok, resetToken } on success.
    Returns: { ok: false, code, message, remainingAttempts? } on failure.
    """
    result = await auth_service.verify_reset_otp(body.email, body.otp)
    if not result.get('ok'):
        from fastapi.responses import JSONResponse
        code = result.get('code', '')
        if code == 'locked':
            return JSONResponse(content=result, status_code=429)
        return JSONResponse(content=result, status_code=400)
    return result


@router.post('/resend-reset-otp')
async def resend_reset_otp(body: ResendResetOtpRequest):
    """POST /api/v1/auth/resend-reset-otp — Resend password reset OTP.

    Returns: { ok, message, expiresIn, resendCount?, maxResends? }
    """
    result = await auth_service.resend_reset_otp(body.email)
    if not result.get('ok'):
        from fastapi.responses import JSONResponse
        code = result.get('code', '')
        if code in ('cooldown', 'max_resends'):
            return JSONResponse(content=result, status_code=429)
        return JSONResponse(content=result, status_code=400)
    return result


@router.post('/seed-admin')
async def seed_admin():
    """POST /api/v1/auth/seed-admin — Create default super_admin if none exists.

    Unprotected but checks if admin already exists.
    """
    result = await auth_service.seed_admin()
    return result


# ── Google OAuth ─────────────────────────────────────────────────────────────


@router.post('/google/callback')
async def google_callback(body: GoogleAuthRequest):
    """POST /api/v1/auth/google/callback — Google OAuth token exchange.

    Body: { code, state?, redirectUri?, code_verifier? }
    Returns: { token, user: {...} }
    """
    result = await auth_service.google_authenticate(
        code=body.code,
        code_verifier=body.code_verifier,
        redirect_uri=body.redirectUri,
    )
    return result


# ── WhatsApp Auth ─────────────────────────────────────────────────────────────


@router.post('/whatsapp/send-otp')
async def whatsapp_send_otp(body: WhatsAppSendOtpRequest):
    """POST /api/v1/auth/whatsapp/send-otp — Send WhatsApp OTP.

    Returns: { success: true, expiresIn: 300 }
    """
    result = await auth_service.whatsapp_send_otp(body.phoneNumber, body.dialCode)
    if 'error' in result:
        from fastapi.responses import JSONResponse
        return JSONResponse(content=result, status_code=500 if 'retryAfter' not in result else 429)
    return result


@router.post('/whatsapp/verify-otp')
async def whatsapp_verify_otp(body: WhatsAppVerifyOtpRequest):
    """POST /api/v1/auth/whatsapp/verify-otp — Verify WhatsApp OTP.

    Returns (existing user): { user, accessToken, isNewUser: false }
    Returns (new user): { isNewUser: true, needsRegistration: true, tempToken }
    """
    result = await auth_service.whatsapp_verify_otp(body.phoneNumber, body.code, body.dialCode)
    if 'error' in result:
        from fastapi.responses import JSONResponse
        status = 401
        if 'remainingAttempts' in result:
            status = 401
        if 'No valid code' in result.get('error', ''):
            status = 410
        if 'Maximum attempts' in result.get('error', ''):
            status = 429
        return JSONResponse(content=result, status_code=status)
    return result


@router.post('/whatsapp/register')
async def whatsapp_register(body: WhatsAppRegisterRequest):
    """POST /api/v1/auth/whatsapp/register — Register new WhatsApp user.

    Body: { tempToken, fullName, address, companyName?, email?, ... }
    Returns: { user, accessToken }
    """
    result = await auth_service.whatsapp_register(body.model_dump(exclude_unset=True))
    return result


@router.post('/whatsapp/refresh')
async def whatsapp_refresh(user: AuthUser = Depends(get_current_user)):
    """POST /api/v1/auth/whatsapp/refresh — Refresh WhatsApp session.

    Returns current user data.
    """
    result = await auth_service.get_current_user_profile(user.userId, user.tenantId)
    return result


@router.post('/whatsapp/logout')
async def whatsapp_logout(user: AuthUser = Depends(get_current_user)):
    """POST /api/v1/auth/whatsapp/logout — WhatsApp logout.

    Same as regular logout but used by WhatsApp flow.
    """
    await auth_service.invalidate_user_sessions(user.userId)
    return {'success': True}


# ── Protected endpoints (require authentication) ────────────────────────────


@router.get('/me')
async def get_me(user: AuthUser = Depends(get_current_user)):
    """GET /api/v1/auth/me — Get current user profile.

    Returns flat user object: { id, email, name, phone, avatar, role, tenantId, ... }
    """
    result = await auth_service.get_current_user_profile(user.userId, user.tenantId)
    return result


@router.put('/profile')
async def update_profile(
    body: UserProfileUpdateRequest,
    user: AuthUser = Depends(get_current_user),
):
    """PUT /api/v1/auth/profile — Update current user's own profile.

    Accepts: { name?, phone?, avatar? }
    Returns flat user object.
    """
    result = await auth_service.update_user_profile(
        user.userId, user.tenantId, body.model_dump(exclude_unset=True)
    )
    return result


@router.post('/logout')
async def logout(user: AuthUser = Depends(get_current_user)):
    """POST /api/v1/auth/logout — Logout (invalidate sessions).

    Returns: { success: true }
    """
    await auth_service.invalidate_user_sessions(user.userId)
    return {'success': True}


@router.get('/refresh-session')
async def refresh_session(user: AuthUser = Depends(get_current_user)):
    """GET /api/v1/auth/refresh-session — Refresh session (role change detection).

    Returns user data with roleChanged flag.
    If role changed, includes new token.
    """
    result = await auth_service.refresh_session(user.userId, user.tenantId, user.role)
    return result


@router.post('/terms-acceptance')
async def terms_acceptance(
    request: Request,
    body: TermsAcceptanceRequest,
    user: AuthUser = Depends(get_current_user),
):
    """POST /api/v1/auth/terms-acceptance — Record terms acceptance.

    Returns: { ok: true }
    """
    # Security: ensure caller can only accept terms for themselves
    if body.userId != user.userId and user.role != 'super_admin':
        from fastapi.responses import JSONResponse
        return JSONResponse(content={'error': 'Forbidden'}, status_code=403)

    ip = request.headers.get('x-forwarded-for', '').split(',')[0].strip() or \
         request.headers.get('x-real-ip', 'unknown')
    data = body.model_dump()
    data['ip'] = ip
    result = await auth_service.accept_terms(user.userId, data)
    return result


# ── Admin-only user management endpoints ─────────────────────────────────────


@router.get('/users')
async def list_users(
    user: AuthUser = Depends(require_min_role('admin')),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias='pageSize'),
    search: str = Query(default=''),
    role: str = Query(default=''),
    status: str = Query(default=''),
    provider: str = Query(default=''),
    online: str = Query(default=''),
):
    """GET /api/v1/auth/users — List users (admin+ only).

    Returns: { users: [...], pagination: { page, pageSize, total, totalPages } }
    """
    result = await auth_service.list_users(
        tenant_id=user.tenantId,
        page=page,
        page_size=pageSize,
        search=search,
        role_filter=role,
        status_filter=status,
        provider_filter=provider,
        online_filter=online,
    )
    return result


@router.post('/users', status_code=201)
async def create_user(
    body: UserCreateRequest,
    user: AuthUser = Depends(require_min_role('admin')),
):
    """POST /api/v1/auth/users — Create/invite user (admin+ only).

    Returns: { message, user: {...} }
    Status: 201
    """
    admin_dict = {'userId': user.userId, 'tenantId': user.tenantId, 'role': user.role}
    result = await auth_service.create_user(admin_dict, body.model_dump(exclude_unset=True))
    return result


@router.get('/users/{user_id}')
async def get_user(
    user_id: str,
    user: AuthUser = Depends(require_min_role('admin')),
):
    """GET /api/v1/auth/users/{user_id} — Get user by ID (admin+ only)."""
    result = await auth_service.get_user(user.tenantId, user_id)
    return result


@router.put('/users/{user_id}')
async def update_user(
    user_id: str,
    body: UserUpdateRequest,
    user: AuthUser = Depends(require_min_role('admin')),
):
    """PUT /api/v1/auth/users/{user_id} — Update user (admin+ only)."""
    admin_dict = {'userId': user.userId, 'tenantId': user.tenantId, 'role': user.role}
    result = await auth_service.update_user(
        user.tenantId, user_id, body.model_dump(exclude_unset=True), admin_dict
    )
    return result


@router.delete('/users/{user_id}')
async def delete_user(
    user_id: str,
    user: AuthUser = Depends(require_min_role('super_admin')),
):
    """DELETE /api/v1/auth/users/{user_id} — Delete user (super_admin only)."""
    admin_dict = {'userId': user.userId, 'tenantId': user.tenantId, 'role': user.role}
    await auth_service.delete_user(user.tenantId, user_id, admin_dict)
    return {'message': 'User deleted successfully'}


@router.delete('/users/{user_id}/sessions')
async def invalidate_user_sessions_endpoint(
    user_id: str,
    user: AuthUser = Depends(require_min_role('admin')),
):
    """DELETE /api/v1/auth/users/{user_id}/sessions — Invalidate user sessions (admin+ only)."""
    await auth_service.invalidate_user_sessions(user_id)
    return {'success': True}
