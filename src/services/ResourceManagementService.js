/**
 * Resource Management Service (RM)
 * 
 * Provides secure content and resource management operations
 * for the Web3 Crypto Streaming platform, including soft and hard deletion,
 * archiving, and permission-based access control.
 */

import * as BlockchainService from './BlockchainService';
import * as SecurityService from './RiceAdvancedNetworkSecurityService';
import * as JerusalemProtocolService from './JerusalemProtocolService';
import * as FateChexService from './FateChexService';
import * as OnchainPermissionManagerService from './OnchainPermissionManagerService';

// Resource types
export const RESOURCE_TYPE = {
    CONTENT: 'content',
    STREAM: 'stream',
    COLLECTION: 'collection',
    COMMENT: 'comment',
    PROFILE: 'profile',
    TRANSFER: 'transfer',
    TOKEN: 'token',
    CONTRACT: 'contract'
};

// Removal operation types
export const REMOVAL_TYPE = {
    SOFT_DELETE: 'soft_delete',   // Marks as deleted but retains data
    HARD_DELETE: 'hard_delete',   // Completely removes data
    ARCHIVE: 'archive',           // Moves to archive storage
    HIDE: 'hide',                 // Makes invisible but easily recoverable
    QUARANTINE: 'quarantine'      // Isolates for security review
};

// Removal status
export const REMOVAL_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REVERTED: 'reverted'
};

// Service state
let initialized = false;
const removals = new Map();
const userRemovals = new Map();
const resourceMetadata = new Map();
let serviceConfig = {
    defaultRemovalType: REMOVAL_TYPE.SOFT_DELETE,
    requireSecurityVerification: true,
    requireOwnershipVerification: true,
    requirePermissionCheck: true,
    retentionPolicy: {
        [RESOURCE_TYPE.CONTENT]: 30, // days before hard delete
        [RESOURCE_TYPE.STREAM]: 14,
        [RESOURCE_TYPE.COMMENT]: 7,
        default: 30
    },
    archiveStorage: 'ipfs', // 'ipfs', 'arweave', or 'filecoin'
    automaticBackup: true
};

/**
 * Initialize the Resource Management Service
 * @param {Object} options Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initialize(options = {}) {
    if (initialized) {
        return true;
    }

    try {
        console.log('Initializing Resource Management Service...');
        
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
        
        // Load user data if wallet is connected
        if (BlockchainService.isConnected()) {
            const userAddress = BlockchainService.getCurrentAccount();
            await _loadUserRemovals(userAddress);
        }
        
        // Set up retention policy management
        _setupRetentionPolicyEnforcement();
        
        initialized = true;
        console.log('Resource Management Service initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Resource Management Service:', error);
        return false;
    }
}

/**
 * Load user's removal history
 * @param {string} userAddress User's wallet address
 * @returns {Promise<Array>} User's removals
 * @private
 */
async function _loadUserRemovals(userAddress) {
    if (!userAddress) return [];
    
    try {
        const normalizedAddress = userAddress.toLowerCase();
        
        // Generate sample removals for demonstration
        const sampleRemovals = _generateSampleRemovals(normalizedAddress);
        
        // Store removals
        sampleRemovals.forEach(removal => {
            removals.set(removal.id, removal);
        });
        
        userRemovals.set(normalizedAddress, sampleRemovals.map(r => r.id));
        
        return sampleRemovals;
    } catch (error) {
        console.error(`Error loading removals for ${userAddress}:`, error);
        return [];
    }
}

/**
 * Generate sample removals for a user
 * @param {string} userAddress User address
 * @returns {Array} Sample removals
 * @private
 */
function _generateSampleRemovals(userAddress) {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    const addressSeed = parseInt(userAddress.slice(2, 10), 16);
    const removalCount = (addressSeed % 3) + 2; // 2-4 removals
    
    const sampleRemovals = [];
    const resourceTypes = Object.values(RESOURCE_TYPE);
    const removalTypes = Object.values(REMOVAL_TYPE);
    const statuses = Object.values(REMOVAL_STATUS);
    
    for (let i = 0; i < removalCount; i++) {
        const resourceType = resourceTypes[i % resourceTypes.length];
        const removalType = removalTypes[i % removalTypes.length];
        const status = i === 0 ? REMOVAL_STATUS.PENDING : statuses[(i + 2) % statuses.length];
        
        const removal = {
            id: `rm_${now - i * day}_${Math.random().toString(36).substring(2, 10)}`,
            userId: userAddress,
            resourceType,
            resourceId: `${resourceType}_${Math.random().toString(36).substring(2, 10)}`,
            removalType,
            status,
            requestTime: now - (i * day) - Math.floor(Math.random() * day),
            completionTime: status === REMOVAL_STATUS.COMPLETED || status === REMOVAL_STATUS.FAILED ? 
                now - Math.floor(Math.random() * day) : null,
            reason: "User requested removal",
            securityVerification: serviceConfig.requireSecurityVerification ? 
                `verification_${Math.random().toString(36).substring(2, 10)}` : null,
            backup: serviceConfig.automaticBackup && status === REMOVAL_STATUS.COMPLETED ? 
                { storageType: serviceConfig.archiveStorage, reference: `backup_${Math.random().toString(36).substring(2, 15)}` } : null,
            error: status === REMOVAL_STATUS.FAILED ? {
                code: 'PERMISSION_ERROR',
                message: 'User does not have sufficient permissions',
                details: 'Resource is protected by contract limitations'
            } : null
        };
        
        sampleRemovals.push(removal);
    }
    
    return sampleRemovals;
}

/**
 * Set up retention policy enforcement
 * @private
 */
function _setupRetentionPolicyEnforcement() {
    // Run daily retention policy check
    const DAY = 24 * 60 * 60 * 1000;
    setInterval(() => {
        _enforceRetentionPolicy();
    }, DAY);
}

/**
 * Enforce retention policy on soft-deleted resources
 * @private
 */
function _enforceRetentionPolicy() {
    const now = Date.now();
    
    // Check all removals for resources that should be hard deleted
    for (const [id, removal] of removals.entries()) {
        if (removal.removalType !== REMOVAL_TYPE.SOFT_DELETE || removal.status !== REMOVAL_STATUS.COMPLETED) {
            continue;
        }
        
        // Get retention period for this resource type
        const retentionDays = serviceConfig.retentionPolicy[removal.resourceType] || 
                              serviceConfig.retentionPolicy.default;
        const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
        
        // Check if retention period has passed
        if (removal.completionTime && (now - removal.completionTime) > retentionMs) {
            // Upgrade to hard delete
            console.log(`Retention period expired for ${removal.resourceType} ${removal.resourceId}, hard deleting`);
            _upgradeToHardDelete(removal);
        }
    }
}

/**
 * Upgrade a soft delete to hard delete
 * @param {Object} removal Removal object
 * @private
 */
async function _upgradeToHardDelete(removal) {
    try {
        // Create backup if configured
        if (serviceConfig.automaticBackup && !removal.backup) {
            removal.backup = await _createBackup(removal.resourceType, removal.resourceId);
        }
        
        // Update removal
        const hardDeleteRemoval = {
            ...removal,
            removalType: REMOVAL_TYPE.HARD_DELETE,
            status: REMOVAL_STATUS.COMPLETED,
            completionTime: Date.now(),
            reason: `${removal.reason} (Retention policy enforcement)`
        };
        
        removals.set(removal.id, hardDeleteRemoval);
        
        // In a real implementation, actually delete the data here
    } catch (error) {
        console.error(`Error upgrading to hard delete for ${removal.id}:`, error);
    }
}

/**
 * Create a backup of a resource before deletion
 * @param {string} resourceType Resource type
 * @param {string} resourceId Resource ID
 * @returns {Promise<Object>} Backup information
 * @private
 */
async function _createBackup(resourceType, resourceId) {
    // In a real implementation, this would create an actual backup
    // For this example, we'll simulate it
    
    const storageType = serviceConfig.archiveStorage;
    const reference = `backup_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    return {
        storageType,
        reference,
        timestamp: Date.now()
    };
}

/**
 * Remove a resource
 * @param {string} resourceType Resource type
 * @param {string} resourceId Resource ID
 * @param {Object} options Removal options
 * @returns {Promise<Object>} Removal result
 */
export async function removeResource(resourceType, resourceId, options = {}) {
    if (!initialized) {
        await initialize();
    }
    
    if (!BlockchainService.isConnected()) {
        throw new Error('Wallet must be connected to remove resources');
    }
    
    try {
        const userAddress = BlockchainService.getCurrentAccount();
        
        // Check for required parameters
        if (!resourceType || !resourceId) {
            throw new Error('Missing required resource information');
        }
        
        // Verify resource type is valid
        if (!Object.values(RESOURCE_TYPE).includes(resourceType)) {
            throw new Error(`Invalid resource type: ${resourceType}`);
        }
        
        // Get removal type (default or specified)
        const removalType = options.removalType || serviceConfig.defaultRemovalType;
        
        // Verify removal type is valid
        if (!Object.values(REMOVAL_TYPE).includes(removalType)) {
            throw new Error(`Invalid removal type: ${removalType}`);
        }
        
        // Verify permissions if required
        if (serviceConfig.requirePermissionCheck) {
            const hasPermission = await _checkRemovalPermission(userAddress, resourceType, resourceId);
            if (!hasPermission) {
                throw new Error(`Insufficient permissions to remove ${resourceType} ${resourceId}`);
            }
        }
        
        // Create security verification if required
        let securityVerificationId = null;
        if (serviceConfig.requireSecurityVerification) {
            securityVerificationId = await _createSecurityVerification(resourceType, resourceId);
        }
        
        // Create removal ID
        const removalId = `rm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        
        // Create removal record
        const removal = {
            id: removalId,
            userId: userAddress,
            resourceType,
            resourceId,
            removalType,
            status: REMOVAL_STATUS.PENDING,
            requestTime: Date.now(),
            completionTime: null,
            reason: options.reason || 'User requested removal',
            securityVerification: securityVerificationId,
            backup: null,
            error: null
        };
        
        // Store removal
        removals.set(removalId, removal);
        
        // Add to user removals
        const normalizedAddress = userAddress.toLowerCase();
        let userRemovalIds = userRemovals.get(normalizedAddress) || [];
        userRemovalIds = [removalId, ...userRemovalIds];
        userRemovals.set(normalizedAddress, userRemovalIds);
        
        // Process removal
        _processRemoval(removalId);
        
        return {
            success: true,
            message: 'Resource removal initiated',
            removal,
            immediate: false
        };
    } catch (error) {
        console.error('Error removing resource:', error);
        throw error;
    }
}

/**
 * Check if user has permission to remove a resource
 * @param {string} userAddress User address
 * @param {string} resourceType Resource type
 * @param {string} resourceId Resource ID
 * @returns {Promise<boolean>} Whether user has permission
 * @private
 */
async function _checkRemovalPermission(userAddress, resourceType, resourceId) {
    try {
        // Check ownership first
        const isOwner = await _checkResourceOwnership(userAddress, resourceType, resourceId);
        if (isOwner) {
            return true;
        }
        
        // If not owner, check permission level through OnchainPermissionManager
        try {
            // Map resource type to OPM resource type
            const opmResourceType = resourceType.toUpperCase();
            
            // Check if user has MANAGE permission level or higher
            const hasPermission = await OnchainPermissionManagerService.hasPermission(
                userAddress,
                opmResourceType,
                resourceId,
                OnchainPermissionManagerService.PERMISSION_LEVELS.MANAGE
            );
            
            return hasPermission;
        } catch (opmError) {
            console.warn('Error checking OPM permissions:', opmError);
            return false;
        }
    } catch (error) {
        console.error('Error checking removal permission:', error);
        return false;
    }
}

/**
 * Check if user owns a resource
 * @param {string} userAddress User address
 * @param {string} resourceType Resource type
 * @param {string} resourceId Resource ID
 * @returns {Promise<boolean>} Whether user is the resource owner
 * @private
 */
async function _checkResourceOwnership(userAddress, resourceType, resourceId) {
    try {
        // For demonstration, we'll use a simple check
        // In a real implementation, this would check blockchain data
        
        // Get resource metadata
        const resourceKey = `${resourceType}:${resourceId}`;
        const metadata = resourceMetadata.get(resourceKey);
        
        // For demonstration, assume 50% chance user owns the resource
        // In a real implementation, this would be an actual ownership check
        if (metadata) {
            return metadata.owner.toLowerCase() === userAddress.toLowerCase();
        } else {
            return Math.random() > 0.5;
        }
    } catch (error) {
        console.error('Error checking resource ownership:', error);
        return false;
    }
}

/**
 * Create security verification for resource removal
 * @param {string} resourceType Resource type
 * @param {string} resourceId Resource ID
 * @returns {Promise<string>} Verification ID
 * @private
 */
async function _createSecurityVerification(resourceType, resourceId) {
    try {
        // Use FateChex for verification
        const verificationRequest = {
            targetType: resourceType,
            targetId: resourceId,
            algorithm: FateChexService.VERIFICATION_ALGORITHM.QUANTUM_ENTROPY,
            parameters: {
                depth: 2,
                entropySource: 'resource_management',
                operation: 'remove',
                quantumRounds: 3
            }
        };
        
        const result = await FateChexService.createVerification(verificationRequest);
        
        if (result.success) {
            // Execute verification
            FateChexService.executeVerification(result.verification.id);
            return result.verification.id;
        } else {
            throw new Error('Failed to create security verification');
        }
    } catch (error) {
        console.error('Error creating security verification:', error);
        return null;
    }
}

/**
 * Process a removal request
 * @param {string} removalId Removal ID
 * @private
 */
function _processRemoval(removalId) {
    const removal = removals.get(removalId);
    if (!removal || removal.status !== REMOVAL_STATUS.PENDING) {
        return;
    }
    
    // Update to in-progress
    removal.status = REMOVAL_STATUS.IN_PROGRESS;
    removals.set(removalId, {...removal});
    
    // Simulate processing time based on removal type
    let processingTime;
    switch(removal.removalType) {
        case REMOVAL_TYPE.HARD_DELETE:
            processingTime = 3000 + Math.random() * 2000;
            break;
        case REMOVAL_TYPE.SOFT_DELETE:
            processingTime = 1000 + Math.random() * 1000;
            break;
        case REMOVAL_TYPE.ARCHIVE:
            processingTime = 5000 + Math.random() * 3000;
            break;
        case REMOVAL_TYPE.HIDE:
            processingTime = 500 + Math.random() * 500;
            break;
        case REMOVAL_TYPE.QUARANTINE:
            processingTime = 2000 + Math.random() * 1000;
            break;
        default:
            processingTime = 2000;
    }
    
    setTimeout(async () => {
        // Small chance of failure
        const failureChance = 0.1;
        if (Math.random() < failureChance) {
            removal.status = REMOVAL_STATUS.FAILED;
            removal.error = {
                code: 'PROCESSING_ERROR',
                message: 'Failed to process resource removal',
                details: 'The resource could not be removed due to a processing error'
            };
            removal.completionTime = Date.now();
            removals.set(removalId, {...removal});
            return;
        }
        
        // Create backup if configured and appropriate
        if (serviceConfig.automaticBackup && 
            (removal.removalType === REMOVAL_TYPE.HARD_DELETE || 
             removal.removalType === REMOVAL_TYPE.SOFT_DELETE)) {
            removal.backup = await _createBackup(removal.resourceType, removal.resourceId);
        }
        
        // Complete removal
        removal.status = REMOVAL_STATUS.COMPLETED;
        removal.completionTime = Date.now();
        removals.set(removalId, {...removal});
        
        console.log(`Resource removal ${removalId} completed: ${removal.resourceType} ${removal.resourceId}`);
        
        // In a real implementation, perform actual resource removal here
    }, processingTime);
}

/**
 * Get a removal by ID
 * @param {string} removalId Removal ID
 * @returns {Promise<Object|null>} Removal data or null if not found
 */
export async function getRemovalById(removalId) {
    if (!initialized) {
        await initialize();
    }
    
    return removals.get(removalId) || null;
}

/**
 * Get all removals for a user
 * @param {string} userAddress User's wallet address (optional)
 * @returns {Promise<Array>} User's removals
 */
export async function getRemovalsByUser(userAddress) {
    if (!initialized) {
        await initialize();
    }
    
    const address = userAddress || 
        (BlockchainService.isConnected() ? BlockchainService.getCurrentAccount() : null);
    
    if (!address) {
        return [];
    }
    
    const normalizedAddress = address.toLowerCase();
    const userRemovalIds = userRemovals.get(normalizedAddress) || [];
    
    return userRemovalIds
        .map(id => removals.get(id))
        .filter(Boolean);
}

/**
 * Revert a removal
 * @param {string} removalId Removal ID
 * @returns {Promise<Object>} Revert result
 */
export async function revertRemoval(removalId) {
    if (!initialized) {
        await initialize();
    }
    
    if (!BlockchainService.isConnected()) {
        throw new Error('Wallet must be connected to revert removals');
    }
    
    const removal = removals.get(removalId);
    if (!removal) {
        throw new Error(`Removal not found: ${removalId}`);
    }
    
    const userAddress = BlockchainService.getCurrentAccount();
    if (removal.userId.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Only the remover can revert this removal');
    }
    
    // Can only revert completed removals that aren't hard deletes
    if (removal.status !== REMOVAL_STATUS.COMPLETED) {
        return {
            success: false,
            message: `Removal cannot be reverted in ${removal.status} status`,
            removal
        };
    }
    
    if (removal.removalType === REMOVAL_TYPE.HARD_DELETE) {
        return {
            success: false,
            message: `Hard deletions cannot be reverted`,
            removal
        };
    }
    
    try {
        // Update removal status
        removal.status = REMOVAL_STATUS.REVERTED;
        removals.set(removalId, {...removal});
        
        return {
            success: true,
            message: 'Removal reverted successfully',
            removal: removals.get(removalId)
        };
    } catch (error) {
        console.error('Error reverting removal:', error);
        throw error;
    }
}

/**
 * Get removal statistics
 * @returns {Object} Removal statistics
 */
export function getStatistics() {
    const allRemovals = Array.from(removals.values());
    
    const stats = {
        total: allRemovals.length,
        byStatus: {
            pending: allRemovals.filter(r => r.status === REMOVAL_STATUS.PENDING).length,
            in_progress: allRemovals.filter(r => r.status === REMOVAL_STATUS.IN_PROGRESS).length,
            completed: allRemovals.filter(r => r.status === REMOVAL_STATUS.COMPLETED).length,
            failed: allRemovals.filter(r => r.status === REMOVAL_STATUS.FAILED).length,
            reverted: allRemovals.filter(r => r.status === REMOVAL_STATUS.REVERTED).length
        },
        byType: {
            soft_delete: allRemovals.filter(r => r.removalType === REMOVAL_TYPE.SOFT_DELETE).length,
            hard_delete: allRemovals.filter(r => r.removalType === REMOVAL_TYPE.HARD_DELETE).length,
            archive: allRemovals.filter(r => r.removalType === REMOVAL_TYPE.ARCHIVE).length,
            hide: allRemovals.filter(r => r.removalType === REMOVAL_TYPE.HIDE).length,
            quarantine: allRemovals.filter(r => r.removalType === REMOVAL_TYPE.QUARANTINE).length
        },
        byResourceType: {},
        averageProcessingTime: 0
    };
    
    // Calculate stats for each resource type
    Object.values(RESOURCE_TYPE).forEach(resourceType => {
        stats.byResourceType[resourceType] = allRemovals.filter(r => r.resourceType === resourceType).length;
    });
    
    // Calculate average processing time
    const completedRemovals = allRemovals.filter(r => 
        (r.status === REMOVAL_STATUS.COMPLETED || r.status === REMOVAL_STATUS.FAILED) && 
        r.requestTime && r.completionTime
    );
    
    if (completedRemovals.length > 0) {
        const totalTime = completedRemovals.reduce((sum, r) => 
            sum + (r.completionTime - r.requestTime), 0
        );
        stats.averageProcessingTime = totalTime / completedRemovals.length / 1000; // in seconds
    }
    
    return stats;
}

/**
 * Update service configuration
 * @param {Object} newConfig New configuration settings
 * @returns {Object} Updated configuration
 */
export function updateConfiguration(newConfig) {
    serviceConfig = {
        ...serviceConfig,
        ...newConfig
    };
    
    return { ...serviceConfig };
}

/**
 * Get current service configuration
 * @returns {Object} Current configuration
 */
export function getConfiguration() {
    return { ...serviceConfig };
}

export default {
    initialize,
    removeResource,
    getRemovalById,
    getRemovalsByUser,
    revertRemoval,
    getStatistics,
    updateConfiguration,
    getConfiguration,
    RESOURCE_TYPE,
    REMOVAL_TYPE,
    REMOVAL_STATUS
};
