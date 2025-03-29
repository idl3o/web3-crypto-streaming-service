@echo off
echo ========================================
echo  Web3 Crypto Streaming Service Launcher
echo ========================================
echo.

echo Checking environment...
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Error: Node.js and npm are required but not found in PATH
  echo Please install Node.js from https://nodejs.org/
  goto :error
)

echo Checking for dependencies...
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if %ERRORLEVEL% NEQ 0 goto :error
)

echo Building application...
call npm run build
if %ERRORLEVEL% NEQ 0 goto :error

echo Starting server...
echo.
echo Server will be available at http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
call node launcher.js
goto :eof

:error
echo.
echo Error occurred during startup!
echo Please check the logs above for more information.
pause
exit /b %ERRORLEVEL%
