import { useEffect, useCallback, useRef } from 'react';

interface NavigationPreventionOptions {
  isActive: boolean;
  message?: string;
  onNavigationAttempt?: () => void;
}

const DEFAULT_MESSAGE = 'You have uploads in progress. Are you sure you want to leave? Your uploads will be cancelled.';

/**
 * Hook to prevent navigation during active uploads
 * Handles both browser navigation (beforeunload) and React Router navigation
 */
export const useNavigationPrevention = ({
  isActive,
  message = DEFAULT_MESSAGE,
  onNavigationAttempt
}: NavigationPreventionOptions) => {
  const isActiveRef = useRef(isActive);
  const messageRef = useRef(message);
  const onNavigationAttemptRef = useRef(onNavigationAttempt);

  // Update refs when props change
  useEffect(() => {
    isActiveRef.current = isActive;
    messageRef.current = message;
    onNavigationAttemptRef.current = onNavigationAttempt;
  }, [isActive, message, onNavigationAttempt]);

  // Handle browser navigation (refresh, close tab, etc.)
  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    if (isActiveRef.current) {
      onNavigationAttemptRef.current?.();
      
      // Modern browsers ignore the custom message and show their own
      // But we still need to set returnValue to trigger the dialog
      event.preventDefault();
      event.returnValue = messageRef.current;
      return messageRef.current;
    }
  }, []);

  // Handle programmatic navigation (React Router, window.location, etc.)
  const handlePopState = useCallback((event: PopStateEvent) => {
    if (isActiveRef.current) {
      onNavigationAttemptRef.current?.();
      
      // Show confirmation dialog
      const shouldLeave = window.confirm(messageRef.current);
      if (!shouldLeave) {
        // Prevent navigation by pushing the current state back
        window.history.pushState(null, '', window.location.href);
      }
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      // Add event listeners
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
      
      // Push current state to handle back button
      window.history.pushState(null, '', window.location.href);
    } else {
      // Remove event listeners
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    }

    // Cleanup on unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isActive, handleBeforeUnload, handlePopState]);

  // Return a function to manually trigger navigation confirmation
  const confirmNavigation = useCallback((customMessage?: string): boolean => {
    if (isActive) {
      onNavigationAttempt?.();
      return window.confirm(customMessage || message);
    }
    return true;
  }, [isActive, message, onNavigationAttempt]);

  return {
    confirmNavigation,
    isPreventingNavigation: isActive
  };
};

export default useNavigationPrevention;