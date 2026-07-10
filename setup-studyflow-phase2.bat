@echo off
setlocal EnableExtensions
title StudyFlow Phase 2 Setup

cd /d "%~dp0"

echo.
echo ============================================
echo       StudyFlow Dynamic Core Setup
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or is not available in PATH.
  echo Install the Node.js LTS release, restart Windows, and try again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm is not available in PATH.
  echo Reinstall Node.js LTS, restart Windows, and try again.
  pause
  exit /b 1
)

if not exist package.json (
  echo ERROR: package.json was not found.
  echo Run this file from inside the extracted StudyFlow Phase 2 folder.
  pause
  exit /b 1
)

if not exist .env.local (
  echo Enter the two PUBLIC values from your Supabase project.
  echo Do not enter a service-role secret.
  echo.
  set /p SF_URL=Supabase project URL: 
  set /p SF_KEY=Supabase publishable key: 

  if "%SF_URL%"=="" (
    echo ERROR: Project URL is required.
    pause
    exit /b 1
  )

  if "%SF_KEY%"=="" (
    echo ERROR: Publishable key is required.
    pause
    exit /b 1
  )

  set "SF_SITE=http://localhost:3000"
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "[IO.File]::WriteAllLines('.env.local', @('NEXT_PUBLIC_SUPABASE_URL=' + $env:SF_URL, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=' + $env:SF_KEY, 'NEXT_PUBLIC_SITE_URL=' + $env:SF_SITE), [Text.UTF8Encoding]::new($false))"

  if errorlevel 1 (
    echo ERROR: .env.local could not be created.
    pause
    exit /b 1
  )
)

echo.
echo IMPORTANT DATABASE STEP:
echo Open supabase\phase2-complete.sql and run the whole file in the
echo Supabase SQL Editor before creating your first account.
echo.
pause

echo Installing dependencies...
call npm install
if errorlevel 1 (
  echo.
  echo ERROR: npm install failed. Send the complete terminal error in the chat.
  pause
  exit /b 1
)

echo.
echo Starting StudyFlow...
start "StudyFlow Phase 2" cmd /k "cd /d ""%CD%"" && npm run dev"

timeout /t 10 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo StudyFlow started. Keep the new terminal window open.
pause
endlocal
