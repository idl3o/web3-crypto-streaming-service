import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

async function publish() {
    try {
        // Clean dist
        if (fs.existsSync(distDir)) {
            fs.rmSync(distDir, { recursive: true });
        }

        // Build
        execSync('npm run build', { stdio: 'inherit' });

        // Copy necessary files
        ['README.md', 'LICENSE', 'package.json'].forEach(file => {
            if (fs.existsSync(path.join(rootDir, file))) {
                fs.copyFileSync(
                    path.join(rootDir, file),
                    path.join(distDir, file)
                );
            }
        });

        // Publish
        execSync('npm publish', { 
            cwd: distDir,
            stdio: 'inherit'
        });

    } catch (error) {
        console.error('Failed to publish:', error);
        process.exit(1);
    }
}

publish();
