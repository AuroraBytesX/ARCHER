import React from 'react';
import { ShieldCheck, ShieldAlert, Sparkles } from 'lucide-react';

interface EvidenceIndicatorProps {
  score: number; // 0.0 to 1.0
  chunksCount?: number;
}

export const EvidenceIndicator: React.FC<EvidenceIndicatorProps> = ({ score, chunksCount }) => {
  const percentage = Math.round(score * 100);
  
  let label = 'Low Grounding';
  let colorClass = 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20';
  let icon = <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;

  if (score >= 0.7) {
    label = 'High Grounding';
    colorClass = 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20';
    icon = <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
  } else if (score >= 0.4) {
    label = 'Moderate Grounding';
    colorClass = 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
    icon = <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
  }

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
      {icon}
      <span>{label}</span>
      <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            score >= 0.7 ? 'bg-emerald-500' : score >= 0.4 ? 'bg-amber-500' : 'bg-rose-500'
          }`}
          style={{ width: `${Math.max(5, percentage)}%` }}
        />
      </div>
      <span className="font-mono text-[11px] opacity-80">{percentage}%</span>
      {chunksCount !== undefined && (
        <span className="text-[10px] text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-700 pl-1.5">
          {chunksCount} sources
        </span>
      )}
    </div>
  );
};

