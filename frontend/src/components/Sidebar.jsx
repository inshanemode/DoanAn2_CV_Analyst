import React from 'react';
import { NavLink } from 'react-router-dom';

function Sidebar() {
  return (
    <aside className="w-[260px] mac-sidebar rounded-[20px] h-full p-[16px] flex flex-col hidden md:flex shrink-0">
      <div className="px-2 pb-4 mb-4 border-b border-black/5">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-3">Quản lý</h2>
        <div className="space-y-1">
          <NavLink 
            to="/cvs"
            className={({isActive}) => `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-all duration-250 ${isActive ? 'bg-[#0071e3]/10 text-[#0071e3] font-bold' : 'mac-subtitle font-medium hover:bg-black/5 hover:text-black'}`}
          >
            <svg className="w-[20px] h-[20px] opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Hồ sơ (CV)
          </NavLink>
          <NavLink 
            to="/jds"
            className={({isActive}) => `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-all duration-250 ${isActive ? 'bg-[#0071e3]/10 text-[#0071e3] font-bold' : 'mac-subtitle font-medium hover:bg-black/5 hover:text-black'}`}
          >
            <svg className="w-[20px] h-[20px] opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            Công việc (JD)
          </NavLink>
        </div>
      </div>
      
      <div className="px-2">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-3">Tính năng</h2>
          <NavLink to="/matching" className={({isActive}) => `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-all duration-250 ${isActive ? 'bg-[#0071e3]/10 text-[#0071e3] font-bold' : 'mac-subtitle font-medium hover:bg-black/5 hover:text-black'}`}>
            <svg className="w-[20px] h-[20px] opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            Phân tích & So khớp
          </NavLink>
      </div>
      
      <div className="mt-auto px-2 border-t border-black/5 pt-4">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base mac-subtitle font-medium hover:bg-black/5 hover:text-black transition-all duration-250">
            <div className="w-[24px] h-[24px] rounded-full bg-black/10"></div>
            <span className="truncate font-bold text-[#1d1d1f]">Admin User</span>
          </button>
      </div>
    </aside>
  );
}

export default Sidebar;
