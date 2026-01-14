import React, { useState, useCallback, useEffect, useMemo } from 'react';
import MetadataForm from './MetadataForm';
import IndividualMetadataForm from './IndividualMetadataForm';
import { 
  DocumentMetadata, 
  validateMetadata 
} from '../../types/metadata';
import './MetadataManager.css';

interface MetadataManagerProps {
  files: File[];
  onMetadataChange: (metadata: DocumentMetadata | DocumentMetadata[]) => void;
  onValidationChange: (isValid: boolean) => void;
  disabled?: boolean;
  className?: string;
}

interface FileMetadata {
  fileIndex: number;
  metadata: DocumentMetadata;
  isValid: boolean;
}

const MetadataManager: React.FC<MetadataManagerProps> = ({
  files,
  onMetadataChange,
  onValidationChange,
  disabled = false,
  className = ''
}) => {
  const [bulkMetadata, setBulkMetadata] = useState<DocumentMetadata>({
    location: '',
    category: '',
    expiryDate: undefined,
    sensitivity: 3,
    applyToAll: true
  });

  const [individualMetadata, setIndividualMetadata] = useState<FileMetadata[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [showIndividualForms, setShowIndividualForms] = useState(false);

  // Initialize individual metadata when files change or when switching to individual mode
  useEffect(() => {
    if (files.length > 0) {
      const newIndividualMetadata: FileMetadata[] = files.map((file, index) => ({
        fileIndex: index,
        metadata: {
          location: '',
          category: '',
          expiryDate: undefined,
          sensitivity: 3,
          applyToAll: false
        },
        isValid: false
      }));
      setIndividualMetadata(newIndividualMetadata);
      setCurrentFileIndex(0);
    }
  }, [files]);

  // Handle bulk metadata changes
  const handleBulkMetadataChange = useCallback((metadata: DocumentMetadata) => {
    setBulkMetadata(metadata);
    
    if (metadata.applyToAll) {
      setShowIndividualForms(false);
      onMetadataChange(metadata);
      
      // Validate bulk metadata
      const validation = validateMetadata(metadata);
      onValidationChange(validation.valid);
    } else {
      setShowIndividualForms(true);
      // When switching to individual mode, pass current individual metadata
      const currentMetadata = individualMetadata.map(item => item.metadata);
      onMetadataChange(currentMetadata);
      
      // Check if all individual metadata is valid
      const allValid = individualMetadata.every(item => item.isValid);
      onValidationChange(allValid);
    }
  }, [individualMetadata, onMetadataChange, onValidationChange]);

  // Handle individual metadata changes
  const handleIndividualMetadataChange = useCallback((fileIndex: number, metadata: DocumentMetadata) => {
    const validation = validateMetadata(metadata);
    
    setIndividualMetadata(prev => {
      const updated = prev.map(item => 
        item.fileIndex === fileIndex 
          ? { ...item, metadata, isValid: validation.valid }
          : item
      );
      
      // Pass updated metadata to parent
      const currentMetadata = updated.map(item => item.metadata);
      onMetadataChange(currentMetadata);
      
      // Check if all individual metadata is valid
      const allValid = updated.every(item => item.isValid);
      onValidationChange(allValid);
      
      return updated;
    });
  }, [onMetadataChange, onValidationChange]);

  // Navigation for individual forms
  const handleNextFile = useCallback(() => {
    if (currentFileIndex < files.length - 1) {
      setCurrentFileIndex(prev => prev + 1);
    }
  }, [currentFileIndex, files.length]);

  const handlePreviousFile = useCallback(() => {
    if (currentFileIndex > 0) {
      setCurrentFileIndex(prev => prev - 1);
    }
  }, [currentFileIndex]);

  const handleGoToFile = useCallback((index: number) => {
    setCurrentFileIndex(index);
  }, []);

  // Memoize current file and metadata to prevent unnecessary re-renders
  const currentFile = useMemo(() => files[currentFileIndex], [files, currentFileIndex]);
  const currentIndividualMetadata = useMemo(() => 
    individualMetadata.find(item => item.fileIndex === currentFileIndex),
    [individualMetadata, currentFileIndex]
  );

  if (files.length === 0) {
    return null;
  }

  const isMultipleFiles = files.length > 1;

  return (
    <div className={`metadata-manager ${className}`}>
      {!showIndividualForms ? (
        // Bulk metadata form
        <MetadataForm
          files={files}
          onMetadataChange={handleBulkMetadataChange}
          allowBulkMetadata={isMultipleFiles}
          initialMetadata={bulkMetadata}
          disabled={disabled}
        />
      ) : (
        // Individual metadata forms
        <div className="metadata-manager__individual-container">
          <div className="metadata-manager__individual-header">
            <h3 className="metadata-manager__individual-title">
              Individual File Metadata
            </h3>
            <p className="metadata-manager__individual-description">
              Provide metadata for each file individually. You can navigate between files using the controls below.
            </p>
          </div>

          {/* File navigation */}
          {isMultipleFiles && (
            <div className="metadata-manager__navigation">
              <div className="metadata-manager__navigation-controls">
                <button
                  type="button"
                  onClick={handlePreviousFile}
                  disabled={currentFileIndex === 0 || disabled}
                  className="metadata-manager__nav-button metadata-manager__nav-button--prev"
                  aria-label="Previous file"
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
                    <polyline points="15,18 9,12 15,6" />
                  </svg>
                  Previous
                </button>

                <div className="metadata-manager__file-selector">
                  {files.map((file, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleGoToFile(index)}
                      disabled={disabled}
                      className={`metadata-manager__file-tab ${
                        index === currentFileIndex ? 'metadata-manager__file-tab--active' : ''
                      } ${
                        individualMetadata[index]?.isValid ? 'metadata-manager__file-tab--valid' : 'metadata-manager__file-tab--invalid'
                      }`}
                      aria-label={`Go to file ${index + 1}: ${file.name}`}
                    >
                      <span className="metadata-manager__file-tab-number">{index + 1}</span>
                      <span className="metadata-manager__file-tab-status">
                        {individualMetadata[index]?.isValid ? (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 12l2 2 4-4" />
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                        ) : (
                          <svg
                            width="12"
                            height="12"
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
                        )}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleNextFile}
                  disabled={currentFileIndex === files.length - 1 || disabled}
                  className="metadata-manager__nav-button metadata-manager__nav-button--next"
                  aria-label="Next file"
                >
                  Next
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
                    <polyline points="9,18 15,12 9,6" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Current file metadata form */}
          {currentFile && currentIndividualMetadata && (
            <IndividualMetadataForm
              file={currentFile}
              fileIndex={currentFileIndex}
              totalFiles={files.length}
              onMetadataChange={handleIndividualMetadataChange}
              initialMetadata={currentIndividualMetadata.metadata}
              disabled={disabled}
            />
          )}

          {/* Back to bulk option */}
          <div className="metadata-manager__back-to-bulk">
            <button
              type="button"
              onClick={() => {
                setBulkMetadata(prev => ({ ...prev, applyToAll: true }));
                handleBulkMetadataChange({ ...bulkMetadata, applyToAll: true });
              }}
              disabled={disabled}
              className="metadata-manager__back-button"
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
                <polyline points="15,18 9,12 15,6" />
              </svg>
              Back to bulk metadata
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(MetadataManager);