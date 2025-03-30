/**
 * Payment Tracker Service
 * Tracks and manages payment transactions across multiple blockchains
 */
import { EventEmitter } from 'events';

export enum PaymentStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    FAILED = 'failed',
    EXPIRED = 'expired',
    REFUNDED = 'refunded'
}

export enum PaymentType {
    SUBSCRIPTION = 'subscription',
    ONE_TIME = 'one_time',
    TIPPING = 'tipping',
    ZERO_FEE = 'zero_fee'
}

export interface PaymentTransaction {
    id: string;
    userId: string;
    recipientId: string;
    amount: string;
    currency: string;
    type: PaymentType;
    status: PaymentStatus;
    description?: string;
    contentId?: string;
    streamId?: string;
    transactionHash?: string;
    blockNumber?: number;
    networkFee?: string;
    timestamp: number;
    lastUpdated: number;
    expiresAt?: number;
    metadata?: Record<string, any>;
}

export interface PaymentFilter {
    userId?: string;
    recipientId?: string;
    contentId?: string;
    streamId?: string;
    status?: PaymentStatus[];
    type?: PaymentType[];
    currency?: string;
    fromDate?: number;
    toDate?: number;
}

export class PaymentTrackerService extends EventEmitter {
    private transactions: Map<string, PaymentTransaction> = new Map();

    constructor() {
        super();
        this.loadPersistedTransactions();
    }

    /**
     * Create a new payment transaction
     */
    public createTransaction(transaction: Omit<PaymentTransaction, 'id' | 'timestamp' | 'lastUpdated'>): PaymentTransaction {
        const id = this.generateTransactionId();
        const now = Date.now();

        const newTransaction: PaymentTransaction = {
            ...transaction,
            id,
            timestamp: now,
            lastUpdated: now,
            status: transaction.status || PaymentStatus.PENDING
        };

        this.transactions.set(id, newTransaction);
        this.persistTransactions();

        this.emit('transaction:created', newTransaction);
        return newTransaction;
    }

    /**
     * Get a transaction by ID
     */
    public getTransaction(id: string): PaymentTransaction | undefined {
        return this.transactions.get(id);
    }

    /**
     * Update a transaction's status
     */
    public updateTransactionStatus(
        id: string,
        status: PaymentStatus,
        details?: {
            transactionHash?: string;
            blockNumber?: number;
            metadata?: Record<string, any>;
        }
    ): PaymentTransaction | undefined {
        const transaction = this.transactions.get(id);

        if (!transaction) {
            return undefined;
        }

        const updatedTransaction: PaymentTransaction = {
            ...transaction,
            status,
            lastUpdated: Date.now(),
            ...details
        };

        this.transactions.set(id, updatedTransaction);
        this.persistTransactions();

        this.emit('transaction:updated', updatedTransaction);
        return updatedTransaction;
    }

    /**
     * Find transactions matching the given filters
     */
    public findTransactions(filter: PaymentFilter = {}): PaymentTransaction[] {
        let results = Array.from(this.transactions.values());

        if (filter.userId) {
            results = results.filter(tx => tx.userId === filter.userId);
        }

        if (filter.recipientId) {
            results = results.filter(tx => tx.recipientId === filter.recipientId);
        }

        if (filter.contentId) {
            results = results.filter(tx => tx.contentId === filter.contentId);
        }

        if (filter.streamId) {
            results = results.filter(tx => tx.streamId === filter.streamId);
        }

        if (filter.status && filter.status.length > 0) {
            results = results.filter(tx => filter.status!.includes(tx.status));
        }

        if (filter.type && filter.type.length > 0) {
            results = results.filter(tx => filter.type!.includes(tx.type));
        }

        if (filter.currency) {
            results = results.filter(tx => tx.currency === filter.currency);
        }

        if (filter.fromDate) {
            results = results.filter(tx => tx.timestamp >= filter.fromDate!);
        }

        if (filter.toDate) {
            results = results.filter(tx => tx.timestamp <= filter.toDate!);
        }

        // Sort by timestamp, newest first
        return results.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Get user payment statistics
     */
    public getUserPaymentStats(userId: string): {
        totalSpent: Record<string, string>;
        totalReceived: Record<string, string>;
        transactionCount: number;
        pendingTransactions: number;
    } {
        const userTransactions = this.findTransactions({ userId });
        const receivedTransactions = this.findTransactions({ recipientId: userId });

        const totalSpent: Record<string, string> = {};
        const totalReceived: Record<string, string> = {};

        // Calculate total spent by currency
        userTransactions.forEach(tx => {
            if (tx.status === PaymentStatus.CONFIRMED) {
                if (!totalSpent[tx.currency]) {
                    totalSpent[tx.currency] = '0';
                }
                totalSpent[tx.currency] = (parseFloat(totalSpent[tx.currency]) + parseFloat(tx.amount)).toString();
            }
        });

        // Calculate total received by currency
        receivedTransactions.forEach(tx => {
            if (tx.status === PaymentStatus.CONFIRMED) {
                if (!totalReceived[tx.currency]) {
                    totalReceived[tx.currency] = '0';
                }
                totalReceived[tx.currency] = (parseFloat(totalReceived[tx.currency]) + parseFloat(tx.amount)).toString();
            }
        });

        return {
            totalSpent,
            totalReceived,
            transactionCount: userTransactions.length + receivedTransactions.length,
            pendingTransactions: userTransactions.filter(tx => tx.status === PaymentStatus.PENDING).length
        };
    }

    /**
     * Create a zero-fee transaction
     */
    public createZeroFeeTransaction(
        userId: string,
        recipientId: string,
        contentId?: string,
        streamId?: string,
        metadata?: Record<string, any>
    ): PaymentTransaction {
        return this.createTransaction({
            userId,
            recipientId,
            amount: '0',
            currency: 'ZERO',
            type: PaymentType.ZERO_FEE,
            status: PaymentStatus.CONFIRMED,
            contentId,
            streamId,
            metadata,
            description: 'Zero-fee transaction'
        });
    }

    /**
     * Save transactions to localStorage
     */
    private persistTransactions(): void {
        try {
            const serialized = JSON.stringify(Array.from(this.transactions.entries()));
            localStorage.setItem('payment_tracker_transactions', serialized);
        } catch (error) {
            console.error('Failed to persist transactions:', error);
        }
    }

    /**
     * Load transactions from localStorage
     */
    private loadPersistedTransactions(): void {
        try {
            const serialized = localStorage.getItem('payment_tracker_transactions');
            if (serialized) {
                const entries: [string, PaymentTransaction][] = JSON.parse(serialized);
                this.transactions = new Map(entries);

                // Check for expired transactions
                const now = Date.now();
                for (const [id, tx] of this.transactions.entries()) {
                    if (tx.status === PaymentStatus.PENDING && tx.expiresAt && tx.expiresAt < now) {
                        this.updateTransactionStatus(id, PaymentStatus.EXPIRED);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load persisted transactions:', error);
        }
    }

    /**
     * Generate a unique transaction ID
     */
    private generateTransactionId(): string {
        return 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    }
}

// Create singleton instance
export const paymentTrackerService = new PaymentTrackerService();
export default paymentTrackerService;
