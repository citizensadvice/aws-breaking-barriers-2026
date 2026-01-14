import React, { useState, useCallback, useMemo } from 'react';
import FileDropZone from './FileDropZone';
import FileDisplay from './FileDisplay';
import FileValidator from './FileValidator';
import { ValidationResult, DEFAULT_VALIDATION_CONFIG, FileValidationConfig } from '../../types/validation';
import './UploadController.css';

interface UploadControllerProps {
  onUploadStart?: (validFiles: File[]) => void;
  onFilesChange?: (files: File[]) => void;
  validationConfig?: FileValidationConfig;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

const UploadController: React.FC<UploadControllerProps> = ({
  onUploadStart,
  onFilesChange,
  validationConfig = DEFAULT_VALIDATION_CONFIG,
  maxFiles,
  disabled = false,
  className = ''
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    valid: true,
    errors: [],
    validFiles: [],
    invalidFiles: []
  });

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
    onFilesChange?.(files);
  }, [onFilesChange]);

  const handleRemoveFile = useCallback((index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesChange?.(newFiles);
  }, [selectedFiles, onFilesChange]);

  const handleValidationResult = useCallback((result: ValidationResult) => {
    setValidationResult(result);
  }, []);

  const handleUploadClick = useCallback(() => {
    if (validationResult.valid && validationResult.validFiles.length > 0) {
      onUploadStart?.(validationResult.validFiles);
    }
  }, [validationResult, onUploadStart]);

  // Memoize computed values to prevent unnecessary re-renders
  const canUpload = useMemo(() => 
    validationResult.valid && 
    validationResult.validFiles.length > 0 && 
    !disabled,
    [validationResult.valid, validationResult.validFiles.length, disabled]
  );

  const hasInvalidFiles = useMemo(() => 
    validationResult.invalidFiles.length > 0,
    [validationResult.invalidFiles.length]
  );

  return (
    <div className={`upload-controller ${className}`}>
      <div className="upload-controller__drop-zone">
        <FileDropZone
          onFilesSelected={handleFilesSelected}
          disabled={disabled}
          maxFiles={maxFiles}
        />
      </div>

      {selectedFiles.length > 0 && (
        <>
          <div className="upload-controller__file-display">
            <FileDisplay
              files={selectedFiles}
              onRemoveFile={handleRemoveFile}
            />
          </div>

          <div className="upload-controller__validation">
            <FileValidator
              files={selectedFiles}
              config={validationConfig}
              onValidationResult={handleValidationResult}
              showRequirements={true}
            />
          </div>

          <div className="upload-controller__actions">
            {hasInvalidFiles && (
              <div className="upload-controller__invalid-files-warning">
                <div className="upload-controller__warning-icon">
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
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <path d="M12 9v4" />
                    <path d="m12 17 .01 0" />
                  </svg>
                </div>
                <span className="upload-controller__warning-text">
                  Please fix the validation errors above before uploading.
                </span>
              </div>
            )}

            <button
              type="button"
              className={`upload-controller__upload-button ${
                canUpload ? 'upload-controller__upload-button--enabled' : 'upload-controller__upload-button--disabled'
              }`}
              onClick={handleUploadClick}
              disabled={!canUpload}
              aria-label={
                canUpload 
                  ? `Upload ${validationResult.validFiles.length} file${validationResult.validFiles.length === 1 ? '' : 's'}`
                  : 'Upload disabled - fix validation errors first'
              }
            >
              <div className="upload-controller__upload-button-content">
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17,8 12,3 7,8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>
                  {canUpload 
                    ? `Upload ${validationResult.validFiles.length} File${validationResult.validFiles.length === 1 ? '' : 's'}`
                    : 'Upload Files'
                  }
                </span>
              </div>
            </button>

            {validationResult.validFiles.length > 0 && hasInvalidFiles && (
              <div className="upload-controller__partial-upload-info">
                <span className="upload-controller__info-text">
                  {validationResult.validFiles.length} of {selectedFiles.length} files will be uploaded
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(UploadController);