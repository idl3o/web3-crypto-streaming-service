/**
 * Blockchain State - Wallet Module
 * 
 * Wraps the original wallet store for backward compatibility
 * while migrating to the new categorized structure.
 */
import { defineStore } from 'pinia';
import { useWalletStore as useLegacyWalletStore } from '@/stores/wallet';
import { computed } from 'vue';

export const useWalletStore = defineStore('blockchain/wallet', () => {
    // Get the legacy store instance
    const legacyStore = useLegacyWalletStore();

    // Re-export all properties from the legacy store
    return {
        // State
        provider: computed(() => legacyStore.provider),
        account: computed(() => legacyStore.account),
        chainId: computed(() => legacyStore.chainId),
        balance: computed(() => legacyStore.balance),
        isConnecting: computed(() => legacyStore.isConnecting),
        error: computed(() => legacyStore.error),
        userProfile: computed(() => legacyStore.userProfile),

        // Getters
        isConnected: computed(() => legacyStore.isConnected),
        shortAddress: computed(() => legacyStore.shortAddress),
        networkName: computed(() => legacyStore.networkName),

        // Actions
        connectWallet: legacyStore.connectWallet,
        disconnectWallet: legacyStore.disconnectWallet,
        refreshBalance: legacyStore.refreshBalance,
        switchNetwork: legacyStore.switchNetwork,
        sendPayment: legacyStore.sendPayment,
        hasSufficientBalance: legacyStore.hasSufficientBalance
    };
});
