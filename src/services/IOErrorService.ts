import { EventEmitter } from 'events';

export enum IOErrorSeverity {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical'
}

export enum IOErrorType {
    FILE_READ = 'file_read',
    FILE_WRITE = 'file_write',
    FILE_DELETE = 'file_delete',
    NETWORK_REQUEST = 'network_request',
    NETWORK_RESPONSE = 'network_response',
    IPFS_UPLOAD = 'ipfs_upload',
    IPFS_DOWNLOAD = 'ipfs_download',
    BLOCKCHAIN_READ = 'blockchain_read',
    BLOCKCHAIN_WRITE = 'blockchain_write',
    UNKNOWN = 'unknown',
    SONA_STREAMING = 'sona_streaming',
    SONA_CONNECTION = 'sona_connection',
    SONA_AUTHENTICATION = 'sona_authentication',
    SONA_PAYMENT = 'sona_payment'
}

export interface IOError {
    id: string;
    timestamp: number;
    type: IOErrorType;
    severity: IOErrorSeverity;
    message: string;
    details?: string;
    source?: string;
    fileName?: string;
    fileSize?: number;
    url?: string;
    retryable: boolean;
    error?: Error;
}

/**
 * Service for handling and managing IO errors across the application
 */
export class IOErrorService extends EventEmitter {
    private errors: IOError[] = [];
    private readonly maxErrorHistory: number;
    private static instance: IOErrorService;
    private errorCount: Record<IOErrorType, number> = {} as Record<IOErrorType, number>;
    private severityCount: Record<IOErrorSeverity, number> = {} as Record<IOErrorSeverity, number>;

    /**
     * Creates a new IO Error Service
     * @param maxErrorHistory Maximum number of errors to keep in history
     */
    constructor(maxErrorHistory: number = 100) {
        super();
        this.maxErrorHistory = maxErrorHistory;

        // Initialize error counts
        Object.values(IOErrorType).forEach(type => {
            this.errorCount[type] = 0;
        });

        // Initialize severity counts
        Object.values(IOErrorSeverity).forEach(severity => {
            this.severityCount[severity] = 0;
        });
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): IOErrorService {
        if (!IOErrorService.instance) {
            IOErrorService.instance = new IOErrorService();
        }
        return IOErrorService.instance;
    }

    /**
     * Report a new IO error
     * @param errorData The error data to report
     * @returns The created error object
     */
    public reportError(errorData: Omit<IOError, 'id' | 'timestamp'>): IOError {
        const error: IOError = {
            id: this.generateErrorId(),
            timestamp: Date.now(),
            ...errorData
        };

        // Add to history
        this.errors.unshift(error);

        // Trim history if needed
        if (this.errors.length > this.maxErrorHistory) {
            this.errors = this.errors.slice(0, this.maxErrorHistory);
        }

        // Update counts
        this.errorCount[error.type]++;
        this.severityCount[error.severity]++;

        // Emit error events
        this.emit('error', error);
        this.emit(`error:${error.type}`, error);
        this.emit(`severity:${error.severity}`, error);

        // Additional special event for critical errors
        if (error.severity === IOErrorSeverity.CRITICAL) {
            this.emit('critical-error', error);
        }

        return error;
    }

    /**
     * Get all errors in the history
     */
    public getErrors(): IOError[] {
        return [...this.errors];
    }

    /**
     * Get errors filtered by type
     * @param type The error type to filter by
     */
    public getErrorsByType(type: IOErrorType): IOError[] {
        return this.errors.filter(error => error.type === type);
    }

    /**
     * Get errors filtered by severity
     * @param severity The error severity to filter by
     */
    public getErrorsBySeverity(severity: IOErrorSeverity): IOError[] {
        return this.errors.filter(error => error.severity === severity);
    }

    /**
     * Get error count statistics
     */
    public getErrorStats(): { byType: Record<IOErrorType, number>, bySeverity: Record<IOErrorSeverity, number> } {
        return {
            byType: { ...this.errorCount },
            bySeverity: { ...this.severityCount }
        };
    }

    /**
     * Get the most frequent error type
     */
    public getMostFrequentErrorType(): { type: IOErrorType, count: number } | null {
        if (this.errors.length === 0) return null;

        let maxType = Object.keys(this.errorCount)[0] as IOErrorType;
        let maxCount = this.errorCount[maxType];

        Object.keys(this.errorCount).forEach(type => {
            const typedKey = type as IOErrorType;
            if (this.errorCount[typedKey] > maxCount) {
                maxType = typedKey;
                maxCount = this.errorCount[typedKey];
            }
        });

        return { type: maxType, count: maxCount };
    }

    /**
     * Find errors matching specific criteria
     * @param matcher Matcher function
     */
    public findErrors(matcher: (error: IOError) => boolean): IOError[] {
        return this.errors.filter(matcher);
    }

    /**
     * Clear all errors from history
     */
    public clearErrors(): void {
        this.errors = [];

        // Reset counts
        Object.values(IOErrorType).forEach(type => {
            this.errorCount[type] = 0;
        });

        Object.values(IOErrorSeverity).forEach(severity => {
            this.severityCount[severity] = 0;
        });

        this.emit('clear');
    }

    /**
     * Check if an error can be retried
     * @param errorId The ID of the error to check
     */
    public isRetryable(errorId: string): boolean {
        const error = this.errors.find(e => e.id === errorId);
        return error ? error.retryable : false;
    }

    /**
     * Mark an error as retried
     * @param errorId The ID of the error to mark
     * @param success Whether the retry was successful
     */
    public markErrorRetried(errorId: string, success: boolean): boolean {
        const errorIndex = this.errors.findIndex(e => e.id === errorId);
        if (errorIndex === -1) return false;

        // Create updated error with retry information
        const error = this.errors[errorIndex];
        const updatedError: IOError = {
            ...error,
            details: `${error.details || ''}\nRetried: ${success ? 'Successfully' : 'Failed'} at ${new Date().toISOString()}`
        };

        // Replace the error in the array
        this.errors[errorIndex] = updatedError;

        // Emit retry event
        this.emit('retry', { error: updatedError, success });

        return true;
    }

    /**
     * Subscribe to all errors
     * @param listener The listener function
     */
    public onError(listener: (error: IOError) => void): this {
        return this.on('error', listener);
    }

    /**
     * Subscribe to errors of a specific type
     * @param type The error type to listen for
     * @param listener The listener function
     */
    public onErrorType(type: IOErrorType, listener: (error: IOError) => void): this {
        return this.on(`error:${type}`, listener);
    }

    /**
     * Subscribe to errors of a specific severity
     * @param severity The error severity to listen for
     * @param listener The listener function
     */
    public onErrorSeverity(severity: IOErrorSeverity, listener: (error: IOError) => void): this {
        return this.on(`severity:${severity}`, listener);
    }

    /**
     * Subscribe to critical errors
     * @param listener The listener function
     */
    public onCriticalError(listener: (error: IOError) => void): this {
        return this.on('critical-error', listener);
    }

    /**
     * Subscribe to error retry events
     * @param listener The listener function
     */
    public onRetry(listener: (data: { error: IOError, success: boolean }) => void): this {
        return this.on('retry', listener);
    }

    /**
     * Generate a unique error ID
     */
    private generateErrorId(): string {
        return `io-error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
}

// Export a singleton instance
export const ioErrorService = IOErrorService.getInstance();
export default ioErrorService;
