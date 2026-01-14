import React, { useEffect, useMemo, useCallback } from 'react';
import { 
  FileValidatorProps, 
  ValidationResult, 
  ValidationError, 
  ValidationErrorCode,
  DEFAULT_VALIDATION_CONFIG 
} from '../../types/validation';
import HelpIcon from './HelpIcon';
import './FileValidator.css';

const FileValidator: React.FC<FileValidatorProps> = ({
  files,
  config = DEFAULT_VALIDATION_CONFIG,
  onValidationResult,
  showRequirements = true,
  className = ''
}) => {
  
  // Memoize utility functions
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);
  
  const getFileExtension = useCallback((fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }, []);
  
  const validateFile = useCallback((file: File): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // Check file size
    if (file.size > config.maxSize) {
      errors.push({
        code: 'FILE_TOO_LARGE' as ValidationErrorCode,
        message: `File "${file.name}" is too large. Maximum size is ${formatFileSize(config.maxSize)}.`,
        fileName: file.name,
        field: 'size'
      });
    }
    
    // Check for empty files
    if (file.size === 0) {
      errors.push({
        code: 'EMPTY_FILE' as ValidationErrorCode,
        message: `File "${file.name}" is empty.`,
        fileName: file.name,
        field: 'size'
      });
    }
    
    // Check file type by MIME type and extension
    const isValidMimeType = config.allowedTypes.includes(file.type);
    const fileExtension = getFileExtension(file.name);
    const isValidExtension = config.allowedExtensions.includes(fileExtension);
    
    if (!isValidMimeType && !isValidExtension) {
      errors.push({
        code: 'INVALID_FILE_TYPE' as ValidationErrorCode,
        message: `File "${file.name}" has an unsupported file type. Supported types: ${config.allowedExtensions.join(', ').toUpperCase()}.`,
        fileName: file.name,
        field: 'type'
      });
    }
    
    return errors;
  }, [config, formatFileSize, getFileExtension]);
  
  const validationResult: ValidationResult = useMemo(() => {
    const allErrors: ValidationError[] = [];
    const validFiles: File[] = [];
    const invalidFiles: File[] = [];
    
    files.forEach(file => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        allErrors.push(...fileErrors);
        invalidFiles.push(file);
      } else {
        validFiles.push(file);
      }
    });
    
    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      validFiles,
      invalidFiles
    };
  }, [files, validateFile]);
  
  // Notify parent component of validation result
  useEffect(() => {
    onValidationResult(validationResult);
  }, [validationResult, onValidationResult]);
  
  // Memoize file type display names
  const getFileTypeDisplayName = useCallback((extension: string): string => {
    const typeMap: Record<string, string> = {
      'pdf': 'PDF',
      'doc': 'Word Document',
      'docx': 'Word Document',
      'html': 'HTML',
      'htm': 'HTML',
      'txt': 'Text File',
      'ppt': 'PowerPoint',
      'pptx': 'PowerPoint'
    };
    return typeMap[extension] || extension.toUpperCase();
  }, []);
  
  if (!showRequirements && validationResult.errors.length === 0) {
    return null;
  }
  
  return (
    <div className={`file-validator ${className}`}>
      {showRequirements && (
        <div className="file-validator__requirements">
          <h4 className="file-validator__requirements-title">
            File Requirements
            <HelpIcon 
              content="Only files that meet these requirements can be uploaded. Make sure your files are in a supported format and within the size limit."
              position="right"
            />
          </h4>
          <div className="file-validator__requirements-content">
            <div className="file-validator__requirement">
              <div className="file-validator__requirement-label">
                Supported file types:
                <HelpIcon 
                  content="We support common document formats including PDFs, Word documents, PowerPoint presentations, HTML files, and plain text files."
                  position="right"
                />
              </div>
              <div className="file-validator__requirement-value">
                {config.allowedExtensions.map(ext => getFileTypeDisplayName(ext)).join(', ')}
              </div>
            </div>
            <div className="file-validator__requirement">
              <div className="file-validator__requirement-label">
                Maximum file size:
                <HelpIcon 
                  content="Files larger than this limit cannot be uploaded. Consider compressing large files or splitting them into smaller parts."
                  position="right"
                />
              </div>
              <div className="file-validator__requirement-value">
                {formatFileSize(config.maxSize)}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {validationResult.errors.length > 0 && (
        <div className="file-validator__errors">
          <h4 className="file-validator__errors-title">
            Validation Errors
          </h4>
          <div className="file-validator__errors-list">
            {validationResult.errors.map((error, index) => (
              <div 
                key={`${error.fileName}-${error.code}-${index}`}
                className="file-validator__error"
              >
                <div className="file-validator__error-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <div className="file-validator__error-message">
                  {error.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {files.length > 0 && validationResult.valid && (
        <div className="file-validator__success">
          <div className="file-validator__success-icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="9,12 12,15 22,4" />
            </svg>
          </div>
          <div className="file-validator__success-message">
            All files are valid and ready for upload
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(FileValidator);