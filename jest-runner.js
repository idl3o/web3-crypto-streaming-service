#!/usr/bin/env node
/**
 * Jest runner script to handle errors and provide better diagnostics
 * for the Web3 Crypto Streaming Service
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

console.log(`${colors.cyan}Web3 Crypto Streaming Service Jest Runner${colors.reset}`);
console.log('-'.repeat(50));

// Get full path to Jest in node_modules
const jestPath = path.join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js');

// Check if Jest exists
if (!fs.existsSync(jestPath)) {
  console.error(`${colors.red}Error: Jest not found at ${jestPath}${colors.reset}`);
  console.log(`\nPlease install Jest with: npm install --save-dev jest ts-jest @types/jest\n`);
  process.exit(1);
}

// Get command line args
const args = process.argv.slice(2);
console.log(`${colors.cyan}Running Jest with arguments: ${args.join(' ')}${colors.reset}`);

// Run Jest with all provided arguments
const jestProcess = spawn('node', [jestPath].concat(args), {
  stdio: 'inherit'
});

// Handle error starting the process
jestProcess.on('error', (err) => {
  console.error(`${colors.red}Failed to start Jest: ${err.message}${colors.reset}`);
  checkEnvironment();
  process.exit(1);
});

// Handle process exit
jestProcess.on('exit', (code) => {
  if (code !== 0) {
    console.log(`${colors.yellow}Jest exited with code ${code}${colors.reset}`);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure all dependencies are installed: npm install');
    console.log('2. Check if there are syntax errors in your test files');
    console.log('3. Try clearing Jest cache: npm run test:clear-cache');
    console.log(`4. Run with verbose flag: npm run jest-runner -- --verbose`);
  }
  process.exit(code);
});

// Check environment for common issues
function checkEnvironment() {
  console.log('\n--- Environment Check ---');
  
  // Check Node.js version
  console.log(`Node.js version: ${process.version}`);
  
  // Check if package.json exists
  const hasPackageJson = fs.existsSync(path.join(__dirname, 'package.json'));
  console.log(`package.json exists: ${hasPackageJson ? 'Yes' : 'No'}`);
  
  // Check Jest config
  const hasJestConfig = fs.existsSync(path.join(__dirname, 'jest.config.js'));
  console.log(`jest.config.js exists: ${hasJestConfig ? 'Yes' : 'No'}`);
  
  // Check test folder exists
  const hasTestsFolder = fs.existsSync(path.join(__dirname, 'src', 'tests'));
  console.log(`src/tests folder exists: ${hasTestsFolder ? 'Yes' : 'No'}`);
  
  console.log('------------------------');
}
