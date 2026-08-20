import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Send,
  Bot,
  User,
  Sparkles,
  BookOpen,
  Loader2,
  Plus,
  Trash2,
  Layers,
  FileText,
  ExternalLink,
  History,
  X,
  Menu
} from 'lucide-react';
import { api } from '../services/api';
import { ConversationItem, MessageItem, CitationItem, DocumentItem, CollectionItem } from '../types';
import { CitationBadge } from '../components/CitationBadge';
import { useUser } from '../context/UserContext';

export const ChatPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { decrementRateLimit } = useUser();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(
    searchParams.get('conversation_id') || undefined
  );
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSources, setActiveSources] = useState<CitationItem[]>([]);
  const [showSourcesPanel, setShowSourcesPanel] = useState(true);

  // Mobile Modals
  const [showMobileInquiries, setShowMobileInquiries] = useState(false);
  const [showMobileSources, setShowMobileSources] = useState(false);

  // Scope Filtering
  const [scopeMode, setScopeMode] = useState<'all' | 'collection' | 'papers'>('all');
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(
    searchParams.get('document_id') ? [searchParams.get('document_id')!] : []
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    loadScopeMetadata();
    if (searchParams.get('document_id')) {
      setScopeMode('papers');
      setSelectedDocIds([searchParams.get('document_id')!]);
    }
  }, []);

  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    }
  }, [currentConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadScopeMetadata = async () => {
    try {
      const [cols, docsRes] = await Promise.all([
        api.getCollections(),
        api.getDocuments({ limit: 100 }),
      ]);
      setCollections(cols);
      setDocuments(docsRes.items || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const data = await api.getConversation(convId);
      setMessages(data.messages || []);
      const lastAssistantMsg = [...(data.messages || [])]
        .reverse()
        .find((m) => m.role === 'assistant' && m.citations && m.citations.length > 0);
      if (lastAssistantMsg && lastAssistantMsg.citations) {
        setActiveSources(lastAssistantMsg.citations);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(undefined);
    setMessages([]);
    setActiveSources([]);
    setInputQuery('');
    setSearchParams({});
    setShowMobileInquiries(false);
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this research inquiry?')) return;
    try {
      await api.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (currentConversationId === convId) {
        handleNewChat();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete conversation');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputQuery.trim();
    if (!query || loading) return;

    decrementRateLimit();

    const optimisticUserMsg: MessageItem = {
      id: Math.random().toString(),
      conversation_id: currentConversationId || '',
      role: 'user',
      content: query,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await api.sendChat({
        message: query,
        conversation_id: currentConversationId,
        collection_id: scopeMode === 'collection' ? selectedCollection : undefined,
        document_ids: scopeMode === 'papers' ? selectedDocIds : undefined,
      });

      const assistantMsg: MessageItem = {
        id: res.message_id,
        conversation_id: res.conversation_id,
        role: 'assistant',
        content: res.answer,
        citations: res.citations,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (res.citations && res.citations.length > 0) {
        setActiveSources(res.citations);
      }

      if (!currentConversationId && res.conversation_id) {
        setCurrentConversationId(res.conversation_id);
        setSearchParams({ conversation_id: res.conversation_id });
        loadConversations();
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          conversation_id: currentConversationId || '',
          role: 'assistant',
          content: `Error: ${err.message || 'Failed to retrieve answer from research engine.'}`,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Common Inquiries List Element
  const renderInquiriesContent = () => (
    <div className="space-y-4">
      <button
        onClick={handleNewChat}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
      >
        <Plus className="w-4 h-4" />
        <span>New Research Inquiry</span>
      </button>

      <div className="space-y-1">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
          Recent Inquiries ({conversations.length})
        </span>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 px-2 py-3 text-center">
              No saved inquiries yet.
            </p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setCurrentConversationId(c.id);
                  setSearchParams({ conversation_id: c.id });
                  setShowMobileInquiries(false);
                }}
                className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                  currentConversationId === c.id
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold border border-slate-300 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <span className="truncate flex-1">{c.title}</span>
                <button
                  onClick={(e) => handleDeleteConversation(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-opacity ml-1"
                  title="Delete Inquiry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Scope Selector */}
      <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 p-3 space-y-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
          <Layers className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
          <span>Retrieval Scope</span>
        </div>

        <select
          value={scopeMode}
          onChange={(e: any) => setScopeMode(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
        >
          <option value="all">Entire Paper Library</option>
          <option value="collection">Specific Collection</option>
          <option value="papers">Selected Papers ({selectedDocIds.length})</option>
        </select>

        {scopeMode === 'collection' && (
          <select
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-brand-500/50 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none mt-1"
          >
            <option value="">Select Collection...</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        {scopeMode === 'papers' && (
          <div className="max-h-28 overflow-y-auto space-y-1 pt-1 border-t border-slate-200 dark:border-slate-800/80">
            {documents.map((d) => (
              <label key={d.id} className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDocIds.includes(d.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDocIds([...selectedDocIds, d.id]);
                    } else {
                      setSelectedDocIds(selectedDocIds.filter((id) => id !== d.id));
                    }
                  }}
                  className="rounded border-slate-300 dark:border-slate-700 text-brand-500"
                />
                <span className="truncate">{d.title}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-6.5rem)] flex gap-4 max-w-7xl mx-auto relative pb-2">
      {/* Desktop Left Inquiries Sidebar */}
      <div className="hidden md:flex w-72 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3.5 flex-col justify-between shrink-0 overflow-y-auto shadow-xs transition-colors">
        {renderInquiriesContent()}
      </div>

      {/* Mobile Slide-Over Inquiries Modal */}
      {showMobileInquiries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:hidden">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={() => setShowMobileInquiries(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 z-10 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>Research Inquiries</span>
              </span>
              <button onClick={() => setShowMobileInquiries(false)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderInquiriesContent()}
          </div>
        </div>
      )}

      {/* Mobile Slide-Over Sources Modal */}
      {showMobileSources && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:hidden">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={() => setShowMobileSources(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 z-10 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>Retrieved Evidence ({activeSources.length})</span>
              </span>
              <button onClick={() => setShowMobileSources(false)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {activeSources.map((cit, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-900 dark:text-slate-100">{cit.paper_title}</div>
                  <div className="text-[10px] font-mono text-emerald-700 dark:text-brand-400">
                    Page {cit.page_number} {cit.section ? `• ${cit.section}` : ''}
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 italic">
                    "{cit.quote}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Center Container */}
      <div className="flex-1 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-hidden shadow-xs transition-colors">
        {/* Chat Header */}
        <div className="p-3 px-4 md:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
            {/* Mobile Inquiries Button */}
            <button
              onClick={() => setShowMobileInquiries(true)}
              className="md:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs mr-1"
            >
              <History className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span>Inquiries</span>
            </button>

            <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
            <span className="truncate">Citation-Grounded Assistant</span>
            <span className="hidden sm:inline text-slate-400 dark:text-slate-600">•</span>
            <span className="hidden sm:inline font-normal text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-xs">
              {scopeMode === 'all'
                ? 'Full library'
                : scopeMode === 'collection'
                ? 'Filtered collection'
                : `${selectedDocIds.length} papers`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Sources Button */}
            {activeSources.length > 0 && (
              <button
                onClick={() => setShowMobileSources(true)}
                className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/30 text-xs font-semibold"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Evidence ({activeSources.length})</span>
              </button>
            )}

            {/* Desktop Sources Toggle Button */}
            <button
              onClick={() => setShowSourcesPanel(!showSourcesPanel)}
              className="hidden lg:flex text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 items-center gap-1 font-medium"
            >
              <BookOpen className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span>{showSourcesPanel ? 'Hide Evidence' : `Evidence (${activeSources.length})`}</span>
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3 py-12 text-slate-500 dark:text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Ask Anything Across Your Research Papers
              </h3>
              <p className="text-xs leading-relaxed">
                Ask specific questions about algorithms, mathematical formulations, benchmarks, or limitations in your library. Answers are strictly citation-grounded [Paper Title, p. X].
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed space-y-3 ${
                    msg.role === 'user'
                      ? 'bg-brand-500 text-slate-950 font-medium'
                      : 'bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 shadow-xs'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.content}</div>

                  {/* Citations List on Assistant Answer */}
                  {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                        <span>Grounded Citations:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((c, i) => (
                          <CitationBadge key={i} citation={c} variant="inline" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="rounded-2xl p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-center gap-2 shadow-xs">
                <Loader2 className="w-4 h-4 animate-spin text-brand-600 dark:text-brand-400" />
                <span>Retrieving vector evidence and synthesizing grounded answer...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3.5 md:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex gap-2.5 md:gap-3">
          <input
            type="text"
            placeholder="Ask a question about your uploaded research papers..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={loading}
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || loading}
            className="px-4 py-2.5 rounded-xl bg-brand-500 text-slate-950 text-xs font-semibold hover:bg-brand-400 disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Query</span>
          </button>
        </form>
      </div>

      {/* Desktop Right Evidence Drawer */}
      {showSourcesPanel && (
        <div className="w-80 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between shrink-0 overflow-y-auto space-y-4 shadow-xs transition-colors hidden lg:flex">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>Retrieved Source Evidence</span>
              </h3>
              <button
                onClick={() => setShowSourcesPanel(false)}
                className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {activeSources.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">
                Ask a question to see the exact text excerpts and page citations retrieved for your answer.
              </p>
            ) : (
              <div className="space-y-3">
                {activeSources.map((cit, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                          {cit.paper_title}
                        </h4>
                        <span className="text-[10px] font-mono text-emerald-700 dark:text-brand-400">
                          Page {cit.page_number} {cit.section ? `• ${cit.section}` : ''}
                        </span>
                      </div>
                      <Link
                        to={`/papers/${cit.document_id}`}
                        className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400"
                        title="Open Document in Viewer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 italic leading-relaxed">
                      "{cit.quote}"
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
