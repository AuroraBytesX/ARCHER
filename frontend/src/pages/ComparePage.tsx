import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  Layers,
  Sparkles,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentItem, CompareResponse } from '../types';
import { ComparisonTable } from '../components/ComparisonTable';

export const ComparePage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingDocs, setFetchingDocs] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setFetchingDocs(true);
      const res = await api.getDocuments({ limit: 50 });
      setDocuments(res.items || []);
      // Auto-select first 2 if available
      if (res.items.length >= 2) {
        setSelectedDocIds([res.items[0].id, res.items[1].id]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingDocs(false);
    }
  };

  const handleRunComparison = async () => {
    if (selectedDocIds.length < 2) {
      alert('Please select at least 2 papers to compare.');
      return;
    }
    try {
      setLoading(true);
      const data = await api.comparePapers(selectedDocIds);
      setCompareResult(data);
    } catch (err: any) {
      alert(`Comparison failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectDoc = (id: string) => {
    if (selectedDocIds.includes(id)) {
      setSelectedDocIds(selectedDocIds.filter((d) => d !== id));
    } else {
      if (selectedDocIds.length >= 5) {
        alert('You can compare up to 5 papers simultaneously.');
        return;
      }
      setSelectedDocIds([...selectedDocIds, id]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Multi-Paper Methodology Comparison</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Select 2 to 5 research papers to generate side-by-side matrices across architecture, benchmarks, empirical results, and limitations.
        </p>
      </div>

      {/* Paper Selection Cockpit */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-200">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-cyan-400" />
            <span>Select Papers to Compare ({selectedDocIds.length}/5 Selected)</span>
          </div>
          <button
            onClick={handleRunComparison}
            disabled={selectedDocIds.length < 2 || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-400 text-slate-950 disabled:opacity-50 transition-all shadow-md shadow-brand-500/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />}
            <span>Generate Comparison Matrix</span>
          </button>
        </div>

        {fetchingDocs ? (
          <div className="text-xs text-slate-500 dark:text-slate-400 py-4 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-brand-600 dark:text-cyan-400" />
            <span>Loading paper library...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
            No papers available. Please upload at least 2 research papers first.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {documents.map((doc) => {
              const isSelected = selectedDocIds.includes(doc.id);
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleSelectDoc(doc.id)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-cyan-950/30 border-emerald-500 dark:border-cyan-500/50 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-200 truncate">{doc.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {doc.authors || 'Authors N/A'} {doc.year ? `• ${doc.year}` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {compareResult && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
          {/* Executive Synthesis High Contrast Dark Mode Card */}
          {compareResult.synthesis_summary && (
            <div className="rounded-3xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 space-y-3 shadow-xs transition-colors">
              <div className="flex items-center gap-2 text-brand-700 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Executive Comparative Synthesis</span>
              </div>
              <p className="text-xs md:text-sm text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-line font-normal">
                {compareResult.synthesis_summary}
              </p>
            </div>
          )}

          {/* Table */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-emerald-600 dark:text-cyan-400" />
              <span>Comparative Dimensions Matrix</span>
            </h3>
            <ComparisonTable
              papers={compareResult.papers}
              comparisonTable={compareResult.comparison_table}
            />
          </div>
        </div>
      )}
    </div>
  );
};
