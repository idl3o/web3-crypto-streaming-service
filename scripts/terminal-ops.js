const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const { NPMManager } = require('../dist/services/npmManager');

class TerminalOperations {
    static async execute(command, args = []) {
        const isWindows = os.platform() === 'win32';
        const shell = isWindows ? 'cmd.exe' : 'bash';
        const shellArgs = isWindows ? ['/c'] : ['-c'];

        console.log(`🔧 Executing: ${command} ${args.join(' ')}`);

        const npmManager = new NPMManager(process.cwd());

        npmManager.on('scriptOutput', (output) => {
            console.log(output);
        });

        npmManager.on('scriptError', (error) => {
            console.error(error);
        });

        try {
            if (command === 'npm') {
                await npmManager.runScript(args[1], args.slice(2));
            } else {
                return new Promise((resolve, reject) => {
                    const proc = spawn(shell, [...shellArgs, command, ...args], {
                        stdio: 'inherit',
                        env: {
                            ...process.env,
                            FORCE_COLOR: '1',
                            NODE_ENV: process.env.NODE_ENV || 'development'
                        }
                    });

                    proc.on('close', code => {
                        if (code === 0) {
                            console.log('✅ Command completed successfully');
                            resolve(true);
                        } else {
                            console.error(`❌ Command failed with code ${code}`);
                            reject(new Error(`Process exited with code ${code}`));
                        }
                    });

                    proc.on('error', error => {
                        console.error('❌ Failed to start command:', error);
                        reject(error);
                    });
                });
            }
        } catch (error) {
            console.error('Failed to run command:', error);
            process.exit(1);
        }
    }
}

const runCommand = (command, args = []) => {
    const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true
    });

    child.on('error', (error) => {
        console.error(`Error executing ${command}:`, error);
        process.exit(1);
    });
};

// Example usage:
if (require.main === module) {
    TerminalOperations.execute('npm', ['run', 'start:all'])
        .catch(error => {
            console.error('Failed to run command:', error);
            process.exit(1);
        });

    // Run the application
    console.log('Starting Web3 Crypto Streaming Service...');
    runCommand('npm', ['run', 'start:optimized']);
}

module.exports = TerminalOperations;
