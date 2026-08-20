import React from 'react';
import { ResearchGapItem } from '../types';
import { Compass, Lightbulb, AlertTriangle, ArrowUpRight, BookOpen } from 'lucide-react';

interface ResearchGapCardProps {
  gap: ResearchGapItem;
}

export const ResearchGapCard: React.FC<ResearchGapCardProps> = ({ gap }) => {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-5 hover:border-amber-500/40 shadow-sm transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
            <Compass className="w-3.5 h-3.5" />
            {gap.domain}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{gap.referenced_papers?.length || 0} papers linked</span>
          </div>
        </div>

        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2 leading-snug">
          {gap.title}
        </h3>

        <div className="space-y-3 mb-4 text-xs">
          <div>
            <h4 className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] mb-1">
              Identified Gap / Limitation
            </h4>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/60">
              {gap.identified_gap}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              Suggested Research Direction
            </h4>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
              {gap.suggested_direction}
            </p>
          </div>
        </div>
      </div>

      {gap.referenced_papers && gap.referenced_papers.length > 0 && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
            Synthesized From:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {gap.referenced_papers.map((p, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate max-w-[200px]"
                title={p}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

