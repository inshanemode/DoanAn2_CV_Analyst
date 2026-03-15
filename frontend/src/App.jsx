import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import CvPage from './pages/CvPage';
import JdPage from './pages/JdPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          {/* Default route redirects to CVs */}
          <Route index element={<Navigate to="/cvs" replace />} />
          
          <Route path="cvs" element={<CvPage />} />
          <Route path="jds" element={<JdPage />} />
          
          {/* Skeleton for future matching page */}
          <Route path="matching" element={
            <div className="flex items-center justify-center h-64 w-full text-gray-500">
              Chức năng So khớp đang được phát triển...
            </div>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
