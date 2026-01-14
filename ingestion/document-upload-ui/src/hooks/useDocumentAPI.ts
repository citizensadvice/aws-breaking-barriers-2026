import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DocumentAPIClient, createAPIClient } from '../services/api';

/**
 * Custom hook to access the Document API client with authentication
 */
export const useDocumentAPI = (): DocumentAPIClient | null => {
  const { user, isAuthenticated } = useAuth();

  const apiClient = useMemo(() => {
    if (!isAuthenticated || !user?.idToken) {
      return null;
    }

    return createAPIClient(user.idToken);
  }, [isAuthenticated, user?.idToken]);

  return apiClient;
};
