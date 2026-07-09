// Utils barrel export

// Tailwind class merging
export { cn } from './utils';

// API response helpers & auth utilities
export {
  ErrorCode,
  ApiError,
  apiSuccess,
  apiError,
  getAuth,
  requireAuth,
  requireRole,
  safeHandler,
} from './api-response';
export type { ErrorCodeType, ApiErrorShape, ApiSuccessShape, AuthResult } from './api-response';

// Phone number normalization & validation
export {
  normalizePhone,
  normalizeDialCode,
  hashOtp as hashPhoneOtp,
  verifyOtpHash,
  getFriendlyPhoneError,
} from './phone';
export type { PhoneNormalizationResult } from './phone';

// QR code & asset number utilities
export {
  CATEGORY_PREFIXES,
  generateQrId,
  generateAssetNumber as generateAssetNumberQr,
  setAssetCounter,
  getAssetCounter,
  buildQrUrl,
  parseDevice,
  isValidQrId,
  formatCategory,
  getStatusConfig,
  getConditionColor,
  getWarrantyStatus,
} from './qr-utils';

// Number to currency words
export { numberToCurrencyWords } from './number-to-words';

// Label PDF generation
export {
  generateLabelHtml,
  generateBatchLabelHtml,
} from './label-pdf';
export type { EquipmentLabelData, CompanyInfo } from './label-pdf';