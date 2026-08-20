import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Search,
  GitCompare,
  Sparkles,
  ShieldCheck,
  Cpu,
  FileText
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-20">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-8 pb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-400 border border-brand-500/20 text-xs font-mono font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ARCHER Research Intelligence Platform</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
          Research Intelligence, <br className="hidden md:block" />
          <span className="bg-gradient-to-r from-brand-600 via-emerald-500 to-teal-500 dark:from-brand-400 dark:via-emerald-300 dark:to-cyan-400 bg-clip-text text-transparent">
            Citation-Grounded and Verifiable.
          </span>
        </h1>

        <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Search, summarize, compare, and question research papers with grounded AI retrieval.
          Every answer is anchored in exact page-level evidence.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-brand-500 hover:bg-brand-400 text-slate-950 shadow-lg shadow-brand-500/25 transition-all transform hover:-translate-y-0.5 text-sm"
          >
            <span>Start Research</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition-colors text-sm shadow-sm"
          >
            <span>Upload Library</span>
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Multi-Document Research Intelligence
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Built for scientific literature, arXiv preprints, technical whitepapers, and clinical reports.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 space-y-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Hybrid Search Engine</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Combines dense vector cosine similarity via pgvector with token keyword retrieval for accurate recall.
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 space-y-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-cyan-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Citation-Grounded RAG</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Strict context grounding enforces verifiable citations (<code className="text-emerald-700 dark:text-cyan-300 font-mono text-[11px]">[Title, p. X]</code>) linked directly to exact page excerpts.
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 space-y-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Structured Paper Extraction</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Automated extraction of Research Objective, Methodology, Datasets, Key Findings, Limitations, and Executive Summaries.
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 space-y-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <GitCompare className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Multi-Paper Comparison</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Compare 2 to 5 papers side by side across architecture, evaluation metrics, empirical results, and limitations.
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 space-y-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Multi-Document Summarization</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Synthesizes multi-paper comparative executive summaries, shared methodological takeaways, and joint empirical findings.
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 space-y-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Large-Scale Document Ingestion</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Asynchronous chunking, batched vector embeddings, SHA-256 duplicate checking, and independent background workers.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="rounded-3xl bg-slate-100 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 p-8 space-y-6 shadow-sm transition-colors">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 text-center">
          How ARCHER Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2 shadow-sm">
            <span className="text-xs font-mono text-brand-600 dark:text-brand-400 font-bold">STEP 01</span>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ingest and Section Detect</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              PyMuPDF cleans text and tracks exact page and section boundaries without memory bloat.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2 shadow-sm">
            <span className="text-xs font-mono text-brand-600 dark:text-brand-400 font-bold">STEP 02</span>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Recursive Vector Index</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Sentence Transformers generate batched dense embeddings stored in PostgreSQL pgvector.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2 shadow-sm">
            <span className="text-xs font-mono text-brand-600 dark:text-brand-400 font-bold">STEP 03</span>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Hybrid Top-K Retrieval</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Reranks chunks combining semantic similarity and keyword matches across filtered paper subsets.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2 shadow-sm">
            <span className="text-xs font-mono text-brand-600 dark:text-brand-400 font-bold">STEP 04</span>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Grounded Citation Output</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Local Ollama LLM builds verifiable responses with interactive page-level citations.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
