import WebSocket from 'ws';
import { CryptoDataService } from '../services/CryptoDataService';
import { NetworkingService } from '../services/NetworkingService';

export const testConfig = {
    apiKey: 'test_api_key',
    symbols: ['btcusdt'],
    maxReconnectAttempts: 3,
    reconnectInterval: 1000,
    networkPort: 8081
};

export class MockWebSocket extends WebSocket {
    send(data: any): void {
        // Mock successful subscription response
        setTimeout(() => {
            this.emit('message', JSON.stringify({ result: null, id: 1 }));
        }, 100);
    }
}
