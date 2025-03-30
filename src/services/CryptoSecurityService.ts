import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { globalTokenService } from './GlobalTokenService';

/**
 * Security level for cryptographic operations
 */
export enum SecurityLevel {
  STANDARD = 'standard',
  ENHANCED = 'enhanced',
  MAXIMUM = 'maximum'
}

/**
 * Zero Knowledge Proof verification result
 */
export interface ZKProofResult {
  verified: boolean;
  timestamp: number;
  tokenId?: string;
  expiresAt?: number;
  metadata?: Record<string, any>;
}

/**
 * Random string generation options
 */
export interface RandomStringOptions {
  length?: number;
  includeNumbers?: boolean;
  includeSpecialChars?: boolean;
  includeLowercase?: boolean;
  includeUppercase?: boolean;
  excludeSimilarCharacters?: boolean;
  prefix?: string;
}

/**
 * RIG2NX Token Format
 * Format: rigXnx[version][sequence][checksum][payload]-[type]
 */
export interface RIG2NXToken {
  token: string;
  version: string;
  sequence: string;
  checksum: string;
  payload: string;
  tokenType: string;
  isValid: boolean;
}

/**
 * Service for cryptographic security operations
 * Provides random string generation, zero knowledge proofs,
 * and secure token management
 */
export class CryptoSecurityService extends EventEmitter {
  private static instance: CryptoSecurityService;
  private securityLevel: SecurityLevel = SecurityLevel.STANDARD;
  private initialized: boolean = false;
  private zkProofCache = new Map<string, ZKProofResult>();
  private verificationAttempts = new Map<string, number>();
  private readonly MAX_VERIFICATION_ATTEMPTS = 5;
  private rigTokens = new Map<string, RIG2NXToken>();
  
  private constructor() {
    super();
    this.setMaxListeners(30);
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): CryptoSecurityService {
    if (!CryptoSecurityService.instance) {
      CryptoSecurityService.instance = new CryptoSecurityService();
    }
    return CryptoSecurityService.instance;
  }
  
  /**
   * Initialize the security service
   * @param securityLevel Initial security level
   */
  public async initialize(securityLevel?: SecurityLevel): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    try {
      if (securityLevel) {
        this.securityLevel = securityLevel;
      }
      
      // Initialize global token service if needed
      if (!globalTokenService["initialized"]) {
        await globalTokenService.initialize();
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.initialized = true;
      this.emit('initialized', { securityLevel: this.securityLevel });
      
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to initialize CryptoSecurityService',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }
  
  /**
   * Generate a cryptographically secure random string
   * @param options Random string generation options
   */
  public generateRandomString(options: RandomStringOptions = {}): string {
    try {
      const {
        length = 16,
        includeNumbers = true,
        includeSpecialChars = false,
        includeLowercase = true,
        includeUppercase = true,
        excludeSimilarCharacters = false,
        prefix = ''
      } = options;
      
      let charset = '';
      
      if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
      if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (includeNumbers) charset += '0123456789';
      if (includeSpecialChars) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
      
      if (excludeSimilarCharacters) {
        charset = charset.replace(/[01lIO]/g, '');
      }
      
      if (charset.length === 0) {
        throw new Error('Invalid options: Empty charset. Enable at least one character type.');
      }
      
      // Ensure we have a secure random source
      let randomValues: Uint8Array;
      
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        randomValues = new Uint8Array(length);
        window.crypto.getRandomValues(randomValues);
      } else if (typeof require !== 'undefined') {
        // Node.js environment
        const crypto = require('crypto');
        randomValues = crypto.randomBytes(length);
      } else {
        throw new Error('No secure random number generator available');
      }
      
      let result = prefix;
      
      // Convert random bytes to characters from our charset
      for (let i = 0; i < length; i++) {
        const randomIndex = randomValues[i] % charset.length;
        result += charset[randomIndex];
      }
      
      return result;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to generate random string',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      // Fallback to less secure but functional method
      return `${prefix}fallback${Date.now()}${Math.random().toString(36).substring(2)}`;
    }
  }
  
  /**
   * Generate a RIG2NX format token
   * @param payload Custom payload data
   * @param tokenType Token type identifier
   */
  public generateRIG2NXToken(payload?: string, tokenType: string = 't'): RIG2NXToken {
    try {
      // Generate default payload if not provided (numeric sequence)
      const generatedPayload = payload || this.generateNumericSequence(24);
      
      // Generate version (2 digits)
      const version = '99';
      
      // Generate sequence (4 chars)
      const sequence = this.generateRandomString({
        length: 4,
        includeNumbers: false,
        includeSpecialChars: false,
        includeLowercase: true,
        includeUppercase: false
      });
      
      // Calculate checksum (2 digits)
      const checksum = this.calculateTokenChecksum(generatedPayload);
      
      // Assemble token
      const tokenString = `rig2nx${version}${sequence}${checksum}${generatedPayload}-${tokenType}`;
      
      const token: RIG2NXToken = {
        token: tokenString,
        version,
        sequence,
        checksum,
        payload: generatedPayload,
        tokenType,
        isValid: true
      };
      
      // Store token for future validation
      this.rigTokens.set(tokenString, token);
      globalTokenService.storeToken(
        tokenString, 
        { ...token, createdAt: Date.now() },
        24 * 60 * 60 * 1000, // 24 hours
        'rig2nx-security'
      );
      
      this.emit('rig2nx-token-generated', { token: tokenString });
      
      return token;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to generate RIG2NX token',
        details: error instanceof Error ? error.message : String(error),
        retryable: false,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      // Return invalid token
      return {
        token: '',
        version: '',
        sequence: '',
        checksum: '',
        payload: '',
        tokenType: '',
        isValid: false
      };
    }
  }
  
  /**
   * Parse and validate a RIG2NX token
   * @param token RIG2NX token string
   */
  public validateRIG2NXToken(token: string): RIG2NXToken | null {
    try {
      // Check if token is already stored
      const cachedToken = this.rigTokens.get(token);
      if (cachedToken) {
        return cachedToken;
      }
      
      // Check token from global token service
      const globalToken = globalTokenService.getToken(token);
      if (globalToken) {
        // Restore from global token service
        const validToken = globalToken as RIG2NXToken;
        this.rigTokens.set(token, validToken);
        return validToken;
      }
      
      // Verify token format
      const tokenPattern = /^rig2nx(\d{2})([a-z]{4})(\d{2})(\d+)-([a-z])$/;
      const match = token.match(tokenPattern);
      
      if (!match) {
        return null;
      }
      
      // Extract token parts
      const [, version, sequence, checksum, payload, tokenType] = match;
      
      // Validate checksum
      const expectedChecksum = this.calculateTokenChecksum(payload);
      if (checksum !== expectedChecksum) {
        return null;
      }
      
      // Create validated token
      const validatedToken: RIG2NXToken = {
        token,
        version,
        sequence,
        checksum,
        payload,
        tokenType,
        isValid: true
      };
      
      // Store for future validation
      this.rigTokens.set(token, validatedToken);
      
      return validatedToken;
    } catch (error) {
      console.error('Error validating RIG2NX token:', error);
      return null;
    }
  }
  
  /**
   * Calculate token checksum
   * @param payload Token payload
   */
  private calculateTokenChecksum(payload: string): string {
    // Simple checksum calculation - sum of ASCII values modulo 100
    const sum = payload.split('')
      .map(char => char.charCodeAt(0))
      .reduce((acc, val) => acc + val, 0);
    
    return (sum % 100).toString().padStart(2, '0');
  }
  
  /**
   * Generate numeric sequence
   * @param length Length of sequence
   */
  private generateNumericSequence(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return result;
  }
  
  /**
   * Generate a secure authentication challenge
   * @param userId User identifier
   * @param expiresInMs Challenge expiration time in milliseconds
   */
  public generateAuthChallenge(userId: string, expiresInMs: number = 60000): {
    challenge: string;
    expiresAt: number;
  } {
    const challenge = this.generateRandomString({
      length: 32,
      includeSpecialChars: true,
      prefix: 'zk-'
    });
    
    const expiresAt = Date.now() + expiresInMs;
    
    // Store in global token service for verification
    globalTokenService.storeToken(
      `auth-challenge:${userId}:${challenge}`,
      { userId, challenge, expiresAt },
      expiresInMs,
      'crypto-security'
    );
    
    this.emit('challenge-generated', { userId, expiresAt });
    
    return { challenge, expiresAt };
  }
  
  /**
   * Generate a secure RIG2NX authentication challenge
   * @param userId User identifier 
   * @param expiresInMs Challenge expiration time in milliseconds
   */
  public generateRIG2NXChallenge(userId: string, expiresInMs: number = 60000): {
    challenge: string;
    expiresAt: number;
  } {
    // Generate RIG2NX token as challenge
    const rigToken = this.generateRIG2NXToken(userId, 'c');
    const challenge = rigToken.token;
    const expiresAt = Date.now() + expiresInMs;
    
    // Store in global token service for verification
    globalTokenService.storeToken(
      `rig-challenge:${userId}:${challenge}`,
      { userId, challenge, expiresAt },
      expiresInMs,
      'rig2nx-security'
    );
    
    this.emit('rig2nx-challenge-generated', { userId, expiresAt });
    
    return { challenge, expiresAt };
  }
  
  /**
   * Verify a zero knowledge proof
   * @param proof Zero knowledge proof string
   * @param publicInput Public input for verification
   */
  public async verifyZKProof(
    proof: string,
    publicInput: string
  ): Promise<ZKProofResult> {
    try {
      // Check cache first
      const cacheKey = `${proof}:${publicInput}`;
      const cachedResult = this.zkProofCache.get(cacheKey);
      
      if (cachedResult) {
        return cachedResult;
      }
      
      // Track verification attempts for rate limiting
      const attempts = this.verificationAttempts.get(publicInput) || 0;
      
      if (attempts >= this.MAX_VERIFICATION_ATTEMPTS) {
        throw new Error(`Maximum verification attempts exceeded for input: ${publicInput}`);
      }
      
      this.verificationAttempts.set(publicInput, attempts + 1);
      
      // Simulate ZK proof verification (in a real implementation, this would use a ZK library)
      const isValid = await this.simulateZKProofVerification(proof, publicInput);
      
      // Generate token if verified
      let tokenId: string | undefined = undefined;
      let expiresAt: number | undefined = undefined;
      
      if (isValid) {
        // Generate a token with 24 hour expiry
        tokenId = this.generateRandomString({
          length: 24,
          prefix: 'zkp-'
        });
        
        expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        
        // Store token
        globalTokenService.storeToken(
          tokenId,
          { publicInput, verified: true },
          24 * 60 * 60 * 1000,
          'zk-proof'
        );
      }
      
      // Create result
      const result: ZKProofResult = {
        verified: isValid,
        timestamp: Date.now(),
        tokenId,
        expiresAt
      };
      
      // Cache result
      this.zkProofCache.set(cacheKey, result);
      
      // Emit event
      this.emit('proof-verified', {
        verified: isValid,
        publicInput
      });
      
      return result;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.WARNING,
        message: 'Zero knowledge proof verification failed',
        details: error instanceof Error ? error.message : String(error),
        retryable: false,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return {
        verified: false,
        timestamp: Date.now(),
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
  
  /**
   * Validate a security token
   * @param token Security token to validate
   */
  public validateSecurityToken(token: string): boolean {
    try {
      // Check if it's a RIG2NX token
      if (token.startsWith('rig2nx')) {
        return this.validateRIG2NXToken(token) !== null;
      }
      
      // Check if it's a ZKP token
      if (token.startsWith('zkp-')) {
        // Check if token exists in global token service
        const tokenData = globalTokenService.getToken(token);
        return !!tokenData && tokenData.verified === true;
      }
      
      return false;
    } catch (error) {
      console.error('Error validating security token:', error);
      return false;
    }
  }
  
  /**
   * Change the security level
   * @param level New security level
   */
  public setSecurityLevel(level: SecurityLevel): void {
    this.securityLevel = level;
    this.emit('security-level-changed', { level });
  }
  
  /**
   * Get current security level
   */
  public getSecurityLevel(): SecurityLevel {
    return this.securityLevel;
  }
  
  /**
   * Clear verification cache
   */
  public clearCache(): void {
    this.zkProofCache.clear();
    this.verificationAttempts.clear();
    this.rigTokens.clear();
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for token expiration events
    globalTokenService.on('token-expired', ({ key }: { key: string }) => {
      if (key.startsWith('zkp-')) {
        this.emit('security-token-expired', { tokenId: key });
      }
    });
  }
  
  /**
   * Simulate ZK proof verification
   * In a real implementation, this would use an actual ZK proof library
   */
  private async simulateZKProofVerification(proof: string, publicInput: string): Promise<boolean> {
    // This is a placeholder for an actual ZK proof verification
    // For demonstration, we'll do a simple check
    
    // Wait a short time to simulate verification process
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simple simulation logic - in a real implementation, use a proper ZK library
    const proofIsValid = proof.length > 20 && 
                         proof.startsWith('zk-') && 
                         publicInput.length > 0;
    
    return proofIsValid;
  }
}

// Export singleton instance
export const cryptoSecurityService = CryptoSecurityService.getInstance();
export default cryptoSecurityService;
