import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  Library,
  MessageSquareText,
  GitCompare,
  Sparkles,
  HelpCircle,
  BookOpen,
  Mail,
  Github,
  X,
  Target
} from 'lucide-react';
import { HowItWorksModal } from './HowItWorksModal';
import { DocModal } from './DocModal';
import { ContactModal } from './ContactModal';

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
}) => {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/upload', label: 'Upload Papers', icon: UploadCloud },
    { to: '/papers', label: 'Paper Library', icon: Library },
    { to: '/chat', label: 'Research Assistant', icon: MessageSquareText },
    { to: '/compare', label: 'Paper Comparison', icon: GitCompare },
    { to: '/insights', label: 'Insights & Summarization', icon: Sparkles },
  ];

  const renderNavLinks = (isMobile = false) => (
    <div className="space-y-1.5">
      {(!isCollapsed || isMobile) && (
        <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
          Research Navigation
        </div>
      )}

      {navLinks.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={isMobile ? onCloseMobile : undefined}
            title={isCollapsed && !isMobile ? link.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                isCollapsed && !isMobile ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-brand-500/10 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-500/30 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {(!isCollapsed || isMobile) && <span>{link.label}</span>}
          </NavLink>
        );
      })}
    </div>
  );

  const renderBottomLinks = (isMobile = false) => (
    <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-1">
      <button
        onClick={() => {
          if (isMobile) onCloseMobile();
          setShowHowItWorks(true);
        }}
        title={isCollapsed && !isMobile ? "How It Works" : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors ${
          isCollapsed && !isMobile ? 'justify-center' : ''
        }`}
      >
        <HelpCircle className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
        {(!isCollapsed || isMobile) && <span>How It Works</span>}
      </button>

      <button
        onClick={() => {
          if (isMobile) onCloseMobile();
          setShowDocs(true);
        }}
        title={isCollapsed && !isMobile ? "Documentation" : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors ${
          isCollapsed && !isMobile ? 'justify-center' : ''
        }`}
      >
        <BookOpen className="w-4 h-4 shrink-0 text-emerald-600 dark:text-cyan-400" />
        {(!isCollapsed || isMobile) && <span>Documentation</span>}
      </button>

      <button
        onClick={() => {
          if (isMobile) onCloseMobile();
          setShowContact(true);
        }}
        title={isCollapsed && !isMobile ? "Contact & Feedback" : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors ${
          isCollapsed && !isMobile ? 'justify-center' : ''
        }`}
      >
        <Mail className="w-4 h-4 shrink-0 text-brand-600 dark:text-brand-400" />
        {(!isCollapsed || isMobile) && <span>Contact Us</span>}
      </button>

      <a
        href="https://github.com/AuroraBytesX/ARCHER"
        target="_blank"
        rel="noopener noreferrer"
        title={isCollapsed && !isMobile ? "GitHub Repository" : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors ${
          isCollapsed && !isMobile ? 'justify-center' : ''
        }`}
      >
        <Github className="w-4 h-4 shrink-0" />
        {(!isCollapsed || isMobile) && <span>GitHub</span>}
      </a>
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col justify-between p-3 md:p-4 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0 min-h-[calc(100vh-4rem)] transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {renderNavLinks(false)}
        {renderBottomLinks(false)}
      </aside>

      {/* Mobile Drawer Mounted at Root to Prevent Shivering */}
      {isMobileOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/60 transition-opacity"
              onClick={onCloseMobile}
            />

            {/* Slide-over Drawer Panel */}
            <div className="relative w-72 max-w-[80vw] bg-white dark:bg-slate-950 h-full border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between p-4 z-10 overscroll-contain animate-in slide-in-from-left duration-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-brand-500 text-slate-950 flex items-center justify-center font-bold">
                      <Target className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      ARCHER Menu
                    </span>
                  </div>
                  <button
                    onClick={onCloseMobile}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Close Navigation"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {renderNavLinks(true)}
              </div>

              {renderBottomLinks(true)}
            </div>
          </div>,
          document.body
        )}

      {/* Modals */}
      <HowItWorksModal isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
      <DocModal isOpen={showDocs} onClose={() => setShowDocs(false)} />
      <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} />
    </>
  );
};
