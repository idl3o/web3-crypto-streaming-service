import { ethers } from 'ethers';
import { RetryUtility, RetryStrategy } from '../utils/RetryUtility';
import { getProviderUrl, web3ProviderService } from './web3Provider';
import { getCodespaceUrl, isCodespace } from '../config/codespace';

/**
 * Connection status for blockchain networks
 */
export enum ConnectionStatus {
    CONNECTED = 'connected',
    CONNECTING = 'connecting',
    DISCONNECTED = 'disconnected',
    ERROR = 'error',
    FALLBACK = 'fallback'
}

/**
 * Network configuration for blockchain connections
 */
export interface NetworkConfig {
    name: string;
    chainId: number;
    rpcUrls: string[];
    blockExplorerUrls: string[];
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    color?: string;
    icon?: string;
}

/**
 * Connection statistics for monitoring
 */
interface ConnectionStats {
    avgLatency: number;
    requestCount: number;
    errorCount: number;
    lastConnectedAt?: number;
    lastError?: string;
    uptime: number;
}

/**
 * ConnectionManagerService handles blockchain connections with fallback and retry capabilities
 */
export class ConnectionManagerService {
    private networks: Map<string, NetworkConfig> = new Map();
    private activeConnections: Map<string, ethers.providers.Provider> = new Map();
    private connectionStatus: Map<string, ConnectionStatus> = new Map();
    private connectionStats: Map<string, ConnectionStats> = new Map();
    private healthCheckIntervalId: number | null = null;
    private readonly DEFAULT_RETRY_OPTIONS = {
        maxRetries: 5,
        initialDelay: 1000,
        strategy: RetryStrategy.EXPONENTIAL,
        factor: 1.5,
        jitter: true,
        maxDelay: 15000
    };

    // Event callbacks for monitoring connection status changes
    private readonly eventListeners: {
        [key: string]: ((network: string, status: ConnectionStatus) => void)[];
    } = {
            statusChange: []
        };

    constructor() {
        this.loadNetworkConfigs();
        this.startHealthChecks();
    }

    /**
     * Get a blockchain provider with automatic fallback and reconnection
     * @param networkName Network identifier
     * @returns Ethers provider for the specified network
     */
    public async getProvider(networkName: string): Promise<ethers.providers.Provider> {
        if (!this.networks.has(networkName)) {
            throw new Error(`Network ${networkName} not configured`);
        }

        // If we already have an active connection, verify it's working
        if (this.activeConnections.has(networkName)) {
            const provider = this.activeConnections.get(networkName)!;

            try {
                // Check if the connection is healthy with a simple call
                await provider.getBlockNumber();
                return provider;
            } catch (e) {
                console.warn(`Connection to ${networkName} failed, attempting to reconnect...`);
                this.updateConnectionStatus(networkName, ConnectionStatus.CONNECTING);
            }
        }

        // Otherwise create a new connection with retry logic
        return this.connectWithRetry(networkName);
    }

    /**
     * Add a new network configuration
     * @param config Network configuration
     */
    public addNetwork(config: NetworkConfig): void {
        this.networks.set(config.name, config);
    }

    /**
     * Remove a network configuration
     * @param networkName Network to remove
     */
    public removeNetwork(networkName: string): void {
        this.networks.delete(networkName);
        this.activeConnections.delete(networkName);
        this.connectionStatus.delete(networkName);
        this.connectionStats.delete(networkName);
    }

    /**
     * Get connection status for a network
     * @param networkName Network identifier
     */
    public getConnectionStatus(networkName: string): ConnectionStatus {
        return this.connectionStatus.get(networkName) || ConnectionStatus.DISCONNECTED;
    }

    /**
     * Get all configured networks
     */
    public getNetworks(): NetworkConfig[] {
        return Array.from(this.networks.values());
    }

    /**
     * Get connection statistics for monitoring
     * @param networkName Network identifier
     */
    public getConnectionStats(networkName: string): ConnectionStats | undefined {
        return this.connectionStats.get(networkName);
    }

    /**
     * Register event listener for connection status changes
     * @param event Event name (e.g., 'statusChange')
     * @param callback Callback function
     */
    public on(event: string, callback: (network: string, status: ConnectionStatus) => void): void {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    /**
     * Remove event listener
     * @param event Event name
     * @param callback Callback to remove
     */
    public off(event: string, callback: (network: string, status: ConnectionStatus) => void): void {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }

    /**
     * Force reconnection to a specific network
     * @param networkName Network to reconnect
     */
    public async reconnect(networkName: string): Promise<ethers.providers.Provider> {
        this.activeConnections.delete(networkName);
        this.updateConnectionStatus(networkName, ConnectionStatus.CONNECTING);
        return this.connectWithRetry(networkName);
    }

    /**
     * Connect to a network with retry and fallback logic
     * @param networkName Network identifier
     * @private
     */
    private async connectWithRetry(networkName: string): Promise<ethers.providers.Provider> {
        const network = this.networks.get(networkName);
        if (!network) {
            throw new Error(`Network ${networkName} not configured`);
        }

        this.updateConnectionStatus(networkName, ConnectionStatus.CONNECTING);

        let provider: ethers.providers.Provider;
        let fallbackIndex = 0;
        let connected = false;

        try {
            // Try to connect with exponential backoff and fallback URLs
            provider = await RetryUtility.execute(
                async () => {
                    // If we've tried all URLs, cycle back to the beginning
                    if (fallbackIndex >= network.rpcUrls.length) {
                        fallbackIndex = 0;
                    }

                    const rpcUrl = network.rpcUrls[fallbackIndex++];

                    console.log(`Attempting to connect to ${networkName} using ${rpcUrl}...`);

                    // Create provider with the current RPC URL
                    const tempProvider = new ethers.providers.JsonRpcProvider(rpcUrl, {
                        name: network.name,
                        chainId: network.chainId
                    });

                    // Verify connection works
                    const startTime = Date.now();
                    await tempProvider.getBlockNumber();
                    const latency = Date.now() - startTime;

                    // Update stats
                    this.updateConnectionStats(networkName, {
                        latency,
                        success: true
                    });

                    connected = true;
                    return tempProvider;
                },
                this.DEFAULT_RETRY_OPTIONS
            );

            // If we got here, we connected successfully
            this.activeConnections.set(networkName, provider);

            // Update status based on whether we're using the primary or fallback RPC
            this.updateConnectionStatus(
                networkName,
                fallbackIndex > 1 ? ConnectionStatus.FALLBACK : ConnectionStatus.CONNECTED
            );

            return provider;
        } catch (error) {
            // All connection attempts failed
            this.updateConnectionStats(networkName, {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });

            this.updateConnectionStatus(networkName, ConnectionStatus.ERROR);
            throw new Error(`Failed to connect to ${networkName}: ${error}`);
        }
    }

    /**
     * Setup regular health checks for active connections
     */
    private startHealthChecks(): void {
        if (this.healthCheckIntervalId) {
            clearInterval(this.healthCheckIntervalId);
        }

        this.healthCheckIntervalId = window.setInterval(() => {
            this.checkConnectionHealth();
        }, 30000); // Check every 30 seconds
    }

    /**
     * Check health of all active connections
     */
    private async checkConnectionHealth(): Promise<void> {
        for (const [networkName, provider] of this.activeConnections.entries()) {
            try {
                const startTime = Date.now();
                await provider.getBlockNumber();
                const latency = Date.now() - startTime;

                // Update stats with successful ping
                this.updateConnectionStats(networkName, {
                    latency,
                    success: true
                });

                // If connection was in error state, update to connected state
                if (this.connectionStatus.get(networkName) === ConnectionStatus.ERROR) {
                    this.updateConnectionStatus(networkName, ConnectionStatus.CONNECTED);
                }
            } catch (error) {
                console.warn(`Health check failed for ${networkName}:`, error);

                // Update stats with failed ping
                this.updateConnectionStats(networkName, {
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });

                // Trigger reconnection attempt in the background
                this.reconnect(networkName).catch(e => {
                    console.error(`Failed to reconnect to ${networkName}:`, e);
                });
            }
        }
    }

    /**
     * Update connection status and trigger events
     * @param networkName Network identifier
     * @param status New connection status
     */
    private updateConnectionStatus(networkName: string, status: ConnectionStatus): void {
        const previousStatus = this.connectionStatus.get(networkName);
        this.connectionStatus.set(networkName, status);

        if (previousStatus !== status) {
            // Trigger status change events
            (this.eventListeners['statusChange'] || []).forEach(callback => {
                try {
                    callback(networkName, status);
                } catch (e) {
                    console.error('Error in connection status change listener:', e);
                }
            });
        }
    }

    /**
     * Update connection statistics
     * @param networkName Network identifier
     * @param data Connection data
     */
    private updateConnectionStats(networkName: string, data: {
        latency?: number;
        success: boolean;
        error?: string;
    }): void {
        let stats = this.connectionStats.get(networkName);

        if (!stats) {
            stats = {
                avgLatency: 0,
                requestCount: 0,
                errorCount: 0,
                uptime: 0
            };
        }

        stats.requestCount++;

        if (data.success) {
            stats.lastConnectedAt = Date.now();

            // Update average latency
            if (data.latency) {
                stats.avgLatency = ((stats.avgLatency * (stats.requestCount - 1)) + data.latency) / stats.requestCount;
            }

            // Calculate approximate uptime percentage
            stats.uptime = ((stats.requestCount - stats.errorCount) / stats.requestCount) * 100;
        } else {
            stats.errorCount++;
            stats.lastError = data.error;
            stats.uptime = ((stats.requestCount - stats.errorCount) / stats.requestCount) * 100;
        }

        this.connectionStats.set(networkName, stats);
    }

    /**
     * Load default network configurations
     */
    private loadNetworkConfigs(): void {
        // Add mainnet
        this.addNetwork({
            name: 'mainnet',
            chainId: 1,
            rpcUrls: [
                'https://mainnet.infura.io/v3/your-api-key',
                'https://eth-mainnet.alchemyapi.io/v2/your-api-key',
                'https://cloudflare-eth.com'
            ],
            blockExplorerUrls: ['https://etherscan.io'],
            nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18
            }
        });

        // Add Polygon
        this.addNetwork({
            name: 'polygon',
            chainId: 137,
            rpcUrls: [
                'https://polygon-rpc.com',
                'https://rpc-mainnet.matic.network',
                'https://matic-mainnet.chainstacklabs.com'
            ],
            blockExplorerUrls: ['https://polygonscan.com'],
            nativeCurrency: {
                name: 'MATIC',
                symbol: 'MATIC',
                decimals: 18
            }
        });

        // Add local development network
        this.addNetwork({
            name: 'localhost',
            chainId: 1337,
            rpcUrls: [
                'http://localhost:8545',
                getProviderUrl()
            ],
            blockExplorerUrls: [],
            nativeCurrency: {
                name: 'Localhost ETH',
                symbol: 'ETH',
                decimals: 18
            }
        });

        // Add GitHub Codespaces network if applicable
        if (isCodespace()) {
            this.addNetwork({
                name: 'codespace',
                chainId: 1337,
                rpcUrls: [
                    `https://${getCodespaceUrl()}/rpc`,
                    'http://localhost:8545'
                ],
                blockExplorerUrls: [],
                nativeCurrency: {
                    name: 'Codespace ETH',
                    symbol: 'ETH',
                    decimals: 18
                }
            });
        }
    }

    /**
     * Cleanup resources when the service is no longer needed
     */
    public dispose(): void {
        if (this.healthCheckIntervalId) {
            clearInterval(this.healthCheckIntervalId);
            this.healthCheckIntervalId = null;
        }

        // Clear all connections and other resources
        this.activeConnections.clear();
        this.connectionStatus.clear();
    }
}

export const connectionManager = new ConnectionManagerService();
export default connectionManager;
