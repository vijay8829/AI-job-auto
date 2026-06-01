"""
Section detection — splits resume text into named sections.
Handles all-caps headers, title-case headers, and known keyword patterns.
"""
import re
from typing import Optional

# Maps detected section key → canonical name used throughout the parser
SECTION_ALIASES: dict[str, list[str]] = {
    "summary": [
        r"(?:professional\s+)?summary", r"career\s+(?:summary|objective)",
        r"(?:professional\s+)?profile", r"about\s+me", r"objective",
        r"personal\s+statement", r"executive\s+summary", r"overview",
        r"career\s+profile",
    ],
    "skills": [
        r"(?:technical\s+)?skills?(?:\s+[&and]+\s+expertise)?",
        r"core\s+competenc(?:y|ies)", r"competenc(?:y|ies)",
        r"expertise", r"tech(?:nical)?\s+(?:stack|expertise|proficiencies?)",
        r"technologies?", r"proficienc(?:y|ies)",
        r"areas?\s+of\s+expertise", r"tools?\s+(?:[&and]+\s+)?technologies?",
        r"key\s+skills?", r"hard\s+skills?", r"soft\s+skills?",
        r"skills?\s+(?:summary|overview|highlights?)",
    ],
    "experience": [
        r"(?:professional\s+|work\s+|relevant\s+)?experience",
        r"work\s+history", r"employment(?:\s+history)?",
        r"career\s+history", r"professional\s+background",
        r"job\s+experience", r"positions?\s+held",
        r"work\s+experience", r"experience\s+summary",
    ],
    "education": [
        r"education(?:al?\s+(?:background|qualifications?|history))?",
        r"academic\s+(?:background|qualifications?|credentials?|history)?",
        r"qualifications?", r"degrees?", r"schooling",
        r"academic\s+credentials?",
    ],
    "projects": [
        r"(?:key\s+|personal\s+|side\s+|selected\s+|notable\s+)?projects?",
        r"portfolio", r"notable\s+work", r"open[\s\-]source(?:\s+contributions?)?",
        r"projects?\s+(?:[&and]+\s+)?work",
    ],
    "certifications": [
        r"certifications?", r"certificates?", r"credentials?",
        r"licenses?\s+(?:[&and]+\s+)?certifications?",
        r"professional\s+(?:certifications?|development|credentials?)",
        r"training\s+(?:[&and]+\s+)?certifications?",
        r"accreditations?",
    ],
    "achievements": [
        r"achievements?", r"accomplishments?",
        r"honors?\s+(?:[&and]+\s+)?awards?",
        r"awards?\s+(?:[&and]+\s+)?recognition",
        r"awards?", r"recognition", r"honors?",
    ],
    "languages": [
        r"language\s+(?:skills?|proficiency|knowledge)?",
        r"languages?\s+(?:spoken|known|proficiency)?",
        r"spoken\s+languages?",
    ],
    "volunteering": [
        r"volunteer(?:ing)?\s+(?:experience|work)?",
        r"community\s+(?:service|involvement)",
        r"social\s+work",
    ],
    "interests": [
        r"interests?", r"hobbies?(?:\s+(?:[&and]+\s+)?interests?)?",
        r"extracurricular", r"personal\s+interests?",
    ],
    "references": [
        r"references?(?:\s+available\s+on\s+request)?",
    ],
}

# Compiled patterns: (section_key, compiled_pattern)
_COMPILED: list[tuple[str, re.Pattern]] = []
for _key, _patterns in SECTION_ALIASES.items():
    for _pat in _patterns:
        _COMPILED.append((_key, re.compile(
            rf'^\s*(?:[^\w\s]{{0,3}}\s*)?(?:{_pat})\s*(?:[^\w\s]{{0,3}})?\s*$',
            re.IGNORECASE
        )))

_ALL_CAPS_MIN = 4   # minimum chars to treat all-caps line as a header
_HEADER_MAX_LEN = 70


def _classify_line(line: str) -> Optional[str]:
    """Return section key if line is a section header, else None."""
    stripped = line.strip()
    if not stripped or len(stripped) > _HEADER_MAX_LEN:
        return None
    # Skip lines containing email, phone, URL — those are contact info
    if re.search(r'[@\d{3}[\s\-]?\d{3}|https?://|www\.]', stripped):
        return None
    # Skip lines starting with bullet markers
    if stripped[0] in ('•', '·', '-', '*', '◦', '▪', '–', '—', '✓', '✔'):
        return None

    for key, pat in _COMPILED:
        if pat.match(stripped):
            return key

    # Fallback: all-caps short line that looks like a heading
    clean = re.sub(r'[^A-Z\s]', '', stripped)
    if len(clean) >= _ALL_CAPS_MIN and stripped.isupper() and len(stripped.split()) <= 5:
        lower = stripped.lower().strip()
        for key, pat in _COMPILED:
            if re.search(pat.pattern[4:-1], lower, re.IGNORECASE):  # relaxed match
                return key

    return None


def detect_sections(text: str) -> dict[str, str]:
    """
    Split resume text into sections.
    Returns dict: {section_key: section_text_content}
    The first section (before any recognized header) is always 'header'.
    """
    lines = text.split('\n')
    sections: dict[str, list[str]] = {}
    current = 'header'
    buffer: list[str] = []

    for line in lines:
        key = _classify_line(line)
        if key:
            sections[current] = '\n'.join(buffer).strip()
            current = key
            buffer = []
        else:
            buffer.append(line)

    sections[current] = '\n'.join(buffer).strip()
    return {k: v for k, v in sections.items() if v}


def get_section(sections: dict[str, str], *keys: str) -> str:
    """Try multiple section keys and return the first match."""
    for k in keys:
        if k in sections and sections[k].strip():
            return sections[k]
    return ''
