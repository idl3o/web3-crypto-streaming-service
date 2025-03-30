import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';

/**
 * Payment request interface for Dogecoin payments
 */
export interface DogePaymentRequest {
  paymentId: string;
  contentId: string;
  amount: number; // In DOGE
  address: string;
  timestamp: number;
  expiresAt: number;
  paymentUri: string;
}

/**
 * Payment status interface
 */
export interface DogePaymentStatus {
  paymentId: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations?: number;
  txid?: string;
  updatedAt: number;
}

/**
 * Service for handling Dogecoin payments
 */
export class DogecoinPaymentService extends EventEmitter {
  private static instance: DogecoinPaymentService;
  private paymentRequests = new Map<string, DogePaymentRequest>();
  private paymentStatuses = new Map<string, DogePaymentStatus>();
  private readonly expirationTime = 60 * 60 * 1000; // 1 hour in milliseconds
  
  private constructor() {
    super();
    this.setMaxListeners(50);
    
    // Clean up expired payment requests periodically
    setInterval(() => this.cleanupExpiredRequests(), 15 * 60 * 1000); // Every 15 minutes
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): DogecoinPaymentService {
    if (!DogecoinPaymentService.instance) {
      DogecoinPaymentService.instance = new DogecoinPaymentService();
    }
    return DogecoinPaymentService.instance;
  }
  
  /**
   * Create a new Dogecoin payment request
   * @param contentId Content identifier
   * @param amount Amount in DOGE
   * @param address Receiver's Dogecoin address
   */
  public async createPaymentRequest(
    contentId: string, 
    amount: number, 
    address: string
  ): Promise<{ paymentId: string; paymentUri: string }> {
    try {
      const now = Date.now();
      const paymentId = `doge-${now}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Generate Dogecoin payment URI
      const paymentUri = `dogecoin:${address}?amount=${amount.toFixed(8)}&message=StreamingPayment&time=${now}`;
      
      // Create payment request
      const paymentRequest: DogePaymentRequest = {
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
        message: 'Failed to create Dogecoin payment request',
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
  public async checkPaymentStatus(paymentId: string): Promise<DogePaymentStatus> {
    try {
      const status = this.paymentStatuses.get(paymentId);
      
      if (!status) {
        throw new Error(`Payment with ID ${paymentId} not found`);
      }
      
      // In a real implementation, this would check the blockchain for payment confirmation
      // For demonstration, we'll simulate a payment confirmation
      if (status.status === 'pending') {
        // Simulate 30% chance of payment being confirmed
        if (Math.random() < 0.3) {
          const updatedStatus: DogePaymentStatus = {
            ...status,
            status: 'confirmed',
            confirmations: 1,
            txid: `dogecoin-tx-${Date.now().toString(16)}`,
            updatedAt: Date.now()
          };
          
          this.paymentStatuses.set(paymentId, updatedStatus);
          
          // Emit event
          this.emit('payment-confirmed', { 
            paymentId, 
            txid: updatedStatus.txid 
          });
          
          return updatedStatus;
        }
      }
      
      return status;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SONA_PAYMENT,
        severity: IOErrorSeverity.WARNING,
        message: 'Failed to check Dogecoin payment status',
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
  public getPaymentRequest(paymentId: string): DogePaymentRequest | undefined {
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
      console.log(`Cleaned up ${expiredCount} expired Dogecoin payment requests`);
    }
  }
}

// Export singleton instance
export const dogecoinPaymentService = DogecoinPaymentService.getInstance();
export default dogecoinPaymentService;
