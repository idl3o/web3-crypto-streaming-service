/**
 * Web3 Crypto Streaming Service SDK Client
 */

import { SDKOptions, SDKEnvironment } from './types';
import { ContentClient } from './clients/content';
import { PaymentClient } from './clients/payment';
import { AuthClient } from './clients/auth';
import { StreamingClient } from './clients/streaming';
import { BlockchainClient } from './clients/blockchain';
import { MetadataClient } from './clients/metadata';

// Default SDK options
const DEFAULT_OPTIONS: SDKOptions = {
    environment: SDKEnvironment.PRODUCTION,
    timeout: 30000,
    retryAttempts: 3,
    persistCache: true,
    disableTelemetry: false,
    logLevel: 'error'
};

/**
 * Main SDK client for integrating with Web3 Crypto Streaming Service
 */
export class W3CStreamingClient {
    private options: SDKOptions;
    private baseUrl: string;

    // Service clients
    public content: ContentClient;
    public payment: PaymentClient;
    public auth: AuthClient;
    public streaming: StreamingClient;
    public blockchain: BlockchainClient;
    public metadata: MetadataClient;

    /**
     * Create a new SDK client instance
     * @param options Configuration options for the SDK
     */
    constructor(options: SDKOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.baseUrl = this.resolveBaseUrl();

        // Initialize service clients
        this.content = new ContentClient(this.baseUrl, this.options);
        this.payment = new PaymentClient(this.baseUrl, this.options);
        this.auth = new AuthClient(this.baseUrl, this.options);
        this.streaming = new StreamingClient(this.baseUrl, this.options);
        this.blockchain = new BlockchainClient(this.baseUrl, this.options);
        this.metadata = new MetadataClient(this.baseUrl, this.options);

        // Initialize SDK
        this.initialize();
    }

    /**
     * Initialize the SDK
     * @private
     */
    private initialize(): void {
        // Configure telemetry
        if (!this.options.disableTelemetry) {
            this.setupTelemetry();
        }

        // Log initialization
        this.log('info', `SDK initialized in ${this.options.environment} environment`);
    }

    /**
     * Resolve base URL based on environment
     * @private
     */
    private resolveBaseUrl(): string {
        // If custom base URL is provided, use it
        if (this.options.baseUrl) {
            return this.options.baseUrl;
        }

        // Otherwise, use environment-specific URLs
        switch (this.options.environment) {
            case SDKEnvironment.PRODUCTION:
                return 'https://api.web3cryptostreaming.com';
            case SDKEnvironment.STAGING:
                return 'https://api.staging.web3cryptostreaming.com';
            case SDKEnvironment.DEVELOPMENT:
                return 'https://api.dev.web3cryptostreaming.com';
            case SDKEnvironment.LOCAL:
                return 'http://localhost:3000';
            default:
                return 'https://api.web3cryptostreaming.com';
        }
    }

    /**
     * Set up telemetry for SDK usage monitoring
     * @private
     */
    private setupTelemetry(): void {
        // Implementation would depend on your telemetry system
        // This is a placeholder for the actual implementation
    }

    /**
     * Internal logging method
     * @private
     */
    private log(level: 'error' | 'warn' | 'info' | 'debug', message: string): void {
        const logLevels = { error: 0, warn: 1, info: 2, debug: 3 };
        const configLevel = this.options.logLevel || 'error';

        if (logLevels[level] <= logLevels[configLevel]) {
            const prefix = `[W3C SDK] [${level.toUpperCase()}]`;

            switch (level) {
                case 'error':
                    console.error(`${prefix} ${message}`);
                    break;
                case 'warn':
                    console.warn(`${prefix} ${message}`);
                    break;
                case 'info':
                    console.info(`${prefix} ${message}`);
                    break;
                case 'debug':
                    console.debug(`${prefix} ${message}`);
                    break;
            }
        }
    }

    /**
     * Set authentication token for API requests
     */
    public setAuthToken(token: string): void {
        this.options.authToken = token;

        // Update token in all clients
        this.content.setAuthToken(token);
        this.payment.setAuthToken(token);
        this.auth.setAuthToken(token);
        this.streaming.setAuthToken(token);
        this.blockchain.setAuthToken(token);
        this.metadata.setAuthToken(token);
    }

    /**
     * Set wallet provider for blockchain operations
     */
    public setWalletProvider(provider: any): void {
        this.options.walletProvider = provider;
        this.blockchain.setProvider(provider);
    }

    /**
     * Get the current SDK version
     */
    public getVersion(): string {
        return '1.0.0'; // Should be dynamically generated from package.json in real implementation
    }
}
