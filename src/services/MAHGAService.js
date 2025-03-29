/**
 * Multi-Asset Hybrid Gateway Adapter (MAHGA) Service
 * 
 * Provides a unified interface for interacting with multiple blockchain networks
 * through different bridge mechanisms, optimizing for cost, speed, and security.
 */

import { ethers } from 'ethers';
import * as BlockchainService from './BlockchainService';
import * as SecurityService from './RiceAdvancedNetworkSecurityService';
import { findOptimalCrossChainPath } from '../utils/ShortestPathFinder';
import * as JerusalemProtocolService from './JerusalemProtocolService';

// Constants
export const TRANSFER_STATUS = {
  PENDING: 'pending',
  APPROVING: 'approving',
  BRIDGING: 'bridging',
  CONFIRMING: 'confirming',
  FINALIZING: 'finalizing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

export const OPTIMIZATION_TYPE = {
  COST: 'cost',
  SPEED: 'speed',
  SECURITY: 'security',
  BALANCED: 'balanced'
};

// Service state
let initialized = false;
let serviceConfig = {
  enabledNetworks: ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism'],
  defaultOptimization: OPTIMIZATION_TYPE.BALANCED,
  autoSelectBridge: true,
  defaultSlippage: 0.5, // 0.5%
  useTrustedBridgesOnly: true,
  processingTimeout: 20 * 60 * 1000, // 20 minutes
  enabledGateways: ['jerusalem', 'wormhole', 'layerzero', 'stargate', 'axelar', 'celer']
};

// Track active transfers
const activeTransfers = new Map();

/**
 * Initialize the MAHGA service
 * @param {Object} options Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initialize(options = {}) {
  if (initialized) {
    return true;
  }

  try {
    console.log('Initializing MAHGA Service...');
    
    // Apply configuration options
    if (options.config) {
      serviceConfig = {
        ...serviceConfig,
        ...options.config
      };
    }

    // Initialize required services
    if (!BlockchainService.isInitialized()) {
      await BlockchainService.initialize();
    }
    
    if (serviceConfig.useTrustedBridgesOnly) {
      await SecurityService.initSecurityService();
    }

    // Initialize Jerusalem Protocol for cross-chain transfers
    await JerusalemProtocolService.initialize();
    
    initialized = true;
    console.log('MAHGA Service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize MAHGA Service:', error);
    return false;
  }
}

/**
 * Get available gateways for source and destination networks
 * @param {string} sourceNetwork Source network identifier
 * @param {string} destinationNetwork Destination network identifier
 * @returns {Promise<Array>} Available gateways
 */
export async function getAvailableGateways(sourceNetwork, destinationNetwork) {
  if (!initialized) {
    await initialize();
  }
  
  // Get all available gateways
  const availableGateways = [];
  
  // Check Jerusalem Protocol bridge
  if (serviceConfig.enabledGateways.includes('jerusalem')) {
    const jerusalemGateways = await JerusalemProtocolService.getAvailableGateways({
      sourceNetwork,
      destinationNetwork
    });
    availableGateways.push(...jerusalemGateways);
  }
  
  // Add other bridge implementations
  // ...implementation code for other bridge types...
  
  // Filter by trusted status if required
  let filteredGateways = availableGateways;
  if (serviceConfig.useTrustedBridgesOnly) {
    filteredGateways = filteredGateways.filter(gw => gw.trusted);
  }
  
  return filteredGateways;
}

/**
 * Find the optimal path between networks
 * @param {string} sourceNetwork Source network
 * @param {string} destinationNetwork Destination network
 * @param {Object} options Path finding options
 * @returns {Promise<Object>} Optimal path
 */
export async function findOptimalPath(sourceNetwork, destinationNetwork, options = {}) {
  if (!initialized) {
    await initialize();
  }
  
  const optimize = options.optimize || serviceConfig.defaultOptimization;
  
  // Get all enabled networks
  const networks = serviceConfig.enabledNetworks.map(id => ({
    id,
    name: id,
    type: 'blockchain'
  }));
  
  // Get available gateways between these networks
  const gateways = await getAvailableGateways(sourceNetwork, destinationNetwork);
  
  // Find optimal path
  const pathResult = findOptimalCrossChainPath(
    networks,
    gateways,
    sourceNetwork,
    destinationNetwork,
    { optimize }
  );
  
  if (!pathResult) {
    throw new Error(`No valid path between ${sourceNetwork} and ${destinationNetwork}`);
  }
  
  // Extract gateway information from the path
  const gatewaysInPath = pathResult.edges.map(edge => {
    const gatewayId = edge.metadata?.gatewayId;
    return gateways.find(g => g.id === gatewayId);
  });
  
  return {
    path: pathResult.path,
    distance: pathResult.distance,
    gateways: gatewaysInPath,
    hops: pathResult.path.length - 1,
    estimatedTime: _estimateTransferTime(gatewaysInPath),
    estimatedFee: _estimateTotalFee(gatewaysInPath, options.amount || 0)
  };
}

/**
 * Estimate transfer time based on gateways
 * @param {Array} gateways Array of gateways
 * @returns {number} Estimated time in seconds
 * @private
 */
function _estimateTransferTime(gateways) {
  if (!gateways || gateways.length === 0) {
    return 0;
  }
  
  // Sum up time estimates for each gateway
  return gateways.reduce((total, gateway) => {
    const baseTime = gateway.averageTimeSeconds || 300; // Default 5 minutes
    return total + baseTime;
  }, 0);
}

/**
 * Estimate total fee for transfer
 * @param {Array} gateways Array of gateways
 * @param {number} amount Amount to transfer
 * @returns {Object} Fee estimates
 * @private
 */
function _estimateTotalFee(gateways, amount) {
  if (!gateways || gateways.length === 0 || !amount) {
    return { total: 0, breakdown: [] };
  }
  
  const breakdown = gateways.map(gateway => {
    const percentage = gateway.feePercentage || 0.3; // Default 0.3%
    const fixedFee = gateway.fixedFee || 0;
    const calculatedFee = (amount * percentage / 100) + fixedFee;
    
    return {
      gateway: gateway.id,
      name: gateway.name,
      percentage,
      fixed: fixedFee,
      fee: calculatedFee
    };
  });
  
  // Calculate total fee
  const total = breakdown.reduce((sum, item) => sum + item.fee, 0);
  
  return {
    total,
    breakdown
  };
}

/**
 * Execute a cross-chain transfer
 * @param {Object} transferParams Transfer parameters
 * @returns {Promise<Object>} Transfer result with tracking ID
 */
export async function executeTransfer(transferParams) {
  if (!initialized) {
    await initialize();
  }
  
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet not connected. Please connect your wallet first.');
  }
  
  const {
    sourceNetwork,
    destinationNetwork,
    amount,
    token,
    recipient,
    optimize = serviceConfig.defaultOptimization,
    slippage = serviceConfig.defaultSlippage
  } = transferParams;
  
  if (!sourceNetwork || !destinationNetwork) {
    throw new Error('Source and destination networks are required');
  }
  
  if (!amount || amount <= 0) {
    throw new Error('Invalid transfer amount');
  }
  
  if (!token) {
    throw new Error('Token is required');
  }
  
  if (!recipient) {
    throw new Error('Recipient address is required');
  }
  
  try {
    // Find optimal path first
    const pathInfo = await findOptimalPath(sourceNetwork, destinationNetwork, {
      optimize,
      amount
    });
    
    // Generate a unique transfer ID
    const transferId = `mahga-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create a transfer record
    const transfer = {
      id: transferId,
      sourceNetwork,
      destinationNetwork,
      amount,
      token,
      recipient,
      optimization: optimize,
      slippage,
      path: pathInfo.path,
      gateways: pathInfo.gateways,
      status: TRANSFER_STATUS.PENDING,
      startTime: Date.now(),
      estimatedCompletionTime: Date.now() + (pathInfo.estimatedTime * 1000),
      estimatedFee: pathInfo.estimatedFee,
      steps: [],
      currentStep: 0
    };
    
    // Save transfer record
    activeTransfers.set(transferId, transfer);
    
    // Process transfer asynchronously
    _processTransfer(transferId);
    
    return {
      transferId,
      status: TRANSFER_STATUS.PENDING,
      estimatedTime: pathInfo.estimatedTime,
      estimatedFee: pathInfo.estimatedFee,
      path: pathInfo.path
    };
  } catch (error) {
    console.error('Error executing cross-chain transfer:', error);
    throw error;
  }
}

/**
 * Process a transfer through all required steps
 * @param {string} transferId Transfer ID
 * @private
 */
async function _processTransfer(transferId) {
  const transfer = activeTransfers.get(transferId);
  if (!transfer) {
    console.error(`Transfer ${transferId} not found`);
    return;
  }
  
  try {
    // Update status to processing
    transfer.status = TRANSFER_STATUS.APPROVING;
    activeTransfers.set(transferId, { ...transfer });
    
    // Execute each hop in the path
    for (let i = 0; i < transfer.path.length - 1; i++) {
      const sourceChain = transfer.path[i];
      const targetChain = transfer.path[i + 1];
      const gateway = transfer.gateways[i];
      
      // Add step to transfer record
      const step = {
        from: sourceChain,
        to: targetChain,
        gateway: gateway.id,
        status: TRANSFER_STATUS.PENDING,
        startTime: Date.now()
      };
      
      transfer.steps.push(step);
      transfer.currentStep = i;
      
      // Update transfer record
      activeTransfers.set(transferId, { ...transfer });
      
      // Execute the transfer through the appropriate gateway
      if (gateway.protocol === 'jerusalem') {
        await _processJerusalemTransfer(transferId, i);
      } else {
        // Other gateway implementations would go here
        throw new Error(`Gateway protocol ${gateway.protocol} not implemented`);
      }
      
      // Update step status
      step.status = TRANSFER_STATUS.COMPLETED;
      step.completionTime = Date.now();
      
      // Update transfer record
      activeTransfers.set(transferId, { ...transfer });
    }
    
    // Complete the transfer
    transfer.status = TRANSFER_STATUS.COMPLETED;
    transfer.completionTime = Date.now();
    activeTransfers.set(transferId, { ...transfer });
    
  } catch (error) {
    console.error(`Error processing transfer ${transferId}:`, error);
    
    // Update transfer status to failed
    transfer.status = TRANSFER_STATUS.FAILED;
    transfer.error = error.message;
    activeTransfers.set(transferId, { ...transfer });
  }
}

/**
 * Process a transfer through Jerusalem Protocol
 * @param {string} transferId Transfer ID
 * @param {number} stepIndex Step index
 * @private
 */
async function _processJerusalemTransfer(transferId, stepIndex) {
  const transfer = activeTransfers.get(transferId);
  if (!transfer) {
    throw new Error(`Transfer ${transferId} not found`);
  }
  
  const step = transfer.steps[stepIndex];
  if (!step) {
    throw new Error(`Step ${stepIndex} not found in transfer ${transferId}`);
  }
  
  try {
    step.status = TRANSFER_STATUS.BRIDGING;
    activeTransfers.set(transferId, { ...transfer });
    
    // Call Jerusalem Protocol service to execute transfer
    const result = await JerusalemProtocolService.executeTransfer({
      sourceNetwork: step.from,
      destinationNetwork: step.to,
      token: transfer.token,
      amount: transfer.amount,
      recipient: stepIndex === transfer.steps.length - 1 ? transfer.recipient : undefined,
      slippage: transfer.slippage
    });
    
    step.txHash = result.txHash;
    step.status = TRANSFER_STATUS.CONFIRMING;
    activeTransfers.set(transferId, { ...transfer });
    
    // Wait for confirmation
    await JerusalemProtocolService.waitForTransferConfirmation(result.txHash);
    
    step.status = TRANSFER_STATUS.COMPLETED;
    step.completionTime = Date.now();
    activeTransfers.set(transferId, { ...transfer });
    
    return result;
  } catch (error) {
    console.error(`Error processing Jerusalem transfer ${transferId}:`, error);
    
    step.status = TRANSFER_STATUS.FAILED;
    step.error = error.message;
    activeTransfers.set(transferId, { ...transfer });
    
    throw error;
  }
}

/**
 * Get transfer status
 * @param {string} transferId Transfer ID
 * @returns {Promise<Object>} Transfer status
 */
export async function getTransferStatus(transferId) {
  if (!initialized) {
    await initialize();
  }
  
  const transfer = activeTransfers.get(transferId);
  if (!transfer) {
    throw new Error(`Transfer ${transferId} not found`);
  }
  
  return {
    id: transfer.id,
    status: transfer.status,
    sourceNetwork: transfer.sourceNetwork,
    destinationNetwork: transfer.destinationNetwork,
    amount: transfer.amount,
    token: transfer.token,
    startTime: transfer.startTime,
    completionTime: transfer.completionTime,
    estimatedCompletionTime: transfer.estimatedCompletionTime,
    currentStep: transfer.currentStep,
    progress: _calculateTransferProgress(transfer),
    steps: transfer.steps,
    error: transfer.error
  };
}

/**
 * Calculate transfer progress percentage
 * @param {Object} transfer Transfer object
 * @returns {number} Progress percentage (0-100)
 * @private
 */
function _calculateTransferProgress(transfer) {
  if (!transfer || !transfer.steps || transfer.steps.length === 0) {
    return 0;
  }
  
  if (transfer.status === TRANSFER_STATUS.COMPLETED) {
    return 100;
  }
  
  if (transfer.status === TRANSFER_STATUS.FAILED) {
    // Calculate how far it got before failing
    const completedSteps = transfer.steps.filter(step => 
      step.status === TRANSFER_STATUS.COMPLETED
    ).length;
    
    return Math.floor((completedSteps / transfer.steps.length) * 100);
  }
  
  const completedSteps = transfer.steps.filter(step => 
    step.status === TRANSFER_STATUS.COMPLETED
  ).length;
  
  const currentStepIndex = transfer.currentStep;
  const currentStep = transfer.steps[currentStepIndex];
  
  if (!currentStep || currentStep.status === TRANSFER_STATUS.PENDING) {
    return Math.floor((completedSteps / transfer.steps.length) * 100);
  }
  
  // Estimate progress within current step
  let currentStepProgress = 0;
  switch(currentStep.status) {
    case TRANSFER_STATUS.APPROVING:
      currentStepProgress = 0.2;
      break;
    case TRANSFER_STATUS.BRIDGING:
      currentStepProgress = 0.5;
      break;
    case TRANSFER_STATUS.CONFIRMING:
      currentStepProgress = 0.8;
      break;
    case TRANSFER_STATUS.FINALIZING:
      currentStepProgress = 0.9;
      break;
    default:
      currentStepProgress = 0;
  }
  
  // Calculate overall progress
  const stepSize = 100 / transfer.steps.length;
  const completedStepsProgress = completedSteps * stepSize;
  const currentStepContribution = currentStepProgress * stepSize;
  
  return Math.min(Math.floor(completedStepsProgress + currentStepContribution), 99);
}

/**
 * Get all active transfers
 * @returns {Promise<Array>} Array of active transfers
 */
export async function getActiveTransfers() {
  if (!initialized) {
    await initialize();
  }
  
  const transfers = Array.from(activeTransfers.values());
  return transfers.map(transfer => ({
    id: transfer.id,
    sourceNetwork: transfer.sourceNetwork,
    destinationNetwork: transfer.destinationNetwork,
    amount: transfer.amount,
    token: transfer.token,
    status: transfer.status,
    startTime: transfer.startTime,
    progress: _calculateTransferProgress(transfer)
  }));
}

/**
 * Get service configuration
 * @returns {Object} Current configuration
 */
export function getConfiguration() {
  return { ...serviceConfig };
}

/**
 * Update service configuration
 * @param {Object} newConfig New configuration
 * @returns {Object} Updated configuration
 */
export function updateConfiguration(newConfig = {}) {
  serviceConfig = {
    ...serviceConfig,
    ...newConfig
  };
  
  return { ...serviceConfig };
}

export default {
  initialize,
  getAvailableGateways,
  findOptimalPath,
  executeTransfer,
  getTransferStatus,
  getActiveTransfers,
  getConfiguration,
  updateConfiguration,
  TRANSFER_STATUS,
  OPTIMIZATION_TYPE
};
