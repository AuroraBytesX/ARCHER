import React from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, Code, Database, Cpu, ShieldCheck, Terminal } from 'lucide-react';

interface DocModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocModal: React.FC<DocModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 space-y-6 z-10 max-h-[85vh] overflow-y-auto transition-colors">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                ARCHER System Documentation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Core architecture, local deployment, API endpoints, and vector search
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

        <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {/* Section 1: Architecture */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>1. Grounded RAG & Vector Engine</span>
            </h4>
            <p>
              ARCHER breaks PDF documents into structured sections and sliding-window chunks (800 chars, 120 overlap). Each chunk is embedded into a 384-dimensional vector using <code>sentence-transformers/all-MiniLM-L6-v2</code> and indexed in PostgreSQL via <code>pgvector</code>.
            </p>
          </div>

          {/* Section 2: REST Endpoints */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-600 dark:text-cyan-400" />
              <span>2. Core REST API Endpoints</span>
            </h4>
            <ul className="space-y-1 font-mono text-[11px]">
              <li><code>GET  /api/health</code>: Active health & model readiness status</li>
              <li><code>POST /api/documents/upload</code>: Multi-PDF ingestion</li>
              <li><code>POST /api/documents/upload-zip</code>: Secure ZIP archive extraction</li>
              <li><code>POST /api/documents/bulk-delete</code>: Bulk deletion of selected papers</li>
              <li><code>GET  /api/documents/:id/file</code>: Secure in-app PDF document stream</li>
              <li><code>POST /api/chat</code>: Grounded RAG research question answering</li>
              <li><code>POST /api/compare</code>: 8-point multi-paper comparison matrix</li>
              <li><code>POST /api/insights/summarize</code>: Multi-document executive comparative synthesis</li>
            </ul>
          </div>

          {/* Section 3: Privacy & Security */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>3. Local-First Privacy & Zero Telemetry</span>
            </h4>
            <p>
              All embeddings and LLM generations run locally using SentenceTransformers and Ollama. Research papers and preprints are never sent to third-party clouds unless you configure an external OpenAI API key.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-semibold shadow-md shadow-brand-500/20 transition-all"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
