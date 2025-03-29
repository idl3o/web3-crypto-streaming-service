const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to run shell commands and log output
function runCommand(command) {
    console.log(`Executing: ${command}`);
    try {
        execSync(command, { stdio: 'inherit' });
    } catch (error) {
        console.error(`Command failed: ${error.message}`);
        process.exit(1);
    }
}

// Check if capacitor config exists
if (!fs.existsSync(path.join(__dirname, '..', 'capacitor.config.ts'))) {
    console.log('Capacitor config not found. Please ensure capacitor.config.ts exists.');
    process.exit(1);
}

// Build the web app
console.log('Building web application...');
runCommand('npm run build');

// Initialize Capacitor if android directory doesn't exist
if (!fs.existsSync(path.join(__dirname, '..', 'android'))) {
    console.log('Adding Android platform...');
    runCommand('npx cap add android');
} else {
    console.log('Android platform already exists, syncing changes...');
}

// Sync changes to Android platform
runCommand('npx cap sync android');

// Update app icon and splash screen
console.log('Setting up Android resources...');
runCommand('npx @capacitor/assets generate --android');

console.log('Android setup complete! Run "npm run capacitor:open:android" to open Android Studio.');
