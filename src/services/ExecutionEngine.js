/**
 * ExecutionEngine Service
 * 
 * Provides high-performance execution capabilities for computation-heavy tasks,
 * optimizing resource utilization and prioritizing execution efficiency over display rendering.
 */

// Available execution strategies
export const EXECUTION_STRATEGIES = {
  IMMEDIATE: 'immediate',     // Execute immediately in main thread
  DEFERRED: 'deferred',       // Defer execution using requestIdleCallback
  WORKER: 'worker',           // Execute in worker thread
  CHUNKED: 'chunked',         // Break into smaller chunks for execution
  WASM: 'wasm'                // Use WebAssembly for performance-critical operations
};

// Execution priority levels
export const PRIORITY_LEVELS = {
  CRITICAL: 0,  // Must execute immediately
  HIGH: 1,      // Execute as soon as possible
  MEDIUM: 2,    // Standard priority
  LOW: 3,       // Execute when convenient
  BACKGROUND: 4 // Execute only during idle periods
};

// Task status tracking
const taskRegistry = new Map();
let nextTaskId = 1;

// Worker pool management
const workerPool = [];
const MAX_WORKERS = navigator.hardwareConcurrency || 4;
const availableWorkers = [];
const workerTasks = new Map();

/**
 * Initialize the execution engine
 * @param {Object} options - Configuration options
 */
export function initExecutionEngine(options = {}) {
  // Initialize worker pool if supported
  if (window.Worker) {
    const workerCount = options.maxWorkers || MAX_WORKERS;

    for (let i = 0; i < workerCount; i++) {
      createWorker(i);
    }

    console.log(`Execution Engine initialized with ${workerPool.length} workers`);
  } else {
    console.warn('Web Workers not supported. Falling back to main thread execution');
  }

  // Initialize idle callback scheduling if supported
  if (!window.requestIdleCallback) {
    window.requestIdleCallback = function (callback) {
      return setTimeout(() => {
        const start = Date.now();
        callback({
          didTimeout: false,
          timeRemaining: function () {
            return Math.max(0, 50 - (Date.now() - start));
          }
        });
      }, 1);
    };

    window.cancelIdleCallback = function (id) {
      clearTimeout(id);
    };
  }

  return {
    workerCount: workerPool.length,
    strategies: Object.keys(EXECUTION_STRATEGIES),
    status: 'initialized'
  };
}

/**
 * Create a worker for the pool
 * @param {number} id - Worker ID
 */
function createWorker(id) {
  try {
    // Create a blob URL for the worker script
    const workerScript = `
      self.onmessage = function(e) {
        const { taskId, functionBody, params } = e.data;
        
        try {
          // Create function from string representation
          const taskFunction = new Function('params', functionBody);
          
          // Execute the function with the provided parameters
          const result = taskFunction(params);
          
          // Return the result
          self.postMessage({ taskId, result, error: null });
        } catch (error) {
          self.postMessage({ 
            taskId, 
            result: null, 
            error: { message: error.message, stack: error.stack } 
          });
        }
      };
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);

    // Create the worker
    const worker = new Worker(workerUrl);

    worker.onmessage = (e) => handleWorkerMessage(worker, e);
    worker.onerror = (e) => handleWorkerError(worker, e);

    // Add to pool and available list
    worker._id = id;
    workerPool.push(worker);
    availableWorkers.push(worker);

    // Clean up the blob URL
    URL.revokeObjectURL(workerUrl);
  } catch (error) {
    console.error('Failed to create worker:', error);
  }
}

/**
 * Handle messages from workers
 * @param {Worker} worker - The worker that sent the message
 * @param {MessageEvent} event - The message event
 */
function handleWorkerMessage(worker, event) {
  const { taskId, result, error } = event.data;

  // Retrieve task details
  const taskDetails = taskRegistry.get(taskId);

  if (taskDetails) {
    // Mark the worker as available
    availableWorkers.push(worker);
    workerTasks.delete(worker._id);

    // Update task status
    taskDetails.status = error ? 'failed' : 'completed';
    taskDetails.completedAt = Date.now();

    // Call the appropriate callback
    if (error) {
      if (taskDetails.onError) {
        taskDetails.onError(error);
      }
    } else {
      if (taskDetails.onComplete) {
        taskDetails.onComplete(result);
      }
    }

    // Clean up if needed
    if (taskDetails.autoCleanup) {
      taskRegistry.delete(taskId);
    }

    // Process next task in queue
    processNextQueuedTask();
  }
}

/**
 * Handle worker errors
 * @param {Worker} worker - The worker that encountered an error
 * @param {ErrorEvent} error - The error event
 */
function handleWorkerError(worker, error) {
  console.error(`Worker ${worker._id} error:`, error);

  // Find the associated task
  let failedTaskId = null;

  for (const [taskId, task] of taskRegistry.entries()) {
    if (task.workerId === worker._id && task.status === 'running') {
      failedTaskId = taskId;
      break;
    }
  }

  if (failedTaskId) {
    const task = taskRegistry.get(failedTaskId);
    task.status = 'failed';
    task.error = {
      message: error.message || 'Unknown worker error',
      lineno: error.lineno,
      filename: error.filename
    };

    if (task.onError) {
      task.onError(task.error);
    }

    // Clean up
    if (task.autoCleanup) {
      taskRegistry.delete(failedTaskId);
    }
  }

  // Recreate the worker
  const workerId = worker._id;
  terminateWorker(worker);
  createWorker(workerId);
}

/**
 * Terminate a worker
 * @param {Worker} worker - The worker to terminate
 */
function terminateWorker(worker) {
  // Remove from pools
  const poolIndex = workerPool.findIndex(w => w._id === worker._id);
  if (poolIndex !== -1) {
    workerPool.splice(poolIndex, 1);
  }

  const availableIndex = availableWorkers.findIndex(w => w._id === worker._id);
  if (availableIndex !== -1) {
    availableWorkers.splice(availableIndex, 1);
  }

  // Terminate the worker
  worker.terminate();
}

/**
 * Submit a task for execution
 * @param {Function} taskFunction - The function to execute
 * @param {Object} options - Execution options
 * @returns {string} Task ID
 */
export function executeTask(taskFunction, options = {}) {
  // Generate task ID
  const taskId = `task-${nextTaskId++}`;

  // Set defaults
  const taskOptions = {
    strategy: options.strategy || EXECUTION_STRATEGIES.IMMEDIATE,
    priority: options.priority !== undefined ? options.priority : PRIORITY_LEVELS.MEDIUM,
    params: options.params || {},
    timeout: options.timeout,
    autoCleanup: options.autoCleanup !== false,
    onComplete: options.onComplete,
    onError: options.onError,
    onProgress: options.onProgress,
    chunks: options.chunks || 1
  };

  // Register the task
  const task = {
    id: taskId,
    function: taskFunction,
    options: taskOptions,
    status: 'pending',
    createdAt: Date.now(),
    ...taskOptions
  };

  taskRegistry.set(taskId, task);

  // Execute based on strategy
  switch (taskOptions.strategy) {
    case EXECUTION_STRATEGIES.WORKER:
      executeInWorker(taskId);
      break;

    case EXECUTION_STRATEGIES.DEFERRED:
      executeDeferred(taskId);
      break;

    case EXECUTION_STRATEGIES.CHUNKED:
      executeChunked(taskId);
      break;

    case EXECUTION_STRATEGIES.WASM:
      executeWithWasm(taskId);
      break;

    case EXECUTION_STRATEGIES.IMMEDIATE:
    default:
      executeImmediate(taskId);
      break;
  }

  return taskId;
}

/**
 * Execute a task immediately in the main thread
 * @param {string} taskId - The ID of the task to execute
 */
function executeImmediate(taskId) {
  const task = taskRegistry.get(taskId);

  if (!task) return;

  task.status = 'running';
  task.startedAt = Date.now();

  try {
    const result = task.function(task.params);

    task.status = 'completed';
    task.completedAt = Date.now();

    if (task.onComplete) {
      task.onComplete(result);
    }

    if (task.autoCleanup) {
      taskRegistry.delete(taskId);
    }
  } catch (error) {
    task.status = 'failed';
    task.error = error;

    if (task.onError) {
      task.onError(error);
    }

    if (task.autoCleanup) {
      taskRegistry.delete(taskId);
    }
  }
}

/**
 * Execute a task in a worker thread
 * @param {string} taskId - The ID of the task to execute
 */
function executeInWorker(taskId) {
  const task = taskRegistry.get(taskId);

  if (!task) return;

  // Check if we have available workers
  if (availableWorkers.length > 0) {
    const worker = availableWorkers.pop();

    task.status = 'running';
    task.startedAt = Date.now();
    task.workerId = worker._id;

    // Store association between worker and task
    workerTasks.set(worker._id, taskId);

    // Convert function to string representation for passing to worker
    const functionBody = task.function.toString();
    const functionBodyStr = functionBody.substring(
      functionBody.indexOf('{') + 1,
      functionBody.lastIndexOf('}')
    );

    // Submit to worker
    worker.postMessage({
      taskId,
      functionBody: functionBodyStr,
      params: task.params
    });
  } else {
    // Queue for later execution
    task.status = 'queued';
    task.queuedAt = Date.now();
  }
}

/**
 * Process the next queued task
 */
function processNextQueuedTask() {
  // Find the highest priority queued task
  let highestPriorityTask = null;
  let highestPriorityTaskId = null;

  for (const [taskId, task] of taskRegistry.entries()) {
    if (task.status === 'queued' &&
      (!highestPriorityTask || task.priority < highestPriorityTask.priority)) {
      highestPriorityTask = task;
      highestPriorityTaskId = taskId;
    }
  }

  if (highestPriorityTaskId && availableWorkers.length > 0) {
    executeInWorker(highestPriorityTaskId);
  }
}

/**
 * Execute a task during idle time
 * @param {string} taskId - The ID of the task to execute
 */
function executeDeferred(taskId) {
  const task = taskRegistry.get(taskId);

  if (!task) return;

  task.status = 'scheduled';

  task.scheduledId = window.requestIdleCallback((deadline) => {
    if (!taskRegistry.has(taskId)) return; // Task was canceled

    task.status = 'running';
    task.startedAt = Date.now();

    try {
      const result = task.function(task.params);

      task.status = 'completed';
      task.completedAt = Date.now();

      if (task.onComplete) {
        task.onComplete(result);
      }

      if (task.autoCleanup) {
        taskRegistry.delete(taskId);
      }
    } catch (error) {
      task.status = 'failed';
      task.error = error;

      if (task.onError) {
        task.onError(error);
      }

      if (task.autoCleanup) {
        taskRegistry.delete(taskId);
      }
    }
  }, { timeout: task.timeout });
}

/**
 * Break a task into smaller chunks for execution
 * @param {string} taskId - The ID of the task to execute
 */
function executeChunked(taskId) {
  const task = taskRegistry.get(taskId);

  if (!task) return;

  const chunks = task.chunks || 4;
  const chunkResults = new Array(chunks);
  let completedChunks = 0;

  task.status = 'chunked';
  task.progress = 0;

  // Create a function for each chunk
  for (let i = 0; i < chunks; i++) {
    const chunkParams = {
      ...task.params,
      chunkIndex: i,
      totalChunks: chunks
    };

    executeTask(
      task.function,
      {
        strategy: EXECUTION_STRATEGIES.IMMEDIATE,
        priority: task.priority,
        params: chunkParams,
        onComplete: (result) => {
          chunkResults[i] = result;
          completedChunks++;

          // Update progress
          task.progress = (completedChunks / chunks) * 100;

          if (task.onProgress) {
            task.onProgress(task.progress, i, chunks);
          }

          // Check if all chunks are complete
          if (completedChunks === chunks) {
            task.status = 'completed';
            task.completedAt = Date.now();

            if (task.onComplete) {
              task.onComplete(chunkResults);
            }

            if (task.autoCleanup) {
              taskRegistry.delete(taskId);
            }
          }
        },
        onError: (error) => {
          task.status = 'failed';
          task.error = error;

          if (task.onError) {
            task.onError(error);
          }

          if (task.autoCleanup) {
            taskRegistry.delete(taskId);
          }
        }
      }
    );
  }
}

/**
 * Execute with WebAssembly for performance-critical code
 * @param {string} taskId - The ID of the task to execute
 */
function executeWithWasm(taskId) {
  const task = taskRegistry.get(taskId);

  if (!task) return;

  // Check if the task has a WASM module specified
  if (!task.params.wasmModule) {
    executeImmediate(taskId); // Fall back to immediate execution
    return;
  }

  task.status = 'loading_wasm';

  // In a real implementation, you would load and instantiate the WASM module here
  // For this example, we'll simulate the behavior
  setTimeout(() => {
    task.status = 'running';
    task.startedAt = Date.now();

    try {
      // Simulate WASM execution by calling the JS function
      const result = task.function(task.params);

      task.status = 'completed';
      task.completedAt = Date.now();

      if (task.onComplete) {
        task.onComplete(result);
      }

      if (task.autoCleanup) {
        taskRegistry.delete(taskId);
      }
    } catch (error) {
      task.status = 'failed';
      task.error = error;

      if (task.onError) {
        task.onError(error);
      }

      if (task.autoCleanup) {
        taskRegistry.delete(taskId);
      }
    }
  }, 50); // Simulate module loading time
}

/**
 * Cancel a task
 * @param {string} taskId - The ID of the task to cancel
 * @returns {boolean} Whether the task was successfully canceled
 */
export function cancelTask(taskId) {
  const task = taskRegistry.get(taskId);

  if (!task) return false;

  switch (task.status) {
    case 'pending':
    case 'queued':
      taskRegistry.delete(taskId);
      return true;

    case 'scheduled':
      window.cancelIdleCallback(task.scheduledId);
      taskRegistry.delete(taskId);
      return true;

    case 'running':
      if (task.strategy === EXECUTION_STRATEGIES.WORKER && task.workerId !== undefined) {
        const worker = workerPool.find(w => w._id === task.workerId);
        if (worker) {
          // Note: We can't actually cancel an executing worker,
          // but we can ignore its response and mark as canceled
          task.status = 'canceled';
          return true;
        }
      }
      return false;

    default:
      return false;
  }
}

/**
 * Get the status of a task
 * @param {string} taskId - The ID of the task
 * @returns {Object|null} Task status information
 */
export function getTaskStatus(taskId) {
  const task = taskRegistry.get(taskId);

  if (!task) return null;

  return {
    id: task.id,
    status: task.status,
    progress: task.progress || 0,
    strategy: task.strategy,
    priority: task.priority,
    createdAt: task.createdAt,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    error: task.error,
    duration: task.completedAt ?
      (task.completedAt - task.startedAt) :
      (task.startedAt ? (Date.now() - task.startedAt) : 0)
  };
}

/**
 * Get execution engine stats
 * @returns {Object} Statistics about the execution engine
 */
export function getExecutionStats() {
  // Count tasks by status
  const tasksByStatus = {};

  for (const task of taskRegistry.values()) {
    tasksByStatus[task.status] = (tasksByStatus[task.status] || 0) + 1;
  }

  // Calculate workers usage
  const workersActive = workerPool.length - availableWorkers.length;
  const workerUtilization = workerPool.length > 0 ?
    (workersActive / workerPool.length) * 100 : 0;

  return {
    totalTasks: taskRegistry.size,
    tasksByStatus,
    workersTotal: workerPool.length,
    workersActive,
    workersAvailable: availableWorkers.length,
    workerUtilization: workerUtilization.toFixed(1) + '%',
  };
}

/**
 * Cleanup and shutdown the execution engine
 */
export function shutdownExecutionEngine() {
  // Cancel all scheduled tasks
  for (const taskId of taskRegistry.keys()) {
    cancelTask(taskId);
  }

  // Terminate all workers
  for (const worker of workerPool) {
    worker.terminate();
  }

  // Clear arrays
  workerPool.length = 0;
  availableWorkers.length = 0;
  workerTasks.clear();
  taskRegistry.clear();

  return { status: 'shutdown' };
}
