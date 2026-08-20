import React from 'react';
import { ComparePaperProfile, CompareMatrixRow } from '../types';
import { Layers, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ComparisonTableProps {
  papers: ComparePaperProfile[];
  comparisonTable: CompareMatrixRow[];
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ papers, comparisonTable }) => {
  if (!papers || papers.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm">
      <table className="w-full text-left text-sm border-collapse min-w-[750px]">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 sticky top-0 z-10 backdrop-blur-md">
            <th className="p-4 w-48 font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs border-r border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>Aspect</span>
              </div>
            </th>
            {papers.map((p) => (
              <th key={p.document_id} className="p-4 font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 last:border-r-0 min-w-[240px]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/papers/${p.document_id}`}
                      className="text-brand-700 dark:text-brand-300 hover:text-brand-800 dark:hover:text-brand-200 font-semibold hover:underline line-clamp-2"
                    >
                      {p.title}
                    </Link>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                      {p.authors ? `${p.authors.split(',')[0]} et al.` : 'Authors N/A'}
                      {p.year ? ` • ${p.year}` : ''}
                    </div>
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {comparisonTable.map((row, idx) => (
            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="p-4 font-medium text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/40 border-r border-slate-200 dark:border-slate-800">
                {row.aspect}
              </td>
              {papers.map((p) => (
                <td
                  key={p.document_id}
                  className="p-4 text-xs text-slate-800 dark:text-slate-300 leading-relaxed border-r border-slate-100 dark:border-slate-800/60 last:border-r-0 align-top"
                >
                  <div className="whitespace-pre-line">
                    {row.values[p.document_id] || (
                      <span className="text-slate-400 dark:text-slate-500 italic">Not extracted</span>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

