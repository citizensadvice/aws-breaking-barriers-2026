import { DocumentMetadata } from '../types/metadata';
import { UploadResponse, UploadError } from '../types/upload';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_ENDPOINT || 'https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod';
const API_TIMEOUT = 30000; // 30 seconds

// Upload state for resumable uploads
interface UploadState {
  fileId: string;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  uploadUrl?: string;
  uploadId?: string;
  timestamp: number;
}

// Storage key for resumable uploads
const UPLOAD_STATE_KEY = 'resumable_uploads';

/**
 * Document API Client with Cognito authentication integration
 */
export class DocumentAPIClient {
  private authToken: string;
  private abortControllers: Map<string, AbortController>;

  constructor(authToken: string) {
    this.authToken = authToken;
    this.abortControllers = new Map();
  }

  /**
   * Update the authentication token
   */
  updateAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Upload a file with metadata and progress tracking
   * Converts file to base64 and sends as JSON per OpenAPI spec
   */
  async uploadFile(
    file: File,
    metadata: DocumentMetadata,
    fileId: string,
    onProgress?: (progress: number, uploadedBytes: number, totalBytes: number) => void
  ): Promise<UploadResponse> {
    try {
      // Convert file to base64
      const base64Content = await this.fileToBase64(file);
      
      // Prepare request body according to OpenAPI spec
      const requestBody = {
        fileName: file.name,
        fileContent: base64Content,
        metadata: {
          location: metadata.location,
          ...(metadata.category && { category: metadata.category }),
          ...(metadata.expiryDate && { expiryDate: metadata.expiryDate.toISOString().split('T')[0] }),
          ...(metadata.sensitivity && { sensitivity: metadata.sensitivity }),
        }
      };

      // Create abort controller for cancellation
      const abortController = new AbortController();
      this.abortControllers.set(fileId, abortController);

      // Upload using fetch with JSON body
      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      // Clean up abort controller
      this.abortControllers.delete(fileId);

      if (!response.ok) {
        throw await this.createErrorFromFetchResponse(response);
      }

      const result = await response.json();
      
      // Simulate progress for user feedback (since we can't track JSON upload progress easily)
      if (onProgress) {
        onProgress(100, file.size, file.size);
      }

      return result;
    } catch (error) {
      this.abortControllers.delete(fileId);
      throw this.handleError(error);
    }
  }

  /**
   * Convert file to base64 string
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Upload with progress tracking using XMLHttpRequest
   */
  private uploadWithProgress(
    url: string,
    formData: FormData,
    fileId: string,
    signal: AbortSignal,
    onProgress?: (progress: number, uploadedBytes: number, totalBytes: number) => void
  ): Promise<UploadResponse> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Handle abort signal
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('Upload cancelled'));
      });

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress, event.loaded, event.total);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(this.createErrorFromResponse(xhr));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error occurred'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      // Configure and send request
      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${this.authToken}`);
      xhr.timeout = API_TIMEOUT;
      xhr.send(formData);
    });
  }

  /**
   * Upload Google Docs link with metadata
   * Uses the same /documents endpoint with googleDocsUrl field
   */
  async uploadGoogleDoc(
    url: string,
    metadata: DocumentMetadata
  ): Promise<UploadResponse> {
    try {
      const requestBody = {
        fileName: this.extractFileNameFromUrl(url),
        googleDocsUrl: url,
        metadata: {
          location: metadata.location,
          ...(metadata.category && { category: metadata.category }),
          ...(metadata.expiryDate && { expiryDate: metadata.expiryDate.toISOString().split('T')[0] }),
          ...(metadata.sensitivity && { sensitivity: metadata.sensitivity }),
        }
      };

      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw await this.createErrorFromFetchResponse(response);
      }

      return await response.json();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Extract filename from Google Docs URL
   */
  private extractFileNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const docId = pathParts[pathParts.indexOf('d') + 1] || 'google-doc';
      return `${docId}.gdoc`;
    } catch {
      return 'google-doc.gdoc';
    }
  }

  /**
   * Cancel an ongoing upload
   */
  cancelUpload(fileId: string): void {
    const controller = this.abortControllers.get(fileId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(fileId);
    }
  }

  /**
   * Save upload state for resumable uploads
   */
  saveUploadState(state: UploadState): void {
    try {
      const states = this.getUploadStates();
      states[state.fileId] = state;
      localStorage.setItem(UPLOAD_STATE_KEY, JSON.stringify(states));
    } catch (error) {
      console.error('Failed to save upload state:', error);
    }
  }

  /**
   * Get saved upload state
   */
  getUploadState(fileId: string): UploadState | null {
    const states = this.getUploadStates();
    return states[fileId] || null;
  }

  /**
   * Clear upload state after completion
   */
  clearUploadState(fileId: string): void {
    try {
      const states = this.getUploadStates();
      delete states[fileId];
      localStorage.setItem(UPLOAD_STATE_KEY, JSON.stringify(states));
    } catch (error) {
      console.error('Failed to clear upload state:', error);
    }
  }

  /**
   * Get all saved upload states
   */
  private getUploadStates(): Record<string, UploadState> {
    try {
      const stored = localStorage.getItem(UPLOAD_STATE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to retrieve upload states:', error);
      return {};
    }
  }

  /**
   * Resume an interrupted upload
   */
  async resumeUpload(
    file: File,
    metadata: DocumentMetadata,
    fileId: string,
    onProgress?: (progress: number, uploadedBytes: number, totalBytes: number) => void
  ): Promise<UploadResponse> {
    const savedState = this.getUploadState(fileId);
    
    if (!savedState) {
      // No saved state, perform regular upload
      return this.uploadFile(file, metadata, fileId, onProgress);
    }

    // Check if the file matches the saved state
    if (savedState.fileName !== file.name || savedState.fileSize !== file.size) {
      // File mismatch, clear state and start fresh
      this.clearUploadState(fileId);
      return this.uploadFile(file, metadata, fileId, onProgress);
    }

    try {
      // Check if upload can be resumed
      const canResume = await this.checkResumeCapability(fileId, savedState);
      
      if (canResume) {
        return await this.resumeFileUpload(file, metadata, fileId, savedState, onProgress);
      } else {
        // Cannot resume, start fresh
        this.clearUploadState(fileId);
        return this.uploadFile(file, metadata, fileId, onProgress);
      }
    } catch (error) {
      // If resume fails, try regular upload
      this.clearUploadState(fileId);
      return this.uploadFile(file, metadata, fileId, onProgress);
    }
  }

  /**
   * Check if upload can be resumed
   */
  private async checkResumeCapability(fileId: string, state: UploadState): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/upload/status/${fileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.resumable === true && data.uploadedBytes === state.uploadedBytes;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Resume file upload from saved state
   */
  private async resumeFileUpload(
    file: File,
    metadata: DocumentMetadata,
    fileId: string,
    state: UploadState,
    onProgress?: (progress: number, uploadedBytes: number, totalBytes: number) => void
  ): Promise<UploadResponse> {
    // Create a slice of the file starting from where we left off
    const remainingFile = file.slice(state.uploadedBytes);
    
    const formData = new FormData();
    formData.append('file', remainingFile);
    formData.append('fileId', fileId);
    formData.append('uploadedBytes', state.uploadedBytes.toString());
    formData.append('location', metadata.location);
    
    if (metadata.category) {
      formData.append('category', metadata.category);
    }
    
    if (metadata.expiryDate) {
      formData.append('expiryDate', metadata.expiryDate.toISOString());
    }
    
    if (metadata.title) {
      formData.append('title', metadata.title);
    }

    const abortController = new AbortController();
    this.abortControllers.set(fileId, abortController);

    try {
      const response = await this.uploadWithProgress(
        `${API_BASE_URL}/documents/upload/resume`,
        formData,
        fileId,
        abortController.signal,
        (progress, uploaded, total) => {
          // Adjust progress to account for already uploaded bytes
          const totalProgress = ((state.uploadedBytes + uploaded) / file.size) * 100;
          const totalUploaded = state.uploadedBytes + uploaded;
          if (onProgress) {
            onProgress(totalProgress, totalUploaded, file.size);
          }
          
          // Update saved state
          this.saveUploadState({
            ...state,
            uploadedBytes: totalUploaded,
            timestamp: Date.now(),
          });
        }
      );

      // Clear state on success
      this.clearUploadState(fileId);
      this.abortControllers.delete(fileId);

      return response;
    } catch (error) {
      this.abortControllers.delete(fileId);
      throw error;
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): UploadError {
    if (error instanceof Error) {
      // Network or abort errors
      if (error.message === 'Upload cancelled') {
        return {
          code: 'UPLOAD_CANCELLED',
          message: 'Upload was cancelled',
        };
      }

      if (error.message === 'Network error occurred') {
        return {
          code: 'NETWORK_ERROR',
          message: 'A network error occurred. Please check your connection and try again.',
        };
      }

      if (error.message === 'Upload timeout') {
        return {
          code: 'TIMEOUT_ERROR',
          message: 'Upload timed out. Please try again.',
        };
      }

      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred',
      };
    }

    // Already an UploadError
    if (error.code && error.message) {
      return error;
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      details: error,
    };
  }

  /**
   * Create error from XMLHttpRequest response
   */
  private createErrorFromResponse(xhr: XMLHttpRequest): UploadError {
    try {
      const errorData = JSON.parse(xhr.responseText);
      return {
        code: errorData.code || `HTTP_${xhr.status}`,
        message: errorData.message || xhr.statusText || 'Upload failed',
        details: errorData,
      };
    } catch (error) {
      return {
        code: `HTTP_${xhr.status}`,
        message: xhr.statusText || 'Upload failed',
      };
    }
  }

  /**
   * Create error from fetch response
   */
  private async createErrorFromFetchResponse(response: Response): Promise<UploadError> {
    try {
      const errorData = await response.json();
      return {
        code: errorData.code || `HTTP_${response.status}`,
        message: errorData.message || response.statusText || 'Request failed',
        details: errorData,
      };
    } catch (error) {
      return {
        code: `HTTP_${response.status}`,
        message: response.statusText || 'Request failed',
      };
    }
  }
}

/**
 * Create API client instance with authentication token
 */
export const createAPIClient = (authToken: string): DocumentAPIClient => {
  return new DocumentAPIClient(authToken);
};
