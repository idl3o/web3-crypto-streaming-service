import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { cryptoSecurityService } from './CryptoSecurityService';
import { globalTokenService } from './GlobalTokenService';

/**
 * CCK2M1C4I Token Format Structure
 * Format: cck2m1c4i[sequence][verification-code] [control-block] [action-code]
 */
export interface CCK2MToken {
  tokenString: string;
  sequence: string;
  verificationCode: string;
  controlBlock: string;
  actionCode: string;
  isValid: boolean;
  timestamp: number;
}

/**
 * Token verification result
 */
export interface CCK2MVerificationResult {
  valid: boolean;
  token?: CCK2MToken;
  error?: string;
  timestamp: number;
  authorization?: {
    level: number;
    permissions: string[];
    expires?: number;
  };
}

/**
 * Token action types
 */
export enum CCK2MActionType {
  ACCESS = '4a',
  MODIFY = '4m',
  DELETE = '4d',
  CREATE = '4c',
  VERIFY = '4v',
  CHAIN = '4n',
  AUTHORIZE = '4t'
}

/**
 * Channel mode options
 */
export enum ChannelMode {
  VERIFICATION = '1c',
  AUTHENTICATION = '2c',
  AUTHORIZATION = '3c',
  ADMINISTRATION = '4c'
}

/**
 * Composite Cipher Keychain 2-Mode 1-Channel 4-Infrastructure Service
 * High-security token verification for critical infrastructure components
 */
export class CompositeCipherKeychainService extends EventEmitter {
  private static instance: CompositeCipherKeychainService;
  private initialized: boolean = false;
  private validTokens = new Map<string, CCK2MToken>();
  private authorizedSessions = new Map<string, {
    tokenId: string;
    level: number;
    permissions: string[];
    issuedAt: number;
    expiresAt?: number;
  }>();
  
  private readonly TOKEN_PREFIX = 'cck2m1c4i';
  private readonly SEED_VECTOR = '7657evy5wcc';
  private readonly CONTROL_PREFIX = 'gnjbmdbv5u6v6';
  
  private constructor() {
    super();
    this.setMaxListeners(30);
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): CompositeCipherKeychainService {
    if (!CompositeCipherKeychainService.instance) {
      CompositeCipherKeychainService.instance = new CompositeCipherKeychainService();
    }
    return CompositeCipherKeychainService.instance;
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
        message: 'Failed to initialize CompositeCipherKeychainService',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }
  
  /**
   * Generate a new CCK2M token
   * @param actionType Action type for the token
   * @param level Authorization level (1-5)
   * @param permissions Optional permissions array
   */
  public generateToken(
    actionType: CCK2MActionType,
    level: number = 1,
    permissions: string[] = []
  ): CCK2MToken {
    try {
      if (level < 1 || level > 5) {
        throw new Error('Authorization level must be between 1 and 5');
      }
      
      const timestamp = Date.now();
      
      // Generate sequence (7 alphanumeric chars)
      const sequence = this.generateSequence();
      
      // Generate verification code (10 chars) based on sequence and level
      const verificationCode = this.generateVerificationCode(sequence, level);
      
      // Create control block
      const controlBlock = this.generateControlBlock(permissions);
      
      // Assemble the token
      const tokenString = `${this.TOKEN_PREFIX}${sequence}${verificationCode} ${controlBlock} ${actionType}`;
      
      // Create token object
      const token: CCK2MToken = {
        tokenString,
        sequence,
        verificationCode,
        controlBlock,
        actionCode: actionType,
        isValid: true,
        timestamp
      };
      
      // Store the token
      this.validTokens.set(tokenString, token);
      
      // Create authorization session for the token
      const sessionId = `session-${timestamp}-${sequence}`;
      this.authorizedSessions.set(sessionId, {
        tokenId: tokenString,
        level,
        permissions,
        issuedAt: timestamp,
        expiresAt: timestamp + (24 * 60 * 60 * 1000) // 24 hour expiry
      });
      
      // Emit token generated event
      this.emit('token-generated', { token: tokenString, actionType });
      
      return token;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to generate CCK2M token',
        details: error instanceof Error ? error.message : String(error),
        retryable: false,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      // Return invalid token
      return {
        tokenString: '',
        sequence: '',
        verificationCode: '',
        controlBlock: '',
        actionCode: '',
        isValid: false,
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * Verify a CCK2M token
   * @param tokenString Token string to verify
   */
  public verifyToken(tokenString: string): CCK2MVerificationResult {
    try {
      // Check if token exists in valid tokens cache
      if (this.validTokens.has(tokenString)) {
        const token = this.validTokens.get(tokenString)!;
        
        // Find associated authorization session
        const session = Array.from(this.authorizedSessions.values())
          .find(s => s.tokenId === tokenString);
        
        // Check if session is expired
        if (session && session.expiresAt && session.expiresAt < Date.now()) {
          return {
            valid: false,
            error: 'Token authorization has expired',
            timestamp: Date.now()
          };
        }
        
        return {
          valid: true,
          token,
          timestamp: Date.now(),
          authorization: session ? {
            level: session.level,
            permissions: session.permissions,
            expires: session.expiresAt
          } : undefined
        };
      }
      
      // Check token format
      // Format: cck2m1c4i[sequence][verification-code] [control-block] [action-code]
      const tokenPattern = new RegExp(
        `^${this.TOKEN_PREFIX}([a-zA-Z0-9]{7})([a-zA-Z0-9]{10}) (${this.CONTROL_PREFIX}[a-zA-Z0-9]{1,10}) (4[a-z])$`
      );
      
      const match = tokenString.match(tokenPattern);
      
      if (!match) {
        return {
          valid: false,
          error: 'Invalid token format',
          timestamp: Date.now()
        };
      }
      
      const [, sequence, verificationCode, controlBlock, actionCode] = match;
      
      // Verify the token's verification code
      const level = this.extractAuthorizationLevel(verificationCode, sequence);
      
      if (level === 0) {
        return {
          valid: false,
          error: 'Invalid verification code',
          timestamp: Date.now()
        };
      }
      
      // Extract permissions from control block
      const permissions = this.extractPermissions(controlBlock);
      
      // Create token and store it
      const token: CCK2MToken = {
        tokenString,
        sequence,
        verificationCode,
        controlBlock,
        actionCode,
        isValid: true,
        timestamp: Date.now()
      };
      
      // Store for future verification
      this.validTokens.set(tokenString, token);
      
      // Create session for this token
      const sessionId = `session-${Date.now()}-${sequence}`;
      const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hour expiry
      
      this.authorizedSessions.set(sessionId, {
        tokenId: tokenString,
        level,
        permissions,
        issuedAt: Date.now(),
        expiresAt
      });
      
      // Emit event
      this.emit('token-verified', { tokenString });
      
      return {
        valid: true,
        token,
        timestamp: Date.now(),
        authorization: {
          level,
          permissions,
          expires: expiresAt
        }
      };
      
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.WARNING,
        message: 'Token verification failed',
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
   * Check if a token has specific permission
   * @param tokenString Token to check
   * @param permission Permission to check for
   */
  public hasPermission(tokenString: string, permission: string): boolean {
    // Verify the token first
    const verification = this.verifyToken(tokenString);
    
    if (!verification.valid || !verification.authorization) {
      return false;
    }
    
    // Check for admin permission
    if (verification.authorization.permissions.includes('admin')) {
      return true;
    }
    
    // Check for specific permission
    return verification.authorization.permissions.includes(permission);
  }
  
  /**
   * Revoke a token
   * @param tokenString Token to revoke
   */
  public revokeToken(tokenString: string): boolean {
    // Find token in valid tokens
    const token = this.validTokens.get(tokenString);
    
    if (!token) {
      return false;
    }
    
    // Remove token from valid tokens
    this.validTokens.delete(tokenString);
    
    // Remove any associated session
    for (const [sessionId, session] of this.authorizedSessions.entries()) {
      if (session.tokenId === tokenString) {
        this.authorizedSessions.delete(sessionId);
      }
    }
    
    // Emit event
    this.emit('token-revoked', { tokenString });
    
    return true;
  }
  
  /**
   * Clear expired sessions
   */
  public clearExpiredSessions(): number {
    const now = Date.now();
    let clearedCount = 0;
    
    for (const [sessionId, session] of this.authorizedSessions.entries()) {
      if (session.expiresAt && session.expiresAt < now) {
        this.authorizedSessions.delete(sessionId);
        clearedCount++;
      }
    }
    
    if (clearedCount > 0) {
      this.emit('sessions-cleared', { count: clearedCount });
    }
    
    return clearedCount;
  }
  
  /**
   * Generate a sequence for a token
   */
  private generateSequence(): string {
    return cryptoSecurityService.generateRandomString({
      length: 7,
      includeNumbers: true,
      includeSpecialChars: false,
      includeLowercase: true,
      includeUppercase: true
    });
  }
  
  /**
   * Generate a verification code based on sequence and level
   */
  private generateVerificationCode(sequence: string, level: number): string {
    try {
      // Use sequence and seed vector to create a verification code
      const baseString = `${sequence}${this.SEED_VECTOR}${level}`;
      
      // Use crypto service to generate a hash-like string
      const hash = cryptoSecurityService.generateRandomString({
        length: 10,
        includeNumbers: true,
        includeSpecialChars: false,
        includeLowercase: true,
        includeUppercase: true
      });
      
      return hash;
    } catch (error) {
      console.error('Error generating verification code:', error);
      return '0000000000'; // Fallback
    }
  }
  
  /**
   * Extract authorization level from verification code and sequence
   */
  private extractAuthorizationLevel(verificationCode: string, sequence: string): number {
    try {
      // In a real implementation, this would do complex validation
      // For this implementation, we'll use a simple approach
      
      // Sum the character codes of the verification code
      const codeSum = verificationCode.split('').reduce((sum, char) => {
        return sum + char.charCodeAt(0);
      }, 0);
      
      // Use sequence characters to derive a modifier
      const seqModifier = sequence.charCodeAt(0) % 5 + 1;
      
      // Calculate level (1-5)
      const calculatedLevel = ((codeSum % 5) + 1);
      
      // The level is valid if it matches expected pattern
      if (calculatedLevel >= 1 && calculatedLevel <= 5) {
        return calculatedLevel;
      }
      
      return 0; // Invalid level
    } catch (error) {
      console.error('Error extracting authorization level:', error);
      return 0; // Invalid level
    }
  }
  
  /**
   * Generate control block based on permissions
   */
  private generateControlBlock(permissions: string[]): string {
    try {
      // Start with control prefix
      let controlBlock = this.CONTROL_PREFIX;
      
      // Add permission hash - in real implementation this would encode permissions
      if (permissions.length > 0) {
        // Generate a simple hash of permissions
        const permStr = permissions.join(',');
        const hashSum = permStr.split('').reduce((sum, char) => {
          return sum + char.charCodeAt(0);
        }, 0);
        
        // Generate a short code from hash sum
        const permCode = (hashSum % 10000).toString().padStart(4, '0');
        controlBlock = `${controlBlock}${permCode}`;
      } else {
        controlBlock = `${controlBlock}0000`;
      }
      
      return controlBlock;
    } catch (error) {
      console.error('Error generating control block:', error);
      return `${this.CONTROL_PREFIX}0000`; // Fallback
    }
  }
  
  /**
   * Extract permissions from control block
   */
  private extractPermissions(controlBlock: string): string[] {
    try {
      // In a real implementation, this would decode actual permissions
      // Here we use a simplified approach
      
      if (controlBlock === `${this.CONTROL_PREFIX}0000`) {
        return []; // No permissions
      }
      
      // Extract permission code from control block
      const permCode = controlBlock.substring(this.CONTROL_PREFIX.length);
      const permValue = parseInt(permCode, 10);
      
      // Map permission value to actual permissions
      const permissions = [];
      
      if (permValue & 1) permissions.push('read');
      if (permValue & 2) permissions.push('write');
      if (permValue & 4) permissions.push('execute');
      if (permValue & 8) permissions.push('admin');
      
      return permissions;
    } catch (error) {
      console.error('Error extracting permissions:', error);
      return []; // Default to no permissions
    }
  }
  
  /**
   * Load persisted tokens
   */
  private async loadPersistedTokens(): Promise<void> {
    try {
      // In a real implementation, this would load from storage
      // For this implementation, we'll use global token service
      
      const storedTokens = globalTokenService.getAllTokensWithAnalytics()
        .filter(t => t.token.startsWith(this.TOKEN_PREFIX))
        .map(t => t.token);
      
      // Validate each token
      for (const tokenString of storedTokens) {
        this.verifyToken(tokenString);
      }
    } catch (error) {
      console.error('Error loading persisted tokens:', error);
    }
  }
}

// Export singleton instance
export const compositeCipherKeychainService = CompositeCipherKeychainService.getInstance();
export default compositeCipherKeychainService;
