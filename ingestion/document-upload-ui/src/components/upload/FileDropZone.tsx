import React, { useCallback, useState, useRef, useMemo } from 'react';
import './FileDropZone.css';

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  className?: string;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFilesSelected,
  disabled = false,
  maxFiles,
  className = ''
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    setIsDragActive(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    // Only set drag inactive if we're leaving the drop zone entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragActive(false);
      setIsDragOver(false);
    }
  }, [disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    setIsDragOver(true);
  }, [disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    setIsDragActive(false);
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    if (droppedFiles.length > 0) {
      const filesToProcess = maxFiles ? droppedFiles.slice(0, maxFiles) : droppedFiles;
      onFilesSelected(filesToProcess);
    }
  }, [disabled, maxFiles, onFilesSelected]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    
    fileInputRef.current?.click();
  }, [disabled]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (selectedFiles.length > 0) {
      const filesToProcess = maxFiles ? selectedFiles.slice(0, maxFiles) : selectedFiles;
      onFilesSelected(filesToProcess);
    }
    
    // Reset the input value to allow selecting the same files again
    if (e.target) {
      e.target.value = '';
    }
  }, [maxFiles, onFilesSelected]);

  // Memoize drop zone classes to prevent recalculation on every render
  const dropZoneClasses = useMemo(() => {
    const baseClasses = 'file-drop-zone';
    const classes = [baseClasses];
    
    if (className) {
      classes.push(className);
    }
    
    if (disabled) {
      classes.push('file-drop-zone--disabled');
    } else {
      classes.push('file-drop-zone--enabled');
    }
    
    if (isDragActive) {
      classes.push('file-drop-zone--drag-active');
    }
    
    if (isDragOver) {
      classes.push('file-drop-zone--drag-over');
    }
    
    return classes.join(' ');
  }, [className, disabled, isDragActive, isDragOver]);

  return (
    <div
      className={dropZoneClasses}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="File upload area. Click to browse files or drag and drop files here."
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
        aria-hidden="true"
      />
      
      <div className="file-drop-zone__content">
        <div className="file-drop-zone__icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        
        <div className="file-drop-zone__text">
          {isDragActive ? (
            <div>
              <p className="file-drop-zone__primary-text">
                Drop files here
              </p>
              <p className="file-drop-zone__secondary-text">
                Release to upload
              </p>
            </div>
          ) : (
            <div>
              <p className="file-drop-zone__primary-text">
                Drag and drop files here
              </p>
              <p className="file-drop-zone__secondary-text">
                or <span className="file-drop-zone__link">click to browse</span>
              </p>
              {maxFiles && (
                <p className="file-drop-zone__hint">
                  Maximum {maxFiles} files
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(FileDropZone);