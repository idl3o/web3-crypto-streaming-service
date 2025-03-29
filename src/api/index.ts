import { TransactionAPI } from './transactionApi';
import { TransactionService } from '@/services/transactionService';
import { ethers } from 'ethers';

let transactionAPI: TransactionAPI | null = null;

/**
 * Initialize the API with the Ethereum provider
 */
export function initializeAPI(provider: ethers.providers.Web3Provider) {
    const transactionService = new TransactionService(provider);
    transactionAPI = new TransactionAPI(transactionService);
}

/**
 * Get the transaction API instance
 */
export function getTransactionAPI(): TransactionAPI {
    if (!transactionAPI) {
        throw new Error('API not initialized. Call initializeAPI first.');
    }

    return transactionAPI;
}

export { TransactionAPI };
export * from './types/transaction';
export * from './transactionApi';
