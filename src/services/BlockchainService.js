/**
 * Blockchain Service
 * 
 * Provides blockchain interaction capabilities with support for
 * local network marriage integration.
 */

import { ethers } from 'ethers';
import * as MarriageService from './MarriageService';
import { apiKeys } from '../config/env';

// Service state
let provider = null;
let signer = null;
let currentAccount = null;
let networkId = null;
let isInitialized = false;
let listeners = [];

/**
 * Initialize the blockchain service
 * @param {Object} options Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initialize(options = {}) {
  if (isInitialized) return true;
  
  try {
    console.log('Initializing Blockchain Service...');
    
    // Check if we're in a browser environment with ethereum provider
    if (window.ethereum) {
      provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
      
      // Set up event listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);
      
    } else {
      // Use fallback RPC provider based on network
      const network = options.network || process.env.VUE_APP_DEFAULT_NETWORK || 'mainnet';
      provider = _getProviderForNetwork(network);
    }
    
    // Get current network
    const network = await provider.getNetwork();
    networkId = network.chainId;
    
    isInitialized = true;
    console.log(`Blockchain Service initialized on network ${network.name} (${networkId})`);
    return true;
  } catch (error) {
    console.error('Failed to initialize Blockchain Service:', error);
    return false;
  }
}

/**
 * Get provider for specific network
 * @param {string} network Network name
 * @returns {ethers.providers.Provider} Ethers provider
 * @private
 */
function _getProviderForNetwork(network) {
  // Handle BNB Chain specifically
  if (network === 'bnb' || network === 'bsc') {
    // Use BNB specific API key if available
    if (apiKeys.blockchain.bnb) {
      return new ethers.providers.JsonRpcProvider(`https://bsc-dataseed.binance.org/`, {
        name: 'bnb',
        chainId: 56
      });
    }
    // Use Binance specific API key as fallback
    if (apiKeys.blockchain.binance) {
      return new ethers.providers.JsonRpcProvider(`https://bsc-dataseed.binance.org/`, {
        name: 'bnb',
        chainId: 56
      });
    }
  }
  
  // Use Infura if API key available
  if (apiKeys.blockchain.infura) {
    return new ethers.providers.InfuraProvider(network, apiKeys.blockchain.infura);
  }
  
  // Use Alchemy if API key available
  if (apiKeys.blockchain.alchemy) {
    return new ethers.providers.AlchemyProvider(network, apiKeys.blockchain.alchemy);
  }
  
  // Use default provider as fallback
  return ethers.getDefaultProvider(network);
}

/**
 * Connect wallet
 * @returns {Promise<boolean>} Success status
 */
export async function connectWallet() {
  if (!isInitialized) {
    await initialize();
  }
  
  if (!window.ethereum) {
    console.error('No Ethereum provider found');
    return false;
  }
  
  try {
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    handleAccountsChanged(accounts);
    
    // Get signer
    signer = provider.getSigner();
    
    return true;
  } catch (error) {
    console.error('User rejected wallet connection', error);
    return false;
  }
}

/**
 * Disconnect wallet
 * @returns {Promise<boolean>} Success status
 */
export async function disconnectWallet() {
  signer = null;
  currentAccount = null;
  
  // Notify listeners
  for (const listener of listeners) {
    if (listener.type === 'accountsChanged') {
      listener.callback([]);
    }
  }
  
  return true;
}

/**
 * Check if wallet is connected
 * @returns {boolean} Whether wallet is connected
 */
export function isConnected() {
  return !!currentAccount;
}

/**
 * Get current account
 * @returns {string|null} Current account address
 */
export function getCurrentAccount() {
  return currentAccount;
}

/**
 * Get provider
 * @returns {Promise<ethers.providers.Provider>} Ethers provider
 */
export async function getProvider() {
  if (!isInitialized) {
    await initialize();
  }
  
  return provider;
}

/**
 * Get signer
 * @returns {Promise<ethers.Signer>} Ethers signer
 */
export async function getSigner() {
  if (!isInitialized) {
    await initialize();
  }
  
  if (!signer) {
    throw new Error('Wallet not connected');
  }
  
  return signer;
}

/**
 * Get network ID
 * @returns {Promise<number>} Network ID
 */
export async function getNetworkId() {
  if (!isInitialized) {
    await initialize();
  }
  
  if (!networkId) {
    const network = await provider.getNetwork();
    networkId = network.chainId;
  }
  
  return networkId;
}

/**
 * Get current block number
 * @returns {Promise<number>} Block number
 */
export async function getBlockNumber() {
  if (!isInitialized) {
    await initialize();
  }
  
  return await provider.getBlockNumber();
}

/**
 * Handle accounts changed event
 * @param {Array} accounts Accounts array
 * @private
 */
function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    // User disconnected
    currentAccount = null;
  } else if (accounts[0] !== currentAccount) {
    currentAccount = accounts[0];
  }
  
  // Notify listeners
  for (const listener of listeners) {
    if (listener.type === 'accountsChanged') {
      listener.callback(accounts);
    }
  }
}

/**
 * Handle chain changed event
 * @param {string} chainId New chain ID
 * @private
 */
function handleChainChanged(chainId) {
  // Need to reload provider for chain change
  provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
  networkId = parseInt(chainId, 16);
  
  // Notify listeners
  for (const listener of listeners) {
    if (listener.type === 'chainChanged') {
      listener.callback(chainId);
    }
  }
  
  // Refresh page to ensure everything works with new network
  window.location.reload();
}

/**
 * Handle disconnect event
 * @param {Object} error Error object
 * @private
 */
function handleDisconnect(error) {
  signer = null;
  currentAccount = null;
  
  // Notify listeners
  for (const listener of listeners) {
    if (listener.type === 'disconnect') {
      listener.callback(error);
    }
  }
}

/**
 * Register event listener
 * @param {string} event Event type
 * @param {Function} callback Callback function
 * @returns {Function} Unsubscribe function
 */
export function on(event, callback) {
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  listeners.push({
    id,
    type: event,
    callback
  });
  
  // Return unsubscribe function
  return () => {
    listeners = listeners.filter(listener => listener.id !== id);
  };
}

/**
 * Switch network
 * @param {string|number} chainId Chain ID
 * @returns {Promise<boolean>} Success status
 */
export async function switchNetwork(chainId) {
  if (!window.ethereum) {
    console.error('No Ethereum provider found');
    return false;
  }
  
  // Convert numeric chainId to hex
  const chainIdHex = typeof chainId === 'number' ? 
    `0x${chainId.toString(16)}` : 
    chainId;
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }]
    });
    return true;
  } catch (error) {
    if (error.code === 4902) {
      // Chain not added to MetaMask
      return await addNetwork(chainId);
    }
    console.error('Error switching network:', error);
    return false;
  }
}

/**
 * Add network to wallet
 * @param {string|number} chainId Chain ID
 * @returns {Promise<boolean>} Success status
 */
export async function addNetwork(chainId) {
  if (!window.ethereum) {
    console.error('No Ethereum provider found');
    return false;
  }
  
  // Get network parameters based on chainId
  const params = _getNetworkParams(chainId);
  
  if (!params) {
    console.error(`Network parameters not found for chainId ${chainId}`);
    return false;
  }
  
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [params]
    });
    return true;
  } catch (error) {
    console.error('Error adding network:', error);
    return false;
  }
}

/**
 * Get network parameters
 * @param {string|number} chainId Chain ID
 * @returns {Object|null} Network parameters
 * @private
 */
function _getNetworkParams(chainId) {
  // Convert hex chainId to number for comparison
  const chainIdNum = typeof chainId === 'string' && chainId.startsWith('0x') ?
    parseInt(chainId, 16) : 
    Number(chainId);
  
  // Define network parameters
  const networks = {
    1: {
      chainId: '0x1',
      chainName: 'Ethereum Mainnet',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      },
      rpcUrls: ['https://mainnet.infura.io/v3/'],
      blockExplorerUrls: ['https://etherscan.io']
    },
    56: {
      chainId: '0x38',
      chainName: 'BNB Smart Chain',
      nativeCurrency: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18
      },
      rpcUrls: [
        'https://bsc-dataseed.binance.org/',
        'https://bsc-dataseed1.defibit.io/',
        'https://bsc-dataseed1.ninicoin.io/'
      ],
      blockExplorerUrls: ['https://bscscan.com']
    },
    137: {
      chainId: '0x89',
      chainName: 'Polygon Mainnet',
      nativeCurrency: {
        name: 'MATIC',
        symbol: 'MATIC',
        decimals: 18
      },
      rpcUrls: ['https://polygon-rpc.com'],
      blockExplorerUrls: ['https://polygonscan.com']
    }
    // Add more networks as needed
  };
  
  return networks[chainIdNum] || null;
}

export default {
  initialize,
  connectWallet,
  disconnectWallet,
  isConnected,
  getCurrentAccount,
  getProvider,
  getSigner,
  getNetworkId,
  getBlockNumber,
  on,
  switchNetwork,
  addNetwork
};
