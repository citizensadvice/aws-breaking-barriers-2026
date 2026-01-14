import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { UploadFile, UploadStatus, UploadProgress, UploadError } from '../../types/upload';
import ProgressTracker from './ProgressTracker';
import NavigationGuard from './NavigationGuard';
import './UploadStatusManager.css';

interface UploadStatusManagerProps {
  files: File[];
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: UploadError) => void;
  onStatusChange?: (status: UploadManagerStatus) => void;
  className?: string;
}

export interface UploadResult {
  file: File;
  success: boolean;
  documentId?: string;
  error?: string;
}

export interface UploadManagerStatus {
  isUploading: boolean;
  hasActiveUploads: boolean;
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  totalCount: number;
}

const UploadStatusManager: React.FC<UploadStatusManagerProps> = ({
  files,
  onUploadComplete,
  onUploadError,
  onStatusChange,
  className = ''
}) => {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Initialize uploads when files change
  useEffect(() => {
    if (files.length > 0 && !isUploading) {
      const newUploads = new Map<string, UploadProgress>();
      files.forEach((file, index) => {
        const fileId = `${file.name}-${file.size}-${index}`;
        newUploads.set(fileId, {
          fileId,
          fileName: file.name,
          progress: 0,
          status: 'pending',
          uploadedBytes: 0,
          totalBytes: file.size
        });
      });
      setUploads(newUploads);
      setUploadResults([]);
    }
  }, [files, isUploading]);

  // Update status callback when uploads change
  useEffect(() => {
    const uploadsArray = Array.from(uploads.values());
    const hasActiveUploads = uploadsArray.some(u => 
      u.status === 'uploading' || u.status === 'processing' || u.status === 'validating'
    );
    const completedCount = uploadsArray.filter(u => u.status === 'success').length;
    const failedCount = uploadsArray.filter(u => u.status === 'error').length;
    const cancelledCount = uploadsArray.filter(u => u.status === 'cancelled').length;

    const status: UploadManagerStatus = {
      isUploading,
      hasActiveUploads,
      completedCount,
      failedCount,
      cancelledCount,
      totalCount: uploadsArray.length
    };

    onStatusChange?.(status);
  }, [uploads, isUploading, onStatusChange]);

  // Memoize update function to prevent recreating on every render
  const updateUploadProgress = useCallback((fileId: string, update: Partial<UploadProgress>) => {
    setUploads(prev => {
      const newUploads = new Map(prev);
      const existing = newUploads.get(fileId);
      if (existing) {
        newUploads.set(fileId, { ...existing, ...update });
      }
      return newUploads;
    });
  }, []);

  const simulateFileUpload = useCallback(async (file: File, fileId: string): Promise<UploadResult> => {
    const abortController = new AbortController();
    abortControllersRef.current.set(fileId, abortController);

    try {
      // Simulate validation phase
      updateUploadProgress(fileId, { status: 'validating' });
      await new Promise(resolve => setTimeout(resolve, 500));

      if (abortController.signal.aborted) {
        throw new Error('Upload cancelled');
      }

      // Simulate upload with progress
      updateUploadProgress(fileId, { 
        status: 'uploading',
        progress: 0,
        uploadSpeed: 1024 * 1024 // 1MB/s simulation
      });

      const totalChunks = 20;
      const chunkSize = file.size / totalChunks;
      
      for (let i = 0; i <= totalChunks; i++) {
        if (abortController.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const progress = (i / totalChunks) * 100;
        const uploadedBytes = Math.min(i * chunkSize, file.size);
        const remainingBytes = file.size - uploadedBytes;
        const estimatedTimeRemaining = remainingBytes / (1024 * 1024); // seconds at 1MB/s

        updateUploadProgress(fileId, {
          progress,
          uploadedBytes,
          estimatedTimeRemaining: estimatedTimeRemaining > 0 ? estimatedTimeRemaining : undefined
        });

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Simulate processing phase
      updateUploadProgress(fileId, { 
        status: 'processing',
        progress: 100,
        estimatedTimeRemaining: undefined
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (abortController.signal.aborted) {
        throw new Error('Upload cancelled');
      }

      // Simulate random success/failure for demo
      const shouldFail = Math.random() < 0.1; // 10% failure rate for demo
      
      if (shouldFail) {
        throw new Error('Server error: Failed to process document');
      }

      // Success
      updateUploadProgress(fileId, { 
        status: 'success',
        progress: 100
      });

      return {
        file,
        success: true,
        documentId: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage === 'Upload cancelled') {
        updateUploadProgress(fileId, { 
          status: 'cancelled',
          error: errorMessage
        });
      } else {
        updateUploadProgress(fileId, { 
          status: 'error',
          error: errorMessage
        });
      }

      return {
        file,
        success: false,
        error: errorMessage
      };
    } finally {
      abortControllersRef.current.delete(fileId);
    }
  }, [updateUploadProgress]);

  const startUploads = useCallback(async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);
    const results: UploadResult[] = [];

    try {
      // Upload files concurrently
      const uploadPromises = files.map((file, index) => {
        const fileId = `${file.name}-${file.size}-${index}`;
        return simulateFileUpload(file, fileId);
      });

      const uploadResults = await Promise.all(uploadPromises);
      results.push(...uploadResults);
      setUploadResults(uploadResults);

      // Check for any errors
      const hasErrors = uploadResults.some(result => !result.success);
      if (hasErrors) {
        const firstError = uploadResults.find(result => !result.success);
        onUploadError?.({
          code: 'UPLOAD_FAILED',
          message: firstError?.error || 'Some uploads failed'
        });
      }

      onUploadComplete?.(uploadResults);

    } catch (error) {
      const uploadError: UploadError = {
        code: 'UPLOAD_SYSTEM_ERROR',
        message: error instanceof Error ? error.message : 'System error during upload'
      };
      onUploadError?.(uploadError);
    } finally {
      setIsUploading(false);
    }
  }, [files, isUploading, simulateFileUpload, onUploadComplete, onUploadError]);

  const cancelUpload = useCallback((fileId: string) => {
    const abortController = abortControllersRef.current.get(fileId);
    if (abortController) {
      abortController.abort();
    }
  }, []);

  const cancelAllUploads = useCallback(() => {
    abortControllersRef.current.forEach(controller => {
      controller.abort();
    });
    setIsUploading(false);
  }, []);

  const resetUploads = useCallback(() => {
    cancelAllUploads();
    setUploads(new Map());
    setUploadResults([]);
    setIsUploading(false);
  }, [cancelAllUploads]);

  const hasUploads = uploads.size > 0;
  
  // Memoize uploads array to prevent unnecessary re-renders
  const uploadsArray = useMemo(() => Array.from(uploads.values()), [uploads]);
  
  // Memoize active uploads check
  const hasActiveUploads = useMemo(() => 
    uploadsArray.some(u => 
      u.status === 'uploading' || u.status === 'processing' || u.status === 'validating'
    ),
    [uploadsArray]
  );

  const handleNavigationAttempt = useCallback(() => {
    console.log('Navigation attempt detected during active uploads');
  }, []);

  return (
    <NavigationGuard
      isActive={hasActiveUploads}
      message="You have uploads in progress. Are you sure you want to leave? Your uploads will be cancelled."
      onNavigationAttempt={handleNavigationAttempt}
      showWarning={true}
    >
      <div className={`upload-status-manager ${className}`}>
      {hasUploads && (
        <>
          <ProgressTracker
            uploads={uploadsArray}
            onCancelUpload={cancelUpload}
            showOverallProgress={files.length > 1}
          />

          <div className="upload-status-manager__actions">
            {!isUploading && uploads.size > 0 && (
              <button
                type="button"
                className="upload-status-manager__start-button"
                onClick={startUploads}
                disabled={files.length === 0}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17,8 12,3 7,8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Start Upload ({files.length} file{files.length === 1 ? '' : 's'})
              </button>
            )}

            {hasActiveUploads && (
              <button
                type="button"
                className="upload-status-manager__cancel-all-button"
                onClick={cancelAllUploads}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Cancel All Uploads
              </button>
            )}

            {!hasActiveUploads && uploads.size > 0 && (
              <button
                type="button"
                className="upload-status-manager__reset-button"
                onClick={resetUploads}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
                Reset
              </button>
            )}
          </div>

          {uploadResults.length > 0 && !hasActiveUploads && (
            <div className="upload-status-manager__summary">
              <h4 className="upload-status-manager__summary-title">Upload Summary</h4>
              <div className="upload-status-manager__summary-stats">
                <span className="upload-status-manager__summary-stat upload-status-manager__summary-stat--success">
                  {uploadResults.filter(r => r.success).length} successful
                </span>
                {uploadResults.some(r => !r.success) && (
                  <span className="upload-status-manager__summary-stat upload-status-manager__summary-stat--error">
                    {uploadResults.filter(r => !r.success).length} failed
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </NavigationGuard>
  );
};

export default UploadStatusManager;