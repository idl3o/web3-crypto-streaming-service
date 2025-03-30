import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { transactionRetryService } from './TransactionRetryService';

export enum AuthProvider {
    EMAIL = 'email',
    METAMASK = 'metamask',
    WALLET_CONNECT = 'wallet_connect',
    COINBASE = 'coinbase',
    GOOGLE = 'google',
    GITHUB = 'github'
}

export interface AuthSession {
    userId: string;
    token: string;
    expiry: number;
    provider: AuthProvider;
    lastVerified: number;
}

export interface LoginOptions {
    provider: AuthProvider;
    email?: string;
    password?: string;
    walletAddress?: string;
    redirectUrl?: string;
    rememberMe?: boolean;
}

export class AuthService extends EventEmitter {
    private static instance: AuthService;
    private currentSession: AuthSession | null = null;
    private loginWindow: Window | null = null;
    private authServerUrl: string = process.env.AUTH_SERVER_URL || 'https://auth.cryptostreaming.com';
    private maxRetries: number = 3;
    private retryDelay: number = 5000; // 5 seconds
    private loginAttempts: Map<string, number> = new Map();
    private corsProxyUrl: string = process.env.CORS_PROXY_URL || 'https://cors-proxy.cryptostreaming.com';
    private useLocalProxy: boolean = false;
    private loginInProgress: boolean = false;
    private lastLoginError: Error | null = null;

    private constructor() {
        super();
        this.checkSession();
        this.setupSessionRefresh();
    }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    /**
     * Initiate user login process
     */
    public async login(options: LoginOptions): Promise<AuthSession> {
        try {
            if (this.loginInProgress) {
                throw new Error('Login already in progress');
            }
            
            this.loginInProgress = true;
            this.emit('login-start', { provider: options.provider });
            
            const loginId = `login_${Date.now()}`;
            this.loginAttempts.set(loginId, 0);

            const session = await this.attemptLogin(loginId, options);
            
            // Reset login state
            this.loginInProgress = false;
            this.lastLoginError = null;
            
            return session;
        } catch (error) {
            this.lastLoginError = error instanceof Error ? error : new Error(String(error));
            this.reportError('Login failed', error);
            
            // Reset login state even if there was an error
            this.loginInProgress = false;
            
            throw error;
        }
    }

    /**
     * Attempt login with retry capability
     */
    private async attemptLogin(loginId: string, options: LoginOptions, isRetry: boolean = false): Promise<AuthSession> {
        const attempts = this.loginAttempts.get(loginId) || 0;

        if (attempts >= this.maxRetries) {
            this.loginAttempts.delete(loginId);
            throw new Error(`Login failed after ${this.maxRetries} attempts. Please try again later.`);
        }

        this.loginAttempts.set(loginId, attempts + 1);

        try {
            // Handle different auth providers
            let session: AuthSession;
            
            if (options.provider === AuthProvider.EMAIL) {
                session = await this.emailPasswordLogin(options.email!, options.password!);
            } else if (options.provider === AuthProvider.METAMASK ||
                options.provider === AuthProvider.WALLET_CONNECT ||
                options.provider === AuthProvider.COINBASE) {
                session = await this.walletLogin(options.provider, options.walletAddress!);
            } else {
                // OAuth providers (Google, GitHub)
                session = await this.oauthLogin(options.provider, options.redirectUrl);
            }
            
            // If we got here, login was successful
            this.emit('login-success', { 
                userId: session.userId, 
                provider: options.provider 
            });
            
            return session;
            
        } catch (error: any) {
            // Check if the error is CORS-related
            if (this.isCorsError(error) && !this.useLocalProxy) {
                console.warn('CORS error detected, retrying with proxy');
                this.useLocalProxy = true;

                // Small delay before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.attemptLogin(loginId, options, true);
            }

            // Check if error is retryable
            if (this.isRetryableError(error) && attempts < this.maxRetries) {
                console.warn(`Login attempt ${attempts + 1} failed, retrying in ${this.retryDelay}ms`);
                
                this.emit('login-retry', {
                    provider: options.provider,
                    attempt: attempts + 1,
                    maxAttempts: this.maxRetries,
                    delay: this.retryDelay * Math.pow(1.5, attempts)
                });

                // Wait before retry with exponential backoff
                const backoffDelay = this.retryDelay * Math.pow(1.5, attempts);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));

                return this.attemptLogin(loginId, options, true);
            }
            
            this.emit('login-error', {
                provider: options.provider,
                error: error instanceof Error ? error.message : String(error)
            });

            throw error;
        }
    }

    /**
     * Login with email and password
     */
    private async emailPasswordLogin(email: string, password: string): Promise<AuthSession> {
        const endpoint = this.getAuthEndpoint('/api/auth/login');

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': window.location.origin,
            },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }

        const session = await response.json();
        this.setSession(session);
        return session;
    }

    /**
     * Login with crypto wallet
     */
    private async walletLogin(provider: AuthProvider, address: string): Promise<AuthSession> {
        const endpoint = this.getAuthEndpoint('/api/auth/wallet-login');

        // Request challenge
        const challengeResponse = await fetch(`${endpoint}/challenge?address=${address}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Origin': window.location.origin,
            },
            credentials: 'include',
        });

        if (!challengeResponse.ok) {
            const error = await challengeResponse.json();
            throw new Error(error.message || 'Failed to get signature challenge');
        }

        const { challenge } = await challengeResponse.json();

        // Here you would typically sign the challenge with the wallet
        // For this example, we'll simulate it
        const signature = `0x${Array(130).fill('0').join('')}`;

        // Verify signature
        const loginResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': window.location.origin,
            },
            credentials: 'include',
            body: JSON.stringify({
                provider,
                address,
                challenge,
                signature
            })
        });

        if (!loginResponse.ok) {
            const error = await loginResponse.json();
            throw new Error(error.message || 'Wallet login failed');
        }

        const session = await loginResponse.json();
        this.setSession(session);
        return session;
    }

    /**
     * Login with OAuth provider (opens popup window)
     */
    private async oauthLogin(provider: AuthProvider, redirectUrl?: string): Promise<AuthSession> {
        return new Promise((resolve, reject) => {
            try {
                const endpoint = this.getAuthEndpoint(`/api/auth/oauth/${provider}`);
                const width = 600;
                const height = 700;
                const left = window.screenX + (window.outerWidth - width) / 2;
                const top = window.screenY + (window.outerHeight - height) / 2;

                // Close any existing login window
                if (this.loginWindow && !this.loginWindow.closed) {
                    this.loginWindow.close();
                }

                // Open popup for OAuth flow
                this.loginWindow = window.open(
                    endpoint,
                    `${provider}Auth`,
                    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
                );

                if (!this.loginWindow) {
                    reject(new Error('Popup blocked. Please allow popups for this site.'));
                    return;
                }

                // Handle OAuth callback via message event
                const handleMessage = (event: MessageEvent) => {
                    // Verify origin
                    if (!this.isValidOrigin(event.origin)) {
                        return;
                    }

                    if (event.data && event.data.type === 'auth_callback') {
                        window.removeEventListener('message', handleMessage);

                        if (event.data.error) {
                            reject(new Error(event.data.error));
                        } else {
                            const session = event.data.session;
                            this.setSession(session);
                            resolve(session);
                        }

                        // Close the window
                        if (this.loginWindow && !this.loginWindow.closed) {
                            this.loginWindow.close();
                            this.loginWindow = null;
                        }
                    }
                };

                window.addEventListener('message', handleMessage);

                // Fallback for closed window without response
                const checkClosed = setInterval(() => {
                    if (this.loginWindow && this.loginWindow.closed) {
                        clearInterval(checkClosed);
                        window.removeEventListener('message', handleMessage);
                        reject(new Error('Login window was closed before authentication completed'));
                    }
                }, 1000);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Logout current user
     */
    public async logout(): Promise<void> {
        try {
            if (!this.currentSession) {
                return;
            }

            const endpoint = this.getAuthEndpoint('/api/auth/logout');

            await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.currentSession.token}`,
                    'Origin': window.location.origin,
                },
                credentials: 'include',
            });

            this.clearSession();
            this.emit('logout');
        } catch (error) {
            this.reportError('Logout failed', error);
            // Still clear the local session even if server logout fails
            this.clearSession();
        }
    }

    /**
     * Check if user is logged in
     */
    public isAuthenticated(): boolean {
        return !!this.currentSession && this.currentSession.expiry > Date.now();
    }

    /**
     * Get current user session
     */
    public getSession(): AuthSession | null {
        return this.currentSession;
    }

    /**
     * Verify and refresh current session
     */
    private async checkSession(): Promise<void> {
        try {
            // Try to load session from local storage
            const savedSession = localStorage.getItem('auth_session');

            if (savedSession) {
                const session = JSON.parse(savedSession) as AuthSession;

                // Check if session is expired
                if (session.expiry > Date.now()) {
                    this.currentSession = session;
                    this.emit('authenticated', { userId: session.userId });

                    // Verify with server if it's been a while
                    if (Date.now() - session.lastVerified > 1000 * 60 * 30) { // 30 minutes
                        this.verifySession();
                    }
                } else {
                    // Session expired, try refresh
                    this.refreshSession();
                }
            }
        } catch (error) {
            this.reportError('Session check failed', error);
            this.clearSession();
        }
    }

    /**
     * Verify session with auth server
     */
    private async verifySession(): Promise<void> {
        try {
            if (!this.currentSession) return;

            const endpoint = this.getAuthEndpoint('/api/auth/verify');

            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.currentSession.token}`,
                    'Origin': window.location.origin,
                },
                credentials: 'include',
            });

            if (response.ok) {
                // Update last verified timestamp
                this.currentSession.lastVerified = Date.now();
                this.saveSession();
            } else {
                // Session invalid, try refresh
                this.refreshSession();
            }
        } catch (error) {
            // If CORS error, try with proxy
            if (this.isCorsError(error)) {
                this.useLocalProxy = true;
                await this.verifySession();
            } else {
                this.reportError('Session verification failed', error);
            }
        }
    }

    /**
     * Refresh authentication token
     */
    private async refreshSession(): Promise<void> {
        try {
            const endpoint = this.getAuthEndpoint('/api/auth/refresh');

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': window.location.origin,
                },
                credentials: 'include',
            });

            if (response.ok) {
                const session = await response.json();
                this.setSession(session);
                this.emit('session_refreshed');
            } else {
                this.clearSession();
                this.emit('session_expired');
            }
        } catch (error) {
            // If CORS error, try with proxy
            if (this.isCorsError(error)) {
                this.useLocalProxy = true;
                await this.refreshSession();
            } else {
                this.reportError('Session refresh failed', error);
                this.clearSession();
                this.emit('session_expired');
            }
        }
    }

    /**
     * Set up automatic session refresh
     */
    private setupSessionRefresh(): void {
        // Check session every minute
        setInterval(() => {
            if (this.currentSession) {
                // Refresh when token is close to expiry (5 minutes before)
                const timeToExpiry = this.currentSession.expiry - Date.now();
                if (timeToExpiry < 1000 * 60 * 5) {
                    this.refreshSession();
                }
            }
        }, 60000);
    }

    /**
     * Set current session
     */
    private setSession(session: AuthSession): void {
        this.currentSession = {
            ...session,
            lastVerified: Date.now()
        };

        this.saveSession();
        this.emit('authenticated', { userId: session.userId });
    }

    /**
     * Save session to local storage
     */
    private saveSession(): void {
        if (this.currentSession) {
            try {
                localStorage.setItem('auth_session', JSON.stringify(this.currentSession));
            } catch (error) {
                // Handle potential localStorage errors
                this.reportError('Failed to save session to local storage', error);
            }
        }
    }

    /**
     * Clear current session
     */
    private clearSession(): void {
        this.currentSession = null;
        localStorage.removeItem('auth_session');
    }

    /**
     * Get authentication endpoint with CORS handling
     */
    private getAuthEndpoint(path: string): string {
        // If we're using a proxy to avoid CORS issues
        if (this.useLocalProxy) {
            return `${this.corsProxyUrl}${path}`;
        }

        return `${this.authServerUrl}${path}`;
    }

    /**
     * Check if an error is CORS related
     */
    private isCorsError(error: any): boolean {
        const errorString = error.toString();
        return (
            errorString.includes('CORS') ||
            errorString.includes('cross-origin') ||
            errorString.includes('Cross-Origin')
        );
    }

    /**
     * Check if an error is retryable
     */
    private isRetryableError(error: any): boolean {
        const errorString = error.toString();

        // Network errors are generally retryable
        if (
            errorString.includes('network') ||
            errorString.includes('Network') ||
            errorString.includes('timeout') ||
            errorString.includes('Timeout') ||
            errorString.includes('Connection') ||
            errorString.includes('connection')
        ) {
            return true;
        }

        // Server errors (5xx) are often temporary
        if (error.status && error.status >= 500 && error.status < 600) {
            return true;
        }

        // Some 4xx errors might be retryable
        if (error.status && (error.status === 429 || error.status === 408)) {
            return true;
        }

        return false;
    }

    /**
     * Check if the origin is valid for message events
     */
    private isValidOrigin(origin: string): boolean {
        const validOrigins = [
            this.authServerUrl,
            this.corsProxyUrl,
            window.location.origin
        ];

        return validOrigins.some(validOrigin => origin === validOrigin);
    }

    /**
     * Report errors using IOErrorService
     */
    private reportError(message: string, error: any): void {
        const errorDetails = error instanceof Error ? error.message : String(error);

        ioErrorService.reportError({
            type: IOErrorType.NETWORK_REQUEST,
            severity: IOErrorSeverity.ERROR,
            message: message,
            details: errorDetails,
            source: 'AuthService',
            retryable: this.isRetryableError(error),
            error: error instanceof Error ? error : new Error(errorDetails)
        });

        this.emit('error', { message, error });
    }

    /**
     * Check if login is currently in progress
     */
    public isLoginInProgress(): boolean {
        return this.loginInProgress;
    }
    
    /**
     * Get last login error if any
     */
    public getLastLoginError(): Error | null {
        return this.lastLoginError;
    }
    
    /**
     * Reset auth state (useful to recover from errors)
     */
    public resetAuthState(): void {
        this.loginInProgress = false;
        this.lastLoginError = null;
    }
}

export const authService = AuthService.getInstance();
export default authService;
