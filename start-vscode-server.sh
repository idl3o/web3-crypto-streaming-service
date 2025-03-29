#!/bin/bash

echo "Starting VSCode Server for Web3 Crypto Streaming Service..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed or not in PATH."
  echo "Please install Node.js from https://nodejs.org/"
  exit 1
fi

# Check if code-server package is installed
if [ ! -d "./node_modules/code-server" ]; then
  echo "Installing code-server package..."
  npm install code-server
fi

# Set environment variables (optional - uncomment and edit as needed)
# export VSCODE_SERVER_PORT=8000
# export VSCODE_SERVER_HOST=0.0.0.0
# export VSCODE_SERVER_LOG_LEVEL=info
# export WITHOUT_CONNECTION_TOKEN=false
# export OPEN_BROWSER=true

# Make script executable
chmod +x ./vscode-server.js

# Start the VSCode server
node vscode-server.js
