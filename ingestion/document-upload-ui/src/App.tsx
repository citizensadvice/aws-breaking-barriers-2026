import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './components/auth/AuthGuard';
import { checkBrowserCompatibility } from './utils/browserCompatibility';
import './App.css';

// Lazy load route components for code splitting
const LoginPage = lazy(() => import('./components/auth/LoginPage'));
const UploadPage = lazy(() => import('./components/upload/UploadPage'));

// Loading fallback component
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    fontSize: '18px',
    color: '#666'
  }}>
    Loading...
  </div>
);

function App() {
  // Check browser compatibility on mount
  useEffect(() => {
    checkBrowserCompatibility();
  }, []);

  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <div className="App">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route 
                path="/upload" 
                element={
                  <AuthGuard>
                    <UploadPage />
                  </AuthGuard>
                } 
              />
              <Route path="/" element={<Navigate to="/upload" replace />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
