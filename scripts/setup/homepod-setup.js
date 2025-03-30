/**
 * HomePod Integration Setup
 * 
 * This script sets up the Web3 Crypto Streaming Service to work with HomePod devices.
 * It handles device discovery, protocol setup, and automatic configuration.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const inquirer = require('inquirer');
const bonjour = require('bonjour')();

// Configuration file path
const CONFIG_PATH = path.join(__dirname, '../../config/homepod.json');

// Default configuration
const DEFAULT_CONFIG = {
    enabled: true,
    autoDiscovery: true,
    preferredDevices: [],
    audioQuality: 'high',
    secureStreaming: true,
    fallbackToAirplay: true
};

async function setupHomePod() {
    console.log(chalk.bold.blue('\n🔊 HomePod Integration Setup'));
    console.log(chalk.blue('=====================================\n'));

    try {
        // Check if required packages are installed
        try {
            console.log('Checking required dependencies...');
            require('airplay-protocol');
            require('mdns');
            console.log(chalk.green('✓ All required dependencies found'));
        } catch (err) {
            console.log(chalk.yellow('⚠️ Missing dependencies. Installing required packages...'));

            execSync('npm install --save airplay-protocol bonjour mdns', {
                stdio: 'inherit'
            });

            console.log(chalk.green('✓ Dependencies installed successfully'));
        }

        // Discover HomePod devices
        console.log('\nScanning for HomePod devices on your network...');

        const devices = await discoverDevices();

        if (devices.length === 0) {
            console.log(chalk.yellow('⚠️ No HomePod devices found on your network.'));
            console.log('Please ensure your HomePod is powered on and connected to the same network.');
        } else {
            console.log(chalk.green(`✓ Found ${devices.length} HomePod device(s):`));
            devices.forEach((device, i) => {
                console.log(`  ${i + 1}. ${device.name} (${device.host}:${device.port})`);
            });
        }

        // Create or update configuration
        let config = DEFAULT_CONFIG;

        // Load existing config if available
        if (fs.existsSync(CONFIG_PATH)) {
            try {
                const existingConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
                config = { ...DEFAULT_CONFIG, ...existingConfig };
                console.log('\nFound existing HomePod configuration.');
            } catch (err) {
                console.log(chalk.yellow('\n⚠️ Error reading existing configuration. Using defaults.'));
            }
        }

        // Update configuration via interactive prompt
        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'enabled',
                message: 'Enable HomePod integration?',
                default: config.enabled
            },
            {
                type: 'confirm',
                name: 'autoDiscovery',
                message: 'Enable automatic device discovery?',
                default: config.autoDiscovery,
                when: answers => answers.enabled
            },
            {
                type: 'checkbox',
                name: 'preferredDevices',
                message: 'Select preferred HomePod devices:',
                choices: devices.map(d => ({ name: d.name, value: d.name })),
                when: answers => answers.enabled && devices.length > 0
            },
            {
                type: 'list',
                name: 'audioQuality',
                message: 'Select audio quality for streaming:',
                choices: [
                    { name: 'Low (96kbps)', value: 'low' },
                    { name: 'Medium (160kbps)', value: 'medium' },
                    { name: 'High (320kbps)', value: 'high' }
                ],
                default: config.audioQuality,
                when: answers => answers.enabled
            },
            {
                type: 'confirm',
                name: 'secureStreaming',
                message: 'Enable encrypted streaming?',
                default: config.secureStreaming,
                when: answers => answers.enabled
            }
        ]);

        // Save the updated configuration
        const updatedConfig = { ...config, ...answers };

        // Create directory if it doesn't exist
        const configDir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        fs.writeFileSync(CONFIG_PATH, JSON.stringify(updatedConfig, null, 2), 'utf8');
        console.log(chalk.green('\n✓ HomePod configuration saved successfully.'));

        console.log('\nHomePod integration setup is complete!');
        console.log('You can now stream content to your HomePod devices using:');
        console.log(chalk.blue('  npm run stream -- --target=homepod --device="Your HomePod Name"'));

        bonjour.destroy(); // Clean up service discovery
    } catch (error) {
        console.error(chalk.red('\n❌ Error setting up HomePod integration:'));
        console.error(chalk.red(error.message));
        process.exit(1);
    }
}

// Function to discover HomePod devices on the network
async function discoverDevices() {
    return new Promise((resolve) => {
        const devices = [];
        const browser = bonjour.find({ type: 'airplay' });

        // Set a timeout for device discovery
        const timeout = setTimeout(() => {
            browser.stop();
            resolve(devices);
        }, 5000);

        browser.on('up', service => {
            // Filter to only include HomePod devices
            if (service.name.includes('HomePod') || service.txt?.model?.includes('HomePod')) {
                devices.push({
                    name: service.name,
                    host: service.host,
                    port: service.port,
                    type: 'homepod'
                });
            }
        });
    });
}

// Run the setup
setupHomePod();
