// Storage barrel export

// Storage provider (filesystem-based)
export {
  getStorageProvider,
  calculateFileChecksum,
  generateStoragePath,
  formatFileSize,
  getFileExtension,
  isFileTypeAllowed,
} from './provider';
export type { StorageProvider } from './provider';

// Uploads (re-exports from the storage/provider above for backward compat)
export {
  getStorageProvider as getUploadProvider,
  calculateFileChecksum as calculateUploadChecksum,
  generateStoragePath as generateUploadPath,
  formatFileSize as formatUploadSize,
  getFileExtension as getUploadFileExtension,
  isFileTypeAllowed as isUploadFileTypeAllowed,
} from './uploads';
export type { StorageProvider as UploadStorageProvider } from './uploads';