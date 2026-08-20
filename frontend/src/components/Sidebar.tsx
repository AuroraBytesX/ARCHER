import React, { useState } from 'react';
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
  X
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

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full p-3 md:p-4">
      {/* Top Navigation Links */}
      <div className="space-y-1.5">
        {!isCollapsed && (
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
              onClick={onCloseMobile}
              title={isCollapsed ? link.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isCollapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-brand-500/10 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-500/30 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>{link.label}</span>}
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Section: How It Works, Docs, Contact, GitHub */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-1">
        {/* How It Works Button */}
        <button
          onClick={() => setShowHowItWorks(true)}
          title={isCollapsed ? "How It Works" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <HelpCircle className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
          {!isCollapsed && <span>How It Works</span>}
        </button>

        {/* Documentation Button */}
        <button
          onClick={() => setShowDocs(true)}
          title={isCollapsed ? "Documentation" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0 text-emerald-600 dark:text-cyan-400" />
          {!isCollapsed && <span>Documentation</span>}
        </button>

        {/* Contact Me Button */}
        <button
          onClick={() => setShowContact(true)}
          title={isCollapsed ? "Contact & Feedback" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <Mail className="w-4 h-4 shrink-0 text-brand-600 dark:text-brand-400" />
          {!isCollapsed && <span>Contact Us</span>}
        </button>

        {/* GitHub Repository Link */}
        <a
          href="https://github.com/AuroraBytesX/ARCHER"
          target="_blank"
          rel="noopener noreferrer"
          title={isCollapsed ? "GitHub Repository" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <Github className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>GitHub</span>}
        </a>
      </div>

      {/* Modals */}
      <HowItWorksModal isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
      <DocModal isOpen={showDocs} onClose={() => setShowDocs(false)} />
      <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} />
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 backdrop-blur-md shrink-0 min-h-[calc(100vh-4rem)] transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between">
            <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                ARCHER Navigation
              </span>
              <button
                onClick={onCloseMobile}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
