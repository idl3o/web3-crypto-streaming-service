/**
 * Bitcoin Payment Service
 * Handles Bitcoin payment processing for the streaming service
 */

import { btcToSatoshi, satoshiToBtc, formatSatoshi, isValidBitcoinAddress } from '../utils/satoshi-utils';

export interface BitcoinPaymentOptions {
  destinationAddress: string;
  amount: number; // in satoshis
  memo?: string;
  includeFeesInAmount?: boolean;
  feeRate?: number; // satoshis per byte
  retryAttempt?: number;
  previousTransactionId?: string;
}

export interface BitcoinPaymentResult {
  success: boolean;
  paymentId?: string;
  transactionId?: string;
  amount: number; // in satoshis
  feesPaid?: number; // in satoshis
  timestamp: number;
  error?: string;
  retryCount?: number;
  canRetry?: boolean;
}

export class BitcoinPaymentService {
  private readonly apiEndpoint: string;
  private readonly apiKey: string;
  private readonly maxRetryAttempts: number = 3;
  
  constructor(apiEndpoint: string, apiKey: string, maxRetryAttempts: number = 3) {
    this.apiEndpoint = apiEndpoint;
    this.apiKey = apiKey;
    this.maxRetryAttempts = maxRetryAttempts;
  }
  
  /**
   * Create a Bitcoin payment request for content streaming
   * @param contentId The ID of the content being streamed
   * @param amountBtc Amount in Bitcoin
   * @param recipientAddress Bitcoin address of the content creator
   * @returns Payment request details
   */
  public async createPaymentRequest(
    contentId: string, 
    amountBtc: number, 
    recipientAddress: string
  ): Promise<{ 
    paymentUri: string; 
    paymentId: string;
    amountSatoshi: number;
    expiresAt: number;
  }> {
    // Validate address
    if (!isValidBitcoinAddress(recipientAddress)) {
      throw new Error('Invalid Bitcoin recipient address');
    }
    
    // Convert BTC to satoshis for internal processing
    const amountSatoshi = btcToSatoshi(amountBtc);
    
    // In a real implementation, this would interact with a Bitcoin payment processor API
    const paymentId = `btc-payment-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes from now
    
    // Create a Bitcoin payment URI (BIP-21 format)
    const paymentUri = `bitcoin:${recipientAddress}?amount=${amountBtc}&label=Stream+${contentId}&message=Web3+Crypto+Streaming+Payment`;
    
    return {
      paymentUri,
      paymentId,
      amountSatoshi,
      expiresAt
    };
  }
  
  /**
   * Check the status of a Bitcoin payment
   * @param paymentId The payment ID to check
   * @returns The current payment status
   */
  public async checkPaymentStatus(paymentId: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed';
    confirmations: number;
    transactionId?: string;
  }> {
    // In a real implementation, this would query the Bitcoin payment processor API
    // This is a mock implementation
    
    // Simulate API request
    console.log(`[BitcoinPaymentService] Checking status for payment: ${paymentId}`);
    
    // Simulate a random status for demo purposes
    const randomStatus = Math.floor(Math.random() * 3);
    let status: 'pending' | 'confirmed' | 'failed';
    let confirmations = 0;
    let transactionId: string | undefined = undefined;
    
    switch (randomStatus) {
      case 0:
        status = 'pending';
        confirmations = 0;
        break;
      case 1:
        status = 'confirmed';
        confirmations = Math.floor(Math.random() * 6) + 1;
        transactionId = `tx-${Date.now().toString(16)}`;
        break;
      default:
        status = 'failed';
        break;
    }
    
    return {
      status,
      confirmations,
      transactionId
    };
  }
  
  /**
   * Process a streamer payout in Bitcoin
   * @param streamerAddress Streamer's Bitcoin address
   * @param amountSatoshi Amount to send in satoshis
   * @returns Payout result
   */
  public async processStreamerPayout(
    streamerAddress: string, 
    amountSatoshi: number
  ): Promise<BitcoinPaymentResult> {
    if (!isValidBitcoinAddress(streamerAddress)) {
      return {
        success: false,
        amount: amountSatoshi,
        timestamp: Date.now(),
        error: 'Invalid Bitcoin address'
      };
    }
    
    // In a production environment, this would integrate with a Bitcoin wallet or payment service
    console.log(`[BitcoinPaymentService] Processing payout of ${formatSatoshi(amountSatoshi)} to ${streamerAddress}`);
    
    // Mock successful payment for demo
    return {
      success: true,
      paymentId: `payout-${Date.now()}`,
      transactionId: `tx-${Date.now().toString(16)}`,
      amount: amountSatoshi,
      feesPaid: 500, // Example fee of 500 satoshis
      timestamp: Date.now()
    };
  }
  
  /**
   * Get the current recommended Bitcoin fee rates
   * @returns Fee rates in satoshis per byte
   */
  public async getFeeEstimates(): Promise<{
    low: number;
    medium: number;
    high: number;
    timestamp: number;
  }> {
    // In production, this would fetch current fee estimates from a Bitcoin fee estimation service
    // For this demo, we'll return reasonable static values
    return {
      low: 5,      // 5 sat/byte
      medium: 15,  // 15 sat/byte
      high: 30,    // 30 sat/byte for quick confirmation
      timestamp: Date.now()
    };
  }
  
  /**
   * Retry a failed Bitcoin payment
   * @param previousPaymentId Previous payment ID that failed
   * @param retryAttempt Current retry attempt (1-based)
   * @returns Payment result from retry attempt
   */
  public async retryPayment(
    previousPaymentId: string,
    retryAttempt: number = 1
  ): Promise<BitcoinPaymentResult> {
    if (retryAttempt > this.maxRetryAttempts) {
      return {
        success: false,
        amount: 0,
        timestamp: Date.now(),
        error: 'Maximum retry attempts reached',
        retryCount: retryAttempt,
        canRetry: false
      };
    }
    
    try {
      console.log(`[BitcoinPaymentService] Retrying payment ${previousPaymentId}, attempt ${retryAttempt} of ${this.maxRetryAttempts}`);
      
      // In a real implementation, we'd retrieve the original payment and retry it
      // For this demo, we'll simulate a retry with increasing chance of success
      
      // Simulate increasing success probability with each retry
      const successProbability = 0.5 + (retryAttempt * 0.2);
      const isSuccessful = Math.random() < successProbability;
      
      if (isSuccessful) {
        // Retry succeeded
        return {
          success: true,
          paymentId: `retry-${previousPaymentId}-${retryAttempt}`,
          transactionId: `tx-retry-${Date.now().toString(16)}`,
          amount: 40000, // Using 40k sats as the standard micropayment amount
          feesPaid: 350, // Lower fee on retry (optimization)
          timestamp: Date.now(),
          retryCount: retryAttempt,
          canRetry: false // No need to retry on success
        };
      } else {
        // Retry failed
        const canRetryAgain = retryAttempt < this.maxRetryAttempts;
        return {
          success: false,
          amount: 40000,
          timestamp: Date.now(),
          error: 'Payment retry failed. Please try again.',
          retryCount: retryAttempt,
          canRetry: canRetryAgain
        };
      }
    } catch (error) {
      return {
        success: false,
        amount: 40000,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error during retry',
        retryCount: retryAttempt,
        canRetry: retryAttempt < this.maxRetryAttempts
      };
    }
  }
  
  /**
   * Check if a payment is eligible for retry
   * @param paymentId The payment ID to check for retry eligibility 
   * @returns Status including retry eligibility
   */
  public async checkRetryEligibility(paymentId: string): Promise<{
    canRetry: boolean;
    retryCount: number;
    maxRetries: number;
    reason?: string;
  }> {
    // In a real implementation, we'd check the payment status from the database/blockchain
    // For this demo, we'll return simple eligibility

    // Extract retry count from payment ID if it follows our retry-{id}-{count} format
    let currentRetries = 0;
    const retryMatch = paymentId.match(/retry-.*-(\d+)/);
    if (retryMatch && retryMatch[1]) {
      currentRetries = parseInt(retryMatch[1], 10);
    }
    
    const canRetry = currentRetries < this.maxRetryAttempts;
    
    return {
      canRetry,
      retryCount: currentRetries,
      maxRetries: this.maxRetryAttempts,
      reason: canRetry ? undefined : 'Maximum retry attempts reached'
    };
  }
}
