/**
 * Minimal Mode Composable
 * 
 * Provides reactive access to minimal mode state and settings
 * for use in Vue components.
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import * as MinimalModeService from '@/services/MinimalModeService';

/**
 * Composable function for using minimal mode
 * @param {Object} options Configuration options
 * @returns {Object} Minimal mode state and methods
 */
export default function useMinimalMode(options = {}) {
    // Initialize state
    const isMinimalMode = ref(false);
    const settings = ref({});
    const currentPreset = ref('');

    // Options
    const autoApplyClasses = options.autoApplyClasses !== false;
    const watchForChanges = options.watchForChanges !== false;

    // Elements that should have minimal mode styles applied
    const targetElements = ref(options.elements || []);

    /**
     * Toggle minimal mode
     * @param {boolean} force Force state (optional)
     * @returns {boolean} New state
     */
    function toggleMinimalMode(force) {
        const newState = MinimalModeService.toggleMinimalMode(force);
        isMinimalMode.value = newState;

        // Update settings
        refreshSettings();

        // Apply styles if auto-apply is enabled
        if (autoApplyClasses) {
            applyMinimalModeStyles();
        }

        return newState;
    }

    /**
     * Update minimal mode settings
     * @param {Object} newSettings New settings
     */
    function updateSettings(newSettings) {
        const updatedSettings = MinimalModeService.updateSettings(newSettings);
        settings.value = { ...updatedSettings };

        // Apply styles if minimal mode is active and auto-apply is enabled
        if (isMinimalMode.value && autoApplyClasses) {
            applyMinimalModeStyles();
        }
    }

    /**
     * Set minimal mode preset
     * @param {string} preset Preset identifier
     */
    function setPreset(preset) {
        const success = MinimalModeService.setPreset(preset);

        if (success) {
            currentPreset.value = preset;
            settings.value = { ...MinimalModeService.getMinimalModeSettings() };

            // Apply styles if minimal mode is active and auto-apply is enabled
            if (isMinimalMode.value && autoApplyClasses) {
                applyMinimalModeStyles();
            }
        }
    }

    /**
     * Refresh settings from service
     */
    function refreshSettings() {
        settings.value = { ...MinimalModeService.getMinimalModeSettings() };
        currentPreset.value = MinimalModeService.getCurrentPreset();
    }

    /**
     * Apply minimal mode styles to target elements
     */
    function applyMinimalModeStyles() {
        if (!isMinimalMode.value || !autoApplyClasses) return;

        targetElements.value.forEach(element => {
            if (element && typeof element === 'object') {
                MinimalModeService.applyMinimalModeStyles(element);
            }
        });
    }

    /**
     * Add an element to the target elements list
     * @param {HTMLElement} element DOM element
     */
    function addTargetElement(element) {
        if (!element) return;

        if (!targetElements.value.includes(element)) {
            targetElements.value.push(element);

            // Apply styles immediately if minimal mode is active
            if (isMinimalMode.value && autoApplyClasses) {
                MinimalModeService.applyMinimalModeStyles(element);
            }
        }
    }

    /**
     * Remove an element from the target elements list
     * @param {HTMLElement} element DOM element
     */
    function removeTargetElement(element) {
        if (!element) return;

        const index = targetElements.value.indexOf(element);
        if (index !== -1) {
            targetElements.value.splice(index, 1);
        }
    }

    /**
     * Reset to default settings
     */
    function resetToDefaults() {
        const defaultSettings = MinimalModeService.resetToDefaults();
        settings.value = { ...defaultSettings };
        currentPreset.value = MinimalModeService.getCurrentPreset();

        // Apply styles if minimal mode is active and auto-apply is enabled
        if (isMinimalMode.value && autoApplyClasses) {
            applyMinimalModeStyles();
        }
    }

    /**
     * Get CSS class modifiers for minimal mode
     * @returns {Object} CSS class modifiers
     */
    const minimalModeClasses = computed(() => {
        return MinimalModeService.getMinimalModeClasses();
    });

    // Watch for changes to apply styles automatically
    if (watchForChanges) {
        watch(isMinimalMode, (newValue) => {
            if (newValue && autoApplyClasses) {
                applyMinimalModeStyles();
            }
        });

        watch(settings, () => {
            if (isMinimalMode.value && autoApplyClasses) {
                applyMinimalModeStyles();
            }
        });
    }

    // Initialize on component mount
    onMounted(() => {
        // Initialize the service if not already initialized
        MinimalModeService.initMinimalModeService().then(() => {
            // Get current state
            isMinimalMode.value = MinimalModeService.isMinimalModeActive();
            refreshSettings();

            // Apply styles if minimal mode is active and auto-apply is enabled
            if (isMinimalMode.value && autoApplyClasses) {
                applyMinimalModeStyles();
            }
        });
    });

    // Clean up on component unmount
    onUnmounted(() => {
        // Clear target elements
        targetElements.value = [];
    });

    return {
        isMinimalMode,
        settings,
        currentPreset,
        toggleMinimalMode,
        updateSettings,
        setPreset,
        refreshSettings,
        resetToDefaults,
        minimalModeClasses,
        applyMinimalModeStyles,
        addTargetElement,
        removeTargetElement,
        MINIMAL_PRESETS: MinimalModeService.MINIMAL_PRESETS
    };
}
