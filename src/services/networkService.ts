import axios, { AxiosRequestConfig, AxiosError } from 'axios';

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  retryableStatusCodes: number[];
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffFactor: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
};

export class NetworkService {
  private retryConfig: RetryConfig;

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...retryConfig
    };
  }

  /**
   * Creates an axios instance with retry capabilities
   */
  createAxiosInstance(baseURL?: string) {
    const instance = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      // HTTP/2 specific settings
      httpAgent: false, // Use browser's native fetch for HTTP/1.1
      // Additional axios config options here
    });

    // Add request interceptor for retry logic
    instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as AxiosRequestConfig & { _retryCount?: number };
        
        if (!config || !config.url) {
          return Promise.reject(error);
        }

        // Initialize retry count if it doesn't exist
        config._retryCount = config._retryCount || 0;

        const shouldRetry = this.shouldRetryRequest(error, config._retryCount);

        if (shouldRetry) {
          config._retryCount += 1;
          
          // Calculate delay with exponential backoff
          const delay = Math.min(
            this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffFactor, config._retryCount - 1),
            this.retryConfig.maxDelayMs
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return instance(config);
        }

        return Promise.reject(error);
      }
    );

    return instance;
  }

  /**
   * Determines whether to retry a failed request based on the error
   */
  private shouldRetryRequest(error: AxiosError, currentRetryCount: number): boolean {
    // Don't retry if we've reached the maximum
    if (currentRetryCount >= this.retryConfig.maxRetries) {
      return false;
    }

    // Check for specific HTTP/2 protocol errors
    if (error.message?.includes('ERR_HTTP2_PROTOCOL_ERROR')) {
      console.warn('HTTP/2 protocol error detected, retrying with HTTP/1.1...');
      return true;
    }
    
    // Check if status code is in our retryable list
    if (error.response && this.retryConfig.retryableStatusCodes.includes(error.response.status)) {
      return true;
    }

    // Retry network errors (offline, timeout, etc.)
    return error.code === 'ECONNABORTED' || 
           !error.response || 
           error.message?.includes('Network Error');
  }

  /**
   * Check if the current network can connect to Web3 services
   */
  async checkConnectivity(): Promise<{
    ipfs: boolean;
    ethereum: boolean;
    api: boolean;
  }> {
    const results = {
      ipfs: false,
      ethereum: false,
      api: false
    };

    // Create an instance for testing
    const testInstance = this.createAxiosInstance();

    try {
      // Check IPFS connectivity
      await testInstance.get(`${process.env.VUE_APP_IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs/'}/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/readme`, { timeout: 5000 });
      results.ipfs = true;
    } catch (error) {
      console.warn('IPFS connectivity check failed:', error);
    }

    try {
      // Check Ethereum network connectivity
      const ethNetwork = process.env.VUE_APP_DEFAULT_NETWORK || 'mainnet';
      await testInstance.post(
        `https://${ethNetwork}.infura.io/v3/${process.env.INFURA_API_KEY || 'fallback'}`,
        { jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 },
        { timeout: 5000 }
      );
      results.ethereum = true;
    } catch (error) {
      console.warn('Ethereum connectivity check failed:', error);
    }

    try {
      // Check backend API if applicable
      const apiUrl = process.env.VUE_APP_API_URL;
      if (apiUrl) {
        await testInstance.get(`${apiUrl}/health`, { timeout: 5000 });
        results.api = true;
      } else {
        // Skip API check if no URL provided
        results.api = true;
      }
    } catch (error) {
      console.warn('API connectivity check failed:', error);
    }

    return results;
  }

  /**
   * Provides network troubleshooting suggestions based on errors
   */
  getTroubleshootingSuggestions(error: Error | AxiosError): string[] {
    const suggestions: string[] = [];
    
    if (axios.isAxiosError(error)) {
      if (error.message?.includes('ERR_HTTP2_PROTOCOL_ERROR')) {
        suggestions.push('HTTP/2 protocol error detected. This could be due to a firewall or proxy issue.');
        suggestions.push('Check if your firewall allows HTTP/2 traffic.');
        suggestions.push('Try using a VPN or different network connection.');
        suggestions.push('Ensure your browser and operating system are up to date.');
      } else if (error.code === 'ECONNABORTED') {
        suggestions.push('Connection timed out. Check your internet connection.');
        suggestions.push('The server might be down or experiencing high load.');
      } else if (!error.response) {
        suggestions.push('Network error. Ensure you are connected to the internet.');
        suggestions.push('Check if the service is blocked by your network.');
      } else {
        switch (error.response.status) {
          case 401:
            suggestions.push('Authentication failed. Try reconnecting your wallet.');
            break;
          case 403:
            suggestions.push('Access denied. You may not have permission to access this resource.');
            break;
          case 429:
            suggestions.push('Rate limit exceeded. Please try again later.');
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            suggestions.push('Server error. The service might be temporarily unavailable.');
            suggestions.push('Try again later or contact support if the issue persists.');
            break;
        }
      }
    }

    // Add general troubleshooting suggestions
    if (suggestions.length === 0) {
      suggestions.push('Check your internet connection.');
      suggestions.push('Ensure your firewall allows connections to Web3 services.');
      suggestions.push('Try refreshing the page or restart your browser.');
    }

    return suggestions;
  }
}

// Export singleton instance
export const networkService = new NetworkService();

export default networkService;
