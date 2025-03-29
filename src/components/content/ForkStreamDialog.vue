<template>
  <div class="fork-stream-dialog" :class="theme">
    <div class="dialog-header">
      <h3>Fork Stream</h3>
      <button class="close-btn" @click="closeDialog">
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <div class="dialog-body">
      <div v-if="errorMessage" class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        {{ errorMessage }}
      </div>
      
      <div class="form-group" :class="{ 'has-error': errors.title }">
        <label for="newTitle">New Title <span class="required">*</span></label>
        <input type="text" id="newTitle" v-model="newTitle" placeholder="Enter new title" @blur="validateTitle">
        <span class="error-text" v-if="errors.title">{{ errors.title }}</span>
      </div>
      
      <div class="form-group" :class="{ 'has-error': errors.description }">
        <label for="newDescription">New Description</label>
        <textarea id="newDescription" v-model="newDescription" placeholder="Enter new description"></textarea>
        <span class="error-text" v-if="errors.description">{{ errors.description }}</span>
      </div>
      
      <div class="form-group" :class="{ 'has-error': errors.paymentRate }">
        <label for="newPaymentRate">New Payment Rate (ETH/min) <span class="required">*</span></label>
        <input type="number" id="newPaymentRate" v-model.number="newPaymentRate" step="0.001" @blur="validatePaymentRate">
        <span class="error-text" v-if="errors.paymentRate">{{ errors.paymentRate }}</span>
      </div>
      
      <!-- K80 Protocol Options -->
      <div class="protocol-section">
        <h4>Distribution Protocol</h4>
        
        <div class="protocol-options">
          <label class="protocol-option">
            <input type="radio" v-model="selectedProtocol" value="standard">
            <div class="protocol-card">
              <h5>Standard</h5>
              <p>Basic content distribution</p>
            </div>
          </label>
          
          <label class="protocol-option">
            <input type="radio" v-model="selectedProtocol" value="k80">
            <div class="protocol-card">
              <div class="protocol-badge">
                <i class="fas fa-shield-alt"></i> K80
              </div>
              <h5>K80 Protocol</h5>
              <p>Enhanced security & decentralized distribution</p>
            </div>
          </label>
        </div>
        
        <!-- K80 Protocol Settings (shown only when K80 is selected) -->
        <div class="k80-settings" v-if="selectedProtocol === 'k80'">
          <div class="form-group">
            <label for="nodeCount">Distribution Nodes</label>
            <div class="slider-container">
              <input type="range" id="nodeCount" v-model.number="k80Settings.nodeCount" min="3" max="50">
              <span class="slider-value">{{ k80Settings.nodeCount }}</span>
            </div>
            <p class="setting-description">More nodes increase distribution resilience</p>
          </div>
          
          <div class="form-group">
            <label for="encryptionLevel">Encryption Level</label>
            <select id="encryptionLevel" v-model="k80Settings.encryptionLevel">
              <option value="standard">Standard (128-bit)</option>
              <option value="enhanced">Enhanced (256-bit)</option>
              <option value="maximum">Maximum (384-bit)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="k80Settings.enablePeerAcceleration">
              Enable peer acceleration
            </label>
            <p class="setting-description">Allows viewers to contribute to content distribution</p>
          </div>
        </div>
      </div>
      
      <!-- Dependency Unity Settings -->
      <div class="dependency-section" v-if="contentHasDependencies">
        <h4>Dependency Settings</h4>
        
        <div class="unity-strategy">
          <label class="strategy-option">
            <input type="radio" v-model="unityStrategy" value="maintain">
            <div class="strategy-card">
              <h5>Maintain Unity <i class="fas fa-link"></i></h5>
              <p>Keep synchronized with parent stream and dependencies</p>
            </div>
          </label>
          
          <label class="strategy-option">
            <input type="radio" v-model="unityStrategy" value="diverge">
            <div class="strategy-card">
              <h5>Diverge <i class="fas fa-code-branch"></i></h5>
              <p>Create an independent fork that may evolve differently</p>
            </div>
          </label>
        </div>
        
        <div class="dependency-details" v-if="unityStrategy === 'maintain'">
          <div class="selected-dependencies">
            <h5>Dependencies to Maintain</h5>
            <div class="dependency-list">
              <div class="dependency-checkbox" v-if="props.content.forkedFrom">
                <label>
                  <input type="checkbox" v-model="maintainParent">
                  <span>Parent Stream (#{{ props.content.id }})</span>
                </label>
              </div>
              <div 
                v-for="(dep, index) in props.content.dependencies" 
                :key="index" 
                class="dependency-checkbox"
              >
                <label>
                  <input type="checkbox" v-model="maintainedDependencies[index]">
                  <span>{{ dep.name }} ({{ dep.version }})</span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="sync-options">
            <label>
              <input type="checkbox" v-model="autoSync">
              <span>Auto-synchronize when parent updates</span>
            </label>
          </div>
        </div>
      </div>
    </div>
    
    <div class="dialog-footer">
      <button class="btn cancel-btn" @click="closeDialog">Cancel</button>
      <button class="btn create-btn" @click="handleCreateForkedStream" :disabled="isSubmitting || !isFormValid">
        <span v-if="isSubmitting"><i class="fas fa-spinner fa-spin"></i> Creating...</span>
        <span v-else>Create Stream</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed, onMounted, watch } from 'vue';

const props = defineProps({
  content: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'create']);

const theme = inject('currentTheme', 'roman-theme');
const errorMessage = ref('');
const isSubmitting = ref(false);

// Form data
const newTitle = ref('');
const newDescription = ref('');
const newPaymentRate = ref(0.01);
const selectedProtocol = ref('standard');

// K80 Protocol settings
const k80Settings = ref({
  nodeCount: 10,
  encryptionLevel: 'standard',
  enablePeerAcceleration: true
});

// Validation errors
const errors = ref({
  title: '',
  description: '',
  paymentRate: ''
});

// Dependency Unity options
const unityStrategy = ref('maintain');
const maintainParent = ref(true);
const maintainedDependencies = ref([]);
const autoSync = ref(true);

const contentHasDependencies = computed(() => {
  return (props.content.dependencies && props.content.dependencies.length > 0) || 
         props.content.forkedFrom !== undefined;
});

// Initialize form data
onMounted(() => {
  if (props.content) {
    try {
      newTitle.value = props.content.title ? `${props.content.title} (Forked)` : '';
      newDescription.value = props.content.description || '';
      newPaymentRate.value = props.content.paymentRate || 0.01;
      
      // Initialize protocol selection based on original content
      selectedProtocol.value = props.content.protocol || 'standard';
      
      // Initialize K80 settings if available
      if (props.content.k80Settings) {
        k80Settings.value = {
          nodeCount: props.content.k80Settings.nodeCount || 10,
          encryptionLevel: props.content.k80Settings.encryptionLevel || 'standard',
          enablePeerAcceleration: props.content.k80Settings.enablePeerAcceleration !== false
        };
      }
      
      // Initialize dependency checkboxes
      if (props.content.dependencies) {
        maintainedDependencies.value = props.content.dependencies.map(() => true);
      }
    } catch (error) {
      console.error('Error initializing form data:', error);
      errorMessage.value = 'Error loading content data. Please try again.';
    }
  }
});

const isFormValid = computed(() => {
  return newTitle.value.trim() !== '' && 
         !errors.value.title && 
         !errors.value.description && 
         !errors.value.paymentRate;
});

function validateTitle() {
  if (!newTitle.value.trim()) {
    errors.value.title = 'Title is required';
  } else if (newTitle.value.trim().length < 3) {
    errors.value.title = 'Title must be at least 3 characters';
  } else if (newTitle.value.trim().length > 100) {
    errors.value.title = 'Title must be less than 100 characters';
  } else {
    errors.value.title = '';
  }
}

function validatePaymentRate() {
  if (newPaymentRate.value === null || newPaymentRate.value === undefined) {
    errors.value.paymentRate = 'Payment rate is required';
  } else if (isNaN(newPaymentRate.value) || newPaymentRate.value <= 0) {
    errors.value.paymentRate = 'Payment rate must be greater than 0';
  } else if (newPaymentRate.value > 1) {
    errors.value.paymentRate = 'Payment rate cannot exceed 1 ETH/min';
  } else {
    errors.value.paymentRate = '';
  }
}

async function handleCreateForkedStream() {
  // Validate all fields before submission
  validateTitle();
  validatePaymentRate();
  
  if (!isFormValid.value) {
    errorMessage.value = 'Please fix the errors before submitting';
    return;
  }
  
  try {
    errorMessage.value = '';
    isSubmitting.value = true;
    
    const forkedStream = {
      ...props.content,
      title: newTitle.value,
      description: newDescription.value,
      paymentRate: newPaymentRate.value,
      protocol: selectedProtocol.value,
      forkedFrom: props.content.id,
      forkedAt: new Date().toISOString(),
      
      // Add unity status and settings
      unityStatus: unityStrategy.value === 'maintain' ? 'synced' : 'diverged',
      parentStatus: maintainParent.value ? 'synced' : 'diverged',
      autoSync: unityStrategy.value === 'maintain' && autoSync.value
    };
    
    // Add K80 specific settings if K80 protocol is selected
    if (selectedProtocol.value === 'k80') {
      forkedStream.k80Settings = { ...k80Settings.value };
      
      // Set initial K80 metrics
      forkedStream.k80Metrics = {
        nodes: k80Settings.value.nodeCount,
        bandwidth: k80Settings.value.nodeCount * 25, // Estimation based on node count
        uptime: 100
      };
    }
    
    // Handle dependencies
    if (props.content.dependencies) {
      forkedStream.dependencies = props.content.dependencies.map((dep, index) => ({
        ...dep,
        status: maintainedDependencies.value[index] && unityStrategy.value === 'maintain' 
          ? 'synced' 
          : 'diverged'
      }));
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    emit('create', forkedStream);
    closeDialog();
  } catch (error) {
    console.error('Error creating forked stream:', error);
    errorMessage.value = 'Failed to create forked stream. Please try again.';
  } finally {
    isSubmitting.value = false;
  }
}

function closeDialog() {
  // Reset form state
  errorMessage.value = '';
  errors.value = { title: '', description: '', paymentRate: '' };
  isSubmitting.value = false;
  
  emit('close');
}
</script>

<style scoped>
.fork-stream-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  width: 500px;
  max-width: 90%;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.3rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.close-btn:hover {
  opacity: 1;
}

.dialog-body {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 5px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.cancel-btn {
  background-color: #eee;
  color: #555;
}

.cancel-btn:hover {
  background-color: #ddd;
}

.create-btn {
  background-color: #4CAF50;
  color: white;
}

.create-btn:hover {
  background-color: #43A047;
}

/* Theme-specific styles */
.roman-theme .dialog-header h3 {
  font-family: 'Trajan Pro', 'Times New Roman', serif;
  color: #8B4513;
}

.roman-theme .form-group label {
  color: #8B4513;
}

.roman-theme .form-group input,
.roman-theme .form-group textarea {
  border-color: #d5c3aa;
  background-color: #fcf8f3;
  color: #5D4037;
}

.error-message {
  background-color: #ffebee;
  color: #d32f2f;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.form-group.has-error input,
.form-group.has-error textarea {
  border-color: #d32f2f;
}

.error-text {
  color: #d32f2f;
  font-size: 0.8rem;
  margin-top: 4px;
  display: block;
}

.required {
  color: #d32f2f;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.fa-spinner {
  margin-right: 5px;
  animation: spin 1s infinite linear;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.protocol-section {
  margin-top: 20px;
  border-top: 1px solid #eee;
  padding-top: 15px;
}

.protocol-section h4 {
  margin: 0 0 12px 0;
  font-size: 1.1rem;
}

.protocol-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 15px;
}

.protocol-option {
  cursor: pointer;
}

.protocol-option input[type="radio"] {
  position: absolute;
  opacity: 0;
}

.protocol-card {
  border: 2px solid #ddd;
  border-radius: 6px;
  padding: 12px;
  transition: all 0.2s;
  height: 100%;
  position: relative;
}

.protocol-option input[type="radio"]:checked + .protocol-card {
  border-color: #1976d2;
  background-color: rgba(25, 118, 210, 0.05);
}

.protocol-card h5 {
  margin: 0 0 5px 0;
  font-size: 1rem;
}

.protocol-card p {
  margin: 0;
  font-size: 0.85rem;
  color: #666;
}

.protocol-card .protocol-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: #1976d2;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  gap: 3px;
}

.k80-settings {
  background-color: #f9f9f9;
  border-radius: 6px;
  padding: 15px;
  margin-top: 10px;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slider-container input[type="range"] {
  flex-grow: 1;
}

.slider-value {
  font-weight: 600;
  min-width: 30px;
  text-align: center;
}

.setting-description {
  margin: 5px 0 0 0;
  font-size: 0.8rem;
  color: #666;
  font-style: italic;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

/* Roman theme specific styles */
.roman-theme .protocol-section {
  border-top-color: #d5c3aa;
}

.roman-theme .protocol-option input[type="radio"]:checked + .protocol-card {
  border-color: #8B4513;
  background-color: rgba(139, 69, 19, 0.05);
}

.roman-theme .protocol-card .protocol-badge {
  background-color: #8B4513;
}

.roman-theme .k80-settings {
  background-color: #fcf8f3;
}

.dependency-section {
  margin-top: 20px;
  border-top: 1px solid #eee;
  padding-top: 15px;
}

.dependency-section h4 {
  margin: 0 0 12px 0;
  font-size: 1.1rem;
}

.unity-strategy {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 15px;
}

.strategy-option {
  cursor: pointer;
}

.strategy-option input[type="radio"] {
  position: absolute;
  opacity: 0;
}

.strategy-card {
  border: 2px solid #ddd;
  border-radius: 6px;
  padding: 12px;
  transition: all 0.2s;
  height: 100%;
}

.strategy-option input[type="radio"]:checked + .strategy-card {
  border-color: #1976d2;
  background-color: rgba(25, 118, 210, 0.05);
}

.strategy-card h5 {
  margin: 0 0 5px 0;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.strategy-card p {
  margin: 0;
  font-size: 0.85rem;
  color: #666;
}

.dependency-details {
  background-color: #f9f9f9;
  border-radius: 6px;
  padding: 15px;
  margin-top: 10px;
}

.selected-dependencies h5 {
  margin: 0 0 10px 0;
  font-size: 0.95rem;
}

.dependency-checkbox {
  margin-bottom: 8px;
}

.dependency-checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.9rem;
}

.sync-options {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px dashed #ddd;
}

.sync-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.9rem;
}

/* Roman theme overrides */
.roman-theme .dependency-section {
  border-top-color: #d5c3aa;
}

.roman-theme .strategy-option input[type="radio"]:checked + .strategy-card {
  border-color: #8B4513;
  background-color: rgba(139, 69, 19, 0.05);
}

.roman-theme .dependency-details {
  background-color: #fcf8f3;
}

.roman-theme .sync-options {
  border-top-color: #d5c3aa;
}
</style>
