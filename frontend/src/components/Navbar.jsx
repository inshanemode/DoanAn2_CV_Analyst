import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  
  return (
    <nav className="fixed top-5 left-0 right-0 z-50 px-4 md:px-8">
      <div className="mx-auto max-w-[1440px] rounded-full mac-glass-nav px-6 py-3 flex justify-between items-center transition-all duration-300">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#0071e3] to-blue-600 flex items-center justify-center shadow-sm">
            <span className="font-bold text-sm text-white">cv</span>
          </div>
          <span className="font-bold text-3xl tracking-tight text-gray-900">Intelligence</span>
        </NavLink>
        
        <div className="flex space-x-3">
          <NavLink 
            to="/cvs" 
            className={({isActive}) => `px-5 py-2 rounded-full text-base font-medium transition-all duration-250 ${isActive ? 'bg-black/5 text-black' : 'mac-subtitle hover:text-black hover:bg-black/5'}`}
          >
            Hồ sơ CV
          </NavLink>
          <NavLink 
            to="/jds" 
            className={({isActive}) => `px-5 py-2 rounded-full text-base font-medium transition-all duration-250 ${isActive ? 'bg-black/5 text-black' : 'mac-subtitle hover:text-black hover:bg-black/5'}`}
          >
            Mô tả công việc (JD)
          </NavLink>
          
          {user ? (
            <div className="flex items-center ml-4 pl-4 border-l border-gray-200">
              <span className="text-sm font-medium text-gray-700 mr-4">Chào, {user.ho_ten}</span>
              <button 
                onClick={logout}
                className="px-4 py-2 rounded-full text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-all duration-250"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <NavLink
              to="/login"
              className="px-5 py-2 rounded-full text-base font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all duration-250 ml-2 shadow-sm"
            >
              Đăng nhập
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
