import React, { useState, useCallback, useEffect } from 'react';
import { 
  DocumentMetadata, 
  MetadataValidationResult,
  DEFAULT_CATEGORIES,
  validateMetadata 
} from '../../types/metadata';
import './IndividualMetadataForm.css';

interface IndividualMetadataFormProps {
  file: File;
  fileIndex: number;
  totalFiles: number;
  onMetadataChange: (fileIndex: number, metadata: DocumentMetadata) => void;
  initialMetadata?: DocumentMetadata;
  disabled?: boolean;
  className?: string;
}

const IndividualMetadataForm: React.FC<IndividualMetadataFormProps> = ({
  file,
  fileIndex,
  totalFiles,
  onMetadataChange,
  initialMetadata,
  disabled = false,
  className = ''
}) => {
  const [metadata, setMetadata] = useState<DocumentMetadata>({
    location: '',
    category: '',
    expiryDate: undefined,
    title: file.name.split('.').slice(0, -1).join('.'), // Default to filename without extension
    ...initialMetadata
  });

  const [validationResult, setValidationResult] = useState<MetadataValidationResult>({
    valid: false,
    errors: []
  });

  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  // Validate metadata whenever it changes
  useEffect(() => {
    const result = validateMetadata(metadata);
    setValidationResult(result);
    onMetadataChange(fileIndex, metadata);
  }, [metadata, onMetadataChange, fileIndex]);

  const handleLocationChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setMetadata(prev => ({
      ...prev,
      location: e.target.value
    }));
  }, []);

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'custom') {
      setShowCustomCategory(true);
      setMetadata(prev => ({
        ...prev,
        category: customCategory
      }));
    } else {
      setShowCustomCategory(false);
      setMetadata(prev => ({
        ...prev,
        category: value
      }));
    }
  }, [customCategory]);

  const handleCustomCategoryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomCategory(value);
    setMetadata(prev => ({
      ...prev,
      category: value
    }));
  }, []);

  const handleExpiryDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMetadata(prev => ({
      ...prev,
      expiryDate: value ? new Date(value) : undefined
    }));
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMetadata(prev => ({
      ...prev,
      title: e.target.value
    }));
  }, []);

  const getFieldError = (field: keyof DocumentMetadata): string | undefined => {
    return validationResult.errors.find(error => error.field === field)?.message;
  };

  const formatDateForInput = (date?: Date): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`individual-metadata-form ${className}`}>
      <div className="individual-metadata-form__header">
        <div className="individual-metadata-form__file-info">
          <div className="individual-metadata-form__file-details">
            <h4 className="individual-metadata-form__file-name">{file.name}</h4>
            <span className="individual-metadata-form__file-size">
              {formatFileSize(file.size)}
            </span>
          </div>
          <div className="individual-metadata-form__progress">
            <span className="individual-metadata-form__progress-text">
              File {fileIndex + 1} of {totalFiles}
            </span>
            <div className="individual-metadata-form__progress-bar">
              <div 
                className="individual-metadata-form__progress-fill"
                style={{ width: `${((fileIndex + 1) / totalFiles) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="individual-metadata-form__fields">
        {/* Location Field (Required) */}
        <div className="individual-metadata-form__field">
          <label htmlFor={`location-${fileIndex}`} className="individual-metadata-form__label individual-metadata-form__label--required">
            Location
          </label>
          <select
            id={`location-${fileIndex}`}
            value={metadata.location}
            onChange={handleLocationChange}
            disabled={disabled}
            className={`individual-metadata-form__input ${
              getFieldError('location') ? 'individual-metadata-form__input--error' : ''
            }`}
            aria-describedby={getFieldError('location') ? `location-error-${fileIndex}` : undefined}
            required
          >
            <option value="">Select a location...</option>
            <option value="croydon">Croydon</option>
            <option value="manchester">Manchester</option>
            <option value="arun-chichester">Arun-Chichester</option>
          </select>
          {getFieldError('location') && (
            <div id={`location-error-${fileIndex}`} className="individual-metadata-form__error" role="alert">
              {getFieldError('location')}
            </div>
          )}
        </div>

        {/* Category Field (Optional) */}
        <div className="individual-metadata-form__field">
          <label htmlFor={`category-${fileIndex}`} className="individual-metadata-form__label">
            Category
          </label>
          <select
            id={`category-${fileIndex}`}
            value={showCustomCategory ? 'custom' : metadata.category || ''}
            onChange={handleCategoryChange}
            disabled={disabled}
            className="individual-metadata-form__select"
          >
            <option value="">Select a category (optional)</option>
            {DEFAULT_CATEGORIES.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
            <option value="custom">Custom category...</option>
          </select>
          
          {showCustomCategory && (
            <input
              type="text"
              value={customCategory}
              onChange={handleCustomCategoryChange}
              disabled={disabled}
              className="individual-metadata-form__input individual-metadata-form__custom-category"
              placeholder="Enter custom category"
              aria-label="Custom category"
            />
          )}
        </div>

        {/* Expiry Date Field (Optional) */}
        <div className="individual-metadata-form__field">
          <label htmlFor={`expiryDate-${fileIndex}`} className="individual-metadata-form__label">
            Expiry Date
          </label>
          <input
            id={`expiryDate-${fileIndex}`}
            type="date"
            value={formatDateForInput(metadata.expiryDate)}
            onChange={handleExpiryDateChange}
            disabled={disabled}
            className={`individual-metadata-form__input individual-metadata-form__date-input ${
              getFieldError('expiryDate') ? 'individual-metadata-form__input--error' : ''
            }`}
            min={new Date().toISOString().split('T')[0]}
            aria-describedby={getFieldError('expiryDate') ? `expiry-date-error-${fileIndex}` : undefined}
          />
          {getFieldError('expiryDate') && (
            <div id={`expiry-date-error-${fileIndex}`} className="individual-metadata-form__error" role="alert">
              {getFieldError('expiryDate')}
            </div>
          )}
        </div>

        {/* Title Field (Optional) */}
        <div className="individual-metadata-form__field">
          <label htmlFor={`title-${fileIndex}`} className="individual-metadata-form__label">
            Custom Title
          </label>
          <input
            id={`title-${fileIndex}`}
            type="text"
            value={metadata.title}
            onChange={handleTitleChange}
            disabled={disabled}
            className="individual-metadata-form__input"
            placeholder="Custom title for the document"
          />
        </div>
      </div>

      <div className="individual-metadata-form__validation">
        {validationResult.valid ? (
          <div className="individual-metadata-form__validation-success">
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
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span>Metadata is valid</span>
          </div>
        ) : (
          <div className="individual-metadata-form__validation-error">
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
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>Please complete required fields</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default IndividualMetadataForm;