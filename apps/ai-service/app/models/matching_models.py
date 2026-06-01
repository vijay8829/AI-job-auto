from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class UserPreferences(BaseModel):
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    work_modes: List[str] = []
    preferred_locations: List[str] = []


class JobMatchRequest(BaseModel):
    parsed_profile: Dict[str, Any]
    user_preferences: UserPreferences
    job: Dict[str, Any]


class MatchReason(BaseModel):
    reason: str
    impact: str  # "positive" | "negative" | "neutral"
    weight: float


class JobMatchResponse(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    skill_match_score: int = Field(ge=0, le=100)
    experience_score: int = Field(ge=0, le=100)
    location_score: int = Field(ge=0, le=100)
    salary_score: int = Field(ge=0, le=100)
    ats_score: int = Field(ge=0, le=100)
    keyword_score: int = Field(ge=0, le=100)
    matched_skills: List[str]
    missing_skills: List[str]
    match_reasons: List[MatchReason]
    improvements: List[str]
    recommendation: str
