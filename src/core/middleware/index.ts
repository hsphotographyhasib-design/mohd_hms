// Middleware barrel export

export {
  checkRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
  isEmailLocked,
  checkRegistrationRateLimit,
} from './rate-limiter';

export {
  verifyRouteAuth,
  verifyAuthOnly,
} from './api-auth';
export type { AuthSuccess, AuthResult } from './api-auth';