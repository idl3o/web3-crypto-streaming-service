/**
 * Central State Management System
 * 
 * This file organizes and exports the different state categories used throughout
 * the Web3 Crypto Streaming Service application.
 */

// UI State - Manages presentation state and UI interactions
export * from './ui';

// User State - Manages user data, profiles, and session info
export * from './user';

// Blockchain State - Manages wallet connections and blockchain interactions
export * from './blockchain';

// Content State - Manages content metadata, discovery, and licensing
export * from './content';

// Streaming State - Manages streaming sessions and payments
export * from './streaming';

// System State - Manages system configuration and operational status
export * from './system';

// Legacy store compatibility - Re-export existing stores with their category mapping
// These exports will be gradually removed as migration progresses
import { useWalletStore } from '@/stores/wallet';
import { useStreamingStore } from '@/stores/contentStreaming';
import { useContentStore } from '@/stores/content';
import { useMetaStore } from '@/stores/meta';

export {
    useWalletStore,
    useStreamingStore,
    useContentStore,
    useMetaStore
};
