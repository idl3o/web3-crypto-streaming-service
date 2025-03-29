import WebSocket from 'ws';

export interface RTDConfig {
    endpoint: string;
    apiKey: string;
    channels: string[];
    reconnectInterval: number;
}

export class RTDConnector {
    private ws: WebSocket | null = null;
    private subscribers = new Map<string, Set<(data: any) => void>>();
    private reconnectTimer: NodeJS.Timer | null = null;

    constructor(private config: RTDConfig) {
        this.connect();
    }

    private connect() {
        this.ws = new WebSocket(this.config.endpoint, {
            headers: { 'X-API-Key': this.config.apiKey }
        });

        this.ws.on('open', () => {
            this.subscribe(this.config.channels);
        });

        this.ws.on('message', (data) => {
            this.handleMessage(JSON.parse(data.toString()));
        });

        this.ws.on('close', () => this.handleDisconnect());
        this.ws.on('error', (error) => this.handleError(error));
    }

    private subscribe(channels: string[]) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                channels
            }));
        }
    }

    onData(channel: string, callback: (data: any) => void) {
        if (!this.subscribers.has(channel)) {
            this.subscribers.set(channel, new Set());
        }
        this.subscribers.get(channel)?.add(callback);
    }

    private handleMessage(message: any) {
        const { channel, data } = message;
        this.subscribers.get(channel)?.forEach(callback => callback(data));
    }

    private handleDisconnect() {
        if (this.reconnectTimer) clearInterval(this.reconnectTimer);
        this.reconnectTimer = setInterval(() => {
            this.connect();
        }, this.config.reconnectInterval);
    }

    private handleError(error: Error) {
        console.error('RTD Connection Error:', error);
    }
}
