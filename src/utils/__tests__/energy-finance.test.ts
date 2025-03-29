import { EnergyFinance } from '../energy-finance';
import { BlockchainUtility } from '../blockchain';

describe('EnergyFinance', () => {
    let finance: EnergyFinance;
    let blockchain: BlockchainUtility;

    beforeEach(() => {
        blockchain = new BlockchainUtility(['http://localhost:8545']);
        finance = new EnergyFinance(blockchain);
    });

    test('should create affiliate program', async () => {
        const program = await finance.createProgram(1.0);
        expect(program.id).toBeDefined();
        expect(program.energyStake).toBe(1.0);
        expect(program.affiliates.size).toBe(0);
    });

    test('should join program with stake', async () => {
        const program = await finance.createProgram(1.0);
        const joined = await finance.joinProgram(program.id, 'affiliate1', 0.5);
        expect(joined).toBe(true);
    });

    test('should distribute rewards', async () => {
        const program = await finance.createProgram(1.0);
        await finance.joinProgram(program.id, 'affiliate1', 0.5);
        const rewards = await finance.distributeRewards(program.id);

        expect(rewards.get('affiliate1')).toBeDefined();
        expect(rewards.get('affiliate1')?.amount).toBeGreaterThan(0);
    });

    test('should track affiliate metrics', async () => {
        const program = await finance.createProgram(1.0);
        await finance.joinProgram(program.id, 'affiliate1', 0.5);
        await finance.distributeRewards(program.id);

        const metrics = await finance.getAffiliateMetrics(program.id, 'affiliate1');
        expect(metrics.stake).toBe(0.5);
        expect(metrics.totalRewards).toBeGreaterThan(0);
    });
});
