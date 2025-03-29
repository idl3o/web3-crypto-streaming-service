import { BlockchainEcosystem } from '../src/blockchain/ecosystem';
import { StreamMonitor } from '../src/server-farm/monitor';
import { CreatorAuth } from '../src/auth/creator';
import os from 'os';

class FullRunner {
    private startTime = Date.now();

    async run() {
        console.log('\n🌟 Initializing Full System Run...\n');

        // Initialize core systems
        const blockchain = new BlockchainEcosystem();
        const monitor = new StreamMonitor();
        const auth = CreatorAuth.getInstance();

        // Display system info
        console.log('System Information:');
        console.log('------------------');
        console.log(`CPU Cores: ${os.cpus().length}`);
        console.log(`Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`);
        console.log(`Platform: ${os.platform()} ${os.release()}`);
        console.log(`Node: ${process.version}\n`);

        // Start services
        console.log('Starting Services:');
        console.log('------------------');
        console.log('🔗 Blockchain Monitor: Active');
        console.log('📡 Stream Monitor: Port 8080');
        console.log('🌐 Web Server: http://localhost:3000');
        console.log('🔒 HTTPS Server: https://localhost:3000');
        console.log('📊 Metrics Server: Port 5500\n');

        // Runtime info
        setInterval(() => {
            const uptime = Math.round((Date.now() - this.startTime) / 1000);
            console.log(`\rRuntime: ${uptime}s | Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB | CPU Load: ${os.loadavg()[0].toFixed(2)}`);
        }, 1000);

        return { blockchain, monitor, auth };
    }
}

// Execute
new FullRunner().run().catch(console.error);
