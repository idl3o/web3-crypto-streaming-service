import { BoundaryErasure } from '../boundary-erasure';

describe('BoundaryErasure', () => {
    let erasure: BoundaryErasure;

    beforeEach(() => {
        erasure = new BoundaryErasure();
    });

    test('should erase boundary with high consciousness', async () => {
        const boundary = await erasure.eraseBoundary('test1', 0.9);
        expect(boundary.density).toBeLessThan(0.5);
        expect(boundary.phaseState).toBe('diffuse');
    });

    test('should achieve transcendence at very high consciousness', async () => {
        const boundary = await erasure.eraseBoundary('test2', 0.95);
        const metrics = await erasure.getBoundaryMetrics('test2');
        expect(metrics.canTranscend).toBe(true);
    });

    test('should merge compatible boundaries', async () => {
        await erasure.eraseBoundary('a', 0.8);
        await erasure.eraseBoundary('b', 0.8);
        const merged = await erasure.mergeBoundaries('a', 'b');

        expect(merged).toBeDefined();
        expect(merged?.density).toBeLessThan(0.8);
    });

    test('should increase dimensional flows as density decreases', async () => {
        const boundary = await erasure.eraseBoundary('test3', 0.9);
        expect(Array.from(boundary.dimensionalFlow.values())
            .every(flow => flow > 0)).toBe(true);
    });
});
