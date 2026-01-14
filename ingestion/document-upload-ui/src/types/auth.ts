export interface CognitoUser {
  username: string;
  email: string;
  organization: string;
  location: string;
  accessToken: string;
  refreshToken: string;
  idToken: string;
}

export interface AuthError {
  code: string;
  message: string;
  name: string;
}

export interface AuthState {
  user: CognitoUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  requiresNewPassword: boolean;
  challengeUsername?: string;
}

export interface AuthContextValue {
  user: CognitoUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  completeNewPassword: (newPassword: string) => Promise<void>;
  error: AuthError | null;
  requiresNewPassword: boolean;
}

export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  region: string;
  domain?: string;
}