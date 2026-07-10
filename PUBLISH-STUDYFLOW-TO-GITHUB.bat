@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"
title StudyFlow - Publish to GitHub

set "DEFAULT_OWNER=Darksiam-guff"
set "DEFAULT_REPO=studyflow"

echo ================================================================
echo   STUDYFLOW - PUBLISH TO GITHUB
echo ================================================================
echo.

if not exist "package.json" (
  echo ERROR: package.json was not found.
  echo Keep this launcher inside the extracted StudyFlow project folder.
  pause
  exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed yet.
  echo A browser will open to the official Git for Windows download page.
  start "" "https://git-scm.com/download/win"
  echo Install Git, restart Windows, and run this file again.
  pause
  exit /b 1
)

set "OWNER=%DEFAULT_OWNER%"
set /p "OWNER=GitHub username [%DEFAULT_OWNER%]: "
if not defined OWNER set "OWNER=%DEFAULT_OWNER%"

set "REPO=%DEFAULT_REPO%"
set /p "REPO=Repository name [%DEFAULT_REPO%]: "
if not defined REPO set "REPO=%DEFAULT_REPO%"

for /f "delims=" %%A in ('git config --get user.name 2^>nul') do set "GIT_NAME=%%A"
if not defined GIT_NAME git config user.name "%OWNER%"
for /f "delims=" %%A in ('git config --get user.email 2^>nul') do set "GIT_EMAIL=%%A"
if not defined GIT_EMAIL git config user.email "%OWNER%@users.noreply.github.com"

if not exist ".git" git init

git add .
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Publish StudyFlow production app"
) else (
  echo No new files need committing.
)

git branch -M main

where gh >nul 2>nul
if not errorlevel 1 goto USE_GH

echo.
echo GitHub CLI is not installed, so one browser step is required.
echo Create a new EMPTY repository named: %REPO%
echo Do not add a README, .gitignore, or license on GitHub.
start "" "https://github.com/new"
echo.
choice /C YN /N /M "Did you create the empty repository? [Y/N]: "
if errorlevel 2 exit /b 1

git remote remove origin >nul 2>nul
git remote add origin "https://github.com/%OWNER%/%REPO%.git"
echo.
echo GitHub may open a browser sign-in window.
git push -u origin main
if errorlevel 1 (
  echo.
  echo ERROR: GitHub push failed.
  echo Confirm the empty repository exists at:
  echo https://github.com/%OWNER%/%REPO%
  pause
  exit /b 1
)
goto SUCCESS

:USE_GH
echo.
echo GitHub CLI detected.
gh auth status >nul 2>nul
if errorlevel 1 gh auth login --web

gh repo view "%OWNER%/%REPO%" >nul 2>nul
if errorlevel 1 (
  gh repo create "%OWNER%/%REPO%" --public --source=. --remote=origin --push
) else (
  git remote remove origin >nul 2>nul
  git remote add origin "https://github.com/%OWNER%/%REPO%.git"
  git push -u origin main
)
if errorlevel 1 (
  echo ERROR: GitHub publishing failed.
  pause
  exit /b 1
)

:SUCCESS
echo.
echo ================================================================
echo   SUCCESS - STUDYFLOW IS ON GITHUB
echo ================================================================
echo https://github.com/%OWNER%/%REPO%
echo.
echo Vercel will now open. Import this repository and add the two
 echo NEXT_PUBLIC_SUPABASE environment variables from DEPLOYMENT-GUIDE.md.
start "" "https://vercel.com/new"
start "" "https://github.com/%OWNER%/%REPO%"
echo.
pause
