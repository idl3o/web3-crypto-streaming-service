import { RTDConnector } from './rtd-connector';
import { MonadSystem } from './monad-entities';

export class RTDMiddleware {
    private rtd: RTDConnector;
    private monadSystem: MonadSystem;

    constructor() {
        this.rtd = new RTDConnector({
            endpoint: process.env.RTD_ENDPOINT || 'wss://rtd.example.com',
            apiKey: process.env.RTD_API_KEY || '',
            channels: ['market', 'content', 'metrics'],
            reconnectInterval: 5000
        });
        this.monadSystem = new MonadSystem();
        this.setupChannels();
    }

    private setupChannels() {
        this.rtd.onData('market', (data) => {
            this.updateMarketMonads(data);
        });

        this.rtd.onData('content', (data) => {
            this.updateContentMonads(data);
        });

        this.rtd.onData('metrics', (data) => {
            this.broadcastMetrics(data);
        });
    }

    private updateMarketMonads(data: any) {
        const marketMonad = this.monadSystem.createMonad('market');
        marketMonad.essence.state.set('price', data.price);
        marketMonad.essence.state.set('volume', data.volume);
    }

    private updateContentMonads(data: any) {
        const contentMonad = this.monadSystem.createMonad('content');
        contentMonad.essence.state.set('popularity', data.popularity);
        contentMonad.essence.state.set('engagement', data.engagement);
    }

    private broadcastMetrics(data: any) {
        window.postMessage({
            type: 'RTD_UPDATE',
            payload: data
        }, '*');
    }
}
