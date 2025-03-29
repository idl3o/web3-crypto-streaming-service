/**
 * Response Timer Service
 * 
 * Provides management for response timers with support for infinite duration,
 * heartbeats, and automatic reconnection strategies for the Web3 Crypto Streaming platform.
 */

// Timer states
export const TIMER_STATE = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  EXPIRED: 'expired',
  INFINITE: 'infinite'
};

// Reconnection strategies
export const RECONNECT_STRATEGY = {
  NONE: 'none',           // No automatic reconnection
  LINEAR: 'linear',       // Linear backoff (constant delay between attempts)
  EXPONENTIAL: 'exp',     // Exponential backoff (doubling delay)
  FIBONACCI: 'fibonacci', // Fibonacci backoff sequence
  RANDOM: 'random'        // Random delay within range
};

// Service state
let initialized = false;
let serviceConfig = {
  defaultTimeout: 30000,                // 30 seconds
  heartbeatInterval: 15000,             // 15 seconds
  heartbeatEndpoint: '/api/heartbeat',  // Default endpoint for heartbeat
  maxReconnectAttempts: 5,              // Max reconnection attempts
  reconnectStrategy: RECONNECT_STRATEGY.EXPONENTIAL,
  initialReconnectDelay: 1000,          // Initial delay (1 second)
  maxReconnectDelay: 60000,             // Maximum delay (1 minute)
  infiniteWatchdog: 300000,             // 5 minute safety check for infinite timers
  globalTimeoutMargin: 2000             // Extra time before actual timeout
};

// Active timers
const activeTimers = new Map();

/**
 * Initialize the Response Timer Service
 * @param {Object} options Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initialize(options = {}) {
  if (initialized) {
    return true;
  }

  try {
    console.log('Initializing Response Timer Service...');
    
    // Apply configuration options
    if (options.config) {
      serviceConfig = {
        ...serviceConfig,
        ...options.config
      };
    }
    
    initialized = true;
    console.log('Response Timer Service initialized successfully');
    
    // Set up cleanup interval for stale timers
    setInterval(() => _cleanupStaleTimers(), 60000); // Every minute
    
    return true;
  } catch (error) {
    console.error('Failed to initialize Response Timer Service:', error);
    return false;
  }
}

/**
 * Clean up stale timers
 * @private
 */
function _cleanupStaleTimers() {
  const now = Date.now();
  
  for (const [timerId, timer] of activeTimers.entries()) {
    // Check for abandoned timers (ones that were created but never started)
    if (timer.state === TIMER_STATE.IDLE && (now - timer.createdAt > 300000)) {
      activeTimers.delete(timerId);
      continue;
    }
    
    // Check for expired timers that haven't been cleaned up
    if (timer.state === TIMER_STATE.EXPIRED && (now - timer.expiredAt > 300000)) {
      activeTimers.delete(timerId);
      continue;
    }
    
    // Check infinite timers for activity
    if (timer.state === TIMER_STATE.INFINITE) {
      // If an infinite timer hasn't had activity in watchdog period, log a warning
      if (timer.lastActivityAt && (now - timer.lastActivityAt > serviceConfig.infiniteWatchdog)) {
        console.warn(`Infinite timer ${timerId} has been idle for over ${serviceConfig.infiniteWatchdog}ms`);
        
        // If callback provided, notify about inactivity
        if (timer.onInactivity && typeof timer.onInactivity === 'function') {
          timer.onInactivity(timerId, now - timer.lastActivityAt);
        }
      }
    }
  }
}

/**
 * Create a new timer
 * @param {Object} options Timer options
 * @param {number|null} options.duration Duration in ms, null for infinite
 * @param {Function} [options.onExpire] Callback when timer expires
 * @param {Function} [options.onTick] Callback on timer tick (every second)
 * @param {Function} [options.onInactivity] Callback when infinite timer is inactive
 * @param {boolean} [options.autoStart=true] Whether to start timer immediately
 * @returns {string} Timer ID
 */
export function createTimer(options = {}) {
  if (!initialized) {
    initialize();
  }
  
  const {
    duration = serviceConfig.defaultTimeout,
    onExpire = null,
    onTick = null,
    onInactivity = null,
    autoStart = true
  } = options;
  
  const timerId = `timer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const isInfinite = duration === null || duration === Infinity || duration <= 0;
  
  const timer = {
    id: timerId,
    duration: isInfinite ? null : duration,
    startTime: null,
    endTime: null,
    remaining: isInfinite ? null : duration,
    state: TIMER_STATE.IDLE,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    tickInterval: null,
    timeoutId: null,
    expiredAt: null,
    onExpire,
    onTick,
    onInactivity,
    heartbeatTimer: null,
    reconnectAttempts: 0
  };
  
  activeTimers.set(timerId, timer);
  
  if (autoStart) {
    startTimer(timerId);
  }
  
  return timerId;
}

/**
 * Start a timer
 * @param {string} timerId Timer ID
 * @returns {boolean} Success status
 */
export function startTimer(timerId) {
  const timer = activeTimers.get(timerId);
  
  if (!timer) {
    console.warn(`Timer ${timerId} not found`);
    return false;
  }
  
  if (timer.state === TIMER_STATE.RUNNING) {
    return true; // Already running
  }
  
  timer.startTime = Date.now();
  timer.lastActivityAt = Date.now();
  
  if (timer.duration === null) {
    // Infinite timer
    timer.state = TIMER_STATE.INFINITE;
    
    // Set up tick interval if callback provided
    if (timer.onTick && typeof timer.onTick === 'function') {
      timer.tickInterval = setInterval(() => {
        timer.lastActivityAt = Date.now();
        timer.onTick(timerId, Date.now() - timer.startTime);
      }, 1000);
    }
  } else {
    // Regular timer
    timer.state = TIMER_STATE.RUNNING;
    timer.endTime = timer.startTime + timer.duration;
    timer.remaining = timer.duration;
    
    // Set up tick interval if callback provided
    if (timer.onTick && typeof timer.onTick === 'function') {
      timer.tickInterval = setInterval(() => {
        const now = Date.now();
        timer.remaining = Math.max(0, timer.endTime - now);
        timer.onTick(timerId, timer.duration - timer.remaining, timer.remaining);
        
        if (timer.remaining === 0) {
          clearInterval(timer.tickInterval);
        }
      }, 1000);
    }
    
    // Set timeout for expiration
    timer.timeoutId = setTimeout(() => {
      expireTimer(timerId);
    }, timer.duration + serviceConfig.globalTimeoutMargin);
  }
  
  activeTimers.set(timerId, timer);
  return true;
}

/**
 * Pause a timer
 * @param {string} timerId Timer ID
 * @returns {boolean} Success status
 */
export function pauseTimer(timerId) {
  const timer = activeTimers.get(timerId);
  
  if (!timer) {
    console.warn(`Timer ${timerId} not found`);
    return false;
  }
  
  if (timer.state !== TIMER_STATE.RUNNING) {
    return false; // Only running timers can be paused
  }
  
  // Clear intervals and timeouts
  if (timer.tickInterval) {
    clearInterval(timer.tickInterval);
    timer.tickInterval = null;
  }
  
  if (timer.timeoutId) {
    clearTimeout(timer.timeoutId);
    timer.timeoutId = null;
  }
  
  // Calculate remaining time
  const now = Date.now();
  timer.remaining = timer.endTime - now;
  timer.state = TIMER_STATE.PAUSED;
  
  activeTimers.set(timerId, timer);
  return true;
}

/**
 * Resume a paused timer
 * @param {string} timerId Timer ID
 * @returns {boolean} Success status
 */
export function resumeTimer(timerId) {
  const timer = activeTimers.get(timerId);
  
  if (!timer) {
    console.warn(`Timer ${timerId} not found`);
    return false;
  }
  
  if (timer.state !== TIMER_STATE.PAUSED) {
    return false; // Only paused timers can be resumed
  }
  
  // Update timing
  const now = Date.now();
  timer.startTime = now;
  timer.endTime = now + timer.remaining;
  timer.state = TIMER_STATE.RUNNING;
  
  // Set up tick interval if callback provided
  if (timer.onTick && typeof timer.onTick === 'function') {
    timer.tickInterval = setInterval(() => {
      const currentTime = Date.now();
      timer.remaining = Math.max(0, timer.endTime - currentTime);
      timer.onTick(timerId, timer.duration - timer.remaining, timer.remaining);
      
      if (timer.remaining === 0) {
        clearInterval(timer.tickInterval);
      }
    }, 1000);
  }
  
  // Set timeout for expiration
  timer.timeoutId = setTimeout(() => {
    expireTimer(timerId);
  }, timer.remaining + serviceConfig.globalTimeoutMargin);
  
  activeTimers.set(timerId, timer);
  return true;
}

/**
 * Reset a timer to its original duration
 * @param {string} timerId Timer ID
 * @param {boolean} [autoStart=true] Whether to automatically start the timer after reset
 * @returns {boolean} Success status
 */
export function resetTimer(timerId, autoStart = true) {
  const timer = activeTimers.get(timerId);
  
  if (!timer) {
    console.warn(`Timer ${timerId} not found`);
    return false;
  }
  
  // Clear any existing intervals or timeouts
  if (timer.tickInterval) {
    clearInterval(timer.tickInterval);
    timer.tickInterval = null;
  }
  
  if (timer.timeoutId) {
    clearTimeout(timer.timeoutId);
    timer.timeoutId = null;
  }
  
  // Reset timer state
  timer.state = TIMER_STATE.IDLE;
  timer.startTime = null;
  timer.endTime = null;
  timer.remaining = timer.duration;
  timer.expiredAt = null;
  
  activeTimers.set(timerId, timer);
  
  // Restart timer if requested
  if (autoStart) {
    startTimer(timerId);
  }
  
  return true;
}

/**
 * Expire a timer (internal or can be called manually)
 * @param {string} timerId Timer ID
 * @returns {boolean} Success status
 */
export function expireTimer(timerId) {
  const timer = activeTimers.get(timerId);
  
  if (!timer) {
    console.warn(`Timer ${timerId} not found`);
    return false;
  }
  
  if (timer.state === TIMER_STATE.EXPIRED) {
    return true; // Already expired
  }
  
  // Clear any intervals or timeouts
  if (timer.tickInterval) {
    clearInterval(timer.tickInterval);
    timer.tickInterval = null;
  }
  
  if (timer.timeoutId) {
    clearTimeout(timer.timeoutId);
    timer.timeoutId = null;
  }
  
  // Update timer state
  timer.state = TIMER_STATE.EXPIRED;
  timer.expiredAt = Date.now();
  timer.remaining = 0;
  
  activeTimers.set(timerId, timer);
  
  // Call expiration callback if provided
  if (timer.onExpire && typeof timer.onExpire === 'function') {
    timer.onExpire(timerId);
  }
  
  return true;
}

/**
 * Delete a timer
 * @param {string} timerId Timer ID
 * @returns {boolean} Success status
 */
export function deleteTimer(timerId) {
  const timer = activeTimers.get(timerId);
  
  if (!timer) {
    return false;
  }
  
  // Clean up any intervals or timeouts
  if (timer.tickInterval) {
    clearInterval(timer.tickInterval);
  }
  
  if (timer.timeoutId) {
    clearTimeout(timer.timeoutId);
  }
  
  if (timer.heartbeatTimer) {
    clearInterval(timer.heartbeatTimer);
  }
  
  activeTimers.delete(timerId);
  return true;
}

/**
 * Update a timer's activity timestamp
 * @param {string} timerId Timer ID
 * @returns {boolean} Success status
 */
export function updateActivity(timerId) {
  const timer = activeTimers.get(timerId);
  
  if (!timer) {
    console.warn(`Timer ${timerId} not found`);
    return false;
  }
  
  timer.lastActivityAt = Date.now();
  activeTimers.set(timerId, timer);
  return true;
}

/**
 * Get a timer's status
 * @param {string} timerId Timer ID
 * @returns {Object|null} Timer status or null if not found
 */
export function getTimerStatus(timerId) {
  const timer = activeTimers.get(timerId);
  
  if (!timer) {
    return null;
  }
  
  const now = Date.now();
  
  return {
    id: timer.id,
    state: timer.state,
    duration: timer.duration,
    isInfinite: timer.duration === null,
    elapsed: timer.startTime ? now - timer.startTime : 0,
    remaining: timer.state === TIMER_STATE.RUNNING ? Math.max(0, timer.endTime - now) : timer.remaining,
    lastActivity: timer.lastActivityAt ? now - timer.lastActivityAt : null,
    createdAt: timer.createdAt,
    expiredAt: timer.expiredAt
  };
}

/**
 * Set up automatic heartbeat to keep connection alive
 * @param {string} timerId Timer ID
 * @param {Object} options Heartbeat options
 * @returns {boolean} Success status
 */
export function setupHeartbeat(timerId, options = {}) {
  const timer = activeTimers.get(timerId);
  
  if (!timer) {
    console.warn(`Timer ${timerId} not found`);
    return false;
  }
  
  const {
    interval = serviceConfig.heartbeatInterval,
    endpoint = serviceConfig.heartbeatEndpoint,
    method = 'GET',
    payload = null,
    onSuccess = null,
    onError = null
  } = options;
  
  // Clear existing heartbeat if any
  if (timer.heartbeatTimer) {
    clearInterval(timer.heartbeatTimer);
  }
  
  // Set up new heartbeat
  timer.heartbeatTimer = setInterval(async () => {
    try {
      // Skip heartbeat if timer is expired or paused
      if (timer.state === TIMER_STATE.EXPIRED || timer.state === TIMER_STATE.PAUSED) {
        return;
      }
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: payload ? JSON.stringify(payload) : undefined
      });
      
      if (response.ok) {
        updateActivity(timerId);
        
        if (onSuccess && typeof onSuccess === 'function') {
          onSuccess(response);
        }
      } else {
        if (onError && typeof onError === 'function') {
          onError(response);
        }
      }
    } catch (error) {
      console.warn(`Heartbeat failed for timer ${timerId}:`, error);
      
      if (onError && typeof onError === 'function') {
        onError(error);
      }
    }
  }, interval);
  
  activeTimers.set(timerId, timer);
  return true;
}

/**
 * Set up automatic reconnection strategy
 * @param {string} timerId Timer ID
 * @param {Object} options Reconnection options
 * @returns {boolean} Success status
 */
export function setupReconnectionStrategy(timerId, options = {}) {
  const timer = activeTimers.get(timerId);
  
  if (!timer) {
    console.warn(`Timer ${timerId} not found`);
    return false;
  }
  
  const {
    strategy = serviceConfig.reconnectStrategy,
    maxAttempts = serviceConfig.maxReconnectAttempts,
    initialDelay = serviceConfig.initialReconnectDelay,
    maxDelay = serviceConfig.maxReconnectDelay,
    connect = null, // Function to call when attempting connection
    onSuccess = null, // Callback when connection succeeds
    onFailure = null  // Callback when connection fails
  } = options;
  
  if (!connect || typeof connect !== 'function') {
    console.error('Connect function is required for reconnection strategy');
    return false;
  }
  
  // Store reconnection config in timer
  timer.reconnect = {
    strategy,
    maxAttempts,
    initialDelay,
    maxDelay,
    connect,
    onSuccess,
    onFailure,
    attempts: 0,
    timeout: null
  };
  
  activeTimers.set(timerId, timer);
  return true;
}

/**
 * Attempt reconnection for a timer
 * @param {string} timerId Timer ID
 * @returns {Promise<boolean>} Success status
 */
export async function attemptReconnection(timerId) {
  const timer = activeTimers.get(timerId);
  
  if (!timer || !timer.reconnect) {
    console.warn(`Timer ${timerId} not found or no reconnection strategy configured`);
    return false;
  }
  
  // Clear any existing timeout
  if (timer.reconnect.timeout) {
    clearTimeout(timer.reconnect.timeout);
  }
  
  // Check if max attempts reached
  if (timer.reconnect.attempts >= timer.reconnect.maxAttempts) {
    console.warn(`Max reconnection attempts (${timer.reconnect.maxAttempts}) reached for timer ${timerId}`);
    
    if (timer.reconnect.onFailure && typeof timer.reconnect.onFailure === 'function') {
      timer.reconnect.onFailure('MAX_ATTEMPTS_REACHED');
    }
    
    return false;
  }
  
  // Increment attempt counter
  timer.reconnect.attempts += 1;
  
  try {
    // Attempt connection
    const result = await timer.reconnect.connect();
    
    // If successful
    updateActivity(timerId);
    
    if (timer.reconnect.onSuccess && typeof timer.reconnect.onSuccess === 'function') {
      timer.reconnect.onSuccess(result);
    }
    
    // Reset attempts counter on success
    timer.reconnect.attempts = 0;
    return true;
  } catch (error) {
    console.warn(`Reconnection attempt ${timer.reconnect.attempts} failed for timer ${timerId}:`, error);
    
    // Calculate next retry delay
    const delay = calculateBackoff(
      timer.reconnect.strategy,
      timer.reconnect.attempts,
      timer.reconnect.initialDelay,
      timer.reconnect.maxDelay
    );
    
    console.log(`Next reconnection attempt in ${delay}ms`);
    
    // Schedule next attempt
    timer.reconnect.timeout = setTimeout(() => {
      attemptReconnection(timerId);
    }, delay);
    
    if (timer.reconnect.onFailure && typeof timer.reconnect.onFailure === 'function') {
      timer.reconnect.onFailure(error);
    }
    
    return false;
  }
}

/**
 * Calculate backoff time based on strategy
 * @param {string} strategy Reconnection strategy
 * @param {number} attempt Current attempt number
 * @param {number} initialDelay Initial delay in ms
 * @param {number} maxDelay Maximum delay in ms
 * @returns {number} Delay in ms
 * @private
 */
function calculateBackoff(strategy, attempt, initialDelay, maxDelay) {
  let delay;
  
  switch (strategy) {
    case RECONNECT_STRATEGY.LINEAR:
      delay = initialDelay * attempt;
      break;
    
    case RECONNECT_STRATEGY.EXPONENTIAL:
      delay = initialDelay * Math.pow(2, attempt - 1);
      break;
    
    case RECONNECT_STRATEGY.FIBONACCI:
      delay = calculateFibonacciNumber(attempt + 1) * initialDelay;
      break;
    
    case RECONNECT_STRATEGY.RANDOM:
      const min = initialDelay;
      const max = Math.min(maxDelay, initialDelay * Math.pow(2, attempt));
      delay = Math.floor(Math.random() * (max - min + 1) + min);
      break;
    
    default:
      delay = initialDelay;
  }
  
  return Math.min(delay, maxDelay);
}

/**
 * Calculate the nth Fibonacci number
 * @param {number} n Position in Fibonacci sequence
 * @returns {number} Fibonacci number
 * @private
 */
function calculateFibonacciNumber(n) {
  if (n <= 1) return n;
  
  let a = 0;
  let b = 1;
  let result = 0;
  
  for (let i = 2; i <= n; i++) {
    result = a + b;
    a = b;
    b = result;
  }
  
  return result;
}

/**
 * Create an infinite response timer
 * @param {Object} options Timer options
 * @returns {string} Timer ID
 */
export function createInfiniteTimer(options = {}) {
  return createTimer({
    ...options,
    duration: null
  });
}

/**
 * Get all active timers
 * @returns {Array} Array of timer statuses
 */
export function getAllTimers() {
  const timers = [];
  
  for (const timerId of activeTimers.keys()) {
    const status = getTimerStatus(timerId);
    if (status) {
      timers.push(status);
    }
  }
  
  return timers;
}

/**
 * Get service configuration
 * @returns {Object} Current configuration
 */
export function getConfiguration() {
  return { ...serviceConfig };
}

/**
 * Update service configuration
 * @param {Object} newConfig New configuration
 * @returns {Object} Updated configuration
 */
export function updateConfiguration(newConfig = {}) {
  serviceConfig = {
    ...serviceConfig,
    ...newConfig
  };
  
  return { ...serviceConfig };
}

export default {
  initialize,
  createTimer,
  createInfiniteTimer,
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  expireTimer,
  deleteTimer,
  updateActivity,
  getTimerStatus,
  setupHeartbeat,
  setupReconnectionStrategy,
  attemptReconnection,
  getAllTimers,
  getConfiguration,
  updateConfiguration,
  TIMER_STATE,
  RECONNECT_STRATEGY
};
