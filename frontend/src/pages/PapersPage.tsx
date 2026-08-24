import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Trash2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  RefreshCw,
  CheckSquare,
  Square,
  Sparkles,
  GitCompare
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentItem, CollectionItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../lib/utils';

export const PapersPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  useEffect(() => {
    loadCollections();
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [page, statusFilter, collectionFilter, yearFilter]);

  const loadCollections = async () => {
    try {
      const cols = await api.getCollections();
      setCollections(cols);
    } catch (e) {
      console.error(e);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.getDocuments({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        collection_id: collectionFilter || undefined,
        year: yearFilter ? parseInt(yearFilter, 10) : undefined,
        page,
        limit,
      });
      setDocuments(res.items || []);
      setTotal(res.total || 0);
      setSelectedDocIds([]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadDocuments();
  };

  const handleToggleSelect = (id: string) => {
    if (selectedDocIds.includes(id)) {
      setSelectedDocIds(selectedDocIds.filter((d) => d !== id));
    } else {
      setSelectedDocIds([...selectedDocIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedDocIds.length === documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map((d) => d.id));
    }
  };

  const handleDeleteSingle = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await api.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setSelectedDocIds((prev) => prev.filter((d) => d !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedDocIds.length} selected papers? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      await api.bulkDeleteDocuments(selectedDocIds);
      setDocuments((prev) => prev.filter((d) => !selectedDocIds.includes(d.id)));
      setTotal((prev) => Math.max(0, prev - selectedDocIds.length));
      setSelectedDocIds([]);
    } catch (err: any) {
      alert(`Bulk delete failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Research Paper Library</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Indexed corpus metadata, structured summaries, and citation anchors.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDocuments}
            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors shadow-xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-400 text-slate-950 shadow-md shadow-brand-500/20"
          >
            <FileText className="w-4 h-4" />
            <span>Upload New Paper</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs transition-colors">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, author, abstract, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium text-[11px]">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </span>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-300 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="READY">Ready and Indexed</option>
            <option value="INDEXING">Generating Vectors</option>
            <option value="PROCESSING">Extracting</option>
            <option value="FAILED">Failed</option>
          </select>

          <select
            value={collectionFilter}
            onChange={(e) => {
              setCollectionFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-300 focus:outline-none"
          >
            <option value="">All Collections</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Year (e.g. 2023)"
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-300 w-28 focus:outline-none"
          />

          {(searchTerm || statusFilter || collectionFilter || yearFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setCollectionFilter('');
                setYearFilter('');
                setPage(1);
              }}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium ml-auto"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {documents.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {selectedDocIds.length === documents.length ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5" />
                  <span>Select All ({documents.length})</span>
                </>
              )}
            </button>
            <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              {selectedDocIds.length} Selected
            </span>
          </div>

          {selectedDocIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/insights')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/30 hover:bg-brand-500/20 font-semibold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Summarize Selected ({selectedDocIds.length})</span>
              </button>

              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 font-semibold transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedDocIds.length})</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Document Table / Cards */}
      {documents.length === 0 && !loading ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3 shadow-xs">
          <FileText className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-300">No documents found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Try adjusting your search criteria or upload research papers into your library.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const isSelected = selectedDocIds.includes(doc.id);
            return (
              <div
                key={doc.id}
                className={`rounded-2xl bg-white dark:bg-slate-900 border p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-950/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Select Checkbox */}
                  <button
                    onClick={() => handleToggleSelect(doc.id)}
                    className="mt-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 shrink-0"
                    title={isSelected ? 'Deselect Paper' : 'Select Paper'}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <StatusBadge status={doc.status} />
                      {doc.year && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {doc.year}
                        </span>
                      )}
                      {doc.doi && (
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-cyan-400 truncate max-w-[200px]">
                          DOI: {doc.doi}
                        </span>
                      )}
                    </div>

                    <Link
                      to={`/papers/${doc.id}`}
                      className="text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors block leading-snug"
                    >
                      {doc.title}
                    </Link>

                    {doc.authors && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate">{doc.authors}</span>
                      </div>
                    )}

                    {doc.abstract && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {doc.abstract}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-1">
                      <span>{doc.page_count} Pages</span>
                      <span className="truncate max-w-[200px] sm:max-w-xs md:max-w-md inline-block align-bottom" title={doc.filename}>
                        • Filename: {doc.filename}
                      </span>
                      <span>• Ingested: {formatDate(doc.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 md:flex-col md:items-end">
                  <Link
                    to={`/papers/${doc.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                    <span>View Details</span>
                  </Link>

                  <Link
                    to={`/chat?document_id=${doc.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500/10 hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-500/30 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ask AI</span>
                  </Link>

                  <button
                    onClick={() => handleDeleteSingle(doc.id, doc.title)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    title="Delete Paper"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <div>
            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} papers
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
