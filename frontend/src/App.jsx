import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import CvPage from './pages/CvPage';
import JdPage from './pages/JdPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center h-screen w-full">Đang tải...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route path="/" element={<MainLayout />}>
            {/* Default route redirects to CVs */}
            <Route index element={<Navigate to="/cvs" replace />} />
            
            <Route path="cvs" element={<CvPage />} />
            
            <Route path="jds" element={<JdPage />} />
            
            {/* Skeleton for future matching page */}
            <Route path="matching" element={
              <ProtectedRoute>
                <div className="flex items-center justify-center h-64 w-full text-gray-500">
                  Chức năng So khớp đang được phát triển...
                </div>
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
