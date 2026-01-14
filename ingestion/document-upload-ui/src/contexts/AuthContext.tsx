import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
import { signIn, signOut, getCurrentUser, fetchAuthSession, confirmSignIn, fetchUserAttributes } from 'aws-amplify/auth';
import { AuthContextValue, AuthState, AuthError, CognitoUser } from '../types/auth';

// Auth reducer actions
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: CognitoUser | null }
  | { type: 'SET_ERROR'; payload: AuthError | null }
  | { type: 'SET_REQUIRES_NEW_PASSWORD'; payload: { required: boolean; username?: string } }
  | { type: 'LOGOUT' };

// Initial auth state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  requiresNewPassword: false,
};

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
        error: null,
        requiresNewPassword: false,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'SET_REQUIRES_NEW_PASSWORD':
      return {
        ...state,
        requiresNewPassword: action.payload.required,
        challengeUsername: action.payload.username,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        requiresNewPassword: false,
        challengeUsername: undefined,
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Configure Amplify (will be configured with actual values in production)
const cognitoConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_USER_POOL_ID || 'us-east-1_example',
      userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || 'example-client-id',
      region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
    },
  },
};

Amplify.configure(cognitoConfig);

// Auth provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing session on mount
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      
      console.log('Auth check - User:', user);
      console.log('Auth check - Session tokens present:', !!session.tokens);
      
      if (user && session.tokens) {
        // Fetch user attributes separately in Amplify v6
        let attributes: any = {};
        try {
          attributes = await fetchUserAttributes();
          console.log('User attributes:', attributes);
        } catch (attrError) {
          console.warn('Could not fetch user attributes:', attrError);
        }
        
        // Extract organization and location from user attributes
        const userAttributes = user.signInDetails?.loginId || '';
        const organization = attributes['custom:organization'] || 
                           attributes['organization'] || 
                           '';
        const location = attributes['custom:location'] || 
                        attributes['location'] || 
                        '';
        
        const cognitoUser: CognitoUser = {
          username: user.username,
          email: userAttributes || user.username,
          organization: organization,
          location: location,
          accessToken: session.tokens.accessToken?.toString() || '',
          refreshToken: '', // Will be handled separately if needed
          idToken: session.tokens.idToken?.toString() || '',
        };
        
        console.log('Setting authenticated user:', cognitoUser.username);
        console.log('User location:', cognitoUser.location);
        dispatch({ type: 'SET_USER', payload: cognitoUser });
      } else {
        console.log('No authenticated user found');
        dispatch({ type: 'SET_USER', payload: null });
      }
    } catch (error) {
      console.log('Auth check error:', error);
      dispatch({ type: 'SET_USER', payload: null });
    }
  };

  const login = async (username: string, password: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const signInResult = await signIn({ username, password });
      
      console.log('Sign in result:', signInResult);
      console.log('Is signed in:', signInResult.isSignedIn);
      console.log('Next step:', signInResult.nextStep);
      
      // Check if new password is required
      if (signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        console.log('New password required for user');
        dispatch({ 
          type: 'SET_REQUIRES_NEW_PASSWORD', 
          payload: { required: true, username } 
        });
        return;
      }
      
      // If sign-in is complete, proceed with session establishment
      if (signInResult.isSignedIn) {
        console.log('Sign-in complete, checking auth state...');
        await checkAuthState();
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
      
      // Wait for session to be fully established
      console.log('Waiting for session establishment...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try multiple times to get the user
      let user = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!user && attempts < maxAttempts) {
        attempts++;
        console.log(`Attempt ${attempts} to get current user...`);
        
        try {
          user = await getCurrentUser();
          console.log('User retrieved successfully:', user.username);
        } catch (error) {
          if (attempts < maxAttempts) {
            console.log('User not found yet, waiting...');
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            throw error;
          }
        }
      }
      
      if (!user) {
        throw new Error('Authentication completed but session not established after multiple attempts');
      }
      
      // Now check full auth state
      await checkAuthState();
      
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error: any) {
      console.error('Login error:', error);
      const authError: AuthError = {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred. Please try logging in again.',
        name: error.name || 'AuthError',
      };
      dispatch({ type: 'SET_ERROR', payload: authError });
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const completeNewPassword = async (newPassword: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      console.log('Completing new password challenge...');
      const result = await confirmSignIn({ challengeResponse: newPassword });
      
      console.log('New password result:', result);
      
      if (result.isSignedIn) {
        console.log('Password changed and signed in successfully');
        await checkAuthState();
        dispatch({ type: 'SET_LOADING', payload: false });
      } else {
        throw new Error('Password change completed but sign-in failed');
      }
    } catch (error: any) {
      console.error('New password error:', error);
      const authError: AuthError = {
        code: error.code || 'PASSWORD_CHANGE_ERROR',
        message: error.message || 'Failed to set new password',
        name: error.name || 'PasswordChangeError',
      };
      dispatch({ type: 'SET_ERROR', payload: authError });
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut();
      dispatch({ type: 'LOGOUT' });
    } catch (error: any) {
      console.error('Logout error:', error);
      // Force logout even if there's an error
      dispatch({ type: 'LOGOUT' });
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      await checkAuthState();
    } catch (error: any) {
      const authError: AuthError = {
        code: error.code || 'TOKEN_REFRESH_ERROR',
        message: error.message || 'Failed to refresh token',
        name: error.name || 'TokenRefreshError',
      };
      dispatch({ type: 'SET_ERROR', payload: authError });
      throw error;
    }
  };

  const contextValue: AuthContextValue = {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    login,
    logout,
    refreshToken,
    completeNewPassword,
    error: state.error,
    requiresNewPassword: state.requiresNewPassword,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};