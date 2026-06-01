from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.resume_models import ParseResumeRequest, ParsedResumeResponse, TailorResumeRequest, TailoredResumeResponse
from app.services.resume_parser import parse_resume
from app.services.resume_tailor import tailor_resume
import structlog

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.post("/parse-resume", response_model=ParsedResumeResponse)
async def parse_resume_endpoint(request: ParseResumeRequest):
    """Parse a resume and extract structured profile data."""
    try:
        logger.info("Resume parse request", resume_id=request.resume_id)
        result = await parse_resume(request.file_url, request.format)
        logger.info("Resume parsed successfully", resume_id=request.resume_id, skills_count=len(result.skills))
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error("Resume parsing failed", resume_id=request.resume_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Resume parsing failed: {str(e)}")


@router.post("/tailor-resume", response_model=TailoredResumeResponse)
async def tailor_resume_endpoint(request: TailorResumeRequest):
    """Tailor a resume for a specific job and generate a cover letter."""
    try:
        result = await tailor_resume(
            request.parsed_profile,
            request.job_description,
            request.job_requirements,
            request.job_skills,
        )
        return result
    except Exception as e:
        logger.error("Resume tailoring failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Resume tailoring failed: {str(e)}")
