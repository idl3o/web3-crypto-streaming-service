import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { cryptoSecurityService } from './CryptoSecurityService';

/**
 * GUBCHLLLRB Token Format
 * Format: /gubchlllrb<>[operation][hash][sequence][orderNum]
 */
export interface GubchlllrbToken {
  token: string;
  operation: string;
  hash: string;
  sequence: string;
  orderNum: string;
  isValid: boolean;
  timestamp: number;
}

/**
 * Token operation types
 */
export enum GubchlllrbOperation {
  VALIDATE = 'v',
  AUTHENTICATE = 'a',
  CHAIN = 'c',
  REFERENCE = 'r',
  BUILD = 'b'
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  token?: GubchlllrbToken;
  error?: string;
  timestamp: number;
}

/**
 * Global Unique Basic Chain Hash Link Library Reference Builder
 * Provides token generation and validation for secure chaining operations
 */
export class GubchlllrbService extends EventEmitter {
  private static instance: GubchlllrbService;
  private validTokens = new Map<string, GubchlllrbToken>();
  private tokenChains = new Map<string, string[]>();
  private initialized: boolean = false;
  private readonly TOKEN_PREFIX = '/gubchlllrb<>';
  private readonly O2NH_VERSION = 'o2nh';
  
  private constructor() {
    super();
    this.setMaxListeners(30);
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): GubchlllrbService {
    if (!GubchlllrbService.instance) {
      GubchlllrbService.instance = new GubchlllrbService();
    }
    return GubchlllrbService.instance;
  }
  
  /**
   * Initialize the service
   */
  public async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Load any persisted tokens
      await this.loadPersistedTokens();
      
      this.initialized = true;
      this.emit('initialized');
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to initialize GubchlllrbService',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }
  
  /**
   * Generate a new token
   * @param operation Operation type
   * @param data Optional data to include in hash
   * @param orderNum Optional order number (defaults to timestamp-based)
   */
  public generateToken(
    operation: GubchlllrbOperation, 
    data?: string,
    orderNum?: string
  ): GubchlllrbToken {
    try {
      const timestamp = Date.now();
      
      // Generate hash from data or use random string if no data provided
      const hashBase = data || cryptoSecurityService.generateRandomString({ length: 12 });
      const hash = this.generateHash(hashBase);
      
      // Generate sequence using timestamp
      const sequence = this.generateSequence();
      
      // Use provided orderNum or generate one based on timestamp
      const order = orderNum || this.generateOrderNum(timestamp);
      
      // Assemble the token
      const tokenString = `${this.TOKEN_PREFIX}${operation}${hash}${sequence}${this.O2NH_VERSION}${order}`;
      
      // Create token object
      const token: GubchlllrbToken = {
        token: tokenString,
        operation,
        hash,
        sequence,
        orderNum: order,
        isValid: true,
        timestamp
      };
      
      // Store the token
      this.validTokens.set(tokenString, token);
      
      // Emit token generated event
      this.emit('token-generated', { token: tokenString, operation });
      
      return token;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to generate GUBCHLLLRB token',
        details: error instanceof Error ? error.message : String(error),
        retryable: false,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      // Return invalid token
      return {
        token: '',
        operation: '' as GubchlllrbOperation,
        hash: '',
        sequence: '',
        orderNum: '',
        isValid: false,
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * Validate a token
   * @param token Token string to validate
   */
  public validateToken(token: string): TokenValidationResult {
    try {
      // Check if token exists in valid tokens
      if (this.validTokens.has(token)) {
        return {
          valid: true,
          token: this.validTokens.get(token),
          timestamp: Date.now()
        };
      }
      
      // Check token format
      if (!token.startsWith(this.TOKEN_PREFIX)) {
        return {
          valid: false,
          error: 'Invalid token prefix',
          timestamp: Date.now()
        };
      }
      
      // Extract token parts
      // Format: /gubchlllrb<>[operation][hash][sequence][orderNum]
      const tokenPattern = new RegExp(`^${this.TOKEN_PREFIX}([a-z])([a-zA-Z0-9]{8})([a-z0-9]{4})(${this.O2NH_VERSION})([0-9]{4,})$`);
      const match = token.match(tokenPattern);
      
      if (!match) {
        return {
          valid: false,
          error: 'Invalid token format',
          timestamp: Date.now()
        };
      }
      
      // Extract token parts
      const [, operation, hash, sequence, , orderNum] = match;
      
      // Create and store token
      const parsedToken: GubchlllrbToken = {
        token,
        operation: operation as GubchlllrbOperation,
        hash,
        sequence,
        orderNum,
        isValid: true,
        timestamp: Date.now()
      };
      
      // Store in valid tokens
      this.validTokens.set(token, parsedToken);
      
      // Emit validation event
      this.emit('token-validated', { token, valid: true });
      
      return {
        valid: true,
        token: parsedToken,
        timestamp: Date.now()
      };
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.WARNING,
        message: 'Token validation failed',
        details: error instanceof Error ? error.message : String(error),
        retryable: false,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error',
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * Chain a new token to an existing one
   * @param parentToken Parent token to chain from
   * @param data Optional data to include in the new token
   */
  public chainToken(parentToken: string, data?: string): GubchlllrbToken | null {
    // Validate parent token
    const validationResult = this.validateToken(parentToken);
    
    if (!validationResult.valid) {
      return null;
    }
    
    try {
      // Generate child token
      const childToken = this.generateToken(GubchlllrbOperation.CHAIN, data);
      
      // Add to chain
      if (!this.tokenChains.has(parentToken)) {
        this.tokenChains.set(parentToken, []);
      }
      
      this.tokenChains.get(parentToken)?.push(childToken.token);
      
      // Emit chaining event
      this.emit('token-chained', { 
        parentToken, 
        childToken: childToken.token 
      });
      
      return childToken;
    } catch (error) {
      console.error('Error chaining token:', error);
      return null;
    }
  }
  
  /**
   * Get all child tokens for a parent token
   * @param parentToken Parent token
   */
  public getChainedTokens(parentToken: string): string[] {
    return this.tokenChains.get(parentToken) || [];
  }
  
  /**
   * Clear expired tokens from storage
   * @param maxAge Maximum age of tokens to keep (in ms)
   */
  public clearExpiredTokens(maxAge: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let removedCount = 0;
    
    // Remove expired tokens
    for (const [tokenString, token] of this.validTokens.entries()) {
      if (now - token.timestamp > maxAge) {
        this.validTokens.delete(tokenString);
        removedCount++;
      }
    }
    
    // Also clean up token chains that reference expired tokens
    for (const [parentToken] of this.tokenChains.entries()) {
      if (!this.validTokens.has(parentToken)) {
        this.tokenChains.delete(parentToken);
      }
    }
    
    if (removedCount > 0) {
      this.emit('tokens-cleared', { count: removedCount });
    }
    
    return removedCount;
  }
  
  /**
   * Create a reference token that links to an external resource
   * @param resourceId ID of the resource to reference
   * @param metadata Optional metadata about the reference
   */
  public createReferenceToken(
    resourceId: string, 
    metadata?: Record<string, any>
  ): GubchlllrbToken {
    // Encode metadata as part of the data for the token
    const data = JSON.stringify({
      resourceId,
      metadata: metadata || {},
      timestamp: Date.now()
    });
    
    // Generate reference token
    return this.generateToken(GubchlllrbOperation.REFERENCE, data);
  }
  
  /**
   * Build a new token based on a pattern
   * @param elements Building elements for the token
   */
  public buildToken(elements: string[]): GubchlllrbToken {
    // Combine elements into a single data string
    const data = elements.join('-');
    
    // Generate build token
    return this.generateToken(GubchlllrbOperation.BUILD, data);
  }
  
  /**
   * Verify a chain of tokens is valid
   * @param tokenChain Array of tokens that form a chain
   */
  public verifyTokenChain(tokenChain: string[]): boolean {
    if (tokenChain.length < 2) {
      return false; // Need at least 2 tokens to form a chain
    }
    
    try {
      // Validate each token
      for (const token of tokenChain) {
        if (!this.validateToken(token).valid) {
          return false;
        }
      }
      
      // Verify chain relationships
      for (let i = 0; i < tokenChain.length - 1; i++) {
        const parentToken = tokenChain[i];
        const childToken = tokenChain[i + 1];
        
        // Check if child is in parent's chain
        const children = this.getChainedTokens(parentToken);
        if (!children.includes(childToken)) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error verifying token chain:', error);
      return false;
    }
  }
  
  /**
   * Generate a hash string from input data
   * @param data Input data to hash
   */
  private generateHash(data: string): string {
    // Simple hash function for demonstration
    // In a production system, use a proper cryptographic hash function
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convert to alphanumeric string of length 8
    const hashString = Math.abs(hash).toString(36).padStart(8, '0').substring(0, 8);
    return hashString;
  }
  
  /**
   * Generate a sequence identifier
   */
  private generateSequence(): string {
    return cryptoSecurityService.generateRandomString({
      length: 4,
      includeNumbers: true,
      includeSpecialChars: false,
      includeLowercase: true,
      includeUppercase: false
    });
  }
  
  /**
   * Generate an order number based on timestamp
   * @param timestamp Timestamp to use for generation
   */
  private generateOrderNum(timestamp: number): string {
    // Use timestamp and add some randomness
    const random = Math.floor(Math.random() * 1000);
    return `${timestamp % 10000}${random.toString().padStart(3, '0')}`;
  }
  
  /**
   * Load persisted tokens from storage
   */
  private async loadPersistedTokens(): Promise<void> {
    try {
      // In a real implementation, this would load tokens from a database or storage
      // For now, we'll leave it as a placeholder
      
      // Check if localStorage is available (browser environment)
      if (typeof localStorage !== 'undefined') {
        const savedTokens = localStorage.getItem('gubchlllrb_tokens');
        if (savedTokens) {
          const tokens = JSON.parse(savedTokens) as GubchlllrbToken[];
          
          tokens.forEach(token => {
            this.validTokens.set(token.token, token);
          });
        }
        
        const savedChains = localStorage.getItem('gubchlllrb_chains');
        if (savedChains) {
          const chains = JSON.parse(savedChains) as Record<string, string[]>;
          
          Object.entries(chains).forEach(([parent, children]) => {
            this.tokenChains.set(parent, children);
          });
        }
      }
    } catch (error) {
      console.error('Error loading persisted tokens:', error);
    }
  }
  
  /**
   * Persist tokens to storage
   */
  public async persistTokens(): Promise<boolean> {
    try {
      // In a real implementation, this would save tokens to a database or storage
      
      // Check if localStorage is available (browser environment)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('gubchlllrb_tokens', JSON.stringify(Array.from(this.validTokens.values())));
        localStorage.setItem('gubchlllrb_chains', JSON.stringify(Object.fromEntries(this.tokenChains)));
      }
      
      return true;
    } catch (error) {
      console.error('Error persisting tokens:', error);
      return false;
    }
  }
}

// Export singleton instance
export const gubchlllrbService = GubchlllrbService.getInstance();
export default gubchlllrbService;
