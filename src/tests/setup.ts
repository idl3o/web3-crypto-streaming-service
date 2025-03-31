import WebSocket from 'ws';
import { CryptoDataService } from '../services/CryptoDataService';
import { NetworkingService } from '../services/NetworkingService';

/**
 * Jest setup file for Web3 Crypto Streaming Service
 * This runs before each test file
 */

// Mock the native-module-loader
jest.mock('../utils/native-module-loader', () => {
  // Use Node's crypto for test mocks to avoid platform-specific binary dependencies
  const crypto = require('crypto');
  
  const nativeCrypto = {
    aesEncrypt: (data: Buffer, key: Buffer, iv: Buffer) => {
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      return Buffer.concat([cipher.update(data), cipher.final()]);
    },
    
    aesDecrypt: (data: Buffer, key: Buffer, iv: Buffer) => {
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      return Buffer.concat([decipher.update(data), decipher.final()]);
    },
    
    sha256: (data: Buffer) => {
      return crypto.createHash('sha256').update(data).digest();
    },
    
    getModuleInfo: () => ({
      name: 'js-fallback',
      version: '1.0.0',
      platform: process.platform,
      arch: process.arch,
      buildDate: new Date().toISOString(),
      buildTime: '',
      symbolVisibility: 'js'
    })
  };
  
  return {
    loadNativeCryptoModule: jest.fn().mockReturnValue(nativeCrypto),
    nativeCrypto,
    aesEncrypt: nativeCrypto.aesEncrypt,
    aesDecrypt: nativeCrypto.aesDecrypt,
    sha256: nativeCrypto.sha256,
    getNativeModuleInfo: nativeCrypto.getModuleInfo
  };
});

// Set timezone for consistent date/time testing
process.env.TZ = 'UTC';

// Global console mock to avoid noisy logs during tests
// but still capture errors for test failures
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.spyOn(originalConsole, 'error'),
};

export const testConfig = {
    apiKey: 'test_api_key',
    symbols: ['btcusdt'],
    maxReconnectAttempts: 3,
    reconnectInterval: 1000,
    networkPort: 8081
};

export class MockWebSocket extends WebSocket {
    send(data: any): void {
        // Mock successful subscription response
        setTimeout(() => {
            this.emit('message', JSON.stringify({ result: null, id: 1 }));
        }, 100);
    }
}
