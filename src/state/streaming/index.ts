/**
 * Streaming State
 * 
 * Manages streaming sessions, payments, and playback state.
 */

import { defineStore } from 'pinia';
import { useStreamingStore as useLegacyStreamingStore } from '@/stores/contentStreaming';
import { computed } from 'vue';

export const useStreamingStore = defineStore('streaming/main', () => {
    // Get the legacy store instance
    const legacyStore = useLegacyStreamingStore();

    // Re-export the legacy store's functionality
    return {
        // State
        activeStreams: computed(() => legacyStore.activeStreams),
        creatorEarnings: computed(() => legacyStore.creatorEarnings),
        viewerSpending: computed(() => legacyStore.viewerSpending),
        isInitialized: computed(() => legacyStore.isInitialized),
        isStreaming: computed(() => legacyStore.isStreaming),
        currentContent: computed(() => legacyStore.currentContent),
        contentLibrary: computed(() => legacyStore.contentLibrary),
        isLoadingContent: computed(() => legacyStore.isLoadingContent),
        contentLoadError: computed(() => legacyStore.contentLoadError),

        // Getters
        getActiveStreams: computed(() => legacyStore.getActiveStreams),
        getTotalSpent: computed(() => legacyStore.getTotalSpent),
        hasActiveStreams: computed(() => legacyStore.hasActiveStreams),

        // Actions
        initialize: legacyStore.initialize,
        fetchContentLibrary: legacyStore.fetchContentLibrary,
        getContentById: legacyStore.getContentById,
        startStream: legacyStore.startStream,
        stopStream: legacyStore.stopStream,
        uploadContent: legacyStore.uploadContent,
        getCreatorStats: legacyStore.getCreatorStats,
        cleanupStreams: legacyStore.cleanupStreams
    };
});

// Export the new store
export { useStreamingStore };

// Legacy re-export for backwards compatibility
export { useStreamingStore as useLegacyStreamingStore } from '@/stores/contentStreaming';
