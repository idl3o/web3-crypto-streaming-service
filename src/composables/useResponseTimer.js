import { ref, onUnmounted, onMounted } from 'vue';
import * as ResponseTimerService from '@/services/ResponseTimerService';

/**
 * Composable for using response timers in components
 * @param {Object} options Timer options
 * @returns {Object} Timer methods and state
 */
export default function useResponseTimer(options = {}) {
  // Initialize default options
  const {
    autoInitialize = true,
    autoStart = false,
    duration = null,  // null for infinite timer
    onTick = null,
    onExpire = null,
    onInactivity = null,
    autoCleanup = true,
    heartbeat = false,
    heartbeatOptions = {}
  } = options;
  
  // Component state
  const timerId = ref(null);
  const status = ref(null);
  const isRunning = ref(false);
  const isInfinite = ref(duration === null);
  const isPaused = ref(false);
  const isExpired = ref(false);
  const elapsedTime = ref(0);
  const remainingTime = ref(duration);
  const lastActivityTime = ref(0);
  const serviceInitialized = ref(false);
  
  // Initialize service if requested
  onMounted(async () => {
    if (autoInitialize) {
      serviceInitialized.value = await ResponseTimerService.initialize();
      
      // Create and possibly start timer
      if (autoStart) {
        createAndStartTimer();
      }
    }
  });
  
  // Cleanup on unmount
  onUnmounted(() => {
    if (autoCleanup && timerId.value) {
      ResponseTimerService.deleteTimer(timerId.value);
    }
  });
  
  // Create and start a timer
  const createAndStartTimer = () => {
    if (timerId.value) {
      // If timer already exists, reset and restart it
      ResponseTimerService.resetTimer(timerId.value, true);
      return timerId.value;
    }
    
    const id = ResponseTimerService.createTimer({
      duration,
      onExpire: handleExpire,
      onTick: handleTick,
      onInactivity: handleInactivity,
      autoStart: true
    });
    
    timerId.value = id;
    isRunning.value = true;
    isPaused.value = false;
    isExpired.value = false;
    
    // Set up heartbeat if requested
    if (heartbeat && id) {
      ResponseTimerService.setupHeartbeat(id, heartbeatOptions);
    }
    
    refreshStatus();
    return id;
  };
  
  // Start the timer if it exists
  const startTimer = () => {
    if (!timerId.value) {
      return createAndStartTimer();
    }
    
    const success = ResponseTimerService.startTimer(timerId.value);
    
    if (success) {
      isRunning.value = true;
      isPaused.value = false;
    }
    
    refreshStatus();
    return success;
  };
  
  // Pause the timer
  const pauseTimer = () => {
    if (!timerId.value) return false;
    
    const success = ResponseTimerService.pauseTimer(timerId.value);
    
    if (success) {
      isRunning.value = false;
      isPaused.value = true;
    }
    
    refreshStatus();
    return success;
  };
  
  // Resume the timer
  const resumeTimer = () => {
    if (!timerId.value) return false;
    
    const success = ResponseTimerService.resumeTimer(timerId.value);
    
    if (success) {
      isRunning.value = true;
      isPaused.value = false;
    }
    
    refreshStatus();
    return success;
  };
  
  // Reset the timer
  const resetTimer = (autoStart = true) => {
    if (!timerId.value) return false;
    
    const success = ResponseTimerService.resetTimer(timerId.value, autoStart);
    
    if (success) {
      isRunning.value = autoStart;
      isPaused.value = !autoStart;
      isExpired.value = false;
      elapsedTime.value = 0;
      remainingTime.value = duration;
    }
    
    refreshStatus();
    return success;
  };
  
  // Record activity for infinite timers
  const recordActivity = () => {
    if (!timerId.value) return false;
    return ResponseTimerService.updateActivity(timerId.value);
  };
  
  // Delete the timer
  const deleteTimer = () => {
    if (!timerId.value) return false;
    
    const success = ResponseTimerService.deleteTimer(timerId.value);
    
    if (success) {
      timerId.value = null;
      status.value = null;
      isRunning.value = false;
      isPaused.value = false;
      isExpired.value = false;
    }
    
    return success;
  };
  
  // Create an infinite response timer
  const createInfiniteTimer = () => {
    if (timerId.value) {
      ResponseTimerService.deleteTimer(timerId.value);
    }
    
    const id = ResponseTimerService.createInfiniteTimer({
      onTick: handleTick,
      onInactivity: handleInactivity,
      autoStart: true
    });
    
    timerId.value = id;
    isRunning.value = true;
    isPaused.value = false;
    isExpired.value = false;
    isInfinite.value = true;
    
    // Set up heartbeat if requested
    if (heartbeat && id) {
      ResponseTimerService.setupHeartbeat(id, heartbeatOptions);
    }
    
    refreshStatus();
    return id;
  };
  
  // Set up automatic reconnection
  const setupReconnection = (options) => {
    if (!timerId.value) return false;
    return ResponseTimerService.setupReconnectionStrategy(timerId.value, options);
  };
  
  // Handle timer tick
  const handleTick = (id, elapsed, remaining) => {
    elapsedTime.value = elapsed;
    
    if (remaining !== undefined) {
      remainingTime.value = remaining;
    }
    
    if (onTick && typeof onTick === 'function') {
      onTick(elapsed, remaining);
    }
    
    refreshStatus();
  };
  
  // Handle timer expiration
  const handleExpire = (id) => {
    isRunning.value = false;
    isExpired.value = true;
    remainingTime.value = 0;
    
    if (onExpire && typeof onExpire === 'function') {
      onExpire();
    }
    
    refreshStatus();
  };
  
  // Handle inactivity for infinite timers
  const handleInactivity = (id, inactiveTime) => {
    lastActivityTime.value = inactiveTime;
    
    if (onInactivity && typeof onInactivity === 'function') {
      onInactivity(inactiveTime);
    }
    
    refreshStatus();
  };
  
  // Refresh timer status
  const refreshStatus = () => {
    if (!timerId.value) {
      status.value = null;
      return;
    }
    
    status.value = ResponseTimerService.getTimerStatus(timerId.value);
    
    if (status.value) {
      isRunning.value = status.value.state === ResponseTimerService.TIMER_STATE.RUNNING || 
                        status.value.state === ResponseTimerService.TIMER_STATE.INFINITE;
      isPaused.value = status.value.state === ResponseTimerService.TIMER_STATE.PAUSED;
      isExpired.value = status.value.state === ResponseTimerService.TIMER_STATE.EXPIRED;
      isInfinite.value = status.value.isInfinite;
      elapsedTime.value = status.value.elapsed;
      
      if (!isInfinite.value) {
        remainingTime.value = status.value.remaining;
      }
      
      if (status.value.lastActivity) {
        lastActivityTime.value = status.value.lastActivity;
      }
    }
  };
  
  // Get formatted time
  const formatTime = (milliseconds) => {
    if (milliseconds === null || milliseconds === undefined) {
      return '--:--:--';
    }
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };
  
  return {
    timerId,
    status,
    isRunning,
    isPaused,
    isExpired,
    isInfinite,
    elapsedTime,
    remainingTime,
    lastActivityTime,
    serviceInitialized,
    
    // Actions
    createAndStartTimer,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    recordActivity,
    deleteTimer,
    createInfiniteTimer,
    setupReconnection,
    refreshStatus,
    
    // Utilities
    formatTime,
    
    // Constants
    TIMER_STATE: ResponseTimerService.TIMER_STATE,
    RECONNECT_STRATEGY: ResponseTimerService.RECONNECT_STRATEGY
  };
}
