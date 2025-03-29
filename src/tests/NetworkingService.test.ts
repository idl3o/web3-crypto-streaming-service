import { NetworkingService } from '../services/NetworkingService';
import WebSocket from 'ws';

describe('NetworkingService', () => {
    let service: NetworkingService;
    let client: WebSocket;

    beforeEach(() => {
        service = new NetworkingService(8082);
        client = new WebSocket('ws://localhost:8082');
    });

    afterEach(() => {
        client.close();
        service.cleanup();
    });

    test('should create room', (done) => {
        const roomId = service.createRoom('test-room', 'public');
        expect(roomId).toBeDefined();
        done();
    });

    test('should handle messages', (done) => {
        client.on('open', () => {
            client.send(JSON.stringify({
                type: 'chat',
                content: 'test message'
            }));
        });

        client.on('message', (data) => {
            const message = JSON.parse(data.toString());
            expect(message.content).toBe('test message');
            done();
        });
    });
});
