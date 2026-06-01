@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion
title AI Job Platform - Dev Mode

echo.
echo   AI Job Platform - Dev Mode (native / no-Docker for apps)
echo   Starts infra in Docker, apps natively via pnpm
echo.

:: Prerequisites
echo [1/5] Checking prerequisites...

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo   Docker not running (needed for Postgres + Redis)
    pause
    exit /b 1
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   Node.js not found. Install Node 20+
    pause
    exit /b 1
)

where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo   Installing pnpm...
    npm install -g pnpm@9
)

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo   Python not found - AI service will not start natively
    set "SKIP_PYTHON=1"
)

echo   Prerequisites OK

:: .env
echo [2/5] Checking .env...
if not exist ".env" (
    copy ".env.example" ".env" >nul 2>&1
    echo   .env created from .env.example - add your API keys!
) else (
    echo   .env found
)

:: Start only infra containers
echo [3/5] Starting infrastructure (Postgres, Redis)...
docker compose -f docker-compose.yml up -d postgres redis bull-board
if %errorlevel% neq 0 (
    echo   Failed to start infra containers
    pause
    exit /b 1
)
echo   Postgres + Redis running

echo   Waiting for Postgres to be ready...
:pgwait
docker exec aijob-postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 2 /nobreak >nul
    goto pgwait
)
echo   Postgres ready

:: Install dependencies
echo [4/5] Installing Node dependencies...
call pnpm install
echo   Dependencies installed

echo   Running database migrations...
call pnpm db:migrate
echo   Migrations applied

:: Start AI service
echo [5/5] Starting application services...

if not defined SKIP_PYTHON (
    if not exist "apps\ai-service\venv" (
        echo   Creating Python venv...
        python -m venv apps\ai-service\venv
        call apps\ai-service\venv\Scripts\activate.bat
        pip install -r apps\ai-service\requirements.txt -q
    )
    start "AI Service (port 8000)" cmd /k "cd apps\ai-service && venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    echo   AI Service starting in new window
) else (
    echo   Skipping AI service (Python not found)
)

start "API + Web (ports 4000 / 3000)" cmd /k "pnpm dev"
echo   API + Web starting in new window

echo.
timeout /t 4 /nobreak >nul
echo.
echo   ======================================================
echo     Dev servers starting at:
echo   ======================================================
echo     Web App        http://localhost:3000
echo     API            http://localhost:4000/api/v1
echo     API Docs       http://localhost:4000/api/docs
echo     AI Service     http://localhost:8000
echo     AI Docs        http://localhost:8000/docs
echo     Queue Monitor  http://localhost:3002
echo     DB Studio      run: pnpm db:studio  then  http://localhost:5555
echo   ======================================================
echo.
echo   Hot-reload is active for API and Web.
echo   Stop infra:  docker compose down postgres redis
echo.

start "" "http://localhost:3000"
endlocal