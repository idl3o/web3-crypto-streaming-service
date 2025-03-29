import { TransactionType } from '@/services/transactionService';

export interface TransactionListRequest {
    contentId?: string;
    type?: TransactionType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

export interface TransactionListResponse {
    transactions: TransactionSummary[];
    total: number;
    hasMore: boolean;
}

export interface TransactionSummary {
    id: string;
    type: TransactionType;
    amount: number;
    timestamp: number;
    contentId?: string;
    contentTitle?: string;
    status: 'pending' | 'completed' | 'failed';
    faeEssence?: number;
    discountApplied?: number;
}

export interface TransactionDetailResponse extends TransactionSummary {
    creatorAddress?: string;
    tokenId?: string;
    originalAmount?: number;
    txHash?: string;
    details?: Record<string, any>;
}

export interface TransactionStatistics {
    totalSpent: number;
    totalSaved: number;
    totalEssenceEarned: number;
    transactionCount: number;
    dailyStats: DailyTransactionStats[];
}

export interface DailyTransactionStats {
    date: string;
    spent: number;
    saved: number;
    essence: number;
    count: number;
}

export interface RecordStreamingPaymentRequest {
    contentId: string;
    contentTitle?: string;
    amount: number;
    timeWatched: number;
    paymentRate: number;
    discountApplied?: number;
}

export interface RecordFaeTransactionRequest {
    type: TransactionType;
    amount: number;
    contentId?: string;
    contentTitle?: string;
    tokenId?: string;
    faeEssence?: number;
    details?: Record<string, any>;
}
