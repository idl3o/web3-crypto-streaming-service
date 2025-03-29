import { reactive, ref } from 'vue';
import { useTransactionStore } from '@/stores/transactionStore';
import { useFaeStore } from '@/stores/fae';
import { useScoreStore } from '@/stores/scoreStore';
import { TransactionType } from '@/services/transactionService';

// Import the Haskell bridge
let haskellBridge: any = null;
try {
    haskellBridge = require('../../haskell/bridge');
} catch (error) {
    console.warn('Haskell bridge not available, falling back to JavaScript simulation');
}

/**
 * Simulation settings interface
 */
export interface SimulationSettings {
    transactionInterval: number;
    essenceGenerationRate: number;
    volatility: number;
    streamingRewardRate: number;
    transactionSuccessRate: number;
    enableRandomEvents: boolean;
    enableNetworkDelays: boolean;
    useHaskellEngine: boolean;
}

/**
 * Simulation statistics interface
 */
export interface SimulationStats {
    totalTransactions: number;
    totalEssenceGenerated: number;
    totalStreamingTime: number;
    totalFeesSaved: number;
    simulationStartTime: number;
    simulatedNetworkLatency: number;
    activeSimulations: string[];
}

/**
 * Class for managing simulated blockchain activities
 */
export class SimulatorService {
    private static instance: SimulatorService;
    private intervalIds: Record<string, number> = {};

    public isActive = ref(false);
    public settings = reactive<SimulationSettings>({
        transactionInterval: 30000, // ms
        essenceGenerationRate: 1.5,  // essence per minute
        volatility: 0.2,             // 0-1 random factor
        streamingRewardRate: 0.01,   // tokens per minute
        transactionSuccessRate: 0.95, // 95% success rate
        enableRandomEvents: true,
        enableNetworkDelays: true,
        useHaskellEngine: false      // Disabled by default
    });

    public stats = reactive<SimulationStats>({
        totalTransactions: 0,
        totalEssenceGenerated: 0,
        totalStreamingTime: 0,
        totalFeesSaved: 0,
        simulationStartTime: 0,
        simulatedNetworkLatency: 0,
        activeSimulations: []
    });

    private constructor() {
        // Private constructor for singleton
    }

    /**
     * Get the simulator service instance
     */
    public static getInstance(): SimulatorService {
        if (!SimulatorService.instance) {
            SimulatorService.instance = new SimulatorService();
        }
        return SimulatorService.instance;
    }

    /**
     * Start the simulation
     */
    public startSimulation(): void {
        if (this.isActive.value) return;

        this.isActive.value = true;
        this.stats.simulationStartTime = Date.now();

        // Start transaction simulation
        this.startTransactionSimulation();

        // Start essence generation simulation
        this.startEssenceSimulation();

        // Start streaming simulation
        this.startStreamingSimulation();

        // Log simulation start
        console.log('Simulation started with settings:', this.settings);
    }

    /**
     * Stop the simulation
     */
    public stopSimulation(): void {
        if (!this.isActive.value) return;

        this.isActive.value = false;

        // Clear all intervals
        Object.values(this.intervalIds).forEach(id => clearInterval(id));
        this.intervalIds = {};
        this.stats.activeSimulations = [];

        console.log('Simulation stopped. Final stats:', this.stats);
    }

    /**
     * Update simulation settings
     */
    public updateSettings(newSettings: Partial<SimulationSettings>): void {
        Object.assign(this.settings, newSettings);

        // Restart simulation if active
        if (this.isActive.value) {
            this.stopSimulation();
            this.startSimulation();
        }
    }

    /**
     * Use Haskell for complex calculations if available
     */
    private useHaskell(): boolean {
        return haskellBridge !== null && this.settings.useHaskellEngine;
    }

    /**
     * Start transaction simulation
     */
    private startTransactionSimulation(): void {
        const transactionStore = useTransactionStore();

        // Use Haskell for batch transaction generation if available
        if (this.useHaskell()) {
            this.intervalIds.transactions = window.setInterval(() => {
                try {
                    // Generate a batch of transactions using Haskell
                    const transactions = haskellBridge.generateTransactions(
                        5, // Generate 5 transactions at once
                        this.settings.volatility
                    );

                    // Process the transactions with appropriate delays
                    if (transactions && Array.isArray(transactions)) {
                        transactions.forEach((tx: any, index: number) => {
                            setTimeout(() => {
                                if (Math.random() < this.settings.transactionSuccessRate) {
                                    transactionStore.addTransaction(tx);
                                    this.stats.totalTransactions++;

                                    if (tx.type === TransactionType.FEE_DISCOUNT && tx.originalAmount) {
                                        this.stats.totalFeesSaved += (tx.originalAmount - tx.amount);
                                    }
                                }
                            }, index * (this.settings.transactionInterval / 5));
                        });
                    } else {
                        console.warn('Haskell returned invalid transaction data, falling back to JavaScript simulation');
                        this.fallbackTransactionGeneration(transactionStore);
                    }
                } catch (error) {
                    console.error('Error in Haskell transaction generation:', error);
                    // Fall back to JavaScript simulation
                    this.fallbackTransactionGeneration(transactionStore);
                }
            }, this.settings.transactionInterval);
        } else {
            // Original JavaScript implementation
            this.intervalIds.transactions = window.setInterval(() => {
                this.fallbackTransactionGeneration(transactionStore);
            }, this.settings.transactionInterval);
        }

        this.stats.activeSimulations.push('transactions');
    }

    /**
     * Fallback JavaScript transaction generation
     */
    private fallbackTransactionGeneration(transactionStore: any): void {
        // Simulate network delay
        const delay = this.settings.enableNetworkDelays ? 
            Math.random() * 2000 : 0;

        this.stats.simulatedNetworkLatency = delay;

        setTimeout(() => {
            // Determine if transaction is successful
            const isSuccess = Math.random() < this.settings.transactionSuccessRate;

            if (isSuccess) {
                // Create a simulated transaction
                const transaction = this.createSimulatedTransaction();
                transactionStore.addTransaction(transaction);

                // Update stats
                this.stats.totalTransactions++;

                if (transaction.type === TransactionType.FEE_DISCOUNT && transaction.originalAmount) {
                    this.stats.totalFeesSaved += (transaction.originalAmount - transaction.amount);
                }
            } else {
                console.log('Simulated transaction failed');
                // Could trigger a failed transaction notification
            }
        }, delay);
    }

    /**
     * Start essence generation simulation
     */
    private startEssenceSimulation(): void {
        const faeStore = useFaeStore();

        this.intervalIds.essence = window.setInterval(() => {
            const essenceAmount = (this.settings.essenceGenerationRate / 60) *
                (this.settings.transactionInterval / 1000) *
                (1 + (Math.random() * this.settings.volatility * 2 - this.settings.volatility));

            faeStore.addEssence(essenceAmount);
            this.stats.totalEssenceGenerated += essenceAmount;

        }, this.settings.transactionInterval);

        this.stats.activeSimulations.push('essence');
    }

    /**
     * Start streaming simulation
     */
    private startStreamingSimulation(): void {
        const scoreStore = useScoreStore();

        this.intervalIds.streaming = window.setInterval(() => {
            // Simulate streaming time
            const streamingTime = this.settings.transactionInterval / 1000; // in seconds
            this.stats.totalStreamingTime += streamingTime;

            // Process score updates
            scoreStore.processNewActivity();

        }, this.settings.transactionInterval);

        this.stats.activeSimulations.push('streaming');
    }

    /**
     * Create a simulated transaction
     */
    private createSimulatedTransaction() {
        const types = [
            TransactionType.STREAM_PAYMENT,
            TransactionType.ESSENCE_EARNED,
            TransactionType.TOKEN_MINTED,
            TransactionType.FEE_DISCOUNT
        ];

        const typeIndex = Math.floor(Math.random() * types.length);
        const type = types[typeIndex];
        const timestamp = Date.now();
        const address = '0x' + Math.random().toString(16).substring(2, 42);

        let transaction: any = {
            id: `sim-${timestamp}-${Math.floor(Math.random() * 1000)}`,
            type,
            timestamp,
            status: 'confirmed',
            address,
            blockNumber: Math.floor(Math.random() * 1000000) + 8000000
        };

        // Add type-specific properties
        switch (type) {
            case TransactionType.STREAM_PAYMENT:
                transaction.amount = Math.random() * 0.05;
                transaction.recipient = '0x' + Math.random().toString(16).substring(2, 42);
                transaction.details = {
                    contentId: `content-${Math.floor(Math.random() * 100)}`,
                    timeWatched: Math.floor(Math.random() * 30) + 1,
                    title: `Simulated Stream ${Math.floor(Math.random() * 10)}`
                };
                break;

            case TransactionType.ESSENCE_EARNED:
                transaction.faeEssence = Math.random() * 10;
                transaction.source = 'streaming';
                break;

            case TransactionType.TOKEN_MINTED:
                transaction.tokenId = `token-${Math.floor(Math.random() * 1000)}`;
                transaction.amount = 1;
                break;

            case TransactionType.FEE_DISCOUNT:
                const originalAmount = Math.random() * 0.1;
                const discountRate = Math.random() * 0.2;
                transaction.amount = originalAmount * (1 - discountRate);
                transaction.originalAmount = originalAmount;
                transaction.discountApplied = discountRate;
                break;
        }

        return transaction;
    }

    /**
     * Generate a random event
     */
    public triggerRandomEvent(): void {
        if (!this.settings.enableRandomEvents) return;

        const events = [
            'networkCongestion',
            'priceSpike',
            'serviceMaintenance',
            'tokenReward',
            'specialOffer'
        ];

        const event = events[Math.floor(Math.random() * events.length)];

        // Placeholder for event handling
        console.log(`Random event triggered: ${event}`);

        // Emit event for components to react to
        document.dispatchEvent(
            new CustomEvent('simulator:event', {
                detail: {
                    type: event,
                    timestamp: Date.now()
                }
            })
        );
    }

    /**
     * Reset simulation stats
     */
    public resetStats(): void {
        this.stats.totalTransactions = 0;
        this.stats.totalEssenceGenerated = 0;
        this.stats.totalStreamingTime = 0;
        this.stats.totalFeesSaved = 0;
        this.stats.simulationStartTime = this.isActive.value ? Date.now() : 0;
    }
}

// Export a default instance
export const simulatorService = SimulatorService.getInstance();
