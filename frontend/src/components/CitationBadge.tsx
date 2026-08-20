import React, { useState } from 'react';
import { CitationItem } from '../types';
import { BookOpen, ExternalLink, FileText, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CitationBadgeProps {
  citation: CitationItem;
  variant?: 'inline' | 'card';
}

export const CitationBadge: React.FC<CitationBadgeProps> = ({ citation, variant = 'inline' }) => {
  const [showPopover, setShowPopover] = useState(false);

  if (variant === 'card') {
    return (
      <div className="group p-3 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-brand-500/40 shadow-sm transition-all">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded bg-brand-500/10 text-brand-700 dark:text-brand-400 text-xs font-semibold">
              p.{citation.page_number}
            </span>
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors line-clamp-1">
              {citation.paper_title}
            </h4>
          </div>
          <Link
            to={`/papers/${citation.document_id}`}
            className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 p-1 rounded transition-colors"
            title="View Paper Details"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
        {citation.section && (
          <span className="inline-block text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Section: {citation.section}
          </span>
        )}
        {citation.quote && (
          <p className="text-xs text-slate-600 dark:text-slate-400 italic line-clamp-2 bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded border border-slate-200 dark:border-slate-800/50">
            "{citation.quote}"
          </p>
        )}
      </div>
    );
  }

  return (
    <span className="relative inline-block my-0.5">
      <button
        onClick={() => setShowPopover(!showPopover)}
        onMouseEnter={() => setShowPopover(true)}
        onMouseLeave={() => setShowPopover(false)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-brand-500/10 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 hover:bg-brand-500/20 dark:hover:bg-brand-500/25 border border-brand-500/30 transition-colors cursor-pointer"
      >
        <BookOpen className="w-3 h-3 text-brand-600 dark:text-brand-400" />
        <span>{citation.citation_label || `[${citation.paper_title}, p. ${citation.page_number}]`}</span>
      </button>

      {showPopover && (
        <div
          onMouseEnter={() => setShowPopover(true)}
          onMouseLeave={() => setShowPopover(false)}
          className="absolute z-50 bottom-full left-0 mb-2 w-80 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl text-left"
        >
          <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-200 truncate">
              <FileText className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
              <span className="truncate">{citation.paper_title}</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Page {citation.page_number}
            </span>
          </div>

          {citation.section && (
            <div className="text-[11px] text-emerald-600 dark:text-cyan-400 font-medium mb-1">
              Section: {citation.section}
            </div>
          )}

          {citation.quote && (
            <p className="text-xs text-slate-700 dark:text-slate-300 italic mb-2 leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-2 rounded border border-slate-200 dark:border-slate-800">
              "{citation.quote}"
            </p>
          )}

          <div className="flex justify-end">
            <Link
              to={`/papers/${citation.document_id}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
            >
              Open Full Paper <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </span>
  );
};

