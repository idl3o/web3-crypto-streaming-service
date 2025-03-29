import { CryptoDataService } from '../services/CryptoDataService';
import { testConfig } from './setup';

describe('CryptoDataService', () => {
    let service: CryptoDataService;

    beforeEach(() => {
        service = new CryptoDataService(testConfig);
    });

    afterEach(() => {
        service.cleanup();
    });

    test('should subscribe to symbol', async () => {
        const result = await service.subscribeToSymbol('btcusdt');
        expect(result).toBe(true);
        expect(service.getActiveSubscriptions()).toContain('btcusdt');
    });

    test('should handle price updates', (done) => {
        service.onPriceUpdate('btcusdt', (data) => {
            expect(data.symbol).toBe('btcusdt');
            expect(typeof data.price).toBe('number');
            done();
        });
    });
});
