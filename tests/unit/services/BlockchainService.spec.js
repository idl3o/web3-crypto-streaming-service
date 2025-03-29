import { getProvider, sendTransaction } from '@/services/BlockchainService';
import * as MarriageService from '@/services/MarriageService';
import { ethers } from 'ethers';

// Mock dependencies
jest.mock('@/services/MarriageService');
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ...original,
    providers: {
      Web3Provider: jest.fn(),
      JsonRpcProvider: jest.fn()
    }
  };
});

describe('BlockchainService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getProvider', () => {
    it('should use local network provider when married', () => {
      // Setup
      const mockLocalProvider = { isLocalProvider: true };
      MarriageService.shouldUseLocalNetwork.mockReturnValue(true);
      MarriageService.getProviderForOperation.mockReturnValue(mockLocalProvider);

      // Execute
      const result = getProvider();

      // Verify
      expect(result).toBe(mockLocalProvider);
      expect(MarriageService.shouldUseLocalNetwork).toHaveBeenCalled();
    });

    it('should use Web3Provider when not married and window.ethereum is available', () => {
      // Setup
      MarriageService.shouldUseLocalNetwork.mockReturnValue(false);
      window.ethereum = {}; // Mock window.ethereum
      const mockWeb3Provider = { isWeb3Provider: true };
      ethers.providers.Web3Provider.mockReturnValue(mockWeb3Provider);

      // Execute
      const result = getProvider();

      // Verify
      expect(ethers.providers.Web3Provider).toHaveBeenCalledWith(window.ethereum);
      expect(result).toBe(mockWeb3Provider);
    });

    it('should use JsonRpcProvider as fallback when not married and no window.ethereum', () => {
      // Setup
      MarriageService.shouldUseLocalNetwork.mockReturnValue(false);
      window.ethereum = undefined; // No ethereum provider
      const mockJsonRpcProvider = { isJsonRpcProvider: true };
      ethers.providers.JsonRpcProvider.mockReturnValue(mockJsonRpcProvider);

      // Execute
      const result = getProvider();

      // Verify
      expect(ethers.providers.JsonRpcProvider).toHaveBeenCalled();
      expect(result).toBe(mockJsonRpcProvider);
    });

    it('should respect forceRemote option', () => {
      // Setup
      MarriageService.shouldUseLocalNetwork.mockImplementation(
        options => !options.forceRemote
      );
      
      window.ethereum = {}; // Mock window.ethereum
      const mockWeb3Provider = { isWeb3Provider: true };
      ethers.providers.Web3Provider.mockReturnValue(mockWeb3Provider);

      // Execute
      const result = getProvider({ forceRemote: true });

      // Verify
      expect(MarriageService.shouldUseLocalNetwork).toHaveBeenCalledWith({ forceRemote: true });
      expect(result).toBe(mockWeb3Provider);
    });
  });

  describe('sendTransaction', () => {
    it('should successfully send a transaction', async () => {
      // Setup
      const mockProvider = {
        getSigner: jest.fn().mockReturnValue({
          sendTransaction: jest.fn().mockResolvedValue({
            hash: '0xabcd1234'
          })
        })
      };
      
      // Mock getProvider to return our mock provider
      const originalGetProvider = require('@/services/BlockchainService').getProvider;
      require('@/services/BlockchainService').getProvider = jest.fn().mockReturnValue(mockProvider);

      // Execute
      const result = await sendTransaction({ to: '0x1234', value: '1000000000000000000' });

      // Verify
      expect(result.success).toBe(true);
      expect(result.hash).toBe('0xabcd1234');
      expect(mockProvider.getSigner).toHaveBeenCalled();

      // Restore original implementation
      require('@/services/BlockchainService').getProvider = originalGetProvider;
    });

    it('should handle transaction errors', async () => {
      // Setup
      const mockProvider = {
        getSigner: jest.fn().mockReturnValue({
          sendTransaction: jest.fn().mockRejectedValue(new Error('Transaction failed'))
        })
      };
      
      // Mock getProvider to return our mock provider
      const originalGetProvider = require('@/services/BlockchainService').getProvider;
      require('@/services/BlockchainService').getProvider = jest.fn().mockReturnValue(mockProvider);

      // Execute
      const result = await sendTransaction({ to: '0x1234', value: '1000000000000000000' });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction failed');

      // Restore original implementation
      require('@/services/BlockchainService').getProvider = originalGetProvider;
    });
  });
});
