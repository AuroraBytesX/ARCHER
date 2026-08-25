export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'INDEXING' | 'READY' | 'FAILED';

export interface DocumentItem {
  id: string;
  title: string;
  authors?: string | null;
  abstract?: string | null;
  year?: number | null;
  doi?: string | null;
  filename: string;
  file_url?: string | null;
  page_count: number;
  status: DocumentStatus;
  stage?: string;
  is_duplicate?: boolean;
  error_message?: string | null;
  content_hash: string;
  collection_id?: string | null;
  created_at: string;
  chunks_count?: number;
  has_summary?: boolean;
}

export interface CollectionItem {
  id: string;
  name: string;
  created_at: string;
}

export interface DocumentListResponse {
  total: number;
  page: number;
  limit: number;
  items: DocumentItem[];
}

export interface CitationItem {
  document_id: string;
  paper_title: string;
  page_number: number;
  chunk_id: string;
  section?: string;
  quote?: string;
  citation_label: string;
}

export interface MessageItem {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: CitationItem[];
  created_at: string;
}

export interface ConversationItem {
  id: string;
  title: string;
  created_at: string;
  messages: MessageItem[];
}

export interface ChatResponse {
  conversation_id: string;
  message_id: string;
  answer: string;
  citations: CitationItem[];
  evidence_score: number;
  retrieved_chunks_count: number;
}

export interface SearchResultItem {
  chunk_id: string;
  document_id: string;
  paper_title: string;
  authors?: string | null;
  year?: number | null;
  page_number: number;
  section: string;
  excerpt: string;
  relevance_score: number;
}

export interface SearchResponse {
  query: string;
  mode: string;
  total_results: number;
  page: number;
  limit: number;
  results: SearchResultItem[];
}

export interface PaperSummary {
  id: string;
  document_id: string;
  paper_title?: string;
  objective?: string;
  methodology?: string;
  datasets?: string;
  findings?: string;
  limitations?: string;
  future_work?: string;
  summary: string;
  created_at: string;
}

export interface ComparePaperProfile {
  document_id: string;
  title: string;
  authors?: string | null;
  year?: number | null;
  objective: string;
  methodology: string;
  dataset: string;
  model: string;
  metrics: string;
  results: string;
  limitations: string;
}

export interface CompareMatrixRow {
  aspect: string;
  values: Record<string, string>;
}

export interface CompareResponse {
  papers: ComparePaperProfile[];
  comparison_table: CompareMatrixRow[];
  synthesis_summary?: string;
}

export interface ResearchGapItem {
  title: string;
  domain: string;
  identified_gap: string;
  supporting_evidence: string;
  suggested_direction: string;
  referenced_papers: string[];
}

export interface InsightsResponse {
  total_papers: number;
  total_chunks: number;
  total_collections: number;
  years_distribution: Array<{ year: number; count: number }>;
  top_methodologies: Array<{ name: string; count: number }>;
  top_datasets: Array<{ name: string; count: number }>;
  research_gaps: ResearchGapItem[];
  disclaimer: string;
}

export interface IndividualPaperSummary {
  document_id: string;
  paper_title: string;
  objective?: string;
  methodology?: string;
  findings?: string;
  limitations?: string;
  summary?: string;
}

export interface MultiPaperSummarizeResponse {
  synthesis_title: string;
  papers_count: number;
  executive_synthesis: string;
  methodological_takeaways: string[];
  joint_empirical_findings: string[];
  paper_summaries: IndividualPaperSummary[];
}


export interface BatchUploadItem {
  filename: string;
  status: 'SUCCESS' | 'DUPLICATE' | 'FAILED' | 'IGNORED';
  document?: DocumentItem;
  message?: string;
}

export interface BatchUploadResponse {
  total_files: number;
  successful_count: number;
  duplicate_count: number;
  failed_count: number;
  results: BatchUploadItem[];
}
