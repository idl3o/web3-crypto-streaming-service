/**
 * Web3 Naming Service
 * 
 * Handles resolution of blockchain names (ENS, Unstoppable Domains, etc.)
 * to wallet addresses and vice versa, with caching for efficiency.
 */

import { ethers } from 'ethers';
import * as BlockchainService from './BlockchainService';

// Supported naming protocols
export const NAMING_PROTOCOLS = {
  ENS: 'ens',           // Ethereum Name Service (.eth)
  UNSTOPPABLE: 'ud',    // Unstoppable Domains (.crypto, .nft, etc.)
  LENS: 'lens',         // Lens Protocol handles
  SPACE_ID: 'spaceid',  // Space ID (.bnb, .arb)
  AVVY: 'avvy',         // Avvy Domains (.avax)
  SNS: 'sns',           // Solana Name Service (.sol)
  PLATFORM: 'platform'  // Platform's own naming system
};

// Resolution cache (name -> address, address -> name)
const nameCache = new Map();
const addressCache = new Map();
const expiryTime = 15 * 60 * 1000; // 15 minutes cache validity

/**
 * Initialize the naming service
 * 
 * @returns {Promise<boolean>} Success status
 */
export async function initNamingService() {
  try {
    // Pre-warm the cache with common names if needed
    
    return true;
  } catch (error) {
    console.error('Failed to initialize naming service:', error);
    return false;
  }
}

/**
 * Resolve a blockchain name to an address
 * 
 * @param {string} name Name to resolve (e.g., "vitalik.eth")
 * @param {Object} options Resolution options
 * @returns {Promise<string|null>} Resolved address or null if not found
 */
export async function resolveName(name, options = {}) {
  if (!name) return null;
  
  // Check if the input is already an address
  if (ethers.utils.isAddress(name)) {
    return name;
  }
  
  // Normalize name to lowercase
  const normalizedName = name.toLowerCase();
  
  // Check cache first unless skipCache is specified
  if (!options.skipCache) {
    const cached = nameCache.get(normalizedName);
    if (cached && (Date.now() - cached.timestamp < expiryTime)) {
      return cached.address;
    }
  }
  
  try {
    // Determine the protocol based on name suffix or options
    const protocol = determineProtocol(normalizedName, options.protocol);
    
    // Resolve based on protocol
    let address = null;
    
    switch (protocol) {
      case NAMING_PROTOCOLS.ENS:
        address = await resolveENS(normalizedName);
        break;
        
      case NAMING_PROTOCOLS.UNSTOPPABLE:
        address = await resolveUnstoppableDomain(normalizedName);
        break;
        
      case NAMING_PROTOCOLS.LENS:
        address = await resolveLensHandle(normalizedName);
        break;
        
      case NAMING_PROTOCOLS.SPACE_ID:
        address = await resolveSpaceID(normalizedName);
        break;
        
      case NAMING_PROTOCOLS.AVVY:
        address = await resolveAvvy(normalizedName);
        break;
        
      case NAMING_PROTOCOLS.SNS:
        address = await resolveSolanaName(normalizedName);
        break;
        
      case NAMING_PROTOCOLS.PLATFORM:
        address = await resolvePlatformName(normalizedName);
        break;
        
      default:
        // If no specific protocol, try each one in sequence
        address = await tryAllProtocols(normalizedName);
        break;
    }
    
    // If we got an address, cache it
    if (address) {
      nameCache.set(normalizedName, {
        address,
        timestamp: Date.now()
      });
      
      // Also cache the reverse
      addressCache.set(address.toLowerCase(), {
        name: normalizedName,
        timestamp: Date.now()
      });
    }
    
    return address;
  } catch (error) {
    console.error(`Error resolving name ${name}:`, error);
    return null;
  }
}

/**
 * Look up the blockchain name for an address
 * 
 * @param {string} address Wallet address to look up
 * @param {Object} options Lookup options
 * @returns {Promise<string|null>} Name associated with the address, or null if not found
 */
export async function lookupAddress(address, options = {}) {
  if (!address || !ethers.utils.isAddress(address)) return null;
  
  // Normalize address to lowercase
  const normalizedAddress = address.toLowerCase();
  
  // Check cache first unless skipCache is specified
  if (!options.skipCache) {
    const cached = addressCache.get(normalizedAddress);
    if (cached && (Date.now() - cached.timestamp < expiryTime)) {
      return cached.name;
    }
  }
  
  try {
    let name = null;
    const protocols = options.protocols || Object.values(NAMING_PROTOCOLS);
    
    // Try primary protocol first if specified
    if (options.primaryProtocol) {
      name = await lookupByProtocol(normalizedAddress, options.primaryProtocol);
      if (name) {
        cacheResult(normalizedAddress, name);
        return name;
      }
    }
    
    // Try each protocol in sequence
    for (const protocol of protocols) {
      // Skip if we already tried this as primary
      if (protocol === options.primaryProtocol) continue;
      
      name = await lookupByProtocol(normalizedAddress, protocol);
      if (name) {
        break;
      }
    }
    
    // If we found a name, cache it
    if (name) {
      cacheResult(normalizedAddress, name);
    }
    
    return name;
  } catch (error) {
    console.error(`Error looking up address ${address}:`, error);
    return null;
  }
}

/**
 * Check if a name is available for registration
 * 
 * @param {string} name Name to check
 * @param {string} protocol Naming protocol to check
 * @returns {Promise<Object>} Availability status and registration info
 */
export async function checkNameAvailability(name, protocol = NAMING_PROTOCOLS.ENS) {
  if (!name) {
    throw new Error("Name is required to check availability");
  }
  
  try {
    // Normalize name to lowercase
    const normalizedName = name.toLowerCase();
    
    switch (protocol) {
      case NAMING_PROTOCOLS.ENS:
        return await checkENSAvailability(normalizedName);
        
      case NAMING_PROTOCOLS.UNSTOPPABLE:
        return await checkUnstoppableDomainAvailability(normalizedName);
        
      case NAMING_PROTOCOLS.PLATFORM:
        return await checkPlatformNameAvailability(normalizedName);
        
      default:
        throw new Error(`Unsupported protocol for availability check: ${protocol}`);
    }
  } catch (error) {
    console.error(`Error checking availability for ${name}:`, error);
    return {
      available: false,
      error: error.message,
      name
    };
  }
}

/**
 * Format address with associated name for display
 * 
 * @param {string} address Wallet address
 * @param {Object} options Formatting options
 * @returns {Promise<string>} Formatted address with name if available
 */
export async function formatAddressWithName(address, options = {}) {
  if (!address) return '';
  
  let displayAddress = shortenAddress(address);
  
  try {
    // Look up name unless skipLookup is specified
    if (!options.skipLookup) {
      const name = await lookupAddress(address, options);
      if (name) {
        if (options.nameOnly) {
          return name;
        }
        
        displayAddress = options.showAddressFirst ? 
          `${displayAddress} (${name})` :
          `${name} (${displayAddress})`;
      }
    }
    
    return displayAddress;
  } catch (error) {
    console.error(`Error formatting address ${address}:`, error);
    return displayAddress;
  }
}

/**
 * Clear the naming cache
 * 
 * @param {string} type Cache type to clear ("name", "address", "all")
 * @returns {boolean} Success status
 */
export function clearCache(type = 'all') {
  try {
    if (type === 'name' || type === 'all') {
      nameCache.clear();
    }
    
    if (type === 'address' || type === 'all') {
      addressCache.clear();
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing naming cache:', error);
    return false;
  }
}

// Helper functions

/**
 * Determine the naming protocol from a name
 * 
 * @param {string} name Name to check
 * @param {string} defaultProtocol Default protocol to use if none is detected
 * @returns {string} Detected protocol
 */
function determineProtocol(name, defaultProtocol = null) {
  // Check for specific suffixes
  if (name.endsWith('.eth')) {
    return NAMING_PROTOCOLS.ENS;
  } else if (name.endsWith('.crypto') || name.endsWith('.nft') || name.endsWith('.wallet')) {
    return NAMING_PROTOCOLS.UNSTOPPABLE;
  } else if (name.startsWith('lens/') || name.endsWith('.lens')) {
    return NAMING_PROTOCOLS.LENS;
  } else if (name.endsWith('.bnb') || name.endsWith('.arb')) {
    return NAMING_PROTOCOLS.SPACE_ID;
  } else if (name.endsWith('.avax')) {
    return NAMING_PROTOCOLS.AVVY;
  } else if (name.endsWith('.sol')) {
    return NAMING_PROTOCOLS.SNS;
  } else if (name.endsWith('.stream')) {
    return NAMING_PROTOCOLS.PLATFORM;
  }
  
  // Return default if none detected
  return defaultProtocol || NAMING_PROTOCOLS.ENS;
}

/**
 * Try resolving a name across all supported protocols
 * 
 * @param {string} name Name to resolve
 * @returns {Promise<string|null>} Resolved address or null
 */
async function tryAllProtocols(name) {
  // Try ENS first as it's most common
  let address = await resolveENS(name);
  if (address) return address;
  
  // Try other protocols in sequence
  address = await resolveUnstoppableDomain(name);
  if (address) return address;
  
  address = await resolveLensHandle(name);
  if (address) return address;
  
  address = await resolveSpaceID(name);
  if (address) return address;
  
  address = await resolveAvvy(name);
  if (address) return address;
  
  address = await resolveSolanaName(name);
  if (address) return address;
  
  // Try platform's naming system last
  return await resolvePlatformName(name);
}

/**
 * Look up an address in a specific naming protocol
 * 
 * @param {string} address Address to look up
 * @param {string} protocol Naming protocol to use
 * @returns {Promise<string|null>} Name associated with the address or null
 */
async function lookupByProtocol(address, protocol) {
  switch (protocol) {
    case NAMING_PROTOCOLS.ENS:
      return await lookupENS(address);
      
    case NAMING_PROTOCOLS.UNSTOPPABLE:
      return await lookupUnstoppableDomain(address);
      
    case NAMING_PROTOCOLS.LENS:
      return await lookupLensHandle(address);
      
    case NAMING_PROTOCOLS.SPACE_ID:
      return await lookupSpaceID(address);
      
    case NAMING_PROTOCOLS.AVVY:
      return await lookupAvvy(address);
      
    case NAMING_PROTOCOLS.SNS:
      return await lookupSolanaName(address);
      
    case NAMING_PROTOCOLS.PLATFORM:
      return await lookupPlatformName(address);
      
    default:
      return null;
  }
}

/**
 * Resolve an ENS name
 * 
 * @param {string} name ENS name to resolve
 * @returns {Promise<string|null>} Resolved address or null
 */
async function resolveENS(name) {
  try {
    // Add .eth suffix if not present and no other suffix
    if (!name.includes('.')) {
      name = `${name}.eth`;
    }
    
    const provider = BlockchainService.getProvider();
    return await provider.resolveName(name);
  } catch (error) {
    console.error(`Error resolving ENS name ${name}:`, error);
    return null;
  }
}

/**
 * Look up ENS name for an address
 * 
 * @param {string} address Address to look up
 * @returns {Promise<string|null>} ENS name or null
 */
async function lookupENS(address) {
  try {
    const provider = BlockchainService.getProvider();
    return await provider.lookupAddress(address);
  } catch (error) {
    console.error(`Error looking up ENS for address ${address}:`, error);
    return null;
  }
}

/**
 * Resolve an Unstoppable Domain
 * 
 * @param {string} name Unstoppable domain to resolve
 * @returns {Promise<string|null>} Resolved address or null
 */
async function resolveUnstoppableDomain(name) {
  try {
    // In a real implementation, this would use Unstoppable Domains API or Resolution library
    // For a demo, we'll just simulate with a delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Mock resolution for demonstration purposes
    if (name === 'satoshi.crypto') {
      return '0x0000000000000000000000000000000000000001';
    }
    
    return null;
  } catch (error) {
    console.error(`Error resolving Unstoppable Domain ${name}:`, error);
    return null;
  }
}

/**
 * Look up Unstoppable Domain for an address
 * 
 * @param {string} address Address to look up
 * @returns {Promise<string|null>} Unstoppable domain or null
 */
async function lookupUnstoppableDomain(address) {
  try {
    // In a real implementation, this would use Unstoppable Domains API
    // For a demo, we'll just simulate with a delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Mock lookup for demonstration purposes
    if (address.toLowerCase() === '0x0000000000000000000000000000000000000001') {
      return 'satoshi.crypto';
    }
    
    return null;
  } catch (error) {
    console.error(`Error looking up Unstoppable Domain for address ${address}:`, error);
    return null;
  }
}

/**
 * Resolve a Lens Protocol handle
 */
async function resolveLensHandle(handle) {
  // Implementation would use Lens Protocol API
  return null;
}

/**
 * Look up Lens handle for an address
 */
async function lookupLensHandle(address) {
  // Implementation would use Lens Protocol API
  return null;
}

/**
 * Resolve a Space ID domain
 */
async function resolveSpaceID(name) {
  // Implementation would use Space ID resolution
  return null;
}

/**
 * Look up Space ID domain for an address
 */
async function lookupSpaceID(address) {
  // Implementation would use Space ID API
  return null;
}

/**
 * Resolve an Avvy domain (.avax)
 */
async function resolveAvvy(name) {
  // Implementation would use Avvy Domains SDK
  return null;
}

/**
 * Look up Avvy domain for an address
 */
async function lookupAvvy(address) {
  // Implementation would use Avvy Domains SDK
  return null;
}

/**
 * Resolve a Solana name (.sol)
 */
async function resolveSolanaName(name) {
  // Implementation would use Solana Name Service
  return null;
}

/**
 * Look up Solana name for an address
 */
async function lookupSolanaName(address) {
  // Implementation would use Solana Name Service
  return null;
}

/**
 * Resolve a platform-specific name
 * 
 * @param {string} name Platform name to resolve
 * @returns {Promise<string|null>} Resolved address or null
 */
async function resolvePlatformName(name) {
  try {
    // In a real implementation, this would query a database or contract
    // For demonstration, we'll use a simple mock
    
    // Add .stream suffix if not present and no other suffix
    if (!name.includes('.')) {
      name = `${name}.stream`;
    }
    
    // Mock resolution for demonstration
    const mockMapping = {
      'alice.stream': '0x0000000000000000000000000000000000000A11CE',
      'bob.stream': '0x0000000000000000000000000000000000000B0B'
    };
    
    return mockMapping[name.toLowerCase()] || null;
  } catch (error) {
    console.error(`Error resolving platform name ${name}:`, error);
    return null;
  }
}

/**
 * Look up platform name for an address
 */
async function lookupPlatformName(address) {
  try {
    // Mock lookup for demonstration
    const mockMapping = {
      '0x0000000000000000000000000000000000000a11ce': 'alice.stream',
      '0x0000000000000000000000000000000000000b0b': 'bob.stream'
    };
    
    return mockMapping[address.toLowerCase()] || null;
  } catch (error) {
    console.error(`Error looking up platform name for address ${address}:`, error);
    return null;
  }
}

/**
 * Check ENS name availability
 */
async function checkENSAvailability(name) {
  try {
    const provider = BlockchainService.getProvider();
    
    // Add .eth suffix if not present and no other suffix
    if (!name.includes('.')) {
      name = `${name}.eth`;
    }
    
    // Resolve the name to see if it's taken
    const address = await provider.resolveName(name);
    
    // If we get an address back, the name is taken
    if (address) {
      return {
        name,
        available: false,
        registeredTo: address
      };
    }
    
    // In a real implementation, we'd check if the name is valid and available for registration
    // (some names may be reserved, invalid, or expired but in grace period)
    const nameLength = name.replace('.eth', '').length;
    
    return {
      name,
      available: nameLength >= 3,
      estimatedCost: nameLength >= 5 ? "0.005 ETH/year" : "0.01 ETH/year",
      registrationUrl: `https://app.ens.domains/name/${name}`
    };
  } catch (error) {
    console.error(`Error checking ENS availability for ${name}:`, error);
    return {
      name,
      available: false,
      error: error.message
    };
  }
}

/**
 * Check Unstoppable Domain availability
 */
async function checkUnstoppableDomainAvailability(name) {
  // Implementation would use Unstoppable Domains API
  return {
    name,
    available: false,
    error: "Unstoppable Domains availability check not implemented"
  };
}

/**
 * Check platform name availability
 */
async function checkPlatformNameAvailability(name) {
  try {
    // Add .stream suffix if not present and no other suffix
    if (!name.includes('.')) {
      name = `${name}.stream`;
    }
    
    // In a real implementation, this would check database
    const takenNames = ['alice.stream', 'bob.stream'];
    
    return {
      name,
      available: !takenNames.includes(name.toLowerCase()),
      estimatedCost: "Free for platform users with verification"
    };
  } catch (error) {
    console.error(`Error checking platform name availability for ${name}:`, error);
    return {
      name,
      available: false,
      error: error.message
    };
  }
}

/**
 * Cache a name resolution result
 * 
 * @param {string} address Ethereum address
 * @param {string} name Resolved name
 */
function cacheResult(address, name) {
  // Cache address -> name
  addressCache.set(address.toLowerCase(), {
    name,
    timestamp: Date.now()
  });
  
  // Cache name -> address
  nameCache.set(name.toLowerCase(), {
    address,
    timestamp: Date.now()
  });
}

/**
 * Shorten an address for display
 * 
 * @param {string} address The address to shorten
 * @param {number} prefixLength Length of prefix to keep
 * @param {number} suffixLength Length of suffix to keep
 * @returns {string} Shortened address
 */
export function shortenAddress(address, prefixLength = 6, suffixLength = 4) {
  if (!address) return '';
  if (!ethers.utils.isAddress(address)) return address;
  
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}

export default {
  initNamingService,
  resolveName,
  lookupAddress,
  checkNameAvailability,
  formatAddressWithName,
  clearCache,
  shortenAddress,
  NAMING_PROTOCOLS
};
