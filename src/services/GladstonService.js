/**
 * Gladston Investment Service
 * 
 * Implements the Gladston algorithm for optimizing crypto investment strategies
 * through advanced blockchain analytics and market sentiment analysis.
 */

import * as BlockchainService from './BlockchainService';

// Algorithm models
export const ALGORITHM_MODELS = {
  CONSERVATIVE: 'conservative',
  BALANCED: 'balanced',
  AGGRESSIVE: 'aggressive',
  EXPERIMENTAL: 'experimental'
};

// Investment horizons
export const INVESTMENT_HORIZONS = {
  SHORT_TERM: 'short_term',    // < 1 month
  MEDIUM_TERM: 'medium_term',  // 1-6 months
  LONG_TERM: 'long_term'       // > 6 months
};

// Strategy types
export const STRATEGY_TYPES = {
  TREND_FOLLOWING: 'trend_following',
  COUNTER_TREND: 'counter_trend',
  MOMENTUM: 'momentum',
  VALUE_BASED: 'value_based',
  HYBRID: 'hybrid'
};

// Service state
let isInitialized = false;
const activeStrategies = new Map();
const performanceHistory = new Map();

/**
 * Initialize the Gladston service
 * 
 * @returns {Promise<boolean>} Success status
 */
export async function initGladstonService() {
  if (isInitialized) {
    return true;
  }
  
  try {
    console.log('Initializing Gladston investment algorithm...');
    
    // Load historical performance data
    await loadPerformanceHistory();
    
    // Initialize market data feeds
    await initializeMarketDataFeeds();
    
    isInitialized = true;
    console.log('Gladston service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Gladston service:', error);
    return false;
  }
}

/**
 * Load historical performance data for algorithm calibration
 * 
 * @returns {Promise<void>}
 */
async function loadPerformanceHistory() {
  // In a production environment, this would fetch actual historical data
  // For this example, we'll generate synthetic performance data
  
  const algorithmModels = Object.values(ALGORITHM_MODELS);
  const tokens = ['ETH', 'BTC', 'MATIC', 'SOL', 'AVAX'];
  
  for (const model of algorithmModels) {
    const modelPerformance = {};
    
    for (const token of tokens) {
      // Generate synthetic performance data with different characteristics based on model
      const basePerformance = Math.random() * 0.5; // 0-50% base performance
      
      // Adjust performance based on model type
      let adjustedPerformance;
      switch (model) {
        case ALGORITHM_MODELS.CONSERVATIVE:
          // Lower returns, less volatility
          adjustedPerformance = basePerformance * 0.6;
          break;
        case ALGORITHM_MODELS.BALANCED:
          // Moderate returns and volatility
          adjustedPerformance = basePerformance * 0.9;
          break;
        case ALGORITHM_MODELS.AGGRESSIVE:
          // Higher returns, more volatility
          adjustedPerformance = basePerformance * 1.4;
          break;
        case ALGORITHM_MODELS.EXPERIMENTAL:
          // Highest potential returns, highest volatility
          adjustedPerformance = basePerformance * 1.8;
          break;
        default:
          adjustedPerformance = basePerformance;
      }
      
      // Generate monthly performance for the past year
      const monthlyPerformance = [];
      for (let i = 0; i < 12; i++) {
        // Add some variance to monthly returns
        const monthVariance = (Math.random() * 0.2) - 0.1; // -10% to +10% variance
        const volatilityFactor = getModelVolatilityFactor(model);
        
        monthlyPerformance.push({
          month: i,
          return: adjustedPerformance / 12 + (monthVariance * volatilityFactor),
          timestamp: Date.now() - ((12 - i) * 30 * 24 * 60 * 60 * 1000) // Monthly timestamps
        });
      }
      
      modelPerformance[token] = {
        annualizedReturn: adjustedPerformance,
        volatility: getModelVolatilityFactor(model) * 0.2,
        sharpeRatio: adjustedPerformance / (getModelVolatilityFactor(model) * 0.2),
        monthlyPerformance
      };
    }
    
    performanceHistory.set(model, modelPerformance);
  }
}

/**
 * Get volatility factor based on algorithm model
 * 
 * @param {string} model Algorithm model
 * @returns {number} Volatility factor
 */
function getModelVolatilityFactor(model) {
  switch (model) {
    case ALGORITHM_MODELS.CONSERVATIVE:
      return 0.7;
    case ALGORITHM_MODELS.BALANCED:
      return 1.0;
    case ALGORITHM_MODELS.AGGRESSIVE:
      return 1.5;
    case ALGORITHM_MODELS.EXPERIMENTAL:
      return 2.0;
    default:
      return 1.0;
  }
}

/**
 * Initialize market data feeds for real-time analysis
 * 
 * @returns {Promise<void>}
 */
async function initializeMarketDataFeeds() {
  // In a real implementation, this would connect to market data providers
  console.log('Connecting to market data feeds...');
  
  // Simulate delay for async initialization
  await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Create a new Gladston investment strategy
 * 
 * @param {Object} options Strategy configuration options
 * @returns {Promise<Object>} Strategy details
 */
export async function createStrategy(options) {
  if (!isInitialized) {
    await initGladstonService();
  }
  
  try {
    const {
      model = ALGORITHM_MODELS.BALANCED,
      investmentHorizon = INVESTMENT_HORIZONS.MEDIUM_TERM,
      targetAssets = ['ETH'],
      initialInvestment = 1.0,
      rebalancePeriod = 30, // days
      riskTolerance = 3, // 1-5 scale
      strategyType = STRATEGY_TYPES.HYBRID
    } = options;
    
    // Validate wallet connection
    if (!BlockchainService.isConnected()) {
      throw new Error('Wallet connection required to create a strategy');
    }
    
    const userAddress = BlockchainService.getCurrentAccount();
    
    // Create strategy ID
    const strategyId = `gladston_${userAddress.substring(2, 8)}_${Date.now()}`;
    
    // Calculate expected performance based on historical data
    const expectedPerformance = calculateExpectedPerformance(
      model, 
      investmentHorizon, 
      targetAssets
    );
    
    // Create strategy object
    const strategy = {
      id: strategyId,
      userAddress,
      model,
      investmentHorizon,
      targetAssets,
      initialInvestment,
      currentValue: initialInvestment,
      rebalancePeriod,
      riskTolerance,
      strategyType,
      expectedPerformance,
      createdAt: Date.now(),
      lastRebalance: Date.now(),
      status: 'active',
      transactions: []
    };
    
    // Store in active strategies
    activeStrategies.set(strategyId, strategy);
    
    // In a real implementation, this would be stored on-chain or in a database
    console.log(`Created Gladston strategy: ${strategyId}`);
    
    // Simulate initial allocation
    await allocateAssets(strategy);
    
    return strategy;
  } catch (error) {
    console.error('Error creating Gladston strategy:', error);
    throw error;
  }
}

/**
 * Calculate expected performance for a strategy based on historical data
 * 
 * @param {string} model Algorithm model
 * @param {string} investmentHorizon Investment horizon
 * @param {Array<string>} targetAssets Target assets
 * @returns {Object} Expected performance metrics
 */
function calculateExpectedPerformance(model, investmentHorizon, targetAssets) {
  // Get historical performance data for the model
  const modelData = performanceHistory.get(model);
  if (!modelData) {
    return {
      expectedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      confidence: 0
    };
  }
  
  // Calculate weighted expected return across target assets
  let totalExpectedReturn = 0;
  let totalVolatility = 0;
  let totalSharpeRatio = 0;
  let validAssets = 0;
  
  for (const asset of targetAssets) {
    const assetData = modelData[asset];
    if (assetData) {
      totalExpectedReturn += assetData.annualizedReturn;
      totalVolatility += assetData.volatility;
      totalSharpeRatio += assetData.sharpeRatio;
      validAssets++;
    }
  }
  
  if (validAssets === 0) {
    return {
      expectedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      confidence: 0
    };
  }
  
  // Calculate averages
  const avgExpectedReturn = totalExpectedReturn / validAssets;
  const avgVolatility = totalVolatility / validAssets;
  const avgSharpeRatio = totalSharpeRatio / validAssets;
  
  // Adjust for investment horizon
  let horizonMultiplier = 1.0;
  switch (investmentHorizon) {
    case INVESTMENT_HORIZONS.SHORT_TERM:
      horizonMultiplier = 0.25; // 3 months equivalent
      break;
    case INVESTMENT_HORIZONS.MEDIUM_TERM:
      horizonMultiplier = 0.5; // 6 months equivalent
      break;
    case INVESTMENT_HORIZONS.LONG_TERM:
      horizonMultiplier = 1.0; // 12 months equivalent
      break;
  }
  
  // Calculate confidence based on data quality (synthetic for this example)
  const confidence = Math.min(0.9, 0.5 + (validAssets / targetAssets.length) * 0.4);
  
  return {
    expectedReturn: avgExpectedReturn * horizonMultiplier,
    volatility: avgVolatility * Math.sqrt(horizonMultiplier),
    sharpeRatio: avgSharpeRatio * (1 + (horizonMultiplier - 1) * 0.5),
    confidence
  };
}

/**
 * Allocate assets according to strategy parameters
 * 
 * @param {Object} strategy Strategy configuration
 * @returns {Promise<Object>} Allocation results
 */
async function allocateAssets(strategy) {
  console.log(`Allocating assets for strategy: ${strategy.id}`);
  
  // In a real implementation, this would execute actual trades or allocations
  // For this example, we'll create simulated transactions
  
  const { targetAssets, initialInvestment, model } = strategy;
  
  // Determine allocation percentages based on model and asset count
  let allocations = [];
  switch (model) {
    case ALGORITHM_MODELS.CONSERVATIVE:
      // Weighted towards more established assets
      allocations = calculateConservativeAllocations(targetAssets);
      break;
    case ALGORITHM_MODELS.BALANCED:
      // Even distribution with slight adjustments
      allocations = calculateBalancedAllocations(targetAssets);
      break;
    case ALGORITHM_MODELS.AGGRESSIVE:
      // Weighted towards higher growth potential
      allocations = calculateAggressiveAllocations(targetAssets);
      break;
    case ALGORITHM_MODELS.EXPERIMENTAL:
      // Highly concentrated positions
      allocations = calculateExperimentalAllocations(targetAssets);
      break;
    default:
      // Equal allocation
      const equalPercent = 1 / targetAssets.length;
      allocations = targetAssets.map(asset => ({
        asset,
        percentage: equalPercent
      }));
  }
  
  // Create transactions for each allocation
  const timestamp = Date.now();
  const transactions = [];
  
  for (const allocation of allocations) {
    const amount = initialInvestment * allocation.percentage;
    
    transactions.push({
      id: `tx_${strategy.id}_${allocation.asset}_${timestamp}`,
      type: 'allocation',
      asset: allocation.asset,
      amount,
      timestamp,
      status: 'completed'
    });
  }
  
  // Add transactions to strategy
  strategy.transactions.push(...transactions);
  strategy.lastRebalance = timestamp;
  
  // In a real implementation, we would wait for on-chain confirmation
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    success: true,
    allocations,
    transactions
  };
}

/**
 * Calculate conservative allocations for assets
 * @param {Array<string>} assets Asset list
 * @returns {Array<Object>} Allocations with percentages
 */
function calculateConservativeAllocations(assets) {
  // For this example, we'll prioritize established assets like BTC, ETH
  const priorityAssets = ['BTC', 'ETH'];
  const allocations = [];
  
  // 70% in priority assets, 30% in others
  let priorityAllocation = 0.7;
  let otherAllocation = 0.3;
  
  // Count priority assets present in target assets
  const presentPriorityAssets = assets.filter(asset => 
    priorityAssets.includes(asset)
  );
  
  if (presentPriorityAssets.length === 0) {
    // No priority assets, equal distribution
    const equalPercent = 1 / assets.length;
    return assets.map(asset => ({
      asset,
      percentage: equalPercent
    }));
  }
  
  // Distribute priority allocation
  const priorityPercent = priorityAllocation / presentPriorityAssets.length;
  for (const asset of assets) {
    if (priorityAssets.includes(asset)) {
      allocations.push({
        asset,
        percentage: priorityPercent
      });
    }
  }
  
  // Distribute remaining allocation
  const otherAssets = assets.filter(asset => 
    !priorityAssets.includes(asset)
  );
  
  if (otherAssets.length > 0) {
    const otherPercent = otherAllocation / otherAssets.length;
    for (const asset of otherAssets) {
      allocations.push({
        asset,
        percentage: otherPercent
      });
    }
  } else {
    // No other assets, redistribute to priority
    const additionalPriority = otherAllocation / presentPriorityAssets.length;
    for (let i = 0; i < allocations.length; i++) {
      allocations[i].percentage += additionalPriority;
    }
  }
  
  return allocations;
}

/**
 * Calculate balanced allocations for assets
 * @param {Array<string>} assets Asset list
 * @returns {Array<Object>} Allocations with percentages
 */
function calculateBalancedAllocations(assets) {
  // For balanced, we do a nearly equal distribution with slight adjustments
  const assetWeights = {
    'BTC': 1.2,
    'ETH': 1.1,
    'MATIC': 1.0,
    'SOL': 0.9,
    'AVAX': 0.9,
    'LINK': 0.8,
    'DOT': 0.8
  };
  
  // Calculate total weight
  let totalWeight = 0;
  for (const asset of assets) {
    totalWeight += assetWeights[asset] || 1.0;
  }
  
  // Calculate percentages
  return assets.map(asset => ({
    asset,
    percentage: (assetWeights[asset] || 1.0) / totalWeight
  }));
}

/**
 * Calculate aggressive allocations for assets
 * @param {Array<string>} assets Asset list
 * @returns {Array<Object>} Allocations with percentages
 */
function calculateAggressiveAllocations(assets) {
  // For aggressive, weight towards higher-growth assets
  const growthAssets = ['SOL', 'AVAX', 'MATIC'];
  const allocations = [];
  
  // 60% in growth assets, 40% in others
  let growthAllocation = 0.6;
  let otherAllocation = 0.4;
  
  // Count growth assets present in target assets
  const presentGrowthAssets = assets.filter(asset => 
    growthAssets.includes(asset)
  );
  
  if (presentGrowthAssets.length === 0) {
    // No growth assets, equal distribution
    const equalPercent = 1 / assets.length;
    return assets.map(asset => ({
      asset,
      percentage: equalPercent
    }));
  }
  
  // Distribute growth allocation
  const growthPercent = growthAllocation / presentGrowthAssets.length;
  for (const asset of assets) {
    if (growthAssets.includes(asset)) {
      allocations.push({
        asset,
        percentage: growthPercent
      });
    }
  }
  
  // Distribute remaining allocation
  const otherAssets = assets.filter(asset => 
    !growthAssets.includes(asset)
  );
  
  if (otherAssets.length > 0) {
    const otherPercent = otherAllocation / otherAssets.length;
    for (const asset of otherAssets) {
      allocations.push({
        asset,
        percentage: otherPercent
      });
    }
  } else {
    // No other assets, redistribute to growth
    const additionalGrowth = otherAllocation / presentGrowthAssets.length;
    for (let i = 0; i < allocations.length; i++) {
      allocations[i].percentage += additionalGrowth;
    }
  }
  
  return allocations;
}

/**
 * Calculate experimental allocations for assets
 * @param {Array<string>} assets Asset list
 * @returns {Array<Object>} Allocations with percentages
 */
function calculateExperimentalAllocations(assets) {
  // For experimental, create concentrated positions
  // Select one primary asset (40%), one secondary (30%), rest equal
  
  if (assets.length <= 1) {
    return [{
      asset: assets[0],
      percentage: 1.0
    }];
  }
  
  // Deterministic but "random" asset selection
  const hash = assets.join('').length * 13;
  const primaryIndex = hash % assets.length;
  let secondaryIndex = (hash * 7) % assets.length;
  
  // Ensure secondary is different from primary
  if (secondaryIndex === primaryIndex) {
    secondaryIndex = (secondaryIndex + 1) % assets.length;
  }
  
  // Set up allocations
  const primaryAsset = assets[primaryIndex];
  const secondaryAsset = assets[secondaryIndex];
  const primaryAllocation = 0.4;
  const secondaryAllocation = 0.3;
  const remainingAllocation = 0.3;
  
  // Calculate allocations
  const allocations = [];
  
  // Add primary asset
  allocations.push({
    asset: primaryAsset,
    percentage: primaryAllocation
  });
  
  // Add secondary asset
  allocations.push({
    asset: secondaryAsset,
    percentage: secondaryAllocation
  });
  
  // Add remaining assets
  const remainingAssets = assets.filter(asset => 
    asset !== primaryAsset && asset !== secondaryAsset
  );
  
  if (remainingAssets.length > 0) {
    const remainingPercent = remainingAllocation / remainingAssets.length;
    for (const asset of remainingAssets) {
      allocations.push({
        asset,
        percentage: remainingPercent
      });
    }
  } else {
    // No remaining assets, redistribute
    allocations[0].percentage += remainingAllocation * 0.7; // 70% to primary
    allocations[1].percentage += remainingAllocation * 0.3; // 30% to secondary
  }
  
  return allocations;
}

/**
 * Get a user's active Gladston strategies
 * 
 * @param {string} address User's wallet address
 * @returns {Promise<Array<Object>>} User strategies
 */
export async function getUserStrategies(address) {
  if (!isInitialized) {
    await initGladstonService();
  }
  
  try {
    const userAddress = address || 
      (BlockchainService.isConnected() ? BlockchainService.getCurrentAccount() : null);
    
    if (!userAddress) {
      throw new Error('Wallet address required to fetch strategies');
    }
    
    // Filter strategies for this user
    const userStrategies = Array.from(activeStrategies.values())
      .filter(strategy => strategy.userAddress.toLowerCase() === userAddress.toLowerCase());
    
    return userStrategies;
  } catch (error) {
    console.error('Error getting user strategies:', error);
    throw error;
  }
}

/**
 * Get a specific strategy by ID
 * 
 * @param {string} strategyId Strategy ID
 * @returns {Promise<Object>} Strategy details
 */
export async function getStrategyById(strategyId) {
  if (!isInitialized) {
    await initGladstonService();
  }
  
  const strategy = activeStrategies.get(strategyId);
  if (!strategy) {
    throw new Error(`Strategy not found: ${strategyId}`);
  }
  
  // Update current value (in a real app, this would fetch actual market values)
  updateStrategyValue(strategy);
  
  return strategy;
}

/**
 * Update the current value of a strategy based on market conditions
 * 
 * @param {Object} strategy Strategy to update
 */
function updateStrategyValue(strategy) {
  const { initialInvestment, createdAt, model } = strategy;
  
  // Calculate time factor (in days)
  const daysSinceCreation = (Date.now() - createdAt) / (24 * 60 * 60 * 1000);
  
  // Get model performance data
  const modelData = performanceHistory.get(model);
  if (!modelData) {
    return;
  }
  
  // Calculate aggregate performance across assets
  let totalPerformance = 0;
  let validAssets = 0;
  
  for (const asset of strategy.targetAssets) {
    const assetData = modelData[asset];
    if (assetData) {
      // Convert annual return to daily rate
      const dailyRate = Math.pow(1 + assetData.annualizedReturn, 1/365) - 1;
      
      // Calculate compound growth
      const assetGrowth = Math.pow(1 + dailyRate, daysSinceCreation);
      
      // Add to total (weighted equally for this example)
      totalPerformance += assetGrowth;
      validAssets++;
    }
  }
  
  // Calculate average performance if we have valid assets
  if (validAssets > 0) {
    const averagePerformance = totalPerformance / validAssets;
    
    // Add some randomness to simulate market fluctuations
    const randomFactor = 0.98 + (Math.random() * 0.04); // ±2% random variation
    
    // Update current value
    strategy.currentValue = initialInvestment * averagePerformance * randomFactor;
  }
}

/**
 * Rebalance a strategy to optimize asset allocation
 * 
 * @param {string} strategyId Strategy to rebalance
 * @returns {Promise<Object>} Rebalance results
 */
export async function rebalanceStrategy(strategyId) {
  if (!isInitialized) {
    await initGladstonService();
  }
  
  try {
    const strategy = activeStrategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }
    
    // Check if wallet is connected
    if (!BlockchainService.isConnected()) {
      throw new Error('Wallet connection required to rebalance');
    }
    
    // Check if the strategy belongs to the connected wallet
    const userAddress = BlockchainService.getCurrentAccount();
    if (strategy.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error('You do not have permission to rebalance this strategy');
    }
    
    // Update current value
    updateStrategyValue(strategy);
    
    // Create rebalance transactions (in a real app, this would execute trades)
    const rebalanceTransactions = [];
    const timestamp = Date.now();
    
    // In this example, we'll just simulate a rebalance by creating transaction records
    // In a real implementation, this would calculate drift and execute necessary trades
    
    // Calculate allocations
    let allocations;
    switch (strategy.model) {
      case ALGORITHM_MODELS.CONSERVATIVE:
        allocations = calculateConservativeAllocations(strategy.targetAssets);
        break;
      case ALGORITHM_MODELS.BALANCED:
        allocations = calculateBalancedAllocations(strategy.targetAssets);
        break;
      case ALGORITHM_MODELS.AGGRESSIVE:
        allocations = calculateAggressiveAllocations(strategy.targetAssets);
        break;
      case ALGORITHM_MODELS.EXPERIMENTAL:
        allocations = calculateExperimentalAllocations(strategy.targetAssets);
        break;
      default:
        const equalPercent = 1 / strategy.targetAssets.length;
        allocations = strategy.targetAssets.map(asset => ({
          asset,
          percentage: equalPercent
        }));
    }
    
    // Create rebalance transactions
    for (const allocation of allocations) {
      rebalanceTransactions.push({
        id: `rebal_${strategyId}_${allocation.asset}_${timestamp}`,
        type: 'rebalance',
        asset: allocation.asset,
        targetAllocation: allocation.percentage,
        targetAmount: strategy.currentValue * allocation.percentage,
        timestamp,
        status: 'completed'
      });
    }
    
    // Add transactions to strategy
    strategy.transactions.push(...rebalanceTransactions);
    strategy.lastRebalance = timestamp;
    
    // In a real implementation, this would wait for on-chain confirmation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      strategyId,
      currentValue: strategy.currentValue,
      allocations,
      transactions: rebalanceTransactions
    };
  } catch (error) {
    console.error('Error rebalancing strategy:', error);
    throw error;
  }
}

/**
 * Close a strategy and withdraw assets
 * 
 * @param {string} strategyId Strategy to close
 * @returns {Promise<Object>} Close operation results
 */
export async function closeStrategy(strategyId) {
  if (!isInitialized) {
    await initGladstonService();
  }
  
  try {
    const strategy = activeStrategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }
    
    // Check if wallet is connected
    if (!BlockchainService.isConnected()) {
      throw new Error('Wallet connection required to close strategy');
    }
    
    // Check if the strategy belongs to the connected wallet
    const userAddress = BlockchainService.getCurrentAccount();
    if (strategy.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error('You do not have permission to close this strategy');
    }
    
    // Update current value
    updateStrategyValue(strategy);
    
    // Create withdrawal transaction
    const timestamp = Date.now();
    const withdrawalTransaction = {
      id: `close_${strategyId}_${timestamp}`,
      type: 'withdrawal',
      amount: strategy.currentValue,
      timestamp,
      status: 'completed'
    };
    
    // Add transaction to strategy
    strategy.transactions.push(withdrawalTransaction);
    strategy.status = 'closed';
    strategy.closedAt = timestamp;
    
    // In a real implementation, this would execute the withdrawal on-chain
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      strategyId,
      finalValue: strategy.currentValue,
      initialValue: strategy.initialInvestment,
      profit: strategy.currentValue - strategy.initialInvestment,
      profitPercentage: (strategy.currentValue / strategy.initialInvestment - 1) * 100,
      transaction: withdrawalTransaction
    };
  } catch (error) {
    console.error('Error closing strategy:', error);
    throw error;
  }
}

/**
 * Get historical performance for an algorithm model
 * 
 * @param {string} model Algorithm model to query
 * @returns {Promise<Object>} Historical performance data
 */
export async function getModelPerformance(model) {
  if (!isInitialized) {
    await initGladstonService();
  }
  
  // Get performance data for the requested model
  const modelData = performanceHistory.get(model);
  if (!modelData) {
    throw new Error(`Performance data not available for model: ${model}`);
  }
  
  return modelData;
}

/**
 * Get available assets for Gladston strategies
 * 
 * @returns {Promise<Array<Object>>} Available assets with metadata
 */
export async function getAvailableAssets() {
  if (!isInitialized) {
    await initGladstonService();
  }
  
  // In a real implementation, this would fetch current market data
  // For this example, we'll return a static list with synthetic data
  
  return [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      currentPrice: 1800 + (Math.random() * 200 - 100),
      change24h: Math.random() * 10 - 5,
      marketCap: 216000000000,
      category: 'layer1'
    },
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      currentPrice: 27000 + (Math.random() * 1000 - 500),
      change24h: Math.random() * 8 - 4,
      marketCap: 529000000000,
      category: 'currency'
    },
    {
      symbol: 'MATIC',
      name: 'Polygon',
      currentPrice: 0.5 + (Math.random() * 0.1 - 0.05),
      change24h: Math.random() * 12 - 6,
      marketCap: 4600000000,
      category: 'layer2'
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      currentPrice: 20 + (Math.random() * 4 - 2),
      change24h: Math.random() * 15 - 7.5,
      marketCap: 8400000000,
      category: 'layer1'
    },
    {
      symbol: 'AVAX',
      name: 'Avalanche',
      currentPrice: 10 + (Math.random() * 2 - 1),
      change24h: Math.random() * 11 - 5.5,
      marketCap: 3500000000,
      category: 'layer1'
    },
    {
      symbol: 'LINK',
      name: 'Chainlink',
      currentPrice: 7 + (Math.random() * 1 - 0.5),
      change24h: Math.random() * 9 - 4.5,
      marketCap: 4000000000,
      category: 'oracle'
    },
    {
      symbol: 'DOT',
      name: 'Polkadot',
      currentPrice: 4 + (Math.random() * 0.8 - 0.4),
      change24h: Math.random() * 10 - 5,
      marketCap: 5200000000,
      category: 'interoperability'
    },
  ];
}

export default {
  initGladstonService,
  createStrategy,
  getUserStrategies,
  getStrategyById,
  rebalanceStrategy,
  closeStrategy,
  getModelPerformance,
  getAvailableAssets,
  ALGORITHM_MODELS,
  INVESTMENT_HORIZONS,
  STRATEGY_TYPES
};
