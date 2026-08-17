"""
Security utilities — JWT, password hashing, OTP generation, role validation.

MOHD.HMS ENTERPRISE

JWT tokens are compatible with the existing Express/Next.js auth layer:
  payload = { userId, tenantId, role, email }
  algorithm = HS256
"""

from __future__ import annotations

import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.exceptions import UnauthorizedException, ValidationException
from app.core.logging import get_logger

log = get_logger(__name__)

# ── Role definitions ──────────────────────────────────────────────────────────

VALID_ROLES: frozenset[str] = frozenset({
    "super_admin",
    "admin",
    "manager",
    "supervisor",
    "technician",
    "finance",
    "hr",
    "user",
    "customer",
    "vendor",
    "guest",
})

#: Roles that can access the system (vendor and guest are deprecated).
ACTIVE_ROLES: frozenset[str] = frozenset({
    "super_admin",
    "admin",
    "manager",
    "supervisor",
    "technician",
    "finance",
    "hr",
    "user",
    "customer",
})

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


def normalize_role(role: str | None) -> str:
    """Lowercase, trim, and validate a role string.

    Raises ValidationException for invalid roles.
    """
    if not role or not isinstance(role, str):
        raise ValidationException(message=f"Invalid role: {role!r}")
    normalized = role.strip().lower()
    if normalized not in VALID_ROLES:
        raise ValidationException(message=f"Unknown role: {normalized!r}")
    return normalized


def has_min_role(user_role: str, required_role: str) -> bool:
    """Check if *user_role* has hierarchy level >= *required_role*.

    Returns False for any role not in the hierarchy.
    """
    user_level = ROLE_HIERARCHY.get(user_role)
    req_level = ROLE_HIERARCHY.get(required_role)
    if user_level is None or req_level is None:
        return False
    return user_level >= req_level


# ── JWT ───────────────────────────────────────────────────────────────────────


class TokenPayload:
    """Validated JWT payload.

    Attributes match the existing Express/Next.js token shape exactly.
    """

    __slots__ = ("userId", "tenantId", "role", "email", "raw")

    def __init__(self, userId: str, tenantId: str, role: str, email: str | None, raw: dict[str, Any]) -> None:
        self.userId = userId
        self.tenantId = tenantId
        self.role = role
        self.email = email
        self.raw = raw

    def __repr__(self) -> str:
        return f"TokenPayload(userId={self.userId!r}, tenantId={self.tenantId!r}, role={self.role!r})"


def verify_jwt_token(token: str, secret: str) -> TokenPayload:
    """Verify and decode a JWT token.

    Extracts {userId, tenantId, role, email} from the payload.
    Raises UnauthorizedException on any failure.

    Compatible with the NextAuth/Express JWT tokens used in the frontend.
    """
    try:
        payload: dict[str, Any] = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise UnauthorizedException(code="AUTH_EXPIRED", message="Token has expired")
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedException(code="AUTH_INVALID", message=f"Invalid token: {exc}")

    user_id = payload.get("userId") or payload.get("sub")
    tenant_id = payload.get("tenantId")
    role = payload.get("role")
    email = payload.get("email")

    if not user_id:
        raise UnauthorizedException(code="AUTH_INVALID", message="Token missing userId claim")
    if not tenant_id:
        raise UnauthorizedException(code="AUTH_INVALID", message="Token missing tenantId claim")
    if not role:
        raise UnauthorizedException(code="AUTH_INVALID", message="Token missing role claim")

    normalized_role = normalize_role(role)

    return TokenPayload(
        userId=str(user_id),
        tenantId=str(tenant_id),
        role=normalized_role,
        email=str(email) if email else None,
        raw=payload,
    )


def create_access_token(
    data: dict[str, Any],
    secret: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token.

    Args:
        data:     Payload dict (should include userId, tenantId, role, email).
        secret:   HMAC secret.
        expires_delta: Custom expiry. Defaults to 7 days.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, secret, algorithm="HS256")


def create_temp_token(
    data: dict[str, Any],
    secret: str,
    expires_delta: timedelta = timedelta(minutes=30),
) -> str:
    """Create a short-lived JWT (default 30 min). Used for OTP verification,
    password reset, email confirmation, etc.
    """
    return create_access_token(data, secret, expires_delta)


# ── Password hashing ──────────────────────────────────────────────────────────


def hash_password(password: str) -> str:
    """Hash a password using bcrypt with auto-generated salt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ── OTP generation ─────────────────────────────────────────────────────────────


def generate_otp(length: int = 6) -> str:
    """Generate a numeric OTP of the given length (default 6)."""
    import secrets

    # Ensure the first digit is never 0 (looks better in SMS/email)
    first = secrets.randbelow(9) + 1
    rest = "".join(str(secrets.randbelow(10)) for _ in range(length - 1))
    return f"{first}{rest}"
