import re
from typing import Tuple

GIBBERISH_PATTERNS = [
    r"^(asdf|qwerty|zxcv|hjkl|1234|qwer|test|testing|foo|bar|baz)+\b",
    r"^(\?|\.|\!|\-|\_|\=|\+)+$", # pure symbols
]

CASUAL_PATTERNS = [
    r"^(hi+|hello+|hey+|greetings|howdy|yo+|helo+|hiee+|sup)\b",
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

OFF_TOPIC_PATTERNS = [
    r"\b(cake|pizza|cookie|burger|food|recipe|bake|cook|coffee|tea|lunch|dinner|breakfast|snack|chocolate|dessert)\b",
    r"\b(joke|funny|riddle|story|poem|song|sing|dance|movie|music|game|gaming|play)\b",
    r"\b(weather|temperature|forecast|rain|sunny|climate today|clothes|fashion)\b",
    r"\b(buy|sell|price of|crypto|bitcoin|stock price|shop|shopping)\b",
]

FOLLOW_UP_PATTERNS = [
    r"^(in short|briefly|in brief|summarize|summary|shorter|concise|tldr|tl;dr|simplify|simple terms)\b",
    r"^(explain more|more detail|tell me more|expand|go deeper|clarify|elaborate)\b",
    r"^(why|how|what about|and then|what else|compared to|which one|what if)\b",
    r"^(give me\b|list\b|show me\b|bullet\b)",
]

def classify_query_intent(text: str, has_conversation_history: bool = False) -> Tuple[str, str]:
    """
    NLP Intent Classifier:
    Returns (intent_type, message)
    intent_type: 'GIBBERISH' | 'GREETING' | 'POLITENESS' | 'CAPABILITY' | 'OFF_TOPIC' | 'RESEARCH_QUERY'
    """
    cleaned = text.strip().lower()
    normalized = re.sub(r"[^\w\s]", " ", cleaned).strip()
    words = normalized.split()

    # 1. Follow-up commands are always valid research queries
    for pat in FOLLOW_UP_PATTERNS:
        if re.search(pat, cleaned) or re.search(pat, normalized):
            return "RESEARCH_QUERY", ""

    # If conversation exists, short sub-questions are always treated as research queries
    if has_conversation_history and len(words) >= 1:
        if not is_gibberish_or_repeated(cleaned):
            return "RESEARCH_QUERY", ""

    if not words or is_gibberish_or_repeated(cleaned):
        return "GIBBERISH", (
            "I did not detect a clear inquiry. "
            "Please ask a question regarding your research papers, architectures, datasets, benchmarks, or methodology."
        )

    # Check for simple pleasantries
    for pat in CASUAL_PATTERNS:
        if re.search(pat, cleaned) or re.search(pat, normalized):
            has_research_kw = any(kw in normalized for kw in RESEARCH_KEYWORDS)
            if not has_research_kw or len(words) <= 4:
                if any(w in normalized for w in ["who are you", "what can you do", "what are you", "help"]):
                    return "CAPABILITY", (
                        "I am ARCHER, your citation-grounded academic research assistant. "
                        "I can extract methodologies, compare benchmark results, and answer in-depth questions "
                        "across research papers in your library with verified page citations [Paper Title, p. X]. "
                        "Please ask any question about your documents."
                    )
                if any(w in normalized for w in ["thanks", "thank you", "thx", "ok", "okay", "cool", "nice", "great"]):
                    return "POLITENESS", "You are welcome. Feel free to ask any technical question regarding your research library."
                return "GREETING", (
                    "Hello! How can I help with your research papers today? "
                    "You can ask me about architectures, benchmark metrics, mathematical formulations, or paper comparisons."
                )

    return "RESEARCH_QUERY", ""

    return "RESEARCH_QUERY", ""
