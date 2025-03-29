import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { logger } from '../logger';

dotenv.config();

// Define configuration schema
interface ConfigSchema {
    server: {
        port: number;
        host: string;
        httpsEnabled: boolean;
        httpsPort: number;
        sslKeyPath: string;
        sslCertPath: string;
    };
    blockchain: {
        url: string;
        privateKey?: string;
        contractAddress?: string;
    };
    ipfs: {
        apiUrl?: string;
        gateways: string[];
    };
    auth: {
        enabled: boolean;
        tokenExpiry: number;
        jwtSecret: string;
    };
    streaming: {
        contentPath: string;
        maxSize: number;
        allowedFormats: string[];
    };
    monitoring: {
        watchSymbols: string[];
        maxReconnectAttempts: number;
        reconnectInterval: number;
    };
}

/**
 * Config Module - Centralizes configuration management
 */
export class ConfigModule {
    private config: ConfigSchema;

    constructor() {
        // Initialize with defaults
        this.config = {
            server: {
                port: parseInt(process.env.PORT || '3000'),
                host: process.env.HOST || '0.0.0.0',
                httpsEnabled: process.env.SSL_ENABLED === 'true',
                httpsPort: parseInt(process.env.HTTPS_PORT || '3443'),
                sslKeyPath: process.env.SSL_KEY_PATH || './ssl/localhost.key',
                sslCertPath: process.env.SSL_CERT_PATH || './ssl/localhost.crt'
            },
            blockchain: {
                url: process.env.BLOCKCHAIN_URL || 'http://localhost:8545',
                privateKey: process.env.PRIVATE_KEY,
                contractAddress: process.env.CONTRACT_ADDRESS
            },
            ipfs: {
                apiUrl: process.env.IPFS_API_URL,
                gateways: (process.env.IPFS_GATEWAYS || 'https://ipfs.io/ipfs/').split(',')
            },
            auth: {
                enabled: process.env.ACCESS_CONTROL_ENABLED === 'true',
                tokenExpiry: parseInt(process.env.AUTH_TOKEN_EXPIRY || '86400'),
                jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me'
            },
            streaming: {
                contentPath: path.join(process.cwd(), 'content'),
                maxSize: parseInt(process.env.MAX_UPLOAD_SIZE || '1073741824'), // 1GB
                allowedFormats: ['mp4', 'mov', 'avi', 'mkv', 'webm']
            },
            monitoring: {
                watchSymbols: (process.env.WATCH_SYMBOLS || 'btcusdt,ethusdt').split(','),
                maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS || '5'),
                reconnectInterval: parseInt(process.env.RECONNECT_INTERVAL || '5000')
            }
        };

        // Log config loaded
        logger.info('Configuration loaded');

        // Warn if using default JWT secret
        if (this.config.auth.jwtSecret === 'default-secret-change-me') {
            logger.warn('Using default JWT secret. Set JWT_SECRET environment variable for production.');
        }
    }

    /**
     * Get the entire config
     */
    public getConfig(): ConfigSchema {
        return this.config;
    }

    /**
     * Get server config
     */
    public getServerConfig(): ConfigSchema['server'] {
        return this.config.server;
    }

    /**
     * Get blockchain config
     */
    public getBlockchainConfig(): ConfigSchema['blockchain'] {
        return this.config.blockchain;
    }

    /**
     * Get IPFS config
     */
    public getIPFSConfig(): ConfigSchema['ipfs'] {
        return this.config.ipfs;
    }

    /**
     * Get auth config
     */
    public getAuthConfig(): ConfigSchema['auth'] {
        return this.config.auth;
    }

    /**
     * Get streaming config
     */
    public getStreamingConfig(): ConfigSchema['streaming'] {
        return this.config.streaming;
    }

    /**
     * Get monitoring config
     */
    public getMonitoringConfig(): ConfigSchema['monitoring'] {
        return this.config.monitoring;
    }
}

// Export singleton instance
export const config = new ConfigModule();
