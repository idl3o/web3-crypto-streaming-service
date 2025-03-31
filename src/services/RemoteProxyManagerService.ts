import { EventEmitter } from 'events';
import { healthMonitoringService, ComponentType, HealthStatus } from './HealthMonitoringService';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { cryptoSecurityService } from './CryptoSecurityService';

/**
 * Remote proxy node information
 */
export interface ProxyNode {
  id: string;
  url: string;
  region: string;
  capabilities: string[];
  load: number;
  maxConnections: number;
  currentConnections: number;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastHealthCheck: number;
  securityLevel: 'standard' | 'enhanced' | 'maximum' | 'quantum';
  metadata?: Record<string, any>;
}

/**
 * Proxy node discovery response
 */
export interface DiscoveryResponse {
  nodes: ProxyNode[];
  timestamp: number;
  signature?: string;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  metrics?: {
    cpuLoad?: number;
    memoryUsage?: number;
    activeSessions?: number;
    bandwidthAvailable?: number;
  };
  timestamp: number;
}

/**
 * Remote Proxy Manager Service
 * Manages discovery, health checking, and selection of remote proxy nodes
 */
export class RemoteProxyManagerService extends EventEmitter {
  private static instance: RemoteProxyManagerService;
  private initialized = false;
  private proxyNodes = new Map<string, ProxyNode>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private discoveryInterval: NodeJS.Timeout | null = null;
  private defaultDiscoveryEndpoints: string[] = [
    'https://proxydiscovery.web3streaming.com/api/nodes',
    'https://backup-discovery.web3streaming.com/nodes'
  ];
  private lastDiscoveryTimestamp = 0;
  private apiKey = '';
  
  /**
   * Health check interval in milliseconds
   */
  private readonly HEALTH_CHECK_INTERVAL_MS = 60000; // 1 minute
  
  /**
   * Discovery interval in milliseconds
   */
  private readonly DISCOVERY_INTERVAL_MS = 300000; // 5 minutes
  
  private constructor() {
    super();
    this.setMaxListeners(50);
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): RemoteProxyManagerService {
    if (!RemoteProxyManagerService.instance) {
      RemoteProxyManagerService.instance = new RemoteProxyManagerService();
    }
    return RemoteProxyManagerService.instance;
  }
  
  /**
   * Initialize the service
   * @param options Initialization options
   */
  public async initialize(options?: {
    discoveryEndpoints?: string[];
    apiKey?: string;
    healthCheckInterval?: number;
    discoveryInterval?: number;
  }): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Apply options
      if (options?.discoveryEndpoints && options.discoveryEndpoints.length > 0) {
        this.defaultDiscoveryEndpoints = options.discoveryEndpoints;
      }
      
      if (options?.apiKey) {
        this.apiKey = options.apiKey;
      }
      
      if (options?.healthCheckInterval) {
        this.HEALTH_CHECK_INTERVAL_MS = options.healthCheckInterval;
      }
      
      if (options?.discoveryInterval) {
        this.DISCOVERY_INTERVAL_MS = options.discoveryInterval;
      }
      
      // Register with health monitoring
      await this.registerWithHealthMonitoring();
      
      // Load any stored proxy nodes
      await this.loadStoredProxyNodes();
      
      // Start health check interval
      this.startHealthChecks();
      
      // Start discovery interval
      this.startDiscovery();
      
      this.initialized = true;
      this.emit('initialized');
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.NETWORK,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to initialize RemoteProxyManagerService',
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
      'remote-proxy-manager',
      ComponentType.NETWORK,
      {
        status: HealthStatus.HEALTHY,
        message: 'Remote Proxy Manager Service initialized',
        metrics: {
          proxyNodes: 0,
          healthyNodes: 0
        }
      }
    );
    
    healthMonitoringService.registerHealthCheck(
      'remote-proxy-manager',
      async () => {
        const totalNodes = this.proxyNodes.size;
        const healthyNodes = Array.from(this.proxyNodes.values())
          .filter(node => node.healthStatus === 'healthy').length;
        
        let status = HealthStatus.HEALTHY;
        let message = 'Remote Proxy Manager operating normally';
        
        if (healthyNodes === 0 && totalNodes > 0) {
          status = HealthStatus.UNHEALTHY;
          message = 'No healthy remote proxy nodes available';
        } else if (healthyNodes < totalNodes * 0.5) {
          status = HealthStatus.DEGRADED;
          message = `Only ${healthyNodes}/${totalNodes} proxy nodes are healthy`;
        }
        
        return {
          status,
          message,
          metrics: {
            totalProxyNodes: totalNodes,
            healthyNodes,
            lastDiscovery: this.lastDiscoveryTimestamp
          }
        };
      },
      10 * 60 * 1000 // Check every 10 minutes
    );
  }
  
  /**
   * Load stored proxy nodes from configuration or persistent storage
   */
  private async loadStoredProxyNodes(): Promise<void> {
    try {
      // In a real implementation, this would load from a database or config file
      // For this implementation, we'll create a few sample nodes
      
      const sampleNodes: ProxyNode[] = [
        {
          id: 'proxy-us-east-1',
          url: 'https://us-east-1.proxy.web3streaming.com',
          region: 'us-east',
          capabilities: ['streaming', 'encryption', 'transcoding'],
          load: 0.3,
          maxConnections: 1000,
          currentConnections: 350,
          healthStatus: 'healthy',
          lastHealthCheck: Date.now(),
          securityLevel: 'enhanced'
        },
        {
          id: 'proxy-eu-west-1',
          url: 'https://eu-west-1.proxy.web3streaming.com',
          region: 'eu-west',
          capabilities: ['streaming', 'encryption', 'quantum-encryption'],
          load: 0.5,
          maxConnections: 1000,
          currentConnections: 500,
          healthStatus: 'healthy',
          lastHealthCheck: Date.now(),
          securityLevel: 'quantum'
        },
        {
          id: 'proxy-ap-south-1',
          url: 'https://ap-south-1.proxy.web3streaming.com',
          region: 'ap-south',
          capabilities: ['streaming', 'encryption'],
          load: 0.2,
          maxConnections: 500,
          currentConnections: 100,
          healthStatus: 'healthy',
          lastHealthCheck: Date.now(),
          securityLevel: 'standard'
        }
      ];
      
      // Add nodes to the map
      for (const node of sampleNodes) {
        this.proxyNodes.set(node.id, node);
      }
      
      this.emit('nodes-loaded', { count: sampleNodes.length });
    } catch (error) {
      console.error('Error loading stored proxy nodes:', error);
      // We'll continue even if loading fails
    }
  }
  
  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(() => {
      this.checkAllNodesHealth();
    }, this.HEALTH_CHECK_INTERVAL_MS);
    
    // Run an immediate health check
    this.checkAllNodesHealth();
  }
  
  /**
   * Start periodic discovery
   */
  private startDiscovery(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    
    this.discoveryInterval = setInterval(() => {
      this.discoverProxyNodes();
    }, this.DISCOVERY_INTERVAL_MS);
    
    // Run an immediate discovery
    this.discoverProxyNodes();
  }
  
  /**
   * Check health of all nodes
   */
  private async checkAllNodesHealth(): Promise<void> {
    const checkPromises: Promise<void>[] = [];
    
    for (const node of this.proxyNodes.values()) {
      checkPromises.push(this.checkNodeHealth(node.id));
    }
    
    try {
      await Promise.allSettled(checkPromises);
      this.emit('health-check-completed');
    } catch (error) {
      console.error('Error during health checks:', error);
    }
  }
  
  /**
   * Check health of a specific node
   * @param nodeId Node ID to check
   */
  private async checkNodeHealth(nodeId: string): Promise<boolean> {
    const node = this.proxyNodes.get(nodeId);
    
    if (!node) {
      return false;
    }
    
    try {
      // In a real implementation, this would make an HTTP request to the node
      // For this implementation, we'll simulate with random health status
      
      // Simulate health check latency
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 300));
      
      // 80% chance of being healthy
      const randomStatus = Math.random();
      let status: 'healthy' | 'degraded' | 'unhealthy';
      
      if (randomStatus < 0.8) {
        status = 'healthy';
      } else if (randomStatus < 0.95) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }
      
      // Generate random metrics
      const metrics = {
        cpuLoad: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        activeSessions: Math.floor(Math.random() * node.maxConnections),
        bandwidthAvailable: Math.floor(80 + Math.random() * 20)
      };
      
      // Update node information
      node.healthStatus = status;
      node.lastHealthCheck = Date.now();
      node.currentConnections = metrics.activeSessions;
      node.load = metrics.cpuLoad / 100;
      
      // Ensure node load is between 0 and 1
      node.load = Math.max(0, Math.min(1, node.load));
      
      this.proxyNodes.set(nodeId, node);
      this.emit('node-health-updated', { nodeId, status });
      
      return true;
    } catch (error) {
      console.error(`Error checking health for node ${nodeId}:`, error);
      
      // Mark node as unhealthy
      node.healthStatus = 'unhealthy';
      node.lastHealthCheck = Date.now();
      this.proxyNodes.set(nodeId, node);
      
      this.emit('node-health-updated', { nodeId, status: 'unhealthy', error });
      
      return false;
    }
  }
  
  /**
   * Discover new proxy nodes
   */
  private async discoverProxyNodes(): Promise<void> {
    try {
      // In a real implementation, this would make requests to discovery endpoints
      // For this implementation, we'll simulate discovering new nodes
      
      // Simulate discovery latency
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
      
      // Simulate occasional discovery of new nodes
      if (Math.random() > 0.7) {
        const newNodeId = `proxy-dynamic-${Date.now().toString(36).substring(4)}`;
        const regions = ['us-west', 'eu-central', 'ap-east', 'sa-east'];
        const region = regions[Math.floor(Math.random() * regions.length)];
        
        const securityLevels: ('standard' | 'enhanced' | 'maximum' | 'quantum')[] = 
          ['standard', 'enhanced', 'maximum', 'quantum'];
        const securityLevel = securityLevels[Math.floor(Math.random() * securityLevels.length)];
        
        const newNode: ProxyNode = {
          id: newNodeId,
          url: `https://${region}-${Math.floor(Math.random() * 5) + 1}.proxy.web3streaming.com`,
          region,
          capabilities: ['streaming', 'encryption'],
          load: Math.random() * 0.7,
          maxConnections: 500 + Math.floor(Math.random() * 500),
          currentConnections: Math.floor(Math.random() * 300),
          healthStatus: 'unknown',
          lastHealthCheck: 0,
          securityLevel
        };
        
        // Add additional capabilities based on security level
        if (securityLevel === 'quantum' || securityLevel === 'maximum') {
          newNode.capabilities.push('quantum-encryption');
        }
        
        if (Math.random() > 0.5) {
          newNode.capabilities.push('transcoding');
        }
        
        this.proxyNodes.set(newNodeId, newNode);
        this.emit('node-discovered', { nodeId: newNodeId });
        
        // Immediately check the health of the new node
        this.checkNodeHealth(newNodeId);
      }
      
      this.lastDiscoveryTimestamp = Date.now();
      this.emit('discovery-completed');
    } catch (error) {
      console.error('Error discovering proxy nodes:', error);
      this.emit('discovery-error', { error });
    }
  }
  
  /**
   * Get all proxy nodes
   */
  public getAllProxyNodes(): ProxyNode[] {
    return Array.from(this.proxyNodes.values());
  }
  
  /**
   * Get healthy proxy nodes
   */
  public getHealthyProxyNodes(): ProxyNode[] {
    return Array.from(this.proxyNodes.values())
      .filter(node => node.healthStatus === 'healthy');
  }
  
  /**
   * Get proxy nodes by region
   * @param region Region to filter by
   */
  public getProxyNodesByRegion(region: string): ProxyNode[] {
    return Array.from(this.proxyNodes.values())
      .filter(node => node.region === region && node.healthStatus === 'healthy');
  }
  
  /**
   * Get proxy nodes by capability
   * @param capability Capability to filter by
   */
  public getProxyNodesByCapability(capability: string): ProxyNode[] {
    return Array.from(this.proxyNodes.values())
      .filter(node => 
        node.capabilities.includes(capability) && 
        node.healthStatus === 'healthy'
      );
  }
  
  /**
   * Get proxy nodes by security level
   * @param securityLevel Security level to filter by
   */
  public getProxyNodesBySecurityLevel(
    securityLevel: 'standard' | 'enhanced' | 'maximum' | 'quantum'
  ): ProxyNode[] {
    return Array.from(this.proxyNodes.values())
      .filter(node => 
        node.securityLevel === securityLevel && 
        node.healthStatus === 'healthy'
      );
  }
  
  /**
   * Select the best proxy node based on region, load, and capabilities
   * @param region Preferred region
   * @param capabilities Required capabilities
   * @param securityLevel Required security level
   */
  public selectBestProxyNode(
    region?: string,
    capabilities: string[] = [],
    securityLevel: 'standard' | 'enhanced' | 'maximum' | 'quantum' = 'standard'
  ): ProxyNode | null {
    // Get all healthy nodes
    let candidates = this.getHealthyProxyNodes();
    
    // Filter by region if specified
    if (region) {
      const regionNodes = candidates.filter(node => node.region === region);
      // Only filter by region if we have nodes in that region
      if (regionNodes.length > 0) {
        candidates = regionNodes;
      }
    }
    
    // Filter by capabilities
    if (capabilities.length > 0) {
      candidates = candidates.filter(node => 
        capabilities.every(cap => node.capabilities.includes(cap))
      );
    }
    
    // Filter by minimum security level
    const securityLevels = ['standard', 'enhanced', 'maximum', 'quantum'];
    const requiredLevel = securityLevels.indexOf(securityLevel);
    
    candidates = candidates.filter(node => {
      const nodeLevel = securityLevels.indexOf(node.securityLevel);
      return nodeLevel >= requiredLevel;
    });
    
    if (candidates.length === 0) {
      return null;
    }
    
    // Sort by load (lowest first)
    candidates.sort((a, b) => a.load - b.load);
    
    return candidates[0];
  }
  
  /**
   * Add a custom proxy node
   * @param node Proxy node to add
   */
  public addProxyNode(node: ProxyNode): boolean {
    if (this.proxyNodes.has(node.id)) {
      return false;
    }
    
    this.proxyNodes.set(node.id, {
      ...node,
      healthStatus: 'unknown',
      lastHealthCheck: 0
    });
    
    // Schedule an immediate health check
    this.checkNodeHealth(node.id);
    
    this.emit('node-added', { nodeId: node.id });
    return true;
  }
  
  /**
   * Remove a proxy node
   * @param nodeId Node ID to remove
   */
  public removeProxyNode(nodeId: string): boolean {
    if (!this.proxyNodes.has(nodeId)) {
      return false;
    }
    
    this.proxyNodes.delete(nodeId);
    this.emit('node-removed', { nodeId });
    return true;
  }
  
  /**
   * Manually update a proxy node
   * @param nodeId Node ID to update
   * @param updates Updates to apply
   */
  public updateProxyNode(
    nodeId: string,
    updates: Partial<Omit<ProxyNode, 'id'>>
  ): boolean {
    const node = this.proxyNodes.get(nodeId);
    
    if (!node) {
      return false;
    }
    
    // Apply updates
    Object.assign(node, updates);
    
    this.proxyNodes.set(nodeId, node);
    this.emit('node-updated', { nodeId, updates });
    return true;
  }
  
  /**
   * Get node stats - total, healthy, by region, etc.
   */
  public getNodeStats(): {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    byRegion: Record<string, number>;
    bySecurityLevel: Record<string, number>;
  } {
    const nodes = Array.from(this.proxyNodes.values());
    
    const stats = {
      total: nodes.length,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      byRegion: {} as Record<string, number>,
      bySecurityLevel: {
        standard: 0,
        enhanced: 0,
        maximum: 0,
        quantum: 0
      } as Record<string, number>
    };
    
    for (const node of nodes) {
      // Count by status
      if (node.healthStatus === 'healthy') {
        stats.healthy++;
      } else if (node.healthStatus === 'degraded') {
        stats.degraded++;
      } else {
        stats.unhealthy++;
      }
      
      // Count by region
      if (!stats.byRegion[node.region]) {
        stats.byRegion[node.region] = 0;
      }
      stats.byRegion[node.region]++;
      
      // Count by security level
      stats.bySecurityLevel[node.securityLevel]++;
    }
    
    return stats;
  }
  
  /**
   * Trigger an immediate node health check
   * @param nodeId Node ID to check
   */
  public async triggerHealthCheck(nodeId: string): Promise<boolean> {
    if (!this.proxyNodes.has(nodeId)) {
      return false;
    }
    
    return this.checkNodeHealth(nodeId);
  }
  
  /**
   * Trigger an immediate discovery
   */
  public async triggerDiscovery(): Promise<void> {
    return this.discoverProxyNodes();
  }
  
  /**
   * Stop all intervals and cleanup
   */
  public stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
  }
}

// Export singleton instance
export const remoteProxyManagerService = RemoteProxyManagerService.getInstance();
export default remoteProxyManagerService;
