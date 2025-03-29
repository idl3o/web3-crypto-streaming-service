import { CryptoDataService } from '../services/CryptoDataService';
import { NetworkingService } from '../services/NetworkingService';
import { SimulationService } from '../tests/simulation/SimulationService';
import { MARKET_SCENARIOS } from '../tests/simulation/TrainingData';

export class SandboxEnvironment {
    private scenarios: Map<string, any> = new Map();
    private activeScenario?: string;

    constructor(
        private cryptoService: CryptoDataService,
        private networkingService: NetworkingService,
        private simulationService: SimulationService
    ) {}

    public async loadScenario(name: string, config: any): Promise<void> {
        this.scenarios.set(name, {
            config,
            startTime: Date.now(),
            metrics: new Map()
        });
    }

    public async runScenario(name: string): Promise<void> {
        const scenario = this.scenarios.get(name);
        if (!scenario) throw new Error('Scenario not found');

        this.activeScenario = name;
        await this.simulationService.startSimulation();
    }

    public collectMetrics(): any {
        if (!this.activeScenario) return {};
        const scenario = this.scenarios.get(this.activeScenario);
        
        return {
            duration: Date.now() - scenario.startTime,
            activeUsers: this.networkingService.getActiveUsers().length,
            messageCount: this.networkingService.getMessageCount(),
            tradingActivity: this.simulationService.getActivityMetrics()
        };
    }

    public reset(): void {
        this.simulationService.cleanup();
        this.scenarios.clear();
        this.activeScenario = undefined;
    }
}
