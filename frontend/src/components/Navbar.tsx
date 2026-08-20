import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, UploadCloud, Moon, Sun, PanelLeft, Menu, User, LogOut, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { AuthModal } from './AuthModal';

interface NavbarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isSidebarCollapsed,
  onToggleSidebar,
  onToggleMobileSidebar,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { isLoggedIn, userEmail, tier, rateLimitRemaining, logout } = useUser();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 transition-colors shadow-xs">
      <div className="flex items-center gap-3">
        {/* Desktop Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          className="hidden md:flex p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors"
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        {/* Mobile Sidebar Toggle */}
        <button
          onClick={onToggleMobileSidebar}
          className="flex md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors"
          title="Open Navigation Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-500 flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Target className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-base md:text-lg text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
              ARCHER
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2.5 md:gap-3">
        {/* Ingest Button */}
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 hover:bg-brand-400 text-slate-950 shadow-md shadow-brand-500/20 transition-colors"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload PDFs</span>
        </Link>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* User Auth Section */}
        {isLoggedIn ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-xs transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[11px]">
                {userEmail ? userEmail[0].toUpperCase() : 'U'}
              </div>
              <span className="hidden sm:inline font-medium text-slate-800 dark:text-slate-200 max-w-[100px] truncate">
                {userEmail?.split('@')[0]}
              </span>
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-56 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-2 z-50 text-xs"
                onMouseLeave={() => setShowUserMenu(false)}
              >
                <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{userEmail}</p>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                    Registered Tier
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 flex justify-between py-1">
                  <span>Queries Remaining:</span>
                  <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">{rateLimitRemaining}</span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
          >
            <User className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>Sign In</span>
          </button>
        )}
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </header>
  );
};
