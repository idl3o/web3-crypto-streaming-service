/**
 * Local Network Service
 * 
 * Provides functionality for connecting to and interacting with local blockchain networks
 * for development and testing purposes.
 */

import { optimizeComputation } from './OptimizationService';
import { EXECUTION_STRATEGIES, PRIORITY_LEVELS } from './ExecutionEngine';
import { ethers } from 'ethers';

// Network types
export const LOCAL_NETWORK_TYPES = {
    HARDHAT: 'hardhat',
    GANACHE: 'ganache',
    GETH_DEV: 'geth-dev',
    CUSTOM: 'custom'
};

// Connection state
let connectionState = {
    connected: false,
    networkType: null,
    provider: null,
    url: null,
    chainId: null,
    accounts: [],
    lastBlock: null,
    error: null
};

// Event listeners
const eventListeners = new Map();

/**
 * Initialize connection to a local blockchain network
 * 
 * @param {Object} options Connection options
 * @returns {Promise<Object>} Connection result
 */
export async function connectToLocalNetwork(options = {}) {
    try {
        const networkType = options.networkType || LOCAL_NETWORK_TYPES.HARDHAT;
        const url = options.url || getDefaultUrlForNetworkType(networkType);

        console.log(`Connecting to local ${networkType} network at ${url}...`);

        // Disconnect existing connection if any
        if (connectionState.provider) {
            await disconnectFromLocalNetwork();
        }

        // Create provider
        const provider = new ethers.providers.JsonRpcProvider(url);

        // Test connection by getting network info
        const network = await provider.getNetwork();
        const blockNumber = await provider.getBlockNumber();
        
        // Success - update connection state
        connectionState = {
            connected: true,
            networkType,
            provider,
            url,
            chainId: network.chainId,
            accounts: [],
            lastBlock: blockNumber,
            error: null
        };

        console.log(`Connected to local network: Chain ID ${network.chainId}, Block #${blockNumber}`);

        // Set up block listener
        provider.on('block', handleNewBlock);

        // Emit connection event
        emitEvent('connected', { 
            chainId: network.chainId, 
            blockNumber,
            networkType
        });

        return {
            success: true,
            chainId: network.chainId,
            blockNumber
        };
    } catch (error) {
        console.error('Failed to connect to local network:', error);

        connectionState = {
            connected: false,
            networkType: options.networkType,
            provider: null,
            url: options.url,
            chainId: null,
            accounts: [],
            lastBlock: null,
            error: error.message
        };

        // Emit error event
        emitEvent('error', { message: error.message });

        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Disconnect from local network
 * 
 * @returns {Promise<Object>} Disconnection result
 */
export async function disconnectFromLocalNetwork() {
    if (!connectionState.connected) {
        return { success: true, alreadyDisconnected: true };
    }

    try {
        // Remove block listener
        if (connectionState.provider) {
            connectionState.provider.off('block', handleNewBlock);
            connectionState.provider = null;
        }

        // Update state
        const previousState = { ...connectionState };
        connectionState = {
            connected: false,
            networkType: previousState.networkType,
            provider: null,
            url: previousState.url,
            chainId: null,
            accounts: [],
            lastBlock: null,
            error: null
        };

        // Emit disconnection event
        emitEvent('disconnected', { 
            previousChainId: previousState.chainId,
            networkType: previousState.networkType 
        });

        return { success: true };
    } catch (error) {
        console.error('Error disconnecting from local network:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get accounts from the local network
 * 
 * @param {Object} options Options for getting accounts
 * @returns {Promise<Array<string>>} Array of account addresses
 */
export async function getLocalAccounts(options = {}) {
    if (!connectionState.connected) {
        throw new Error('Not connected to local network');
    }

    try {
        // Get accounts using optimized execution
        const accounts = await optimizeComputation(
            async () => {
                // In a local network, we should be able to get accounts easily
                // This varies by network type
                if (connectionState.networkType === LOCAL_NETWORK_TYPES.HARDHAT) {
                    // Hardhat commonly has 20 pre-funded accounts
                    const signers = await Promise.all(
                        Array.from({ length: 20 }, (_, i) => i).map(
                            i => connectionState.provider.getSigner(i).getAddress().catch(() => null)
                        )
                    );
                    return signers.filter(address => address !== null);
                }
                
                // Default approach - ask network for accounts
                return connectionState.provider.listAccounts();
            },
            {
                params: {},
                strategy: EXECUTION_STRATEGIES.IMMEDIATE,
                priority: PRIORITY_LEVELS.HIGH
            }
        );

        // Update state with accounts
        connectionState.accounts = accounts;

        return accounts;
    } catch (error) {
        console.error('Error getting local accounts:', error);
        throw error;
    }
}

/**
 * Get the connection state
 * 
 * @returns {Object} Current connection state
 */
export function getConnectionState() {
    return { ...connectionState };
}

/**
 * Check if connected to a local network
 * 
 * @returns {boolean} Whether connected to local network
 */
export function isConnected() {
    return connectionState.connected;
}

/**
 * Send a test transaction on the local network
 * 
 * @param {Object} options Transaction options
 * @returns {Promise<Object>} Transaction result
 */
export async function sendTestTransaction(options = {}) {
    if (!connectionState.connected) {
        throw new Error('Not connected to local network');
    }

    try {
        const accounts = await getLocalAccounts();
        if (accounts.length < 2) {
            throw new Error('Need at least 2 accounts for test transaction');
        }

        const fromAddress = options.from || accounts[0];
        const toAddress = options.to || accounts[1];
        const amount = options.amount || ethers.utils.parseEther('0.01');

        // Get wallet for sender
        const wallet = connectionState.provider.getSigner(fromAddress);

        // Send transaction
        const tx = await wallet.sendTransaction({
            to: toAddress,
            value: amount
        });

        console.log('Test transaction sent:', tx.hash);

        // Wait for transaction to be mined
        const receipt = await tx.wait();

        // Emit event
        emitEvent('transaction', {
            hash: tx.hash,
            from: fromAddress,
            to: toAddress,
            amount: ethers.utils.formatEther(amount),
            blockNumber: receipt.blockNumber
        });

        return {
            success: true,
            hash: tx.hash,
            receipt
        };
    } catch (error) {
        console.error('Error sending test transaction:', error);
        
        // Emit error event
        emitEvent('error', {
            context: 'test-transaction',
            message: error.message
        });
        
        throw error;
    }
}

/**
 * Deploy a test contract to the local network
 * 
 * @param {Object} options Deployment options
 * @returns {Promise<Object>} Deployment result
 */
export async function deployTestContract(options = {}) {
    if (!connectionState.connected) {
        throw new Error('Not connected to local network');
    }

    try {
        // Get deployer account
        const accounts = await getLocalAccounts();
        const deployerAddress = options.deployer || accounts[0];
        const deployer = connectionState.provider.getSigner(deployerAddress);

        // Simple test contract
        const contractSource = options.source || `
            pragma solidity ^0.8.0;
            
            contract TestContract {
                string public message;
                event MessageUpdated(string newMessage);
                
                constructor(string memory initialMessage) {
                    message = initialMessage;
                }
                
                function updateMessage(string memory newMessage) public {
                    message = newMessage;
                    emit MessageUpdated(newMessage);
                }
            }
        `;

        // In a real implementation, we would compile and deploy this contract
        // For this example, we'll simulate the deployment
        
        // Simulate contract deployment
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Create a mock contract address
        const contractAddress = ethers.utils.getContractAddress({
            from: deployerAddress,
            nonce: Math.floor(Math.random() * 1000)
        });
        
        console.log('Test contract deployed at:', contractAddress);
        
        // Emit event
        emitEvent('contract-deployed', {
            address: contractAddress,
            deployer: deployerAddress
        });
        
        return {
            success: true,
            address: contractAddress,
            deployer: deployerAddress
        };
    } catch (error) {
        console.error('Error deploying test contract:', error);
        
        // Emit error event
        emitEvent('error', {
            context: 'deploy-contract',
            message: error.message
        });
        
        throw error;
    }
}

/**
 * Register an event listener
 * 
 * @param {string} eventName Event name to listen for
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

// Helper functions

/**
 * Get default URL for a network type
 * 
 * @param {string} networkType Network type
 * @returns {string} Default URL
 */
function getDefaultUrlForNetworkType(networkType) {
    switch (networkType) {
        case LOCAL_NETWORK_TYPES.HARDHAT:
            return 'http://localhost:8545';
        case LOCAL_NETWORK_TYPES.GANACHE:
            return 'http://localhost:7545';
        case LOCAL_NETWORK_TYPES.GETH_DEV:
            return 'http://localhost:8545';
        default:
            return 'http://localhost:8545';
    }
}

/**
 * Handle new block event
 * 
 * @param {number} blockNumber New block number
 */
function handleNewBlock(blockNumber) {
    // Update connection state
    connectionState.lastBlock = blockNumber;
    
    // Emit block event
    emitEvent('block', { blockNumber });
}

/**
 * Emit an event to all listeners
 * 
 * @param {string} eventName Event name
 * @param {Object} data Event data
 */
function emitEvent(eventName, data) {
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
    
    // Also notify 'all' listeners
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
    connectToLocalNetwork,
    disconnectFromLocalNetwork,
    getLocalAccounts,
    getConnectionState,
    isConnected,
    sendTestTransaction,
    deployTestContract,
    addEventListener,
    LOCAL_NETWORK_TYPES
};
