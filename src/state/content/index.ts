/**
 * Content State
 * 
 * Manages content metadata, discovery, content library, and licensing.
 */

import { defineStore } from 'pinia';
import { useContentStore as useLegacyContentStore } from '@/stores/content';
import { computed } from 'vue';

export const useContentStore = defineStore('content/main', () => {
    // Get the legacy store instance
    const legacyStore = useLegacyContentStore();

    // Create store with legacy functionality
    return {
        // State
        contents: computed(() => legacyStore.contents),
        featuredIds: computed(() => legacyStore.featuredIds),
        isLoading: computed(() => legacyStore.isLoading),
        error: computed(() => legacyStore.error),
        featuredContent: computed(() => legacyStore.featuredContent),
        userContent: computed(() => legacyStore.userContent),

        // Getters
        getContentById: legacyStore.getContentById,
        getFeaturedContent: computed(() => legacyStore.getFeaturedContent),
        getUserContent: computed(() => legacyStore.getUserContent),

        // Actions
        loadFeaturedContent: legacyStore.loadFeaturedContent,
        uploadContent: legacyStore.uploadContent,
        fetchContentMetadata: legacyStore.fetchContentMetadata
    };
});

// Export the new store
export { useContentStore };

// Legacy re-export for backwards compatibility
export { useContentStore as useLegacyContentStore } from '@/stores/content';
