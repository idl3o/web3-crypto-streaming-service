import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';

export interface SonaAuthToken {
    token: string;
    expiresAt: number;
    refreshToken?: string;
    userId: string;
}

export interface SonaAuthOptions {
    autoRefresh?: boolean;
    refreshThresholdMs?: number; // Time in ms before expiry when refresh should happen
    maxRetries?: number;
}

/**
 * Service for handling Sona streaming authentication
 */
export class SonaAuthenticationService extends EventEmitter {
    private static instance: SonaAuthenticationService;
    private currentToken: SonaAuthToken | null = null;
    private refreshTimer: NodeJS.Timeout | null = null;
    private retryCount: Map<string, number> = new Map();
    private readonly defaultOptions: Required<SonaAuthOptions> = {
        autoRefresh: true,
        refreshThresholdMs: 5 * 60 * 1000, // 5 minutes
        maxRetries: 3
    };
    private options: Required<SonaAuthOptions>;

    private constructor(options: SonaAuthOptions = {}) {
        super();
        this.options = { ...this.defaultOptions, ...options };
    }

    /**
     * Get singleton instance
     */
    public static getInstance(options?: SonaAuthOptions): SonaAuthenticationService {
        if (!SonaAuthenticationService.instance) {
            SonaAuthenticationService.instance = new SonaAuthenticationService(options);
        }
        return SonaAuthenticationService.instance;
    }

    /**
     * Sign in with auth token
     * @param token The authentication token
     */
    public async signInWithToken(token: string): Promise<SonaAuthToken> {
        try {
            // Reset retry count for this operation
            this.retryCount.set('signIn', 0);

            // In a real implementation, validate the token with a backend service
            // This is a simulated implementation

            // Parse the token (in real implementation, would decode and validate JWT)
            if (!token || token.trim().length < 20) {
                throw new Error('Invalid authentication token');
            }

            // Simulate token validation and user retrieval
            console.log('Authenticating with Sona using token');

            // Simulate API request delay
            await new Promise(resolve => setTimeout(resolve, 800));

            // Create mock token data
            const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour from now
            const userId = `user-${token.substring(10, 16)}`;

            this.currentToken = {
                token,
                expiresAt,
                userId,
                refreshToken: `refresh-${token.substring(5, 15)}`
            };

            // Set up auto refresh if enabled
            if (this.options.autoRefresh) {
                this.setupTokenRefresh();
            }

            // Emit auth events
            this.emit('signed-in', { userId });

            return this.currentToken;
        } catch (error) {
            // Report authentication error
            ioErrorService.reportError({
                type: IOErrorType.SONA_AUTHENTICATION,
                severity: IOErrorSeverity.ERROR,
                message: 'Failed to authenticate with Sona',
                details: error instanceof Error ? error.message : String(error),
                retryable: true,
                error: error instanceof Error ? error : new Error(String(error))
            });

            throw error;
        }
    }

    /**
     * Sign out the current user
     */
    public async signOut(): Promise<void> {
        try {
            if (!this.currentToken) {
                return;
            }

            const userId = this.currentToken.userId;

            // Clear refresh timer if it exists
            if (this.refreshTimer) {
                clearTimeout(this.refreshTimer);
                this.refreshTimer = null;
            }

            // In a real implementation, revoke the token with a backend service
            console.log('Signing out from Sona');

            // Clear current token
            this.currentToken = null;

            // Emit sign out event
            this.emit('signed-out', { userId });
        } catch (error) {
            ioErrorService.reportError({
                type: IOErrorType.SONA_AUTHENTICATION,
                severity: IOErrorSeverity.WARNING,
                message: 'Error during sign out process',
                details: error instanceof Error ? error.message : String(error),
                retryable: false,
                error: error instanceof Error ? error : new Error(String(error))
            });
        }
    }

    /**
     * Refresh the current authentication token
     */
    public async refreshToken(): Promise<SonaAuthToken> {
        if (!this.currentToken || !this.currentToken.refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            // Get the current retry count or initialize to 0
            const retryAttempt = this.retryCount.get('refresh') || 0;

            // Check if we've exceeded max retries
            if (retryAttempt >= this.options.maxRetries) {
                throw new Error(`Maximum refresh retry attempts (${this.options.maxRetries}) reached`);
            }

            // Increment retry count
            this.retryCount.set('refresh', retryAttempt + 1);

            // In a real implementation, this would call a token refresh endpoint
            console.log(`Refreshing Sona authentication token (attempt ${retryAttempt + 1} of ${this.options.maxRetries})`);

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Simulate token refresh response
            const newExpiresAt = Date.now() + (60 * 60 * 1000); // 1 hour from now
            const newToken = `new-token-${Date.now()}`;

            // Update the current token
            this.currentToken = {
                ...this.currentToken,
                token: newToken,
                expiresAt: newExpiresAt
            };

            // Reset retry count on success
            this.retryCount.set('refresh', 0);

            // Setup the next refresh
            if (this.options.autoRefresh) {
                this.setupTokenRefresh();
            }

            // Emit token refreshed event
            this.emit('token-refreshed', { userId: this.currentToken.userId });

            return this.currentToken;
        } catch (error) {
            // Report refresh error
            const errorSeverity = this.retryCount.get('refresh') >= this.options.maxRetries
                ? IOErrorSeverity.ERROR
                : IOErrorSeverity.WARNING;

            ioErrorService.reportError({
                type: IOErrorType.SONA_AUTHENTICATION,
                severity: errorSeverity,
                message: 'Failed to refresh authentication token',
                details: error instanceof Error ? error.message : String(error),
                retryable: (this.retryCount.get('refresh') || 0) < this.options.maxRetries,
                error: error instanceof Error ? error : new Error(String(error))
            });

            // Re-throw the error to be handled by the caller
            throw error;
        }
    }

    /**
     * Get the current auth token, refreshing if needed
     */
    public async getCurrentToken(): Promise<SonaAuthToken | null> {
        try {
            if (!this.currentToken) {
                return null;
            }

            // Check if token needs refresh
            const now = Date.now();
            const tokenExpiresIn = this.currentToken.expiresAt - now;

            if (tokenExpiresIn < this.options.refreshThresholdMs) {
                // Token is about to expire, refresh it
                return await this.refreshToken();
            }

            return this.currentToken;
        } catch (error) {
            ioErrorService.reportError({
                type: IOErrorType.SONA_AUTHENTICATION,
                severity: IOErrorSeverity.WARNING,
                message: 'Error while getting current token',
                details: error instanceof Error ? error.message : String(error),
                retryable: true,
                error: error instanceof Error ? error : new Error(String(error))
            });

            return this.currentToken; // Return the potentially expired token
        }
    }

    /**
     * Check if the user is authenticated
     */
    public isAuthenticated(): boolean {
        if (!this.currentToken) {
            return false;
        }

        const now = Date.now();
        return this.currentToken.expiresAt > now;
    }

    /**
     * Update service configuration
     */
    public updateOptions(options: Partial<SonaAuthOptions>): void {
        this.options = { ...this.options, ...options };

        // If autoRefresh changed, update refresh timer
        if (options.autoRefresh !== undefined && this.currentToken) {
            if (options.autoRefresh) {
                this.setupTokenRefresh();
            } else if (this.refreshTimer) {
                clearTimeout(this.refreshTimer);
                this.refreshTimer = null;
            }
        }
    }

    /**
     * Setup automatic token refresh
     */
    private setupTokenRefresh(): void {
        // Clear any existing timer
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }

        if (!this.currentToken) {
            return;
        }

        // Calculate time until refresh
        const now = Date.now();
        const tokenExpiresIn = this.currentToken.expiresAt - now;
        const refreshIn = tokenExpiresIn - this.options.refreshThresholdMs;

        // Only setup refresh if the token isn't already expired
        if (refreshIn > 0) {
            this.refreshTimer = setTimeout(async () => {
                try {
                    await this.refreshToken();
                } catch (error) {
                    console.error('Failed to auto-refresh token:', error);

                    // Emit event for the application to handle
                    this.emit('refresh-failed', {
                        error,
                        userId: this.currentToken?.userId
                    });
                }
            }, refreshIn);

            console.log(`Token refresh scheduled in ${Math.round(refreshIn / 1000)} seconds`);
        } else {
            // Token is already expired or about to expire
            console.warn('Token is expired or about to expire, immediate refresh required');

            // Try to refresh immediately in the background
            this.refreshToken().catch(error => {
                console.error('Failed to refresh expired token:', error);

                this.emit('refresh-failed', {
                    error,
                    userId: this.currentToken?.userId
                });
            });
        }
    }
}

// Export singleton instance
export const sonaAuthService = SonaAuthenticationService.getInstance();
export default sonaAuthService;
