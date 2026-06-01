@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion
title AI Job Platform - Starting...

echo.
echo   ======================================================
echo     AI Job Application Automation Platform
echo   ======================================================
echo.

:: -----------------------------------------------------------------------
:: 1. Check Docker - auto-launch if not running
:: -----------------------------------------------------------------------
echo [1/6] Checking Docker...

docker info >nul 2>&1
if %errorlevel% equ 0 goto dockerok

echo   Docker is not running. Launching Docker Desktop...

set "DOCKER_EXE="
if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
    set "DOCKER_EXE=C:\Program Files\Docker\Docker\Docker Desktop.exe"
)
if not defined DOCKER_EXE (
    if exist "%LOCALAPPDATA%\Docker\Docker Desktop.exe" (
        set "DOCKER_EXE=%LOCALAPPDATA%\Docker\Docker Desktop.exe"
    )
)

if not defined DOCKER_EXE (
    echo   Docker Desktop not found. Download it from:
    echo   https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

start "" "!DOCKER_EXE!"
echo   Waiting for Docker engine (up to 90 seconds)...
set /a DOCKER_TRIES=18

:waitfordocker
timeout /t 5 /nobreak >nul
docker info >nul 2>&1
if %errorlevel% equ 0 goto dockerok
set /a DOCKER_TRIES-=1
<nul set /p ="." >con
if %DOCKER_TRIES% gtr 0 goto waitfordocker

echo.
echo   Docker did not start in time.
echo   Open Docker Desktop manually, wait for green status, then re-run start.bat
pause
exit /b 1

:dockerok
echo   [OK] Docker is running

:: -----------------------------------------------------------------------
:: 2. Create .env if missing
:: -----------------------------------------------------------------------
echo [2/6] Checking environment file...

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo   [!] .env created from .env.example
        echo       Add your OPENAI_API_KEY in .env for AI features.
    ) else (
        echo   [!] No .env file - using defaults
    )
) else (
    echo   [OK] .env found
)

:: -----------------------------------------------------------------------
:: 3. Create log directories
:: -----------------------------------------------------------------------
echo [3/6] Preparing directories...
if not exist "logs\api" mkdir "logs\api"
if not exist "logs\ai-service" mkdir "logs\ai-service"
echo   [OK] Directories ready

:: -----------------------------------------------------------------------
:: 4. Build and start all services
:: -----------------------------------------------------------------------
echo [4/6] Starting services with Docker Compose...
echo   First run builds images - takes 3 to 5 minutes
echo.

docker compose -f docker-compose.yml up -d --build
if %errorlevel% neq 0 (
    echo.
    echo   [FAIL] Docker Compose failed. See errors above.
    echo   Run:  docker compose logs --tail=50
    pause
    exit /b 1
)

:: -----------------------------------------------------------------------
:: 5. Wait for API health
:: -----------------------------------------------------------------------
echo.
echo [5/6] Waiting for API to be ready...
set /a HEALTH_TRIES=30

:healthloop
timeout /t 3 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:4000/api/health 2>nul | findstr "200 204" >nul 2>&1
if %errorlevel% equ 0 goto healthy
set /a HEALTH_TRIES-=1
<nul set /p ="." >con
if %HEALTH_TRIES% gtr 0 goto healthloop

echo.
echo   [!] Health check timed out - services may still be warming up
echo       Check: docker compose ps
goto tunnel

:healthy
echo.
echo   [OK] All services are up!

:: -----------------------------------------------------------------------
:: 6. Cloudflare tunnel - public shareable URL
:: -----------------------------------------------------------------------
:tunnel
echo.
echo [6/6] Creating public sharing URL (Cloudflare tunnel)...

where cloudflared >nul 2>&1
if %errorlevel% neq 0 (
    echo   [!] cloudflared not installed - skipping public URL
    echo       Install from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
    goto showurls
)

set "CF_OUT=%TEMP%\aijob_cf_out.txt"
if exist "%CF_OUT%" del "%CF_OUT%"

echo   Connecting... (up to 25 seconds)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-tunnel.ps1" > "%CF_OUT%" 2>nul

set "CF_URL="
if exist "%CF_OUT%" (
    set /p CF_URL= < "%CF_OUT%"
    set CF_URL=!CF_URL: =!
    set CF_URL=!CF_URL:	=!
)

:showurls
echo.
echo   ======================================================
echo     LOCAL URLs:
echo   ======================================================
echo.
echo     Web App       http://localhost:3000
echo     API           http://localhost:4000/api/v1
echo     API Docs      http://localhost:4000/api/docs
echo     AI Service    http://localhost:8000/docs
echo     Queue Monitor http://localhost:3002
echo.
echo   Logs:  docker compose logs -f api
echo   Stop:  stop.bat

if not defined CF_URL goto nourl
if "!CF_URL!"=="" goto nourl

echo.
echo   ======================================================
echo     PUBLIC URL (share this with anyone):
echo   ======================================================
echo.
echo     !CF_URL!
echo.
echo   Works until you stop Docker or restart start.bat.
echo   ======================================================
echo.
start "" "!CF_URL!"
goto end

:nourl
echo.
echo   [!] Could not get public URL. Run start-tunnel.ps1 manually.
echo.
start "" "http://localhost:3000"

:end
echo.
endlocal