import { appDiagnosticsService } from './AppDiagnosticsService';
import { appErrorBoundary } from './AppErrorBoundary';
import { completionTimeoutManager } from './CompletionTimeoutManager';

/**
 * Service that handles proper initialization of the application
 * with error handling and diagnostics
 */
export class AppInitializer {
    private static instance: AppInitializer;
    private initialized = false;
    
    private constructor() {}
    
    /**
     * Get singleton instance
     */
    public static getInstance(): AppInitializer {
        if (!AppInitializer.instance) {
            AppInitializer.instance = new AppInitializer();
        }
        return AppInitializer.instance;
    }
    
    /**
     * Initialize the application with safety mechanisms
     */
    public async initialize(): Promise<boolean> {
        if (this.initialized) {
            return true;
        }
        
        try {
            console.log('🚀 Initializing app with safety mechanisms');
            
            // Initialize in a specific order:
            
            // 1. Set up error boundary first to catch any errors during initialization
            appErrorBoundary.initialize();
            
            // 2. Initialize diagnostics to monitor for freezes
            appDiagnosticsService.initialize();
            
            // 3. Initialize completion timeout manager to fix TabNine issue #683
            // This needs to be initialized early to catch any completion timeouts
            const timeoutStats = completionTimeoutManager.getTimeoutStats();
            console.log('📊 Completion timeout manager initialized:', timeoutStats);
            
            // Add a small delay to ensure listeners are attached
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Add DOM-ready listener
            if (typeof document !== 'undefined') {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        console.log('✅ DOM content loaded');
                    });
                } else {
                    console.log('✅ DOM already loaded');
                }
            }
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('❌ Error during app initialization:', error);
            return false;
        }
    }
}

export const appInitializer = AppInitializer.getInstance();
export default appInitializer;
