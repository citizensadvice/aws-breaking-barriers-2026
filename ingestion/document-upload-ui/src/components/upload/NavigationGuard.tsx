import React, { useState, useCallback } from 'react';
import { useNavigationPrevention } from '../../hooks/useNavigationPrevention';
import './NavigationGuard.css';

interface NavigationGuardProps {
  isActive: boolean;
  message?: string;
  onNavigationAttempt?: () => void;
  showWarning?: boolean;
  children?: React.ReactNode;
}

const NavigationGuard: React.FC<NavigationGuardProps> = ({
  isActive,
  message,
  onNavigationAttempt,
  showWarning = true,
  children
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const handleNavigationAttempt = useCallback(() => {
    onNavigationAttempt?.();
    if (showWarning) {
      // Could show a custom dialog here instead of browser default
      console.log('Navigation attempt detected during active uploads');
    }
  }, [onNavigationAttempt, showWarning]);

  const { confirmNavigation, isPreventingNavigation } = useNavigationPrevention({
    isActive,
    message,
    onNavigationAttempt: handleNavigationAttempt
  });

  const handleConfirmNavigation = useCallback((callback?: () => void) => {
    if (confirmNavigation()) {
      callback?.();
      return true;
    }
    return false;
  }, [confirmNavigation]);

  const showNavigationDialog = useCallback((navigationCallback: () => void) => {
    if (isActive) {
      setPendingNavigation(() => navigationCallback);
      setShowDialog(true);
    } else {
      navigationCallback();
    }
  }, [isActive]);

  const handleDialogConfirm = useCallback(() => {
    setShowDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  }, [pendingNavigation]);

  const handleDialogCancel = useCallback(() => {
    setShowDialog(false);
    setPendingNavigation(null);
  }, []);

  return (
    <>
      {children}
      
      {showWarning && isPreventingNavigation && (
        <div className="navigation-guard__warning">
          <div className="navigation-guard__warning-content">
            <svg className="navigation-guard__warning-icon" width="16" height="16" viewBox="0 0 24 24" 
                 fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="m12 17 .01 0" />
            </svg>
            <span className="navigation-guard__warning-text">
              Uploads in progress. Leaving this page will cancel your uploads.
            </span>
          </div>
        </div>
      )}

      {showDialog && (
        <div className="navigation-guard__dialog-overlay">
          <div className="navigation-guard__dialog">
            <div className="navigation-guard__dialog-header">
              <h3 className="navigation-guard__dialog-title">Confirm Navigation</h3>
            </div>
            
            <div className="navigation-guard__dialog-content">
              <div className="navigation-guard__dialog-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <path d="M12 9v4" />
                  <path d="m12 17 .01 0" />
                </svg>
              </div>
              
              <div className="navigation-guard__dialog-message">
                <p>
                  {message || 'You have uploads in progress. Are you sure you want to leave? Your uploads will be cancelled.'}
                </p>
              </div>
            </div>
            
            <div className="navigation-guard__dialog-actions">
              <button
                type="button"
                className="navigation-guard__dialog-button navigation-guard__dialog-button--cancel"
                onClick={handleDialogCancel}
              >
                Stay on Page
              </button>
              <button
                type="button"
                className="navigation-guard__dialog-button navigation-guard__dialog-button--confirm"
                onClick={handleDialogConfirm}
              >
                Leave Page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NavigationGuard;