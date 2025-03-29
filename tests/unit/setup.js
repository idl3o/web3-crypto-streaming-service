import { config } from '@vue/test-utils';
import * as matchers from '@testing-library/jest-dom/matchers';
import fetch from 'jest-fetch-mock';
import crypto from 'crypto';

// Extend Jest with custom DOM matchers
expect.extend(matchers);

// Configure Vue Test Utils
config.global.mocks = {
  $t: (key) => key, // Mock i18n
  $route: {
    params: {},
    query: {}
  },
  $router: {
    push: jest.fn(),
    replace: jest.fn()
  }
};

// Mock fetch API
global.fetch = fetch;
fetch.enableMocks();

// Mock browser APIs used in tests
global.process = {
  ...process,
  env: {
    NODE_ENV: 'test',
    VUE_APP_RPC_URL: 'https://test-rpc.example.com'
  }
};

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn((index) => {
      return Object.keys(store)[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock crypto for Web3 needs
if (!global.crypto) {
  global.crypto = crypto;
}

// Mock Web3 provider/window.ethereum
const ethereumMock = {
  isMetaMask: true,
  networkVersion: '1',
  chainId: '0x1',
  selectedAddress: '0x1234567890123456789012345678901234567890',
  _events: {},
  on: function (event, callback) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(callback);
    return this;
  },
  removeListener: function (event, callback) {
    if (this._events[event]) {
      this._events[event] = this._events[event].filter(cb => cb !== callback);
    }
    return this;
  },
  request: jest.fn().mockImplementation(async (request) => {
    switch (request.method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        return [this.selectedAddress];
      case 'eth_chainId':
        return this.chainId;
      case 'net_version':
        return this.networkVersion;
      case 'eth_getBalance':
        return '0x1000000000000000000'; // 1 ETH in wei
      default:
        throw new Error(`Unimplemented method: ${request.method}`);
    }
  }),
  // Helper functions for testing
  emitAccountsChanged: function(accounts) {
    if (this._events['accountsChanged']) {
      this._events['accountsChanged'].forEach(callback => callback(accounts));
    }
  },
  emitChainChanged: function(chainId) {
    this.chainId = chainId;
    if (this._events['chainChanged']) {
      this._events['chainChanged'].forEach(callback => callback(chainId));
    }
  },
  emitConnect: function() {
    if (this._events['connect']) {
      this._events['connect'].forEach(callback => callback({ chainId: this.chainId }));
    }
  },
  emitDisconnect: function(error) {
    if (this._events['disconnect']) {
      this._events['disconnect'].forEach(callback => callback(error));
    }
  }
};

global.ethereum = ethereumMock;
window.ethereum = ethereumMock;

// Silence console logs during tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

if (process.env.SUPPRESS_CONSOLE_OUTPUT) {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}

// Restore console methods after tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});
