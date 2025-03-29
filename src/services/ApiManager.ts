import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import LRUCache from 'lru-cache';

/**
 * API request result including metadata about the request
 */
interface ApiResponse<T = any> {
    data: T;
    status: number;
    headers: Record<string, string>;
    duration: number;
    endpoint: string;
    cached: boolean;
    retryCount: number;
}

/**
 * Configuration for the API manager
 */
interface ApiManagerConfig {
    endpoints: string[];
    defaultTimeout: number;
    maxRetries: number;
    cacheEnabled: boolean;
    cacheSize: number;
    cacheTTL: number;
    rateLimitPerSecond: number;
    headers?: Record<string, string>;
    fallbackRpcFile?: string;
    useIpfsGateway?: boolean;
    ipfsGateways?: string[];
    debug?: boolean;
}

/**
 * Default configuration for the API manager
 */
const DEFAULT_CONFIG: ApiManagerConfig = {
    endpoints: [],
    defaultTimeout: 10000,
    maxRetries: 3,
    cacheEnabled: true,
    cacheSize: 100,
    cacheTTL: 30000, // 30 seconds
    rateLimitPerSecond: 10,
    headers: {
        'Content-Type': 'application/json',
    },
    ipfsGateways: [
        'https://ipfs.io/ipfs/',
        'https://gateway.pinata.cloud/ipfs/',
        'https://cloudflare-ipfs.com/ipfs/',
    ],
    debug: process.env.DEBUG === 'true',
};

/**
 * ApiManager provides a unified interface for making API requests
 * with support for caching, retries, rate limiting, and fallback endpoints.
 */
export class ApiManager {
    private config: ApiManagerConfig;
    private httpClient: AxiosInstance;
    private cache: LRUCache<string, any>;
    private requestTimestamps: number[] = [];
    private currentEndpointIndex: number = 0;
    private failedEndpoints: Set<string> = new Set();

    /**
     * Create a new ApiManager instance
     */
    constructor(config: Partial<ApiManagerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };

        // Load fallback RPC endpoints if configured
        if (this.config.fallbackRpcFile) {
            try {
                const filePath = this.config.fallbackRpcFile;
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const fallbackEndpoints = JSON.parse(fileContent);

                if (Array.isArray(fallbackEndpoints)) {
                    this.config.endpoints = [
                        ...this.config.endpoints,
                        ...fallbackEndpoints,
                    ];
                    this.log(`Loaded ${fallbackEndpoints.length} fallback RPC endpoints`);
                }
            } catch (error) {
                this.log(`Failed to load fallback RPC endpoints: ${error}`);
            }
        }

        // Initialize HTTP client
        this.httpClient = axios.create({
            timeout: this.config.defaultTimeout,
            headers: this.config.headers,
        });

        // Initialize cache if enabled
        this.cache = new LRUCache<string, any>({
            max: this.config.cacheSize,
            ttl: this.config.cacheTTL,
        });

        this.log('ApiManager initialized');
    }

    /**
     * Make an API request with retry and fallback logic
     */
    async request<T = any>(
        method: string,
        url: string,
        data?: any,
        options: Partial<AxiosRequestConfig> = {}
    ): Promise<ApiResponse<T>> {
        const startTime = Date.now();
        const cacheKey = this.getCacheKey(method, url, data);
        let retryCount = 0;

        // Check cache first if enabled and method is GET
        if (this.config.cacheEnabled && method.toUpperCase() === 'GET') {
            const cachedResponse = this.cache.get(cacheKey);
            if (cachedResponse) {
                this.log(`Cache hit for ${url}`);
                return {
                    ...cachedResponse,
                    cached: true,
                    retryCount: 0,
                    duration: 0,
                };
            }
        }

        // Apply rate limiting
        await this.applyRateLimit();

        // Try each endpoint until success or all fail
        let lastError: Error | null = null;

        while (retryCount <= this.config.maxRetries) {
            const endpoint = this.getNextEndpoint();
            const fullUrl = url.startsWith('http') ? url : `${endpoint}${url}`;

            try {
                this.log(`Request to ${fullUrl} (retry ${retryCount})`);

                const response = await this.httpClient.request<T>({
                    method,
                    url: fullUrl,
                    data,
                    ...options,
                });

                const result: ApiResponse<T> = {
                    data: response.data,
                    status: response.status,
                    headers: response.headers as Record<string, string>,
                    duration: Date.now() - startTime,
                    endpoint,
                    cached: false,
                    retryCount,
                };

                // Cache successful GET responses
                if (this.config.cacheEnabled && method.toUpperCase() === 'GET') {
                    this.cache.set(cacheKey, result);
                }

                return result;
            } catch (error) {
                lastError = error as Error;
                this.log(`Request failed: ${error.message}`);

                // Mark endpoint as failed
                this.failedEndpoints.add(endpoint);

                retryCount++;
            }
        }

        throw new Error(`All requests failed after ${retryCount} retries. Last error: ${lastError?.message}`);
    }

    /**
     * Make a JSON-RPC request to a blockchain node
     */
    async rpcCall<T = any>(method: string, params: any[] = []): Promise<T> {
        const rpcRequest = {
            jsonrpc: '2.0',
            id: Date.now(),
            method,
            params,
        };

        const response = await this.request<{ result: T; error?: any }>(
            'POST',
            '',
            rpcRequest
        );

        if (response.data.error) {
            throw new Error(`RPC error: ${JSON.stringify(response.data.error)}`);
        }

        return response.data.result;
    }

    /**
     * Fetch content from IPFS using configured gateways
     */
    async fetchFromIpfs(cid: string): Promise<Buffer> {
        if (!this.config.useIpfsGateway) {
            throw new Error('IPFS gateway is not enabled');
        }

        for (const gateway of this.config.ipfsGateways!) {
            try {
                const url = `${gateway}${cid}`;
                const response = await this.request<ArrayBuffer>('GET', url, undefined, {
                    responseType: 'arraybuffer',
                });

                return Buffer.from(response.data);
            } catch (error) {
                this.log(`Failed to fetch from IPFS gateway ${gateway}: ${error.message}`);
            }
        }

        throw new Error(`Failed to fetch ${cid} from all IPFS gateways`);
    }

    /**
     * Upload content to IPFS using Pinata or similar service
     */
    async uploadToIpfs(content: Buffer | string): Promise<string> {
        // Implementation depends on the IPFS service you're using
        // This is a placeholder for the actual implementation
        throw new Error('Not implemented');
    }

    /**
     * Get the next available endpoint using round-robin
     */
    private getNextEndpoint(): string {
        const availableEndpoints = this.config.endpoints.filter(
            (endpoint) => !this.failedEndpoints.has(endpoint)
        );

        if (availableEndpoints.length === 0) {
            // Reset failed endpoints if all have failed
            this.failedEndpoints.clear();
            this.currentEndpointIndex = 0;
            return this.config.endpoints[0];
        }

        // Find next available endpoint with round-robin
        while (this.failedEndpoints.has(this.config.endpoints[this.currentEndpointIndex])) {
            this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.config.endpoints.length;
        }

        const endpoint = this.config.endpoints[this.currentEndpointIndex];
        this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.config.endpoints.length;

        return endpoint;
    }

    /**
     * Apply rate limiting by delaying requests if necessary
     */
    private async applyRateLimit(): Promise<void> {
        const now = Date.now();

        // Remove timestamps older than 1 second
        this.requestTimestamps = this.requestTimestamps.filter(
            (timestamp) => now - timestamp < 1000
        );

        if (this.requestTimestamps.length >= this.config.rateLimitPerSecond) {
            const oldestTimestamp = this.requestTimestamps[0];
            const delay = 1000 - (now - oldestTimestamp);

            if (delay > 0) {
                this.log(`Rate limit reached. Delaying for ${delay}ms`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }

        this.requestTimestamps.push(Date.now());
    }

    /**
     * Generate a cache key for a request
     */
    private getCacheKey(method: string, url: string, data?: any): string {
        return `${method}:${url}:${data ? JSON.stringify(data) : ''}`;
    }

    /**
     * Log debug messages if debug mode is enabled
     */
    private log(message: string): void {
        if (this.config.debug) {
            console.log(`[ApiManager] ${message}`);
        }
    }
}

export default ApiManager;
```
