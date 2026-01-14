import React, { useState, useCallback, useEffect } from 'react';
import { 
  DocumentMetadata, 
  MetadataFormProps, 
  MetadataValidationResult,
  DEFAULT_CATEGORIES,
  validateMetadata 
} from '../../types/metadata';
import HelpIcon from './HelpIcon';
import './MetadataForm.css';

const MetadataForm: React.FC<MetadataFormProps> = ({
  files,
  onMetadataChange,
  allowBulkMetadata = true,
  initialMetadata,
  disabled = false,
  className = ''
}) => {
  const [metadata, setMetadata] = useState<DocumentMetadata>({
    location: '',
    category: '',
    expiryDate: undefined,
    sensitivity: 3, // Default to medium sensitivity
    applyToAll: true,
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
    onMetadataChange(metadata);
  }, [metadata, onMetadataChange]);

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

  const handleSensitivityChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value, 10);
    setMetadata(prev => ({
      ...prev,
      sensitivity: value
    }));
  }, []);

  const handleApplyToAllChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMetadata(prev => ({
      ...prev,
      applyToAll: e.target.checked
    }));
  }, []);

  const getFieldError = (field: keyof DocumentMetadata): string | undefined => {
    return validationResult.errors.find(error => error.field === field)?.message;
  };

  const formatDateForInput = (date?: Date): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const hasFiles = files.length > 0;
  const isMultipleFiles = files.length > 1;

  if (!hasFiles) {
    return null;
  }

  return (
    <div className={`metadata-form ${className}`}>
      <div className="metadata-form__header">
        <h3 className="metadata-form__title">Document Metadata</h3>
        <p className="metadata-form__description">
          Provide information to help organize and categorize your document{isMultipleFiles ? 's' : ''}.
        </p>
      </div>

      {allowBulkMetadata && isMultipleFiles && (
        <div className="metadata-form__bulk-option">
          <label className="metadata-form__checkbox-label">
            <input
              type="checkbox"
              checked={metadata.applyToAll}
              onChange={handleApplyToAllChange}
              disabled={disabled}
              className="metadata-form__checkbox"
            />
            <span className="metadata-form__checkbox-text">
              Apply the same metadata to all {files.length} files
            </span>
          </label>
        </div>
      )}

      <div className="metadata-form__fields">
        {/* Location Field (Required) */}
        <div className="metadata-form__field">
          <label htmlFor="location" className="metadata-form__label metadata-form__label--required">
            Location
            <HelpIcon 
              content="Select the location where this document applies."
              position="right"
            />
          </label>
          <select
            id="location"
            value={metadata.location}
            onChange={handleLocationChange}
            disabled={disabled}
            className={`metadata-form__input ${
              getFieldError('location') ? 'metadata-form__input--error' : ''
            }`}
            aria-describedby={getFieldError('location') ? 'location-error' : undefined}
            required
          >
            <option value="">Select a location...</option>
            <option value="croydon">Croydon</option>
            <option value="manchester">Manchester</option>
            <option value="arun-chichester">Arun-Chichester</option>
          </select>
          {getFieldError('location') && (
            <div id="location-error" className="metadata-form__error" role="alert">
              {getFieldError('location')}
            </div>
          )}
        </div>

        {/* Category Field (Optional) */}
        <div className="metadata-form__field">
          <label htmlFor="category" className="metadata-form__label">
            Category
            <HelpIcon 
              content="Choose a category to help classify your document. You can select from predefined categories or create a custom one."
              position="right"
            />
          </label>
          <select
            id="category"
            value={showCustomCategory ? 'custom' : metadata.category || ''}
            onChange={handleCategoryChange}
            disabled={disabled}
            className="metadata-form__select"
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
              className="metadata-form__input metadata-form__custom-category"
              placeholder="Enter custom category"
              aria-label="Custom category"
            />
          )}
        </div>

        {/* Expiry Date Field (Optional) */}
        <div className="metadata-form__field">
          <label htmlFor="expiryDate" className="metadata-form__label">
            Expiry Date
            <HelpIcon 
              content="Set an expiry date if this document should be reviewed or archived after a certain date. This is optional."
              position="right"
            />
          </label>
          <input
            id="expiryDate"
            type="date"
            value={formatDateForInput(metadata.expiryDate)}
            onChange={handleExpiryDateChange}
            disabled={disabled}
            className={`metadata-form__input metadata-form__date-input ${
              getFieldError('expiryDate') ? 'metadata-form__input--error' : ''
            }`}
            min={new Date().toISOString().split('T')[0]}
            aria-describedby={getFieldError('expiryDate') ? 'expiry-date-error' : undefined}
          />
          {getFieldError('expiryDate') && (
            <div id="expiry-date-error" className="metadata-form__error" role="alert">
              {getFieldError('expiryDate')}
            </div>
          )}
          <div className="metadata-form__field-help">
            Optional: When should this document be reviewed or expire?
          </div>
        </div>

        {/* Sensitivity Field (Optional) */}
        <div className="metadata-form__field">
          <label htmlFor="sensitivity" className="metadata-form__label">
            Sensitivity Level
            <HelpIcon 
              content="Set the sensitivity level for this document. 1 = Low sensitivity, 5 = High sensitivity. Default is 3 (Medium)."
              position="right"
            />
          </label>
          <select
            id="sensitivity"
            value={metadata.sensitivity || 3}
            onChange={handleSensitivityChange}
            disabled={disabled}
            className={`metadata-form__select ${
              getFieldError('sensitivity') ? 'metadata-form__input--error' : ''
            }`}
            aria-describedby={getFieldError('sensitivity') ? 'sensitivity-error' : undefined}
          >
            <option value="1">1 - Low Sensitivity</option>
            <option value="2">2 - Below Medium</option>
            <option value="3">3 - Medium (Default)</option>
            <option value="4">4 - Above Medium</option>
            <option value="5">5 - High Sensitivity</option>
          </select>
          {getFieldError('sensitivity') && (
            <div id="sensitivity-error" className="metadata-form__error" role="alert">
              {getFieldError('sensitivity')}
            </div>
          )}
          <div className="metadata-form__field-help">
            Optional: Indicates how sensitive or confidential this document is
          </div>
        </div>
      </div>

      {!metadata.applyToAll && isMultipleFiles && (
        <div className="metadata-form__individual-notice">
          <div className="metadata-form__notice-icon">
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
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>
          <span className="metadata-form__notice-text">
            Individual metadata for each file will be requested during upload.
          </span>
        </div>
      )}

      <div className="metadata-form__validation-summary">
        {validationResult.valid ? (
          <div className="metadata-form__validation-success">
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
          <div className="metadata-form__validation-error">
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

export default MetadataForm;