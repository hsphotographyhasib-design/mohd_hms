// Auth barrel export

// Core auth utilities (JWT, password hashing, token generation)
export {
  hashPassword,
  verifyPassword,
  generateToken,
  generateSessionToken,
  verifyToken,
  generateAssetNumber,
  generateInvoiceNumber,
  generatePONumber,
  generateCustomerNumber,
  sanitizeInput,
  generateOtpCode,
  generateRefreshToken,
  generateTempToken,
  verifyTempToken,
  parseJsonSafe,
  verifyAuth,
} from './auth-lib';

// Validation schemas
export { loginSchema, registerSchema } from './auth-schemas';
export type { LoginInput, RegisterInput } from './auth-schemas';

// NextAuth configuration
export { authOptions } from './nextauth';

// Password reset & OTP flows
export {
  RESET_TOKEN_TTL_MINUTES,
  OTP_TTL_MINUTES,
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_RESENDS,
  OTP_RESEND_COOLDOWN_SECONDS,
  RESET_REQUESTS_PER_HOUR,
  RESET_TOKEN_TTL_SECONDS,
  signResetToken,
  verifyResetToken,
  generateResetToken,
  hashResetToken,
  generateOtp,
  hashOtp,
  constantTimeEqual,
  verifyOtp,
  validatePassword,
  getRequestMeta,
  auditAuth,
  checkResetRateLimit,
  classifyAccount,
  cleanupExpiredOtps,
  maskEmail,
} from './password-reset';
export type {
  ResetTokenPayload,
  PasswordCheck,
  PasswordRule,
  RequestMeta,
  AuthEvent,
  RateCheck,
  AccountAuthKind,
} from './password-reset';

// Session components
export { AuthGuard } from './session/auth-guard';
export { SessionProvider } from './session/session-provider';
export { IdleTimerProvider } from './session/idle-timer';
export { BroadcastLogout, broadcastLogoutEvent } from './session/broadcast-logout';
export { LogoutModal } from './session/logout-modal';
export { SessionHeartbeat, performSecureLogout } from './session/session-heartbeat';

// Auth UI components
export { BrandLogo, AuthShell } from './components/auth-shell';
export type { AuthShellProps } from './components/auth-shell';

// Legacy re-exports from auth.ts & rbac.ts (used by existing core/index.ts)
export { ROLE_HIERARCHY, hasPermission, hasMinRole, canAccess } from './rbac';
export { PERMISSIONS } from './permissions';