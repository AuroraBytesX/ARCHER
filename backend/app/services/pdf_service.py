import os
import re
import hashlib
from typing import Dict, Any, List, Tuple, Optional
import pymupdf
from app.core.logging import logger

SECTION_PATTERNS = [
    (r"^(?:abstract|summary)\b", "Abstract"),
    (r"^(?:1\.?|i\.?)?\s*(?:introduction|overview)\b", "Introduction"),
    (r"^(?:2\.?|ii\.?)?\s*(?:background|related\s+work|literature\s+review)\b", "Related Work"),
    (r"^(?:3\.?|iii\.?)?\s*(?:methodology|method|methods|proposed\s+(?:method|framework|model|approach)|architecture)\b", "Methodology"),
    (r"^(?:4\.?|iv\.?)?\s*(?:experiments|experimental\s+setup|implementation|evaluation)\b", "Experiments & Evaluation"),
    (r"^(?:5\.?|v\.?)?\s*(?:results|empirical\s+results|findings|discussion)\b", "Results & Discussion"),
    (r"^(?:6\.?|vi\.?)?\s*(?:limitations|threats\s+to\s+validity)\b", "Limitations"),
    (r"^(?:7\.?|vii\.?)?\s*(?:conclusion|concluding\s+remarks|future\s+work)\b", "Conclusion & Future Work"),
    (r"^(?:references|bibliography)\b", "References"),
]

def calculate_sha256(file_bytes: bytes) -> str:
    hasher = hashlib.sha256()
    hasher.update(file_bytes)
    return hasher.hexdigest()

def clean_extracted_text(text: str) -> str:
    if not text:
        return ""
    # Normalize unicode whitespace and linebreaks
    text = re.sub(r"\r\n|\r", "\n", text)
    # Remove hyphenation at line breaks (e.g., "trans-\nformer" -> "transformer")
    text = re.sub(r"(\w+)-\n(\w+)", r"\1\2", text)
    # Collapse multiple blank lines into two
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Remove null characters
    text = text.replace("\x00", "")
    return text.strip()

def detect_section_header(line: str) -> Optional[str]:
    if not line:
        return None
    cleaned = line.strip()
    if len(cleaned) == 0 or len(cleaned) > 60:
        return None
    cleaned_lower = cleaned.lower()
    first_char = cleaned_lower[0]
    if not (first_char.isalpha() or first_char.isdigit() or first_char in ['i', 'v', 'x']):
        return None
    for pattern, section_name in SECTION_PATTERNS:
        if re.search(pattern, cleaned_lower, re.IGNORECASE):
            return section_name
    return None

class PDFExtractionService:
    @staticmethod
    def extract_pdf(file_path: str) -> Dict[str, Any]:
        """
        Extracts structured page-by-page content, metadata, and sections using PyMuPDF.
        Does NOT load all PDFs into memory simultaneously.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found at {file_path}")

        try:
            doc = pymupdf.open(file_path)
        except Exception as e:
            raise ValueError(f"Unable to open or parse PDF file: {str(e)}")
        try:
            page_count = len(doc)
            meta = doc.metadata or {}
            
            raw_title = meta.get("title", "").strip()
            authors = meta.get("author", "").strip() or None
            
            pages_data: List[Dict[str, Any]] = []
            current_section = "Abstract"
            full_first_page_text = ""
            
            for page_idx in range(page_count):
                page = doc[page_idx]
                page_num = page_idx + 1
                text = page.get_text("text")
                cleaned_page_text = clean_extracted_text(text)
                
                if page_idx == 0:
                    full_first_page_text = cleaned_page_text

                # Parse lines to detect section transitions
                lines = cleaned_page_text.split("\n")
                page_sections: List[Dict[str, Any]] = []
                current_block_lines: List[str] = []
                block_section = current_section

                for line in lines:
                    line_str = line.strip()
                    detected = detect_section_header(line_str)
                    if detected and detected != block_section:
                        if current_block_lines:
                            page_sections.append({
                                "section": block_section,
                                "content": "\n".join(current_block_lines)
                            })
                            current_block_lines = []
                        block_section = detected
                        current_section = detected
                    current_block_lines.append(line)

                if current_block_lines:
                    page_sections.append({
                        "section": block_section,
                        "content": "\n".join(current_block_lines)
                    })

                pages_data.append({
                    "page_number": page_num,
                    "raw_text": cleaned_page_text,
                    "sections": page_sections
                })

            # Heuristics for Title, Abstract, Year, DOI if metadata was empty
            title = raw_title
            if not title or len(title) < 5 or title.lower().endswith(".pdf"):
                title = PDFExtractionService._extract_title_from_text(full_first_page_text, os.path.basename(file_path))

            abstract = PDFExtractionService._extract_abstract_from_text(full_first_page_text)
            year = PDFExtractionService._extract_year_from_text(full_first_page_text)
            doi = PDFExtractionService._extract_doi_from_text(full_first_page_text)

            return {
                "title": title,
                "authors": authors,
                "abstract": abstract,
                "year": year,
                "doi": doi,
                "page_count": page_count,
                "pages": pages_data
            }
        finally:
            doc.close()

    @staticmethod
    def _extract_title_from_text(first_page_text: str, fallback_filename: str) -> str:
        lines = [l.strip() for l in first_page_text.split("\n") if l.strip()]
        for line in lines[:5]:
            # Avoid arXiv tags or headers
            if line.lower().startswith("arxiv:") or "ieee" in line.lower() or "proceedings" in line.lower():
                continue
            if len(line) > 10 and len(line) < 250:
                return line
        # Fallback to filename without extension
        return os.path.splitext(fallback_filename)[0].replace("_", " ").replace("-", " ").title()

    @staticmethod
    def _extract_abstract_from_text(first_page_text: str) -> Optional[str]:
        if not first_page_text:
            return None
        lower = first_page_text.lower()
        abs_pos = lower.find("abstract")
        if abs_pos == -1:
            abs_pos = lower.find("summary")
        if abs_pos == -1:
            return None
        
        start_idx = abs_pos + len("abstract")
        remaining = first_page_text[start_idx:]
        rem_lower = remaining.lower()
        
        end_idx = len(remaining)
        for term in ["\n1. ", "\n1 ", "\ni. ", "\nintroduction", "\nkeywords", "\nindex terms", "\n1. introduction", "\ni. introduction"]:
            pos = rem_lower.find(term)
            if pos != -1 and pos < end_idx:
                end_idx = pos
                
        candidate = remaining[:end_idx].strip()
        candidate = re.sub(r"^[:\-\s]+", "", candidate).strip()
        if len(candidate) > 40:
            return candidate[:2000]
        return None

    @staticmethod
    def _extract_year_from_text(text: str) -> Optional[int]:
        # Search for years 1990-2029
        matches = re.findall(r"\b(199\d|20[0-2]\d)\b", text[:3000])
        if matches:
            # Pick the most common or latest plausible publication year
            years = [int(y) for y in matches if 1990 <= int(y) <= 2026]
            if years:
                return max(set(years), key=years.count)
        return None

    @staticmethod
    def _extract_doi_from_text(text: str) -> Optional[str]:
        match = re.search(r"\b(10\.\d{4,9}/[-._;()/:A-Za-z0-9]+)\b", text)
        if match:
            return match.group(1)
        return None

