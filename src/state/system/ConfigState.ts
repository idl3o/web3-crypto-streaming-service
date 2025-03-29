import { defineStore } from 'pinia';

/**
 * System Configuration State
 * Centralizes application configuration management
 */
export const useConfigStore = defineStore('config', {
    state: () => ({
        // API endpoints
        apiEndpoints: {
            content: process.env.VUE_APP_CONTENT_API || '/api/content',
            auth: process.env.VUE_APP_AUTH_API || '/api/auth',
            stream: process.env.VUE_APP_STREAM_API || '/api/stream',
            stats: process.env.VUE_APP_STATS_API || '/api/stats',
        },

        // IPFS configuration
        ipfs: {
            gateway: process.env.VUE_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
            apiUrl: process.env.VUE_APP_IPFS_API_URL,
            timeout: parseInt(process.env.VUE_APP_IPFS_TIMEOUT || '30000'),
        },

        // Blockchain configuration
        blockchain: {
            supportedNetworks: [1, 5, 137, 80001, 42161], // Mainnet, Goerli, Polygon, Mumbai, Arbitrum
            defaultNetwork: parseInt(process.env.VUE_APP_DEFAULT_NETWORK || '1'),
            rpcUrls: {
                1: process.env.VUE_APP_ETHEREUM_RPC || 'https://mainnet.infura.io/v3/YOUR_API_KEY',
                5: process.env.VUE_APP_GOERLI_RPC || 'https://goerli.infura.io/v3/YOUR_API_KEY',
                137: process.env.VUE_APP_POLYGON_RPC || 'https://polygon-rpc.com',
                80001: process.env.VUE_APP_MUMBAI_RPC || 'https://rpc-mumbai.maticvigil.com',
                42161: process.env.VUE_APP_ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc',
            },
            contracts: {
                token: process.env.VUE_APP_TOKEN_CONTRACT,
                streaming: process.env.VUE_APP_STREAMING_CONTRACT,
                license: process.env.VUE_APP_LICENSE_CONTRACT,
            },
        },

        // Feature flags
        features: {
            betaFeatures: process.env.VUE_APP_ENABLE_BETA === 'true',
            p2pStreaming: process.env.VUE_APP_ENABLE_P2P === 'true',
            contentCreation: process.env.VUE_APP_ENABLE_CONTENT_CREATION === 'true',
            tokenomics: process.env.VUE_APP_ENABLE_TOKENOMICS === 'true',
            governance: process.env.VUE_APP_ENABLE_GOVERNANCE === 'true',
        },

        // System status
        system: {
            initialized: false,
            version: process.env.VUE_APP_VERSION || '0.1.0',
            environment: process.env.NODE_ENV || 'development',
            lastUpdateCheck: null,
            updateAvailable: false,
        }
    }),

    getters: {
        isProduction: (state) => state.system.environment === 'production',
        apiBase: (state) => process.env.VUE_APP_API_BASE || '',
        defaultIpfsGateway: (state) => state.ipfs.gateway,
        defaultRpcUrl: (state) => state.blockchain.rpcUrls[state.blockchain.defaultNetwork],
    },

    actions: {
        setInitialized(value = true) {
            this.system.initialized = value;
        },

        updateFeatureFlag(flag, value) {
            if (this.features.hasOwnProperty(flag)) {
                this.features[flag] = value;
            }
        },

        async checkForUpdates() {
            // Implementation for checking system updates
            this.system.lastUpdateCheck = new Date();
            // Check update logic would go here
            return this.system.updateAvailable;
        }
    }
});
