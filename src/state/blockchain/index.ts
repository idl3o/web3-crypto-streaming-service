/**
 * Blockchain State
 * 
 * Exports all blockchain-related state stores:
 * - wallet: Connection status, address, balances
 * - contracts: Smart contract interactions
 * - transactions: Transaction history and status
 * - networks: Network configuration and status
 */

import { useWalletStore } from './wallet';

// Export the new wallet store
export { useWalletStore };

// Legacy re-export for backwards compatibility
// This maintains the API while we're migrating
export { useWalletStore as useLegacyWalletStore } from '@/stores/wallet';

export * from './wallet';
export * from './contracts';
export * from './transactions';
export * from './networks';
