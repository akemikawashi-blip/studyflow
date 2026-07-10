@echo off
setlocal EnableExtensions EnableDelayedExpansion
title StudyFlow - One Click Setup and Start
cd /d "%~dp0"

set "PROJECT_REF=xuubragcavogbjlwsiia"
set "PROJECT_URL=https://xuubragcavogbjlwsiia.supabase.co"
set "SQL_EDITOR_URL=https://supabase.com/dashboard/project/xuubragcavogbjlwsiia/sql/b690c7ce-fd32-4b12-8236-376d8227a85c"
set "PROJECT_DASHBOARD_URL=https://supabase.com/dashboard/project/xuubragcavogbjlwsiia"
set "AUTH_CONFIG_URL=https://supabase.com/dashboard/project/xuubragcavogbjlwsiia/auth/url-configuration"
set "LOCAL_URL=http://localhost:3000"
set "SQL_FILE=%CD%\supabase\phase2-complete.sql"

cls
echo.
echo ============================================================
echo           STUDYFLOW - ONE CLICK SETUP AND START
echo ============================================================
echo.
echo Keep this window open and follow the displayed instructions.
echo On later runs, completed setup steps will be skipped.
echo.

if not exist "%CD%\package.json" goto :wrong_folder
if not exist "%SQL_FILE%" goto :missing_sql

call :check_node
if errorlevel 1 goto :end

call :database_setup
if errorlevel 1 goto :end

call :environment_setup
if errorlevel 1 goto :end

call :auth_setup
if errorlevel 1 goto :end

call :install_dependencies
if errorlevel 1 goto :end

call :start_application
goto :end

:check_node
echo [1/5] Checking Node.js and npm...
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js was not found.
  echo The official Node.js download page will now open.
  echo Install the LTS version, restart Windows, and double-click this file again.
  start "" "https://nodejs.org/en/download"
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo npm was not found. Reinstall the Node.js LTS version, restart Windows,
  echo and double-click this file again.
  pause
  exit /b 1
)

for /f "delims=" %%V in ('node -p "process.versions.node"') do set "NODE_VERSION=%%V"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { if ([version]$env:NODE_VERSION -ge [version]'20.9.0') { exit 0 } else { exit 1 } } catch { exit 1 }"
if errorlevel 1 (
  echo.
  echo Your Node.js version is !NODE_VERSION!.
  echo StudyFlow requires Node.js 20.9.0 or newer.
  echo Install the current LTS version, restart Windows, and run this file again.
  start "" "https://nodejs.org/en/download"
  pause
  exit /b 1
)

echo       Node.js !NODE_VERSION! is ready.
echo.
exit /b 0

:database_setup
if exist "%CD%\.studyflow-database-ready" (
  echo [2/5] Supabase database step is already marked complete.
  echo.
  exit /b 0
)

cls
echo.
echo ============================================================
echo STEP 2 OF 5 - CREATE THE SUPABASE DATABASE TABLES
echo ============================================================
echo.
echo This launcher will:
echo   1. Copy phase2-complete.sql to your clipboard.
echo   2. Open your Supabase SQL Editor.
echo   3. Open the SQL file in Notepad as a backup.
echo.
echo In Supabase:
echo   - Click inside the SQL editor.
echo   - Press Ctrl+V if the SQL is not already there.
echo   - Click Run.
echo   - Return here only after Supabase shows success.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { Get-Content -Raw -LiteralPath $env:SQL_FILE | Set-Clipboard; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  echo WARNING: The SQL could not be copied automatically.
  echo Copy it manually from the Notepad window.
) else (
  echo The complete SQL has been copied to your clipboard.
)

start "" "%SQL_EDITOR_URL%"
start "" notepad.exe "%SQL_FILE%"

echo.
choice /C YN /N /M "Did you click Run and receive a successful result? [Y/N]: "
if errorlevel 2 (
  echo.
  echo Database setup was not marked complete. Run this launcher again afterward.
  pause
  exit /b 1
)

> "%CD%\.studyflow-database-ready" echo Supabase SQL completed for %PROJECT_REF%
echo.
echo       Database setup marked complete.
echo.
exit /b 0

:environment_setup
if exist "%CD%\.env.local" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$p='.env.local'; try { $c=Get-Content -Raw -LiteralPath $p; if ($c -match 'NEXT_PUBLIC_SUPABASE_URL=https://xuubragcavogbjlwsiia[.]supabase[.]co' -and $c -match 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=.+') { exit 0 } else { exit 1 } } catch { exit 1 }"
  if not errorlevel 1 (
    echo [3/5] .env.local is already configured.
    echo.
    exit /b 0
  )
)

cls
echo.
echo ============================================================
echo STEP 3 OF 5 - CONNECT STUDYFLOW TO SUPABASE
echo ============================================================
echo.
echo Your project URL is already filled in:
echo %PROJECT_URL%
echo.
echo The Supabase project dashboard will open now.
echo Find the project's publishable key from Connect or Project Settings.
echo.
echo IMPORTANT:
echo   - Use the publishable key, often beginning with sb_publishable_.
echo   - Do not use the service_role or secret key.
echo   - Do not send your key in chat.
echo.
start "" "%PROJECT_DASHBOARD_URL%"

set "SF_KEY="
set /p "SF_KEY=Paste your Supabase publishable key here, then press Enter: "
if not defined SF_KEY (
  echo.
  echo No key was entered. .env.local was not created.
  pause
  exit /b 1
)

set "SF_URL=%PROJECT_URL%"
set "SF_SITE=%LOCAL_URL%"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $lines=@('NEXT_PUBLIC_SUPABASE_URL=' + $env:SF_URL, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=' + $env:SF_KEY, 'NEXT_PUBLIC_SITE_URL=' + $env:SF_SITE); [IO.File]::WriteAllLines('.env.local', $lines, [Text.UTF8Encoding]::new($false)); exit 0 } catch { Write-Host $_.Exception.Message; exit 1 }"
if errorlevel 1 (
  echo.
  echo ERROR: .env.local could not be created.
  pause
  exit /b 1
)

set "SF_KEY="
echo.
echo       .env.local was created successfully.
echo.
exit /b 0

:auth_setup
if exist "%CD%\.studyflow-auth-ready" (
  echo [4/5] Supabase authentication URLs are already marked complete.
  echo.
  exit /b 0
)

cls
echo.
echo ============================================================
echo STEP 4 OF 5 - CONFIGURE AUTHENTICATION URLS
echo ============================================================
echo.
echo The Supabase Authentication URL Configuration page will open.
echo Set these values:
echo.
echo Site URL:
echo   %LOCAL_URL%
echo.
echo Redirect URLs:
echo   %LOCAL_URL%/auth/callback
echo   %LOCAL_URL%/reset-password
echo.
echo Save the changes, then return to this window.
echo.
start "" "%AUTH_CONFIG_URL%"

choice /C YN /N /M "Did you save those authentication URL settings? [Y/N]: "
if errorlevel 2 (
  echo.
  echo Authentication setup was not marked complete.
  pause
  exit /b 1
)

> "%CD%\.studyflow-auth-ready" echo Authentication URLs completed for %PROJECT_REF%
echo.
echo       Authentication URL setup marked complete.
echo.
exit /b 0

:install_dependencies
if exist "%CD%\node_modules\.bin\next.cmd" (
  echo [5/5] App dependencies are already installed.
  echo.
  exit /b 0
)

echo [5/5] Installing StudyFlow dependencies...
echo This is required only on the first run or after node_modules is removed.
echo.
call npm install
if errorlevel 1 (
  echo.
  echo ERROR: npm install failed.
  echo Copy the complete error shown above and send it in chat.
  pause
  exit /b 1
)

echo.
echo       Dependencies installed successfully.
echo.
exit /b 0

:start_application
set "PORT_PID="
for /f "tokens=5" %%P in ('netstat -aon ^| findstr /R /C:":3000 .*LISTENING"') do set "PORT_PID=%%P"

if defined PORT_PID (
  echo StudyFlow or another local app is already using port 3000.
  echo Opening %LOCAL_URL% in your browser...
  start "" "%LOCAL_URL%"
  echo.
  pause
  exit /b 0
)

echo ============================================================
echo Starting StudyFlow...
echo ============================================================
echo.
echo A second terminal window will open for the StudyFlow server.
echo Keep that server window open while using the app.
echo.
start "StudyFlow Server - Keep This Window Open" cmd /k "cd /d ""%CD%"" && npm run dev -- -p 3000"

echo Waiting for the local server to initialize...
timeout /t 10 /nobreak >nul
start "" "%LOCAL_URL%"

echo.
echo StudyFlow has been opened in your browser.
echo Address: %LOCAL_URL%
echo.
echo For future use, simply double-click START-HERE-STUDYFLOW.bat again.
echo Completed setup steps will be skipped automatically.
echo.
pause
exit /b 0

:wrong_folder
cls
echo.
echo ERROR: package.json was not found beside this launcher.
echo.
echo Put START-HERE-STUDYFLOW.bat inside the extracted
echo studyflow-dynamic-phase2 folder, then double-click it again.
echo.
pause
exit /b 1

:missing_sql
cls
echo.
echo ERROR: supabase\phase2-complete.sql was not found.
echo Re-extract the complete StudyFlow ZIP and run this launcher again.
echo.
pause
exit /b 1

:end
endlocal
