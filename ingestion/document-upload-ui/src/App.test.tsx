import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';

// Mock AWS Amplify
jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn().mockRejectedValue(new Error('No user')),
  fetchAuthSession: jest.fn().mockRejectedValue(new Error('No session')),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('aws-amplify', () => ({
  Amplify: {
    configure: jest.fn(),
  },
}));

test('renders login page when not authenticated', async () => {
  render(
    <AuthProvider>
      <MemoryRouter 
        initialEntries={['/login']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>
  );
  
  // Should show sign in form
  expect(await screen.findByText('Document Upload System')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
  expect(screen.getByLabelText('Email or Username:')).toBeInTheDocument();
  expect(screen.getByLabelText('Password:')).toBeInTheDocument();
});
