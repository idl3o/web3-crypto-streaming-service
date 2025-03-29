#!/bin/bash

# Exit on error
set -e

echo "Setting up Android build environment..."

# Check if capacitor.config.ts exists
if [ ! -f "./capacitor.config.ts" ]; then
    echo "Creating Capacitor config file..."
    npx cap init "Web3 Crypto Streaming" "com.web3cryptostream.app" --web-dir dist
fi

# Build the web app
echo "Building web application..."
npm run build

# Add Android platform if it doesn't exist
if [ ! -d "./android" ]; then
    echo "Adding Android platform..."
    npx cap add android
else
    echo "Android platform already exists, syncing changes..."
fi

# Sync changes to Android
npx cap sync android

# Generate resources (icons and splash screens)
echo "Generating icons and splash screens..."
npx @capacitor/assets generate --ios false

echo "Android setup complete!"
echo "You can now open Android Studio with: npx cap open android"
echo "Or build directly with: npm run android:build"
