/**
 * Marriage Service
 * 
 * Manages the relationship between the application and a local blockchain network.
 * When the application is "married" to a local network, all blockchain operations
 * are routed through the local network rather than remote chains.
 */

import * as LocalNetworkService from './LocalNetworkService';

// Marriage state
let marriageState = {
  married: false,
  networkType: null,
  chainId: null,
  timestamp: null,
  localAccounts: [],
  preferredAccount: null
};

// Event listeners
const eventListeners = new Map();

/**
 * Marry the application to a local network
 * 
 * @param {Object} options Marriage options
 * @returns {Promise<Object>} Marriage result
 */
export async function marryLocalNet(options = {}) {
  // Check if local network is connected
  if (!LocalNetworkService.isConnected()) {
    return {
      success: false,
      error: 'Cannot marry: Not connected to local network'
    };
  }

  try {
    // Get local network state
    const networkState = LocalNetworkService.getConnectionState();

    // Get local accounts
    const accounts = await LocalNetworkService.getLocalAccounts();
    
    // Update marriage state
    marriageState = {
      married: true,
      networkType: networkState.networkType,
      chainId: networkState.chainId,
      timestamp: Date.now(),
      localAccounts: accounts,
      preferredAccount: options.preferredAccount || (accounts.length > 0 ? accounts[0] : null)
    };

    // Dispatch marriage event
    window.dispatchEvent(new CustomEvent('localnet-marriage', {
      detail: {
        married: true,
        networkType: networkState.networkType,
        chainId: networkState.chainId
      }
    }));

    // Notify listeners
    notifyListeners('married', marriageState);

    // Save marriage state to localStorage for persistence
    saveMarriageState();

    return {
      success: true,
      ...marriageState
    };
  } catch (error) {
    console.error('Error marrying local network:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Divorce the application from the local network
 * 
 * @returns {Promise<Object>} Divorce result
 */
export async function divorceLocalNet() {
  if (!marriageState.married) {
    return {
      success: true,
      alreadyDivorced: true
    };
  }

  try {
    // Keep previous state for event
    const previousState = { ...marriageState };
    
    // Update marriage state
    marriageState = {
      married: false,
      networkType: null,
      chainId: null,
      timestamp: null,
      localAccounts: [],
      preferredAccount: null
    };

    // Dispatch divorce event
    window.dispatchEvent(new CustomEvent('localnet-marriage', {
      detail: {
        married: false,
        previousNetworkType: previousState.networkType,
        previousChainId: previousState.chainId
      }
    }));

    // Notify listeners
    notifyListeners('divorced', { previousState });

    // Update localStorage
    saveMarriageState();

    return {
      success: true,
      previousState
    };
  } catch (error) {
    console.error('Error divorcing local network:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if the application is married to a local network
 * 
 * @returns {boolean} Marriage status
 */
export function isMarried() {
  return marriageState.married;
}

/**
 * Get the current marriage state
 * 
 * @returns {Object} Current marriage state
 */
export function getMarriageState() {
  return { ...marriageState };
}

/**
 * Reset the marriage state (for testing/debugging)
 */
export function resetMarriageState() {
  marriageState = {
    married: false,
    networkType: null,
    chainId: null,
    timestamp: null,
    localAccounts: [],
    preferredAccount: null
  };
  
  saveMarriageState();
}

/**
 * Register an event listener
 * 
 * @param {string} eventName Event name ('married', 'divorced', 'all')
 * @param {Function} callback Callback function
 * @returns {Function} Function to remove the listener
 */
export function addEventListener(eventName, callback) {
  if (!eventListeners.has(eventName)) {
    eventListeners.set(eventName, new Set());
  }
  
  eventListeners.get(eventName).add(callback);
  
  // Return unregister function
  return () => {
    const listeners = eventListeners.get(eventName);
    if (listeners) {
      listeners.delete(callback);
    }
  };
}

/**
 * Set the preferred local account for transactions
 * 
 * @param {string} address Account address
 */
export function setPreferredAccount(address) {
  if (!marriageState.married) {
    return false;
  }
  
  if (!marriageState.localAccounts.includes(address)) {
    return false;
  }
  
  marriageState.preferredAccount = address;
  saveMarriageState();
  return true;
}

/**
 * Check if a specified network operation should be routed to the local network
 * 
 * @param {Object} operation Operation details
 * @returns {boolean} Whether to use local network
 */
export function shouldUseLocalNetwork(operation = {}) {
  // If not married, don't use local network
  if (!marriageState.married) {
    return false;
  }
  
  // If local network is not connected, don't use it
  if (!LocalNetworkService.isConnected()) {
    return false;
  }
  
  // If operation explicitly requests remote network, don't use local
  if (operation.forceRemote) {
    return false;
  }
  
  return true;
}

/**
 * Get the provider that should be used for a network operation
 * 
 * @param {Object} operation Operation details
 * @returns {Object|null} Provider to use
 */
export function getProviderForOperation(operation = {}) {
  if (!shouldUseLocalNetwork(operation)) {
    return null; // Use default provider
  }
  
  // Get local network connection state
  const connectionState = LocalNetworkService.getConnectionState();
  
  // Return local provider if connected
  return connectionState.provider || null;
}

/**
 * Initialize the marriage service
 */
export function initMarriageService() {
  // Load marriage state from localStorage if available
  loadMarriageState();
  
  // Listen for network disconnection events
  LocalNetworkService.addEventListener('disconnected', () => {
    // If we're married and local network disconnects, perform divorce
    if (marriageState.married) {
      divorceLocalNet()
        .catch(error => console.error('Error divorcing after disconnect:', error));
    }
  });
  
  console.log('Marriage Service initialized');
}

// Helper functions

/**
 * Save marriage state to localStorage
 */
function saveMarriageState() {
  try {
    localStorage.setItem('localnet_marriage_state', JSON.stringify(marriageState));
  } catch (error) {
    console.error('Error saving marriage state:', error);
  }
}

/**
 * Load marriage state from localStorage
 */
function loadMarriageState() {
  try {
    const savedState = localStorage.getItem('localnet_marriage_state');
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      
      // Verify if the saved state marriage is valid
      if (parsedState.married) {
        // Check if local network is still connected
        if (LocalNetworkService.isConnected()) {
          const connectionState = LocalNetworkService.getConnectionState();
          
          // If chainId matches, restore the marriage
          if (connectionState.chainId === parsedState.chainId) {
            marriageState = parsedState;
            
            // Notify listeners of restored marriage
            notifyListeners('married', marriageState);
            return;
          }
        }
        
        // If we get here, the marriage is no longer valid
        resetMarriageState();
      } else {
        marriageState = parsedState;
      }
    }
  } catch (error) {
    console.error('Error loading marriage state:', error);
    resetMarriageState();
  }
}

/**
 * Notify listeners of an event
 * 
 * @param {string} eventName Event name
 * @param {Object} data Event data
 */
function notifyListeners(eventName, data) {
  // Notify specific event listeners
  const listeners = eventListeners.get(eventName);
  if (listeners) {
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${eventName} event listener:`, error);
      }
    });
  }
  
  // Notify 'all' event listeners
  const allListeners = eventListeners.get('all');
  if (allListeners) {
    allListeners.forEach(callback => {
      try {
        callback({ type: eventName, data });
      } catch (error) {
        console.error(`Error in 'all' event listener:`, error);
      }
    });
  }
}

export default {
  marryLocalNet,
  divorceLocalNet,
  isMarried,
  getMarriageState,
  resetMarriageState,
  addEventListener,
  setPreferredAccount,
  shouldUseLocalNetwork,
  getProviderForOperation,
  initMarriageService
};
