/**
 * Code Completion Service
 * Provides intelligent code suggestions similar to TabNine/Codota
 * for Web3 and cryptocurrency development
 */

import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';

export interface CompletionOption {
    text: string;
    displayText?: string;
    description?: string;
    icon?: string;
    score: number;
    source: string;
}

export interface CompletionRequest {
    prefix: string;
    suffix?: string;
    filename?: string;
    language?: string;
    maxResults?: number;
    context?: string[];
    timeout?: number; // Add timeout option for requests
}

export interface CompletionCache {
    key: string;
    options: CompletionOption[];
    timestamp: number;
    ttl: number;
    uses: number;
}

export class CodeCompletionService extends EventEmitter {
    private static instance: CodeCompletionService;
    private completionCache: Map<string, CompletionCache> = new Map();
    private cacheHits = 0;
    private cacheMisses = 0;
    private cacheTTL = 1000 * 60 * 30; // 30 minutes
    private maxCacheSize = 500;
    private cleanupInterval: NodeJS.Timeout | null = null;
    private isCleaningUp = false;
    private pendingRequests: Map<string, {
        timeout: NodeJS.Timeout,
        controller: AbortController
    }> = new Map();
    private DEFAULT_REQUEST_TIMEOUT = 5000; // 5 seconds default timeout

    constructor() {
        super();
        this.setupCacheCleanup();
    }

    public static getInstance(): CodeCompletionService {
        if (!CodeCompletionService.instance) {
            CodeCompletionService.instance = new CodeCompletionService();
        }
        return CodeCompletionService.instance;
    }

    /**
     * Get code completion suggestions based on current context
     */
    public async getCompletions(request: CompletionRequest): Promise<CompletionOption[]> {
        try {
            const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const cacheKey = this.generateCacheKey(request);

            // Try to get from cache first
            const cachedResult = this.getFromCache(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            // Create abort controller for timeout handling
            const controller = new AbortController();
            const signal = controller.signal;

            // Set timeout (use request timeout or default)
            const timeoutMs = request.timeout || this.DEFAULT_REQUEST_TIMEOUT;
            const timeoutId = setTimeout(() => {
                this.handleRequestTimeout(requestId, cacheKey);
            }, timeoutMs);

            // Track the pending request
            this.pendingRequests.set(requestId, {
                timeout: timeoutId,
                controller
            });

            try {
                // Fetch completions with timeout and abort capability
                const completions = await this.fetchCompletionsWithTimeout(request, signal);

                // Clear the pending request tracking
                this.clearPendingRequest(requestId);

                // Store in cache
                this.storeInCache(cacheKey, completions);

                return completions;
            } catch (error) {
                // If the request was aborted due to timeout
                if (signal.aborted) {
                    // Return fallback completions
                    const fallbackCompletions = this.generateFallbackCompletions(request.prefix);
                    this.reportError(`Completion request timed out after ${timeoutMs}ms`,
                        new Error('Completion timeout'), cacheKey);

                    // Cache the fallback to prevent repeated timeouts
                    this.storeInCache(cacheKey, fallbackCompletions,
                        this.cacheTTL / 2); // Shorter TTL for fallbacks

                    return fallbackCompletions;
                }

                // For other errors, propagate
                throw error;
            }
        } catch (error) {
            this.reportError('Failed to get completions', error);
            return [];
        }
    }

    /**
     * Fetch completions with timeout support
     */
    private async fetchCompletionsWithTimeout(
        request: CompletionRequest,
        signal: AbortSignal
    ): Promise<CompletionOption[]> {
        // Wrap the fetch in an abortable promise
        return new Promise<CompletionOption[]>((resolve, reject) => {
            // Set up abort handler
            signal.addEventListener('abort', () => {
                reject(new Error('Completion request aborted'));
            });

            // Attempt to fetch completions normally
            this.fetchCompletions(request)
                .then(resolve)
                .catch(reject);
        });
    }

    /**
     * Handle a request timeout
     */
    private handleRequestTimeout(requestId: string, cacheKey: string): void {
        const pendingRequest = this.pendingRequests.get(requestId);
        if (pendingRequest) {
            // Abort the request
            pendingRequest.controller.abort();

            // Clean up the pending request
            this.clearPendingRequest(requestId);

            // Emit timeout event
            this.emit('completion-timeout', {
                requestId,
                cacheKey,
                timestamp: Date.now()
            });

            // Log the timeout
            console.warn(`CodeCompletionService: Request ${requestId} timed out`);
        }
    }

    /**
     * Clear a pending request
     */
    private clearPendingRequest(requestId: string): void {
        const pendingRequest = this.pendingRequests.get(requestId);
        if (pendingRequest) {
            clearTimeout(pendingRequest.timeout);
            this.pendingRequests.delete(requestId);
        }
    }

    /**
     * Generate fallback completions when the main system times out
     */
    private generateFallbackCompletions(prefix: string): CompletionOption[] {
        // Simple fallback suggestions to ensure we always return something
        return [
            {
                text: prefix,
                displayText: prefix,
                description: 'Continue typing',
                score: 0.5,
                source: 'fallback'
            }
        ];
    }

    /**
     * Generate a cache key from the completion request
     */
    private generateCacheKey(request: CompletionRequest): string {
        const { prefix, suffix = '', filename = '', language = '' } = request;
        // Create a deterministic key based on request components
        return `${language}:${filename}:${prefix}:${suffix}`.slice(0, 255);
    }

    /**
     * Get completions from cache if available
     */
    private getFromCache(key: string): CompletionOption[] | null {
        const cached = this.completionCache.get(key);

        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            // Update cache stats
            this.cacheHits++;
            cached.uses++;

            // Update timestamp to extend life of frequently accessed items
            cached.timestamp = Date.now();

            return cached.options;
        }

        this.cacheMisses++;
        return null;
    }

    /**
     * Store completions in cache
     */
    private storeInCache(key: string, options: CompletionOption[], ttl?: number): void {
        try {
            // Check cache size before adding new entry
            if (this.completionCache.size >= this.maxCacheSize) {
                this.pruneCache();
            }

            // Store in cache
            this.completionCache.set(key, {
                key,
                options,
                timestamp: Date.now(),
                ttl: ttl || this.cacheTTL,
                uses: 1
            });
        } catch (error) {
            // Handle cache storage errors without crashing
            this.reportError('Failed to store in cache', error);
        }
    }

    /**
     * Remove least recently used or expired items from cache
     */
    private pruneCache(force = false): void {
        try {
            // Avoid concurrent cleanups - fixes TabNine issue #678
            if (this.isCleaningUp && !force) {
                return;
            }

            this.isCleaningUp = true;

            const now = Date.now();
            const entries = Array.from(this.completionCache.entries());

            // Sort by LRU and expire time
            entries.sort((a, b) => {
                // First, check if either item is expired
                const aExpired = now - a[1].timestamp > a[1].ttl;
                const bExpired = now - b[1].timestamp > b[1].ttl;

                if (aExpired && !bExpired) return -1;
                if (!aExpired && bExpired) return 1;

                // If both are expired or not expired, sort by least used
                if (a[1].uses !== b[1].uses) {
                    return a[1].uses - b[1].uses;
                }

                // Finally, sort by oldest
                return a[1].timestamp - b[1].timestamp;
            });

            // Remove expired entries + 20% of the max cache size if needed
            let removedCount = 0;
            const targetRemovalCount = Math.ceil(this.maxCacheSize * 0.2);

            for (const [key, cache] of entries) {
                if (now - cache.timestamp > cache.ttl || removedCount < targetRemovalCount) {
                    try {
                        this.completionCache.delete(key);
                        removedCount++;

                        // Stop if we've removed enough non-expired entries
                        if (removedCount >= targetRemovalCount && now - cache.timestamp <= cache.ttl) {
                            break;
                        }
                    } catch (error) {
                        // Track the error but continue processing other items
                        this.reportError('Error removing item from cache', error, key);
                    }
                }
            }

            this.emit('cache-pruned', { removedCount });
        } catch (error) {
            this.reportError('Failed to prune cache', error);
        } finally {
            this.isCleaningUp = false;
        }
    }

    /**
     * Set up periodic cache cleanup
     */
    private setupCacheCleanup(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        this.cleanupInterval = setInterval(() => {
            this.pruneCache();
        }, 1000 * 60 * 5); // Clean every 5 minutes
    }

    /**
     * Fetch completions from various sources
     */
    private async fetchCompletions(request: CompletionRequest): Promise<CompletionOption[]> {
        // Simplified implementation - would interface with actual completion sources
        const { prefix, maxResults = 5 } = request;

        // Demo completions
        return [
            {
                text: `${prefix}Complete`,
                displayText: `${prefix}Complete`,
                description: 'Complete the current word',
                score: 0.95,
                source: 'local'
            },
            {
                text: `${prefix}Function()`,
                displayText: `${prefix}Function()`,
                description: 'Create a new function',
                score: 0.85,
                source: 'language-model'
            }
        ].slice(0, maxResults);
    }

    /**
     * Get cache statistics
     */
    public getCacheStats(): {
        size: number,
        hits: number,
        misses: number,
        hitRate: number
    } {
        const total = this.cacheHits + this.cacheMisses;
        const hitRate = total > 0 ? this.cacheHits / total : 0;

        return {
            size: this.completionCache.size,
            hits: this.cacheHits,
            misses: this.cacheMisses,
            hitRate
        };
    }

    /**
     * Clear the completion cache
     */
    public clearCache(): void {
        const size = this.completionCache.size;
        this.completionCache.clear();
        this.emit('cache-cleared', { size });
    }

    /**
     * Cancel all pending completion requests
     * Important to call this when switching contexts or files
     */
    public cancelPendingRequests(): void {
        for (const [requestId, {timeout, controller}] of this.pendingRequests.entries()) {
            clearTimeout(timeout);
            controller.abort();
            this.pendingRequests.delete(requestId);
        }

        console.log(`Cancelled ${this.pendingRequests.size} pending completion requests`);
        this.emit('requests-cancelled', { count: this.pendingRequests.size });
    }

    /**
     * Get current pending requests count
     */
    public getPendingRequestCount(): number {
        return this.pendingRequests.size;
    }

    /**
     * Add a listener specifically for completion timeouts
     */
    public onCompletionTimeout(callback: (data: {requestId: string, cacheKey: string}) => void): void {
        this.on('completion-timeout', callback);
    }

    /**
     * Report errors using IOErrorService
     */
    private reportError(message: string, error: any, context?: string): void {
        const errorDetails = error instanceof Error ? error.message : String(error);

        ioErrorService.reportError({
            type: IOErrorType.UNKNOWN,
            severity: IOErrorSeverity.ERROR,
            message: message,
            details: `${errorDetails}\nContext: ${context || 'code completion'}`,
            source: 'CodeCompletionService',
            retryable: false,
            error: error instanceof Error ? error : new Error(errorDetails)
        });

        this.emit('error', { message, error, context });
    }
}

export const codeCompletionService = CodeCompletionService.getInstance();
export default codeCompletionService;
