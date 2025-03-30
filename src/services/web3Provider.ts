import { ethers } from 'ethers';
import { networkService } from './networkService';
import { getCodespaceUrl, isCodespace, getRpcUrl } from '../config/codespace';

// Configuration
const USE_HTTP2 = process.env.VUE_APP_USE_HTTP2 !== 'false'; // Default to true unless explicitly disabled
const MAX_RETRIES = parseInt(process.env.VUE_APP_NETWORK_MAX_RETRIES || '3', 10);
const RETRY_DELAY = parseInt(process.env.VUE_APP_NETWORK_RETRY_DELAY || '1000', 10);

interface Web3ProviderOptions {
  network?: string;
  useHttp2?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export function getProviderUrl(): string {
  if (isCodespace()) {
    return getRpcUrl();
  }

  // Fallback to default provider URLs
  return process.env.WEB3_PROVIDER || 'http://localhost:8545';
}

class Web3ProviderService {
  private providers: Map<string, ethers.providers.Provider> = new Map();
  private options: Web3ProviderOptions;

  constructor(options: Web3ProviderOptions = {}) {
    this.options = {
      network: process.env.VUE_APP_DEFAULT_NETWORK || 'mainnet',
      useHttp2: USE_HTTP2,
      maxRetries: MAX_RETRIES,
      retryDelay: RETRY_DELAY,
      ...options
    };
  }

  /**
   * Gets an ethers provider, creating it if needed
   */
  async getProvider(networkName?: string): Promise<ethers.providers.Provider> {
    const network = networkName || this.options.network;

    // Return cached provider if available
    if (this.providers.has(network)) {
      return this.providers.get(network)!;
    }

    // Try to create a provider
    try {
      const provider = await this.createProvider(network);
      this.providers.set(network, provider);
      return provider;
    } catch (error: any) {
      console.error(`Failed to create provider for ${network}:`, error);

      // If HTTP/2 error detected, retry with HTTP/1.1
      if (
        this.options.useHttp2 &&
        (error.message?.includes('ERR_HTTP2_PROTOCOL_ERROR') ||
          error.message?.includes('HTTP/2'))
      ) {
        console.warn('HTTP/2 protocol error detected, falling back to HTTP/1.1...');
        const fallbackOptions = { ...this.options, useHttp2: false };
        const fallbackProvider = await this.createProvider(network, fallbackOptions);
        this.providers.set(network, fallbackProvider);
        return fallbackProvider;
      }

      throw error;
    }
  }

  /**
   * Creates a new provider with appropriate configuration
   */
  private async createProvider(
    network: string,
    overrideOptions?: Web3ProviderOptions
  ): Promise<ethers.providers.Provider> {
    const options = { ...this.options, ...overrideOptions };
    const apiKey = process.env.INFURA_API_KEY || '';

    // Different provider configurations based on user's settings
    if (window.ethereum) {
      // Use injected provider if available (MetaMask, etc.)
      try {
        return new ethers.providers.Web3Provider(window.ethereum);
      } catch (error) {
        console.warn('Failed to use injected Web3 provider, falling back to RPC:', error);
      }
    }

    // Create fallback Infura provider with retry logic
    const fetchOptions: any = {};

    // Configure HTTP/2 usage
    if (!options.useHttp2) {
      fetchOptions.backgroundFetch = false; // Force HTTP/1.1
    }

    // Create provider based on remaining configuration
    const provider = new ethers.providers.JsonRpcProvider({
      url: getProviderUrl(),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      fetchOptions
    }, network);

    // Add custom retry logic
    const originalFetch = provider.fetch.bind(provider);
    provider.fetch = async (method: string, params: any): Promise<any> => {
      let lastError;
      for (let attempt = 1; attempt <= options.maxRetries!; attempt++) {
        try {
          return await originalFetch(method, params);
        } catch (error: any) {
          lastError = error;

          // If last attempt, don't wait, just throw
          if (attempt === options.maxRetries) {
            throw error;
          }

          // HTTP/2 error, break immediately and let caller handle it
          if (error.message?.includes('ERR_HTTP2_PROTOCOL_ERROR')) {
            throw error;
          }

          // Wait before retry with exponential backoff
          await new Promise(resolve =>
            setTimeout(resolve, options.retryDelay! * Math.pow(2, attempt - 1))
          );
        }
      }
      throw lastError;
    };

    // Test the connection
    try {
      await provider.getBlockNumber();
    } catch (error) {
      throw new Error(`Failed to connect to ${network}: ${error}`);
    }

    return provider;
  }

  /**
   * Resets the provider for a specific network
   */
  resetProvider(networkName?: string): void {
    const network = networkName || this.options.network;
    this.providers.delete(network);
  }
}

export const web3ProviderService = new Web3ProviderService();
export default web3ProviderService;
