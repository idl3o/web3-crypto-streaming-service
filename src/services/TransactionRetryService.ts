import { RetryUtility, RetryStrategy, RetryOptions } from '../utils/RetryUtility';
import { BitcoinPaymentService } from './BitcoinPaymentService';
import { shouldAutoRetry } from '../utils/satoshi-utils';

export interface RetryableTransaction {
    id: string;
    type: 'payment' | 'nft' | 'stream' | 'contract';
    method: string;
    params: any[];
    service: string;
    status: 'pending' | 'failed' | 'retrying' | 'succeeded';
    errorCode?: string;
    errorMessage?: string;
    attempts: number;
    maxAttempts: number;
    lastAttempt: number; // timestamp
    nextAttempt?: number; // timestamp
    metadata?: Record<string, any>;
}

export class TransactionRetryService {
    private retryQueue: RetryableTransaction[] = [];
    private retryIntervalId: number | null = null;
    private services: Record<string, any> = {};
    private retryOptions: Partial<RetryOptions> = {
        maxRetries: 3,
        strategy: RetryStrategy.EXPONENTIAL,
        initialDelay: 2000,
        factor: 2,
        jitter: true,
        maxDelay: 30000
    };

    constructor() {
        // Load services that can have retryable operations
        this.loadServices();
        this.loadPendingRetries();
    }

    /**
     * Register a service that has retryable operations
     */
    registerService(name: string, service: any): void {
        this.services[name] = service;
    }

    /**
     * Create a new retryable transaction
     */
    createRetryableTransaction(
        type: RetryableTransaction['type'],
        method: string,
        params: any[],
        service: string,
        metadata?: Record<string, any>
    ): RetryableTransaction {
        const tx: RetryableTransaction = {
            id: `retry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type,
            method,
            params,
            service,
            status: 'pending',
            attempts: 0,
            maxAttempts: this.retryOptions.maxRetries || 3,
            lastAttempt: 0,
            metadata
        };

        return tx;
    }

    /**
     * Execute a transaction with retry capabilities
     */
    async executeWithRetry<T>(
        type: RetryableTransaction['type'],
        method: string,
        params: any[],
        service: string,
        options?: Partial<RetryOptions>,
        metadata?: Record<string, any>
    ): Promise<T> {
        const tx = this.createRetryableTransaction(type, method, params, service, metadata);

        try {
            const serviceInstance = this.services[service];
            if (!serviceInstance) {
                throw new Error(`Service ${service} not registered for retry operations`);
            }

            const serviceMethod = serviceInstance[method];
            if (typeof serviceMethod !== 'function') {
                throw new Error(`Method ${method} not found on service ${service}`);
            }

            // Execute with retry
            const result = await RetryUtility.execute(
                () => serviceMethod.apply(serviceInstance, params),
                {
                    ...this.retryOptions,
                    ...options,
                    onRetry: (attempt, error, delay) => {
                        this.updateTransactionRetry(tx, attempt, error, delay);
                        if (options?.onRetry) {
                            options.onRetry(attempt, error, delay);
                        }
                    },
                    retryIf: (error) => {
                        // Check if error is retryable
                        if (error.message && shouldAutoRetry(error.message)) {
                            return true;
                        }

                        // Allow custom retry condition
                        return options?.retryIf ? options.retryIf(error) : true;
                    }
                }
            );

            tx.status = 'succeeded';
            this.saveTransaction(tx);

            return result;
        } catch (error) {
            tx.status = 'failed';
            tx.errorMessage = error instanceof Error ? error.message : String(error);
            this.saveTransaction(tx);

            throw error;
        }
    }

    /**
     * Manually retry a failed transaction
     */
    async retryTransaction(transactionId: string): Promise<any> {
        const tx = this.retryQueue.find(t => t.id === transactionId);

        if (!tx) {
            throw new Error(`Transaction ${transactionId} not found in retry queue`);
        }

        if (tx.status === 'succeeded') {
            return { status: 'already_succeeded', message: 'Transaction already succeeded' };
        }

        if (tx.attempts >= tx.maxAttempts) {
            throw new Error(`Maximum retry attempts (${tx.maxAttempts}) reached for transaction ${transactionId}`);
        }

        try {
            tx.status = 'retrying';
            tx.lastAttempt = Date.now();
            tx.attempts++;

            const serviceInstance = this.services[tx.service];
            if (!serviceInstance) {
                throw new Error(`Service ${tx.service} not registered for retry operations`);
            }

            const result = await serviceInstance[tx.method](...tx.params);

            tx.status = 'succeeded';
            this.saveTransaction(tx);

            return result;
        } catch (error) {
            tx.status = 'failed';
            tx.errorMessage = error instanceof Error ? error.message : String(error);
            tx.nextAttempt = Date.now() + this.calculateNextRetryDelay(tx);

            this.saveTransaction(tx);
            throw error;
        }
    }

    /**
     * Start the automatic retry process for failed transactions
     */
    startRetryProcess(): void {
        if (this.retryIntervalId) return; // already running

        this.retryIntervalId = window.setInterval(() => {
            this.processRetryQueue();
        }, 30000); // Check every 30 seconds
    }

    /**
     * Stop the automatic retry process
     */
    stopRetryProcess(): void {
        if (this.retryIntervalId) {
            clearInterval(this.retryIntervalId);
            this.retryIntervalId = null;
        }
    }

    /**
     * Get all transactions in the retry queue
     */
    getRetryQueue(): RetryableTransaction[] {
        return [...this.retryQueue];
    }

    /**
     * Get a specific transaction by ID
     */
    getTransaction(id: string): RetryableTransaction | undefined {
        return this.retryQueue.find(tx => tx.id === id);
    }

    // Private methods

    private updateTransactionRetry(
        tx: RetryableTransaction,
        attempt: number,
        error: Error,
        delay: number
    ): void {
        tx.attempts = attempt;
        tx.status = 'retrying';
        tx.lastAttempt = Date.now();
        tx.nextAttempt = Date.now() + delay;
        tx.errorMessage = error.message;

        this.saveTransaction(tx);
    }

    private saveTransaction(tx: RetryableTransaction): void {
        // Find and update existing transaction or add new one
        const index = this.retryQueue.findIndex(t => t.id === tx.id);

        if (index >= 0) {
            this.retryQueue[index] = tx;
        } else {
            this.retryQueue.push(tx);
        }

        // Persist to storage
        this.persistRetryQueue();
    }

    private loadServices(): void {
        // Register Bitcoin payment service
        this.registerService('bitcoinPayment', new BitcoinPaymentService('', ''));

        // Other services would be registered here
    }

    private loadPendingRetries(): void {
        try {
            const savedQueue = localStorage.getItem('retryTransactionQueue');
            if (savedQueue) {
                this.retryQueue = JSON.parse(savedQueue);
            }
        } catch (error) {
            console.error('Failed to load saved retry transactions:', error);
        }
    }

    private persistRetryQueue(): void {
        try {
            localStorage.setItem('retryTransactionQueue', JSON.stringify(this.retryQueue));
        } catch (error) {
            console.error('Failed to save retry transactions:', error);
        }
    }

    private processRetryQueue(): void {
        const now = Date.now();

        const eligibleRetries = this.retryQueue.filter(tx =>
            tx.status === 'failed' &&
            tx.attempts < tx.maxAttempts &&
            tx.nextAttempt &&
            tx.nextAttempt <= now
        );

        eligibleRetries.forEach(tx => {
            this.retryTransaction(tx.id).catch(error => {
                console.warn(`Auto-retry failed for transaction ${tx.id}:`, error);
            });
        });
    }

    private calculateNextRetryDelay(tx: RetryableTransaction): number {
        // Simple exponential backoff
        const baseDelay = this.retryOptions.initialDelay || 2000;
        const factor = this.retryOptions.factor || 2;
        const maxDelay = this.retryOptions.maxDelay || 30000;

        let delay = baseDelay * Math.pow(factor, tx.attempts - 1);

        // Add jitter (10%)
        const jitter = delay * 0.1 * Math.random();
        delay += jitter;

        return Math.min(delay, maxDelay);
    }
}

// Create singleton instance
export const transactionRetryService = new TransactionRetryService();
export default transactionRetryService;
