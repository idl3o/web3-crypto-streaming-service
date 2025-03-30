import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { sonaAuthService } from './SonaAuthenticationService';

/**
 * Analytics data for token usage
 */
export interface TokenAnalytics {
  tokenId: string;
  lookupCount: number;
  cacheHits: number;
  cacheMisses: number;
  averageResolutionTimeMs: number;
  lastUsed: number;
  createdAt: number;
  expiresAt?: number;
  source: string;
}

/**
 * Global Web Service for Token Lookup, Caching, and Authentication Analytics
 * Provides centralized token management and performance tracking
 */
export class GlobalTokenService extends EventEmitter {
  private static instance: GlobalTokenService;
  private tokenCache = new Map<string, any>();
  private tokenAnalytics = new Map<string, TokenAnalytics>();
  private lookupTimes = new Map<string, number[]>();
  private cacheHitRate = 0;
  private totalLookups = 0;
  private initialized = false;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    super();
    this.setMaxListeners(50);
  }
  
  /**
   * Get singleton instance of GlobalTokenService
   */
  public static getInstance(): GlobalTokenService {
    if (!GlobalTokenService.instance) {
      GlobalTokenService.instance = new GlobalTokenService();
    }
    return GlobalTokenService.instance;
  }
  
  /**
   * Initialize the token service
   */
  public async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Set up periodic cache cleanup
      this.cleanupInterval = setInterval(() => this.cleanupExpiredTokens(), 30 * 60 * 1000); // Every 30 minutes
      
      // Register auth token events
      this.registerAuthEvents();
      
      this.initialized = true;
      this.emit('initialized');
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SONA_AUTHENTICATION,
        severity: IOErrorSeverity.WARNING,
        message: 'Failed to initialize GlobalTokenService',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }
  
  /**
   * Store a token with an optional expiration time
   * @param key Token identifier
   * @param value Token value
   * @param expiresInMs Time until token expires in milliseconds
   * @param source Source of the token (service name)
   */
  public storeToken(key: string, value: any, expiresInMs?: number, source = 'unknown'): void {
    const now = Date.now();
    const expiresAt = expiresInMs ? now + expiresInMs : undefined;
    
    // Store token in cache
    this.tokenCache.set(key, {
      value,
      expiresAt,
      createdAt: now
    });
    
    // Update analytics
    if (!this.tokenAnalytics.has(key)) {
      this.tokenAnalytics.set(key, {
        tokenId: key,
        lookupCount: 0,
        cacheHits: 0,
        cacheMisses: 0,
        averageResolutionTimeMs: 0,
        lastUsed: now,
        createdAt: now,
        expiresAt,
        source
      });
    } else {
      const analytics = this.tokenAnalytics.get(key)!;
      analytics.lastUsed = now;
      analytics.expiresAt = expiresAt;
      analytics.source = source;
      this.tokenAnalytics.set(key, analytics);
    }
    
    this.emit('token-stored', { key, expiresAt, source });
  }
  
  /**
   * Retrieve a token from the cache
   * @param key Token identifier
   * @returns Token value or null if not found or expired
   */
  public getToken(key: string): any {
    const now = Date.now();
    const cachedItem = this.tokenCache.get(key);
    
    this.totalLookups++;
    
    // Track analytics
    if (!this.tokenAnalytics.has(key)) {
      this.tokenAnalytics.set(key, {
        tokenId: key,
        lookupCount: 1,
        cacheHits: 0,
        cacheMisses: 1,
        averageResolutionTimeMs: 0,
        lastUsed: now,
        createdAt: now,
        source: 'lookup'
      });
    } else {
      const analytics = this.tokenAnalytics.get(key)!;
      analytics.lookupCount++;
      analytics.lastUsed = now;
      
      if (cachedItem) {
        analytics.cacheHits++;
      } else {
        analytics.cacheMisses++;
      }
      
      this.tokenAnalytics.set(key, analytics);
    }
    
    // Calculate new cache hit rate
    const totalAnalytics = Array.from(this.tokenAnalytics.values());
    const totalHits = totalAnalytics.reduce((sum, item) => sum + item.cacheHits, 0);
    const totalRequests = totalHits + totalAnalytics.reduce((sum, item) => sum + item.cacheMisses, 0);
    this.cacheHitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
    
    // Return null if token not in cache
    if (!cachedItem) {
      this.emit('cache-miss', { key });
      return null;
    }
    
    // Check if token is expired
    if (cachedItem.expiresAt && cachedItem.expiresAt < now) {
      this.tokenCache.delete(key);
      this.emit('token-expired', { key });
      return null;
    }
    
    this.emit('cache-hit', { key });
    return cachedItem.value;
  }
  
  /**
   * Lookup a token with a resolver function if not in cache
   * @param key Token identifier
   * @param resolver Function to resolve the token if not in cache
   * @param expiresInMs Time until token expires in milliseconds
   * @param source Source of the token (service name)
   */
  public async lookupToken<T>(
    key: string,
    resolver: () => Promise<T>,
    expiresInMs?: number,
    source = 'resolver'
  ): Promise<T> {
    // Try to get from cache first
    const cachedValue = this.getToken(key);
    if (cachedValue !== null) {
      return cachedValue as T;
    }
    
    const startTime = Date.now();
    
    try {
      // Resolve token
      const resolvedValue = await resolver();
      
      // Calculate resolution time
      const resolutionTime = Date.now() - startTime;
      
      // Update lookup time analytics
      if (!this.lookupTimes.has(key)) {
        this.lookupTimes.set(key, [resolutionTime]);
      } else {
        const times = this.lookupTimes.get(key)!;
        times.push(resolutionTime);
        
        // Keep only the last 10 lookups
        if (times.length > 10) {
          times.shift();
        }
        this.lookupTimes.set(key, times);
      }
      
      // Calculate average resolution time
      const avgTime = this.calculateAverageResolutionTime(key);
      
      // Update analytics
      const analytics = this.tokenAnalytics.get(key)!;
      analytics.averageResolutionTimeMs = avgTime;
      this.tokenAnalytics.set(key, analytics);
      
      // Store in cache
      this.storeToken(key, resolvedValue, expiresInMs, source);
      
      return resolvedValue;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.BLOCKCHAIN_READ,
        severity: IOErrorSeverity.WARNING,
        message: `Failed to resolve token: ${key}`,
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      throw error;
    }
  }
  
  /**
   * Remove a token from the cache
   * @param key Token identifier
   */
  public removeToken(key: string): boolean {
    const exists = this.tokenCache.has(key);
    if (exists) {
      this.tokenCache.delete(key);
      this.emit('token-removed', { key });
      return true;
    }
    return false;
  }
  
  /**
   * Clear all tokens from the cache
   */
  public clearTokens(): void {
    this.tokenCache.clear();
    this.emit('cache-cleared');
  }
  
  /**
   * Get analytics for a specific token
   * @param key Token identifier
   */
  public getTokenAnalytics(key: string): TokenAnalytics | null {
    return this.tokenAnalytics.get(key) || null;
  }
  
  /**
   * Get overall cache statistics
   */
  public getCacheStatistics(): {
    totalTokens: number;
    cacheHitRate: number;
    totalLookups: number;
    averageResolutionTimeMs: number;
  } {
    const analytics = Array.from(this.tokenAnalytics.values());
    let totalResolutionTime = 0;
    let resolutionCount = 0;
    
    analytics.forEach(item => {
      if (item.averageResolutionTimeMs > 0) {
        totalResolutionTime += item.averageResolutionTimeMs;
        resolutionCount++;
      }
    });
    
    const avgResolutionTime = resolutionCount > 0 ? totalResolutionTime / resolutionCount : 0;
    
    return {
      totalTokens: this.tokenCache.size,
      cacheHitRate: this.cacheHitRate,
      totalLookups: this.totalLookups,
      averageResolutionTimeMs: avgResolutionTime
    };
  }
  
  /**
   * Get all tokens in the cache with their analytics
   */
  public getAllTokensWithAnalytics(): { token: string, analytics: TokenAnalytics }[] {
    return Array.from(this.tokenAnalytics.entries()).map(([token, analytics]) => ({
      token,
      analytics
    }));
  }
  
  /**
   * Register auth-related events
   */
  private registerAuthEvents(): void {
    sonaAuthService.on('signed-out', ({ userId }) => {
      // Find and remove all auth-related tokens
      Array.from(this.tokenCache.keys())
        .filter(key => key.startsWith('auth:') || key.startsWith(`user:${userId}`))
        .forEach(key => this.removeToken(key));
    });
    
    sonaAuthService.on('token-refreshed', ({ userId }) => {
      // Update analytics for the auth token
      const authTokenKey = `auth:${userId}`;
      if (this.tokenAnalytics.has(authTokenKey)) {
        const analytics = this.tokenAnalytics.get(authTokenKey)!;
        analytics.lastUsed = Date.now();
        this.tokenAnalytics.set(authTokenKey, analytics);
      }
    });
  }
  
  /**
   * Remove expired tokens from the cache
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, token] of this.tokenCache.entries()) {
      if (token.expiresAt && token.expiresAt < now) {
        this.tokenCache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      this.emit('tokens-expired', { count: removedCount });
    }
  }
  
  /**
   * Calculate the average resolution time for a token
   */
  private calculateAverageResolutionTime(key: string): number {
    const times = this.lookupTimes.get(key);
    if (!times || times.length === 0) {
      return 0;
    }
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }
  
  /**
   * Stop the service and clean up resources
   */
  public dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.tokenCache.clear();
    this.tokenAnalytics.clear();
    this.lookupTimes.clear();
    this.initialized = false;
    
    this.emit('disposed');
  }
}

// Export singleton instance
export const globalTokenService = GlobalTokenService.getInstance();
export default globalTokenService;
