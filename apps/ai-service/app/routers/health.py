from fastapi import APIRouter
import os

router = APIRouter()


@router.get("")
async def health_check():
    return {"status": "healthy", "service": "ai-service", "env": os.getenv("NODE_ENV", "development")}
