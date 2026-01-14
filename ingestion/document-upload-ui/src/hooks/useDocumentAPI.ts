import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DocumentAPIClient, createAPIClient } from '../services/api';

/**
 * Custom hook to access the Document API client with authentication
 */
export const useDocumentAPI = (): DocumentAPIClient | null => {
  const { user, isAuthenticated } = useAuth();

  const apiClient = useMemo(() => {
    if (!isAuthenticated || !user?.accessToken) {
      return null;
    }

    return createAPIClient(user.accessToken);
  }, [isAuthenticated, user?.accessToken]);

  return apiClient;
};
