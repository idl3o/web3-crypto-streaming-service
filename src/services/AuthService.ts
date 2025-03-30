import { EventEmitter } from 'events';
import { identityManager, IdentityProvider, UserIdentity } from './IdentityManager';

/**
 * Authentication service interface
 */
export interface IAuthService extends EventEmitter {
    getSession(): any;
    resetAuthState(): void;
    login(provider: IdentityProvider, options?: any): Promise<UserIdentity>;
    logout(): Promise<void>;
    isAuthenticated(): boolean;
    getCurrentUser(): UserIdentity | null;
}

/**
 * Authentication service that integrates with the IdentityManager
 */
class AuthService extends EventEmitter implements IAuthService {
    private static instance: AuthService;
    private session: any = null;

    private constructor() {
        super();
        this.setupEventListeners();
    }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    private setupEventListeners(): void {
        // Listen for identity events
        identityManager.on('identity:connected', this.handleIdentityConnected.bind(this));
        identityManager.on('identity:disconnected', this.handleIdentityDisconnected.bind(this));
        identityManager.on('identity:error', this.handleIdentityError.bind(this));
    }

    /**
     * Handle successful identity connection
     */
    private handleIdentityConnected(data: { identity: UserIdentity }): void {
        // Create a session from the identity
        this.session = {
            userId: data.identity.id,
            provider: data.identity.provider,
            created: new Date(),
            expiresAt: this.calculateExpiration(data.identity.provider)
        };

        // Emit authenticated event
        this.emit('authenticated', {
            userId: data.identity.id,
            identity: data.identity
        });
    }

    /**
     * Calculate session expiration based on provider
     */
    private calculateExpiration(provider: IdentityProvider): Date {
        const now = new Date().getTime();
        let expirationMs = 24 * 60 * 60 * 1000; // Default: 24 hours

        switch (provider) {
            case IdentityProvider.GUEST:
                expirationMs = 2 * 60 * 60 * 1000; // 2 hours
                break;
            case IdentityProvider.METAMASK:
            case IdentityProvider.WALLET_CONNECT:
                expirationMs = 7 * 24 * 60 * 60 * 1000; // 7 days
                break;
        }

        return new Date(now + expirationMs);
    }

    /**
     * Handle identity disconnection
     */
    private handleIdentityDisconnected(): void {
        const previousSession = this.session;
        this.session = null;

        if (previousSession) {
            this.emit('logout', { userId: previousSession.userId });
        }
    }

    /**
     * Handle identity errors
     */
    private handleIdentityError(data: { provider: IdentityProvider, error: Error }): void {
        this.emit('auth-error', {
            provider: data.provider,
            error: data.error
        });
    }

    /**
     * Login with a specific provider
     */
    public async login(provider: IdentityProvider, options: any = {}): Promise<UserIdentity> {
        if (this.session) {
            await this.logout();
        }

        try {
            const identity = await identityManager.connect({
                provider,
                ...options
            });

            return identity;
        } catch (error) {
            this.emit('auth-error', {
                provider,
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw error;
        }
    }

    /**
     * Logout current user
     */
    public async logout(): Promise<void> {
        const previousSession = this.session;

        // Clear the session first
        this.session = null;

        // Then disconnect the identity
        await identityManager.disconnect();

        if (previousSession) {
            this.emit('logout', { userId: previousSession.userId });
        }
    }

    /**
     * Get current session
     */
    public getSession(): any {
        if (!this.session) {
            return null;
        }

        // Check if session is expired
        if (new Date() > this.session.expiresAt) {
            this.session = null;
            return null;
        }

        return { ...this.session };
    }

    /**
     * Reset authentication state
     */
    public resetAuthState(): void {
        this.session = null;
    }

    /**
     * Check if user is authenticated
     */
    public isAuthenticated(): boolean {
        return this.getSession() !== null;
    }

    /**
     * Get current authenticated user
     */
    public getCurrentUser(): UserIdentity | null {
        return identityManager.getCurrentIdentity();
    }
}

export const authService = AuthService.getInstance();
export default authService;
