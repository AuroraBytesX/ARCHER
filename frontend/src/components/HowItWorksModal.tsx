import React from 'react';
import { createPortal } from 'react-dom';
import { X, HelpCircle, LayoutDashboard, UploadCloud, Library, MessageSquareText, GitCompare, Sparkles } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const steps = [
    {
      icon: LayoutDashboard,
      title: '1. Dashboard',
      description: 'Your central command cockpit. View real-time paper counts, ready vector chunks, recent queries, and quick actions.'
    },
    {
      icon: UploadCloud,
      title: '2. Upload Papers',
      description: 'Upload individual PDFs, multiple PDFs in bulk, or ZIP archives. The system automatically validates, extracts sections, creates sliding-window chunks, and generates 384-dimensional dense vector embeddings.'
    },
    {
      icon: Library,
      title: '3. Paper Library',
      description: 'Explore your ingested research corpus. Filter by title, author, year, or collection. Open structured 6-dimensional paper analyses or read the original PDF inside the integrated viewer.'
    },
    {
      icon: MessageSquareText,
      title: '4. Research Assistant',
      description: 'Ask deep technical questions across your papers. ARCHER uses hybrid vector search, retrieves supporting passages, and generates grounded answers citing specific page numbers [Paper Title, p. X].'
    },
    {
      icon: GitCompare,
      title: '5. Paper Comparison',
      description: 'Select 2 to 5 research papers to generate side-by-side matrices comparing research objectives, architectures, benchmark datasets, evaluation metrics, empirical results, and reported limitations.'
    },
    {
      icon: Sparkles,
      title: '6. Insights & Summarization',
      description: 'Analyze publication timelines and methodology paradigms. Select multiple papers to generate an integrated executive comparative summary and download markdown reports.'
    }
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 space-y-6 z-10 max-h-[85vh] overflow-y-auto transition-colors">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                How ARCHER Works
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A quick step-by-step guide for first-time researchers and users
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-brand-700 dark:text-brand-300">
                  <Icon className="w-4 h-4" />
                  <span>{s.title}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {s.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-semibold shadow-md shadow-brand-500/20 transition-all"
          >
            Got It
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
