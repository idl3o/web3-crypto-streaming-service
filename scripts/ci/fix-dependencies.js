/**
 * Dependency Fixer Script
 * 
 * This script helps resolve common npm dependency issues encountered in CI environments.
 * It performs the following actions:
 * 1. Validates package.json and package-lock.json for inconsistencies
 * 2. Attempts to repair any detected issues
 * 3. Provides detailed logging for debugging
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const projectRoot = path.resolve(__dirname, '../..');
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageLockPath = path.join(projectRoot, 'package-lock.json');

// Logging utility
function log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : '🔧';
    console.log(`${prefix} [${timestamp}] ${message}`);
}

// Main function
async function fixDependencies() {
    log('Starting dependency fix process');

    // Check if package.json exists
    if (!fs.existsSync(packageJsonPath)) {
        log('package.json not found. Cannot continue.', 'error');
        process.exit(1);
    }

    try {
        // Read package.json
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        log(`Successfully parsed package.json (${Object.keys(packageJson.dependencies || {}).length} dependencies, ${Object.keys(packageJson.devDependencies || {}).length} devDependencies)`);

        // Check if package-lock.json exists
        const lockFileExists = fs.existsSync(packageLockPath);
        log(`package-lock.json ${lockFileExists ? 'found' : 'not found'}`);

        // Validate package versions
        validatePackageVersions(packageJson);

        // Try clearing cache and reinstalling
        log('Cleaning npm cache...');
        execSync('npm cache clean --force', { stdio: 'inherit' });

        // Regenerate package-lock if needed
        if (!lockFileExists || process.env.REGENERATE_LOCK === 'true') {
            log('Regenerating package-lock.json...');
            try {
                // Delete existing lock if present
                if (lockFileExists) {
                    fs.unlinkSync(packageLockPath);
                }

                // Install with npm to generate lock file
                execSync('npm install --package-lock-only', { stdio: 'inherit' });
                log('Successfully regenerated package-lock.json');
            } catch (e) {
                log(`Failed to regenerate package-lock.json: ${e.message}`, 'error');
            }
        }

        log('Dependency fix process completed');
    } catch (error) {
        log(`Error fixing dependencies: ${error.message}`, 'error');
        process.exit(1);
    }
}

// Validate package versions
function validatePackageVersions(packageJson) {
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    for (const [pkg, version] of Object.entries(dependencies)) {
        if (version.startsWith('file:') || version.startsWith('link:')) {
            log(`Local dependency detected: ${pkg}@${version}`, 'warning');
        }
        if (version.includes('github:') || version.includes('git+')) {
            log(`Git dependency detected: ${pkg}@${version}`, 'warning');
        }
        if (version === '*' || version === 'latest') {
            log(`Unspecified version detected for ${pkg}: ${version}`, 'warning');
        }
    }

    // Check for duplicate dependencies with different versions
    const depsMap = new Map();

    // Check in dependencies
    if (packageJson.dependencies) {
        Object.entries(packageJson.dependencies).forEach(([name, version]) => {
            depsMap.set(name, { version, type: 'dependency' });
        });
    }

    // Check in devDependencies
    if (packageJson.devDependencies) {
        Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
            if (depsMap.has(name)) {
                const existing = depsMap.get(name);
                if (existing.version !== version) {
                    log(`Package "${name}" is defined in both dependencies (${existing.version}) and devDependencies (${version})`, 'warning');
                }
            } else {
                depsMap.set(name, { version, type: 'devDependency' });
            }
        });
    }

    log(`Validated ${depsMap.size} package versions`);
}

// Execute the script
fixDependencies().catch(err => {
    log(`Unhandled error: ${err.message}`, 'error');
    process.exit(1);
});
