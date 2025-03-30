#!/usr/bin/env node
/**
 * iOS App Store Submission Preparation
 * Helps prepare assets and metadata for App Store submission
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// Configuration
const APP_NAME = 'Web3 Crypto Streaming';
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'app-store-assets');
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, 'screenshots');
const CONFIG_FILE = path.join(__dirname, '..', '..', 'ios-config.json');

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

console.log(`${colors.bright}${colors.cyan}=== App Store Submission Preparation ====${colors.reset}\n`);
console.log(`Preparing ${APP_NAME} for App Store submission...\n`);

/**
 * Main function to prepare App Store submission
 */
async function prepareSubmission() {
    try {
        // Create directories if they don't exist
        createDirectories();

        // Load existing configuration
        const config = loadConfig();

        // Collect app metadata
        const metadata = await collectMetadata(config);

        // Save metadata to file
        saveMetadata(metadata);

        // Generate screenshot templates
        generateScreenshotTemplates();

        console.log(`
${colors.bright}${colors.green}App Store submission preparation completed!${colors.reset}

${colors.bright}Next Steps:${colors.reset}
1. Fill in the metadata in: ${OUTPUT_DIR}/metadata.json
2. Add screenshots to: ${SCREENSHOT_DIR}
   - iPhone 6.5" Display: 1242 x 2688 pixels
   - iPhone 5.5" Display: 1242 x 2208 pixels
   - iPad Pro (3rd Gen): 2048 x 2732 pixels
3. Complete your app's submission in App Store Connect

${colors.bright}Documentation:${colors.reset}
See the full iOS publishing guide at: docs/ios-publishing.md
    `);

    } catch (error) {
        console.error(`${colors.red}Error during submission preparation:${colors.reset}`, error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

/**
 * Create necessary directories
 */
function createDirectories() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log(`Created output directory: ${OUTPUT_DIR}`);
    }

    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

        // Create device-specific screenshot directories
        const devices = [
            'iPhone-6.5inch',
            'iPhone-5.5inch',
            'iPad-Pro'
        ];

        devices.forEach(device => {
            fs.mkdirSync(path.join(SCREENSHOT_DIR, device), { recursive: true });
        });

        console.log(`Created screenshot directories`);
    }
}

/**
 * Load existing configuration
 */
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
        return {};
    } catch (error) {
        console.warn(`${colors.yellow}Warning: Could not load config file: ${error.message}${colors.reset}`);
        return {};
    }
}

/**
 * Collect app metadata through user prompts
 */
async function collectMetadata(config) {
    const appStoreConfig = config.appStoreSubmission || {};

    const metadata = {
        appName: APP_NAME,
        primaryLanguage: 'en-US',
        bundleId: config.bundleId || 'com.web3crypto.streamingapp',
        sku: `web3crypto-${Date.now()}`,

        // App information
        description: await promptWithDefault(
            'Enter app description (4000 char max):',
            'A decentralized streaming platform powered by blockchain technology and cryptocurrency payments'
        ),

        keywords: await promptWithDefault(
            'Enter keywords (comma-separated, 100 char max):',
            'crypto,blockchain,streaming,web3,bitcoin,ethereum,nft,decentralized'
        ),

        supportUrl: await promptWithDefault(
            'Enter support URL:',
            appStoreConfig.supportUrl || 'https://support.web3cryptostreaming.com'
        ),

        marketingUrl: await promptWithDefault(
            'Enter marketing URL:',
            appStoreConfig.marketingUrl || 'https://www.web3cryptostreaming.com'
        ),

        privacyPolicyUrl: await promptWithDefault(
            'Enter privacy policy URL:',
            appStoreConfig.privacyPolicyUrl || 'https://www.web3cryptostreaming.com/privacy'
        ),

        // App category
        primaryCategory: await promptWithDefault(
            'Enter primary category ID:',
            appStoreConfig.categoryId || '6016'
        ),

        secondaryCategory: await promptWithDefault(
            'Enter secondary category ID (optional):',
            appStoreConfig.secondaryCategoryId || '6008'
        ),

        // Release information
        releaseNotes: await promptWithDefault(
            'Enter release notes (for updates):',
            'Initial release of the Web3 Crypto Streaming app.'
        ),

        // Content rating
        containsAds: await promptYesNo('Does the app contain ads?') ? true : false,

        // Contact information
        contactEmail: await promptWithDefault(
            'Enter contact email:',
            'contact@web3cryptostreaming.com'
        ),

        contactPhone: await promptWithDefault(
            'Enter contact phone (optional):',
            ''
        ),

        copyright: await promptWithDefault(
            'Enter copyright information:',
            appStoreConfig.copyright || `${new Date().getFullYear()} Web3 Crypto Streaming Team`
        )
    };

    return metadata;
}

/**
 * Save metadata to a file
 */
function saveMetadata(metadata) {
    const filePath = path.join(OUTPUT_DIR, 'metadata.json');
    fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
    console.log(`Saved metadata to: ${filePath}`);
}

/**
 * Generate screenshot templates
 */
function generateScreenshotTemplates() {
    const devices = [
        {
            name: 'iPhone-6.5inch',
            width: 1242,
            height: 2688,
            description: 'iPhone 6.5" Display (iPhone 11 Pro Max, XS Max)'
        },
        {
            name: 'iPhone-5.5inch',
            width: 1242,
            height: 2208,
            description: 'iPhone 5.5" Display (iPhone 8 Plus, 7 Plus, 6s Plus)'
        },
        {
            name: 'iPad-Pro',
            width: 2048,
            height: 2732,
            description: 'iPad Pro (3rd Gen) 12.9"'
        }
    ];

    devices.forEach(device => {
        const deviceDir = path.join(SCREENSHOT_DIR, device.name);
        const infoFilePath = path.join(deviceDir, 'info.txt');

        fs.writeFileSync(infoFilePath,
            `Screenshot Requirements for ${device.description}:\n` +
            `- Resolution: ${device.width} x ${device.height} pixels\n` +
            `- Format: JPG or PNG\n` +
            `- Limit: Up to 10 screenshots\n` +
            `- Naming: screenshot-1.png, screenshot-2.png, etc.\n\n` +
            `Place your screenshots in this directory.`
        );

        console.log(`Generated template info for ${device.name}`);
    });
}

/**
 * Prompt user with a question and default value
 */
async function promptWithDefault(question, defaultValue) {
    return new Promise(resolve => {
        rl.question(`${question} (${defaultValue}): `, answer => {
            resolve(answer || defaultValue);
        });
    });
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
prepareSubmission();
