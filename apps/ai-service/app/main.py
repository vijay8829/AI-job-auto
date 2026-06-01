from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import structlog
import os

from app.routers import resume, matching, generation, health
from app.utils.logging import setup_logging

setup_logging()
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI Service starting", env=os.getenv("NODE_ENV", "development"))
    yield
    logger.info("AI Service shutting down")


app = FastAPI(
    title="AI Job Platform — AI Service",
    description="Resume parsing, job matching, resume optimization, and cover letter generation",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:4000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(resume.router, prefix="/ai", tags=["resume"])
app.include_router(matching.router, prefix="/ai", tags=["matching"])
app.include_router(generation.router, prefix="/ai", tags=["generation"])
