const { execSync } = require('child_process');
const os = require('os');
const path = require('path');

class InstallationManager {
    constructor() {
        this.packages = {
            core: [
                '@web3/core',
                'ethers',
                'web3',
                'hardhat'
            ],
            quantum: [
                '@quantum/simulator',
                'quantum-js',
                'qiskit-terra'
            ],
            monitoring: [
                'prometheus-client',
                'grafana-dash',
                '@metrics/core'
            ],
            development: [
                'typescript',
                '@types/node',
                'ts-node',
                'nodemon'
            ]
        };
    }

    async installAll() {
        console.log('🚀 Starting comprehensive installation...\n');

        try {
            // Core dependencies
            console.log('📦 Installing core packages...');
            execSync(`npm install ${this.packages.core.join(' ')}`, { stdio: 'inherit' });

            // Quantum components
            console.log('\n🔮 Installing quantum packages...');
            execSync(`npm install ${this.packages.quantum.join(' ')}`, { stdio: 'inherit' });

            // Monitoring tools
            console.log('\n📊 Installing monitoring packages...');
            execSync(`npm install ${this.packages.monitoring.join(' ')}`, { stdio: 'inherit' });

            // Development tools
            console.log('\n🛠️ Installing development packages...');
            execSync(`npm install -D ${this.packages.development.join(' ')}`, { stdio: 'inherit' });

            // Global tools
            console.log('\n🌍 Installing global tools...');
            execSync('npm install -g pm2 typescript ts-node', { stdio: 'inherit' });

            console.log('\n✨ Installation complete! System ready.');
        } catch (error) {
            console.error('❌ Installation failed:', error.message);
            process.exit(1);
        }
    }

    verifyInstallation() {
        console.log('🔍 Verifying installation...');
        const checks = [
            { cmd: 'node -v', name: 'Node.js' },
            { cmd: 'npm -v', name: 'NPM' },
            { cmd: 'tsc -v', name: 'TypeScript' },
            { cmd: 'pm2 -v', name: 'PM2' }
        ];

        checks.forEach(check => {
            try {
                execSync(check.cmd);
                console.log(`✅ ${check.name} installed successfully`);
            } catch {
                console.log(`❌ ${check.name} not found`);
            }
        });
    }
}

// Auto-execute if run directly
if (require.main === module) {
    const installer = new InstallationManager();
    installer.installAll().then(() => installer.verifyInstallation());
}

module.exports = InstallationManager;

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class InstallationExecutor {
    constructor() {
        this.installPath = process.cwd();
        this.logPath = path.join(this.installPath, 'logs');
    }

    async execute() {
        console.log('Starting installation sequence...');

        try {
            // Create logs directory if it doesn't exist
            if (!fs.existsSync(this.logPath)) {
                fs.mkdirSync(this.logPath, { recursive: true });
            }

            // Run pre-installation checks
            this.checkEnvironment();

            // Execute installation steps
            this.executeSteps([
                { cmd: 'npm cache verify', msg: 'Verifying cache...' },
                { cmd: 'npm install', msg: 'Installing dependencies...' },
                { cmd: 'npm run boot:sequence', msg: 'Running boot sequence...' }
            ]);

            console.log('Installation completed successfully.');
            return true;
        } catch (error) {
            console.error('Installation failed:', error);
            this.logError(error);
            return false;
        }
    }

    checkEnvironment() {
        const requiredVersion = '16.0.0';
        const nodeVersion = process.version;

        if (!this.satisfiesVersion(nodeVersion, requiredVersion)) {
            throw new Error(`Node.js version ${requiredVersion} or higher is required`);
        }
    }

    executeSteps(steps) {
        steps.forEach(({ cmd, msg }) => {
            console.log(msg);
            execSync(cmd, { stdio: 'inherit' });
        });
    }

    satisfiesVersion(current, required) {
        const clean = v => v.replace(/^v/, '').split('.').map(Number);
        const [major, minor, patch] = clean(current);
        const [reqMajor, reqMinor, reqPatch] = clean(required);

        return major > reqMajor ||
            (major === reqMajor && minor > reqMinor) ||
            (major === reqMajor && minor === reqMinor && patch >= reqPatch);
    }

    logError(error) {
        const logFile = path.join(this.logPath, 'install-error.log');
        const timestamp = new Date().toISOString();
        const logEntry = `${timestamp}: ${error.message}\n${error.stack}\n\n`;

        fs.appendFileSync(logFile, logEntry);
    }
}

// Execute installation if run directly
if (require.main === module) {
    const installer = new InstallationExecutor();
    installer.execute().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = InstallationExecutor;
