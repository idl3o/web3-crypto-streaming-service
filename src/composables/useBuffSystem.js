/**
 * Buff System Composable
 * 
 * A Vue composable to easily integrate buff management into components.
 */

import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import * as BuffService from '@/services/BuffService';

/**
 * useBuffSystem composable
 * 
 * @param {Object} options Configuration options
 * @returns {Object} Buff management functions and state
 */
export default function useBuffSystem(options = {}) {
  const {
    userAddress = null,
    autoload = true,
    filterOptions = { activeOnly: false },
    includeCalculatedPower = true
  } = options;
  
  // State
  const loading = ref(false);
  const error = ref(null);
  const buffs = ref([]);
  const selectedBuff = ref(null);
  const userAddressRef = ref(userAddress);
  
  // Event listeners cleanup
  let buffEventCleanup = null;
  
  // Computed properties
  const activeBuffs = computed(() => 
    buffs.value.filter(buff => buff.status === BuffService.BUFF_STATUS.ACTIVE)
  );
  
  const expiredBuffs = computed(() => 
    buffs.value.filter(buff => buff.status === BuffService.BUFF_STATUS.EXPIRED)
  );
  
  const consumedBuffs = computed(() => 
    buffs.value.filter(buff => buff.status === BuffService.BUFF_STATUS.CONSUMED)
  );
  
  const buffsByType = computed(() => {
    const result = {};
    
    for (const type of Object.values(BuffService.BUFF_TYPES)) {
      result[type] = buffs.value.filter(buff => buff.type === type);
    }
    
    return result;
  });
  
  // Check if user has a specific buff
  const hasBuff = computed(() => (type, options = {}) => {
    return buffs.value.some(buff => {
      // Check type match
      if (buff.type !== type) return false;
      
      // Check status
      if (options.activeOnly && buff.status !== BuffService.BUFF_STATUS.ACTIVE) {
        return false;
      }
      
      // Check minimum tier
      if (options.minTier) {
        const tierRanking = {
          [BuffService.BUFF_TIERS.COMMON]: 1,
          [BuffService.BUFF_TIERS.UNCOMMON]: 2,
          [BuffService.BUFF_TIERS.RARE]: 3,
          [BuffService.BUFF_TIERS.EPIC]: 4,
          [BuffService.BUFF_TIERS.LEGENDARY]: 5
        };
        
        const buffTierRank = tierRanking[buff.tier] || 0;
        const minTierRank = tierRanking[options.minTier] || 0;
        
        if (buffTierRank < minTierRank) {
          return false;
        }
      }
      
      return true;
    });
  });
  
  // Get buffs with calculated power levels
  const buffsWithPower = computed(() => {
    if (!includeCalculatedPower) return buffs.value;
    
    return buffs.value.map(buff => ({
      ...buff,
      powerLevel: BuffService.calculateBuffPowerLevel(buff)
    }));
  });
  
  // Methods
  async function loadBuffs() {
    if (!userAddressRef.value) {
      error.value = 'User address is required to load buffs';
      return;
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      const userBuffs = await BuffService.getUserBuffs(
        userAddressRef.value, 
        { ...filterOptions }
      );
      
      buffs.value = userBuffs;
    } catch (err) {
      console.error('Error loading buffs:', err);
      error.value = 'Failed to load buffs';
    } finally {
      loading.value = false;
    }
  }
  
  async function refreshBuffs() {
    return await loadBuffs();
  }
  
  async function grantBuff(type, tier, options = {}) {
    if (!userAddressRef.value) {
      error.value = 'User address is required to grant a buff';
      return { success: false, error: error.value };
    }
    
    try {
      let result;
      
      if (type === BuffService.BUFF_TYPES.SUNIHAMISH) {
        result = await BuffService.grantSunihamishBuff(
          userAddressRef.value,
          tier,
          options
        );
      } else {
        // For other buff types, create custom buff
        const buffData = {
          type,
          tier,
          name: options.name || `${type.charAt(0).toUpperCase() + type.slice(1)} Buff`,
          description: options.description,
          effects: options.effects || {}
        };
        
        const buff = BuffService.createCustomBuff(buffData);
        
        // In a real app, we'd persist this buff
        // For demo purposes, let's just add it to buffs
        buffs.value.push(buff);
        
        result = { success: true, buff };
      }
      
      if (result.success) {
        await refreshBuffs();
      }
      
      return result;
    } catch (err) {
      console.error(`Error granting ${type} buff:`, err);
      return { success: false, error: err.message };
    }
  }
  
  async function activateBuff(buffId) {
    if (!buffId) {
      error.value = 'Buff ID is required to activate';
      return { success: false, error: error.value };
    }
    
    try {
      // Find the buff in local state
      const buff = buffs.value.find(b => b.id === buffId);
      if (!buff) {
        error.value = 'Buff not found';
        return { success: false, error: error.value };
      }
      
      // For expired or suspended buffs, reactivate
      if ([BuffService.BUFF_STATUS.EXPIRED, BuffService.BUFF_STATUS.SUSPENDED].includes(buff.status)) {
        const result = await BuffService.reactivateBuff(userAddressRef.value, buffId);
        if (result.success) {
          await refreshBuffs();
        }
        return result;
      }
      
      // For consumed buffs, we can't reactivate
      if (buff.status === BuffService.BUFF_STATUS.CONSUMED) {
        return {
          success: false,
          error: 'Consumed buffs cannot be reactivated'
        };
      }
      
      // Buff is already active
      if (buff.status === BuffService.BUFF_STATUS.ACTIVE) {
        return {
          success: true,
          message: 'Buff is already active'
        };
      }
      
      return { success: false, error: 'Unknown buff status' };
    } catch (err) {
      console.error(`Error activating buff ${buffId}:`, err);
      return { success: false, error: err.message };
    }
  }
  
  async function deactivateBuff(buffId) {
    if (!buffId) {
      error.value = 'Buff ID is required to deactivate';
      return { success: false, error: error.value };
    }
    
    try {
      const result = await BuffService.expireBuff(
        userAddressRef.value,
        buffId,
        { suspend: true }
      );
      
      if (result.success) {
        await refreshBuffs();
      }
      
      return result;
    } catch (err) {
      console.error(`Error deactivating buff ${buffId}:`, err);
      return { success: false, error: err.message };
    }
  }
  
  async function consumeBuff(buffId, options = {}) {
    if (!buffId) {
      error.value = 'Buff ID is required to consume';
      return { success: false, error: error.value };
    }
    
    try {
      const result = await BuffService.consumeBuff(
        userAddressRef.value,
        buffId,
        options
      );
      
      if (result.success) {
        await refreshBuffs();
      }
      
      return result;
    } catch (err) {
      console.error(`Error consuming buff ${buffId}:`, err);
      return { success: false, error: err.message };
    }
  }
  
  function selectBuff(buff) {
    selectedBuff.value = buff;
  }
  
  function clearSelectedBuff() {
    selectedBuff.value = null;
  }
  
  // Setup and cleanup
  onMounted(() => {
    // Setup buff event listeners
    buffEventCleanup = BuffService.addBuffEventListener('all', async (event) => {
      // Only refresh if this event is for our user
      if (event.data.userAddress === userAddressRef.value) {
        await refreshBuffs();
      }
    });
    
    // Initial load if autoload is true
    if (autoload && userAddressRef.value) {
      loadBuffs();
    }
  });
  
  onUnmounted(() => {
    // Remove event listeners
    if (buffEventCleanup) {
      buffEventCleanup();
    }
  });
  
  // Watch for userAddress changes
  watch(userAddressRef, (newAddress, oldAddress) => {
    if (newAddress !== oldAddress && newAddress) {
      loadBuffs();
    }
  });
  
  // Set user address if it changes after initialization
  function setUserAddress(address) {
    userAddressRef.value = address;
  }
  
  return {
    // State
    buffs,
    loading,
    error,
    selectedBuff,
    
    // Computed
    activeBuffs,
    expiredBuffs,
    consumedBuffs,
    buffsByType,
    hasBuff,
    buffsWithPower,
    
    // Methods
    loadBuffs,
    refreshBuffs,
    grantBuff,
    activateBuff,
    deactivateBuff,
    consumeBuff,
    selectBuff,
    clearSelectedBuff,
    setUserAddress
  };
}
