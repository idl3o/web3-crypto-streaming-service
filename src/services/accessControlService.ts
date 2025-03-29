import { ethers } from 'ethers';
import { useWalletStore } from '@/stores/wallet';
import { StreamingOptions } from './streamingService';

export interface AccessPermission {
  canAccess: boolean;
  reason?: string;
  expiresAt?: number;
  paymentRequired?: boolean;
  streamId?: string;
}

export class AccessControlService {
  private provider: ethers.providers.Web3Provider | null = null;
  
  constructor() {
    const walletStore = useWalletStore();
    this.provider = walletStore.provider;
  }
  
  /**
   * Check if user can access specific content
   */
  async checkContentAccess(contentId: string, creatorAddress: string): Promise<AccessPermission> {
    try {
      const walletStore = useWalletStore();
      
      // If wallet is not connected, no access
      if (!walletStore.isConnected) {
        return {
          canAccess: false,
          reason: 'Wallet not connected',
          paymentRequired: true
        };
      }
      
      // Check if user is the content creator (always grant access)
      if (creatorAddress.toLowerCase() === walletStore.account?.toLowerCase()) {
        return {
          canAccess: true
        };
      }
      
      // Check if there's an active stream for this content
      const streamId = await this.getActiveStreamId(contentId, creatorAddress);
      
      if (streamId) {
        // There is an active stream, check if it has sufficient funds
        const hasActiveFunds = await this.checkStreamHasFunds(streamId);
        
        if (hasActiveFunds) {
          return {
            canAccess: true,
            streamId,
            expiresAt: Date.now() + 60000 // Access for 1 minute, then re-check
          };
        } else {
          return {
            canAccess: false,
            reason: 'Stream requires additional funds',
            paymentRequired: true,
            streamId
          };
        }
      }
      
      // No active stream found
      return {
        canAccess: false,
        reason: 'Payment required to access content',
        paymentRequired: true
      };
    } catch (error) {
      console.error('Error checking content access:', error);
      return {
        canAccess: false,
        reason: 'Failed to check access permissions'
      };
    }
  }
  
  /**
   * Start a payment stream to access content
   */
  async startContentAccess(contentId: string, creatorAddress: string, options: StreamingOptions): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('Provider not available');
      }
      
      // Start a payment stream using the contract service
      const contractService = await import('./contractService');
      
      // Convert rate from ETH/minute to ETH/second for the contract
      const ratePerSecond = (options.paymentRate / 60).toString();
      
      // Default initial deposit to cover 5 minutes of streaming
      const initialDeposit = options.spendingLimit || (options.paymentRate * 5).toString();
      
      // Create the payment stream
      const { streamId } = await contractService.createPaymentStream(
        this.provider,
        creatorAddress,
        ratePerSecond,
        initialDeposit
      );
      
      // Store the streamId association with the content
      await this.storeStreamAssociation(streamId, contentId, creatorAddress);
      
      return streamId;
    } catch (error) {
      console.error('Error starting content access stream:', error);
      throw error;
    }
  }
  
  /**
   * Stop the payment stream for content
   */
  async stopContentAccess(streamId: string): Promise<void> {
    try {
      if (!this.provider) {
        throw new Error('Provider not available');
      }
      
      // Stop the payment stream
      const contractService = await import('./contractService');
      await contractService.stopPaymentStream(this.provider, streamId);
      
      // Remove the stream association
      await this.removeStreamAssociation(streamId);
    } catch (error) {
      console.error('Error stopping content access stream:', error);
      throw error;
    }
  }
  
  // Private helper methods
  
  private async getActiveStreamId(contentId: string, creatorAddress: string): Promise<string | null> {
    // In a real app, this would check a database or local storage
    // For demo purposes, we'll check localStorage
    try {
      const streamData = localStorage.getItem(`stream_${contentId}`);
      
      if (streamData) {
        const parsedData = JSON.parse(streamData);
        return parsedData.streamId || null;
      }
      
      return null;
    } catch {
      return null;
    }
  }
  
  private async checkStreamHasFunds(streamId: string): Promise<boolean> {
    try {
      if (!this.provider) {
        return false;
      }
      
      // Check available funds in the stream
      const contractService = await import('./contractService');
      const amount = await contractService.getStreamableAmount(this.provider, streamId);
      
      // If there's any positive amount, consider it funded
      return parseFloat(amount) > 0;
    } catch {
      return false;
    }
  }
  
  private async storeStreamAssociation(streamId: string, contentId: string, creatorAddress: string): Promise<void> {
    // Store the association in localStorage
    // In a real app, this might be in a database
    try {
      localStorage.setItem(`stream_${contentId}`, JSON.stringify({
        streamId,
        creatorAddress,
        startedAt: Date.now()
      }));
    } catch (error) {
      console.error('Error storing stream association:', error);
    }
  }
  
  private async removeStreamAssociation(streamId: string): Promise<void> {
    // Find and remove the association
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        if (key?.startsWith('stream_')) {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          
          if (data.streamId === streamId) {
            localStorage.removeItem(key);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error removing stream association:', error);
    }
  }
}

export const accessControlService = new AccessControlService();

export default accessControlService;
