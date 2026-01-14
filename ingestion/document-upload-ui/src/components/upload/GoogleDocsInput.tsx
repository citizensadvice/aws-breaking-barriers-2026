import React, { useState, useCallback } from 'react';
import { 
  validateGoogleDocsUrl, 
  extractDocumentType,
  GoogleDocsValidationResult 
} from '../../types/googleDocs';
import './GoogleDocsInput.css';

interface GoogleDocsInputProps {
  onAddGoogleDoc: (url: string, title?: string) => void;
  disabled?: boolean;
  className?: string;
}

const GoogleDocsInput: React.FC<GoogleDocsInputProps> = ({
  onAddGoogleDoc,
  disabled = false,
  className = ''
}) => {
  const [url, setUrl] = useState('');
  const [validationResult, setValidationResult] = useState<GoogleDocsValidationResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    
    // Clear validation when user is typing
    if (validationResult) {
      setValidationResult(null);
      setShowPreview(false);
    }
  }, [validationResult]);

  const handleValidate = useCallback(() => {
    if (!url.trim()) {
      setValidationResult({
        valid: false,
        error: 'Please enter a Google Docs URL'
      });
      setShowPreview(false);
      return;
    }

    const result = validateGoogleDocsUrl(url);
    setValidationResult(result);
    
    if (result.valid) {
      setShowPreview(true);
    } else {
      setShowPreview(false);
    }
  }, [url]);

  const handleAdd = useCallback(() => {
    if (!validationResult?.valid) {
      handleValidate();
      return;
    }

    // Extract title from URL if available (simplified - in real implementation, 
    // this would come from the API after fetching document metadata)
    const docType = extractDocumentType(url);
    const defaultTitle = docType ? `Google ${docType}` : 'Google Document';
    
    onAddGoogleDoc(url, validationResult.title || defaultTitle);
    
    // Reset form
    setUrl('');
    setValidationResult(null);
    setShowPreview(false);
  }, [url, validationResult, onAddGoogleDoc, handleValidate]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !disabled) {
      e.preventDefault();
      handleAdd();
    }
  }, [disabled, handleAdd]);

  const docType = url ? extractDocumentType(url) : null;

  return (
    <div className={`google-docs-input ${className}`}>
      <div className="google-docs-input__header">
        <svg 
          className="google-docs-input__icon"
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="currentColor"
        >
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10,19L12,15H9V10H15V15L13,19H10Z" />
        </svg>
        <h3 className="google-docs-input__title">Add Google Docs</h3>
      </div>

      <p className="google-docs-input__description">
        Add documents from Google Docs, Sheets, or Slides by providing a shareable link.
      </p>

      <div className="google-docs-input__field">
        <label htmlFor="google-docs-url" className="google-docs-input__label">
          Google Docs URL
        </label>
        
        <div className="google-docs-input__input-wrapper">
          <input
            id="google-docs-url"
            type="url"
            className={`google-docs-input__input ${
              validationResult && !validationResult.valid ? 'google-docs-input__input--error' : ''
            }`}
            placeholder="https://docs.google.com/document/d/..."
            value={url}
            onChange={handleUrlChange}
            onKeyPress={handleKeyPress}
            disabled={disabled}
            aria-invalid={validationResult && !validationResult.valid ? true : undefined}
            aria-describedby={validationResult && !validationResult.valid ? 'url-error' : 'url-hint'}
          />
          
          <button
            type="button"
            className="google-docs-input__add-button"
            onClick={handleAdd}
            disabled={disabled || !url.trim()}
            aria-label="Add Google Docs link"
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add
          </button>
        </div>

        {validationResult && !validationResult.valid && (
          <div id="url-error" className="google-docs-input__error" role="alert">
            <svg 
              className="google-docs-input__error-icon"
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
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{validationResult.error}</span>
          </div>
        )}

        {showPreview && validationResult?.valid && (
          <div className="google-docs-input__preview">
            <div className="google-docs-input__preview-header">
              <svg 
                className="google-docs-input__preview-icon"
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M9,2V8H11V11H5C3.89,11 3,11.89 3,13V19H1V21H9V19H7V13H11V16H13V13H17V19H15V21H23V19H21V13C21,11.89 20.11,11 19,11H13V8H15V2H9M11,4H13V6H11V4Z" />
              </svg>
              <h4 className="google-docs-input__preview-title">
                {validationResult.title || 'Google Document'}
              </h4>
              {docType && (
                <span className="google-docs-input__preview-type">
                  {docType}
                </span>
              )}
            </div>
            <p className="google-docs-input__preview-url">
              {url}
            </p>
          </div>
        )}

        <p id="url-hint" className="google-docs-input__hint">
          Example: <span className="google-docs-input__hint-example">
            https://docs.google.com/document/d/1ABC.../edit
          </span>
        </p>
      </div>
    </div>
  );
};

export default GoogleDocsInput;
