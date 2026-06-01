"""
Generation endpoints — cover letters and application question answers.
Pure-code engine, no external API keys required.
"""
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import structlog

from app.services.resume_tailor import _TEMPLATES, _summary_sentence, _exp_years_str, _extract_job_title, _extract_company

router = APIRouter()
logger = structlog.get_logger(__name__)


class CoverLetterRequest(BaseModel):
    candidate_name: str
    candidate_profile: dict
    job_title: str
    company_name: str
    job_description: str


@router.post("/generate-cover-letter")
async def generate_cover_letter(request: CoverLetterRequest):
    try:
        profile   = request.candidate_profile
        skills    = profile.get("skills", [])
        top_5     = ', '.join(skills[:5]) if skills else "core technologies"
        exp_years = _exp_years_str(profile.get("total_experience_years"))
        summary_s = _summary_sentence(profile)

        # Match skills to job description
        jd_lower  = request.job_description.lower()
        matched   = [s for s in skills if s.lower() in jd_lower]
        match_str = ', '.join(matched[:5]) if matched else top_5

        # Template selection
        idx = 0
        if any(w in jd_lower for w in ['startup', 'fast-paced', 'move fast', 'seed']):
            idx = 1
        elif any(w in jd_lower for w in ['formal', 'corporate', 'enterprise']):
            idx = 2

        cover_letter = _TEMPLATES[idx].format(
            name=request.candidate_name,
            role=request.job_title,
            company=request.company_name,
            top_skills=top_5,
            exp_years=exp_years,
            match_skills=match_str,
            summary_sentence=summary_s,
            closing="",
        )

        return {"cover_letter": cover_letter}
    except Exception as e:
        logger.error("cover_letter_generation_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


class AnswerQuestionRequest(BaseModel):
    question: str
    candidate_profile: dict
    job_context: str


# Question classification → answer template mapping
_Q_TEMPLATES: dict[str, str] = {
    "why": (
        "I am drawn to {company} because of your focus on {domain}. "
        "My background in {top_skills} positions me well to contribute to your goals, "
        "and I am excited about the opportunity to grow with your team."
    ),
    "strength": (
        "One of my core strengths is {top_skill}. I have applied this in {context}, "
        "delivering results through a combination of technical depth and clear communication."
    ),
    "weakness": (
        "I have been actively working on improving my {area} skills. "
        "I approach this by setting learning goals and taking on projects that stretch my abilities."
    ),
    "experience": (
        "I have {exp_years} of experience working with {top_skills}. "
        "In my most recent role, I {recent_achievement}. "
        "I am comfortable working in agile environments and delivering on tight timelines."
    ),
    "salary": (
        "Based on my research and {exp_years} of experience, I am targeting "
        "a compensation range aligned with industry standards for this role. "
        "I am open to discussing a package that reflects the full scope of the position."
    ),
    "default": (
        "Based on my experience with {top_skills} and {exp_years} in the field, "
        "I believe I bring the skills and mindset needed for this role. "
        "I approach challenges methodically and enjoy collaborating with teams to find the best solution."
    ),
}


def _classify_question(question: str) -> str:
    q = question.lower()
    if any(w in q for w in ['why do you want', 'why this company', 'why are you interested', 'why us']):
        return 'why'
    if any(w in q for w in ['strength', 'best at', 'good at', 'excel at']):
        return 'strength'
    if any(w in q for w in ['weakness', 'improve', 'challenge', 'struggle']):
        return 'weakness'
    if any(w in q for w in ['experience', 'background', 'worked on', 'have you']):
        return 'experience'
    if any(w in q for w in ['salary', 'compensation', 'pay', 'expect']):
        return 'salary'
    return 'default'


@router.post("/answer-application-question")
async def answer_application_question(request: AnswerQuestionRequest):
    try:
        profile   = request.candidate_profile
        skills    = profile.get("skills", [])
        top_skill = skills[0] if skills else "software engineering"
        top_5     = ', '.join(skills[:4]) if skills else "core technologies"
        exp_years = _exp_years_str(profile.get("total_experience_years"))

        # Extract domain hint from job context
        domain_m  = re.search(r'(?:in|for|about)\s+([^\n.]{5,40})', request.job_context)
        domain    = domain_m.group(1).strip() if domain_m else "technology and product development"

        company_m = re.search(r'([A-Z][a-zA-Z\s]{2,30})(?:\s+is|\s+we|\s+our)', request.job_context)
        company   = company_m.group(1).strip() if company_m else "your company"

        # Build recent achievement hint
        recent_exp = (profile.get("experience") or [{}])
        recent = recent_exp[0] if recent_exp else {}
        recent_achievement = (
            f"worked as {recent.get('title', 'a developer')} at {recent.get('company', 'a company')}, "
            f"focusing on {', '.join(recent.get('skills', skills[:2]))}"
            if recent else f"worked extensively with {top_5}"
        )

        qtype    = _classify_question(request.question)
        template = _Q_TEMPLATES[qtype]

        answer = template.format(
            top_skill=top_skill,
            top_skills=top_5,
            exp_years=exp_years,
            domain=domain,
            company=company,
            recent_achievement=recent_achievement,
            context=f"projects involving {top_5}",
            area="public speaking and technical documentation",
        )

        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
