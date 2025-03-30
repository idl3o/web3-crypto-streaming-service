import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { cryptoSecurityService } from './CryptoSecurityService';

/**
 * SNE Protocol Versions
 */
export enum SNEProtocolVersion {
  V0_1 = '0/1',  // Basic encryption with rotating keys
  V0_2 = '0/2',  // Enhanced with integrity verification
  V1_0 = '1/0'   // Full feature set (future)
}

/**
 * Encryption mode options
 */
export enum EncryptionMode {
  STREAMING = 'streaming',  // Optimized for streaming data
  STORAGE = 'storage',      // Optimized for stored content
  HYBRID = 'hybrid'         // Balanced approach
}

/**
 * Encryption strength level
 */
export enum EncryptionStrength {
  LIGHT = 'light',      // Fastest, lowest overhead
  STANDARD = 'standard', // Balanced security/performance
  STRONG = 'strong'     // Maximum security
}

/**
 * SNE Configuration options
 */
export interface SNEConfig {
  protocol: SNEProtocolVersion;
  mode: EncryptionMode;
  strength: EncryptionStrength;
  keyRotationInterval: number;  // In milliseconds
  enableCompression: boolean;
}

/**
 * Encryption session information
 */
export interface EncryptionSession {
  sessionId: string;
  protocol: SNEProtocolVersion;
  createdAt: number;
  lastUsed: number;
  keyId: string;
  nextKeyId?: string;
  mode: EncryptionMode;
  streamId?: string;
  metrics: {
    bytesEncrypted: number;
    bytesDecrypted: number;
    chunkCount: number;
    avgProcessingTime: number;
  };
  isActive: boolean;
}

/**
 * Encrypted data chunk
 */
export interface EncryptedChunk {
  sessionId: string;
  keyId: string;
  iv: string;
  data: string; // Base64 encoded encrypted data
  timestamp: number;
  sequence: number;
  format: string;
  protocol: SNEProtocolVersion;
  metadata?: Record<string, any>;
}

/**
 * Secure Network Encryption Service (SNE)
 * Provides encryption capabilities for secure streaming data
 * Current implementation: v0/1
 */
export class SNEService extends EventEmitter {
  private static instance: SNEService;
  private sessions = new Map<string, EncryptionSession>();
  private encryptionKeys = new Map<string, CryptoKey>();
  private activeSessions = new Set<string>();
  private initialized = false;
  
  // Default configuration
  private defaultConfig: SNEConfig = {
    protocol: SNEProtocolVersion.V0_1,
    mode: EncryptionMode.STREAMING,
    strength: EncryptionStrength.STANDARD,
    keyRotationInterval: 30 * 60 * 1000, // 30 minutes
    enableCompression: false
  };
  
  private currentConfig: SNEConfig;
  
  private constructor() {
    super();
    this.setMaxListeners(30);
    this.currentConfig = { ...this.defaultConfig };
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): SNEService {
    if (!SNEService.instance) {
      SNEService.instance = new SNEService();
    }
    return SNEService.instance;
  }
  
  /**
   * Initialize the SNE service
   * @param config Optional configuration
   */
  public async initialize(config?: Partial<SNEConfig>): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Apply custom configuration if provided
      if (config) {
        this.currentConfig = {
          ...this.defaultConfig,
          ...config
        };
      }
      
      // Set up key rotation scheduler
      this.setupKeyRotation();
      
      this.initialized = true;
      this.emit('initialized', { protocolVersion: this.currentConfig.protocol });
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to initialize SNE service',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      return false;
    }
  }
  
  /**
   * Create a new encryption session
   * @param streamId Optional associated stream ID
   * @param customConfig Optional custom configuration for this session
   */
  public async createSession(
    streamId?: string,
    customConfig?: Partial<SNEConfig>
  ): Promise<EncryptionSession> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      // Generate session ID
      const sessionId = `sne-${Date.now()}-${cryptoSecurityService.generateRandomString({ length: 8 })}`;
      
      // Apply custom config if provided, otherwise use service defaults
      const sessionConfig = customConfig ? { ...this.currentConfig, ...customConfig } : this.currentConfig;
      
      // Generate initial encryption key
      const keyId = await this.generateEncryptionKey();
      
      // Create session
      const session: EncryptionSession = {
        sessionId,
        protocol: sessionConfig.protocol,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        keyId,
        mode: sessionConfig.mode,
        streamId,
        metrics: {
          bytesEncrypted: 0,
          bytesDecrypted: 0,
          chunkCount: 0,
          avgProcessingTime: 0
        },
        isActive: true
      };
      
      // Store session
      this.sessions.set(sessionId, session);
      this.activeSessions.add(sessionId);
      
      // Emit event
      this.emit('session-created', { sessionId, streamId });
      
      return session;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to create encryption session',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw error;
    }
  }
  
  /**
   * Encrypt data using the specified session
   * @param sessionId Session ID
   * @param data Data to encrypt
   * @param metadata Optional metadata to include
   */
  public async encrypt(
    sessionId: string,
    data: string | ArrayBuffer,
    metadata?: Record<string, any>
  ): Promise<EncryptedChunk> {
    // Get session
    const session = this.getActiveSession(sessionId);
    
    const startTime = performance.now();
    
    try {
      // Convert data to ArrayBuffer if it's a string
      const dataBuffer = typeof data === 'string' 
        ? new TextEncoder().encode(data) 
        : data;
      
      // Apply compression if enabled
      const processedData = this.currentConfig.enableCompression 
        ? await this.compressData(dataBuffer)
        : dataBuffer;
      
      // Get encryption key
      const key = this.encryptionKeys.get(session.keyId);
      if (!key) {
        throw new Error(`Encryption key not found: ${session.keyId}`);
      }
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(16));
      
      // Encrypt the data
      const encryptedData = await this.encryptData(processedData, key, iv);
      
      // Encode as Base64
      const encryptedBase64 = this.arrayBufferToBase64(encryptedData);
      const ivBase64 = this.arrayBufferToBase64(iv);
      
      // Create chunk
      const chunk: EncryptedChunk = {
        sessionId,
        keyId: session.keyId,
        iv: ivBase64,
        data: encryptedBase64,
        timestamp: Date.now(),
        sequence: session.metrics.chunkCount + 1,
        format: this.currentConfig.enableCompression ? 'compressed' : 'raw',
        protocol: session.protocol,
        metadata
      };
      
      // Update session metrics
      this.updateSessionMetrics(session, {
        bytesEncrypted: processedData.byteLength,
        processingTime: performance.now() - startTime
      });
      
      return chunk;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.ERROR,
        message: 'Encryption failed',
        details: error instanceof Error ? error.message : String(error),
        retryable: false,
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw error;
    }
  }
  
  /**
   * Decrypt an encrypted chunk
   * @param chunk Encrypted chunk
   */
  public async decrypt(chunk: EncryptedChunk): Promise<ArrayBuffer> {
    // Check if we have the session
    const session = this.sessions.get(chunk.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${chunk.sessionId}`);
    }
    
    const startTime = performance.now();
    
    try {
      // Get the key
      const key = this.encryptionKeys.get(chunk.keyId);
      if (!key) {
        throw new Error(`Decryption key not found: ${chunk.keyId}`);
      }
      
      // Convert Base64 to ArrayBuffer
      const encryptedData = this.base64ToArrayBuffer(chunk.data);
      const iv = this.base64ToArrayBuffer(chunk.iv);
      
      // Decrypt the data
      const decryptedData = await this.decryptData(encryptedData, key, iv);
      
      // Decompress if needed
      const finalData = chunk.format === 'compressed' 
        ? await this.decompressData(decryptedData)
        : decryptedData;
      
      // Update session metrics
      if (session.isActive) {
        this.updateSessionMetrics(session, {
          bytesDecrypted: finalData.byteLength,
          processingTime: performance.now() - startTime
        });
      }
      
      return finalData;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.ERROR,
        message: 'Decryption failed',
        details: error instanceof Error ? error.message : String(error),
        retryable: false,
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw error;
    }
  }
  
  /**
   * Close an encryption session
   * @param sessionId Session ID
   */
  public closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    // Update session status
    session.isActive = false;
    this.sessions.set(sessionId, session);
    
    // Remove from active sessions
    this.activeSessions.delete(sessionId);
    
    // Emit event
    this.emit('session-closed', { sessionId });
    
    return true;
  }
  
  /**
   * Get information about a session
   * @param sessionId Session ID
   */
  public getSessionInfo(sessionId: string): EncryptionSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  /**
   * Get count of active sessions
   */
  public getActiveSessionCount(): number {
    return this.activeSessions.size;
  }
  
  /**
   * Change configuration
   * @param config New configuration (partial)
   */
  public configure(config: Partial<SNEConfig>): void {
    // Update configuration
    this.currentConfig = {
      ...this.currentConfig,
      ...config
    };
    
    // Emit event
    this.emit('config-updated', { config: this.currentConfig });
  }
  
  /**
   * Get current configuration
   */
  public getConfig(): SNEConfig {
    return { ...this.currentConfig };
  }
  
  /**
   * Set up key rotation schedule
   */
  private setupKeyRotation(): void {
    // Set up interval based on configured rotation interval
    setInterval(() => this.rotateKeys(), this.currentConfig.keyRotationInterval);
  }
  
  /**
   * Generate a new encryption key
   */
  private async generateEncryptionKey(): Promise<string> {
    // Generate a unique key ID
    const keyId = `key-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    try {
      // Determine key parameters based on strength setting
      let keyLength = 256; // bits
      
      if (this.currentConfig.strength === EncryptionStrength.LIGHT) {
        keyLength = 128;
      } else if (this.currentConfig.strength === EncryptionStrength.STRONG) {
        keyLength = 256;
      }
      
      // Generate the key
      const key = await crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: keyLength
        },
        true,
        ['encrypt', 'decrypt']
      );
      
      // Store the key
      this.encryptionKeys.set(keyId, key);
      
      return keyId;
    } catch (error) {
      console.error('Error generating encryption key:', error);
      throw error;
    }
  }
  
  /**
   * Rotate keys for all active sessions
   */
  private async rotateKeys(): Promise<void> {
    for (const sessionId of this.activeSessions) {
      try {
        await this.rotateSessionKey(sessionId);
      } catch (error) {
        console.error(`Error rotating key for session ${sessionId}:`, error);
      }
    }
    
    // Emit event
    this.emit('keys-rotated');
  }
  
  /**
   * Rotate key for a specific session
   */
  private async rotateSessionKey(sessionId: string): Promise<void> {
    const session = this.getActiveSession(sessionId);
    
    try {
      // Generate a new key
      const newKeyId = await this.generateEncryptionKey();
      
      // Update session with new key
      const oldKeyId = session.keyId;
      session.keyId = newKeyId;
      session.nextKeyId = undefined;
      session.lastUsed = Date.now();
      
      // Update session
      this.sessions.set(sessionId, session);
      
      // Schedule old key for deletion (give it some time in case it's still being used)
      setTimeout(() => {
        this.encryptionKeys.delete(oldKeyId);
      }, 60000); // 1 minute
      
      // Emit event
      this.emit('key-rotated', { sessionId, newKeyId });
    } catch (error) {
      console.error(`Error rotating key for session ${sessionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Encrypt data using AES-GCM
   */
  private async encryptData(
    data: ArrayBuffer,
    key: CryptoKey,
    iv: Uint8Array
  ): Promise<ArrayBuffer> {
    try {
      return await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        data
      );
    } catch (error) {
      console.error('Encryption error:', error);
      throw error;
    }
  }
  
  /**
   * Decrypt data using AES-GCM
   */
  private async decryptData(
    data: ArrayBuffer,
    key: CryptoKey,
    iv: ArrayBuffer
  ): Promise<ArrayBuffer> {
    try {
      return await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        data
      );
    } catch (error) {
      console.error('Decryption error:', error);
      throw error;
    }
  }
  
  /**
   * Apply basic compression to data (placeholder implementation)
   */
  private async compressData(data: ArrayBuffer): Promise<ArrayBuffer> {
    // In a real implementation, this would use a compression algorithm
    // For now, we just return the original data
    return data;
  }
  
  /**
   * Decompress data (placeholder implementation)
   */
  private async decompressData(data: ArrayBuffer): Promise<ArrayBuffer> {
    // In a real implementation, this would use a decompression algorithm
    // For now, we just return the original data
    return data;
  }
  
  /**
   * Get active session or throw error
   */
  private getActiveSession(sessionId: string): EncryptionSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    if (!session.isActive) {
      throw new Error(`Session is not active: ${sessionId}`);
    }
    
    return session;
  }
  
  /**
   * Update session metrics
   */
  private updateSessionMetrics(
    session: EncryptionSession,
    metrics: {
      bytesEncrypted?: number;
      bytesDecrypted?: number;
      processingTime: number;
    }
  ): void {
    if (metrics.bytesEncrypted) {
      session.metrics.bytesEncrypted += metrics.bytesEncrypted;
    }
    
    if (metrics.bytesDecrypted) {
      session.metrics.bytesDecrypted += metrics.bytesDecrypted;
    }
    
    // Update average processing time
    const oldTotal = session.metrics.avgProcessingTime * session.metrics.chunkCount;
    session.metrics.chunkCount++;
    session.metrics.avgProcessingTime = (oldTotal + metrics.processingTime) / session.metrics.chunkCount;
    
    // Update last used timestamp
    session.lastUsed = Date.now();
    
    // Update session
    this.sessions.set(session.sessionId, session);
  }
  
  /**
   * Convert ArrayBuffer to Base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  /**
   * Convert Base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Export singleton instance
export const sne0_1Service = SNEService.getInstance();
export default sne0_1Service;
