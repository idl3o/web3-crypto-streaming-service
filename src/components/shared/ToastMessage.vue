<template>
  <div class="toast-container" aria-live="polite" aria-atomic="true">
    <TransitionGroup name="toast">
      <div 
        v-for="(toast, index) in toasts" 
        :key="toast.id"
        class="toast-message" 
        :class="[theme, toast.type]" 
        role="alert"
        :style="{ bottom: `${20 + (index * 60)}px` }"
      >
        <div class="toast-icon" v-if="toast.type">
          <i :class="getIconClass(toast.type)"></i>
        </div>
        <div class="toast-content">{{ toast.message }}</div>
        <button 
          v-if="toast.closable" 
          @click="dismiss(toast.id)" 
          class="toast-close"
          aria-label="Close"
        >
          <i class="fas fa-times"></i>
        </button>
        <div 
          v-if="toast.progress" 
          class="toast-progress" 
          :style="{ width: `${toast.progress}%` }"
        ></div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref, inject, onBeforeUnmount } from 'vue';

const props = defineProps({
  theme: {
    type: String,
    default: ''
  },
  maxToasts: {
    type: Number,
    default: 3
  }
});

const themeFromApp = inject('currentTheme', '');
const theme = ref(props.theme || themeFromApp);
const toasts = ref([]);
const intervals = new Map();

// Get appropriate icon based on toast type
function getIconClass(type) {
  switch (type) {
    case 'success':
      return 'fas fa-check-circle';
    case 'error':
      return 'fas fa-exclamation-circle';
    case 'warning':
      return 'fas fa-exclamation-triangle';
    case 'info':
    default:
      return 'fas fa-info-circle';
  }
}

// Show a toast with options
function show(message, options = {}) {
  // Default options
  const defaults = {
    type: '', // '', 'success', 'error', 'warning', 'info'
    duration: 3000,
    closable: true,
    withProgress: true
  };

  const settings = { ...defaults, ...options };
  
  // Generate unique ID
  const id = Date.now();
  
  // Create new toast
  const toast = {
    id,
    message,
    type: settings.type,
    closable: settings.closable,
    progress: settings.withProgress ? 100 : null
  };
  
  // Add to toast array (at beginning)
  toasts.value.unshift(toast);
  
  // Limit number of toasts
  if (toasts.value.length > props.maxToasts) {
    const oldToast = toasts.value.pop();
    clearInterval(intervals.get(oldToast.id));
    intervals.delete(oldToast.id);
  }
  
  // Handle progress bar
  if (settings.withProgress && settings.duration > 0) {
    const startTime = Date.now();
    const endTime = startTime + settings.duration;
    
    intervals.set(id, setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const percent = (remaining / settings.duration) * 100;
      
      const toastIndex = toasts.value.findIndex(t => t.id === id);
      if (toastIndex !== -1) {
        toasts.value[toastIndex].progress = percent;
      }
      
      if (percent <= 0) {
        dismiss(id);
      }
    }, 30)); // Update every 30ms for smooth animation
  } else if (settings.duration > 0) {
    // If no progress bar but still has duration
    setTimeout(() => dismiss(id), settings.duration);
  }
  
  // Return ID so it can be dismissed programmatically
  return id;
}

// Show type-specific toasts
function success(message, options = {}) {
  return show(message, { ...options, type: 'success' });
}

function error(message, options = {}) {
  return show(message, { ...options, type: 'error' });
}

function warning(message, options = {}) {
  return show(message, { ...options, type: 'warning' });
}

function info(message, options = {}) {
  return show(message, { ...options, type: 'info' });
}

// Dismiss a specific toast
function dismiss(id) {
  const index = toasts.value.findIndex(toast => toast.id === id);
  if (index !== -1) {
    toasts.value.splice(index, 1);
    
    // Clean up interval if exists
    if (intervals.has(id)) {
      clearInterval(intervals.get(id));
      intervals.delete(id);
    }
  }
}

// Clear all toasts
function clear() {
  toasts.value = [];
  intervals.forEach((interval) => clearInterval(interval));
  intervals.clear();
}

// Clean up on component unmount
onBeforeUnmount(() => {
  intervals.forEach((interval) => clearInterval(interval));
});

// Expose methods
defineExpose({
  show,
  success,
  error,
  warning,
  info,
  dismiss,
  clear
});
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1050;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  width: 100%;
  max-width: 400px;
  pointer-events: none;
}

.toast-message {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(33, 33, 33, 0.85);
  color: white;
  padding: 12px 16px;
  border-radius: 6px;
  z-index: 1000;
  width: 100%;
  max-width: 350px;
  text-align: left;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  overflow: hidden;
  pointer-events: auto;
}

.toast-icon {
  flex-shrink: 0;
  font-size: 1.25rem;
}

.toast-content {
  flex-grow: 1;
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: white;
  opacity: 0.7;
  cursor: pointer;
  padding: 0;
  font-size: 0.875rem;
  transition: opacity 0.2s;
}

.toast-close:hover {
  opacity: 1;
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background-color: rgba(255, 255, 255, 0.7);
  transition: width 0.03s linear;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, 20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}

/* Toast types */
.toast-message.success {
  background-color: rgba(38, 166, 154, 0.9);
}

.toast-message.error {
  background-color: rgba(229, 57, 53, 0.9);
}

.toast-message.warning {
  background-color: rgba(255, 152, 0, 0.9);
}

.toast-message.info {
  background-color: rgba(33, 150, 243, 0.9);
}

/* Theme-specific styles */
.toast-message.roman-theme {
  background-color: rgba(94, 53, 28, 0.9);
  border: 1px solid #d5c3aa;
  font-family: 'Cinzel', serif;
}

.toast-message.roman-theme.success {
  background-color: rgba(46, 125, 50, 0.9);
  border-color: #a5d6a7;
}

.toast-message.roman-theme.error {
  background-color: rgba(183, 28, 28, 0.9);
  border-color: #ef9a9a;
}

.toast-message.roman-theme.warning {
  background-color: rgba(230, 81, 0, 0.9);
  border-color: #ffcc80;
}

.toast-message.roman-theme.info {
  background-color: rgba(25, 118, 210, 0.9);
  border-color: #90caf9;
}

.toast-message.arc-theme {
  background-color: var(--arc-surface);
  color: var(--arc-text-primary);
  border-radius: 12px;
  box-shadow: var(--arc-shadow);
}

.toast-message.arc-theme.success {
  background-color: var(--arc-success);
  color: white;
}

.toast-message.arc-theme.error {
  background-color: var(--arc-error);
  color: white;
}

.toast-message.arc-theme.warning {
  background-color: var(--arc-warning);
  color: white;
}

.toast-message.arc-theme.info {
  background-color: var(--arc-info);
  color: white;
}

.toast-message.vacay-theme {
  background-color: rgba(33, 150, 243, 0.9);
  border-radius: 50px;
  box-shadow: var(--vacay-shadow);
}

.toast-message.vacay-theme.success {
  background-color: var(--vacay-success);
}

.toast-message.vacay-theme.error {
  background-color: var(--vacay-error);
}

.toast-message.vacay-theme.warning {
  background-color: var(--vacay-warning);
}

.toast-message.vacay-theme.info {
  background-color: var(--vacay-primary);
}
</style>
