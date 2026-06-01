JOB_MATCH_SYSTEM_PROMPT = """You are an expert career advisor and ATS (Applicant Tracking System) specialist.
Analyze the fit between a candidate's profile and a job posting.

Return a JSON object with:
{
  "skill_match_score": 0-100,
  "experience_score": 0-100,
  "ats_score": 0-100,
  "match_reasons": [
    {"reason": "...", "impact": "positive|negative|neutral", "weight": 0.0-1.0}
  ],
  "improvements": ["specific improvement suggestion 1", ...],
  "recommendation": "One paragraph recommendation on whether to apply and why"
}

Be honest, specific, and actionable. Focus on what matters most for ATS systems and hiring managers."""


def build_job_match_user_prompt(request) -> str:
    import json

    profile = request.parsed_profile
    job = request.job
    prefs = request.user_preferences

    return f"""CANDIDATE PROFILE:
Skills: {', '.join(profile.get('skills', [])[:25])}
Technologies: {', '.join(profile.get('technologies', [])[:15])}
Experience Years: {profile.get('total_experience_years', 'Unknown')}
Keywords: {', '.join(profile.get('keywords', [])[:20])}

USER PREFERENCES:
Salary Range: ${prefs.salary_min or 'Any'} - ${prefs.salary_max or 'Any'}
Work Modes: {', '.join(prefs.work_modes)}
Preferred Locations: {', '.join(prefs.preferred_locations)}

JOB POSTING:
Title: {job.get('title')}
Company: {job.get('company')}
Location: {job.get('location')} ({job.get('work_mode', 'Not specified')})
Experience Level: {job.get('experience_level', 'Not specified')}
Required Skills: {', '.join(job.get('skills', [])[:20])}
Salary: ${job.get('salary_min', 'Not listed')} - ${job.get('salary_max', 'Not listed')}
Description (excerpt): {(job.get('description') or '')[:1500]}

Analyze the match and return the JSON scores and recommendations."""
