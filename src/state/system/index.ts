/**
 * System State
 * 
 * Manages system-wide configuration, operational status, metrics, and meta-analysis.
 */

import { useConfigStore } from './ConfigState';
import { defineStore } from 'pinia';
import { useMetaStore as useLegacyMetaStore } from '@/stores/meta';
import { computed } from 'vue';

// Create a meta store wrapper
export const useMetaStore = defineStore('system/meta', () => {
    // Get the legacy store instance
    const legacyStore = useLegacyMetaStore();

    // Re-export the legacy store's functionality
    return {
        // State
        metaData: computed(() => legacyStore.metaData),
        sections: computed(() => legacyStore.sections),
        isLoading: computed(() => legacyStore.isLoading),
        error: computed(() => legacyStore.error),

        // Getters
        hasMetaData: computed(() => legacyStore.hasMetaData),
        getSection: legacyStore.getSection,
        getCorePatterns: computed(() => legacyStore.getCorePatterns),
        getMetrics: computed(() => legacyStore.getMetrics),
        getRelationships: computed(() => legacyStore.getRelationships),

        // Actions
        loadMetaAnalysis: legacyStore.loadMetaAnalysis,
        queryMetaData: legacyStore.queryMetaData
    };
});

// Export all system state stores
export {
    useConfigStore,
    useMetaStore
};

// Legacy re-export for backwards compatibility
export { useMetaStore as useLegacyMetaStore } from '@/stores/meta';
