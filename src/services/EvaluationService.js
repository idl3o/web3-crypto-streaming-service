/**
 * Evaluation Service
 * 
 * Provides high-performance evaluation capabilities for content, investments,
 * and system performance with a focus on execution efficiency.
 */

import { executeTask, EXECUTION_STRATEGIES, PRIORITY_LEVELS } from './ExecutionEngine';
import { optimizeComputation, batchProcess } from './OptimizationService';
import { getExecutionStats } from './ExecutionEngine';
import { getOptimizationStats } from './OptimizationService';
import { getTransactionStats } from './TransactionProcessingService';

// Constants for evaluation categories
export const EVAL_CATEGORIES = {
  CONTENT: 'content',
  INVESTMENT: 'investment',
  PERFORMANCE: 'performance',
  USER_EXPERIENCE: 'user_experience',
  SECURITY: 'security'
};

// Evaluation result storage with efficient indexing
const evaluationStore = {
  results: new Map(),
  byCategory: {},
  byEntityId: {},
  recentEvaluations: []
};

// Initialize category maps
Object.values(EVAL_CATEGORIES).forEach(category => {
  evaluationStore.byCategory[category] = new Map();
});

/**
 * Initialize the evaluation service
 */
export function initEvaluationService() {
  console.log('Evaluation Service initialized');

  // Start periodic system evaluation
  scheduleSystemEvaluation();

  return {
    status: 'initialized',
    metrics: {
      storedEvaluations: evaluationStore.results.size
    }
  };
}

/**
 * Evaluate content with optimized processing
 * @param {Object} content - Content to evaluate
 * @param {Object} options - Evaluation options
 * @returns {Promise<Object>} Evaluation results
 */
export async function evaluateContent(content, options = {}) {
  const evaluationParams = {
    content,
    options,
    timestamp: Date.now()
  };

  // Determine priority level based on options
  const priority = options.priority || PRIORITY_LEVELS.LOW;

  try {
    // Use the optimization service for efficient evaluation
    const evaluationResults = await optimizeComputation(
      performContentEvaluation,
      {
        params: evaluationParams,
        priority,
        // Content evaluation can be parallelized for better performance
        strategy: EXECUTION_STRATEGIES.WORKER
      }
    );

    // Store results
    storeEvaluation(EVAL_CATEGORIES.CONTENT, content.id, evaluationResults);

    return evaluationResults;
  } catch (error) {
    console.error('Content evaluation error:', error);
    throw error;
  }
}

/**
 * Actual content evaluation function (executed in worker if available)
 * @param {Object} params - Evaluation parameters
 * @returns {Object} Evaluation results
 */
function performContentEvaluation(params) {
  const { content, options } = params;

  // Start with base metrics
  const metrics = {
    engagement: calculateEngagementScore(content),
    quality: calculateQualityScore(content),
    relevance: calculateRelevanceScore(content, options.searchTerms),
    factualAccuracy: calculateFactualScore(content),
    monetizationPotential: calculateMonetizationScore(content)
  };

  // Calculate overall score (weighted average)
  const weights = {
    engagement: 0.25,
    quality: 0.25,
    relevance: 0.2,
    factualAccuracy: 0.15,
    monetizationPotential: 0.15
  };

  let overallScore = 0;
  let weightSum = 0;

  for (const [metric, weight] of Object.entries(weights)) {
    if (metrics[metric] !== null && metrics[metric] !== undefined) {
      overallScore += metrics[metric] * weight;
      weightSum += weight;
    }
  }

  // Normalize to 0-100 scale
  overallScore = weightSum > 0 ? Math.round(overallScore / weightSum * 100) : 0;

  // Generate evaluation insights
  const insights = generateContentInsights(content, metrics);

  // Generate metadata
  const metadata = {
    evaluationVersion: '1.0',
    processingTimeMs: Math.random() * 200 + 50, // Simulated processing time
    context: {
      platformAverages: getPlatformAverages(EVAL_CATEGORIES.CONTENT)
    }
  };

  return {
    entityId: content.id,
    entityType: 'content',
    category: EVAL_CATEGORIES.CONTENT,
    overallScore,
    metrics,
    insights,
    recommendations: generateRecommendations(metrics, EVAL_CATEGORIES.CONTENT),
    timestamp: Date.now(),
    metadata
  };
}

/**
 * Evaluate investment performance
 * @param {Object} investment - Investment to evaluate
 * @param {Object} options - Evaluation options
 * @returns {Promise<Object>} Evaluation results
 */
export async function evaluateInvestment(investment, options = {}) {
  const evaluationParams = {
    investment,
    options,
    timestamp: Date.now()
  };

  try {
    // Run the evaluation with optimized execution
    const evaluationResults = await optimizeComputation(
      performInvestmentEvaluation,
      {
        params: evaluationParams,
        // Financial calculations should be very accurate, so use IMMEDIATE
        strategy: EXECUTION_STRATEGIES.IMMEDIATE,
        priority: PRIORITY_LEVELS.MEDIUM
      }
    );

    // Store results
    storeEvaluation(EVAL_CATEGORIES.INVESTMENT, investment.id, evaluationResults);

    return evaluationResults;
  } catch (error) {
    console.error('Investment evaluation error:', error);
    throw error;
  }
}

/**
 * Actual investment evaluation function
 * @param {Object} params - Evaluation parameters
 * @returns {Object} Evaluation results
 */
function performInvestmentEvaluation(params) {
  const { investment, options } = params;

  // Calculate investment metrics
  const metrics = {
    roi: calculateRoi(investment),
    riskAdjustedReturn: calculateRiskAdjustedReturn(investment),
    volatility: calculateVolatility(investment),
    timeToProfit: calculateTimeToProfit(investment),
    diversificationImpact: calculateDiversificationImpact(investment)
  };

  // Calculate performance against benchmarks
  const benchmarkResults = {};
  if (options.benchmarks) {
    for (const benchmark of options.benchmarks) {
      benchmarkResults[benchmark.id] = compareWithBenchmark(investment, benchmark);
    }
  }

  // Generate insights based on metrics
  const insights = generateInvestmentInsights(investment, metrics, benchmarkResults);

  // Calculate overall investment score
  const weights = {
    roi: 0.4,
    riskAdjustedReturn: 0.3,
    volatility: 0.15,
    timeToProfit: 0.1,
    diversificationImpact: 0.05
  };

  let overallScore = 0;
  let weightSum = 0;

  for (const [metric, weight] of Object.entries(weights)) {
    if (metrics[metric] !== null && metrics[metric] !== undefined) {
      overallScore += metrics[metric] * weight;
      weightSum += weight;
    }
  }

  // Normalize to 0-100 scale
  overallScore = weightSum > 0 ? Math.round(overallScore / weightSum * 100) : 0;

  return {
    entityId: investment.id,
    entityType: 'investment',
    category: EVAL_CATEGORIES.INVESTMENT,
    overallScore,
    metrics,
    benchmarkComparisons: benchmarkResults,
    insights,
    recommendations: generateRecommendations(metrics, EVAL_CATEGORIES.INVESTMENT),
    timestamp: Date.now(),
    metadata: {
      evaluationVersion: '1.0',
      marketContext: options.marketContext || 'neutral',
      evaluationPeriod: options.period || 'all'
    }
  };
}

/**
 * Evaluate system performance metrics
 * @param {Object} options - Evaluation options
 * @returns {Promise<Object>} Evaluation results
 */
export async function evaluateSystemPerformance(options = {}) {
  // For system evaluation, we want to execute with high priority but deferred
  // to avoid blocking the main thread with intensive calculations

  try {
    const evaluationResults = await optimizeComputation(
      performSystemEvaluation,
      {
        params: { options, timestamp: Date.now() },
        priority: PRIORITY_LEVELS.HIGH,
        strategy: EXECUTION_STRATEGIES.DEFERRED
      }
    );

    // Store results
    storeEvaluation(EVAL_CATEGORIES.PERFORMANCE, 'system', evaluationResults);

    return evaluationResults;
  } catch (error) {
    console.error('System evaluation error:', error);
    throw error;
  }
}

/**
 * Actual system evaluation function
 * @param {Object} params - Evaluation parameters
 * @returns {Object} Evaluation results
 */
function performSystemEvaluation(params) {
  const { options } = params;

  // Collect metrics from various services
  const executionStats = getExecutionStats();
  const optimizationStats = getOptimizationStats();
  const transactionStats = getTransactionStats();

  // Calculate performance metrics
  const metrics = {
    executionEfficiency: calculateExecutionEfficiency(executionStats),
    memoryUsage: calculateMemoryUsage(),
    responseTime: calculateAverageResponseTime(),
    throughput: calculateThroughput(transactionStats),
    errorRate: calculateErrorRate(executionStats, transactionStats)
  };

  // Calculate overall system score
  const weights = {
    executionEfficiency: 0.3,
    memoryUsage: 0.2,
    responseTime: 0.2,
    throughput: 0.2,
    errorRate: 0.1
  };

  let overallScore = 0;
  let weightSum = 0;

  for (const [metric, weight] of Object.entries(weights)) {
    if (metrics[metric] !== null && metrics[metric] !== undefined) {
      overallScore += metrics[metric] * weight;
      weightSum += weight;
    }
  }

  // Normalize to 0-100 scale
  overallScore = weightSum > 0 ? Math.round(overallScore / weightSum * 100) : 0;

  // Generate insights and bottleneck analysis
  const insights = [
    ...generateSystemInsights(metrics, executionStats),
    ...identifyBottlenecks(metrics, executionStats, transactionStats)
  ];

  // Generate detailed metrics
  const detailedMetrics = {
    execution: {
      workersUtilization: calculateWorkerUtilization(executionStats),
      averageTaskDuration: calculateAverageTaskDuration(executionStats),
      taskQueueLength: executionStats.totalTasks || 0,
      executionStrategies: summarizeExecutionStrategies(executionStats)
    },
    transactions: {
      batchEfficiency: calculateBatchEfficiency(transactionStats),
      validationSpeed: calculateValidationSpeed(transactionStats),
      pendingRate: calculatePendingRate(transactionStats)
    },
    optimization: {
      cacheEfficiency: calculateCacheEfficiency(optimizationStats),
      adaptiveStrategyEffectiveness: calculateAdaptiveEffectiveness(optimizationStats)
    }
  };

  return {
    entityId: 'system',
    entityType: 'system',
    category: EVAL_CATEGORIES.PERFORMANCE,
    overallScore,
    metrics,
    detailedMetrics,
    insights,
    recommendations: generateSystemRecommendations(metrics, detailedMetrics),
    timestamp: Date.now(),
    rawData: {
      executionStats,
      optimizationStats,
      transactionStats
    },
    metadata: {
      evaluationVersion: '1.1',
      sampleDuration: options.sampleDuration || '5m'
    }
  };
}

/**
 * Schedule periodic system evaluation
 */
function scheduleSystemEvaluation() {
  const evaluationInterval = 5 * 60 * 1000; // 5 minutes

  setInterval(() => {
    // Use low priority to avoid impacting user experience
    evaluateSystemPerformance({ priority: PRIORITY_LEVELS.LOW })
      .catch(err => console.error('Automated system evaluation failed:', err));
  }, evaluationInterval);
}

/**
 * Store evaluation result in the evaluation store
 * @param {string} category - Evaluation category
 * @param {string} entityId - ID of evaluated entity
 * @param {Object} result - Evaluation result
 */
function storeEvaluation(category, entityId, result) {
  const evaluationId = `eval-${category}-${entityId}-${Date.now()}`;

  // Store by ID
  evaluationStore.results.set(evaluationId, result);

  // Store by category
  if (!evaluationStore.byCategory[category]) {
    evaluationStore.byCategory[category] = new Map();
  }
  evaluationStore.byCategory[category].set(evaluationId, result);

  // Store by entity ID
  if (!evaluationStore.byEntityId[entityId]) {
    evaluationStore.byEntityId[entityId] = new Map();
  }
  evaluationStore.byEntityId[entityId].set(evaluationId, result);

  // Add to recent evaluations list
  evaluationStore.recentEvaluations.unshift({
    id: evaluationId,
    timestamp: result.timestamp,
    category,
    entityId,
    score: result.overallScore
  });

  // Keep only latest 100 evaluations in recent list
  if (evaluationStore.recentEvaluations.length > 100) {
    evaluationStore.recentEvaluations.pop();
  }

  // Implement cleanup to prevent memory leaks
  // In a real system, older evaluations would be persisted to storage
  if (evaluationStore.results.size > 1000) {
    const keysToDelete = Array.from(evaluationStore.results.keys()).slice(0, 100);
    for (const key of keysToDelete) {
      const eval = evaluationStore.results.get(key);
      evaluationStore.results.delete(key);

      // Also remove from category and entity indices
      if (evaluationStore.byCategory[eval.category]) {
        evaluationStore.byCategory[eval.category].delete(key);
      }

      if (evaluationStore.byEntityId[eval.entityId]) {
        evaluationStore.byEntityId[eval.entityId].delete(key);
      }
    }
  }
}

/**
 * Get the most recent evaluation for an entity
 * @param {string} entityId - ID of entity to get evaluation for
 * @param {string} category - Optional category filter
 * @returns {Object|null} Most recent evaluation or null if not found
 */
export function getLatestEvaluation(entityId, category = null) {
  if (!evaluationStore.byEntityId[entityId]) {
    return null;
  }

  // Get all evaluations for this entity
  const entityEvals = Array.from(evaluationStore.byEntityId[entityId].values());

  // Filter by category if specified
  const filteredEvals = category ?
    entityEvals.filter(eval => eval.category === category) :
    entityEvals;

  // Sort by timestamp (newest first)
  filteredEvals.sort((a, b) => b.timestamp - a.timestamp);

  // Return the most recent evaluation
  return filteredEvals[0] || null;
}

/**
 * Get evaluation history for an entity
 * @param {string} entityId - ID of entity
 * @param {Object} options - Filter options
 * @returns {Array} Evaluation history
 */
export function getEvaluationHistory(entityId, options = {}) {
  if (!evaluationStore.byEntityId[entityId]) {
    return [];
  }

  const entityEvals = Array.from(evaluationStore.byEntityId[entityId].values());

  // Apply filters
  let filteredEvals = entityEvals;

  if (options.category) {
    filteredEvals = filteredEvals.filter(eval => eval.category === options.category);
  }

  if (options.startDate) {
    const startTimestamp = new Date(options.startDate).getTime();
    filteredEvals = filteredEvals.filter(eval => eval.timestamp >= startTimestamp);
  }

  if (options.endDate) {
    const endTimestamp = new Date(options.endDate).getTime();
    filteredEvals = filteredEvals.filter(eval => eval.timestamp <= endTimestamp);
  }

  // Sort by timestamp (default: newest first)
  const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
  filteredEvals.sort((a, b) => sortOrder * (a.timestamp - b.timestamp));

  // Apply pagination if specified
  if (options.limit) {
    const offset = options.offset || 0;
    filteredEvals = filteredEvals.slice(offset, offset + options.limit);
  }

  return filteredEvals;
}

/**
 * Batch evaluate multiple entities
 * @param {Array} entities - Array of entities to evaluate
 * @param {string} type - Type of evaluation to perform
 * @param {Object} options - Evaluation options
 * @returns {Promise<Array>} Evaluation results
 */
export async function batchEvaluate(entities, type, options = {}) {
  if (!entities || !entities.length) {
    return [];
  }

  // Determine evaluation function based on type
  let evaluationFn;
  switch (type) {
    case EVAL_CATEGORIES.CONTENT:
      evaluationFn = performContentEvaluation;
      break;
    case EVAL_CATEGORIES.INVESTMENT:
      evaluationFn = performInvestmentEvaluation;
      break;
    default:
      throw new Error(`Unsupported batch evaluation type: ${type}`);
  }

  // Process entities in parallel with batching optimization
  return batchProcess(
    entities,
    async (entity) => {
      const params = {
        [type === EVAL_CATEGORIES.CONTENT ? 'content' : 'investment']: entity,
        options,
        timestamp: Date.now()
      };

      // Process the entity
      const result = await optimizeComputation(
        evaluationFn,
        {
          params,
          priority: options.priority || PRIORITY_LEVELS.LOW
        }
      );

      // Store the result
      storeEvaluation(type, entity.id, result);

      return result;
    },
    {
      batchSize: options.batchSize || 10,
      priority: options.priority || PRIORITY_LEVELS.LOW,
      onProgress: options.onProgress
    }
  );
}

/**
 * Get platform averages for a category
 * @param {string} category - Evaluation category
 * @returns {Object} Average metrics
 */
function getPlatformAverages(category) {
  // For prototype, return fixed values
  // In real system, would calculate from stored evaluations
  switch (category) {
    case EVAL_CATEGORIES.CONTENT:
      return {
        averageScore: 72,
        averageEngagement: 68,
        averageQuality: 75,
        totalEvaluated: evaluationStore.byCategory[category]?.size || 0
      };
    case EVAL_CATEGORIES.INVESTMENT:
      return {
        averageScore: 65,
        averageRoi: 12.4,
        averageRisk: 45,
        totalEvaluated: evaluationStore.byCategory[category]?.size || 0
      };
    case EVAL_CATEGORIES.PERFORMANCE:
      return {
        averageScore: 83,
        averageResponseTime: 125,
        averageThroughput: 87,
        totalEvaluated: evaluationStore.byCategory[category]?.size || 0
      };
    default:
      return {
        averageScore: 70,
        totalEvaluated: evaluationStore.byCategory[category]?.size || 0
      };
  }
}

/**
 * Generate insights for content evaluations
 */
function generateContentInsights(content, metrics) {
  const insights = [];

  // Generate insights based on metrics
  if (metrics.engagement > 80) {
    insights.push("Content shows exceptional engagement metrics");
  } else if (metrics.engagement < 40) {
    insights.push("Content has below-average engagement - consider restructuring");
  }

  if (metrics.factualAccuracy > 85) {
    insights.push("Content has high factual accuracy which increases trust");
  } else if (metrics.factualAccuracy < 60) {
    insights.push("Factual accuracy could be improved with additional sources");
  }

  if (metrics.quality > 75 && metrics.engagement > 70) {
    insights.push("High quality content driving strong engagement");
  }

  if (metrics.monetizationPotential > 80) {
    insights.push("Content shows strong monetization potential");
  }

  return insights;
}

/**
 * Generate insights for investment evaluations
 */
function generateInvestmentInsights(investment, metrics, benchmarks) {
  const insights = [];

  if (metrics.roi > 20) {
    insights.push("Investment shows exceptional returns");
  } else if (metrics.roi < 0) {
    insights.push("Investment is currently underperforming");
  }

  if (metrics.volatility > 70) {
    insights.push("High volatility suggests increased risk profile");
  } else if (metrics.volatility < 30) {
    insights.push("Low volatility indicates stable performance");
  }

  if (metrics.roi > 15 && metrics.volatility < 40) {
    insights.push("Excellent risk-adjusted returns compared to benchmarks");
  }

  if (metrics.timeToProfit < 30) {
    insights.push("Quick time-to-profit demonstrates strong investment efficiency");
  }

  return insights;
}

/**
 * Generate insights for system performance evaluations
 */
function generateSystemInsights(metrics, executionStats) {
  const insights = [];

  if (metrics.executionEfficiency > 85) {
    insights.push("Execution engine is performing optimally");
  } else if (metrics.executionEfficiency < 60) {
    insights.push("Execution efficiency could be improved - check worker utilization");
  }

  if (metrics.responseTime < 100) { // < 100ms is excellent
    insights.push("Response times are excellent");
  } else if (metrics.responseTime > 300) {
    insights.push("Response times are higher than optimal");
  }

  if (metrics.memoryUsage > 75) {
    insights.push("Memory usage is high - consider optimization");
  }

  if (metrics.errorRate > 5) {
    insights.push("Error rate is above acceptable threshold");
  }

  return insights;
}

/**
 * Identify system bottlenecks
 */
function identifyBottlenecks(metrics, executionStats, transactionStats) {
  const bottlenecks = [];

  // Check for worker utilization imbalance
  const workersActive = executionStats.workersActive || 0;
  const workersTotal = executionStats.workersTotal || 0;

  if (workersTotal > 0 && workersActive / workersTotal > 0.9) {
    bottlenecks.push("High worker thread utilization (>90%) may indicate CPU bottleneck");
  }

  // Check for memory pressure
  if (metrics.memoryUsage > 85) {
    bottlenecks.push("Memory pressure detected - consider increasing cache limits or reducing batch sizes");
  }

  // Check for transaction bottlenecks
  if (transactionStats.pendingBatches > 5) {
    bottlenecks.push("Transaction batch queue building up - consider increasing processing capacity");
  }

  // Check for response time issues
  if (metrics.responseTime > 500) {
    bottlenecks.push("Response time exceeds 500ms threshold - investigate possible I/O bottlenecks");
  }

  return bottlenecks.map(bottleneck => ({
    type: 'bottleneck',
    message: bottleneck
  }));
}

/**
 * Generate recommendations based on metrics
 */
function generateRecommendations(metrics, category) {
  const recommendations = [];

  switch (category) {
    case EVAL_CATEGORIES.CONTENT:
      if (metrics.engagement < 50) {
        recommendations.push({
          action: 'improve_engagement',
          description: 'Add interactive elements to boost engagement',
          priority: 'high'
        });
      }

      if (metrics.factualAccuracy < 70) {
        recommendations.push({
          action: 'improve_accuracy',
          description: 'Verify claims and add additional sources',
          priority: 'medium'
        });
      }

      if (metrics.quality < 60) {
        recommendations.push({
          action: 'improve_quality',
          description: 'Enhance production quality and editing',
          priority: 'high'
        });
      }
      break;

    case EVAL_CATEGORIES.INVESTMENT:
      if (metrics.roi < 5) {
        recommendations.push({
          action: 'reassess_strategy',
          description: 'Consider adjusting investment strategy',
          priority: 'high'
        });
      }

      if (metrics.volatility > 80) {
        recommendations.push({
          action: 'reduce_risk',
          description: 'Implement hedging to reduce volatility',
          priority: 'medium'
        });
      }

      if (metrics.diversificationImpact < 20) {
        recommendations.push({
          action: 'diversify',
          description: 'Increase portfolio diversification',
          priority: 'medium'
        });
      }
      break;

    case EVAL_CATEGORIES.PERFORMANCE:
      if (metrics.executionEfficiency < 70) {
        recommendations.push({
          action: 'optimize_execution',
          description: 'Tune execution strategies for better efficiency',
          priority: 'high'
        });
      }

      if (metrics.errorRate > 2) {
        recommendations.push({
          action: 'error_handling',
          description: 'Improve error handling and fallback mechanisms',
          priority: 'high'
        });
      }

      if (metrics.memoryUsage > 80) {
        recommendations.push({
          action: 'memory_optimization',
          description: 'Implement more aggressive caching cleanup',
          priority: 'medium'
        });
      }
      break;
  }

  return recommendations;
}

/**
 * Generate system-specific recommendations
 */
function generateSystemRecommendations(metrics, detailedMetrics) {
  const recommendations = [];

  // Worker utilization recommendations
  if (detailedMetrics.execution.workersUtilization > 85) {
    recommendations.push({
      action: 'scale_workers',
      description: 'Increase worker thread count to handle load',
      priority: 'high'
    });
  } else if (detailedMetrics.execution.workersUtilization < 30) {
    recommendations.push({
      action: 'reduce_workers',
      description: 'Reduce worker count to save resources',
      priority: 'low'
    });
  }

  // Transaction batch efficiency
  if (detailedMetrics.transactions.batchEfficiency < 60) {
    recommendations.push({
      action: 'optimize_batching',
      description: 'Adjust batch sizes for better efficiency',
      priority: 'medium'
    });
  }

  // Cache efficiency
  if (detailedMetrics.optimization.cacheEfficiency < 50) {
    recommendations.push({
      action: 'tune_cache',
      description: 'Adjust memoization strategy for better hit rates',
      priority: 'medium'
    });
  }

  // Add general recommendations
  if (metrics.responseTime > 300) {
    recommendations.push({
      action: 'improve_response_time',
      description: 'Optimize critical response paths',
      priority: 'high'
    });
  }

  return recommendations;
}

// Calculation functions for content metrics
function calculateEngagementScore(content) {
  // In real implementation, would use actual metrics
  // For prototype, generate sensible values based on content properties
  const baseScore = 50;
  let score = baseScore;

  // Add points for various engagement factors
  if (content.comments && content.comments > 20) {
    score += 10;
  }

  if (content.likes && content.likes > 50) {
    score += 10;
  }

  if (content.shares && content.shares > 10) {
    score += 15;
  }

  if (content.avgWatchTime && content.duration) {
    const watchPercentage = (content.avgWatchTime / content.duration) * 100;
    if (watchPercentage > 70) {
      score += 15;
    } else if (watchPercentage > 50) {
      score += 10;
    }
  }

  // Add randomness to simulate real-world variance
  score += (Math.random() * 10) - 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateQualityScore(content) {
  const baseScore = 60;
  let score = baseScore;

  // Production quality factors
  if (content.resolution === 'HD' || content.resolution === '1080p') {
    score += 5;
  } else if (content.resolution === '4K') {
    score += 10;
  }

  if (content.hasOwnProperty('editing') && content.editing) {
    score += content.editing * 10; // Assuming 0-10 scale
  }

  if (content.hasOwnProperty('audio') && content.audio) {
    score += content.audio * 5; // Assuming 0-10 scale
  }

  // Content structure and organization
  if (content.hasOwnProperty('structure') && content.structure) {
    score += content.structure * 5; // Assuming 0-10 scale
  }

  // Add randomness
  score += (Math.random() * 6) - 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateRelevanceScore(content, searchTerms) {
  const baseScore = 50;
  let score = baseScore;

  if (!searchTerms || !Array.isArray(searchTerms) || searchTerms.length === 0) {
    // If no search terms provided, return moderate relevance
    return baseScore + (Math.random() * 10) - 5;
  }

  // Check title and description for search term matches
  const contentText = [
    content.title || '',
    content.description || '',
    content.transcript || '',
    ...(content.tags || [])
  ].join(' ').toLowerCase();

  let matchCount = 0;
  for (const term of searchTerms) {
    if (contentText.includes(term.toLowerCase())) {
      matchCount++;
    }
  }

  // Calculate match percentage
  const matchPercentage = (matchCount / searchTerms.length) * 100;

  if (matchPercentage >= 80) {
    score += 40;
  } else if (matchPercentage >= 50) {
    score += 25;
  } else if (matchPercentage >= 30) {
    score += 15;
  } else if (matchPercentage > 0) {
    score += 5;
  }

  // Add randomness
  score += (Math.random() * 6) - 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateFactualScore(content) {
  // Would typically call the FactCheckService here
  // For prototype, generate plausible scores
  const baseScore = 65;
  let score = baseScore;

  if (content.verified) {
    score += 15;
  }

  if (content.sources && content.sources.length > 0) {
    score += Math.min(15, content.sources.length * 3);
  }

  // Educational content may have higher factual scores
  if (content.category === 'educational') {
    score += 10;
  }

  // Add randomness
  score += (Math.random() * 10) - 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateMonetizationScore(content) {
  const baseScore = 50;
  let score = baseScore;

  // Factors that affect monetization
  if (content.views) {
    if (content.views > 10000) {
      score += 20;
    } else if (content.views > 1000) {
      score += 10;
    } else if (content.views > 100) {
      score += 5;
    }
  }

  if (content.engagementRate) {
    if (content.engagementRate > 0.1) {
      score += 15;
    } else if (content.engagementRate > 0.05) {
      score += 10;
    }
  }

  if (content.premium) {
    score += 15;
  }

  // Certain categories monetize better
  if (['finance', 'technology', 'education'].includes(content.category)) {
    score += 10;
  }

  // Add randomness
  score += (Math.random() * 10) - 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// Calculation functions for investment metrics
function calculateRoi(investment) {
  if (!investment.initialValue || !investment.currentValue) {
    return 0;
  }

  const roi = ((investment.currentValue - investment.initialValue) / investment.initialValue) * 100;
  return Math.round(roi * 10) / 10; // Round to 1 decimal place
}

function calculateRiskAdjustedReturn(investment) {
  // Using simplified Sharpe Ratio calculation
  if (!investment.returns || !investment.volatility) {
    // Use synthetic data if real metrics aren't available
    const roi = calculateRoi(investment);
    const syntheticVolatility = Math.abs(roi) * 0.5 + 5; // Higher returns often have higher volatility
    return Math.round((roi / syntheticVolatility) * 100);
  }

  const sharpeRatio = investment.returns / investment.volatility;
  // Convert to 0-100 score
  return Math.max(0, Math.min(100, Math.round(sharpeRatio * 20 + 50)));
}

function calculateVolatility(investment) {
  if (investment.volatility) {
    // Direct volatility measure is provided
    return investment.volatility;
  }

  // Calculate synthetic volatility based on price history
  if (investment.priceHistory && investment.priceHistory.length > 1) {
    const prices = investment.priceHistory.map(point => point.price);
    const returns = [];

    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    // Calculate standard deviation of returns
    const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
    const squaredDiffs = returns.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
    const stdDev = Math.sqrt(variance);

    // Convert to 0-100 scale (higher means more volatile)
    return Math.min(100, Math.round(stdDev * 1000));
  }

  // Fallback for insufficient data
  return 50 + (Math.random() * 20) - 10;
}

function calculateTimeToProfit(investment) {
  if (investment.investmentDate && investment.breakEvenDate) {
    const investmentTime = new Date(investment.investmentDate).getTime();
    const breakEvenTime = new Date(investment.breakEvenDate).getTime();
    const daysToProfit = (breakEvenTime - investmentTime) / (1000 * 60 * 60 * 24);

    // Convert to score (lower days = higher score)
    return Math.max(0, Math.min(100, Math.round(100 - (daysToProfit / 3.65)))); // Scaled so 365 days = score of 0
  }

  // Synthetic calculation
  const roi = calculateRoi(investment);
  if (roi <= 0) {
    return 0; // No profit yet
  }

  // Faster ROI = higher score
  return Math.max(0, Math.min(100, Math.round(roi * 2)));
}

function calculateDiversificationImpact(investment) {
  if (!investment.correlations) {
    // Default moderate diversification benefit
    return 50 + (Math.random() * 20) - 10;
  }

  // Average correlation (lower is better for diversification)
  const avgCorrelation = investment.correlations.reduce((sum, val) => sum + val, 0) / investment.correlations.length;

  // Convert to 0-100 score (lower correlation = higher score)
  return Math.max(0, Math.min(100, Math.round(100 - (avgCorrelation * 100))));
}

function compareWithBenchmark(investment, benchmark) {
  // Calculate relative performance
  const investmentRoi = calculateRoi(investment);
  const relativeDiff = investmentRoi - benchmark.returns;

  // Calculate risk-adjusted comparison
  const investmentRisk = investment.volatility || 50;
  const riskAdjustedDiff = (investmentRoi / investmentRisk) - (benchmark.returns / benchmark.volatility);

  return {
    benchmarkId: benchmark.id,
    benchmarkName: benchmark.name,
    absoluteDifference: Math.round(relativeDiff * 10) / 10,
    riskAdjustedDifference: Math.round(riskAdjustedDiff * 100) / 100,
    outperforming: relativeDiff > 0,
    outperformingRiskAdjusted: riskAdjustedDiff > 0
  };
}

// System metrics calculations
function calculateExecutionEfficiency(executionStats) {
  // Calculate efficiency based on worker utilization and task completion
  const workerUtilization = executionStats.workerUtilization ?
    parseFloat(executionStats.workerUtilization) : 0;

  // Calculate completed vs failed tasks
  const completedTasks = (executionStats.tasksByStatus && executionStats.tasksByStatus.completed) || 0;
  const failedTasks = (executionStats.tasksByStatus && executionStats.tasksByStatus.failed) || 0;
  const totalExecutedTasks = completedTasks + failedTasks;

  const successRate = totalExecutedTasks > 0 ?
    (completedTasks / totalExecutedTasks) * 100 : 100;

  // 70% weight to success rate, 30% to optimal worker utilization
  // Best utilization is around 70-80% (not 100%, which means contention)
  const utilizationScore = 100 - Math.abs(75 - workerUtilization) * 4;

  const efficiency = (successRate * 0.7) + (utilizationScore * 0.3);

  return Math.max(0, Math.min(100, Math.round(efficiency)));
}

function calculateMemoryUsage() {
  // In a browser environment, we can't directly measure memory
  // In Node.js, we could use process.memoryUsage()

  // For prototype, return simulated value
  return Math.round(50 + (Math.random() * 30)); // 50-80% range
}

function calculateAverageResponseTime() {
  // Would typically use actual measurements from a performance monitoring system
  // For prototype, return simulated value in milliseconds
  return Math.round(100 + (Math.random() * 150)); // 100-250ms range
}

function calculateThroughput(transactionStats) {
  // Calculate ops/sec from transaction stats
  const totalTransactions = transactionStats.totalTransactions || 0;

  // In a real system, would be calculated over a time window
  // For prototype, use score from 0-100
  const baseScore = 60;
  let score = baseScore;

  if (totalTransactions > 1000) {
    score += 30;
  } else if (totalTransactions > 100) {
    score += 20;
  } else if (totalTransactions > 10) {
    score += 10;
  }

  // Adjust based on batching efficiency
  if (transactionStats.batched) {
    score += 10;
  }

  // Add randomness
  score += (Math.random() * 6) - 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateErrorRate(executionStats, transactionStats) {
  // Combine execution and transaction error rates

  // Execution errors
  const completedTasks = (executionStats.tasksByStatus && executionStats.tasksByStatus.completed) || 0;
  const failedTasks = (executionStats.tasksByStatus && executionStats.tasksByStatus.failed) || 0;
  const totalExecutedTasks = completedTasks + failedTasks;

  const executionErrorRate = totalExecutedTasks > 0 ?
    (failedTasks / totalExecutedTasks) * 100 : 0;

  // Transaction errors
  const completedTx = (transactionStats.transactionsByStatus &&
    transactionStats.transactionsByStatus.COMPLETED) || 0;
  const failedTx = (transactionStats.transactionsByStatus &&
    transactionStats.transactionsByStatus.FAILED) || 0;
  const totalTx = completedTx + failedTx;

  const transactionErrorRate = totalTx > 0 ?
    (failedTx / totalTx) * 100 : 0;

  // Combine error rates (weighted average)
  const combinedErrorRate = (executionErrorRate * 0.4) + (transactionErrorRate * 0.6);

  return Math.max(0, Math.min(100, Math.round(combinedErrorRate)));
}

function calculateWorkerUtilization(executionStats) {
  if (executionStats.workerUtilization) {
    return parseFloat(executionStats.workerUtilization);
  }

  const workersActive = executionStats.workersActive || 0;
  const workersTotal = executionStats.workersTotal || 0;

  if (workersTotal === 0) return 0;

  return Math.round((workersActive / workersTotal) * 100);
}

function calculateAverageTaskDuration(executionStats) {
  // In a real system, would calculate from task metrics
  // For prototype, return simulated value
  return Math.round(50 + (Math.random() * 100)); // 50-150ms range
}

function summarizeExecutionStrategies(executionStats) {
  // In a real system, would summarize which strategies are used and their success rates
  return {
    mostEfficient: 'worker',
    leastEfficient: 'deferred',
    distributionScore: Math.round(70 + (Math.random() * 20)) // 70-90 range
  };
}

function calculateBatchEfficiency(transactionStats) {
  // Calculate how efficiently the batching system is working
  if (!transactionStats.batched) {
    return 0; // Batching not in use
  }

  const pendingBatches = transactionStats.pendingBatches || 0;
  const transactionsInBatches = transactionStats.transactionsInBatches || 0;
  const batchingThreshold = transactionStats.configuration?.batchingThreshold || 5;

  // If no pending batches, efficiency is high
  if (pendingBatches === 0) {
    return 90 + (Math.random() * 10); // 90-100 range
  }

  // Calculate average transactions per batch
  const avgTransactionsPerBatch = pendingBatches > 0 ?
    transactionsInBatches / pendingBatches : 0;

  // Calculate efficiency score
  // Higher transactions per batch = better, but should be balanced
  // Optimal is 2-3x the batching threshold
  const optimalBatchSize = batchingThreshold * 2.5;
  const batchSizeEfficiency = 100 - Math.abs(optimalBatchSize - avgTransactionsPerBatch) * 5;

  return Math.max(0, Math.min(100, Math.round(batchSizeEfficiency)));
}

function calculateValidationSpeed(transactionStats) {
  // In a real system, would measure actual validation times
  // For prototype, return simulated value
  return Math.round(70 + (Math.random() * 20)); // 70-90 range
}

function calculatePendingRate(transactionStats) {
  const pendingTx = (transactionStats.transactionsByStatus &&
    transactionStats.transactionsByStatus.PENDING) || 0;
  const totalTx = transactionStats.totalTransactions || 1;

  const pendingRate = (pendingTx / totalTx) * 100;

  // Lower pending rate is better (0% is ideal)
  return Math.max(0, 100 - pendingRate);
}

function calculateCacheEfficiency(optimizationStats) {
  const cacheSize = optimizationStats.memoizationCacheSize || 0;
  const cacheLimit = optimizationStats.memoizationCacheLimit || 1;

  // Calculate cache utilization
  const cacheUtilization = (cacheSize / cacheLimit) * 100;

  // In real system, would track cache hits/misses
  // For prototype, estimate based on cache utilization
  // Optimal utilization is around 60-80%
  let efficiency = 100 - Math.abs(70 - cacheUtilization) * 2;

  // Add simulated hit rate factor
  const simulatedHitRate = 60 + (Math.random() * 30); // 60-90% range

  efficiency = (efficiency * 0.4) + (simulatedHitRate * 0.6);

  return Math.max(0, Math.min(100, Math.round(efficiency)));
}

function calculateAdaptiveEffectiveness(optimizationStats) {
  // In a real system, would compare performance before and after strategy adaptation
  // For prototype, return simulated value
  if (!optimizationStats.config?.adaptiveStrategy) {
    return 0; // Adaptive strategy not enabled
  }

  return Math.round(65 + (Math.random() * 25)); // 65-90 range
}
