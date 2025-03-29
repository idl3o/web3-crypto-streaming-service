/**
 * Romance Marketplace Service
 * 
 * Handles user romance profiles, matching algorithms, and user interactions
 * for the Web3 Crypto Streaming Service's romance marketplace feature.
 */

import { ethers } from 'ethers';
import * as BlockchainService from './BlockchainService';
import * as NamingService from './NamingService';
import * as SafetyService from './SafetyService';

// Romance profile settings
export const PRIVACY_LEVELS = {
  PUBLIC: 'public',      // Visible to all users
  VERIFIED: 'verified',  // Visible only to verified users
  CURATED: 'curated',    // Visible only to selected networks
  PRIVATE: 'private'     // Visible only to matches
};

// Interaction types
export const INTERACTION_TYPES = {
  LIKE: 'like',
  SUPER_LIKE: 'super_like',
  MATCH: 'match',
  MESSAGE: 'message',
  BLOCK: 'block',
  REPORT: 'report'
};

// Match status
export const MATCH_STATUS = {
  PENDING: 'pending',
  MATCHED: 'matched',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

// Interest categories
export const INTEREST_CATEGORIES = {
  CRYPTO_ASSETS: 'crypto_assets',
  BLOCKCHAIN_TECH: 'blockchain_tech',
  NFT_COLLECTIONS: 'nft_collections',
  DEFI_PROTOCOLS: 'defi_protocols',
  METAVERSE: 'metaverse',
  WEB3_GAMING: 'web3_gaming',
  CRYPTO_CULTURE: 'crypto_culture'
};

// Cache for profiles and matches
const profileCache = new Map();
const matchesCache = new Map();
let serviceInitialized = false;

/**
 * Initialize the Romance Marketplace Service
 * 
 * @returns {Promise<boolean>} Success status
 */
export async function initRomanceService() {
  if (serviceInitialized) {
    return true;
  }
  
  try {
    // Clear caches
    profileCache.clear();
    matchesCache.clear();
    
    // Check wallet connection
    if (BlockchainService.isConnected()) {
      // Load current user's profile
      await loadUserProfile(BlockchainService.getCurrentAccount());
      
      // Load active matches
      await loadUserMatches(BlockchainService.getCurrentAccount());
    }
    
    console.log('Romance Marketplace Service initialized');
    serviceInitialized = true;
    return true;
  } catch (error) {
    console.error('Error initializing Romance Service:', error);
    return false;
  }
}

/**
 * Create or update a user's romance profile
 * 
 * @param {Object} profileData User profile data
 * @returns {Promise<Object>} Updated profile
 */
export async function updateUserProfile(profileData) {
  if (!serviceInitialized) {
    await initRomanceService();
  }
  
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet not connected');
  }
  
  try {
    const walletAddress = BlockchainService.getCurrentAccount();
    
    // Safety check for appropriate content
    if (profileData.bio) {
      const safetyResult = await SafetyService.checkContentSafety(profileData.bio);
      if (!safetyResult.isSafe) {
        throw new Error(`Bio contains inappropriate content: ${safetyResult.reason}`);
      }
    }
    
    // Prepare profile data
    const timestamp = Date.now();
    const existingProfile = profileCache.get(walletAddress.toLowerCase());
    
    const updatedProfile = {
      ...existingProfile,
      ...profileData,
      address: walletAddress,
      updatedAt: timestamp,
      createdAt: existingProfile?.createdAt || timestamp,
      isVerified: existingProfile?.isVerified || false,
      compatibilityFactors: {
        ...existingProfile?.compatibilityFactors,
        ...profileData.compatibilityFactors
      }
    };
    
    // In a real implementation, this would store the profile on-chain or in a decentralized storage
    // For demo purposes, we'll just cache it locally
    profileCache.set(walletAddress.toLowerCase(), updatedProfile);
    
    // Simulate blockchain operation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return updatedProfile;
  } catch (error) {
    console.error('Error updating romance profile:', error);
    throw error;
  }
}

/**
 * Fetch a user's romance profile
 * 
 * @param {string} address User wallet address
 * @param {boolean} forceRefresh Whether to force a refresh from the blockchain
 * @returns {Promise<Object>} User profile
 */
export async function getUserProfile(address, forceRefresh = false) {
  if (!serviceInitialized) {
    await initRomanceService();
  }
  
  if (!address) {
    throw new Error('Address is required to fetch profile');
  }
  
  try {
    const normalizedAddress = address.toLowerCase();
    
    // Check cache first unless forced refresh
    if (!forceRefresh && profileCache.has(normalizedAddress)) {
      return profileCache.get(normalizedAddress);
    }
    
    // In a real implementation, this would fetch the profile from the blockchain
    // For demo purposes, we'll generate a profile if it doesn't exist
    
    // If current user's profile is requested, generate a simple one
    if (BlockchainService.isConnected() && 
        normalizedAddress === BlockchainService.getCurrentAccount().toLowerCase()) {
      const generatedProfile = await generateUserProfile(address);
      profileCache.set(normalizedAddress, generatedProfile);
      return generatedProfile;
    }
    
    // For other addresses, simulate a blockchain query delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // If profile doesn't exist, generate a placeholder
    let profile = generatePlaceholderProfile(address);
    profileCache.set(normalizedAddress, profile);
    
    return profile;
  } catch (error) {
    console.error('Error getting romance profile:', error);
    throw error;
  }
}

/**
 * Find potential matches for the current user
 * 
 * @param {Object} options Search options
 * @returns {Promise<Array>} Potential matches
 */
export async function findPotentialMatches(options = {}) {
  if (!serviceInitialized) {
    await initRomanceService();
  }
  
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet not connected');
  }
  
  try {
    const walletAddress = BlockchainService.getCurrentAccount();
    
    // Get current user's profile
    const userProfile = await getUserProfile(walletAddress);
    
    // In a real implementation, this would query the blockchain or a decentralized database
    // For demo purposes, we'll generate random profiles
    
    const {
      count = 10,
      minCompatibility = 0.5,
      includeInterests = [],
      excludeInterests = [],
      chainPreference = null
    } = options;
    
    // Generate random profiles
    const potentialMatches = Array.from({ length: count + 5 }, (_, i) => {
      const match = generateRandomProfile();
      
      // Calculate compatibility score
      const compatibility = calculateCompatibilityScore(
        userProfile,
        match,
        { includeInterests, excludeInterests, chainPreference }
      );
      
      return {
        ...match,
        compatibilityScore: compatibility
      };
    });
    
    // Filter by minimum compatibility and sort by compatibility score
    const filteredMatches = potentialMatches
      .filter(match => match.compatibilityScore >= minCompatibility)
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, count);
    
    return filteredMatches;
  } catch (error) {
    console.error('Error finding potential matches:', error);
    throw error;
  }
}

/**
 * Create a match request with another user
 * 
 * @param {string} targetAddress Address to match with
 * @param {Object} options Match options
 * @returns {Promise<Object>} Match result
 */
export async function createMatchRequest(targetAddress, options = {}) {
  if (!serviceInitialized) {
    await initRomanceService();
  }
  
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet not connected');
  }
  
  try {
    const sourceAddress = BlockchainService.getCurrentAccount();
    
    if (sourceAddress.toLowerCase() === targetAddress.toLowerCase()) {
      throw new Error('Cannot match with yourself');
    }
    
    // Check if profiles exist
    const sourceProfile = await getUserProfile(sourceAddress);
    const targetProfile = await getUserProfile(targetAddress);
    
    if (!sourceProfile || !targetProfile) {
      throw new Error('Both users must have profiles to create matches');
    }
    
    // Check if there's an existing match
    const existingMatches = await getUserMatches(sourceAddress);
    const existingMatch = existingMatches.find(match => 
      match.participants.includes(targetAddress.toLowerCase())
    );
    
    if (existingMatch) {
      if (existingMatch.status === MATCH_STATUS.MATCHED) {
        return {
          success: true,
          match: existingMatch,
          message: 'Already matched with this user'
        };
      } else if (existingMatch.status === MATCH_STATUS.PENDING) {
        return {
          success: true,
          match: existingMatch,
          message: 'Match request already pending'
        };
      }
    }
    
    // Create match request
    const timestamp = Date.now();
    const matchId = `match_${sourceAddress.slice(2, 6)}_${targetAddress.slice(2, 6)}_${timestamp.toString(16)}`;
    
    const newMatch = {
      id: matchId,
      participants: [sourceAddress.toLowerCase(), targetAddress.toLowerCase()],
      initiator: sourceAddress.toLowerCase(),
      status: MATCH_STATUS.PENDING,
      createdAt: timestamp,
      updatedAt: timestamp,
      messages: [],
      interactionHistory: [{
        type: INTERACTION_TYPES.LIKE,
        from: sourceAddress.toLowerCase(),
        timestamp
      }]
    };
    
    // In a real implementation, this would be stored on a blockchain or in a decentralized database
    // For demo purposes, we'll just cache it locally
    
    // Update both users' match lists
    const matches = matchesCache.get(sourceAddress.toLowerCase()) || [];
    matches.push(newMatch);
    matchesCache.set(sourceAddress.toLowerCase(), matches);
    
    // Simulate blockchain delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      success: true,
      match: newMatch,
      message: 'Match request created successfully'
    };
  } catch (error) {
    console.error('Error creating match request:', error);
    throw error;
  }
}

/**
 * Respond to a match request
 * 
 * @param {string} matchId Match ID
 * @param {boolean} accept Whether to accept the match
 * @returns {Promise<Object>} Updated match
 */
export async function respondToMatchRequest(matchId, accept) {
  if (!serviceInitialized) {
    await initRomanceService();
  }
  
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet not connected');
  }
  
  try {
    const userAddress = BlockchainService.getCurrentAccount().toLowerCase();
    
    // Find the match
    const matches = await getUserMatches(userAddress);
    const matchIndex = matches.findIndex(m => m.id === matchId);
    
    if (matchIndex === -1) {
      throw new Error('Match not found');
    }
    
    const match = matches[matchIndex];
    
    // Verify user is a participant but not the initiator
    if (!match.participants.includes(userAddress)) {
      throw new Error('Not a participant in this match');
    }
    
    if (match.initiator === userAddress) {
      throw new Error('Cannot respond to your own match request');
    }
    
    // Check if match is still pending
    if (match.status !== MATCH_STATUS.PENDING) {
      throw new Error(`Match is already ${match.status}`);
    }
    
    // Update match status
    const timestamp = Date.now();
    const updatedMatch = {
      ...match,
      status: accept ? MATCH_STATUS.MATCHED : MATCH_STATUS.REJECTED,
      updatedAt: timestamp,
      interactionHistory: [
        ...match.interactionHistory,
        {
          type: accept ? INTERACTION_TYPES.MATCH : INTERACTION_TYPES.REJECT,
          from: userAddress,
          timestamp
        }
      ]
    };
    
    // Update cache
    matches[matchIndex] = updatedMatch;
    matchesCache.set(userAddress, matches);
    
    // In a real implementation, this would update the blockchain record
    // For demo purposes, we'll simulate a delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      match: updatedMatch,
      message: accept ? 'Match accepted!' : 'Match rejected'
    };
  } catch (error) {
    console.error('Error responding to match request:', error);
    throw error;
  }
}

/**
 * Get all matches for a user
 * 
 * @param {string} address User wallet address
 * @param {Object} options Filter options
 * @returns {Promise<Array>} User's matches
 */
export async function getUserMatches(address, options = {}) {
  if (!serviceInitialized) {
    await initRomanceService();
  }
  
  if (!address) {
    throw new Error('Address is required to fetch matches');
  }
  
  try {
    const normalizedAddress = address.toLowerCase();
    
    // Check cache first
    if (matchesCache.has(normalizedAddress)) {
      const matches = matchesCache.get(normalizedAddress);
      
      // Apply filters
      return filterMatches(matches, options);
    }
    
    // In a real implementation, this would fetch matches from a blockchain or database
    // For demo purposes, we'll generate random matches
    
    // Generate sample matches
    const sampleMatches = Array.from({ length: 5 }, (_, i) => generateSampleMatch(normalizedAddress, i));
    matchesCache.set(normalizedAddress, sampleMatches);
    
    return filterMatches(sampleMatches, options);
  } catch (error) {
    console.error('Error getting user matches:', error);
    throw error;
  }
}

/**
 * Send a message in a match
 * 
 * @param {string} matchId Match ID
 * @param {string} content Message content
 * @returns {Promise<Object>} Updated match
 */
export async function sendMatchMessage(matchId, content) {
  if (!serviceInitialized) {
    await initRomanceService();
  }
  
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet not connected');
  }
  
  try {
    const userAddress = BlockchainService.getCurrentAccount().toLowerCase();
    
    // Find the match
    const matches = await getUserMatches(userAddress);
    const matchIndex = matches.findIndex(m => m.id === matchId);
    
    if (matchIndex === -1) {
      throw new Error('Match not found');
    }
    
    const match = matches[matchIndex];
    
    // Verify user is a participant
    if (!match.participants.includes(userAddress)) {
      throw new Error('Not a participant in this match');
    }
    
    // Check if match is active
    if (match.status !== MATCH_STATUS.MATCHED) {
      throw new Error(`Cannot send message - match status is ${match.status}`);
    }
    
    // Safety check message content
    const safetyResult = await SafetyService.checkContentSafety(content);
    if (!safetyResult.isSafe) {
      throw new Error(`Message contains inappropriate content: ${safetyResult.reason}`);
    }
    
    // Create message
    const timestamp = Date.now();
    const messageId = `msg_${matchId}_${timestamp.toString(16)}`;
    
    const newMessage = {
      id: messageId,
      sender: userAddress,
      content,
      timestamp,
      read: false
    };
    
    // Update match with new message
    const updatedMatch = {
      ...match,
      updatedAt: timestamp,
      messages: [...(match.messages || []), newMessage],
      interactionHistory: [
        ...match.interactionHistory,
        {
          type: INTERACTION_TYPES.MESSAGE,
          from: userAddress,
          timestamp
        }
      ]
    };
    
    // Update cache
    matches[matchIndex] = updatedMatch;
    matchesCache.set(userAddress, matches);
    
    // In a real implementation, this would update the blockchain record
    // For demo purposes, we'll simulate a delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      success: true,
      match: updatedMatch,
      message: newMessage
    };
  } catch (error) {
    console.error('Error sending match message:', error);
    throw error;
  }
}

/**
 * Calculate a compatibility score between two profiles
 * 
 * @param {Object} profile1 First user profile
 * @param {Object} profile2 Second user profile
 * @param {Object} options Scoring options
 * @returns {number} Compatibility score (0-1)
 */
export function calculateCompatibilityScore(profile1, profile2, options = {}) {
  if (!profile1 || !profile2) return 0;
  
  try {
    let score = 0;
    let factors = 0;
    
    // Blockchain preferences
    if (profile1.chainPreference && profile2.chainPreference &&
        profile1.chainPreference === profile2.chainPreference) {
      score += 0.2;
    }
    factors++;
    
    // Shared interests
    const interests1 = new Set(profile1.interests || []);
    const interests2 = new Set(profile2.interests || []);
    
    if (interests1.size && interests2.size) {
      // Count intersecting interests
      const intersections = [...interests1].filter(interest => interests2.has(interest));
      const interestScore = intersections.length / Math.max(interests1.size, interests2.size);
      score += interestScore * 0.3;
    }
    factors++;
    
    // Asset compatibility
    if (profile1.assets && profile2.assets) {
      let assetScore = 0;
      
      // Similar asset types (NFTs, tokens, etc)
      const types1 = new Set(Object.keys(profile1.assets));
      const types2 = new Set(Object.keys(profile2.assets));
      const typesIntersection = [...types1].filter(type => types2.has(type));
      
      if (types1.size && types2.size) {
        assetScore += typesIntersection.length / Math.max(types1.size, types2.size) * 0.5;
      }
      
      score += assetScore * 0.2;
      factors++;
    }
    
    // Compatibility factors (vibe, activity level, etc)
    if (profile1.compatibilityFactors && profile2.compatibilityFactors) {
      let factorScore = 0;
      let factorCount = 0;
      
      // Activity level compatibility (0-5 scale)
      if ('activityLevel' in profile1.compatibilityFactors && 
          'activityLevel' in profile2.compatibilityFactors) {
        const activityDiff = Math.abs(
          profile1.compatibilityFactors.activityLevel - 
          profile2.compatibilityFactors.activityLevel
        );
        factorScore += (5 - activityDiff) / 5;
        factorCount++;
      }
      
      // Risk tolerance compatibility (0-5 scale)
      if ('riskTolerance' in profile1.compatibilityFactors && 
          'riskTolerance' in profile2.compatibilityFactors) {
        const riskDiff = Math.abs(
          profile1.compatibilityFactors.riskTolerance - 
          profile2.compatibilityFactors.riskTolerance
        );
        factorScore += (5 - riskDiff) / 5;
        factorCount++;
      }
      
      if (factorCount > 0) {
        score += (factorScore / factorCount) * 0.3;
        factors++;
      }
    }
    
    // For demo purposes, add a random element to make results more diverse
    score += Math.random() * 0.2;
    factors++;
    
    // Normalize the score
    return Math.min(1, Math.max(0, score / factors));
  } catch (error) {
    console.error('Error calculating compatibility:', error);
    return 0;
  }
}

// Helper functions
function filterMatches(matches, options) {
  const { status, onlyActive = true } = options;
  
  return matches.filter(match => {
    if (status && match.status !== status) {
      return false;
    }
    
    if (onlyActive && match.status === MATCH_STATUS.REJECTED) {
      return false;
    }
    
    return true;
  });
}

async function loadUserProfile(address) {
  // This would load a user's profile from the blockchain
  return getUserProfile(address);
}

async function loadUserMatches(address) {
  // This would load a user's matches from the blockchain
  return getUserMatches(address);
}

function generateUserProfile(address) {
  // Generate a basic profile for the current user
  return {
    address: address.toLowerCase(),
    displayName: NamingService.formatAddressName(address),
    bio: "Web3 enthusiast looking for like-minded connections. Into blockchain technology, NFTs, and decentralized systems.",
    interests: ["defi", "nfts", "gaming", "daos"],
    chainPreference: "ethereum",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isVerified: true,
    privacyLevel: PRIVACY_LEVELS.PUBLIC,
    compatibilityFactors: {
      activityLevel: 3,  // 0-5 scale
      riskTolerance: 3,  // 0-5 scale
      techFocus: 4       // 0-5 scale
    },
    assets: {
      nfts: ["cryptopunks", "artblocks"],
      tokens: ["eth", "matic", "link"]
    }
  };
}

function generatePlaceholderProfile(address) {
  // Create a placeholder profile for a given address
  const names = [
    "Blockchain Explorer", "Crypto Dreamer", "NFT Collector", 
    "DeFi Developer", "Web3 Innovator", "DAO Participant",
    "Token Trader", "Hash Hunter", "Digital Miner"
  ];
  
  const bios = [
    "Exploring the blockchain frontier and looking for companions on this journey.",
    "Building the future of Web3 one block at a time.",
    "Digital art collector and blockchain enthusiast.",
    "Financial freedom through decentralization is my passion."
  ];
  
  const interestSets = [
    ["defi", "yield_farming", "staking", "trading"],
    ["nfts", "digital_art", "collecting", "creators"],
    ["gaming", "metaverse", "virtual_worlds", "play_to_earn"],
    ["daos", "governance", "community", "voting"],
    ["privacy", "security", "scaling", "layer2"]
  ];
  
  const chains = ["ethereum", "polygon", "solana", "avalanche", "arbitrum", "optimism"];
  
  // Deterministic but pseudo-random selection based on address
  const hash = ethers.utils.id(address);
  const hashNum = parseInt(hash.slice(2, 10), 16);
  
  const nameIndex = hashNum % names.length;
  const bioIndex = (hashNum >> 8) % bios.length;
  const interestIndex = (hashNum >> 16) % interestSets.length;
  const chainIndex = (hashNum >> 24) % chains.length;
  const timestamp = Date.now() - (hashNum % (90 * 24 * 60 * 60 * 1000)); // Up to 90 days ago
  
  return {
    address: address.toLowerCase(),
    displayName: names[nameIndex],
    bio: bios[bioIndex],
    interests: interestSets[interestIndex],
    chainPreference: chains[chainIndex],
    createdAt: timestamp,
    updatedAt: timestamp,
    isVerified: hashNum % 2 === 0, // 50% chance of being verified
    privacyLevel: PRIVACY_LEVELS.PUBLIC,
    compatibilityFactors: {
      activityLevel: (hashNum % 6),  // 0-5 scale
      riskTolerance: ((hashNum >> 8) % 6),  // 0-5 scale
      techFocus: ((hashNum >> 16) % 6)  // 0-5 scale
    },
    assets: {
      nfts: [],
      tokens: chains[chainIndex] === "ethereum" ? ["eth"] : [chains[chainIndex]]
    }
  };
}

function generateRandomProfile() {
  const address = ethers.Wallet.createRandom().address;
  return generatePlaceholderProfile(address);
}

function generateSampleMatch(userAddress, index) {
  // Create a sample match for demo purposes
  const otherAddress = ethers.Wallet.createRandom().address.toLowerCase();
  const timestamp = Date.now() - (index * 24 * 60 * 60 * 1000); // Each match is a day apart
  const matchId = `match_${userAddress.slice(2, 6)}_${otherAddress.slice(2, 6)}_${timestamp.toString(16)}`;
  
  // Alternate between userAddress and otherAddress as initiator
  const isUserInitiator = index % 2 === 0;
  const initiator = isUserInitiator ? userAddress : otherAddress;
  
  // Default to pending status, but make some matched/rejected
  let status = MATCH_STATUS.PENDING;
  if (index % 3 === 0) {
    status = MATCH_STATUS.MATCHED;
  } else if (index % 3 === 1) {
    status = MATCH_STATUS.REJECTED;
  }
  
  // Create interaction history
  const interactionHistory = [
    {
      type: INTERACTION_TYPES.LIKE,
      from: initiator,
      timestamp
    }
  ];
  
  // If match is accepted/rejected, add that interaction
  if (status !== MATCH_STATUS.PENDING) {
    const responder = initiator === userAddress ? otherAddress : userAddress;
    interactionHistory.push({
      type: status === MATCH_STATUS.MATCHED ? INTERACTION_TYPES.MATCH : INTERACTION_TYPES.REJECT,
      from: responder,
      timestamp: timestamp + 3600000 // Response 1 hour later
    });
  }
  
  // For matched status, add some messages
  const messages = [];
  if (status === MATCH_STATUS.MATCHED) {
    const messageCount = 2 + index % 3; // 2-4 messages
    for (let i = 0; i < messageCount; i++) {
      const sender = i % 2 === 0 ? userAddress : otherAddress;
      const messageTime = timestamp + (3600000 * (i + 2)); // Messages start 2 hours after match
      
      messages.push({
        id: `msg_${matchId}_${i}`,
        sender,
        content: getRandomMessage(i, userAddress === sender),
        timestamp: messageTime,
        read: sender !== userAddress // Messages from other user are read
      });
    }
  }
  
  return {
    id: matchId,
    participants: [userAddress, otherAddress],
    initiator,
    status,
    createdAt: timestamp,
    updatedAt: timestamp + (messages.length ? 3600000 * (2 + messages.length) : 0),
    messages,
    interactionHistory
  };
}

function getRandomMessage(index, isUser) {
  const userMessages = [
    "Hey! I noticed we both like DeFi protocols. What's your favorite one right now?",
    "I'm really interested in your NFT collection. How did you get started?",
    "Would love to chat about blockchain governance models sometime!"
  ];
  
  const otherMessages = [
    "Hi there! I'm big on Aave and Compound right now. You?",
    "Thanks for reaching out! I started with CryptoPunks but have branched out a lot since.",
    "I'd love that! I think DAOs are the future of organization."
  ];
  
  const messages = isUser ? userMessages : otherMessages;
  return messages[index % messages.length];
}

export default {
  initRomanceService,
  updateUserProfile,
  getUserProfile,
  findPotentialMatches,
  createMatchRequest,
  respondToMatchRequest,
  getUserMatches,
  sendMatchMessage,
  calculateCompatibilityScore,
  PRIVACY_LEVELS,
  INTERACTION_TYPES,
  MATCH_STATUS,
  INTEREST_CATEGORIES
};
