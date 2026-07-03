// Core layer – barrel export
export { db } from './database';

export {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  generateAssetNumber,
  generateInvoiceNumber,
  generatePONumber,
  generateCustomerNumber,
  sanitizeInput,
  parseJsonSafe,
  ROLE_HIERARCHY,
  hasPermission,
  hasMinRole,
  canAccess,
  PERMISSIONS,
} from './auth';

export { env } from './config';
export type { Env } from './config';

export { logger } from './logger';

export {
  getStorageProvider,
  calculateFileChecksum,
  generateStoragePath,
  formatFileSize,
  getFileExtension,
  isFileTypeAllowed,
} from './uploads';
export type { StorageProvider } from './uploads';