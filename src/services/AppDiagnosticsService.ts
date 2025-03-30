import { EventEmitter } from 'events';
import { authService } from './AuthService';
import { postAuthInitService } from './PostAuthInitService';
import { authRecoveryHandler } from './AuthRecoveryHandler';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';

/**
 * Service for monitoring application health and diagnosing issues
 * particularly focusing on post-login responsiveness
 */
export class AppDiagnosticsService extends EventEmitter {
    private static instance: AppDiagnosticsService;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private uiRespondingTimeout: NodeJS.Timeout | null = null;
    private lastHeartbeat: number = 0;
    private uiResponsive: boolean = true;
    private frozenTimeSince: number | null = null;
    private currentDiagnostics: Record<string, any> = {};
    private recoveryInProgress: boolean = false;
    private readonly HEARTBEAT_CHECK_INTERVAL = 2000; // 2 seconds
    private readonly UI_RESPONSE_TIMEOUT = 5000; // 5 seconds
    private readonly MAX_ACCEPTABLE_FREEZE = 8000; // 8 seconds
    
    private constructor() {
        super();
        this.setupEventListeners();
    }
    
    /**
     * Get singleton instance
     */
    public static getInstance(): AppDiagnosticsService {
        if (!AppDiagnosticsService.instance) {
            AppDiagnosticsService.instance = new AppDiagnosticsService();
        }
        return AppDiagnosticsService.instance;
    }
    
    /**
     * Setup listeners for critical app events
     */
    private setupEventListeners(): void {
        // Monitor login lifecycle
        authService.on('login-start', this.onLoginStart.bind(this));
        authService.on('login-success', this.onLoginSuccess.bind(this));
        authService.on('authenticated', this.onAuthenticated.bind(this));
        
        // Monitor post-auth initialization
        postAuthInitService.on('init-start', this.onInitStart.bind(this));
        postAuthInitService.on('init-complete', this.onInitComplete.bind(this));
        postAuthInitService.on('init-failed', this.onInitFailed.bind(this));
        
        // Monitor recovery attempts
        authRecoveryHandler.on('recovery-start', this.onRecoveryStart.bind(this));
        authRecoveryHandler.on('recovery-success', this.onRecoveryEnd.bind(this));
        authRecoveryHandler.on('recovery-failed', this.onRecoveryEnd.bind(this));
    }
    
    /**
     * Initialize diagnostics monitoring
     */
    public initialize(): void {
        this.startHeartbeatMonitor();
        this.resetDiagnostics();
        console.log('🔍 App diagnostics monitoring started');
    }

    /**
     * Reset diagnostic data
     */
    private resetDiagnostics(): void {
        this.currentDiagnostics = {
            appStartTime: Date.now(),
            loginAttempts: 0,
            loginSuccess: false,
            authenticationTime: null,
            postAuthInitStarted: false,
            postAuthInitComplete: false,
            postAuthInitDuration: null,
            uiFreezes: [],
            recoveryAttempts: 0,
            recoverySuccess: false,
            criticalErrors: []
        };
    }
    
    /**
     * Start monitoring heartbeat to detect freezes
     */
    private startHeartbeatMonitor(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        this.lastHeartbeat = Date.now();
        this.uiResponsive = true;
        
        // Set up recurring heartbeat check
        this.heartbeatInterval = setInterval(() => {
            this.checkHeartbeat();
        }, this.HEARTBEAT_CHECK_INTERVAL);
        
        // Setup UI responsiveness monitoring
        this.scheduleUIResponsivenessCheck();
    }
    
    /**
     * Schedule a check to verify UI thread is not blocked
     */
    private scheduleUIResponsivenessCheck(): void {
        if (this.uiRespondingTimeout) {
            clearTimeout(this.uiRespondingTimeout);
        }
        
        // This timeout should execute immediately after current JS execution queue
        this.uiRespondingTimeout = setTimeout(() => {
            this.respondToHeartbeat();
            this.scheduleUIResponsivenessCheck();
        }, 0);
    }
    
    /**
     * Respond to heartbeat - this proves UI thread is alive
     */
    private respondToHeartbeat(): void {
        // Update last heartbeat time
        this.lastHeartbeat = Date.now();
        
        // If UI was previously frozen, record the recovery
        if (!this.uiResponsive) {
            const freezeDuration = this.frozenTimeSince ? Date.now() - this.frozenTimeSince : 0;
            
            this.currentDiagnostics.uiFreezes.push({
                startTime: this.frozenTimeSince,
                endTime: Date.now(),
                duration: freezeDuration,
                context: this.getAppStateContext()
            });
            
            this.emit('ui-recovered', { 
                freezeDuration,
                context: this.getAppStateContext()
            });
            
            console.log(`⚡ UI thread recovered after ${freezeDuration}ms freeze`);
        }
        
        this.uiResponsive = true;
        this.frozenTimeSince = null;
    }
    
    /**
     * Check if UI has responded to heartbeat
     */
    private checkHeartbeat(): void {
        const now = Date.now();
        const timeSinceLastHeartbeat = now - this.lastHeartbeat;
        
        // If too much time has elapsed without a heartbeat response, UI thread might be blocked
        if (timeSinceLastHeartbeat > this.UI_RESPONSE_TIMEOUT) {
            if (this.uiResponsive) {
                // UI just became unresponsive
                this.uiResponsive = false;
                this.frozenTimeSince = this.lastHeartbeat;
                
                console.warn(`⚠️ UI thread appears frozen for ${timeSinceLastHeartbeat}ms`);
                
                this.emit('ui-freeze-detected', {
                    timeSinceLastHeartbeat,
                    context: this.getAppStateContext()
                });
                
                // If freeze has lasted too long, attempt recovery
                if (timeSinceLastHeartbeat > this.MAX_ACCEPTABLE_FREEZE) {
                    this.attemptFreezeRecovery();
                }
            }
        }
    }
    
    /**
     * Attempt to recover from UI freeze
     */
    private attemptFreezeRecovery(): void {
        if (this.recoveryInProgress) return;
        
        this.recoveryInProgress = true;
        console.log('🔄 Attempting to recover from UI freeze');
        
        // Focus on post-login issues
        const authState = this.getAuthStatus();
        const initState = this.getInitializationStatus();
        
        // If we're stuck after login but before initialization completes
        if (authState.authenticated && !initState.complete) {
            console.log('🔍 Detected freeze during post-auth initialization');
            
            // Reset auth state (clear any pending operations)
            authService.resetAuthState();
            
            // Attempt recovery using the recovery handler
            authRecoveryHandler.attemptRecovery(authState.userId || 'unknown')
                .then(success => {
                    if (success) {
                        console.log('✅ Successfully recovered from post-login freeze');
                        // Force UI update by dispatching an event
                        this.emit('force-ui-update');
                    } else {
                        console.error('❌ Failed to recover from post-login freeze');
                    }
                    this.recoveryInProgress = false;
                })
                .catch(err => {
                    console.error('❌ Error during freeze recovery:', err);
                    this.recoveryInProgress = false;
                });
        } else {
            // Generic recovery for other cases
            setTimeout(() => {
                this.emit('force-ui-update');
                this.recoveryInProgress = false;
                console.log('🔍 Attempted generic UI recovery');
            }, 100);
        }
    }
    
    /**
     * Get current auth status
     */
    private getAuthStatus(): {authenticated: boolean, userId?: string} {
        try {
            const isAuth = authService.isAuthenticated();
            const session = authService.getSession();
            return {
                authenticated: isAuth,
                userId: session?.userId
            };
        } catch (e) {
            return { authenticated: false };
        }
    }
    
    /**
     * Get current initialization status
     */
    private getInitializationStatus(): {started: boolean, complete: boolean} {
        try {
            const inProgress = postAuthInitService.isInitializationInProgress();
            const state = postAuthInitService.getInitializationState();
            
            const hasState = Object.keys(state).length > 0;
            const allComplete = hasState && 
                Object.values(state).every(s => s === 'success');
                
            return {
                started: hasState,
                complete: hasState && !inProgress && allComplete
            };
        } catch (e) {
            return { started: false, complete: false };
        }
    }
    
    /**
     * Get current application state context
     */
    private getAppStateContext(): {
        auth: {authenticated: boolean, userId?: string},
        init: {started: boolean, complete: boolean, state: Record<string, string>},
        recovery: {inProgress: boolean, attempts: number}
    } {
        return {
            auth: this.getAuthStatus(),
            init: {
                ...this.getInitializationStatus(),
                state: postAuthInitService.getInitializationState()
            },
            recovery: {
                inProgress: authRecoveryHandler.isRecovering(),
                attempts: authRecoveryHandler.getRecoveryAttempts()
            }
        };
    }
    
    /**
     * Handle login start event
     */
    private onLoginStart(): void {
        this.currentDiagnostics.loginAttempts++;
    }
    
    /**
     * Handle login success event
     */
    private onLoginSuccess(): void {
        this.currentDiagnostics.loginSuccess = true;
    }
    
    /**
     * Handle authenticated event
     */
    private onAuthenticated(): void {
        this.currentDiagnostics.authenticationTime = Date.now();
    }
    
    /**
     * Handle initialization start event
     */
    private onInitStart(): void {
        this.currentDiagnostics.postAuthInitStarted = true;
        this.currentDiagnostics.postAuthInitStartTime = Date.now();
    }
    
    /**
     * Handle initialization complete event
     */
    private onInitComplete(): void {
        this.currentDiagnostics.postAuthInitComplete = true;
        if (this.currentDiagnostics.postAuthInitStartTime) {
            this.currentDiagnostics.postAuthInitDuration = 
                Date.now() - this.currentDiagnostics.postAuthInitStartTime;
        }
    }
    
    /**
     * Handle initialization failure event
     */
    private onInitFailed(data: any): void {
        this.currentDiagnostics.postAuthInitComplete = false;
        this.currentDiagnostics.postAuthInitError = {
            message: data.error?.message,
            state: data.state
        };
        
        this.currentDiagnostics.criticalErrors.push({
            time: Date.now(),
            type: 'initialization_failed',
            error: data.error?.message || 'Unknown error',
            context: this.getAppStateContext()
        });
        
        // Report to IOErrorService
        ioErrorService.reportError({
            type: IOErrorType.UNKNOWN,
            severity: IOErrorSeverity.ERROR,
            message: 'Post-auth initialization failed',
            details: data.error?.message || 'Unknown initialization error',
            source: 'AppDiagnosticsService',
            retryable: true,
            error: data.error || new Error('Initialization failed')
        });
    }
    
    /**
     * Handle recovery start event
     */
    private onRecoveryStart(): void {
        this.currentDiagnostics.recoveryAttempts++;
    }
    
    /**
     * Handle recovery end event
     */
    private onRecoveryEnd(data: any): void {
        this.currentDiagnostics.recoverySuccess = !!data?.success;
    }
    
    /**
     * Get current diagnostics data
     */
    public getDiagnostics(): Record<string, any> {
        return {
            ...this.currentDiagnostics,
            currentState: this.getAppStateContext(),
            uiResponsive: this.uiResponsive,
            lastHeartbeat: this.lastHeartbeat,
            timestamp: Date.now()
        };
    }
    
    /**
     * Check if the UI is currently responsive
     */
    public isUIResponsive(): boolean {
        return this.uiResponsive;
    }
    
    /**
     * Register an error that was caught by the application
     */
    public registerError(error: Error, context: string): void {
        this.currentDiagnostics.criticalErrors.push({
            time: Date.now(),
            type: context,
            error: error.message,
            stack: error.stack,
            context: this.getAppStateContext()
        });
        
        // Report to IOErrorService
        ioErrorService.reportError({
            type: IOErrorType.UNKNOWN,
            severity: IOErrorSeverity.ERROR,
            message: `Error in ${context}`,
            details: error.message,
            source: context,
            retryable: false,
            error
        });
    }
}

export const appDiagnosticsService = AppDiagnosticsService.getInstance();
export default appDiagnosticsService;
