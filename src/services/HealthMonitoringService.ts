import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';

/**
 * System health status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

/**
 * Component type for health checking
 */
export enum ComponentType {
  API = 'api',
  DATABASE = 'database',
  BLOCKCHAIN = 'blockchain',
  PAYMENT = 'payment',
  STREAMING = 'streaming',
  AUTHENTICATION = 'authentication',
  STORAGE = 'storage',
  CACHE = 'cache',
  EXTERNAL_SERVICE = 'external_service'
}

/**
 * Component health information
 */
export interface ComponentHealth {
  name: string;
  type: ComponentType;
  status: HealthStatus;
  message?: string;
  lastChecked: number;
  responseTime?: number;
  metrics?: Record<string, number | string>;
  dependencies?: string[];
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: HealthStatus;
  uptime: number;
  components: ComponentHealth[];
  timestamp: number;
  version: string;
  environment: string;
}

/**
 * Component health check function
 */
export type HealthCheckFunction = () => Promise<{
  status: HealthStatus;
  message?: string;
  responseTime?: number;
  metrics?: Record<string, number | string>;
}>;

/**
 * Service for monitoring system health across all components
 */
export class HealthMonitoringService extends EventEmitter {
  private static instance: HealthMonitoringService;
  private components = new Map<string, ComponentHealth>();
  private healthChecks = new Map<string, HealthCheckFunction>();
  private startTime: number = Date.now();
  private checkIntervals = new Map<string, NodeJS.Timeout>();
  private isCheckingAll: boolean = false;
  private environment: string = 'development';
  private version: string = '1.0.0';
  private initialized: boolean = false;

  private constructor() {
    super();
    this.setMaxListeners(100);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): HealthMonitoringService {
    if (!HealthMonitoringService.instance) {
      HealthMonitoringService.instance = new HealthMonitoringService();
    }
    return HealthMonitoringService.instance;
  }

  /**
   * Initialize health monitoring
   * @param options Initialization options
   */
  public async initialize(options?: {
    autoCheckInterval?: number;
    environment?: string;
    version?: string;
  }): Promise<boolean> {
    if (this.initialized) return true;
    
    try {
      if (options?.environment) {
        this.environment = options.environment;
      } else if (typeof process !== 'undefined' && process.env.NODE_ENV) {
        this.environment = process.env.NODE_ENV;
      }
      
      if (options?.version) {
        this.version = options.version;
      }
      
      this.startTime = Date.now();
      
      // Set up automatic health checks if interval provided
      if (options?.autoCheckInterval && options.autoCheckInterval > 0) {
        this.setupAutoChecks(options.autoCheckInterval);
      }
      
      // Register built-in component: self
      this.registerComponent('health-system', ComponentType.API, {
        status: HealthStatus.HEALTHY,
        message: 'Health monitoring system initialized',
      });
      
      this.initialized = true;
      this.emit('initialized');
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SYSTEM,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to initialize health monitoring service',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      return false;
    }
  }

  /**
   * Register a system component for health monitoring
   * @param name Component name
   * @param type Component type
   * @param initialState Initial health state
   */
  public registerComponent(
    name: string, 
    type: ComponentType, 
    initialState: Partial<ComponentHealth> = {}
  ): void {
    const component: ComponentHealth = {
      name,
      type,
      status: initialState.status || HealthStatus.UNKNOWN,
      lastChecked: initialState.lastChecked || Date.now(),
      message: initialState.message,
      responseTime: initialState.responseTime,
      metrics: initialState.metrics,
      dependencies: initialState.dependencies || []
    };
    
    this.components.set(name, component);
    this.emit('component-registered', { component });
  }

  /**
   * Register a health check function for a component
   * @param componentName Component name
   * @param checkFn Health check function
   * @param checkInterval Optional automatic check interval in ms
   */
  public registerHealthCheck(
    componentName: string,
    checkFn: HealthCheckFunction,
    checkInterval?: number
  ): void {
    // Ensure component exists
    if (!this.components.has(componentName)) {
      this.registerComponent(componentName, ComponentType.API);
    }

    // Register check function
    this.healthChecks.set(componentName, checkFn);
    
    // Set up interval check if specified
    if (checkInterval && checkInterval > 0) {
      // Clear any existing interval
      if (this.checkIntervals.has(componentName)) {
        clearInterval(this.checkIntervals.get(componentName)!);
      }
      
      // Set new interval
      const intervalId = setInterval(async () => {
        try {
          await this.checkComponentHealth(componentName);
        } catch (error) {
          console.error(`Error checking health of ${componentName}:`, error);
        }
      }, checkInterval);
      
      this.checkIntervals.set(componentName, intervalId);
    }
    
    this.emit('health-check-registered', { componentName });
  }

  /**
   * Check health of a specific component
   * @param componentName Component name
   */
  public async checkComponentHealth(componentName: string): Promise<ComponentHealth> {
    const component = this.components.get(componentName);
    if (!component) {
      throw new Error(`Component not found: ${componentName}`);
    }
    
    const checkFn = this.healthChecks.get(componentName);
    if (!checkFn) {
      // No check function, just return current status
      return component;
    }
    
    try {
      const startTime = Date.now();
      const result = await checkFn();
      const endTime = Date.now();
      
      // Update component health
      const updatedHealth: ComponentHealth = {
        ...component,
        status: result.status,
        message: result.message,
        lastChecked: endTime,
        responseTime: endTime - startTime,
        metrics: result.metrics
      };
      
      this.components.set(componentName, updatedHealth);
      
      // Emit events based on status changes
      if (component.status !== updatedHealth.status) {
        this.emit('status-changed', { 
          componentName, 
          oldStatus: component.status, 
          newStatus: updatedHealth.status 
        });
        
        if (updatedHealth.status === HealthStatus.UNHEALTHY) {
          this.emit('component-unhealthy', { componentName, health: updatedHealth });
        } else if (component.status === HealthStatus.UNHEALTHY && 
                   updatedHealth.status === HealthStatus.HEALTHY) {
          this.emit('component-recovered', { componentName, health: updatedHealth });
        }
      }
      
      return updatedHealth;
    } catch (error) {
      // Update component health to reflect error
      const updatedHealth: ComponentHealth = {
        ...component,
        status: HealthStatus.UNHEALTHY,
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        lastChecked: Date.now(),
      };
      
      this.components.set(componentName, updatedHealth);
      
      this.emit('health-check-error', { 
        componentName, 
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return updatedHealth;
    }
  }

  /**
   * Check health of all registered components
   */
  public async checkAllHealth(): Promise<HealthCheckResult> {
    if (this.isCheckingAll) {
      // Return the latest health state if already checking
      return this.getHealthReport();
    }
    
    this.isCheckingAll = true;
    
    try {
      const componentNames = Array.from(this.components.keys());
      
      // Check all components in parallel
      await Promise.all(
        componentNames.map(name => this.checkComponentHealth(name))
      );
      
      // Generate and return the health report
      const healthReport = this.getHealthReport();
      this.emit('health-check-completed', healthReport);
      return healthReport;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SYSTEM,
        severity: IOErrorSeverity.WARNING,
        message: 'Error checking system health',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      // Return the current health status even if checking failed
      return this.getHealthReport();
    } finally {
      this.isCheckingAll = false;
    }
  }

  /**
   * Get the current health report
   */
  public getHealthReport(): HealthCheckResult {
    const components = Array.from(this.components.values());
    
    // Determine overall system status
    let overallStatus = HealthStatus.HEALTHY;
    for (const component of components) {
      if (component.status === HealthStatus.UNHEALTHY) {
        overallStatus = HealthStatus.UNHEALTHY;
        break;
      } else if (component.status === HealthStatus.DEGRADED && 
                 overallStatus !== HealthStatus.UNHEALTHY) {
        overallStatus = HealthStatus.DEGRADED;
      } else if (component.status === HealthStatus.UNKNOWN &&
                 overallStatus === HealthStatus.HEALTHY) {
        overallStatus = HealthStatus.UNKNOWN;
      }
    }
    
    return {
      status: overallStatus,
      uptime: Date.now() - this.startTime,
      components,
      timestamp: Date.now(),
      version: this.version,
      environment: this.environment
    };
  }

  /**
   * Update the health status of a component
   * @param componentName Component name
   * @param status New health status
   * @param message Optional status message
   * @param metrics Optional metrics
   */
  public updateComponentStatus(
    componentName: string,
    status: HealthStatus,
    message?: string,
    metrics?: Record<string, number | string>
  ): void {
    const component = this.components.get(componentName);
    if (!component) {
      throw new Error(`Component not found: ${componentName}`);
    }
    
    const oldStatus = component.status;
    
    // Update component
    const updatedHealth: ComponentHealth = {
      ...component,
      status,
      message,
      lastChecked: Date.now(),
      metrics: { ...component.metrics, ...metrics }
    };
    
    this.components.set(componentName, updatedHealth);
    
    // Emit events if status changed
    if (oldStatus !== status) {
      this.emit('status-changed', { 
        componentName, 
        oldStatus, 
        newStatus: status 
      });
      
      if (status === HealthStatus.UNHEALTHY) {
        this.emit('component-unhealthy', { componentName, health: updatedHealth });
      } else if (oldStatus === HealthStatus.UNHEALTHY && status === HealthStatus.HEALTHY) {
        this.emit('component-recovered', { componentName, health: updatedHealth });
      }
    }
  }

  /**
   * Set up automatic health checks
   * @param interval Check interval in milliseconds
   */
  private setupAutoChecks(interval: number): void {
    // Set up a global interval for all components
    const intervalId = setInterval(async () => {
      try {
        await this.checkAllHealth();
      } catch (error) {
        console.error('Error during automatic health check:', error);
      }
    }, interval);
    
    // Store as a special interval
    this.checkIntervals.set('_global', intervalId);
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Clear all check intervals
    for (const interval of this.checkIntervals.values()) {
      clearInterval(interval);
    }
    
    this.checkIntervals.clear();
    this.emit('disposed');
  }
}

// Export singleton instance
export const healthMonitoringService = HealthMonitoringService.getInstance();
export default healthMonitoringService;
