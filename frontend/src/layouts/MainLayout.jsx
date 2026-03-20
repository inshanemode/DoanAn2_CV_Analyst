import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ChatBox from '../components/ChatBox';
import { Outlet } from 'react-router-dom';

function MainLayout() {
  return (
    <div className="min-h-screen text-[#1d1d1f] overflow-hidden flex flex-col items-center">
      <Navbar />

      <div className="w-full h-screen pt-28 pb-10 px-6 md:px-10 flex max-w-[1720px] mx-auto gap-6 md:gap-8">
        <Sidebar />

        {/* Vùng Content Chính của mỗi trang sẽ hiển thị ở đây thông qua Outlet */}
        <main className="modern-scrollbar flex-1 flex flex-col h-full overflow-y-auto pr-3 pb-12 space-y-8">
          <Outlet />
        </main>
      </div>

      <ChatBox />
    </div>
  );
}

export default MainLayout;
