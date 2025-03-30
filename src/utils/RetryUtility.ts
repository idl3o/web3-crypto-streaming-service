/**
 * RetryUtility
 * Generic utility for retry operations with various strategies
 */

export enum RetryStrategy {
    CONSTANT = 'constant',
    LINEAR = 'linear',
    EXPONENTIAL = 'exponential'
}

export interface RetryOptions {
    maxRetries: number;
    initialDelay: number; // in milliseconds
    strategy: RetryStrategy;
    factor?: number; // factor for exponential backoff
    jitter?: boolean; // add randomness to delay
    maxDelay?: number; // maximum delay in milliseconds
    onRetry?: (attempt: number, error: Error, delay: number) => void;
    retryIf?: (error: Error) => boolean; // only retry if this returns true
}

export class RetryUtility {
    /**
     * Execute an operation with retry logic
     * @param operation Function to execute and retry if it fails
     * @param options Retry configuration options
     * @returns Result of the operation
     */
    static async execute<T>(
        operation: () => Promise<T>,
        options: Partial<RetryOptions> = {}
    ): Promise<T> {
        const config: RetryOptions = {
            maxRetries: 3,
            initialDelay: 1000,
            strategy: RetryStrategy.EXPONENTIAL,
            factor: 2,
            jitter: true,
            maxDelay: 30000,
            ...options
        };

        let attempt = 0;
        let lastError: Error;

        while (attempt <= config.maxRetries) {
            try {
                return await operation();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                // If we've reached max retries or retryIf returns false, stop retrying
                if (
                    attempt >= config.maxRetries ||
                    (config.retryIf && !config.retryIf(lastError))
                ) {
                    break;
                }

                // Calculate next delay
                const delay = this.calculateDelay(attempt, config);

                if (config.onRetry) {
                    config.onRetry(attempt + 1, lastError, delay);
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delay));
                attempt++;
            }
        }

        throw new Error(`Operation failed after ${attempt} retries: ${lastError?.message}`);
    }

    /**
     * Calculate delay based on retry strategy
     */
    private static calculateDelay(attempt: number, options: RetryOptions): number {
        let delay: number;

        switch (options.strategy) {
            case RetryStrategy.LINEAR:
                delay = options.initialDelay * (attempt + 1);
                break;
            case RetryStrategy.EXPONENTIAL:
                delay = options.initialDelay * Math.pow(options.factor || 2, attempt);
                break;
            case RetryStrategy.CONSTANT:
            default:
                delay = options.initialDelay;
                break;
        }

        // Apply maximum delay constraint
        if (options.maxDelay) {
            delay = Math.min(delay, options.maxDelay);
        }

        // Apply jitter to prevent thundering herd problem
        if (options.jitter) {
            delay = delay * (0.5 + Math.random() / 2); // between 50-100% of delay
        }

        return Math.floor(delay);
    }
}

/**
 * Decorator for retryable methods
 * @param options Retry options
 * @returns Decorated method with retry functionality
 */
export function retryable(options: Partial<RetryOptions> = {}) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            return RetryUtility.execute(
                () => originalMethod.apply(this, args),
                options
            );
        };

        return descriptor;
    };
}

/**
 * Create a retryable version of any function
 * @param fn Function to make retryable
 * @param options Retry options
 * @returns Retryable function
 */
export function makeRetryable<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: Partial<RetryOptions> = {}
): T {
    return (async (...args: Parameters<T>) => {
        return RetryUtility.execute(() => fn(...args), options);
    }) as T;
}
