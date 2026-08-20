import re
from typing import Tuple

GIBBERISH_PATTERNS = [
    r"^(asdf|qwerty|zxcv|hjkl|1234|qwer|test|testing|foo|bar|baz)+\b",
    r"^([a-z])\1{3,}", # repeated letters like aaaa, zzzz
    r"^(\?|\.|\!|\-|\_|\=|\+)+$", # pure symbols
]

CASUAL_PATTERNS = [
    r"^(hi|hello|hey|greetings|howdy|yo)\b",
    r"^(how are you|how are you doing|how's it going|how are things)\b",
    r"^(who are you|what are you|what is your name|what can you do|how do you work|help me|help)\b",
    r"^(good morning|good afternoon|good evening|good day)\b",
    r"^(thanks|thank you|thanks a lot|thx|ok|okay|cool|nice|great|got it|sure)\b",
    r"^(bye|goodbye|see you|cya)\b"
]

RESEARCH_KEYWORDS = [
    "attention", "transformer", "bert", "lora", "rag", "retrieval", "embedding",
    "dataset", "method", "methodology", "result", "finding", "accuracy", "f1",
    "bleu", "loss", "model", "paper", "author", "limitation", "architecture",
    "training", "eval", "experiment", "parameter", "layer", "encoder", "decoder",
    "metric", "corpus", "pre-train", "fine-tun", "benchmark", "objective", "weight",
    "vector", "matrix", "gradient", "learning", "self-attention", "dense", "sparse"
]

def is_gibberish_or_repeated(text: str) -> bool:
    cleaned = text.strip().lower()
    normalized = re.sub(r"[^\w\s]", " ", cleaned).strip()
    words = normalized.split()
    if not words:
        return True

    # Check repeated identical words e.g. "what what", "hi hi"
    if len(words) >= 2 and len(set(words)) == 1:
        return True

    # Check single character or 2-letter non-words
    if len(cleaned) <= 2 and cleaned not in ["hi", "ai", "ml", "dl", "f1", "ok"]:
        return True

    for pat in GIBBERISH_PATTERNS:
        if re.search(pat, cleaned) or re.search(pat, normalized):
            return True

    return False

def classify_query_intent(text: str) -> Tuple[str, str]:
    """
    NLP Intent Classifier:
    Returns (intent_type, message)
    intent_type: 'GIBBERISH' | 'GREETING' | 'POLITENESS' | 'CAPABILITY' | 'RESEARCH_QUERY'
    """
    cleaned = text.strip().lower()
    normalized = re.sub(r"[^\w\s]", " ", cleaned).strip()
    words = normalized.split()

    if not words or is_gibberish_or_repeated(cleaned):
        return "GIBBERISH", (
            "I did not detect a clear research inquiry. "
            "Please ask a specific question regarding your uploaded papers, such as their algorithms, "
            "architectural choices, datasets, empirical benchmarks, or reported limitations."
        )

    # Check for simple pleasantries
    for pat in CASUAL_PATTERNS:
        if re.search(pat, cleaned) or re.search(pat, normalized):
            has_research_kw = any(kw in normalized for kw in RESEARCH_KEYWORDS)
            if not has_research_kw or len(words) <= 5:
                if any(w in normalized for w in ["who are you", "what can you do", "what are you", "help"]):
                    return "CAPABILITY", (
                        "I am ARCHER, your citation-grounded academic research assistant. "
                        "I can extract methodologies, compare benchmark results, and answer in-depth questions "
                        "across 14-30+ page research papers in your library with verified page citations [Paper Title, p. X]. "
                        "Please ask a question about any paper."
                    )
                if any(w in normalized for w in ["thanks", "thank you", "thx", "ok", "okay", "cool", "nice", "great"]):
                    return "POLITENESS", "You are welcome. Feel free to ask any technical question regarding your research library."
                return "GREETING", (
                    "Hello! How can I help with your research papers today? "
                    "You can ask me about architectures, benchmark metrics, mathematical formulations, or paper limitations."
                )

    return "RESEARCH_QUERY", ""
