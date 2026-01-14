import React, { useState } from 'react';
import FileDropZone from './FileDropZone';
import FileValidator from './FileValidator';
import UploadStatusManager from './UploadStatusManager';
import { ValidationResult, DEFAULT_VALIDATION_CONFIG } from '../../types/validation';
import { UploadResult, UploadManagerStatus } from './UploadStatusManager';
import './UploadProgressDemo.css';

const UploadProgressDemo: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    valid: true,
    errors: [],
    validFiles: [],
    invalidFiles: []
  });
  const [uploadStatus, setUploadStatus] = useState<UploadManagerStatus>({
    isUploading: false,
    hasActiveUploads: false,
    completedCount: 0,
    failedCount: 0,
    cancelledCount: 0,
    totalCount: 0
  });

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleValidationResult = (result: ValidationResult) => {
    setValidationResult(result);
  };

  const handleUploadComplete = (results: UploadResult[]) => {
    console.log('Upload completed:', results);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    alert(`Upload completed! ${successCount} successful, ${failureCount} failed.`);
  };

  const handleUploadError = (error: any) => {
    console.error('Upload error:', error);
    alert(`Upload error: ${error.message}`);
  };

  const handleStatusChange = (status: UploadManagerStatus) => {
    setUploadStatus(status);
  };

  const canShowUploadManager = validationResult.valid && validationResult.validFiles.length > 0;

  return (
    <div className="upload-progress-demo">
      <div className="upload-progress-demo__header">
        <h2 className="upload-progress-demo__title">Upload Progress Demo</h2>
        <p className="upload-progress-demo__description">
          Select files to see upload progress tracking, status management, and navigation prevention in action.
        </p>
      </div>

      <div className="upload-progress-demo__section">
        <h3 className="upload-progress-demo__section-title">1. Select Files</h3>
        <FileDropZone
          onFilesSelected={handleFilesSelected}
          maxFiles={5}
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="upload-progress-demo__section">
          <h3 className="upload-progress-demo__section-title">2. File Validation</h3>
          <FileValidator
            files={selectedFiles}
            config={DEFAULT_VALIDATION_CONFIG}
            onValidationResult={handleValidationResult}
            showRequirements={true}
          />
        </div>
      )}

      {canShowUploadManager && (
        <div className="upload-progress-demo__section">
          <h3 className="upload-progress-demo__section-title">3. Upload Progress</h3>
          <UploadStatusManager
            files={validationResult.validFiles}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}

      {uploadStatus.totalCount > 0 && (
        <div className="upload-progress-demo__status">
          <h4 className="upload-progress-demo__status-title">Upload Status</h4>
          <div className="upload-progress-demo__status-grid">
            <div className="upload-progress-demo__status-item">
              <span className="upload-progress-demo__status-label">Total Files:</span>
              <span className="upload-progress-demo__status-value">{uploadStatus.totalCount}</span>
            </div>
            <div className="upload-progress-demo__status-item">
              <span className="upload-progress-demo__status-label">Completed:</span>
              <span className="upload-progress-demo__status-value upload-progress-demo__status-value--success">
                {uploadStatus.completedCount}
              </span>
            </div>
            <div className="upload-progress-demo__status-item">
              <span className="upload-progress-demo__status-label">Failed:</span>
              <span className="upload-progress-demo__status-value upload-progress-demo__status-value--error">
                {uploadStatus.failedCount}
              </span>
            </div>
            <div className="upload-progress-demo__status-item">
              <span className="upload-progress-demo__status-label">Cancelled:</span>
              <span className="upload-progress-demo__status-value upload-progress-demo__status-value--cancelled">
                {uploadStatus.cancelledCount}
              </span>
            </div>
            <div className="upload-progress-demo__status-item">
              <span className="upload-progress-demo__status-label">Active Uploads:</span>
              <span className="upload-progress-demo__status-value">
                {uploadStatus.hasActiveUploads ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="upload-progress-demo__features">
        <h4 className="upload-progress-demo__features-title">Features Demonstrated</h4>
        <ul className="upload-progress-demo__features-list">
          <li>✅ Individual file progress bars with real-time updates</li>
          <li>✅ Overall progress tracking for batch uploads</li>
          <li>✅ Estimated time remaining calculations</li>
          <li>✅ Success messages with document names</li>
          <li>✅ Clear error messages for failed uploads</li>
          <li>✅ Cancel upload functionality (individual and all)</li>
          <li>✅ Navigation prevention during active uploads</li>
          <li>✅ Upload speed and file size information</li>
          <li>✅ Status icons and visual feedback</li>
          <li>✅ Responsive design for mobile devices</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadProgressDemo;