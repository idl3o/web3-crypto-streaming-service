import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import axios from 'axios';

interface ENSProfile {
  name: string;
  address?: string;
  avatar?: string;
  contentHash?: string;
  email?: string;
  url?: string;
  description?: string;
}

interface ENSResolveOptions {
  cacheResults?: boolean;
  cacheTTL?: number; // seconds
  useEtherscan?: boolean; // Use Etherscan as fallback
}

interface ENSSearchResult {
  name: string;
  address: string;
  labelName: string;
  labelhash: string;
  score: number;
}

interface EtherscanLookupResponse {
  status: string;
  message: string;
  result: string;
}

// ENS directory search sources
export enum ENSDirectorySource {
  INTERNAL = 'internal',
  ETHERSCAN = 'etherscan',
  OPENPROFILE = 'openprofile',
  ALL = 'all'
}

/**
 * Service for interacting with Ethereum Name Service
 * Provides ENS name resolution and other ENS-related features
 */
export class ENSService extends EventEmitter {
  private static instance: ENSService;
  
  private provider: ethers.providers.Provider | null = null;
  private cache: Map<string, { value: any, expires: number }> = new Map();
  private defaultCacheTTL = 3600; // 1 hour in seconds
  private etherscanApiKey: string | null = null;
  private isInitialized: boolean = false;
  private lastCacheCleanup: number = Date.now();
  
  private constructor() {
    super();
    this.setMaxListeners(50);
  }
  
  /**
   * Get singleton instance of ENSService
   */
  public static getInstance(): ENSService {
    if (!ENSService.instance) {
      ENSService.instance = new ENSService();
    }
    return ENSService.instance;
  }
  
  /**
   * Check if the service is initialized
   */
  public get initialized(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Initialize the ENS service with a provider
   * @param providerUrl Ethereum provider URL (or provider instance)
   * @param options Additional initialization options
   */
  public async initialize(
    providerUrl: string | ethers.providers.Provider,
    options?: { 
      etherscanApiKey?: string,
      cacheTTL?: number 
    }
  ): Promise<boolean> {
    try {
      if (typeof providerUrl === 'string') {
        this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
      } else {
        this.provider = providerUrl;
      }
      
      // Set Etherscan API key if provided
      if (options?.etherscanApiKey) {
        this.etherscanApiKey = options.etherscanApiKey;
      }
      
      // Set custom cache TTL if provided
      if (options?.cacheTTL) {
        this.defaultCacheTTL = options.cacheTTL;
      }
      
      // Test the provider with a dummy ENS lookup
      await this.provider.lookupAddress('0x0000000000000000000000000000000000000000');
      
      this.isInitialized = true;
      this.emit('initialized');
      
      // Schedule periodic cache cleanup
      setInterval(() => this.cleanupCache(), 3600000); // Every hour
      
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.BLOCKCHAIN_READ,
        severity: IOErrorSeverity.WARNING,
        message: 'Failed to initialize ENS service',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }
  
  /**
   * Resolve ENS name to Ethereum address
   * @param ensName ENS name (e.g., "alice.eth")
   * @param options Resolution options
   */
  public async resolveAddress(
    ensName: string, 
    options: ENSResolveOptions = { cacheResults: true, useEtherscan: true }
  ): Promise<string | null> {
    this.ensureInitialized();
    
    // Check cache first
    const cacheKey = `address:${ensName.toLowerCase()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached !== undefined) return cached;
    
    try {
      // Try resolving using provider
      const address = await this.provider!.resolveName(ensName);
      
      // Cache result if enabled
      if (options.cacheResults !== false && address) {
        this.addToCache(cacheKey, address, options.cacheTTL);
      }
      
      // If address found or Etherscan lookup not requested, return result
      if (address || options.useEtherscan === false) {
        return address;
      }
      
      // Try Etherscan as fallback
      if (options.useEtherscan && this.etherscanApiKey) {
        const etherscanAddress = await this.resolveAddressWithEtherscan(ensName);
        
        if (etherscanAddress) {
          // Cache Etherscan result if enabled
          if (options.cacheResults !== false) {
            this.addToCache(cacheKey, etherscanAddress, options.cacheTTL);
          }
          return etherscanAddress;
        }
      }
      
      return address;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.BLOCKCHAIN_READ,
        severity: IOErrorSeverity.WARNING,
        message: `Failed to resolve ENS name: ${ensName}`,
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return null;
    }
  }
  
  /**
   * Resolve address using Etherscan API
   * @param ensName ENS name to resolve
   */
  private async resolveAddressWithEtherscan(ensName: string): Promise<string | null> {
    if (!this.etherscanApiKey) return null;
    
    try {
      const response = await axios.get<EtherscanLookupResponse>('https://api.etherscan.io/api', {
        params: {
          module: 'contract',
          action: 'resolvename',
          name: ensName,
          apikey: this.etherscanApiKey
        }
      });
      
      if (response.data.status === '1' && ethers.utils.isAddress(response.data.result)) {
        return response.data.result;
      }
      
      return null;
    } catch (error) {
      console.error('Etherscan lookup error:', error);
      return null;
    }
  }
  
  /**
   * Reverse lookup - get ENS name for an address
   * @param address Ethereum address
   * @param options Resolution options
   */
  public async lookupAddress(
    address: string, 
    options: ENSResolveOptions = { cacheResults: true, useEtherscan: true }
  ): Promise<string | null> {
    this.ensureInitialized();
    
    // Check cache first
    const cacheKey = `name:${address.toLowerCase()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached !== undefined) return cached;
    
    try {
      // Try resolving using provider
      const name = await this.provider!.lookupAddress(address);
      
      // Cache result if enabled
      if (options.cacheResults !== false && name) {
        this.addToCache(cacheKey, name, options.cacheTTL);
      }
      
      // If name found or Etherscan lookup not requested, return result
      if (name || options.useEtherscan === false) {
        return name;
      }
      
      // Try Etherscan as fallback
      if (options.useEtherscan && this.etherscanApiKey) {
        const etherscanName = await this.lookupAddressWithEtherscan(address);
        
        if (etherscanName) {
          // Cache Etherscan result if enabled
          if (options.cacheResults !== false) {
            this.addToCache(cacheKey, etherscanName, options.cacheTTL);
          }
          return etherscanName;
        }
      }
      
      return name;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.BLOCKCHAIN_READ,
        severity: IOErrorSeverity.WARNING,
        message: `Failed to lookup ENS name for address: ${address}`,
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return null;
    }
  }
  
  /**
   * Lookup ENS name using Etherscan API
   * @param address Address to lookup
   */
  private async lookupAddressWithEtherscan(address: string): Promise<string | null> {
    if (!this.etherscanApiKey) return null;
    
    try {
      const response = await axios.get<EtherscanLookupResponse>('https://api.etherscan.io/api', {
        params: {
          module: 'account',
          action: 'reverseresolve',
          address: address,
          apikey: this.etherscanApiKey
        }
      });
      
      if (response.data.status === '1' && response.data.result) {
        return response.data.result;
      }
      
      return null;
    } catch (error) {
      console.error('Etherscan reverse lookup error:', error);
      return null;
    }
  }
  
  /**
   * Search for ENS names in directories
   * @param query Search query (partial name, address, etc.)
   * @param source Directory source to search
   * @param limit Maximum number of results to return
   */
  public async searchDirectory(
    query: string, 
    source: ENSDirectorySource = ENSDirectorySource.ALL,
    limit: number = 20
  ): Promise<ENSSearchResult[]> {
    this.ensureInitialized();
    
    if (!query || query.length < 3) {
      return [];
    }
    
    const results: ENSSearchResult[] = [];
    
    try {
      // Search based on source
      if (source === ENSDirectorySource.ETHERSCAN || source === ENSDirectorySource.ALL) {
        if (this.etherscanApiKey) {
          const etherscanResults = await this.searchEtherscanDirectory(query, limit);
          results.push(...etherscanResults);
        }
      }
      
      if (source === ENSDirectorySource.OPENPROFILE || source === ENSDirectorySource.ALL) {
        const openProfileResults = await this.searchOpenProfileDirectory(query, limit);
        results.push(...openProfileResults);
      }
      
      // Deduplicate results by name
      const uniqueResults = Array.from(
        results.reduce((map, result) => map.set(result.name, result), new Map()).values()
      );
      
      // Sort by score
      return uniqueResults.sort((a, b) => b.score - a.score).slice(0, limit);
      
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.BLOCKCHAIN_READ,
        severity: IOErrorSeverity.WARNING,
        message: `Failed to search ENS directory for query: ${query}`,
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return [];
    }
  }
  
  /**
   * Search Etherscan directory
   * Currently simulated as Etherscan doesn't have a direct ENS search API
   */
  private async searchEtherscanDirectory(query: string, limit: number): Promise<ENSSearchResult[]> {
    // This is a simulated implementation as Etherscan doesn't have a direct ENS search API
    // In a real implementation, you might use web scraping or wait for an official API
    
    // For now, return empty array
    return [];
  }
  
  /**
   * Search OpenProfile directory for ENS names
   * @param query Search query
   * @param limit Maximum results to return
   */
  private async searchOpenProfileDirectory(query: string, limit: number): Promise<ENSSearchResult[]> {
    try {
      // Call the ENS API (mock implementation for now)
      const response = await axios.get(`https://api.openprofile.xyz/v1/ens/search`, {
        params: { q: query, limit }
      }).catch(_ => ({ data: { results: [] } })); // Fallback if API doesn't exist
      
      // Transform results to match our interface
      return response.data.results.map((result: any) => ({
        name: result.name,
        address: result.address || '',
        labelName: result.name.split('.')[0],
        labelhash: '',
        score: result.score || 0.5
      }));
    } catch (error) {
      console.error('Error searching OpenProfile directory:', error);
      return [];
    }
  }
  
  /**
   * Get avatar URL for ENS name
   * @param ensNameOrAddress ENS name or Ethereum address
   * @param options Resolution options
   */
  public async getAvatar(
    ensNameOrAddress: string, 
    options: ENSResolveOptions = { cacheResults: true }
  ): Promise<string | null> {
    this.ensureInitialized();
    
    // Check cache first
    const cacheKey = `avatar:${ensNameOrAddress}`;
    const cached = this.getFromCache(cacheKey);
    if (cached !== undefined) return cached;
    
    try {
      // Determine if input is an address or name
      let ensName = ensNameOrAddress;
      if (ethers.utils.isAddress(ensNameOrAddress)) {
        ensName = await this.lookupAddress(ensNameOrAddress) || ensNameOrAddress;
      }
      
      // If it's still an address (lookup failed), return null
      if (ethers.utils.isAddress(ensName)) {
        return null;
      }
      
      // Get resolver and avatar
      const resolver = await this.provider!.getResolver(ensName);
      if (!resolver) return null;
      
      // text records are used for avatar storage
      const avatar = await resolver.getText('avatar');
      
      // Cache result if enabled
      if (options.cacheResults !== false) {
        this.addToCache(cacheKey, avatar, options.cacheTTL);
      }
      
      return avatar;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.BLOCKCHAIN_READ,
        severity: IOErrorSeverity.WARNING,
        message: `Failed to get avatar for: ${ensNameOrAddress}`,
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return null;
    }
  }
  
  /**
   * Get ENS profile information
   * @param ensNameOrAddress ENS name or Ethereum address
   * @param options Resolution options
   */
  public async getProfile(
    ensNameOrAddress: string,
    options: ENSResolveOptions = { cacheResults: true }
  ): Promise<ENSProfile | null> {
    this.ensureInitialized();
    
    // Check cache first
    const cacheKey = `profile:${ensNameOrAddress}`;
    const cached = this.getFromCache(cacheKey);
    if (cached !== undefined) return cached;
    
    try {
      // Determine if input is an address or name
      let ensName: string | null = ensNameOrAddress;
      let address: string | null = null;
      
      if (ethers.utils.isAddress(ensNameOrAddress)) {
        address = ensNameOrAddress;
        ensName = await this.lookupAddress(address) || null;
      } else {
        address = await this.resolveAddress(ensName);
      }
      
      // If we couldn't resolve either name or address, return null
      if (!ensName) {
        return null;
      }
      
      // Get resolver
      const resolver = await this.provider!.getResolver(ensName);
      if (!resolver) return null;
      
      // Fetch profile data
      const [avatar, email, url, description] = await Promise.all([
        resolver.getText('avatar').catch(() => undefined),
        resolver.getText('email').catch(() => undefined),
        resolver.getText('url').catch(() => undefined),
        resolver.getText('description').catch(() => undefined),
      ]);
      
      // Get content hash if available
      let contentHash: string | undefined;
      try {
        contentHash = await resolver.getContentHash();
      } catch (e) {
        contentHash = undefined;
      }
      
      // Assemble profile
      const profile: ENSProfile = {
        name: ensName,
        address,
        avatar,
        contentHash,
        email,
        url,
        description
      };
      
      // Cache result if enabled
      if (options.cacheResults !== false) {
        this.addToCache(cacheKey, profile, options.cacheTTL);
      }
      
      return profile;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.BLOCKCHAIN_READ,
        severity: IOErrorSeverity.WARNING,
        message: `Failed to get ENS profile for: ${ensNameOrAddress}`,
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return null;
    }
  }
  
  /**
   * Check if a string is a valid ENS name
   * @param name Name to validate
   */
  public isValidENSName(name: string): boolean {
    // Basic validation: must end with .eth or another valid TLD
    return /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]*[a-z0-9])?\.eth$/.test(name);
  }
  
  /**
   * Bulk resolve multiple ENS names to addresses
   * Optimized for efficiency with batched requests
   * @param ensNames Array of ENS names to resolve
   */
  public async bulkResolveAddresses(
    ensNames: string[],
    options: ENSResolveOptions = { cacheResults: true }
  ): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {};
    const namesToResolve: string[] = [];
    
    // Check cache first for all names
    for (const name of ensNames) {
      const cacheKey = `address:${name.toLowerCase()}`;
      const cached = this.getFromCache(cacheKey);
      
      if (cached !== undefined) {
        results[name] = cached;
      } else {
        namesToResolve.push(name);
      }
    }
    
    // Resolve uncached names in batches
    if (namesToResolve.length > 0) {
      // Create batches of 10 names
      const batches = Array(Math.ceil(namesToResolve.length / 10))
        .fill(0)
        .map((_, i) => namesToResolve.slice(i * 10, (i + 1) * 10));
      
      for (const batch of batches) {
        // Process batch in parallel
        await Promise.all(batch.map(async name => {
          const address = await this.resolveAddress(name, options);
          results[name] = address;
        }));
      }
    }
    
    return results;
  }
  
  /**
   * Bulk lookup multiple addresses to ENS names
   * Optimized for efficiency with batched requests
   * @param addresses Array of addresses to lookup
   */
  public async bulkLookupAddresses(
    addresses: string[],
    options: ENSResolveOptions = { cacheResults: true }
  ): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {};
    const addressesToLookup: string[] = [];
    
    // Check cache first for all addresses
    for (const address of addresses) {
      const normalizedAddr = address.toLowerCase();
      const cacheKey = `name:${normalizedAddr}`;
      const cached = this.getFromCache(cacheKey);
      
      if (cached !== undefined) {
        results[address] = cached;
      } else {
        addressesToLookup.push(address);
      }
    }
    
    // Lookup uncached addresses in batches
    if (addressesToLookup.length > 0) {
      // Create batches of 10 addresses
      const batches = Array(Math.ceil(addressesToLookup.length / 10))
        .fill(0)
        .map((_, i) => addressesToLookup.slice(i * 10, (i + 1) * 10));
      
      for (const batch of batches) {
        // Process batch in parallel
        await Promise.all(batch.map(async address => {
          const name = await this.lookupAddress(address, options);
          results[address] = name;
        }));
      }
    }
    
    return results;
  }
  
  /**
   * Check if an ENS name is available for registration
   * @param name Name to check (without .eth)
   */
  public async checkNameAvailability(name: string): Promise<boolean> {
    this.ensureInitialized();
    
    if (!name || name.includes('.')) {
      return false;
    }
    
    try {
      const fullName = `${name}.eth`;
      const address = await this.resolveAddress(fullName, { cacheResults: false });
      
      // If the address is null, the name is available
      return address === null;
    } catch (error) {
      console.error('Error checking name availability:', error);
      return false;
    }
  }
  
  /**
   * Clear the resolution cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.lastCacheCleanup = Date.now();
    this.emit('cache-cleared');
  }
  
  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    
    // Skip if cleaned recently
    if (now - this.lastCacheCleanup < 3600000) { // 1 hour
      return;
    }
    
    let expiredCount = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`Cleaned up ${expiredCount} expired ENS cache entries`);
    }
    
    this.lastCacheCleanup = now;
  }
  
  /**
   * Ensure provider is initialized
   */
  private ensureInitialized(): void {
    if (!this.provider) {
      throw new Error('ENS service not initialized. Call initialize() first.');
    }
  }
  
  /**
   * Add item to cache
   */
  private addToCache(key: string, value: any, ttl: number = this.defaultCacheTTL): void {
    const expires = Date.now() + (ttl * 1000);
    this.cache.set(key, { value, expires });
  }
  
  /**
   * Get item from cache
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    
    if (!cached) return undefined;
    
    if (cached.expires < Date.now()) {
      // Expired, remove from cache
      this.cache.delete(key);
      return undefined;
    }
    
    return cached.value;
  }
}

// Export singleton instance
export const ensService = ENSService.getInstance();
export default ensService;
