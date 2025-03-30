import { EventEmitter } from 'events';
import { authService, AuthSession } from './AuthService';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { aiModelSelectionService } from './AIModelSelectionService';

/**
 * Service responsible for managing all initialization steps after authentication
 * to prevent unresponsiveness and handle errors gracefully
 */
export class PostAuthInitService extends EventEmitter {
    private static instance: PostAuthInitService;
    private isInitializing: boolean = false;
    private initPromise: Promise<boolean> | null = null;
    private initTimeouts: Map<string, NodeJS.Timeout> = new Map();
    private initState: Record<string, 'pending' | 'success' | 'error'> = {};
    private MAX_INIT_TIME = 15000; // 15 seconds timeout for any operation
    
    private constructor() {
        super();
        this.setupAuthListeners();
    }
    
    public static getInstance(): PostAuthInitService {
        if (!PostAuthInitService.instance) {
            PostAuthInitService.instance = new PostAuthInitService();
        }
        return PostAuthInitService.instance;
    }
    
    /**
     * Setup listeners for auth events
     */
    private setupAuthListeners(): void {
        authService.on('authenticated', this.handleAuthSuccess.bind(this));
        authService.on('session_refreshed', this.handleSessionRefresh.bind(this));
        authService.on('logout', this.handleLogout.bind(this));
        authService.on('session_expired', this.handleSessionExpired.bind(this));
    }
    
    /**
     * Handle successful authentication
     */
    private async handleAuthSuccess(data: { userId: string }): Promise<void> {
        if (this.isInitializing) return;
        
        this.isInitializing = true;
        this.emit('init-start', { userId: data.userId });
        
        try {
            // Run post-auth initialization with timeout protection
            this.initPromise = this.runInitSequence(data.userId);
            const success = await this.initPromise;
            
            if (success) {
                this.emit('init-complete', { userId: data.userId, success: true });
            } else {
                this.emit('init-failed', { 
                    userId: data.userId,
                    error: new Error('Post-authentication initialization failed'),
                    state: { ...this.initState }
                });
            }
        } catch (error) {
            this.reportError('Post-auth initialization failed', error);
            this.emit('init-failed', { 
                userId: data.userId, 
                error,
                state: { ...this.initState }
            });
        } finally {
            this.isInitializing = false;
            this.initPromise = null;
        }
    }
    
    /**
     * Run the initialization sequence with proper error handling
     */
    private async runInitSequence(userId: string): Promise<boolean> {
        this.initState = {
            userData: 'pending',
            preferences: 'pending',
            services: 'pending',
            models: 'pending'
        };
        
        try {
            // Initialize user data (with timeout protection)
            await this.runWithTimeout('userData', 
                this.loadUserData(userId));
            this.initState.userData = 'success';
            
            // Load user preferences (with timeout protection)
            await this.runWithTimeout('preferences', 
                this.loadUserPreferences(userId));
            this.initState.preferences = 'success';
            
            // Initialize required services (with timeout protection)
            await this.runWithTimeout('services', 
                this.initializeRequiredServices());
            this.initState.services = 'success';
            
            // Initialize AI models (with timeout protection)
            await this.runWithTimeout('models', 
                this.loadAIModels(userId));
            this.initState.models = 'success';
            
            return true;
        } catch (error) {
            // If any step fails, we still want to continue with the rest of the app
            // but we'll log the error and mark the specific step as failed
            this.reportError('Error during post-auth initialization', error);
            return false;
        } finally {
            // Clear any remaining timeouts
            for (const [key, timeout] of this.initTimeouts.entries()) {
                clearTimeout(timeout);
                this.initTimeouts.delete(key);
            }
        }
    }
    
    /**
     * Run an operation with a timeout to prevent hanging
     */
    private async runWithTimeout<T>(
        operationName: string, 
        operation: Promise<T>
    ): Promise<T> {
        // Create a timeout promise that rejects after MAX_INIT_TIME
        const timeoutPromise = new Promise<never>((_, reject) => {
            const timeout = setTimeout(() => {
                this.initState[operationName] = 'error';
                reject(new Error(`Operation ${operationName} timed out after ${this.MAX_INIT_TIME}ms`));
            }, this.MAX_INIT_TIME);
            
            this.initTimeouts.set(operationName, timeout);
        });
        
        try {
            // Race the operation against the timeout
            return await Promise.race([operation, timeoutPromise]);
        } finally {
            // Clear the timeout if the operation completes
            if (this.initTimeouts.has(operationName)) {
                clearTimeout(this.initTimeouts.get(operationName)!);
                this.initTimeouts.delete(operationName);
            }
        }
    }
    
    /**
     * Load user data after authentication
     */
    private async loadUserData(userId: string): Promise<void> {
        // In a real implementation, this would load user data from an API
        // Simulate loading time
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check for edge case that could cause unresponsiveness - invalid session
        const session = authService.getSession();
        if (!session) {
            throw new Error('No active session when loading user data');
        }
    }
    
    /**
     * Load user preferences
     */
    private async loadUserPreferences(userId: string): Promise<void> {
        // In a real implementation, this would load user preferences from an API or local storage
        // Simulate loading time
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    /**
     * Initialize required services
     */
    private async initializeRequiredServices(): Promise<void> {
        // Initialize any services that need to be available right after auth
        // Simulate initialization time
        await new Promise(resolve => setTimeout(resolve, 400));
    }
    
    /**
     * Load AI models with user-specific access
     */
    private async loadAIModels(userId: string): Promise<void> {
        // Initialize AI models for this user
        try {
            await aiModelSelectionService.initialize();
        } catch (error) {
            // Don't throw - just report the error and continue
            this.reportError('Failed to initialize AI models', error);
            this.initState.models = 'error';
        }
    }
    
    /**
     * Handle session refresh
     */
    private handleSessionRefresh(): void {
        // Nothing special to do here, but could be used for refreshing data
    }
    
    /**
     * Handle user logout
     */
    private handleLogout(): void {
        // Clear any cached data or state
        this.initState = {};
        
        // Clear any active timeouts
        for (const [key, timeout] of this.initTimeouts.entries()) {
            clearTimeout(timeout);
            this.initTimeouts.delete(key);
        }
    }
    
    /**
     * Handle session expiration
     */
    private handleSessionExpired(): void {
        // Similar to logout, clear state and timeouts
        this.handleLogout();
    }
    
    /**
     * Get the current initialization state
     */
    public getInitializationState(): Record<string, 'pending' | 'success' | 'error'> {
        return { ...this.initState };
    }
    
    /**
     * Check if post-auth initialization is in progress
     */
    public isInitializationInProgress(): boolean {
        return this.isInitializing;
    }
    
    /**
     * Report errors to the IOErrorService
     */
    private reportError(message: string, error: any): void {
        const errorDetails = error instanceof Error ? error.message : String(error);
        
        ioErrorService.reportError({
            type: IOErrorType.UNKNOWN,
            severity: IOErrorSeverity.ERROR,
            message: message,
            details: errorDetails,
            source: 'PostAuthInitService',
            retryable: true,
            error: error instanceof Error ? error : new Error(errorDetails)
        });
        
        this.emit('error', { message, error });
    }
}

export const postAuthInitService = PostAuthInitService.getInstance();
export default postAuthInitService;
