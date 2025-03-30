import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { serviceRegistry } from './ServiceRegistry';

/**
 * Health check status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

/**
 * Service health information
 */
export interface ServiceHealth {
  id: string;
  status: HealthStatus;
  lastChecked: number;
  metrics?: Record<string, any>;
  issues?: string[];
}

/**
 * System health information
 */
export interface SystemHealth {
  overallStatus: HealthStatus;
  services: Record<string, ServiceHealth>;
  timestamp: number;
  resourceUsage: {
    memory: number;
    cpu: number;
  };
}

/**
 * Service for monitoring health of all application components
 */
export class HealthMonitorService extends EventEmitter {
  private static instance: HealthMonitorService;
  private healthData: Record<string, ServiceHealth> = {};
  private monitorInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 30000; // 30 seconds
  
  private constructor() {
    super();
  }
  
  public static getInstance(): HealthMonitorService {
    if (!HealthMonitorService.instance) {
      HealthMonitorService.instance = new HealthMonitorService();
    }
    return HealthMonitorService.instance;
  }
  
  /**
   * Initialize the health monitor
   */
  public initialize(): void {
    this.startMonitoring();
  }
  
  /**
   * Start periodic health checks
   */
  private startMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    
    // Run immediately
    this.checkAllServices();
    
    // Set interval for periodic checks
    this.monitorInterval = setInterval(() => {
      this.checkAllServices();
    }, this.CHECK_INTERVAL);
  }
  
  /**
   * Check health of all registered services
   */
  private async checkAllServices(): Promise<void> {
    try {
      const registry = serviceRegistry.getInstance();
      const serviceIds = Object.keys(registry.getService('registry') || {});
      
      for (const id of serviceIds) {
        await this.checkServiceHealth(id);
      }
      
      // After all services checked, evaluate system health
      const systemHealth = this.evaluateSystemHealth();
      
      // Emit event with overall health status
      this.emit('health-check-complete', systemHealth);
      
      // If health is degraded or unhealthy, report to error service
      if (systemHealth.overallStatus !== HealthStatus.HEALTHY) {
        const unhealthyServices = Object.entries(systemHealth.services)
          .filter(([_, health]) => health.status !== HealthStatus.HEALTHY)
          .map(([id, health]) => `${id}: ${health.status}${health.issues ? ' - ' + health.issues.join(', ') : ''}`)
          .join('\n');
          
        ioErrorService.reportError({
          type: IOErrorType.UNKNOWN,
          severity: systemHealth.overallStatus === HealthStatus.DEGRADED ? 
            IOErrorSeverity.WARNING : IOErrorSeverity.ERROR,
          message: `System health ${systemHealth.overallStatus}`,
          details: `Unhealthy services:\n${unhealthyServices}`,
          source: 'HealthMonitorService',
          retryable: true
        });
      }
    } catch (error) {
      console.error('Error during health check:', error);
    }
  }
  
  /**
   * Check health of a specific service
   */
  private async checkServiceHealth(serviceId: string): Promise<ServiceHealth> {
    try {
      const service = serviceRegistry.getService(serviceId);
      
      if (!service) {
        return this.updateServiceHealth(serviceId, HealthStatus.UNKNOWN, ['Service not found']);
      }
      
      // If service has a getHealth method, use it
      if (typeof service.getHealth === 'function') {
        const healthData = await service.getHealth();
        return this.updateServiceHealth(
          serviceId, 
          healthData.status || HealthStatus.HEALTHY,
          healthData.issues,
          healthData.metrics
        );
      }
      
      // If service has a status property, use that
      if (service.status) {
        return this.updateServiceHealth(
          serviceId,
          service.status === 'error' ? HealthStatus.UNHEALTHY : HealthStatus.HEALTHY
        );
      }
      
      // Otherwise, assume healthy if initialized
      const isInitialized = serviceRegistry.isInitialized(serviceId);
      return this.updateServiceHealth(
        serviceId,
        isInitialized ? HealthStatus.HEALTHY : HealthStatus.UNKNOWN,
        isInitialized ? undefined : ['Service not initialized']
      );
      
    } catch (error) {
      return this.updateServiceHealth(
        serviceId,
        HealthStatus.UNHEALTHY,
        [`Health check failed: ${error instanceof Error ? error.message : String(error)}`]
      );
    }
  }
  
  /**
   * Update a service's health status
   */
  private updateServiceHealth(
    id: string, 
    status: HealthStatus,
    issues?: string[],
    metrics?: Record<string, any>
  ): ServiceHealth {
    // Get previous health data
    const previous = this.healthData[id];
    
    // Create new health data
    const health: ServiceHealth = {
      id,
      status,
      lastChecked: Date.now(),
      issues,
      metrics
    };
    
    // Store updated health
    this.healthData[id] = health;
    
    // Emit event if status changed
    if (!previous || previous.status !== status) {
      this.emit('service-health-changed', { 
        serviceId: id, 
        oldStatus: previous?.status || HealthStatus.UNKNOWN, 
        newStatus: status,
        health
      });
    }
    
    return health;
  }
  
  /**
   * Evaluate overall system health
   */
  private evaluateSystemHealth(): SystemHealth {
    // Default to healthy
    let overallStatus = HealthStatus.HEALTHY;
    
    // If any critical service is unhealthy, system is unhealthy
    const criticalServices = ['auth', 'io-error', 'streaming'];
    
    for (const id of criticalServices) {
      const health = this.healthData[id];
      if (health && health.status === HealthStatus.UNHEALTHY) {
        overallStatus = HealthStatus.UNHEALTHY;
        break;
      }
    }
    
    // If any service is unhealthy, system is at least degraded
    if (overallStatus !== HealthStatus.UNHEALTHY) {
      const anyUnhealthy = Object.values(this.healthData).some(h => h.status === HealthStatus.UNHEALTHY);
      if (anyUnhealthy) {
        overallStatus = HealthStatus.DEGRADED;
      }
    }
    
    // Gather memory and CPU usage
    let memoryUsage = 0;
    let cpuUsage = 0;
    
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      memoryUsage = memory.heapUsed / memory.heapTotal;
      
      // If memory usage is high, degrade status
      if (memoryUsage > 0.85 && overallStatus === HealthStatus.HEALTHY) {
        overallStatus = HealthStatus.DEGRADED;
      }
    }
    
    return {
      overallStatus,
      services: { ...this.healthData },
      timestamp: Date.now(),
      resourceUsage: {
        memory: memoryUsage,
        cpu: cpuUsage
      }
    };
  }
  
  /**
   * Get current health status of the system
   */
  public getSystemHealth(): SystemHealth {
    return this.evaluateSystemHealth();
  }
  
  /**
   * Get health of a specific service
   */
  public getServiceHealth(serviceId: string): ServiceHealth | undefined {
    return this.healthData[serviceId];
  }
}

export const healthMonitorService = HealthMonitorService.getInstance();
export default healthMonitorService;
