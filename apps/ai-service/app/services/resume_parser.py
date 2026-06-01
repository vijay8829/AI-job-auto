"""
Resume parser — pure-code NLP engine, zero external API calls.
Orchestrates: download → text extraction → section detection → field extraction → scoring.
"""
import httpx
import io
import structlog

from app.models.resume_models import (
    ParsedResumeResponse, ContactInfo, WorkExperience,
    Education, Certification, Project,
)
from app.utils.text_extractor import extract_text_from_pdf, extract_text_from_docx
from app.services.parser import (
    detect_sections, get_section,
    extract_contact, extract_skills_from_text, extract_experience,
    extract_education, extract_projects, extract_certifications,
    extract_summary, extract_languages,
    calculate_ats_score, calculate_readability_score,
    calculate_keyword_density, extract_keywords, calculate_experience_years,
)

logger = structlog.get_logger(__name__)


async def parse_resume(file_url: str, file_format: str) -> ParsedResumeResponse:
    """Download → extract text → parse → score.  No external API needed."""
    logger.info("parse_resume.start", url=file_url, format=file_format)

    # ── Stage 1: Download ────────────────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
            resp = await client.get(file_url)
            resp.raise_for_status()
            file_bytes = resp.content
        logger.info("parse_resume.download_ok", bytes=len(file_bytes))
    except Exception as e:
        raise ValueError(f"Failed to download resume from {file_url}: {e}")

    # ── Stage 2: Extract raw text ────────────────────────────────────────────
    try:
        fmt = file_format.upper()
        if fmt == "PDF":
            raw_text = extract_text_from_pdf(io.BytesIO(file_bytes))
        elif fmt == "DOCX":
            raw_text = extract_text_from_docx(io.BytesIO(file_bytes))
        else:
            raw_text = file_bytes.decode("utf-8", errors="ignore")
        logger.info("parse_resume.text_extracted", chars=len(raw_text))
    except Exception as e:
        raise ValueError(f"Text extraction failed ({file_format}): {e}")

    if not raw_text or len(raw_text.strip()) < 20:
        raise ValueError(f"Could not extract meaningful text (got {len(raw_text or '')} chars)")

    # ── Stage 3: Parse ───────────────────────────────────────────────────────
    return _parse(raw_text)


def _parse(raw_text: str) -> ParsedResumeResponse:
    logger.info("parse_resume.engine_start", chars=len(raw_text))

    # Section detection
    sections = detect_sections(raw_text)
    header_text   = get_section(sections, 'header')
    skills_text   = get_section(sections, 'skills')
    exp_text      = get_section(sections, 'experience')
    edu_text      = get_section(sections, 'education')
    proj_text     = get_section(sections, 'projects')
    cert_text     = get_section(sections, 'certifications', 'achievements')
    summary_text  = get_section(sections, 'summary')
    lang_text     = get_section(sections, 'languages')

    # Field extraction
    contact_raw    = extract_contact(header_text, raw_text)
    skills         = extract_skills_from_text(skills_text + '\n' + raw_text)
    experience     = extract_experience(exp_text)
    education      = extract_education(edu_text)
    projects       = extract_projects(proj_text)
    certifications = extract_certifications(cert_text)
    summary        = extract_summary(summary_text, header_text)
    languages      = extract_languages(lang_text, raw_text)
    keywords       = extract_keywords(raw_text)

    # Technologies = subset of skills that are tools/frameworks (not soft skills)
    technologies = skills[:15]

    # Scoring
    total_exp_years = calculate_experience_years(experience)
    ats_score       = calculate_ats_score(
        contact_raw, skills, experience, education, summary, keywords, raw_text
    )
    readability     = calculate_readability_score(raw_text)
    kw_density      = calculate_keyword_density(raw_text, keywords)

    logger.info(
        "parse_resume.engine_done",
        skills=len(skills), experience=len(experience),
        education=len(education), projects=len(projects),
        ats_score=ats_score, keywords=len(keywords),
    )

    return ParsedResumeResponse(
        raw_text=raw_text,
        contact_info=ContactInfo(
            name=contact_raw.get("name"),
            email=contact_raw.get("email"),
            phone=contact_raw.get("phone"),
            location=contact_raw.get("location"),
            linkedin_url=contact_raw.get("linkedin_url"),
            github_url=contact_raw.get("github_url"),
            portfolio_url=contact_raw.get("portfolio_url"),
        ),
        summary=summary,
        skills=skills,
        experience=[_to_work_exp(e) for e in experience],
        education=[_to_education(e) for e in education],
        certifications=[_to_cert(c) for c in certifications],
        projects=[_to_project(p) for p in projects],
        technologies=technologies,
        keywords=keywords,
        languages=languages,
        total_experience_years=total_exp_years,
        ats_score=ats_score,
        readability_score=readability,
        keyword_density=kw_density,
    )


# ── Model builders ────────────────────────────────────────────────────────────

def _to_work_exp(d: dict) -> WorkExperience:
    try:
        return WorkExperience(
            company=d.get("company") or "",
            title=d.get("title") or "",
            location=d.get("location"),
            start_date=d.get("start_date"),
            end_date=d.get("end_date"),
            is_current=bool(d.get("is_current", False)),
            description=d.get("description"),
            skills=d.get("skills", []),
            achievements=d.get("achievements", []),
        )
    except Exception:
        return WorkExperience(company="", title="")


def _to_education(d: dict) -> Education:
    try:
        return Education(
            institution=d.get("institution") or "",
            degree=d.get("degree") or "",
            field_of_study=d.get("field_of_study"),
            start_date=d.get("start_date"),
            end_date=d.get("end_date"),
            grade=d.get("grade"),
        )
    except Exception:
        return Education(institution="", degree="")


def _to_cert(d: dict) -> Certification:
    try:
        return Certification(
            name=d.get("name") or "",
            issuer=d.get("issuer") or "",
            issued_at=d.get("issued_at"),
            expires_at=d.get("expires_at"),
            credential_id=d.get("credential_id"),
        )
    except Exception:
        return Certification(name="", issuer="")


def _to_project(d: dict) -> Project:
    try:
        return Project(
            name=d.get("name") or "",
            description=d.get("description"),
            technologies=d.get("technologies", []),
            url=d.get("url"),
        )
    except Exception:
        return Project(name="")
