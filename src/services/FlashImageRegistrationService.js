/**
 * Flash Image Registration Service
 * 
 * Provides instant image registration, verification, and management
 * with blockchain-backed authenticity for the Web3 Crypto Streaming platform.
 */

import * as BlockchainService from './BlockchainService';
import * as RiceSecurityService from './RiceAdvancedNetworkSecurityService';
import * as IPFSService from './StorageService';

// Image registration status
export const REGISTRATION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  REGISTERED: 'registered',
  FAILED: 'failed',
  REVOKED: 'revoked'
};

// License types
export const LICENSE_TYPES = {
  PUBLIC_DOMAIN: 'public_domain',
  ATTRIBUTION: 'attribution',
  ATTRIBUTION_SHARE_ALIKE: 'attribution_share_alike',
  ATTRIBUTION_NO_DERIVATIVES: 'attribution_no_derivatives',
  ATTRIBUTION_NON_COMMERCIAL: 'attribution_non_commercial',
  COPYRIGHT_ALL_RIGHTS: 'copyright_all_rights',
  CUSTOM: 'custom'
};

// Image categories
export const IMAGE_CATEGORIES = {
  ART: 'art',
  PHOTOGRAPHY: 'photography',
  ILLUSTRATION: 'illustration',
  DESIGN: 'design',
  MEME: 'meme',
  AVATAR: 'avatar',
  OTHER: 'other'
};

// Service state
let initialized = false;
const registeredImages = new Map();
const userImages = new Map();
const verificationRecords = new Map();
let pendingRegistrations = [];
let settings = {
  ipfsEnabled: true,
  instantVerification: true,
  defaultLicense: LICENSE_TYPES.ATTRIBUTION,
  batchProcessingLimit: 10,
  compressionLevel: 'medium',
  includeMetadata: true,
  autoSubmitToBlockchain: true
};

/**
 * Initialize the Flash Image Registration service
 * @param {Object} options Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initFlashImageRegistration(options = {}) {
  if (initialized) {
    return true;
  }
  
  try {
    console.log('Initializing Flash Image Registration Service...');
    
    // Initialize the RICE security service if not already initialized
    if (!RiceSecurityService.getSecurityMetrics()) {
      await RiceSecurityService.initSecurityService();
    }
    
    // Apply configuration options
    if (options.settings) {
      settings = {
        ...settings,
        ...options.settings
      };
    }
    
    // Process any remaining items in the queue
    processPendingRegistrations();
    
    initialized = true;
    console.log('Flash Image Registration Service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Flash Image Registration:', error);
    return false;
  }
}

/**
 * Register an image
 * @param {File|Blob|String} imageData Image data (File, Blob or base64 string)
 * @param {Object} metadata Image metadata
 * @returns {Promise<Object>} Registration result
 */
export async function registerImage(imageData, metadata = {}) {
  if (!initialized) {
    await initFlashImageRegistration();
  }
  
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet must be connected to register images');
  }
  
  const userAddress = BlockchainService.getCurrentAccount();
  
  try {
    // Generate registration ID
    const registrationId = `imreg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Process metadata
    const processedMetadata = {
      title: metadata.title || 'Untitled Image',
      description: metadata.description || '',
      category: metadata.category || IMAGE_CATEGORIES.OTHER,
      license: metadata.license || settings.defaultLicense,
      tags: metadata.tags || [],
      creationDate: metadata.creationDate || new Date().toISOString(),
      owner: userAddress,
      ownerName: metadata.ownerName || `User-${userAddress.substring(0, 8)}`,
      customFields: metadata.customFields || {}
    };
    
    // Generate image hash
    const imageHash = await generateImageHash(imageData);
    
    // Create registration object
    const registration = {
      id: registrationId,
      owner: userAddress,
      imageHash,
      metadata: processedMetadata,
      status: REGISTRATION_STATUS.PENDING,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      transactionHash: null,
      ipfsHash: null,
      verificationCount: 0,
      usageCount: 0
    };
    
    // Store in memory
    registeredImages.set(registrationId, registration);
    
    // Add to user's images
    let userImageList = userImages.get(userAddress) || [];
    userImageList.push(registrationId);
    userImages.set(userAddress, userImageList);
    
    // Add to pending registrations queue
    pendingRegistrations.push({
      id: registrationId,
      imageData,
      registration
    });
    
    // Process immediately if auto-submit is enabled
    if (settings.autoSubmitToBlockchain) {
      processPendingRegistrations();
    }
    
    return {
      success: true,
      message: 'Image queued for registration',
      registrationId,
      registration: { ...registration }
    };
  } catch (error) {
    console.error('Error registering image:', error);
    throw error;
  }
}

/**
 * Process pending image registrations
 * @returns {Promise<boolean>} Success status
 */
async function processPendingRegistrations() {
  if (pendingRegistrations.length === 0) {
    return true;
  }
  
  // Process only up to the batch limit
  const batch = pendingRegistrations.slice(0, settings.batchProcessingLimit);
  pendingRegistrations = pendingRegistrations.slice(settings.batchProcessingLimit);
  
  for (const item of batch) {
    try {
      // Update status to processing
      item.registration.status = REGISTRATION_STATUS.PROCESSING;
      registeredImages.set(item.id, { ...item.registration });
      
      // Upload to IPFS if enabled
      if (settings.ipfsEnabled) {
        const ipfsHash = await uploadToIPFS(item.imageData, item.registration.metadata);
        item.registration.ipfsHash = ipfsHash;
      }
      
      // Create blockchain transaction
      const transactionHash = await createBlockchainRegistration(
        item.registration.imageHash, 
        item.registration.metadata,
        item.registration.ipfsHash
      );
      
      // Update registration with success
      item.registration.status = REGISTRATION_STATUS.REGISTERED;
      item.registration.transactionHash = transactionHash;
      item.registration.updatedAt = Date.now();
      
      registeredImages.set(item.id, { ...item.registration });
      
    } catch (error) {
      console.error(`Error processing registration ${item.id}:`, error);
      
      // Update registration with failure
      item.registration.status = REGISTRATION_STATUS.FAILED;
      item.registration.errorMessage = error.message;
      item.registration.updatedAt = Date.now();
      
      registeredImages.set(item.id, { ...item.registration });
    }
  }
  
  return true;
}

/**
 * Generate a hash for an image
 * @param {File|Blob|String} imageData Image data
 * @returns {Promise<string>} Image hash
 */
async function generateImageHash(imageData) {
  // In a real implementation, this would use a proper hashing algorithm
  // For this example, we'll simulate the hash generation
  
  let hash;
  
  if (typeof imageData === 'string') {
    // Assume it's a base64 string
    hash = await simulateHashGeneration(imageData.substring(0, 1000));
  } else if (imageData instanceof Blob || imageData instanceof File) {
    // For File or Blob objects
    const arrayBuffer = await imageData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer.slice(0, 1000));
    hash = await simulateHashGeneration(bytes);
  } else {
    throw new Error('Unsupported image data format');
  }
  
  return `imreg${hash}`;
}

/**
 * Upload image to IPFS
 * @param {File|Blob|String} imageData Image data
 * @param {Object} metadata Image metadata
 * @returns {Promise<string>} IPFS hash
 */
async function uploadToIPFS(imageData, metadata) {
  try {
    // In a real implementation, this would use an actual IPFS service
    // For this example, we'll simulate the upload
    
    // Wait some time to simulate upload
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate a fake IPFS hash
    const fakeIpfsHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    
    return fakeIpfsHash;
  } catch (error) {
    console.error('IPFS upload failed:', error);
    throw new Error('Failed to upload image to IPFS');
  }
}

/**
 * Create blockchain registration for an image
 * @param {string} imageHash Image hash
 * @param {Object} metadata Image metadata
 * @param {string} ipfsHash IPFS hash (optional)
 * @returns {Promise<string>} Transaction hash
 */
async function createBlockchainRegistration(imageHash, metadata, ipfsHash) {
  try {
    // In a real implementation, this would interact with a blockchain
    // contract to register the image. For this example, we'll simulate it.
    
    // Security check
    await RiceSecurityService.assessTransactionSafety({
      type: 'contract_interaction',
      destination: '0xImageRegistryContract',
      data: 'registerImage()'
    });
    
    // Wait some time to simulate blockchain transaction
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a fake transaction hash
    const fakeTransactionHash = `0x${Math.random().toString(16).substring(2, 62)}`;
    
    return fakeTransactionHash;
  } catch (error) {
    console.error('Blockchain registration failed:', error);
    throw new Error('Failed to register image on blockchain');
  }
}

/**
 * Get a registered image by ID
 * @param {string} registrationId Registration ID
 * @returns {Promise<Object|null>} Registration data or null if not found
 */
export async function getRegisteredImage(registrationId) {
  if (!initialized) {
    await initFlashImageRegistration();
  }
  
  const registration = registeredImages.get(registrationId);
  return registration ? { ...registration } : null;
}

/**
 * Get all registered images for a user
 * @param {string} userAddress User's wallet address (optional, uses connected wallet if not provided)
 * @returns {Promise<Array>} User's registered images
 */
export async function getUserImages(userAddress) {
  if (!initialized) {
    await initFlashImageRegistration();
  }
  
  const address = userAddress || 
    (BlockchainService.isConnected() ? BlockchainService.getCurrentAccount() : null);
  
  if (!address) {
    return [];
  }
  
  const userImageList = userImages.get(address) || [];
  
  // Get full registration objects for each ID
  return userImageList.map(id => {
    const registration = registeredImages.get(id);
    return registration ? { ...registration } : null;
  }).filter(Boolean);
}

/**
 * Verify an image
 * @param {File|Blob|String} imageData Image data to verify
 * @returns {Promise<Object>} Verification result
 */
export async function verifyImage(imageData) {
  if (!initialized) {
    await initFlashImageRegistration();
  }
  
  try {
    // Generate hash for the image
    const imageHash = await generateImageHash(imageData);
    
    // Find all registrations with matching hash
    const matches = Array.from(registeredImages.values())
      .filter(reg => reg.imageHash === imageHash)
      .map(reg => ({
        registrationId: reg.id,
        owner: reg.owner,
        ownerName: reg.metadata.ownerName,
        registeredAt: reg.createdAt,
        status: reg.status,
        license: reg.metadata.license,
        title: reg.metadata.title
      }));
    
    // Create verification record
    const verificationId = `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const verification = {
      id: verificationId,
      imageHash,
      timestamp: Date.now(),
      matches: matches.length,
      matchingRegistrations: matches
    };
    
    // Store verification record
    verificationRecords.set(verificationId, verification);
    
    // Update verification count for matching registrations
    matches.forEach(match => {
      const registration = registeredImages.get(match.registrationId);
      if (registration) {
        registration.verificationCount++;
        registeredImages.set(match.registrationId, registration);
      }
    });
    
    return {
      success: true,
      verification: { ...verification },
      authenticated: matches.length > 0,
      matches: matches.length
    };
  } catch (error) {
    console.error('Error verifying image:', error);
    throw error;
  }
}

/**
 * Update image metadata
 * @param {string} registrationId Registration ID
 * @param {Object} metadata New metadata (partial update)
 * @returns {Promise<Object>} Updated registration
 */
export async function updateImageMetadata(registrationId, metadata = {}) {
  if (!initialized) {
    await initFlashImageRegistration();
  }
  
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet must be connected to update image metadata');
  }
  
  const registration = registeredImages.get(registrationId);
  if (!registration) {
    throw new Error(`Registration not found: ${registrationId}`);
  }
  
  const userAddress = BlockchainService.getCurrentAccount();
  if (registration.owner.toLowerCase() !== userAddress.toLowerCase()) {
    throw new Error('Only the owner can update image metadata');
  }
  
  try {
    // Update allowed metadata fields
    const updatedMetadata = {
      ...registration.metadata,
      title: metadata.title ?? registration.metadata.title,
      description: metadata.description ?? registration.metadata.description,
      category: metadata.category ?? registration.metadata.category,
      tags: metadata.tags ?? registration.metadata.tags,
      license: metadata.license ?? registration.metadata.license,
      customFields: {
        ...registration.metadata.customFields,
        ...metadata.customFields
      }
    };
    
    // Update registration
    registration.metadata = updatedMetadata;
    registration.updatedAt = Date.now();
    
    // Store updated registration
    registeredImages.set(registrationId, registration);
    
    // In a real implementation, we would update the blockchain record too
    
    return {
      success: true,
      message: 'Metadata updated successfully',
      registration: { ...registration }
    };
  } catch (error) {
    console.error(`Error updating metadata for ${registrationId}:`, error);
    throw error;
  }
}

/**
 * Revoke image registration
 * @param {string} registrationId Registration ID
 * @returns {Promise<Object>} Revocation result
 */
export async function revokeRegistration(registrationId) {
  if (!initialized) {
    await initFlashImageRegistration();
  }
  
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet must be connected to revoke registration');
  }
  
  const registration = registeredImages.get(registrationId);
  if (!registration) {
    throw new Error(`Registration not found: ${registrationId}`);
  }
  
  const userAddress = BlockchainService.getCurrentAccount();
  if (registration.owner.toLowerCase() !== userAddress.toLowerCase()) {
    throw new Error('Only the owner can revoke registration');
  }
  
  try {
    // Update status
    registration.status = REGISTRATION_STATUS.REVOKED;
    registration.updatedAt = Date.now();
    
    // Store updated registration
    registeredImages.set(registrationId, registration);
    
    // In a real implementation, we would update the blockchain record too
    
    return {
      success: true,
      message: 'Registration revoked successfully',
      registration: { ...registration }
    };
  } catch (error) {
    console.error(`Error revoking registration ${registrationId}:`, error);
    throw error;
  }
}

/**
 * Report image registration usage
 * @param {string} registrationId Registration ID
 * @param {Object} usageData Usage data
 * @returns {Promise<Object>} Usage report result
 */
export async function reportUsage(registrationId, usageData = {}) {
  if (!initialized) {
    await initFlashImageRegistration();
  }
  
  const registration = registeredImages.get(registrationId);
  if (!registration) {
    throw new Error(`Registration not found: ${registrationId}`);
  }
  
  try {
    // Update usage count
    registration.usageCount++;
    
    // In a real implementation, we would store detailed usage data
    
    // Store updated registration
    registeredImages.set(registrationId, registration);
    
    return {
      success: true,
      message: 'Usage reported successfully',
      usageCount: registration.usageCount
    };
  } catch (error) {
    console.error(`Error reporting usage for ${registrationId}:`, error);
    throw error;
  }
}

/**
 * Get registration stats
 * @returns {Object} Registration statistics
 */
export function getRegistrationStats() {
  const totalRegistrations = registeredImages.size;
  const pendingCount = Array.from(registeredImages.values()).filter(r => r.status === REGISTRATION_STATUS.PENDING).length;
  const processingCount = Array.from(registeredImages.values()).filter(r => r.status === REGISTRATION_STATUS.PROCESSING).length;
  const registeredCount = Array.from(registeredImages.values()).filter(r => r.status === REGISTRATION_STATUS.REGISTERED).length;
  const failedCount = Array.from(registeredImages.values()).filter(r => r.status === REGISTRATION_STATUS.FAILED).length;
  const revokedCount = Array.from(registeredImages.values()).filter(r => r.status === REGISTRATION_STATUS.REVOKED).length;
  
  const categoryStats = {};
  Object.values(IMAGE_CATEGORIES).forEach(category => {
    categoryStats[category] = Array.from(registeredImages.values()).filter(r => r.metadata.category === category).length;
  });
  
  return {
    totalRegistrations,
    pendingCount,
    processingCount,
    registeredCount,
    failedCount,
    revokedCount,
    categoryStats,
    pendingQueue: pendingRegistrations.length,
    verificationCount: verificationRecords.size
  };
}

/**
 * Update service settings
 * @param {Object} newSettings New settings (partial update)
 * @returns {Object} Updated settings
 */
export function updateSettings(newSettings = {}) {
  settings = {
    ...settings,
    ...newSettings
  };
  
  return { ...settings };
}

/**
 * Get current service settings
 * @returns {Object} Current settings
 */
export function getSettings() {
  return { ...settings };
}

/**
 * Simulate hash generation
 * @param {*} data Data to hash
 * @returns {Promise<string>} Generated hash
 */
async function simulateHashGeneration(data) {
  // In a real implementation, this would use a proper hashing algorithm
  // For simulation, we'll create a fixed-length pseudo-random string
  let str = '';
  if (typeof data === 'string') {
    str = data;
  } else if (data instanceof Uint8Array) {
    str = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    str = JSON.stringify(data);
  }
  
  // Create a simple hash value (this is NOT secure, just for simulation)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to hex string and pad
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  
  return hexHash;
}

export default {
  initFlashImageRegistration,
  registerImage,
  getRegisteredImage,
  getUserImages,
  verifyImage,
  updateImageMetadata,
  revokeRegistration,
  reportUsage,
  getRegistrationStats,
  updateSettings,
  getSettings,
  REGISTRATION_STATUS,
  LICENSE_TYPES,
  IMAGE_CATEGORIES
};
