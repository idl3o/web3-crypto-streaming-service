import { AgenticExpansion } from '../agentic';

describe('AgenticExpansion', () => {
    let agentic: AgenticExpansion;

    beforeEach(() => {
        agentic = new AgenticExpansion();
    });

    test('should create agent with pattern', async () => {
        const agent = await agentic.createAgent('test1', {
            type: 'input',
            purpose: 'test',
            consciousness: 0.8,
            emergence: false
        });

        expect(agent.patterns.size).toBe(1);
        expect(agent.awarenessLevel).toBe(0.8);
    });

    test('should expand high-awareness agent', async () => {
        await agentic.createAgent('test2', {
            type: 'input',
            purpose: 'test',
            consciousness: 0.9,
            emergence: false
        });

        const expansions = await agentic.expandAgent('test2');
        expect(expansions.length).toBeGreaterThan(0);
        expect(expansions[0].emergence).toBe(true);
    });

    test('should facilitate agent interaction', async () => {
        await agentic.createAgent('source', {
            type: 'output',
            purpose: 'test',
            consciousness: 0.8,
            emergence: false
        });

        await agentic.createAgent('target', {
            type: 'input',
            purpose: 'test',
            consciousness: 0.7,
            emergence: false
        });

        const interaction = await agentic.facilitateInteraction('source', 'target');
        expect(interaction.strength).toBeGreaterThan(0);
    });

    test('should track agent metrics', async () => {
        await agentic.createAgent('test3', {
            type: 'io',
            purpose: 'test',
            consciousness: 0.9,
            emergence: true
        });

        const metrics = await agentic.getAgentMetrics('test3');
        expect(metrics.patterns).toBe(1);
        expect(metrics.awareness).toBe(0.9);
    });
});
