import { spawn } from 'child_process';
import { EventEmitter } from 'events';

export class NPMManager extends EventEmitter {
    private readonly cwd: string;

    constructor(workingDirectory: string) {
        super();
        this.cwd = workingDirectory;
    }

    async runScript(scriptName: string, args: string[] = []): Promise<void> {
        return new Promise((resolve, reject) => {
            const npm = spawn('npm', ['run', scriptName, ...args], {
                cwd: this.cwd,
                stdio: 'pipe',
                shell: true
            });

            npm.stdout?.on('data', (data) => {
                this.emit('scriptOutput', data.toString());
            });

            npm.stderr?.on('data', (data) => {
                this.emit('scriptError', data.toString());
            });

            npm.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Script ${scriptName} failed with code ${code}`));
            });
        });
    }

    async install(packages: string[], isDev = false): Promise<void> {
        const args = ['install', ...packages];
        if (isDev) args.push('--save-dev');

        return new Promise((resolve, reject) => {
            const npm = spawn('npm', args, {
                cwd: this.cwd,
                stdio: 'pipe',
                shell: true
            });

            npm.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Package installation failed with code ${code}`));
            });
        });
    }
}
