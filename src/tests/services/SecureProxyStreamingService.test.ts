import { secureProxyStreamingService, SecureProxyStreamingService } from '../../services/SecureProxyStreamingService';
import { ioErrorService } from '../../services/IOErrorService';
import { cryptoSecurityService } from '../../services/CryptoSecurityService';
import { sneService } from '../../services/SNEService';
import { poeStreamTokenService } from '../../services/POEStreamCryptoTokenProtocolService';
import { healthMonitoringService } from '../../services/HealthMonitoringService';
import { resourceController } from '../../services/ResourceControllerService';
import { ProxyType, StreamQuality, EncryptionLevel } from '../../services/SecureProxyStreamingService';

// Mock all dependencies
jest.mock('../../services/IOErrorService', () => ({
  ioErrorService: {
    reportError: jest.fn()
  }
}));

jest.mock('../../services/CryptoSecurityService', () => ({
  cryptoSecurityService: {
    generateRandomString: jest.fn().mockReturnValue('mock-random-string'),
    generateHMAC: jest.fn().mockResolvedValue('mock-signature')
  }
}));

jest.mock('../../services/SNEService', () => ({
  sneService: {
    enableForStream: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('../../services/POEStreamCryptoTokenProtocolService', () => ({
  poeStreamTokenService: {
    generateToken: jest.fn().mockResolvedValue({
      id: 'mock-token-id',
      type: 'streaming'
    }),
    revokeToken: jest.fn().mockReturnValue(true)
  },
  TokenType: {
    STREAMING: 'streaming'
  }
}));

jest.mock('../../services/HealthMonitoringService', () => ({
  healthMonitoringService: {
    registerComponent: jest.fn(),
    registerHealthCheck: jest.fn(),
    initialized: true,
    ComponentType: {
      STREAMING: 'streaming'
    },
    HealthStatus: {
      HEALTHY: 'healthy'
    }
  }
}));

jest.mock('../../services/ResourceControllerService', () => ({
  resourceController: {
    requestResource: jest.fn().mockResolvedValue({
      granted: 1,
      requestId: 'mock-resource-request-id'
    }),
    releaseResource: jest.fn().mockResolvedValue(true)
  },
  ResourceType: {
    BANDWIDTH: 'bandwidth',
    COMPUTE: 'compute'
  },
  ResourcePriority: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  }
}));

describe('SecureProxyStreamingService', () => {
  // Setup and teardown
  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Force re-initialization of service
    Object.defineProperty(secureProxyStreamingService, 'initialized', {
      value: false,
      writable: true
    });
    
    // Reset active sessions map
    Object.defineProperty(secureProxyStreamingService, 'activeSessions', {
      value: new Map(),
      writable: true
    });
    
    // Reset proxy nodes map
    Object.defineProperty(secureProxyStreamingService, 'proxyNodes', {
      value: new Map(),
      writable: true
    });
    
    // Initialize service before each test
    await secureProxyStreamingService.initialize();
    
    // Add test proxy node
    const proxyNodesMap = new Map([
      ['test-proxy', {
        url: 'https://test.proxy.com',
        region: 'test-region',
        load: 0.5,
        lastHealthCheck: Date.now(),
        isHealthy: true
      }]
    ]);
    
    Object.defineProperty(secureProxyStreamingService, 'proxyNodes', {
      value: proxyNodesMap,
      writable: true
    });
  });
  
  afterEach(() => {
    // Cleanup after each test
    jest.restoreAllMocks();
  });

  // Tests
  describe('initialization', () => {
    it('should register with health monitoring service', async () => {
      expect(healthMonitoringService.registerComponent).toHaveBeenCalledWith(
        'secure-proxy-streaming',
        healthMonitoringService.ComponentType.STREAMING,
        expect.any(Object)
      );
      expect(healthMonitoringService.registerHealthCheck).toHaveBeenCalledWith(
        'secure-proxy-streaming',
        expect.any(Function),
        15 * 60 * 1000
      );
    });
    
    it('should be a singleton', () => {
      const instance1 = SecureProxyStreamingService.getInstance();
      const instance2 = SecureProxyStreamingService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
  
  describe('createStreamingSession', () => {
    it('should create a streaming session with default configuration', async () => {
      // Act
      const session = await secureProxyStreamingService.createStreamingSession(
        'test-content-123',
        'test-user-456'
      );
      
      // Assert
      expect(session).toBeDefined();
      expect(session.sessionId).toMatch(/^stream-/);
      expect(session.contentId).toBe('test-content-123');
      expect(session.userId).toBe('test-user-456');
      expect(session.status).toBe('initializing');
      expect(session.config.quality).toBe(StreamQuality.MEDIUM);
      expect(session.config.encryptionLevel).toBe(EncryptionLevel.STANDARD);
      expect(session.proxyUrl).toBeDefined();
      expect(session.tokenId).toBe('mock-token-id');
      expect(session.metadata).toBeDefined();
      expect(poeStreamTokenService.generateToken).toHaveBeenCalled();
      expect(resourceController.requestResource).toHaveBeenCalledTimes(2); // Bandwidth and Compute
    });
    
    it('should create a streaming session with custom configuration', async () => {
      // Act
      const session = await secureProxyStreamingService.createStreamingSession(
        'test-content-123',
        'test-user-456',
        {
          type: ProxyType.ANONYMIZED,
          quality: StreamQuality.ULTRA,
          encryptionLevel: EncryptionLevel.QUANTUM,
          bufferSize: 60,
          maxBitrate: 20000
        }
      );
      
      // Assert
      expect(session).toBeDefined();
      expect(session.config.type).toBe(ProxyType.ANONYMIZED);
      expect(session.config.quality).toBe(StreamQuality.ULTRA);
      expect(session.config.encryptionLevel).toBe(EncryptionLevel.QUANTUM);
      expect(session.config.bufferSize).toBe(60);
      expect(session.config.maxBitrate).toBe(20000);
      expect(poeStreamTokenService.generateToken).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'admin', // Highest security tier for quantum encryption
        expect.anything()
      );
      expect(resourceController.requestResource).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'critical' // Critical priority for quantum encryption
        })
      );
    });
    
    it('should handle errors during session creation', async () => {
      // Arrange
      poeStreamTokenService.generateToken.mockRejectedValueOnce(new Error('Token service error'));
      
      // Act and Assert
      await expect(
        secureProxyStreamingService.createStreamingSession('test-content', 'test-user')
      ).rejects.toThrow();
      expect(ioErrorService.reportError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to create streaming session',
          retryable: true
        })
      );
    });
  });
  
  describe('startStreamingSession', () => {
    it('should start a streaming session', async () => {
      // Arrange
      const mockSession = {
        sessionId: 'test-session-id',
        contentId: 'test-content-id',
        userId: 'test-user-id',
        startTime: Date.now(),
        lastActivity: Date.now(),
        config: {
          encryptionLevel: EncryptionLevel.ENHANCED
        },
        status: 'initializing',
        metrics: {
          totalBytesTransferred: 0,
          averageBitrate: 0,
          bufferingEvents: 0,
          securityScore: 85
        }
      };
      
      const sessionsMap = new Map([
        ['test-session-id', mockSession]
      ]);
      
      Object.defineProperty(secureProxyStreamingService, 'activeSessions', {
        value: sessionsMap,
        writable: true
      });
      
      // Act
      const result = await secureProxyStreamingService.startStreamingSession('test-session-id');
      
      // Assert
      expect(result).toBe(true);
      expect(sneService.enableForStream).toHaveBeenCalled();
      expect(secureProxyStreamingService.getSessionInfo('test-session-id')?.status).toBe('active');
    });
    
    it('should throw error for non-existent session', async () => {
      await expect(
        secureProxyStreamingService.startStreamingSession('non-existent-session')
      ).rejects.toThrow('Session not found');
    });
  });
  
  describe('endStreamingSession', () => {
    it('should end a streaming session and release resources', async () => {
      // Arrange
      const mockSession = {
        sessionId: 'test-session-id',
        contentId: 'test-content-id',
        userId: 'test-user-id',
        startTime: Date.now() - 3600000, // Started 1 hour ago
        lastActivity: Date.now() - 60000, // Last active 1 minute ago
        config: {
          encryptionLevel: EncryptionLevel.STANDARD
        },
        status: 'active',
        tokenId: 'test-token-id',
        metadata: {
          resourceAllocations: ['resource-1', 'resource-2']
        },
        metrics: {
          totalBytesTransferred: 1024000,
          averageBitrate: 2000,
          bufferingEvents: 2,
          securityScore: 70
        }
      };
      
      const sessionsMap = new Map([
        ['test-session-id', mockSession]
      ]);
      
      Object.defineProperty(secureProxyStreamingService, 'activeSessions', {
        value: sessionsMap,
        writable: true
      });
      
      // Act
      const result = await secureProxyStreamingService.endStreamingSession('test-session-id');
      
      // Assert
      expect(result).toBe(true);
      expect(resourceController.releaseResource).toHaveBeenCalledTimes(2);
      expect(poeStreamTokenService.revokeToken).toHaveBeenCalledWith('test-token-id', 'Session ended');
      expect(secureProxyStreamingService.getSessionInfo('test-session-id')?.status).toBe('ended');
    });
    
    it('should return false for non-existent session', async () => {
      const result = await secureProxyStreamingService.endStreamingSession('non-existent-session');
      expect(result).toBe(false);
    });
  });
  
  describe('updateSessionActivity', () => {
    it('should update session activity with bytes transferred', () => {
      // Arrange
      const mockSession = {
        sessionId: 'test-session-id',
        contentId: 'test-content-id',
        userId: 'test-user-id',
        startTime: Date.now() - 3600000,
        lastActivity: Date.now() - 60000,
        config: {},
        status: 'active',
        metrics: {
          totalBytesTransferred: 1000,
          averageBitrate: 2000,
          bufferingEvents: 0,
          securityScore: 70
        }
      };
      
      const sessionsMap = new Map([
        ['test-session-id', mockSession]
      ]);
      
      Object.defineProperty(secureProxyStreamingService, 'activeSessions', {
        value: sessionsMap,
        writable: true
      });
      
      // Act
      const result = secureProxyStreamingService.updateSessionActivity(
        'test-session-id', 
        5000, // 5KB transferred
        3000, // 3Mbps bitrate
        true // Buffering occurred
      );
      
      // Assert
      expect(result).toBe(true);
      
      const updatedSession = secureProxyStreamingService.getSessionInfo('test-session-id');
      expect(updatedSession?.metrics.totalBytesTransferred).toBe(6000); // 1000 + 5000
      expect(updatedSession?.metrics.bufferingEvents).toBe(1);
      expect(updatedSession?.metrics.averageBitrate).toBeCloseTo(2300, 0); // Weighted average
      expect(updatedSession?.lastActivity).toBeGreaterThan(mockSession.lastActivity);
    });
  });
  
  describe('getUserSessions', () => {
    it('should return all active sessions for a user', () => {
      // Arrange
      const mockSessions = [
        {
          sessionId: 'session-1',
          contentId: 'content-1',
          userId: 'user-123',
          status: 'active',
          startTime: Date.now(),
          lastActivity: Date.now(),
          config: {},
          metrics: { totalBytesTransferred: 0, averageBitrate: 0, bufferingEvents: 0, securityScore: 0 }
        },
        {
          sessionId: 'session-2',
          contentId: 'content-2',
          userId: 'user-123',
          status: 'paused',
          startTime: Date.now(),
          lastActivity: Date.now(),
          config: {},
          metrics: { totalBytesTransferred: 0, averageBitrate: 0, bufferingEvents: 0, securityScore: 0 }
        },
        {
          sessionId: 'session-3',
          contentId: 'content-3',
          userId: 'user-456',
          status: 'active',
          startTime: Date.now(),
          lastActivity: Date.now(),
          config: {},
          metrics: { totalBytesTransferred: 0, averageBitrate: 0, bufferingEvents: 0, securityScore: 0 }
        }
      ];
      
      const sessionsMap = new Map([
        ['session-1', mockSessions[0]],
        ['session-2', mockSessions[1]],
        ['session-3', mockSessions[2]]
      ]);
      
      Object.defineProperty(secureProxyStreamingService, 'activeSessions', {
        value: sessionsMap,
        writable: true
      });
      
      // Act
      const userSessions = secureProxyStreamingService.getUserSessions('user-123');
      
      // Assert
      expect(userSessions.length).toBe(2);
      expect(userSessions[0].sessionId).toBe('session-1');
      expect(userSessions[1].sessionId).toBe('session-2');
    });
  });

  describe('security and quality mappings', () => {
    it('should map encryption level to appropriate security tier', async () => {
      // First create a session with quantum encryption
      await secureProxyStreamingService.createStreamingSession(
        'content-1', 'user-1', { encryptionLevel: EncryptionLevel.QUANTUM }
      );
      
      // Then create a session with standard encryption
      await secureProxyStreamingService.createStreamingSession(
        'content-2', 'user-1', { encryptionLevel: EncryptionLevel.STANDARD }
      );
      
      // Check that they were mapped to appropriate security tiers
      expect(poeStreamTokenService.generateToken).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'admin', // Quantum should map to admin tier
        expect.anything()
      );
      
      expect(poeStreamTokenService.generateToken).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'standard', // Standard should map to standard tier
        expect.anything()
      );
    });
    
    it('should calculate security score based on configuration', async () => {
      // Create a session with high security settings
      const highSecSession = await secureProxyStreamingService.createStreamingSession(
        'content-high', 'user-1', {
          encryptionLevel: EncryptionLevel.MAXIMUM,
          type: ProxyType.ANONYMIZED,
          routingNodes: 3
        }
      );
      
      // Create a session with low security settings
      const lowSecSession = await secureProxyStreamingService.createStreamingSession(
        'content-low', 'user-1', {
          encryptionLevel: EncryptionLevel.STANDARD,
          type: ProxyType.DIRECT,
          allowP2P: true
        }
      );
      
      // Verify security scores are calculated correctly
      expect(highSecSession.metrics.securityScore).toBeGreaterThan(60); // High security score
      expect(lowSecSession.metrics.securityScore).toBeLessThan(30); // Low security score
    });
  });
});
