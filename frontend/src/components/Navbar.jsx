import React from 'react';
import { NavLink } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[1440px] rounded-full mac-glass-nav px-6 py-3 flex justify-between items-center transition-all duration-300">
      <NavLink to="/" className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#0071e3] to-blue-600 flex items-center justify-center shadow-sm">
          <span className="font-bold text-sm text-white">cv</span>
        </div>
        <span className="font-bold text-3xl tracking-tight text-gray-900">Intelligence</span>
      </NavLink>
      
      <div className="flex space-x-3">
        <NavLink 
          to="/" 
          className={({isActive}) => `px-5 py-2 rounded-full text-base font-medium transition-all duration-250 ${isActive ? 'bg-black/5 text-black' : 'mac-subtitle hover:text-black hover:bg-black/5'}`}
        >
          Tổng quan
        </NavLink>
        <button className="px-5 py-2 rounded-full text-base font-medium mac-subtitle hover:text-black hover:bg-black/5 transition-all duration-250">
          Cài đặt
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
