from typing import List, Dict, Any
from app.core.config import settings

def estimate_tokens(text: str) -> int:
    """Approximate token count based on whitespace & punctuation (1 token ~ 4 chars / 0.75 words)"""
    words = text.strip().split()
    if not words:
        return 0
    # Average 1 word ~= 1.33 tokens
    return int(len(words) * 1.3)

class ChunkingService:
    def __init__(self, chunk_size: int = None, chunk_overlap: int = None):
        self.chunk_size = chunk_size or settings.CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP

    def chunk_document(self, document_id: str, pages_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Recursive & section-aware chunking preserving:
        - document_id
        - page_number
        - section
        - chunk_index
        - token_count
        """
        chunks: List[Dict[str, Any]] = []
        global_chunk_idx = 0

        for page_item in pages_data:
            page_number = page_item.get("page_number", 1)
            sections = page_item.get("sections", [])
            
            if not sections:
                raw_text = page_item.get("raw_text", "")
                if raw_text.strip():
                    sections = [{"section": "General", "content": raw_text}]

            for sec in sections:
                sec_name = sec.get("section", "General") or "General"
                content = sec.get("content", "").strip()
                if not content:
                    continue

                sec_chunks = self._split_section_text(content)
                for chunk_text in sec_chunks:
                    tokens = estimate_tokens(chunk_text)
                    if tokens < 5:  # skip trivial whitespace or artifact chunks
                        continue

                    chunks.append({
                        "document_id": document_id,
                        "chunk_index": global_chunk_idx,
                        "page_number": page_number,
                        "section": sec_name,
                        "content": chunk_text,
                        "token_count": tokens
                    })
                    global_chunk_idx += 1

        return chunks

    def _split_section_text(self, text: str) -> List[str]:
        paragraphs = text.split("\n\n")
        chunks = []
        current_chunk_words: List[str] = []
        current_token_count = 0

        # Overlap in words (1 token ~ 0.75 words)
        overlap_words_count = max(10, int(self.chunk_overlap * 0.75))

        for para in paragraphs:
            para_words = para.strip().split()
            if not para_words:
                continue

            para_tokens = int(len(para_words) * 1.3)

            # If a single paragraph is larger than chunk size, split by sentences/word windows
            if para_tokens > self.chunk_size:
                if current_chunk_words:
                    chunks.append(" ".join(current_chunk_words))
                    overlap_words = current_chunk_words[-overlap_words_count:] if len(current_chunk_words) > overlap_words_count else []
                    current_chunk_words = list(overlap_words)
                    current_token_count = int(len(current_chunk_words) * 1.3)

                # Split large paragraph into chunks
                step = max(50, int((self.chunk_size - self.chunk_overlap) * 0.75))
                window = int(self.chunk_size * 0.75)
                for i in range(0, len(para_words), step):
                    slice_words = para_words[i:i + window]
                    if slice_words:
                        chunks.append(" ".join(slice_words))
                continue

            if (current_token_count + para_tokens) <= self.chunk_size:
                current_chunk_words.extend(para_words)
                current_token_count += para_tokens
            else:
                if current_chunk_words:
                    chunks.append(" ".join(current_chunk_words))
                    overlap_words = current_chunk_words[-overlap_words_count:] if len(current_chunk_words) > overlap_words_count else []
                    current_chunk_words = list(overlap_words) + para_words
                    current_token_count = int(len(current_chunk_words) * 1.3)
                else:
                    current_chunk_words = list(para_words)
                    current_token_count = para_tokens

        if current_chunk_words:
            chunks.append(" ".join(current_chunk_words))

        return chunks
