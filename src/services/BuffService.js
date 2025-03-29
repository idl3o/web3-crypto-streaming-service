/**
 * Enhanced Buff Service
 * 
 * A refactored service that manages special capability buffs that can be applied 
 * to user accounts, providing enhanced features, abilities, or status.
 */

import { ethers } from 'ethers';
import * as CertificateService from './CertificateService';

// Buff types
export const BUFF_TYPES = {
  SUNIHAMISH: 'sunihamish',    // The legendary Sunihamish buff of prosperity
  TRANSCENDENT: 'transcendent', // Transcendent streaming capabilities
  AMPLIFY: 'amplify',          // Content amplification
  INSIGHT: 'insight',          // Enhanced analytics and insights
  ESSENCE: 'essence',          // Essence extraction capabilities
  CUSTOM: 'custom'             // Custom buff type
};

// Buff status
export const BUFF_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CONSUMED: 'consumed',
  SUSPENDED: 'suspended'
};

// Buff tiers
export const BUFF_TIERS = {
  COMMON: 'common',      // Basic buff
  UNCOMMON: 'uncommon',  // Better than basic
  RARE: 'rare',          // Significant buff
  EPIC: 'epic',          // Major buff
  LEGENDARY: 'legendary' // Top-tier buff
};

/**
 * BuffManager - Core class for managing buff state and operations
 */
class BuffManager {
  constructor() {
    this.userBuffsCache = new Map();
    this.metadataCache = new Map();
    this.listeners = [];
  }
  
  /**
   * Clear the buff cache for testing or after major state changes
   * 
   * @param {string} userAddress Optional user address to clear specific cache
   */
  clearCache(userAddress = null) {
    if (userAddress) {
      this.userBuffsCache.delete(userAddress);
    } else {
      this.userBuffsCache.clear();
    }
  }
  
  /**
   * Add an event listener for buff events
   * 
   * @param {string} eventType The event type to listen for
   * @param {Function} callback The callback to execute
   * @returns {Function} Function to remove this listener
   */
  addEventListener(eventType, callback) {
    const listener = { eventType, callback };
    this.listeners.push(listener);
    
    // Return function to remove listener
    return () => {
      const index = this.listeners.findIndex(l => 
        l.eventType === eventType && l.callback === callback
      );
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Notify listeners of a buff event
   * 
   * @param {string} eventType The event type
   * @param {Object} data Event data
   */
  notifyListeners(eventType, data) {
    // Dispatch to specific listeners
    this.listeners
      .filter(listener => listener.eventType === eventType)
      .forEach(listener => listener.callback(data));
    
    // Also dispatch to all listeners
    this.listeners
      .filter(listener => listener.eventType === 'all')
      .forEach(listener => listener.callback({ type: eventType, data }));
    
    // Dispatch browser event for compatibility with existing code
    window.dispatchEvent(new CustomEvent(`buff-${eventType}`, {
      detail: data
    }));
  }
  
  /**
   * Cache user buffs and notify listeners
   * 
   * @param {string} userAddress User address
   * @param {Array} buffs Buff array
   */
  cacheUserBuffs(userAddress, buffs) {
    this.userBuffsCache.set(userAddress, [...buffs]);
    this.notifyListeners('cache-updated', { userAddress, count: buffs.length });
  }
}

// Singleton instance
const buffManager = new BuffManager();

/**
 * Check if a user has a specific buff
 * 
 * @param {string} userAddress User wallet address
 * @param {string} buffType Type of buff to check for
 * @param {Object} options Query options
 * @returns {Promise<boolean>} Whether user has the buff
 */
export async function hasActiveBuff(userAddress, buffType, options = {}) {
  if (!userAddress || !buffType) return false;

  try {
    const userBuffs = await getUserBuffs(userAddress);
    const matchingBuffs = userBuffs.filter(buff => 
      buff.type === buffType && 
      buff.status === BUFF_STATUS.ACTIVE &&
      (!options.minTier || isBuffTierSufficientOrHigher(buff.tier, options.minTier))
    );
    
    return matchingBuffs.length > 0;
  } catch (error) {
    console.error(`Error checking if user has buff ${buffType}:`, error);
    return false;
  }
}

/**
 * Get all buffs for a user
 * 
 * @param {string} userAddress User wallet address
 * @param {Object} options Filter options
 * @returns {Promise<Array>} User's buffs
 */
export async function getUserBuffs(userAddress, options = {}) {
  if (!userAddress) {
    throw new Error("User address is required to fetch buffs");
  }
  
  try {
    // Check cache first for quick retrieval
    if (buffManager.userBuffsCache.has(userAddress) && !options.skipCache) {
      return buffManager.userBuffsCache.get(userAddress).filter(buff => 
        filterBuff(buff, options)
      );
    }
    
    // In a production implementation, we would query buffs from 
    // blockchain or backend. For this demo, we'll use localStorage
    // and check user certificates that grant buffs
    const certificates = await CertificateService.getUserCertificates(userAddress);
    
    // Extract buffs from certificates
    const buffs = extractBuffsFromCertificates(certificates);
    
    // Check for special Sunihamish buff in localStorage
    const sunihamishBuff = await loadSunihamishBuff(userAddress);
    if (sunihamishBuff) {
      // Add the special Sunihamish buff to the list if not already present
      if (!buffs.some(b => b.id === sunihamishBuff.id)) {
        buffs.push(sunihamishBuff);
      }
    }
    
    // Update cache
    buffManager.cacheUserBuffs(userAddress, buffs);
    
    // Return filtered results
    return buffs.filter(buff => filterBuff(buff, options));
  } catch (error) {
    console.error(`Error fetching buffs for ${userAddress}:`, error);
    throw error;
  }
}

/**
 * Extract buffs from certificates
 * 
 * @param {Array} certificates User certificates
 * @returns {Array} Array of buffs
 */
function extractBuffsFromCertificates(certificates) {
  const buffs = [];
  
  for (const cert of certificates) {
    // Check if certificate grants any buffs
    if (cert.metadata && cert.metadata.grantsBuff) {
      const buffData = cert.metadata.buffData || {};
      
      // Create buff from certificate
      const buff = {
        id: `buff-${ethers.utils.id(cert.id).slice(0, 10)}`,
        type: buffData.type || BUFF_TYPES.CUSTOM,
        name: buffData.name || `${cert.type} Buff`,
        description: buffData.description || `Buff granted by ${cert.type} certificate`,
        tier: buffData.tier || BUFF_TIERS.COMMON,
        status: cert.status === CertificateService.CERTIFICATE_STATUS.ACTIVE ? 
               BUFF_STATUS.ACTIVE : BUFF_STATUS.EXPIRED,
        expiresAt: cert.expiresAt,
        grantedBy: cert.id,
        grantedAt: cert.issuedAt,
        effects: buffData.effects || {},
        metadata: buffData.metadata || {}
      };
      
      buffs.push(buff);
    }
  }
  
  return buffs;
}

/**
 * Load Sunihamish buff from storage
 * 
 * @param {string} userAddress User address
 * @returns {Object|null} Sunihamish buff or null
 */
async function loadSunihamishBuff(userAddress) {
  const sunihamishBuffData = localStorage.getItem(`sunihamish_buff_${userAddress}`);
  if (!sunihamishBuffData) return null;
  
  try {
    const buff = JSON.parse(sunihamishBuffData);
    
    // Check if buff should be expired
    if (buff.expiresAt && new Date(buff.expiresAt) < new Date()) {
      if (buff.status === BUFF_STATUS.ACTIVE) {
        buff.status = BUFF_STATUS.EXPIRED;
        // Update storage with expired status
        localStorage.setItem(`sunihamish_buff_${userAddress}`, JSON.stringify(buff));
      }
    }
    
    return buff;
  } catch (parseError) {
    console.error('Error parsing Sunihamish buff data:', parseError);
    return null;
  }
}

/**
 * Grant a Sunihamish buff to a user
 * 
 * @param {string} userAddress User wallet address to receive the buff
 * @param {string} tier Buff tier
 * @param {Object} options Buff options
 * @returns {Promise<Object>} Grant result
 */
export async function grantSunihamishBuff(userAddress, tier = BUFF_TIERS.LEGENDARY, options = {}) {
  try {
    if (!userAddress) {
      throw new Error('User address is required to grant buff');
    }
    
    // Validate tier
    if (!Object.values(BUFF_TIERS).includes(tier)) {
      throw new Error(`Invalid buff tier: ${tier}`);
    }
    
    // Create a unique buff ID
    const buffId = `sunihamish-${Date.now()}-${ethers.utils.id(userAddress).slice(0, 6)}`;
    
    // Create the Sunihamish buff
    const buff = {
      id: buffId,
      type: BUFF_TYPES.SUNIHAMISH,
      name: options.name || 'Sunihamish Buff',
      description: options.description || 
        'The legendary Sunihamish buff of prosperity and enlightenment',
      tier: tier || BUFF_TIERS.LEGENDARY,
      status: BUFF_STATUS.ACTIVE,
      grantedAt: new Date().toISOString(),
      expiresAt: options.duration ? 
        new Date(Date.now() + options.duration).toISOString() : null,
      effects: options.effects || {
        streamBoost: 2.5,
        insightAccess: true,
        creationBonus: true,
        specialTranscendence: true
      },
      metadata: {
        iconUrl: options.iconUrl || '/assets/buffs/sunihamish.png',
        color: options.color || '#FFD700',
        glowEffect: true,
        animationLevel: 'high',
        customData: options.customData || {}
      }
    };
    
    // Save to localStorage
    localStorage.setItem(`sunihamish_buff_${userAddress}`, JSON.stringify(buff));
    
    // Invalidate cache
    buffManager.clearCache(userAddress);
    
    // Notify about the new buff
    buffManager.notifyListeners('granted', {
      userAddress,
      buff
    });
    
    return {
      success: true,
      buff
    };
  } catch (error) {
    console.error('Error granting Sunihamish buff:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Consume a buff (use it up for a one-time effect)
 * 
 * @param {string} userAddress User wallet address
 * @param {string} buffId ID of buff to consume
 * @param {Object} options Consumption options
 * @returns {Promise<Object>} Consumption result
 */
export async function consumeBuff(userAddress, buffId, options = {}) {
  if (!userAddress) {
    throw new Error("User address is required to consume a buff");
  }
  
  if (!buffId) {
    throw new Error("Buff ID is required to consume a buff");
  }
  
  try {
    // Get user buffs
    const userBuffs = await getUserBuffs(userAddress, { skipCache: true });
    
    // Find the specified buff
    const buffIndex = userBuffs.findIndex(buff => buff.id === buffId);
    if (buffIndex === -1) {
      return {
        success: false,
        error: 'Buff not found'
      };
    }
    
    const buff = userBuffs[buffIndex];
    
    // Check if buff can be consumed
    if (buff.status !== BUFF_STATUS.ACTIVE) {
      return {
        success: false,
        error: `Buff cannot be consumed in ${buff.status} state`
      };
    }
    
    // Special buffs like Sunihamish might not be consumable
    if (buff.type === BUFF_TYPES.SUNIHAMISH && !options.forceConsume) {
      return {
        success: false,
        error: 'Sunihamish buff cannot be consumed'
      };
    }
    
    // Update buff status to consumed
    buff.status = BUFF_STATUS.CONSUMED;
    buff.consumedAt = new Date().toISOString();
    
    // Store updated buff
    if (buff.type === BUFF_TYPES.SUNIHAMISH) {
      localStorage.setItem(`sunihamish_buff_${userAddress}`, JSON.stringify(buff));
    }
    
    // Clear cache
    buffManager.clearCache(userAddress);
    
    // Notify about consumption
    buffManager.notifyListeners('consumed', {
      userAddress,
      buffId,
      buff
    });
    
    return {
      success: true,
      buff,
      effects: buff.effects
    };
  } catch (error) {
    console.error(`Error consuming buff ${buffId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Expire or deactivate a buff
 * 
 * @param {string} userAddress User wallet address
 * @param {string} buffId ID of buff to expire
 * @param {Object} options Options
 * @returns {Promise<Object>} Result
 */
export async function expireBuff(userAddress, buffId, options = {}) {
  if (!userAddress || !buffId) {
    throw new Error("User address and buff ID are required");
  }
  
  try {
    // Get user buffs
    const userBuffs = await getUserBuffs(userAddress, { skipCache: true });
    
    // Find the specified buff
    const buffIndex = userBuffs.findIndex(buff => buff.id === buffId);
    if (buffIndex === -1) {
      return {
        success: false,
        error: 'Buff not found'
      };
    }
    
    const buff = userBuffs[buffIndex];
    
    // Can only expire active buffs
    if (buff.status !== BUFF_STATUS.ACTIVE) {
      return {
        success: false,
        error: `Cannot expire buff in ${buff.status} state`
      };
    }
    
    // Update buff status
    buff.status = options.suspend ? BUFF_STATUS.SUSPENDED : BUFF_STATUS.EXPIRED;
    buff.expiresAt = new Date().toISOString(); // Set expiry to now
    
    // Store updated buff for Sunihamish
    if (buff.type === BUFF_TYPES.SUNIHAMISH) {
      localStorage.setItem(`sunihamish_buff_${userAddress}`, JSON.stringify(buff));
    }
    
    // Clear cache
    buffManager.clearCache(userAddress);
    
    // Notify about expiration
    buffManager.notifyListeners('expired', {
      userAddress,
      buffId,
      buff
    });
    
    return {
      success: true,
      buff
    };
  } catch (error) {
    console.error(`Error expiring buff ${buffId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Reactivate an expired or suspended buff
 * 
 * @param {string} userAddress User wallet address
 * @param {string} buffId ID of buff to reactivate
 * @param {Object} options Reactivation options
 * @returns {Promise<Object>} Reactivation result
 */
export async function reactivateBuff(userAddress, buffId, options = {}) {
  if (!userAddress || !buffId) {
    throw new Error("User address and buff ID are required");
  }
  
  try {
    // Get user buffs
    const userBuffs = await getUserBuffs(userAddress, { skipCache: true });
    
    // Find the specified buff
    const buffIndex = userBuffs.findIndex(buff => buff.id === buffId);
    if (buffIndex === -1) {
      return {
        success: false,
        error: 'Buff not found'
      };
    }
    
    const buff = userBuffs[buffIndex];
    
    // Can only reactivate expired or suspended buffs
    if (![BUFF_STATUS.EXPIRED, BUFF_STATUS.SUSPENDED].includes(buff.status)) {
      return {
        success: false,
        error: `Cannot reactivate buff in ${buff.status} state`
      };
    }
    
    // Update buff status
    buff.status = BUFF_STATUS.ACTIVE;
    
    // Set new expiration if provided
    if (options.duration) {
      buff.expiresAt = new Date(Date.now() + options.duration).toISOString();
    } else if (!options.keepExpiry) {
      // Remove expiry if not keeping it
      buff.expiresAt = null;
    }
    
    // Store updated buff for Sunihamish
    if (buff.type === BUFF_TYPES.SUNIHAMISH) {
      localStorage.setItem(`sunihamish_buff_${userAddress}`, JSON.stringify(buff));
    }
    
    // Clear cache
    buffManager.clearCache(userAddress);
    
    // Notify about reactivation
    buffManager.notifyListeners('reactivated', {
      userAddress,
      buffId,
      buff
    });
    
    return {
      success: true,
      buff
    };
  } catch (error) {
    console.error(`Error reactivating buff ${buffId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get metadata for a specific buff type
 * 
 * @param {string} buffType Type of buff
 * @returns {Object} Buff metadata
 */
export function getBuffMetadata(buffType) {
  // Check cache first
  if (buffManager.metadataCache.has(buffType)) {
    return buffManager.metadataCache.get(buffType);
  }
  
  // Define metadata for each buff type
  let metadata;
  
  switch (buffType) {
    case BUFF_TYPES.SUNIHAMISH:
      metadata = {
        name: 'Sunihamish',
        description: 'The legendary Sunihamish buff grants prosperity, insight, and enhanced creative abilities',
        icon: 'fas fa-sun',
        color: '#FFD700', // Gold color
        effects: {
          streamBoost: 'Increases streaming capacity by 2.5x',
          insightAccess: 'Grants access to special insights',
          creationBonus: 'Enhances creative output',
          specialTranscendence: 'Enables transcendent streaming capabilities'
        },
        rarity: 'Very Rare',
        stackable: false,
        tradeable: false,
        origin: 'Granted by the Sunihamish Council'
      };
      break;
      
    case BUFF_TYPES.TRANSCENDENT:
      metadata = {
        name: 'Transcendence',
        description: 'Unlocks transcendent streaming capabilities',
        icon: 'fas fa-bolt',
        color: '#9C27B0', // Purple
        effects: {
          transcendentAccess: true,
          streamQuality: '+30%',
          networkReach: '+25%'
        },
        rarity: 'Rare',
        stackable: false,
        tradeable: true
      };
      break;
      
    case BUFF_TYPES.AMPLIFY:
      metadata = {
        name: 'Amplification',
        description: 'Amplifies content reach and engagement',
        icon: 'fas fa-volume-up',
        color: '#2196F3', // Blue
        effects: {
          reachBoost: '+50%',
          engagementBoost: '+40%',
          algorithmBoost: true
        },
        rarity: 'Uncommon',
        stackable: true,
        tradeable: true
      };
      break;
      
    case BUFF_TYPES.INSIGHT:
      metadata = {
        name: 'Deep Insight',
        description: 'Provides enhanced analytics and audience insights',
        icon: 'fas fa-chart-line',
        color: '#4CAF50', // Green
        effects: {
          advancedAnalytics: true,
          predictionEngine: true,
          audienceUnderstanding: '+75%'
        },
        rarity: 'Rare',
        stackable: false,
        tradeable: true
      };
      break;
      
    case BUFF_TYPES.ESSENCE:
      metadata = {
        name: 'Essence Extraction',
        description: 'Enables extraction of valuable essence from content',
        icon: 'fas fa-vial',
        color: '#FF5722', // Deep Orange
        effects: {
          essenceRate: '+60%',
          purityLevel: 'High',
          transmutation: true
        },
        rarity: 'Epic',
        stackable: false,
        tradeable: false
      };
      break;
      
    case BUFF_TYPES.CUSTOM:
    default:
      metadata = {
        name: 'Custom Buff',
        description: 'A custom capability enhancement',
        icon: 'fas fa-star',
        color: '#9E9E9E', // Gray
        effects: {},
        rarity: 'Varies',
        stackable: false,
        tradeable: false
      };
      break;
  }
  
  // Cache the metadata
  buffManager.metadataCache.set(buffType, metadata);
  
  return metadata;
}

/**
 * Get display data for a buff tier
 * 
 * @param {string} tier Buff tier
 * @returns {Object} Display data for the tier
 */
export function getBuffTierDisplayData(tier) {
  switch (tier) {
    case BUFF_TIERS.COMMON:
      return {
        name: 'Common',
        color: '#9E9E9E', // Gray
        border: '1px solid #9E9E9E',
        icon: 'C'
      };
    case BUFF_TIERS.UNCOMMON:
      return {
        name: 'Uncommon',
        color: '#4CAF50', // Green
        border: '1px solid #4CAF50',
        icon: 'U'
      };
    case BUFF_TIERS.RARE:
      return {
        name: 'Rare',
        color: '#2196F3', // Blue
        border: '1px solid #2196F3',
        icon: 'R'
      };
    case BUFF_TIERS.EPIC:
      return {
        name: 'Epic',
        color: '#9C27B0', // Purple
        border: '1px solid #9C27B0',
        icon: 'E'
      };
    case BUFF_TIERS.LEGENDARY:
      return {
        name: 'Legendary',
        color: '#FFD700', // Gold
        border: '2px solid #FFD700',
        icon: 'L',
        glow: '0 0 10px #FFD700'
      };
    default:
      return {
        name: 'Unknown',
        color: '#757575', // Dark Gray
        border: '1px solid #757575',
        icon: '?'
      };
  }
}

/**
 * Add event listener for buff events
 * 
 * @param {string} eventType Event type to listen for ('granted', 'consumed', 'expired', 'all')
 * @param {Function} callback Callback function
 * @returns {Function} Function to remove listener
 */
export function addBuffEventListener(eventType, callback) {
  return buffManager.addEventListener(eventType, callback);
}

/**
 * Clear the buff cache for testing or after major state changes
 * 
 * @param {string} userAddress Optional user address to clear specific cache
 */
export function clearBuffCache(userAddress = null) {
  buffManager.clearCache(userAddress);
}

/**
 * Create a new custom buff
 * 
 * @param {Object} buffData Buff data
 * @returns {Object} New buff object
 */
export function createCustomBuff(buffData) {
  if (!buffData.name) {
    throw new Error('Buff name is required');
  }
  
  // Generate ID if not provided
  const id = buffData.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  
  return {
    id,
    type: buffData.type || BUFF_TYPES.CUSTOM,
    name: buffData.name,
    description: buffData.description || 'Custom buff',
    tier: buffData.tier || BUFF_TIERS.COMMON,
    status: buffData.status || BUFF_STATUS.ACTIVE,
    grantedAt: buffData.grantedAt || new Date().toISOString(),
    expiresAt: buffData.expiresAt || null,
    effects: buffData.effects || {},
    metadata: buffData.metadata || {}
  };
}

/**
 * Calculate the effective power level of a buff
 * 
 * @param {Object} buff The buff to evaluate
 * @returns {number} Power level value
 */
export function calculateBuffPowerLevel(buff) {
  if (!buff) return 0;
  
  // Base power from tier
  const tierPower = {
    [BUFF_TIERS.COMMON]: 1,
    [BUFF_TIERS.UNCOMMON]: 2,
    [BUFF_TIERS.RARE]: 3,
    [BUFF_TIERS.EPIC]: 4,
    [BUFF_TIERS.LEGENDARY]: 5
  };
  
  let power = tierPower[buff.tier] || 1;
  
  // Add power from effects
  if (buff.effects) {
    const effectCount = Object.keys(buff.effects).length;
    power += Math.min(effectCount * 0.5, 2); // Max +2 from effects
    
    // Add power from numeric effects
    Object.values(buff.effects).forEach(effect => {
      if (typeof effect === 'number') {
        power += Math.min(effect / 100, 1); // Max +1 from each numeric effect
      }
    });
  }
  
  // Special buff types get bonuses
  if (buff.type === BUFF_TYPES.SUNIHAMISH) {
    power *= 1.5; // 50% bonus for Sunihamish
  }
  
  return parseFloat(power.toFixed(1));
}

// Helper Functions

/**
 * Filter a buff based on options
 * 
 * @param {Object} buff The buff to filter
 * @param {Object} options Filter options
 * @returns {boolean} Whether the buff passes the filter
 */
function filterBuff(buff, options = {}) {
  // Filter by type
  if (options.type && buff.type !== options.type) {
    return false;
  }
  
  // Filter by status
  if (options.status && buff.status !== options.status) {
    return false;
  }
  
  // Filter by tier
  if (options.tier && buff.tier !== options.tier) {
    return false;
  }
  
  // Filter by minimum tier
  if (options.minTier && !isBuffTierSufficientOrHigher(buff.tier, options.minTier)) {
    return false;
  }
  
  // Filter by active only
  if (options.activeOnly && buff.status !== BUFF_STATUS.ACTIVE) {
    return false;
  }
  
  // Filter by name/description search
  if (options.search && typeof options.search === 'string') {
    const searchLower = options.search.toLowerCase();
    const nameMatch = buff.name && buff.name.toLowerCase().includes(searchLower);
    const descMatch = buff.description && buff.description.toLowerCase().includes(searchLower);
    
    if (!nameMatch && !descMatch) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if a buff tier is equal to or higher than a minimum tier
 * 
 * @param {string} buffTier The buff tier to check
 * @param {string} minTier The minimum tier required
 * @returns {boolean} Whether the buff tier is sufficient
 */
function isBuffTierSufficientOrHigher(buffTier, minTier) {
  const tierRanking = {
    [BUFF_TIERS.COMMON]: 1,
    [BUFF_TIERS.UNCOMMON]: 2,
    [BUFF_TIERS.RARE]: 3,
    [BUFF_TIERS.EPIC]: 4,
    [BUFF_TIERS.LEGENDARY]: 5
  };
  
  const buffRank = tierRanking[buffTier] || 0;
  const minRank = tierRanking[minTier] || 0;
  
  return buffRank >= minRank;
}

/**
 * Format buff effect for display
 * 
 * @param {string} key Effect key
 * @param {any} value Effect value
 * @returns {string} Formatted effect
 */
export function formatBuffEffect(key, value) {
  if (typeof value === 'boolean') {
    return value ? 'Enabled' : 'Disabled';
  }
  
  if (typeof value === 'number') {
    if (/boost|rate|increase|bonus/i.test(key)) {
      return `+${value * 100}%`;
    }
    return value.toString();
  }
  
  return String(value);
}

export default {
  hasActiveBuff,
  getUserBuffs,
  grantSunihamishBuff,
  consumeBuff,
  expireBuff,
  reactivateBuff,
  getBuffMetadata,
  getBuffTierDisplayData,
  clearBuffCache,
  addBuffEventListener,
  createCustomBuff,
  calculateBuffPowerLevel,
  formatBuffEffect,
  BUFF_TYPES,
  BUFF_STATUS,
  BUFF_TIERS
};
