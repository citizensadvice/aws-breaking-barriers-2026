export { default as FileDropZone } from './FileDropZone';
export { default as FileDisplay } from './FileDisplay';
export { default as FileValidator } from './FileValidator';
export { default as MetadataForm } from './MetadataForm';
export { default as IndividualMetadataForm } from './IndividualMetadataForm';
export { default as MetadataManager } from './MetadataManager';
export { default as MetadataDemo } from './MetadataDemo';
export { default as UploadController } from './UploadController';
export { default as ProgressTracker } from './ProgressTracker';
export { default as UploadStatusManager } from './UploadStatusManager';
export { default as NavigationGuard } from './NavigationGuard';
export { default as UploadProgressDemo } from './UploadProgressDemo';
export { default as GoogleDocsInput } from './GoogleDocsInput';
export { default as NotificationSystem } from './NotificationSystem';
export { default as Tooltip } from './Tooltip';
export { default as HelpIcon } from './HelpIcon';

export type {
  ValidationError,
  ValidationResult,
  FileValidationConfig,
  FileValidatorProps,
  ValidationErrorCode
} from '../../types/validation';

export type {
  DocumentMetadata,
  MetadataFormProps,
  MetadataValidationError,
  MetadataValidationResult
} from '../../types/metadata';

export type {
  UploadStatus,
  UploadProgress,
  UploadFile,
  UploadError,
  ProgressTrackerProps,
  OverallProgress,
  UploadResponse
} from '../../types/upload';

export type {
  GoogleDocsUpload,
  GoogleDocsValidationResult
} from '../../types/googleDocs';

export type {
  Notification,
  NotificationType,
  NotificationSystemProps
} from '../../types/notification';

export { DEFAULT_VALIDATION_CONFIG } from '../../types/validation';
export { DEFAULT_CATEGORIES, validateMetadata } from '../../types/metadata';
export { 
  calculateOverallProgress, 
  formatTimeRemaining, 
  formatFileSize, 
  formatUploadSpeed 
} from '../../types/upload';
export {
  validateGoogleDocsUrl,
  extractDocumentId,
  extractDocumentType
} from '../../types/googleDocs';
export { createNotification } from '../../types/notification';