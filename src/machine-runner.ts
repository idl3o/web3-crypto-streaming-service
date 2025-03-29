import { StreamMonitor } from './server-farm/monitor';
import os from 'os';
import { CreatorAuth } from './auth/creator';
import { BlockchainEcosystem } from './blockchain/ecosystem';

class MachineRunner {
    private monitor: StreamMonitor;
    private blockchain: BlockchainEcosystem;

    constructor() {
        this.monitor = new StreamMonitor();
        const auth = CreatorAuth.getInstance();
        this.initialize();
        console.log('🔐 Creator Token:', auth.getCreatorToken());
        this.blockchain = new BlockchainEcosystem();
        this.initBlockchain();
    }

    private showStartupBanner() {
        console.log(`
        🚀 Web3 Crypto Streaming Service 🚀
        =====================================
        █▀▀▀▀▀█ █▄░▄█ █▀▀▀▀▀█
        █░░░░░█ █░█░█ █░░░░░█
        █░█▀█░█ █░░░█ █░█▀█░█
        █░█▄█░█ █░░░█ █░█▄█░█
        █░░░░░█ █░░░█ █░░░░░█
        █▄▄▄▄▄█ █░░░█ █▄▄▄▄▄█

        Mood: ${this.getDeveloperMood()} | Achievement Progress: 🏆 ${this.getAchievements()}/10
        `);
    }

    private getDeveloperMood(): string {
        const moods = ['😎 Coding Like a Boss', '🤓 Deep in the Matrix', '🧙‍♂️ Wizarding'];
        return moods[Math.floor(Math.random() * moods.length)];
    }

    private getAchievements(): number {
        return Math.floor(Math.random() * 10) + 1;
    }

    private async initialize() {
        this.showStartupBanner();
        console.log('🚀 Starting Web3 Crypto Streaming Service...');
        console.log('📡 Initializing machine runner...');
        await this.trackMachineMetrics();
        console.log('✨ Machine runner ready at:', os.hostname());
        console.log('🌎 Available at: http://localhost:3000');
        console.log('📊 Metrics at: ws://localhost:8080');
    }

    private async initBlockchain() {
        await this.blockchain.monitorBlocks();
        this.blockchain.on('newBlock', (block) => {
            console.log('🔗 New block:', block.number);
        });
    }

    private async trackMachineMetrics() {
        setInterval(() => {
            const metrics = {
                cpu: os.loadavg(),
                memory: process.memoryUsage(),
                uptime: os.uptime(),
                hostname: os.hostname()
            };
            console.log('Machine Metrics:', metrics);
        }, 5000);
    }
}

// Auto-start
console.log('Starting services...');
new MachineRunner();
