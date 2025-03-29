import { SandboxEnvironment } from '../../sandbox/SandboxEnvironment';
import { MARKET_SCENARIOS, TRADING_STYLES } from './TrainingData';

interface TestResult {
    scenarioName: string;
    duration: number;
    successRate: number;
    profitLoss: number;
    userEngagement: number;
    metrics: any;
}

export class PlaygroundTester {
    private results: TestResult[] = [];
    private testStart: number = 0;

    constructor(private sandbox: SandboxEnvironment) {}

    public async runTestSuite(): Promise<TestResult[]> {
        this.testStart = Date.now();
        await this.runScenarios();
        return this.results;
    }

    private async runScenarios(): Promise<void> {
        const scenarios = [
            {
                name: 'bull_market_high_volume',
                config: {
                    marketCondition: MARKET_SCENARIOS.BULL_MARKET,
                    duration: 1800000, // 30 minutes
                    userCount: 20,
                    tradingStyles: [TRADING_STYLES.AGGRESSIVE, TRADING_STYLES.BALANCED]
                }
            },
            {
                name: 'volatile_market_stress_test',
                config: {
                    marketCondition: MARKET_SCENARIOS.HIGH_VOLATILITY,
                    duration: 900000, // 15 minutes
                    userCount: 50,
                    tradingStyles: [TRADING_STYLES.CONSERVATIVE, TRADING_STYLES.AGGRESSIVE]
                }
            },
            {
                name: 'bear_market_recovery',
                config: {
                    marketCondition: {
                        ...MARKET_SCENARIOS.BEAR_MARKET,
                        trend: -0.8,
                        volatility: 0.7
                    },
                    duration: 1200000, // 20 minutes
                    userCount: 30,
                    tradingStyles: [TRADING_STYLES.CONSERVATIVE]
                }
            }
        ];

        for (const scenario of scenarios) {
            console.log(`Running scenario: ${scenario.name}`);
            await this.runTestScenario(scenario.name, scenario.config);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Cool down
        }
    }

    private async runTestScenario(name: string, config: any): Promise<void> {
        try {
            await this.sandbox.loadScenario(name, config);
            await this.sandbox.runScenario(name);

            const metrics = this.sandbox.collectMetrics();
            this.results.push({
                scenarioName: name,
                duration: Date.now() - this.testStart,
                successRate: this.calculateSuccessRate(metrics),
                profitLoss: this.calculateProfitLoss(metrics),
                userEngagement: this.calculateEngagement(metrics),
                metrics
            });

        } catch (error) {
            console.error(`Scenario ${name} failed:`, error);
        } finally {
            this.sandbox.reset();
        }
    }

    private calculateSuccessRate(metrics: any): number {
        return metrics.tradingActivity?.successfulTrades / metrics.tradingActivity?.totalTrades || 0;
    }

    private calculateProfitLoss(metrics: any): number {
        return metrics.tradingActivity?.totalProfitLoss || 0;
    }

    private calculateEngagement(metrics: any): number {
        return (metrics.activeUsers / metrics.totalUsers) * 
               (metrics.messageCount / (metrics.duration / 60000)); // Messages per minute per user
    }

    public getTestResults(): TestResult[] {
        return this.results;
    }

    public generateReport(): string {
        return this.results.map(result => `
Test Scenario: ${result.scenarioName}
Duration: ${(result.duration / 1000).toFixed(2)}s
Success Rate: ${(result.successRate * 100).toFixed(2)}%
P/L: ${result.profitLoss.toFixed(2)}
User Engagement: ${(result.userEngagement * 100).toFixed(2)}%
-------------------
`).join('\n');
    }
}
