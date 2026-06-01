@echo off
chcp 65001 >nul 2>&1
setlocal
title AI Job Platform - Stopping...

echo.
echo   AI Job Platform - Stopping all services
echo.

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo   Docker not running - nothing to stop.
    goto end
)

echo   Stopping containers...

if "%1"=="--clean" (
    echo   --clean flag: removing volumes (database data will be deleted!)
    docker compose -f docker-compose.yml down -v --remove-orphans
    echo   Containers and volumes removed
) else (
    docker compose -f docker-compose.yml down --remove-orphans
    echo   Containers stopped (data preserved)
    echo   Tip: run "stop.bat --clean" to also wipe volumes
)

:end
echo.
endlocal