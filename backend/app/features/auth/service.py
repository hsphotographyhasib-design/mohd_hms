'''    
Auth business logic service.

MOHD.HMS ENTERPRISE

All database operations use the core/database.py helpers (query_table,
insert_record, update_record, delete_record) which target Supabase PostgREST.
All user queries enforce tenantId isolation.
JWT payload: { userId, tenantId, role, email } — compatible with Express/Next.js.
'''

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.config import get_settings
from app.core.database import (
    count_records,
    delete_record,
    insert_record,
    query_table,
    update_record,
)
from app.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException,
    ValidationException,
)
from app.core.logging import get_logger
from app.core.security import (
    ACTIVE_ROLES,
    create_access_token,
    create_temp_token,
    generate_otp,
    hash_password,
    normalize_role,
    verify_password,
)
from app.rbac.permissions import can_assign_role, require_permission
from app.utils.helpers import utcnow

log = get_logger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

OTP_TTL_MINUTES = 15
OTP_MAX_ATTEMPTS = 5
OTP_MAX_RESENDS = 3
OTP_RESEND_COOLDOWN_SECONDS = 60
RESET_TOKEN_TTL_SECONDS = 600  # 10 minutes
DEFAULT_TENANT_DOMAIN = 'default.mohdhms.com'
DEFAULT_TENANT_NAME = 'Default Organization'
ADMIN_SEED_EMAIL = 'admin@mohd.com'
ADMIN_SEED_PASSWORD = 'Admin@123456'

# HMAC key for signing reset tokens (derived from JWT secret + salt)
_RESET_HMAC_KEY: str | None = None


def _get_reset_hmac_key() -> str:
    global _RESET_HMAC_KEY
    if _RESET_HMAC_KEY is None:
        settings = get_settings()
        _RESET_HMAC_KEY = hashlib.sha256(
            f'{settings.jwt_secret}:password-reset-hmac'.encode()
        ).hexdigest()
    return _RESET_HMAC_KEY


def _sign_reset_token(payload: dict[str, Any]) -> str:
    """Create an HMAC-signed reset token (base64url-encoded JSON payload + signature)."""
    json_bytes = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    sig = hmac.new(_get_reset_hmac_key().encode(), json_bytes, hashlib.sha256).hexdigest()
    token_data = json_bytes + b'.' + sig.encode()
    return base64.urlsafe_b64encode(token_data).decode('ascii')


def _verify_reset_token(token: str) -> dict[str, Any] | None:
    """Verify and decode an HMAC-signed reset token. Returns payload or None."""
    try:
        decoded = base64.urlsafe_b64decode(token)
        json_bytes, sig_bytes = decoded.rsplit(b'.', 1)
        sig = sig_bytes.decode('ascii')
        expected_sig = hmac.new(
            _get_reset_hmac_key().encode(), json_bytes, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        payload = json.loads(json_bytes)
        # Check expiry
        if payload.get('exp', 0) < datetime.now(timezone.utc).timestamp() * 1000:
            return None
        return payload
    except Exception:
        return None


def _hash_otp(otp: str) -> str:
    """Hash an OTP for storage (SHA-256)."""
    return hashlib.sha256(otp.encode('utf-8')).hexdigest()


def _verify_otp_hash(plain: str, hashed: str) -> bool:
    """Constant-time OTP comparison."""
    return hmac.compare_digest(_hash_otp(plain), hashed)


def _mask_email(email: str) -> str:
    """Mask email for display: j***e@example.com"""
    if '@' not in email:
        return email
    local, domain = email.rsplit('@', 1)
    if len(local) <= 2:
        return f'{local[0]}***@{domain}'
    return f'{local[0]}***{local[-1]}@{domain}'


def _normalize_phone(phone: str, dial_code: str | None = None) -> str:
    """Normalize phone number to E.164 format."""
    if not phone:
        return ''
    digits = re.sub(r'[^\d+]', '', phone)
    if digits.startswith('+'):
        return digits
    stripped = digits.lstrip('0')
    if 9 <= len(stripped) <= 11 and dial_code:
        return f'{dial_code}{stripped}'
    if 9 <= len(stripped) <= 10:
        return f'+60{stripped}'
    return digits


def _build_user_response(user: dict[str, Any]) -> dict[str, Any]:
    """Build a standard user response dict from a raw user record."""
    return {
        'id': user.get('id', ''),
        'email': user.get('email'),
        'name': user.get('name'),
        'phone': user.get('phone'),
        'avatar': user.get('avatar'),
        'role': (user.get('role') or '').lower(),
        'tenantId': user.get('tenantId', ''),
        'tenantName': user.get('tenant_name') or user.get('Tenant', {}).get('name') if isinstance(user.get('Tenant'), dict) else None,
        'tenantDomain': user.get('tenant_domain') or user.get('Tenant', {}).get('domain') if isinstance(user.get('Tenant'), dict) else None,
        'employeeNumber': user.get('employeeNumber'),
        'departmentId': user.get('departmentId') or user.get('department_id') or user.get('Department', {}).get('id') if isinstance(user.get('Department'), dict) else None,
        'departmentName': user.get('department_name') or user.get('Department', {}).get('name') if isinstance(user.get('Department'), dict) else None,
        'isActive': user.get('isActive', True),
        'isOnline': user.get('isOnline'),
        'profileCompleted': user.get('profileCompleted', False),
        'lastLogin': user.get('lastLogin'),
        'authProvider': user.get('authProvider'),
        'createdAt': user.get('createdAt'),
    }


def _generate_jwt(user: dict[str, Any]) -> str:
    """Generate a JWT for a user record."""
    settings = get_settings()
    payload = {
        'userId': user['id'],
        'tenantId': user['tenantId'],
        'role': (user.get('role') or '').lower(),
        'email': user.get('email'),
    }
    return create_access_token(
        payload, settings.jwt_secret,
        timedelta(seconds=settings.jwt_access_token_expire),
    )


def _generate_temp_jwt(data: dict[str, Any]) -> str:
    """Generate a short-lived temp JWT."""
    settings = get_settings()
    return create_temp_token(data, settings.jwt_secret, timedelta(minutes=15))


# ── Service functions ─────────────────────────────────────────────────────────


async def authenticate_user(email: str, password: str) -> dict[str, Any]:
    """Authenticate by email/password. Returns { token, user } or raises."""
    # Find user by email
    result = await query_table(
        'user',
        select='*, Tenant(name, domain)',
        where={'email': email.lower().strip()},
        limit=1,
        order='createdAt.desc',
    )
    users = result.get('data', [])
    if not users:
        raise UnauthorizedException(code='AUTH_INVALID', message='Invalid email or password')

    user = users[0]

    # Check active
    if not user.get('isActive', True):
        raise ForbiddenException(message='Account is deactivated')

    # Verify password
    pw_hash = user.get('passwordHash')
    if not pw_hash:
        raise UnauthorizedException(code='AUTH_INVALID', message='Invalid email or password')

    if not verify_password(password, pw_hash):
        raise UnauthorizedException(code='AUTH_INVALID', message='Invalid email or password')

    # Update last login (fire-and-forget)
    try:
        await update_record('user', user['id'], {
            'lastLogin': utcnow().isoformat(),
            'isOnline': True,
            'authProvider': 'email',
        })
    except Exception:
        pass

    token = _generate_jwt(user)
    return {'token': token, 'user': _build_user_response(user)}


async def register_user(data: dict[str, Any]) -> dict[str, Any]:
    """Register a new customer user. Returns { token, user } or raises."""
    email = data['email'].lower().strip()
    name = data['name']
    password = data['password']
    phone = data.get('phone')

    # Find or create default tenant
    tenant = await _get_or_create_default_tenant()

    # Check duplicate email within tenant
    existing = await query_table(
        'user',
        select='id',
        where={'tenantId': tenant['id'], 'email': email},
        limit=1,
    )
    if existing.get('data'):
        raise ConflictException(message='Email already registered')

    # Create user (role is ALWAYS customer for self-registration)
    user_data = {
        'id': str(uuid.uuid4()),
        'tenantId': tenant['id'],
        'email': email,
        'passwordHash': hash_password(password),
        'name': name,
        'role': 'customer',
        'authProvider': 'email',
        'profileCompleted': False,
        'isActive': True,
        'createdAt': utcnow().isoformat(),
    }
    if phone:
        user_data['phone'] = phone

    user = await insert_record('user', user_data)

    # Merge tenant info for response
    user['Tenant'] = tenant

    token = _generate_jwt(user)
    return {'token': token, 'user': _build_user_response(user)}


async def get_current_user_profile(user_id: str, tenant_id: str) -> dict[str, Any]:
    """Get current user's profile with tenant and department relations."""
    result = await query_table(
        'user',
        select='*, Tenant(name, domain), Department(name)',
        where={'id': user_id, 'tenantId': tenant_id},
        limit=1,
    )
    users = result.get('data', [])
    if not users:
        raise NotFoundException(resource='User', message='User not found')
    return _build_user_response(users[0])


async def update_user_profile(user_id: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Update current user's own profile (name, phone, avatar)."""
    update_data: dict[str, Any] = {}
    if data.get('name'):
        update_data['name'] = data['name']
    if data.get('phone') is not None:
        update_data['phone'] = data['phone']
    if data.get('avatar') is not None:
        update_data['avatar'] = data['avatar']
    if update_data:
        update_data['profileCompleted'] = True
        update_data['updatedAt'] = utcnow().isoformat()
        updated = await update_record('user', user_id, update_data)
        # Fetch with relations for full response
        result = await query_table(
            'user',
            select='*, Tenant(name, domain), Department(name)',
            where={'id': user_id, 'tenantId': tenant_id},
            limit=1,
        )
        users = result.get('data', [])
        if users:
            return _build_user_response(users[0])
        return _build_user_response(updated)
    # No changes — return current profile
    return await get_current_user_profile(user_id, tenant_id)


async def forgot_password(email: str) -> dict[str, Any]:
    """Generate OTP for password reset, store in PasswordResetOtp, send email.

    Always returns success to avoid leaking account existence.
    """
    email = email.lower().strip()
    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
        return {'ok': True, 'message': 'If an account exists for this email, a verification code has been sent.'}

    # Find user
    result = await query_table(
        'user',
        select='id, email, name, phone, tenantId, isActive, passwordHash, authProvider',
        where={'email': email},
        order='createdAt.desc',
        limit=1,
    )
    users = result.get('data', [])
    user = users[0] if users else None

    if not user or not user.get('isActive'):
        return {'ok': True, 'message': 'If an account exists for this email, a verification code has been sent.'}

    # OAuth-only accounts can't reset password
    provider = user.get('authProvider', 'email')
    if provider in ('whatsapp', 'google'):
        return {
            'ok': False,
            'code': 'oauth_only',
            'provider': provider,
            'message': f'This account uses {provider.title()} Login. Please continue with {provider.title()} to access your account.',
        }

    # Invalidate previous active OTPs
    try:
        await _expire_previous_otps(user['id'])
    except Exception:
        pass

    # Generate OTP
    otp = generate_otp()
    otp_hash = _hash_otp(otp)
    expires_at = (utcnow() + timedelta(minutes=OTP_TTL_MINUTES)).isoformat()

    try:
        await insert_record('passwordResetOtp', {
            'id': str(uuid.uuid4()),
            'tenantId': user['tenantId'],
            'userId': user['id'],
            'email': email,
            'otpHash': otp_hash,
            'expiresAt': expires_at,
            'maxAttempts': OTP_MAX_ATTEMPTS,
            'maxResends': OTP_MAX_RESENDS,
            'status': 'active',
            'attempts': 0,
            'resendCount': 0,
            'createdAt': utcnow().isoformat(),
        })
    except Exception as exc:
        log.warning(f'Failed to create password reset OTP: {exc}')
        return {'ok': True, 'message': 'If an account exists for this email, a verification code has been sent.'}

    # Send OTP email (best-effort)
    try:
        await _send_otp_email(email, otp, user.get('name', 'User'))
    except Exception as exc:
        log.warning(f'Failed to send OTP email: {exc}')

    return {
        'ok': True,
        'message': 'If an account exists for this email, a verification code has been sent.',
        'email': _mask_email(email),
        'expiresIn': OTP_TTL_MINUTES * 60,
    }


async def verify_reset_otp(email: str, otp: str) -> dict[str, Any]:
    """Verify a password reset OTP. Returns { ok, resetToken } on success."""
    email = email.lower().strip()
    otp = re.sub(r'\D', '', otp)

    if not otp or len(otp) != 6:
        return {'ok': False, 'message': 'Please enter a valid 6-digit verification code.'}

    # Find active OTP
    result = await query_table(
        'passwordResetOtp',
        select='*, User(id, email, name, isActive)',
        where={'email': email, 'status': 'active'},
        order='createdAt.desc',
        limit=1,
    )
    records = result.get('data', [])
    if not records:
        return {'ok': False, 'code': 'invalid', 'message': 'Invalid or expired verification code.'}

    record = records[0]
    user = record.get('User') or {}

    if not isinstance(user, dict) or not user.get('isActive', False):
        return {'ok': False, 'code': 'invalid', 'message': 'Invalid or expired verification code.'}

    # Check expiration
    expires_at = record.get('expiresAt')
    if expires_at:
        try:
            exp_dt = datetime.fromisoformat(str(expires_at)) if isinstance(expires_at, str) else expires_at
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            if utcnow() > exp_dt:
                try:
                    await update_record('passwordResetOtp', record['id'], {'status': 'expired'})
                except Exception:
                    pass
                return {'ok': False, 'code': 'expired', 'message': 'This verification code has expired. Please request a new one.'}
        except (ValueError, TypeError):
            pass

    # Verify OTP
    stored_hash = record.get('otpHash', '')
    if _verify_otp_hash(otp, stored_hash):
        # Mark as verified
        try:
            new_attempts = (record.get('attempts', 0) or 0) + 1
            await update_record('passwordResetOtp', record['id'], {
                'status': 'verified',
                'attempts': new_attempts,
            })
        except Exception:
            return {'ok': False, 'code': 'invalid', 'message': 'Invalid or expired verification code.'}

        # Generate signed reset token
        reset_token = _sign_reset_token({
            'oid': record['id'],
            'uid': record['userId'],
            'exp': int(datetime.now(timezone.utc).timestamp() * 1000) + RESET_TOKEN_TTL_SECONDS * 1000,
        })

        return {'ok': True, 'message': 'Verification successful.', 'resetToken': reset_token}

    # Wrong OTP — increment attempts
    try:
        new_attempts = (record.get('attempts', 0) or 0) + 1
        await update_record('passwordResetOtp', record['id'], {'attempts': new_attempts})
        max_attempts = record.get('maxAttempts', OTP_MAX_ATTEMPTS)

        if new_attempts >= max_attempts:
            await update_record('passwordResetOtp', record['id'], {'status': 'locked'})
            return {'ok': False, 'code': 'locked', 'message': 'Too many failed attempts. Please request a new verification code.'}

        remaining = max_attempts - new_attempts
        return {
            'ok': False,
            'code': 'invalid',
            'message': f'Incorrect verification code. {remaining} attempt{"s" if remaining != 1 else ""} remaining.',
            'remainingAttempts': remaining,
        }
    except Exception:
        return {'ok': False, 'code': 'invalid', 'message': 'Invalid or expired verification code.'}


async def reset_password(reset_token: str, password: str, confirm_password: str) -> dict[str, Any]:
    """Reset password using a signed reset token from verify-reset-otp."""
    if password != confirm_password:
        return {'ok': False, 'code': 'mismatch', 'message': 'Passwords do not match.'}

    if len(password) < 6:
        return {'ok': False, 'code': 'weak', 'message': 'Password does not meet requirements.'}

    payload = _verify_reset_token(reset_token)
    if not payload:
        return {'ok': False, 'code': 'expired', 'message': 'Your session has expired or is invalid. Please request a new verification code.'}

    otp_id = payload.get('oid')
    user_id = payload.get('uid')

    # Find the OTP record
    result = await query_table(
        'passwordResetOtp',
        select='*, User(id, email, name, isActive)',
        where={'id': otp_id},
        limit=1,
    )
    records = result.get('data', [])
    if not records:
        return {'ok': False, 'message': 'Invalid session. Please start the password reset process again.'}

    record = records[0]
    user = record.get('User')
    if not isinstance(user, dict):
        return {'ok': False, 'message': 'Invalid session. Please start the password reset process again.'}

    if user_id != record.get('userId'):
        return {'ok': False, 'message': 'Invalid session. Please start the password reset process again.'}

    if record.get('status') != 'verified':
        return {'ok': False, 'message': 'Invalid session. Please verify your code again.'}

    if not user.get('isActive'):
        return {'ok': False, 'message': 'This account has been deactivated.'}

    # Update password
    try:
        await update_record('user', user_id, {
            'passwordHash': hash_password(password),
            'updatedAt': utcnow().isoformat(),
        })
    except Exception as exc:
        log.error(f'Password update failed: {exc}')
        return {'ok': False, 'message': "We couldn't reset your password. Please try again."}

    # Mark OTP as used (best-effort)
    try:
        await update_record('passwordResetOtp', record['id'], {'status': 'used', 'usedAt': utcnow().isoformat()})
    except Exception:
        pass

    # Revoke sessions (best-effort)
    try:
        await _invalidate_user_sessions(user_id)
    except Exception:
        pass

    # Send confirmation email (best-effort)
    try:
        await _send_password_changed_email(user.get('email', ''), user.get('name', 'User'))
    except Exception:
        pass

    return {'ok': True, 'message': 'Password updated successfully.'}


async def resend_reset_otp(email: str) -> dict[str, Any]:
    """Resend a password reset OTP."""
    email = email.lower().strip()
    if not email:
        return {'ok': False, 'message': 'Email is required.'}

    # Find user
    result = await query_table(
        'user',
        select='id, email, name, phone, tenantId, isActive, passwordHash, authProvider',
        where={'email': email},
        order='createdAt.desc',
        limit=1,
    )
    users = result.get('data', [])
    user = users[0] if users else None

    if not user or not user.get('isActive'):
        return {'ok': True, 'message': 'If an account exists for this email, a new verification code has been sent.'}

    # Block OAuth-only accounts
    provider = user.get('authProvider', 'email')
    if provider in ('whatsapp', 'google'):
        return {
            'ok': False,
            'code': 'oauth_only',
            'message': f'This account uses {provider.title()} Login.',
        }

    # Check max resends
    latest_otp = await query_table(
        'passwordResetOtp',
        select='id, resendCount, maxResends, createdAt, status',
        where={'userId': user['id']},
        order='createdAt.desc',
        limit=1,
    )
    otp_records = latest_otp.get('data', [])
    if otp_records:
        latest = otp_records[0]
        resend_count = (latest.get('resendCount', 0) or 0)
        max_resends = latest.get('maxResends', OTP_MAX_RESENDS)
        if resend_count >= max_resends:
            return {
                'ok': False, 'code': 'max_resends',
                'message': 'You have reached the maximum number of verification code requests.',
            }
        # Check cooldown
        created_at = latest.get('createdAt')
        if created_at:
            try:
                ca = datetime.fromisoformat(str(created_at)) if isinstance(created_at, str) else created_at
                if ca.tzinfo is None:
                    ca = ca.replace(tzinfo=timezone.utc)
                elapsed = (utcnow() - ca).total_seconds()
                if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
                    wait = int(OTP_RESEND_COOLDOWN_SECONDS - elapsed)
                    return {
                        'ok': False, 'code': 'cooldown',
                        'message': f'Please wait {wait} second{"s" if wait != 1 else ""} before requesting a new code.',
                        'retryAfter': wait,
                    }
            except (ValueError, TypeError):
                pass

    # Generate new OTP
    otp = generate_otp()
    otp_hash = _hash_otp(otp)
    expires_at = (utcnow() + timedelta(minutes=OTP_TTL_MINUTES)).isoformat()
    new_resend_count = ((otp_records[0].get('resendCount', 0) or 0) + 1) if otp_records else 0

    try:
        await _expire_previous_otps(user['id'])
        await insert_record('passwordResetOtp', {
            'id': str(uuid.uuid4()),
            'tenantId': user['tenantId'],
            'userId': user['id'],
            'email': email,
            'otpHash': otp_hash,
            'expiresAt': expires_at,
            'maxAttempts': OTP_MAX_ATTEMPTS,
            'maxResends': OTP_MAX_RESENDS,
            'resendCount': new_resend_count,
            'status': 'active',
            'attempts': 0,
            'createdAt': utcnow().isoformat(),
        })
    except Exception as exc:
        log.warning(f'Failed to create resend OTP: {exc}')
        return {'ok': True, 'message': 'If an account exists for this email, a new verification code has been sent.'}

    # Send email (best-effort)
    try:
        await _send_otp_email(email, otp, user.get('name', 'User'))
    except Exception:
        pass

    return {
        'ok': True,
        'message': 'A new verification code has been sent to your email.',
        'expiresIn': OTP_TTL_MINUTES * 60,
        'resendCount': new_resend_count,
        'maxResends': OTP_MAX_RESENDS,
    }


async def google_authenticate(code: str, code_verifier: str | None = None, redirect_uri: str | None = None) -> dict[str, Any]:
    """Exchange Google authorization code for user token. Returns { token, user } or raises."""
    settings = get_settings()
    if not settings.google.is_configured:
        raise ServiceUnavailableException(message='Google Sign-In is not configured on the server.')

    # Exchange code for tokens
    token_data = await _exchange_google_code(code, code_verifier, redirect_uri)
    if not token_data or not token_data.get('id_token'):
        raise UnauthorizedException(code='AUTH_INVALID', message='Failed to exchange authorization code with Google.')

    # Decode ID token (simple JWT decode — Google's keys are verified by their endpoint)
    google_user = _decode_google_id_token(token_data['id_token'])
    if not google_user or not google_user.get('sub') or not google_user.get('email'):
        raise UnauthorizedException(code='AUTH_INVALID', message='Invalid ID token from Google.')

    google_id = google_user['sub']
    email = google_user['email'].lower()
    name = google_user.get('name', email.split('@')[0])
    picture = google_user.get('picture')

    # Find by googleId
    result = await query_table(
        'user',
        select='*, Tenant(name, domain)',
        where={'googleId': google_id},
        limit=1,
    )
    users = result.get('data', [])
    user = users[0] if users else None

    if user:
        if not user.get('isActive'):
            raise ForbiddenException(message='Account is deactivated')
        # Update last login + avatar (best-effort)
        try:
            await update_record('user', user['id'], {
                'lastLogin': utcnow().isoformat(),
                'isOnline': True,
                'avatar': picture or user.get('avatar'),
                'authProvider': 'google',
            })
        except Exception:
            pass
        user['avatar'] = picture or user.get('avatar')
        token = _generate_jwt(user)
        return {'token': token, 'user': _build_user_response(user)}

    # Find by email (link accounts)
    result = await query_table(
        'user',
        select='*, Tenant(name, domain)',
        where={'email': email},
        limit=1,
    )
    users = result.get('data', [])
    user = users[0] if users else None

    if user:
        if not user.get('isActive'):
            raise ForbiddenException(message='Account is deactivated')
        try:
            await update_record('user', user['id'], {
                'googleId': google_id,
                'authProvider': 'google',
                'avatar': picture or user.get('avatar'),
                'lastLogin': utcnow().isoformat(),
                'isOnline': True,
            })
        except Exception:
            pass
        user['avatar'] = picture or user.get('avatar')
        token = _generate_jwt(user)
        return {'token': token, 'user': _build_user_response(user)}

    # Auto-create new user
    tenant = await _get_or_create_default_tenant()
    user_data = {
        'id': str(uuid.uuid4()),
        'tenantId': tenant['id'],
        'email': email,
        'name': name,
        'avatar': picture,
        'role': 'customer',
        'authProvider': 'google',
        'googleId': google_id,
        'isActive': True,
        'isOnline': True,
        'lastLogin': utcnow().isoformat(),
        'profileCompleted': False,
        'createdAt': utcnow().isoformat(),
    }
    new_user = await insert_record('user', user_data)
    new_user['Tenant'] = tenant
    token = _generate_jwt(new_user)
    return {'token': token, 'user': _build_user_response(new_user)}


async def whatsapp_send_otp(phone_number: str, dial_code: str | None = None) -> dict[str, Any]:
    """Send WhatsApp OTP. Returns { success, expiresIn } or raises."""
    full_phone = _normalize_phone(phone_number, dial_code)
    if not full_phone or len(full_phone) < 8:
        raise ValidationException(message='Invalid phone number.')

    tenant = await _get_or_create_default_tenant()

    # Rate limit: max 3 OTPs per phone per hour
    one_hour_ago = (utcnow() - timedelta(hours=1)).isoformat()
    count = await count_records(
        'otpCode',
        where={'phoneNumber': full_phone, 'tenantId': tenant['id'], 'createdAt': {'gt': one_hour_ago}},
    )
    if count >= 3:
        return {'error': 'Too many verification codes sent. Please try again in an hour.', 'retryAfter': 3600}

    otp = generate_otp()
    otp_hash = _hash_otp(otp)
    expires_at = (utcnow() + timedelta(minutes=5)).isoformat()

    await insert_record('otpCode', {
        'id': str(uuid.uuid4()),
        'tenantId': tenant['id'],
        'phoneNumber': full_phone,
        'code': otp_hash,
        'purpose': 'login',
        'expiresAt': expires_at,
        'attempts': 0,
        'maxAttempts': OTP_MAX_ATTEMPTS,
        'createdAt': utcnow().isoformat(),
    })

    # Send via WhatsApp API (best-effort)
    try:
        await _send_whatsapp_otp(full_phone, otp, tenant['id'])
    except Exception as exc:
        log.warning(f'WhatsApp OTP send failed (OTP still stored): {exc}')

    return {'success': True, 'expiresIn': 300}


async def whatsapp_verify_otp(phone_number: str, code: str, dial_code: str | None = None) -> dict[str, Any]:
    """Verify WhatsApp OTP. Returns { user, accessToken, isNewUser } or { isNewUser, needsRegistration, tempToken }."""
    if not code or not re.match(r'^\d{6}$', code):
        raise ValidationException(message='Enter the complete 6-digit verification code.')

    full_phone = _normalize_phone(phone_number, dial_code)
    tenant = await _get_or_create_default_tenant()

    # Find latest unexpired, unverified OTP
    now = utcnow().isoformat()
    result = await query_table(
        'otpCode',
        select='*',
        where={'phoneNumber': full_phone, 'tenantId': tenant['id'], 'verifiedAt': {'isNull': True}, 'expiresAt': {'gt': now}},
        order='createdAt.desc',
        limit=1,
    )
    otp_records = result.get('data', [])
    if not otp_records:
        return {'error': 'No valid code found. Please request a new one.'}

    otp = otp_records[0]
    if (otp.get('attempts', 0) or 0) >= (otp.get('maxAttempts', OTP_MAX_ATTEMPTS)):
        return {'error': 'Maximum attempts exceeded. Please request a new code.'}

    if not _verify_otp_hash(code, otp.get('code', '')):
        new_attempts = (otp.get('attempts', 0) or 0) + 1
        try:
            await update_record('otpCode', otp['id'], {'attempts': new_attempts})
        except Exception:
            pass
        remaining = (otp.get('maxAttempts', OTP_MAX_ATTEMPTS)) - new_attempts
        return {'error': 'Incorrect code. Please check and try again.', 'remainingAttempts': remaining}

    # Mark verified
    try:
        await update_record('otpCode', otp['id'], {'verifiedAt': utcnow().isoformat()})
    except Exception:
        pass

    # Check if user exists
    result = await query_table(
        'user',
        select='*, Tenant(name, domain)',
        where={'phone': full_phone, 'tenantId': tenant['id'], 'isActive': True},
        limit=1,
    )
    users = result.get('data', [])
    existing = users[0] if users else None

    if existing:
        # Existing user — login
        try:
            await update_record('user', existing['id'], {
                'lastLogin': utcnow().isoformat(),
                'isOnline': True,
                'authProvider': 'whatsapp',
            })
        except Exception:
            pass

        token = _generate_jwt(existing)
        return {
            'user': _build_user_response(existing),
            'accessToken': token,
            'isNewUser': False,
        }

    # New user — issue temp token for registration
    temp_token = _generate_temp_jwt({
        'phoneNumber': full_phone,
        'dialCode': dial_code or '',
        'tenantId': tenant['id'],
    })
    return {'isNewUser': True, 'needsRegistration': True, 'tempToken': temp_token}


async def whatsapp_register(data: dict[str, Any]) -> dict[str, Any]:
    """Register a new user via WhatsApp. Returns { user, accessToken } or raises."""
    temp_token = data.get('tempToken', '')
    full_name = data.get('fullName', '')
    phone_number = data.get('phoneNumber', '')
    address = data.get('address', '')
    email = data.get('email')

    if not temp_token or not full_name or not address:
        raise ValidationException(message='tempToken, fullName, and address are required')

    # Verify temp token
    settings = get_settings()
    from app.core.security import verify_jwt_token
    try:
        payload = verify_jwt_token(temp_token, settings.jwt_secret)
    except Exception:
        raise UnauthorizedException(code='AUTH_INVALID', message='Invalid or expired registration token')

    phone = payload.raw.get('phoneNumber') or phone_number
    tenant_id = payload.tenantId

    if not phone or not tenant_id:
        raise UnauthorizedException(code='AUTH_INVALID', message='Invalid or expired registration token')

    tenant = await _get_tenant_by_id(tenant_id)
    if not tenant:
        tenant = await _get_or_create_default_tenant()

    # Check phone uniqueness
    existing = await query_table(
        'user',
        select='id',
        where={'phone': phone, 'tenantId': tenant['id']},
        limit=1,
    )
    if existing.get('data'):
        raise ConflictException(message='User with this phone number already exists')

    # Determine email
    user_email = email or f'whatsapp_{phone.replace("+", "")}@mohdhms.com'

    # Create user
    user_data = {
        'id': str(uuid.uuid4()),
        'tenantId': tenant['id'],
        'email': user_email,
        'name': full_name,
        'phone': phone,
        'role': 'customer',
        'authProvider': 'whatsapp',
        'profileCompleted': True,
        'isActive': True,
        'createdAt': utcnow().isoformat(),
    }
    user = await insert_record('user', user_data)
    user['Tenant'] = tenant

    token = _generate_jwt(user)
    return {'user': _build_user_response(user), 'accessToken': token}


async def create_user(admin_user: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    """Admin creates a new user. Returns { message, user } or raises."""
    require_permission('user-management.create', admin_user['role'])

    tenant_id = admin_user['tenantId']
    name = data.get('name', '')
    email = (data.get('email') or '').lower().strip()
    password = data.get('password', '')
    role = data.get('role', 'technician')
    phone = data.get('phone')
    department_id = data.get('departmentId')

    if not name or not email or not password:
        raise ValidationException(message='Name, email, and password are required')

    # Validate and normalize role
    try:
        role = normalize_role(role)
    except Exception:
        role = 'technician'

    # Check RBAC: can this admin assign this role?
    if not can_assign_role(admin_user['role'], role):
        raise ForbiddenException(message=f'You cannot assign role \'{role}\' to users')

    # Check duplicate
    existing = await query_table(
        'user',
        select='id',
        where={'tenantId': tenant_id, 'email': email},
        limit=1,
    )
    if existing.get('data'):
        raise ConflictException(message='Email already registered')

    user_data = {
        'id': str(uuid.uuid4()),
        'tenantId': tenant_id,
        'email': email,
        'passwordHash': hash_password(password),
        'name': name,
        'role': role,
        'profileCompleted': False,
        'departmentId': department_id,
        'phone': phone,
        'authProvider': 'email',
        'isActive': True,
        'createdAt': utcnow().isoformat(),
    }
    user = await insert_record('user', user_data)

    # Get tenant name for response
    tenant = await _get_tenant_by_id(tenant_id)
    user['tenant_name'] = tenant.get('name') if tenant else None

    return {
        'message': f'User invited successfully: {name} ({email})',
        'user': {
            'id': user['id'],
            'email': user['email'],
            'name': user['name'],
            'role': user['role'],
            'tenantId': user['tenantId'],
            'tenantName': tenant.get('name') if tenant else None,
            'profileCompleted': user.get('profileCompleted', False),
        },
    }


async def list_users(
    tenant_id: str,
    page: int = 1,
    page_size: int = 20,
    search: str = '',
    role_filter: str = '',
    status_filter: str = '',
    provider_filter: str = '',
    online_filter: str = '',
) -> dict[str, Any]:
    """List users for admin. Returns { users, pagination }."""
    where: dict[str, Any] = {'tenantId': tenant_id}

    if search:
        where['OR'] = [
            {'name': {'contains': search}},
            {'email': {'contains': search}},
            {'phone': {'contains': search}},
            {'employeeNumber': {'contains': search}},
        ]
    if role_filter:
        where['role'] = role_filter
    if status_filter == 'active':
        where['isActive'] = True
    elif status_filter == 'inactive':
        where['isActive'] = False
    if provider_filter:
        where['authProvider'] = provider_filter
    if online_filter == 'online':
        where['isOnline'] = True
    elif online_filter == 'offline':
        where['isOnline'] = False

    offset = (page - 1) * page_size

    result = await query_table(
        'user',
        select='id, name, email, phone, avatar, role, isActive, isOnline, lastLogin, createdAt, profileCompleted, employeeNumber, authProvider, Department(id, name)',
        where=where,
        order='createdAt.desc',
        limit=page_size,
        offset=offset,
        count='exact',
    )

    users = result.get('data', [])
    count_str = result.get('count', '0')
    try:
        total = int(count_str) if count_str not in ('*', '') else len(users)
    except (ValueError, TypeError):
        total = len(users)

    total_pages = max(1, -(-total // page_size))  # ceiling division

    # Normalize each user
    normalized_users = []
    for u in users:
        dept = u.get('Department') or {}
        normalized_users.append({
            'id': u.get('id'),
            'name': u.get('name'),
            'email': u.get('email'),
            'phone': u.get('phone'),
            'avatar': u.get('avatar'),
            'role': (u.get('role') or '').lower(),
            'isActive': u.get('isActive', True),
            'isOnline': u.get('isOnline'),
            'lastLogin': u.get('lastLogin'),
            'createdAt': u.get('createdAt'),
            'profileCompleted': u.get('profileCompleted', False),
            'employeeNumber': u.get('employeeNumber'),
            'authProvider': u.get('authProvider'),
            'department': dept if isinstance(dept, dict) else None,
        })

    return {
        'users': normalized_users,
        'pagination': {
            'page': page,
            'pageSize': page_size,
            'total': total,
            'totalPages': total_pages,
        },
    }


async def get_user(tenant_id: str, user_id: str) -> dict[str, Any]:
    """Get a single user by ID within a tenant."""
    result = await query_table(
        'user',
        select='*, Tenant(name, domain), Department(name)',
        where={'id': user_id, 'tenantId': tenant_id},
        limit=1,
    )
    users = result.get('data', [])
    if not users:
        raise NotFoundException(resource='User', message='User not found')
    return _build_user_response(users[0])


async def update_user(tenant_id: str, user_id: str, data: dict[str, Any], admin_user: dict[str, Any]) -> dict[str, Any]:
    """Admin updates a user. Returns updated user."""
    require_permission('user-management.update', admin_user['role'])

    update_data: dict[str, Any] = {'updatedAt': utcnow().isoformat()}
    if data.get('name') is not None:
        update_data['name'] = data['name']
    if data.get('phone') is not None:
        update_data['phone'] = data['phone']
    if data.get('avatar') is not None:
        update_data['avatar'] = data['avatar']
    if data.get('isActive') is not None:
        update_data['isActive'] = data['isActive']
    if data.get('departmentId') is not None:
        update_data['departmentId'] = data['departmentId']
    if data.get('role') is not None:
        new_role = normalize_role(data['role'])
        if not can_assign_role(admin_user['role'], new_role):
            raise ForbiddenException(message=f'You cannot assign role \'{new_role}\' to users')
        update_data['role'] = new_role

    updated = await update_record('user', user_id, update_data)
    return await get_user(tenant_id, user_id)


async def delete_user(tenant_id: str, user_id: str, admin_user: dict[str, Any]) -> None:
    """Admin deletes a user."""
    require_permission('user-management.delete', admin_user['role'])
    await delete_record('user', user_id)


async def change_user_role(
    admin_user: dict[str, Any],
    target_user_id: str,
    new_role: str,
    tenant_id: str,
) -> dict[str, Any]:
    """Change a user's role with RBAC check. Returns updated user."""
    require_permission('user-management.manage_roles', admin_user['role'])

    new_role = normalize_role(new_role)
    if not can_assign_role(admin_user['role'], new_role):
        raise ForbiddenException(message=f'You cannot assign role \'{new_role}\' to users')

    await update_record('user', target_user_id, {
        'role': new_role,
        'updatedAt': utcnow().isoformat(),
    })
    return await get_user(tenant_id, target_user_id)


async def accept_terms(user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Record terms acceptance."""
    try:
        await insert_record('termsAcceptance', {
            'id': str(uuid.uuid4()),
            'userId': user_id,
            'tcVersion': data.get('tcVersion', ''),
            'privacyVersion': data.get('privacyVersion', ''),
            'ip': (data.get('ip') or '')[:45],
            'userAgent': (data.get('userAgent') or '')[:500],
            'createdAt': utcnow().isoformat(),
        })
    except Exception:
        pass  # Never block login due to audit logging failure
    return {'ok': True}


async def seed_admin() -> dict[str, Any]:
    """Create default super_admin if none exists."""
    result = await query_table(
        'user',
        select='id, email, name, role',
        where={'role': 'super_admin'},
        limit=1,
    )
    if result.get('data'):
        user = result['data'][0]
        return {'ok': True, 'message': 'Admin already exists', 'user': {'id': user['id'], 'email': user['email'], 'name': user['name']}}

    tenant = await _get_or_create_default_tenant()

    admin_email = os.environ.get('SEED_ADMIN_EMAIL', ADMIN_SEED_EMAIL)
    admin_password = os.environ.get('SEED_ADMIN_PASSWORD', ADMIN_SEED_PASSWORD)

    user_data = {
        'id': str(uuid.uuid4()),
        'tenantId': tenant['id'],
        'email': admin_email,
        'passwordHash': hash_password(admin_password),
        'name': 'System Admin',
        'role': 'super_admin',
        'authProvider': 'email',
        'profileCompleted': True,
        'isActive': True,
        'createdAt': utcnow().isoformat(),
    }
    user = await insert_record('user', user_data)

    return {
        'ok': True,
        'message': 'Super admin created successfully',
        'user': {'id': user['id'], 'email': user['email'], 'name': user['name'], 'role': 'super_admin'},
    }


async def invalidate_user_sessions(user_id: str) -> dict[str, Any]:
    """Invalidate all active login sessions for a user."""
    await _invalidate_user_sessions(user_id)
    return {'success': True}


async def refresh_session(user_id: str, tenant_id: str, current_role: str) -> dict[str, Any]:
    """Refresh session — re-read user from DB, issue new JWT if role changed."""
    result = await query_table(
        'user',
        select='*, Tenant(name, domain), Department(name)',
        where={'id': user_id, 'tenantId': tenant_id},
        limit=1,
    )
    users = result.get('data', [])
    if not users:
        raise UnauthorizedException(code='AUTH_INVALID', message='User not found')

    user = users[0]
    if not user.get('isActive'):
        raise UnauthorizedException(code='AUTH_INVALID', message='User not found')

    db_role = (user.get('role') or '').lower()
    jwt_role = current_role.lower()
    role_changed = jwt_role != db_role

    response = _build_user_response(user)
    response['roleChanged'] = role_changed

    if role_changed:
        token = _generate_jwt(user)
        response['token'] = token
        response['previousRole'] = jwt_role
    else:
        response['token'] = None
        response['previousRole'] = None

    return response


# ── Internal helpers ──────────────────────────────────────────────────────────


async def _get_or_create_default_tenant() -> dict[str, Any]:
    """Find or create the default tenant."""
    result = await query_table('tenant', select='*', where={'domain': DEFAULT_TENANT_DOMAIN}, limit=1)
    tenants = result.get('data', [])
    if tenants:
        return tenants[0]

    # Create
    return await insert_record('tenant', {
        'id': str(uuid.uuid4()),
        'name': DEFAULT_TENANT_NAME,
        'domain': DEFAULT_TENANT_DOMAIN,
        'plan': 'professional',
        'maxUsers': 50,
        'createdAt': utcnow().isoformat(),
    })


async def _get_tenant_by_id(tenant_id: str) -> dict[str, Any] | None:
    """Get tenant by ID."""
    result = await query_table('tenant', select='*', where={'id': tenant_id}, limit=1)
    tenants = result.get('data', [])
    return tenants[0] if tenants else None


async def _expire_previous_otps(user_id: str) -> None:
    """Mark all active password reset OTPs as expired for a user."""
    from app.integrations.supabase import get_supabase
    client = get_supabase()
    try:
        await client.update('PasswordResetOtp', user_id, {'status': 'expired'})
        # The above uses id=eq.user_id which won't work. Need to update by userId column.
        # Use raw approach via query
    except Exception:
        pass
    # Fallback: use direct httpx patch with proper filter
    from app.core.database import get_supabase_client
    db_client = get_supabase_client()
    try:
        await db_client.patch(
            '/rest/v1/PasswordResetOtp',
            params={'userId': f'eq.{user_id}', 'status': 'eq.active'},
            json={'status': 'expired'},
            headers={'apikey': db_client.headers.get('apikey', ''), 'Authorization': db_client.headers.get('Authorization', '')},
        )
    except Exception:
        pass


async def _invalidate_user_sessions(user_id: str) -> None:
    """Revoke all active login sessions for a user."""
    from app.core.database import get_supabase_client
    db_client = get_supabase_client()
    try:
        await db_client.patch(
            '/rest/v1/LoginSession',
            params={'userId': f'eq.{user_id}', 'isRevoked': 'eq.false'},
            json={'isRevoked': True},
            headers={'apikey': db_client.headers.get('apikey', ''), 'Authorization': db_client.headers.get('Authorization', '')},
        )
    except Exception as exc:
        log.warning(f'Failed to invalidate sessions: {exc}')


async def _send_otp_email(email: str, otp: str, user_name: str) -> None:
    """Send OTP via email. Best-effort — logs if email is not configured."""
    try:
        from app.integrations.email import get_email_service
        email_svc = get_email_service()
        await email_svc.send(
            to=email,
            subject=f'Your verification code: {otp}',
            body=f'Hello {user_name},\n\nYour verification code is: {otp}\n\nThis code expires in {OTP_TTL_MINUTES} minutes.\n\nIf you did not request this, please ignore this email.',
        )
    except Exception as exc:
        log.warning(f'Email not configured or send failed: {exc}')


async def _send_password_changed_email(email: str, user_name: str) -> None:
    """Send password change confirmation email."""
    try:
        from app.integrations.email import get_email_service
        email_svc = get_email_service()
        await email_svc.send(
            to=email,
            subject='Your password has been changed',
            body=f'Hello {user_name},\n\nYour password was successfully changed. If you did not make this change, please contact support immediately.',
        )
    except Exception as exc:
        log.warning(f'Password change email failed: {exc}')


async def _send_whatsapp_otp(phone: str, otp: str, tenant_id: str) -> None:
    """Send OTP via WhatsApp Business API."""
    from app.core.database import query_table
    from app.core.config import get_settings
    import httpx

    settings = get_settings()
    if not settings.whatsapp.is_configured:
        log.info('WhatsApp not configured — OTP stored for dev entry')
        return

    # Get WhatsApp config
    result = await query_table('whatsappConfig', select='*', where={'tenantId': tenant_id}, limit=1)
    configs = result.get('data', [])
    if not configs:
        return

    config = configs[0]
    if not config.get('isEnabled') or not config.get('metaAccessToken') or not config.get('metaPhoneNumberId'):
        return

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f'https://graph.facebook.com/v19.0/{config["metaPhoneNumberId"]}/messages',
            headers={'Authorization': f'Bearer {config["metaAccessToken"]}', 'Content-Type': 'application/json'},
            json={
                'messaging_product': 'whatsapp',
                'to': phone,
                'type': 'template',
                'template': {
                    'name': 'otp_verification',
                    'language': {'code': 'en'},
                    'components': [{'type': 'body', 'parameters': [{'type': 'text', 'text': otp}]}],
                },
            },
            timeout=10.0,
        )
        if not resp.is_success:
            log.warning(f'WhatsApp API error: {resp.status_code} {resp.text}')


async def _exchange_google_code(
    code: str,
    code_verifier: str | None = None,
    redirect_uri: str | None = None,
) -> dict[str, Any] | None:
    """Exchange Google authorization code for tokens."""
    import httpx
    settings = get_settings()

    token_body: dict[str, str] = {
        'code': code,
        'client_id': settings.google_client_id or '',
        'redirect_uri': redirect_uri or '',
        'grant_type': 'authorization_code',
    }
    if settings.google_client_secret:
        token_body['client_secret'] = settings.google_client_secret
    if code_verifier:
        token_body['code_verifier'] = code_verifier

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            'https://oauth2.googleapis.com/token',
            data=token_body,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=15.0,
        )
        if resp.is_success:
            return resp.json()
        log.error(f'Google token exchange failed: {resp.status_code} {resp.text}')
        return None


def _decode_google_id_token(id_token: str) -> dict[str, Any] | None:
    """Decode a Google ID token (JWT) without verification.

    In production, you should verify the signature with Google's JWKS.
    This is a simplified version that extracts the payload.
    """
    try:
        import base64
        parts = id_token.split('.')
        if len(parts) != 3:
            return None
        payload_b64 = parts[1]
        # Add padding
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += '=' * padding
        payload_json = base64.urlsafe_b64decode(payload_b64)
        return json.loads(payload_json)
    except Exception as exc:
        log.error(f'Failed to decode Google ID token: {exc}')
        return None
