import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useWalletStore } from './wallet';
import { TransactionService, TransactionType } from '@/services/transactionService';
import { ContentStream } from '@/services/streamingService';
import { initializeAPI, getTransactionAPI, TransactionStatistics } from '@/api';

export const useTransactionStore = defineStore('transactions', () => {
    // State
    const transactionService = ref<TransactionService | null>(null);
    const transactions = ref<any[]>([]);
    const statistics = ref<TransactionStatistics | null>(null);
    const isInitialized = ref<boolean>(false);
    const isLoading = ref<boolean>(false);
    const error = ref<string | null>(null);
    const newTransactionAlert = ref<any | null>(null);

    // Getters
    const streamingTransactions = computed(() => {
        return transactions.value.filter(tx => tx.type === TransactionType.STREAM_PAYMENT);
    });

    const faeTransactions = computed(() => {
        return transactions.value.filter(tx =>
            tx.type === TransactionType.ESSENCE_EARNED ||
            tx.type === TransactionType.TOKEN_MINTED ||
            tx.type === TransactionType.TOKEN_ENCHANTED
        );
    });

    const totalSpent = computed(() => {
        return transactionService.value?.getTotalStreamingSpend() || 0;
    });

    const totalEssenceEarned = computed(() => {
        return transactionService.value?.getTotalFaeEssenceEarned() || 0;
    });

    const totalSavings = computed(() => {
        return transactionService.value?.getTotalDiscountSavings() || 0;
    });

    // Transaction stats grouped by day (for charts)
    const dailyStats = computed(() => {
        const stats: Record<string, { date: string, spent: number, saved: number, essence: number }> = {};

        transactions.value.forEach(tx => {
            const date = new Date(tx.timestamp);
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format

            if (!stats[dateStr]) {
                stats[dateStr] = {
                    date: dateStr,
                    spent: 0,
                    saved: 0,
                    essence: 0
                };
            }

            if (tx.type === TransactionType.STREAM_PAYMENT && tx.status === 'completed') {
                stats[dateStr].spent += tx.amount;

                if (tx.originalAmount && tx.discountApplied && tx.discountApplied > 0) {
                    stats[dateStr].saved += (tx.originalAmount - tx.amount);
                }
            }

            if (tx.faeEssence && tx.status === 'completed') {
                stats[dateStr].essence += tx.faeEssence;
            }
        });

        return Object.values(stats).sort((a, b) => a.date.localeCompare(b.date));
    });

    // Actions
    async function initialize() {
        if (isInitialized.value) return;

        isLoading.value = true;
        error.value = null;

        try {
            const walletStore = useWalletStore();

            // Wait for wallet provider
            if (!walletStore.provider) {
                await walletStore.connectWallet();
            }

            if (!walletStore.provider) {
                throw new Error('Wallet provider not available');
            }

            // Initialize transaction service
            transactionService.value = new TransactionService(walletStore.provider);

            // Initialize the API
            initializeAPI(walletStore.provider);

            // Set up transaction listener
            transactionService.value.addListener(onNewTransaction);

            // Load transactions
            await refreshTransactions();

            isInitialized.value = true;
        } catch (err: any) {
            console.error('Failed to initialize transaction store:', err);
            error.value = err.message;
        } finally {
            isLoading.value = false;
        }
    }

    async function refreshTransactions() {
        if (!isInitialized.value && !transactionService.value) {
            await initialize();
        }

        try {
            isLoading.value = true;

            // Get transactions from API
            const response = await getTransactionAPI().getTransactions({ limit: 50 });
            transactions.value = response.transactions;

            // Get statistics
            statistics.value = await getTransactionAPI().getTransactionStatistics();
        } catch (err: any) {
            console.error('Failed to refresh transactions:', err);
            error.value = err.message;
        } finally {
            isLoading.value = false;
        }
    }

    async function recordStreamPayment(
        stream: ContentStream,
        amount: number,
        discountApplied = 0
    ): Promise<Transaction | null> {
        if (!transactionService.value) {
            await initialize();
        }

        if (!transactionService.value) {
            throw new Error('Transaction service not initialized');
        }

        const walletStore = useWalletStore();
        if (!walletStore.account) {
            throw new Error('Wallet not connected');
        }

        try {
            const tx = await transactionService.value.recordStreamPayment(
                walletStore.account,
                stream,
                amount,
                discountApplied
            );

            refreshTransactions();
            return tx;
        } catch (err: any) {
            console.error('Failed to record stream payment:', err);
            error.value = err.message;
            return null;
        }
    }

    async function recordFaeTransaction(
        type: TransactionType,
        amount: number,
        details: Record<string, any>
    ): Promise<Transaction | null> {
        if (!transactionService.value) {
            await initialize();
        }

        if (!transactionService.value) {
            throw new Error('Transaction service not initialized');
        }

        const walletStore = useWalletStore();
        if (!walletStore.account) {
            throw new Error('Wallet not connected');
        }

        try {
            const tx = await transactionService.value.recordFaeTransaction(
                walletStore.account,
                type,
                amount,
                details
            );

            refreshTransactions();
            return tx;
        } catch (err: any) {
            console.error('Failed to record Fae transaction:', err);
            error.value = err.message;
            return null;
        }
    }

    function getContentTransactions(contentId: string): Transaction[] {
        if (!transactionService.value) return [];

        return transactionService.value.getTransactionsForContent(contentId);
    }

    function onNewTransaction(tx: Transaction) {
        refreshTransactions();

        // Show alert for new transaction
        newTransactionAlert.value = tx;

        // Clear alert after 5 seconds
        setTimeout(() => {
            if (newTransactionAlert.value === tx) {
                newTransactionAlert.value = null;
            }
        }, 5000);
    }

    function clearTransactionAlert() {
        newTransactionAlert.value = null;
    }

    // Cleanup on unmount
    function cleanup() {
        if (transactionService.value) {
            transactionService.value.removeListener(onNewTransaction);
        }
    }

    return {
        // State
        transactions,
        isInitialized,
        isLoading,
        error,
        newTransactionAlert,
        statistics,

        // Getters
        streamingTransactions,
        faeTransactions,
        totalSpent,
        totalEssenceEarned,
        totalSavings,
        dailyStats,

        // Actions
        initialize,
        refreshTransactions,
        recordStreamPayment,
        recordFaeTransaction,
        getContentTransactions,
        clearTransactionAlert,
        cleanup
    };
});
