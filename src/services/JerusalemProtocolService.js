/**
 * Jerusalem Protocol Service
 * 
 * Cross-chain content transfer and bridging service for the Web3 Crypto Streaming platform.
 */

import * as BlockchainService from './BlockchainService';
import * as SecurityService from './RiceAdvancedNetworkSecurityService';
import { findOptimalCrossChainPath } from '../utils/ShortestPathFinder';

// Constants with improved naming
export const BLOCKCHAIN_NETWORK = {
    ETHEREUM: 'ethereum',
    POLYGON: 'polygon',
    ARBITRUM: 'arbitrum',
    OPTIMISM: 'optimism',
    AVALANCHE: 'avalanche',
    SOLANA: 'solana',
    BASE: 'base',
    BNB: 'bnb_chain', // Using consistent naming for BNB Smart Chain
    ZKSYNC: 'zksync'
};

export const TRANSFER_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    CONFIRMING: 'confirming',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

export const CONTENT_TYPE = {
    VIDEO: 'video',
    AUDIO: 'audio',
    IMAGE: 'image',
    TEXT: 'text',
    HOLOGRAM: 'hologram',
    MIXED: 'mixed_media'
};

// Private service state
let _initialized = false;
const _transfers = new Map();
const _userTransfers = new Map();
const _networkGateways = new Map();
let _serviceConfig = {
    gasFeeMultiplier: 1.1,
    autoConfirmTransfers: false,
    preferredGateway: 'jerusalem_prime',
    includeMetadata: true,
    maxConcurrentTransfers: 5,
    autoRetryFailed: true
};

/**
 * Initialize the Jerusalem Protocol Service
 * @param {Object} options Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initialize(options = {}) {
    if (_initialized) {
        return true;
    }

    try {
        console.log('Initializing Jerusalem Protocol Service...');

        // Initialize dependencies
        if (!SecurityService.getSecurityMetrics()) {
            await SecurityService.initSecurityService();
        }

        // Apply configuration options
        if (options.config) {
            _serviceConfig = {
                ..._serviceConfig,
                ...options.config
            };
        }

        // Set up service components
        _initializeGateways();

        // Load user data if wallet is connected
        if (BlockchainService.isConnected()) {
            const userAddress = BlockchainService.getCurrentAccount();
            await _loadUserTransfers(userAddress);
        }

        _initialized = true;
        console.log('Jerusalem Protocol Service initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Jerusalem Protocol Service:', error);
        return false;
    }
}

/**
 * Initialize network gateway definitions
 * @private
 */
function _initializeGateways() {
    _networkGateways.set('jerusalem_prime', {
        id: 'jerusalem_prime',
        name: 'Jerusalem Prime Gateway',
        description: 'Primary gateway with support for all major chains',
        supportedNetworks: Object.values(BLOCKCHAIN_NETWORK),
        fee: 0.001, // 0.1% fee
        averageTime: 3 * 60, // 3 minutes
        securityLevel: 'high',
        status: 'active'
    });

    _networkGateways.set('jerusalem_fast', {
        id: 'jerusalem_fast',
        name: 'Jerusalem Fast Gateway',
        description: 'Optimized for speed with higher fees',
        supportedNetworks: [
            BLOCKCHAIN_NETWORK.ETHEREUM,
            BLOCKCHAIN_NETWORK.POLYGON,
            BLOCKCHAIN_NETWORK.ARBITRUM,
            BLOCKCHAIN_NETWORK.OPTIMISM,
            BLOCKCHAIN_NETWORK.BASE
        ],
        fee: 0.003, // 0.3% fee
        averageTime: 45, // 45 seconds
        securityLevel: 'medium',
        status: 'active'
    });

    _networkGateways.set('jerusalem_secure', {
        id: 'jerusalem_secure',
        name: 'Jerusalem Secure Gateway',
        description: 'Enhanced security measures with longer processing time',
        supportedNetworks: [
            BLOCKCHAIN_NETWORK.ETHEREUM,
            BLOCKCHAIN_NETWORK.POLYGON,
            BLOCKCHAIN_NETWORK.AVALANCHE,
            BLOCKCHAIN_NETWORK.BNB
        ],
        fee: 0.002, // 0.2% fee
        averageTime: 5 * 60, // 5 minutes
        securityLevel: 'very_high',
        status: 'active'
    });
}

/**
 * Load user's transfers
 * @param {string} userAddress User's wallet address
 * @returns {Promise<Array>} User's transfers
 * @private
 */
async function _loadUserTransfers(userAddress) {
    if (!userAddress) return [];

    try {
        const normalizedAddress = userAddress.toLowerCase();

        const sampleTransfers = _generateSampleTransfers(normalizedAddress);

        sampleTransfers.forEach(transfer => {
            _transfers.set(transfer.id, transfer);
        });

        _userTransfers.set(normalizedAddress, sampleTransfers.map(t => t.id));

        return sampleTransfers;
    } catch (error) {
        console.error(`Error loading transfers for ${userAddress}:`, error);
        return [];
    }
}

/**
 * Generate sample transfers for a user
 * @param {string} userAddress User address
 * @returns {Array} Sample transfers
 * @private
 */
function _generateSampleTransfers(userAddress) {
    const now = Date.now();
    const minute = 60 * 1000;
    const hour = 60 * minute;

    const addressSeed = parseInt(userAddress.slice(2, 10), 16);
    const transferCount = (addressSeed % 4) + 2; // 2-5 transfers

    const sampleTransfers = [];
    const networks = Object.values(BLOCKCHAIN_NETWORK);
    const statuses = Object.values(TRANSFER_STATUS);
    const contentTypes = Object.values(CONTENT_TYPE);

    for (let i = 0; i < transferCount; i++) {
        const sourceIndex = (addressSeed + i) % networks.length;
        let destIndex = (sourceIndex + 1 + i) % networks.length;
        if (destIndex === sourceIndex) destIndex = (destIndex + 1) % networks.length;

        const transfer = {
            id: `transfer_${now - i * hour}_${Math.random().toString(36).substring(2, 10)}`,
            userId: userAddress,
            contentId: `content_${Math.random().toString(36).substring(2, 10)}`,
            contentType: contentTypes[i % contentTypes.length],
            status: statuses[i % (statuses.length - 1)],
            sourceNetwork: networks[sourceIndex],
            destinationNetwork: networks[destIndex],
            sourceUrl: `ipfs://Qm${Math.random().toString(36).substring(2, 46)}`,
            destinationUrl: i === 0 ? null : `ipfs://Qm${Math.random().toString(36).substring(2, 46)}`,
            startTime: now - (i * hour) - Math.floor(Math.random() * hour),
            completionTime: i === 0 ? null : now - (i * hour) + Math.floor(Math.random() * hour),
            fee: Math.random() * 0.01 + 0.001,
            gatewayId: i % 2 === 0 ? 'jerusalem_prime' : 'jerusalem_fast',
            transferSize: Math.floor(Math.random() * 1000) + 100,
            metadata: {
                title: `Sample Content ${i + 1}`,
                creator: userAddress,
                createdAt: now - (7 * 24 * hour) - (i * 24 * hour),
                license: 'CC-BY-4.0',
                tags: ['crypto', 'streaming', 'web3']
            }
        };

        if (i === 0) {
            transfer.status = Math.random() > 0.5 ? TRANSFER_STATUS.PENDING : TRANSFER_STATUS.PROCESSING;
            transfer.progress = transfer.status === TRANSFER_STATUS.PROCESSING ? Math.floor(Math.random() * 80) + 10 : 0;
            transfer.estimatedCompletionTime = now + (30 * minute) + Math.floor(Math.random() * hour);
        }

        if (i === transferCount - 1) {
            transfer.status = TRANSFER_STATUS.FAILED;
            transfer.error = {
                code: 'GATEWAY_TIMEOUT',
                message: 'The gateway failed to respond within the timeout period',
                details: 'The network gateway encountered high traffic and could not process the transfer',
                recoverable: true
            };
        }

        sampleTransfers.push(transfer);
    }

    return sampleTransfers;
}

/**
 * Create a new content transfer
 * @param {Object} transferRequest Transfer request data
 * @returns {Promise<Object>} Created transfer result
 */
export async function createTransfer(transferRequest) {
    if (!_initialized) {
        await initialize();
    }

    if (!BlockchainService.isConnected()) {
        throw new Error('Wallet must be connected to create a transfer');
    }

    try {
        const userAddress = BlockchainService.getCurrentAccount();

        if (!transferRequest.contentId || !transferRequest.sourceNetwork || !transferRequest.destinationNetwork || !transferRequest.sourceUrl) {
            throw new Error('Missing required transfer data');
        }

        if (!Object.values(BLOCKCHAIN_NETWORK).includes(transferRequest.sourceNetwork)) {
            throw new Error(`Unsupported source network: ${transferRequest.sourceNetwork}`);
        }
        if (!Object.values(BLOCKCHAIN_NETWORK).includes(transferRequest.destinationNetwork)) {
            throw new Error(`Unsupported destination network: ${transferRequest.destinationNetwork}`);
        }
        if (transferRequest.sourceNetwork === transferRequest.destinationNetwork) {
            throw new Error('Source and destination networks cannot be the same');
        }

        const gatewayId = transferRequest.gatewayId || _serviceConfig.preferredGateway;
        const gateway = _networkGateways.get(gatewayId);
        if (!gateway) {
            throw new Error(`Gateway not found: ${gatewayId}`);
        }
        if (!gateway.supportedNetworks.includes(transferRequest.sourceNetwork) ||
            !gateway.supportedNetworks.includes(transferRequest.destinationNetwork)) {
            throw new Error(`Gateway ${gateway.name} does not support the specified networks`);
        }

        const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        const contentType = transferRequest.contentType || CONTENT_TYPE.MIXED;
        const baseFee = gateway.fee;
        const transferSize = transferRequest.transferSize || 100;
        const calculatedFee = baseFee * transferSize * _serviceConfig.gasFeeMultiplier;

        const transfer = {
            id: transferId,
            userId: userAddress,
            contentId: transferRequest.contentId,
            contentType,
            status: TRANSFER_STATUS.PENDING,
            sourceNetwork: transferRequest.sourceNetwork,
            destinationNetwork: transferRequest.destinationNetwork,
            sourceUrl: transferRequest.sourceUrl,
            destinationUrl: null,
            startTime: Date.now(),
            completionTime: null,
            fee: calculatedFee,
            gatewayId,
            transferSize,
            metadata: _serviceConfig.includeMetadata ? (transferRequest.metadata || {}) : undefined,
            progress: 0,
            estimatedCompletionTime: Date.now() + (gateway.averageTime * 1000)
        };

        _transfers.set(transferId, transfer);

        const normalizedAddress = userAddress.toLowerCase();
        let userTransferIds = _userTransfers.get(normalizedAddress) || [];
        userTransferIds = [transferId, ...userTransferIds];
        _userTransfers.set(normalizedAddress, userTransferIds);

        if (_serviceConfig.autoConfirmTransfers) {
            _simulateTransferProgress(transferId);
        }

        return {
            success: true,
            message: 'Transfer created successfully',
            transfer,
            requiresConfirmation: !_serviceConfig.autoConfirmTransfers
        };
    } catch (error) {
        console.error('Error creating transfer:', error);
        throw error;
    }
}

/**
 * Simulate transfer progress for a given transfer
 * @param {string} transferId Transfer ID
 * @private
 */
function _simulateTransferProgress(transferId) {
    const transfer = _transfers.get(transferId);
    if (!transfer || transfer.status !== TRANSFER_STATUS.PENDING) {
        return;
    }

    transfer.status = TRANSFER_STATUS.PROCESSING;
    _transfers.set(transferId, { ...transfer });

    const gateway = _networkGateways.get(transfer.gatewayId);
    const averageTimeMs = (gateway?.averageTime || 180) * 1000;
    const updateInterval = averageTimeMs / 10;

    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 10;

        if (progress >= 100) {
            clearInterval(progressInterval);
            _finalizeTransfer(transferId);
            return;
        }

        transfer.progress = progress;
        _transfers.set(transferId, { ...transfer });
        console.log(`Transfer ${transferId} progress: ${progress}%`);
    }, updateInterval);
}

/**
 * Complete a transfer with final processing
 * @param {string} transferId Transfer ID
 * @private
 */
function _finalizeTransfer(transferId) {
    const transfer = _transfers.get(transferId);
    if (!transfer || transfer.status === TRANSFER_STATUS.COMPLETED || transfer.status === TRANSFER_STATUS.FAILED) {
        return;
    }

    const failureChance = 0.05;
    if (Math.random() < failureChance) {
        transfer.status = TRANSFER_STATUS.FAILED;
        transfer.error = {
            code: 'GATEWAY_ERROR',
            message: 'The gateway encountered an error during transfer',
            details: 'There was an issue with the cross-chain message verification',
            recoverable: true
        };
        _transfers.set(transferId, { ...transfer });
        return;
    }

    transfer.status = TRANSFER_STATUS.CONFIRMING;
    _transfers.set(transferId, { ...transfer });

    setTimeout(() => {
        transfer.destinationUrl = `ipfs://Qm${Math.random().toString(36).substring(2, 46)}`;
        transfer.status = TRANSFER_STATUS.COMPLETED;
        transfer.completionTime = Date.now();
        transfer.progress = 100;

        _transfers.set(transferId, { ...transfer });
        console.log(`Transfer ${transferId} completed`);
    }, 3000);
}

/**
 * Get a transfer by its ID
 * @param {string} transferId Transfer ID
 * @returns {Promise<Object|null>} Transfer data or null if not found
 */
export async function getTransferById(transferId) {
    if (!_initialized) {
        await initialize();
    }

    return _transfers.get(transferId) || null;
}

/**
 * Get all transfers for a user
 * @param {string} userAddress User's wallet address (optional)
 * @returns {Promise<Array>} User's transfers
 */
export async function getTransfersByUser(userAddress) {
    if (!_initialized) {
        await initialize();
    }

    const address = userAddress ||
        (BlockchainService.isConnected() ? BlockchainService.getCurrentAccount() : null);

    if (!address) {
        return [];
    }

    const normalizedAddress = address.toLowerCase();
    const userTransferIds = _userTransfers.get(normalizedAddress) || [];

    return userTransferIds
        .map(id => _transfers.get(id))
        .filter(Boolean);
}

/**
 * Confirm a pending transfer
 * @param {string} transferId Transfer ID
 * @returns {Promise<Object>} Confirmation result
 */
export async function confirmTransfer(transferId) {
    if (!_initialized) {
        await initialize();
    }

    if (!BlockchainService.isConnected()) {
        throw new Error('Wallet must be connected to confirm transfers');
    }

    const transfer = _transfers.get(transferId);
    if (!transfer) {
        throw new Error(`Transfer not found: ${transferId}`);
    }

    const userAddress = BlockchainService.getCurrentAccount();
    if (transfer.userId.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Only the creator can confirm this transfer');
    }

    if (transfer.status !== TRANSFER_STATUS.PENDING) {
        return {
            success: false,
            message: `Transfer cannot be confirmed in ${transfer.status} status`,
            transfer
        };
    }

    try {
        _simulateTransferProgress(transferId);

        return {
            success: true,
            message: 'Transfer confirmed successfully',
            transfer: _transfers.get(transferId)
        };
    } catch (error) {
        console.error('Error confirming transfer:', error);
        throw error;
    }
}

/**
 * Retry a failed transfer
 * @param {string} transferId Transfer ID
 * @returns {Promise<Object>} Retry result
 */
export async function retryTransfer(transferId) {
    if (!_initialized) {
        await initialize();
    }

    if (!BlockchainService.isConnected()) {
        throw new Error('Wallet must be connected to retry transfers');
    }

    const transfer = _transfers.get(transferId);
    if (!transfer) {
        throw new Error(`Transfer not found: ${transferId}`);
    }

    const userAddress = BlockchainService.getCurrentAccount();
    if (transfer.userId.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Only the creator can retry this transfer');
    }

    if (transfer.status !== TRANSFER_STATUS.FAILED) {
        return {
            success: false,
            message: `Transfer cannot be retried in ${transfer.status} status`,
            transfer
        };
    }

    if (!transfer.error?.recoverable) {
        return {
            success: false,
            message: 'This transfer failure cannot be recovered',
            transfer
        };
    }

    try {
        transfer.status = TRANSFER_STATUS.PENDING;
        transfer.error = null;
        transfer.progress = 0;
        transfer.estimatedCompletionTime = Date.now() + (_networkGateways.get(transfer.gatewayId)?.averageTime || 180) * 1000;

        _transfers.set(transferId, transfer);

        _simulateTransferProgress(transferId);

        return {
            success: true,
            message: 'Transfer retry initiated',
            transfer: _transfers.get(transferId)
        };
    } catch (error) {
        console.error('Error retrying transfer:', error);
        throw error;
    }
}

/**
 * Cancel a pending transfer
 * @param {string} transferId Transfer ID
 * @returns {Promise<Object>} Cancellation result
 */
export async function cancelTransfer(transferId) {
    if (!_initialized) {
        await initialize();
    }

    if (!BlockchainService.isConnected()) {
        throw new Error('Wallet must be connected to cancel transfers');
    }

    const transfer = _transfers.get(transferId);
    if (!transfer) {
        throw new Error(`Transfer not found: ${transferId}`);
    }

    const userAddress = BlockchainService.getCurrentAccount();
    if (transfer.userId.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Only the creator can cancel this transfer');
    }

    if (transfer.status !== TRANSFER_STATUS.PENDING) {
        return {
            success: false,
            message: `Transfer cannot be cancelled in ${transfer.status} status`,
            transfer
        };
    }

    try {
        transfer.status = TRANSFER_STATUS.FAILED;
        transfer.error = {
            code: 'USER_CANCELLED',
            message: 'Transfer was cancelled by the user',
            details: null,
            recoverable: false
        };

        _transfers.set(transferId, transfer);

        return {
            success: true,
            message: 'Transfer cancelled successfully',
            transfer: _transfers.get(transferId)
        };
    } catch (error) {
        console.error('Error cancelling transfer:', error);
        throw error;
    }
}

/**
 * Get available gateways based on networks
 * @param {Object} filters Filtering options
 * @returns {Array} Available gateways
 */
export function getAvailableGateways(filters = {}) {
    const gateways = Array.from(_networkGateways.values());

    if (filters.sourceNetwork && filters.destinationNetwork) {
        return gateways.filter(gateway =>
            gateway.supportedNetworks.includes(filters.sourceNetwork) &&
            gateway.supportedNetworks.includes(filters.destinationNetwork) &&
            gateway.status === 'active'
        );
    }

    return gateways.filter(gateway => gateway.status === 'active');
}

/**
 * Estimate fee for a transfer
 * @param {Object} transferData Transfer data
 * @returns {Object} Fee estimation
 */
export function estimateTransferFee(transferData) {
    if (!transferData.sourceNetwork || !transferData.destinationNetwork || !transferData.transferSize) {
        throw new Error('Missing required transfer data for fee estimation');
    }

    const applicableGateways = getAvailableGateways({
        sourceNetwork: transferData.sourceNetwork,
        destinationNetwork: transferData.destinationNetwork
    });

    if (applicableGateways.length === 0) {
        throw new Error('No gateways available for the specified networks');
    }

    const estimations = applicableGateways.map(gateway => {
        const baseFee = gateway.fee;
        const size = transferData.transferSize;
        const calculatedFee = baseFee * size * _serviceConfig.gasFeeMultiplier;

        return {
            gatewayId: gateway.id,
            gatewayName: gateway.name,
            fee: calculatedFee,
            estimatedTime: gateway.averageTime,
            securityLevel: gateway.securityLevel
        };
    });

    estimations.sort((a, b) => a.fee - b.fee);

    return {
        estimations,
        recommended: estimations[0],
        fastest: estimations.sort((a, b) => a.estimatedTime - b.estimatedTime)[0],
        mostSecure: estimations.sort((a, b) => {
            const securityLevels = { low: 0, medium: 1, high: 2, very_high: 3 };
            return securityLevels[b.securityLevel] - securityLevels[a.securityLevel];
        })[0]
    };
}

/**
 * Get transfer statistics
 * @returns {Object} Transfer statistics
 */
export function getStatistics() {
    const allTransfers = Array.from(_transfers.values());

    const stats = {
        total: allTransfers.length,
        byStatus: {
            pending: allTransfers.filter(t => t.status === TRANSFER_STATUS.PENDING).length,
            processing: allTransfers.filter(t => t.status === TRANSFER_STATUS.PROCESSING).length,
            confirming: allTransfers.filter(t => t.status === TRANSFER_STATUS.CONFIRMING).length,
            completed: allTransfers.filter(t => t.status === TRANSFER_STATUS.COMPLETED).length,
            failed: allTransfers.filter(t => t.status === TRANSFER_STATUS.FAILED).length
        },
        byNetwork: {},
        byContentType: {},
        averageCompletionTime: 0,
        totalTransferredSize: 0
    };

    Object.values(BLOCKCHAIN_NETWORK).forEach(network => {
        stats.byNetwork[network] = {
            source: allTransfers.filter(t => t.sourceNetwork === network).length,
            destination: allTransfers.filter(t => t.destinationNetwork === network).length
        };
    });

    Object.values(CONTENT_TYPE).forEach(type => {
        stats.byContentType[type] = allTransfers.filter(t => t.contentType === type).length;
    });

    const completedTransfers = allTransfers.filter(t =>
        t.status === TRANSFER_STATUS.COMPLETED && t.startTime && t.completionTime
    );

    if (completedTransfers.length > 0) {
        const totalCompletionTime = completedTransfers.reduce((sum, t) =>
            sum + (t.completionTime - t.startTime), 0
        );
        stats.averageCompletionTime = totalCompletionTime / completedTransfers.length / 1000;
    }

    stats.totalTransferredSize = completedTransfers.reduce((sum, t) =>
        sum + (t.transferSize || 0), 0
    );

    return stats;
}

/**
 * Update service configuration
 * @param {Object} newConfig New configuration settings
 * @returns {Object} Updated configuration
 */
export function updateConfiguration(newConfig) {
    _serviceConfig = {
        ..._serviceConfig,
        ...newConfig
    };

    return { ..._serviceConfig };
}

/**
 * Get current service configuration
 * @returns {Object} Current configuration
 */
export function getConfiguration() {
    return { ..._serviceConfig };
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
        56: '0xdef...', // BNB Smart Chain
        80001: '0xabc...', // Mumbai Testnet
        // Add more networks as needed
    };
    
    return addresses[network];
}

/**
 * Find the optimal cross-chain transfer path
 * @param {Object} options Transfer options
 * @returns {Object} Transfer path information
 */
export async function findOptimalTransferPath(options) {
    const { sourceNetwork, destinationNetwork, optimize = 'balanced' } = options;
    
    // Get available gateways for these networks
    const availableGateways = await getAvailableGateways({
        sourceNetwork,
        destinationNetwork
    });
    
    // Get all networks (we should cache this in a production environment)
    const networks = Object.values(BLOCKCHAIN_NETWORK).map(id => ({
        id,
        name: id,
        type: 'blockchain'
    }));
    
    // Find optimal path
    const pathResult = findOptimalCrossChainPath(
        networks,
        availableGateways,
        sourceNetwork,
        destinationNetwork,
        { optimize }
    );
    
    if (!pathResult) {
        throw new Error(`No valid transfer path between ${sourceNetwork} and ${destinationNetwork}`);
    }
    
    // Extract gateway information from the path
    const gateways = pathResult.edges.map(edge => {
        const gatewayId = edge.metadata?.gatewayId;
        return availableGateways.find(g => g.id === gatewayId);
    });
    
    return {
        path: pathResult.path,
        distance: pathResult.distance,
        gateways,
        hops: pathResult.path.length - 1
    };
}

// Export as a named object for better imports
export const JerusalemProtocolService = {
    initialize,
    createTransfer,
    getTransferById,
    getTransfersByUser,
    confirmTransfer,
    retryTransfer,
    cancelTransfer,
    getAvailableGateways,
    estimateTransferFee,
    getStatistics,
    updateConfiguration,
    getConfiguration,
    findOptimalTransferPath,
    BLOCKCHAIN_NETWORK,
    TRANSFER_STATUS,
    CONTENT_TYPE
};

export default JerusalemProtocolService;
