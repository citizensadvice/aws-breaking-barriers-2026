import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as fc from 'fast-check';
import AuthGuard from './AuthGuard';

// Mock AWS Amplify
jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn(),
  fetchAuthSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('aws-amplify', () => ({
  Amplify: {
    configure: jest.fn(),
  },
}));

// Create a mock function that we can control
const mockUseAuth = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: () => mockUseAuth(),
}));

// Test component that AuthGuard should protect
const ProtectedComponent: React.FC = () => (
  <div data-testid="protected-content">Protected Content</div>
);

// Mock login page component to avoid redirect loops
const MockLoginPage: React.FC = () => (
  <div data-testid="login-page">Login Page</div>
);

// Feature: document-upload-ui, Property 39: Unauthenticated user redirection
describe('Property 39: Unauthenticated user redirection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  // Helper function to create auth context with specific state
  const createAuthContext = (isAuthenticated: boolean, isLoading: boolean = false, user: any = null) => ({
    user,
    isAuthenticated,
    isLoading,
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    error: null,
  });

  // Debug test to understand what's happening
  test('debug: simple unauthenticated test', () => {
    mockUseAuth.mockReturnValue(createAuthContext(false, false, null));

    const { container } = render(
      <MemoryRouter 
        initialEntries={['/dashboard']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/login" element={<MockLoginPage />} />
          <Route 
            path="*" 
            element={
              <AuthGuard>
                <ProtectedComponent />
              </AuthGuard>
            } 
          />
        </Routes>
      </MemoryRouter>
    );

    console.log('Container HTML:', container.innerHTML);
    
    const loginPage = screen.queryByTestId('login-page');
    const protectedContent = screen.queryByTestId('protected-content');
    
    console.log('Login page found:', !!loginPage);
    console.log('Protected content found:', !!protectedContent);
    
    // Should redirect to login page
    expect(loginPage).toBeInTheDocument();
    expect(protectedContent).not.toBeInTheDocument();
  });

  test('property: unauthenticated users are redirected to login from any protected route', () => {
    fc.assert(
      fc.property(
        // Generate simple route paths
        fc.constantFrom('/upload', '/dashboard', '/profile'),
        (protectedRoute) => {
          // Set up unauthenticated state for this iteration
          mockUseAuth.mockReturnValue(createAuthContext(false, false, null));

          const { unmount } = render(
            <MemoryRouter 
              initialEntries={[protectedRoute]}
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Routes>
                <Route path="/login" element={<MockLoginPage />} />
                <Route 
                  path="*" 
                  element={
                    <AuthGuard>
                      <ProtectedComponent />
                    </AuthGuard>
                  } 
                />
              </Routes>
            </MemoryRouter>
          );

          // Property: For any protected route, unauthenticated users should be redirected to login
          // This means we should see the login page, not the protected content
          const loginPage = screen.queryByTestId('login-page');
          const protectedContent = screen.queryByTestId('protected-content');
          
          // The key property: unauthenticated users should see login page and NOT protected content
          expect(loginPage).toBeInTheDocument();
          expect(protectedContent).not.toBeInTheDocument();

          // Clean up for next iteration
          unmount();
        }
      ),
      { numRuns: 5 } // Reduced runs for faster execution
    );
  });

  test('property: loading state shows loading indicator regardless of route', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('/upload', '/dashboard', '/profile'),
        (route) => {
          // Set loading state for this iteration
          mockUseAuth.mockReturnValue(createAuthContext(false, true, null));

          const { unmount } = render(
            <MemoryRouter 
              initialEntries={[route]}
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Routes>
                <Route path="/login" element={<MockLoginPage />} />
                <Route 
                  path="*" 
                  element={
                    <AuthGuard>
                      <ProtectedComponent />
                    </AuthGuard>
                  } 
                />
              </Routes>
            </MemoryRouter>
          );

          // Property: For any route, when loading, should show loading indicator
          const loadingElement = screen.getByText('Loading...');
          expect(loadingElement).toBeInTheDocument();

          const protectedContent = screen.queryByTestId('protected-content');
          expect(protectedContent).not.toBeInTheDocument();

          // Clean up for next iteration
          unmount();
        }
      ),
      { numRuns: 5 }
    );
  });

  test('property: authenticated users can access protected content from any route', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('/upload', '/dashboard', '/profile'),
        // Generate simple user data
        fc.record({
          username: fc.string(),
          email: fc.emailAddress(),
          organization: fc.string(),
          accessToken: fc.string(),
          refreshToken: fc.string(),
          idToken: fc.string(),
        }),
        (route, userData) => {
          // Set authenticated state for this iteration
          mockUseAuth.mockReturnValue(createAuthContext(true, false, userData));

          const { unmount } = render(
            <MemoryRouter 
              initialEntries={[route]}
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Routes>
                <Route path="/login" element={<MockLoginPage />} />
                <Route 
                  path="*" 
                  element={
                    <AuthGuard>
                      <ProtectedComponent />
                    </AuthGuard>
                  } 
                />
              </Routes>
            </MemoryRouter>
          );

          // Property: For any route, authenticated users should see protected content
          const protectedContent = screen.getByTestId('protected-content');
          expect(protectedContent).toBeInTheDocument();
          expect(protectedContent).toHaveTextContent('Protected Content');

          // Should not see login page
          const loginPage = screen.queryByTestId('login-page');
          expect(loginPage).not.toBeInTheDocument();

          // Clean up for next iteration
          unmount();
        }
      ),
      { numRuns: 5 }
    );
  });
});