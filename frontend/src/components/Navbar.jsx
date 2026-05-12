import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navClass = ({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`;

function SearchIcon() {
  return (
    <svg className="h-5 w-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m21 21-4.35-4.35" />
      <circle cx="11" cy="11" r="7" />
    </svg>
  );
}

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="topbar sticky top-0 z-40">
      <div className="flex h-full w-full items-center gap-7 px-[38px]">
        <NavLink to="/" className="brand-mark shrink-0 text-2xl md:text-[28px]">
          Alysium AI
        </NavLink>

        <div className="search-shell">
          <SearchIcon />
          <span className="text-lg text-slate-700">Search...</span>
        </div>

        <nav className="hidden flex-1 items-center justify-center gap-4 lg:flex">
          <NavLink to="/cvs" className={navClass}>Dashboard</NavLink>
          <NavLink to="/matching" className={navClass}>Results</NavLink>
          <NavLink to="/jds" className={navClass}>Archive</NavLink>
          {user?.vai_tro === 'ADMIN' && <NavLink to="/admin" className={navClass}>Admin</NavLink>}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <NavLink to="/matching" className="btn-primary hidden min-w-[154px] md:inline-flex">
            Analyze Now
          </NavLink>

          {user ? (
            <>
              <button className="btn-soft h-12 w-12 p-0" title="Notifications">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>
              <button className="btn-soft h-12 w-12 p-0" title="Settings">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.14.37.36.7.6 1 .3.3.7.4 1.1.4H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.6Z" />
                </svg>
              </button>
              <button onClick={logout} className="btn-soft h-12 w-12 p-0" title={`Logout ${user.ho_ten}`}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
            </>
          ) : (
            <NavLink to="/login" className="btn-primary">Đăng nhập</NavLink>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
