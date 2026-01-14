import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, completeNewPassword, error, isAuthenticated, requiresNewPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the intended destination from location state
  const from = (location.state as any)?.from?.pathname || '/upload';

  // Navigate when authentication succeeds
  React.useEffect(() => {
    if (isAuthenticated) {
      console.log('User authenticated, navigating to:', from);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(username, password);
      // Navigation will happen via useEffect when isAuthenticated becomes true
      // Or requiresNewPassword will be set to true
    } catch (error) {
      // Error is handled by the auth context
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }
    
    setIsLoading(true);

    try {
      await completeNewPassword(newPassword);
      // Navigation will happen via useEffect when isAuthenticated becomes true
    } catch (error) {
      console.error('Password change failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show new password form if required
  if (requiresNewPassword) {
    return (
      <div className="login-container">
        <div className="login-form">
          <h1>Document Upload System</h1>
          <h2>Set New Password</h2>
          <p>You need to set a new password before continuing.</p>
          
          <form onSubmit={handleNewPasswordSubmit}>
            <div className="form-group">
              <label htmlFor="newPassword">New Password:</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
                placeholder="At least 8 characters"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password:</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
                placeholder="Re-enter password"
              />
            </div>

            {error && (
              <div className="error-message">
                {error.message}
              </div>
            )}

            <button type="submit" disabled={isLoading || !newPassword || !confirmPassword}>
              {isLoading ? 'Setting Password...' : 'Set New Password'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Show normal login form
  return (
    <div className="login-container">
      <div className="login-form">
        <h1>Document Upload System</h1>
        <h2>Sign In</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Email or Username:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="error-message">
              {error.message}
            </div>
          )}

          <button type="submit" disabled={isLoading || !username || !password}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
