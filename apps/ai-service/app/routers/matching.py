from fastapi import APIRouter, HTTPException
from app.models.matching_models import JobMatchRequest, JobMatchResponse
from app.services.job_matcher import score_job_match
import structlog

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.post("/score-job-match", response_model=JobMatchResponse)
async def score_job_match_endpoint(request: JobMatchRequest):
    """Score the match between a user profile and a job posting."""
    try:
        result = await score_job_match(request)
        logger.info("Job scored", job_id=request.job.get("id"), score=result.overall_score)
        return result
    except Exception as e:
        logger.error("Job scoring failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Job scoring failed: {str(e)}")
