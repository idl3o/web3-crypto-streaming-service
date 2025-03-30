import { EventEmitter } from 'events';
import { authService, IAuthService } from './AuthService';
import { postAuthInitService, IPostAuthInitService } from './PostAuthInitService';

/**
 * Configuration options for recovery behavior
 */
export interface RecoveryConfig {
    maxRecoveryTime?: number;
    maxRecoveryAttempts?: number;
    enableLogging?: boolean;
}

/**
 * Recovery state type definition
 */
export interface RecoveryState {
    isRecovering: boolean;
    attempts: number;
    lastAttemptTime?: Date;
    recoveryHistory: RecoveryAttempt[];
}

/**
 * Single recovery attempt details
 */
export interface RecoveryAttempt {
    timestamp: Date;
    userId: string;
    successful: boolean;
    failedState?: FailedState;
    error?: Error;
    duration: number;
}

/**
 * Failed system state definition
 */
export interface FailedState {
    models?: 'error' | 'loaded' | 'pending';
    services?: 'error' | 'initialized' | 'pending';
    wallet?: 'error' | 'connected' | 'disconnected';
    [key: string]: string | undefined;
}

/**
 * Recovery event types
 */
export type RecoveryEventType =
    | 'recovery-start'
    | 'recovery-success'
    | 'recovery-failed'
    | 'recovery-error'
    | 'recovery-max-attempts';

/**
 * AuthRecoveryHandler - Purpose-Description-Plan
 * 
 * PURPOSE:
 * Manages authentication recovery processes when login or post-authentication 
 * initialization fails in the web3 crypto streaming service.
 * 
 * DESCRIPTION:
 * Singleton service that implements resilient recovery strategies with:
 * - Limited retry attempts (maximum 3)
 * - Timeout protection (10 second maximum)
 * - Event-based communication
 * - Targeted recovery based on failure state
 * 
 * PLAN/PATTERN:
 * - Singleton pattern ensures centralized recovery management
 * - Observer pattern (via EventEmitter) for loose coupling
 * - Strategy pattern for different recovery approaches
 * - Circuit breaker pattern to prevent cascade failures
 */

/**
 * Handles recovery from authentication and post-login issues
 */
export class AuthRecoveryHandler extends EventEmitter {
    private static instance: AuthRecoveryHandler;

    // Properties with improved typing
    private isRecoveryInProgress = false;
    private recoveryTimeoutId: NodeJS.Timeout | null = null;
    private readonly MAX_RECOVERY_TIME: number;
    private recoveryAttempts = 0;
    private readonly MAX_RECOVERY_ATTEMPTS: number;
    private enableLogging = true;

    // New properties
    private recoveryHistory: RecoveryAttempt[] = [];
    private lastAttemptTime?: Date;
    private readonly authService: IAuthService;
    private readonly postAuthInitService: IPostAuthInitService;

    private constructor(
        authServiceImpl: IAuthService = authService,
        postAuthInitServiceImpl: IPostAuthInitService = postAuthInitService,
        config: RecoveryConfig = {}
    ) {
        super();
        this.authService = authServiceImpl;
        this.postAuthInitService = postAuthInitServiceImpl;

        // Initialize with defaults or config values
        this.MAX_RECOVERY_TIME = config.maxRecoveryTime ?? 10000;
        this.MAX_RECOVERY_ATTEMPTS = config.maxRecoveryAttempts ?? 3;
        this.enableLogging = config.enableLogging ?? true;

        this.setupEventListeners();
    }

    public static getInstance(
        authServiceImpl?: IAuthService,
        postAuthInitServiceImpl?: IPostAuthInitService,
        config?: RecoveryConfig
    ): AuthRecoveryHandler {
        if (!AuthRecoveryHandler.instance) {
            AuthRecoveryHandler.instance = new AuthRecoveryHandler(
                authServiceImpl,
                postAuthInitServiceImpl,
                config
            );
        }
        return AuthRecoveryHandler.instance;
    }

    private setupEventListeners(): void {
        // Listen for auth events
        this.authService.on('authenticated', () => {
            // Reset recovery attempts after successful auth
            this.recoveryAttempts = 0;
        });

        // Listen for init failures
        this.postAuthInitService.on('init-failed', this.handleInitFailure.bind(this));
    }

    /**
     * Configure recovery behavior
     */
    public configure(options: RecoveryConfig): void {
        if (options.maxRecoveryTime) {
            this.MAX_RECOVERY_TIME = options.maxRecoveryTime;
        }

        if (options.maxRecoveryAttempts) {
            this.MAX_RECOVERY_ATTEMPTS = options.maxRecoveryAttempts;
        }

        if (options.enableLogging !== undefined) {
            this.enableLogging = options.enableLogging;
        }

        if (this.enableLogging) {
            console.info(`AuthRecoveryHandler configured: maxTime=${this.MAX_RECOVERY_TIME}ms, maxAttempts=${this.MAX_RECOVERY_ATTEMPTS}`);
        }
    }

    /**
     * Handle initialization failure
     */
    private handleInitFailure(data: { userId: string, error: Error, state: FailedState }): void {
        // Check if we should attempt recovery
        if (this.recoveryAttempts >= this.MAX_RECOVERY_ATTEMPTS) {
            this.emit('recovery-max-attempts', {
                userId: data.userId,
                error: new Error(`Maximum recovery attempts (${this.MAX_RECOVERY_ATTEMPTS}) reached`)
            });
            return;
        }

        // Attempt recovery
        this.attemptRecovery(data.userId, data.state);
    }

    /**
     * Attempt recovery from a failed state
     */
    public async attemptRecovery(userId: string, failedState?: FailedState): Promise<boolean> {
        if (this.isRecoveryInProgress) {
            return false;
        }

        const startTime = Date.now();
        this.lastAttemptTime = new Date();
        let success = false;
        let error: Error | undefined;

        try {
            this.isRecoveryInProgress = true;
            this.recoveryAttempts++;

            this.emit('recovery-start', {
                userId,
                attempt: this.recoveryAttempts,
                maxAttempts: this.MAX_RECOVERY_ATTEMPTS
            });

            // Set a timeout to ensure recovery doesn't hang
            const recoveryTimeout = new Promise<boolean>((resolve) => {
                this.recoveryTimeoutId = setTimeout(() => {
                    resolve(false);
                }, this.MAX_RECOVERY_TIME);
            });

            // Try different recovery strategies based on the failure state
            const recoveryPromise = this.executeRecoveryStrategy(userId, failedState);

            // Race the recovery against the timeout
            success = await Promise.race([recoveryPromise, recoveryTimeout]);

            // Clear the timeout if recovery completed
            if (this.recoveryTimeoutId) {
                clearTimeout(this.recoveryTimeoutId);
                this.recoveryTimeoutId = null;
            }

            // Reset auth state regardless of recovery outcome
            this.authService.resetAuthState();

            if (success) {
                this.emit('recovery-success', { userId });
            } else {
                this.emit('recovery-failed', {
                    userId,
                    attempt: this.recoveryAttempts,
                    maxAttempts: this.MAX_RECOVERY_ATTEMPTS
                });
            }

            return success;
        } catch (err) {
            error = err instanceof Error ? err : new Error(String(err));
            this.emit('recovery-error', {
                userId,
                error
            });
            return false;
        } finally {
            const duration = Date.now() - startTime;
            this.isRecoveryInProgress = false;

            // Record this recovery attempt in history
            this.recoveryHistory.push({
                timestamp: this.lastAttemptTime!,
                userId,
                successful: success,
                failedState,
                error,
                duration
            });

            // Limit history size to prevent memory leaks
            if (this.recoveryHistory.length > 50) {
                this.recoveryHistory = this.recoveryHistory.slice(-50);
            }
        }
    }

    /**
     * Execute a recovery strategy based on what failed
     */
    private async executeRecoveryStrategy(
        userId: string,
        failedState?: FailedState
    ): Promise<boolean> {
        if (this.enableLogging) {
            console.debug(`Executing recovery for user ${userId}`, failedState);
        }

        // If no failed state specified, use a generic approach
        if (!failedState) {
            // Generic recovery strategy:
            // 1. Check if session exists and is valid
            const session = this.authService.getSession();
            if (!session) {
                // No valid session, can't recover automatically
                return false;
            }

            // 2. Wait a bit and let things settle
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 3. Verify session to ensure it's still valid
            await this.verifySessionQuietly();

            // 4. Success if we got here without errors
            return true;
        }

        // Targeted recovery based on what failed
        if (failedState?.models === 'error') {
            // Try to re-initialize AI models
            await this.recoverAIModels();
        }

        if (failedState?.services === 'error') {
            // Try to re-initialize services
            await this.recoverServices();
        }

        if (failedState?.wallet === 'error') {
            // Try to reconnect wallet
            await this.recoverWalletConnection();
        }

        // Wait a moment for things to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));

        return true;
    }

    /**
     * Recover AI models initialization 
     */
    private async recoverAIModels(): Promise<void> {
        // In a real implementation, this would retry loading AI models
        // But in a way that won't block UI
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    /**
     * Recover services initialization
     */
    private async recoverServices(): Promise<void> {
        // In a real implementation, this would retry initializing services
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    /**
     * Recover wallet connection issues
     */
    private async recoverWalletConnection(): Promise<boolean> {
        try {
            if (this.enableLogging) {
                console.debug('Attempting to recover wallet connection');
            }

            // In a real implementation, this would:
            // 1. Check if wallet is still accessible
            // 2. Try to reconnect if disconnected
            // 3. Verify the connection is working
            await new Promise(resolve => setTimeout(resolve, 500));

            return true;
        } catch (error) {
            if (this.enableLogging) {
                console.error('Wallet recovery failed:', error);
            }
            return false;
        }
    }

    /**
     * Verify session without throwing errors
     */
    private async verifySessionQuietly(): Promise<boolean> {
        try {
            // This would verify the session with backend
            // but fail silently if there's an error
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if recovery is in progress
     */
    public isRecovering(): boolean {
        return this.isRecoveryInProgress;
    }

    /**
     * Get number of recovery attempts
     */
    public getRecoveryAttempts(): number {
        return this.recoveryAttempts;
    }

    /**
     * Get current recovery state
     */
    public getRecoveryState(): RecoveryState {
        return {
            isRecovering: this.isRecoveryInProgress,
            attempts: this.recoveryAttempts,
            lastAttemptTime: this.lastAttemptTime,
            recoveryHistory: [...this.recoveryHistory]
        };
    }

    /**
     * Get recovery history
     */
    public getRecoveryHistory(): ReadonlyArray<RecoveryAttempt> {
        return [...this.recoveryHistory];
    }

    /**
     * Reset recovery state
     */
    public resetRecovery(): void {
        this.recoveryAttempts = 0;
        this.isRecoveryInProgress = false;

        if (this.recoveryTimeoutId) {
            clearTimeout(this.recoveryTimeoutId);
            this.recoveryTimeoutId = null;
        }

        // We don't clear history - it's valuable for debugging
    }
}

// Create service interfaces (would normally be in separate files)
export interface IAuthService extends EventEmitter {
    getSession(): any;
    resetAuthState(): void;
}

export interface IPostAuthInitService extends EventEmitter {
    // Define required methods
}

export const authRecoveryHandler = AuthRecoveryHandler.getInstance();
export default authRecoveryHandler;
