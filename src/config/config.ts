interface AppConfig {
    apiKey: string;
    symbols: string[];
    maxReconnectAttempts: number;
    reconnectInterval: number;
    networkPort: number;
    maxConnections?: number;
}

export const loadConfig = (): AppConfig => {
    return {
        apiKey: process.env.BINANCE_API_KEY || '',
        symbols: (process.env.WATCH_SYMBOLS || 'btcusdt,ethusdt').split(','),
        maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS || '5'),
        reconnectInterval: parseInt(process.env.RECONNECT_INTERVAL || '5000'),
        networkPort: parseInt(process.env.NETWORK_PORT || '8080'),
        maxConnections: parseInt(process.env.MAX_CONNECTIONS || '1000'),
    };
};
