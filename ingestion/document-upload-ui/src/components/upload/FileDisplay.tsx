import React, { useMemo } from 'react';
import './FileDisplay.css';

interface FileDisplayProps {
  files: File[];
  onRemoveFile: (index: number) => void;
  className?: string;
}

interface FileIconProps {
  fileType: string;
  fileName: string;
}

// Memoize FileIcon component to prevent unnecessary re-renders
const FileIcon: React.FC<FileIconProps> = React.memo(({ fileType, fileName }) => {
  const getFileTypeFromName = (name: string): string => {
    const extension = name.split('.').pop()?.toLowerCase() || '';
    return extension;
  };

  const getIconForFileType = (type: string, name: string): React.ReactElement => {
    const extension = getFileTypeFromName(name);
    const mimeType = type.toLowerCase();
    
    // PDF files
    if (mimeType.includes('pdf') || extension === 'pdf') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14,2 14,8 20,8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10,9 9,9 8,9" />
        </svg>
      );
    }
    
    // Word documents
    if (mimeType.includes('word') || mimeType.includes('msword') || 
        mimeType.includes('wordprocessingml') || extension === 'doc' || extension === 'docx') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14,2 14,8 20,8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="12" y1="9" x2="8" y2="9" />
        </svg>
      );
    }
    
    // PowerPoint presentations
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || 
        extension === 'ppt' || extension === 'pptx') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14,2 14,8 20,8" />
          <rect x="8" y="12" width="8" height="6" />
          <line x1="8" y1="15" x2="16" y2="15" />
        </svg>
      );
    }
    
    // HTML files
    if (mimeType.includes('html') || extension === 'html' || extension === 'htm') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    }
    
    // Text files
    if (mimeType.includes('text') || extension === 'txt') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14,2 14,8 20,8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="12" y1="9" x2="8" y2="9" />
        </svg>
      );
    }
    
    // Default file icon
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14,2 14,8 20,8" />
      </svg>
    );
  };

  const getColorForFileType = (type: string, name: string): string => {
    const extension = getFileTypeFromName(name);
    const mimeType = type.toLowerCase();
    
    if (mimeType.includes('pdf') || extension === 'pdf') return '#dc2626'; // Red
    if (mimeType.includes('word') || mimeType.includes('msword') || 
        mimeType.includes('wordprocessingml') || extension === 'doc' || extension === 'docx') return '#2563eb'; // Blue
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || 
        extension === 'ppt' || extension === 'pptx') return '#ea580c'; // Orange
    if (mimeType.includes('html') || extension === 'html' || extension === 'htm') return '#16a34a'; // Green
    if (mimeType.includes('text') || extension === 'txt') return '#6b7280'; // Gray
    
    return '#6b7280'; // Default gray
  };

  return (
    <div 
      className="file-icon" 
      style={{ color: getColorForFileType(fileType, fileName) }}
    >
      {getIconForFileType(fileType, fileName)}
    </div>
  );
});

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FileDisplay: React.FC<FileDisplayProps> = ({
  files,
  onRemoveFile,
  className = ''
}) => {
  // Memoize total size calculation
  const totalSize = useMemo(() => 
    files.reduce((total, file) => total + file.size, 0),
    [files]
  );

  if (files.length === 0) {
    return null;
  }

  return (
    <div className={`file-display ${className}`}>
      <div className="file-display__header">
        <h3 className="file-display__title">
          Selected Files ({files.length})
        </h3>
      </div>
      
      <div className="file-display__list">
        {files.map((file, index) => (
          <div key={`${file.name}-${file.size}-${index}`} className="file-display__item">
            <div className="file-display__item-content">
              <FileIcon fileType={file.type} fileName={file.name} />
              
              <div className="file-display__item-info">
                <div className="file-display__item-name" title={file.name}>
                  {file.name}
                </div>
                <div className="file-display__item-size">
                  {formatFileSize(file.size)}
                </div>
              </div>
            </div>
            
            <button
              type="button"
              className="file-display__remove-button"
              onClick={() => onRemoveFile(index)}
              aria-label={`Remove ${file.name}`}
              title={`Remove ${file.name}`}
            >
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      
      <div className="file-display__summary">
        <span className="file-display__total-size">
          Total size: {formatFileSize(totalSize)}
        </span>
      </div>
    </div>
  );
};

export default React.memo(FileDisplay);