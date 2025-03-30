import { appDiagnosticsService } from './AppDiagnosticsService';
import { authRecoveryHandler } from './AuthRecoveryHandler';
import { authService } from './AuthService';

/**
 * Error boundary service for catching and handling errors at the application level
 * Particularly useful for recovering from post-login unresponsiveness
 */
export class AppErrorBoundary {
    private static instance: AppErrorBoundary;
    private errorHandlerInstalled = false;
    private promiseHandlerInstalled = false;
    private mutationObserverInstalled = false;
    private frozenUIDetectorInstalled = false;
    private readonly UI_FREEZE_CHECK_INTERVAL = 3000; // 3 seconds
    private uiCheckerInterval: any = null;
    private lastUIUpdateTime = 0;
    
    private constructor() {}
    
    /**
     * Get singleton instance
     */
    public static getInstance(): AppErrorBoundary {
        if (!AppErrorBoundary.instance) {
            AppErrorBoundary.instance = new AppErrorBoundary();
        }
        return AppErrorBoundary.instance;
    }
    
    /**
     * Initialize error boundary and install global handlers
     */
    public initialize(): void {
        this.installGlobalErrorHandler();
        this.installUnhandledPromiseHandler();
        this.installDOMMutationObserver();
        this.installFrozenUIDetector();
        
        console.log('🛡️ App error boundary initialized');
    }
    
    /**
     * Install global error handler
     */
    private installGlobalErrorHandler(): void {
        if (this.errorHandlerInstalled || typeof window === 'undefined') return;
        
        const originalOnError = window.onerror;
        
        window.onerror = (message, source, lineno, colno, error) => {
            // Try to recover if this is happening post-login
            this.handleError(error || new Error(String(message)), 'global');
            
            // Call original handler if it exists
            if (typeof originalOnError === 'function') {
                return originalOnError(message, source, lineno, colno, error);
            }
            
            return false;
        };
        
        this.errorHandlerInstalled = true;
    }
    
    /**
     * Install unhandled promise rejection handler
     */
    private installUnhandledPromiseHandler(): void {
        if (this.promiseHandlerInstalled || typeof window === 'undefined') return;
        
        const originalUnhandledRejection = window.onunhandledrejection;
        
        window.onunhandledrejection = (event) => {
            // Try to recover if this is happening post-login
            const error = event.reason instanceof Error 
                ? event.reason 
                : new Error(String(event.reason));
                
            this.handleError(error, 'promise');
            
            // Call original handler if it exists
            if (typeof originalUnhandledRejection === 'function') {
                return originalUnhandledRejection(event);
            }
        };
        
        this.promiseHandlerInstalled = true;
    }
    
    /**
     * Install DOM mutation observer to track UI updates
     */
    private installDOMMutationObserver(): void {
        if (this.mutationObserverInstalled || 
            typeof window === 'undefined' || 
            typeof MutationObserver === 'undefined') return;
        
        // Track DOM updates to detect when UI is responding
        const observer = new MutationObserver(() => {
            this.lastUIUpdateTime = Date.now();
        });
        
        // Start observing once DOM is ready
        if (document && document.body) {
            observer.observe(document.body, { 
                childList: true, 
                subtree: true,
                attributes: true,
                characterData: true
            });
        } else {
            // If document not ready, wait for it
            window.addEventListener('DOMContentLoaded', () => {
                observer.observe(document.body, { 
                    childList: true, 
                    subtree: true,
                    attributes: true,
                    characterData: true
                });
            });
        }
        
        this.lastUIUpdateTime = Date.now();
        this.mutationObserverInstalled = true;
    }
    
    /**
     * Install detector for frozen UI (when DOM isn't updating)
     */
    private installFrozenUIDetector(): void {
        if (this.frozenUIDetectorInstalled || typeof window === 'undefined') return;
        
        // Clear any existing interval
        if (this.uiCheckerInterval) {
            clearInterval(this.uiCheckerInterval);
        }
        
        // Initialize last update time
        this.lastUIUpdateTime = Date.now();
        
        // Check if UI has been updated recently
        this.uiCheckerInterval = setInterval(() => {
            const timeSinceLastUpdate = Date.now() - this.lastUIUpdateTime;
            
            // If no UI updates for over 5 seconds during post-login
            if (timeSinceLastUpdate > 5000 && this.isInPostLoginState()) {
                console.warn(`⚠️ No UI updates for ${timeSinceLastUpdate}ms in post-login state`);
                this.handlePotentialUIFreeze();
            }
        }, this.UI_FREEZE_CHECK_INTERVAL);
        
        this.frozenUIDetectorInstalled = true;
    }
    
    /**
     * Check if we're in a post-login state (authenticated but possibly still initializing)
     */
    private isInPostLoginState(): boolean {
        try {
            return authService.isAuthenticated();
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Handle potential UI freeze by forcing state refresh and triggering recovery
     */
    private handlePotentialUIFreeze(): void {
        if (this.isInPostLoginState()) {
            console.log('🔄 Attempting recovery from potential UI freeze');
            
            // Try to get current user from session
            const session = authService.getSession();
            const userId = session?.userId;
            
            if (userId) {
                // Attempt recovery
                authRecoveryHandler.attemptRecovery(userId)
                    .then(success => {
                        if (success) {
                            console.log('✅ Successfully recovered from UI freeze');
                            this.forceUIRefresh();
                        } else {
                            console.error('❌ Failed to recover from UI freeze');
                        }
                    })
                    .catch(err => {
                        console.error('❌ Error during UI freeze recovery:', err);
                    });
            } else {
                // Generic recovery attempt
                this.forceUIRefresh();
            }
        }
    }
    
    /**
     * Handle an error caught by the boundary
     */
    private handleError(error: Error, source: string): void {
        // Register error with diagnostics service
        appDiagnosticsService.registerError(error, source);
        
        console.error(`❌ Error caught by boundary (${source}):`, error);
        
        // If this is happening post-login, try to recover
        if (this.isInPostLoginState()) {
            console.log('🔄 Error occurred in post-login state, attempting recovery');
            
            // Try to get current user from session
            const session = authService.getSession();
            const userId = session?.userId;
            
            if (userId) {
                // Attempt recovery
                authRecoveryHandler.attemptRecovery(userId).catch(e => {
                    console.error('Recovery failed:', e);
                });
            }
        }
    }
    
    /**
     * Force a UI refresh by triggering synthetic events
     */
    private forceUIRefresh(): void {
        // Update timestamp to avoid repeat recovery attempts
        this.lastUIUpdateTime = Date.now();
        
        // Dispatch synthetic events that might trigger UI refresh in frameworks
        if (typeof window !== 'undefined') {
            // Dispatch a custom event that the app can listen for
            window.dispatchEvent(new CustomEvent('app:force-refresh'));
            
            // Trigger a minimal resize which many frameworks respond to
            window.dispatchEvent(new Event('resize'));
        }
    }
}

export const appErrorBoundary = AppErrorBoundary.getInstance();
export default appErrorBoundary;
