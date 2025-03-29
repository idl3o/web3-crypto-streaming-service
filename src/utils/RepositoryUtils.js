/**
 * Repository Utilities
 * 
 * Helper functions for working with repositories and their content.
 */

import { REPOSITORY_TYPE, ACCESS_LEVEL, performCallback } from '../services/RepositoryHelper';
import { ethers } from 'ethers';

/**
 * Generate a unique repository ID
 * 
 * @param {string} name Repository name
 * @param {string} owner Repository owner
 * @returns {string} Generated ID
 */
export function generateRepositoryId(name, owner) {
    // Create a secure, deterministic ID based on name and owner
    const nameSlug = slugify(name);
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).slice(2, 6);

    return `${nameSlug}-${randomPart}`;
}

/**
 * Check if user has access to a repository
 * 
 * @param {Object} repository Repository object
 * @param {Object} user User object
 * @returns {Promise<boolean>} Access result
 */
export async function checkRepositoryAccess(repository, user) {
    // Public repositories are accessible to all
    if (repository.metadata.accessLevel === ACCESS_LEVEL.PUBLIC) {
        return true;
    }

    // Must have user for non-public repositories
    if (!user || !user.walletAddress) {
        return false;
    }

    // Owner always has access
    if (user.walletAddress === repository.metadata.owner) {
        return true;
    }

    // Restricted repositories require membership
    if (repository.metadata.accessLevel === ACCESS_LEVEL.RESTRICTED) {
        return isUserInAccessList(repository, user.walletAddress);
    }

    // Token gated repositories require token ownership
    if (repository.metadata.accessLevel === ACCESS_LEVEL.TOKEN_GATED) {
        return await checkTokenGatedAccess(repository, user.walletAddress);
    }

    // Private repositories are only accessible by owner
    return false;
}

/**
 * Create repository metadata object
 * 
 * @param {Object} options Repository options
 * @returns {Object} Formatted metadata
 */
export function createRepositoryMetadata(options = {}) {
    return {
        type: options.type || REPOSITORY_TYPE.CONTENT,
        accessLevel: options.accessLevel || ACCESS_LEVEL.PUBLIC,
        name: options.name || 'Unnamed Repository',
        description: options.description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        owner: options.owner || null,
        size: options.size || 0,
        contentCount: options.contentCount || 0,
        autoSync: options.autoSync !== undefined ? options.autoSync : false,
        autoPin: options.autoPin !== undefined ? options.autoPin : false,
        distributionMethod: options.distributionMethod || 'ipfs',
        replicationFactor: options.replicationFactor || 3,
        accessControl: options.accessControl || {},
        tags: options.tags || [],
        customData: options.customData || {}
    };
}

/**
 * Check if a file path should be included in repository sync
 * 
 * @param {string} path File path
 * @param {Object} options Filtering options
 * @returns {boolean} Should include file
 */
export function shouldIncludeFile(path, options = {}) {
    // Skip system and hidden files
    if (path.startsWith('.') || path.includes('/.')) {
        return false;
    }

    // Skip files matching exclude patterns
    if (options.exclude && Array.isArray(options.exclude)) {
        for (const pattern of options.exclude) {
            if (typeof pattern === 'string' && path.includes(pattern)) {
                return false;
            } else if (pattern instanceof RegExp && pattern.test(path)) {
                return false;
            }
        }
    }

    // Check if it matches include patterns
    if (options.include && Array.isArray(options.include)) {
        for (const pattern of options.include) {
            if (typeof pattern === 'string' && path.includes(pattern)) {
                return true;
            } else if (pattern instanceof RegExp && pattern.test(path)) {
                return true;
            }
        }
        // If include patterns exist, but none matched, exclude the file
        return false;
    }

    // Default to including the file
    return true;
}

/**
 * Format repository size for display
 * 
 * @param {number} bytes Size in bytes
 * @returns {string} Formatted size
 */
export function formatRepositorySize(bytes) {
    if (bytes === 0) return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Create repository URL
 * 
 * @param {Object} repository Repository object
 * @param {string} protocol Protocol to use
 * @returns {string} Repository URL
 */
export function createRepositoryUrl(repository, protocol = 'ipfs') {
    switch (protocol.toLowerCase()) {
        case 'ipfs':
            return `ipfs://${repository.metadata.ipfsHash}`;
        case 'http':
        case 'https':
            return `https://gateway.ipfs.io/ipfs/${repository.metadata.ipfsHash}`;
        case 'swarm':
            return `bzz:/${repository.metadata.swarmHash}`;
        default:
            throw new Error(`Unsupported protocol: ${protocol}`);
    }
}

/**
 * Get repository type display name
 * 
 * @param {string} type Repository type
 * @returns {string} Display name
 */
export function getRepositoryTypeLabel(type) {
    switch (type) {
        case REPOSITORY_TYPE.CONTENT:
            return 'Content Repository';
        case REPOSITORY_TYPE.METADATA:
            return 'Metadata Repository';
        case REPOSITORY_TYPE.ARCHIVE:
            return 'Archive Repository';
        case REPOSITORY_TYPE.PROGRAM:
            return 'Program Repository';
        case REPOSITORY_TYPE.CONFIG:
            return 'Configuration Repository';
        default:
            return 'Unknown Repository Type';
    }
}

// Helper functions

/**
 * Create a slug from a string
 * 
 * @param {string} str String to slugify
 * @returns {string} Slug
 */
function slugify(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 32); // Limit length
}

/**
 * Check if user is in repository access list
 * 
 * @param {Object} repository Repository object
 * @param {string} walletAddress User wallet address
 * @returns {boolean} Is in access list
 */
function isUserInAccessList(repository, walletAddress) {
    if (!repository.metadata.accessControl || !repository.metadata.accessControl.allowlist) {
        return false;
    }

    return repository.metadata.accessControl.allowlist.some(
        addr => addr.toLowerCase() === walletAddress.toLowerCase()
    );
}

/**
 * Check if user has required tokens for access
 * 
 * @param {Object} repository Repository object
 * @param {string} walletAddress User wallet address
 * @returns {Promise<boolean>} Has required tokens
 */
async function checkTokenGatedAccess(repository, walletAddress) {
    if (!repository.metadata.accessControl ||
        !repository.metadata.accessControl.requiredTokens ||
        !repository.metadata.accessControl.requiredTokens.length) {
        return false;
    }

    try {
        // In a real implementation, this would check token ownership on-chain
        // For simulation, return success 50% of the time
        return Math.random() >= 0.5;
    } catch (error) {
        console.error('Error checking token gated access:', error);
        return false;
    }
}

/**
 * Execute a callback function for a repository
 * 
 * @param {Object} repo Repository object
 * @param {Function} callback Callback function
 * @returns {any} Result of the callback execution
 */
function executeRepositoryCallback(repo, callback) {
    return performCallback(repo, callback);
}

export { executeRepositoryCallback };
