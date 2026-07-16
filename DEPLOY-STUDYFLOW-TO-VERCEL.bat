@echo off
setlocal EnableExtensions
title StudyFlow - Deploy to Vercel

cd /d "%~dp0"

echo.
echo ==============================================
echo   StudyFlow production deployment to Vercel
echo ==============================================
echo.

if not exist "package.json" (
  echo ERROR: package.json was not found.
  echo Keep this BAT file inside the StudyFlow project folder.
  goto :failed
)

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  echo Install Node.js LTS from https://nodejs.org/ and run this file again.
  goto :failed
)

where npx >nul 2>&1
if errorlevel 1 (
  echo ERROR: npx is unavailable. Reinstall Node.js LTS and try again.
  goto :failed
)

echo [1/3] Checking Vercel login...
call npx --yes vercel@latest whoami >nul 2>&1
if errorlevel 1 (
  echo.
  echo A one-time Vercel login is required.
  call npx --yes vercel@latest login
  if errorlevel 1 goto :failed
)

echo.
echo [2/3] Linking the existing taskmanager project...
if not exist ".vercel\project.json" (
  call npx --yes vercel@latest link --yes --project taskmanager
  if errorlevel 1 (
    echo.
    echo Automatic project linking did not find "taskmanager".
    echo Select the existing project that uses taskmanager-gray-zeta.vercel.app.
    call npx --yes vercel@latest link
    if errorlevel 1 goto :failed
  )
) else (
  echo Existing Vercel project link found.
)

echo.
echo [3/3] Deploying the fixed version to production...
call npx --yes vercel@latest deploy --prod --yes > "VERCEL-DEPLOYMENT-URL.txt"
if errorlevel 1 goto :failed

set "DEPLOYMENT_URL="
set /p DEPLOYMENT_URL=<"VERCEL-DEPLOYMENT-URL.txt"

echo.
echo ==============================================
echo   DEPLOYMENT COMPLETED SUCCESSFULLY
echo ==============================================
echo.
echo Production URL: %DEPLOYMENT_URL%
echo The URL is also saved in VERCEL-DEPLOYMENT-URL.txt
echo.
pause
exit /b 0

:failed
echo.
echo ==============================================
echo   DEPLOYMENT FAILED
echo ==============================================
echo Check the error shown above, then run this file again.
echo.
pause
exit /b 1
