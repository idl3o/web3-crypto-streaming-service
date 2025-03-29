const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Bridge to call Haskell functions from JavaScript
 */
class HaskellBridge {
    constructor() {
        this.haskellPath = path.join(__dirname);
        this.checkHaskellInstallation();
    }

    /**
     * Check if Haskell is installed and set up
     */
    checkHaskellInstallation() {
        try {
            const ghcVersion = execSync('ghc --version', { encoding: 'utf8' });
            console.log(`Haskell found: ${ghcVersion.trim()}`);
        } catch (error) {
            console.error('Haskell GHC not found. Please install Haskell to use this feature.');
            console.error('Visit: https://www.haskell.org/downloads/');
            throw new Error('Haskell not found');
        }
    }

    /**
     * Compile the Haskell code
     */
    compileHaskell(file = 'SimulationEngine.hs') {
        const fullPath = path.join(this.haskellPath, file);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`Haskell file not found: ${fullPath}`);
        }

        try {
            console.log(`Compiling ${file}...`);
            execSync(`cd ${this.haskellPath} && ghc -o simulator ${file}`, {
                encoding: 'utf8'
            });
            console.log('Compilation successful');
        } catch (error) {
            console.error('Failed to compile Haskell code:', error.message);
            throw error;
        }
    }

    /**
     * Run Haskell simulation with parameters
     */
    runSimulation(params) {
        const executablePath = path.join(this.haskellPath, 'simulator');

        if (!fs.existsSync(executablePath)) {
            this.compileHaskell();
        }

        // Construct command line arguments
        const volatilityArg = `--volatility ${params.volatility}`;
        const command = `${executablePath} ${volatilityArg}`;

        try {
            console.log(`Running Haskell simulation: ${command}`);
            const output = execSync(command, {
                encoding: 'utf8'
            });

            return JSON.parse(output);
        } catch (error) {
            console.error('Error running Haskell simulation:', error.message);
            console.error('Haskell Output:', error.stdout);
            console.error('Haskell Errors:', error.stderr);
            throw error;
        }
    }

    /**
     * Generate a batch of transactions using Haskell
     */
    generateTransactions(count, volatility = 0.2) {
        try {
            return this.runSimulation({
                transactionCount: count,
                volatility: volatility
            });
        } catch (error) {
            console.error('Failed to generate transactions using Haskell:', error.message);
            throw error;
        }
    }
}

module.exports = new HaskellBridge();
