import { useUIStore } from '@/state/ui';
import { useUserStore } from '@/state/user';
import { useWalletStore } from '@/state/blockchain';
import { useContentStore } from '@/state/content';
import { useStreamingStore } from '@/state/streaming';
import { useConfigStore, useMetaStore } from '@/state/system';
import { logger } from '@/modules/logger';

/**
 * WorldState represents the current state of the application "world"
 */
interface WorldState {
    initialized: boolean;
    runningServices: string[];
    health: 'starting' | 'healthy' | 'degraded' | 'failing';
    startTime: number | null;
    errors: { component: string; error: string; timestamp: number }[];
}

/**
 * World class manages the entire application system lifecycle.
 * It coordinates initialization of all system components, monitors health,
 * and provides centralized control over the application "world".
 */
export class World {
    private static instance: World;
    private state: WorldState = {
        initialized: false,
        runningServices: [],
        health: 'starting',
        startTime: null,
        errors: [],
    };

    private constructor() {
        // Private constructor for singleton pattern
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): World {
        if (!World.instance) {
            World.instance = new World();
        }
        return World.instance;
    }

    /**
     * Initialize and run the entire application world
     */
    public async run(options: { autoConnect?: boolean } = {}): Promise<boolean> {
        try {
            logger.info('Starting Web3 Crypto Streaming Service world...');
            this.state.startTime = Date.now();

            // Initialize all state stores in the correct order
            await this.initializeSystemState();
            await this.initializeUIState();

            if (options.autoConnect) {
                await this.initializeBlockchainState();
            }

            await this.initializeUserState();
            await this.initializeContentState();
            await this.initializeStreamingState();

            // Register system services
            this.registerCoreServices();

            // Start event listeners and background tasks
            this.startBackgroundTasks();

            this.state.initialized = true;
            this.state.health = 'healthy';

            const startupTime = (Date.now() - this.state.startTime) / 1000;
            logger.info(`World startup complete in ${startupTime.toFixed(2)}s`);

            return true;
        } catch (error) {
            this.state.health = 'failing';
            this.state.errors.push({
                component: 'world',
                error: error.message,
                timestamp: Date.now(),
            });

            logger.error('Failed to start world:', error);
            return false;
        }
    }

    /**
     * Shutdown the application world
     */
    public async shutdown(): Promise<void> {
        logger.info('Shutting down world...');

        try {
            // Clean up streaming connections
            const streamingStore = useStreamingStore();
            await streamingStore.cleanupStreams();

            // Disconnect wallet if connected
            const walletStore = useWalletStore();
            if (walletStore.isConnected) {
                await walletStore.disconnectWallet();
            }

            // Stop all running services
            this.stopServices();

            this.state.initialized = false;
            this.state.health = 'starting';
            logger.info('World shutdown complete');
        } catch (error) {
            logger.error('Error during world shutdown:', error);
            throw error;
        }
    }

    /**
     * Get the current world state
     */
    public getState(): Readonly<WorldState> {
        return { ...this.state };
    }

    /**
     * Initialize the system state (configuration and meta)
     */
    private async initializeSystemState(): Promise<void> {
        try {
            logger.info('Initializing system state...');

            // Initialize config store
            const configStore = useConfigStore();
            configStore.setInitialized();

            // Load meta analysis data
            const metaStore = useMetaStore();
            await metaStore.loadMetaAnalysis();

            this.state.runningServices.push('system');
        } catch (error) {
            this.handleInitError('system', error);
        }
    }

    /**
     * Initialize the UI state
     */
    private async initializeUIState(): Promise<void> {
        try {
            logger.info('Initializing UI state...');

            // Initialize UI store
            const uiStore = useUIStore();

            // Apply system theme
            const darkMode = localStorage.getItem('darkMode') === 'true';
            document.documentElement.classList.toggle('dark-theme', darkMode);

            this.state.runningServices.push('ui');
        } catch (error) {
            this.handleInitError('ui', error);
        }
    }

    /**
     * Initialize blockchain state
     */
    private async initializeBlockchainState(): Promise<void> {
        try {
            logger.info('Initializing blockchain state...');

            // Connect wallet automatically
            const walletStore = useWalletStore();
            await walletStore.connectWallet();

            this.state.runningServices.push('blockchain');
        } catch (error) {
            this.handleInitError('blockchain', error);
            // Non-critical error, can continue without wallet
        }
    }

    /**
     * Initialize user state
     */
    private async initializeUserState(): Promise<void> {
        try {
            logger.info('Initializing user state...');

            const userStore = useUserStore();
            const walletStore = useWalletStore();

            if (walletStore.isConnected) {
                await userStore.loadProfile();
            }

            this.state.runningServices.push('user');
        } catch (error) {
            this.handleInitError('user', error);
            // Non-critical error, can continue without user profile
        }
    }

    /**
     * Initialize content state
     */
    private async initializeContentState(): Promise<void> {
        try {
            logger.info('Initializing content state...');

            const contentStore = useContentStore();
            await contentStore.loadFeaturedContent();

            this.state.runningServices.push('content');
        } catch (error) {
            this.handleInitError('content', error);
        }
    }

    /**
     * Initialize streaming state
     */
    private async initializeStreamingState(): Promise<void> {
        try {
            logger.info('Initializing streaming state...');

            const streamingStore = useStreamingStore();
            await streamingStore.initialize().catch(() => {
                logger.warn('Streaming service initialization deferred - no wallet connection');
            });

            this.state.runningServices.push('streaming');
        } catch (error) {
            this.handleInitError('streaming', error);
            // Non-critical error, can initialize later when needed
        }
    }

    /**
     * Register core services
     */
    private registerCoreServices(): void {
        // Register any core services that need to run
        this.state.runningServices.push('core');
    }

    /**
     * Start background tasks
     */
    private startBackgroundTasks(): void {
        // Start any background processes or timers

        // Example: Periodic wallet refresh
        setInterval(() => {
            const walletStore = useWalletStore();
            if (walletStore.isConnected) {
                walletStore.refreshBalance();
            }
        }, 30000); // Every 30 seconds
    }

    /**
     * Stop all running services
     */
    private stopServices(): void {
        this.state.runningServices = [];
    }

    /**
     * Handle initialization errors
     */
    private handleInitError(component: string, error: Error): void {
        this.state.health = 'degraded';
        this.state.errors.push({
            component,
            error: error.message,
            timestamp: Date.now(),
        });
        logger.error(`Failed to initialize ${component}:`, error);
    }
}

// Export singleton instance
export const world = World.getInstance();
