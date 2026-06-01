"""
Field extractors — each function takes section text and returns structured data.
All pure Python + regex, no external API calls.
"""
import re
from typing import Optional
from .skills_db import SKILLS_DB, HUMAN_LANGUAGE_PATTERNS

# ── Date helpers ───────────────────────────────────────────────────────────────

_MONTH_PAT = (
    r'(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?'
    r'|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?'
    r'|nov(?:ember)?|dec(?:ember)?)'
)
_YEAR_PAT = r'(?:19|20)\d{2}'
_DATE_PAT = rf'(?:{_MONTH_PAT}[\s,\.]+{_YEAR_PAT}|{_YEAR_PAT}[\s,/\-]+{_MONTH_PAT}|\d{{1,2}}[/\-]{_YEAR_PAT}|{_YEAR_PAT})'
_CURRENT_PAT = r'(?:present|current|now|till\s+date|to\s+date|ongoing|today|—)'
_DATE_RANGE_RE = re.compile(
    rf'({_DATE_PAT})\s*(?:[-–—]|to|till)\s*({_DATE_PAT}|{_CURRENT_PAT})',
    re.IGNORECASE,
)
_SINGLE_DATE_RE = re.compile(_DATE_PAT, re.IGNORECASE)
_YEAR_RE = re.compile(r'\b((?:19|20)\d{2})\b')

_MONTH_MAP = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
}


def _normalise_date(raw: str) -> Optional[str]:
    """Convert any date string to YYYY-MM format."""
    raw = raw.strip().lower()
    if not raw or re.match(_CURRENT_PAT, raw, re.IGNORECASE):
        return None

    # YYYY-MM or MM/YYYY
    m = re.match(r'(\d{4})[/\-](\d{1,2})', raw)
    if m:
        return f"{m.group(1)}-{m.group(2).zfill(2)}"
    m = re.match(r'(\d{1,2})[/\-](\d{4})', raw)
    if m:
        return f"{m.group(2)}-{m.group(1).zfill(2)}"

    # Month + Year
    for abbr, num in _MONTH_MAP.items():
        if abbr in raw:
            yr = re.search(r'((?:19|20)\d{2})', raw)
            if yr:
                return f"{yr.group(1)}-{num}"

    # Bare year
    yr = re.search(r'((?:19|20)\d{2})', raw)
    if yr:
        return f"{yr.group(1)}-01"

    return None


def _is_current(raw: str) -> bool:
    return bool(re.search(_CURRENT_PAT, raw, re.IGNORECASE))


# ── Contact extractor ─────────────────────────────────────────────────────────

def extract_contact(header_text: str, full_text: str) -> dict:
    """Extract email, phone, links, name, location from header block."""
    text = header_text or full_text[:1500]

    email = None
    m = re.search(r'[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}', text)
    if m:
        email = m.group(0).strip()

    phone = None
    m = re.search(r'(?:\+?\d[\d\s\-().]{7,}\d)', text)
    if m:
        phone = m.group(0).strip()

    linkedin = None
    m = re.search(r'linkedin\.com/in/[\w\-]+', text, re.IGNORECASE)
    if m:
        linkedin = ('https://' + m.group(0)) if not m.group(0).startswith('http') else m.group(0)

    github = None
    m = re.search(r'github\.com/[\w\-]+', text, re.IGNORECASE)
    if m:
        github = ('https://' + m.group(0)) if not m.group(0).startswith('http') else m.group(0)

    portfolio = None
    for pat in [
        r'(?:portfolio|website|web)[\s:]+(\S+)',
        r'((?:https?://)?[\w\-]+\.(?:netlify\.app|vercel\.app|github\.io|dev|io|me|co)[/\w\-]*)',
    ]:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            url = m.group(1) if m.lastindex else m.group(0)
            if 'linkedin' not in url and 'github' not in url:
                portfolio = url
                break

    # Location: look for City, Country/State patterns
    location = None
    for pat in [
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*(?:India|USA|US|UK|Canada|Australia|Germany|[A-Z][a-z]+))',
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*[A-Z]{2})',
    ]:
        m = re.search(pat, text)
        if m:
            location = m.group(1).strip()
            break

    # Name: first non-empty short line that's not email/phone/URL and looks like a name
    name = None
    for line in text.split('\n')[:8]:
        line = line.strip()
        if (2 <= len(line.split()) <= 6 and len(line) <= 50
                and not re.search(r'[@\d{3}|http|www\.]', line)
                and not re.search(_CURRENT_PAT, line, re.IGNORECASE)
                and not any(kw in line.lower() for kw in ['engineer', 'developer', 'analyst', 'manager', 'intern'])
                and re.match(r'^[A-Za-z\s\.\-]+$', line)):
            name = line
            break

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "location": location,
        "linkedin_url": linkedin,
        "github_url": github,
        "portfolio_url": portfolio,
    }


# ── Skills extractor ─────────────────────────────────────────────────────────

def extract_skills_from_text(text: str) -> list[str]:
    """
    Match text against the skills database using word-boundary regex.
    Returns deduplicated list of canonical skill names, sorted.
    """
    found: dict[str, str] = {}  # lower → canonical
    text_lower = text.lower()

    # Sort by length descending so longer matches take priority
    sorted_skills = sorted(SKILLS_DB.items(), key=lambda x: -len(x[0]))

    for key, canonical in sorted_skills:
        # Escape special regex chars in key
        escaped = re.escape(key)
        # Use word boundaries; allow optional .js / .py suffix variations
        pattern = rf'(?<![a-zA-Z\-]){escaped}(?![a-zA-Z\-])'
        if re.search(pattern, text_lower):
            # Only add if canonical not already found via another alias
            if canonical not in found.values():
                found[key] = canonical

    return sorted(set(found.values()))


# ── Experience extractor ──────────────────────────────────────────────────────

# Common job title keywords for header line detection
_TITLE_KEYWORDS = re.compile(
    r'\b(?:engineer|developer|designer|analyst|manager|director|lead|head|'
    r'architect|consultant|specialist|coordinator|officer|executive|'
    r'intern|trainee|associate|senior|junior|staff|principal|vp|cto|ceo|coo|'
    r'scientist|researcher|administrator|devops|sre|qa|tester|'
    r'product\s+(?:manager|owner)|project\s+manager|'
    r'full[\s\-]?stack|backend|frontend|mobile|cloud|data|'
    r'business\s+analyst|system\s+analyst)\b',
    re.IGNORECASE,
)


def _split_experience_entries(text: str) -> list[str]:
    """Split experience section into individual job entries.
    A new entry starts when a line contains a job-title keyword.
    Date-range-only lines are kept inside the current entry, not as new entries.
    """
    lines = text.split('\n')
    entries: list[list[str]] = []
    current: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current:
                current.append('')
            continue

        # A line that has a title keyword AND is NOT purely a date range → new entry
        has_title  = bool(_TITLE_KEYWORDS.search(stripped))
        has_date   = bool(_DATE_RANGE_RE.search(stripped))
        is_date_only = has_date and not _TITLE_KEYWORDS.search(stripped) and len(stripped) < 50

        if has_title and not is_date_only:
            if current and any(s.strip() for s in current):
                entries.append(current)
            current = [stripped]
        else:
            current.append(stripped)

    if current and any(s.strip() for s in current):
        entries.append(current)

    return ['\n'.join(e).strip() for e in entries if e]


def _parse_one_experience(block: str) -> Optional[dict]:
    """Parse a single experience block into a structured dict."""
    lines = [l for l in block.split('\n') if l.strip()]
    if not lines:
        return None

    start_date = end_date = is_current = None
    title = company = location = description = None
    date_line_idx = -1

    # Find date range
    for i, line in enumerate(lines):
        m = _DATE_RANGE_RE.search(line)
        if m:
            start_date = _normalise_date(m.group(1))
            is_current = _is_current(m.group(2))
            end_date = None if is_current else _normalise_date(m.group(2))
            date_line_idx = i
            break

    # Header lines are those before description (first 3 lines typically)
    header_lines = lines[:date_line_idx] if date_line_idx > 0 else lines[:2]
    desc_lines = lines[date_line_idx + 1:] if date_line_idx >= 0 else lines[2:]

    # Parse title/company from header
    if header_lines:
        first = header_lines[0]
        # Pattern: "Title | Company | Location" or "Title at Company"
        if '|' in first:
            parts = [p.strip() for p in first.split('|')]
            title = parts[0] if parts else None
            company = parts[1] if len(parts) > 1 else None
            location = parts[2] if len(parts) > 2 else None
        elif re.search(r'\bat\b', first, re.IGNORECASE):
            sp = re.split(r'\bat\b', first, 1, re.IGNORECASE)
            title = sp[0].strip()
            company = sp[1].strip() if len(sp) > 1 else None
        elif re.search(r'[,–\-]', first):
            # "Title – Company" or "Title, Company"
            sp = re.split(r'\s*[–\-,]\s*', first, 1)
            if len(sp) == 2 and _TITLE_KEYWORDS.search(sp[0]):
                title, company = sp[0].strip(), sp[1].strip()
            elif len(sp) == 2:
                company, title = sp[0].strip(), sp[1].strip()
            else:
                title = first
        else:
            title = first
            if len(header_lines) > 1:
                company = header_lines[1].strip()

    if not title:
        return None

    # Description: join non-empty desc_lines
    desc_parts = [l.strip().lstrip('•·-*▪◦✓✔▶►').strip() for l in desc_lines if l.strip()]
    description = ' '.join(desc_parts) if desc_parts else None

    # Extract skills from description
    skills_in_desc = extract_skills_from_text(description or '')

    return {
        "company": (company or "").strip()[:200],
        "title": (title or "").strip()[:200],
        "location": (location or "").strip()[:200] if location else None,
        "start_date": start_date,
        "end_date": end_date,
        "is_current": bool(is_current),
        "description": description[:1000] if description else None,
        "skills": skills_in_desc[:15],
        "achievements": [],
    }


def extract_experience(section_text: str) -> list[dict]:
    """Extract list of work experience entries from section text."""
    if not section_text:
        return []
    entries = _split_experience_entries(section_text)
    result = []
    for block in entries:
        parsed = _parse_one_experience(block)
        if parsed and parsed.get('title'):
            result.append(parsed)
    return result


# ── Education extractor ───────────────────────────────────────────────────────

_DEGREE_RE = re.compile(
    r'\b(?:bachelor(?:\'s)?(?:\s+of)?|master(?:\'s)?(?:\s+of)?|'
    r'b\.?(?:sc|tech|eng|com|ed|a|s)|m\.?(?:sc|tech|eng|com|ed|a|s|ba)|'
    r'phd|ph\.d|doctor(?:ate)?(?:\s+of)?|mba|llb|llm|bba|bca|mca|'
    r'associate(?:\'s)?|diploma|certificate|hsc|ssc|'
    r'high\s+school|secondary|undergraduate|postgraduate|graduate)\b',
    re.IGNORECASE,
)

_INSTITUTION_RE = re.compile(
    r'(?:university|college|institute(?:\s+of)?|school(?:\s+of)?|'
    r'academy|iit|nit|bits|iim|polytechnic|faculty\s+of)',
    re.IGNORECASE,
)


def extract_education(section_text: str) -> list[dict]:
    if not section_text:
        return []

    entries = []
    blocks = re.split(r'\n{2,}', section_text)
    if len(blocks) <= 1:
        # Try splitting by degree keywords — but keep them attached to the block
        raw_blocks = re.split(
            r'(?=\b(?:bachelor|master|b\.tech|m\.tech|phd|bca|mca|bba|mba|diploma)\b)',
            section_text, flags=re.IGNORECASE,
        )
        blocks = [b for b in raw_blocks if b.strip()]

    for block in blocks:
        block = block.strip()
        if not block:
            continue

        lines = [l.strip() for l in block.split('\n') if l.strip()]
        degree = institution = field = grade = start_date = end_date = None

        for line in lines:
            # Dates
            dr = _DATE_RANGE_RE.search(line)
            if dr:
                start_date = _normalise_date(dr.group(1))
                is_cur = _is_current(dr.group(2))
                end_date = None if is_cur else _normalise_date(dr.group(2))
                continue
            # Bare years
            years = _YEAR_RE.findall(line)
            if years and not start_date:
                if len(years) >= 2:
                    start_date = f"{min(years)}-01"
                    end_date = f"{max(years)}-01"
                elif len(years) == 1:
                    end_date = f"{years[0]}-01"

            # Degree
            if _DEGREE_RE.search(line) and not degree:
                degree = line[:200].strip()
                # Try to extract field from same line
                fl = re.sub(_DEGREE_RE, '', line).strip(' (),–-of')
                if len(fl) > 3:
                    field = fl[:100]

            # Institution
            if _INSTITUTION_RE.search(line) and not institution:
                institution = line[:200].strip()

            # Grade/GPA
            gm = re.search(r'(?:gpa|cgpa|grade|score)[:\s]*([\d.]+(?:\s*/\s*[\d.]+)?)', line, re.IGNORECASE)
            if gm and not grade:
                grade = gm.group(1).strip()

        # Fallback: if institution not found via keyword, use the longest non-degree line
        if not institution and degree:
            for line in lines:
                line = line.strip()
                if (line and not _DEGREE_RE.search(line) and not _DATE_RANGE_RE.search(line)
                        and not _YEAR_RE.fullmatch(line) and len(line) > 10):
                    institution = line[:200]
                    break

        if institution or degree:
            entries.append({
                "institution": (institution or degree or "Unknown")[:200],
                "degree": (degree or "")[:200],
                "field_of_study": (field or "")[:150] if field else None,
                "start_date": start_date,
                "end_date": end_date,
                "grade": grade,
            })

    # Deduplicate: drop entries whose institution/degree is a subset of another's
    deduped = []
    seen_inst: set[str] = set()
    for e in entries:
        key = (e['institution'][:50].lower(), e['degree'][:30].lower())
        if key not in seen_inst:
            seen_inst.add(key)
            deduped.append(e)
    return deduped


# ── Projects extractor ────────────────────────────────────────────────────────

def extract_projects(section_text: str) -> list[dict]:
    if not section_text:
        return []

    projects: list[dict] = []
    lines = section_text.split('\n')
    current_name: Optional[str] = None
    current_desc_lines: list[str] = []

    def _flush(name: Optional[str], desc_lines: list[str]) -> None:
        if not name:
            return
        desc = ' '.join(l.strip().lstrip('•·-*').strip() for l in desc_lines if l.strip())
        techs = extract_skills_from_text(desc)
        url = None
        um = re.search(r'https?://\S+', desc)
        if um:
            url = um.group(0)
        projects.append({
            "name": name[:200],
            "description": desc[:500] if desc else None,
            "technologies": techs[:10],
            "url": url,
        })

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Pattern 1: "Name: Description" or "Name — Description" or "Name | Description"
        m = re.match(r'^([A-Z][^\n:–|]{3,50})\s*[:\-–|]\s*(.+)$', stripped)
        if m and len(m.group(1).split()) <= 6:
            _flush(current_name, current_desc_lines)
            current_name = m.group(1).strip()
            current_desc_lines = [m.group(2).strip()]
            continue

        # Pattern 2: Bold-like line (all caps short name)
        if (stripped.isupper() and len(stripped.split()) <= 5 and len(stripped) > 3
                and not _DATE_RANGE_RE.search(stripped)):
            _flush(current_name, current_desc_lines)
            current_name = stripped.title()
            current_desc_lines = []
            continue

        # Pattern 3: continuation lines — append to current project description
        if current_name:
            current_desc_lines.append(stripped)
        elif re.match(r'^[-•*▪◦]\s*\S', stripped):
            current_name = "Project"
            current_desc_lines = [stripped.lstrip('-•*▪◦ ')]

    _flush(current_name, current_desc_lines)
    return projects


# ── Certifications extractor ──────────────────────────────────────────────────

_CERT_ISSUERS = re.compile(
    r'\b(?:google|microsoft|amazon|aws|meta|facebook|coursera|udemy|edx|'
    r'linkedin|cisco|oracle|ibm|salesforce|adobe|nvidia|'
    r'comptia|pmi|isaca|certified|professional|association|institute)\b',
    re.IGNORECASE,
)


def extract_certifications(section_text: str) -> list[dict]:
    if not section_text:
        return []

    certs = []
    # Split by newline and bullet markers
    items = re.split(r'\n|[·•,]+', section_text)

    for item in items:
        item = item.strip().lstrip('-•*·▪◦✓✔▶► ').strip()
        if len(item) < 3 or len(item) > 300:
            continue

        # Find year
        ym = re.search(r'\b((?:19|20)\d{2})\b', item)
        issued = f"{ym.group(1)}-01" if ym else None
        clean_name = re.sub(r'\b(?:19|20)\d{2}\b', '', item).strip(' –-,|')

        # Find issuer
        im = _CERT_ISSUERS.search(clean_name)
        issuer = im.group(0).title() if im else ""

        if clean_name:
            certs.append({
                "name": clean_name[:200],
                "issuer": issuer,
                "issued_at": issued,
                "expires_at": None,
                "credential_id": None,
            })

    return certs


# ── Summary extractor ─────────────────────────────────────────────────────────

def extract_summary(section_text: str, header_text: str) -> Optional[str]:
    """Return the best summary paragraph."""
    if section_text and len(section_text.strip()) > 30:
        # Return first substantial paragraph
        paragraphs = [p.strip() for p in re.split(r'\n{2,}', section_text) if p.strip()]
        if paragraphs:
            return paragraphs[0][:1000]

    # Fallback: find summary-like sentence in header block
    if header_text:
        sentences = re.split(r'(?<=[.!?])\s+', header_text)
        long_sents = [s for s in sentences if len(s) > 60]
        if long_sents:
            return ' '.join(long_sents[:3])[:1000]

    return None


# ── Languages extractor ───────────────────────────────────────────────────────

_PROF_LEVELS = re.compile(
    r'\b(?:native|fluent|proficient|intermediate|beginner|basic|'
    r'professional|working|full\s+professional|elementary|conversational|'
    r'a1|a2|b1|b2|c1|c2)\b',
    re.IGNORECASE,
)


def extract_languages(section_text: str, full_text: str) -> list[str]:
    """Extract human languages spoken."""
    results = set()
    text = section_text or full_text[:3000]

    for lang in HUMAN_LANGUAGE_PATTERNS:
        # Word boundary search
        if re.search(rf'\b{re.escape(lang)}\b', text, re.IGNORECASE):
            # Capitalize properly
            results.add(lang.title())

    # Deduplicate sub-language matches (e.g. don't add both "Kannada" and "Kan")
    return sorted(results)
