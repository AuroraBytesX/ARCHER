import {
  DocumentItem,
  DocumentListResponse,
  CollectionItem,
  SearchResponse,
  ChatResponse,
  ConversationItem,
  PaperSummary,
  CompareResponse,
  InsightsResponse,
  ResearchGapItem,
  MultiPaperSummarizeResponse,
} from '../types';

const BASE_URL = ((import.meta as any).env && (import.meta as any).env.VITE_API_URL) || '/api';

function getHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  const email = localStorage.getItem('archer_email');
  if (email) {
    headers['X-User-Email'] = email;
    headers['Authorization'] = `Bearer ${email}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = 'API Request Failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export const api = {
  // Health
  async getHealth(): Promise<any> {
    const res = await fetch(`${BASE_URL}/health`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Documents
  async uploadDocuments(files: File[], collectionId?: string): Promise<DocumentItem[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (collectionId) {
      formData.append('collection_id', collectionId);
    }
    const res = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });
    return handleResponse<DocumentItem[]>(res);
  },

  async uploadZipDocuments(file: File, collectionId?: string): Promise<{ total_files: number; successful_count: number; duplicate_count: number; failed_count: number; results: any[] }> {
    const formData = new FormData();
    formData.append('file', file);
    if (collectionId) {
      formData.append('collection_id', collectionId);
    }
    const res = await fetch(`${BASE_URL}/documents/upload-zip`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });
    return handleResponse<{ total_files: number; successful_count: number; duplicate_count: number; failed_count: number; results: any[] }>(res);
  },

  async getDocuments(params?: {
    search?: string;
    status?: string;
    collection_id?: string;
    year?: number;
    page?: number;
    limit?: number;
  }): Promise<DocumentListResponse> {
    const url = new URL(`${window.location.origin}${BASE_URL}/documents`);
    if (params?.search) url.searchParams.append('search', params.search);
    if (params?.status) url.searchParams.append('status', params.status);
    if (params?.collection_id) url.searchParams.append('collection_id', params.collection_id);
    if (params?.year) url.searchParams.append('year', params.year.toString());
    if (params?.page) url.searchParams.append('page', params.page.toString());
    if (params?.limit) url.searchParams.append('limit', params.limit.toString());

    const res = await fetch(url.toString().replace(window.location.origin, ''), {
      headers: getHeaders(),
    });
    return handleResponse<DocumentListResponse>(res);
  },

  async getDocument(id: string): Promise<DocumentItem> {
    const res = await fetch(`${BASE_URL}/documents/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse<DocumentItem>(res);
  },

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/documents/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(res);
  },

  async bulkDeleteDocuments(document_ids: string[]): Promise<{ message: string; deleted_count: number }> {
    const res = await fetch(`${BASE_URL}/documents/bulk-delete`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ document_ids }),
    });
    return handleResponse<{ message: string; deleted_count: number }>(res);
  },

  async retryDocument(id: string): Promise<DocumentItem> {
    const res = await fetch(`${BASE_URL}/documents/${id}/retry`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<DocumentItem>(res);
  },

  // Collections
  async getCollections(): Promise<CollectionItem[]> {
    const res = await fetch(`${BASE_URL}/collections`, {
      headers: getHeaders(),
    });
    return handleResponse<CollectionItem[]>(res);
  },

  async createCollection(name: string): Promise<CollectionItem> {
    const res = await fetch(`${BASE_URL}/collections`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name }),
    });
    return handleResponse<CollectionItem>(res);
  },

  // Search
  async search(params: {
    q: string;
    mode?: 'hybrid' | 'vector' | 'keyword';
    collection_id?: string;
    document_ids?: string[];
    year_min?: number;
    year_max?: number;
    page?: number;
    limit?: number;
  }): Promise<SearchResponse> {
    const url = new URL(`${window.location.origin}${BASE_URL}/search`);
    url.searchParams.append('q', params.q);
    if (params.mode) url.searchParams.append('mode', params.mode);
    if (params.collection_id) url.searchParams.append('collection_id', params.collection_id);
    if (params.document_ids && params.document_ids.length > 0) {
      url.searchParams.append('document_ids', params.document_ids.join(','));
    }
    if (params.year_min) url.searchParams.append('year_min', params.year_min.toString());
    if (params.year_max) url.searchParams.append('year_max', params.year_max.toString());
    if (params.page) url.searchParams.append('page', params.page.toString());
    if (params.limit) url.searchParams.append('limit', params.limit.toString());

    const res = await fetch(url.toString().replace(window.location.origin, ''), {
      headers: getHeaders(),
    });
    return handleResponse<SearchResponse>(res);
  },

  // Chat & RAG
  async sendChat(payload: {
    message: string;
    conversation_id?: string;
    collection_id?: string;
    document_ids?: string[];
    top_k?: number;
    temperature?: number;
  }): Promise<ChatResponse> {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    return handleResponse<ChatResponse>(res);
  },

  async getConversations(): Promise<ConversationItem[]> {
    const res = await fetch(`${BASE_URL}/conversations`, {
      headers: getHeaders(),
    });
    return handleResponse<ConversationItem[]>(res);
  },

  async getConversation(id: string): Promise<ConversationItem> {
    const res = await fetch(`${BASE_URL}/conversations/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse<ConversationItem>(res);
  },

  async deleteConversation(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/conversations/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(res);
  },

  // Summaries
  async getDocumentSummary(documentId: string): Promise<PaperSummary> {
    const res = await fetch(`${BASE_URL}/documents/${documentId}/summary`, {
      headers: getHeaders(),
    });
    return handleResponse<PaperSummary>(res);
  },

  async getSummary(documentId: string): Promise<PaperSummary> {
    return this.getDocumentSummary(documentId);
  },

  async generateDocumentSummary(documentId: string, force?: boolean): Promise<PaperSummary> {
    const url = `${BASE_URL}/documents/${documentId}/summary${force ? '?force=true' : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<PaperSummary>(res);
  },

  async generateSummary(documentId: string, force?: boolean): Promise<PaperSummary> {
    return this.generateDocumentSummary(documentId, force);
  },

  getDocumentFileUrl(documentId: string): string {
    return `${BASE_URL}/documents/${documentId}/file`;
  },

  // Compare
  async comparePapers(document_ids: string[]): Promise<CompareResponse> {
    const res = await fetch(`${BASE_URL}/compare`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ document_ids }),
    });
    return handleResponse<CompareResponse>(res);
  },

  // Insights
  async getInsights(collection_id?: string): Promise<InsightsResponse> {
    const url = new URL(`${window.location.origin}${BASE_URL}/insights`);
    if (collection_id) url.searchParams.append('collection_id', collection_id);
    const res = await fetch(url.toString().replace(window.location.origin, ''), {
      headers: getHeaders(),
    });
    return handleResponse<InsightsResponse>(res);
  },

  async getResearchGaps(collection_id?: string, document_ids?: string[]): Promise<ResearchGapItem[]> {
    const url = new URL(`${window.location.origin}${BASE_URL}/insights/gaps`);
    if (collection_id) url.searchParams.append('collection_id', collection_id);
    if (document_ids && document_ids.length > 0) {
      url.searchParams.append('document_ids', document_ids.join(','));
    }
    const res = await fetch(url.toString().replace(window.location.origin, ''), {
      headers: getHeaders(),
    });
    return handleResponse<ResearchGapItem[]>(res);
  },

  async summarizeSelectedPapers(document_ids: string[]): Promise<MultiPaperSummarizeResponse> {
    const res = await fetch(`${BASE_URL}/insights/summarize-selected`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ document_ids }),
    });
    return handleResponse<MultiPaperSummarizeResponse>(res);
  },

  // Auth
  async login(payload: { email: string; password: string }): Promise<{ access_token: string; email: string; tier: string; user_id: string; name?: string }> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ access_token: string; email: string; tier: string; user_id: string; name?: string }>(res);
  },

  async register(payload: { email: string; password: string; name?: string }): Promise<{ access_token: string; email: string; tier: string; user_id: string; name?: string }> {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ access_token: string; email: string; tier: string; user_id: string; name?: string }>(res);
  },

  async forgotPassword(payload: { email: string }): Promise<{ message: string; email: string }> {
    const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ message: string; email: string }>(res);
  },

  async resetPassword(payload: { email: string; token: string; new_password: string }): Promise<{ message: string; success: boolean }> {
    const res = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ message: string; success: boolean }>(res);
  },

  async submitContactMessage(payload: { name: string; email: string; subject?: string; message: string }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/contact`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },
};
