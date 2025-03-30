import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import axios from 'axios';

export interface TwitterAuthConfig {
  apiKey: string;
  apiSecret: string;
  callbackUrl: string;
}

export interface TwitterShareOptions {
  text: string;
  url?: string;
  hashtags?: string[];
  via?: string;
  related?: string[];
}

export interface TwitterFeedOptions {
  query: string;
  count?: number;
  lang?: string;
  resultType?: 'mixed' | 'recent' | 'popular';
}

export interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorProfileImageUrl?: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  mediaUrls?: string[];
  entities?: {
    hashtags?: { text: string }[];
    urls?: { url: string, expanded_url: string }[];
    mentions?: { username: string }[];
  };
}

/**
 * Service for interacting with Twitter/X APIs
 */
export class TwitterService extends EventEmitter {
  private static instance: TwitterService;
  private apiKey: string | null = null;
  private apiSecret: string | null = null;
  private callbackUrl: string | null = null;
  private accessToken: string | null = null;
  private accessTokenSecret: string | null = null;
  private bearerToken: string | null = null;
  
  private constructor() {
    super();
    this.setMaxListeners(20);
  }
  
  /**
   * Get singleton instance of TwitterService
   */
  public static getInstance(): TwitterService {
    if (!TwitterService.instance) {
      TwitterService.instance = new TwitterService();
    }
    return TwitterService.instance;
  }
  
  /**
   * Initialize Twitter service with API credentials
   * @param config Twitter API configuration
   */
  public initialize(config: TwitterAuthConfig): boolean {
    try {
      this.apiKey = config.apiKey;
      this.apiSecret = config.apiSecret;
      this.callbackUrl = config.callbackUrl;
      
      // Load any saved tokens from localStorage
      this.loadSavedTokens();
      
      this.emit('initialized');
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.NETWORK_REQUEST,
        severity: IOErrorSeverity.WARNING,
        message: 'Failed to initialize Twitter service',
        details: error instanceof Error ? error.message : String(error),
        retryable: false,
        error: error instanceof Error ? error : new Error(String(error))
      });
      return false;
    }
  }
  
  /**
   * Check if user is authenticated with Twitter
   */
  public isAuthenticated(): boolean {
    return !!(this.accessToken && this.accessTokenSecret);
  }
  
  /**
   * Start OAuth authentication flow with Twitter
   */
  public async startAuthentication(): Promise<string> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Twitter API credentials not configured');
    }
    
    try {
      // In a real implementation, we would call the Twitter API to get a request token
      // For now, we'll simulate the auth flow by returning a URL
      
      const authUrl = `https://twitter.com/i/oauth2/authorize?client_id=${this.apiKey}&redirect_uri=${encodeURIComponent(this.callbackUrl || '')}&scope=tweet.read%20users.read%20follows.read%20follows.write&state=state&code_challenge=challenge&code_challenge_method=plain&response_type=code`;
      
      this.emit('auth-started');
      
      return authUrl;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.NETWORK_REQUEST,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to start Twitter authentication',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      throw error;
    }
  }
  
  /**
   * Complete OAuth authentication with Twitter using the received callback code
   * @param code OAuth code from Twitter callback
   */
  public async completeAuthentication(code: string): Promise<boolean> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Twitter API credentials not configured');
    }
    
    try {
      // In a real implementation, this would exchange the code for access tokens
      // using Twitter's OAuth API
      
      // Simulate a successful auth
      this.accessToken = 'simulated-access-token-' + Date.now();
      this.accessTokenSecret = 'simulated-token-secret-' + Date.now();
      
      // Save tokens
      this.saveTokens();
      
      this.emit('authenticated');
      
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.NETWORK_REQUEST,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to complete Twitter authentication',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }
  
  /**
   * Sign out from Twitter
   */
  public signOut(): boolean {
    try {
      this.accessToken = null;
      this.accessTokenSecret = null;
      
      // Clear saved tokens
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('twitter_access_token');
        localStorage.removeItem('twitter_token_secret');
      }
      
      this.emit('signed-out');
      
      return true;
    } catch (error) {
      console.error('Error signing out from Twitter:', error);
      return false;
    }
  }
  
  /**
   * Generate a Twitter share URL
   * @param options Share options
   * @returns URL that can be opened to share content on Twitter
   */
  public generateShareUrl(options: TwitterShareOptions): string {
    const baseUrl = 'https://twitter.com/intent/tweet';
    const params = new URLSearchParams();
    
    // Add text content
    params.append('text', options.text);
    
    // Add URL if provided
    if (options.url) {
      params.append('url', options.url);
    }
    
    // Add hashtags if provided (comma-separated)
    if (options.hashtags && options.hashtags.length > 0) {
      params.append('hashtags', options.hashtags.join(','));
    }
    
    // Add "via" attribution if provided
    if (options.via) {
      params.append('via', options.via);
    }
    
    // Add related accounts if provided (comma-separated)
    if (options.related && options.related.length > 0) {
      params.append('related', options.related.join(','));
    }
    
    return `${baseUrl}?${params.toString()}`;
  }
  
  /**
   * Share content to Twitter directly (requires authentication)
   * @param options Share options
   */
  public async shareContent(options: TwitterShareOptions): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Must be authenticated with Twitter to share content');
    }
    
    try {
      // In a real implementation, this would call the Twitter API to post a tweet
      
      // Simulate a successful tweet
      console.log('Simulated tweet posted:', options);
      
      this.emit('content-shared', { options });
      
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.NETWORK_REQUEST,
        severity: IOErrorSeverity.WARNING,
        message: 'Failed to share content on Twitter',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }
  
  /**
   * Fetch a Twitter feed based on search query
   * @param options Feed options
   */
  public async fetchFeed(options: TwitterFeedOptions): Promise<Tweet[]> {
    try {
      // In a real implementation, this would call the Twitter API to search for tweets
      
      // Simulate API response
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Generate mock tweets
      const mockTweets: Tweet[] = Array.from({ length: options.count || 10 }, (_, i) => {
        const id = `tweet-${Date.now()}-${i}`;
        const randomHashtags = ['crypto', 'web3', 'blockchain', 'NFT', 'DeFi']
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.floor(Math.random() * 3) + 1);
          
        return {
          id,
          text: `This is a simulated tweet about ${options.query} with hashtags #${randomHashtags.join(' #')}`,
          createdAt: new Date(Date.now() - Math.random() * 1000000).toISOString(),
          authorId: `author-${i}`,
          authorName: `Crypto User ${i}`,
          authorUsername: `crypto_user_${i}`,
          authorProfileImageUrl: `https://via.placeholder.com/48?text=User${i}`,
          likeCount: Math.floor(Math.random() * 100),
          retweetCount: Math.floor(Math.random() * 50),
          replyCount: Math.floor(Math.random() * 20),
          entities: {
            hashtags: randomHashtags.map(tag => ({ text: tag })),
            urls: [],
            mentions: []
          }
        };
      });
      
      return mockTweets;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.NETWORK_REQUEST,
        severity: IOErrorSeverity.WARNING,
        message: 'Failed to fetch Twitter feed',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return [];
    }
  }
  
  /**
   * Save tokens to local storage
   */
  private saveTokens(): void {
    if (typeof localStorage !== 'undefined' && this.accessToken && this.accessTokenSecret) {
      localStorage.setItem('twitter_access_token', this.accessToken);
      localStorage.setItem('twitter_token_secret', this.accessTokenSecret);
    }
  }
  
  /**
   * Load saved tokens from local storage
   */
  private loadSavedTokens(): void {
    if (typeof localStorage !== 'undefined') {
      this.accessToken = localStorage.getItem('twitter_access_token');
      this.accessTokenSecret = localStorage.getItem('twitter_token_secret');
    }
  }
}

// Export singleton instance
export const twitterService = TwitterService.getInstance();
export default twitterService;
