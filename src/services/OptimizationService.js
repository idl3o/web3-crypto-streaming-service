/**
 * OptimizationService
 * 
 * Provides performance optimization for computation-intensive tasks
 * in the crypto streaming platform, focusing on execution over display.
 */

import { executeTask, EXECUTION_STRATEGIES, PRIORITY_LEVELS } from './ExecutionEngine';

// Default optimization configuration
const DEFAULT_CONFIG = {
  enableParallelization: true,
  useChunking: true,
  useDeferredForNonCritical: true,
  batchSize: 100,
  useMemoization: true,
  memoizationCacheSize: 1000,
  useWebWorkers: true,
  adaptiveStrategy: true
};

// Global optimization configuration
let optimizationConfig = { ...DEFAULT_CONFIG };

// Cache for memoization
const memoizationCache = new Map();
const MEMO_CACHE_MAX_SIZE = 1000;

// Load balancing metrics
let executionMetrics = {
  taskTimes: {},
  strategyPerformance: {},
  lastAdaptiveUpdate: Date.now()
};

/**
 * Initialize the optimization service
 * @param {Object} config - Optimization configuration
 * @returns {Object} Current configuration
 */
export function initOptimization(config = {}) {
  optimizationConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };

  // Reset metrics
  executionMetrics = {
    taskTimes: {},
    strategyPerformance: {},
    lastAdaptiveUpdate: Date.now()
  };

  return optimizationConfig;
}

/**
 * Optimize a computational task for best performance
 * @param {Function} computeFunction - The function to optimize
 * @param {Object} options - Optimization options
 * @returns {Promise} Promise resolving to the computation result
 */
export function optimizeComputation(computeFunction, options = {}) {
  const taskId = generateTaskId(computeFunction, options.params);

  // Check if result is memoized
  if (optimizationConfig.useMemoization && !options.bypassMemoization) {
    const cachedResult = memoizationCache.get(taskId);
    if (cachedResult) {
      return Promise.resolve(cachedResult);
    }
  }

  // Determine execution strategy
  const strategy = determineExecutionStrategy(options);

  // Set priority
  const priority = options.priority || PRIORITY_LEVELS.MEDIUM;

  // Create promise wrapper around execution
  return new Promise((resolve, reject) => {
    const startTime = performance.now();

    const taskOptions = {
      strategy,
      priority,
      params: options.params || {},
      chunks: options.chunks || determineOptimalChunks(options.dataSize),
      onComplete: (result) => {
        // Record performance metrics
        recordTaskPerformance(taskId, strategy, startTime);

        // Cache result if memoization is enabled
        if (optimizationConfig.useMemoization && !options.noCache) {
          memoizeResult(taskId, result);
        }

        resolve(result);
      },
      onError: (error) => {
        // If using workers failed, retry on main thread
        if (strategy === EXECUTION_STRATEGIES.WORKER) {
          console.warn('Worker execution failed, falling back to main thread', error);

          optimizeComputation(computeFunction, {
            ...options,
            forceStrategy: EXECUTION_STRATEGIES.IMMEDIATE
          }).then(resolve).catch(reject);
        } else {
          reject(error);
        }
      },
      onProgress: options.onProgress
    };

    // Submit for execution
    executeTask(computeFunction, taskOptions);
  });
}

/**
 * Batch process an array of items with optimal performance
 * @param {Array} items - Items to process
 * @param {Function} processorFn - Function to process each item
 * @param {Object} options - Batch processing options
 * @returns {Promise<Array>} Promise resolving to processed results
 */
export function batchProcess(items, processorFn, options = {}) {
  if (!items || !items.length) {
    return Promise.resolve([]);
  }

  const batchSize = options.batchSize || optimizationConfig.batchSize;

  // For small batches, process directly
  if (items.length <= batchSize) {
    return processBatch(items, processorFn, options);
  }

  // For larger datasets, split into batches
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // Create a progress tracker
  let completedItems = 0;
  const totalItems = items.length;

  // Process batches with progress tracking
  return new Promise((resolve, reject) => {
    const results = new Array(batches.length);
    let completed = 0;

    batches.forEach((batch, index) => {
      processBatch(batch, processorFn, {
        ...options,
        onProgress: (batchProgress) => {
          const batchContribution = (batch.length / totalItems);
          const overallProgress =
            ((completedItems / totalItems) +
              (batchProgress * batchContribution)) * 100;

          if (options.onProgress) {
            options.onProgress(overallProgress);
          }
        }
      }).then(batchResults => {
        results[index] = batchResults;
        completedItems += batch.length;

        completed++;
        if (completed === batches.length) {
          // Flatten results array
          resolve(results.flat());
        }

        if (options.onProgress) {
          options.onProgress((completedItems / totalItems) * 100);
        }
      }).catch(reject);
    });
  });
}

/**
 * Process a single batch of items
 * @param {Array} batch - Batch of items to process
 * @param {Function} processorFn - Function to process each item
 * @param {Object} options - Processing options
 * @returns {Promise<Array>} Processed results
 */
function processBatch(batch, processorFn, options = {}) {
  const strategy = determineExecutionStrategy({
    ...options,
    dataSize: batch.length
  });

  // For chunked execution, we'll handle the batches differently
  if (strategy === EXECUTION_STRATEGIES.CHUNKED) {
    return optimizeComputation(
      (params) => {
        const { items, processor, chunkIndex, totalChunks } = params;
        const chunkSize = Math.ceil(items.length / totalChunks);
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, items.length);
        const chunkItems = items.slice(start, end);

        return chunkItems.map((item, index) =>
          processor(item, start + index));
      },
      {
        params: {
          items: batch,
          processor: processorFn
        },
        dataSize: batch.length,
        onProgress: options.onProgress,
        chunks: options.chunks || determineOptimalChunks(batch.length)
      }
    );
  }

  // For non-chunked strategies
  return optimizeComputation(
    (params) => {
      const { items, processor } = params;
      return items.map((item, index) => processor(item, index));
    },
    {
      params: {
        items: batch,
        processor: processorFn
      },
      forceStrategy: strategy,
      dataSize: batch.length,
      onProgress: options.onProgress
    }
  );
}

/**
 * Generate a unique ID for a task based on function and params
 * @param {Function} fn - The function
 * @param {Object} params - The parameters
 * @returns {string} Task ID
 */
function generateTaskId(fn, params) {
  const fnStr = fn.toString();
  const paramsStr = params ? JSON.stringify(params) : '';

  // Simple hash function
  let hash = 0;
  const str = fnStr + paramsStr;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }

  return `task-${Math.abs(hash)}`;
}

/**
 * Determine the optimal execution strategy for a task
 * @param {Object} options - Task options
 * @returns {string} Execution strategy
 */
function determineExecutionStrategy(options) {
  // Honor explicit strategy if provided
  if (options.forceStrategy) {
    return options.forceStrategy;
  }

  const dataSize = options.dataSize || 0;

  // Use adaptive strategy if enabled
  if (optimizationConfig.adaptiveStrategy) {
    const adaptiveStrategy = getAdaptiveStrategy(options);
    if (adaptiveStrategy) {
      return adaptiveStrategy;
    }
  }

  // For trivial computations, use immediate execution
  if (dataSize < 10) {
    return EXECUTION_STRATEGIES.IMMEDIATE;
  }

  // For non-urgent background tasks
  if (options.priority === PRIORITY_LEVELS.BACKGROUND && optimizationConfig.useDeferredForNonCritical) {
    return EXECUTION_STRATEGIES.DEFERRED;
  }

  // For larger datasets, use workers if available
  if (dataSize > 100 && optimizationConfig.useWebWorkers) {
    return EXECUTION_STRATEGIES.WORKER;
  }

  // For medium-sized tasks that can be parallelized
  if (dataSize > 50 && optimizationConfig.useChunking) {
    return EXECUTION_STRATEGIES.CHUNKED;
  }

  // Default to immediate execution
  return EXECUTION_STRATEGIES.IMMEDIATE;
}

/**
 * Get adaptive execution strategy based on past performance
 * @param {Object} options - Task options
 * @returns {string|null} Recommended strategy or null
 */
function getAdaptiveStrategy(options) {
  // Check if we have enough metrics to make a decision
  const strategies = Object.keys(executionMetrics.strategyPerformance);

  if (strategies.length < 2) {
    return null;
  }

  // Find the best performing strategy for similar tasks
  let bestStrategy = null;
  let bestPerformance = Infinity;

  for (const [strategy, metrics] of Object.entries(executionMetrics.strategyPerformance)) {
    // Skip strategies that aren't suitable for this task
    if (strategy === EXECUTION_STRATEGIES.WORKER && !optimizationConfig.useWebWorkers) {
      continue;
    }

    if (strategy === EXECUTION_STRATEGIES.CHUNKED && !optimizationConfig.useChunking) {
      continue;
    }

    // Find the closest data size bracket
    const sizeKeys = Object.keys(metrics)
      .map(Number)
      .sort((a, b) => a - b);

    if (sizeKeys.length === 0) continue;

    let closestSize = sizeKeys[0];
    for (const size of sizeKeys) {
      if (Math.abs(size - options.dataSize) < Math.abs(closestSize - options.dataSize)) {
        closestSize = size;
      }
    }

    // Check if this strategy performs better
    const performanceMetric = metrics[closestSize];
    if (performanceMetric && performanceMetric.avgTime < bestPerformance) {
      bestPerformance = performanceMetric.avgTime;
      bestStrategy = strategy;
    }
  }

  return bestStrategy;
}

/**
 * Record task performance metrics
 * @param {string} taskId - ID of the task
 * @param {string} strategy - Execution strategy used
 * @param {number} startTime - Start time in ms
 */
function recordTaskPerformance(taskId, strategy, startTime) {
  const executionTime = performance.now() - startTime;

  // Record execution time for this task
  executionMetrics.taskTimes[taskId] = executionTime;

  // Update strategy performance metrics
  if (!executionMetrics.strategyPerformance[strategy]) {
    executionMetrics.strategyPerformance[strategy] = {};
  }

  // Get data size bracket (rounded to nearest 10)
  const dataSize = Math.round(10) * 10;

  if (!executionMetrics.strategyPerformance[strategy][dataSize]) {
    executionMetrics.strategyPerformance[strategy][dataSize] = {
      count: 0,
      totalTime: 0,
      avgTime: 0
    };
  }

  const metrics = executionMetrics.strategyPerformance[strategy][dataSize];
  metrics.count += 1;
  metrics.totalTime += executionTime;
  metrics.avgTime = metrics.totalTime / metrics.count;

  // Periodically refresh adaptive strategies
  const now = Date.now();
  if (now - executionMetrics.lastAdaptiveUpdate > 30000) { // 30 seconds
    executionMetrics.lastAdaptiveUpdate = now;
    optimizeStrategies();
  }
}

/**
 * Determine the optimal number of chunks for parallel processing
 * @param {number} dataSize - Size of the dataset
 * @returns {number} Optimal number of chunks
 */
function determineOptimalChunks(dataSize) {
  if (!dataSize) return 1;

  // Use hardware concurrency as a guide
  const concurrency = navigator.hardwareConcurrency || 4;

  // For very small datasets, don't bother with many chunks
  if (dataSize < 50) {
    return Math.min(2, concurrency);
  }

  // For medium datasets
  if (dataSize < 500) {
    return Math.min(4, concurrency);
  }

  // For large datasets
  return concurrency;
}

/**
 * Cache a computation result
 * @param {string} taskId - The task ID
 * @param {*} result - The result to cache
 */
function memoizeResult(taskId, result) {
  // Enforce cache size limit
  if (memoizationCache.size >= MEMO_CACHE_MAX_SIZE) {
    // Remove oldest entry
    const oldestKey = memoizationCache.keys().next().value;
    memoizationCache.delete(oldestKey);
  }

  memoizationCache.set(taskId, result);
}

/**
 * Clear the memoization cache
 * @param {string} [pattern] - Optional pattern to match task IDs
 */
export function clearMemoizationCache(pattern = null) {
  if (!pattern) {
    memoizationCache.clear();
    return;
  }

  // Delete entries matching the pattern
  for (const key of memoizationCache.keys()) {
    if (key.includes(pattern)) {
      memoizationCache.delete(key);
    }
  }
}

/**
 * Optimize execution strategies based on performance data
 */
function optimizeStrategies() {
  // This would implement more sophisticated adaptive optimization
  // based on the collected performance metrics
  console.log('Optimizing execution strategies based on performance data');

  // We could adjust optimal chunk sizes, batch sizes, etc.
}

/**
 * Get optimization statistics
 * @returns {Object} Stats about optimization system
 */
export function getOptimizationStats() {
  return {
    config: optimizationConfig,
    memoizationCacheSize: memoizationCache.size,
    memoizationCacheLimit: MEMO_CACHE_MAX_SIZE,
    strategyPerformance: executionMetrics.strategyPerformance,
    lastOptimizationUpdate: new Date(executionMetrics.lastAdaptiveUpdate).toISOString()
  };
}
