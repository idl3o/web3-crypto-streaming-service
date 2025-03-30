import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { cryptoSecurityService } from './CryptoSecurityService';
import { globalTokenService } from './GlobalTokenService';

/**
 * FFXS Token configuration 
 */
export interface FFXSTokenConfig {
  maxSupply: number;
  minRequiredBalance: number;
  expirationTime: number; // In milliseconds
  renewalThreshold: number; // Percentage at which tokens are renewed
}

/**
 * Content access level
 */
export enum ContentAccessLevel {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  EXCLUSIVE = 'exclusive'
}

/**
 * Token status
 */
export enum TokenStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  PENDING = 'pending'
}

/**
 * Registered wallet information
 */
export interface RegisteredWallet {
  walletId: string;
  address: string;
  registrationDate: number;
  lastActive: number;
  verified: boolean;
  tokenBalance: number;
  contentAccess: ContentAccessLevel;
  verificationMethod?: string;
}

/**
 * Streaming token information
 */
export interface StreamingToken {
  tokenId: string;
  walletId: string;
  symbol: string;
  amount: number;
  issuedAt: number;
  expiresAt: number;
  status: TokenStatus;
  contentId?: string;
  usageData: {
    streamCount: number;
    minutesStreamed: number;
    lastUsed: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Content restriction data
 */
export interface ContentRestriction {
  contentId: string;
  requiredAccess: ContentAccessLevel;
  requiredTokens: number;
  allowedRegions?: string[];
  minimumAge?: number;
  restrictedWallets?: string[];
}

/**
 * Web3 Streaming Token Manager Service
 * Manages streaming tokens, wallet registration, and content control
 */
export class W3STokenManagerService extends EventEmitter {
  private static instance: W3STokenManagerService;
  private initialized: boolean = false;
  private registeredWallets = new Map<string, RegisteredWallet>();
  private streamingTokens = new Map<string, StreamingToken>();
  private contentRestrictions = new Map<string, ContentRestriction>();
  private walletAddressMap = new Map<string, string>(); // Maps wallet address to walletId
  
  // FFXS Token configuration
  private ffxsConfig: FFXSTokenConfig = {
    maxSupply: 200, // Maximum 200 FFXS tokens per wallet
    minRequiredBalance: 5, // Minimum required for streaming
    expirationTime: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    renewalThreshold: 15 // Renew when 15% of tokens remain
  };

  private constructor() {
    super();
    this.setMaxListeners(50);
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): W3STokenManagerService {
    if (!W3STokenManagerService.instance) {
      W3STokenManagerService.instance = new W3STokenManagerService();
    }
    return W3STokenManagerService.instance;
  }

  /**
   * Initialize the token manager service
   * @param config Optional FFXS token configuration
   */
  public async initialize(config?: Partial<FFXSTokenConfig>): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Update configuration if provided
      if (config) {
        this.ffxsConfig = { ...this.ffxsConfig, ...config };
      }
      
      // Ensure crypto security service is initialized
      if (!cryptoSecurityService['initialized']) {
        await cryptoSecurityService.initialize();
      }
      
      // Set up token cleanup schedule
      this.setupTokenCleanup();
      
      this.initialized = true;
      this.emit('initialized', { 
        ffxsConfig: this.ffxsConfig 
      });
      
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to initialize W3S Token Manager',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }
  
  /**
   * Register a new wallet
   * @param address Wallet address
   * @param initialAccessLevel Initial content access level
   */
  public async registerWallet(
    address: string, 
    initialAccessLevel: ContentAccessLevel = ContentAccessLevel.BASIC
  ): Promise<RegisteredWallet> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Check if wallet address is already registered
    if (this.walletAddressMap.has(address)) {
      const existingWalletId = this.walletAddressMap.get(address);
      const existingWallet = this.registeredWallets.get(existingWalletId!);
      
      if (existingWallet) {
        return existingWallet;
      }
    }
    
    try {
      const now = Date.now();
      const walletId = `wallet-${now}-${cryptoSecurityService.generateRandomString({ length: 8 })}`;
      
      // Create wallet registration
      const wallet: RegisteredWallet = {
        walletId,
        address,
        registrationDate: now,
        lastActive: now,
        verified: false,
        tokenBalance: 0,
        contentAccess: initialAccessLevel
      };
      
      // Store wallet information
      this.registeredWallets.set(walletId, wallet);
      this.walletAddressMap.set(address, walletId);
      
      // Emit event
      this.emit('wallet-registered', { walletId, address });
      
      return wallet;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to register wallet',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      throw error;
    }
  }
  
  /**
   * Verify a registered wallet
   * @param walletId Wallet identifier
   * @param verificationMethod Method used for verification
   */
  public async verifyWallet(walletId: string, verificationMethod: string): Promise<boolean> {
    const wallet = this.registeredWallets.get(walletId);
    
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }
    
    try {
      // Update wallet verification status
      wallet.verified = true;
      wallet.verificationMethod = verificationMethod;
      wallet.lastActive = Date.now();
      
      this.registeredWallets.set(walletId, wallet);
      
      // Issue initial FFXS tokens to newly verified wallet
      await this.issueFFXSTokens(walletId, 50);
      
      // Emit event
      this.emit('wallet-verified', { 
        walletId, 
        address: wallet.address,
        verificationMethod
      });
      
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.WARNING,
        message: 'Failed to verify wallet',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }
  
  /**
   * Issue FFXS tokens to a wallet
   * @param walletId Wallet identifier
   * @param amount Amount of tokens to issue
   */
  public async issueFFXSTokens(walletId: string, amount: number): Promise<number> {
    const wallet = this.registeredWallets.get(walletId);
    
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }
    
    if (!wallet.verified) {
      throw new Error(`Wallet must be verified before tokens can be issued`);
    }
    
    try {
      // Check maximum supply
      const newBalance = wallet.tokenBalance + amount;
      if (newBalance > this.ffxsConfig.maxSupply) {
        const adjustedAmount = this.ffxsConfig.maxSupply - wallet.tokenBalance;
        
        if (adjustedAmount <= 0) {
          return 0; // Already at maximum supply
        }
        
        amount = adjustedAmount;
      }
      
      // Create a token record
      const tokenId = `ffxs-${Date.now()}-${cryptoSecurityService.generateRandomString({ length: 8 })}`;
      const expiresAt = Date.now() + this.ffxsConfig.expirationTime;
      
      const token: StreamingToken = {
        tokenId,
        walletId,
        symbol: 'FFXS',
        amount,
        issuedAt: Date.now(),
        expiresAt,
        status: TokenStatus.ACTIVE,
        usageData: {
          streamCount: 0,
          minutesStreamed: 0,
          lastUsed: Date.now()
        }
      };
      
      // Store token
      this.streamingTokens.set(tokenId, token);
      
      // Update wallet balance
      wallet.tokenBalance += amount;
      wallet.lastActive = Date.now();
      this.registeredWallets.set(walletId, wallet);
      
      // Emit event
      this.emit('tokens-issued', { 
        walletId, 
        tokenId,
        symbol: 'FFXS', 
        amount
      });
      
      return amount;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.WARNING,
        message: 'Failed to issue FFXS tokens',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      throw error;
    }
  }
  
  /**
   * Consume FFXS tokens for streaming
   * @param walletId Wallet identifier
   * @param contentId Content identifier
   * @param amount Amount of tokens to consume
   */
  public async consumeFFXSTokens(
    walletId: string, 
    contentId: string, 
    amount: number
  ): Promise<boolean> {
    const wallet = this.registeredWallets.get(walletId);
    
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }
    
    if (wallet.tokenBalance < amount) {
      throw new Error(`Insufficient token balance: ${wallet.tokenBalance}`);
    }
    
    // Check content restrictions
    if (!this.checkContentAccess(walletId, contentId)) {
      throw new Error(`Access denied to content: ${contentId}`);
    }
    
    try {
      // Update wallet balance
      wallet.tokenBalance -= amount;
      wallet.lastActive = Date.now();
      this.registeredWallets.set(walletId, wallet);
      
      // Create consumption record
      const consumptionId = `consumption-${Date.now()}-${cryptoSecurityService.generateRandomString({ length: 8 })}`;
      
      // Store consumption in global token service for tracking
      globalTokenService.storeToken(
        consumptionId,
        {
          walletId,
          contentId,
          amount,
          timestamp: Date.now()
        },
        30 * 24 * 60 * 60 * 1000, // 30 days
        'ffxs-consumption'
      );
      
      // Auto-renewal check
      if (wallet.tokenBalance < (this.ffxsConfig.maxSupply * this.ffxsConfig.renewalThreshold / 100)) {
        // If balance is below renewal threshold, issue more tokens
        const renewalAmount = Math.min(
          50, // Issue 50 tokens at a time
          this.ffxsConfig.maxSupply - wallet.tokenBalance // Don't exceed max supply
        );
        
        if (renewalAmount > 0) {
          await this.issueFFXSTokens(walletId, renewalAmount);
        }
      }
      
      // Emit event
      this.emit('tokens-consumed', {
        walletId,
        contentId,
        amount,
        remainingBalance: wallet.tokenBalance
      });
      
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.WARNING,
        message: 'Failed to consume FFXS tokens',
        details: error instanceof Error ? error.message : String(error),
        retryable: false,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }
  
  /**
   * Set content restrictions
   * @param contentId Content identifier
   * @param restrictions Content access restrictions
   */
  public setContentRestrictions(
    contentId: string,
    restrictions: Partial<ContentRestriction>
  ): ContentRestriction {
    const existingRestrictions = this.contentRestrictions.get(contentId);
    
    const updatedRestrictions: ContentRestriction = {
      contentId,
      requiredAccess: restrictions.requiredAccess || existingRestrictions?.requiredAccess || ContentAccessLevel.BASIC,
      requiredTokens: restrictions.requiredTokens || existingRestrictions?.requiredTokens || 0,
      allowedRegions: restrictions.allowedRegions || existingRestrictions?.allowedRegions,
      minimumAge: restrictions.minimumAge || existingRestrictions?.minimumAge,
      restrictedWallets: restrictions.restrictedWallets || existingRestrictions?.restrictedWallets
    };
    
    // Store content restrictions
    this.contentRestrictions.set(contentId, updatedRestrictions);
    
    // Emit event
    this.emit('content-restrictions-updated', {
      contentId,
      restrictions: updatedRestrictions
    });
    
    return updatedRestrictions;
  }
  
  /**
   * Check if a wallet has access to content
   * @param walletId Wallet identifier
   * @param contentId Content identifier
   */
  public checkContentAccess(walletId: string, contentId: string): boolean {
    const wallet = this.registeredWallets.get(walletId);
    
    if (!wallet) {
      return false;
    }
    
    const restrictions = this.contentRestrictions.get(contentId);
    
    if (!restrictions) {
      return true; // No restrictions set
    }
    
    // Check if wallet is in restricted wallets list
    if (restrictions.restrictedWallets?.includes(walletId)) {
      return false;
    }
    
    // Check access level
    const accessLevelRequirement = this.getAccessLevelValue(restrictions.requiredAccess);
    const walletAccessLevel = this.getAccessLevelValue(wallet.contentAccess);
    
    if (walletAccessLevel < accessLevelRequirement) {
      return false;
    }
    
    // Check token balance
    if (wallet.tokenBalance < restrictions.requiredTokens) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Upgrade wallet access level
   * @param walletId Wallet identifier
   * @param newAccessLevel New access level
   */
  public upgradeAccessLevel(
    walletId: string,
    newAccessLevel: ContentAccessLevel
  ): boolean {
    const wallet = this.registeredWallets.get(walletId);
    
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }
    
    // Check if this is actually an upgrade
    const currentLevel = this.getAccessLevelValue(wallet.contentAccess);
    const newLevel = this.getAccessLevelValue(newAccessLevel);
    
    if (newLevel <= currentLevel) {
      return false; // Not an upgrade
    }
    
    // Update wallet access level
    wallet.contentAccess = newAccessLevel;
    wallet.lastActive = Date.now();
    this.registeredWallets.set(walletId, wallet);
    
    // Emit event
    this.emit('access-level-upgraded', {
      walletId,
      oldLevel: wallet.contentAccess,
      newLevel: newAccessLevel
    });
    
    return true;
  }
  
  /**
   * Get wallet information
   * @param walletIdOrAddress Wallet ID or address
   */
  public getWalletInfo(walletIdOrAddress: string): RegisteredWallet | null {
    // Check if it's a wallet ID
    if (this.registeredWallets.has(walletIdOrAddress)) {
      return this.registeredWallets.get(walletIdOrAddress) || null;
    }
    
    // Check if it's a wallet address
    const walletId = this.walletAddressMap.get(walletIdOrAddress);
    if (walletId) {
      return this.registeredWallets.get(walletId) || null;
    }
    
    return null;
  }
  
  /**
   * Get content restrictions
   * @param contentId Content identifier
   */
  public getContentRestrictions(contentId: string): ContentRestriction | null {
    return this.contentRestrictions.get(contentId) || null;
  }
  
  /**
   * Get wallet token balance
   * @param walletId Wallet identifier
   */
  public getWalletBalance(walletId: string): number {
    const wallet = this.registeredWallets.get(walletId);
    return wallet?.tokenBalance || 0;
  }
  
  /**
   * Get streaming tokens for a wallet
   * @param walletId Wallet identifier
   */
  public getWalletTokens(walletId: string): StreamingToken[] {
    return Array.from(this.streamingTokens.values())
      .filter(token => token.walletId === walletId && token.status === TokenStatus.ACTIVE);
  }
  
  /**
   * Set up token cleanup schedule
   */
  private setupTokenCleanup(): void {
    // Clean up expired tokens daily
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }
  
  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [tokenId, token] of this.streamingTokens.entries()) {
      if (token.expiresAt < now && token.status === TokenStatus.ACTIVE) {
        // Update token status
        token.status = TokenStatus.EXPIRED;
        this.streamingTokens.set(tokenId, token);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      this.emit('tokens-expired', { count: expiredCount });
    }
  }
  
  /**
   * Convert access level enum to numeric value for comparison
   */
  private getAccessLevelValue(level: ContentAccessLevel): number {
    switch (level) {
      case ContentAccessLevel.FREE:
        return 0;
      case ContentAccessLevel.BASIC:
        return 1;
      case ContentAccessLevel.PREMIUM:
        return 2;
      case ContentAccessLevel.EXCLUSIVE:
        return 3;
      default:
        return 0;
    }
  }
}

// Export singleton instance
export const w3sTokenManager = W3STokenManagerService.getInstance();
export default w3sTokenManager;
