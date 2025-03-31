/**
 * Jest Issue Resolution Script
 * 
 * This script diagnoses and fixes common Jest setup issues in the Web3 Crypto Streaming Service project.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Root directory of the project
const projectRoot = path.join(__dirname, '..', '..');

console.log('🔍 Running Jest Issue Resolution Script...');

// Check for Jest installation
function checkJestInstallation() {
  console.log('\n📋 Checking Jest installation...');
  
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const nodeModulesJestPath = path.join(projectRoot, 'node_modules', 'jest');
  const jestBinPath = path.join(projectRoot, 'node_modules', 'jest', 'bin', 'jest.js');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json not found! Make sure you run this script from the project root.');
    return false;
  }
  
  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } catch (error) {
    console.error('❌ Failed to parse package.json:', error.message);
    return false;
  }
  
  // Check devDependencies for Jest
  const hasJestDep = packageJson.devDependencies && packageJson.devDependencies.jest;
  console.log(hasJestDep ? '✅ Jest found in devDependencies' : '❌ Jest not found in devDependencies');
  
  // Check for actual installation in node_modules
  const jestInstalled = fs.existsSync(nodeModulesJestPath);
  console.log(jestInstalled ? '✅ Jest installed in node_modules' : '❌ Jest not installed in node_modules');
  
  // Check for Jest binary
  const jestBinExists = fs.existsSync(jestBinPath);
  console.log(jestBinExists ? '✅ Jest binary found' : '❌ Jest binary not found');
  
  if (!hasJestDep || !jestInstalled || !jestBinExists) {
    console.log('🔧 Installing Jest and related dependencies...');
    
    try {
      execSync('npm install --save-dev jest@29.5.0 ts-jest@29.1.0 @types/jest@29.5.0 @vue/vue3-jest@29.2.4 jest-environment-jsdom@29.5.0 identity-obj-proxy@3.0.0', {
        stdio: 'inherit',
        cwd: projectRoot
      });
      console.log('✅ Jest dependencies installed successfully');
    } catch (error) {
      console.error('❌ Failed to install Jest dependencies:', error.message);
      return false;
    }
  }
  
  return true;
}

// Fix package.json Jest scripts
function fixPackageJsonScripts() {
  console.log('\n📋 Checking package.json test scripts...');
  
  const packageJsonPath = path.join(projectRoot, 'package.json');
  let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Define correct scripts
  const correctScripts = {
    test: 'node node_modules/jest/bin/jest.js',
    "test:watch": 'node node_modules/jest/bin/jest.js --watch',
    "test:coverage": 'node node_modules/jest/bin/jest.js --coverage',
    "test:unit": 'node node_modules/jest/bin/jest.js src/tests/services',
    "test:integration": 'node node_modules/jest/bin/jest.js src/tests/integration',
    "test:e2e": 'node node_modules/jest/bin/jest.js src/tests/e2e',
    "test:clear-cache": 'node node_modules/jest/bin/jest.js --clearCache',
    "setup:jest": 'node scripts/setup/jest-setup.js'
  };
  
  // Check if scripts need updating
  let needsUpdate = false;
  packageJson.scripts = packageJson.scripts || {};
  
  for (const [scriptName, scriptCommand] of Object.entries(correctScripts)) {
    if (packageJson.scripts[scriptName] !== scriptCommand) {
      packageJson.scripts[scriptName] = scriptCommand;
      needsUpdate = true;
    }
  }
  
  if (needsUpdate) {
    console.log('🔧 Updating package.json scripts...');
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
    console.log('✅ package.json scripts updated successfully');
  } else {
    console.log('✅ package.json scripts already correct');
  }
  
  return true;
}

// Check or create jest.config.js
function checkJestConfig() {
  console.log('\n📋 Checking Jest configuration...');
  
  const jestConfigPath = path.join(projectRoot, 'jest.config.js');
  
  if (!fs.existsSync(jestConfigPath)) {
    console.log('🔧 Creating jest.config.js...');
    
    const jestConfig = `/**
 * Jest configuration for Web3 Crypto Streaming Service
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\\\.(ts|tsx)$': 'ts-jest',
    '^.+\\\\.vue$': '@vue/vue3-jest',
  },
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    '\\\\.css$': 'identity-obj-proxy',
    // Handle native modules
    '^.+\\\\.node$': '<rootDir>/src/tests/mocks/native-module-mock.js',
    // Handle path aliases if you have any in tsconfig.json
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'vue', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,js,vue}',
    '!src/dev/**',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'lcov'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
      diagnostics: false
    }
  }
};`;
    
    fs.writeFileSync(jestConfigPath, jestConfig, 'utf8');
    console.log('✅ jest.config.js created successfully');
  } else {
    console.log('✅ jest.config.js already exists');
  }
  
  return true;
}

// Check for Jest setup file
function checkJestSetup() {
  console.log('\n📋 Checking Jest setup files...');
  
  const testsDir = path.join(projectRoot, 'src', 'tests');
  const setupFilePath = path.join(testsDir, 'setup.ts');
  
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, { recursive: true });
    console.log('✅ Created tests directory');
  }
  
  // If setup.ts doesn't exist, create it
  if (!fs.existsSync(setupFilePath)) {
    console.log('🔧 Creating Jest setup.ts file...');
    
    const setupContent = `/**
 * Jest setup file for Web3 Crypto Streaming Service
 * This runs before each test file
 */

// Mock the native-module-loader
jest.mock('../utils/native-module-loader', () => {
  // Use Node's crypto for test mocks to avoid platform-specific binary dependencies
  const crypto = require('crypto');
  
  const nativeCrypto = {
    aesEncrypt: (data: Buffer, key: Buffer, iv: Buffer) => {
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      return Buffer.concat([cipher.update(data), cipher.final()]);
    },
    
    aesDecrypt: (data: Buffer, key: Buffer, iv: Buffer) => {
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      return Buffer.concat([decipher.update(data), decipher.final()]);
    },
    
    sha256: (data: Buffer) => {
      return crypto.createHash('sha256').update(data).digest();
    },
    
    getModuleInfo: () => ({
      name: 'js-fallback',
      version: '1.0.0',
      platform: process.platform,
      arch: process.arch,
      buildDate: new Date().toISOString(),
      buildTime: '',
      symbolVisibility: 'js'
    })
  };
  
  return {
    loadNativeCryptoModule: jest.fn().mockReturnValue(nativeCrypto),
    nativeCrypto,
    aesEncrypt: nativeCrypto.aesEncrypt,
    aesDecrypt: nativeCrypto.aesDecrypt,
    sha256: nativeCrypto.sha256,
    getNativeModuleInfo: nativeCrypto.getModuleInfo
  };
});

// Set timezone for consistent date/time testing
process.env.TZ = 'UTC';

// Global console mock to avoid noisy logs during tests
// but still capture errors for test failures
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.spyOn(originalConsole, 'error'),
};
`;
    
    fs.writeFileSync(setupFilePath, setupContent, 'utf8');
    console.log('✅ Created Jest setup.ts file');
  } else {
    console.log('✅ Jest setup.ts file already exists');
  }
  
  // Create a sample test if there are no tests
  const servicesTestDir = path.join(testsDir, 'services');
  if (!fs.existsSync(servicesTestDir)) {
    fs.mkdirSync(servicesTestDir, { recursive: true });
    
    const exampleTestPath = path.join(servicesTestDir, 'example.test.ts');
    const exampleContent = `/**
 * Example test file
 */
describe('Example Test Suite', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });
});
`;
    fs.writeFileSync(exampleTestPath, exampleContent, 'utf8');
    console.log('✅ Created example test file');
  }
  
  return true;
}

// Fix VS Code settings for Jest
function fixVsCodeSettings() {
  console.log('\n📋 Checking VS Code settings...');
  
  const vscodeDir = path.join(projectRoot, '.vscode');
  const settingsPath = path.join(vscodeDir, 'settings.json');
  
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
  }
  
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (error) {
      console.error('❌ Error parsing VS Code settings:', error.message);
    }
  }
  
  // Update Jest settings
  settings["jest.jestCommandLine"] = "node node_modules/jest/bin/jest.js";
  settings["jest.autoRun"] = {
    "watch": false,
    "onStartup": ["all-tests"]
  };
  settings["jest.showCoverageOnLoad"] = false;
  
  // Write updated settings
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  console.log('✅ VS Code settings updated successfully');
  
  return true;
}

// Create a Jest wrapper script for better error handling
function createJestWrapper() {
  console.log('\n📋 Creating Jest wrapper script...');
  
  const wrapperPath = path.join(projectRoot, 'jest-run.js');
  const wrapperContent = `#!/usr/bin/env node
/**
 * Jest runner with improved error handling
 * This script acts as a wrapper around Jest to provide better error messages and diagnostics
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Find the Jest binary
const jestBinPath = path.join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js');

if (!fs.existsSync(jestBinPath)) {
  console.error('\\x1b[31m%s\\x1b[0m', 'Error: Jest binary not found at ' + jestBinPath);
  console.log('Please run: npm install --save-dev jest');
  process.exit(1);
}

// Get any command line args to pass to Jest
const args = process.argv.slice(2);

console.log('\\x1b[36m%s\\x1b[0m', 'Starting Jest using local installation...');
console.log('> node ' + jestBinPath + ' ' + args.join(' '));

// Execute Jest with all arguments
const jestProcess = spawn('node', [jestBinPath, ...args], {
  stdio: 'inherit',
  shell: true
});

jestProcess.on('error', (error) => {
  console.error('\\x1b[31m%s\\x1b[0m', 'Failed to start Jest process:');
  console.error(error.message);
  
  // Check common issues
  if (error.code === 'ENOENT') {
    console.log('\\nTroubleshooting:');
    console.log('1. Make sure Node.js is correctly installed');
    console.log('2. Run: npm install');
    console.log('3. Check if node_modules/jest exists');
  }
  
  process.exit(1);
});

jestProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('\\x1b[31m%s\\x1b[0m', '\\nJest process exited with code: ' + code);
  }
  process.exit(code);
});
`;
  
  fs.writeFileSync(wrapperPath, wrapperContent, 'utf8');
  
  try {
    // Make the file executable on Unix systems
    if (process.platform !== 'win32') {
      fs.chmodSync(wrapperPath, '755');
    }
  } catch (error) {
    console.warn('⚠️ Could not make the file executable:', error.message);
  }
  
  console.log('✅ Created Jest wrapper script');
  
  // Update package.json to use the wrapper
  const packageJsonPath = path.join(projectRoot, 'package.json');
  let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (packageJson.scripts) {
    // Add an alternative test script using the wrapper
    packageJson.scripts['test:alt'] = 'node jest-run.js';
  }
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
  console.log('✅ Added alternative test script to package.json');
  
  return true;
}

// Verify Jest works
function verifyJestWorks() {
  console.log('\n📋 Verifying Jest installation...');
  
  try {
    console.log('Attempting to run Jest version check...');
    const jestVersion = execSync('node node_modules/jest/bin/jest.js --version', {
      cwd: projectRoot
    }).toString().trim();
    
    console.log(`✅ Jest is working! Version: ${jestVersion}`);
    return true;
  } catch (error) {
    console.error('❌ Jest verification failed:', error.message);
    console.log('Try running Jest with the wrapper script: node jest-run.js');
    return false;
  }
}

// Run all checks and fixes
function runAllFixes() {
  const jestInstalled = checkJestInstallation();
  if (!jestInstalled) {
    console.error('\n❌ Failed to resolve Jest installation issues.');
    return false;
  }
  
  fixPackageJsonScripts();
  checkJestConfig();
  checkJestSetup();
  fixVsCodeSettings();
  createJestWrapper();
  
  const jestWorks = verifyJestWorks();
  
  console.log('\n' + '-'.repeat(50));
  if (jestWorks) {
    console.log('✅ Jest setup is now complete and working!');
    console.log('\nYou can run tests using:');
    console.log('  npm test');
    console.log('  npm run test:watch');
    console.log('  npm run test:coverage');
    console.log('\nAlternative command if you have issues:');
    console.log('  npm run test:alt');
  } else {
    console.log('⚠️ Jest setup completed but verification failed.');
    console.log('\nTry running tests with the wrapper script:');
    console.log('  node jest-run.js');
  }
  console.log('-'.repeat(50));
}

// Run everything
runAllFixes();
