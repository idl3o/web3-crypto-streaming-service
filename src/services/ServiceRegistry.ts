import { EventEmitter } from 'events';
import { authService } from './AuthService';
import { codeCompletionService } from './CodeCompletionService';
import { ioErrorService } from './IOErrorService';
import { streamingService } from './streamingService';
import { aiModelSelectionService } from './AIModelSelectionService';
import { appDiagnosticsService } from './AppDiagnosticsService';
import { completionTimeoutManager } from './CompletionTimeoutManager';

/**
 * Central registry for all application services with lifecycle management
 * Solves the cascading initialization issues and dependency management
 */
export class ServiceRegistry extends EventEmitter {
  private static instance: ServiceRegistry;
  private services: Map<string, any> = new Map();
  private initStatus: Map<string, boolean> = new Map();
  private dependencyGraph: Map<string, string[]> = new Map();
  private initPromises: Map<string, Promise<boolean>> = new Map();
  
  private constructor() {
    super();
    this.registerCoreServices();
  }
  
  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }
  
  /**
   * Register core application services and their dependencies
   */
  private registerCoreServices(): void {
    // Register all services with their initialization dependencies
    this.register('io-error', ioErrorService, []);
    this.register('auth', authService, ['io-error']);
    this.register('ai-model', aiModelSelectionService, ['io-error']);
    this.register('code-completion', codeCompletionService, ['io-error']);
    this.register('timeout-manager', completionTimeoutManager, ['code-completion', 'io-error']);
    this.register('diagnostics', appDiagnosticsService, ['auth', 'io-error']);
    this.register('streaming', streamingService, ['auth', 'io-error']);
  }
  
  /**
   * Register a service with its dependencies
   */
  public register(id: string, service: any, dependencies: string[] = []): void {
    this.services.set(id, service);
    this.initStatus.set(id, false);
    this.dependencyGraph.set(id, dependencies);
  }
  
  /**
   * Initialize all registered services in proper dependency order
   */
  public async initializeAll(): Promise<boolean> {
    try {
      // Get all service IDs
      const serviceIds = Array.from(this.services.keys());
      
      // Initialize each service in dependency order
      for (const id of this.resolveDependencyOrder(serviceIds)) {
        await this.initializeService(id);
      }
      
      this.emit('all-services-initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize all services:', error);
      this.emit('initialization-failed', { error });
      return false;
    }
  }
  
  /**
   * Initialize a specific service with dependency resolution
   */
  public async initializeService(id: string): Promise<boolean> {
    // If already initializing, return the promise
    if (this.initPromises.has(id)) {
      return this.initPromises.get(id)!;
    }
    
    // If already initialized, return immediately
    if (this.initStatus.get(id) === true) {
      return true;
    }
    
    const initPromise = (async () => {
      try {
        // First initialize all dependencies
        const dependencies = this.dependencyGraph.get(id) || [];
        for (const depId of dependencies) {
          const success = await this.initializeService(depId);
          if (!success) {
            throw new Error(`Failed to initialize dependency ${depId} for ${id}`);
          }
        }
        
        // Get the service
        const service = this.services.get(id);
        if (!service) {
          throw new Error(`Service not found: ${id}`);
        }
        
        // Initialize the service if it has an initialize method
        if (typeof service.initialize === 'function') {
          await service.initialize();
        }
        
        // Mark as initialized
        this.initStatus.set(id, true);
        this.emit('service-initialized', { id });
        
        return true;
      } catch (error) {
        this.emit('service-initialization-failed', { id, error });
        return false;
      }
    })();
    
    // Store the promise
    this.initPromises.set(id, initPromise);
    
    return initPromise;
  }
  
  /**
   * Get a service by ID
   */
  public getService<T>(id: string): T | undefined {
    return this.services.get(id) as T | undefined;
  }
  
  /**
   * Check if a service is initialized
   */
  public isInitialized(id: string): boolean {
    return this.initStatus.get(id) === true;
  }
  
  /**
   * Resolve the correct order to initialize services based on dependencies
   */
  private resolveDependencyOrder(serviceIds: string[]): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    
    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      
      const deps = this.dependencyGraph.get(id) || [];
      for (const dep of deps) {
        visit(dep);
      }
      
      result.push(id);
    };
    
    for (const id of serviceIds) {
      visit(id);
    }
    
    return result;
  }
}

export const serviceRegistry = ServiceRegistry.getInstance();
export default serviceRegistry;
