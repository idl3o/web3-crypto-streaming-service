/**
 * Realm Service
 * 
 * Manages blockchain realm data including islands, platforms, and
 * geographic distributions across the streaming ecosystem.
 */

import { ref, reactive } from 'vue';
import * as BlockchainService from './BlockchainService';

// Chain definitions with colors
const BLOCKCHAIN_CHAINS = {
  ETH: {
    id: 'eth',
    name: 'Ethereum',
    color: '#627EEA'
  },
  POLYGON: {
    id: 'polygon',
    name: 'Polygon',
    color: '#8247E5'
  },
  BSC: {
    id: 'bsc',
    name: 'Binance Smart Chain',
    color: '#F3BA2F'
  },
  SOLANA: {
    id: 'solana',
    name: 'Solana',
    color: '#00FFA3'
  },
  AVALANCHE: {
    id: 'avalanche',
    name: 'Avalanche',
    color: '#E84142'
  },
  ARBITRUM: {
    id: 'arbitrum',
    name: 'Arbitrum',
    color: '#2D374B'
  },
  OPTIMISM: {
    id: 'optimism',
    name: 'Optimism',
    color: '#FF0420'
  }
};

// Platform types
const PLATFORM_TYPES = {
  DEFI: 'DeFi Platform',
  MARKETPLACE: 'NFT Marketplace',
  GAMING: 'Gaming Platform',
  SOCIAL: 'Social Network',
  STREAMING: 'Streaming Service',
  DAO: 'DAO Governance'
};

// Platform statuses
const PLATFORM_STATUSES = {
  ACTIVE: 'active',
  PENDING: 'pending',
  INACTIVE: 'inactive'
};

/**
 * Generate a randomized example island
 * @param {number} index Index for deterministic generation
 * @returns {Object} Example island data
 */
function generateExampleIsland(index) {
  const chains = Object.values(BLOCKCHAIN_CHAINS);
  const chain = chains[index % chains.length].id;
  
  const islandNames = [
    'Ethereal Isle', 'Blocktopia', 'Satoshi Springs', 'Vitalik Valley', 
    'Chain Harbor', 'Crypto Cove', 'Genesis Atoll', 'Hash Haven',
    'Merkle Mountain', 'Web3 Wonderland', 'Token Tropics', 'Validator Vista'
  ];
  
  // Use index for deterministic color generation
  const hue = (index * 35) % 360;
  const color = `hsl(${hue}, 70%, 60%)`;
  
  const name = islandNames[index % islandNames.length];
  const idBase = name.toLowerCase().replace(/\s/g, '_');
  
  return {
    id: `${idBase}_${index}`,
    name: `${name} ${Math.floor(index / islandNames.length) > 0 ? Math.floor(index / islandNames.length) + 1 : ''}`,
    chain,
    color,
    population: Math.floor(Math.random() * 10000) + 100,
    value: parseFloat((Math.random() * 100).toFixed(4)),
    platformId: `platform_${1 + Math.floor(index / 4)}`, // 4 islands per platform
    createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString() // Up to 90 days ago
  };
}

/**
 * Generate an example platform
 * @param {number} index Index for deterministic generation
 * @param {number} islandCount Number of islands on this platform
 * @returns {Object} Example platform data
 */
function generateExamplePlatform(index, islandCount) {
  const platformTypes = Object.values(PLATFORM_TYPES);
  const statuses = Object.values(PLATFORM_STATUSES);
  const type = platformTypes[index % platformTypes.length];
  
  // Platform names based on type
  const namesByType = {
    [PLATFORM_TYPES.DEFI]: ['Yield Garden', 'StakeHub', 'LiquidSwap', 'DefiNest'],
    [PLATFORM_TYPES.MARKETPLACE]: ['CryptoMart', 'TokenTraders', 'NFTNexus', 'DigitalBazaar'],
    [PLATFORM_TYPES.GAMING]: ['PlayBlock', 'GameChain', 'CryptoQuest', 'MetaArcade'],
    [PLATFORM_TYPES.SOCIAL]: ['ChainSocial', 'CryptoConnect', 'BlockChat', 'Web3Friends'],
    [PLATFORM_TYPES.STREAMING]: ['StreamChain', 'DecentralFlix', 'TokenCast', 'MediaBlock'],
    [PLATFORM_TYPES.DAO]: ['GovernanceHub', 'VoteChain', 'DAOcentral', 'ProposalNet']
  };
  
  const names = namesByType[type] || ['Platform'];
  const name = names[index % names.length];
  
  // Use index for deterministic color generation
  const hue = (index * 60) % 360;
  const color = `hsl(${hue}, 80%, 45%)`;
  
  // Determine icon based on platform type
  const iconByType = {
    [PLATFORM_TYPES.DEFI]: 'fa-chart-line',
    [PLATFORM_TYPES.MARKETPLACE]: 'fa-store',
    [PLATFORM_TYPES.GAMING]: 'fa-gamepad',
    [PLATFORM_TYPES.SOCIAL]: 'fa-users',
    [PLATFORM_TYPES.STREAMING]: 'fa-film',
    [PLATFORM_TYPES.DAO]: 'fa-landmark'
  };
  
  return {
    id: `platform_${index + 1}`,
    name: `${name} ${Math.floor(index / names.length) > 0 ? Math.floor(index / names.length) + 1 : ''}`,
    color,
    type,
    status: statuses[index % statuses.length],
    islandCount,
    totalValue: parseFloat((Math.random() * islandCount * 25).toFixed(4)),
    createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(), // Up to 180 days ago
    icon: iconByType[type] || 'fa-layer-group'
  };
}

/**
 * Create realm service with reactive state
 * @returns {Object} Realm service methods and state
 */
export function useRealmService() {
  // Reactive state
  const islandsData = ref([]);
  const platformsData = ref([]);
  const geographicClustersData = ref([]);
  const loading = ref({
    islands: false,
    platforms: false,
    geographic: false
  });
  
  /**
   * Get islands data
   * @returns {Promise<Array>} Islands data
   */
  async function fetchIslands() {
    if (islandsData.value.length > 0) {
      return islandsData.value;
    }
    
    loading.value.islands = true;
    
    try {
      // In a real implementation, this would fetch data from an API or blockchain
      // For this example, we'll generate mock data
      
      // Generate 20 example islands
      const mockIslands = Array.from({ length: 20 }, (_, i) => generateExampleIsland(i));
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      islandsData.value = mockIslands;
      return mockIslands;
    } finally {
      loading.value.islands = false;
    }
  }
  
  /**
   * Get platforms data
   * @returns {Promise<Array>} Platforms data
   */
  async function fetchPlatforms() {
    if (platformsData.value.length > 0) {
      return platformsData.value;
    }
    
    loading.value.platforms = true;
    
    try {
      // In a real implementation, this would fetch data from an API or blockchain
      // For this example, we'll generate mock data
      
      // Generate 6 example platforms (with 4 islands each for simplicity)
      const mockPlatforms = Array.from({ length: 6 }, (_, i) => generateExamplePlatform(i, 4));
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      platformsData.value = mockPlatforms;
      return mockPlatforms;
    } finally {
      loading.value.platforms = false;
    }
  }
  
  /**
   * Get geographic distribution data
   * @returns {Promise<Array>} Geographic distribution data
   */
  async function fetchGeographicData() {
    if (geographicClustersData.value.length > 0) {
      return geographicClustersData.value;
    }
    
    loading.value.geographic = true;
    
    try {
      // In a real implementation, this would fetch data from an API or blockchain
      // For this example, we'll generate mock data
      
      // Generate mock geographic clusters
      const chains = Object.values(BLOCKCHAIN_CHAINS);
      
      const mockClusters = chains.map((chain, index) => {
        const count = Math.floor(Math.random() * 10) + 2;
        return {
          id: `cluster_${chain.id}`,
          name: `${chain.name} Cluster`,
          chain: chain.id,
          color: chain.color,
          count,
          value: parseFloat((Math.random() * count * 20).toFixed(4)),
          size: Math.max(1, Math.min(5, count / 2)), // Visual size based on island count
          x: 15 + Math.random() * 70, // Position within viewbox percentage
          y: 20 + Math.random() * 60 // Position within viewbox percentage
        };
      });
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      geographicClustersData.value = mockClusters;
      return mockClusters;
    } finally {
      loading.value.geographic = false;
    }
  }
  
  /**
   * Get the chain's display name
   * @param {string} chainId Chain identifier
   * @returns {string} Chain display name
   */
  function getChainName(chainId) {
    const chain = Object.values(BLOCKCHAIN_CHAINS).find(c => c.id === chainId);
    return chain ? chain.name : 'Unknown Chain';
  }
  
  /**
   * Get the chain's color
   * @param {string} chainId Chain identifier
   * @returns {string} Chain color as CSS color value
   */
  function getChainColor(chainId) {
    const chain = Object.values(BLOCKCHAIN_CHAINS).find(c => c.id === chainId);
    return chain ? chain.color : '#cccccc';
  }
  
  return {
    fetchIslands,
    fetchPlatforms,
    fetchGeographicData,
    getChainName,
    getChainColor,
    availableChains: Object.values(BLOCKCHAIN_CHAINS),
    isLoading: loading
  };
}

export default {
  useRealmService,
  BLOCKCHAIN_CHAINS,
  PLATFORM_TYPES,
  PLATFORM_STATUSES
};
