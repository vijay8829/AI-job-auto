"""
Resume tailor — pure-code skill gap analysis + template-based cover letter.
No external API calls.
"""
import re
from typing import Dict, Any, List, Optional
import structlog

from app.models.resume_models import TailoredResumeResponse
from app.services.parser.skills_db import SKILLS_DB

logger = structlog.get_logger(__name__)

# ── Cover letter templates ─────────────────────────────────────────────────────
# Placeholders: {name}, {role}, {company}, {top_skills}, {exp_years},
#               {match_skills}, {summary_sentence}, {closing}

_TEMPLATES = [
    # Template A — professional / direct
    """\
Dear Hiring Manager,

I am writing to express my strong interest in the {role} position at {company}. With {exp_years} of hands-on experience and proficiency in {top_skills}, I am confident in my ability to contribute meaningfully to your team.

{summary_sentence}

Throughout my career I have developed expertise in {match_skills}. I thrive in collaborative environments and am passionate about delivering high-quality results. The opportunity at {company} aligns perfectly with my professional goals and technical background.

I would welcome the chance to discuss how my skills can add value to your team. Thank you for considering my application.

Sincerely,
{name}""",

    # Template B — enthusiastic / startup-style
    """\
Hi {company} Team,

I'm excited to apply for the {role} role. I've been following {company}'s work and believe my background in {top_skills} makes me a great fit.

{summary_sentence}

I've built real-world products using {match_skills} and I bring {exp_years} of practical experience to the table. I love solving complex problems and shipping things that matter.

I'd love to connect and chat more about how I can contribute. Looking forward to hearing from you!

Best,
{name}""",

    # Template C — concise / formal
    """\
Dear Hiring Manager,

Please consider my application for the {role} position at {company}.

{summary_sentence} My core technical strengths include {top_skills}, with additional expertise in {match_skills}. I have {exp_years} of professional experience building production-grade software.

I am eager to bring my skills to {company} and contribute to your engineering team. I look forward to the opportunity to discuss my qualifications further.

Thank you for your time and consideration.

Best regards,
{name}""",
]


def _exp_years_str(years: Optional[float]) -> str:
    if not years:
        return "relevant"
    if years < 1:
        return "less than 1 year"
    if years == 1:
        return "1 year"
    return f"{int(years)} years"


def _summary_sentence(profile: Dict[str, Any]) -> str:
    if profile.get("summary"):
        # Take first sentence
        s = re.split(r'(?<=[.!?])\s', profile["summary"])[0]
        return s if len(s) > 20 else profile["summary"][:200]
    role_hint = "a software professional"
    if profile.get("skills"):
        sk = profile["skills"][:2]
        role_hint = f"an experienced professional skilled in {' and '.join(sk)}"
    return f"I am {role_hint} with a strong focus on delivering impactful solutions."


async def tailor_resume(
    parsed_profile: Dict[str, Any],
    job_description: str,
    job_requirements: Optional[str],
    job_skills: List[str],
) -> TailoredResumeResponse:
    """Analyse skill gaps and generate tailored content + cover letter."""

    user_skills = {s.lower() for s in parsed_profile.get("skills", [])}
    required    = {s.lower() for s in job_skills}
    matched     = sorted(user_skills & required)
    missing     = sorted(required - user_skills)

    # Extract job title and company from description heuristically
    job_title   = _extract_job_title(job_description)
    company     = _extract_company(job_description)
    name        = (parsed_profile.get("contact_info") or {}).get("name") or "Candidate"
    exp_years   = _exp_years_str(parsed_profile.get("total_experience_years"))
    top_skills  = ', '.join(parsed_profile.get("skills", [])[:5]) or "core technologies"
    match_skills = ', '.join([s.title() for s in matched[:5]]) or top_skills

    # Select template based on company vibe (startup vs corp)
    template_idx = 0
    desc_lower = job_description.lower()
    if any(w in desc_lower for w in ['startup', 'fast-paced', 'move fast', 'small team', 'seed']):
        template_idx = 1
    elif any(w in desc_lower for w in ['concise', 'brief', 'short']):
        template_idx = 2

    cover_letter = _TEMPLATES[template_idx].format(
        name=name,
        role=job_title,
        company=company,
        top_skills=top_skills,
        exp_years=exp_years,
        match_skills=match_skills,
        summary_sentence=_summary_sentence(parsed_profile),
        closing="",
    )

    # Build tailored content suggestions
    tailored_summary = _tailor_summary(parsed_profile, job_title, matched)
    highlighted_skills = matched + [s for s in parsed_profile.get("skills", []) if s.lower() not in required][:5]

    tailored_content = {
        "summary": tailored_summary,
        "skills": highlighted_skills[:20],
        "keywords_added": missing[:5],
        "job_title": job_title,
    }

    # Changes made
    changes = []
    if tailored_summary != parsed_profile.get("summary"):
        changes.append({"section": "summary", "action": "optimised for role keywords"})
    if missing:
        changes.append({"section": "skills", "action": f"gap identified: {', '.join(missing[:3])}"})

    improvement_notes = []
    if missing:
        improvement_notes.append(f"Consider adding these skills to strengthen your match: {', '.join(missing[:5])}")
    if not parsed_profile.get("summary"):
        improvement_notes.append("Add a professional summary section targeting this role.")
    if len(parsed_profile.get("skills", [])) < 8:
        improvement_notes.append("Expand your skills section with more specific technologies.")

    ats_boost = min(100, 55 + len(matched) * 3 + (10 if tailored_summary else 0))

    logger.info("tailor_resume.done", matched=len(matched), missing=len(missing))

    return TailoredResumeResponse(
        tailored_content=tailored_content,
        cover_letter=cover_letter,
        ats_score=ats_boost,
        added_keywords=missing[:5],
        changes=changes,
        improvement_notes=improvement_notes,
    )


def _extract_job_title(text: str) -> str:
    """Heuristic job title extraction from description."""
    patterns = [
        r'(?:position|role|title|hiring\s+for|looking\s+for)[:\s]+([^\n.]{5,60})',
        r'^([^\n]{5,60}(?:engineer|developer|manager|analyst|designer|scientist))',
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE | re.MULTILINE)
        if m:
            return m.group(1).strip()[:60]
    return "the advertised position"


def _extract_company(text: str) -> str:
    patterns = [
        r'(?:at|join|company|organization)[:\s]+([A-Z][^\n,]{2,40})',
        r'(?:about\s+us|who\s+we\s+are)[:\s]*\n?([A-Z][^\n]{5,50})',
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()[:40]
    return "your organization"


def _tailor_summary(profile: Dict[str, Any], job_title: str, matched_skills: list) -> str:
    base = profile.get("summary") or ""
    if not base:
        skills_str = ', '.join(matched_skills[:4]) if matched_skills else "relevant technologies"
        return (
            f"Results-driven professional targeting {job_title} roles, "
            f"with proven expertise in {skills_str}. "
            "Passionate about building scalable solutions and collaborating with cross-functional teams."
        )
    # Prepend role targeting if not already present
    if job_title.lower() not in base.lower() and "targeting" not in base.lower():
        return f"Targeting {job_title} opportunities. {base}"
    return base
