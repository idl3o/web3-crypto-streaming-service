#!/bin/bash

echo "🚀 Starting Safe Demo Mode..."

# Check environment
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "Download from: https://nodejs.org"
    exit 1
fi

# Create demo directory
echo "📁 Setting up demo environment..."
DEMO_DIR="demo-safe-run"
mkdir -p $DEMO_DIR
cd $DEMO_DIR

# Initialize safe environment
echo "🛡️ Initializing safe environment..."
npm init -y
npm install --save-dev typescript ts-node dotenv

# Start in safe mode
echo "🔒 Starting in safe mode (read-only)..."
export NODE_ENV=demo
export SAFE_MODE=true
export DEMO_PORT=3333

# Run demo
echo "✨ Running demo services..."
npx ts-node ../src/machine-runner.ts --demo --readonly

# Cleanup on exit
cleanup() {
    echo "🧹 Cleaning up demo environment..."
    cd ..
    rm -rf $DEMO_DIR
}

trap cleanup EXIT
