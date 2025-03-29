/**
 * Web3 Crypto Streaming Service - Master Index
 * 
 * This file serves as the main entry point for importing services and utilities
 * provided by the Web3 Crypto Streaming Service platform.
 * 
 * @module Web3CryptoStreamingService
 */

// Core Services
export * as BlockchainService from './services/BlockchainService';
export * as DataVerificationService from './services/DataVerificationService';
export * as SecurityService from './services/RiceAdvancedNetworkSecurityService';

// Protocol Services
export * as JerusalemProtocolService from './services/JerusalemProtocolService';
export * as MAHGAService from './services/MAHGAService';

// Intelligence Services
export * as PrecogEngine from './services/PrecogEngine';
export * as WebPilotService from './services/WebPilotService';
export * as FactCheckService from './services/FactCheckService';

// Feature Services
export * as TokenLockupService from './services/TokenLockupService';
export * as AirdropService from './services/AirdropService';
export * as BuffService from './services/BuffService';
export * as CertificateService from './services/CertificateService';
export * as ChatService from './services/ChatService';
export * as FilmService from './services/FilmService';
export * as MusicStreamingService from './services/MusicStreamingService';
export * as SatoshiPonService from './services/SatoshiPonService';
export * as TreasuryService from './services/TreasuryService';

// Streaming Data Services
export * as NetworkService from './services/NetworkService';
export * as LocalNetworkService from './services/LocalNetworkService';
export * as MetricsService from './services/MetricsService';

// Utility Functions
export * from './utils/ShortestPathFinder';

// Composables (Vue 3)
export { default as useBuffSystem } from './composables/useBuffSystem';
export { default as useMinimalMode } from './composables/useMinimalMode';

// Common Components
export { default as ThemeToggler } from './components/common/ThemeToggler';
export { default as ToggleSwitch } from './components/common/ToggleSwitch';
export { default as DateRangePicker } from './components/common/DateRangePicker';

// Content Components
export { default as ContentCard } from './components/content/ContentCard';
export { default as ContentHologram } from './components/content/ContentHologram';
export { default as TheaterModeViewer } from './components/content/TheaterModeViewer';

// Specialized Components
export { default as HologramViewer } from './components/hologram/HologramViewer';
export { default as NetworkStatusIndicator } from './components/network/NetworkStatusIndicator';
export { default as UserBuffsList } from './components/buffs/UserBuffsList';
export { default as PrecogVisualization } from './components/precog/PrecogVisualization';

// Default export with version and configuration
export default {
  version: '1.0.0',
  name: 'Web3 Crypto Streaming Service',
  supportedNetworks: ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism'],
  defaultTheme: 'uranium-theme',
  initialize: async (options = {}) => {
    // Initialize core services in proper order
    const { BlockchainService } = await import('./services/BlockchainService');
    const { SecurityService } = await import('./services/RiceAdvancedNetworkSecurityService');
    const { DataVerificationService } = await import('./services/DataVerificationService');
    
    // Initialize in sequence
    await BlockchainService.initialize(options.blockchain);
    await SecurityService.initSecurityService(options.security);
    await DataVerificationService.initialize(options.verification);
    
    return {
      status: 'initialized',
      timestamp: Date.now(),
      options
    };
  }
};
