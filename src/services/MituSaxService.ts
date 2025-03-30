import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';

export interface MetricDataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

export interface StreamMetrics {
  latency: MetricDataPoint[];
  throughput: MetricDataPoint[];
  errors: MetricDataPoint[];
  quality: MetricDataPoint[];
  buffering: MetricDataPoint[];
}

export interface DeviceSyncStatus {
  deviceId: string;
  deviceType: string;
  lastSyncTime: number;
  syncDelay: number;
  status: 'in-sync' | 'out-of-sync' | 'offline';
}

/**
 * MituSax Service - Monitoring & Indexing Transaction Utility for Security And eXtensibility
 * Provides monitoring, analytics and synchronization capabilities across streaming devices
 */
export class MituSaxService extends EventEmitter {
  private static instance: MituSaxService;
  private metrics = new Map<string, StreamMetrics>();
  private syncStatus = new Map<string, DeviceSyncStatus>();
  private monitoringEnabled = true;
  private sampleRate = 5000; // ms
  private monitoringIntervals = new Map<string, NodeJS.Timeout>();

  private constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MituSaxService {
    if (!MituSaxService.instance) {
      MituSaxService.instance = new MituSaxService();
    }
    return MituSaxService.instance;
  }

  /**
   * Start monitoring a stream
   */
  public startMonitoring(streamId: string): boolean {
    if (!this.monitoringEnabled) return false;

    try {
      // Initialize metrics for this stream
      this.metrics.set(streamId, {
        latency: [],
        throughput: [],
        errors: [],
        quality: [],
        buffering: []
      });

      // Set up monitoring interval
      const interval = setInterval(() => {
        this.collectMetrics(streamId);
      }, this.sampleRate);

      this.monitoringIntervals.set(streamId, interval);
      
      this.emit('monitoring-started', { streamId });
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SONA_STREAMING,
        severity: IOErrorSeverity.WARNING,
        message: 'Failed to start stream monitoring',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      return false;
    }
  }

  /**
   * Stop monitoring a stream
   */
  public stopMonitoring(streamId: string): boolean {
    const interval = this.monitoringIntervals.get(streamId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(streamId);
      this.emit('monitoring-stopped', { streamId });
      return true;
    }
    return false;
  }

  /**
   * Get metrics for a stream
   */
  public getMetrics(streamId: string): StreamMetrics | null {
    return this.metrics.get(streamId) || null;
  }

  /**
   * Record a specific metric
   */
  public recordMetric(
    streamId: string, 
    metricType: keyof StreamMetrics, 
    value: number, 
    metadata?: Record<string, any>
  ): boolean {
    const metrics = this.metrics.get(streamId);
    if (!metrics) return false;

    const dataPoint: MetricDataPoint = {
      timestamp: Date.now(),
      value,
      metadata
    };

    metrics[metricType].push(dataPoint);
    
    // Limit the number of data points to prevent memory issues
    if (metrics[metricType].length > 100) {
      metrics[metricType] = metrics[metricType].slice(-100);
    }

    this.emit('metric-recorded', { 
      streamId, 
      metricType, 
      dataPoint 
    });
    
    return true;
  }

  /**
   * Register a device for synchronization
   */
  public registerDevice(deviceId: string, deviceType: string): DeviceSyncStatus {
    const status: DeviceSyncStatus = {
      deviceId,
      deviceType,
      lastSyncTime: Date.now(),
      syncDelay: 0,
      status: 'in-sync'
    };

    this.syncStatus.set(deviceId, status);
    this.emit('device-registered', status);
    return status;
  }

  /**
   * Synchronize playback across devices
   */
  public async synchronizeDevices(
    primaryDeviceId: string, 
    secondaryDeviceIds: string[]
  ): Promise<boolean> {
    try {
      const primaryStatus = this.syncStatus.get(primaryDeviceId);
      if (!primaryStatus) {
        throw new Error(`Primary device ${primaryDeviceId} not registered`);
      }

      // Update primary device sync time
      primaryStatus.lastSyncTime = Date.now();
      this.syncStatus.set(primaryDeviceId, primaryStatus);

      // Synchronize secondary devices
      for (const deviceId of secondaryDeviceIds) {
        const status = this.syncStatus.get(deviceId);
        if (status) {
          status.lastSyncTime = Date.now();
          status.syncDelay = Math.random() * 50; // Simulated network delay (ms)
          status.status = status.syncDelay < 30 ? 'in-sync' : 'out-of-sync';
          this.syncStatus.set(deviceId, status);
        }
      }

      this.emit('devices-synchronized', {
        primaryDeviceId,
        secondaryDeviceIds,
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SONA_STREAMING,
        severity: IOErrorSeverity.WARNING,
        message: 'Failed to synchronize devices',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      return false;
    }
  }

  /**
   * Generate analytics report for a stream
   */
  public generateReport(streamId: string): {
    streamId: string;
    duration: number;
    averageLatency: number;
    averageThroughput: number;
    errorRate: number;
    averageQuality: number;
    bufferingEvents: number;
  } | null {
    const metrics = this.metrics.get(streamId);
    if (!metrics) return null;

    // Calculate analytics
    const calculateAverage = (points: MetricDataPoint[]) => 
      points.length ? points.reduce((sum, p) => sum + p.value, 0) / points.length : 0;

    const firstPoint = this.findEarliestTimestamp(metrics);
    const lastPoint = this.findLatestTimestamp(metrics);
    const duration = firstPoint && lastPoint ? lastPoint - firstPoint : 0;

    return {
      streamId,
      duration,
      averageLatency: calculateAverage(metrics.latency),
      averageThroughput: calculateAverage(metrics.throughput),
      errorRate: metrics.errors.length / (duration / 60000 || 1), // errors per minute
      averageQuality: calculateAverage(metrics.quality),
      bufferingEvents: metrics.buffering.length
    };
  }

  /**
   * Get the sync status of registered devices
   */
  public getDeviceSyncStatus(): DeviceSyncStatus[] {
    return Array.from(this.syncStatus.values());
  }

  /**
   * Configure monitoring settings
   */
  public configure(options: { 
    enabled?: boolean; 
    sampleRate?: number;
  }): void {
    if (options.enabled !== undefined) {
      this.monitoringEnabled = options.enabled;
    }
    
    if (options.sampleRate !== undefined && options.sampleRate >= 1000) {
      this.sampleRate = options.sampleRate;
    }
  }

  /**
   * Collect metrics for a stream (internal method)
   */
  private collectMetrics(streamId: string): void {
    try {
      // In a real implementation, this would collect actual metrics
      // For this demo, we'll simulate some metrics
      
      // Simulate latency (20-200ms)
      this.recordMetric(streamId, 'latency', 20 + Math.random() * 180);
      
      // Simulate throughput (1-10 Mbps)
      this.recordMetric(streamId, 'throughput', 1 + Math.random() * 9);
      
      // Simulate quality (1-10 scale)
      this.recordMetric(streamId, 'quality', 5 + Math.random() * 5);
      
      // Occasionally simulate buffering events
      if (Math.random() < 0.1) {
        this.recordMetric(streamId, 'buffering', Math.random() * 2000);
      }
      
      // Rarely simulate errors
      if (Math.random() < 0.05) {
        this.recordMetric(streamId, 'errors', 1, { 
          errorType: 'network', 
          recoverable: true 
        });
      }
    } catch (error) {
      console.error('Error collecting metrics:', error);
    }
  }

  /**
   * Find the earliest timestamp in metrics
   */
  private findEarliestTimestamp(metrics: StreamMetrics): number {
    const timestamps = Object.values(metrics)
      .flatMap(metricArray => metricArray.map(point => point.timestamp))
      .filter(Boolean);
    
    return timestamps.length ? Math.min(...timestamps) : 0;
  }

  /**
   * Find the latest timestamp in metrics
   */
  private findLatestTimestamp(metrics: StreamMetrics): number {
    const timestamps = Object.values(metrics)
      .flatMap(metricArray => metricArray.map(point => point.timestamp))
      .filter(Boolean);
    
    return timestamps.length ? Math.max(...timestamps) : 0;
  }
}

// Export singleton
export const mituSaxService = MituSaxService.getInstance();
export default mituSaxService;
