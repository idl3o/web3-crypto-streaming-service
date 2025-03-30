#!/usr/bin/env node
/**
 * Installation script for the andrewflynn20/cli tool
 * This script clones the repository and sets up the CLI tool for use with the project
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const CLI_REPO = 'https://github.com/andrewflynn20/cli.git';
const CLI_DIR = path.join(os.homedir(), '.web3-streaming-cli');
const CLI_EXEC = path.join(CLI_DIR, 'bin', 'cli');
const LOCAL_BIN = path.join(__dirname, '..', '..', 'node_modules', '.bin');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.cyan}Installing external CLI tool from ${CLI_REPO}${colors.reset}`);

try {
    // Create CLI directory if it doesn't exist
    if (!fs.existsSync(CLI_DIR)) {
        console.log(`Creating directory ${CLI_DIR}...`);
        fs.mkdirSync(CLI_DIR, { recursive: true });
    }

    // Clone or update repository
    if (!fs.existsSync(path.join(CLI_DIR, '.git'))) {
        console.log(`Cloning repository to ${CLI_DIR}...`);
        execSync(`git clone ${CLI_REPO} ${CLI_DIR}`, { stdio: 'inherit' });
    } else {
        console.log(`Updating existing repository in ${CLI_DIR}...`);
        execSync(`cd ${CLI_DIR} && git pull`, { stdio: 'inherit' });
    }

    // Install dependencies
    console.log('Installing dependencies...');
    execSync(`cd ${CLI_DIR} && npm install`, { stdio: 'inherit' });

    // Create symlink to CLI executable if needed
    if (!fs.existsSync(path.join(LOCAL_BIN, 'web3-cli'))) {
        console.log('Creating symlink to CLI executable...');
        try {
            fs.mkdirSync(LOCAL_BIN, { recursive: true });

            if (os.platform() === 'win32') {
                // Windows requires a different approach for symlinks
                const batchFile = path.join(LOCAL_BIN, 'web3-cli.cmd');
                fs.writeFileSync(
                    batchFile,
                    `@echo off\r\nnode "${CLI_EXEC}" %*`
                );
                console.log(`Created batch file: ${batchFile}`);
            } else {
                // Unix-like systems can use symlinks
                fs.symlinkSync(CLI_EXEC, path.join(LOCAL_BIN, 'web3-cli'), 'file');
            }
        } catch (err) {
            console.warn(`${colors.yellow}Warning: Could not create symlink. You may need to run with administrator privileges.${colors.reset}`);
            console.warn(`You can still use the CLI by running: node ${CLI_EXEC}`);
        }
    }

    console.log(`${colors.green}${colors.bright}CLI tool successfully installed!${colors.reset}`);
    console.log(`You can now use the CLI with: ${colors.bright}npx web3-cli${colors.reset}`);
} catch (error) {
    console.error(`${colors.red}Error installing CLI tool:${colors.reset}`, error.message);
    process.exit(1);
}
