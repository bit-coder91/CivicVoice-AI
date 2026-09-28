"""
CivicVoice AI — Flask NLP Service
Modular NLP pipeline for civic complaint analysis.
"""

import os
import re
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ─── Configuration ────────────────────────────────────────────────────────────

DEBUG_MODE = os.environ.get("FLASK_DEBUG", "true").lower() == "true"

# ─── Knowledge Base ───────────────────────────────────────────────────────────

DEPARTMENT_RULES = {
    "Roads":                    ["pothole", "road damage", "road surface", "street damage", "crack", "broken road", "road repair", "flyover"],
    "Water Supply":             ["water supply", "water leakage", "pipeline", "water pipe", "no water", "water shortage", "contaminated water"],
    "Electricity":              ["electricity", "power cut", "power outage", "no power", "wire", "electric wire", "transformer", "streetlight short"],
    "Garbage/Waste Management": ["garbage", "waste", "dustbin", "trash", "litter", "overflowing bin", "dump", "solid waste"],
    "Drainage":                 ["drain", "flooding", "waterlogging", "sewage", "sewer", "rainwater", "blocked drain", "stagnant water"],
    "Streetlights":             ["street light", "streetlight", "lamp post", "no light", "dark road"],
    "Sanitation":               ["sanitation", "toilet", "hygiene", "public toilet", "open defecation", "cleanliness"],
}

PRIORITY_HIGH_WORDS = [
    "emergency", "accident", "danger", "dangerous", "fire", "hospital",
    "flood", "exposed wire", "unsafe", "hazard", "life risk", "critical",
    "urgent", "immediately", "children", "school", "injury"
]

NEGATIVE_WORDS = [
    "bad", "poor", "broken", "not working", "overflow", "leak", "leakage",
    "urgent", "damaged", "damaged", "terrible", "horrible", "worst", "useless",
    "disgusting", "no response", "ignored", "negligence", "complaining", "dirty"
]

POSITIVE_WORDS = [
    "thank", "good", "clean", "improved", "happy", "well maintained",
    "appreciate", "excellent", "resolved", "better", "great work"
]

STOPWORDS = {
    "the", "a", "an", "is", "it", "in", "on", "at", "for", "to",
    "of", "and", "or", "but", "our", "my", "we", "this", "that",
    "are", "was", "has", "have", "been", "be", "by", "with", "from",
    "near", "their", "there", "these", "they", "not", "no", "do",
    "does", "did", "will", "would", "can", "could", "should"
}

# ─── NLP Pipeline Functions ───────────────────────────────────────────────────

def preprocess_text(text: str) -> tuple[str, list[str]]:
    """
    Clean and tokenize input text.
    Returns: (cleaned_text, tokens)
    """
    text_lower = text.lower()
    # Remove URLs
    text_lower = re.sub(r"https?://\S+|www\.\S+", " ", text_lower)
    # Remove non-alphanumeric (preserve spaces)
    text_lower = re.sub(r"[^a-z0-9\s]", " ", text_lower)
    # Collapse whitespace
    cleaned = re.sub(r"\s+", " ", text_lower).strip()
    # Tokenize and filter stopwords
    tokens = [t for t in cleaned.split() if t not in STOPWORDS and len(t) > 2]
    return cleaned, tokens


def classify_department(cleaned: str) -> tuple[str, list[str]]:
    """
    Keyword-based department classification.
    Returns: (department, matched_keywords)
    """
    for dept, keywords in DEPARTMENT_RULES.items():
        matched = [kw for kw in keywords if kw in cleaned]
        if matched:
            return dept, matched
    return "Other", []


def analyze_sentiment(cleaned: str) -> tuple[str, list[str]]:
    """
    Lexicon-based sentiment analysis.
    Returns: (sentiment, matched_indicators)
    """
    pos_matches = [w for w in POSITIVE_WORDS if w in cleaned]
    neg_matches = [w for w in NEGATIVE_WORDS if w in cleaned]

    if pos_matches and not neg_matches:
        return "Positive", pos_matches
    elif neg_matches:
        return "Negative", neg_matches
    return "Neutral", []


def predict_priority(cleaned: str, sentiment: str) -> tuple[str, list[str]]:
    """
    Rule-based priority prediction using urgency keyword matching.
    Returns: (priority, matched_indicators)
    """
    high_matches = [w for w in PRIORITY_HIGH_WORDS if w in cleaned]
    if high_matches:
        return "High", high_matches
    if sentiment == "Negative":
        return "Medium", []
    return "Low", []


def generate_summary(text: str, max_words: int = 18) -> str:
    """
    Generate a concise summary — first N words of the original text.
    """
    words = text.strip().split()
    summary = " ".join(words[:max_words])
    if len(words) > max_words:
        summary += "..."
    return summary


def find_duplicates(text: str, existing_complaints: list, top_k: int = 3) -> list:
    """
    TF-IDF cosine similarity based duplicate detection.
    Returns top_k most similar complaints.
    """
    if not existing_complaints:
        return []
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        import numpy as np

        corpus = [c.get("text", "") for c in existing_complaints]
        vectorizer = TfidfVectorizer(stop_words="english", max_features=500)
        tfidf_matrix = vectorizer.fit_transform(corpus + [text])
        similarities = cosine_similarity(tfidf_matrix[-1], tfidf_matrix[:-1]).flatten()
        top_indices = np.argsort(similarities)[::-1][:top_k]

        results = []
        for idx in top_indices:
            score = float(similarities[idx])
            if score > 0.25:  # Only return meaningful matches
                c = existing_complaints[idx]
                results.append({
                    "id": c.get("id", ""),
                    "title": c.get("title", c.get("text", "")[:60]),
                    "department": c.get("department", ""),
                    "status": c.get("status", ""),
                    "similarity_score": round(score, 3),
                    "similarity_label": _similarity_label(score)
                })
        return results
    except ImportError:
        return []


def _similarity_label(score: float) -> str:
    if score >= 0.7:
        return "Very Similar"
    elif score >= 0.5:
        return "Similar"
    elif score >= 0.25:
        return "Possibly Related"
    return "Low Similarity"


# ─── Full Analysis Pipeline ───────────────────────────────────────────────────

def analyze(text: str) -> dict:
    """
    Run the full NLP pipeline on complaint text.
    """
    cleaned, tokens = preprocess_text(text)
    department, matched_keywords = classify_department(cleaned)
    sentiment, sentiment_indicators = analyze_sentiment(cleaned)
    priority, priority_indicators = predict_priority(cleaned, sentiment)
    summary = generate_summary(text)

    return {
        "department": department,
        "sentiment": sentiment,
        "priority": priority,
        "summary": summary,
        "tokens": tokens,
        "matched_keywords": matched_keywords,
        "sentiment_indicators": sentiment_indicators,
        "priority_indicators": priority_indicators,
    }


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "civicvoice-nlp",
        "version": "2.0"
    })


@app.post("/analyze")
def analyze_route():
    payload = request.get_json(silent=True) or {}
    text = payload.get("text", "")
    if not isinstance(text, str) or not text.strip():
        return jsonify({"error": "text field is required and must be a non-empty string"}), 400
    return jsonify(analyze(text))


@app.post("/duplicates")
def duplicates_route():
    payload = request.get_json(silent=True) or {}
    text = payload.get("text", "")
    existing = payload.get("complaints", [])
    if not isinstance(text, str) or not text.strip():
        return jsonify({"error": "text field is required"}), 400
    results = find_duplicates(text, existing)
    return jsonify({
        "input_text": text[:100],
        "similar_complaints": results,
        "count": len(results)
    })


# ─── Entry Point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=DEBUG_MODE)
