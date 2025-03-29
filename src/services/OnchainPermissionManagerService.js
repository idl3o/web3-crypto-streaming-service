/**
 * On-chain Permission Manager Service (OPM)
 * 
 * Provides advanced permission management and access control for
 * on-chain resources in the Web3 Crypto Streaming platform.
 */

import * as BlockchainService from './BlockchainService';
import * as RiceSecurityService from './RiceAdvancedNetworkSecurityService';

// Permission levels
export const PERMISSION_LEVELS = {
    NONE: 0,       // No permissions
    READ: 1,       // Read-only access
    CONTRIBUTE: 2, // Can contribute but not manage
    MANAGE: 3,     // Can manage resources
    ADMIN: 4       // Full administrative access
};

// Resource types that can have permissions
export const RESOURCE_TYPES = {
    CONTRACT: 'contract',
    COLLECTION: 'collection',
    STREAM: 'stream',
    TREASURY: 'treasury',
    DAO: 'dao',
    NAMESPACE: 'namespace',
    FEATURE: 'feature'
};

// Role definitions
export const ROLES = {
    VIEWER: 'viewer',
    CONTRIBUTOR: 'contributor',
    MANAGER: 'manager',
    ADMIN: 'admin',
    SUPERADMIN: 'superadmin',
    CUSTOM: 'custom'
};

// Service state
let initialized = false;
const resourcePermissions = new Map();
const userRoles = new Map();
const rolePermissions = new Map();
const permissionHistory = new Map();
let settings = {
    defaultCacheTime: 300000, // 5 minutes
    enforceOnChainVerification: true,
    autoRefreshEnabled: true,
    superAdmins: []
};

/**
 * Initialize the On-chain Permission Manager service
 * @param {Object} options Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initOPM(options = {}) {
    if (initialized) {
        return true;
    }

    try {
        console.log('Initializing On-chain Permission Manager...');

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

        // Set up default roles if not provided
        setupDefaultRoles();

        // If wallet is connected, load user roles
        if (BlockchainService.isConnected()) {
            const userAddress = BlockchainService.getCurrentAccount();
            await loadUserRoles(userAddress);
        }

        initialized = true;
        console.log('On-chain Permission Manager initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize On-chain Permission Manager:', error);
        return false;
    }
}

/**
 * Set up default role permissions
 */
function setupDefaultRoles() {
    // Viewer role - read-only access
    defineRole(ROLES.VIEWER, {
        description: 'Can view resources',
        defaultPermissions: {
            [RESOURCE_TYPES.CONTRACT]: PERMISSION_LEVELS.READ,
            [RESOURCE_TYPES.COLLECTION]: PERMISSION_LEVELS.READ,
            [RESOURCE_TYPES.STREAM]: PERMISSION_LEVELS.READ,
            [RESOURCE_TYPES.TREASURY]: PERMISSION_LEVELS.READ,
            [RESOURCE_TYPES.DAO]: PERMISSION_LEVELS.READ,
            [RESOURCE_TYPES.NAMESPACE]: PERMISSION_LEVELS.READ,
            [RESOURCE_TYPES.FEATURE]: PERMISSION_LEVELS.READ
        }
    });

    // Contributor role - can contribute but not manage
    defineRole(ROLES.CONTRIBUTOR, {
        description: 'Can contribute to resources',
        defaultPermissions: {
            [RESOURCE_TYPES.CONTRACT]: PERMISSION_LEVELS.READ,
            [RESOURCE_TYPES.COLLECTION]: PERMISSION_LEVELS.CONTRIBUTE,
            [RESOURCE_TYPES.STREAM]: PERMISSION_LEVELS.CONTRIBUTE,
            [RESOURCE_TYPES.TREASURY]: PERMISSION_LEVELS.READ,
            [RESOURCE_TYPES.DAO]: PERMISSION_LEVELS.CONTRIBUTE,
            [RESOURCE_TYPES.NAMESPACE]: PERMISSION_LEVELS.READ,
            [RESOURCE_TYPES.FEATURE]: PERMISSION_LEVELS.READ
        }
    });

    // Manager role - can manage resources
    defineRole(ROLES.MANAGER, {
        description: 'Can manage resources',
        defaultPermissions: {
            [RESOURCE_TYPES.CONTRACT]: PERMISSION_LEVELS.READ,
            [RESOURCE_TYPES.COLLECTION]: PERMISSION_LEVELS.MANAGE,
            [RESOURCE_TYPES.STREAM]: PERMISSION_LEVELS.MANAGE,
            [RESOURCE_TYPES.TREASURY]: PERMISSION_LEVELS.CONTRIBUTE,
            [RESOURCE_TYPES.DAO]: PERMISSION_LEVELS.MANAGE,
            [RESOURCE_TYPES.NAMESPACE]: PERMISSION_LEVELS.CONTRIBUTE,
            [RESOURCE_TYPES.FEATURE]: PERMISSION_LEVELS.CONTRIBUTE
        }
    });

    // Admin role - full administrative access
    defineRole(ROLES.ADMIN, {
        description: 'Has administrative access',
        defaultPermissions: {
            [RESOURCE_TYPES.CONTRACT]: PERMISSION_LEVELS.MANAGE,
            [RESOURCE_TYPES.COLLECTION]: PERMISSION_LEVELS.ADMIN,
            [RESOURCE_TYPES.STREAM]: PERMISSION_LEVELS.ADMIN,
            [RESOURCE_TYPES.TREASURY]: PERMISSION_LEVELS.MANAGE,
            [RESOURCE_TYPES.DAO]: PERMISSION_LEVELS.ADMIN,
            [RESOURCE_TYPES.NAMESPACE]: PERMISSION_LEVELS.MANAGE,
            [RESOURCE_TYPES.FEATURE]: PERMISSION_LEVELS.MANAGE
        }
    });

    // Superadmin role - full access to everything
    defineRole(ROLES.SUPERADMIN, {
        description: 'Has full access to all resources',
        defaultPermissions: {
            [RESOURCE_TYPES.CONTRACT]: PERMISSION_LEVELS.ADMIN,
            [RESOURCE_TYPES.COLLECTION]: PERMISSION_LEVELS.ADMIN,
            [RESOURCE_TYPES.STREAM]: PERMISSION_LEVELS.ADMIN,
            [RESOURCE_TYPES.TREASURY]: PERMISSION_LEVELS.ADMIN,
            [RESOURCE_TYPES.DAO]: PERMISSION_LEVELS.ADMIN,
            [RESOURCE_TYPES.NAMESPACE]: PERMISSION_LEVELS.ADMIN,
            [RESOURCE_TYPES.FEATURE]: PERMISSION_LEVELS.ADMIN
        }
    });
}

/**
 * Define a role with permissions
 * @param {string} roleId Role identifier
 * @param {Object} roleData Role data
 * @returns {Object} Defined role
 */
export function defineRole(roleId, roleData) {
    // Create role object
    const role = {
        id: roleId,
        name: roleData.name || roleId.charAt(0).toUpperCase() + roleId.slice(1),
        description: roleData.description || '',
        permissions: roleData.defaultPermissions || {},
        customData: roleData.customData || {},
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    // Store role
    rolePermissions.set(roleId, role);

    return role;
}

/**
 * Load user roles from the blockchain
 * @param {string} userAddress User's wallet address
 * @returns {Promise<Array>} User's roles
 */
async function loadUserRoles(userAddress) {
    if (!userAddress) return [];

    try {
        const normalizedAddress = userAddress.toLowerCase();

        // In a real implementation, this would query the blockchain
        // For this example, we'll assign sample roles based on address

        // Super admins from settings always get superadmin role
        if (settings.superAdmins.includes(normalizedAddress)) {
            userRoles.set(normalizedAddress, [ROLES.SUPERADMIN]);
            return [ROLES.SUPERADMIN];
        }

        // Generate deterministic roles based on address
        const addressSum = Array.from(normalizedAddress).reduce(
            (sum, char) => sum + char.charCodeAt(0), 0
        );

        let roles;

        // Assign roles based on address characteristics
        if (addressSum % 100 < 5) {
            // 5% chance of admin
            roles = [ROLES.ADMIN];
        } else if (addressSum % 100 < 15) {
            // 10% chance of manager
            roles = [ROLES.MANAGER];
        } else if (addressSum % 100 < 40) {
            // 25% chance of contributor
            roles = [ROLES.CONTRIBUTOR];
        } else {
            // 60% chance of viewer
            roles = [ROLES.VIEWER];
        }

        // Store user roles
        userRoles.set(normalizedAddress, roles);

        return roles;
    } catch (error) {
        console.error(`Error loading roles for ${userAddress}:`, error);
        return [];
    }
}

/**
 * Get user's roles
 * @param {string} userAddress User's wallet address (optional)
 * @returns {Promise<Array>} User's roles
 */
export async function getUserRoles(userAddress) {
    if (!initialized) {
        await initOPM();
    }

    const address = userAddress ||
        (BlockchainService.isConnected() ? BlockchainService.getCurrentAccount() : null);

    if (!address) {
        return [];
    }

    const normalizedAddress = address.toLowerCase();

    // Check if we already have roles for this user
    let roles = userRoles.get(normalizedAddress);

    // If not, load them from blockchain
    if (!roles) {
        roles = await loadUserRoles(normalizedAddress);
    }

    return roles || [];
}

/**
 * Check if user has permission for a resource
 * @param {string} userAddress User's wallet address
 * @param {string} resourceType Resource type
 * @param {string} resourceId Resource identifier
 * @param {number} requiredLevel Required permission level
 * @returns {Promise<boolean>} Whether user has permission
 */
export async function hasPermission(userAddress, resourceType, resourceId, requiredLevel) {
    if (!initialized) {
        await initOPM();
    }

    // Super admins always have access
    if (settings.superAdmins.includes(userAddress.toLowerCase())) {
        return true;
    }

    // Get user roles
    const roles = await getUserRoles(userAddress);

    // Resource-specific permissions take precedence
    const resourceKey = `${resourceType}:${resourceId}`;
    const resourcePerms = resourcePermissions.get(resourceKey);

    if (resourcePerms && resourcePerms.userPermissions) {
        const userPerm = resourcePerms.userPermissions[userAddress.toLowerCase()];
        if (userPerm !== undefined && userPerm >= requiredLevel) {
            return true;
        }
    }

    // Check role-based permissions
    for (const roleId of roles) {
        const role = rolePermissions.get(roleId);
        if (!role) continue;

        // Check resource-specific role permissions first
        if (resourcePerms && resourcePerms.rolePermissions &&
            resourcePerms.rolePermissions[roleId] !== undefined) {
            if (resourcePerms.rolePermissions[roleId] >= requiredLevel) {
                return true;
            }
        }
        // Fall back to default role permissions
        else if (role.permissions[resourceType] !== undefined &&
            role.permissions[resourceType] >= requiredLevel) {
            return true;
        }
    }

    // No suitable permission found
    return false;
}

/**
 * Grant permission to a user for a specific resource
 * @param {string} userAddress User's wallet address
 * @param {string} resourceType Resource type
 * @param {string} resourceId Resource identifier
 * @param {number} permissionLevel Permission level to grant
 * @returns {Promise<Object>} Grant result
 */
export async function grantPermission(userAddress, resourceType, resourceId, permissionLevel) {
    if (!initialized) {
        await initOPM();
    }

    // Check if caller has admin permission for this resource
    const callerAddress = BlockchainService.getCurrentAccount();
    if (!callerAddress) {
        throw new Error('Wallet must be connected to grant permissions');
    }

    const hasAdminPerm = await hasPermission(
        callerAddress,
        resourceType,
        resourceId,
        PERMISSION_LEVELS.ADMIN
    );

    if (!hasAdminPerm) {
        throw new Error('You do not have admin permission for this resource');
    }

    try {
        const resourceKey = `${resourceType}:${resourceId}`;
        const normalizedAddress = userAddress.toLowerCase();

        // Get or create resource permissions
        let resourcePerms = resourcePermissions.get(resourceKey);
        if (!resourcePerms) {
            resourcePerms = {
                type: resourceType,
                id: resourceId,
                userPermissions: {},
                rolePermissions: {},
                createdAt: Date.now(),
                createdBy: callerAddress
            };
        }

        // Update user permission
        resourcePerms.userPermissions = resourcePerms.userPermissions || {};
        resourcePerms.userPermissions[normalizedAddress] = permissionLevel;
        resourcePerms.updatedAt = Date.now();
        resourcePerms.updatedBy = callerAddress;

        // Store updated permissions
        resourcePermissions.set(resourceKey, resourcePerms);

        // Record in history
        recordPermissionAction(
            resourceType,
            resourceId,
            'grant',
            normalizedAddress,
            permissionLevel,
            callerAddress
        );

        return {
            success: true,
            message: 'Permission granted successfully',
            resource: {
                type: resourceType,
                id: resourceId
            },
            permission: permissionLevel,
            user: normalizedAddress
        };
    } catch (error) {
        console.error('Error granting permission:', error);
        throw error;
    }
}

/**
 * Revoke permission from a user for a specific resource
 * @param {string} userAddress User's wallet address
 * @param {string} resourceType Resource type
 * @param {string} resourceId Resource identifier
 * @returns {Promise<Object>} Revocation result
 */
export async function revokePermission(userAddress, resourceType, resourceId) {
    if (!initialized) {
        await initOPM();
    }

    // Check if caller has admin permission for this resource
    const callerAddress = BlockchainService.getCurrentAccount();
    if (!callerAddress) {
        throw new Error('Wallet must be connected to revoke permissions');
    }

    const hasAdminPerm = await hasPermission(
        callerAddress,
        resourceType,
        resourceId,
        PERMISSION_LEVELS.ADMIN
    );

    if (!hasAdminPerm) {
        throw new Error('You do not have admin permission for this resource');
    }

    try {
        const resourceKey = `${resourceType}:${resourceId}`;
        const normalizedAddress = userAddress.toLowerCase();

        // Get resource permissions
        const resourcePerms = resourcePermissions.get(resourceKey);
        if (!resourcePerms || !resourcePerms.userPermissions) {
            return {
                success: false,
                message: 'No permissions found for this resource',
                resource: {
                    type: resourceType,
                    id: resourceId
                },
                user: normalizedAddress
            };
        }

        // Remove user permission
        const hadPermission = resourcePerms.userPermissions[normalizedAddress] !== undefined;
        delete resourcePerms.userPermissions[normalizedAddress];

        // Update metadata
        resourcePerms.updatedAt = Date.now();
        resourcePerms.updatedBy = callerAddress;

        // Store updated permissions
        resourcePermissions.set(resourceKey, resourcePerms);

        // Record in history
        if (hadPermission) {
            recordPermissionAction(
                resourceType,
                resourceId,
                'revoke',
                normalizedAddress,
                null,
                callerAddress
            );
        }

        return {
            success: hadPermission,
            message: hadPermission ?
                'Permission revoked successfully' :
                'User did not have direct permission on this resource',
            resource: {
                type: resourceType,
                id: resourceId
            },
            user: normalizedAddress
        };
    } catch (error) {
        console.error('Error revoking permission:', error);
        throw error;
    }
}

/**
 * Assign a role to a user
 * @param {string} userAddress User's wallet address
 * @param {string} roleId Role identifier
 * @returns {Promise<Object>} Assignment result
 */
export async function assignRole(userAddress, roleId) {
    if (!initialized) {
        await initOPM();
    }

    // Check if caller is a super admin
    const callerAddress = BlockchainService.getCurrentAccount();
    if (!callerAddress) {
        throw new Error('Wallet must be connected to assign roles');
    }

    const isCallerSuperAdmin = settings.superAdmins.includes(callerAddress.toLowerCase());
    if (!isCallerSuperAdmin) {
        throw new Error('Only super admins can assign roles');
    }

    try {
        const normalizedAddress = userAddress.toLowerCase();

        // Check if role exists
        if (!rolePermissions.has(roleId)) {
            throw new Error(`Role not found: ${roleId}`);
        }

        // Get current user roles
        let roles = userRoles.get(normalizedAddress) || [];

        // Add role if not already assigned
        if (!roles.includes(roleId)) {
            roles = [...roles, roleId];
            userRoles.set(normalizedAddress, roles);

            // Record in history
            recordPermissionAction(
                'user',
                normalizedAddress,
                'assign_role',
                roleId,
                null,
                callerAddress
            );
        }

        return {
            success: true,
            message: 'Role assigned successfully',
            user: normalizedAddress,
            role: roleId,
            allRoles: roles
        };
    } catch (error) {
        console.error('Error assigning role:', error);
        throw error;
    }
}

/**
 * Remove a role from a user
 * @param {string} userAddress User's wallet address
 * @param {string} roleId Role identifier
 * @returns {Promise<Object>} Removal result
 */
export async function removeRole(userAddress, roleId) {
    if (!initialized) {
        await initOPM();
    }

    // Check if caller is a super admin
    const callerAddress = BlockchainService.getCurrentAccount();
    if (!callerAddress) {
        throw new Error('Wallet must be connected to remove roles');
    }

    const isCallerSuperAdmin = settings.superAdmins.includes(callerAddress.toLowerCase());
    if (!isCallerSuperAdmin) {
        throw new Error('Only super admins can remove roles');
    }

    try {
        const normalizedAddress = userAddress.toLowerCase();

        // Get current user roles
        let roles = userRoles.get(normalizedAddress) || [];

        // Remove role if assigned
        if (roles.includes(roleId)) {
            roles = roles.filter(r => r !== roleId);
            userRoles.set(normalizedAddress, roles);

            // Record in history
            recordPermissionAction(
                'user',
                normalizedAddress,
                'remove_role',
                roleId,
                null,
                callerAddress
            );
        }

        return {
            success: true,
            message: roles.includes(roleId) ?
                'Role was not assigned to this user' :
                'Role removed successfully',
            user: normalizedAddress,
            role: roleId,
            allRoles: roles
        };
    } catch (error) {
        console.error('Error removing role:', error);
        throw error;
    }
}

/**
 * Grant permission to a role for a specific resource
 * @param {string} roleId Role identifier
 * @param {string} resourceType Resource type
 * @param {string} resourceId Resource identifier
 * @param {number} permissionLevel Permission level to grant
 * @returns {Promise<Object>} Grant result
 */
export async function grantRolePermission(roleId, resourceType, resourceId, permissionLevel) {
    if (!initialized) {
        await initOPM();
    }

    // Check if caller has admin permission for this resource
    const callerAddress = BlockchainService.getCurrentAccount();
    if (!callerAddress) {
        throw new Error('Wallet must be connected to grant permissions');
    }

    const hasAdminPerm = await hasPermission(
        callerAddress,
        resourceType,
        resourceId,
        PERMISSION_LEVELS.ADMIN
    );

    if (!hasAdminPerm) {
        throw new Error('You do not have admin permission for this resource');
    }

    try {
        // Check if role exists
        if (!rolePermissions.has(roleId)) {
            throw new Error(`Role not found: ${roleId}`);
        }

        const resourceKey = `${resourceType}:${resourceId}`;

        // Get or create resource permissions
        let resourcePerms = resourcePermissions.get(resourceKey);
        if (!resourcePerms) {
            resourcePerms = {
                type: resourceType,
                id: resourceId,
                userPermissions: {},
                rolePermissions: {},
                createdAt: Date.now(),
                createdBy: callerAddress
            };
        }

        // Update role permission
        resourcePerms.rolePermissions = resourcePerms.rolePermissions || {};
        resourcePerms.rolePermissions[roleId] = permissionLevel;
        resourcePerms.updatedAt = Date.now();
        resourcePerms.updatedBy = callerAddress;

        // Store updated permissions
        resourcePermissions.set(resourceKey, resourcePerms);

        // Record in history
        recordPermissionAction(
            resourceType,
            resourceId,
            'grant_role',
            roleId,
            permissionLevel,
            callerAddress
        );

        return {
            success: true,
            message: 'Role permission granted successfully',
            resource: {
                type: resourceType,
                id: resourceId
            },
            permission: permissionLevel,
            role: roleId
        };
    } catch (error) {
        console.error('Error granting role permission:', error);
        throw error;
    }
}

/**
 * Get all permissions for a resource
 * @param {string} resourceType Resource type
 * @param {string} resourceId Resource identifier
 * @returns {Object} Resource permissions
 */
export function getResourcePermissions(resourceType, resourceId) {
    if (!initialized) {
        console.warn('OPM not initialized');
        return null;
    }

    const resourceKey = `${resourceType}:${resourceId}`;
    return resourcePermissions.get(resourceKey);
}

/**
 * Get all resources a user has access to
 * @param {string} userAddress User's wallet address (optional)
 * @param {Object} options Filter options
 * @returns {Promise<Array>} Accessible resources
 */
export async function getUserAccessibleResources(userAddress, options = {}) {
    if (!initialized) {
        await initOPM();
    }

    const address = userAddress ||
        (BlockchainService.isConnected() ? BlockchainService.getCurrentAccount() : null);

    if (!address) {
        return [];
    }

    try {
        const normalizedAddress = address.toLowerCase();
        const minPermissionLevel = options.minPermissionLevel || PERMISSION_LEVELS.READ;
        const resourceTypeFilter = options.resourceType;

        // Get user roles
        const roles = await getUserRoles(normalizedAddress);

        // Collect all resources user has access to
        const accessibleResources = [];

        // Check if user is superadmin
        if (settings.superAdmins.includes(normalizedAddress)) {
            // Superadmins have access to everything
            for (const [resourceKey, resourcePerm] of resourcePermissions.entries()) {
                // Apply resource type filter if specified
                if (resourceTypeFilter && resourcePerm.type !== resourceTypeFilter) {
                    continue;
                }

                accessibleResources.push({
                    type: resourcePerm.type,
                    id: resourcePerm.id,
                    permissionLevel: PERMISSION_LEVELS.ADMIN,
                    via: 'superadmin'
                });
            }
        } else {
            // Handle regular users
            for (const [resourceKey, resourcePerm] of resourcePermissions.entries()) {
                // Apply resource type filter if specified
                if (resourceTypeFilter && resourcePerm.type !== resourceTypeFilter) {
                    continue;
                }

                let highestPermission = PERMISSION_LEVELS.NONE;
                let permissionSource = null;

                // Check direct user permissions
                if (resourcePerm.userPermissions &&
                    resourcePerm.userPermissions[normalizedAddress] !== undefined) {
                    highestPermission = resourcePerm.userPermissions[normalizedAddress];
                    permissionSource = 'direct';
                }

                // Check role-based permissions
                for (const roleId of roles) {
                    let rolePermLevel = PERMISSION_LEVELS.NONE;

                    // Check resource-specific role permissions
                    if (resourcePerm.rolePermissions &&
                        resourcePerm.rolePermissions[roleId] !== undefined) {
                        rolePermLevel = resourcePerm.rolePermissions[roleId];
                    }
                    // Check default role permissions
                    else {
                        const role = rolePermissions.get(roleId);
                        if (role && role.permissions[resourcePerm.type] !== undefined) {
                            rolePermLevel = role.permissions[resourcePerm.type];
                        }
                    }

                    // Update highest permission if this role grants higher access
                    if (rolePermLevel > highestPermission) {
                        highestPermission = rolePermLevel;
                        permissionSource = `role:${roleId}`;
                    }
                }

                // Add to result if permission meets minimum level
                if (highestPermission >= minPermissionLevel) {
                    accessibleResources.push({
                        type: resourcePerm.type,
                        id: resourcePerm.id,
                        permissionLevel: highestPermission,
                        via: permissionSource
                    });
                }
            }
        }

        return accessibleResources;
    } catch (error) {
        console.error('Error getting user accessible resources:', error);
        throw error;
    }
}

/**
 * Record a permission action in the history
 * @param {string} resourceType Resource type
 * @param {string} resourceId Resource identifier
 * @param {string} action Action performed
 * @param {string} target Target (user address or role ID)
 * @param {number} level Permission level
 * @param {string} actor Actor who performed the action
 */
function recordPermissionAction(resourceType, resourceId, action, target, level, actor) {
    const actionRecord = {
        resourceType,
        resourceId,
        action,
        target,
        level,
        actor,
        timestamp: Date.now()
    };

    const resourceKey = `${resourceType}:${resourceId}`;

    // Get or create resource history
    let history = permissionHistory.get(resourceKey);
    if (!history) {
        history = [];
        permissionHistory.set(resourceKey, history);
    }

    // Add action to history
    history.push(actionRecord);
}

/**
 * Get permission history for a resource
 * @param {string} resourceType Resource type
 * @param {string} resourceId Resource identifier
 * @returns {Array} Permission history
 */
export function getPermissionHistory(resourceType, resourceId) {
    if (!initialized) {
        console.warn('OPM not initialized');
        return [];
    }

    const resourceKey = `${resourceType}:${resourceId}`;
    return permissionHistory.get(resourceKey) || [];
}

/**
 * Get available roles
 * @returns {Array} Available roles
 */
export function getAvailableRoles() {
    return Array.from(rolePermissions.values());
}

/**
 * Get settings
 * @returns {Object} Current settings
 */
export function getOPMSettings() {
    return { ...settings };
}

/**
 * Update settings
 * @param {Object} newSettings Updated settings
 * @returns {Object} Updated settings
 */
export function updateOPMSettings(newSettings) {
    settings = {
        ...settings,
        ...newSettings
    };

    return { ...settings };
}

export default {
    initOPM,
    hasPermission,
    grantPermission,
    revokePermission,
    assignRole,
    removeRole,
    grantRolePermission,
    getResourcePermissions,
    getUserAccessibleResources,
    getPermissionHistory,
    getUserRoles,
    getAvailableRoles,
    defineRole,
    getOPMSettings,
    updateOPMSettings,
    PERMISSION_LEVELS,
    RESOURCE_TYPES,
    ROLES
};
