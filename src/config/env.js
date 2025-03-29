/**
 * Environment Configuration
 * 
 * Securely manages API keys and other sensitive configuration values
 * for the Web3 Crypto Streaming platform.
 */

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
    try {
        require('dotenv').config();
    } catch (error) {
        console.warn('dotenv not installed, skipping .env loading');
    }
}

// API key configuration with fallbacks
export const apiKeys = {
    google: {
        maps: process.env.GOOGLE_MAPS_API_KEY || '',
        youtube: process.env.GOOGLE_YOUTUBE_API_KEY || '',
        analytics: process.env.GOOGLE_ANALYTICS_API_KEY || ''
    },
    blockchain: {
        infura: process.env.INFURA_API_KEY || '',
        alchemy: process.env.ALCHEMY_API_KEY || '',
        moralis: process.env.MORALIS_API_KEY || '',
        binance: process.env.BINANCE_API_KEY || '',
        bnb: process.env.BNB_API_KEY || ''
    },
    ipfs: {
        infura: process.env.IPFS_INFURA_API_KEY || '',
        pinata: process.env.PINATA_API_KEY || ''
    },
    security: {
        recaptcha: process.env.RECAPTCHA_SITE_KEY || '',
        sentinel: process.env.SENTINEL_API_KEY || '',
        secureToken: process.env.SECURE_API_TOKEN || '', // Add your token reference here
        apiSecret: process.env.API_SECRET_KEY || ''  // Add the new secret key
    }
};

// Check if required API keys are available
export function validateRequiredKeys() {
    const missingKeys = [];

    // Add critical API key checks here
    if (!apiKeys.blockchain.infura && !apiKeys.blockchain.alchemy) {
        missingKeys.push('No blockchain provider API key (INFURA_API_KEY or ALCHEMY_API_KEY)');
    }
    
    // Add BNB Chain check
    if (process.env.DEFAULT_NETWORK === 'bnb' && !apiKeys.blockchain.bnb && !apiKeys.blockchain.binance) {
        missingKeys.push('No BNB Chain API key (BNB_API_KEY or BINANCE_API_KEY)');
    }

    if (missingKeys.length > 0) {
        console.warn('Missing required API keys:', missingKeys.join(', '));
        return false;
    }

    return true;
}

// Environment detection
export const environment = {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
    appUrl: process.env.APP_URL || 'http://localhost:3000'
};

export default {
    apiKeys,
    validateRequiredKeys,
    environment
};
