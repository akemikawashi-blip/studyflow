@echo off
setlocal
cd /d "%~dp0"
if not exist package.json (
  echo ERROR: package.json was not found.
  pause
  exit /b 1
)
if not exist .env.local (
  echo ERROR: .env.local is missing. Run setup-studyflow-phase2.bat first.
  pause
  exit /b 1
)
start "StudyFlow" cmd /k "cd /d ""%CD%"" && npm run dev"
timeout /t 8 /nobreak >nul
start "" "http://localhost:3000"
endlocal
