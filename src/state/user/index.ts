/**
 * User State
 * 
 * Manages user profiles, preferences, history, and personalization.
 */
import { defineStore } from 'pinia';
import { useWalletStore } from '../blockchain';

// User Profile type definition
interface UserProfile {
    address: string;
    username?: string;
    avatar?: string;
    bio?: string;
    joinedAt: number;
    preferences?: UserPreferences;
    history?: WatchHistory;
}

// User preferences
interface UserPreferences {
    darkMode: boolean;
    autoplay: boolean;
    qualityPreference: 'auto' | 'low' | 'medium' | 'high';
    notifications: boolean;
    privacyMode: boolean;
}

// Watch history entry
interface WatchHistoryEntry {
    contentId: string;
    timestamp: number;
    duration: number;
    progress: number;
}

// Watch history
interface WatchHistory {
    entries: WatchHistoryEntry[];
    lastUpdated: number;
}

// Define the user store
export const useUserStore = defineStore('user', {
    state: () => ({
        currentProfile: null as UserProfile | null,
        isLoading: false,
        error: null as string | null,
    }),

    getters: {
        isAuthenticated: (state) => !!state.currentProfile,
        username: (state) => state.currentProfile?.username || 'Anonymous',
        avatar: (state) => state.currentProfile?.avatar || '/assets/images/default-avatar.png',
    },

    actions: {
        async loadProfile() {
            const walletStore = useWalletStore();
            this.isLoading = true;
            this.error = null;

            try {
                if (!walletStore.isConnected) {
                    throw new Error('Wallet not connected');
                }

                // For now, we'll use the user profile from the wallet store
                // Later we'll integrate with a proper user service
                if (walletStore.userProfile) {
                    this.currentProfile = {
                        ...walletStore.userProfile,
                        preferences: {
                            darkMode: true,
                            autoplay: true,
                            qualityPreference: 'auto',
                            notifications: true,
                            privacyMode: false,
                        },
                        history: {
                            entries: [],
                            lastUpdated: Date.now()
                        }
                    };
                }
            } catch (error) {
                this.error = error.message;
                console.error('Failed to load user profile:', error);
            } finally {
                this.isLoading = false;
            }
        },

        setPreference(key: keyof UserPreferences, value: any) {
            if (this.currentProfile && this.currentProfile.preferences) {
                this.currentProfile.preferences[key] = value;
            }
        },

        addToHistory(entry: Omit<WatchHistoryEntry, 'timestamp'>) {
            if (!this.currentProfile) return;

            if (!this.currentProfile.history) {
                this.currentProfile.history = {
                    entries: [],
                    lastUpdated: Date.now()
                };
            }

            // Remove existing entry for the same content
            const existingIndex = this.currentProfile.history.entries.findIndex(
                e => e.contentId === entry.contentId
            );

            if (existingIndex >= 0) {
                this.currentProfile.history.entries.splice(existingIndex, 1);
            }

            // Add new entry
            this.currentProfile.history.entries.unshift({
                ...entry,
                timestamp: Date.now()
            });

            // Update lastUpdated
            this.currentProfile.history.lastUpdated = Date.now();

            // Limit history length
            if (this.currentProfile.history.entries.length > 50) {
                this.currentProfile.history.entries = this.currentProfile.history.entries.slice(0, 50);
            }
        }
    }
});
