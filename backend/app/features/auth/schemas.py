"""
Auth Pydantic request/response schemas.

MOHD.HMS ENTERPRISE

All schemas match the exact API contract expected by the Next.js frontend.
Response shapes are documented per-endpoint below.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """POST /api/v1/auth/login"""
    email: EmailStr
    password: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    """Standard user object returned in login, register, me, refresh-session.

    Matches the shape the frontend expects:
      id, email, name, phone, avatar, role, tenantId, ...
    """
    id: str
    email: str | None = None
    name: str | None = None
    phone: str | None = None
    avatar: str | None = None
    role: str
    tenantId: str
    tenantName: str | None = None
    tenantDomain: str | None = None
    employeeNumber: str | None = None
    departmentId: str | None = None
    departmentName: str | None = None
    isActive: bool | None = None
    isOnline: bool | None = None
    profileCompleted: bool | None = None
    lastLogin: datetime | str | None = None
    authProvider: str | None = None
    createdAt: datetime | str | None = None

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    """POST /api/v1/auth/login response.

    Frontend expects: { token: str, user: {...} }
    NOT wrapped in { success: true }.
    """
    token: str
    user: UserResponse


class RegisterRequest(BaseModel):
    """POST /api/v1/auth/register.

    NOTE: role is NEVER accepted from the request body — always 'customer'.
    This prevents privilege escalation via self-registration.
    """
    name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: str | None = None


class RegisterResponse(BaseModel):
    """POST /api/v1/auth/register response.

    Frontend expects: { token: str, user: {...} }
    """
    token: str
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    """POST /api/v1/auth/forgot-password"""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """POST /api/v1/auth/reset-password.

    Uses resetToken (HMAC-signed from verify-reset-otp) + new password.
    """
    resetToken: str = Field(..., min_length=1)
    password: str = Field(..., min_length=6)
    confirmPassword: str = Field(..., min_length=6)


class VerifyResetOtpRequest(BaseModel):
    """POST /api/v1/auth/verify-reset-otp"""
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)


class ResendResetOtpRequest(BaseModel):
    """POST /api/v1/auth/resend-reset-otp"""
    email: EmailStr


class WhatsAppSendOtpRequest(BaseModel):
    """POST /api/v1/auth/whatsapp/send-otp"""
    phoneNumber: str = Field(..., min_length=1)
    dialCode: str | None = None


class WhatsAppVerifyOtpRequest(BaseModel):
    """POST /api/v1/auth/whatsapp/verify-otp"""
    phoneNumber: str = Field(..., min_length=1)
    dialCode: str | None = None
    code: str = Field(..., min_length=6, max_length=6)


class WhatsAppRegisterRequest(BaseModel):
    """POST /api/v1/auth/whatsapp/register"""
    tempToken: str
    fullName: str = Field(..., min_length=1)
    address: str = Field(..., min_length=1)
    companyName: str | None = None
    email: str | None = None
    city: str | None = None
    district: str | None = None
    country: str | None = None
    preferredLanguage: str | None = None


class GoogleAuthRequest(BaseModel):
    """POST /api/v1/auth/google/callback.

    Accepts Google authorization code for server-side token exchange.
    """
    code: str = Field(..., min_length=1)
    state: str | None = None
    redirectUri: str | None = None
    code_verifier: str | None = Field(default=None, alias="code_verifier")

    model_config = {"populate_by_name": True}


class TermsAcceptanceRequest(BaseModel):
    """POST /api/v1/auth/terms-acceptance"""
    userId: str
    tcVersion: str
    privacyVersion: str
    userAgent: str | None = None


class UserCreateRequest(BaseModel):
    """POST /api/v1/auth/users (admin creates user)."""
    name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str | None = None
    phone: str | None = None
    departmentId: str | None = None
    sendInvite: bool | None = True


class UserUpdateRequest(BaseModel):
    """PUT /api/v1/auth/users/{user_id} (admin updates user)."""
    name: str | None = None
    phone: str | None = None
    avatar: str | None = None
    role: str | None = None
    isActive: bool | None = None
    departmentId: str | None = None


class UserProfileUpdateRequest(BaseModel):
    """PUT /api/v1/auth/profile (self-update)."""
    name: str | None = None
    phone: str | None = None
    avatar: str | None = None


class PasswordChangeRequest(BaseModel):
    """For authenticated password change."""
    current_password: str
    new_password: str = Field(..., min_length=6)


class PasswordUpdateRequest(BaseModel):
    """For password reset (no current password required)."""
    new_password: str = Field(..., min_length=6)


class RefreshSessionResponse(BaseModel):
    """GET /api/v1/auth/refresh-session response.

    Returns user data plus optional new token if role changed.
    """
    id: str
    email: str | None = None
    name: str | None = None
    phone: str | None = None
    avatar: str | None = None
    role: str
    tenantId: str
    tenantName: str | None = None
    tenantDomain: str | None = None
    employeeNumber: str | None = None
    departmentId: str | None = None
    departmentName: str | None = None
    isActive: bool | None = None
    isOnline: bool | None = None
    profileCompleted: bool | None = None
    lastLogin: datetime | str | None = None
    roleChanged: bool = False
    token: str | None = None
    previousRole: str | None = None


class ChangeRoleRequest(BaseModel):
    """PUT /api/v1/auth/users/{user_id}/role"""
    role: str = Field(..., min_length=1)
