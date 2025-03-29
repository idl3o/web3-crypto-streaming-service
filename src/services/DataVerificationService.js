/**
 * Data Verification Service
 * 
 * Provides data validation, verification and encoding utilities
 * for blockchain data in the Web3 Crypto Streaming platform.
 */

import { ethers } from 'ethers';
import * as BlockchainService from './BlockchainService';
import * as SecurityService from './RiceAdvancedNetworkSecurityService';

// Constants for supported verification types
export const VERIFICATION_TYPE = {
  MESSAGE: 'message',
  TRANSACTION: 'transaction',
  SIGNATURE: 'signature',
  PAYLOAD: 'payload',
  ADDRESS: 'address',
  HASH: 'hash'
};

// Constants for supported data formats
export const DATA_FORMAT = {
  HEX: 'hex',
  UTF8: 'utf8',
  BASE64: 'base64',
  BYTES: 'bytes',
  NUMBER: 'number',
  BIGNUMBER: 'bignumber'
};

// Service state
let initialized = false;
let serviceConfig = {
  cacheExpiration: 5 * 60 * 1000, // 5 minutes
  verifySignatures: true,
  strictAddressValidation: true,
  requireChecksumAddresses: true,
  supportedMessagePrefixes: [
    '\x19Ethereum Signed Message:\n',
    'Jerusalem Protocol Signed Message:\n',
    'Web3 Crypto Stream:'
  ],
  hashAlgorithm: 'keccak256',
  performDeepVerification: true
};

// Cache for verification results
const verificationCache = new Map();

/**
 * Initialize the Data Verification Service
 * @param {Object} options Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initialize(options = {}) {
  if (initialized) {
    return true;
  }

  try {
    console.log('Initializing Data Verification Service...');
    
    // Apply configuration options
    if (options.config) {
      serviceConfig = {
        ...serviceConfig,
        ...options.config
      };
    }
    
    // Initialize security service if needed for deep verification
    if (serviceConfig.performDeepVerification) {
      if (!SecurityService.getSecurityMetrics) {
        await SecurityService.initSecurityService();
      }
    }
    
    // Set up cache cleanup
    setInterval(() => {
      _cleanupCache();
    }, 10 * 60 * 1000); // Every 10 minutes
    
    initialized = true;
    console.log('Data Verification Service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Data Verification Service:', error);
    return false;
  }
}

/**
 * Clean up expired cache entries
 * @private
 */
function _cleanupCache() {
  const now = Date.now();
  let removedEntries = 0;
  
  for (const [key, entry] of verificationCache.entries()) {
    if (now - entry.timestamp > serviceConfig.cacheExpiration) {
      verificationCache.delete(key);
      removedEntries++;
    }
  }
  
  if (removedEntries > 0) {
    console.log(`Cleared ${removedEntries} expired verification cache entries`);
  }
}

/**
 * Generate cache key from verification parameters
 * @param {string} type Verification type
 * @param {string} data Data to verify
 * @param {Object} params Additional verification parameters
 * @returns {string} Cache key
 * @private
 */
function _generateCacheKey(type, data, params = {}) {
  // Create a deterministic string representation of params
  const paramsStr = Object.entries(params)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
    .join(',');
  
  return `${type}:${data}:${paramsStr}`;
}

/**
 * Verify a cryptographic signature
 * @param {string} message Original message that was signed
 * @param {string} signature Signature to verify
 * @param {string} address Address that supposedly signed the message
 * @param {Object} options Options for signature verification
 * @returns {Promise<Object>} Verification result
 */
export async function verifySignature(message, signature, address, options = {}) {
  if (!initialized) {
    await initialize();
  }
  
  // Validate inputs
  if (!message) throw new Error('Message is required');
  if (!signature) throw new Error('Signature is required');
  if (!address) throw new Error('Address is required');
  
  // Check cache
  const cacheKey = _generateCacheKey(VERIFICATION_TYPE.SIGNATURE, message, { 
    signature, 
    address 
  });
  
  if (verificationCache.has(cacheKey)) {
    return verificationCache.get(cacheKey).result;
  }
  
  try {
    // Normalize the address if strict validation is enabled
    let normalizedAddress = address;
    if (serviceConfig.strictAddressValidation) {
      normalizedAddress = ethers.utils.getAddress(address); // Converts to checksum address
    }
    
    // Normalize the message
    let messageToVerify = message;
    
    // Check if message needs to be prefixed
    if (options.addPrefix !== false) {
      // Try to determine if a prefix is needed
      const hasPrefix = serviceConfig.supportedMessagePrefixes.some(prefix => 
        message.startsWith(prefix)
      );
      
      if (!hasPrefix) {
        const prefix = options.prefix || serviceConfig.supportedMessagePrefixes[0];
        const messageBytes = ethers.utils.toUtf8Bytes(message);
        messageToVerify = `${prefix}${messageBytes.length}${message}`;
      }
    }
    
    // Determine the message hash
    const messageHash = ethers.utils.hashMessage(messageToVerify);
    
    // Recover the signing address
    const recoveredAddress = ethers.utils.verifyMessage(messageToVerify, signature);
    
    // Compare addresses
    const isValid = normalizedAddress.toLowerCase() === recoveredAddress.toLowerCase();
    
    const result = {
      valid: isValid,
      recoveredAddress,
      messageHash,
      timestamp: Date.now()
    };
    
    // Cache the result
    verificationCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return {
      valid: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * Verify a transaction
 * @param {Object} transaction Transaction object
 * @param {Object} options Verification options
 * @returns {Promise<Object>} Verification result
 */
export async function verifyTransaction(transaction, options = {}) {
  if (!initialized) {
    await initialize();
  }
  
  if (!transaction) throw new Error('Transaction is required');
  
  try {
    // Basic transaction validity checks
    const validityChecks = {
      hasHash: !!transaction.hash,
      hasTo: !!transaction.to,
      hasValidGasLimit: !!transaction.gasLimit && !transaction.gasLimit.isZero(),
      hasChainId: !!transaction.chainId
    };
    
    const isBasicallyValid = Object.values(validityChecks).every(check => check);
    
    // For signed transactions, verify the signature
    let signatureValid = false;
    let recoveredAddress = null;
    
    if (transaction.from && transaction.signature) {
      try {
        // Recover address from transaction signature
        const txData = {
          to: transaction.to,
          value: transaction.value || 0,
          gasLimit: transaction.gasLimit || 0,
          gasPrice: transaction.gasPrice || 0,
          nonce: transaction.nonce || 0,
          data: transaction.data || '0x',
          chainId: transaction.chainId
        };
        
        const serialized = ethers.utils.serializeTransaction(txData);
        const msgHash = ethers.utils.keccak256(serialized);
        
        recoveredAddress = ethers.utils.recoverAddress(msgHash, transaction.signature);
        signatureValid = transaction.from.toLowerCase() === recoveredAddress.toLowerCase();
      } catch (sigError) {
        console.warn('Could not verify transaction signature:', sigError);
      }
    }
    
    // Network-specific verification
    let networkValid = true;
    if (options.network) {
      const currentNetwork = await BlockchainService.getNetworkId();
      networkValid = transaction.chainId === currentNetwork;
    }
    
    return {
      valid: isBasicallyValid && (!transaction.signature || signatureValid) && networkValid,
      checks: {
        ...validityChecks,
        signatureValid,
        networkValid
      },
      recoveredAddress,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return {
      valid: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * Validate and normalize an Ethereum address
 * @param {string} address Address to validate
 * @param {Object} options Validation options
 * @returns {Object} Validation result
 */
export function validateAddress(address, options = {}) {
  try {
    if (!address) {
      return {
        valid: false,
        error: 'Address is empty',
        timestamp: Date.now()
      };
    }
    
    // Check if it's a valid address format
    if (!ethers.utils.isAddress(address)) {
      return {
        valid: false,
        error: 'Invalid address format',
        address,
        timestamp: Date.now()
      };
    }
    
    // Convert to checksum address
    const checksumAddress = ethers.utils.getAddress(address);
    
    // Optionally check if the address has the correct checksum capitalization
    let checksumValid = true;
    if (serviceConfig.requireChecksumAddresses && address !== checksumAddress) {
      checksumValid = false;
      
      // Don't return invalid if forgiving mode is enabled
      if (options.strict) {
        return {
          valid: false,
          error: 'Invalid checksum',
          address,
          checksumAddress,
          timestamp: Date.now()
        };
      }
    }
    
    // Special case: check if it's a contract address
    let isContract = false;
    if (options.checkContract) {
      // In a real implementation, this would check the blockchain
      // For now, we'll determine this based on address characteristics
      // This is just a placeholder - would need actual blockchain call
      isContract = address.toLowerCase().startsWith('0x8') || 
                   address.toLowerCase().startsWith('0x9');
    }
    
    return {
      valid: true,
      checksumValid,
      isContract,
      address: checksumAddress,
      original: address,
      timestamp: Date.now()
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
      address,
      timestamp: Date.now()
    };
  }
}

/**
 * Hash data using the configured algorithm
 * @param {string|Uint8Array} data Data to hash
 * @param {Object} options Hash options
 * @returns {string} Resulting hash
 */
export function hashData(data, options = {}) {
  try {
    // Convert data to appropriate format
    let dataToHash = data;
    
    if (typeof data === 'string') {
      if (data.startsWith('0x')) {
        dataToHash = data; // Already hex
      } else if (options.format === DATA_FORMAT.HEX) {
        dataToHash = '0x' + data;
      } else {
        dataToHash = ethers.utils.toUtf8Bytes(data);
      }
    } else if (data instanceof Uint8Array) {
      dataToHash = data;
    } else if (data !== null && typeof data === 'object') {
      // Handle objects by JSON stringifying them
      dataToHash = ethers.utils.toUtf8Bytes(JSON.stringify(data));
    }
    
    // Default to keccak256 for Ethereum compatibility
    const algorithm = options.algorithm || serviceConfig.hashAlgorithm;
    
    // Generate hash
    let hash;
    switch (algorithm) {
      case 'keccak256':
        hash = ethers.utils.keccak256(dataToHash);
        break;
      case 'sha256':
        hash = ethers.utils.sha256(dataToHash);
        break;
      case 'ripemd160':
        hash = ethers.utils.ripemd160(dataToHash);
        break;
      default:
        hash = ethers.utils.keccak256(dataToHash);
    }
    
    return hash;
  } catch (error) {
    console.error('Error hashing data:', error);
    throw error;
  }
}

/**
 * Encode data into specified format
 * @param {any} data Data to encode
 * @param {string} format Target format
 * @returns {string|Uint8Array|BigNumber} Encoded data
 */
export function encodeData(data, format = DATA_FORMAT.HEX) {
  try {
    switch (format) {
      case DATA_FORMAT.HEX:
        if (typeof data === 'string') {
          if (data.startsWith('0x')) {
            return data;
          }
          return ethers.utils.hexlify(ethers.utils.toUtf8Bytes(data));
        } else if (data instanceof Uint8Array) {
          return ethers.utils.hexlify(data);
        } else if (typeof data === 'number' || typeof data === 'bigint') {
          return ethers.utils.hexValue(data);
        }
        return ethers.utils.hexlify(ethers.utils.toUtf8Bytes(JSON.stringify(data)));
        
      case DATA_FORMAT.UTF8:
        if (typeof data === 'string') {
          if (data.startsWith('0x')) {
            return ethers.utils.toUtf8String(ethers.utils.arrayify(data));
          }
          return data;
        }
        return JSON.stringify(data);
        
      case DATA_FORMAT.BASE64:
        let bytes;
        if (typeof data === 'string') {
          if (data.startsWith('0x')) {
            bytes = ethers.utils.arrayify(data);
          } else {
            bytes = ethers.utils.toUtf8Bytes(data);
          }
        } else if (data instanceof Uint8Array) {
          bytes = data;
        } else {
          bytes = ethers.utils.toUtf8Bytes(JSON.stringify(data));
        }
        return Buffer.from(bytes).toString('base64');
        
      case DATA_FORMAT.BYTES:
        if (typeof data === 'string') {
          if (data.startsWith('0x')) {
            return ethers.utils.arrayify(data);
          }
          return ethers.utils.toUtf8Bytes(data);
        } else if (data instanceof Uint8Array) {
          return data;
        }
        return ethers.utils.toUtf8Bytes(JSON.stringify(data));
        
      case DATA_FORMAT.BIGNUMBER:
        if (typeof data === 'string') {
          if (data.startsWith('0x')) {
            return ethers.BigNumber.from(data);
          }
          if (/^\d+$/.test(data)) {
            return ethers.BigNumber.from(data);
          }
          throw new Error('Cannot convert string to BigNumber');
        } else if (typeof data === 'number' || typeof data === 'bigint') {
          return ethers.BigNumber.from(data);
        }
        throw new Error('Cannot convert to BigNumber');
        
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  } catch (error) {
    console.error('Error encoding data:', error);
    throw error;
  }
}

/**
 * Decode data from specified format
 * @param {string|Uint8Array} data Data to decode
 * @param {string} fromFormat Source format
 * @param {string} toFormat Target format
 * @returns {any} Decoded data
 */
export function decodeData(data, fromFormat = DATA_FORMAT.HEX, toFormat = DATA_FORMAT.UTF8) {
  try {
    // First convert to common intermediate format (bytes)
    let bytes;
    switch (fromFormat) {
      case DATA_FORMAT.HEX:
        if (typeof data !== 'string' || !data.startsWith('0x')) {
          throw new Error('Invalid hex data');
        }
        bytes = ethers.utils.arrayify(data);
        break;
        
      case DATA_FORMAT.UTF8:
        if (typeof data !== 'string') {
          throw new Error('Invalid UTF8 data');
        }
        bytes = ethers.utils.toUtf8Bytes(data);
        break;
        
      case DATA_FORMAT.BASE64:
        if (typeof data !== 'string') {
          throw new Error('Invalid base64 data');
        }
        bytes = new Uint8Array(Buffer.from(data, 'base64'));
        break;
        
      case DATA_FORMAT.BYTES:
        if (!(data instanceof Uint8Array)) {
          throw new Error('Invalid bytes data');
        }
        bytes = data;
        break;
        
      default:
        throw new Error(`Unsupported source format: ${fromFormat}`);
    }
    
    // Then convert from bytes to target format
    switch (toFormat) {
      case DATA_FORMAT.HEX:
        return ethers.utils.hexlify(bytes);
        
      case DATA_FORMAT.UTF8:
        try {
          return ethers.utils.toUtf8String(bytes);
        } catch (e) {
          // If not valid UTF-8, return hex representation
          return ethers.utils.hexlify(bytes);
        }
        
      case DATA_FORMAT.BASE64:
        return Buffer.from(bytes).toString('base64');
        
      case DATA_FORMAT.BYTES:
        return bytes;
        
      case DATA_FORMAT.NUMBER:
        if (bytes.length > 8) {
          throw new Error('Data too large for number');
        }
        return ethers.BigNumber.from(bytes).toNumber();
        
      case DATA_FORMAT.BIGNUMBER:
        return ethers.BigNumber.from(bytes);
        
      default:
        throw new Error(`Unsupported target format: ${toFormat}`);
    }
  } catch (error) {
    console.error('Error decoding data:', error);
    throw error;
  }
}

/**
 * Verify data integrity using hash comparison
 * @param {any} data Original data
 * @param {string} expectedHash Expected hash
 * @param {Object} options Hash options
 * @returns {boolean} Whether the data matches the hash
 */
export function verifyDataIntegrity(data, expectedHash, options = {}) {
  try {
    const actualHash = hashData(data, options);
    return actualHash === expectedHash;
  } catch (error) {
    console.error('Error verifying data integrity:', error);
    return false;
  }
}

/**
 * Generate a typed structured data hash for EIP-712 signing
 * @param {Object} typedData The typed data object
 * @returns {string} The typed data hash
 */
export function hashTypedData(typedData) {
  try {
    return ethers.utils._TypedDataEncoder.hash(
      typedData.domain,
      typedData.types,
      typedData.message
    );
  } catch (error) {
    console.error('Error hashing typed data:', error);
    throw error;
  }
}

/**
 * Sign data using the current wallet
 * @param {string|Object} data Data to sign
 * @param {Object} options Signing options
 * @returns {Promise<string>} Signature
 */
export async function signData(data, options = {}) {
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet not connected');
  }
  
  try {
    const signer = await BlockchainService.getSigner();
    
    if (options.typedData) {
      // EIP-712 signing
      return signer._signTypedData(
        data.domain,
        data.types,
        data.message
      );
    } else {
      // Regular message signing
      return signer.signMessage(data);
    }
  } catch (error) {
    console.error('Error signing data:', error);
    throw error;
  }
}

/**
 * Get service configuration
 * @returns {Object} Current configuration
 */
export function getConfiguration() {
  return { ...serviceConfig };
}

/**
 * Update service configuration
 * @param {Object} newConfig New configuration
 * @returns {Object} Updated configuration
 */
export function updateConfiguration(newConfig = {}) {
  serviceConfig = {
    ...serviceConfig,
    ...newConfig
  };
  
  return { ...serviceConfig };
}

export default {
  initialize,
  verifySignature,
  verifyTransaction,
  validateAddress,
  hashData,
  encodeData,
  decodeData,
  verifyDataIntegrity,
  hashTypedData,
  signData,
  getConfiguration,
  updateConfiguration,
  VERIFICATION_TYPE,
  DATA_FORMAT
};
