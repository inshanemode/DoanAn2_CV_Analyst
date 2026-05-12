import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ChatBox from '../components/ChatBox';

function MainLayout() {
  return (
    <div className="app-shell flex min-h-screen flex-col">
      <Navbar />
      <main className="page-wrap flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-[#cfe0f8] bg-[#dceaff]">
        <div className="flex w-full flex-col gap-4 px-[38px] py-8 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <p className="text-xl font-extrabold text-[#07152b]">Alysium AI</p>
          <p>© 2024 Alysium Intelligence Systems. Professional Grade Analysis.</p>
          <div className="flex flex-wrap gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>API Documentation</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
      <ChatBox />
    </div>
  );
}

export default MainLayout;
