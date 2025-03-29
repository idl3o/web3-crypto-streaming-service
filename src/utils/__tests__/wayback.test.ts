import { WaybackInspiration } from '../wayback';

describe('WaybackInspiration', () => {
    let wayback: WaybackInspiration;

    beforeEach(() => {
        wayback = new WaybackInspiration();
    });

    test('should inspect historical timeline', async () => {
        const nodes = await wayback.inspectTimeline('example.com', 1995);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].memoryHash).toBeDefined();
    });

    test('should calculate inspiration score', async () => {
        const nodes = await wayback.inspectTimeline('example.com', 1990);
        expect(nodes[0].inspirationScore).toBeGreaterThan(0);
        expect(nodes[0].inspirationScore).toBeLessThanOrEqual(1);
    });

    test('should analyze patterns by era', async () => {
        const nodes = await wayback.inspectTimeline('example.com', 2000);
        const metrics = await wayback.getInspirationMetrics(nodes[0].memoryHash);
        expect(metrics.era).toBe('web2');
    });

    test('should track evolution paths', async () => {
        const nodes = await wayback.inspectTimeline('example.com', 2020);
        const metrics = await wayback.getInspirationMetrics(nodes[0].memoryHash);
        expect(metrics.evolution).toContain('decentralized');
    });
});
