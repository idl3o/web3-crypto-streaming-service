import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { ContentStream } from './streamingService';
import { useCivilizationStore } from '@/stores/civilizationStore';

export enum TransactionType {
    STREAM_PAYMENT = 'stream_payment',
    ESSENCE_EARNED = 'essence_earned',
    TOKEN_MINTED = 'token_minted',
    TOKEN_ENCHANTED = 'token_enchanted',
    FEE_DISCOUNT = 'fee_discount'
}

export interface Transaction {
    id: string;
    userId: string;
    type: TransactionType;
    amount: number;
    originalAmount?: number;
    timestamp: number;
    status: 'pending' | 'completed' | 'failed';
    txHash?: string;
    contentId?: string;
    contentTitle?: string;
    creatorAddress?: string;
    tokenId?: string;
    faeEssence?: number;
    discountApplied?: number;
    details?: Record<string, any>;
}

export class TransactionService {
    private provider: ethers.providers.Web3Provider;
    private transactions: Transaction[] = [];

    constructor(provider: ethers.providers.Web3Provider) {
        this.provider = provider;
        this.civilizationStore = useCivilizationStore();
        this.loadTransactions();
    }

    private loadTransactions(): void {
        try {
            const savedTransactions = localStorage.getItem('transactions');
            if (savedTransactions) {
                this.transactions = JSON.parse(savedTransactions);
            }
        } catch (error) {
            console.error('Failed to load transactions from storage:', error);
            this.transactions = [];
        }
    }

    private saveTransactions(): void {
        try {
            localStorage.setItem('transactions', JSON.stringify(this.transactions));
        } catch (error) {
            console.error('Failed to save transactions to storage:', error);
        }
    }

    async recordStreamPayment(
        userAddress: string,
        stream: ContentStream,
        amount: number,
        faeDiscount: number = 0
    ): Promise<Transaction> {
        // Get the civilization discount
        const civilizationStore = useCivilizationStore();
        const civDiscount = civilizationStore.feeDiscount;

        // Calculate total discount (Fae + Civilization discount, capped at 15%)
        const totalDiscount = Math.min(0.15, faeDiscount + civDiscount);

        // Calculate original amount based on total discount
        const originalAmount = amount / (1 - totalDiscount);

        // Create the transaction
        const transaction: Transaction = {
            id: uuidv4(),
            userId: userAddress,
            type: TransactionType.STREAM_PAYMENT,
            amount: amount,
            originalAmount: originalAmount,
            timestamp: Date.now(),
            status: 'completed',
            contentId: stream.id,
            contentTitle: stream.title,
            discountApplied: totalDiscount,
            details: {
                timeWatched: stream.timeWatched,
                paymentRate: stream.paymentRate
            }
        };

        this.transactions.unshift(transaction);
        this.saveTransactions();

        return transaction;
    }

    /**
     * Record a Fae ecosystem transaction
     */
    async recordFaeTransaction(
        userAddress: string,
        type: TransactionType,
        amount: number,
        details: {
            tokenId?: string;
            contentId?: string;
            contentTitle?: string;
            faeEssence?: number;
            [key: string]: any;
        }
    ): Promise<Transaction> {
        const tx: Transaction = {
            id: ethers.utils.id(`fae_${userAddress}_${type}_${Date.now()}`).slice(0, 16),
            userId: userAddress,
            type: type,
            amount: amount,
            timestamp: Date.now(),
            contentId: details.contentId,
            contentTitle: details.contentTitle,
            tokenId: details.tokenId,
            faeEssence: details.faeEssence,
            status: 'completed', // Fae transactions are considered immediate
            details: details
        };

        // Store the transaction
        this.transactions.unshift(tx);
        this.saveTransactions();

        // Notify listeners
        this.notifyListeners(tx);

        return tx;
    }

    /**
     * Get all transactions
     */
    getAllTransactions(): Transaction[] {
        return this.transactions.sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
    }

    /**
     * Get transactions for specific content
     */
    getTransactionsForContent(contentId: string): Transaction[] {
        return this.getAllTransactions().filter(tx => tx.contentId === contentId);
    }

    /**
     * Get transactions by type
     */
    getTransactionsByType(type: TransactionType): Transaction[] {
        return this.getAllTransactions().filter(tx => tx.type === type);
    }

    /**
     * Calculate total spent on content streaming
     */
    getTotalStreamingSpend(): number {
        return this.getTransactionsByType(TransactionType.STREAM_PAYMENT)
            .filter(tx => tx.status === 'completed')
            .reduce((total, tx) => total + tx.amount, 0);
    }

    /**
     * Calculate total Fae essence earned
     */
    getTotalFaeEssenceEarned(): number {
        return this.getAllTransactions()
            .filter(tx => tx.faeEssence && tx.status === 'completed')
            .reduce((total, tx) => total + (tx.faeEssence || 0), 0);
    }

    /**
     * Calculate total discount savings from Fae
     */
    getTotalDiscountSavings(): number {
        return this.getTransactionsByType(TransactionType.STREAM_PAYMENT)
            .filter(tx => tx.discountApplied && tx.status === 'completed')
            .reduce((total, tx) => {
                if (tx.originalAmount && tx.amount) {
                    return total + (tx.originalAmount - tx.amount);
                }
                return total;
            }, 0);
    }

    /**
     * Add a transaction listener
     */
    addListener(callback: (tx: Transaction) => void): void {
        this.listeners.push(callback);
    }

    /**
     * Remove a transaction listener
     */
    removeListener(callback: (tx: Transaction) => void): void {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    /**
     * Notify all listeners about a new transaction
     */
    private notifyListeners(tx: Transaction): void {
        this.listeners.forEach(listener => {
            try {
                listener(tx);
            } catch (err) {
                console.error('Error in transaction listener:', err);
            }
        });
    }

    /**
     * Get a transaction by ID
     */
    getTransactionById(id: string): Transaction | undefined {
        return this.transactions.find(tx => tx.id === id);
    }
}
