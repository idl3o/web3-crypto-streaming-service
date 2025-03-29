/**
 * PrecogEngine - Predictive Analytics Service
 * 
 * This service provides AI-powered predictive analytics for content, investments,
 * market trends and user behavior in the Web3 streaming platform.
 */

// Simulated ML model weights - in a real app this would be from trained models
const MODEL_WEIGHTS = {
  contentPopularity: {
    viewCount: 0.35,
    engagementRate: 0.25,
    creatorReputation: 0.2,
    topicTrending: 0.15,
    productionQuality: 0.05
  },
  investmentReturn: {
    historicalPerformance: 0.3,
    marketSentiment: 0.2,
    creatorTrackRecord: 0.25,
    topicGrowth: 0.15,
    riskFactor: 0.1
  },
  userBehavior: {
    pastViewingPatterns: 0.4,
    similarUserChoices: 0.25,
    contentPreferences: 0.2,
    timeOfDay: 0.1,
    deviceType: 0.05
  }
};

// Trending topics with momentum scores
const trendingTopicsCache = {
  lastUpdated: null,
  topics: {}
};

/**
 * Predicts future popularity of content
 * @param {Object} content - Content metadata
 * @param {Object} platformData - Current platform stats
 * @returns {Object} Prediction results
 */
export function predictContentPopularity(content, platformData = {}) {
  // Normalize inputs
  const normalizedInput = {
    viewCount: normalizeViewCount(content.views || 0),
    engagementRate: normalizeEngagement(content.engagement || 0),
    creatorReputation: normalizeCreatorScore(content.creator),
    topicTrending: getTopicTrendScore(content.topics || [content.title], platformData),
    productionQuality: estimateProductionQuality(content)
  };

  // Apply model weights
  const weights = MODEL_WEIGHTS.contentPopularity;
  let score = 0;

  for (const [key, value] of Object.entries(normalizedInput)) {
    score += value * weights[key];
  }

  // Generate prediction data
  const viewsIn30Days = Math.floor(content.views * (1 + score));
  const engagementTrend = score > 0.6 ? 'rapidly-increasing' :
    score > 0.4 ? 'increasing' :
      score > 0.2 ? 'stable' : 'decreasing';

  // Calculate confidence based on data completeness
  const confidence = calculateConfidence(normalizedInput);

  return {
    score: score.toFixed(2),
    predictedViews: viewsIn30Days,
    predictedEngagement: Math.min((content.engagement || 0) * (1 + score / 2), 100).toFixed(1) + '%',
    trend: engagementTrend,
    viralPotential: score > 0.75,
    confidence: confidence.toFixed(2),
    timeHorizon: '30 days'
  };
}

/**
 * Predicts investment returns for content
 * @param {Object} investment - Investment details
 * @param {Object} marketData - Current market conditions
 * @returns {Object} Investment prediction
 */
export function predictInvestmentReturns(investment, marketData = {}) {
  const content = investment.content || {};

  // Normalize inputs
  const normalizedInput = {
    historicalPerformance: normalizeHistoricalReturns(content.creatorId || content.creator),
    marketSentiment: marketData.sentiment || 0.5,
    creatorTrackRecord: normalizeCreatorScore(content.creator),
    topicGrowth: getTopicTrendScore(content.topics || [content.title], marketData),
    riskFactor: calculateRiskFactor(investment, content)
  };

  // Apply model weights
  const weights = MODEL_WEIGHTS.investmentReturn;
  let score = 0;

  for (const [key, value] of Object.entries(normalizedInput)) {
    score += value * weights[key];
  }

  // Generate ROI scenarios
  const baseROI = 15; // 15% base ROI assumption
  const volatilityFactor = normalizedInput.riskFactor * 10;

  const conservativeROI = Math.max(0, (baseROI - volatilityFactor) * (0.7 + score / 3));
  const expectedROI = baseROI * (0.8 + score / 2);
  const optimisticROI = (baseROI + volatilityFactor) * (0.9 + score);

  // Calculate confidence based on data completeness
  const confidence = calculateConfidence(normalizedInput);

  return {
    score: score.toFixed(2),
    roi: {
      conservative: conservativeROI.toFixed(1) + '%',
      expected: expectedROI.toFixed(1) + '%',
      optimistic: optimisticROI.toFixed(1) + '%'
    },
    conservativeValue: investment.amount * (1 + conservativeROI / 100),
    expectedValue: investment.amount * (1 + expectedROI / 100),
    optimisticValue: investment.amount * (1 + optimisticROI / 100),
    trend: score > 0.6 ? 'bullish' : score > 0.4 ? 'stable' : 'bearish',
    confidence: confidence.toFixed(2),
    timeHorizon: '90 days'
  };
}

/**
 * Predicts content a user would be interested in
 * @param {Object} user - User profile and history
 * @param {Array} availableContent - Content to evaluate
 * @returns {Array} Ranked content recommendations
 */
export function predictUserInterests(user, availableContent) {
  // Ensure we have content to evaluate
  if (!availableContent || !availableContent.length) return [];

  const results = availableContent.map(content => {
    // Calculate interest score based on user behavior weights
    const interestScore = calculateInterestScore(user, content);

    return {
      ...content,
      matchScore: interestScore,
      predictedInterest: interestScore > 0.8 ? 'very high' :
        interestScore > 0.6 ? 'high' :
          interestScore > 0.4 ? 'medium' : 'low'
    };
  });

  // Sort by score (highest first)
  return results.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Predicts trending topics for the next period
 * @param {Object} options - Configuration options
 * @returns {Array} Predicted trending topics
 */
export function predictTrendingTopics(options = {}) {
  const timeHorizon = options.timeHorizon || 7; // days

  // Check if we have a recent cache
  const now = Date.now();
  if (trendingTopicsCache.lastUpdated &&
    now - trendingTopicsCache.lastUpdated < 3600000) { // Cache for 1 hour
    return formatTrendingTopics(trendingTopicsCache.topics, timeHorizon);
  }

  // Simulate topic analysis that would typically use ML
  const topics = simulateTopicAnalysis(timeHorizon);

  // Update cache
  trendingTopicsCache.topics = topics;
  trendingTopicsCache.lastUpdated = now;

  return formatTrendingTopics(topics, timeHorizon);
}

/**
 * Generates time-series data for visualization
 * @param {String} dataType - Type of data to forecast
 * @param {Object} params - Customization parameters
 * @returns {Object} Time series data
 */
export function generateForecastTimeSeries(dataType, params = {}) {
  const days = params.days || 30;
  const dataPoints = [];
  const today = new Date();

  // Generate historical data points (past)
  for (let i = 20; i > 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    dataPoints.push({
      date: date.toISOString().split('T')[0],
      value: generateHistoricalDataPoint(dataType, i, params),
      type: 'historical'
    });
  }

  // Generate forecast data points (future)
  const lastValue = dataPoints[dataPoints.length - 1].value;
  const volatility = getVolatilityForDataType(dataType, params);
  const trend = getTrendForDataType(dataType, params);

  for (let i = 1; i <= days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    const forecastValue = generateForecastDataPoint(lastValue, i, trend, volatility, params);

    dataPoints.push({
      date: date.toISOString().split('T')[0],
      value: forecastValue,
      type: 'forecast',
      // Add confidence interval data
      confidenceUpper: forecastValue * (1 + 0.05 * Math.sqrt(i)),
      confidenceLower: forecastValue * (1 - 0.05 * Math.sqrt(i))
    });
  }

  return {
    dataPoints,
    metadata: {
      dataType,
      timeHorizon: days,
      confidence: calculateForecastConfidence(params),
      lastUpdated: new Date().toISOString()
    }
  };
}

// HELPER FUNCTIONS

function normalizeViewCount(views) {
  // Normalize on a 0-1 scale with logarithmic scaling for large numbers
  if (views === 0) return 0;
  return Math.min(1, Math.log10(views) / 6); // 1M views → 1.0
}

function normalizeEngagement(engagement) {
  // Convert percentage to 0-1 scale
  return Math.min(1, engagement / 100);
}

function normalizeCreatorScore(creatorId) {
  // In a real app, this would query the creator's reputation
  // Simulate a score based on string hash
  const hash = stringToHash(String(creatorId));
  return (hash % 80 + 20) / 100; // 0.2 to 1.0 range
}

function getTopicTrendScore(topics, marketData = {}) {
  if (!Array.isArray(topics) || topics.length === 0) return 0.5;

  // Get current trending topics or simulate them
  const trendingTopics = marketData.trendingTopics || simulateTopicAnalysis();

  // Calculate average trend score for all topics
  const scores = topics.map(topic => {
    const topicKey = topic.toLowerCase().trim();
    return trendingTopics[topicKey] || 0.4; // Default to slightly below average
  });

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function estimateProductionQuality(content) {
  // In reality, this would analyze content metadata, resolution, etc
  // Here we'll simulate based on a hash of content properties
  const qualityIndicators = [
    content.protocol === 'k80' ? 0.2 : 0, // K80 protocol bonus
    content.hasOwnProperty('hd') && content.hd ? 0.1 : 0,
    content.duration ? Math.min(0.1, content.duration / 600) : 0, // Longer content up to 10 min
  ];

  const baseQuality = 0.6; // Baseline quality
  return Math.min(1, baseQuality + qualityIndicators.reduce((sum, val) => sum + val, 0));
}

function normalizeHistoricalReturns(creatorId) {
  // Simulate historical return data based on creator
  const hash = stringToHash(String(creatorId));
  return (hash % 60 + 40) / 100; // 0.4 to 1.0 range
}

function calculateRiskFactor(investment, content) {
  // Lower is better (less risk)
  // In reality, this would use complex risk models
  const factors = [
    content.views ? Math.max(0, 1 - normalizeViewCount(content.views)) : 0.5,
    investment.lockPeriod ? Math.max(0, 0.8 - investment.lockPeriod / 100) : 0.8,
    content.protocol === 'k80' ? 0.3 : 0.5, // K80 is lower risk
  ];

  return factors.reduce((sum, val) => sum + val, 0) / factors.length;
}

function calculateInterestScore(user, content) {
  if (!user || !content) return 0;

  // Simplified interest scoring based on categories, watch history, etc.
  let score = 0.4; // Base score

  // Check if user has viewed similar content
  if (user.viewHistory && Array.isArray(user.viewHistory)) {
    const similarContent = user.viewHistory.filter(item =>
      item.category === content.category ||
      item.creator === content.creator
    );
    score += Math.min(0.3, similarContent.length * 0.05);
  }

  // Check if content matches user preferences
  if (user.preferences && content.category) {
    const prefFactor = user.preferences[content.category] || 0;
    score += prefFactor * 0.2;
  }

  // Add randomness to simulate the unpredictability of real recommendations
  score += (Math.random() * 0.2) - 0.1;

  return Math.min(1, Math.max(0, score));
}

function simulateTopicAnalysis(timeHorizon = 7) {
  const topicScores = {
    "defi": 0.85,
    "nft": 0.72,
    "layer2": 0.78,
    "ethereum": 0.83,
    "bitcoin": 0.81,
    "dao": 0.76,
    "metaverse": 0.71,
    "security": 0.69,
    "gaming": 0.65,
    "privacy": 0.73,
    "scaling": 0.82,
    "identity": 0.63,
    "stablecoins": 0.67,
    "regulations": 0.79,
    "tokenomics": 0.68
  };

  // Add time-based variations
  const result = {};
  Object.entries(topicScores).forEach(([topic, score]) => {
    const timeVariation = (Math.random() * 0.2) - 0.1; // -0.1 to 0.1
    result[topic] = Math.min(1, Math.max(0, score + timeVariation));
  });

  return result;
}

function formatTrendingTopics(topics, timeHorizon) {
  return Object.entries(topics)
    .map(([topic, score]) => ({
      topic,
      trendScore: score,
      momentumIndicator: score > 0.75 ? 'high' : score > 0.6 ? 'moderate' : 'low',
      predictedTimeframe: `${timeHorizon} days`
    }))
    .sort((a, b) => b.trendScore - a.trendScore);
}

function calculateConfidence(normalizedInput) {
  if (!normalizedInput) return 0.5;

  // Count how many inputs are defined
  const definedCount = Object.values(normalizedInput)
    .filter(val => val !== undefined && val !== null).length;

  // More data points increase confidence
  const dataCompleteness = definedCount / Object.keys(normalizedInput).length;

  // Average distance from 0.5 indicates stronger signals
  const signalStrength = Object.values(normalizedInput)
    .filter(val => val !== undefined && val !== null)
    .map(val => Math.abs(val - 0.5) * 2) // Convert to 0-1 scale where 1 is strongest
    .reduce((sum, val) => sum + val, 0) / definedCount;

  // Combine factors
  return Math.min(0.98, (dataCompleteness * 0.5) + (signalStrength * 0.5));
}

function stringToHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function generateHistoricalDataPoint(dataType, daysAgo, params) {
  const baseValue = getBaseValueForDataType(dataType, params);
  const seasonalFactor = getSeasonalFactor(daysAgo);
  const randomNoise = (Math.random() * 0.1) - 0.05; // -5% to +5%

  return baseValue * (1 + seasonalFactor + randomNoise);
}

function generateForecastDataPoint(lastValue, daysAhead, trend, volatility, params) {
  const trendFactor = trend * (daysAhead / 30); // Monthly trend applied daily
  const seasonalFactor = getSeasonalFactor(daysAhead);
  const randomNoise = ((Math.random() * volatility * 2) - volatility) * Math.sqrt(daysAhead / 10);

  return lastValue * (1 + trendFactor + seasonalFactor + randomNoise);
}

function getBaseValueForDataType(dataType, params) {
  switch (dataType) {
    case 'viewership':
      return params.initialViews || 1000;
    case 'investment':
      return params.initialValue || 100;
    case 'engagement':
      return params.initialEngagement || 50;
    case 'market':
      return params.initialMarket || 10000;
    default:
      return 100;
  }
}

function getTrendForDataType(dataType, params) {
  // Monthly growth rate
  const defaultTrends = {
    'viewership': 0.15,    // 15% monthly growth
    'investment': 0.08,    // 8% monthly growth
    'engagement': 0.05,    // 5% monthly growth
    'market': 0.12,        // 12% monthly growth
  };

  return params.trend || defaultTrends[dataType] || 0.1;
}

function getVolatilityForDataType(dataType, params) {
  const defaultVolatilities = {
    'viewership': 0.08,
    'investment': 0.15,
    'engagement': 0.05,
    'market': 0.2
  };

  return params.volatility || defaultVolatilities[dataType] || 0.1;
}

function getSeasonalFactor(dayOffset) {
  // Simulate weekly patterns
  const dayOfWeek = (new Date().getDay() + dayOffset) % 7;

  // Weekend spike in viewership
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 0.05;
  } else if (dayOfWeek === 1) {
    return -0.02; // Monday dip
  }

  return 0;
}

function calculateForecastConfidence(params) {
  // Base confidence
  let confidence = 0.75;

  // Adjust based on available params
  if (params.historicalData && params.historicalData.length > 20) {
    confidence += 0.1;
  }

  // Time horizon affects confidence
  if (params.days && params.days > 30) {
    confidence -= (params.days - 30) * 0.005; // Lower confidence for longer horizons
  }

  return Math.min(0.95, Math.max(0.3, confidence));
}
