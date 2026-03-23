import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import CvPage from './pages/CvPage';
import JdPage from './pages/JdPage';
import MatchingPage from './pages/MatchingPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';

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
      <ChatProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/" element={<MainLayout />}>
              {/* Default route redirects to CVs */}
              <Route index element={<Navigate to="/cvs" replace />} />

              <Route path="cvs" element={<CvPage />} />

              <Route path="jds" element={<JdPage />} />

              <Route path="matching" element={
                <ProtectedRoute>
                  <MatchingPage />
                </ProtectedRoute>
              } />

              <Route path="admin" element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              } />
            </Route>
          </Routes>
        </BrowserRouter>
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;
