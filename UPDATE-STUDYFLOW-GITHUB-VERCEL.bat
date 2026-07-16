@echo off
setlocal EnableExtensions EnableDelayedExpansion
title StudyFlow - Update GitHub and Vercel

rem ================================================================
rem  StudyFlow one-click updater
rem  1. Extracts the newest StudyFlow ZIP (or a ZIP dragged onto it)
rem  2. Merges it into https://github.com/Touhid76/studyflow
rem  3. Checks the Schedule files and performs a production build
rem  4. Commits and pushes to GitHub main
rem  5. Deploys directly to the existing Vercel project
rem ================================================================

cd /d "%~dp0"
set "BASE=%CD%"
if not defined SystemRoot set "SystemRoot=%windir%"
set "WINDOWS_TOOLS=%SystemRoot%\System32"
set "WHERE_EXE=%WINDOWS_TOOLS%\where.exe"
set "TAR_EXE=%WINDOWS_TOOLS%\tar.exe"
set "ROBOCOPY_EXE=%WINDOWS_TOOLS%\robocopy.exe"
set "CLIP_EXE=%WINDOWS_TOOLS%\clip.exe"
set "REPO_URL=https://github.com/Touhid76/studyflow.git"
set "REPO_WEB=https://github.com/Touhid76/studyflow"
set "VERCEL_PROJECT=taskmanager"
set "APP_URL=https://taskmanager-gray-zeta.vercel.app/"
set "WORK=%TEMP%\StudyFlowUpdate-%RANDOM%-%RANDOM%"
set "EXTRACT=%WORK%\extracted"
set "REPO=%WORK%\repository"
set "ZIP_FILE=%~1"

echo.
echo ================================================================
echo   STUDYFLOW - AUTOMATIC GITHUB AND VERCEL UPDATE
echo ================================================================
echo.

call :require_command git "Git for Windows"
if errorlevel 1 goto :failed
call :require_command node "Node.js"
if errorlevel 1 goto :failed
call :require_command npm "npm"
if errorlevel 1 goto :failed
call :require_command npx "npx"
if errorlevel 1 goto :failed

if not exist "%TAR_EXE%" (
  echo ERROR: Windows ZIP tool was not found at:
  echo %TAR_EXE%
  echo Install current Windows updates and run this BAT again.
  goto :failed
)
if not exist "%ROBOCOPY_EXE%" (
  echo ERROR: Windows Robocopy was not found at:
  echo %ROBOCOPY_EXE%
  goto :failed
)

node -e "const [major,minor]=process.versions.node.split('.').map(Number);process.exit(major>20||(major===20&&minor>=9)?0:1)" >nul 2>&1
if errorlevel 1 (
  echo ERROR: StudyFlow needs Node.js 20.9 or newer.
  echo Install a current Node.js version from https://nodejs.org/
  start "" "https://nodejs.org/en/download"
  goto :failed
)

if not exist "%WORK%" mkdir "%WORK%"
if errorlevel 1 (
  echo ERROR: Could not create the temporary work folder.
  goto :failed
)
mkdir "%EXTRACT%" >nul 2>&1

if defined ZIP_FILE if not exist "%ZIP_FILE%" (
  echo ERROR: The supplied ZIP file does not exist:
  echo %ZIP_FILE%
  goto :failed
)

if not defined ZIP_FILE (
  echo [1/8] Finding the newest StudyFlow ZIP beside this BAT file...
  for /f "delims=" %%F in ('dir /b /a-d /o-d "%BASE%\*studyflow*.zip" 2^>nul') do (
    if not defined ZIP_FILE set "ZIP_FILE=%BASE%\%%F"
  )
  if not defined ZIP_FILE (
    echo ERROR: No StudyFlow ZIP was found beside this BAT file.
    echo Put this BAT file beside your updated ZIP, or drag the ZIP onto it.
    goto :failed
  )
) else (
  echo [1/8] Using the ZIP dragged onto this BAT file...
)

echo ZIP: %ZIP_FILE%
echo.
echo [2/8] Extracting and locating the updated project...
"%TAR_EXE%" -xf "%ZIP_FILE%" -C "%EXTRACT%"
if errorlevel 1 (
  echo ERROR: Windows could not extract the ZIP file.
  goto :failed
)

set "SOURCE="
for /r "%EXTRACT%" %%F in (package.json) do (
  if not defined SOURCE (
    node -e "try{process.exit(require(process.argv[1]).name==='studyflow'?0:1)}catch(e){process.exit(1)}" "%%F" >nul 2>&1
    if not errorlevel 1 set "SOURCE=%%~dpF"
  )
)
if not defined SOURCE (
  echo ERROR: A StudyFlow package.json was not found inside the ZIP.
  goto :failed
)
if not exist "%SOURCE%package.json" (
  echo ERROR: The extracted project is invalid.
  goto :failed
)
echo Project: %SOURCE%

echo.
echo [3/8] Downloading the current GitHub main branch...
git clone --branch main --single-branch "%REPO_URL%" "%REPO%"
if errorlevel 1 (
  echo.
  echo ERROR: The GitHub repository could not be downloaded.
  echo Confirm that the repository exists and your internet connection works.
  goto :failed
)

echo.
echo [4/8] Merging the ZIP update without deleting existing PWA files...
rem SOURCE ends with a backslash; the dot prevents it from escaping the closing quote.
"%ROBOCOPY_EXE%" "%SOURCE%." "%REPO%" /E /COPY:DAT /DCOPY:DAT /R:2 /W:1 /XJ /NP /NFL /NDL ^
  /XD ".git" "node_modules" ".next" ".vercel" ^
  /XF ".env" ".env.local" ".env.production" ".env.development" ".env.test" "*.log" "VERCEL-DEPLOYMENT-URL.txt"
set "ROBOCOPY_CODE=!ERRORLEVEL!"
if !ROBOCOPY_CODE! GEQ 8 (
  echo ERROR: Copying the updated files failed. Robocopy code: !ROBOCOPY_CODE!
  goto :failed
)

copy /Y "%~f0" "%REPO%\UPDATE-STUDYFLOW-GITHUB-VERCEL.bat" >nul

for %%F in (
  "src\app\(protected)\app\schedule\page.tsx"
  "src\features\schedule\actions\schedule-actions.ts"
  "src\features\schedule\components\schedule-manager.tsx"
  "src\features\schedule\schemas\schedule.ts"
  "supabase\phase3-academic-tools.sql"
) do (
  if not exist "%REPO%\%%~F" (
    echo ERROR: Required updated file is missing: %%~F
    goto :failed
  )
)

for /r "%REPO%" %%F in (.env .env.local .env.production .env.development .env.test) do (
  if exist "%%F" (
    echo ERROR: A private environment file was found and will not be uploaded:
    echo %%F
    goto :failed
  )
)

echo Schedule, Academic, Export, and database migration files were found.

echo.
echo [5/8] Installing packages and checking the production build...
pushd "%REPO%"
echo Repairing private package URLs in package-lock.json...
node -e "const fs=require('fs');const p='package-lock.json';const from='https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/';const to='https://registry.npmjs.org/';let s=fs.readFileSync(p,'utf8');const count=s.split(from).length-1;s=s.split(from).join(to);fs.writeFileSync(p,s);console.log('Replaced '+count+' private package URL(s).');"
if errorlevel 1 (
  popd
  echo ERROR: package-lock.json could not be repaired.
  goto :failed
)

set "NPM_CONFIG_REGISTRY=https://registry.npmjs.org/"
call npm ci --no-audit --no-fund --registry=https://registry.npmjs.org/
if errorlevel 1 (
  popd
  echo ERROR: npm install failed. Nothing has been pushed to GitHub.
  goto :failed
)

set "NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co"
set "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_example_for_build_only"
set "NEXT_PUBLIC_SITE_URL=https://example.com"

call npm run typecheck
if errorlevel 1 (
  popd
  echo ERROR: TypeScript checking failed. Nothing has been pushed to GitHub.
  goto :failed
)

call npm run build
if errorlevel 1 (
  popd
  echo ERROR: The production build failed. Nothing has been pushed to GitHub.
  goto :failed
)
popd

rem Do not let the placeholder values used for the local build reach Vercel.
set "NEXT_PUBLIC_SUPABASE_URL="
set "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="
set "NEXT_PUBLIC_SITE_URL="

echo.
echo [6/8] Committing and pushing the update to GitHub main...
pushd "%REPO%"
for /f "delims=" %%A in ('git config --get user.name 2^>nul') do set "GIT_NAME=%%A"
if not defined GIT_NAME git config user.name "Touhid76"
for /f "delims=" %%A in ('git config --get user.email 2^>nul') do set "GIT_EMAIL=%%A"
if not defined GIT_EMAIL git config user.email "Touhid76@users.noreply.github.com"

git add -A
git diff --cached --quiet
if errorlevel 1 (
  echo Files ready to publish:
  git diff --cached --stat
  git commit -m "Restore Schedule and publish updated StudyFlow modules"
  if errorlevel 1 (
    popd
    goto :failed
  )

  git push origin main
  if errorlevel 1 (
    "%WHERE_EXE%" gh >nul 2>&1
    if not errorlevel 1 (
      echo GitHub login is required. A browser window may open.
      gh auth login --web
      if not errorlevel 1 gh auth setup-git
      git push origin main
    )
  )
  if errorlevel 1 (
    popd
    echo ERROR: GitHub push failed. Sign in with the Touhid76 account and run again.
    goto :failed
  )
) else (
  echo GitHub already contains the same files; no new commit was needed.
)
popd

echo.
echo [7/8] Linking and deploying the existing Vercel production project...
pushd "%REPO%"
call npx --yes vercel@latest whoami >nul 2>&1
if errorlevel 1 (
  echo A one-time Vercel login is required.
  call npx --yes vercel@latest login
  if errorlevel 1 (
    popd
    goto :failed
  )
)

if not exist ".vercel\project.json" (
  call npx --yes vercel@latest link --yes --project "%VERCEL_PROJECT%"
  if errorlevel 1 (
    echo Automatic linking could not find "%VERCEL_PROJECT%".
    echo Select the EXISTING project for %APP_URL%
    call npx --yes vercel@latest link
    if errorlevel 1 (
      popd
      goto :failed
    )
  )
)

call npx --yes vercel@latest deploy --prod --yes --force
if errorlevel 1 (
  popd
  echo ERROR: GitHub was updated, but the direct Vercel deployment failed.
  echo Open the Vercel dashboard, check the build log, and redeploy the newest commit.
  goto :failed
)
popd

echo.
echo [8/8] Preparing the one-time Supabase database upgrade...
if not exist "%CLIP_EXE%" (
  echo The SQL could not be copied automatically.
) else (
  "%CLIP_EXE%" < "%REPO%\supabase\phase3-academic-tools.sql"
  if errorlevel 1 (
    echo The SQL could not be copied automatically.
  ) else (
    echo The required Phase 3 SQL is now copied to your clipboard.
  )
)

echo.
echo ================================================================
echo   CODE AND VERCEL DEPLOYMENT COMPLETED
echo ================================================================
echo.
echo GitHub: %REPO_WEB%
echo App:    %APP_URL%
echo.
echo IMPORTANT - ONE-TIME DATABASE STEP:
echo Open Supabase - SQL Editor, create a new query, paste the SQL that
echo is already on your clipboard, and click Run. Schedule and GPA need
echo those new database tables. Do not paste any password or secret key.
echo.
set "OPEN_NOW="
set /p "OPEN_NOW=Open Supabase and the live app now? [Y/N]: "
if /I "!OPEN_NOW!"=="Y" (
  start "" "https://supabase.com/dashboard/projects"
  start "" "%APP_URL%"
  start "" "%REPO_WEB%"
)

if exist "%WORK%" rmdir /S /Q "%WORK%"
echo.
echo Finished successfully.
pause
exit /b 0

:require_command
if exist "%WHERE_EXE%" (
  "%WHERE_EXE%" %~1 >nul 2>&1
) else (
  where %~1 >nul 2>&1
)
if errorlevel 1 (
  echo ERROR: %~2 is not installed or is not available in PATH.
  if /I "%~1"=="git" start "" "https://git-scm.com/download/win"
  if /I "%~1"=="node" start "" "https://nodejs.org/en/download"
  exit /b 1
)
exit /b 0

:failed
echo.
echo ================================================================
echo   UPDATE STOPPED
echo ================================================================
echo The previous live Vercel deployment was not deleted.
if defined WORK if exist "%WORK%" echo Temporary diagnostic folder: %WORK%
echo Read the last ERROR above, fix it, and run this BAT again.
echo.
pause
exit /b 1
