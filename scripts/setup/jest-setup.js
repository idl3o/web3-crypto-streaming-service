/**
 * Jest setup script for Web3 Crypto Streaming Service
 * 
 * This script installs and configures Jest for the project
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Setting up Jest for Web3 Crypto Streaming Service...');

// Project root path
const projectRoot = path.join(__dirname, '..', '..');

// Ensure package.json exists
const packageJsonPath = path.join(projectRoot, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found! Make sure you run this script from the project root.');
  process.exit(1);
}

// Install Jest dependencies
console.log('📦 Installing Jest dependencies...');

try {
  const dependencies = [
    'jest@29.5.0',
    'ts-jest@29.1.0',
    '@types/jest@29.5.0',
    'identity-obj-proxy@3.0.0',
    '@vue/vue3-jest@29.2.4',
    'jest-environment-jsdom@29.5.0'
  ];

  execSync(`npm install --save-dev ${dependencies.join(' ')}`, {
    stdio: 'inherit',
    cwd: projectRoot
  });

  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Check if jest.config.js exists, create if not
const jestConfigPath = path.join(projectRoot, 'jest.config.js');
if (!fs.existsSync(jestConfigPath)) {
  console.log('📝 Creating jest.config.js...');
  
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
};
`;

  fs.writeFileSync(jestConfigPath, jestConfig, 'utf8');
  console.log('✅ jest.config.js created');
} else {
  console.log('✅ jest.config.js already exists');
}

// Create basic test directory structure if it doesn't exist
const testsDir = path.join(projectRoot, 'src', 'tests');
const mocksDir = path.join(testsDir, 'mocks');

if (!fs.existsSync(testsDir)) {
  fs.mkdirSync(testsDir, { recursive: true });
  console.log('✅ Created tests directory');
}

if (!fs.existsSync(mocksDir)) {
  fs.mkdirSync(mocksDir, { recursive: true });
  console.log('✅ Created mocks directory');
}

// Create mock files if they don't exist
const mockModulePath = path.join(mocksDir, 'native-module-mock.js');
if (!fs.existsSync(mockModulePath)) {
  console.log('📝 Creating native module mock...');
  
  const mockContent = `/**
 * Mock implementation of native modules for testing
 */
const crypto = require('crypto');

// Mock native crypto module
module.exports = {
  aesEncrypt: (data, key, iv) => {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([cipher.update(data), cipher.final()]);
  },
  
  aesDecrypt: (data, key, iv) => {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([decipher.update(data), decipher.final()]);
  },
  
  sha256: (data) => {
    return crypto.createHash('sha256').update(data).digest();
  },
  
  getModuleInfo: () => {
    return {
      name: 'web3_crypto_native',
      version: '1.0.0-mock',
      platform: process.platform,
      arch: process.arch,
      buildDate: new Date().toDateString(),
      buildTime: new Date().toTimeString(),
      symbolVisibility: 'mock'
    };
  }
};
`;

  fs.writeFileSync(mockModulePath, mockContent, 'utf8');
  console.log('✅ Native module mock created');
}

// Create setup file if it doesn't exist
const setupFilePath = path.join(testsDir, 'setup.ts');
if (!fs.existsSync(setupFilePath)) {
  console.log('📝 Creating test setup file...');
  
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
  console.log('✅ Test setup file created');
}

// Create a basic test example if no tests exist yet
const servicesTestDir = path.join(testsDir, 'services');
if (!fs.existsSync(servicesTestDir)) {
  fs.mkdirSync(servicesTestDir, { recursive: true });
  console.log('✅ Created services test directory');
  
  // Create an example test file
  const exampleTestPath = path.join(servicesTestDir, 'example.test.ts');
  const exampleTestContent = `/**
 * Example test file
 */
describe('Example Test Suite', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });
});
`;

  fs.writeFileSync(exampleTestPath, exampleTestContent, 'utf8');
  console.log('✅ Example test file created');
}

// Create or update .vscode/settings.json with Jest configuration
const vscodeDir = path.join(projectRoot, '.vscode');
if (!fs.existsSync(vscodeDir)) {
  fs.mkdirSync(vscodeDir, { recursive: true });
}

const settingsPath = path.join(vscodeDir, 'settings.json');
let settings = {};

if (fs.existsSync(settingsPath)) {
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (error) {
    console.error('❌ Error parsing existing settings.json:', error.message);
    settings = {};
  }
}

// Update settings with Jest configuration
settings = {
  ...settings,
  "jest.jestCommandLine": "node node_modules/jest/bin/jest.js",
  "jest.autoRun": {
    "watch": false,
    "onStartup": ["all-tests"]
  },
  "jest.showCoverageOnLoad": false
};

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
console.log('✅ VS Code settings updated with Jest configuration');

// Final instructions
console.log('\n🎉 Jest setup complete! You can now run tests using:');
console.log('   - npm test          : Run all tests');
console.log('   - npm run test:watch: Run tests in watch mode');
console.log('   - npm run test:coverage: Run tests with coverage report\n');
console.log('📌 Note: If VS Code Jest extension continues to show errors, try:');
console.log('   1. Restarting VS Code');
console.log('   2. Running the tests from the terminal first with "npm test"');
console.log('   3. Making sure Jest extension settings are configured to use the local Jest installation');
