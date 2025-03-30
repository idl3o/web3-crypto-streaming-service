import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { cryptoSecurityService, SecurityLevel } from './CryptoSecurityService';
import { globalTokenService } from './GlobalTokenService';
import { healthMonitoringService, ComponentType, HealthStatus } from './HealthMonitoringService';

/**
 * Token verification result
 */
export interface VerificationResult {
  valid: boolean;
  tokenId?: string;
  keyId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
  compromised: boolean;
}

/**
 * Key compromise risk level
 */
export enum CompromiseRiskLevel {
  NONE = 'none',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Key status information
 */
export interface KeyStatus {
  keyId: string;
  createdAt: number;
  lastUsed: number;
  usageCount: number;
  riskLevel: CompromiseRiskLevel;
  compromised: boolean;
  scanHistory: {
    timestamp: number;
    result: string;
    anomalyDetected: boolean;
  }[];
}

/**
 * Verification patterns for token validation
 */
export interface VerificationPattern {
  id: string;
  name: string;
  pattern: RegExp;
  validator: (token: string, matches: RegExpExecArray) => Promise<boolean>;
  priority: number;
}

/**
 * Scanning result for key compromise detection
 */
export interface ScanningResult {
  keyIds: string[];
  scannedAt: number;
  compromisedKeys: string[];
  anomalies: {
    keyId: string;
    description: string;
    severity: CompromiseRiskLevel;
  }[];
  recommendations: string[];
}

/**
 * Hashed Token-Based Verification and Key Compromise Scanning Service
 */
export class HashTokenVerificationService extends EventEmitter {
  private static instance: HashTokenVerificationService;
  private initialized: boolean = false;
  private verificationPatterns: VerificationPattern[] = [];
  private keyStatuses = new Map<string, KeyStatus>();
  private knownCompromisedPatterns: string[] = [];
  private scanningInterval: NodeJS.Timer | null = null;
  private readonly scanIntervalTime = 3600000; // 1 hour in ms
  
  private serviceIdentifier = 'h#tbvkcs#';
  
  private constructor() {
    super();
    this.setMaxListeners(50);
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): HashTokenVerificationService {
    if (!HashTokenVerificationService.instance) {
      HashTokenVerificationService.instance = new HashTokenVerificationService();
    }
    return HashTokenVerificationService.instance;
  }
  
  /**
   * Initialize the service
   */
  public async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Register with health monitoring service
      await this.registerWithHealthMonitoring();
      
      // Register standard verification patterns
      this.registerDefaultPatterns();
      
      // Schedule periodic key scanning
      this.scheduleScanningTask();
      
      // Load known compromise patterns
      this.loadCompromisePatterns();
      
      this.initialized = true;
      this.emit('initialized', { serviceIdentifier: this.serviceIdentifier });
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to initialize Hash Token Verification Service',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }

  /**
   * Register with health monitoring
   */
  private async registerWithHealthMonitoring(): Promise<void> {
    if (!healthMonitoringService["initialized"]) {
      await healthMonitoringService.initialize();
    }
    
    // Register component
    healthMonitoringService.registerComponent(
      'hash-token-verification',
      ComponentType.SECURITY,
      {
        status: HealthStatus.HEALTHY,
        message: 'H#TBVKCS# system initialized',
        metrics: {
          patternCount: this.verificationPatterns.length,
          keyCount: this.keyStatuses.size
        }
      }
    );
    
    // Register health check
    healthMonitoringService.registerHealthCheck(
      'hash-token-verification',
      async () => {
        const compromisedCount = Array.from(this.keyStatuses.values())
          .filter(k => k.compromised).length;
        
        let status = HealthStatus.HEALTHY;
        let message = `H#TBVKCS# operational - monitoring ${this.keyStatuses.size} keys`;
        
        if (compromisedCount > 0) {
          status = HealthStatus.UNHEALTHY;
          message = `${compromisedCount} compromised keys detected`;
        }
        
        return {
          status,
          message,
          metrics: {
            patternCount: this.verificationPatterns.length,
            keyCount: this.keyStatuses.size,
            compromisedCount
          }
        };
      },
      30 * 60 * 1000 // Check every 30 minutes
    );
  }
  
  /**
   * Register default verification patterns
   */
  private registerDefaultPatterns(): void {
    // Hash token with prefix pattern (h#t...)
    this.registerVerificationPattern({
      id: 'hash-token-standard',
      name: 'Standard Hash Token',
      pattern: /^h#t([a-zA-Z0-9]{8})([a-zA-Z0-9]{16})([a-zA-Z0-9]{4})$/,
      validator: async (token, matches) => {
        // Extract key ID and hash parts
        const keyId = matches[1];
        const hash = matches[2];
        const suffix = matches[3];
        
        // Check if key is known and not compromised
        const keyStatus = this.getKeyStatus(keyId);
        if (keyStatus.compromised) {
          return false;
        }
        
        // Update key usage statistics
        this.updateKeyUsage(keyId);
        
        // Simple validation logic - in a real system this would be more complex
        return hash.length === 16 && suffix.length === 4;
      },
      priority: 100
    });
    
    // Verification key pattern (v#k...)
    this.registerVerificationPattern({
      id: 'verification-key',
      name: 'Verification Key',
      pattern: /^v#k([a-zA-Z0-9]{6})b([a-zA-Z0-9]{10})cs#$/,
      validator: async (token, matches) => {
        const keyId = matches[1];
        const hash = matches[2];
        
        // Token validation logic
        const keyStatus = this.getKeyStatus(keyId);
        if (keyStatus.compromised) {
          return false;
        }
        
        // Update key usage statistics
        this.updateKeyUsage(keyId);
        
        return true;
      },
      priority: 90
    });
    
    // Hash+Key Signature (h#k...)
    this.registerVerificationPattern({
      id: 'hash-key-signature',
      name: 'Hash Key Signature',
      pattern: /^h#k([a-zA-Z0-9]{6})s([a-zA-Z0-9]{24})$/,
      validator: async (token, matches) => {
        const keyId = matches[1];
        const signature = matches[2];
        
        // Token validation logic
        const keyStatus = this.getKeyStatus(keyId);
        if (keyStatus.compromised) {
          return false;
        }
        
        // Update key usage statistics
        this.updateKeyUsage(keyId);
        
        return signature.length === 24;
      },
      priority: 80
    });
  }
  
  /**
   * Register a new verification pattern
   * @param pattern Verification pattern
   */
  public registerVerificationPattern(pattern: VerificationPattern): void {
    // Check for duplicate ID
    if (this.verificationPatterns.some(p => p.id === pattern.id)) {
      throw new Error(`Pattern with ID ${pattern.id} already exists`);
    }
    
    this.verificationPatterns.push(pattern);
    // Sort by priority (highest first)
    this.verificationPatterns.sort((a, b) => b.priority - a.priority);
    
    this.emit('pattern-registered', { patternId: pattern.id });
  }
  
  /**
   * Generate a new hashed token
   * @param payload Data to include in the token
   * @param expiresInMs Token expiration time in milliseconds
   */
  public async generateToken(
    payload: string | Record<string, any>,
    expiresInMs?: number
  ): Promise<string> {
    // Generate a unique key ID
    const keyId = this.generateKeyId();
    
    // Convert payload to string if it's an object
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    // Generate hash value (in a real implementation, this would be more secure)
    const hashValue = await this.hashData(payloadStr + keyId + Date.now());
    const shortHash = hashValue.substring(0, 16);
    
    // Generate suffix
    const suffix = cryptoSecurityService.generateRandomString({
      length: 4,
      includeSpecialChars: false
    });
    
    // Create token
    const token = `h#t${keyId}${shortHash}${suffix}`;
    
    // Store token in global token service
    if (expiresInMs) {
      globalTokenService.storeToken(
        token,
        { payload, keyId, createdAt: Date.now() },
        expiresInMs,
        'h#tbvkcs#'
      );
    }
    
    // Register key status if not exists
    if (!this.keyStatuses.has(keyId)) {
      this.keyStatuses.set(keyId, {
        keyId,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        usageCount: 0,
        riskLevel: CompromiseRiskLevel.NONE,
        compromised: false,
        scanHistory: []
      });
    }
    
    // Emit event
    this.emit('token-generated', { keyId });
    
    return token;
  }
  
  /**
   * Verify a token
   * @param token Token to verify
   */
  public async verifyToken(token: string): Promise<VerificationResult> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      // Try each pattern until one matches
      for (const pattern of this.verificationPatterns) {
        const matches = pattern.pattern.exec(token);
        
        if (matches) {
          // Extract key ID if possible
          const keyId = matches[1] || '';
          
          // Check if key is compromised
          const keyCompromised = this.isKeyCompromised(keyId);
          
          // Validate using pattern's validator function
          const isValid = await pattern.validator(token, matches);
          
          // Check if token is stored in global token service
          const tokenData = globalTokenService.getToken(token);
          
          // Return result
          return {
            valid: isValid && !keyCompromised,
            keyId,
            tokenId: token,
            compromised: keyCompromised,
            timestamp: Date.now(),
            metadata: tokenData ? { ...tokenData } : undefined
          };
        }
      }
      
      // No patterns matched
      return {
        valid: false,
        timestamp: Date.now(),
        compromised: false
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
        timestamp: Date.now(),
        compromised: false,
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
  
  /**
   * Generate a key ID
   */
  private generateKeyId(): string {
    return cryptoSecurityService.generateRandomString({
      length: 8,
      includeSpecialChars: false
    });
  }
  
  /**
   * Hash data using SHA-256
   * @param data Data to hash
   */
  private async hashData(data: string): Promise<string> {
    try {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        // Node.js environment
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(data).digest('hex');
      }
    } catch (error) {
      console.error('Error hashing data:', error);
      // Fallback to simple hash
      return this.simpleHash(data);
    }
  }
  
  /**
   * Simple hash function as fallback
   * @param data Data to hash
   */
  private simpleHash(data: string): string {
    let hash = 0;
    if (data.length === 0) return hash.toString(16);
    
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convert to hex string
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
  
  /**
   * Get key status, create if not exists
   * @param keyId Key ID
   */
  private getKeyStatus(keyId: string): KeyStatus {
    if (!this.keyStatuses.has(keyId)) {
      this.keyStatuses.set(keyId, {
        keyId,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        usageCount: 0,
        riskLevel: CompromiseRiskLevel.NONE,
        compromised: false,
        scanHistory: []
      });
    }
    
    return this.keyStatuses.get(keyId)!;
  }
  
  /**
   * Update key usage statistics
   * @param keyId Key ID
   */
  private updateKeyUsage(keyId: string): void {
    const status = this.getKeyStatus(keyId);
    
    status.lastUsed = Date.now();
    status.usageCount++;
    
    this.keyStatuses.set(keyId, status);
  }
  
  /**
   * Schedule scanning task
   */
  private scheduleScanningTask(): void {
    // Clear any existing interval
    if (this.scanningInterval) {
      clearInterval(this.scanningInterval);
    }
    
    // Set up new interval
    this.scanningInterval = setInterval(() => {
      this.performKeyScan()
        .catch(error => {
          console.error('Error during key scanning:', error);
        });
    }, this.scanIntervalTime);
  }
  
  /**
   * Perform key compromise scan
   */
  public async performKeyScan(): Promise<ScanningResult> {
    // Get all keys to scan
    const keyIds = Array.from(this.keyStatuses.keys());
    
    const compromisedKeys: string[] = [];
    const anomalies: {
      keyId: string;
      description: string;
      severity: CompromiseRiskLevel;
    }[] = [];
    
    // Scan each key for compromise
    for (const keyId of keyIds) {
      const keyStatus = this.keyStatuses.get(keyId)!;
      
      // Skip already compromised keys
      if (keyStatus.compromised) {
        compromisedKeys.push(keyId);
        continue;
      }
      
      // Check for compromise indicators
      let isCompromised = false;
      let riskLevel = CompromiseRiskLevel.NONE;
      let anomalyDescription = '';
      
      // 1. Check against known compromised patterns
      if (this.knownCompromisedPatterns.some(pattern => keyId.includes(pattern))) {
        isCompromised = true;
        riskLevel = CompromiseRiskLevel.CRITICAL;
        anomalyDescription = 'Key matches known compromised pattern';
      }
      
      // 2. Usage pattern anomalies (simplified example)
      const timeSinceLastUse = Date.now() - keyStatus.lastUsed;
      const isUnusedKey = timeSinceLastUse > 30 * 24 * 60 * 60 * 1000; // 30 days
      
      if (isUnusedKey && keyStatus.usageCount > 0) {
        riskLevel = CompromiseRiskLevel.LOW;
        anomalyDescription = 'Key unused for extended period';
      }
      
      // 3. Excessive usage
      if (keyStatus.usageCount > 1000) {
        riskLevel = CompromiseRiskLevel.MODERATE;
        anomalyDescription = 'Key has excessive usage count';
      }
      
      // Record scan result
      keyStatus.scanHistory.push({
        timestamp: Date.now(),
        result: isCompromised ? 'compromised' : riskLevel !== CompromiseRiskLevel.NONE ? 'anomaly' : 'clean',
        anomalyDetected: isCompromised || riskLevel !== CompromiseRiskLevel.NONE
      });
      
      // Keep scan history manageable (last 10 scans)
      if (keyStatus.scanHistory.length > 10) {
        keyStatus.scanHistory = keyStatus.scanHistory.slice(-10);
      }
      
      // Update key status
      keyStatus.riskLevel = riskLevel;
      keyStatus.compromised = isCompromised;
      this.keyStatuses.set(keyId, keyStatus);
      
      // Add to results lists
      if (isCompromised) {
        compromisedKeys.push(keyId);
      }
      
      if (riskLevel !== CompromiseRiskLevel.NONE || isCompromised) {
        anomalies.push({
          keyId,
          description: anomalyDescription,
          severity: riskLevel
        });
      }
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (compromisedKeys.length > 0) {
      recommendations.push('Rotate all compromised keys immediately');
      
      // If we have critical compromise, increase security level
      if (anomalies.some(a => a.severity === CompromiseRiskLevel.CRITICAL)) {
        recommendations.push('Increase security level system-wide');
        cryptoSecurityService.setSecurityLevel(SecurityLevel.MAXIMUM);
      }
    }
    
    if (anomalies.length > compromisedKeys.length) {
      recommendations.push('Review keys with anomalies');
    }
    
    // Create scan result
    const result: ScanningResult = {
      keyIds,
      scannedAt: Date.now(),
      compromisedKeys,
      anomalies,
      recommendations
    };
    
    // Emit scan completed event
    this.emit('scan-completed', {
      compromisedCount: compromisedKeys.length,
      anomalyCount: anomalies.length
    });
    
    return result;
  }
  
  /**
   * Check if a key is compromised
   * @param keyId Key ID to check
   */
  public isKeyCompromised(keyId: string): boolean {
    const keyStatus = this.keyStatuses.get(keyId);
    return keyStatus ? keyStatus.compromised : false;
  }
  
  /**
   * Mark a key as compromised
   * @param keyId Key ID
   * @param reason Reason for marking as compromised
   */
  public markKeyAsCompromised(keyId: string, reason: string): void {
    const keyStatus = this.getKeyStatus(keyId);
    
    keyStatus.compromised = true;
    keyStatus.riskLevel = CompromiseRiskLevel.CRITICAL;
    keyStatus.scanHistory.push({
      timestamp: Date.now(),
      result: `manually marked as compromised: ${reason}`,
      anomalyDetected: true
    });
    
    this.keyStatuses.set(keyId, keyStatus);
    
    // Emit event
    this.emit('key-compromised', {
      keyId,
      reason,
      timestamp: Date.now()
    });
  }
  
  /**
   * Get key risk assessment
   * @param keyId Key ID
   */
  public getKeyRiskAssessment(keyId: string): {
    keyId: string;
    riskLevel: CompromiseRiskLevel;
    compromised: boolean;
    lastScanned?: number;
    recommendations: string[];
  } {
    const keyStatus = this.keyStatuses.get(keyId);
    
    if (!keyStatus) {
      return {
        keyId,
        riskLevel: CompromiseRiskLevel.LOW, // Unknown key, so low risk
        compromised: false,
        recommendations: ['Register key for monitoring']
      };
    }
    
    const lastScan = keyStatus.scanHistory.length > 0 ? 
      keyStatus.scanHistory[keyStatus.scanHistory.length - 1].timestamp :
      undefined;
    
    const recommendations: string[] = [];
    
    if (keyStatus.compromised) {
      recommendations.push('Rotate this key immediately');
      recommendations.push('Audit systems using this key');
    } else if (keyStatus.riskLevel === CompromiseRiskLevel.HIGH) {
      recommendations.push('Consider rotating this key');
      recommendations.push('Review recent activity for this key');
    } else if (keyStatus.riskLevel === CompromiseRiskLevel.MODERATE) {
      recommendations.push('Monitor key activity closely');
    }
    
    if (keyStatus.usageCount === 0) {
      recommendations.push('Remove unused key');
    }
    
    return {
      keyId,
      riskLevel: keyStatus.riskLevel,
      compromised: keyStatus.compromised,
      lastScanned: lastScan,
      recommendations
    };
  }
  
  /**
   * Load known compromise patterns
   */
  private loadCompromisePatterns(): void {
    // In a real implementation, these would be loaded from a database or config
    this.knownCompromisedPatterns = [
      '00000000', // Example of a compromised pattern
      'admin',
      'root',
      'test',
      'password'
    ];
  }
  
  /**
   * Add a known compromise pattern
   * @param pattern Compromised pattern to add
   */
  public addCompromisePattern(pattern: string): void {
    if (!this.knownCompromisedPatterns.includes(pattern)) {
      this.knownCompromisedPatterns.push(pattern);
      
      // Emit event
      this.emit('compromise-pattern-added', { pattern });
    }
  }
  
  /**
   * Get service identifier
   */
  public getServiceIdentifier(): string {
    return this.serviceIdentifier;
  }
}

// Export singleton instance
export const hashTokenVerificationService = HashTokenVerificationService.getInstance();
export default hashTokenVerificationService;
