require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

const requiredEnvVars = [
    'PORT',
    'BLOCKCHAIN_URL',
    'ACCESS_CONTROL_ENABLED',
];

const optionalEnvVarsWithDefaults = {
    'NODE_ENV': 'development',
    'WATCH_SYMBOLS': 'btcusdt,ethusdt',
    'MAX_RECONNECT_ATTEMPTS': '5',
    'SIMULATION_ENABLED': 'true',
    'API_RATE_LIMIT': '100',
};

function checkEnvironment() {
    console.log('🔍 Checking environment configuration...');

    let missingVars = [];

    // Check required environment variables
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            missingVars.push(envVar);
        }
    }

    // Report missing required variables
    if (missingVars.length > 0) {
        console.error('❌ Missing required environment variables:');
        missingVars.forEach(v => console.error(`   - ${v}`));
        console.error('\nPlease add these variables to your .env file.');
        return false;
    }

    // Check optional environment variables
    console.log('\n📋 Optional environment variables:');
    for (const [envVar, defaultValue] of Object.entries(optionalEnvVarsWithDefaults)) {
        if (!process.env[envVar]) {
            console.log(`   - ${envVar}: ⚠️ not set (will use default: ${defaultValue})`);
        } else {
            console.log(`   - ${envVar}: ✅ set to "${process.env[envVar]}"`);
        }
    }

    console.log('\n✅ Environment check complete - all required variables are set.');

    // Node.js version check
    const nodeVersion = process.version;
    const requiredVersion = 'v16.0.0';

    if (compareVersions(nodeVersion, requiredVersion) < 0) {
        console.warn(`⚠️ Warning: Node.js version ${nodeVersion} is below recommended ${requiredVersion}`);
    } else {
        console.log(`✅ Node.js version ${nodeVersion} meets requirements`);
    }

    try {
        // Check terminal type
        const isWindows = process.platform === 'win32';
        const shell = process.env.SHELL || process.env.ComSpec;
        console.log(`Shell detected: ${shell}`);

        // Use appropriate command
        const command = isWindows ? 'where npm' : 'which npm';
        const npmPath = execSync(command).toString().trim();
        if (!npmPath) throw new Error('npm not found');

        console.log('✅ npm found at:', npmPath);
    } catch (error) {
        console.error('❌ Environment check failed:', error.message);
        console.log('\nAttempting to fix...');

        // Add shell-specific paths
        const additionalPaths = isWindows ?
            ['%AppData%\\npm', '%ProgramFiles%\\nodejs'] :
            ['/usr/local/bin', '/usr/bin'];

        process.env.PATH = [...additionalPaths, process.env.PATH].join(path.delimiter);
        console.log('Updated PATH with Node.js locations');

        // Provide instructions
        console.log('\nIf npm is still not recognized:');
        console.log('1. Download Node.js from https://nodejs.org');
        console.log('2. Run the installer');
        console.log('3. Restart your terminal/VS Code');
        process.exit(1);
    }

    return true;
}

// Simple version comparison
function compareVersions(a, b) {
    const partsA = a.replace('v', '').split('.').map(Number);
    const partsB = b.replace('v', '').split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const numA = partsA[i] || 0;
        const numB = partsB[i] || 0;

        if (numA > numB) return 1;
        if (numA < numB) return -1;
    }

    return 0;
}

if (require.main === module) {
    // Run directly
    const result = checkEnvironment();
    if (!result) {
        process.exit(1);
    }
} else {
    // Imported as a module
    module.exports = checkEnvironment;
}
