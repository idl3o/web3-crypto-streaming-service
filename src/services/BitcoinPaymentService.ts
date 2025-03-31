import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { btcToSatoshi, satoshiToBtc, formatSatoshi, isValidBitcoinAddress } from '../utils/satoshi-utils';

/**
 * Payment request interface for Bitcoin payments
 */
export interface BTCPaymentRequest {
  paymentId: string;
  contentId: string;
  amount: number; // In BTC
  address: string;
  timestamp: number;
  expiresAt: number;
  paymentUri: string;
}

/**
 * Payment status interface
 */
export interface BTCPaymentStatus {
  paymentId: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations?: number;
  txid?: string;
  updatedAt: number;
}

/**
 * Bitcoin Payment Service
 * Handles Bitcoin payment processing for the streaming service
 */
export class BitcoinPaymentService extends EventEmitter {
  private static instance: BitcoinPaymentService;
  private paymentRequests = new Map<string, BTCPaymentRequest>();
  private paymentStatuses = new Map<string, BTCPaymentStatus>();
  private readonly expirationTime = 60 * 60 * 1000; // 1 hour in milliseconds
  private initialized = false;
  private readonly apiEndpoint: string;
  private readonly apiKey: string;
  private readonly maxRetryAttempts: number = 3;

  private constructor(apiEndpoint: string, apiKey: string, maxRetryAttempts: number = 3) {
    super();
    this.apiEndpoint = apiEndpoint;
    this.apiKey = apiKey;
    this.maxRetryAttempts = maxRetryAttempts;
    this.setMaxListeners(50);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(apiEndpoint: string, apiKey: string, maxRetryAttempts: number = 3): BitcoinPaymentService {
    if (!BitcoinPaymentService.instance) {
      BitcoinPaymentService.instance = new BitcoinPaymentService(apiEndpoint, apiKey, maxRetryAttempts);
    }
    return BitcoinPaymentService.instance;
  }

  /**
   * Initialize the service
   */
  public async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      // Clean up expired payment requests periodically
      setInterval(() => this.cleanupExpiredRequests(), 15 * 60 * 1000); // Every 15 minutes

      this.initialized = true;
      this.emit('initialized');
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SONA_PAYMENT,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to initialize Bitcoin payment service',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      return false;
    }
  }

  /**
   * Create a new Bitcoin payment request
   * @param contentId Content identifier
   * @param amount Amount in BTC
   * @param address Receiver's Bitcoin address
   */
  public async createPaymentRequest(
    contentId: string,
    amount: number,
    address: string
  ): Promise<{ paymentId: string; paymentUri: string }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const now = Date.now();
      const paymentId = `btc-${now}-${Math.random().toString(36).substring(2, 9)}`;

      // Generate Bitcoin payment URI (BIP21)
      const paymentUri = `bitcoin:${address}?amount=${amount.toFixed(8)}&message=StreamingPayment&time=${now}`;

      // Create payment request
      const paymentRequest: BTCPaymentRequest = {
        paymentId,
        contentId,
        amount,
        address,
        timestamp: now,
        expiresAt: now + this.expirationTime,
        paymentUri
      };

      // Store payment request
      this.paymentRequests.set(paymentId, paymentRequest);

      // Initialize payment status
      this.paymentStatuses.set(paymentId, {
        paymentId,
        status: 'pending',
        updatedAt: now
      });

      // Emit event
      this.emit('payment-request-created', { paymentId, contentId, amount });

      return { paymentId, paymentUri };
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SONA_PAYMENT,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to create Bitcoin payment request',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });

      throw error;
    }
  }

  /**
   * Check payment status
   * @param paymentId Payment identifier
   */
  public async checkPaymentStatus(paymentId: string): Promise<BTCPaymentStatus> {
    try {
      const status = this.paymentStatuses.get(paymentId);

      if (!status) {
        throw new Error(`Payment with ID ${paymentId} not found`);
      }

      // In a real implementation, this would check the blockchain for payment confirmation
      // For demonstration, we'll simulate a payment confirmation
      if (status.status === 'pending') {
        // Simulate 20% chance of payment being confirmed
        if (Math.random() < 0.2) {
          const updatedStatus: BTCPaymentStatus = {
            ...status,
            status: 'confirmed',
            confirmations: Math.floor(Math.random() * 5) + 1, // 1-6 confirmations
            txid: `bitcoin-tx-${Date.now().toString(16)}`,
            updatedAt: Date.now()
          };

          this.paymentStatuses.set(paymentId, updatedStatus);

          // Emit event
          this.emit('payment-confirmed', {
            paymentId,
            txid: updatedStatus.txid,
            confirmations: updatedStatus.confirmations
          });

          return updatedStatus;
        }
      }

      return status;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SONA_PAYMENT,
        severity: IOErrorSeverity.WARNING,
        message: 'Failed to check Bitcoin payment status',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });

      throw error;
    }
  }

  /**
   * Get payment request
   * @param paymentId Payment identifier
   */
  public getPaymentRequest(paymentId: string): BTCPaymentRequest | undefined {
    return this.paymentRequests.get(paymentId);
  }

  /**
   * Clean up expired payment requests
   */
  private cleanupExpiredRequests(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [paymentId, request] of this.paymentRequests.entries()) {
      if (request.expiresAt < now) {
        this.paymentRequests.delete(paymentId);
        expiredCount++;

        // If status is still pending, mark it as failed
        const status = this.paymentStatuses.get(paymentId);
        if (status && status.status === 'pending') {
          this.paymentStatuses.set(paymentId, {
            ...status,
            status: 'failed',
            updatedAt: now
          });

          // Emit event
          this.emit('payment-expired', { paymentId });
        }
      }
    }

    if (expiredCount > 0) {
      console.log(`Cleaned up ${expiredCount} expired Bitcoin payment requests`);
    }
  }
}

// Export singleton instance
export const bitcoinPaymentService = BitcoinPaymentService.getInstance('', '', 3);
export default bitcoinPaymentService;
