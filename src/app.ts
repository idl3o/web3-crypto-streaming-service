import { CryptoDataService } from './services/CryptoDataService';
import { NetworkingService } from './services/NetworkingService';
import { SimulationService } from './tests/simulation/SimulationService';
import { loadConfig } from './config/config';
import { performance } from 'perf_hooks';
import { SandboxEnvironment } from './sandbox/SandboxEnvironment';
import { PlaygroundTester } from './tests/simulation/PlaygroundTester';

class CryptoApp {
    private cryptoService: CryptoDataService;
    private networkingService: NetworkingService;
    private simulationService?: SimulationService;
    private sandboxEnvironment?: SandboxEnvironment;
    private startTime: number;
    private healthCheckInterval?: NodeJS.Timeout;

    constructor() {
        const config = loadConfig();
        this.cryptoService = new CryptoDataService(config);
        this.networkingService = new NetworkingService(config.networkPort);
        this.setupEventHandlers();

        if (process.env.NODE_ENV === 'development') {
            this.simulationService = new SimulationService(
                this.networkingService,
                this.cryptoService
            );
            this.simulationService.startSimulation();
            this.sandboxEnvironment = new SandboxEnvironment(
                this.cryptoService,
                this.networkingService,
                this.simulationService!
            );
            this.setupSandboxScenarios();
        }

        this.startTime = performance.now();
        this.setupHealthCheck();
        this.setupErrorHandlers();
    }

    private setupEventHandlers(): void {
        // Handle graceful shutdown
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());

        // Example price update handler
        this.cryptoService.onPriceUpdate('btcusdt', (data) => {
            console.log(`BTC/USDT: $${data.price} @ ${new Date(data.timestamp).toISOString()}`);
        });
    }

    private setupErrorHandlers(): void {
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            this.cleanup('Uncaught Exception');
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection:', reason);
            this.cleanup('Unhandled Rejection');
        });
    }

    private setupHealthCheck(): void {
        this.healthCheckInterval = setInterval(() => {
            const memoryUsage = process.memoryUsage();
            const uptime = performance.now() - this.startTime;
            console.log('Health Check:', {
                uptime: `${(uptime / 1000).toFixed(2)}s`,
                memory: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
                connections: this.networkingService.getConnectionCount()
            });
        }, 30000);
    }

    private async runPlaygroundTests(): Promise<void> {
        if (this.sandboxEnvironment && process.env.NODE_ENV === 'development') {
            const tester = new PlaygroundTester(this.sandboxEnvironment);
            const results = await tester.runTestSuite();
            console.log('\nPlayground Test Results:');
            console.log(tester.generateReport());
        }
    }

    private setupSandboxScenarios(): void {
        if (!this.sandboxEnvironment) return;

        // Example scenarios
        this.sandboxEnvironment.loadScenario('highVolatility', {
            marketCondition: MARKET_SCENARIOS.HIGH_VOLATILITY,
            duration: 3600000, // 1 hour
            userCount: 10
        });

        this.sandboxEnvironment.loadScenario('bearMarket', {
            marketCondition: MARKET_SCENARIOS.BEAR_MARKET,
            duration: 1800000, // 30 minutes
            userCount: 5
        });

        this.runPlaygroundTests().catch(console.error);
    }

    private shutdown(): void {
        console.log('Shutting down...');
        this.simulationService?.cleanup();
        this.cryptoService.cleanup();
        this.networkingService.cleanup();
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        process.exit(0);
    }

    private cleanup(reason: string): void {
        console.log(`Shutting down due to: ${reason}`);
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        this.simulationService?.cleanup();
        this.cryptoService.cleanup();
        this.networkingService.cleanup();
        process.exit(0);
    }
}

// Start the application
new CryptoApp();
