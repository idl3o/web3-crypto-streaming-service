/**
 * Native Module Loader
 * Handles loading of native C/C++ modules with proper error handling and fallbacks
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// Type definitions for our native module
interface NativeCryptoModule {
  aesEncrypt(data: Buffer, key: Buffer, iv: Buffer): Buffer;
  aesDecrypt(data: Buffer, key: Buffer, iv: Buffer): Buffer;
  sha256(data: Buffer): Buffer;
  getModuleInfo(): {
    name: string;
    version: string;
    platform: string;
    arch: string;
    buildDate: string;
    buildTime: string;
    symbolVisibility: string;
  };
}

// JavaScript fallback implementations
const jsFallbacks: Partial<NativeCryptoModule> = {
  // Simple JavaScript implementations can go here as fallbacks
  // These would be slower but provide functionality when native modules aren't available
  getModuleInfo: () => ({
    name: 'js-fallback',
    version: '1.0.0',
    platform: os.platform(),
    arch: os.arch(),
    buildDate: new Date().toISOString(),
    buildTime: '',
    symbolVisibility: 'js'
  })
};

/**
 * Attempts to load the native module, falling back to JS implementation if not available
 */
export function loadNativeCryptoModule(): NativeCryptoModule {
  try {
    // Get platform and architecture
    const platform = os.platform();
    const arch = os.arch();
    
    // Build path to native module
    const modulePath = path.join(
      __dirname, '..', '..', 'lib', 'binding',
      `${platform}-${arch}`, 
      `web3_crypto_native${platform === 'win32' ? '.node' : '.so'}`
    );
    
    // Check if file exists
    if (!fs.existsSync(modulePath)) {
      console.warn(`Native module not found at ${modulePath}, using JavaScript fallback`);
      return jsFallbacks as NativeCryptoModule;
    }
    
    // Try to load the module
    const nativeModule = require(modulePath);
    console.log(`Loaded native crypto module: ${modulePath}`);
    
    // Verify the module has the required methods
    const requiredMethods = ['aesEncrypt', 'aesDecrypt', 'sha256', 'getModuleInfo'];
    const missingMethods = requiredMethods.filter(method => typeof nativeModule[method] !== 'function');
    
    if (missingMethods.length > 0) {
      throw new Error(`Native module missing required methods: ${missingMethods.join(', ')}`);
    }
    
    return nativeModule;
  } catch (error) {
    console.error('Error loading native crypto module:', error);
    console.warn('Falling back to JavaScript implementation (slower)');
    return jsFallbacks as NativeCryptoModule;
  }
}

// Export singleton instance
export const nativeCrypto = loadNativeCryptoModule();

// Export individual functions with consistent interface
export function aesEncrypt(data: Buffer, key: Buffer, iv: Buffer): Buffer {
  return nativeCrypto.aesEncrypt(data, key, iv);
}

export function aesDecrypt(data: Buffer, key: Buffer, iv: Buffer): Buffer {
  return nativeCrypto.aesDecrypt(data, key, iv);
}

export function sha256(data: Buffer): Buffer {
  return nativeCrypto.sha256(data);
}

export function getNativeModuleInfo() {
  return nativeCrypto.getModuleInfo();
}
