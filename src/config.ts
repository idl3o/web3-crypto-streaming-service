export const config = {
    server: {
        host: 'localhost',
        port: 3000,
        baseUrl: 'http://localhost:3000'
    },
    api: {
        version: 'v1',
        endpoint: '/api',
        cryptoApiKey: process.env.CRYPTO_API_KEY || '',
        cryptoEndpoints: {
            websocket: 'wss://stream.binance.com:9443/ws',
            rest: 'https://api.binance.com/api/v3'
        }
    },
    crypto: {
        defaultPairs: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
        updateInterval: 1000,
        priceDecimals: 2
    },
    social: {
        twitter: {
            apiKey: process.env.TWITTER_API_KEY || '',
            keywords: ['#bitcoin', '#crypto', '#ethereum'],
            updateInterval: 5000
        }
    },
    sentiment: {
        updateInterval: 60000,
        influenceWeight: 0.3
    }
};
