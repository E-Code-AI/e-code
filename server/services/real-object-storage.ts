/**
 * Deprecated: this module is a compatibility shim.
 * All real storage logic lives in storage.service.ts.
 */
export {
  StorageService as RealObjectStorageService,
  storageService as realObjectStorageService,
  type StorageObject,
  type UploadOptions,
  type DownloadOptions,
} from './storage.service';
