from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date


class ParseResumeRequest(BaseModel):
    resume_id: str
    file_url: str
    format: str = "PDF"


class ContactInfo(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None


class WorkExperience(BaseModel):
    company: str
    title: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    description: Optional[str] = None
    skills: List[str] = []
    achievements: List[str] = []


class Education(BaseModel):
    institution: str
    degree: str
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    grade: Optional[str] = None


class Project(BaseModel):
    name: str
    description: Optional[str] = None
    technologies: List[str] = []
    url: Optional[str] = None


class Certification(BaseModel):
    name: str
    issuer: str
    issued_at: Optional[str] = None
    expires_at: Optional[str] = None
    credential_id: Optional[str] = None


class ParsedResumeResponse(BaseModel):
    raw_text: str
    contact_info: ContactInfo
    summary: Optional[str] = None
    skills: List[str] = []
    experience: List[WorkExperience] = []
    education: List[Education] = []
    certifications: List[Certification] = []
    projects: List[Project] = []
    technologies: List[str] = []
    keywords: List[str] = []
    languages: List[str] = []
    total_experience_years: Optional[float] = None
    ats_score: Optional[int] = None
    readability_score: Optional[int] = None
    keyword_density: Dict[str, float] = {}


class TailorResumeRequest(BaseModel):
    parsed_profile: Dict[str, Any]
    job_description: str
    job_requirements: Optional[str] = None
    job_skills: List[str] = []


class TailoredResumeResponse(BaseModel):
    tailored_content: Dict[str, Any]
    cover_letter: str
    ats_score: int
    added_keywords: List[str]
    changes: List[Dict[str, str]]
    improvement_notes: List[str]
