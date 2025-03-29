@echo off
echo 🚀 Starting Web3 Crypto Streaming Service...

REM Check Node.js installation
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is required but not installed.
    echo Download from: https://nodejs.org
    exit /b 1
)

REM Set environment
set NODE_ENV=development
set DEBUG=true
set PORT=3000

echo 📦 Installing dependencies...
call npm install

echo 🔧 Building project...
call npm run build

echo 🌟 Starting services...
start /B cmd /c "npm run farm:start"
timeout /t 2 /nobreak >nul
start /B cmd /c "npm run start:local"
timeout /t 2 /nobreak >nul
start /B cmd /c "npm run machine:start"

echo ✨ System ready!
echo 🌐 Dashboard: http://localhost:3000
echo 📊 Metrics: http://localhost:5500
echo 🔌 WebSocket: ws://localhost:8080

cmd /k
