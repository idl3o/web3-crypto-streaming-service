import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { healthMonitoringService, ComponentType, HealthStatus } from './HealthMonitoringService';

/**
 * Resource types that can be controlled
 */
export enum ResourceType {
  BANDWIDTH = 'bandwidth',
  COMPUTE = 'compute',
  STORAGE = 'storage',
  MEMORY = 'memory',
  THREADS = 'threads'
}

/**
 * Resource allocation priority
 */
export enum ResourcePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Resource allocation strategy
 */
export enum AllocationStrategy {
  BALANCED = 'balanced',
  PERFORMANCE = 'performance',
  ECONOMY = 'economy',
  RESILIENT = 'resilient'
}

/**
 * Resource allocation request
 */
export interface ResourceRequest {
  requestId: string;
  resourceType: ResourceType;
  amount: number;
  priority: ResourcePriority;
  allocatedTo: string; // Stream ID or component ID
  expiresAt?: number; // Optional expiration time
}

/**
 * Resource allocation response
 */
export interface ResourceAllocation {
  requestId: string;
  resourceType: ResourceType;
  granted: number; // Amount actually granted (may be less than requested)
  grantedAt: number;
  expiresAt?: number;
  priority: ResourcePriority;
  allocatedTo: string;
  status: 'granted' | 'partial' | 'denied' | 'expired';
}

/**
 * Resource threshold configuration
 */
export interface ResourceThreshold {
  warning: number; // Percentage (0-100)
  critical: number; // Percentage (0-100)
  autoRelease: boolean; // Whether to automatically release low-priority resources
}

/**
 * Resource pool configuration
 */
export interface ResourcePoolConfig {
  type: ResourceType;
  capacity: number; // Total available capacity
  unit: string; // Unit of measurement (e.g., "mbps", "gb", "cores")
  reserved: number; // Amount reserved for system use
  threshold: ResourceThreshold;
}

/**
 * Resource Controller Service
 * Manages allocation and deallocation of system resources
 */
export class ResourceControllerService extends EventEmitter {
  private static instance: ResourceControllerService;
  private resourcePools = new Map<ResourceType, ResourcePoolConfig>();
  private allocations = new Map<string, ResourceAllocation>();
  private initialized = false;
  private strategy: AllocationStrategy = AllocationStrategy.BALANCED;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    super();
    this.setMaxListeners(50);
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): ResourceControllerService {
    if (!ResourceControllerService.instance) {
      ResourceControllerService.instance = new ResourceControllerService();
    }
    return ResourceControllerService.instance;
  }
  
  /**
   * Initialize the Resource Controller
   * @param config Initial resource pool configurations
   * @param strategy Allocation strategy
   */
  public async initialize(
    config?: ResourcePoolConfig[],
    strategy?: AllocationStrategy
  ): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Register with health monitoring service
      await this.registerWithHealthMonitoring();
      
      // Set allocation strategy if provided
      if (strategy) {
        this.strategy = strategy;
      }
      
      // Set up resource pools with either provided or default configuration
      if (config && config.length > 0) {
        for (const poolConfig of config) {
          this.resourcePools.set(poolConfig.type, poolConfig);
        }
      } else {
        this.setupDefaultResourcePools();
      }
      
      // Set up cleanup for expired allocations
      this.cleanupInterval = setInterval(() => this.cleanupExpiredAllocations(), 60000);
      
      this.initialized = true;
      this.emit('initialized', { 
        strategy: this.strategy,
        resourcePools: Array.from(this.resourcePools.values())
      });
      
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SYSTEM,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to initialize ResourceControllerService',
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
      'resource-controller',
      ComponentType.STORAGE,
      {
        status: HealthStatus.HEALTHY,
        message: 'Resource Controller initialized',
        metrics: {
          resourcePools: 0,
          activeAllocations: 0
        }
      }
    );
    
    healthMonitoringService.registerHealthCheck(
      'resource-controller',
      async () => {
        const metrics = {
          resourcePools: this.resourcePools.size,
          activeAllocations: this.allocations.size,
          strategy: this.strategy
        };
        
        // Check if any pools are over their warning threshold
        let status = HealthStatus.HEALTHY;
        let message = 'Resources operating normally';
        
        for (const pool of this.resourcePools.values()) {
          const usagePercent = this.getPoolUsagePercentage(pool.type);
          
          if (usagePercent >= pool.threshold.critical) {
            status = HealthStatus.UNHEALTHY;
            message = `${pool.type} resources critically low (${usagePercent.toFixed(1)}%)`;
            break;
          } else if (usagePercent >= pool.threshold.warning && status !== HealthStatus.UNHEALTHY) {
            status = HealthStatus.DEGRADED;
            message = `${pool.type} resources low (${usagePercent.toFixed(1)}%)`;
          }
        }
        
        return {
          status,
          message,
          metrics
        };
      },
      15 * 60 * 1000 // Check every 15 minutes
    );
  }
  
  /**
   * Set up default resource pools
   */
  private setupDefaultResourcePools(): void {
    const defaultPools: ResourcePoolConfig[] = [
      {
        type: ResourceType.BANDWIDTH,
        capacity: 1000,
        unit: 'mbps',
        reserved: 100,
        threshold: {
          warning: 70,
          critical: 90,
          autoRelease: true
        }
      },
      {
        type: ResourceType.COMPUTE,
        capacity: 100,
        unit: 'units',
        reserved: 10,
        threshold: {
          warning: 70,
          critical: 90,
          autoRelease: true
        }
      },
      {
        type: ResourceType.STORAGE,
        capacity: 1000,
        unit: 'gb',
        reserved: 50,
        threshold: {
          warning: 80,
          critical: 95,
          autoRelease: false
        }
      },
      {
        type: ResourceType.MEMORY,
        capacity: 16000,
        unit: 'mb',
        reserved: 1000,
        threshold: {
          warning: 75,
          critical: 90,
          autoRelease: true
        }
      },
      {
        type: ResourceType.THREADS,
        capacity: 16,
        unit: 'threads',
        reserved: 2,
        threshold: {
          warning: 80,
          critical: 95,
          autoRelease: true
        }
      }
    ];
    
    for (const pool of defaultPools) {
      this.resourcePools.set(pool.type, pool);
    }
  }
  
  /**
   * Request resource allocation
   * @param request Resource request parameters
   */
  public async requestResource(
    request: Omit<ResourceRequest, 'requestId'>
  ): Promise<ResourceAllocation> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const fullRequest: ResourceRequest = {
        ...request,
        requestId
      };
      
      // Check if resource pool exists
      const resourcePool = this.resourcePools.get(request.resourceType);
      if (!resourcePool) {
        throw new Error(`Resource pool not found: ${request.resourceType}`);
      }
      
      // Calculate available capacity
      const usedCapacity = this.calculateUsedCapacity(request.resourceType);
      const availableCapacity = resourcePool.capacity - resourcePool.reserved - usedCapacity;
      
      // Determine allocation based on strategy and priority
      let grantedAmount = 0;
      let status: 'granted' | 'partial' | 'denied' = 'denied';
      
      if (availableCapacity >= request.amount) {
        // Full allocation is possible
        grantedAmount = request.amount;
        status = 'granted';
      } else if (availableCapacity > 0) {
        // Partial allocation is possible
        if (this.shouldAllocatePartially(request)) {
          grantedAmount = availableCapacity;
          status = 'partial';
        }
      } else {
        // No capacity available
        // Try to free up resources if critical priority
        if (request.priority === ResourcePriority.CRITICAL) {
          const freedAmount = this.releaseResourcesByPriority(
            request.resourceType,
            request.amount,
            [ResourcePriority.LOW, ResourcePriority.MEDIUM]
          );
          
          if (freedAmount > 0) {
            grantedAmount = Math.min(freedAmount, request.amount);
            status = freedAmount >= request.amount ? 'granted' : 'partial';
          }
        }
      }
      
      // Create allocation record
      const now = Date.now();
      const allocation: ResourceAllocation = {
        requestId,
        resourceType: request.resourceType,
        granted: grantedAmount,
        grantedAt: now,
        expiresAt: request.expiresAt,
        priority: request.priority,
        allocatedTo: request.allocatedTo,
        status
      };
      
      if (grantedAmount > 0) {
        // Store allocation
        this.allocations.set(requestId, allocation);
        
        // Emit allocation event
        this.emit('resource-allocated', { 
          allocation,
          remaining: this.getAvailableAmount(request.resourceType)
        });
      } else {
        // Emit denial event
        this.emit('resource-denied', { 
          request, 
          reason: 'Insufficient resources available'
        });
      }
      
      return allocation;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SYSTEM,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to allocate resources',
        details: error instanceof Error ? error.message : String(error),
        retryable: false,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      // Return denied allocation
      return {
        requestId: `failed-${Date.now()}`,
        resourceType: request.resourceType,
        granted: 0,
        grantedAt: Date.now(),
        priority: request.priority,
        allocatedTo: request.allocatedTo,
        status: 'denied'
      };
    }
  }
  
  /**
   * Release allocated resources
   * @param requestId The original request ID
   * @param amount Optional amount to release (defaults to all)
   */
  public releaseResource(requestId: string, amount?: number): boolean {
    const allocation = this.allocations.get(requestId);
    
    if (!allocation) {
      return false;
    }
    
    try {
      if (!amount || amount >= allocation.granted) {
        // Release all resources
        this.allocations.delete(requestId);
        
        // Emit release event
        this.emit('resource-released', { 
          requestId, 
          resourceType: allocation.resourceType,
          amount: allocation.granted,
          remaining: this.getAvailableAmount(allocation.resourceType)
        });
        
        return true;
      } else {
        // Partial release
        allocation.granted -= amount;
        this.allocations.set(requestId, allocation);
        
        // Emit release event
        this.emit('resource-released', { 
          requestId, 
          resourceType: allocation.resourceType,
          amount,
          remaining: this.getAvailableAmount(allocation.resourceType)
        });
        
        return true;
      }
    } catch (error) {
      console.error('Error releasing resources:', error);
      return false;
    }
  }
  
  /**
   * Update an existing allocation
   * @param requestId Original request ID
   * @param updateRequest Updated resource amount
   */
  public async updateAllocation(
    requestId: string,
    updateRequest: {
      amount: number;
      expiresAt?: number;
    }
  ): Promise<ResourceAllocation | null> {
    const currentAllocation = this.allocations.get(requestId);
    
    if (!currentAllocation) {
      return null;
    }
    
    try {
      const amountDiff = updateRequest.amount - currentAllocation.granted;
      
      if (amountDiff <= 0) {
        // Reducing allocation or staying the same
        currentAllocation.granted = updateRequest.amount;
        
        // Update expiration if provided
        if (updateRequest.expiresAt) {
          currentAllocation.expiresAt = updateRequest.expiresAt;
        }
        
        this.allocations.set(requestId, currentAllocation);
        
        // Emit update event
        this.emit('resource-updated', { 
          allocation: currentAllocation,
          change: amountDiff
        });
        
        return currentAllocation;
      } else {
        // Requesting more resources
        const newRequest = {
          resourceType: currentAllocation.resourceType,
          amount: amountDiff,
          priority: currentAllocation.priority,
          allocatedTo: currentAllocation.allocatedTo,
          expiresAt: updateRequest.expiresAt || currentAllocation.expiresAt
        };
        
        // Request additional resources
        const additionalAllocation = await this.requestResource(newRequest);
        
        if (additionalAllocation.granted > 0) {
          // Update the existing allocation
          currentAllocation.granted += additionalAllocation.granted;
          
          if (updateRequest.expiresAt) {
            currentAllocation.expiresAt = updateRequest.expiresAt;
          }
          
          currentAllocation.status = 
            additionalAllocation.granted === amountDiff ? 'granted' : 'partial';
          
          this.allocations.set(requestId, currentAllocation);
          
          // Delete the temporary allocation
          this.allocations.delete(additionalAllocation.requestId);
          
          // Emit update event
          this.emit('resource-updated', { 
            allocation: currentAllocation,
            change: additionalAllocation.granted
          });
          
          return currentAllocation;
        } else {
          // Could not allocate additional resources
          return currentAllocation;
        }
      }
    } catch (error) {
      console.error('Error updating resource allocation:', error);
      return currentAllocation;
    }
  }
  
  /**
   * Get total amount available for a resource type
   * @param resourceType Resource type
   */
  public getAvailableAmount(resourceType: ResourceType): number {
    const pool = this.resourcePools.get(resourceType);
    
    if (!pool) {
      return 0;
    }
    
    const usedCapacity = this.calculateUsedCapacity(resourceType);
    return pool.capacity - pool.reserved - usedCapacity;
  }
  
  /**
   * Get usage percentage for a resource pool
   * @param resourceType Resource type
   */
  public getPoolUsagePercentage(resourceType: ResourceType): number {
    const pool = this.resourcePools.get(resourceType);
    
    if (!pool) {
      return 0;
    }
    
    const usedCapacity = this.calculateUsedCapacity(resourceType);
    const totalAvailable = pool.capacity - pool.reserved;
    
    return (usedCapacity / totalAvailable) * 100;
  }
  
  /**
   * Get all active allocations
   */
  public getAllAllocations(): ResourceAllocation[] {
    return Array.from(this.allocations.values());
  }
  
  /**
   * Get allocations for a specific resource type
   * @param resourceType Resource type
   */
  public getResourceAllocations(resourceType: ResourceType): ResourceAllocation[] {
    return Array.from(this.allocations.values())
      .filter(allocation => allocation.resourceType === resourceType);
  }
  
  /**
   * Set the allocation strategy
   * @param strategy New allocation strategy
   */
  public setAllocationStrategy(strategy: AllocationStrategy): void {
    this.strategy = strategy;
    this.emit('strategy-changed', { strategy });
  }
  
  /**
   * Clean up expired allocations
   */
  private cleanupExpiredAllocations(): void {
    const now = Date.now();
    const expiredIds: string[] = [];
    
    for (const [id, allocation] of this.allocations.entries()) {
      if (allocation.expiresAt && allocation.expiresAt < now) {
        expiredIds.push(id);
      }
    }
    
    if (expiredIds.length > 0) {
      for (const id of expiredIds) {
        const allocation = this.allocations.get(id);
        if (allocation) {
          this.allocations.delete(id);
          allocation.status = 'expired';
          
          // Emit resource expired event
          this.emit('resource-expired', { allocation });
        }
      }
    }
  }
  
  /**
   * Calculate used capacity for a resource type
   * @param resourceType Resource type
   */
  private calculateUsedCapacity(resourceType: ResourceType): number {
    let total = 0;
    
    for (const allocation of this.allocations.values()) {
      if (allocation.resourceType === resourceType) {
        total += allocation.granted;
      }
    }
    
    return total;
  }
  
  /**
   * Determine if partial allocation should be granted based on strategy and priority
   * @param request Resource request
   */
  private shouldAllocatePartially(request: ResourceRequest): boolean {
    switch (this.strategy) {
      case AllocationStrategy.BALANCED:
        // Allocate partially for medium or higher priority
        return request.priority !== ResourcePriority.LOW;
        
      case AllocationStrategy.PERFORMANCE:
        // Only allocate if high or critical priority
        return request.priority === ResourcePriority.HIGH || 
               request.priority === ResourcePriority.CRITICAL;
        
      case AllocationStrategy.ECONOMY:
        // Always try to allocate partially
        return true;
        
      case AllocationStrategy.RESILIENT:
        // Allocate partially for critical priority only
        return request.priority === ResourcePriority.CRITICAL;
        
      default:
        return false;
    }
  }
  
  /**
   * Release resources by priority to make room for new allocations
   * @param resourceType Resource type
   * @param requiredAmount Amount needed
   * @param priorities Priorities to consider for release (lowest first)
   */
  private releaseResourcesByPriority(
    resourceType: ResourceType,
    requiredAmount: number,
    priorities: ResourcePriority[]
  ): number {
    let freedAmount = 0;
    
    // Sort priorities from lowest to highest
    const sortedPriorities = [...priorities].sort((a, b) => {
      const priorityValues = {
        [ResourcePriority.LOW]: 0,
        [ResourcePriority.MEDIUM]: 1,
        [ResourcePriority.HIGH]: 2,
        [ResourcePriority.CRITICAL]: 3
      };
      
      return priorityValues[a] - priorityValues[b];
    });
    
    // Get allocations for this resource type with the given priorities
    const candidateAllocations = Array.from(this.allocations.values())
      .filter(allocation => 
        allocation.resourceType === resourceType && 
        sortedPriorities.includes(allocation.priority)
      )
      .sort((a, b) => {
        // Sort by priority (lowest first)
        const priorityValues = {
          [ResourcePriority.LOW]: 0,
          [ResourcePriority.MEDIUM]: 1,
          [ResourcePriority.HIGH]: 2,
          [ResourcePriority.CRITICAL]: 3
        };
        
        return priorityValues[a.priority] - priorityValues[b.priority];
      });
    
    // Release resources until we have enough or run out of candidates
    for (const allocation of candidateAllocations) {
      if (freedAmount >= requiredAmount) {
        break;
      }
      
      // Release this allocation
      this.allocations.delete(allocation.requestId);
      freedAmount += allocation.granted;
      
      // Emit forced release event
      this.emit('resource-force-released', { 
        allocation,
        reason: 'Higher priority request'
      });
    }
    
    return freedAmount;
  }
  
  /**
   * Shutdown the resource controller
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Clear all allocations
    this.allocations.clear();
    
    this.initialized = false;
    this.emit('shutdown');
  }
}

// Export singleton instance
export const resourceController = ResourceControllerService.getInstance();
export default resourceController;
