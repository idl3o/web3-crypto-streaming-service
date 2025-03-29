/**
 * Minimal Mode Service
 * 
 * Provides functionality for managing minimal mode settings
 * for the Web3 Crypto Streaming platform, offering a streamlined UI.
 */

import * as BlockchainService from './BlockchainService';
import * as RiceSecurityService from './RiceAdvancedNetworkSecurityService';

// Minimal mode presets
export const MINIMAL_PRESETS = {
    ULTRA_MINIMAL: 'ultra_minimal', // Maximum simplification
    BALANCED: 'balanced',           // Moderate simplification
    FOCUS: 'focus',                 // Focus mode (hides non-essential elements)
    PERFORMANCE: 'performance'      // Optimized for performance
};

// Service state
let initialized = false;
let minimalModeActive = false;
let currentPreset = MINIMAL_PRESETS.BALANCED;
let userPreferences = new Map();
let settings = {
    hideAnimations: true,
    reduceMotion: true,
    hideNonEssentialUI: true,
    simplifyWidgets: true,
    disableBackgroundEffects: true,
    reduceShadows: true,
    flattenUI: false,
    highContrastMode: false,
    minimalNotifications: true
};

/**
 * Initialize the Minimal Mode Service
 * @param {Object} options Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initMinimalModeService(options = {}) {
    if (initialized) {
        return true;
    }

    try {
        console.log('Initializing Minimal Mode Service...');

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

        // Set initial mode based on options
        if (options.enabled !== undefined) {
            minimalModeActive = options.enabled;
        }

        // Set initial preset
        if (options.preset && Object.values(MINIMAL_PRESETS).includes(options.preset)) {
            currentPreset = options.preset;
            applyPreset(currentPreset);
        }

        // Load user preferences if wallet is connected
        if (BlockchainService.isConnected()) {
            const userAddress = BlockchainService.getCurrentAccount();
            loadUserPreferences(userAddress);
        }

        initialized = true;
        console.log('Minimal Mode Service initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Minimal Mode Service:', error);
        return false;
    }
}

/**
 * Load user preferences
 * @param {string} userAddress User's wallet address
 */
function loadUserPreferences(userAddress) {
    if (!userAddress) return;

    const normalizedAddress = userAddress.toLowerCase();

    // Get user preferences or create default
    let preferences = userPreferences.get(normalizedAddress);

    // If no saved preferences, keep defaults
    if (preferences) {
        // Apply user's saved preferences
        minimalModeActive = preferences.enabled;
        currentPreset = preferences.preset;
        applyPreset(currentPreset);

        // Apply custom settings if present
        if (preferences.customSettings) {
            settings = {
                ...settings,
                ...preferences.customSettings
            };
        }
    }
}

/**
 * Apply a minimal mode preset
 * @param {string} preset Preset identifier
 */
function applyPreset(preset) {
    switch (preset) {
        case MINIMAL_PRESETS.ULTRA_MINIMAL:
            settings = {
                hideAnimations: true,
                reduceMotion: true,
                hideNonEssentialUI: true,
                simplifyWidgets: true,
                disableBackgroundEffects: true,
                reduceShadows: true,
                flattenUI: true,
                highContrastMode: false,
                minimalNotifications: true
            };
            break;

        case MINIMAL_PRESETS.BALANCED:
            settings = {
                hideAnimations: true,
                reduceMotion: true,
                hideNonEssentialUI: true,
                simplifyWidgets: true,
                disableBackgroundEffects: true,
                reduceShadows: true,
                flattenUI: false,
                highContrastMode: false,
                minimalNotifications: true
            };
            break;

        case MINIMAL_PRESETS.FOCUS:
            settings = {
                hideAnimations: true,
                reduceMotion: true,
                hideNonEssentialUI: true,
                simplifyWidgets: false,
                disableBackgroundEffects: true,
                reduceShadows: false,
                flattenUI: false,
                highContrastMode: true,
                minimalNotifications: true
            };
            break;

        case MINIMAL_PRESETS.PERFORMANCE:
            settings = {
                hideAnimations: true,
                reduceMotion: true,
                hideNonEssentialUI: false,
                simplifyWidgets: true,
                disableBackgroundEffects: true,
                reduceShadows: true,
                flattenUI: true,
                highContrastMode: false,
                minimalNotifications: false
            };
            break;
    }
}

/**
 * Toggle minimal mode
 * @param {boolean} [force] Optional force state
 * @returns {boolean} New minimal mode state
 */
export function toggleMinimalMode(force) {
    if (!initialized) {
        initMinimalModeService();
    }

    // Update state
    if (force !== undefined) {
        minimalModeActive = force;
    } else {
        minimalModeActive = !minimalModeActive;
    }

    // Save preferences if wallet is connected
    if (BlockchainService.isConnected()) {
        saveUserPreferences();
    }

    return minimalModeActive;
}

/**
 * Check if minimal mode is active
 * @returns {boolean} Whether minimal mode is active
 */
export function isMinimalModeActive() {
    return minimalModeActive;
}

/**
 * Get current minimal mode settings
 * @returns {Object} Current settings
 */
export function getMinimalModeSettings() {
    return { ...settings };
}

/**
 * Update minimal mode settings
 * @param {Object} newSettings New settings (partial update)
 * @returns {Object} Updated settings
 */
export function updateSettings(newSettings) {
    settings = {
        ...settings,
        ...newSettings
    };

    // Save preferences if wallet is connected
    if (BlockchainService.isConnected()) {
        saveUserPreferences();
    }

    return { ...settings };
}

/**
 * Set minimal mode preset
 * @param {string} preset Preset identifier
 * @returns {boolean} Success status
 */
export function setPreset(preset) {
    if (!Object.values(MINIMAL_PRESETS).includes(preset)) {
        return false;
    }

    currentPreset = preset;
    applyPreset(preset);

    // Save preferences if wallet is connected
    if (BlockchainService.isConnected()) {
        saveUserPreferences();
    }

    return true;
}

/**
 * Get current preset
 * @returns {string} Current preset
 */
export function getCurrentPreset() {
    return currentPreset;
}

/**
 * Save user preferences
 */
function saveUserPreferences() {
    if (!BlockchainService.isConnected()) return;

    const userAddress = BlockchainService.getCurrentAccount();
    if (!userAddress) return;

    const normalizedAddress = userAddress.toLowerCase();

    // Save current preferences
    userPreferences.set(normalizedAddress, {
        enabled: minimalModeActive,
        preset: currentPreset,
        customSettings: { ...settings },
        lastUpdated: Date.now()
    });
}

/**
 * Reset to default settings
 * @returns {Object} Default settings
 */
export function resetToDefaults() {
    currentPreset = MINIMAL_PRESETS.BALANCED;
    applyPreset(currentPreset);

    // Save preferences if wallet is connected
    if (BlockchainService.isConnected()) {
        saveUserPreferences();
    }

    return { ...settings };
}

/**
 * Get CSS class modifiers for minimal mode
 * @returns {Object} CSS class modifiers
 */
export function getMinimalModeClasses() {
    if (!minimalModeActive) {
        return {
            container: '',
            element: '',
            animation: '',
            widget: '',
            notification: ''
        };
    }

    return {
        container: 'minimal-container',
        element: 'minimal-element',
        animation: settings.hideAnimations ? 'minimal-no-animation' : '',
        widget: settings.simplifyWidgets ? 'minimal-widget' : '',
        notification: settings.minimalNotifications ? 'minimal-notification' : ''
    };
}

/**
 * Apply minimal mode styles to an element
 * @param {Object} element DOM element
 */
export function applyMinimalModeStyles(element) {
    if (!element || !minimalModeActive) return;

    const minimalClasses = getMinimalModeClasses();

    element.classList.add('minimal-mode');

    if (settings.flattenUI) {
        element.style.boxShadow = 'none';
        element.style.borderRadius = '0';
    }

    if (settings.reduceShadows) {
        element.style.boxShadow = 'none';
    }

    if (settings.hideAnimations) {
        element.style.transition = 'none';
        element.style.animation = 'none';
    }
}

export default {
    initMinimalModeService,
    toggleMinimalMode,
    isMinimalModeActive,
    getMinimalModeSettings,
    updateSettings,
    setPreset,
    getCurrentPreset,
    resetToDefaults,
    getMinimalModeClasses,
    applyMinimalModeStyles,
    MINIMAL_PRESETS
};
