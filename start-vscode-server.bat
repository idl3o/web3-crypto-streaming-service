@echo off
echo Starting VSCode Server for Web3 Crypto Streaming Service...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Error: Node.js is not installed or not in PATH.
  echo Please install Node.js from https://nodejs.org/
  pause
  exit /b 1
)

REM Check if code-server package is installed
if not exist node_modules\code-server (
  echo Installing code-server package...
  npm install code-server
)

REM Set environment variables (optional - edit as needed)
REM set VSCODE_SERVER_PORT=8000
REM set VSCODE_SERVER_HOST=0.0.0.0
REM set VSCODE_SERVER_LOG_LEVEL=info
REM set WITHOUT_CONNECTION_TOKEN=false
REM set OPEN_BROWSER=true

REM Start the VSCode server
node vscode-server.js

pause
