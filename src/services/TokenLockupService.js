/**
 * Token Lockup Service
 * 
 * Manages token lockup periods, vesting schedules, and token release mechanics
 * for the Web3 Crypto Streaming platform.
 */

import * as BlockchainService from './BlockchainService';
import * as RiceSecurityService from './RiceAdvancedNetworkSecurityService';

// Lockup types
export const LOCKUP_TYPES = {
    LINEAR: 'linear',         // Linear vesting over time
    STAGED: 'staged',         // Fixed percentage released at specific intervals
    CLIFF: 'cliff',           // Full release after a specified period
    PERFORMANCE: 'performance' // Release based on performance metrics
};

// Vesting status
export const VESTING_STATUS = {
    PENDING: 'pending',       // Vesting period has not started
    ACTIVE: 'active',         // Vesting is in progress
    COMPLETED: 'completed',   // Vesting is complete, all tokens released
    REVOKED: 'revoked'        // Vesting was revoked (special cases)
};

// Token types supported for lockups
export const TOKEN_TYPES = {
    PLATFORM: 'platform_token', // Native platform token
    ERC20: 'erc20',            // Any ERC20 token
    ERC721: 'erc721',          // NFT representation
    CUSTOM: 'custom'           // Custom implementation
};

// Service state
let initialized = false;
const lockupSchedules = new Map();
const userLockups = new Map();
const claimedRecords = new Map();
let lastCheck = null;

/**
 * Initialize the Token Lockup Service
 * @param {Object} options Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initTokenLockupService(options = {}) {
    if (initialized) {
        return true;
    }

    try {
        console.log('Initializing Token Lockup Service...');

        // Initialize security service if not already initialized
        if (!RiceSecurityService.getSecurityMetrics()) {
            await RiceSecurityService.initSecurityService();
        }

        // If wallet is connected, load user data
        if (BlockchainService.isConnected()) {
            const userAddress = BlockchainService.getCurrentAccount();
            await loadUserLockups(userAddress);
        }

        // Setup periodic check for vested tokens
        setupVestingChecks();

        initialized = true;
        console.log('Token Lockup Service initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Token Lockup Service:', error);
        return false;
    }
}

/**
 * Load user's token lockups
 * @param {string} userAddress User's wallet address
 * @returns {Promise<Array>} User's lockup schedules
 */
async function loadUserLockups(userAddress) {
    if (!userAddress) return [];

    try {
        const normalizedAddress = userAddress.toLowerCase();

        // In a production app, this would query the blockchain
        // For this example, we'll generate sample lockup schedules

        const sampleLockups = generateSampleLockups(normalizedAddress);

        // Store in memory
        userLockups.set(normalizedAddress, sampleLockups.map(lockup => lockup.id));

        // Store individual lockup schedules
        sampleLockups.forEach(lockup => {
            lockupSchedules.set(lockup.id, lockup);
        });

        return sampleLockups;
    } catch (error) {
        console.error(`Error loading lockups for ${userAddress}:`, error);
        return [];
    }
}

/**
 * Generate sample lockup schedules for a user
 * @param {string} userAddress User address
 * @returns {Array} Sample lockup schedules
 */
function generateSampleLockups(userAddress) {
    // Create sample lockup data based on user address
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const addressSeed = parseInt(userAddress.slice(2, 10), 16);
    const lockupCount = (addressSeed % 3) + 2; // 2-4 lockup schedules

    const lockups = [];

    // Linear vesting example
    lockups.push({
        id: `lockup_linear_${userAddress.substring(2, 10)}`,
        owner: userAddress,
        tokenType: TOKEN_TYPES.PLATFORM,
        tokenAddress: '0xPlatformTokenAddress',
        tokenSymbol: 'STREAM',
        tokenDecimals: 18,
        tokenAmount: 100000000000000000000000n, // 100,000 tokens with 18 decimals
        lockupType: LOCKUP_TYPES.LINEAR,
        status: VESTING_STATUS.ACTIVE,
        startTime: now - (30 * day), // Started 30 days ago
        endTime: now + (335 * day), // Ends in 335 days (1 year total)
        vestingPeriod: 365 * day, // 1 year vesting
        cliffPeriod: 0, // No cliff
        releasedAmount: 24657534246575342465753n, // ~25% released
        lastClaimTime: now - (2 * day), // Last claimed 2 days ago
        vestingSchedule: {
            type: LOCKUP_TYPES.LINEAR
        },
        description: 'Platform Token Linear Vesting'
    });

    // Staged vesting example
    lockups.push({
        id: `lockup_staged_${userAddress.substring(2, 10)}`,
        owner: userAddress,
        tokenType: TOKEN_TYPES.ERC20,
        tokenAddress: '0xPartnerTokenAddress',
        tokenSymbol: 'PARTNER',
        tokenDecimals: 18,
        tokenAmount: 50000000000000000000000n, // 50,000 tokens with 18 decimals
        lockupType: LOCKUP_TYPES.STAGED,
        status: VESTING_STATUS.ACTIVE,
        startTime: now - (60 * day), // Started 60 days ago
        endTime: now + (670 * day), // Ends in 670 days (2 years total)
        vestingPeriod: 730 * day, // 2 years vesting
        cliffPeriod: 90 * day, // 90 day cliff
        releasedAmount: 12500000000000000000000n, // 25% released
        lastClaimTime: now - (10 * day), // Last claimed 10 days ago
        vestingSchedule: {
            type: LOCKUP_TYPES.STAGED,
            stages: [
                { time: 90 * day, percentage: 25 }, // 25% after 90 days
                { time: 365 * day, percentage: 50 }, // 50% after 1 year
                { time: 545 * day, percentage: 75 }, // 75% after 1.5 years
                { time: 730 * day, percentage: 100 } // 100% after 2 years
            ]
        },
        description: 'Partner Token Staged Vesting'
    });

    // Cliff vesting example (if user has more than 2 lockups)
    if (lockupCount > 2) {
        lockups.push({
            id: `lockup_cliff_${userAddress.substring(2, 10)}`,
            owner: userAddress,
            tokenType: TOKEN_TYPES.ERC20,
            tokenAddress: '0xAdvisorTokenAddress',
            tokenSymbol: 'ADVISOR',
            tokenDecimals: 18,
            tokenAmount: 25000000000000000000000n, // 25,000 tokens with 18 decimals
            lockupType: LOCKUP_TYPES.CLIFF,
            status: VESTING_STATUS.PENDING,
            startTime: now + (30 * day), // Starts in 30 days
            endTime: now + (395 * day), // Ends in 395 days
            vestingPeriod: 365 * day, // 1 year vesting
            cliffPeriod: 365 * day, // 1 year cliff
            releasedAmount: 0n, // Nothing released yet
            lastClaimTime: null, // Never claimed
            vestingSchedule: {
                type: LOCKUP_TYPES.CLIFF,
                cliffTime: 365 * day // Full unlock after 1 year
            },
            description: 'Advisor Token Cliff Vesting'
        });
    }

    // Performance-based vesting (if user has more than 3 lockups)
    if (lockupCount > 3) {
        lockups.push({
            id: `lockup_perf_${userAddress.substring(2, 10)}`,
            owner: userAddress,
            tokenType: TOKEN_TYPES.ERC20,
            tokenAddress: '0xPerformanceTokenAddress',
            tokenSymbol: 'PERF',
            tokenDecimals: 18,
            tokenAmount: 75000000000000000000000n, // 75,000 tokens with 18 decimals
            lockupType: LOCKUP_TYPES.PERFORMANCE,
            status: VESTING_STATUS.ACTIVE,
            startTime: now - (120 * day), // Started 120 days ago
            endTime: now + (610 * day), // Ends in 610 days (2 years total)
            vestingPeriod: 730 * day, // 2 years vesting
            cliffPeriod: 30 * day, // 30 day cliff
            releasedAmount: 15000000000000000000000n, // 20% released
            lastClaimTime: now - (15 * day), // Last claimed 15 days ago
            vestingSchedule: {
                type: LOCKUP_TYPES.PERFORMANCE,
                milestones: [
                    { description: 'Product Launch', percentage: 20, completed: true },
                    { description: '10,000 Users', percentage: 40, completed: false },
                    { description: '$1M Revenue', percentage: 70, completed: false },
                    { description: 'Mainnet Launch', percentage: 100, completed: false }
                ]
            },
            description: 'Performance-based Token Vesting'
        });
    }

    return lockups;
}

/**
 * Get all lockup schedules for a user
 * @param {string} userAddress User's wallet address (optional, uses connected wallet if not provided)
 * @returns {Promise<Array>} User's lockup schedules
 */
export async function getUserLockups(userAddress) {
    if (!initialized) {
        await initTokenLockupService();
    }

    const address = userAddress ||
        (BlockchainService.isConnected() ? BlockchainService.getCurrentAccount() : null);

    if (!address) {
        return [];
    }

    const normalizedAddress = address.toLowerCase();

    // Check if we already have the user's lockups
    let userLockupIds = userLockups.get(normalizedAddress);

    // If not, load them
    if (!userLockupIds) {
        await loadUserLockups(normalizedAddress);
        userLockupIds = userLockups.get(normalizedAddress) || [];
    }

    // Get full lockup objects for each ID
    return userLockupIds
        .map(id => lockupSchedules.get(id))
        .filter(Boolean)
        .map(lockup => ({
            ...lockup,
            vestedAmount: calculateVestedAmount(lockup),
            claimableAmount: calculateClaimableAmount(lockup),
            vestingPercentage: calculateVestingPercentage(lockup)
        }));
}

/**
 * Get a specific lockup by ID
 * @param {string} lockupId Lockup identifier
 * @returns {Promise<Object|null>} Lockup schedule with calculated fields
 */
export async function getLockup(lockupId) {
    if (!initialized) {
        await initTokenLockupService();
    }

    const lockup = lockupSchedules.get(lockupId);
    if (!lockup) return null;

    return {
        ...lockup,
        vestedAmount: calculateVestedAmount(lockup),
        claimableAmount: calculateClaimableAmount(lockup),
        vestingPercentage: calculateVestingPercentage(lockup)
    };
}

/**
 * Calculate the amount of tokens that have vested for a lockup
 * @param {Object} lockup Lockup schedule
 * @returns {BigInt} Vested token amount
 */
function calculateVestedAmount(lockup) {
    const now = Date.now();

    // If vesting hasn't started or was revoked, nothing is vested
    if (lockup.status === VESTING_STATUS.PENDING || lockup.status === VESTING_STATUS.REVOKED || now < lockup.startTime) {
        return 0n;
    }

    // If vesting is complete, everything is vested
    if (lockup.status === VESTING_STATUS.COMPLETED || now >= lockup.endTime) {
        return lockup.tokenAmount;
    }

    // Calculate based on lockup type
    switch (lockup.lockupType) {
        case LOCKUP_TYPES.LINEAR:
            return calculateLinearVestedAmount(lockup, now);

        case LOCKUP_TYPES.STAGED:
            return calculateStagedVestedAmount(lockup, now);

        case LOCKUP_TYPES.CLIFF:
            return calculateCliffVestedAmount(lockup, now);

        case LOCKUP_TYPES.PERFORMANCE:
            return calculatePerformanceVestedAmount(lockup);

        default:
            return 0n;
    }
}

/**
 * Calculate linearly vested amount
 * @param {Object} lockup Lockup schedule
 * @param {number} now Current timestamp
 * @returns {BigInt} Vested token amount
 */
function calculateLinearVestedAmount(lockup, now) {
    // If before cliff period, nothing is vested
    if (now < lockup.startTime + lockup.cliffPeriod) {
        return 0n;
    }

    // Calculate elapsed vesting time (after cliff)
    const elapsedAfterCliff = Math.min(now - (lockup.startTime + lockup.cliffPeriod), lockup.vestingPeriod - lockup.cliffPeriod);
    const vestingPercentage = elapsedAfterCliff / (lockup.vestingPeriod - lockup.cliffPeriod);

    // Calculate vested amount
    return BigInt(Math.floor(Number(lockup.tokenAmount) * vestingPercentage));
}

/**
 * Calculate staged vested amount
 * @param {Object} lockup Lockup schedule
 * @param {number} now Current timestamp
 * @returns {BigInt} Vested token amount
 */
function calculateStagedVestedAmount(lockup, now) {
    const elapsed = now - lockup.startTime;

    // Find the highest completed stage
    let highestPercentage = 0;
    for (const stage of lockup.vestingSchedule.stages) {
        if (elapsed >= stage.time) {
            highestPercentage = stage.percentage;
        } else {
            break;
        }
    }

    // Calculate vested amount based on percentage
    return BigInt(Math.floor(Number(lockup.tokenAmount) * (highestPercentage / 100)));
}

/**
 * Calculate cliff vested amount
 * @param {Object} lockup Lockup schedule
 * @param {number} now Current timestamp
 * @returns {BigInt} Vested token amount
 */
function calculateCliffVestedAmount(lockup, now) {
    // If before cliff period, nothing is vested
    if (now < lockup.startTime + lockup.vestingSchedule.cliffTime) {
        return 0n;
    }

    // After cliff, everything is vested
    return lockup.tokenAmount;
}

/**
 * Calculate performance-based vested amount
 * @param {Object} lockup Lockup schedule
 * @returns {BigInt} Vested token amount
 */
function calculatePerformanceVestedAmount(lockup) {
    // Sum up percentages from completed milestones
    let completedPercentage = 0;
    for (const milestone of lockup.vestingSchedule.milestones) {
        if (milestone.completed) {
            completedPercentage += milestone.percentage;
        }
    }

    // Calculate final percentage (take the highest between time-based and milestone-based)
    let finalPercentage = completedPercentage;

    // Calculate vested amount based on percentage
    return BigInt(Math.floor(Number(lockup.tokenAmount) * (finalPercentage / 100)));
}

/**
 * Calculate the amount of tokens that can be claimed for a lockup
 * @param {Object} lockup Lockup schedule
 * @returns {BigInt} Claimable token amount
 */
function calculateClaimableAmount(lockup) {
    // Calculate how much is vested but not yet claimed
    const vestedAmount = calculateVestedAmount(lockup);
    return vestedAmount - lockup.releasedAmount;
}

/**
 * Calculate the percentage of tokens vested for a lockup
 * @param {Object} lockup Lockup schedule
 * @returns {number} Vesting percentage (0-100)
 */
function calculateVestingPercentage(lockup) {
    const vestedAmount = calculateVestedAmount(lockup);
    return Number(vestedAmount * 100n / lockup.tokenAmount);
}

/**
 * Claim vested tokens for a lockup
 * @param {string} lockupId Lockup identifier
 * @returns {Promise<Object>} Claim result
 */
export async function claimVestedTokens(lockupId) {
    if (!initialized) {
        await initTokenLockupService();
    }

    // Check if wallet is connected
    if (!BlockchainService.isConnected()) {
        throw new Error('Wallet must be connected to claim tokens');
    }

    const lockup = lockupSchedules.get(lockupId);
    if (!lockup) {
        throw new Error(`Lockup not found: ${lockupId}`);
    }

    const userAddress = BlockchainService.getCurrentAccount();
    if (lockup.owner.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Only the owner can claim tokens from this lockup');
    }

    try {
        // Calculate claimable amount
        const claimableAmount = calculateClaimableAmount(lockup);

        if (claimableAmount <= 0n) {
            return {
                success: false,
                message: 'No tokens available to claim',
                claimedAmount: 0n
            };
        }

        // In a real implementation, this would interact with a smart contract
        // For this example, we'll simulate the claim process

        // Update lockup state
        lockup.releasedAmount += claimableAmount;
        lockup.lastClaimTime = Date.now();

        // Check if all tokens are released
        if (lockup.releasedAmount >= lockup.tokenAmount) {
            lockup.status = VESTING_STATUS.COMPLETED;
        }

        // Store updated lockup
        lockupSchedules.set(lockupId, lockup);

        // Record claim
        recordClaim(lockup.owner, lockupId, claimableAmount);

        return {
            success: true,
            message: 'Tokens claimed successfully',
            claimedAmount: claimableAmount,
            newVestingPercentage: calculateVestingPercentage(lockup),
            newReleasedAmount: lockup.releasedAmount,
            isComplete: lockup.status === VESTING_STATUS.COMPLETED
        };
    } catch (error) {
        console.error(`Error claiming tokens for lockup ${lockupId}:`, error);
        throw error;
    }
}

/**
 * Record a claim transaction
 * @param {string} userAddress User address
 * @param {string} lockupId Lockup identifier
 * @param {BigInt} amount Claimed amount
 */
function recordClaim(userAddress, lockupId, amount) {
    const claimId = `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const claim = {
        id: claimId,
        user: userAddress,
        lockupId,
        amount,
        timestamp: Date.now()
    };

    claimedRecords.set(claimId, claim);
}

/**
 * Get claim history for a user
 * @param {string} userAddress User's wallet address (optional)
 * @returns {Array} Claim history
 */
export function getClaimHistory(userAddress) {
    const address = userAddress ||
        (BlockchainService.isConnected() ? BlockchainService.getCurrentAccount() : null);

    if (!address) {
        return [];
    }

    const normalizedAddress = address.toLowerCase();

    // Filter claims by user
    return Array.from(claimedRecords.values())
        .filter(claim => claim.user.toLowerCase() === normalizedAddress)
        .sort((a, b) => b.timestamp - a.timestamp); // Most recent first
}

/**
 * Get total vested and claimable amounts for a user
 * @param {string} userAddress User's wallet address (optional)
 * @returns {Promise<Object>} Total amounts
 */
export async function getUserTokenTotals(userAddress) {
    const lockups = await getUserLockups(userAddress);

    // Group by token
    const tokenTotals = {};

    for (const lockup of lockups) {
        const tokenKey = `${lockup.tokenSymbol}:${lockup.tokenAddress}`;

        if (!tokenTotals[tokenKey]) {
            tokenTotals[tokenKey] = {
                symbol: lockup.tokenSymbol,
                address: lockup.tokenAddress,
                decimals: lockup.tokenDecimals,
                total: 0n,
                vested: 0n,
                claimable: 0n,
                released: 0n,
                locked: 0n
            };
        }

        const vestedAmount = calculateVestedAmount(lockup);
        const claimableAmount = calculateClaimableAmount(lockup);

        tokenTotals[tokenKey].total += lockup.tokenAmount;
        tokenTotals[tokenKey].vested += vestedAmount;
        tokenTotals[tokenKey].claimable += claimableAmount;
        tokenTotals[tokenKey].released += lockup.releasedAmount;
        tokenTotals[tokenKey].locked += (lockup.tokenAmount - vestedAmount);
    }

    return Object.values(tokenTotals);
}

/**
 * Setup periodic checks for vested tokens
 */
function setupVestingChecks() {
    // Check every 5 minutes
    const checkInterval = 5 * 60 * 1000;

    setInterval(() => {
        checkVestedTokens();
    }, checkInterval);
}

/**
 * Check for newly vested tokens
 */
function checkVestedTokens() {
    lastCheck = Date.now();

    // Iterate through all lockup schedules
    for (const [lockupId, lockup] of lockupSchedules.entries()) {
        // Skip completed or revoked lockups
        if (lockup.status === VESTING_STATUS.COMPLETED || lockup.status === VESTING_STATUS.REVOKED) {
            continue;
        }

        // Update lockup status based on current time
        const now = Date.now();

        // Check if vesting should start
        if (lockup.status === VESTING_STATUS.PENDING && now >= lockup.startTime) {
            lockup.status = VESTING_STATUS.ACTIVE;
            lockupSchedules.set(lockupId, lockup);
        }

        // Check if vesting is complete
        if (lockup.status === VESTING_STATUS.ACTIVE && now >= lockup.endTime) {
            // Set as completed only if all tokens are released
            if (lockup.releasedAmount >= lockup.tokenAmount) {
                lockup.status = VESTING_STATUS.COMPLETED;
                lockupSchedules.set(lockupId, lockup);
            }
        }
    }
}

/**
 * Create a new lockup schedule
 * @param {Object} lockupData Lockup data
 * @returns {Promise<Object>} Created lockup
 */
export async function createLockup(lockupData) {
    if (!initialized) {
        await initTokenLockupService();
    }

    if (!BlockchainService.isConnected()) {
        throw new Error('Wallet must be connected to create a lockup');
    }

    try {
        const userAddress = BlockchainService.getCurrentAccount();

        // Validate required fields
        if (!lockupData.tokenAddress || !lockupData.tokenAmount || !lockupData.lockupType) {
            throw new Error('Missing required lockup data');
        }

        // Create lockup ID
        const lockupId = `lockup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Prepare lockup object
        const now = Date.now();
        const lockup = {
            id: lockupId,
            owner: userAddress,
            tokenType: lockupData.tokenType || TOKEN_TYPES.ERC20,
            tokenAddress: lockupData.tokenAddress,
            tokenSymbol: lockupData.tokenSymbol || 'TOKEN',
            tokenDecimals: lockupData.tokenDecimals || 18,
            tokenAmount: BigInt(lockupData.tokenAmount),
            lockupType: lockupData.lockupType,
            status: VESTING_STATUS.PENDING,
            startTime: lockupData.startTime || now,
            endTime: lockupData.endTime || (now + (365 * 24 * 60 * 60 * 1000)), // Default 1 year
            vestingPeriod: lockupData.vestingPeriod || (365 * 24 * 60 * 60 * 1000), // Default 1 year
            cliffPeriod: lockupData.cliffPeriod || 0,
            releasedAmount: 0n,
            lastClaimTime: null,
            vestingSchedule: lockupData.vestingSchedule || { type: lockupData.lockupType },
            description: lockupData.description || 'Token Lockup'
        };

        // In a real implementation, this would interact with a smart contract
        // For this example, we'll store it in memory

        // Store lockup
        lockupSchedules.set(lockupId, lockup);

        // Update user lockups
        let userLockupIds = userLockups.get(userAddress.toLowerCase()) || [];
        userLockupIds.push(lockupId);
        userLockups.set(userAddress.toLowerCase(), userLockupIds);

        return {
            success: true,
            message: 'Lockup created successfully',
            lockup: {
                ...lockup,
                vestedAmount: calculateVestedAmount(lockup),
                claimableAmount: calculateClaimableAmount(lockup),
                vestingPercentage: calculateVestingPercentage(lockup)
            }
        };
    } catch (error) {
        console.error('Error creating lockup:', error);
        throw error;
    }
}

/**
 * Format token amount for display
 * @param {BigInt} amount Token amount
 * @param {number} decimals Token decimals
 * @returns {string} Formatted amount
 */
export function formatTokenAmount(amount, decimals) {
    if (typeof amount !== 'bigint') {
        amount = BigInt(amount || 0);
    }

    const divisor = 10n ** BigInt(decimals);
    const integerPart = amount / divisor;
    const fractionalPart = amount % divisor;

    // Format fractional part with leading zeros
    let fractionalStr = fractionalPart.toString().padStart(decimals, '0');

    // Trim trailing zeros
    fractionalStr = fractionalStr.replace(/0+$/, '');

    // If all zeros, return just the integer part
    if (fractionalStr === '') {
        return integerPart.toString();
    }

    return `${integerPart}.${fractionalStr}`;
}

export default {
    initTokenLockupService,
    getUserLockups,
    getLockup,
    claimVestedTokens,
    getClaimHistory,
    getUserTokenTotals,
    createLockup,
    formatTokenAmount,
    LOCKUP_TYPES,
    VESTING_STATUS,
    TOKEN_TYPES
};
