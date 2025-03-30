<template>
  <div class="io-error-display" v-if="visibleErrors.length > 0">
    <div class="error-header">
      <h3>{{ title }}</h3>
      <div class="header-actions">
        <button 
          v-if="showDismissAll && visibleErrors.length > 1" 
          @click="clearAllErrors" 
          class="dismiss-all-btn"
          :title="dismissAllTitle"
        >
          Clear All
        </button>
      </div>
    </div>
    
    <div class="error-list">
      <transition-group name="error-fade">
        <div 
          v-for="error in visibleErrors" 
          :key="error.id" 
          class="error-item"
          :class="`severity-${error.severity}`"
        >
          <div class="error-icon" :title="error.severity">
            <div v-if="error.severity === 'info'" class="icon info">ℹ️</div>
            <div v-else-if="error.severity === 'warning'" class="icon warning">⚠️</div>
            <div v-else-if="error.severity === 'error'" class="icon error">❌</div>
            <div v-else-if="error.severity === 'critical'" class="icon critical">🚨</div>
          </div>
          
          <div class="error-content">
            <div class="error-message">{{ error.message }}</div>
            <div v-if="showDetails && error.details" class="error-details">{{ error.details }}</div>
            <div v-if="showMetadata && error.fileName" class="error-metadata">
              <span class="metadata-item">File: {{ error.fileName }}</span>
              <span v-if="error.fileSize" class="metadata-item">Size: {{ formatFileSize(error.fileSize) }}</span>
              <span v-if="error.timestamp && showTimestamp" class="metadata-item">{{ formatTime(error.timestamp) }}</span>
            </div>
          </div>
          
          <div class="error-actions">
            <button v-if="error.retryable" @click="retryOperation(error)" class="retry-btn" title="Retry operation">
              <span>↻</span>
            </button>
            <button @click="dismissError(error.id)" class="dismiss-btn" title="Dismiss">
              <span>×</span>
            </button>
          </div>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { ioErrorService, IOError, IOErrorType, IOErrorSeverity } from '../../services/IOErrorService';

export default defineComponent({
  name: 'IOErrorDisplay',
  
  props: {
    title: {
      type: String,
      default: 'IO Errors'
    },
    maxErrors: {
      type: Number,
      default: 5
    },
    autoDismiss: {
      type: Boolean,
      default: true
    },
    autoDismissTimeout: {
      type: Number,
      default: 10000 // 10 seconds
    },
    filter: {
      type: Object,
      default: () => ({ 
        types: undefined as IOErrorType[] | undefined,
        severities: undefined as IOErrorSeverity[] | undefined
      })
    },
    showDetails: {
      type: Boolean,
      default: true
    },
    showMetadata: {
      type: Boolean,
      default: true
    },
    showTimestamp: {
      type: Boolean,
      default: true
    },
    showDismissAll: {
      type: Boolean,
      default: true
    },
    dismissAllTitle: {
      type: String,
      default: 'Dismiss all error notifications'
    }
  },
  
  emits: ['error-dismissed', 'all-errors-cleared', 'retry'],
  
  setup(props, { emit }) {
    const errors = ref<IOError[]>([]);
    const dismissTimers = new Map<string, number>();
    
    // Filter visible errors based on prop settings
    const visibleErrors = computed(() => {
      let filtered = errors.value;
      
      // Apply type filter if specified
      if (props.filter.types && props.filter.types.length > 0) {
        filtered = filtered.filter(error => props.filter.types!.includes(error.type));
      }
      
      // Apply severity filter if specified
      if (props.filter.severities && props.filter.severities.length > 0) {
        filtered = filtered.filter(error => props.filter.severities!.includes(error.severity));
      }
      
      // Limit the number of visible errors
      return filtered.slice(0, props.maxErrors);
    });
    
    // Handle new errors from the service
    const handleNewError = (error: IOError) => {
      // Add error to the beginning of the list
      errors.value.unshift(error);
      
      // If auto-dismiss is enabled, set a timer to dismiss this error
      if (props.autoDismiss) {
        const timer = window.setTimeout(() => {
          dismissError(error.id);
        }, props.autoDismissTimeout);
        
        dismissTimers.set(error.id, timer);
      }
    };
    
    // Dismiss a specific error
    const dismissError = (id: string) => {
      // Clear the auto-dismiss timer if it exists
      if (dismissTimers.has(id)) {
        clearTimeout(dismissTimers.get(id)!);
        dismissTimers.delete(id);
      }
      
      // Filter out the error from our local array
      errors.value = errors.value.filter(error => error.id !== id);
      
      // Also dismiss from the service (optional)
      ioErrorService.dismissError(id);
      
      emit('error-dismissed', id);
    };
    
    // Clear all errors
    const clearAllErrors = () => {
      // Clear all auto-dismiss timers
      dismissTimers.forEach(timerId => clearTimeout(timerId));
      dismissTimers.clear();
      
      // Clear our local errors array
      errors.value = [];
      
      // Also clear from the service (optional)
      ioErrorService.clearErrors();
      
      emit('all-errors-cleared');
    };
    
    // Retry an operation
    const retryOperation = (error: IOError) => {
      emit('retry', error);
      
      // Dismiss the error after emitting retry
      dismissError(error.id);
    };
    
    // Format file size for display
    const formatFileSize = (bytes: number): string => {
      if (bytes < 1024) {
        return `${bytes} B`;
      } else if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
      } else if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      } else {
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
      }
    };
    
    // Format timestamp for display
    const formatTime = (timestamp: number): string => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    };
    
    // Set up error event listener when component mounts
    onMounted(() => {
      // Load initial errors from service
      errors.value = ioErrorService.getErrors();
      
      // Listen for new errors
      ioErrorService.on('error', handleNewError);
    });
    
    // Clean up event listeners when component unmounts
    onBeforeUnmount(() => {
      ioErrorService.off('error', handleNewError);
      
      // Clear all auto-dismiss timers
      dismissTimers.forEach(timerId => clearTimeout(timerId));
      dismissTimers.clear();
    });
    
    return {
      visibleErrors,
      dismissError,
      clearAllErrors,
      retryOperation,
      formatFileSize,
      formatTime
    };
  }
});
</script>

<style scoped>
.io-error-display {
  width: 100%;
  max-width: 600px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.error-header {
  background: #f5f5f5;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
}

.error-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.dismiss-all-btn {
  background: none;
  border: none;
  color: #777;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.dismiss-all-btn:hover {
  background: #e0e0e0;
  color: #333;
}

.error-list {
  max-height: 400px;
  overflow-y: auto;
}

.error-item {
  display: flex;
  padding: 12px 16px;
  border-bottom: 1px solid #eaeaea;
}

.error-item:last-child {
  border-bottom: none;
}

.error-item.severity-info {
  background-color: #f0f7ff;
}

.error-item.severity-warning {
  background-color: #fff9e6;
}

.error-item.severity-error {
  background-color: #fff0f0;
}

.error-item.severity-critical {
  background-color: #ff3b3b17;
}

.error-icon {
  margin-right: 12px;
  padding-top: 1px;
}

.error-content {
  flex: 1;
}

.error-message {
  font-weight: 500;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.error-details {
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.error-metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #777;
}

.metadata-item {
  display: inline-block;
}

.error-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-left: 12px;
}

.retry-btn,
.dismiss-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  color: #666;
}

.retry-btn:hover {
  background: #e3f2fd;
  color: #0277bd;
}

.dismiss-btn:hover {
  background: #ffebee;
  color: #c62828;
}

.error-fade-enter-active,
.error-fade-leave-active {
  transition: all 0.3s ease;
}

.error-fade-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.error-fade-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

@media (prefers-color-scheme: dark) {
  .io-error-display {
    background: #1e1e1e;
  }
  
  .error-header {
    background: #2a2a2a;
    border-bottom-color: #333;
  }
  
  .error-header h3 {
    color: #e0e0e0;
  }
  
  .dismiss-all-btn {
    color: #aaa;
  }
  
  .dismiss-all-btn:hover {
    background: #333;
    color: #e0e0e0;
  }
  
  .error-item {
    border-bottom-color: #333;
  }
  
  .error-item.severity-info {
    background-color: #0d253521;
  }
  
  .error-item.severity-warning {
    background-color: #332b0021;
  }
  
  .error-item.severity-error {
    background-color: #29090921;
  }
  
  .error-item.severity-critical {
    background-color: #2c0b0b21;
  }
  
  .error-message {
    color: #e0e0e0;
  }
  
  .error-details {
    color: #aaa;
  }
  
  .error-metadata {
    color: #888;
  }
  
  .retry-btn,
  .dismiss-btn {
    color: #aaa;
  }
  
  .retry-btn:hover {
    background: #103247;
    color: #4fc3f7;
  }
  
  .dismiss-btn:hover {
    background: #2c1316;
    color: #ef9a9a;
  }
}
</style>
