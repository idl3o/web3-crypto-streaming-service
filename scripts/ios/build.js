#!/usr/bin/env node
/**
 * iOS Build Script
 * Builds and prepares the iOS app for publishing to the App Store
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const APP_NAME = 'Web3CryptoStreaming';
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'dist-ios');
const CAPACITOR_CONFIG = path.join(__dirname, '..', '..', 'capacitor.config.ts');
const IOS_PLATFORM_DIR = path.join(__dirname, '..', '..', 'ios');

// Setup readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.cyan}=== iOS Build Process ====${colors.reset}\n`);
console.log(`Building ${APP_NAME} for iOS...`);

/**
 * Main build process
 */
async function buildForIos() {
    try {
        // 1. Check if the development environment is set up correctly
        checkEnvironment();

        // 2. Build the web app
        console.log(`\n${colors.bright}Step 1: Building the web application${colors.reset}`);
        execSync('npm run build', { stdio: 'inherit' });

        // 3. Add iOS platform if not already added
        if (!fs.existsSync(IOS_PLATFORM_DIR)) {
            console.log(`\n${colors.bright}Step 2: Adding iOS platform${colors.reset}`);
            execSync('npx cap add ios', { stdio: 'inherit' });
        } else {
            console.log(`\n${colors.bright}Step 2: iOS platform already added${colors.reset}`);
        }

        // 4. Copy web assets to iOS
        console.log(`\n${colors.bright}Step 3: Copying web assets to iOS platform${colors.reset}`);
        execSync('npx cap copy ios', { stdio: 'inherit' });

        // 5. Update native iOS code with any plugin changes
        console.log(`\n${colors.bright}Step 4: Updating native plugins${colors.reset}`);
        execSync('npx cap update ios', { stdio: 'inherit' });

        // 6. Collect app version and build number
        const { version, buildNumber } = await promptForVersionInfo();

        // 7. Update build configuration
        updateBuildConfig(version, buildNumber);

        // 8. Open in Xcode option
        const openXcode = await promptYesNo('Would you like to open the project in Xcode now?');
        if (openXcode) {
            console.log(`\n${colors.bright}Step 5: Opening project in Xcode${colors.reset}`);
            execSync('npx cap open ios', { stdio: 'inherit' });

            console.log(`
${colors.bright}${colors.green}Build process completed!${colors.reset}

${colors.bright}Next Steps in Xcode:${colors.reset}
1. Select your development team
2. Configure your app's signing certificate
3. Set your app's Bundle Identifier (com.yourcompany.${APP_NAME.toLowerCase()})
4. Select a device or simulator to run on
5. Build and run the app to test locally
6. Archive the app (Product > Archive) to submit to App Store Connect

${colors.bright}Documentation:${colors.reset}
See the full iOS publishing guide at: docs/ios-publishing.md
      `);
        } else {
            console.log(`
${colors.bright}${colors.green}Build process completed!${colors.reset}

To open the project in Xcode later, run:
npx cap open ios

${colors.bright}Documentation:${colors.reset}
See the full iOS publishing guide at: docs/ios-publishing.md
      `);
        }

    } catch (error) {
        console.error(`${colors.red}Error during iOS build:${colors.reset}`, error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

/**
 * Check that the required tools are installed
 */
function checkEnvironment() {
    try {
        // Check Xcode is installed
        execSync('xcode-select -p', { stdio: 'pipe' });
    } catch (error) {
        console.error(`${colors.red}Xcode is not installed or not properly configured${colors.reset}`);
        console.error(`Please install Xcode from the Mac App Store and run 'xcode-select --install'`);
        process.exit(1);
    }

    try {
        // Check CocoaPods is installed
        execSync('pod --version', { stdio: 'pipe' });
    } catch (error) {
        console.error(`${colors.red}CocoaPods is not installed${colors.reset}`);
        console.error(`Please install CocoaPods using: 'sudo gem install cocoapods'`);
        process.exit(1);
    }

    // Check if capacitor config exists
    if (!fs.existsSync(CAPACITOR_CONFIG)) {
        console.error(`${colors.red}Capacitor config not found at: ${CAPACITOR_CONFIG}${colors.reset}`);
        console.error(`Please make sure Capacitor is properly configured`);
        process.exit(1);
    }

    console.log(`${colors.green}Environment check passed${colors.reset}`);
}

/**
 * Ask user for version and build information
 */
async function promptForVersionInfo() {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
    const currentVersion = packageJson.version || '1.0.0';

    const version = await new Promise(resolve => {
        rl.question(`Enter app version (current: ${currentVersion}): `, answer => {
            resolve(answer || currentVersion);
        });
    });

    const buildNumber = await new Promise(resolve => {
        rl.question(`Enter build number (1, 2, etc): `, answer => {
            resolve(answer || '1');
        });
    });

    return { version, buildNumber };
}

/**
 * Update the build configuration for iOS
 */
function updateBuildConfig(version, buildNumber) {
    console.log(`\nUpdating build configuration...`);
    console.log(`App Version: ${version}`);
    console.log(`Build Number: ${buildNumber}`);

    // In a real implementation, this would update the Info.plist
    // or project configuration files
}

/**
 * Prompt user with yes/no question
 */
async function promptYesNo(question) {
    return new Promise(resolve => {
        rl.question(`${question} (y/n): `, answer => {
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

// Execute main function
buildForIos();
