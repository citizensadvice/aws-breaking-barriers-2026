import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDocumentAPI } from '../../hooks/useDocumentAPI';
import FileDropZone from './FileDropZone';
import FileDisplay from './FileDisplay';
import FileValidator from './FileValidator';
import MetadataManager from './MetadataManager';
import ProgressTracker from './ProgressTracker';
import NavigationGuard from './NavigationGuard';
import GoogleDocsInput from './GoogleDocsInput';
import { ValidationResult } from '../../types/validation';
import { DocumentMetadata } from '../../types/metadata';
import { UploadProgress, UploadFile } from '../../types/upload';
import { GoogleDocsUpload } from '../../types/googleDocs';
import './UploadPage.css';

const UploadPage: React.FC = () => {
  const { user, logout, error } = useAuth();
  const apiClient = useDocumentAPI();
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  
  // File management
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    valid: false,
    errors: [],
    validFiles: [],
    invalidFiles: []
  });
  
  // Google Docs management
  const [googleDocs, setGoogleDocs] = useState<GoogleDocsUpload[]>([]);
  
  // Metadata management
  const [metadata, setMetadata] = useState<DocumentMetadata | DocumentMetadata[]>({
    location: '',
    category: '',
    expiryDate: undefined,
    sensitivity: 3,
    applyToAll: true
  });
  const [isMetadataValid, setIsMetadataValid] = useState(false);
  
  // Upload management
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setLogoutError(null);
      await logout();
    } catch (error: any) {
      console.error('Logout failed:', error);
      setLogoutError(error.message || 'Logout failed. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(prevFiles => [...prevFiles, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleAddGoogleDoc = useCallback((url: string, title?: string) => {
    const newGoogleDoc: GoogleDocsUpload = {
      id: `gdoc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url,
      title,
      metadata: {
        location: '',
        category: '',
        expiryDate: undefined,
        sensitivity: 3
      },
      status: 'pending'
    };
    
    setGoogleDocs(prev => [...prev, newGoogleDoc]);
  }, []);

  const handleRemoveGoogleDoc = useCallback((id: string) => {
    setGoogleDocs(prev => prev.filter(doc => doc.id !== id));
  }, []);

  const handleValidationResult = useCallback((result: ValidationResult) => {
    setValidationResult(result);
  }, []);

  const handleMetadataChange = useCallback((newMetadata: DocumentMetadata | DocumentMetadata[]) => {
    setMetadata(newMetadata);
  }, []);

  const handleMetadataValidationChange = useCallback((isValid: boolean) => {
    setIsMetadataValid(isValid);
  }, []);

  // Generate unique file ID
  const generateFileId = (file: File, index: number): string => {
    return `${file.name}-${file.size}-${index}-${Date.now()}`;
  };

  // Handle upload initiation
  const handleUpload = useCallback(async () => {
    if (!apiClient) {
      setNotification({
        type: 'error',
        message: 'Not authenticated. Please log in again.'
      });
      return;
    }

    const totalItems = validationResult.validFiles.length + googleDocs.length;

    if (totalItems === 0) {
      setNotification({
        type: 'error',
        message: 'No files or Google Docs to upload.'
      });
      return;
    }

    if (!isMetadataValid) {
      setNotification({
        type: 'error',
        message: 'Please complete all required metadata fields.'
      });
      return;
    }

    setIsUploading(true);
    setNotification(null);

    // Initialize upload files and progress for regular files
    const filesToUpload: UploadFile[] = validationResult.validFiles.map((file, index) => ({
      id: generateFileId(file, index),
      file,
      status: 'pending',
      progress: 0,
      startTime: Date.now()
    }));

    setUploadFiles(filesToUpload);

    const initialProgress: UploadProgress[] = [
      ...filesToUpload.map(uploadFile => ({
        fileId: uploadFile.id,
        fileName: uploadFile.file.name,
        progress: 0,
        status: 'pending' as const
      })),
      ...googleDocs.map(doc => ({
        fileId: doc.id,
        fileName: doc.title || 'Google Document',
        progress: 0,
        status: 'pending' as const
      }))
    ];

    setUploadProgress(initialProgress);

    // Determine metadata for each file
    const isBulkMetadata = !Array.isArray(metadata);
    const fileMetadataArray: DocumentMetadata[] = isBulkMetadata
      ? filesToUpload.map(() => metadata as DocumentMetadata)
      : (metadata as DocumentMetadata[]).slice(0, filesToUpload.length);

    const googleDocsMetadataArray: DocumentMetadata[] = isBulkMetadata
      ? googleDocs.map(() => metadata as DocumentMetadata)
      : (metadata as DocumentMetadata[]).slice(filesToUpload.length);

    let successCount = 0;
    let errorCount = 0;

    // Upload regular files
    for (let i = 0; i < filesToUpload.length; i++) {
      const uploadFile = filesToUpload[i];
      const fileMetadata = fileMetadataArray[i];

      try {
        // Update status to uploading
        setUploadProgress(prev => prev.map(p =>
          p.fileId === uploadFile.id
            ? { ...p, status: 'uploading' }
            : p
        ));

        // Track upload progress
        const startTime = Date.now();
        let lastUpdateTime = startTime;
        let lastUploadedBytes = 0;

        await apiClient.uploadFile(
          uploadFile.file,
          fileMetadata,
          uploadFile.id,
          (progress, uploadedBytes, totalBytes) => {
            const currentTime = Date.now();
            const timeDiff = (currentTime - lastUpdateTime) / 1000; // seconds
            const bytesDiff = uploadedBytes - lastUploadedBytes;
            
            // Calculate upload speed
            const uploadSpeed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
            
            // Calculate estimated time remaining
            const remainingBytes = totalBytes - uploadedBytes;
            const estimatedTimeRemaining = uploadSpeed > 0 ? remainingBytes / uploadSpeed : undefined;

            setUploadProgress(prev => prev.map(p =>
              p.fileId === uploadFile.id
                ? {
                    ...p,
                    progress: Math.round(progress),
                    uploadedBytes,
                    totalBytes,
                    uploadSpeed,
                    estimatedTimeRemaining
                  }
                : p
            ));

            lastUpdateTime = currentTime;
            lastUploadedBytes = uploadedBytes;
          }
        );

        // Update status to success
        setUploadProgress(prev => prev.map(p =>
          p.fileId === uploadFile.id
            ? { ...p, status: 'success', progress: 100 }
            : p
        ));

        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: 'success', progress: 100, endTime: Date.now() }
            : f
        ));

        successCount++;

      } catch (error: any) {
        console.error(`Upload failed for ${uploadFile.file.name}:`, error);

        // Update status to error
        const errorMessage = error.message || 'Upload failed';
        
        setUploadProgress(prev => prev.map(p =>
          p.fileId === uploadFile.id
            ? { ...p, status: 'error', error: errorMessage }
            : p
        ));

        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: 'error', error: { code: error.code || 'UPLOAD_ERROR', message: errorMessage }, endTime: Date.now() }
            : f
        ));

        errorCount++;
      }
    }

    // Upload Google Docs
    for (let i = 0; i < googleDocs.length; i++) {
      const googleDoc = googleDocs[i];
      const docMetadata = googleDocsMetadataArray[i] || (metadata as DocumentMetadata);

      try {
        // Update status to uploading
        setUploadProgress(prev => prev.map(p =>
          p.fileId === googleDoc.id
            ? { ...p, status: 'uploading', progress: 50 }
            : p
        ));

        // Upload Google Doc URL
        await apiClient.uploadGoogleDoc(googleDoc.url, docMetadata);

        // Update status to success
        setUploadProgress(prev => prev.map(p =>
          p.fileId === googleDoc.id
            ? { ...p, status: 'success', progress: 100 }
            : p
        ));

        successCount++;

      } catch (error: any) {
        console.error(`Upload failed for Google Doc ${googleDoc.title}:`, error);

        // Update status to error
        const errorMessage = error.message || 'Upload failed';
        
        setUploadProgress(prev => prev.map(p =>
          p.fileId === googleDoc.id
            ? { ...p, status: 'error', error: errorMessage }
            : p
        ));

        errorCount++;
      }
    }

    // Show final notification
    if (errorCount === 0) {
      setNotification({
        type: 'success',
        message: `Successfully uploaded ${successCount} item${successCount !== 1 ? 's' : ''}.`
      });
      
      // Clear selected files and Google Docs after successful upload
      setTimeout(() => {
        setSelectedFiles([]);
        setGoogleDocs([]);
        setUploadFiles([]);
        setUploadProgress([]);
        setMetadata({
          location: '',
          category: '',
          expiryDate: undefined,
          sensitivity: 3,
          applyToAll: true
        });
      }, 3000);
    } else {
      setNotification({
        type: 'error',
        message: `${successCount} item${successCount !== 1 ? 's' : ''} uploaded successfully, ${errorCount} failed.`
      });
    }

    setIsUploading(false);
  }, [apiClient, validationResult, googleDocs, metadata, isMetadataValid]);

  // Handle upload cancellation
  const handleCancelUpload = useCallback((fileId: string) => {
    if (!apiClient) return;

    apiClient.cancelUpload(fileId);

    setUploadProgress(prev => prev.map(p =>
      p.fileId === fileId
        ? { ...p, status: 'cancelled', error: 'Upload cancelled by user' }
        : p
    ));

    setUploadFiles(prev => prev.map(f =>
      f.id === fileId
        ? { ...f, status: 'cancelled', endTime: Date.now() }
        : f
    ));
  }, [apiClient]);

  // Auto-dismiss success notifications
  useEffect(() => {
    if (notification?.type === 'success') {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Display user's name with fallback to email or username
  const getUserDisplayName = () => {
    if (user?.email && user.email !== user.username) {
      return user.email;
    }
    return user?.username || 'User';
  };

  // Display organization if available
  const getOrganizationDisplay = () => {
    if (user?.organization && user.organization.trim()) {
      return user.organization;
    }
    return null;
  };

  // Display location if available
  const getUserLocation = () => {
    if (user?.location && user.location.trim()) {
      return user.location;
    }
    return null;
  };

  const canUpload = (validationResult.valid || googleDocs.length > 0) && isMetadataValid && !isUploading && (selectedFiles.length > 0 || googleDocs.length > 0);
  const hasActiveUploads = uploadProgress.some(p => p.status === 'uploading');
  const totalItemsToUpload = validationResult.validFiles.length + googleDocs.length;

  return (
    <NavigationGuard
      isActive={hasActiveUploads}
      message="You have uploads in progress. Leaving this page will cancel your uploads."
    >
      <div className="upload-page">
        <header className="upload-header">
          <h1>Document Upload</h1>
          <div className="user-info">
            <div className="user-identity">
              <span className="user-name">
                Welcome, {getUserDisplayName()}
              </span>
              {getOrganizationDisplay() && (
                <span className="user-organization">
                  {getOrganizationDisplay()}
                </span>
              )}
              {getUserLocation() && (
                <span className="user-location">
                  📍 {getUserLocation()}
                </span>
              )}
            </div>
            <div className="user-actions">
              {logoutError && (
                <span className="logout-error">{logoutError}</span>
              )}
              <button 
                onClick={handleLogout} 
                className="logout-button"
                disabled={isLoggingOut || hasActiveUploads}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </header>
        
        {error && (
          <div className="auth-error-banner">
            Authentication Error: {error.message}
          </div>
        )}

        {notification && (
          <div className={`upload-notification upload-notification--${notification.type}`}>
            <div className="upload-notification__content">
              {notification.type === 'success' && (
                <svg className="upload-notification__icon" width="20" height="20" viewBox="0 0 24 24" 
                     fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22,4 12,14.01 9,11.01" />
                </svg>
              )}
              {notification.type === 'error' && (
                <svg className="upload-notification__icon" width="20" height="20" viewBox="0 0 24 24" 
                     fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              )}
              <span className="upload-notification__message">{notification.message}</span>
              <button
                className="upload-notification__close"
                onClick={() => setNotification(null)}
                aria-label="Close notification"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        <main className="upload-content">
          <div className="upload-interface">
            <section className="upload-section">
              <h2 className="upload-section__title">Select Files</h2>
              <FileDropZone 
                onFilesSelected={handleFilesSelected}
                disabled={isLoggingOut || isUploading}
              />
              
              {selectedFiles.length > 0 && (
                <>
                  <FileDisplay 
                    files={selectedFiles}
                    onRemoveFile={handleRemoveFile}
                  />
                  
                  <FileValidator
                    files={selectedFiles}
                    config={{
                      maxSize: 50 * 1024 * 1024, // 50MB
                      allowedTypes: [
                        'application/pdf',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'text/html',
                        'text/plain',
                        'application/vnd.ms-powerpoint',
                        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                      ],
                      allowedExtensions: ['pdf', 'doc', 'docx', 'html', 'htm', 'txt', 'ppt', 'pptx']
                    }}
                    onValidationResult={handleValidationResult}
                    showRequirements={true}
                  />
                </>
              )}
            </section>

            <section className="upload-section">
              <GoogleDocsInput
                onAddGoogleDoc={handleAddGoogleDoc}
                disabled={isLoggingOut || isUploading}
              />
              
              {googleDocs.length > 0 && (
                <div className="google-docs-list">
                  <h3 className="google-docs-list__title">Added Google Docs ({googleDocs.length})</h3>
                  <div className="google-docs-list__items">
                    {googleDocs.map((doc) => (
                      <div key={doc.id} className="google-docs-list__item">
                        <div className="google-docs-list__item-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10,19L12,15H9V10H15V15L13,19H10Z" />
                          </svg>
                        </div>
                        <div className="google-docs-list__item-info">
                          <div className="google-docs-list__item-title">{doc.title || 'Google Document'}</div>
                          <div className="google-docs-list__item-url">{doc.url}</div>
                        </div>
                        <button
                          type="button"
                          className="google-docs-list__item-remove"
                          onClick={() => handleRemoveGoogleDoc(doc.id)}
                          disabled={isUploading}
                          aria-label={`Remove ${doc.title || 'Google Document'}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {(validationResult.valid || googleDocs.length > 0) && totalItemsToUpload > 0 && (
              <section className="upload-section">
                <h2 className="upload-section__title">Document Metadata</h2>
                <MetadataManager
                  files={[...validationResult.validFiles, ...googleDocs.map(() => new File([], 'placeholder'))]}
                  onMetadataChange={handleMetadataChange}
                  onValidationChange={handleMetadataValidationChange}
                  disabled={isUploading}
                  userLocation={getUserLocation() || undefined}
                />
              </section>
            )}

            {(validationResult.valid || googleDocs.length > 0) && totalItemsToUpload > 0 && (
              <section className="upload-section">
                <div className="upload-actions">
                  <button
                    type="button"
                    className="upload-button"
                    onClick={handleUpload}
                    disabled={!canUpload}
                  >
                    {isUploading ? 'Uploading...' : `Upload ${totalItemsToUpload} Item${totalItemsToUpload !== 1 ? 's' : ''}`}
                  </button>
                  
                  {(selectedFiles.length > 0 || googleDocs.length > 0) && !isUploading && (
                    <button
                      type="button"
                      className="clear-button"
                      onClick={() => {
                        setSelectedFiles([]);
                        setGoogleDocs([]);
                        setUploadFiles([]);
                        setUploadProgress([]);
                        setNotification(null);
                      }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </section>
            )}

            {uploadProgress.length > 0 && (
              <section className="upload-section">
                <h2 className="upload-section__title">Upload Progress</h2>
                <ProgressTracker
                  uploads={uploadProgress}
                  onCancelUpload={handleCancelUpload}
                  showOverallProgress={uploadProgress.length > 1}
                />
              </section>
            )}
          </div>
        </main>
      </div>
    </NavigationGuard>
  );
};

export default UploadPage;