import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Outlet } from 'react-router-dom';

function MainLayout() {
  return (
    <div className="min-h-screen text-[#1d1d1f] overflow-hidden flex flex-col items-center">
      <Navbar />

      <div className="w-full h-screen pt-24 pb-8 px-4 md:px-8 flex max-w-[1440px] mx-auto gap-4 sm:gap-6">
        <Sidebar />
        
        {/* Vùng Content Chính của mỗi trang sẽ hiển thị ở đây thông qua Outlet */}
        <main className="flex-1 flex flex-col h-full overflow-y-auto pr-2 pb-10 space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
