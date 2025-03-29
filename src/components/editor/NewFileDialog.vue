<template>
  <div class="dialog-overlay">
    <div class="dialog">
      <div class="dialog-header">
        <h2>Create New File</h2>
        <button class="close-btn" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="dialog-body">
        <div class="form-group">
          <label for="filePath">File Path:</label>
          <input 
            type="text" 
            id="filePath" 
            v-model="filePath" 
            placeholder="src/components/MyComponent.vue"
            @input="validatePath"
          >
          <div v-if="pathError" class="error-message">{{ pathError }}</div>
        </div>
        
        <div class="form-group">
          <label for="fileType">File Type:</label>
          <select id="fileType" v-model="fileType" @change="updateTemplate">
            <option value="vue">Vue Component</option>
            <option value="js">JavaScript</option>
            <option value="service">Service</option>
            <option value="css">CSS</option>
            <option value="empty">Empty File</option>
          </select>
        </div>
        
        <div class="preview-section">
          <label>Content Preview:</label>
          <pre class="content-preview">{{ content }}</pre>
        </div>
      </div>
      
      <div class="dialog-footer">
        <button class="cancel-btn" @click="$emit('close')">Cancel</button>
        <button 
          class="create-btn" 
          @click="createFile" 
          :disabled="!isValid"
        >
          Create File
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';

export default {
  name: 'NewFileDialog',
  emits: ['close', 'create'],
  
  setup(props, { emit }) {
    const filePath = ref('');
    const fileType = ref('vue');
    const pathError = ref('');
    const content = ref('');
    
    const isValid = computed(() => {
      return filePath.value && !pathError.value;
    });
    
    const validatePath = () => {
      if (!filePath.value) {
        pathError.value = 'File path is required';
        return;
      }
      
      // Check for valid characters
      if (/[<>:"|?*]/.test(filePath.value)) {
        pathError.value = 'File path contains invalid characters';
        return;
      }
      
      // Ensure file has extension if not automatically added
      const hasExtension = /\.[a-z0-9]+$/i.test(filePath.value);
      if (!hasExtension) {
        // Add extension based on file type
        switch (fileType.value) {
          case 'vue':
            filePath.value += '.vue';
            break;
          case 'js':
          case 'service':
            filePath.value += '.js';
            break;
          case 'css':
            filePath.value += '.css';
            break;
        }
      }
      
      pathError.value = '';
    };
    
    const updateTemplate = () => {
      switch (fileType.value) {
        case 'vue':
          content.value = `<template>
  <div class="component">
    <!-- Component content goes here -->
  </div>
</template>

<script>
export default {
  name: 'NewComponent',
  
  props: {
    // Component props
  },
  
  data() {
    return {
      // Component data
    };
  },
  
  methods: {
    // Component methods
  }
};
<\/script>

<style scoped>
.component {
  /* Component styles */
}
</style>`;
          break;
        
        case 'js':
          content.value = `/**
 * New JavaScript Module
 */

// Constants

// Helper functions

/**
 * Main function
 * 
 * @param {Object} options - Function options
 * @returns {Promise<Object>} Operation result
 */
export function main(options = {}) {
  // Implementation
  return Promise.resolve({ success: true });
}

export default {
  main
};`;
          break;
        
        case 'service':
          content.value = `/**
 * New Service Module
 * 
 * Service description
 */

// Service state
let initialized = false;
let serviceConfig = {
  // Default configuration
};

/**
 * Initialize the service
 * @param {Object} options - Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initialize(options = {}) {
  if (initialized) {
    return true;
  }

  try {
    console.log('Initializing service...');
    
    // Apply configuration options
    if (options.config) {
      serviceConfig = {
        ...serviceConfig,
        ...options.config
      };
    }
    
    initialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize service:', error);
    return false;
  }
}

/**
 * Get service status
 * @returns {Object} Service status
 */
export function getStatus() {
  return { 
    initialized,
    // Other status properties
  };
}

export default {
  initialize,
  getStatus,
  // Other exports
};`;
          break;
          
        case 'css':
          content.value = `/**
 * New Stylesheet
 */

:root {
  /* Variables */
}

.container {
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  padding: 1rem;
}

.header {
  margin-bottom: 1rem;
}

.content {
  flex: 1;
}

.footer {
  margin-top: 1rem;
}

/* Media Queries */
@media screen and (max-width: 768px) {
  .container {
    padding: 0.5rem;
  }
}`;
          break;
          
        case 'empty':
          content.value = '';
          break;
      }
    };
    
    const createFile = () => {
      if (!isValid.value) {
        return;
      }
      
      emit('create', {
        path: filePath.value,
        content: content.value
      });
    };
    
    // Initialize content
    updateTemplate();
    
    return {
      filePath,
      fileType,
      pathError,
      content,
      isValid,
      validatePath,
      updateTemplate,
      createFile
    };
  }
};
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog {
  background-color: var(--bg-medium);
  border-radius: 8px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  width: 600px;
  max-width: 90%;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  color: var(--text-secondary);
}

.dialog-body {
  padding: 1.5rem;
  max-height: 60vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background-color: var(--bg-dark);
  color: var(--text-primary);
  font-family: monospace;
}

.preview-section {
  margin-top: 1.5rem;
}

.content-preview {
  width: 100%;
  height: 200px;
  overflow: auto;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background-color: var(--bg-dark);
  color: var(--text-primary);
  font-family: monospace;
  white-space: pre;
  font-size: 0.9rem;
}

.dialog-footer {
  padding: 1rem;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.error-message {
  color: #e74c3c;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.cancel-btn,
.create-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.cancel-btn {
  background-color: var(--bg-dark);
  border: 1px solid var(--border);
  color: var(--text-primary);
}

.create-btn {
  background-color: var(--primary);
  border: 1px solid var(--primary);
  color: var(--text-on-primary);
}

.create-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Uranium theme specifics */
:global(.uranium-theme) .dialog {
  background-color: var(--uranium-bg-medium);
  box-shadow: var(--uranium-shadow-md);
  border: 1px solid var(--uranium-border);
}

:global(.uranium-theme) .form-group input,
:global(.uranium-theme) .form-group select,
:global(.uranium-theme) .content-preview {
  background-color: var(--uranium-bg-dark);
  border-color: var(--uranium-border);
}

:global(.uranium-theme) .create-btn {
  background: var(--uranium-gradient-primary);
  box-shadow: var(--uranium-shadow-sm);
}

:global(.uranium-theme) .create-btn:not(:disabled):hover {
  box-shadow: var(--uranium-shadow-md), var(--uranium-primary-glow);
}

:global(.uranium-theme) .cancel-btn:hover {
  border-color: var(--uranium-primary);
}
</style>
