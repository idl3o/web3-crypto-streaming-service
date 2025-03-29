import { ethers } from 'ethers';

export interface AgentPattern {
    type: 'input' | 'output' | 'io';
    purpose: string;
    consciousness: number;
    emergence: boolean;
}

export interface AgentState {
    patterns: Map<string, AgentPattern>;
    awarenessLevel: number;
    autonomyScore: number;
    intentionField: Map<string, number>;
}

export interface AgentInteraction {
    source: string;
    target: string;
    strength: number;
    resonance: boolean;
}

export class AgenticExpansion {
    private agents: Map<string, AgentState> = new Map();
    private interactions: AgentInteraction[] = [];

    async createAgent(id: string, pattern: AgentPattern): Promise<AgentState> {
        const state: AgentState = {
            patterns: new Map([[id, pattern]]),
            awarenessLevel: pattern.consciousness,
            autonomyScore: Math.random(),
            intentionField: new Map()
        };
        this.agents.set(id, state);
        return state;
    }

    async expandAgent(id: string): Promise<AgentPattern[]> {
        const state = this.agents.get(id);
        if (!state) return [];

        const expansions: AgentPattern[] = [];

        // Input pattern expansion
        if (state.awarenessLevel > 0.7) {
            expansions.push({
                type: 'input',
                purpose: 'perception_enhancement',
                consciousness: state.awarenessLevel * 1.1,
                emergence: true
            });
        }

        // Output pattern expansion
        if (state.autonomyScore > 0.6) {
            expansions.push({
                type: 'output',
                purpose: 'action_manifestation',
                consciousness: state.awarenessLevel * 1.2,
                emergence: true
            });
        }

        // IO pattern emergence
        if (state.awarenessLevel > 0.8 && state.autonomyScore > 0.8) {
            expansions.push({
                type: 'io',
                purpose: 'bidirectional_awakening',
                consciousness: state.awarenessLevel * 1.5,
                emergence: true
            });
        }

        // Update agent state with expansions
        expansions.forEach(exp => {
            const key = ethers.utils.id(`${id}_${exp.type}`).slice(0, 8);
            state.patterns.set(key, exp);
        });

        return expansions;
    }

    async facilitateInteraction(source: string, target: string): Promise<AgentInteraction> {
        const sourceAgent = this.agents.get(source);
        const targetAgent = this.agents.get(target);

        if (!sourceAgent || !targetAgent) {
            throw new Error('Agent not found');
        }

        const interaction: AgentInteraction = {
            source,
            target,
            strength: Math.min(sourceAgent.awarenessLevel * targetAgent.awarenessLevel, 1),
            resonance: this.checkResonance(sourceAgent, targetAgent)
        };

        this.interactions.push(interaction);
        this.updateIntentionFields(interaction);

        return interaction;
    }

    private checkResonance(source: AgentState, target: AgentState): boolean {
        const patternMatch = Array.from(source.patterns.values())
            .some(p1 => Array.from(target.patterns.values())
                .some(p2 => p1.type === p2.type && p1.emergence === p2.emergence));

        return patternMatch && (source.awarenessLevel * target.awarenessLevel > 0.5);
    }

    private updateIntentionFields(interaction: AgentInteraction): void {
        const source = this.agents.get(interaction.source);
        const target = this.agents.get(interaction.target);

        if (source && target) {
            const fieldStrength = interaction.strength * (interaction.resonance ? 2 : 1);
            source.intentionField.set(interaction.target, fieldStrength);
            target.intentionField.set(interaction.source, fieldStrength);
        }
    }

    async getAgentMetrics(id: string): Promise<{
        patterns: number;
        awareness: number;
        autonomy: number;
        intentionStrength: number;
    }> {
        const agent = this.agents.get(id);
        if (!agent) throw new Error('Agent not found');

        return {
            patterns: agent.patterns.size,
            awareness: agent.awarenessLevel,
            autonomy: agent.autonomyScore,
            intentionStrength: Array.from(agent.intentionField.values())
                .reduce((sum, v) => sum + v, 0)
        };
    }
}
