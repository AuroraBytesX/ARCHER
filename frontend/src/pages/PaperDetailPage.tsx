import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  MessageSquare,
  Sparkles,
  Calendar,
  User,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Cpu,
  Target,
  Database,
  ArrowLeft,
  ExternalLink,
  BookOpen,
  Download
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentItem, PaperSummary } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const PaperDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [summary, setSummary] = useState<PaperSummary | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<'structured' | 'abstract' | 'executive' | 'pdf'>('structured');

  useEffect(() => {
    if (id) {
      loadDocumentDetails(id);
      loadSummary(id);
    }
  }, [id]);

  const loadDocumentDetails = async (docId: string) => {
    try {
      setLoadingDoc(true);
      const data = await api.getDocument(docId);
      setDoc(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDoc(false);
    }
  };

  const loadSummary = async (docId: string) => {
    try {
      setLoadingSummary(true);
      const data = await api.getSummary(docId);
      setSummary(data);
    } catch (e) {
      // Summary might not exist yet
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleGenerateSummary = async (force = false) => {
    if (!id) return;
    try {
      setLoadingSummary(true);
      const data = await api.generateSummary(id, force);
      setSummary(data);
    } catch (err: any) {
      alert(`Summary generation error: ${err.message}`);
    } finally {
      setLoadingSummary(false);
    }
  };

  if (loadingDoc) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Document not found</h2>
        <Link to="/papers" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
          Back to paper library
        </Link>
      </div>
    );
  }

  const pdfUrl = api.getDocumentFileUrl(doc.id);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        to="/papers"
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Paper Library</span>
      </Link>

      {/* Header Profile Card */}
      <div className="rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-4 shadow-sm transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <StatusBadge status={doc.status} />
            {doc.year && (
              <span className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5" />
                {doc.year}
              </span>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {doc.page_count} Pages • {doc.chunks_count || 0} Vector Chunks
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('pdf')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors shadow-xs"
            >
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-cyan-400" />
              <span>Read Original PDF</span>
            </button>
            <Link
              to={`/chat?document_id=${doc.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-400 text-slate-950 shadow-md shadow-brand-500/20 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Ask About This Paper</span>
            </Link>
          </div>
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
          {doc.title}
        </h1>

        {doc.authors && (
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <User className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <span>{doc.authors}</span>
          </div>
        )}

        {doc.doi && (
          <div className="text-xs font-mono text-emerald-700 dark:text-cyan-400">
            DOI: {doc.doi}
          </div>
        )}
      </div>

      {/* Structured Summary vs Abstract vs PDF Tabs */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('structured')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'structured'
                  ? 'bg-brand-500/10 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Structured Analysis
            </button>
            <button
              onClick={() => setActiveTab('executive')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'executive'
                  ? 'bg-brand-500/10 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Executive Summary
            </button>
            <button
              onClick={() => setActiveTab('abstract')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'abstract'
                  ? 'bg-brand-500/10 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Original Abstract
            </button>
            <button
              onClick={() => setActiveTab('pdf')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'pdf'
                  ? 'bg-emerald-50 dark:bg-cyan-500/15 text-emerald-700 dark:text-cyan-300 border border-emerald-500/30 dark:border-cyan-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Original PDF Document</span>
            </button>
          </div>

          {activeTab !== 'pdf' && (
            <button
              onClick={() => handleGenerateSummary(true)}
              disabled={loadingSummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSummary ? 'animate-spin' : ''}`} />
              <span>{summary ? 'Regenerate Analysis' : 'Generate Summary'}</span>
            </button>
          )}
        </div>

        {/* Tab Contents */}
        {activeTab === 'pdf' && (
          <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-cyan-400" />
                <span>Reading: {doc.filename} ({doc.page_count} Pages)</span>
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in New Tab</span>
                </a>
                <a
                  href={pdfUrl}
                  download={doc.filename}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 font-semibold transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>
              </div>
            </div>

            {/* Embedded PDF Viewer Frame */}
            <div className="w-full h-[750px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
              <iframe
                src={pdfUrl}
                title={doc.title}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        )}

        {activeTab === 'abstract' && (
          <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 space-y-3 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>Extracted Abstract</span>
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {doc.abstract || 'No abstract text was automatically extracted from this PDF.'}
            </p>
          </div>
        )}

        {activeTab === 'executive' && (
          <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 space-y-3 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>150-250 Word Executive Summary</span>
            </h3>
            {summary ? (
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
                {summary.summary}
              </p>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <p>No summary generated yet.</p>
                <button
                  onClick={() => handleGenerateSummary(false)}
                  className="text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Generate Executive Summary
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'structured' && (
          <div className="space-y-4">
            {!summary && !loadingSummary ? (
              <div className="rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3 shadow-sm">
                <Sparkles className="w-8 h-8 text-brand-600 dark:text-brand-400 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Ready to Extract Structured Research Dimensions
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Automatically extracts Research Objective, Methodology, Datasets, Key Findings, Limitations, and Future Work.
                </p>
                <button
                  onClick={() => handleGenerateSummary(false)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 text-slate-950 hover:bg-brand-400 transition-colors"
                >
                  Generate Structured Extraction
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Objective */}
                <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-5 space-y-2 shadow-sm">
                  <div className="flex items-center gap-2 text-brand-700 dark:text-brand-400 font-semibold text-xs uppercase tracking-wider">
                    <Target className="w-4 h-4" />
                    <span>Research Objective</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {summary?.objective || 'Extraction in progress...'}
                  </p>
                </div>

                {/* Methodology */}
                <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-5 space-y-2 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-cyan-400 font-semibold text-xs uppercase tracking-wider">
                    <Cpu className="w-4 h-4" />
                    <span>Methodology and Architecture</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {summary?.methodology || 'Extraction in progress...'}
                  </p>
                </div>

                {/* Datasets */}
                <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-5 space-y-2 shadow-sm">
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-semibold text-xs uppercase tracking-wider">
                    <Database className="w-4 h-4" />
                    <span>Datasets and Corpus</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {summary?.datasets || 'Extraction in progress...'}
                  </p>
                </div>

                {/* Findings */}
                <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-5 space-y-2 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Key Empirical Findings</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {summary?.findings || 'Extraction in progress...'}
                  </p>
                </div>

                {/* Limitations */}
                <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-5 space-y-2 shadow-sm">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-semibold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Reported Limitations</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {summary?.limitations || 'Extraction in progress...'}
                  </p>
                </div>

                {/* Future Work */}
                <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-5 space-y-2 shadow-sm">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-xs uppercase tracking-wider">
                    <Lightbulb className="w-4 h-4" />
                    <span>Future Work and Extensions</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {summary?.future_work || 'Extraction in progress...'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
