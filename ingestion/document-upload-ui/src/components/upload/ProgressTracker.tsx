import React, { useMemo, useCallback } from 'react';
import { 
  UploadProgress, 
  ProgressTrackerProps, 
  calculateOverallProgress,
  formatTimeRemaining,
  formatFileSize,
  formatUploadSpeed
} from '../../types/upload';
import './ProgressTracker.css';

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  uploads,
  onCancelUpload,
  showOverallProgress = true,
  className = ''
}) => {
  // Memoize expensive calculations
  const overallProgress = useMemo(() => calculateOverallProgress(uploads), [uploads]);
  const hasActiveUploads = useMemo(() => uploads.some(u => u.status === 'uploading'), [uploads]);

  // Memoize status icon rendering
  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'success':
        return (
          <svg className="progress-tracker__status-icon progress-tracker__status-icon--success" 
               width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22,4 12,14.01 9,11.01" />
          </svg>
        );
      case 'error':
        return (
          <svg className="progress-tracker__status-icon progress-tracker__status-icon--error" 
               width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg className="progress-tracker__status-icon progress-tracker__status-icon--cancelled" 
               width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case 'uploading':
        return (
          <svg className="progress-tracker__status-icon progress-tracker__status-icon--uploading" 
               width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17,8 12,3 7,8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        );
      default:
        return (
          <svg className="progress-tracker__status-icon progress-tracker__status-icon--pending" 
               width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
        );
    }
  }, []);

  // Memoize status text generation
  const getStatusText = useCallback((upload: UploadProgress) => {
    switch (upload.status) {
      case 'pending':
        return 'Waiting to upload...';
      case 'validating':
        return 'Validating file...';
      case 'uploading':
        return `Uploading... ${upload.progress}%`;
      case 'processing':
        return 'Processing...';
      case 'success':
        return 'Upload complete';
      case 'error':
        return upload.error || 'Upload failed';
      case 'cancelled':
        return 'Upload cancelled';
      default:
        return 'Unknown status';
    }
  }, []);

  if (uploads.length === 0) {
    return null;
  }

  return (
    <div className={`progress-tracker ${className}`}>
      {showOverallProgress && uploads.length > 1 && (
        <div className="progress-tracker__overall">
          <div className="progress-tracker__overall-header">
            <h3 className="progress-tracker__overall-title">
              Upload Progress ({overallProgress.completedFiles} of {overallProgress.totalFiles} files)
            </h3>
            {overallProgress.estimatedTimeRemaining && hasActiveUploads && (
              <span className="progress-tracker__overall-time">
                {formatTimeRemaining(overallProgress.estimatedTimeRemaining)} remaining
              </span>
            )}
          </div>
          
          <div className="progress-tracker__overall-bar">
            <div 
              className="progress-tracker__overall-fill"
              style={{ width: `${overallProgress.overallProgress}%` }}
            />
          </div>
          
          <div className="progress-tracker__overall-stats">
            <span className="progress-tracker__stat">
              {overallProgress.completedFiles} completed
            </span>
            {overallProgress.failedFiles > 0 && (
              <span className="progress-tracker__stat progress-tracker__stat--error">
                {overallProgress.failedFiles} failed
              </span>
            )}
            {overallProgress.cancelledFiles > 0 && (
              <span className="progress-tracker__stat progress-tracker__stat--cancelled">
                {overallProgress.cancelledFiles} cancelled
              </span>
            )}
          </div>
        </div>
      )}

      <div className="progress-tracker__files">
        {uploads.map((upload) => (
          <div 
            key={upload.fileId} 
            className={`progress-tracker__file progress-tracker__file--${upload.status}`}
          >
            <div className="progress-tracker__file-header">
              <div className="progress-tracker__file-info">
                {getStatusIcon(upload.status)}
                <span className="progress-tracker__file-name" title={upload.fileName}>
                  {upload.fileName}
                </span>
              </div>
              
              <div className="progress-tracker__file-actions">
                {upload.status === 'uploading' && onCancelUpload && (
                  <button
                    type="button"
                    className="progress-tracker__cancel-button"
                    onClick={() => onCancelUpload(upload.fileId)}
                    aria-label={`Cancel upload of ${upload.fileName}`}
                    title="Cancel upload"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="progress-tracker__file-status">
              <span className="progress-tracker__status-text">
                {getStatusText(upload)}
              </span>
              
              {upload.status === 'uploading' && upload.estimatedTimeRemaining && (
                <span className="progress-tracker__time-remaining">
                  {formatTimeRemaining(upload.estimatedTimeRemaining)} left
                </span>
              )}
            </div>

            {(upload.status === 'uploading' || upload.status === 'processing') && (
              <div className="progress-tracker__progress-bar">
                <div 
                  className="progress-tracker__progress-fill"
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
            )}

            {upload.status === 'uploading' && (
              <div className="progress-tracker__upload-details">
                {upload.uploadedBytes && upload.totalBytes && (
                  <span className="progress-tracker__size-info">
                    {formatFileSize(upload.uploadedBytes)} of {formatFileSize(upload.totalBytes)}
                  </span>
                )}
                {upload.uploadSpeed && (
                  <span className="progress-tracker__speed-info">
                    {formatUploadSpeed(upload.uploadSpeed)}
                  </span>
                )}
              </div>
            )}

            {upload.status === 'error' && upload.error && (
              <div className="progress-tracker__error-details">
                <span className="progress-tracker__error-message">
                  {upload.error}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(ProgressTracker);