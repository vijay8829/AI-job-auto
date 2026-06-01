"""
Scoring functions — ATS score, readability, keyword density, TF-IDF keywords.
Uses numpy + scikit-learn (already in requirements) for TF-IDF.
"""
import re
import math
from typing import Optional
from datetime import datetime

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    _HAS_SKLEARN = True
except ImportError:
    _HAS_SKLEARN = False


# ── ATS Score (rubric-based, max 100) ─────────────────────────────────────────

def calculate_ats_score(contact: dict, skills: list, experience: list,
                        education: list, summary: Optional[str],
                        keywords: list, raw_text: str) -> int:
    score = 0

    # Contact section (max 20)
    if contact.get("email"):      score += 7
    if contact.get("phone"):      score += 5
    if contact.get("location"):   score += 3
    if contact.get("linkedin_url"): score += 5

    # Skills (max 20) — quality over quantity
    tech_skill_count = len([s for s in skills if len(s) > 2])
    score += min(20, tech_skill_count * 2)

    # Experience (max 25) — entries with dates are worth more
    dated_exp = [e for e in experience if e.get("start_date")]
    score += min(25, len(experience) * 6 + len(dated_exp) * 2)

    # Education (max 10)
    if education:
        score += 8
        if any(e.get("field_of_study") for e in education):
            score += 2

    # Summary / profile (max 10)
    if summary:
        if len(summary) > 100:  score += 10
        elif len(summary) > 40: score += 6

    # Keywords diversity (max 10)
    score += min(10, len(set(keywords)))

    # Resume completeness signals (max 5)
    word_count = len(raw_text.split())
    if 200 <= word_count <= 1200:  score += 3
    if any(url in raw_text.lower() for url in ['github', 'linkedin', 'portfolio']):
        score += 2

    return min(100, score)


# ── Readability Score (Flesch-Kincaid variant, max 100) ───────────────────────

def calculate_readability_score(text: str) -> int:
    """Score based on sentence length, bullet structure, and word complexity."""
    words = text.split()
    sentences = [s for s in re.split(r'[.!?\n]+', text) if s.strip()]

    if not sentences or not words:
        return 50

    avg_sentence_len = len(words) / len(sentences)

    if avg_sentence_len <= 12:   base = 92
    elif avg_sentence_len <= 16: base = 82
    elif avg_sentence_len <= 20: base = 70
    elif avg_sentence_len <= 26: base = 58
    else:                        base = 42

    # Bullet points improve scannability
    bullets = sum(1 for c in text if c in '•·-*◦▪')
    bullet_bonus = min(8, bullets // 2)

    # Penalise very long paragraphs (blocks > 5 lines without breaks)
    para_penalty = 0
    for para in re.split(r'\n{2,}', text):
        para_lines = [l for l in para.split('\n') if l.strip()]
        if len(para_lines) > 8:
            para_penalty += 3

    return min(100, max(10, base + bullet_bonus - para_penalty))


# ── Keyword Density ────────────────────────────────────────────────────────────

def calculate_keyword_density(text: str, keywords: list) -> dict[str, float]:
    text_lower = text.lower()
    word_count = len(text.split())
    density = {}
    for kw in keywords[:30]:
        count = len(re.findall(rf'\b{re.escape(kw.lower())}\b', text_lower))
        if count > 0 and word_count > 0:
            density[kw] = round((count / word_count) * 100, 3)
    return density


# ── Keyword Extraction (TF-IDF when sklearn available, else frequency) ─────────

_STOP_WORDS = {
    'that', 'this', 'with', 'from', 'will', 'have', 'been', 'your',
    'they', 'their', 'what', 'when', 'where', 'which', 'work', 'team',
    'able', 'also', 'used', 'using', 'made', 'make', 'into', 'than',
    'more', 'some', 'such', 'over', 'each', 'most', 'other', 'would',
    'could', 'should', 'doing', 'done', 'being', 'were', 'these',
    'those', 'then', 'than', 'about', 'above', 'below', 'after',
    'before', 'between', 'through', 'during', 'while', 'where',
    'good', 'best', 'well', 'high', 'strong', 'excellent',
    'provide', 'ensure', 'support', 'manage', 'develop', 'build',
    'create', 'design', 'implement', 'maintain', 'improve', 'help',
}


def extract_keywords(text: str, top_n: int = 25) -> list[str]:
    if _HAS_SKLEARN:
        return _extract_tfidf(text, top_n)
    return _extract_frequency(text, top_n)


def _extract_tfidf(text: str, top_n: int) -> list[str]:
    sentences = [s.strip() for s in re.split(r'[.!?\n]+', text) if len(s.strip()) > 15]
    if len(sentences) < 3:
        return _extract_frequency(text, top_n)
    try:
        vec = TfidfVectorizer(
            max_features=200,
            stop_words='english',
            ngram_range=(1, 2),
            token_pattern=r'\b[a-zA-Z][a-zA-Z\+\#\.]{2,}\b',
        )
        matrix = vec.fit_transform(sentences)
        scores = matrix.sum(axis=0).A1
        names = vec.get_feature_names_out()
        ranked = sorted(zip(names, scores), key=lambda x: -x[1])
        result = []
        seen: set[str] = set()
        for word, _ in ranked:
            word_clean = word.strip()
            if (word_clean not in _STOP_WORDS
                    and word_clean.lower() not in seen
                    and len(word_clean) >= 3
                    and not word_clean.isdigit()):
                result.append(word_clean)
                seen.add(word_clean.lower())
            if len(result) >= top_n:
                break
        return result
    except Exception:
        return _extract_frequency(text, top_n)


def _extract_frequency(text: str, top_n: int) -> list[str]:
    words = re.findall(r'\b[a-zA-Z][a-zA-Z\+\#\.]{2,}\b', text.lower())
    freq: dict[str, int] = {}
    for w in words:
        if w not in _STOP_WORDS:
            freq[w] = freq.get(w, 0) + 1
    return [w for w, c in sorted(freq.items(), key=lambda x: -x[1]) if c >= 2][:top_n]


# ── Experience Years Calculator ────────────────────────────────────────────────

def calculate_experience_years(experiences: list) -> Optional[float]:
    """Sum up months from all experience entries with valid date ranges."""
    if not experiences:
        return None

    total_months = 0
    now = datetime.now()

    for exp in experiences:
        try:
            start_str = exp.get("start_date")
            end_str = exp.get("end_date")
            is_current = exp.get("is_current", False)

            if not start_str:
                continue

            start = datetime.strptime(start_str[:7], "%Y-%m")
            end = now if (is_current or not end_str) else datetime.strptime(end_str[:7], "%Y-%m")

            months = (end.year - start.year) * 12 + (end.month - start.month)
            total_months += max(0, months)
        except (ValueError, AttributeError):
            continue

    if total_months == 0:
        return None

    return round(total_months / 12, 1)
