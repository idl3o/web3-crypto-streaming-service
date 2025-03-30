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
    UNKNOWN = 'unknown'
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
    metadata?: Record<string, any>;
}

class IOErrorService extends EventEmitter {
    private errors: IOError[] = [];
    private maxErrorCount: number = 100;

    constructor() {
        super();
    }

    /**
     * Report a new IO error
     * @param error The IO error to report
     */
    public reportError(error: Omit<IOError, 'id' | 'timestamp'>): IOError {
        const id = `io-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const fullError: IOError = {
            ...error,
            id,
            timestamp: Date.now(),
        };

        this.errors.unshift(fullError);

        // Trim the errors array if it exceeds the maximum length
        if (this.errors.length > this.maxErrorCount) {
            this.errors = this.errors.slice(0, this.maxErrorCount);
        }

        // Emit the error event
        this.emit('error', fullError);

        // Also emit specific event based on type and severity
        this.emit(`${error.type}:${error.severity}`, fullError);

        return fullError;
    }

    /**
     * Get all recorded errors
     */
    public getErrors(): IOError[] {
        return [...this.errors];
    }

    /**
     * Get errors filtered by type and/or severity
     */
    public getFilteredErrors(filter: {
        type?: IOErrorType | IOErrorType[],
        severity?: IOErrorSeverity | IOErrorSeverity[]
    } = {}): IOError[] {
        return this.errors.filter(error => {
            let matchesType = true;
            let matchesSeverity = true;

            if (filter.type) {
                if (Array.isArray(filter.type)) {
                    matchesType = filter.type.includes(error.type);
                } else {
                    matchesType = error.type === filter.type;
                }
            }

            if (filter.severity) {
                if (Array.isArray(filter.severity)) {
                    matchesSeverity = filter.severity.includes(error.severity);
                } else {
                    matchesSeverity = error.severity === filter.severity;
                }
            }

            return matchesType && matchesSeverity;
        });
    }

    /**
     * Clear all errors
     */
    public clearErrors(): void {
        this.errors = [];
        this.emit('cleared');
    }

    /**
     * Remove a specific error by ID
     */
    public dismissError(id: string): boolean {
        const initialLength = this.errors.length;
        this.errors = this.errors.filter(error => error.id !== id);

        const removed = this.errors.length < initialLength;
        if (removed) {
            this.emit('dismissed', id);
        }

        return removed;
    }

    /**
     * Set the maximum number of errors to keep in history
     */
    public setMaxErrorCount(count: number): void {
        this.maxErrorCount = count;

        // Trim the errors array if needed
        if (this.errors.length > this.maxErrorCount) {
            this.errors = this.errors.slice(0, this.maxErrorCount);
        }
    }
}

export const ioErrorService = new IOErrorService();
export default ioErrorService;
