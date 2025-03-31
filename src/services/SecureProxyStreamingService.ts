import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { cryptoSecurityService } from './CryptoSecurityService';
import { sneService } from './SNEService';
import { poeStreamTokenService, TokenType } from './POEStreamCryptoTokenProtocolService';
import { healthMonitoringService, ComponentType, HealthStatus } from './HealthMonitoringService';
import { resourceController, ResourceType, ResourcePriority } from './ResourceControllerService';

/**
 * Stream proxy type
 */
export enum ProxyType {
  DIRECT = 'direct',
  RELAYED = 'relayed',
  TUNNELED = 'tunneled',
  ANONYMIZED = 'anonymized'
}

/**
 * Stream quality level
 */
export enum StreamQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra'
}

/**
 * Stream encryption level
 */
export enum EncryptionLevel {
  STANDARD = 'standard',
  ENHANCED = 'enhanced',
  MAXIMUM = 'maximum',
  QUANTUM = 'quantum'
}

/**
 * Stream proxy configuration
 */
export interface ProxyConfiguration {
  type: ProxyType;
  quality: StreamQuality;
  encryptionLevel: EncryptionLevel;
  enableCache?: boolean;
  bufferSize?: number; // in seconds
  maxBitrate?: number; // in Kbps
  allowP2P?: boolean;
  routingNodes?: number; // Number of nodes in routing chain
}

/**
 * Streaming session
 */
export interface StreamingSession {
  sessionId: string;
  contentId: string;
  userId: string;
  startTime: number;
  lastActivity: number;
  config: ProxyConfiguration;
  status: 'initializing' | 'active' | 'paused' | 'ended' | 'error';
  proxyUrl?: string;
  tokenId?: string;
  metadata?: Record<string, any>;
  metrics: {
    totalBytesTransferred: number;
    averageBitrate: number;
    bufferingEvents: number;
    securityScore: number;
  };
}

/**
 * Secure Proxy Streaming Service
 * Handles secure proxying of streaming content
 */
export class SecureProxyStreamingService extends EventEmitter {
  private static instance: SecureProxyStreamingService;
  private initialized = false;
  private activeSessions = new Map<string, StreamingSession>();
  private proxyNodes = new Map<string, {
    url: string;
    region: string;
    load: number;
    lastHealthCheck: number;
    isHealthy: boolean;
  }>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private readonly DEFAULT_BUFFER_SIZE = 30; // 30 seconds
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  private constructor() {
    super();
    this.setMaxListeners(100);
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): SecureProxyStreamingService {
    if (!SecureProxyStreamingService.instance) {
      SecureProxyStreamingService.instance = new SecureProxyStreamingService();
    }
    return SecureProxyStreamingService.instance;
  }
  
  /**
   * Initialize the secure proxy streaming service
   */
  public async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Register with health monitoring
      await this.registerWithHealthMonitoring();
      
      // Initialize proxy nodes
      await this.initializeProxyNodes();
      
      // Set up session cleanup interval
      this.cleanupInterval = setInterval(() => this.cleanupInactiveSessions(), this.CLEANUP_INTERVAL);
      
      this.initialized = true;
      this.emit('initialized', { serviceName: 'SecureProxyStreamingService' });
      
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.STREAMING,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to initialize Secure Proxy Streaming Service',
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
    if (!healthMonitoringService['initialized']) {
      await healthMonitoringService.initialize();
    }
    
    healthMonitoringService.registerComponent(
      'secure-proxy-streaming',
      ComponentType.STREAMING,
      {
        status: HealthStatus.HEALTHY,
        message: 'Secure Proxy Streaming Service initialized',
        metrics: {
          activeSessions: 0,
          proxyNodes: 0
        }
      }
    );
    
    healthMonitoringService.registerHealthCheck(
      'secure-proxy-streaming',
      async () => {
        const activeNodes = Array.from(this.proxyNodes.values()).filter(node => node.isHealthy).length;
        const totalNodes = this.proxyNodes.size;
        
        let status = HealthStatus.HEALTHY;
        let message = 'Secure Proxy Streaming Service operating normally';
        
        if (activeNodes === 0 && totalNodes > 0) {
          status = HealthStatus.UNHEALTHY;
          message = 'No healthy proxy nodes available';
        } else if (activeNodes < totalNodes * 0.5) {
          status = HealthStatus.DEGRADED;
          message = `Only ${activeNodes}/${totalNodes} proxy nodes are healthy`;
        }
        
        return {
          status,
          message,
          metrics: {
            activeSessions: this.activeSessions.size,
            activeProxyNodes: activeNodes,
            totalProxyNodes: totalNodes
          }
        };
      },
      15 * 60 * 1000 // Check every 15 minutes
    );
  }
  
  /**
   * Initialize proxy nodes
   */
  private async initializeProxyNodes(): Promise<void> {
    // In a production environment, these would be loaded from a database or service registry
    // For this implementation, we'll create sample nodes
    const sampleNodes = [
      {
        id: 'proxy-us-east',
        url: 'https://us-east.proxy.streamingservice.com',
        region: 'us-east',
        load: 0.2,
        isHealthy: true
      },
      {
        id: 'proxy-us-west',
        url: 'https://us-west.proxy.streamingservice.com',
        region: 'us-west',
        load: 0.3,
        isHealthy: true
      },
      {
        id: 'proxy-eu-central',
        url: 'https://eu-central.proxy.streamingservice.com',
        region: 'eu-central',
        load: 0.5,
        isHealthy: true
      },
      {
        id: 'proxy-ap-south',
        url: 'https://ap-south.proxy.streamingservice.com',
        region: 'ap-south',
        load: 0.1,
        isHealthy: true
      }
    ];
    
    const now = Date.now();
    
    for (const node of sampleNodes) {
      this.proxyNodes.set(node.id, {
        url: node.url,
        region: node.region,
        load: node.load,
        lastHealthCheck: now,
        isHealthy: node.isHealthy
      });
    }
  }
  
  /**
   * Create a new streaming session
   * @param contentId ID of content to stream
   * @param userId User ID requesting the stream
   * @param config Proxy configuration
   */
  public async createStreamingSession(
    contentId: string,
    userId: string,
    config: Partial<ProxyConfiguration> = {}
  ): Promise<StreamingSession> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      // Generate session ID
      const sessionId = `stream-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Apply default configuration values
      const fullConfig: ProxyConfiguration = {
        type: config.type || ProxyType.DIRECT,
        quality: config.quality || StreamQuality.MEDIUM,
        encryptionLevel: config.encryptionLevel || EncryptionLevel.STANDARD,
        enableCache: config.enableCache !== undefined ? config.enableCache : true,
        bufferSize: config.bufferSize || this.DEFAULT_BUFFER_SIZE,
        maxBitrate: config.maxBitrate || this.getBitrateForQuality(config.quality || StreamQuality.MEDIUM),
        allowP2P: config.allowP2P !== undefined ? config.allowP2P : false,
        routingNodes: config.routingNodes || this.getDefaultRoutingNodes(config.type || ProxyType.DIRECT)
      };
      
      // Request streaming token for this session
      const tokenPayload = {
        contentId,
        userId,
        sessionId,
        quality: fullConfig.quality,
        encryption: fullConfig.encryptionLevel
      };
      
      const token = await poeStreamTokenService.generateToken(
        TokenType.STREAMING,
        tokenPayload,
        120, // 2 hours
        this.mapEncryptionLevelToSecurityTier(fullConfig.encryptionLevel),
        { proxyType: fullConfig.type }
      );
      
      // Determine the best proxy node for this session
      const proxyNode = await this.selectProxyNode(fullConfig, userId);
      
      if (!proxyNode) {
        throw new Error('No suitable proxy nodes available');
      }
      
      // Allocate resources for streaming
      const resourceAllocation = await this.allocateStreamResources(fullConfig, sessionId);
      
      if (!resourceAllocation.success) {
        throw new Error('Failed to allocate streaming resources');
      }
      
      // Generate proxy URL with security parameters
      const proxyUrl = await this.generateProxyUrl(
        proxyNode.url, 
        contentId, 
        token.id,
        fullConfig
      );
      
      // Create session object
      const now = Date.now();
      const session: StreamingSession = {
        sessionId,
        contentId,
        userId,
        startTime: now,
        lastActivity: now,
        config: fullConfig,
        status: 'initializing',
        proxyUrl,
        tokenId: token.id,
        metadata: {
          proxyNodeId: proxyNode.id,
          resourceAllocations: resourceAllocation.allocations
        },
        metrics: {
          totalBytesTransferred: 0,
          averageBitrate: 0,
          bufferingEvents: 0,
          securityScore: this.calculateSecurityScore(fullConfig)
        }
      };
      
      // Store session
      this.activeSessions.set(sessionId, session);
      
      // Emit session created event
      this.emit('session-created', { 
        sessionId, 
        contentId,
        userId,
        proxyNodeId: proxyNode.id,
        encryptionLevel: fullConfig.encryptionLevel
      });
      
      return session;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.STREAMING,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to create streaming session',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      throw error;
    }
  }
  
  /**
   * Start a streaming session
   * @param sessionId Session ID
   */
  public async startStreamingSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    try {
      // Update session status
      session.status = 'active';
      session.lastActivity = Date.now();
      
      // Apply SNE encryption for the session
      if (session.config.encryptionLevel !== EncryptionLevel.STANDARD) {
        await sneService.enableForStream(sessionId, {
          enhancedEncryption: session.config.encryptionLevel === EncryptionLevel.ENHANCED,
          quantumResistant: session.config.encryptionLevel === EncryptionLevel.QUANTUM,
          keyRotationIntervalMs: this.getKeyRotationInterval(session.config.encryptionLevel)
        });
      }
      
      // Update stored session
      this.activeSessions.set(sessionId, session);
      
      // Emit session started event
      this.emit('session-started', { sessionId });
      
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.STREAMING,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to start streaming session',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }
  
  /**
   * End a streaming session
   * @param sessionId Session ID
   */
  public async endStreamingSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return false;
    }
    
    try {
      // Update session status
      session.status = 'ended';
      session.lastActivity = Date.now();
      
      // Release allocated resources
      const resourceAllocations = session.metadata?.resourceAllocations as string[] | undefined;
      if (resourceAllocations) {
        for (const allocationId of resourceAllocations) {
          await resourceController.releaseResource(allocationId);
        }
      }
      
      // Revoke streaming token
      if (session.tokenId) {
        poeStreamTokenService.revokeToken(session.tokenId, 'Session ended');
      }
      
      // Update stored session
      this.activeSessions.set(sessionId, session);
      
      // Store session metrics for later analysis
      this.storeSessionMetrics(session);
      
      // Emit session ended event
      this.emit('session-ended', {
        sessionId,
        duration: Date.now() - session.startTime,
        bytesTransferred: session.metrics.totalBytesTransferred
      });
      
      // Remove session after a delay
      setTimeout(() => {
        this.activeSessions.delete(sessionId);
      }, 60000); // Keep for 1 minute for metrics reporting
      
      return true;
    } catch (error) {
      console.error('Error ending streaming session:', error);
      return false;
    }
  }
  
  /**
   * Update streaming session activity
   * @param sessionId Session ID
   * @param bytesTransferred Bytes transferred since last update
   * @param currentBitrate Current streaming bitrate
   * @param bufferingEvent Whether a buffering event occurred
   */
  public updateSessionActivity(
    sessionId: string,
    bytesTransferred: number = 0,
    currentBitrate?: number,
    bufferingEvent: boolean = false
  ): boolean {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || session.status !== 'active') {
      return false;
    }
    
    try {
      // Update session activity
      session.lastActivity = Date.now();
      
      // Update metrics
      session.metrics.totalBytesTransferred += bytesTransferred;
      
      if (currentBitrate) {
        // Update average bitrate using rolling average
        const currentAverage = session.metrics.averageBitrate;
        const newAverage = currentAverage === 0
          ? currentBitrate
          : (currentAverage * 0.7) + (currentBitrate * 0.3);
        
        session.metrics.averageBitrate = newAverage;
      }
      
      if (bufferingEvent) {
        session.metrics.bufferingEvents++;
      }
      
      // Update stored session
      this.activeSessions.set(sessionId, session);
      
      return true;
    } catch (error) {
      console.error('Error updating session activity:', error);
      return false;
    }
  }
  
  /**
   * Pause a streaming session
   * @param sessionId Session ID
   */
  public pauseStreamingSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || session.status !== 'active') {
      return false;
    }
    
    try {
      // Update session status
      session.status = 'paused';
      session.lastActivity = Date.now();
      
      // Update stored session
      this.activeSessions.set(sessionId, session);
      
      // Emit session paused event
      this.emit('session-paused', { sessionId });
      
      return true;
    } catch (error) {
      console.error('Error pausing streaming session:', error);
      return false;
    }
  }
  
  /**
   * Resume a paused streaming session
   * @param sessionId Session ID
   */
  public resumeStreamingSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || session.status !== 'paused') {
      return false;
    }
    
    try {
      // Update session status
      session.status = 'active';
      session.lastActivity = Date.now();
      
      // Update stored session
      this.activeSessions.set(sessionId, session);
      
      // Emit session resumed event
      this.emit('session-resumed', { sessionId });
      
      return true;
    } catch (error) {
      console.error('Error resuming streaming session:', error);
      return false;
    }
  }
  
  /**
   * Get streaming session information
   * @param sessionId Session ID
   */
  public getSessionInfo(sessionId: string): StreamingSession | null {
    return this.activeSessions.get(sessionId) || null;
  }
  
  /**
   * Get all active streaming sessions for a user
   * @param userId User ID
   */
  public getUserSessions(userId: string): StreamingSession[] {
    return Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId && session.status !== 'ended');
  }
  
  /**
   * Clean up inactive sessions
   */
  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      // Check if session has been inactive too long
      if (now - session.lastActivity > this.SESSION_TIMEOUT && session.status !== 'ended') {
        expiredSessions.push(sessionId);
      }
    }
    
    // End expired sessions
    for (const sessionId of expiredSessions) {
      this.endStreamingSession(sessionId).catch(error => {
        console.error(`Error ending expired session ${sessionId}:`, error);
      });
    }
    
    if (expiredSessions.length > 0) {
      this.emit('sessions-cleaned', { count: expiredSessions.length });
    }
  }
  
  /**
   * Select the best proxy node for a session
   * @param config Proxy configuration
   * @param userId User ID for geographical selection
   */
  private async selectProxyNode(
    config: ProxyConfiguration,
    userId: string
  ): Promise<{ id: string; url: string } | null> {
    // Filter for healthy nodes
    const healthyNodes = Array.from(this.proxyNodes.entries())
      .filter(([_, node]) => node.isHealthy)
      .map(([id, node]) => ({ id, ...node }));
    
    if (healthyNodes.length === 0) {
      return null;
    }
    
    // For anonymized streams, select multiple nodes
    if (config.type === ProxyType.ANONYMIZED && config.routingNodes && config.routingNodes > 1) {
      // In a real implementation, we would create a chain of proxy nodes
      // For this implementation, we'll just select the lowest-load node
      const bestNode = healthyNodes.reduce((best, current) => 
        current.load < best.load ? current : best
      );
      
      return {
        id: bestNode.id,
        url: bestNode.url
      };
    }
    
    // For other stream types, select based on load and region
    // In a real implementation, this would use geographic data
    // For this implementation, just choose lowest-load node
    const bestNode = healthyNodes.reduce((best, current) => 
      current.load < best.load ? current : best
    );
    
    return {
      id: bestNode.id,
      url: bestNode.url
    };
  }
  
  /**
   * Allocate resources for streaming
   * @param config Streaming configuration
   * @param sessionId Session ID
   */
  private async allocateStreamResources(
    config: ProxyConfiguration,
    sessionId: string
  ): Promise<{ success: boolean; allocations: string[] }> {
    try {
      const allocations: string[] = [];
      
      // Calculate required bandwidth
      const requiredBandwidthMbps = (config.maxBitrate || 0) / 1000; // Convert Kbps to Mbps
      
      // Determine resource priority based on encryption level
      const priority = this.mapEncryptionLevelToResourcePriority(config.encryptionLevel);
      
      // Allocate bandwidth resources
      if (requiredBandwidthMbps > 0) {
        const bandwidthAllocation = await resourceController.requestResource({
          resourceType: ResourceType.BANDWIDTH,
          amount: requiredBandwidthMbps,
          priority,
          allocatedTo: `stream-${sessionId}`,
          expiresAt: Date.now() + (4 * 60 * 60 * 1000) // 4 hour max
        });
        
        if (bandwidthAllocation.granted > 0) {
          allocations.push(bandwidthAllocation.requestId);
        }
      }
      
      // Allocate compute resources based on encryption level
      const computeUnits = this.getComputeUnitsForEncryption(config.encryptionLevel);
      
      if (computeUnits > 0) {
        const computeAllocation = await resourceController.requestResource({
          resourceType: ResourceType.COMPUTE,
          amount: computeUnits,
          priority,
          allocatedTo: `stream-${sessionId}`,
          expiresAt: Date.now() + (4 * 60 * 60 * 1000) // 4 hour max
        });
        
        if (computeAllocation.granted > 0) {
          allocations.push(computeAllocation.requestId);
        }
      }
      
      return {
        success: allocations.length >= 1,
        allocations
      };
    } catch (error) {
      console.error('Error allocating stream resources:', error);
      return {
        success: false,
        allocations: []
      };
    }
  }
  
  /**
   * Generate proxy URL with security parameters
   * @param baseUrl Base proxy URL
   * @param contentId Content ID
   * @param tokenId Token ID
   * @param config Proxy configuration
   */
  private async generateProxyUrl(
    baseUrl: string,
    contentId: string,
    tokenId: string,
    config: ProxyConfiguration
  ): Promise<string> {
    // Generate a timestamped signature for the URL
    const timestamp = Math.floor(Date.now() / 1000);
    const signatureData = `${contentId}:${tokenId}:${timestamp}`;
    const signature = await cryptoSecurityService.generateHMAC(signatureData, 'sps-hmac-key');
    
    // Build proxy URL with parameters
    const url = new URL(baseUrl);
    url.pathname = `/stream/${encodeURIComponent(contentId)}`;
    url.searchParams.append('token', tokenId);
    url.searchParams.append('quality', config.quality);
    url.searchParams.append('enc', config.encryptionLevel);
    url.searchParams.append('ts', timestamp.toString());
    url.searchParams.append('sig', signature);
    
    if (config.bufferSize) {
      url.searchParams.append('buffer', config.bufferSize.toString());
    }
    
    if (config.maxBitrate) {
      url.searchParams.append('maxbr', config.maxBitrate.toString());
    }
    
    if (config.enableCache !== undefined) {
      url.searchParams.append('cache', config.enableCache ? '1' : '0');
    }
    
    return url.toString();
  }
  
  /**
   * Calculate security score for a configuration
   * @param config Proxy configuration
   */
  private calculateSecurityScore(config: ProxyConfiguration): number {
    let score = 0;
    
    // Base score based on encryption level
    switch (config.encryptionLevel) {
      case EncryptionLevel.QUANTUM:
        score += 40;
        break;
      case EncryptionLevel.MAXIMUM:
        score += 30;
        break;
      case EncryptionLevel.ENHANCED:
        score += 20;
        break;
      case EncryptionLevel.STANDARD:
        score += 10;
        break;
    }
    
    // Additional score based on proxy type
    switch (config.type) {
      case ProxyType.ANONYMIZED:
        score += 30;
        break;
      case ProxyType.TUNNELED:
        score += 20;
        break;
      case ProxyType.RELAYED:
        score += 10;
        break;
      case ProxyType.DIRECT:
        score += 5;
        break;
    }
    
    // Adjust for routing nodes
    if (config.routingNodes && config.routingNodes > 1) {
      score += Math.min(20, config.routingNodes * 5);
    }
    
    // Penalty for P2P (less secure)
    if (config.allowP2P) {
      score -= 10;
    }
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Store session metrics for analytics
   * @param session Streaming session
   */
  private storeSessionMetrics(session: StreamingSession): void {
    // In a real implementation, this would save metrics to a database
    // For this implementation, just log them
    console.log('Session metrics:', {
      sessionId: session.sessionId,
      contentId: session.contentId,
      userId: session.userId,
      duration: Date.now() - session.startTime,
      bytesTransferred: session.metrics.totalBytesTransferred,
      averageBitrate: session.metrics.averageBitrate,
      bufferingEvents: session.metrics.bufferingEvents,
      securityScore: session.metrics.securityScore,
      encryptionLevel: session.config.encryptionLevel,
      proxyType: session.config.type
    });
  }
  
  /**
   * Map encryption level to security tier
   * @param level Encryption level
   */
  private mapEncryptionLevelToSecurityTier(level: EncryptionLevel): any {
    // This would map to the POEStreamCryptoTokenProtocolService.SecurityTier enum
    switch (level) {
      case EncryptionLevel.QUANTUM:
        return 'admin'; // Highest security tier
      case EncryptionLevel.MAXIMUM:
        return 'financial'; // High security tier
      case EncryptionLevel.ENHANCED:
        return 'premium'; // Medium security tier
      default:
        return 'standard'; // Basic security tier
    }
  }
  
  /**
   * Map encryption level to resource priority
   * @param level Encryption level
   */
  private mapEncryptionLevelToResourcePriority(level: EncryptionLevel): ResourcePriority {
    switch (level) {
      case EncryptionLevel.QUANTUM:
        return ResourcePriority.CRITICAL;
      case EncryptionLevel.MAXIMUM:
        return ResourcePriority.HIGH;
      case EncryptionLevel.ENHANCED:
        return ResourcePriority.MEDIUM;
      default:
        return ResourcePriority.LOW;
    }
  }
  
  /**
   * Get bitrate for quality level
   * @param quality Stream quality
   */
  private getBitrateForQuality(quality: StreamQuality): number {
    switch (quality) {
      case StreamQuality.ULTRA:
        return 12000; // 12 Mbps
      case StreamQuality.HIGH:
        return 6000;  // 6 Mbps
      case StreamQuality.MEDIUM:
        return 2500;  // 2.5 Mbps
      case StreamQuality.LOW:
        return 1000;  // 1 Mbps
      default:
        return 2500;  // Default to medium
    }
  }
  
  /**
   * Get compute units needed for encryption level
   * @param level Encryption level
   */
  private getComputeUnitsForEncryption(level: EncryptionLevel): number {
    switch (level) {
      case EncryptionLevel.QUANTUM:
        return 10;
      case EncryptionLevel.MAXIMUM:
        return 6;
      case EncryptionLevel.ENHANCED:
        return 3;
      case EncryptionLevel.STANDARD:
        return 1;
      default:
        return 1;
    }
  }
  
  /**
   * Get key rotation interval for encryption level
   * @param level Encryption level
   */
  private getKeyRotationInterval(level: EncryptionLevel): number {
    switch (level) {
      case EncryptionLevel.QUANTUM:
        return 30 * 1000; // 30 seconds
      case EncryptionLevel.MAXIMUM:
        return 60 * 1000; // 1 minute
      case EncryptionLevel.ENHANCED:
        return 5 * 60 * 1000; // 5 minutes
      default:
        return 15 * 60 * 1000; // 15 minutes
    }
  }
  
  /**
   * Get default number of routing nodes based on proxy type
   * @param type Proxy type
   */
  private getDefaultRoutingNodes(type: ProxyType): number {
    switch (type) {
      case ProxyType.ANONYMIZED:
        return 3;
      case ProxyType.TUNNELED:
        return 2;
      case ProxyType.RELAYED:
        return 1;
      case ProxyType.DIRECT:
        return 0;
      default:
        return 0;
    }
  }
}

// Export singleton instance
export const secureProxyStreamingService = SecureProxyStreamingService.getInstance();
export default secureProxyStreamingService;
