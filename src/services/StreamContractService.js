/**
 * Stream Contract Service
 * 
 * Provides an interface to interact with the Stream Access Contract
 * for managing content access control in the Web3 Crypto Streaming platform.
 */

import { ethers } from 'ethers';
import * as BlockchainService from './BlockchainService';
import * as SecurityService from './RiceAdvancedNetworkSecurityService';
import StreamAccessContractABI from '../contracts/abi/StreamAccessContract.json';

// Service state
let initialized = false;
let contract = null;
let contractAddress = null;
const userAccessCache = new Map();
const contentCache = new Map();
let serviceConfig = {
  cacheDuration: 5 * 60 * 1000, // 5 minutes
  autoRefreshAccess: true,
  refreshInterval: 60 * 1000, // 1 minute
  useEvents: true,
  gasPriceMultiplier: 1.1
};

// Active listener references for cleanup
const activeListeners = [];

/**
 * Initialize the Stream Contract Service
 * @param {Object} options Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initialize(options = {}) {
  if (initialized) {
    return true;
  }

  try {
    console.log('Initializing Stream Contract Service...');

    // Initialize the RICE security service if not already initialized
    if (!SecurityService.getSecurityMetrics()) {
      await SecurityService.initSecurityService();
    }

    // Apply configuration options
    if (options.config) {
      serviceConfig = {
        ...serviceConfig,
        ...options.config
      };
    }

    // Get contract address based on network
    contractAddress = options.contractAddress || await _getContractAddress();
    
    if (!contractAddress) {
      console.error('Contract address not available for the current network');
      return false;
    }

    // Initialize contract instance
    const provider = await BlockchainService.getProvider();
    contract = new ethers.Contract(
      contractAddress,
      StreamAccessContractABI,
      provider
    );

    // Set up event listeners if enabled
    if (serviceConfig.useEvents) {
      _setupEventListeners();
    }

    // Set up access refresh mechanism
    if (serviceConfig.autoRefreshAccess) {
      _setupAccessRefresh();
    }

    initialized = true;
    console.log('Stream Contract Service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Stream Contract Service:', error);
    return false;
  }
}

/**
 * Get contract address based on current network
 * @returns {Promise<string>} Contract address
 * @private
 */
async function _getContractAddress() {
  const network = await BlockchainService.getNetworkId();
  
  // Contract addresses for different networks
  const addresses = {
    1: '0x123...', // Ethereum Mainnet (replace with actual address after deployment)
    5: '0x456...', // Goerli Testnet
    137: '0x789...', // Polygon
    80001: '0xabc...', // Mumbai Testnet
    // Add more networks as needed
  };
  
  return addresses[network];
}

/**
 * Set up event listeners for contract events
 * @private
 */
function _setupEventListeners() {
  // Listen for AccessGranted events
  const accessGrantedFilter = contract.filters.AccessGranted(null, null);
  const accessHandler = (contentId, user, expirationTime) => {
    // Update cache when a new access is granted
    const cacheKey = `${contentId}-${user.toLowerCase()}`;
    userAccessCache.set(cacheKey, {
      hasAccess: true,
      expirationTime: expirationTime.toNumber(),
      lastChecked: Date.now()
    });
    
    console.log(`Access granted for user ${user} to content ${contentId}`);
  };
  
  contract.on(accessGrantedFilter, accessHandler);
  activeListeners.push({
    filter: accessGrantedFilter,
    handler: accessHandler
  });
  
  // Listen for ContentRegistered events
  const contentRegisteredFilter = contract.filters.ContentRegistered(null, null);
  const contentHandler = (contentId, creator, isPremium, price) => {
    // Update cache when new content is registered
    contentCache.delete(contentId); // Clear cache to force reload
    
    console.log(`New content registered: ${contentId} by ${creator}`);
  };
  
  contract.on(contentRegisteredFilter, contentHandler);
  activeListeners.push({
    filter: contentRegisteredFilter,
    handler: contentHandler
  });
}

/**
 * Set up periodic access refresh
 * @private
 */
function _setupAccessRefresh() {
  setInterval(() => {
    // Refresh cached access that might be close to expiration
    const now = Date.now();
    
    for (const [key, accessInfo] of userAccessCache.entries()) {
      // If expiration time is approaching or cache is old, refresh it
      if ((accessInfo.expirationTime > 0 && 
          accessInfo.expirationTime - now < 10 * 60 * 1000) || // 10 minutes before expiry
          now - accessInfo.lastChecked > serviceConfig.cacheDuration) {
        
        // Parse key back to contentId and user
        const [contentId, user] = key.split('-');
        
        // Re-check access
        _refreshAccess(contentId, user);
      }
    }
  }, serviceConfig.refreshInterval);
}

/**
 * Refresh access status for a user and content
 * @param {string} contentId Content identifier
 * @param {string} user User address
 * @private
 */
async function _refreshAccess(contentId, user) {
  try {
    const hasAccess = await contract.hasAccess(contentId, user);
    
    // Get expiration time if they have access
    let expirationTime = 0;
    if (hasAccess) {
      const accessInfo = await contract.userAccess(contentId, user);
      expirationTime = accessInfo.expirationTime.toNumber();
    }
    
    // Update cache
    const cacheKey = `${contentId}-${user.toLowerCase()}`;
    userAccessCache.set(cacheKey, {
      hasAccess,
      expirationTime,
      lastChecked: Date.now()
    });
  } catch (error) {
    console.error(`Error refreshing access for ${user} to content ${contentId}:`, error);
  }
}

/**
 * Register new content on the blockchain
 * @param {Object} contentData Content data
 * @returns {Promise<Object>} Registration result
 */
export async function registerContent(contentData) {
  if (!initialized) {
    await initialize();
  }
  
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet must be connected to register content');
  }
  
  try {
    const {
      contentId,
      price = 0,
      isPremium = false,
      royaltyPercent = 10,
      contentHash
    } = contentData;
    
    if (!contentId || !contentHash) {
      throw new Error('Content ID and hash are required');
    }
    
    if (royaltyPercent > 100) {
      throw new Error('Royalty percentage cannot exceed 100%');
    }
    
    // Convert contentId to bytes32 if needed
    let bytes32ContentId = contentId;
    if (!contentId.startsWith('0x') || contentId.length !== 66) {
      bytes32ContentId = ethers.utils.id(contentId);
    }
    
    // Convert price to Wei if provided as ETH
    const priceInWei = ethers.utils.parseEther(price.toString());
    
    // Get signer for transaction
    const signer = await BlockchainService.getSigner();
    const contractWithSigner = contract.connect(signer);
    
    // Estimate gas
    const gasEstimate = await contractWithSigner.estimateGas.registerContent(
      bytes32ContentId,
      priceInWei,
      isPremium,
      royaltyPercent,
      contentHash
    );
    
    // Add 10% to gas estimate for safety
    const adjustedGas = gasEstimate.mul(Math.floor(serviceConfig.gasPriceMultiplier * 100)).div(100);
    
    // Send transaction
    const tx = await contractWithSigner.registerContent(
      bytes32ContentId,
      priceInWei,
      isPremium,
      royaltyPercent,
      contentHash,
      {
        gasLimit: adjustedGas
      }
    );
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    // Clear cache for this content
    contentCache.delete(bytes32ContentId);
    
    return {
      success: true,
      message: 'Content registered successfully',
      transactionHash: receipt.transactionHash,
      contentId: bytes32ContentId
    };
  } catch (error) {
    console.error('Error registering content:', error);
    throw error;
  }
}

/**
 * Purchase access to content
 * @param {string} contentId Content identifier
 * @param {number} duration Access duration in seconds (0 for permanent)
 * @returns {Promise<Object>} Purchase result
 */
export async function purchaseAccess(contentId, duration = 0) {
  if (!initialized) {
    await initialize();
  }
  
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet must be connected to purchase content');
  }
  
  try {
    // Convert contentId to bytes32 if needed
    let bytes32ContentId = contentId;
    if (!contentId.startsWith('0x') || contentId.length !== 66) {
      bytes32ContentId = ethers.utils.id(contentId);
    }
    
    // Get content details to know the price
    const content = await getContentDetails(bytes32ContentId);
    
    // Get signer for transaction
    const signer = await BlockchainService.getSigner();
    const contractWithSigner = contract.connect(signer);
    
    // Send transaction with payment
    const tx = await contractWithSigner.purchaseAccess(
      bytes32ContentId,
      duration,
      {
        value: content.price
      }
    );
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    // Update access cache
    const userAddress = await signer.getAddress();
    const cacheKey = `${bytes32ContentId}-${userAddress.toLowerCase()}`;
    
    userAccessCache.set(cacheKey, {
      hasAccess: true,
      expirationTime: duration > 0 ? Math.floor(Date.now() / 1000) + duration : 0,
      lastChecked: Date.now()
    });
    
    return {
      success: true,
      message: 'Access purchased successfully',
      transactionHash: receipt.transactionHash,
      contentId: bytes32ContentId,
      expirationTime: duration > 0 ? Math.floor(Date.now() / 1000) + duration : 0
    };
  } catch (error) {
    console.error('Error purchasing access:', error);
    throw error;
  }
}

/**
 * Check if a user has access to content
 * @param {string} contentId Content identifier
 * @param {string} userAddress User address (optional, uses connected wallet if not provided)
 * @returns {Promise<boolean>} Whether user has access
 */
export async function checkAccess(contentId, userAddress) {
  if (!initialized) {
    await initialize();
  }
  
  // Convert contentId to bytes32 if needed
  let bytes32ContentId = contentId;
  if (!contentId.startsWith('0x') || contentId.length !== 66) {
    bytes32ContentId = ethers.utils.id(contentId);
  }
  
  // Get user address if not provided
  const user = userAddress || 
    (BlockchainService.isConnected() ? await BlockchainService.getCurrentAccount() : null);
  
  if (!user) {
    return false;
  }
  
  // Check cache first
  const cacheKey = `${bytes32ContentId}-${user.toLowerCase()}`;
  const cachedAccess = userAccessCache.get(cacheKey);
  
  if (cachedAccess && Date.now() - cachedAccess.lastChecked < serviceConfig.cacheDuration) {
    // If cached access is valid and not expired
    if (cachedAccess.hasAccess && 
        (cachedAccess.expirationTime === 0 || 
         cachedAccess.expirationTime > Math.floor(Date.now() / 1000))) {
      return true;
    }
    return false;
  }
  
  // Otherwise check on-chain
  try {
    const hasAccess = await contract.hasAccess(bytes32ContentId, user);
    
    // Get expiration time if they have access
    let expirationTime = 0;
    if (hasAccess) {
      const accessInfo = await contract.userAccess(bytes32ContentId, user);
      expirationTime = accessInfo.expirationTime.toNumber();
    }
    
    // Update cache
    userAccessCache.set(cacheKey, {
      hasAccess,
      expirationTime,
      lastChecked: Date.now()
    });
    
    return hasAccess;
  } catch (error) {
    console.error(`Error checking access for ${user} to content ${contentId}:`, error);
    return false;
  }
}

/**
 * Get content details from the contract
 * @param {string} contentId Content identifier
 * @returns {Promise<Object>} Content details
 */
export async function getContentDetails(contentId) {
  if (!initialized) {
    await initialize();
  }
  
  // Convert contentId to bytes32 if needed
  let bytes32ContentId = contentId;
  if (!contentId.startsWith('0x') || contentId.length !== 66) {
    bytes32ContentId = ethers.utils.id(contentId);
  }
  
  // Check cache first
  const cachedContent = contentCache.get(bytes32ContentId);
  if (cachedContent && Date.now() - cachedContent.lastChecked < serviceConfig.cacheDuration) {
    return cachedContent;
  }
  
  try {
    const [creator, price, isPremium, royaltyPercent, contentHash] = 
      await contract.getContentDetails(bytes32ContentId);
    
    const contentDetails = {
      contentId: bytes32ContentId,
      creator,
      price,
      isPremium,
      royaltyPercent: royaltyPercent.toNumber(),
      contentHash,
      lastChecked: Date.now()
    };
    
    // Update cache
    contentCache.set(bytes32ContentId, contentDetails);
    
    return contentDetails;
  } catch (error) {
    console.error(`Error getting content details for ${contentId}:`, error);
    throw error;
  }
}

/**
 * Grant free access to a user (creator only)
 * @param {string} contentId Content identifier
 * @param {string} userAddress User address
 * @param {number} duration Access duration in seconds (0 for permanent)
 * @returns {Promise<Object>} Grant result
 */
export async function grantAccess(contentId, userAddress, duration = 0) {
  if (!initialized) {
    await initialize();
  }
  
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet must be connected to grant access');
  }
  
  try {
    // Convert contentId to bytes32 if needed
    let bytes32ContentId = contentId;
    if (!contentId.startsWith('0x') || contentId.length !== 66) {
      bytes32ContentId = ethers.utils.id(contentId);
    }
    
    // Get signer for transaction
    const signer = await BlockchainService.getSigner();
    const contractWithSigner = contract.connect(signer);
    
    // Send transaction
    const tx = await contractWithSigner.grantAccess(bytes32ContentId, userAddress, duration);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    // Update access cache
    const cacheKey = `${bytes32ContentId}-${userAddress.toLowerCase()}`;
    
    userAccessCache.set(cacheKey, {
      hasAccess: true,
      expirationTime: duration > 0 ? Math.floor(Date.now() / 1000) + duration : 0,
      lastChecked: Date.now()
    });
    
    return {
      success: true,
      message: 'Access granted successfully',
      transactionHash: receipt.transactionHash,
      contentId: bytes32ContentId,
      userAddress,
      expirationTime: duration > 0 ? Math.floor(Date.now() / 1000) + duration : 0
    };
  } catch (error) {
    console.error('Error granting access:', error);
    throw error;
  }
}

/**
 * Update content price (creator only)
 * @param {string} contentId Content identifier
 * @param {string|number} newPrice New price in ETH or wei
 * @returns {Promise<Object>} Update result
 */
export async function updateContentPrice(contentId, newPrice) {
  if (!initialized) {
    await initialize();
  }
  
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet must be connected to update content price');
  }
  
  try {
    // Convert contentId to bytes32 if needed
    let bytes32ContentId = contentId;
    if (!contentId.startsWith('0x') || contentId.length !== 66) {
      bytes32ContentId = ethers.utils.id(contentId);
    }
    
    // Convert price to Wei if needed
    const priceInWei = typeof newPrice === 'string' ? 
      ethers.utils.parseEther(newPrice) : 
      ethers.BigNumber.from(newPrice);
    
    // Get signer for transaction
    const signer = await BlockchainService.getSigner();
    const contractWithSigner = contract.connect(signer);
    
    // Send transaction
    const tx = await contractWithSigner.updateContentPrice(bytes32ContentId, priceInWei);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    // Clear cache for this content
    contentCache.delete(bytes32ContentId);
    
    return {
      success: true,
      message: 'Content price updated successfully',
      transactionHash: receipt.transactionHash,
      contentId: bytes32ContentId,
      newPrice: priceInWei
    };
  } catch (error) {
    console.error('Error updating content price:', error);
    throw error;
  }
}

/**
 * Clean up service (remove event listeners)
 */
export function cleanup() {
  if (contract) {
    // Remove all event listeners
    for (const { filter, handler } of activeListeners) {
      contract.off(filter, handler);
    }
  }
}

export default {
  initialize,
  registerContent,
  purchaseAccess,
  checkAccess,
  getContentDetails,
  grantAccess,
  updateContentPrice,
  cleanup
};
