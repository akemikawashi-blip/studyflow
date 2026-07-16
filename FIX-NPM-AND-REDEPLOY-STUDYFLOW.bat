@echo off
setlocal EnableExtensions EnableDelayedExpansion
title StudyFlow - Fix npm and Redeploy

cd /d "%~dp0"
set "BASE=%CD%"
set "PROJECT_PATH_FILE=%TEMP%\studyflow-fix-project-%RANDOM%.txt"

echo.
echo ============================================================
echo   StudyFlow - Fix Vercel npm Install and Redeploy
echo ============================================================
echo.

where powershell >nul 2>&1
if errorlevel 1 (
    echo ERROR: Windows PowerShell is unavailable.
    goto :failed
)

where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed.
    goto :failed
)

where npx >nul 2>&1
if errorlevel 1 (
    echo ERROR: npx is unavailable.
    goto :failed
)

echo [1/4] Finding the StudyFlow project...

set "BASE_ENV=%BASE%"
set "PROJECT_PATH_FILE_ENV=%PROJECT_PATH_FILE%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$base=$env:BASE_ENV;" ^
  "$pkg=$null;" ^
  "if(Test-Path -LiteralPath (Join-Path $base 'package.json')){" ^
  "  $pkg=Get-Item -LiteralPath (Join-Path $base 'package.json');" ^
  "} else {" ^
  "  $pkg=Get-ChildItem -LiteralPath $base -Filter package.json -File -Recurse -ErrorAction SilentlyContinue |" ^
  "    Where-Object { $_.FullName -notmatch '\\node_modules\\' } |" ^
  "    Sort-Object FullName | Select-Object -First 1;" ^
  "}" ^
  "if(-not $pkg){throw 'package.json was not found.'}" ^
  "Set-Content -LiteralPath $env:PROJECT_PATH_FILE_ENV -Value $pkg.Directory.FullName -NoNewline;" ^
  "Write-Host ('Project folder: ' + $pkg.Directory.FullName);"

if errorlevel 1 goto :failed

set "PROJECT="
set /p PROJECT=<"%PROJECT_PATH_FILE%"
del /q "%PROJECT_PATH_FILE%" >nul 2>&1

if not exist "%PROJECT%\package.json" (
    echo ERROR: The detected project folder is invalid.
    goto :failed
)

echo.
echo [2/4] Pinning Vercel to Node.js 20 and npm 10...

set "PROJECT_ENV=%PROJECT%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$project=$env:PROJECT_ENV;" ^
  "$packagePath=Join-Path $project 'package.json';" ^
  "$pkg=Get-Content -Raw -LiteralPath $packagePath | ConvertFrom-Json;" ^
  "$pkg | Add-Member -NotePropertyName engines -NotePropertyValue ([pscustomobject]@{node='20.x'}) -Force;" ^
  "$pkg | Add-Member -NotePropertyName packageManager -NotePropertyValue 'npm@10.9.2' -Force;" ^
  "$pkg | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $packagePath -Encoding UTF8;" ^
  "$lockPath=Join-Path $project 'package-lock.json';" ^
  "if(Test-Path -LiteralPath $lockPath){" ^
  "  $lock=Get-Content -Raw -LiteralPath $lockPath | ConvertFrom-Json;" ^
  "  if($lock.packages -and $lock.packages.PSObject.Properties.Name -contains ''){" ^
  "    $root=$lock.packages.'';" ^
  "    $root | Add-Member -NotePropertyName engines -NotePropertyValue ([pscustomobject]@{node='20.x'}) -Force;" ^
  "  }" ^
  "  $lock | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $lockPath -Encoding UTF8;" ^
  "}" ^
  "$vercel=[ordered]@{'$schema'='https://openapi.vercel.sh/vercel.json'; installCommand='npm ci --no-audit --no-fund'};" ^
  "$vercel | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $project 'vercel.json') -Encoding UTF8;" ^
  "@('registry=https://registry.npmjs.org/','audit=false','fund=false') | Set-Content -LiteralPath (Join-Path $project '.npmrc') -Encoding ASCII;" ^
  "Remove-Item -LiteralPath (Join-Path $project '.next') -Recurse -Force -ErrorAction SilentlyContinue;"

if errorlevel 1 goto :failed

echo Node.js is now pinned to 20.x.
echo npm is now pinned to 10.9.2.
echo Vercel install command is now npm ci.

cd /d "%PROJECT%"

echo.
echo [3/4] Checking Vercel connection...

call npx --yes vercel@latest whoami >nul 2>&1
if errorlevel 1 (
    echo Vercel login is required.
    call npx --yes vercel@latest login
    if errorlevel 1 goto :failed
)

if not exist ".vercel\project.json" (
    echo Select your EXISTING StudyFlow project.
    call npx --yes vercel@latest link
    if errorlevel 1 goto :failed
)

echo.
echo [4/4] Redeploying to production with a clean build...
echo.

call npx --yes vercel@latest deploy --prod --yes --force
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo   DEPLOYMENT COMPLETED SUCCESSFULLY
echo ============================================================
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo   FIX OR DEPLOYMENT FAILED
echo ============================================================
echo.
echo Read the last error shown above.
echo Your previous working production deployment remains unchanged.
echo.
pause
exit /b 1
