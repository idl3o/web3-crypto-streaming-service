import axios from 'axios';
import {
    TransactionListRequest,
    TransactionListResponse,
    TransactionDetailResponse,
    TransactionStatistics,
    RecordStreamingPaymentRequest,
    RecordFaeTransactionRequest
} from './types/transaction';
import { Transaction, TransactionService, TransactionType } from '@/services/transactionService';
import { ContentStream } from '@/services/streamingService';
import { createTransactionIndex } from '@/components/transaction/TransactionOptimizer';

/**
 * API for managing transactions across the application
 */
export class TransactionAPI {
    private transactionService: TransactionService;
    private cache = new Map<string, { data: any, timestamp: number }>();
    private transactionIndex: ReturnType<typeof createTransactionIndex> | null = null;
    private cacheExpiry = 5 * 60 * 1000; // 5 minutes

    constructor(transactionService: TransactionService) {
        this.transactionService = transactionService;
        this.initializeTransactionIndex();
    }

    /**
     * Initialize the transaction index for fast lookups
     */
    private async initializeTransactionIndex(): Promise<void> {
        const transactions = this.transactionService.getAllTransactions();
        this.transactionIndex = createTransactionIndex(transactions);
    }

    /**
     * Get a cached result or calculate and cache a new one
     */
    private async getOrCalculate<T>(cacheKey: string, calculate: () => Promise<T> | T, expiry = this.cacheExpiry): Promise<T> {
        const cached = this.cache.get(cacheKey);
        const now = Date.now();

        if (cached && now - cached.timestamp < expiry) {
            return cached.data as T;
        }

        const result = await calculate();
        this.cache.set(cacheKey, { data: result, timestamp: now });

        return result;
    }

    /**
     * Invalidate a specific cache key or all cache if key not provided
     */
    private invalidateCache(key?: string): void {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    /**
     * Get a list of transactions with optional filtering
     */
    async getTransactions(request: TransactionListRequest = {}): Promise<TransactionListResponse> {
        const cacheKey = `transactions:${JSON.stringify(request)}`;
        return this.getOrCalculate(cacheKey, async () => {
            if (!this.transactionIndex) {
                await this.initializeTransactionIndex();
            }

            let transactions: Transaction[] = [];

            // Use indexed lookups when possible for better performance
            if (request.contentId && this.transactionIndex?.byContentId.has(request.contentId)) {
                transactions = this.transactionIndex.byContentId.get(request.contentId)!;
            } else if (request.type && this.transactionIndex?.byType.has(request.type)) {
                transactions = this.transactionIndex.byType.get(request.type)!;
            } else {
                transactions = this.transactionService.getAllTransactions();
            }

            // Apply date filters
            if (request.startDate) {
                const startTimestamp = request.startDate.getTime();
                transactions = transactions.filter(tx => tx.timestamp >= startTimestamp);
            }

            if (request.endDate) {
                const endTimestamp = request.endDate.getTime();
                transactions = transactions.filter(tx => tx.timestamp <= endTimestamp);
            }

            // Sort by date descending (newest first)
            transactions = [...transactions].sort((a, b) => b.timestamp - a.timestamp);

            // Get total count before pagination
            const total = transactions.length;

            // Apply pagination
            const offset = request.offset || 0;
            const limit = request.limit || 10;
            transactions = transactions.slice(offset, offset + limit);

            // Map to transaction summaries
            const summaries = transactions.map(tx => this.mapToTransactionSummary(tx));

            return {
                transactions: summaries,
                total,
                hasMore: offset + limit < total
            };
        }, 30000); // 30 second cache for transaction lists
    }

    /**
     * Get details for a specific transaction
     */
    async getTransactionDetails(id: string): Promise<TransactionDetailResponse | null> {
        const transaction = this.transactionService.getTransactionById(id);
        if (!transaction) return null;

        return {
            ...this.mapToTransactionSummary(transaction),
            creatorAddress: transaction.creatorAddress,
            tokenId: transaction.tokenId,
            originalAmount: transaction.originalAmount,
            txHash: transaction.txHash,
            details: transaction.details
        };
    }

    /**
     * Get transaction statistics
     */
    async getTransactionStatistics(): Promise<TransactionStatistics> {
        const transactions = this.transactionService.getAllTransactions();

        // Calculate statistics
        const totalSpent = this.transactionService.getTotalStreamingSpend();
        const totalSaved = this.transactionService.getTotalDiscountSavings();
        const totalEssenceEarned = this.transactionService.getTotalFaeEssenceEarned();

        // Group by date for daily stats
        const dailyStatsMap = new Map<string, {
            spent: number;
            saved: number;
            essence: number;
            count: number;
        }>();

        transactions.forEach(tx => {
            const date = new Date(tx.timestamp).toISOString().split('T')[0]; // YYYY-MM-DD format

            if (!dailyStatsMap.has(date)) {
                dailyStatsMap.set(date, { spent: 0, saved: 0, essence: 0, count: 0 });
            }

            const stats = dailyStatsMap.get(date)!;
            stats.count++;

            if (tx.type === TransactionType.STREAM_PAYMENT) {
                stats.spent += tx.amount;

                if (tx.originalAmount && tx.amount) {
                    stats.saved += (tx.originalAmount - tx.amount);
                }
            }

            if (tx.faeEssence) {
                stats.essence += tx.faeEssence;
            }
        });

        // Convert to array and sort by date
        const dailyStats = Array.from(dailyStatsMap.entries()).map(([date, stats]) => ({
            date,
            ...stats
        })).sort((a, b) => a.date.localeCompare(b.date));

        return {
            totalSpent,
            totalSaved,
            totalEssenceEarned,
            transactionCount: transactions.length,
            dailyStats
        };
    }

    /**
     * Record a streaming payment transaction
     */
    async recordStreamingPayment(
        userAddress: string,
        request: RecordStreamingPaymentRequest
    ): Promise<TransactionDetailResponse> {
        // Create a content stream object from the request
        const stream: ContentStream = {
            id: request.contentId,
            title: request.contentTitle || 'Unknown Content',
            timeWatched: request.timeWatched,
            paymentRate: request.paymentRate,
            streamingActive: false,
            amountSpent: request.amount
        };

        // Record the transaction
        const transaction = await this.transactionService.recordStreamPayment(
            userAddress,
            stream,
            request.amount,
            request.discountApplied || 0
        );

        // Invalidate caches
        this.invalidateCache();

        // Rebuild transaction index
        this.initializeTransactionIndex();

        return this.getTransactionDetails(transaction.id) as Promise<TransactionDetailResponse>;
    }

    /**
     * Record a Fae ecosystem transaction
     */
    async recordFaeTransaction(
        userAddress: string,
        request: RecordFaeTransactionRequest
    ): Promise<TransactionDetailResponse> {
        // Record the transaction
        const transaction = await this.transactionService.recordFaeTransaction(
            userAddress,
            request.type,
            request.amount,
            {
                contentId: request.contentId,
                contentTitle: request.contentTitle,
                tokenId: request.tokenId,
                faeEssence: request.faeEssence,
                ...request.details
            }
        );

        return this.getTransactionDetails(transaction.id) as Promise<TransactionDetailResponse>;
    }

    /**
     * Map a transaction to a transaction summary
     */
    private mapToTransactionSummary(transaction: Transaction): TransactionSummary {
        return {
            id: transaction.id,
            type: transaction.type,
            amount: transaction.amount,
            timestamp: transaction.timestamp,
            contentId: transaction.contentId,
            contentTitle: transaction.contentTitle,
            status: transaction.status,
            faeEssence: transaction.faeEssence,
            discountApplied: transaction.discountApplied
        };
    }
}
