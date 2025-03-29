/**
 * DNA Registration Service
 * 
 * Handles operations related to purchasing, registering, and validating
 * digital DNA sequences on the blockchain for content authentication and
 * ownership verification.
 */

import { ethers } from 'ethers';
import * as BlockchainService from './BlockchainService';
import * as NamingService from './NamingService';
import { optimizeComputation } from './OptimizationService';
import { EXECUTION_STRATEGIES, PRIORITY_LEVELS } from './ExecutionEngine';

// DNA Registration types
export const DNA_TYPES = {
  BASIC: 'basic',
  CREATOR: 'creator',
  ENTERPRISE: 'enterprise',
  SOVEREIGN: 'sovereign',
  IMMORTAL: 'immortal'
};

// DNA Registration status
export const DNA_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  TRANSFERRING: 'transferring'
};

// DNA Chain compatibility
export const DNA_CHAINS = {
  ETHEREUM: 'ethereum',
  POLYGON: 'polygon',
  OPTIMISM: 'optimism',
  ARBITRUM: 'arbitrum',
  ALL: 'all' // For multi-chain DNA registrations
};

// Cache for DNA registrations
const dnaCache = new Map();

/**
 * Initialize the DNA Registration Service
 * 
 * @returns {Promise<boolean>} Success status
 */
export async function initDNAService() {
  try {
    // Clear cache
    dnaCache.clear();
    
    // Load and cache active registrations if wallet is connected
    if (BlockchainService.isConnected()) {
      await loadRegistrations(BlockchainService.getCurrentAccount());
    }
    
    console.log('DNA Registration Service initialized');
    return true;
  } catch (error) {
    console.error('Error initializing DNA Registration Service:', error);
    return false;
  }
}

/**
 * Get DNA registration costs
 * 
 * @param {string} type DNA registration type
 * @param {Object} options Additional options
 * @returns {Promise<Object>} Registration cost details
 */
export async function getRegistrationCosts(type = DNA_TYPES.BASIC, options = {}) {
  try {
    // In a real implementation, this would query a smart contract or API
    // For demo purposes, we'll use hardcoded values with some randomization
    
    const baseCosts = {
      [DNA_TYPES.BASIC]: 0.01,      // 0.01 ETH
      [DNA_TYPES.CREATOR]: 0.05,    // 0.05 ETH
      [DNA_TYPES.ENTERPRISE]: 0.2,  // 0.2 ETH
      [DNA_TYPES.SOVEREIGN]: 0.5,   // 0.5 ETH
      [DNA_TYPES.IMMORTAL]: 2.0     // 2.0 ETH
    };
    
    // Add slight randomness to simulate market conditions (+/-5%)
    const marketFactor = 0.95 + (Math.random() * 0.1);
    const baseCost = baseCosts[type] || baseCosts[DNA_TYPES.BASIC];
    const finalCost = baseCost * marketFactor;
    
    // Calculate gas estimate
    const gasEstimate = options.chain === DNA_CHAINS.ETHEREUM ? 
      250000 : // Ethereum mainnet
      options.chain === DNA_CHAINS.POLYGON ? 
        90000 : // Polygon
        120000; // Default for other chains
    
    // Get current gas price
    const gasPrice = await BlockchainService.getProvider().getGasPrice();
    const gasPriceGwei = parseFloat(ethers.utils.formatUnits(gasPrice, 'gwei'));
    
    // Calculate gas cost in ETH
    const gasCostEth = gasEstimate * gasPriceGwei * 1e-9;
    
    // Discount for longer registrations
    const durationYears = options.durationYears || 1;
    const durationDiscount = durationYears > 1 ? 
      Math.min(0.25, (durationYears - 1) * 0.05) : 0; // Up to 25% discount
    
    // Multi-chain premium
    const chainPremium = options.chains && options.chains.length > 1 ? 
      (options.chains.length - 1) * 0.1 : 0; // 10% premium per additional chain
    
    // Final calculations
    const yearlyPrice = finalCost * (1 - durationDiscount) * (1 + chainPremium);
    const totalPrice = yearlyPrice * durationYears;
    
    return {
      baseCost: baseCost,
      yearlyPrice: yearlyPrice,
      totalPrice: totalPrice,
      gasCost: gasCostEth,
      totalWithGas: totalPrice + gasCostEth,
      durationYears: durationYears,
      discount: durationDiscount > 0 ? `${Math.round(durationDiscount * 100)}%` : null,
      chainPremium: chainPremium > 0 ? `${Math.round(chainPremium * 100)}%` : null,
      priceBreakdown: {
        base: baseCost * durationYears,
        discount: -(baseCost * durationYears * durationDiscount),
        chainPremium: baseCost * durationYears * chainPremium,
        gas: gasCostEth
      }
    };
  } catch (error) {
    console.error('Error calculating DNA registration costs:', error);
    throw error;
  }
}

/**
 * Purchase a DNA registration
 * 
 * @param {Object} registrationData Registration details
 * @returns {Promise<Object>} Transaction result
 */
export async function purchaseDNARegistration(registrationData) {
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet not connected');
  }
  
  try {
    const { 
      dnaId, 
      type = DNA_TYPES.BASIC, 
      durationYears = 1,
      chains = [DNA_CHAINS.ETHEREUM],
      metadataURI = null,
      referralCode = null
    } = registrationData;
    
    // Validate inputs
    if (!dnaId) {
      throw new Error('DNA ID is required');
    }
    
    // Validate DNA ID format
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(dnaId)) {
      throw new Error('Invalid DNA ID format');
    }
    
    // Check if DNA ID is available
    const available = await checkDNAAvailability(dnaId);
    if (!available.available) {
      throw new Error(`DNA ID '${dnaId}' is not available: ${available.reason}`);
    }
    
    // Calculate costs
    const costs = await getRegistrationCosts(type, { 
      durationYears, 
      chains,
      chain: chains[0]
    });
    
    // Prepare registration data for the smart contract
    const registrationParams = {
      dnaId,
      type,
      durationInSeconds: durationYears * 365 * 24 * 60 * 60,
      chains: chains,
      metadataURI: metadataURI || '',
      referralCode: referralCode || '0x0000000000000000000000000000000000000000'
    };
    
    // In a real implementation, this would call a smart contract
    // For demo purposes, we'll simulate the blockchain transaction
    
    console.log('Purchasing DNA registration with params:', registrationParams);
    console.log('Cost:', costs);
    
    // Simulate blockchain delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a mock transaction hash
    const txHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    // Generate a unique DNA hash based on the DNA ID
    const dnaHash = ethers.utils.id(dnaId + Date.now());
    
    // Create registration record
    const registration = {
      id: dnaId,
      hash: dnaHash,
      owner: BlockchainService.getCurrentAccount(),
      type,
      registeredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + durationYears * 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: DNA_STATUS.ACTIVE,
      chains,
      metadataURI,
      transactions: [{
        type: 'registration',
        hash: txHash,
        timestamp: new Date().toISOString(),
        value: costs.totalWithGas
      }]
    };
    
    // Cache the registration
    dnaCache.set(dnaId.toLowerCase(), registration);
    
    // Return success response
    return {
      success: true,
      dnaId,
      dnaHash,
      transaction: {
        hash: txHash,
        value: costs.totalWithGas,
        timestamp: new Date().toISOString()
      },
      registration
    };
  } catch (error) {
    console.error('Error purchasing DNA registration:', error);
    throw error;
  }
}

/**
 * Check if a DNA ID is available
 * 
 * @param {string} dnaId DNA ID to check
 * @returns {Promise<Object>} Availability status
 */
export async function checkDNAAvailability(dnaId) {
  if (!dnaId) {
    return { 
      available: false, 
      reason: 'DNA ID is required'
    };
  }
  
  try {
    // Normalize ID to lowercase
    const normalizedId = dnaId.toLowerCase();
    
    // Validate DNA ID format
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(dnaId)) {
      return {
        available: false,
        reason: 'Invalid DNA ID format',
        dnaId
      };
    }
    
    // Check against a list of reserved IDs
    const reservedIds = ['system', 'admin', 'root', 'dns', 'blockchain', 'platform'];
    if (reservedIds.includes(normalizedId) || reservedIds.some(id => normalizedId.includes(id))) {
      return {
        available: false,
        reason: 'This DNA ID is reserved',
        dnaId
      };
    }
    
    // Check if ID is already registered by checking our cache
    if (dnaCache.has(normalizedId)) {
      const cachedDna = dnaCache.get(normalizedId);
      
      // If expired, it's available again
      if (cachedDna.status === DNA_STATUS.EXPIRED) {
        return {
          available: true,
          previouslyRegistered: true,
          dnaId
        };
      }
      
      return {
        available: false,
        reason: 'This DNA ID is already registered',
        expiresAt: cachedDna.expiresAt,
        dnaId
      };
    }
    
    // In a real implementation, this would check against a smart contract
    // For demo purposes, we'll simulate the check
    
    // Simulate a 5% chance the name is taken but not in our cache
    if (Math.random() < 0.05) {
      return {
        available: false,
        reason: 'This DNA ID is already registered',
        dnaId
      };
    }
    
    // DNA ID is available
    return {
      available: true,
      dnaId
    };
  } catch (error) {
    console.error('Error checking DNA availability:', error);
    return {
      available: false,
      reason: 'Error checking availability',
      error: error.message,
      dnaId
    };
  }
}

/**
 * Get user's DNA registrations
 * 
 * @param {string} address Wallet address
 * @returns {Promise<Array>} User's DNA registrations
 */
export async function getUserDNARegistrations(address) {
  if (!address) {
    throw new Error('Address is required to fetch DNA registrations');
  }
  
  try {
    // Check if we need to load registrations
    if (dnaCache.size === 0) {
      await loadRegistrations(address);
    }
    
    // Filter registrations by owner
    const userRegistrations = Array.from(dnaCache.values())
      .filter(dna => dna.owner.toLowerCase() === address.toLowerCase());
    
    return userRegistrations;
  } catch (error) {
    console.error('Error fetching DNA registrations:', error);
    throw error;
  }
}

/**
 * Resolve a DNA ID to its associated data
 * 
 * @param {string} dnaId DNA ID to resolve
 * @returns {Promise<Object|null>} DNA registration data or null if not found
 */
export async function resolveDNA(dnaId) {
  if (!dnaId) return null;
  
  try {
    // Check cache first
    const normalizedId = dnaId.toLowerCase();
    if (dnaCache.has(normalizedId)) {
      const dna = dnaCache.get(normalizedId);
      
      // Only return active registrations
      if (dna.status === DNA_STATUS.ACTIVE) {
        return dna;
      }
    }
    
    // In a real implementation, this would query a smart contract
    // For demo purposes, we'll simulate the query
    
    // Simulate blockchain delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Simulate a 10% chance we find the registration even if not in cache
    if (Math.random() < 0.1) {
      const mockDna = {
        id: dnaId,
        hash: ethers.utils.id(dnaId),
        owner: `0x${Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        type: DNA_TYPES.BASIC,
        registeredAt: new Date(Date.now() - Math.random() * 31536000000).toISOString(), // up to 1 year ago
        expiresAt: new Date(Date.now() + Math.random() * 31536000000).toISOString(), // up to 1 year from now
        status: DNA_STATUS.ACTIVE,
        chains: [DNA_CHAINS.ETHEREUM]
      };
      
      // Cache the result
      dnaCache.set(normalizedId, mockDna);
      
      return mockDna;
    }
    
    return null;
  } catch (error) {
    console.error('Error resolving DNA:', error);
    return null;
  }
}

/**
 * Validate a DNA hash
 * 
 * @param {string} dnaId DNA ID
 * @param {string} dnaHash DNA hash to validate
 * @returns {Promise<boolean>} Validation result
 */
export async function validateDNAHash(dnaId, dnaHash) {
  if (!dnaId || !dnaHash) return false;
  
  try {
    const dna = await resolveDNA(dnaId);
    if (!dna) return false;
    
    return dna.hash === dnaHash;
  } catch (error) {
    console.error('Error validating DNA hash:', error);
    return false;
  }
}

/**
 * Transfer DNA registration to another address
 * 
 * @param {string} dnaId DNA ID to transfer
 * @param {string} toAddress Recipient address
 * @returns {Promise<Object>} Transfer result
 */
export async function transferDNARegistration(dnaId, toAddress) {
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet not connected');
  }
  
  if (!dnaId || !toAddress) {
    throw new Error('DNA ID and recipient address are required');
  }
  
  // Validate recipient address
  if (!ethers.utils.isAddress(toAddress)) {
    throw new Error('Invalid recipient address');
  }
  
  try {
    const normalizedId = dnaId.toLowerCase();
    const currentAddress = BlockchainService.getCurrentAccount();
    
    // Check if DNA exists and belongs to current user
    const dna = await resolveDNA(dnaId);
    if (!dna) {
      throw new Error(`DNA registration '${dnaId}' not found`);
    }
    
    if (dna.owner.toLowerCase() !== currentAddress.toLowerCase()) {
      throw new Error(`You don't own the DNA registration '${dnaId}'`);
    }
    
    // In a real implementation, this would call a smart contract
    // For demo purposes, we'll simulate the blockchain transaction
    
    // Update cache status to transferring
    const updatedDna = { ...dna, status: DNA_STATUS.TRANSFERRING };
    dnaCache.set(normalizedId, updatedDna);
    
    // Simulate blockchain delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a mock transaction hash
    const txHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    // Update DNA owner and status
    const transferredDna = {
      ...dna,
      owner: toAddress,
      status: DNA_STATUS.ACTIVE,
      transactions: [
        ...(dna.transactions || []),
        {
          type: 'transfer',
          hash: txHash,
          from: currentAddress,
          to: toAddress,
          timestamp: new Date().toISOString()
        }
      ]
    };
    
    // Update cache
    dnaCache.set(normalizedId, transferredDna);
    
    return {
      success: true,
      dnaId,
      fromAddress: currentAddress,
      toAddress,
      transaction: {
        hash: txHash,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error transferring DNA registration:', error);
    throw error;
  }
}

/**
 * Renew DNA registration
 * 
 * @param {string} dnaId DNA ID to renew
 * @param {number} durationYears Renewal duration in years
 * @returns {Promise<Object>} Renewal result
 */
export async function renewDNARegistration(dnaId, durationYears = 1) {
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet not connected');
  }
  
  if (!dnaId) {
    throw new Error('DNA ID is required');
  }
  
  try {
    const normalizedId = dnaId.toLowerCase();
    const currentAddress = BlockchainService.getCurrentAccount();
    
    // Check if DNA exists and belongs to current user
    const dna = await resolveDNA(dnaId);
    if (!dna) {
      throw new Error(`DNA registration '${dnaId}' not found`);
    }
    
    if (dna.owner.toLowerCase() !== currentAddress.toLowerCase()) {
      throw new Error(`You don't own the DNA registration '${dnaId}'`);
    }
    
    // Calculate renewal cost
    const costs = await getRegistrationCosts(dna.type, { 
      durationYears,
      chains: dna.chains
    });
    
    // In a real implementation, this would call a smart contract
    // For demo purposes, we'll simulate the blockchain transaction
    
    // Simulate blockchain delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate a mock transaction hash
    const txHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    // Calculate new expiry date
    const currentExpiry = new Date(dna.expiresAt);
    const newExpiry = new Date(currentExpiry.getTime() + durationYears * 365 * 24 * 60 * 60 * 1000);
    
    // Update DNA registration
    const renewedDna = {
      ...dna,
      expiresAt: newExpiry.toISOString(),
      transactions: [
        ...(dna.transactions || []),
        {
          type: 'renewal',
          hash: txHash,
          duration: durationYears,
          timestamp: new Date().toISOString(),
          value: costs.totalWithGas
        }
      ]
    };
    
    // Update cache
    dnaCache.set(normalizedId, renewedDna);
    
    return {
      success: true,
      dnaId,
      previousExpiry: dna.expiresAt,
      newExpiry: renewedDna.expiresAt,
      durationYears,
      transaction: {
        hash: txHash,
        value: costs.totalWithGas,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error renewing DNA registration:', error);
    throw error;
  }
}

/**
 * Update DNA metadata
 * 
 * @param {string} dnaId DNA ID to update
 * @param {string} metadataURI New metadata URI
 * @returns {Promise<Object>} Update result
 */
export async function updateDNAMetadata(dnaId, metadataURI) {
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet not connected');
  }
  
  if (!dnaId || !metadataURI) {
    throw new Error('DNA ID and metadata URI are required');
  }
  
  try {
    const normalizedId = dnaId.toLowerCase();
    const currentAddress = BlockchainService.getCurrentAccount();
    
    // Check if DNA exists and belongs to current user
    const dna = await resolveDNA(dnaId);
    if (!dna) {
      throw new Error(`DNA registration '${dnaId}' not found`);
    }
    
    if (dna.owner.toLowerCase() !== currentAddress.toLowerCase()) {
      throw new Error(`You don't own the DNA registration '${dnaId}'`);
    }
    
    // In a real implementation, this would call a smart contract
    // For demo purposes, we'll simulate the blockchain transaction
    
    // Simulate blockchain delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a mock transaction hash
    const txHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    // Update DNA registration
    const updatedDna = {
      ...dna,
      metadataURI,
      transactions: [
        ...(dna.transactions || []),
        {
          type: 'metadata_update',
          hash: txHash,
          previousURI: dna.metadataURI,
          newURI: metadataURI,
          timestamp: new Date().toISOString()
        }
      ]
    };
    
    // Update cache
    dnaCache.set(normalizedId, updatedDna);
    
    return {
      success: true,
      dnaId,
      metadataURI,
      transaction: {
        hash: txHash,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error updating DNA metadata:', error);
    throw error;
  }
}

/**
 * Generate suggested DNA IDs based on wallet address or name
 * 
 * @param {string} input Optional input to base suggestions on
 * @returns {Promise<Array<string>>} Suggested DNA IDs
 */
export async function generateDNASuggestions(input = '') {
  try {
    // Try to get suggestions based on wallet ENS or address
    let baseName = input.trim();
    if (!baseName && BlockchainService.isConnected()) {
      const address = BlockchainService.getCurrentAccount();
      
      // Try to get ENS name
      const ensName = await NamingService.lookupAddress(address);
      if (ensName) {
        baseName = ensName.replace('.eth', '');
      } else {
        // Use abbreviated address
        baseName = `user${address.substring(2, 6)}`;
      }
    }
    
    if (!baseName) {
      baseName = 'user' + Math.floor(Math.random() * 1000);
    }
    
    // Generate variations
    const suggestions = [
      baseName,
      `${baseName}${Math.floor(Math.random() * 1000)}`,
      `${baseName}_${['dna', 'id', 'reg', 'bio'][Math.floor(Math.random() * 4)]}`,
      `${['crypto', 'web3', 'chain'][Math.floor(Math.random() * 3)]}_${baseName}`,
      `${baseName}_${Math.floor(Math.random() * 100)}${['x', 'y', 'z'][Math.floor(Math.random() * 3)]}`,
    ];
    
    // Check availability of each suggestion
    const results = await Promise.all(
      suggestions.map(async (suggestion) => {
        try {
          const available = await checkDNAAvailability(suggestion);
          return {
            id: suggestion,
            available: available.available
          };
        } catch (error) {
          return {
            id: suggestion,
            available: false
          };
        }
      })
    );
    
    // Filter for available suggestions and add some random ones if needed
    let availableSuggestions = results.filter(result => result.available).map(result => result.id);
    
    // If we have fewer than 3 suggestions, add random ones
    while (availableSuggestions.length < 3) {
      const randomSuffix = Math.floor(Math.random() * 10000);
      const randomPrefix = ['dna', 'bio', 'gen', 'seq'][Math.floor(Math.random() * 4)];
      const randomId = `${randomPrefix}${baseName}${randomSuffix}`;
      
      const available = await checkDNAAvailability(randomId);
      if (available.available && !availableSuggestions.includes(randomId)) {
        availableSuggestions.push(randomId);
      }
    }
    
    return availableSuggestions;
  } catch (error) {
    console.error('Error generating DNA suggestions:', error);
    return [];
  }
}

/**
 * Load user's DNA registrations
 * 
 * @param {string} address Wallet address
 * @returns {Promise<boolean>} Success status
 */
async function loadRegistrations(address) {
  try {
    // In a real implementation, this would query a smart contract or API
    // For demo purposes, we'll generate some mock DNA registrations
    
    // Clear existing registrations for this user
    for (const [id, dna] of dnaCache.entries()) {
      if (dna.owner.toLowerCase() === address.toLowerCase()) {
        dnaCache.delete(id);
      }
    }
    
    // Generate 0-3 mock registrations
    const registrationCount = Math.floor(Math.random() * 4);
    const types = Object.values(DNA_TYPES);
    const chains = Object.values(DNA_CHAINS).filter(chain => chain !== DNA_CHAINS.ALL);
    
    for (let i = 0; i < registrationCount; i++) {
      const dnaId = `user${address.substring(2, 6)}_dna${i + 1}`;
      const type = types[Math.floor(Math.random() * types.length)];
      const registeredDate = new Date(Date.now() - Math.random() * 31536000000); // up to 1 year ago
      const durationYears = Math.floor(Math.random() * 5) + 1; // 1-5 years
      const expiryDate = new Date(registeredDate.getTime() + durationYears * 365 * 24 * 60 * 60 * 1000);
      
      // Randomly select 1-3 chains
      const chainCount = Math.floor(Math.random() * 3) + 1;
      const selectedChains = [];
      for (let j = 0; j < chainCount; j++) {
        const chain = chains[Math.floor(Math.random() * chains.length)];
        if (!selectedChains.includes(chain)) {
          selectedChains.push(chain);
        }
      }
      
      // Create mock DNA registration
      const mockDna = {
        id: dnaId,
        hash: ethers.utils.id(dnaId + registeredDate.getTime()),
        owner: address,
        type,
        registeredAt: registeredDate.toISOString(),
        expiresAt: expiryDate.toISOString(),
        status: DNA_STATUS.ACTIVE,
        chains: selectedChains,
        metadataURI: i % 2 === 0 ? `ipfs://Qm${Array(44).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}` : null,
        transactions: [{
          type: 'registration',
          hash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          timestamp: registeredDate.toISOString(),
          value: Math.random() * 0.5 // 0-0.5 ETH
        }]
      };
      
      // Add to cache
      dnaCache.set(dnaId.toLowerCase(), mockDna);
    }
    
    return true;
  } catch (error) {
    console.error('Error loading DNA registrations:', error);
    return false;
  }
}

export default {
  initDNAService,
  getRegistrationCosts,
  purchaseDNARegistration,
  checkDNAAvailability,
  getUserDNARegistrations,
  resolveDNA,
  validateDNAHash,
  transferDNARegistration,
  renewDNARegistration,
  updateDNAMetadata,
  generateDNASuggestions,
  DNA_TYPES,
  DNA_STATUS,
  DNA_CHAINS
};
