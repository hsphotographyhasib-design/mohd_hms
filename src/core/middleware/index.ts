// Middleware barrel export

export {
  checkRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
  isEmailLocked,
  checkRegistrationRateLimit,
} from './rate-limiter';