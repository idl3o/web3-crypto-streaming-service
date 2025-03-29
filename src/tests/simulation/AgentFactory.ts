import { TRADING_STYLES, MARKET_SCENARIOS } from './TrainingData';
import { SimUser, TradingBehavior } from './types';

export class AgentFactory {
    private agentCounter: number = 0;

    public createAgentGroup(
        basePersona: any,
        count: number,
        variationRange: number = 0.2
    ): SimUser[] {
        const agents: SimUser[] = [];
        
        for (let i = 0; i < count; i++) {
            const variation = this.calculateVariation(variationRange);
            const agent = this.createVariatedAgent(basePersona, variation);
            agents.push(agent);
        }

        return agents;
    }

    private createVariatedAgent(base: any, variation: number): SimUser {
        const id = this.generateAgentId();
        return {
            id,
            username: `${base.name}_${id}`,
            room: base.room || 'trading_room',
            tradingPairs: [...base.pairs],
            messageInterval: this.varyValue(base.interval, variation),
            avatar: {
                name: `${base.name}_${id}`,
                type: base.type,
                behavior: this.varyBehavior(base.behavior, variation),
                expertise: this.varyValue(base.expertise, variation / 2),
                successRate: this.varyValue(base.successRate, variation / 2)
            }
        };
    }

    private varyBehavior(behavior: TradingBehavior, variation: number): TradingBehavior {
        return {
            riskTolerance: this.varyValue(behavior.riskTolerance, variation),
            tradingFrequency: this.varyValue(behavior.tradingFrequency, variation),
            positionSize: this.varyValue(behavior.positionSize, variation),
            preferredTimeframe: behavior.preferredTimeframe,
            strategy: behavior.strategy
        };
    }

    private varyValue(base: number, variation: number): number {
        const delta = (Math.random() * 2 - 1) * variation;
        return Math.max(0, Math.min(1, base + delta));
    }

    private calculateVariation(baseVariation: number): number {
        return baseVariation * (0.5 + Math.random() * 0.5);
    }

    private generateAgentId(): string {
        return `agent_${++this.agentCounter}_${Date.now()}`;
    }
}
