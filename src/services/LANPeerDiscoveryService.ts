import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { cryptoSecurityService } from './CryptoSecurityService';
import { healthMonitoringService, ComponentType, HealthStatus } from './HealthMonitoringService';

/**
 * Discovered peer information
 */
export interface PeerDevice {
  id: string;
  name: string;
  type: PeerDeviceType;
  ipAddress: string;
  port: number;
  services: string[];
  lastSeen: number;
  capabilities: {
    canStream: boolean;
    canReceive: boolean;
    supportsEncryption: boolean;
    maxBitrate?: number;
    protocols: string[];
  };
  metadata?: Record<string, any>;
}

/**
 * Peer device type
 */
export enum PeerDeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TV = 'tv',
  SPEAKER = 'speaker',
  UNKNOWN = 'unknown'
}

/**
 * Discovery mode options
 */
export enum DiscoveryMode {
  PASSIVE = 'passive',      // Only listen for broadcasts
  ACTIVE = 'active',        // Actively scan and broadcast
  STEALTH = 'stealth'       // Hidden mode, only connect to known peers
}

/**
 * LAN Peer Discovery Service
 * Provides discovery and connection management for local network peers
 */
export class LANPeerDiscoveryService extends EventEmitter {
  private static instance: LANPeerDiscoveryService;
  private initialized: boolean = false;
  private discoveredPeers = new Map<string, PeerDevice>();
  private connectedPeers = new Set<string>();
  private myDeviceInfo: Partial<PeerDevice> = {};
  private discoveryMode: DiscoveryMode = DiscoveryMode.PASSIVE;
  private discoveryInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  private readonly DISCOVERY_INTERVAL_MS = 30000; // 30 seconds
  private readonly HEARTBEAT_INTERVAL_MS = 10000; // 10 seconds
  private readonly PEER_TIMEOUT_MS = 90000; // 90 seconds
  
  private constructor() {
    super();
    this.setMaxListeners(50);
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): LANPeerDiscoveryService {
    if (!LANPeerDiscoveryService.instance) {
      LANPeerDiscoveryService.instance = new LANPeerDiscoveryService();
    }
    return LANPeerDiscoveryService.instance;
  }
  
  /**
   * Initialize the LAN peer discovery service
   * @param deviceInfo Information about this device
   * @param mode Discovery mode
   */
  public async initialize(
    deviceInfo?: Partial<PeerDevice>,
    mode: DiscoveryMode = DiscoveryMode.PASSIVE
  ): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Register with health monitoring
      await this.registerWithHealthMonitoring();
      
      // Set discovery mode
      this.discoveryMode = mode;
      
      // Generate device ID if not provided
      const deviceId = deviceInfo?.id || 
        `device-${cryptoSecurityService.generateRandomString({ length: 8 })}`;
      
      // Set up device info
      this.myDeviceInfo = {
        id: deviceId,
        name: deviceInfo?.name || 'Web3 Streaming Device',
        type: deviceInfo?.type || PeerDeviceType.DESKTOP,
        ipAddress: deviceInfo?.ipAddress || this.getLocalIPAddress(),
        port: deviceInfo?.port || 8008,
        services: deviceInfo?.services || ['streaming'],
        capabilities: deviceInfo?.capabilities || {
          canStream: true,
          canReceive: true,
          supportsEncryption: true,
          protocols: ['sne', 'rtmp', 'hls']
        }
      };
      
      // Start discovery process
      if (this.discoveryMode !== DiscoveryMode.STEALTH) {
        this.startDiscovery();
      }
      
      // Start heartbeat for connected peers
      this.startHeartbeat();
      
      this.initialized = true;
      this.emit('initialized', {
        deviceId,
        discoveryMode: mode
      });
      
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SYSTEM,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to initialize LAN Peer Discovery Service',
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
      'lan-peer-discovery',
      ComponentType.STREAMING,
      {
        status: HealthStatus.HEALTHY,
        message: 'LAN Peer Discovery initialized',
        metrics: {
          discoveredPeers: 0,
          connectedPeers: 0
        }
      }
    );
    
    healthMonitoringService.registerHealthCheck(
      'lan-peer-discovery',
      async () => {
        return {
          status: HealthStatus.HEALTHY,
          message: `Monitoring ${this.discoveredPeers.size} peers, ${this.connectedPeers.size} connected`,
          metrics: {
            discoveredPeers: this.discoveredPeers.size,
            connectedPeers: this.connectedPeers.size,
            discoveryMode: this.discoveryMode
          }
        };
      },
      30 * 60 * 1000 // Check every 30 minutes
    );
  }
  
  /**
   * Start peer discovery process
   */
  private startDiscovery(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    
    // Immediately perform discovery
    this.performDiscovery();
    
    // Set up interval for periodic discovery
    this.discoveryInterval = setInterval(() => {
      this.performDiscovery();
    }, this.DISCOVERY_INTERVAL_MS);
  }
  
  /**
   * Start heartbeat for connected peers
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Set up interval for heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
      this.cleanupStaleDevices();
    }, this.HEARTBEAT_INTERVAL_MS);
  }
  
  /**
   * Perform discovery of peers on LAN
   */
  private performDiscovery(): void {
    try {
      // In a real implementation, this would use mDNS, UPnP, or other discovery protocols
      // For this implementation, we'll simulate finding peers
      
      if (this.discoveryMode === DiscoveryMode.ACTIVE) {
        this.simulateDeviceDiscovery();
      }
      
    } catch (error) {
      console.error('Error performing peer discovery:', error);
    }
  }
  
  /**
   * Send heartbeat to connected peers
   */
  private sendHeartbeat(): void {
    try {
      // In a real implementation, this would send UDP heartbeats to connected peers
      // For this implementation, we'll just update timestamps for connected peers
      
      for (const peerId of this.connectedPeers) {
        const peer = this.discoveredPeers.get(peerId);
        if (peer) {
          peer.lastSeen = Date.now();
          this.discoveredPeers.set(peerId, peer);
        }
      }
      
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  }
  
  /**
   * Clean up stale/disconnected devices
   */
  private cleanupStaleDevices(): void {
    const now = Date.now();
    const staleIds: string[] = [];
    
    for (const [peerId, peer] of this.discoveredPeers.entries()) {
      if (now - peer.lastSeen > this.PEER_TIMEOUT_MS) {
        staleIds.push(peerId);
      }
    }
    
    for (const peerId of staleIds) {
      this.discoveredPeers.delete(peerId);
      this.connectedPeers.delete(peerId);
      
      // Emit disconnect event
      this.emit('peer-disconnected', { peerId });
    }
    
    if (staleIds.length > 0) {
      this.emit('peers-cleanup', { count: staleIds.length });
    }
  }
  
  /**
   * Connect to a discovered peer
   * @param peerId ID of peer to connect to
   */
  public async connectToPeer(peerId: string): Promise<boolean> {
    const peer = this.discoveredPeers.get(peerId);
    
    if (!peer) {
      return false;
    }
    
    try {
      // In a real implementation, this would establish a network connection
      // For this implementation, we'll simulate the connection
      
      // Add to connected peers
      this.connectedPeers.add(peerId);
      
      // Update last seen timestamp
      peer.lastSeen = Date.now();
      this.discoveredPeers.set(peerId, peer);
      
      // Emit connection event
      this.emit('peer-connected', { peer });
      
      return true;
    } catch (error) {
      console.error('Error connecting to peer:', error);
      return false;
    }
  }
  
  /**
   * Disconnect from a connected peer
   * @param peerId ID of peer to disconnect from
   */
  public disconnectFromPeer(peerId: string): boolean {
    if (!this.connectedPeers.has(peerId)) {
      return false;
    }
    
    try {
      // In a real implementation, this would close the network connection
      // For this implementation, we'll just update the state
      
      // Remove from connected peers
      this.connectedPeers.delete(peerId);
      
      // Emit disconnect event
      this.emit('peer-disconnected', { peerId });
      
      return true;
    } catch (error) {
      console.error('Error disconnecting from peer:', error);
      return false;
    }
  }
  
  /**
   * Get all discovered peers
   */
  public getDiscoveredPeers(): PeerDevice[] {
    return Array.from(this.discoveredPeers.values());
  }
  
  /**
   * Get all connected peers
   */
  public getConnectedPeers(): PeerDevice[] {
    return Array.from(this.discoveredPeers.values())
      .filter(peer => this.connectedPeers.has(peer.id));
  }
  
  /**
   * Get information about a specific peer
   * @param peerId Peer ID
   */
  public getPeer(peerId: string): PeerDevice | null {
    return this.discoveredPeers.get(peerId) || null;
  }
  
  /**
   * Check if a peer is connected
   * @param peerId Peer ID
   */
  public isPeerConnected(peerId: string): boolean {
    return this.connectedPeers.has(peerId);
  }
  
  /**
   * Set discovery mode
   * @param mode Discovery mode
   */
  public setDiscoveryMode(mode: DiscoveryMode): void {
    this.discoveryMode = mode;
    
    // Update discovery process based on new mode
    if (mode === DiscoveryMode.STEALTH) {
      if (this.discoveryInterval) {
        clearInterval(this.discoveryInterval);
        this.discoveryInterval = null;
      }
    } else if (!this.discoveryInterval) {
      this.startDiscovery();
    }
    
    // Emit mode change event
    this.emit('discovery-mode-changed', { mode });
  }
  
  /**
   * Get local IP address
   */
  private getLocalIPAddress(): string {
    // In a real implementation, this would determine the local IP address
    // For this implementation, return a placeholder
    return '192.168.1.100';
  }
  
  /**
   * Update device information
   * @param deviceInfo Updated device information
   */
  public updateDeviceInfo(deviceInfo: Partial<PeerDevice>): void {
    this.myDeviceInfo = {
      ...this.myDeviceInfo,
      ...deviceInfo,
      id: this.myDeviceInfo.id // Keep the original ID
    };
    
    // Emit update event
    this.emit('device-info-updated', { deviceInfo: this.myDeviceInfo });
  }
  
  /**
   * Get this device's information
   */
  public getDeviceInfo(): Partial<PeerDevice> {
    return this.myDeviceInfo;
  }
  
  /**
   * Discover a specific peer by IP address and port
   * @param ipAddress IP address
   * @param port Port number
   */
  public async discoverSpecificPeer(ipAddress: string, port: number): Promise<PeerDevice | null> {
    try {
      // In a real implementation, this would send a discovery request to the specific IP
      // For this implementation, we'll simulate finding a device
      
      const deviceTypes = [
        PeerDeviceType.DESKTOP,
        PeerDeviceType.MOBILE,
        PeerDeviceType.TV,
        PeerDeviceType.SPEAKER
      ];
      
      const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
      const deviceId = `peer-${cryptoSecurityService.generateRandomString({ length: 8 })}`;
      
      const newPeer: PeerDevice = {
        id: deviceId,
        name: `Device at ${ipAddress}`,
        type: deviceType,
        ipAddress,
        port,
        services: ['streaming'],
        lastSeen: Date.now(),
        capabilities: {
          canStream: true,
          canReceive: true,
          supportsEncryption: true,
          maxBitrate: 10000,
          protocols: ['sne', 'rtmp']
        }
      };
      
      // Add to discovered peers
      this.discoveredPeers.set(deviceId, newPeer);
      
      // Emit discovery event
      this.emit('peer-discovered', { peer: newPeer });
      
      return newPeer;
    } catch (error) {
      console.error('Error discovering specific peer:', error);
      return null;
    }
  }
  
  /**
   * Simulate device discovery
   * Creates fake peer devices for demonstration
   */
  private simulateDeviceDiscovery(): void {
    // Create some simulated devices
    const simulatedDevices: Partial<PeerDevice>[] = [
      {
        id: 'desktop-pc-living-room',
        name: 'Living Room PC',
        type: PeerDeviceType.DESKTOP,
        ipAddress: '192.168.1.101',
        port: 8008,
        services: ['streaming', 'casting'],
        capabilities: {
          canStream: true,
          canReceive: true,
          supportsEncryption: true,
          maxBitrate: 20000,
          protocols: ['sne', 'rtmp', 'hls', 'dash']
        }
      },
      {
        id: 'mobile-iphone-alice',
        name: 'Alice\'s iPhone',
        type: PeerDeviceType.MOBILE,
        ipAddress: '192.168.1.102',
        port: 8008,
        services: ['streaming'],
        capabilities: {
          canStream: true,
          canReceive: true,
          supportsEncryption: true,
          maxBitrate: 5000,
          protocols: ['hls', 'sne']
        }
      },
      {
        id: 'tv-living-room',
        name: 'Living Room TV',
        type: PeerDeviceType.TV,
        ipAddress: '192.168.1.103',
        port: 8008,
        services: ['streaming', 'casting'],
        capabilities: {
          canStream: false,
          canReceive: true,
          supportsEncryption: true,
          maxBitrate: 15000,
          protocols: ['hls', 'dash']
        }
      },
      {
        id: 'speaker-kitchen',
        name: 'Kitchen Speaker',
        type: PeerDeviceType.SPEAKER,
        ipAddress: '192.168.1.104',
        port: 8008,
        services: ['streaming'],
        capabilities: {
          canStream: false,
          canReceive: true,
          supportsEncryption: true,
          protocols: ['sne', 'rtmp']
        }
      }
    ];
    
    // Add devices with random chance
    for (const device of simulatedDevices) {
      // 50% chance to "discover" each device
      if (Math.random() > 0.5) {
        if (device.id && !this.discoveredPeers.has(device.id)) {
          const peer: PeerDevice = {
            ...device as PeerDevice,
            lastSeen: Date.now()
          };
          
          this.discoveredPeers.set(device.id, peer);
          
          // Emit discovery event
          this.emit('peer-discovered', { peer });
        } else if (device.id) {
          // Update last seen for existing device
          const existingDevice = this.discoveredPeers.get(device.id);
          if (existingDevice) {
            existingDevice.lastSeen = Date.now();
            this.discoveredPeers.set(device.id, existingDevice);
          }
        }
      }
    }
  }
  
  /**
   * Stop discovery and cleanup
   */
  public shutdown(): void {
    // Stop discovery
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Clear peers
    this.discoveredPeers.clear();
    this.connectedPeers.clear();
    
    this.initialized = false;
    this.emit('shutdown');
  }
}

// Export singleton instance
export const lanPeerDiscoveryService = LANPeerDiscoveryService.getInstance();
export default lanPeerDiscoveryService;
