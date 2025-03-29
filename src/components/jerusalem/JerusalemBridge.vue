<template>
  <div class="jerusalem-bridge" :class="theme">
    <div class="bridge-header">
      <h2>Jerusalem Protocol Bridge</h2>
      <p class="bridge-subtitle">Transfer content across blockchain networks</p>
    </div>

    <div class="transfer-form" v-if="!transferSubmitted">
      <div class="network-selection">
        <div class="network-column">
          <h4>Source Network</h4>
          <div class="network-selector">
            <div 
              v-for="network in availableNetworks" 
              :key="`source-${network}`"
              class="network-option"
              :class="{ active: network === sourceNetwork }"
              @click="sourceNetwork = network"
            >
              <div class="network-icon">
                <img :src="getNetworkIconUrl(network)" :alt="network">
              </div>
              <span>{{ formatNetworkName(network) }}</span>
            </div>
          </div>
        </div>

        <div class="direction-indicator">
          <div class="arrow-icon">
            <i class="fas fa-arrow-right"></i>
          </div>
        </div>

        <div class="network-column">
          <h4>Destination Network</h4>
          <div class="network-selector">
            <div 
              v-for="network in availableNetworks" 
              :key="`dest-${network}`"
              class="network-option"
              :class="{ 
                active: network === destinationNetwork,
                disabled: network === sourceNetwork 
              }"
              @click="setDestinationNetwork(network)"
            >
              <div class="network-icon">
                <img :src="getNetworkIconUrl(network)" :alt="network">
              </div>
              <span>{{ formatNetworkName(network) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="content-details">
        <div class="form-group">
          <label>Content Source URL</label>
          <input 
            type="text" 
            v-model="contentUrl"
            placeholder="ipfs://... or https://..."
            @input="validateContentUrl"
          >
          <p class="validation-message" v-if="contentUrlError">{{ contentUrlError }}</p>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Content Type</label>
            <select v-model="contentType">
              <option v-for="(value, key) in CONTENT_TYPES" :key="value" :value="value">
                {{ formatContentType(key) }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Content Size (MB)</label>
            <input type="number" v-model.number="contentSize" min="1" max="10000">
          </div>
        </div>

        <div class="form-group">
          <label>Content ID</label>
          <input 
            type="text" 
            v-model="contentId"
            placeholder="Enter content identifier"
          >
        </div>
      </div>

      <div class="gateway-selection">
        <h4>Gateway Selection</h4>
        
        <div class="gateway-options">
          <div 
            v-for="gateway in availableGateways" 
            :key="gateway.id"
            class="gateway-option"
            :class="{ active: selectedGateway === gateway.id }"
            @click="selectGateway(gateway.id)"
          >
            <div class="gateway-header">
              <span class="gateway-name">{{ gateway.name }}</span>
              <span class="gateway-security" :class="gateway.securityLevel">
                {{ formatSecurityLevel(gateway.securityLevel) }}
              </span>
            </div>
            
            <div class="gateway-details">
              <div class="gateway-detail">
                <i class="fas fa-coins"></i>
                <span>Fee: {{ (gateway.fee * 100).toFixed(2) }}%</span>
              </div>
              
              <div class="gateway-detail">
                <i class="fas fa-clock"></i>
                <span>Time: {{ formatTime(gateway.averageTime) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="fee-estimate" v-if="feeEstimate">
          <div class="estimate-detail">
            <span class="estimate-label">Estimated Fee:</span>
            <span class="estimate-value">{{ feeEstimate.fee.toFixed(4) }}</span>
          </div>
          <div class="estimate-detail">
            <span class="estimate-label">Estimated Time:</span>
            <span class="estimate-value">{{ formatTime(feeEstimate.estimatedTime) }}</span>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button
          class="cancel-btn"
          @click="$emit('cancel')"
        >
          Cancel
        </button>
        <button 
          class="submit-btn" 
          @click="submitTransfer"
          :disabled="!isFormValid || isSubmitting"
        >
          <span v-if="isSubmitting">
            <i class="fas fa-spinner fa-spin"></i> Processing...
          </span>
          <span v-else>
            <i class="fas fa-paper-plane"></i> Transfer Content
          </span>
        </button>
      </div>
    </div>

    <div v-else class="transfer-success">
      <div class="success-icon">
        <i class="fas fa-check-circle"></i>
      </div>
      <h3>Transfer Initiated!</h3>
      <p>Your content is being prepared for cross-chain transfer.</p>
      
      <div class="transfer-details">
        <div class="detail-item">
          <span class="detail-label">Transfer ID:</span>
          <span class="detail-value">{{ createdTransfer.id }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Source Network:</span>
          <span class="detail-value">{{ formatNetworkName(createdTransfer.sourceNetwork) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Destination Network:</span>
          <span class="detail-value">{{ formatNetworkName(createdTransfer.destinationNetwork) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Gateway:</span>
          <span class="detail-value">{{ getGatewayName(createdTransfer.gatewayId) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Status:</span>
          <span class="detail-value">{{ formatStatus(createdTransfer.status) }}</span>
        </div>
      </div>

      <div class="confirm-action" v-if="requiresConfirmation">
        <p class="confirmation-message">
          <i class="fas fa-info-circle"></i>
          This transfer requires manual confirmation.
        </p>
        <button 
          class="confirm-btn"
          @click="confirmTransfer"
          :disabled="isConfirming"
        >
          <span v-if="isConfirming">
            <i class="fas fa-spinner fa-spin"></i> Confirming...
          </span>
          <span v-else>
            <i class="fas fa-check"></i> Confirm Transfer
          </span>
        </button>
      </div>

      <div class="form-actions">
        <button class="back-btn" @click="resetForm">
          <i class="fas fa-arrow-left"></i> New Transfer
        </button>
        <button class="view-btn" @click="viewTransfer">
          <i class="fas fa-eye"></i> View Transfer
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue';
import { useRouter } from 'vue-router';
import * as JerusalemProtocolService from '@/services/JerusalemProtocolService';
import * as BlockchainService from '@/services/BlockchainService';

const props = defineProps({
  initialSourceNetwork: {
    type: String,
    default: null
  },
  initialDestinationNetwork: {
    type: String,
    default: null
  },
  initialContentUrl: {
    type: String,
    default: ''
  },
  initialContentId: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['transfer-created', 'cancel']);
const router = useRouter();
const theme = inject('currentTheme', 'roman-theme');

// Constants
const SUPPORTED_NETWORKS = JerusalemProtocolService.SUPPORTED_NETWORKS;
const CONTENT_TYPES = JerusalemProtocolService.CONTENT_TYPES;

// Form state
const sourceNetwork = ref(props.initialSourceNetwork || SUPPORTED_NETWORKS.ETHEREUM);
const destinationNetwork = ref(props.initialDestinationNetwork || SUPPORTED_NETWORKS.POLYGON);
const contentUrl = ref(props.initialContentUrl || '');
const contentId = ref(props.initialContentId || '');
const contentType = ref(CONTENT_TYPES.MIXED);
const contentSize = ref(100);
const selectedGateway = ref('');
const contentUrlError = ref('');
const isSubmitting = ref(false);
const isConfirming = ref(false);
const transferSubmitted = ref(false);
const createdTransfer = ref(null);
const requiresConfirmation = ref(false);
const feeEstimate = ref(null);

// Computed properties
const availableNetworks = computed(() => {
  return Object.values(SUPPORTED_NETWORKS);
});

const availableGateways = computed(() => {
  if (!sourceNetwork.value || !destinationNetwork.value) {
    return [];
  }
  
  return JerusalemProtocolService.getAvailableGateways({
    sourceNetwork: sourceNetwork.value,
    destinationNetwork: destinationNetwork.value
  });
});

const isFormValid = computed(() => {
  return (
    sourceNetwork.value && 
    destinationNetwork.value && 
    sourceNetwork.value !== destinationNetwork.value && 
    contentUrl.value && 
    !contentUrlError.value &&
    contentId.value &&
    selectedGateway.value &&
    contentSize.value > 0
  );
});

// Methods
function setDestinationNetwork(network) {
  if (network === sourceNetwork.value) return;
  destinationNetwork.value = network;
  updateFeeEstimate();
}

function selectGateway(gatewayId) {
  selectedGateway.value = gatewayId;
  updateFeeEstimate();
}

function validateContentUrl() {
  if (!contentUrl.value) {
    contentUrlError.value = '';
    return;
  }
  
  if (!contentUrl.value.startsWith('ipfs://') && !contentUrl.value.startsWith('http')) {
    contentUrlError.value = 'URL must start with ipfs:// or http(s)://';
  } else {
    contentUrlError.value = '';
  }
}

function getNetworkIconUrl(network) {
  // In a real implementation, use proper network icons
  return `/icons/networks/${network}.svg`;
}

function formatNetworkName(network) {
  if (!network) return '';
  return network
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatContentType(type) {
  if (!type) return '';
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatSecurityLevel(level) {
  if (!level) return '';
  
  switch(level) {
    case 'very_high': return 'Very High Security';
    case 'high': return 'High Security';
    case 'medium': return 'Medium Security';
    case 'low': return 'Low Security';
    default: return level
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

function formatTime(seconds) {
  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} min` : ''}`;
  }
}

function formatStatus(status) {
  if (!status) return '';
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getGatewayName(gatewayId) {
  const gateway = availableGateways.value.find(g => g.id === gatewayId);
  return gateway ? gateway.name : gatewayId;
}

async function updateFeeEstimate() {
  if (!sourceNetwork.value || !destinationNetwork.value || !selectedGateway.value || contentSize.value <= 0) {
    feeEstimate.value = null;
    return;
  }
  
  try {
    const gateway = availableGateways.value.find(g => g.id === selectedGateway.value);
    if (!gateway) {
      feeEstimate.value = null;
      return;
    }
    
    feeEstimate.value = {
      fee: gateway.fee * contentSize.value * 1.1, // Apply gas multiplier
      estimatedTime: gateway.averageTime
    };
  } catch (error) {
    console.error('Error estimating fee:', error);
    feeEstimate.value = null;
  }
}

async function submitTransfer() {
  if (!isFormValid.value || isSubmitting.value) return;
  
  isSubmitting.value = true;
  
  try {
    // Ensure wallet is connected
    if (!BlockchainService.isConnected()) {
      const connected = await BlockchainService.connectWallet();
      if (!connected) {
        throw new Error('Wallet connection required to transfer content');
      }
    }
    
    // Create transfer
    const transferData = {
      contentId: contentId.value,
      contentType: contentType.value,
      sourceNetwork: sourceNetwork.value,
      destinationNetwork: destinationNetwork.value,
      sourceUrl: contentUrl.value,
      gatewayId: selectedGateway.value,
      transferSize: contentSize.value,
      metadata: {
        title: `Cross-chain content transfer`,
        description: `Transfer from ${formatNetworkName(sourceNetwork.value)} to ${formatNetworkName(destinationNetwork.value)}`,
        contentType: contentType.value
      }
    };
    
    const result = await JerusalemProtocolService.createTransfer(transferData);
    
    if (result.success) {
      createdTransfer.value = result.transfer;
      requiresConfirmation.value = result.requiresConfirmation;
      transferSubmitted.value = true;
      emit('transfer-created', result.transfer);
    } else {
      throw new Error(result.message || 'Transfer creation failed');
    }
  } catch (error) {
    console.error('Error creating transfer:', error);
    alert(`Transfer failed: ${error.message}`);
  } finally {
    isSubmitting.value = false;
  }
}

async function confirmTransfer() {
  if (!createdTransfer.value || isConfirming.value) return;
  
  isConfirming.value = true;
  
  try {
    const result = await JerusalemProtocolService.confirmTransfer(createdTransfer.value.id);
    
    if (result.success) {
      createdTransfer.value = result.transfer;
      requiresConfirmation.value = false;
      alert('Transfer confirmed successfully!');
    } else {
      throw new Error(result.message || 'Transfer confirmation failed');
    }
  } catch (error) {
    console.error('Error confirming transfer:', error);
    alert(`Confirmation failed: ${error.message}`);
  } finally {
    isConfirming.value = false;
  }
}

function viewTransfer() {
  if (!createdTransfer.value) return;
  
  router.push({
    name: 'JerusalemProtocol',
    query: { transfer: createdTransfer.value.id }
  });
}

function resetForm() {
  // Reset form state
  contentUrl.value = '';
  contentId.value = '';
  contentType.value = CONTENT_TYPES.MIXED;
  contentSize.value = 100;
  contentUrlError.value = '';
  selectedGateway.value = '';
  feeEstimate.value = null;
  transferSubmitted.value = false;
  createdTransfer.value = null;
  requiresConfirmation.value = false;
}

// Watchers
watch(
  [sourceNetwork, destinationNetwork],
  () => {
    // Reset gateway when networks change
    selectedGateway.value = '';
    feeEstimate.value = null;
    
    // Auto-select gateway if only one is available
    if (availableGateways.value.length === 1) {
      selectedGateway.value = availableGateways.value[0].id;
      updateFeeEstimate();
    }
  }
);

// Lifecycle hooks
onMounted(() => {
  JerusalemProtocolService.initJerusalemProtocol()
    .then(() => {
      // Auto-select gateway if only one is available
      if (availableGateways.value.length === 1) {
        selectedGateway.value = availableGateways.value[0].id;
        updateFeeEstimate();
      }
    });
});
</script>

<style scoped>
.jerusalem-bridge {
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.bridge-header {
  text-align: center;
  margin-bottom: 24px;
}

.bridge-header h2 {
  font-size: 24px;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.bridge-subtitle {
  color: #666666;
  font-size: 16px;
}

.network-selection {
  display: flex;
  align-items: center;
  margin-bottom: 32px;
}

.network-column {
  flex: 1;
}

.network-column h4 {
  margin-bottom: 12px;
  color: #333;
  font-size: 16px;
}

.network-selector {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.network-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.network-option:hover:not(.disabled) {
  background-color: #e9ecef;
}

.network-option.active {
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
}

.network-option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.network-icon {
  width: 40px;
  height: 40px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
  border-radius: 50%;
  padding: 6px;
}

.network-icon img {
  width: 100%;
  height: auto;
}

.direction-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 60px;
  padding: 0 12px;
}

.arrow-icon {
  width: 36px;
  height: 36px;
  background-color: #f0f0f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.content-details {
  margin-bottom: 32px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
}

.form-group input, 
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
}

.form-group input:focus, 
.form-group select:focus {
  border-color: #40a9ff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.validation-message {
  color: #f5222d;
  font-size: 12px;
  margin-top: 4px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.gateway-selection {
  margin-bottom: 32px;
}

.gateway-selection h4 {
  margin-bottom: 12px;
  color: #333;
  font-size: 16px;
}

.gateway-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.gateway-option {
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.gateway-option:hover {
  border-color: #40a9ff;
}

.gateway-option.active {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.gateway-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.gateway-name {
  font-weight: 500;
  color: #333;
}

.gateway-security {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
}

.gateway-security.high, .gateway-security.very_high {
  background-color: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.gateway-security.medium {
  background-color: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
}

.gateway-security.low {
  background-color: #fff7e6;
  color: #fa8c16;
  border: 1px solid #ffd591;
}

.gateway-details {
  font-size: 13px;
  color: #666;
}

.gateway-detail {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.gateway-detail i {
  margin-right: 8px;
  width: 14px;
}

.fee-estimate {
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 12px 16px;
}

.estimate-detail {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.estimate-label {
  color: #666;
}

.estimate-value {
  font-weight: 500;
  color: #333;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.submit-btn, .confirm-btn {
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 20px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.submit-btn:hover, .confirm-btn:hover {
  background-color: #40a9ff;
}

.submit-btn:disabled, .confirm-btn:disabled {
  background-color: #d9d9d9;
  cursor: not-allowed;
}

.cancel-btn, .back-btn {
  background-color: white;
  color: #666;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 10px 20px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.cancel-btn:hover, .back-btn:hover {
  color: #40a9ff;
  border-color: #40a9ff;
}

.view-btn {
  background-color: #52c41a;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 20px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.view-btn:hover {
  background-color: #73d13d;
}

.transfer-success {
  text-align: center;
}

.success-icon {
  font-size: 48px;
  color: #52c41a;
  margin-bottom: 16px;
}

.transfer-success h3 {
  font-size: 20px;
  margin-bottom: 8px;
}

.transfer-success p {
  color: #666;
  margin-bottom: 24px;
}

.transfer-details {
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  text-align: left;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.detail-label {
  color: #666;
  font-weight: 500;
}

.detail-value {
  color: #333;
}

.confirm-action {
  margin-bottom: 24px;
}

.confirmation-message {
  background-color: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 16px;
  color: #d46b08;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* Roman Theme */
.roman-theme.jerusalem-bridge {
  background-color: #fcf9f0;
  border: 1px solid #e0d5c5;
}

.roman-theme .bridge-header h2 {
  color: #8B4513;
}

.roman-theme .network-option {
  background-color: #f8f5e6;
}

.roman-theme .network-option:hover:not(.disabled) {
  background-color: #f3ece2;
}

.roman-theme .network-option.active {
  background-color: #f0ebda;
  border: 1px solid #c0ab8e;
}

.roman-theme .arrow-icon {
  background-color: #f3ece2;
  color: #8B4513;
}

.roman-theme .form-group input, 
.roman-theme .form-group select {
  border-color: #e0d5c5;
  background-color: #fcf9f0;
}

.roman-theme .form-group input:focus, 
.roman-theme .form-group select:focus {
  border-color: #c0ab8e;
  box-shadow: 0 0 0 2px rgba(139, 69, 19, 0.1);
}

.roman-theme .gateway-option {
  border-color: #e0d5c5;
}

.roman-theme .gateway-option:hover {
  border-color: #c0ab8e;
}

.roman-theme .gateway-option.active {
  border-color: #8B4513;
  box-shadow: 0 0 0 2px rgba(139, 69, 19, 0.1);
}

.roman-theme .submit-btn, 
.roman-theme .confirm-btn {
  background-color: #8B4513;
}

.roman-theme .submit-btn:hover, 
.roman-theme .confirm-btn:hover {
  background-color: #9b5523;
}

.roman-theme .view-btn {
  background-color: #6B8E23;
}

.roman-theme .view-btn:hover {
  background-color: #7b9e33;
}

.roman-theme .fee-estimate,
.roman-theme .transfer-details {
  background-color: #f8f5e6;
}

.roman-theme .confirmation-message {
  background-color: #f8f0d9;
  border-color: #e0c89f;
}
</style>
