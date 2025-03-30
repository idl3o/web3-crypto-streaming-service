import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { BitcoinPaymentService } from './BitcoinPaymentService';
import { mituSaxService } from './MituSaxService';

// Cache common values to avoid repeated object creation
const ERRORS = {
    CONTENT_ID: 'Content ID is required',
    PAYMENT_ADDRESS: 'Payment address is required',
    PAYMENT_AMOUNT: 'Payment amount must be greater than 0',
    DURATION: 'Stream duration must be greater than 0'
};

// Performance tracking interface
interface PerformanceMetrics {
    startTime: number;
    processingTime?: number;
    paymentConfirmationTime?: number;
    streamStartTime?: number;
    connectionLatency?: number;
    totalErrors: number;
    retryAttempts: number;
}

// Stream configuration interface
export interface SonaStreamConfig {
    contentId: string;
    streamQuality: 'low' | 'medium' | 'high' | 'ultra';
    paymentAddress: string;
    paymentAmount: number; // in satoshis
    duration: number; // in seconds
    enableMetrics?: boolean; // Track detailed performance metrics
    tags?: string[]; // Optional metadata tags
}

// Stream status interface
export interface SonaStreamingStatus {
    isActive: boolean;
    startTime?: number;
    endTime?: number;
    bytesDelivered: number;
    quality: string;
    paymentStatus: 'pending' | 'confirmed' | 'failed';
    metrics?: PerformanceMetrics;
}

export class SonaStreamingService extends EventEmitter {
    private static instance: SonaStreamingService;
    private activeStreams = new Map<string, SonaStreamingStatus>();
    private reconnectAttempts = new Map<string, number>();
    private streamIntervals = new Map<string, NodeJS.Timeout>();
    private paymentCheckers = new Map<string, NodeJS.Timeout>();
    private paymentTimeouts = new Map<string, NodeJS.Timeout>();
    private performanceMetrics = new Map<string, PerformanceMetrics>();
    private readonly MAX_RECONNECT_ATTEMPTS = 3;
    private readonly STREAM_UPDATE_INTERVAL = 1000; // Update interval in ms
    private readonly PAYMENT_CHECK_INTERVAL = 5000; // Payment check interval in ms
    private readonly PAYMENT_TIMEOUT = 15 * 60 * 1000; // 15 minutes
    private readonly QUALITY_VALUES = ['low', 'medium', 'high', 'ultra'];
    private isDebugMode = false;

    private constructor(
        private readonly paymentService: BitcoinPaymentService
    ) {
        super();
        
        // Set maximum event listeners to avoid memory leak warnings
        this.setMaxListeners(100);
        
        // Check if debug mode is enabled
        this.isDebugMode = process.env.DEBUG_SONA_SERVICE === 'true';

        // Initialize with environment settings
        this.initFromEnvironment();
        
        // Periodically clean up inactive streams
        setInterval(() => this.cleanupInactiveStreams(), 30 * 60 * 1000); // Every 30 minutes
        
        this.log('SonaStreamingService initialized');
    }

    /**
     * Initialize settings from environment variables
     */
    private initFromEnvironment(): void {
        // Allow configuration via environment variables
        const reconnectAttempts = process.env.SONA_MAX_RECONNECT_ATTEMPTS;
        if (reconnectAttempts && !isNaN(parseInt(reconnectAttempts))) {
            this.MAX_RECONNECT_ATTEMPTS = parseInt(reconnectAttempts);
        }
        
        this.log(`Max reconnect attempts set to: ${this.MAX_RECONNECT_ATTEMPTS}`);
    }

    public static getInstance(paymentService?: BitcoinPaymentService): SonaStreamingService {
        if (!SonaStreamingService.instance) {
            if (!paymentService) {
                throw new Error('Payment service must be provided when initializing SonaStreamingService');
            }
            SonaStreamingService.instance = new SonaStreamingService(paymentService);
        }
        return SonaStreamingService.instance;
    }

    /**
     * Start a new Sona stream
     * @param config Stream configuration
     */
    public async startStream(config: SonaStreamConfig): Promise<string> {
        const startTime = Date.now();
        let streamId: string | null = null;

        try {
            // Validate configuration
            this.validateStreamConfig(config);
            
            this.log('Starting stream with config:', config);
            
            // Initialize performance metrics if enabled
            if (config.enableMetrics) {
                this.performanceMetrics.set(streamId || 'pre-init', {
                    startTime,
                    totalErrors: 0,
                    retryAttempts: 0
                });
            }
            
            // Create payment request - optimize with destructuring and single calculation
            const btcAmount = config.paymentAmount / 100_000_000; // Convert satoshis to BTC
            const { paymentId, paymentUri } = await this.paymentService.createPaymentRequest(
                config.contentId,
                btcAmount,
                config.paymentAddress
            );
            
            this.log('Payment request created:', { paymentId, contentId: config.contentId });
            
            // Generate stream ID with more efficient random string generation
            streamId = `sona-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
            
            // Update metrics with stream ID
            if (config.enableMetrics && streamId) {
                const metrics = this.performanceMetrics.get('pre-init');
                if (metrics) {
                    this.performanceMetrics.delete('pre-init');
                    this.performanceMetrics.set(streamId, metrics);
                }
            }
            
            // Initialize stream status
            this.activeStreams.set(streamId, {
                isActive: false,
                bytesDelivered: 0,
                quality: config.streamQuality,
                paymentStatus: 'pending',
                metrics: config.enableMetrics ? {
                    startTime,
                    totalErrors: 0,
                    retryAttempts: 0,
                    processingTime: Date.now() - startTime
                } : undefined
            });
            
            // When payment is confirmed, start actual streaming
            this.waitForPaymentConfirmation(streamId, paymentId, config);
            
            // Start monitoring if MituSax service is available
            if (typeof mituSaxService !== 'undefined' && mituSaxService.startMonitoring) {
                mituSaxService.startMonitoring(streamId);
                this.log('MituSax monitoring started for stream:', streamId);
            }
            
            return streamId;
        } catch (error) {
            // Track error in metrics
            if (streamId && this.performanceMetrics.has(streamId)) {
                const metrics = this.performanceMetrics.get(streamId);
                if (metrics) {
                    metrics.totalErrors++;
                    this.performanceMetrics.set(streamId, metrics);
                }
            }
            
            // Report error to IO Error Service
            const errorDetails = error instanceof Error ? error.message : String(error);
            
            this.log('Failed to start stream:', errorDetails, 'error');
            
            ioErrorService.reportError({
                type: IOErrorType.SONA_STREAMING,
                severity: IOErrorSeverity.ERROR,
                message: 'Failed to start Sona stream',
                details: errorDetails,
                retryable: true,
                error: error instanceof Error ? error : new Error(String(error))
            });
            
            throw error;
        }
    }

    /**
     * Stop an active stream
     * @param streamId The ID of the stream to stop
     */
    public stopStream(streamId: string): boolean {
        try {
            const stream = this.activeStreams.get(streamId);
            if (!stream) {
                throw new Error(`Stream with ID ${streamId} not found`);
            }
            
            this.log(`Stopping stream: ${streamId}`);
            
            // Update stream status
            stream.isActive = false;
            stream.endTime = Date.now();
            this.activeStreams.set(streamId, stream);
            
            // Clean up resources
            this.cleanupStreamResources(streamId);
            
            // Stop MituSax monitoring if available
            if (typeof mituSaxService !== 'undefined' && mituSaxService.stopMonitoring) {
                mituSaxService.stopMonitoring(streamId);
            }
            
            // Emit event
            this.emit('stream-ended', { streamId, status: stream });
            
            return true;
        } catch (error) {
            const errorDetails = error instanceof Error ? error.message : String(error);
            this.log(`Error stopping stream ${streamId}: ${errorDetails}`, 'error');
            
            ioErrorService.reportError({
                type: IOErrorType.SONA_STREAMING,
                severity: IOErrorSeverity.WARNING,
                message: 'Error stopping Sona stream',
                details: errorDetails,
                retryable: false,
                error: error instanceof Error ? error : new Error(String(error))
            });
            
            return false;
        }
    }

    /**
     * Get the status of a stream
     * @param streamId The ID of the stream
     */
    public getStreamStatus(streamId: string): SonaStreamingStatus | null {
        // Enhance status with MituSax metrics if available
        const status = this.activeStreams.get(streamId);
        
        if (status && typeof mituSaxService !== 'undefined' && mituSaxService.getMetrics) {
            try {
                const mituMetrics = mituSaxService.getMetrics(streamId);
                if (mituMetrics) {
                    // Extract recent metrics data for enrichment
                    const latestLatency = mituMetrics.latency[mituMetrics.latency.length - 1]?.value;
                    const errorCount = mituMetrics.errors.length;
                    
                    // Enhance the status with these metrics
                    if (status.metrics) {
                        status.metrics.connectionLatency = latestLatency;
                        // Only update errors if we have error data
                        if (errorCount > 0) {
                            status.metrics.totalErrors = errorCount;
                        }
                    }
                }
            } catch (error) {
                // Silently fail - metrics enhancement is optional
                this.log('Error enriching stream status with metrics', String(error), 'warn');
            }
        }
        
        return status;
    }

    /**
     * Handle stream error and attempt recovery
     * @param streamId The ID of the stream with an error
     * @param error The error that occurred
     */
    public async handleStreamError(streamId: string, error: Error): Promise<boolean> {
        // Get current reconnect attempt count
        const attempts = this.reconnectAttempts.get(streamId) || 0;
        
        this.log(`Handling error for stream ${streamId}, attempt ${attempts + 1}/${this.MAX_RECONNECT_ATTEMPTS}`, error.message, 'warn');
        
        // Track error in metrics
        if (this.performanceMetrics.has(streamId)) {
            const metrics = this.performanceMetrics.get(streamId);
            if (metrics) {
                metrics.totalErrors++;
                metrics.retryAttempts = attempts + 1;
                this.performanceMetrics.set(streamId, metrics);
            }
        }
        
        // Check if we can reconnect
        if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
            this.log(`Maximum reconnection attempts reached for stream ${streamId}`, error.message, 'error');
            
            ioErrorService.reportError({
                type: IOErrorType.SONA_STREAMING,
                severity: IOErrorSeverity.ERROR,
                message: 'Maximum reconnection attempts reached for Sona stream',
                details: `Stream ID: ${streamId}, Error: ${error.message}`,
                retryable: false,
                error
            });
            
            // Update stream status
            const stream = this.activeStreams.get(streamId);
            if (stream) {
                stream.isActive = false;
                this.activeStreams.set(streamId, stream);
                this.emit('stream-failed', { streamId, error });
            }
            
            return false;
        }
        
        // Attempt reconnection
        try {
            // Increment attempt counter
            this.reconnectAttempts.set(streamId, attempts + 1);
            
            this.log(`Attempting to reconnect stream ${streamId}, attempt ${attempts + 1}`);
            
            // Emit reconnection event
            this.emit('stream-reconnecting', { 
                streamId, 
                attempt: attempts + 1,
                maxAttempts: this.MAX_RECONNECT_ATTEMPTS
            });
            
            // Exponential backoff - calculate once
            const backoffTime = 1000 * Math.pow(2, attempts);
            
            // Wait briefly before reconnecting
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            
            // Update stream status on successful reconnection
            const stream = this.activeStreams.get(streamId);
            if (stream) {
                stream.isActive = true;
                this.activeStreams.set(streamId, stream);
                this.emit('stream-reconnected', { streamId });
            }
            
            this.log(`Successfully reconnected stream ${streamId}`);
            return true;
        } catch (reconnectError) {
            const errorMessage = reconnectError instanceof Error ? reconnectError.message : String(reconnectError);
            
            this.log(`Failed to reconnect stream ${streamId}`, errorMessage, 'error');
            
            ioErrorService.reportError({
                type: IOErrorType.SONA_CONNECTION,
                severity: IOErrorSeverity.ERROR,
                message: 'Failed to reconnect Sona stream',
                details: `Stream ID: ${streamId}, Attempt: ${attempts + 1}, Error: ${errorMessage}`,
                retryable: attempts < this.MAX_RECONNECT_ATTEMPTS - 1,
                error: reconnectError instanceof Error ? reconnectError : new Error(errorMessage)
            });
            
            return false;
        }
    }

    /**
     * Get performance metrics for the specified stream
     * @param streamId Stream ID to get metrics for
     */
    public getPerformanceMetrics(streamId: string): PerformanceMetrics | null {
        return this.performanceMetrics.get(streamId) || null;
    }

    /**
     * Get statistics across all streams
     */
    public getStreamStatistics(): {
        activeStreamCount: number;
        totalBytesDelivered: number;
        averageLatency?: number;
        totalErrors: number;
    } {
        let totalBytes = 0;
        let totalLatency = 0;
        let latencyCount = 0;
        let totalErrors = 0;

        for (const stream of this.activeStreams.values()) {
            if (stream.isActive) {
                totalBytes += stream.bytesDelivered || 0;
            }
            
            if (stream.metrics) {
                if (stream.metrics.connectionLatency) {
                    totalLatency += stream.metrics.connectionLatency;
                    latencyCount++;
                }
                totalErrors += stream.metrics.totalErrors || 0;
            }
        }

        return {
            activeStreamCount: [...this.activeStreams.values()].filter(s => s.isActive).length,
            totalBytesDelivered: totalBytes,
            averageLatency: latencyCount > 0 ? totalLatency / latencyCount : undefined,
            totalErrors
        };
    }

    /**
     * Clean up all resources associated with a stream
     * @param streamId The ID of the stream to clean up
     */
    private cleanupStreamResources(streamId: string): void {
        // Clear intervals and timeouts
        const interval = this.streamIntervals.get(streamId);
        if (interval) {
            clearInterval(interval);
            this.streamIntervals.delete(streamId);
        }
        
        const checker = this.paymentCheckers.get(streamId);
        if (checker) {
            clearInterval(checker);
            this.paymentCheckers.delete(streamId);
        }
        
        const timeout = this.paymentTimeouts.get(streamId);
        if (timeout) {
            clearTimeout(timeout);
            this.paymentTimeouts.delete(streamId);
        }
        
        // Clean up other resources
        this.reconnectAttempts.delete(streamId);
    }

    /**
     * Periodically clean up inactive streams to prevent memory leaks
     */
    private cleanupInactiveStreams(): void {
        const now = Date.now();
        const inactiveThreshold = 24 * 60 * 60 * 1000; // 24 hours
        let cleanedCount = 0;
        
        for (const [streamId, stream] of this.activeStreams) {
            // Remove streams that have ended over 24 hours ago
            if (!stream.isActive && stream.endTime && (now - stream.endTime) > inactiveThreshold) {
                this.activeStreams.delete(streamId);
                this.cleanupStreamResources(streamId);
                this.performanceMetrics.delete(streamId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            this.log(`Cleaned up ${cleanedCount} inactive streams, active streams remaining: ${this.activeStreams.size}`);
        }
    }

    /**
     * Wait for payment confirmation before starting stream
     */
    private waitForPaymentConfirmation(
        streamId: string, 
        paymentId: string, 
        config: SonaStreamConfig
    ): void {
        const paymentStartTime = Date.now();
        
        try {
            this.log(`Waiting for payment confirmation for stream ${streamId}, payment ID: ${paymentId}`);
            
            // Set up payment status checking interval
            const checkInterval = setInterval(async () => {
                try {
                    const status = await this.paymentService.checkPaymentStatus(paymentId);
                    
                    if (status.status === 'confirmed') {
                        // Track payment confirmation time
                        const confirmationTime = Date.now() - paymentStartTime;
                        
                        // Update metrics
                        if (this.performanceMetrics.has(streamId)) {
                            const metrics = this.performanceMetrics.get(streamId);
                            if (metrics) {
                                metrics.paymentConfirmationTime = confirmationTime;
                                this.performanceMetrics.set(streamId, metrics);
                            }
                        }
                        
                        this.log(`Payment confirmed for stream ${streamId} after ${confirmationTime}ms`);
                        
                        // Payment confirmed, start stream
                        clearInterval(checkInterval);
                        this.paymentCheckers.delete(streamId);
                        
                        // Clear timeout if it exists
                        const timeout = this.paymentTimeouts.get(streamId);
                        if (timeout) {
                            clearTimeout(timeout);
                            this.paymentTimeouts.delete(streamId);
                        }
                        
                        this.startActualStream(streamId, config);
                        
                        // Update payment status
                        const stream = this.activeStreams.get(streamId);
                        if (stream) {
                            stream.paymentStatus = 'confirmed';
                            this.activeStreams.set(streamId, stream);
                        }
                    } else if (status.status === 'failed') {
                        this.log(`Payment failed for stream ${streamId}`, 'error');
                        
                        // Payment failed
                        clearInterval(checkInterval);
                        this.paymentCheckers.delete(streamId);
                        
                        // Clear timeout if it exists
                        const timeout = this.paymentTimeouts.get(streamId);
                        if (timeout) {
                            clearTimeout(timeout);
                            this.paymentTimeouts.delete(streamId);
                        }
                        
                        // Update payment status
                        const stream = this.activeStreams.get(streamId);
                        if (stream) {
                            stream.paymentStatus = 'failed';
                            stream.isActive = false;
                            this.activeStreams.set(streamId, stream);
                        }
                        
                        // Report error
                        ioErrorService.reportError({
                            type: IOErrorType.SONA_PAYMENT,
                            severity: IOErrorSeverity.WARNING,
                            message: 'Payment failed for Sona stream',
                            details: `Stream ID: ${streamId}, Payment ID: ${paymentId}`,
                            retryable: true
                        });
                        
                        // Emit event
                        this.emit('payment-failed', { streamId, paymentId });
                    }
                } catch (error) {
                    this.log(`Error checking payment status for stream ${streamId}`, String(error), 'error');
                }
            }, this.PAYMENT_CHECK_INTERVAL);
            
            // Store the interval for cleanup
            this.paymentCheckers.set(streamId, checkInterval);
            
            // Set a timeout for payment confirmation
            const timeoutId = setTimeout(() => {
                // Clear the interval
                clearInterval(checkInterval);
                this.paymentCheckers.delete(streamId);
                
                this.log(`Payment timeout for stream ${streamId} after ${this.PAYMENT_TIMEOUT / 1000} seconds`, 'warn');
                
                // Check if the stream is already active
                const stream = this.activeStreams.get(streamId);
                if (stream && stream.paymentStatus !== 'confirmed') {
                    stream.paymentStatus = 'failed';
                    stream.isActive = false;
                    this.activeStreams.set(streamId, stream);
                    
                    // Report error
                    ioErrorService.reportError({
                        type: IOErrorType.SONA_PAYMENT,
                        severity: IOErrorSeverity.WARNING,
                        message: 'Payment confirmation timeout for Sona stream',
                        details: `Stream ID: ${streamId}, Payment ID: ${paymentId}`,
                        retryable: true
                    });
                    
                    // Emit event
                    this.emit('payment-timeout', { streamId, paymentId });
                }
                
                // Remove the timeout reference
                this.paymentTimeouts.delete(streamId);
            }, this.PAYMENT_TIMEOUT);
            
            // Store the timeout for cleanup
            this.paymentTimeouts.set(streamId, timeoutId);
            
        } catch (error) {
            this.log(`Error setting up payment confirmation for stream ${streamId}`, String(error), 'error');
            
            ioErrorService.reportError({
                type: IOErrorType.SONA_PAYMENT,
                severity: IOErrorSeverity.ERROR,
                message: 'Error while waiting for payment confirmation',
                details: error instanceof Error ? error.message : String(error),
                retryable: true,
                error: error instanceof Error ? error : new Error(String(error))
            });
        }
    }

    /**
     * Start the actual stream after payment is confirmed
     */
    private startActualStream(streamId: string, config: SonaStreamConfig): void {
        const streamStartTime = Date.now();
        
        try {
            this.log(`Starting actual stream for ${streamId}`);
            
            // Update metrics
            if (this.performanceMetrics.has(streamId)) {
                const metrics = this.performanceMetrics.get(streamId);
                if (metrics) {
                    metrics.streamStartTime = streamStartTime;
                    this.performanceMetrics.set(streamId, metrics);
                }
            }
            
            // Get the current time once
            const now = streamStartTime;
            
            // Update stream status
            const stream = this.activeStreams.get(streamId);
            if (stream) {
                stream.isActive = true;
                stream.startTime = now;
                stream.endTime = now + (config.duration * 1000);
                this.activeStreams.set(streamId, stream);
            }
            
            // Emit stream started event
            this.emit('stream-started', { streamId, config });
            
            // Simulate stream progress efficiently
            let bytesDelivered = 0;
            let lastEmitTime = 0;
            const averageBytesPerSecond = 1_000_000; // 1MB per second
            const updateInterval = setInterval(() => {
                // Try-catch for safety - don't let errors crash the interval
                try {
                    // Calculate elapsed time since last update
                    const now = Date.now();
                    const stream = this.activeStreams.get(streamId);
                    
                    if (stream) {
                        // Simulate variable bit rate based on quality
                        const qualityMultiplier = this.getQualityMultiplier(stream.quality);
                        const elapsedSinceLastUpdate = (now - lastEmitTime) / 1000;
                        
                        // Update bytes delivered based on elapsed time and quality
                        const newBytes = Math.floor(averageBytesPerSecond * qualityMultiplier * elapsedSinceLastUpdate);
                        bytesDelivered += newBytes;
                        stream.bytesDelivered = bytesDelivered;
                        
                        this.activeStreams.set(streamId, stream);
                        lastEmitTime = now;
                        
                        // Throttle progress events (emit only every second)
                        if (now % 1000 < 100) {
                            this.emit('stream-progress', { 
                                streamId, 
                                bytesDelivered,
                                quality: stream.quality
                            });
                        }
                        
                        // Check if stream should end
                        if (stream.endTime && now > stream.endTime) {
                            clearInterval(updateInterval);
                            this.streamIntervals.delete(streamId);
                            this.stopStream(streamId);
                        }
                    } else {
                        // Stream no longer exists, clean up
                        clearInterval(updateInterval);
                        this.streamIntervals.delete(streamId);
                    }
                } catch (error) {
                    this.log(`Error in stream update interval for ${streamId}`, String(error), 'error');
                }
            }, this.STREAM_UPDATE_INTERVAL);
            
            // Store interval reference for cleanup
            this.streamIntervals.set(streamId, updateInterval);
            
            // Set initial last emit time
            lastEmitTime = now;
            
        } catch (error) {
            this.log(`Error starting actual stream for ${streamId}`, String(error), 'error');
            
            ioErrorService.reportError({
                type: IOErrorType.SONA_STREAMING,
                severity: IOErrorSeverity.ERROR,
                message: 'Error starting Sona stream',
                details: error instanceof Error ? error.message : String(error),
                retryable: true,
                error: error instanceof Error ? error : new Error(String(error))
            });
        }
    }
    
    /**
     * Get multiplier for stream quality 
     */
    private getQualityMultiplier(quality: string): number {
        switch(quality) {
            case 'low': return 0.5;
            case 'medium': return 1.0;
            case 'high': return 2.0;
            case 'ultra': return 4.0;
            default: return 1.0;
        }
    }

    /**
     * Validate stream configuration
     */
    private validateStreamConfig(config: SonaStreamConfig): void {
        // Required fields validation
        if (!config.contentId) {
            throw new Error(ERRORS.CONTENT_ID);
        }
        
        if (!config.paymentAddress) {
            throw new Error(ERRORS.PAYMENT_ADDRESS);
        }
        
        if (!config.paymentAmount || config.paymentAmount <= 0) {
            throw new Error(ERRORS.PAYMENT_AMOUNT);
        }
        
        if (!config.duration || config.duration <= 0) {
            throw new Error(ERRORS.DURATION);
        }
        
        // Validate stream quality efficiently using precomputed array
        if (!this.QUALITY_VALUES.includes(config.streamQuality)) {
            throw new Error(`Invalid stream quality: ${config.streamQuality}. Must be one of: ${this.QUALITY_VALUES.join(', ')}`);
        }

        // If tags are provided, ensure they're properly formatted
        if (config.tags && Array.isArray(config.tags)) {
            for (const tag of config.tags) {
                if (typeof tag !== 'string' || tag.length < 1) {
                    throw new Error('Tags must be non-empty strings');
                }
                
                if (tag.length > 50) {
                    throw new Error('Tags must be 50 characters or less');
                }
            }
        }
    }
    
    /**
     * Internal logging function
     * @param message Main log message
     * @param details Optional details to include
     * @param level Log level
     */
    private log(message: string, details?: string, level: 'log' | 'warn' | 'error' = 'log'): void {
        // Only log in debug mode or on higher levels
        if (this.isDebugMode || level === 'warn' || level === 'error') {
            const timestamp = new Date().toISOString();
            const formattedMessage = `[SonaStreaming ${timestamp}] ${message}`;
            
            switch (level) {
                case 'warn':
                    console.warn(formattedMessage, details || '');
                    break;
                case 'error':
                    console.error(formattedMessage, details || '');
                    break;
                default:
                    console.log(formattedMessage, details || '');
            }
        }
    }
}

// Export singleton - optimize with memoization
let sonaInstance: SonaStreamingService | null = null;
export const sonaStreamingService = (paymentService?: BitcoinPaymentService): SonaStreamingService => {
    if (!sonaInstance && paymentService) {
        sonaInstance = SonaStreamingService.getInstance(paymentService);
    }
    return sonaInstance || SonaStreamingService.getInstance(paymentService);
};

export default sonaStreamingService;
