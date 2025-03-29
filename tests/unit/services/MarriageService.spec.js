import * as MarriageService from '@/services/MarriageService';
import * as LocalNetworkService from '@/services/LocalNetworkService';

// Mock dependencies
jest.mock('@/services/LocalNetworkService');

// Mock localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: function() {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('MarriageService', () => {
  beforeEach(() => {
    // Clear all mocks and reset state before each test
    jest.clearAllMocks();
    localStorageMock.clear();
    MarriageService.resetMarriageState();
  });

  describe('marryLocalNet', () => {
    it('should fail if local network is not connected', async () => {
      // Setup
      LocalNetworkService.isConnected.mockReturnValue(false);

      // Execute
      const result = await MarriageService.marryLocalNet();

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot marry');
      expect(MarriageService.isMarried()).toBe(false);
    });

    it('should successfully marry when local network is connected', async () => {
      // Setup
      LocalNetworkService.isConnected.mockReturnValue(true);
      LocalNetworkService.getConnectionState.mockReturnValue({
        connected: true,
        networkType: 'hardhat',
        chainId: 31337
      });
      LocalNetworkService.getLocalAccounts.mockResolvedValue([
        '0x1234567890123456789012345678901234567890'
      ]);

      // Execute
      const result = await MarriageService.marryLocalNet();

      // Verify
      expect(result.success).toBe(true);
      expect(MarriageService.isMarried()).toBe(true);
      expect(result.networkType).toBe('hardhat');
      expect(result.chainId).toBe(31337);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should dispatch marriage event', async () => {
      // Setup
      LocalNetworkService.isConnected.mockReturnValue(true);
      LocalNetworkService.getConnectionState.mockReturnValue({
        connected: true,
        networkType: 'hardhat',
        chainId: 31337
      });
      LocalNetworkService.getLocalAccounts.mockResolvedValue(['0x1234']);
      
      window.dispatchEvent = jest.fn();

      // Execute
      await MarriageService.marryLocalNet();

      // Verify
      expect(window.dispatchEvent).toHaveBeenCalled();
      const event = window.dispatchEvent.mock.calls[0][0];
      expect(event.type).toBe('localnet-marriage');
      expect(event.detail.married).toBe(true);
    });
  });

  describe('divorceLocalNet', () => {
    it('should report success if already divorced', async () => {
      // Execute
      const result = await MarriageService.divorceLocalNet();

      // Verify
      expect(result.success).toBe(true);
      expect(result.alreadyDivorced).toBe(true);
    });

    it('should successfully divorce if married', async () => {
      // Setup - first get married
      LocalNetworkService.isConnected.mockReturnValue(true);
      LocalNetworkService.getConnectionState.mockReturnValue({
        connected: true,
        networkType: 'hardhat',
        chainId: 31337
      });
      LocalNetworkService.getLocalAccounts.mockResolvedValue(['0x1234']);
      await MarriageService.marryLocalNet();
      
      window.dispatchEvent = jest.fn();

      // Execute - now divorce
      const result = await MarriageService.divorceLocalNet();

      // Verify
      expect(result.success).toBe(true);
      expect(MarriageService.isMarried()).toBe(false);
      expect(window.dispatchEvent).toHaveBeenCalled();
      
      const event = window.dispatchEvent.mock.calls[0][0];
      expect(event.type).toBe('localnet-marriage');
      expect(event.detail.married).toBe(false);
    });
  });

  describe('shouldUseLocalNetwork', () => {
    it('should return false if not married', () => {
      expect(MarriageService.shouldUseLocalNetwork()).toBe(false);
    });

    it('should return false if local network is not connected', async () => {
      // Setup - get married
      LocalNetworkService.isConnected.mockReturnValue(true);
      LocalNetworkService.getConnectionState.mockReturnValue({
        connected: true,
        networkType: 'hardhat',
        chainId: 31337
      });
      LocalNetworkService.getLocalAccounts.mockResolvedValue(['0x1234']);
      await MarriageService.marryLocalNet();
      
      // But now the network is disconnected
      LocalNetworkService.isConnected.mockReturnValue(false);

      // Execute & Verify
      expect(MarriageService.shouldUseLocalNetwork()).toBe(false);
    });

    it('should return false if operation has forceRemote flag', async () => {
      // Setup
      LocalNetworkService.isConnected.mockReturnValue(true);
      LocalNetworkService.getConnectionState.mockReturnValue({
        connected: true,
        networkType: 'hardhat',
        chainId: 31337
      });
      LocalNetworkService.getLocalAccounts.mockResolvedValue(['0x1234']);
      await MarriageService.marryLocalNet();

      // Execute & Verify
      expect(MarriageService.shouldUseLocalNetwork({ forceRemote: true })).toBe(false);
    });

    it('should return true if married and connected to local network', async () => {
      // Setup
      LocalNetworkService.isConnected.mockReturnValue(true);
      LocalNetworkService.getConnectionState.mockReturnValue({
        connected: true,
        networkType: 'hardhat',
        chainId: 31337
      });
      LocalNetworkService.getLocalAccounts.mockResolvedValue(['0x1234']);
      await MarriageService.marryLocalNet();

      // Execute & Verify
      expect(MarriageService.shouldUseLocalNetwork()).toBe(true);
    });
  });

  describe('addEventListener', () => {
    it('should register event listeners and notify them', async () => {
      // Setup
      const marriedListener = jest.fn();
      const divorcedListener = jest.fn();
      const allListener = jest.fn();
      
      MarriageService.addEventListener('married', marriedListener);
      MarriageService.addEventListener('divorced', divorcedListener);
      MarriageService.addEventListener('all', allListener);

      LocalNetworkService.isConnected.mockReturnValue(true);
      LocalNetworkService.getConnectionState.mockReturnValue({
        connected: true,
        networkType: 'hardhat',
        chainId: 31337
      });
      LocalNetworkService.getLocalAccounts.mockResolvedValue(['0x1234']);

      // Execute - marry
      await MarriageService.marryLocalNet();

      // Verify
      expect(marriedListener).toHaveBeenCalled();
      expect(allListener).toHaveBeenCalled();
      expect(divorcedListener).not.toHaveBeenCalled();

      // Reset
      jest.clearAllMocks();

      // Execute - divorce
      await MarriageService.divorceLocalNet();

      // Verify
      expect(divorcedListener).toHaveBeenCalled();
      expect(allListener).toHaveBeenCalled();
      expect(marriedListener).not.toHaveBeenCalled();
    });
  });

  describe('initMarriageService', () => {
    it('should load marriage state from localStorage', () => {
      // Setup
      const savedState = {
        married: true,
        networkType: 'hardhat',
        chainId: 31337,
        timestamp: Date.now(),
        localAccounts: ['0x1234'],
        preferredAccount: '0x1234'
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState));
      LocalNetworkService.isConnected.mockReturnValue(true);
      LocalNetworkService.getConnectionState.mockReturnValue({
        connected: true,
        chainId: 31337
      });

      // Execute
      MarriageService.initMarriageService();

      // Verify
      expect(MarriageService.isMarried()).toBe(true);
      expect(MarriageService.getMarriageState()).toMatchObject({
        married: true,
        networkType: 'hardhat',
        chainId: 31337
      });
    });

    it('should reset marriage if local network is not connected', () => {
      // Setup
      const savedState = {
        married: true,
        networkType: 'hardhat',
        chainId: 31337,
        timestamp: Date.now(),
        localAccounts: ['0x1234'],
        preferredAccount: '0x1234'
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState));
      LocalNetworkService.isConnected.mockReturnValue(false);

      // Execute
      MarriageService.initMarriageService();

      // Verify
      expect(MarriageService.isMarried()).toBe(false);
    });

    it('should register a listener for network disconnection', () => {
      // Setup
      MarriageService.initMarriageService();

      // Verify
      expect(LocalNetworkService.addEventListener).toHaveBeenCalledWith(
        'disconnected',
        expect.any(Function)
      );
    });
  });
});
