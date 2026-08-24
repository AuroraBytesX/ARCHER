import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  Cpu,
  Layers,
  UploadCloud,
  MessageSquare,
  GitCompare,
  Sparkles,
  ArrowRight,
  Clock,
  ChevronRight,
  RefreshCw,
  Search
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentItem, ConversationItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { formatTimeAgo } from '../lib/utils';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [collectionsCount, setCollectionsCount] = useState(0);
  const [totalPapersCount, setTotalPapersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dashSearch, setDashSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docsSettled, convsSettled, colsSettled] = await Promise.allSettled([
        api.getDocuments({ limit: 10 }),
        api.getConversations(),
        api.getCollections(),
      ]);

      if (docsSettled.status === 'fulfilled') {
        setDocuments(docsSettled.value.items || []);
        setTotalPapersCount(docsSettled.value.total || 0);
      }
      if (convsSettled.status === 'fulfilled') {
        setConversations(convsSettled.value || []);
      }
      if (colsSettled.status === 'fulfilled') {
        setCollectionsCount(colsSettled.value.length || 0);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const readyPapers = documents.filter((d) => d.status === 'READY').length;
  const processingPapers = documents.filter(
    (d) => d.status === 'PROCESSING' || d.status === 'INDEXING' || d.status === 'UPLOADED'
  ).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dashSearch.trim()) {
      navigate(`/papers?search=${encodeURIComponent(dashSearch.trim())}`);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Research Command Cockpit</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Real-time multi-document intelligence telemetry and grounded AI query dispatch.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors shadow-xs"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-400 text-slate-950 shadow-md shadow-brand-500/20 transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Ingest PDFs</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row (5 distinct metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Total Papers */}
        <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 space-y-2 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Total Papers</span>
            <FileText className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalPapersCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">In research library</div>
        </div>

        {/* Metric 2: Ready Papers */}
        <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 space-y-2 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Ready Papers</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{readyPapers}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Vector indexed</div>
        </div>

        {/* Metric 3: Active Ingestion */}
        <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 space-y-2 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Active Ingestion</span>
            <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{processingPapers}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Chunking & embedding</div>
        </div>

        {/* Metric 4: Recent Queries */}
        <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 space-y-2 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Recent Queries</span>
            <Clock className="w-4 h-4 text-emerald-600 dark:text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-cyan-400">{conversations.length}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Research sessions</div>
        </div>

        {/* Metric 5: Collections */}
        <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 space-y-2 shadow-xs transition-colors col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Collections</span>
            <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{collectionsCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {collectionsCount > 0 ? 'Topic groups' : 'No collections created yet'}
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/chat"
          className="group rounded-2xl bg-gradient-to-br from-emerald-50 dark:from-brand-950/40 to-white dark:to-slate-900/80 border border-emerald-200 dark:border-brand-500/20 p-5 hover:border-brand-500/50 shadow-xs transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Cross-Paper Assistant</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Query across your library with verifiable citations and source excerpts.
          </p>
        </Link>

        <Link
          to="/compare"
          className="group rounded-2xl bg-gradient-to-br from-cyan-50 dark:from-cyan-950/40 to-white dark:to-slate-900/80 border border-cyan-200 dark:border-cyan-500/20 p-5 hover:border-cyan-500/50 shadow-xs transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <GitCompare className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-cyan-600 dark:text-cyan-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Compare Methodologies</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Generate 8-point comparative matrices across selected research papers.
          </p>
        </Link>

        <Link
          to="/insights"
          className="group rounded-2xl bg-gradient-to-br from-purple-50 dark:from-purple-950/40 to-white dark:to-slate-900/80 border border-purple-200 dark:border-purple-500/20 p-5 hover:border-purple-500/50 shadow-xs transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Multi-Paper Summarization</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Synthesize multi-document executive summaries, shared problem analyses, and key takeaways.
          </p>
        </Link>
      </div>

      {/* Main Grid: Recent Papers & Recent Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Papers (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>Recent Research Papers</span>
            </h2>

            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search paper library..."
                value={dashSearch}
                onChange={(e) => setDashSearch(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-brand-500"
              />
            </form>
          </div>

          {documents.length === 0 && !loading ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3 shadow-xs">
              <UploadCloud className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No papers uploaded yet</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Upload your first PDF to start building your research library and enable grounded search.
              </p>
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 text-slate-950 hover:bg-brand-400 transition-colors"
              >
                Upload First Paper
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden shadow-xs">
              {documents.slice(0, 6).map((doc) => (
                <div key={doc.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <Link
                      to={`/papers/${doc.id}`}
                      className="text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-300 transition-colors truncate block"
                    >
                      {doc.title}
                    </Link>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {doc.authors && <span>{doc.authors}</span>}
                      {doc.year && <span>• {doc.year}</span>}
                      <span>• {doc.page_count} pages</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={doc.status} />
                    <Link
                      to={`/papers/${doc.id}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Inquiries (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-cyan-400" />
              <span>Recent Inquiries</span>
            </h2>
            <Link to="/chat" className="text-xs font-medium text-emerald-600 dark:text-cyan-400 hover:underline">
              New Chat &rarr;
            </Link>
          </div>

          {conversations.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2 shadow-xs">
              <MessageSquare className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
              <p>Ask a question about your uploaded papers to start a research session.</p>
              <Link to="/chat" className="text-brand-600 dark:text-brand-400 hover:underline block text-[11px]">
                Start your first question
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden shadow-xs">
              {conversations.slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  to={`/chat?conversation_id=${c.id}`}
                  className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors flex items-center justify-between block group"
                >
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-cyan-300 transition-colors truncate">
                      {c.title}
                    </h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {formatTimeAgo(c.created_at)} • {c.messages?.length || 0} messages
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
