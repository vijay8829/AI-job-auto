"""
Job match scorer — fully deterministic + TF-IDF cosine similarity.
No external API calls.
"""
import re
from typing import Dict, Any, List
import structlog

from app.models.matching_models import JobMatchRequest, JobMatchResponse, MatchReason

logger = structlog.get_logger(__name__)

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    _HAS_SKLEARN = True
except ImportError:
    _HAS_SKLEARN = False


async def score_job_match(request: JobMatchRequest) -> JobMatchResponse:
    """Score a job match using deterministic + TF-IDF similarity."""

    skill_data  = _score_skills(request.parsed_profile, request.job)
    exp_data    = _score_experience(request.parsed_profile, request.job)
    loc_score   = _score_location(request.user_preferences, request.job)
    sal_score   = _score_salary(request.user_preferences, request.job)
    kw_score    = _score_keywords(request.parsed_profile, request.job)
    sem_score   = _score_semantic(request.parsed_profile, request.job)

    overall = int(
        skill_data["score"] * 0.35 +
        exp_data["score"]   * 0.25 +
        loc_score           * 0.15 +
        sal_score           * 0.10 +
        kw_score            * 0.10 +
        sem_score           * 0.05
    )

    match_reasons = _build_match_reasons(skill_data, exp_data, loc_score, request)
    improvements  = _build_improvements(skill_data, exp_data, request)
    recommendation = _build_recommendation(overall, skill_data, exp_data)

    return JobMatchResponse(
        overall_score=min(100, max(0, overall)),
        skill_match_score=skill_data["score"],
        experience_score=exp_data["score"],
        location_score=loc_score,
        salary_score=sal_score,
        ats_score=min(100, overall + 5),
        keyword_score=kw_score,
        matched_skills=skill_data["matched"],
        missing_skills=skill_data["missing"],
        match_reasons=match_reasons,
        improvements=improvements,
        recommendation=recommendation,
    )


def _score_skills(profile: Dict[str, Any], job: Dict[str, Any]) -> Dict:
    user_skills = {s.lower().strip() for s in profile.get("skills", [])}
    job_skills  = {s.lower().strip() for s in job.get("skills", []) + job.get("technologies", [])}

    if not job_skills:
        return {"score": 70, "matched": list(user_skills)[:10], "missing": []}

    matched = list(user_skills & job_skills)
    missing = list(job_skills - user_skills)

    # Partial matching: if a job skill appears as substring of a user skill or vice versa
    for js in list(missing):
        for us in user_skills:
            if js in us or us in js:
                matched.append(js)
                missing.remove(js)
                break

    score = int((len(matched) / len(job_skills)) * 100) if job_skills else 70
    return {
        "score": min(100, score),
        "matched": matched[:15],
        "missing": missing[:10],
    }


def _score_experience(profile: Dict[str, Any], job: Dict[str, Any]) -> Dict:
    user_years = profile.get("total_experience_years") or 0
    job_level  = job.get("experience_level", "")

    level_map = {
        "ENTRY": (0, 2), "JUNIOR": (1, 3), "MID": (3, 6),
        "SENIOR": (5, 10), "LEAD": (7, 15), "PRINCIPAL": (10, 20), "EXECUTIVE": (12, 30),
    }
    if not job_level or job_level not in level_map:
        return {"score": 75}

    lo, hi = level_map[job_level]
    if user_years >= lo:
        score = 100 if user_years <= hi else 85
    elif user_years >= lo - 1:
        score = 70
    else:
        score = max(20, 100 - (lo - user_years) * 15)

    return {"score": int(score)}


def _score_location(prefs: Any, job: Dict[str, Any]) -> int:
    job_mode   = job.get("work_mode", "")
    user_modes = list(prefs.work_modes) if prefs and prefs.work_modes else []

    if "REMOTE" in user_modes and job_mode == "REMOTE":    return 100
    if "REMOTE" in user_modes and job_mode in ("HYBRID", "FLEXIBLE"): return 80
    if job_mode in user_modes:                              return 90

    job_loc   = (job.get("location") or "").lower()
    user_locs = [l.lower() for l in (list(prefs.preferred_locations) if prefs else [])]
    for loc in user_locs:
        if loc in job_loc or job_loc in loc:
            return 90
    return 50 if job_mode == "ONSITE" else 70


def _score_salary(prefs: Any, job: Dict[str, Any]) -> int:
    if not prefs or (not getattr(prefs, 'salary_min', None) and not getattr(prefs, 'salary_max', None)):
        return 75
    job_min  = job.get("salary_min") or 0
    job_max  = job.get("salary_max") or 0
    if not job_min and not job_max:
        return 75
    user_min = getattr(prefs, 'salary_min', 0) or 0
    user_max = getattr(prefs, 'salary_max', float("inf")) or float("inf")
    if job_max >= user_min and job_min <= user_max:
        return 90
    if job_max < user_min:
        gap = (user_min - job_max) / (user_min or 1)
        return max(20, int(100 - gap * 100))
    return 85


def _score_keywords(profile: Dict[str, Any], job: Dict[str, Any]) -> int:
    user_kw  = {k.lower() for k in profile.get("keywords", [])}
    job_desc = (job.get("description") or "").lower()
    job_kw   = {k.lower() for k in job.get("keywords", [])}
    if not user_kw:
        return 60
    matched = sum(1 for kw in user_kw if kw in job_desc or kw in job_kw)
    return min(100, int((matched / len(user_kw)) * 100))


def _score_semantic(profile: Dict[str, Any], job: Dict[str, Any]) -> int:
    """TF-IDF cosine similarity between profile text and job description."""
    if not _HAS_SKLEARN:
        return 65

    profile_text = ' '.join([
        profile.get("summary") or '',
        ' '.join(profile.get("skills", [])),
        ' '.join(profile.get("keywords", [])),
    ]).strip()
    job_text = ' '.join([
        job.get("title") or '',
        job.get("description") or '',
        ' '.join(job.get("skills", [])),
    ]).strip()

    if len(profile_text) < 10 or len(job_text) < 10:
        return 65

    try:
        vec = TfidfVectorizer(stop_words='english', max_features=500)
        matrix = vec.fit_transform([profile_text, job_text])
        sim = cosine_similarity(matrix[0], matrix[1])[0][0]
        return int(sim * 100)
    except Exception:
        return 65


def _build_match_reasons(skill_data: Dict, exp_data: Dict, loc_score: int,
                         request: JobMatchRequest) -> list:
    reasons = []
    if skill_data["matched"]:
        reasons.append(MatchReason(
            reason=f"You have {len(skill_data['matched'])} matching skills: {', '.join(skill_data['matched'][:5])}",
            impact="positive",
            weight=round(skill_data["score"] / 100, 2),
        ))
    if exp_data["score"] >= 80:
        reasons.append(MatchReason(
            reason="Your experience level aligns well with this role.",
            impact="positive",
            weight=round(exp_data["score"] / 100, 2),
        ))
    if loc_score >= 80:
        reasons.append(MatchReason(
            reason="Location or work mode preference matches.",
            impact="positive",
            weight=round(loc_score / 100, 2),
        ))
    return reasons


def _build_improvements(skill_data: Dict, exp_data: Dict, request: JobMatchRequest) -> list:
    improvements = []
    if skill_data["missing"]:
        improvements.append(f"Consider adding these skills: {', '.join(skill_data['missing'][:5])}")
    if exp_data["score"] < 70:
        improvements.append("Highlight relevant project work to compensate for experience gaps.")
    if not request.parsed_profile.get("summary"):
        improvements.append("Add a professional summary to improve ATS visibility.")
    return improvements


def _build_recommendation(overall: int, skill_data: Dict, exp_data: Dict) -> str:
    if overall >= 80:
        return "Strong match — apply with confidence."
    if overall >= 60:
        return "Good match — tailor your resume to highlight matching skills."
    if overall >= 40:
        return "Partial match — address skill gaps before applying."
    return "Weak match — consider upskilling or targeting better-aligned roles."
