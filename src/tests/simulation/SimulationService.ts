import { NetworkingService } from '../../services/NetworkingService';
import { CryptoDataService } from '../../services/CryptoDataService';
import { MarketCondition, MARKET_SCENARIOS, TRADING_STYLES } from './TrainingData';
import { AgentFactory } from './AgentFactory';

interface TradingBehavior {
    riskTolerance: number;  // 0-1
    tradingFrequency: number;  // milliseconds
    positionSize: number;  // 0-1
    preferredTimeframe: 'short' | 'medium' | 'long';
    strategy: 'trend' | 'reversal' | 'breakout' | 'scalping';
}

interface SimUser {
    id: string;
    username: string;
    room: string;
    tradingPairs: string[];
    messageInterval: number;
    avatar: {
        name: string;
        type: 'whale' | 'dayTrader' | 'swingTrader' | 'scalper' | 'botTrader';
        behavior: TradingBehavior;
        expertise: number;  // 0-1
        successRate: number;  // 0-1
    };
}

interface SimulationConfig {
    marketCondition: MarketCondition;
    duration: number;
    userCount: number;
}

export class SimulationService {
    private agentFactory: AgentFactory;
    private users: SimUser[] = [];
    private intervals: NodeJS.Timeout[] = [];
    private currentMarketCondition: MarketCondition;

    private readonly TRADING_PERSONAS = [
        {
            name: 'BitcoinWhale',
            type: 'whale' as const,
            pairs: ['btcusdt'],
            interval: 5000,
            behavior: {
                riskTolerance: 0.8,
                tradingFrequency: 5000,
                positionSize: 0.9,
                preferredTimeframe: 'long' as const,
                strategy: 'trend' as const
            },
            expertise: 0.9,
            successRate: 0.85
        },
        {
            name: 'ScalpMaster',
            type: 'scalper' as const,
            pairs: ['ethusdt', 'btcusdt'],
            interval: 1000,
            behavior: {
                riskTolerance: 0.3,
                tradingFrequency: 1000,
                positionSize: 0.2,
                preferredTimeframe: 'short' as const,
                strategy: 'scalping' as const
            },
            expertise: 0.75,
            successRate: 0.65
        },
        {
            name: 'TrendHunter',
            type: 'swingTrader' as const,
            pairs: ['btcusdt', 'ethusdt', 'solusdt'],
            interval: 8000,
            behavior: {
                riskTolerance: 0.6,
                tradingFrequency: 8000,
                positionSize: 0.5,
                preferredTimeframe: 'medium' as const,
                strategy: 'trend' as const
            },
            expertise: 0.8,
            successRate: 0.7
        },
        {
            name: 'AlgoBot',
            type: 'botTrader' as const,
            pairs: ['btcusdt', 'ethusdt', 'dogeusdt'],
            interval: 2000,
            behavior: {
                riskTolerance: 0.4,
                tradingFrequency: 2000,
                positionSize: 0.3,
                preferredTimeframe: 'short' as const,
                strategy: 'breakout' as const
            },
            expertise: 0.95,
            successRate: 0.72
        }
    ];

    private readonly ADVANCED_TRADING_PERSONAS = [
        {
            name: 'BitcoinWhale',
            type: 'whale' as const,
            pairs: ['btcusdt'],
            interval: 5000,
            behavior: {
                ...TRADING_STYLES.CONSERVATIVE,
                riskTolerance: 0.8,
                positionSize: 0.9,
                strategy: 'trend' as const
            },
            marketAdaptation: 0.9,
            expertise: 0.95
        },
        // ...more sophisticated personas...
    ];

    constructor(
        private networkingService: NetworkingService,
        private cryptoService: CryptoDataService,
        private config?: SimulationConfig
    ) {
        this.currentMarketCondition = config?.marketCondition || MARKET_SCENARIOS.BULL_MARKET;
        this.agentFactory = new AgentFactory();
    }

    public startSimulation(): void {
        this.createMultiAgentGroups();
        this.simulateUserActivity();
    }

    private createMultiAgentGroups(): void {
        // Create varied groups of agents from base personas
        this.TRADING_PERSONAS.forEach(persona => {
            const agentCount = this.determineAgentCount(persona);
            const agents = this.agentFactory.createAgentGroup(persona, agentCount);
            
            agents.forEach(agent => {
                this.users.push(agent);
                this.networkingService.joinRoom(agent.id, agent.room);
            });
        });
    }

    private determineAgentCount(persona: any): number {
        // Determine number of agents based on persona type
        switch (persona.type) {
            case 'whale': return 2 + Math.floor(Math.random() * 3);
            case 'scalper': return 5 + Math.floor(Math.random() * 5);
            case 'swingTrader': return 3 + Math.floor(Math.random() * 4);
            case 'botTrader': return 4 + Math.floor(Math.random() * 6);
            default: return 1;
        }
    }

    private simulateUserActivity(): void {
        this.users.forEach(user => {
            const interval = setInterval(() => {
                this.simulateTradeSignal(user);
            }, user.messageInterval);
            this.intervals.push(interval);
        });
    }

    private simulateTradeSignal(user: SimUser): void {
        const pair = user.tradingPairs[Math.floor(Math.random() * user.tradingPairs.length)];
        const behavior = user.avatar.behavior;
        const marketInfluence = this.calculateMarketInfluence(behavior);
        
        const signal = {
            symbol: pair,
            type: this.determineTradeType(behavior),
            entry: Math.random() * 1000,
            target: Math.random() * 1200,
            stopLoss: Math.random() * 800,
            timestamp: Date.now(),
            confidence: this.calculateConfidence(behavior, marketInfluence),
            risk: this.calculateRisk(behavior, this.currentMarketCondition),
            expectedReturn: this.calculateExpectedReturn(behavior, marketInfluence),
            timeframe: behavior.preferredTimeframe,
            strategy: behavior.strategy,
            positionSize: behavior.positionSize * 100, // as percentage
            successProbability: user.avatar.successRate * 100 // as percentage
        };

        this.networkingService.shareTradeSignal(user.id, user.room, signal);
    }

    private determineTradeType(behavior: TradingBehavior): 'LONG' | 'SHORT' {
        // Use behavior parameters to influence trade direction
        const randomFactor = Math.random();
        const bias = behavior.riskTolerance > 0.5 ? 0.6 : 0.4; // Risk-tolerant traders tend to go long
        return randomFactor > bias ? 'SHORT' : 'LONG';
    }

    private calculateMarketInfluence(behavior: TradingBehavior): number {
        const marketAlignment = behavior.strategy === 'trend' ? 
            Math.abs(this.currentMarketCondition.trend) : 
            this.currentMarketCondition.volatility;
        
        return marketAlignment * behavior.riskTolerance;
    }

    private calculateConfidence(behavior: TradingBehavior, marketInfluence: number): number {
        return (behavior.riskTolerance * 0.3 + marketInfluence * 0.7) * 
               Math.min(1, behavior.tradingFrequency / 5000);
    }

    private calculateRisk(behavior: TradingBehavior, market: MarketCondition): number {
        return Math.min(1, behavior.riskTolerance * market.volatility);
    }

    private calculateExpectedReturn(behavior: TradingBehavior, marketInfluence: number): number {
        return behavior.positionSize * marketInfluence * 
               (1 + Math.abs(this.currentMarketCondition.trend));
    }

    public cleanup(): void {
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        this.users = [];
    }
}
