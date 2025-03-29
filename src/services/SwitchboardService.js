/**
 * Switchboard Service
 * 
 * Provides a centralized feature switching mechanism for the Web3 Crypto Streaming platform.
 * Enables dynamic enabling/disabling of features based on user roles, environments, and configuration.
 */

import * as BlockchainService from './BlockchainService';
import * as RiceSecurityService from './RiceAdvancedNetworkSecurityService';

// Feature states
export const FEATURE_STATES = {
    ENABLED: 'enabled',
    DISABLED: 'disabled',
    PERCENTAGE_ROLLOUT: 'percentage_rollout',
    ROLE_RESTRICTED: 'role_restricted',
    TOKEN_GATED: 'token_gated',
    ENVIRONMENT_SPECIFIC: 'environment_specific'
};

// User roles
export const USER_ROLES = {
    REGULAR: 'regular',
    PREMIUM: 'premium',
    CREATOR: 'creator',
    PARTNER: 'partner',
    ADMIN: 'admin',
    DEVELOPER: 'developer'
};

// Environments
export const ENVIRONMENTS = {
    DEVELOPMENT: 'development',
    STAGING: 'staging',
    PRODUCTION: 'production',
    LOCAL: 'local'
};

// Service state
let initialized = false;
const featureFlags = new Map();
const userOverrides = new Map();
const featureHistory = new Map();
const currentEnvironment = process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT;

/**
 * Initialize the Switchboard Service
 * @param {Object} options Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initSwitchboardService(options = {}) {
    if (initialized) {
        return true;
    }

    try {
        console.log('Initializing Switchboard Service...');

        // Initialize the RICE security service if not already initialized
        if (!RiceSecurityService.getSecurityMetrics) {
            await RiceSecurityService.initSecurityService();
        }

        // Load feature flags
        const loadedFlags = options.featureFlags || await loadFeatureFlags();
        loadedFlags.forEach(flag => {
            featureFlags.set(flag.id, flag);
        });

        initialized = true;
        console.log(`Switchboard Service initialized with ${featureFlags.size} feature flags`);
        return true;
    } catch (error) {
        console.error('Failed to initialize Switchboard Service:', error);
        return false;
    }
}

/**
 * Load feature flags from configuration
 * @returns {Promise<Array>} Feature flags
 */
async function loadFeatureFlags() {
    // In a real implementation, this might load from a configuration server
    // For this example, we'll use a set of predefined flags

    return [
        {
            id: 'honeymush_rewards',
            name: 'Honeymush Rewards',
            description: 'Enable Honeymush token rewards for platform activities',
            state: FEATURE_STATES.ENABLED,
            defaultValue: true
        },
        {
            id: 'holographic_streaming',
            name: 'Holographic Streaming',
            description: '3D holographic content streaming',
            state: FEATURE_STATES.PERCENTAGE_ROLLOUT,
            defaultValue: false,
            rolloutPercentage: 20
        },
        {
            id: 'quantum_secure_transactions',
            name: 'Quantum Secure Transactions',
            description: 'Enhanced transaction security with quantum resistance',
            state: FEATURE_STATES.ROLE_RESTRICTED,
            defaultValue: false,
            allowedRoles: [USER_ROLES.PREMIUM, USER_ROLES.PARTNER, USER_ROLES.ADMIN]
        },
        {
            id: 'ai_content_generation',
            name: 'AI Content Generation',
            description: 'AI-powered content creation tools',
            state: FEATURE_STATES.ENVIRONMENT_SPECIFIC,
            defaultValue: false,
            environments: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.STAGING]
        },
        {
            id: 'pre_release_dashboard',
            name: 'Pre-Release Dashboard',
            description: 'Advanced dashboard with pre-release metrics and tools',
            state: FEATURE_STATES.TOKEN_GATED,
            defaultValue: false,
            requiredToken: 'honeymush',
            minimumBalance: 100
        }
    ];
}

/**
 * Check if a feature is enabled
 * @param {string} featureId Feature identifier
 * @param {Object} context Evaluation context (user, environment, etc.)
 * @returns {boolean} Whether the feature is enabled
 */
export function isFeatureEnabled(featureId, context = {}) {
    if (!initialized) {
        console.warn('Switchboard Service not initialized, using default feature values');
    }

    // Get feature flag
    const feature = featureFlags.get(featureId);
    if (!feature) {
        console.warn(`Feature flag not found: ${featureId}`);
        return false;
    }

    // Check for user override
    const userId = context.userId || (BlockchainService.isConnected() ? BlockchainService.getCurrentAccount() : null);
    if (userId) {
        const userFeatureOverrides = userOverrides.get(userId);
        if (userFeatureOverrides && userFeatureOverrides[featureId] !== undefined) {
            return userFeatureOverrides[featureId];
        }
    }

    // Evaluate based on feature state
    switch (feature.state) {
        case FEATURE_STATES.ENABLED:
            return feature.defaultValue !== false;

        case FEATURE_STATES.DISABLED:
            return feature.defaultValue === true;

        case FEATURE_STATES.PERCENTAGE_ROLLOUT:
            return evaluatePercentageRollout(feature, context);

        case FEATURE_STATES.ROLE_RESTRICTED:
            return evaluateRoleRestriction(feature, context);

        case FEATURE_STATES.TOKEN_GATED:
            return evaluateTokenGate(feature, context);

        case FEATURE_STATES.ENVIRONMENT_SPECIFIC:
            return evaluateEnvironment(feature, context);

        default:
            return feature.defaultValue === true;
    }
}

/**
 * Evaluate percentage rollout
 * @param {Object} feature Feature flag
 * @param {Object} context Evaluation context
 * @returns {boolean} Evaluation result
 */
function evaluatePercentageRollout(feature, context) {
    // Use user ID for stable rollout assignment
    const userId = context.userId || (BlockchainService.isConnected() ? BlockchainService.getCurrentAccount() : null);

    if (!userId) {
        return feature.defaultValue === true;
    }

    // Generate a number 0-100 based on the user ID + feature ID
    const hash = simpleHash(`${userId}-${feature.id}`);
    const percentage = hash % 100;

    // Check if user falls within the rollout percentage
    return percentage < feature.rolloutPercentage;
}

/**
 * Evaluate role restriction
 * @param {Object} feature Feature flag
 * @param {Object} context Evaluation context
 * @returns {boolean} Evaluation result
 */
function evaluateRoleRestriction(feature, context) {
    const userRole = context.userRole || USER_ROLES.REGULAR;

    // Check if user role is in the allowed roles list
    return feature.allowedRoles && feature.allowedRoles.includes(userRole);
}

/**
 * Evaluate token gate
 * @param {Object} feature Feature flag
 * @param {Object} context Evaluation context
 * @returns {boolean} Evaluation result
 */
function evaluateTokenGate(feature, context) {
    // In a real implementation, this would check the user's token balance
    // For this example, we'll use a simple simulation

    // Default to mock token check if no real balance provided
    const tokenBalance = context.tokenBalances?.[feature.requiredToken] ||
        (context.simulateTokenBalance === true ? 150 : 0);

    return tokenBalance >= (feature.minimumBalance || 0);
}

/**
 * Evaluate environment-specific feature
 * @param {Object} feature Feature flag
 * @param {Object} context Evaluation context
 * @returns {boolean} Evaluation result
 */
function evaluateEnvironment(feature, context) {
    const environment = context.environment || currentEnvironment;

    // Check if current environment is in the allowed environments list
    return feature.environments && feature.environments.includes(environment);
}

/**
 * Override a feature flag for a specific user
 * @param {string} userId User identifier
 * @param {string} featureId Feature identifier
 * @param {boolean} enabled Whether the feature should be enabled
 * @returns {boolean} Success status
 */
export function setUserOverride(userId, featureId, enabled) {
    if (!userId || !featureId) {
        return false;
    }

    // Check if the feature exists
    if (!featureFlags.has(featureId)) {
        console.warn(`Cannot override non-existent feature: ${featureId}`);
        return false;
    }

    // Get or create user overrides map
    let userFeatureOverrides = userOverrides.get(userId);
    if (!userFeatureOverrides) {
        userFeatureOverrides = {};
        userOverrides.set(userId, userFeatureOverrides);
    }

    // Set override
    userFeatureOverrides[featureId] = enabled;

    // Record override in history
    recordFeatureAction(featureId, userId, enabled ? 'override_enable' : 'override_disable');

    return true;
}

/**
 * Get all feature flags
 * @param {boolean} includeDetails Whether to include full details
 * @returns {Array} Feature flags
 */
export function getAllFeatures(includeDetails = false) {
    if (!initialized) {
        return [];
    }

    const features = Array.from(featureFlags.values());

    if (!includeDetails) {
        return features.map(feature => ({
            id: feature.id,
            name: feature.name,
            enabled: feature.state === FEATURE_STATES.ENABLED || feature.defaultValue === true
        }));
    }

    return features;
}

/**
 * Update a feature flag
 * @param {string} featureId Feature identifier
 * @param {Object} updates Updates to apply
 * @returns {Object|null} Updated feature or null if not found
 */
export function updateFeature(featureId, updates) {
    if (!initialized || !featureId) {
        return null;
    }

    // Get the feature
    const feature = featureFlags.get(featureId);
    if (!feature) {
        return null;
    }

    // Apply updates
    const updatedFeature = {
        ...feature,
        ...updates
    };

    // Store updated feature
    featureFlags.set(featureId, updatedFeature);

    // Record update in history
    recordFeatureAction(featureId, updates.updatedBy || 'system', 'update', updates);

    return updatedFeature;
}

/**
 * Create a new feature flag
 * @param {Object} featureData Feature data
 * @returns {Object|null} Created feature or null on error
 */
export function createFeature(featureData) {
    if (!initialized || !featureData || !featureData.id) {
        return null;
    }

    // Check if feature already exists
    if (featureFlags.has(featureData.id)) {
        console.warn(`Feature already exists: ${featureData.id}`);
        return null;
    }

    // Create new feature
    const newFeature = {
        id: featureData.id,
        name: featureData.name || featureData.id,
        description: featureData.description || '',
        state: featureData.state || FEATURE_STATES.DISABLED,
        defaultValue: featureData.defaultValue === true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...featureData
    };

    // Store new feature
    featureFlags.set(newFeature.id, newFeature);

    // Record creation in history
    recordFeatureAction(newFeature.id, featureData.createdBy || 'system', 'create');

    return newFeature;
}

/**
 * Delete a feature flag
 * @param {string} featureId Feature identifier
 * @returns {boolean} Success status
 */
export function deleteFeature(featureId) {
    if (!initialized || !featureId) {
        return false;
    }

    // Check if feature exists
    if (!featureFlags.has(featureId)) {
        return false;
    }

    // Delete feature
    const success = featureFlags.delete(featureId);

    // Record deletion in history
    if (success) {
        recordFeatureAction(featureId, 'system', 'delete');
    }

    return success;
}

/**
 * Record a feature action in the history
 * @param {string} featureId Feature identifier
 * @param {string} userId User identifier
 * @param {string} action Action performed
 * @param {Object} data Additional data
 */
function recordFeatureAction(featureId, userId, action, data = {}) {
    const actionRecord = {
        featureId,
        userId,
        action,
        timestamp: Date.now(),
        data
    };

    // Get or create feature history
    let history = featureHistory.get(featureId);
    if (!history) {
        history = [];
        featureHistory.set(featureId, history);
    }

    // Add action to history
    history.push(actionRecord);
}

/**
 * Get feature history
 * @param {string} featureId Feature identifier
 * @returns {Array} Feature history
 */
export function getFeatureHistory(featureId) {
    if (!initialized || !featureId) {
        return [];
    }

    return featureHistory.get(featureId) || [];
}

/**
 * Simple hash function for consistent percentage rollout
 * @param {string} str String to hash
 * @returns {number} Hash value
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

export default {
    initSwitchboardService,
    isFeatureEnabled,
    setUserOverride,
    getAllFeatures,
    updateFeature,
    createFeature,
    deleteFeature,
    getFeatureHistory,
    FEATURE_STATES,
    USER_ROLES,
    ENVIRONMENTS
};
