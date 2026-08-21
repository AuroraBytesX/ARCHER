import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Loader2,
  Trash2,
  RefreshCw,
  Plus,
  Layers,
  ArrowRight,
  FolderArchive
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentItem, CollectionItem, BatchUploadResponse } from '../types';
import { Link } from 'react-router-dom';

interface UploadItem {
  id: string;
  file?: File;
  name: string;
  size: number;
  isZip?: boolean;
  status: 'PENDING' | 'UPLOADING' | 'EXTRACTING' | 'CHUNKING' | 'EMBEDDING' | 'INDEXED' | 'FAILED' | 'DUPLICATE';
  documentId?: string;
  error?: string;
  duplicateNotice?: string;
}

export const UploadPage: React.FC = () => {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [zipReport, setZipReport] = useState<BatchUploadResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const data = await api.getCollections();
      setCollections(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    try {
      const created = await api.createCollection(newCollectionName.trim());
      setCollections([created, ...collections]);
      setSelectedCollection(created.id);
      setNewCollectionName('');
      setShowNewCollection(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create collection');
    }
  };

  const handleDeleteCollection = async (colId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this workspace collection?')) return;
    try {
      await api.deleteCollection(colId);
      setCollections(collections.filter((c) => c.id !== colId));
      if (selectedCollection === colId) {
        setSelectedCollection('');
      }
    } catch (err: any) {
      alert(`Failed to delete collection: ${err.message}`);
    }
  };

  const handleFileSelection = (fileList: FileList | null) => {
    if (!fileList) return;
    const newUploads: UploadItem[] = [];
    
    Array.from(fileList).forEach((f) => {
      const lowerName = f.name.toLowerCase();
      if (lowerName.endsWith('.pdf')) {
        newUploads.push({
          id: Math.random().toString(36).substring(7),
          file: f,
          name: f.name,
          size: f.size,
          isZip: false,
          status: 'PENDING',
        });
      } else if (lowerName.endsWith('.zip')) {
        newUploads.push({
          id: Math.random().toString(36).substring(7),
          file: f,
          name: f.name,
          size: f.size,
          isZip: true,
          status: 'PENDING',
        });
      }
    });

    setItems((prev) => [...prev, ...newUploads]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelection(e.dataTransfer.files);
  };

  const handleUploadAll = async () => {
    const pendingItems = items.filter((i) => i.status === 'PENDING');
    if (pendingItems.length === 0) return;

    setIsUploading(true);

    // Process ZIP archives first
    const zipItems = pendingItems.filter((i) => i.isZip && i.file);
    const pdfItems = pendingItems.filter((i) => !i.isZip && i.file);

    // Update status to uploading
    setItems((prev) =>
      prev.map((i) => (i.status === 'PENDING' ? { ...i, status: 'UPLOADING' } : i))
    );

    // Handle ZIP files
    for (const zItem of zipItems) {
      try {
        const res: BatchUploadResponse = await api.uploadZipDocuments(zItem.file!, selectedCollection || undefined);
        setZipReport(res);
        
        // Remove zip placeholder and add unpacked items
        const unpackedItems: UploadItem[] = res.results.map((r) => ({
          id: Math.random().toString(36).substring(7),
          name: r.filename,
          size: 0,
          isZip: false,
          status: r.status === 'DUPLICATE' ? 'DUPLICATE' : r.status === 'SUCCESS' ? 'EXTRACTING' : 'FAILED',
          documentId: r.document?.id,
          error: r.status === 'FAILED' ? r.message : undefined,
          duplicateNotice: r.status === 'DUPLICATE' ? r.message : undefined,
        }));

        setItems((prev) => [
          ...prev.filter((i) => i.id !== zItem.id),
          ...unpackedItems,
        ]);
      } catch (err: any) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === zItem.id
              ? { ...i, status: 'FAILED', error: err.message || 'ZIP upload failed' }
              : i
          )
        );
      }
    }

    // Handle standard PDF files
    if (pdfItems.length > 0) {
      const filesToUpload = pdfItems.map((i) => i.file!).filter(Boolean);
      try {
        const responses = await api.uploadDocuments(filesToUpload, selectedCollection || undefined);

        setItems((prev) =>
          prev.map((item) => {
            if (item.isZip) return item;
            const matchedDoc = responses.find(
              (r) => r.filename.toLowerCase() === item.name.toLowerCase()
            );
            if (matchedDoc) {
              const isDup = matchedDoc.status === 'READY';
              return {
                ...item,
                status: isDup ? 'DUPLICATE' : 'EXTRACTING',
                documentId: matchedDoc.id,
                duplicateNotice: isDup ? `Already indexed: ${matchedDoc.title}` : undefined,
              };
            }
            return item;
          })
        );
      } catch (err: any) {
        setItems((prev) =>
          prev.map((i) =>
            i.status === 'UPLOADING' && !i.isZip
              ? { ...i, status: 'FAILED', error: err.message || 'Upload failed' }
              : i
          )
        );
      }
    }

    setIsUploading(false);
    pollProcessingStatuses();
  };

  const pollProcessingStatuses = () => {
    const interval = setInterval(async () => {
      setItems((prev) => {
        const stillActive = prev.some(
          (i) => i.status === 'EXTRACTING' || i.status === 'CHUNKING' || i.status === 'EMBEDDING'
        );
        if (!stillActive) {
          clearInterval(interval);
        }
        return prev;
      });

      try {
        const docsRes = await api.getDocuments({ limit: 50 });
        const docMap = new Map(docsRes.items.map((d) => [d.id, d]));

        setItems((prev) =>
          prev.map((item) => {
            if (!item.documentId) return item;
            const liveDoc = docMap.get(item.documentId);
            if (!liveDoc) return item;

            if (liveDoc.status === 'READY') {
              return { ...item, status: 'INDEXED' };
            } else if (liveDoc.status === 'FAILED') {
              return { ...item, status: 'FAILED', error: liveDoc.error_message || 'Indexing failed' };
            } else if (liveDoc.status === 'INDEXING') {
              return { ...item, status: 'EMBEDDING' };
            } else if (liveDoc.status === 'PROCESSING') {
              return { ...item, status: 'CHUNKING' };
            }
            return item;
          })
        );
      } catch (e) {
        console.error(e);
      }
    }, 2500);
  };

  const handleRetry = async (item: UploadItem) => {
    if (!item.documentId) return;
    try {
      await api.retryDocument(item.documentId);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'EXTRACTING', error: undefined } : i))
      );
      pollProcessingStatuses();
    } catch (e: any) {
      alert(`Retry failed: ${e.message}`);
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Document Ingestion Pipeline</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Upload individual PDFs, multiple PDFs in bulk, or ZIP archives containing research papers.
        </p>

        {/* Human-readable pipeline progression */}
        <div className="mt-4 p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-[11px] gap-2 font-medium shadow-xs">
          <span className="flex items-center gap-1.5 text-brand-700 dark:text-brand-400 font-semibold">
            <span className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center text-[10px]">1</span>
            Upload PDF
          </span>
          <span className="text-slate-400 dark:text-slate-600">&rarr;</span>
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px]">2</span>
            Validate
          </span>
          <span className="text-slate-400 dark:text-slate-600">&rarr;</span>
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px]">3</span>
            Extract Text
          </span>
          <span className="text-slate-400 dark:text-slate-600">&rarr;</span>
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px]">4</span>
            Chunk Sections
          </span>
          <span className="text-slate-400 dark:text-slate-600">&rarr;</span>
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px]">5</span>
            Embed Chunks
          </span>
          <span className="text-slate-400 dark:text-slate-600">&rarr;</span>
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px]">6</span>
            Store pgvector
          </span>
          <span className="text-slate-400 dark:text-slate-600">&rarr;</span>
          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">7</span>
            Ready for RAG
          </span>
        </div>
      </div>

      {/* Target Workspace Collection Selector */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Target Research Workspace</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Select a workspace box to assign uploaded papers, or click + New Collection to create one.
              </p>
            </div>
          </div>

          {!showNewCollection && (
            <button
              type="button"
              onClick={() => setShowNewCollection(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Collection</span>
            </button>
          )}
        </div>

        {/* Inline Create Form if active */}
        {showNewCollection && (
          <form onSubmit={handleCreateCollection} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-brand-500/50 flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
            <input
              type="text"
              placeholder="e.g. LLM Reasoning, Vision-Language Models"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className="flex-1 min-w-[200px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-500 placeholder-slate-400"
              autoFocus
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-brand-500 text-slate-950 text-xs font-bold hover:bg-brand-400 shadow-sm transition-colors"
            >
              Create Workspace
            </button>
            <button
              type="button"
              onClick={() => setShowNewCollection(false)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Clickable Workspace Boxes / Cards */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Default Workspace Box */}
          <button
            type="button"
            onClick={() => setSelectedCollection('')}
            className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              selectedCollection === ''
                ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300 border-brand-500 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${selectedCollection === '' ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
            <span>Default Workspace</span>
          </button>

          {/* User Created Collection Boxes */}
          {collections.map((col) => {
            const isSelected = selectedCollection === col.id;
            return (
              <div
                key={col.id}
                onClick={() => setSelectedCollection(col.id)}
                className={`group relative flex items-center gap-2 pl-3.5 pr-2 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300 border-brand-500 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                <span className="max-w-[140px] truncate">{col.name}</span>
                
                {/* Delete collection button */}
                <button
                  type="button"
                  onClick={(e) => handleDeleteCollection(col.id, e)}
                  title="Delete this workspace collection"
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
            : 'border-slate-300 dark:border-slate-800 hover:border-brand-400 dark:hover:border-slate-700 bg-white dark:bg-slate-900/30'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".pdf,.zip,application/pdf,application/zip"
          className="hidden"
          onChange={(e) => handleFileSelection(e.target.files)}
        />
        <div className="max-w-md mx-auto space-y-4 pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto shadow-inner">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Drag & Drop Research Papers (PDFs or ZIP)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supports single PDF, multiple PDFs, or ZIP archives containing PDFs. SHA-256 duplicate verification enabled.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              Browse PDF / ZIP Files
            </button>
          </div>
        </div>
      </div>

      {/* ZIP Upload Summary Report */}
      {zipReport && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold text-emerald-800 dark:text-emerald-300">
            <span className="flex items-center gap-2">
              <FolderArchive className="w-4 h-4" />
              ZIP Extraction Summary
            </span>
            <span>Total Found: {zipReport.total_files}</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-emerald-700 dark:text-emerald-400">
            <span>Queued: {zipReport.successful_count}</span>
            <span>Duplicates: {zipReport.duplicate_count}</span>
            <span>Failed: {zipReport.failed_count}</span>
          </div>
        </div>
      )}

      {/* File Upload Pipeline Queue */}
      {items.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>Ingestion Queue ({items.length} files)</span>
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setItems([]);
                  setZipReport(null);
                }}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
              >
                Clear All
              </button>
              {items.some((i) => i.status === 'PENDING') && (
                <button
                  onClick={handleUploadAll}
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 text-slate-950 hover:bg-brand-400 disabled:opacity-50 shadow-md shadow-brand-500/20 transition-all"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  <span>Start Ingestion Pipeline</span>
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden shadow-sm">
            {items.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                    {item.isZip ? <FolderArchive className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate">{item.name}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.size > 0 && <span>{(item.size / 1024 / 1024).toFixed(2)} MB</span>}
                      {item.duplicateNotice && (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">• {item.duplicateNotice}</span>
                      )}
                      {item.error && <span className="text-rose-600 dark:text-rose-400 font-medium">• {item.error}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Processing States */}
                  {item.status === 'PENDING' && (
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      Ready to Upload
                    </span>
                  )}
                  {item.status === 'UPLOADING' && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Uploading
                    </span>
                  )}
                  {item.status === 'EXTRACTING' && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-purple-600 dark:text-purple-400 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Extracting & Sections
                    </span>
                  )}
                  {item.status === 'CHUNKING' && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 animate-pulse">
                      <Cpu className="w-3 h-3 animate-spin" />
                      Token Chunking
                    </span>
                  )}
                  {item.status === 'EMBEDDING' && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 animate-pulse">
                      <Cpu className="w-3 h-3 animate-spin" />
                      Vector Embedding
                    </span>
                  )}
                  {item.status === 'INDEXED' && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Indexed & Ready
                    </span>
                  )}
                  {item.status === 'DUPLICATE' && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Already Exists
                    </span>
                  )}
                  {item.status === 'FAILED' && (
                    <button
                      onClick={() => handleRetry(item)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 transition-colors"
                      title="Retry processing"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                  )}

                  {item.documentId && item.status === 'INDEXED' && (
                    <Link
                      to={`/papers/${item.documentId}`}
                      className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                      title="Open Paper"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}

                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
