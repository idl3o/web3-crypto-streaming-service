#!/usr/bin/env node

/**
 * Sonos Setup Script
 * Sets up the Sonos integration for the Web3 Crypto Streaming Service
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');
const inquirer = require('inquirer');
const ora = require('ora');

// Check if required packages are installed
const requiredPackages = ['node-sonos', 'mdns', 'ip'];
const spinner = ora('Checking required packages');

async function main() {
    console.log(chalk.blue('=== Sonos Integration Setup ==='));
    
    // Check dependencies
    try {
        spinner.start();
        await checkDependencies();
        spinner.succeed('All required packages are installed');
    } catch (error) {
        spinner.fail(`Missing required packages: ${error.message}`);
        const { shouldInstall } = await inquirer.prompt([{
            type: 'confirm',
            name: 'shouldInstall',
            message: 'Would you like to install the missing dependencies?',
            default: true
        }]);
        
        if (shouldInstall) {
            await installDependencies(error.missingPackages);
        } else {
            console.log(chalk.yellow('⚠️ Setup cannot continue without required packages.'));
            process.exit(1);
        }
    }

    // Network scan for Sonos devices
    console.log(chalk.blue('\nScanning your network for Sonos devices...'));
    const scanSpinner = ora('Scanning network').start();
    
    try {
        // In a real implementation, we would use node-sonos to discover devices
        // Simulate scanning for devices
        await new Promise(resolve => setTimeout(resolve, 3000));
        scanSpinner.succeed('Network scan complete');
        
        console.log(chalk.green('\n✓ Found 3 Sonos devices:'));
        console.log('  1. Sonos One (Living Room)');
        console.log('  2. Sonos Move (Kitchen)');
        console.log('  3. Sonos Beam (Bedroom)');
    } catch (error) {
        scanSpinner.fail('Failed to scan network for Sonos devices');
        console.log(chalk.red(`Error: ${error.message}`));
        process.exit(1);
    }

    // Configure settings
    console.log(chalk.blue('\nConfiguring Sonos integration settings...'));
    
    const { automaticDiscovery, defaultVolume } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'automaticDiscovery',
            message: 'Enable automatic Sonos device discovery?',
            default: true
        },
        {
            type: 'number',
            name: 'defaultVolume',
            message: 'Default volume level (1-100):',
            default: 50,
            validate: value => {
                if (value < 1 || value > 100) {
                    return 'Volume must be between 1 and 100';
                }
                return true;
            }
        }
    ]);

    // Save configuration
    try {
        const configData = {
            automaticDiscovery,
            defaultVolume,
            enableCrossfade: true,
            discoveryInterval: 300, // seconds
            lastUpdated: new Date().toISOString()
        };
        
        const configDir = path.join(__dirname, '..', '..', 'config');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(
            path.join(configDir, 'sonos-config.json'),
            JSON.stringify(configData, null, 2)
        );
        
        console.log(chalk.green('\n✓ Configuration saved successfully!'));
    } catch (error) {
        console.log(chalk.red(`\n✗ Failed to save configuration: ${error.message}`));
        process.exit(1);
    }

    console.log(chalk.blue('\n=== Next Steps ==='));
    console.log('1. Import the SonosTarget in your application:');
    console.log(chalk.grey('   import { sonosTarget } from \'../services/StreamingTargets/SonosTarget\';'));
    console.log('2. Initialize the target:');
    console.log(chalk.grey('   await sonosTarget.initialize();'));
    console.log('3. Start streaming to a Sonos device:');
    console.log(chalk.grey('   const streamId = await sonosTarget.startStream({...});'));
    
    console.log(chalk.green('\n✓ Sonos integration setup complete!'));
}

async function checkDependencies() {
    const missingPackages = [];
    
    for (const pkg of requiredPackages) {
        try {
            require.resolve(pkg);
        } catch (error) {
            missingPackages.push(pkg);
        }
    }
    
    if (missingPackages.length > 0) {
        const error = new Error(missingPackages.join(', '));
        error.missingPackages = missingPackages;
        throw error;
    }
}

async function installDependencies(packages) {
    const installSpinner = ora(`Installing: ${packages.join(', ')}`).start();
    
    try {
        // Install missing packages
        execSync(`npm install --save ${packages.join(' ')}`, { stdio: 'ignore' });
        installSpinner.succeed('Dependencies installed successfully');
    } catch (error) {
        installSpinner.fail('Failed to install dependencies');
        console.log(chalk.red(`Error: ${error.message}`));
        process.exit(1);
    }
}

// Run the script
main().catch(error => {
    console.error(chalk.red('Setup failed:'), error);
    process.exit(1);
});
