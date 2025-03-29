import { MediaGenerator } from '../media-gen';
import { BlockchainUtility } from '../blockchain';

describe('MediaGenerator', () => {
    let mediaGen: MediaGenerator;
    let blockchain: BlockchainUtility;

    beforeEach(() => {
        blockchain = new BlockchainUtility(['http://localhost:8545']);
        mediaGen = new MediaGenerator(blockchain);
    });

    test('should generate KOL profile', async () => {
        const kol = await mediaGen.generateKOL(0.5);
        expect(kol.id).toBeDefined();
        expect(kol.consciousness).toBe(0.5);
        expect(kol.topics.has('dreamtime')).toBe(true);
    });

    test('should synthesize content', async () => {
        const kol = await mediaGen.generateKOL(0.6);
        const content = await mediaGen.synthesizeContent(kol.id);

        expect(content.type).toBe('vision');
        expect(content.creator).toBe(kol.id);
        expect(content.resonanceScore).toBeGreaterThan(0);
    });

    test('should evolve KOL consciousness', async () => {
        const kol = await mediaGen.generateKOL(0.7);
        await mediaGen.evolveKOL(kol.id);

        const metrics = await mediaGen.getKOLMetrics(kol.id);
        expect(metrics.influence).toBeGreaterThan(0);
        expect(metrics.topicCoverage.length).toBeGreaterThan(0);
    });

    test('should track content associations', async () => {
        const kol = await mediaGen.generateKOL(0.8);
        const content = await mediaGen.synthesizeContent(kol.id);

        expect(content.associations.size).toBeGreaterThan(0);
        expect(Array.from(content.associations.values())[0]).toBeGreaterThan(0);
    });
});
