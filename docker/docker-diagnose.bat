@echo off
echo Docker Diagnostics Tool for Web3 Crypto Streaming Service
echo ===========================================================
echo.

REM Add error checking for critical files
set DIAGNOSE_EXE="C:\Program Files\Docker\Docker\resources\com.docker.diagnose.exe"
if not exist %DIAGNOSE_EXE% (
    echo ERROR: Docker diagnostic executable not found at %DIAGNOSE_EXE%
    echo Please ensure Docker Desktop is properly installed.
    pause
    exit /b 1
)

REM Validate and sanitize output path
set OUTPUT_DIR=%~dp0..\logs\diagnostics
set OUTPUT_DIR=%OUTPUT_DIR:"=%
if "%OUTPUT_DIR%"=="" (
    set OUTPUT_DIR=%~dp0..\logs\diagnostics
)

REM Create timestamp with better error handling
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "TIMESTAMP=%dt:~0,4%%dt:~4,2%%dt:~6,2%-%dt:~8,2%%dt:~10,2%%dt:~12,2%"
if "%TIMESTAMP%"=="" (
    set TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%-%time:~0,2%%time:~3,2%%time:~6,2%
    set TIMESTAMP=%TIMESTAMP: =0%
)

REM Ensure output directory exists with error handling
if not exist "%OUTPUT_DIR%" (
    mkdir "%OUTPUT_DIR%" 2>nul
    if errorlevel 1 (
        echo ERROR: Could not create output directory
        pause
        exit /b 1
    )
)

echo Available options:
echo 1. Gather diagnostics locally
echo 2. Upload diagnostics to Docker (for support)
echo 3. Run Docker health checks
echo 4. Run full PowerShell diagnostics script
echo.
set /p OPTION="Select option (1-4): "

REM Add timeout variable
set TIMEOUT=60

if "%OPTION%"=="1" (
    echo Gathering diagnostics locally...
    %DIAGNOSE_EXE% gather -output "%OUTPUT_DIR%\docker-diagnostics-%TIMESTAMP%.zip"
    if errorlevel 1 (
        echo ERROR: Diagnostic gathering failed with code %errorlevel%
        pause
        exit /b %errorlevel%
    )
    echo Diagnostics saved to: %OUTPUT_DIR%\docker-diagnostics-%TIMESTAMP%.zip
) else if "%OPTION%"=="2" (
    echo Uploading diagnostics to Docker...
    %DIAGNOSE_EXE% gather -upload
    if errorlevel 1 (
        echo ERROR: Diagnostic upload failed with code %errorlevel%
        pause
        exit /b %errorlevel%
    )
    echo Share the ID above with Docker support for assistance.
) else if "%OPTION%"=="3" (
    echo Running Docker health checks...
    REM Add error handling for redirected output
    %DIAGNOSE_EXE% check > "%OUTPUT_DIR%\docker-health-check-%TIMESTAMP%.txt" 2>&1
    if errorlevel 1 (
        echo WARNING: Health check completed with warnings or errors.
    )
    echo Health check results saved to: %OUTPUT_DIR%\docker-health-check-%TIMESTAMP%.txt
    echo.
    echo Health check summary:
    %DIAGNOSE_EXE% check
) else if "%OPTION%"=="4" (
    echo Running full PowerShell diagnostics script...
    REM Add execution policy and error handling
    PowerShell -ExecutionPolicy Bypass -File "%~dp0..\tools\docker-diagnostics.ps1" -ErrorAction Stop
    if errorlevel 1 (
        echo ERROR: PowerShell diagnostics failed with code %errorlevel%
        pause
        exit /b %errorlevel%
    )
) else (
    echo Invalid option selected.
    exit /b 1
)

echo.
echo Diagnostics collection complete.
pause
