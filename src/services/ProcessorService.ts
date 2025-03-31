import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { healthMonitoringService, ComponentType, HealthStatus } from './HealthMonitoringService';

/**
 * Processor function type that can transform input data to output data
 */
export type Processor<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

/**
 * Pipeline processor that chains multiple processors together
 */
export interface ProcessorPipeline<TInput, TOutput> {
  id: string;
  name: string;
  processors: Array<Processor<any, any>>;
  metrics: {
    processedCount: number;
    successRate: number;
    averageProcessingTime: number;
    lastProcessed: number;
  };
  enabled: boolean;
}

/**
 * Processing options
 */
export interface ProcessingOptions {
  timeout?: number;
  retries?: number;
  allowPartialFailure?: boolean;
  trackMetrics?: boolean;
}

/**
 * Processing result
 */
export interface ProcessingResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
  pipelineId: string;
}

/**
 * Processor Service
 * Manages data processing pipelines throughout the application
 */
export class ProcessorService extends EventEmitter {
  private static instance: ProcessorService;
  private initialized = false;
  private pipelines = new Map<string, ProcessorPipeline<any, any>>();
  private defaultOptions: ProcessingOptions = {
    timeout: 30000,      // 30 seconds
    retries: 3,
    allowPartialFailure: false,
    trackMetrics: true
  };
  
  private constructor() {
    super();
    this.setMaxListeners(50);
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): ProcessorService {
    if (!ProcessorService.instance) {
      ProcessorService.instance = new ProcessorService();
    }
    return ProcessorService.instance;
  }
  
  /**
   * Initialize the processor service
   */
  public async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Register with health monitoring
      await this.registerWithHealthMonitoring();
      
      this.initialized = true;
      this.emit('initialized');
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SYSTEM,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to initialize ProcessorService',
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
      'processor-service',
      ComponentType.PROCESSING,
      {
        status: HealthStatus.HEALTHY,
        message: 'Processor Service initialized',
        metrics: {
          pipelines: 0,
          processorsRegistered: 0
        }
      }
    );
    
    healthMonitoringService.registerHealthCheck(
      'processor-service',
      async () => {
        // Calculate overall metrics
        let totalProcessed = 0;
        let totalSuccess = 0;
        
        for (const pipeline of this.pipelines.values()) {
          totalProcessed += pipeline.metrics.processedCount;
          totalSuccess += pipeline.metrics.processedCount * (pipeline.metrics.successRate / 100);
        }
        
        const successRate = totalProcessed > 0 
          ? (totalSuccess / totalProcessed) * 100 
          : 100;
        
        // Determine health status based on success rate
        let status = HealthStatus.HEALTHY;
        let message = 'Processing pipelines operating normally';
        
        if (successRate < 90) {
          status = HealthStatus.DEGRADED;
          message = 'Processing success rate below 90%';
        } else if (successRate < 70) {
          status = HealthStatus.UNHEALTHY;
          message = 'Critical: Processing success rate below 70%';
        }
        
        return {
          status,
          message,
          metrics: {
            pipelines: this.pipelines.size,
            totalProcessed,
            successRate: successRate.toFixed(2) + '%',
          }
        };
      },
      15 * 60 * 1000 // Check every 15 minutes
    );
  }
  
  /**
   * Create a processing pipeline
   * @param id Unique pipeline identifier
   * @param name Human-readable name
   * @param processors Array of processor functions
   */
  public createPipeline<TInput, TOutput>(
    id: string,
    name: string,
    processors: Array<Processor<any, any>>
  ): ProcessorPipeline<TInput, TOutput> {
    if (!this.initialized) {
      throw new Error('ProcessorService not initialized');
    }
    
    if (this.pipelines.has(id)) {
      throw new Error(`Pipeline with ID "${id}" already exists`);
    }
    
    if (processors.length === 0) {
      throw new Error('Pipeline must contain at least one processor');
    }
    
    const pipeline: ProcessorPipeline<TInput, TOutput> = {
      id,
      name,
      processors,
      metrics: {
        processedCount: 0,
        successRate: 100,
        averageProcessingTime: 0,
        lastProcessed: 0
      },
      enabled: true
    };
    
    this.pipelines.set(id, pipeline);
    
    // Emit pipeline created event
    this.emit('pipeline-created', { id, name, processorCount: processors.length });
    
    return pipeline;
  }
  
  /**
   * Process data through a pipeline
   * @param pipelineId Pipeline identifier
   * @param input Input data
   * @param options Processing options
   */
  public async process<TInput, TOutput>(
    pipelineId: string,
    input: TInput,
    options?: ProcessingOptions
  ): Promise<ProcessingResult<TOutput>> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const pipeline = this.pipelines.get(pipelineId) as ProcessorPipeline<TInput, TOutput> | undefined;
    
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }
    
    if (!pipeline.enabled) {
      return {
        success: false,
        error: new Error(`Pipeline "${pipelineId}" is disabled`),
        duration: 0,
        pipelineId
      };
    }
    
    // Merge options with defaults
    const mergedOptions = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    
    try {
      // Execute the processors in sequence
      let currentData: any = input;
      
      for (const processor of pipeline.processors) {
        try {
          // Apply timeout if specified
          if (mergedOptions.timeout) {
            currentData = await this.executeWithTimeout(
              processor,
              currentData,
              mergedOptions.timeout
            );
          } else {
            currentData = await processor(currentData);
          }
        } catch (processorError) {
          // If partial failure is not allowed, abort the pipeline
          if (!mergedOptions.allowPartialFailure) {
            throw processorError;
          }
          
          // Log error but continue with current data
          console.error(`Processor error in pipeline "${pipelineId}"`, processorError);
          
          // Update metrics to reflect the failure
          this.recordFailure(pipeline);
        }
      }
      
      const duration = Date.now() - startTime;
      
      // Update metrics
      if (mergedOptions.trackMetrics) {
        this.updateMetrics(pipeline, duration, true);
      }
      
      // Emit processing complete event
      this.emit('processing-complete', {
        pipelineId,
        duration,
        success: true
      });
      
      return {
        success: true,
        data: currentData as TOutput,
        duration,
        pipelineId
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Update metrics to reflect the failure
      if (mergedOptions.trackMetrics) {
        this.updateMetrics(pipeline, duration, false);
      }
      
      // Emit processing error event
      this.emit('processing-error', {
        pipelineId,
        duration,
        error
      });
      
      // Report error
      ioErrorService.reportError({
        type: IOErrorType.PROCESSING,
        severity: IOErrorSeverity.ERROR,
        message: `Processing pipeline "${pipelineId}" failed`,
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration,
        pipelineId
      };
    }
  }
  
  /**
   * Execute a processor function with a timeout
   * @param processor Processor function
   * @param input Input data
   * @param timeoutMs Timeout in milliseconds
   */
  private async executeWithTimeout<TInput, TOutput>(
    processor: Processor<TInput, TOutput>,
    input: TInput,
    timeoutMs: number
  ): Promise<TOutput> {
    return new Promise<TOutput>((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`Processor timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      // Execute processor
      processor(input)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
  
  /**
   * Update pipeline metrics
   * @param pipeline Pipeline to update
   * @param duration Processing duration
   * @param success Whether processing was successful
   */
  private updateMetrics<TInput, TOutput>(
    pipeline: ProcessorPipeline<TInput, TOutput>,
    duration: number,
    success: boolean
  ): void {
    const metrics = pipeline.metrics;
    
    // Update processed count
    metrics.processedCount++;
    
    // Update last processed timestamp
    metrics.lastProcessed = Date.now();
    
    // Update average processing time using rolling average
    metrics.averageProcessingTime = 
      (metrics.averageProcessingTime * (metrics.processedCount - 1) + duration) / 
      metrics.processedCount;
    
    // Update success rate
    if (success) {
      // Formula: new_rate = old_rate + (1 - old_rate) / count
      metrics.successRate = metrics.successRate + ((100 - metrics.successRate) / metrics.processedCount);
    } else {
      // Formula: new_rate = old_rate - (old_rate / count)
      metrics.successRate = metrics.successRate - (metrics.successRate / metrics.processedCount);
    }
    
    // Ensure success rate stays within 0-100
    metrics.successRate = Math.max(0, Math.min(100, metrics.successRate));
    
    // Update pipeline with new metrics
    pipeline.metrics = metrics;
    this.pipelines.set(pipeline.id, pipeline);
  }
  
  /**
   * Record a processor failure without incrementing the processed count
   * @param pipeline Pipeline to update
   */
  private recordFailure<TInput, TOutput>(pipeline: ProcessorPipeline<TInput, TOutput>): void {
    const metrics = pipeline.metrics;
    
    // Update last processed timestamp
    metrics.lastProcessed = Date.now();
    
    // Update success rate
    metrics.successRate = metrics.successRate * 0.9; // Reduce by 10%
    
    // Update pipeline with new metrics
    pipeline.metrics = metrics;
    this.pipelines.set(pipeline.id, pipeline);
  }
  
  /**
   * Get a pipeline by ID
   * @param id Pipeline identifier
   */
  public getPipeline<TInput, TOutput>(id: string): ProcessorPipeline<TInput, TOutput> | undefined {
    return this.pipelines.get(id) as ProcessorPipeline<TInput, TOutput> | undefined;
  }
  
  /**
   * Get all registered pipelines
   */
  public getAllPipelines(): Array<ProcessorPipeline<any, any>> {
    return Array.from(this.pipelines.values());
  }
  
  /**
   * Enable a pipeline
   * @param id Pipeline identifier
   */
  public enablePipeline(id: string): boolean {
    const pipeline = this.pipelines.get(id);
    
    if (!pipeline) {
      return false;
    }
    
    pipeline.enabled = true;
    this.pipelines.set(id, pipeline);
    
    // Emit pipeline enabled event
    this.emit('pipeline-enabled', { id });
    
    return true;
  }
  
  /**
   * Disable a pipeline
   * @param id Pipeline identifier
   */
  public disablePipeline(id: string): boolean {
    const pipeline = this.pipelines.get(id);
    
    if (!pipeline) {
      return false;
    }
    
    pipeline.enabled = false;
    this.pipelines.set(id, pipeline);
    
    // Emit pipeline disabled event
    this.emit('pipeline-disabled', { id });
    
    return true;
  }
  
  /**
   * Delete a pipeline
   * @param id Pipeline identifier
   */
  public deletePipeline(id: string): boolean {
    // Check if pipeline exists
    if (!this.pipelines.has(id)) {
      return false;
    }
    
    // Delete pipeline
    this.pipelines.delete(id);
    
    // Emit pipeline deleted event
    this.emit('pipeline-deleted', { id });
    
    return true;
  }
  
  /**
   * Create a processor function from a transform function
   * @param transformFn Transform function
   */
  public createProcessor<TInput, TOutput>(
    transformFn: (input: TInput) => TOutput | Promise<TOutput>
  ): Processor<TInput, TOutput> {
    return async (input: TInput): Promise<TOutput> => {
      return transformFn(input);
    };
  }
  
  /**
   * Reset service state
   */
  public reset(): void {
    this.pipelines.clear();
    this.emit('reset');
  }
}

// Export singleton instance
export const processorService = ProcessorService.getInstance();
export default processorService;
