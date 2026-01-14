export type UploadStatus = 
  | 'pending'
  | 'validating'
  | 'uploading'
  | 'processing'
  | 'success'
  | 'error'
  | 'cancelled';

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: UploadStatus;
  error?: string;
  estimatedTimeRemaining?: number; // in seconds
  uploadSpeed?: number; // bytes per second
  uploadedBytes?: number;
  totalBytes?: number;
}

export interface UploadFile {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: UploadError;
  startTime?: number;
  endTime?: number;
}

export interface UploadError {
  code: string;
  message: string;
  details?: any;
}

export interface ProgressTrackerProps {
  uploads: UploadProgress[];
  onCancelUpload?: (fileId: string) => void;
  showOverallProgress?: boolean;
  className?: string;
}

export interface OverallProgress {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  cancelledFiles: number;
  overallProgress: number; // 0-100
  estimatedTimeRemaining?: number;
}

// Upload response from API
export interface UploadResponse {
  documentId: string;
  fileName: string;
  status: 'success' | 'processing';
  message?: string;
}

// Utility functions for progress calculations
export const calculateOverallProgress = (uploads: UploadProgress[]): OverallProgress => {
  const totalFiles = uploads.length;
  const completedFiles = uploads.filter(u => u.status === 'success').length;
  const failedFiles = uploads.filter(u => u.status === 'error').length;
  const cancelledFiles = uploads.filter(u => u.status === 'cancelled').length;
  
  const totalProgress = uploads.reduce((sum, upload) => sum + upload.progress, 0);
  const overallProgress = totalFiles > 0 ? totalProgress / totalFiles : 0;
  
  // Calculate estimated time remaining based on active uploads
  const activeUploads = uploads.filter(u => u.status === 'uploading' && u.estimatedTimeRemaining);
  const estimatedTimeRemaining = activeUploads.length > 0 
    ? Math.max(...activeUploads.map(u => u.estimatedTimeRemaining || 0))
    : undefined;

  return {
    totalFiles,
    completedFiles,
    failedFiles,
    cancelledFiles,
    overallProgress,
    estimatedTimeRemaining
  };
};

export const formatTimeRemaining = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const formatUploadSpeed = (bytesPerSecond: number): string => {
  return `${formatFileSize(bytesPerSecond)}/s`;
};