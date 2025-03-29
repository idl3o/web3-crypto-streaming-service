/**
 * GGWP Service - Good Game, Well Played
 * 
 * Provides achievement-based recognition and rewards for user actions
 * within the Web3 Crypto Streaming Service platform.
 */

import { ref } from 'vue';
import * as BlockchainService from './BlockchainService';
import * as NamingService from './NamingService';

// Achievement categories
export const ACHIEVEMENT_CATEGORIES = {
  TRANSACTIONS: 'transactions',
  STREAMING: 'streaming',
  INVESTMENT: 'investment',
  COMMUNITY: 'community',
  SPECIAL: 'special'
};

// Achievement tiers
export const ACHIEVEMENT_TIERS = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
  DIAMOND: 'diamond'
};

// Service state
let initialized = false;
const userAchievements = new Map();
const achievementDefinitions = new Map();
const activeListeners = new Map();
const recentMilestones = ref([]);

/**
 * Initialize the GGWP Service
 * @returns {Promise<boolean>} Success status
 */
export async function initGGWPService() {
  if (initialized) {
    return true;
  }
  
  try {
    console.log('Initializing GGWP Achievement Service...');
    
    // Load achievement definitions
    loadAchievementDefinitions();
    
    // If wallet is connected, load user achievements
    if (BlockchainService.isConnected()) {
      await loadUserAchievements(BlockchainService.getCurrentAccount());
    }
    
    // Set up event listeners
    setupEventListeners();
    
    initialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize GGWP Service:', error);
    return false;
  }
}

/**
 * Load achievement definitions
 */
function loadAchievementDefinitions() {
  // Transaction achievements
  registerAchievement({
    id: 'first_transaction',
    name: 'First Steps',
    description: 'Complete your first blockchain transaction',
    category: ACHIEVEMENT_CATEGORIES.TRANSACTIONS,
    tier: ACHIEVEMENT_TIERS.BRONZE,
    icon: 'fa-check-circle',
    points: 10,
    conditions: {
      transactionCount: 1
    }
  });
  
  registerAchievement({
    id: 'transaction_master',
    name: 'Transaction Master',
    description: 'Complete 100 blockchain transactions',
    category: ACHIEVEMENT_CATEGORIES.TRANSACTIONS,
    tier: ACHIEVEMENT_TIERS.GOLD,
    icon: 'fa-award',
    points: 100,
    conditions: {
      transactionCount: 100
    }
  });
  
  // Streaming achievements
  registerAchievement({
    id: 'stream_starter',
    name: 'Stream Starter',
    description: 'Stream your first content',
    category: ACHIEVEMENT_CATEGORIES.STREAMING,
    tier: ACHIEVEMENT_TIERS.BRONZE,
    icon: 'fa-play-circle',
    points: 15,
    conditions: {
      streamsCreated: 1
    }
  });
  
  registerAchievement({
    id: 'content_consumer',
    name: 'Content Consumer',
    description: 'Watch 50 streams',
    category: ACHIEVEMENT_CATEGORIES.STREAMING,
    tier: ACHIEVEMENT_TIERS.SILVER,
    icon: 'fa-eye',
    points: 50,
    conditions: {
      streamsWatched: 50
    }
  });
  
  // Investment achievements
  registerAchievement({
    id: 'first_investment',
    name: 'First Investment',
    description: 'Make your first investment',
    category: ACHIEVEMENT_CATEGORIES.INVESTMENT,
    tier: ACHIEVEMENT_TIERS.BRONZE,
    icon: 'fa-chart-line',
    points: 20,
    conditions: {
      investmentsCount: 1
    }
  });
  
  registerAchievement({
    id: 'gladston_strategy',
    name: 'Strategic Investor',
    description: 'Create a Gladston investment strategy',
    category: ACHIEVEMENT_CATEGORIES.INVESTMENT,
    tier: ACHIEVEMENT_TIERS.SILVER,
    icon: 'fa-brain',
    points: 50,
    conditions: {
      gladstonStrategiesCreated: 1
    }
  });
  
  // Community achievements
  registerAchievement({
    id: 'community_member',
    name: 'Community Member',
    description: 'Join your first community',
    category: ACHIEVEMENT_CATEGORIES.COMMUNITY,
    tier: ACHIEVEMENT_TIERS.BRONZE,
    icon: 'fa-users',
    points: 15,
    conditions: {
      communitiesJoined: 1
    }
  });
  
  registerAchievement({
    id: 'testimonial_writer',
    name: 'Testimonial Writer',
    description: 'Leave 5 testimonials',
    category: ACHIEVEMENT_CATEGORIES.COMMUNITY,
    tier: ACHIEVEMENT_TIERS.SILVER,
    icon: 'fa-comment',
    points: 30,
    conditions: {
      testimonialsCreated: 5
    }
  });
  
  // Special achievements
  registerAchievement({
    id: 'matt_damon_campaign',
    name: 'Fortune Favors the Brave',
    description: 'Join Matt Damon\'s campaign',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    tier: ACHIEVEMENT_TIERS.SILVER,
    icon: 'fa-star',
    points: 50,
    conditions: {
      specialEvents: ['matt_damon_campaign']
    }
  });
  
  registerAchievement({
    id: 'realm_explorer',
    name: 'Realm Explorer',
    description: 'Explore the blockchain realm',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    tier: ACHIEVEMENT_TIERS.SILVER,
    icon: 'fa-globe',
    points: 40,
    conditions: {
      specialEvents: ['visited_blockchain_realm']
    }
  });
  
  registerAchievement({
    id: 'ggwp_master',
    name: 'GGWP Master',
    description: 'Earn 500 achievement points',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    tier: ACHIEVEMENT_TIERS.DIAMOND,
    icon: 'fa-crown',
    points: 100,
    conditions: {
      achievementPoints: 500
    }
  });
  
  console.log(`Loaded ${achievementDefinitions.size} achievement definitions`);
}

/**
 * Register an achievement definition
 * @param {Object} achievement Achievement definition
 */
function registerAchievement(achievement) {
  achievementDefinitions.set(achievement.id, achievement);
}

/**
 * Setup event listeners for achievements
 */
function setupEventListeners() {
  // Here we would set up listeners for various events that can trigger achievements
  console.log('Setting up GGWP achievement listeners');
  
  // Example: Listen for wallet connections
  document.addEventListener('walletConnected', async (event) => {
    if (event.detail && event.detail.address) {
      await loadUserAchievements(event.detail.address);
    }
  });
  
  // These would be integrated with other services in a real implementation
}

/**
 * Load user achievements from storage/blockchain
 * @param {string} address User wallet address
 * @returns {Promise<Array>} User achievements
 */
async function loadUserAchievements(address) {
  if (!address) return [];
  
  const normalizedAddress = address.toLowerCase();
  
  try {
    // In a real implementation, this would fetch from blockchain or database
    // For this example, we'll use local storage
    
    const storedAchievements = localStorage.getItem(`ggwp_achievements_${normalizedAddress}`);
    let achievements = [];
    
    if (storedAchievements) {
      achievements = JSON.parse(storedAchievements);
    }
    
    // Store in-memory
    userAchievements.set(normalizedAddress, achievements);
    
    return achievements;
  } catch (error) {
    console.error('Error loading user achievements:', error);
    return [];
  }
}

/**
 * Save user achievements to storage
 * @param {string} address User wallet address
 * @param {Array} achievements User achievements
 */
async function saveUserAchievements(address, achievements) {
  if (!address) return;
  
  const normalizedAddress = address.toLowerCase();
  
  try {
    // Update in-memory state
    userAchievements.set(normalizedAddress, achievements);
    
    // In a real implementation, this would save to blockchain or database
    // For this example, we'll use local storage
    localStorage.setItem(`ggwp_achievements_${normalizedAddress}`, JSON.stringify(achievements));
  } catch (error) {
    console.error('Error saving user achievements:', error);
  }
}

/**
 * Get user achievements
 * @param {string} address User wallet address (optional, uses connected wallet if not provided)
 * @returns {Promise<Array>} User achievements with details
 */
export async function getUserAchievements(address) {
  if (!initialized) {
    await initGGWPService();
  }
  
  const userAddress = address || 
    (BlockchainService.isConnected() ? BlockchainService.getCurrentAccount() : null);
  
  if (!userAddress) {
    throw new Error('Wallet address required to get achievements');
  }
  
  const normalizedAddress = userAddress.toLowerCase();
  
  // Get achievements from memory or load from storage
  let achievements = userAchievements.get(normalizedAddress);
  if (!achievements) {
    achievements = await loadUserAchievements(normalizedAddress);
  }
  
  // Enrich with achievement definitions
  return enrichAchievements(achievements);
}

/**
 * Enrich achievement records with their definitions
 * @param {Array} achievements Achievement records
 * @returns {Array} Enriched achievements
 */
function enrichAchievements(achievements) {
  return achievements.map(record => {
    const definition = achievementDefinitions.get(record.id);
    
    return {
      ...definition,
      ...record,
      formattedDate: new Date(record.achievedAt).toLocaleDateString()
    };
  });
}

/**
 * Get all available achievements
 * @returns {Array} All achievement definitions
 */
export function getAllAchievements() {
  if (!initialized) {
    initGGWPService();
  }
  
  return Array.from(achievementDefinitions.values());
}

/**
 * Get user stats relevant for achievements
 * @param {string} address User wallet address (optional, uses connected wallet if not provided)
 * @returns {Promise<Object>} User stats
 */
export async function getUserStats(address) {
  if (!initialized) {
    await initGGWPService();
  }
  
  const userAddress = address || 
    (BlockchainService.isConnected() ? BlockchainService.getCurrentAccount() : null);
  
  if (!userAddress) {
    return {
      achievementCount: 0,
      totalPoints: 0,
      tierCounts: {},
      categoryCounts: {}
    };
  }
  
  // Get user achievements
  const achievements = await getUserAchievements(userAddress);
  
  // Calculate stats
  const tierCounts = {};
  const categoryCounts = {};
  let totalPoints = 0;
  
  for (const achievement of achievements) {
    // Count tiers
    tierCounts[achievement.tier] = (tierCounts[achievement.tier] || 0) + 1;
    
    // Count categories
    categoryCounts[achievement.category] = (categoryCounts[achievement.category] || 0) + 1;
    
    // Sum points
    totalPoints += achievement.points || 0;
  }
  
  return {
    achievementCount: achievements.length,
    totalPoints,
    tierCounts,
    categoryCounts,
    nextMilestone: calculateNextMilestone(achievements, totalPoints)
  };
}

/**
 * Calculate next achievement milestone
 * @param {Array} achievements Current achievements
 * @param {number} totalPoints Total achievement points
 * @returns {Object|null} Next milestone info
 */
function calculateNextMilestone(achievements, totalPoints) {
  // Find achievements not yet earned
  const earnedIds = new Set(achievements.map(a => a.id));
  const remainingAchievements = Array.from(achievementDefinitions.values())
    .filter(a => !earnedIds.has(a.id))
    .sort((a, b) => a.points - b.points);
  
  if (remainingAchievements.length === 0) {
    return null; // All achievements earned!
  }
  
  // Find point-based achievements (like GGWP Master)
  const pointBasedAchievements = remainingAchievements
    .filter(a => a.conditions && a.conditions.achievementPoints)
    .sort((a, b) => a.conditions.achievementPoints - b.conditions.achievementPoints);
  
  if (pointBasedAchievements.length > 0) {
    const nextPointAchievement = pointBasedAchievements[0];
    const pointsNeeded = nextPointAchievement.conditions.achievementPoints - totalPoints;
    
    if (pointsNeeded > 0) {
      return {
        type: 'points',
        achievement: nextPointAchievement,
        current: totalPoints,
        target: nextPointAchievement.conditions.achievementPoints,
        remaining: pointsNeeded
      };
    }
  }
  
  // Otherwise just return the next easiest achievement
  const nextAchievement = remainingAchievements[0];
  return {
    type: 'achievement',
    achievement: nextAchievement
  };
}

/**
 * Trigger achievement progress update
 * @param {string} type Progress type
 * @param {Object} data Progress data
 * @returns {Promise<Array>} Newly earned achievements
 */
export async function updateProgress(type, data = {}) {
  if (!initialized) {
    await initGGWPService();
  }
  
  if (!BlockchainService.isConnected()) {
    return []; // Can't update achievements without a connected wallet
  }
  
  const userAddress = BlockchainService.getCurrentAccount();
  const normalizedAddress = userAddress.toLowerCase();
  
  // Get current achievements
  let achievements = userAchievements.get(normalizedAddress) || [];
  const earnedIds = new Set(achievements.map(a => a.id));
  
  // Get current progress
  const userProgress = await getUserProgress(userAddress);
  
  // Update progress based on type
  switch (type) {
    case 'transaction':
      userProgress.transactionCount = (userProgress.transactionCount || 0) + 1;
      break;
    case 'stream_created':
      userProgress.streamsCreated = (userProgress.streamsCreated || 0) + 1;
      break;
    case 'stream_watched':
      userProgress.streamsWatched = (userProgress.streamsWatched || 0) + 1;
      break;
    case 'investment':
      userProgress.investmentsCount = (userProgress.investmentsCount || 0) + 1;
      break;
    case 'gladston_strategy':
      userProgress.gladstonStrategiesCreated = (userProgress.gladstonStrategiesCreated || 0) + 1;
      break;
    case 'community_joined':
      userProgress.communitiesJoined = (userProgress.communitiesJoined || 0) + 1;
      break;
    case 'testimonial':
      userProgress.testimonialsCreated = (userProgress.testimonialsCreated || 0) + 1;
      break;
    case 'special_event':
      if (data.event) {
        userProgress.specialEvents = userProgress.specialEvents || [];
        if (!userProgress.specialEvents.includes(data.event)) {
          userProgress.specialEvents.push(data.event);
        }
      }
      break;
  }
  
  // Calculate achievement points
  userProgress.achievementPoints = achievements.reduce((sum, a) => {
    const definition = achievementDefinitions.get(a.id);
    return sum + (definition?.points || 0);
  }, 0);
  
  // Save updated progress
  await saveUserProgress(userAddress, userProgress);
  
  // Check for newly earned achievements
  const newAchievements = [];
  
  for (const [id, definition] of achievementDefinitions.entries()) {
    // Skip already earned achievements
    if (earnedIds.has(id)) continue;
    
    // Check if conditions are met
    if (checkAchievementConditions(definition, userProgress)) {
      // Create achievement record
      const newAchievement = {
        id,
        achievedAt: Date.now(),
        notified: false
      };
      
      // Add to user's achievements
      achievements.push(newAchievement);
      
      // Add to new achievements list
      newAchievements.push({
        ...definition,
        ...newAchievement
      });
      
      // Update progress with new points
      userProgress.achievementPoints += (definition.points || 0);
    }
  }
  
  // If new achievements earned, save and trigger notifications
  if (newAchievements.length > 0) {
    await saveUserAchievements(userAddress, achievements);
    await saveUserProgress(userAddress, userProgress);
    
    // Update recent milestones
    updateRecentMilestones(newAchievements);
    
    // Dispatch event for UI notification
    dispatchAchievementEvent(newAchievements);
  }
  
  return newAchievements;
}

/**
 * Check if achievement conditions are met
 * @param {Object} achievement Achievement definition
 * @param {Object} progress User progress
 * @returns {boolean} Whether conditions are met
 */
function checkAchievementConditions(achievement, progress) {
  const { conditions } = achievement;
  if (!conditions) return false;
  
  for (const [key, value] of Object.entries(conditions)) {
    // For special events, check if any required event is in the user's events
    if (key === 'specialEvents') {
      const userEvents = progress.specialEvents || [];
      const requiredEvents = Array.isArray(value) ? value : [value];
      
      if (!requiredEvents.some(event => userEvents.includes(event))) {
        return false;
      }
      continue;
    }
    
    // For all other numeric conditions
    if ((progress[key] || 0) < value) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get user progress
 * @param {string} address User wallet address
 * @returns {Promise<Object>} User progress
 */
async function getUserProgress(address) {
  if (!address) return {};
  
  const normalizedAddress = address.toLowerCase();
  
  try {
    // In a real implementation, this would fetch from blockchain or database
    // For this example, we'll use local storage
    
    const storedProgress = localStorage.getItem(`ggwp_progress_${normalizedAddress}`);
    
    if (storedProgress) {
      return JSON.parse(storedProgress);
    }
    
    return {};
  } catch (error) {
    console.error('Error getting user progress:', error);
    return {};
  }
}

/**
 * Save user progress
 * @param {string} address User wallet address
 * @param {Object} progress User progress
 */
async function saveUserProgress(address, progress) {
  if (!address) return;
  
  const normalizedAddress = address.toLowerCase();
  
  try {
    // In a real implementation, this would save to blockchain or database
    // For this example, we'll use local storage
    localStorage.setItem(`ggwp_progress_${normalizedAddress}`, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving user progress:', error);
  }
}

/**
 * Update recent milestones list
 * @param {Array} newAchievements Newly earned achievements
 */
function updateRecentMilestones(newAchievements) {
  if (!newAchievements || newAchievements.length === 0) return;
  
  const currentMilestones = [...recentMilestones.value];
  
  // Add user info to achievements
  const userAddress = BlockchainService.isConnected() ? 
    BlockchainService.getCurrentAccount() : null;
  
  const enrichedAchievements = newAchievements.map(achievement => ({
    ...achievement,
    userAddress,
    userName: NamingService.formatAddressName(userAddress),
    timestamp: Date.now()
  }));
  
  // Add to beginning of list and limit to 10 items
  recentMilestones.value = [
    ...enrichedAchievements,
    ...currentMilestones
  ].slice(0, 10);
}

/**
 * Get recent achievement milestones
 * @returns {Array} Recent milestones
 */
export function getRecentMilestones() {
  return recentMilestones.value;
}

/**
 * Dispatch achievement event for UI notifications
 * @param {Array} achievements Newly earned achievements
 */
function dispatchAchievementEvent(achievements) {
  if (!achievements || achievements.length === 0) return;
  
  // Dispatch custom event for UI components to listen for
  const event = new CustomEvent('achievementEarned', {
    detail: { achievements }
  });
  
  document.dispatchEvent(event);
}

/**
 * Register an achievement listener
 * @param {string} id Listener ID
 * @param {Function} callback Callback function
 */
export function registerAchievementListener(id, callback) {
  if (!id || typeof callback !== 'function') return;
  
  const handler = (event) => {
    callback(event.detail.achievements);
  };
  
  document.addEventListener('achievementEarned', handler);
  activeListeners.set(id, handler);
}

/**
 * Remove an achievement listener
 * @param {string} id Listener ID
 */
export function removeAchievementListener(id) {
  if (!id) return;
  
  const handler = activeListeners.get(id);
  if (handler) {
    document.removeEventListener('achievementEarned', handler);
    activeListeners.delete(id);
  }
}

/**
 * Trigger a special event achievement
 * @param {string} eventType Special event type
 * @returns {Promise<Array>} Newly earned achievements
 */
export async function triggerSpecialEvent(eventType) {
  return updateProgress('special_event', { event: eventType });
}

export default {
  initGGWPService,
  getUserAchievements,
  getAllAchievements,
  getUserStats,
  updateProgress,
  triggerSpecialEvent,
  registerAchievementListener,
  removeAchievementListener,
  getRecentMilestones,
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_TIERS
};
