import dotenv from 'dotenv';
import path from 'path';
import { farm } from '../server-farm/simulator';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

class MachineRunner {
    private isRunning = false;
    private intervalId?: NodeJS.Timeout;

    constructor() {
        console.log('🤖 Machine Runner initializing...');
    }

    public start(): void {
        if (this.isRunning) {
            console.log('Machine Runner is already running');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Machine Runner started');

        // Start monitoring streams
        const streamIds = process.env.WATCH_SYMBOLS ?
            process.env.WATCH_SYMBOLS.split(',') :
            ['localhost:3000', 'default-stream'];

        this.intervalId = setInterval(() => {
            for (const streamId of streamIds) {
                farm.observeStream(streamId);
            }
        }, 2000);

        // Handle graceful shutdown
        process.on('SIGINT', this.shutdown.bind(this));
        process.on('SIGTERM', this.shutdown.bind(this));
    }

    public shutdown(): void {
        if (!this.isRunning) {
            return;
        }

        console.log('🛑 Machine Runner shutting down...');

        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        farm.stopSimulation();
        this.isRunning = false;
        console.log('👋 Machine Runner stopped');

        // Allow other handlers to run before exiting
        setTimeout(() => {
            process.exit(0);
        }, 500);
    }
}

// Start the runner when this file is executed directly
if (require.main === module) {
    const runner = new MachineRunner();
    runner.start();
}

export default MachineRunner;
