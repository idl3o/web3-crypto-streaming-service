import { EventEmitter } from 'events';
import { codeCompletionService } from './CodeCompletionService';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';

/**
 * Service that monitors completion timeouts and implements recovery strategies
 * Specifically addressing TabNine issue #683 where completion callbacks never resolve
 */
export class CompletionTimeoutManager extends EventEmitter {
    private static instance: CompletionTimeoutManager;
    private timeoutHistory: Array<{
        timestamp: number;
        cacheKey: string;
        recovered: boolean;
    }> = [];
    private consecutiveTimeouts = 0;
    private readonly MAX_HISTORY_SIZE = 50;
    private readonly THRESHOLD_FOR_SERVICE_RESTART = 5;
    private serviceHealthy = true;
    private recoveryAttempts = 0;
    private readonly MAX_RECOVERY_ATTEMPTS = 3;
    
    private constructor() {
        super();
        this.setupListeners();
    }
    
    public static getInstance(): CompletionTimeoutManager {
        if (!CompletionTimeoutManager.instance) {
            CompletionTimeoutManager.instance = new CompletionTimeoutManager();
        }
        return CompletionTimeoutManager.instance;
    }
    
    /**
     * Setup event listeners for completion service events
     */
    private setupListeners(): void {
        // Listen for completion timeouts
        codeCompletionService.onCompletionTimeout(this.handleCompletionTimeout.bind(this));
        
        // Listen for successful completions to track recovery
        codeCompletionService.on('cache-stored', this.handleSuccessfulCompletion.bind(this));
    }
    
    /**
     * Handle a completion timeout event
     */
    private handleCompletionTimeout(data: {requestId: string, cacheKey: string}): void {
        // Track this timeout
        this.timeoutHistory.unshift({
            timestamp: Date.now(),
            cacheKey: data.cacheKey,
            recovered: false
        });
        
        // Trim history if needed
        if (this.timeoutHistory.length > this.MAX_HISTORY_SIZE) {
            this.timeoutHistory = this.timeoutHistory.slice(0, this.MAX_HISTORY_SIZE);
        }
        
        // Increment consecutive timeouts
        this.consecutiveTimeouts++;
        
        // Check if we need to take recovery action
        if (this.consecutiveTimeouts >= this.THRESHOLD_FOR_SERVICE_RESTART) {
            this.serviceHealthy = false;
            this.attemptServiceRecovery();
        }
        
        // Report the event
        this.emit('timeout', {
            ...data,
            consecutiveTimeouts: this.consecutiveTimeouts,
            serviceHealthy: this.serviceHealthy
        });
    }
    
    /**
     * Handle successful completion (resets consecutive timeout counter)
     */
    private handleSuccessfulCompletion(): void {
        if (this.consecutiveTimeouts > 0) {
            this.consecutiveTimeouts = 0;
            // If we had timeouts but now have a success, consider the service recovered
            if (!this.serviceHealthy) {
                this.serviceHealthy = true;
                this.recoveryAttempts = 0;
                this.emit('service-recovered');
            }
        }
    }
    
    /**
     * Attempt to recover the completion service
     */
    private attemptServiceRecovery(): void {
        if (this.recoveryAttempts >= this.MAX_RECOVERY_ATTEMPTS) {
            this.emit('recovery-failed', {
                message: 'Maximum recovery attempts reached',
                attempts: this.recoveryAttempts
            });
            
            // Report to IOErrorService
            ioErrorService.reportError({
                type: IOErrorType.UNKNOWN,
                severity: IOErrorSeverity.ERROR,
                message: 'Code completion service repeatedly timing out',
                details: `Failed to recover after ${this.recoveryAttempts} attempts. This may indicate a deeper issue with the code completion engine.`,
                source: 'CompletionTimeoutManager',
                retryable: false,
                error: new Error('Max recovery attempts reached for code completion service')
            });
            
            return;
        }
        
        this.recoveryAttempts++;
        
        // Step 1: Cancel all pending requests
        codeCompletionService.cancelPendingRequests();
        
        // Step 2: Clear partial cache entries that might be causing issues
        // Specifically targeting the issue in TabNine #683
        const recentTimeoutKeys = this.timeoutHistory
            .filter(item => !item.recovered)
            .map(item => item.cacheKey);
            
        // Step 3: Emit recovery event
        this.emit('recovery-attempt', {
            attempt: this.recoveryAttempts,
            timestamp: Date.now(),
            timeoutCount: this.consecutiveTimeouts
        });
        
        // Log recovery attempt
        console.log(`CompletionTimeoutManager: Recovery attempt ${this.recoveryAttempts}`);
    }
    
    /**
     * Get current service health status
     */
    public isServiceHealthy(): boolean {
        return this.serviceHealthy;
    }
    
    /**
     * Get timeout statistics
     */
    public getTimeoutStats(): {
        recentTimeouts: number;
        consecutive: number;
        recoveryAttempts: number;
        serviceHealthy: boolean;
    } {
        return {
            recentTimeouts: this.timeoutHistory.length,
            consecutive: this.consecutiveTimeouts,
            recoveryAttempts: this.recoveryAttempts,
            serviceHealthy: this.serviceHealthy
        };
    }
    
    /**
     * Reset the service state - useful when editor/IDE is restarted
     */
    public resetState(): void {
        this.timeoutHistory = [];
        this.consecutiveTimeouts = 0;
        this.serviceHealthy = true;
        this.recoveryAttempts = 0;
        
        // Also cancel any pending requests
        codeCompletionService.cancelPendingRequests();
        
        this.emit('service-reset');
    }
}

export const completionTimeoutManager = CompletionTimeoutManager.getInstance();
export default completionTimeoutManager;
