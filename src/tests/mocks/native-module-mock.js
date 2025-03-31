/**
 * Mock implementation of native modules for testing
 */
const crypto = require('crypto');

// Mock native crypto module
module.exports = {
  aesEncrypt: (data, key, iv) => {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([cipher.update(data), cipher.final()]);
  },
  
  aesDecrypt: (data, key, iv) => {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([decipher.update(data), decipher.final()]);
  },
  
  sha256: (data) => {
    return crypto.createHash('sha256').update(data).digest();
  },
  
  getModuleInfo: () => {
    return {
      name: 'web3_crypto_native',
      version: '1.0.0-mock',
      platform: process.platform,
      arch: process.arch,
      buildDate: new Date().toDateString(),
      buildTime: new Date().toTimeString(),
      symbolVisibility: 'mock'
    };
  }
};
