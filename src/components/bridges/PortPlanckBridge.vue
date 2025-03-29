<template>
  <div class="port-planck-bridge" :class="theme">
    <div class="bridge-header">
      <h3>Port Planck <span class="version">v{{ version }}</span></h3>
      <button class="close-btn" @click="closeBridge">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="bridge-body">
      <div v-if="bridgeError" class="bridge-error">
        <i class="fas fa-exclamation-triangle"></i>
        <span>{{ bridgeError }}</span>
      </div>

      <div class="chain-selection">
        <div class="chain-from">
          <label>Source Chain</label>
          <div class="chain-selector">
            <img :src="getChainLogo(sourceChain)" :alt="sourceChain">
            <select v-model="sourceChain">
              <option v-for="chain in availableChains" :key="`source-${chain.id}`" :value="chain.id">
                {{ chain.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="chain-arrow">
          <i class="fas fa-arrow-right"></i>
        </div>

        <div class="chain-to">
          <label>Destination Chain</label>
          <div class="chain-selector">
            <img :src="getChainLogo(destChain)" :alt="destChain">
            <select v-model="destChain" :disabled="isBridging">
              <option v-for="chain in targetChains" :key="`dest-${chain.id}`" :value="chain.id">
                {{ chain.name }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div class="content-details">
        <div class="content-thumbnail">
          <img v-if="content.thumbnail" :src="content.thumbnail" :alt="content.title">
          <div v-else class="thumbnail-placeholder">
            <i class="fas fa-photo-video"></i>
          </div>
        </div>
        
        <div class="content-info">
          <h4>{{ content.title }}</h4>
          <p>by {{ content.creator }}</p>
          <div class="content-metrics">
            <span class="payment-rate">{{ content.paymentRate }} ETH/min</span>
            <span class="protocol">{{ content.protocol === 'k80' ? 'K80 Protocol' : 'Standard' }}</span>
          </div>
          <div class="bridge-info" v-if="bridgeInfo">
            <p>{{ bridgeInfo }}</p>
          </div>
        </div>
      </div>

      <div class="bridge-settings">
        <h4>Bridge Settings</h4>
        
        <div class="setting-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.preserveMetadata" :disabled="isBridging">
            <span>Preserve original metadata</span>
          </label>
          <p class="setting-desc">Keep all original content information in destination chain.</p>
        </div>
        
        <div class="setting-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.allDependencies" :disabled="isBridging">
            <span>Transfer all dependencies</span>
          </label>
          <p class="setting-desc">Include all content dependencies when bridging ({{ dependencyCount }} dependencies).</p>
        </div>
        
        <div class="setting-group">
          <label for="gas-priority">Gas Priority</label>
          <select id="gas-priority" v-model="settings.gasPriority" :disabled="isBridging">
            <option value="low">Low (Slower, cheaper)</option>
            <option value="medium">Medium (Balanced)</option>
            <option value="high">High (Faster, expensive)</option>
          </select>
        </div>
        
        <div class="bridge-fees">
          <div class="fee-item">
            <span>Base Fee</span>
            <span>{{ calculateBridgeFee() }} ETH</span>
          </div>
          <div class="fee-item">
            <span>Gas (estimated)</span>
            <span>{{ calculateGasFee() }} ETH</span>
          </div>
          <div class="fee-item total">
            <span>Total</span>
            <span>{{ calculateTotalFee() }} ETH</span>
          </div>
        </div>
      </div>

      <div class="bridge-status" v-if="bridgeProgress > 0 && bridgeProgress < 100">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${bridgeProgress}%` }"></div>
        </div>
        <div class="status-text">
          {{ getBridgeStatusText() }} ({{ bridgeProgress }}%)
        </div>
      </div>

      <div class="bridge-actions">
        <button class="cancel-btn" @click="closeBridge" :disabled="isBridging && bridgeProgress > 0">Cancel</button>
        <button class="bridge-btn" @click="initiatePortPlanck" :disabled="isBridging || !isValidBridge">
          <i class="fas" :class="isBridging ? 'fa-spinner fa-spin' : 'fa-broadcast-tower'"></i>
          {{ isBridging ? 'Bridging...' : 'Start Bridge' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch, onMounted } from 'vue';

const props = defineProps({
  content: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'bridgeComplete']);
const theme = inject('currentTheme', 'roman-theme');

// State
const version = "1.0.2";
const sourceChain = ref('ethereum');
const destChain = ref('polygon');
const bridgeError = ref('');
const bridgeInfo = ref('');
const bridgeProgress = ref(0);
const isBridging = ref(false);
const settings = ref({
  preserveMetadata: true,
  allDependencies: true,
  gasPriority: 'medium'
});

// Chain data
const availableChains = [
  { id: 'ethereum', name: 'Ethereum', logo: '/img/chains/ethereum.png' },
  { id: 'polygon', name: 'Polygon', logo: '/img/chains/polygon.png' },
  { id: 'avalanche', name: 'Avalanche', logo: '/img/chains/avalanche.png' },
  { id: 'bsc', name: 'Binance Smart Chain', logo: '/img/chains/bsc.png' },
  { id: 'solana', name: 'Solana', logo: '/img/chains/solana.png' },
  { id: 'arbitrum', name: 'Arbitrum', logo: '/img/chains/arbitrum.png' },
];

// Computed
const dependencyCount = computed(() => {
  let count = 0;
  if (props.content.dependencies) {
    count += props.content.dependencies.length;
  }
  if (props.content.forkedFrom !== undefined) {
    count += 1;
  }
  return count;
});

const targetChains = computed(() => {
  return availableChains.filter(chain => chain.id !== sourceChain.value);
});

const isValidBridge = computed(() => {
  return sourceChain.value !== destChain.value && destChain.value !== '';
});

// Watchers
watch(sourceChain, (newChain, oldChain) => {
  if (newChain === destChain.value) {
    // Find first valid target chain
    const validTarget = availableChains.find(chain => chain.id !== newChain);
    if (validTarget) {
      destChain.value = validTarget.id;
    }
  }
  
  // Reset bridge progress when chain changes
  bridgeProgress.value = 0;
  bridgeError.value = '';
  bridgeInfo.value = getChainCompatibilityInfo();
});

watch(destChain, () => {
  bridgeProgress.value = 0;
  bridgeError.value = '';
  bridgeInfo.value = getChainCompatibilityInfo();
});

// Lifecycle
onMounted(() => {
  // Set source chain based on content's current chain (default to ethereum)
  sourceChain.value = props.content.chain || 'ethereum';
  
  // Set initial info
  bridgeInfo.value = getChainCompatibilityInfo();
});

// Methods
function getChainLogo(chainId) {
  const chain = availableChains.find(c => c.id === chainId);
  if (chain) {
    // In a real implementation, we'd use actual logos
    // For now, return a placeholder based on chain name
    return `https://via.placeholder.com/30x30/3498db/ffffff?text=${chain.name[0].toUpperCase()}`;
  }
  return 'https://via.placeholder.com/30x30/cccccc/ffffff?text=?';
}

function getChainCompatibilityInfo() {
  // In a real implementation, this would check actual chain compatibility
  if (sourceChain.value === 'ethereum' && destChain.value === 'polygon') {
    return 'Optimal compatibility with Polygon PoS Bridge';
  } else if (sourceChain.value === 'ethereum' && destChain.value === 'arbitrum') {
    return 'Fast bridging available with Arbitrum Nitro';
  } else if (sourceChain.value === 'ethereum' && destChain.value === 'solana') {
    return 'Cross-chain bridging requires Wormhole adapter (additional fees may apply)';
  } else if (destChain.value === 'solana') {
    return 'K80 Protocol has limited support on Solana';
  }
  
  return 'Standard bridging available';
}

function calculateBridgeFee() {
  // Base fee calculation
  const baseFee = 0.002;
  
  // Additional fee for cross-ecosystem bridges (e.g., EVM to non-EVM)
  const crossEcosystemFee = isCrossEcosystem() ? 0.001 : 0;
  
  // Fee adjustments for dependencies
  const dependencyFee = settings.value.allDependencies ? (dependencyCount.value * 0.0005) : 0;
  
  return (baseFee + crossEcosystemFee + dependencyFee).toFixed(5);
}

function calculateGasFee() {
  // Gas fee multiplier based on priority
  let gasMultiplier = 1;
  switch (settings.value.gasPriority) {
    case 'low': gasMultiplier = 0.8; break;
    case 'medium': gasMultiplier = 1; break;
    case 'high': gasMultiplier = 1.5; break;
  }
  
  // Base gas estimate
  const baseGas = 0.001;
  
  // Destination chain gas adjustment
  let chainMultiplier = 1;
  switch (destChain.value) {
    case 'ethereum': chainMultiplier = 2; break;
    case 'polygon': chainMultiplier = 0.5; break;
    case 'avalanche': chainMultiplier = 0.7; break;
    case 'bsc': chainMultiplier = 0.4; break;
    case 'arbitrum': chainMultiplier = 0.6; break;
    case 'solana': chainMultiplier = 0.2; break;
  }
  
  return (baseGas * gasMultiplier * chainMultiplier).toFixed(5);
}

function calculateTotalFee() {
  const bridgeFee = parseFloat(calculateBridgeFee());
  const gasFee = parseFloat(calculateGasFee());
  return (bridgeFee + gasFee).toFixed(5);
}

function isCrossEcosystem() {
  // Check if bridging between different ecosystems (e.g., EVM to non-EVM)
  const evmChains = ['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum'];
  const isSourceEvm = evmChains.includes(sourceChain.value);
  const isDestEvm = evmChains.includes(destChain.value);
  
  return isSourceEvm !== isDestEvm;
}

function getBridgeStatusText() {
  if (bridgeProgress.value < 25) {
    return 'Initializing bridge';
  } else if (bridgeProgress.value < 50) {
    return 'Preparing content';
  } else if (bridgeProgress.value < 75) {
    return `Transferring to ${getChainName(destChain.value)}`;
  } else {
    return 'Finalizing';
  }
}

function getChainName(chainId) {
  const chain = availableChains.find(c => c.id === chainId);
  return chain ? chain.name : chainId;
}

async function initiatePortPlanck() {
  if (isBridging.value || !isValidBridge.value) return;
  
  try {
    isBridging.value = true;
    bridgeError.value = '';
    bridgeProgress.value = 0;
    
    // Simulate the bridging process with steps
    await simulateBridgingProcess();
    
    // Emit success event
    emit('bridgeComplete', {
      content: props.content,
      sourceChain: sourceChain.value,
      destinationChain: destChain.value,
      settings: { ...settings.value }
    });
    
    // Close the dialog
    setTimeout(() => {
      closeBridge();
    }, 1000);
    
  } catch (error) {
    console.error('Bridge error:', error);
    bridgeError.value = error.message || 'Failed to complete bridging process';
    bridgeProgress.value = 0;
  } finally {
    isBridging.value = false;
  }
}

async function simulateBridgingProcess() {
  // Simulate the bridging process with progressive updates
  let progress = 0;
  
  const updateProgress = (increment) => {
    return new Promise(resolve => {
      const interval = setInterval(() => {
        progress += 1;
        bridgeProgress.value = progress;
        
        if (progress >= increment) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  };
  
  // Step 1: Initialize bridge - 20%
  await updateProgress(20);
  
  // Step 2: Prepare content data - 40%
  await updateProgress(40);
  
  // Step 3: Transfer to destination chain - 70%
  await updateProgress(70);
  
  // Step 4: Finalize - 100%
  await updateProgress(100);
  
  // Simulate a random failure (10% chance)
  if (Math.random() < 0.1) {
    throw new Error('Bridge connection interrupted. Please try again.');
  }
  
  return true;
}

function closeBridge() {
  if (isBridging.value && bridgeProgress.value > 0 && bridgeProgress.value < 100) {
    // Confirm cancellation if bridge is in progress
    const confirmed = confirm('Bridging is in progress. Are you sure you want to cancel?');
    if (!confirmed) return;
  }
  
  emit('close');
}
</script>

<style scoped>
.port-planck-bridge {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 25px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  width: 650px;
  max-width: 95%;
  max-height: 90vh;
  overflow-y: auto;
}

.bridge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.bridge-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.4rem;
}

.version {
  font-size: 0.8rem;
  color: #666;
  font-weight: normal;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
  padding: 5px;
}

.close-btn:hover {
  opacity: 1;
}

.bridge-error {
  background-color: #ffebee;
  color: #d32f2f;
  padding: 10px 15px;
  border-radius: 6px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.chain-selection {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.chain-from, .chain-to {
  flex: 1;
}

.chain-from label, .chain-to label {
  display: block;
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 8px;
}

.chain-selector {
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 6px;
  padding: 6px 10px;
  border: 1px solid #ddd;
}

.chain-selector img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-right: 8px;
}

.chain-selector select {
  flex-grow: 1;
  border: none;
  background: none;
  font-size: 1rem;
  outline: none;
  cursor: pointer;
}

.chain-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1976d2;
  font-size: 1.2rem;
}

.content-details {
  display: flex;
  gap: 15px;
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.content-thumbnail {
  width: 120px;
  height: 80px;
  overflow: hidden;
  border-radius: 6px;
  flex-shrink: 0;
}

.content-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  background-color: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  font-size: 1.5rem;
}

.content-info {
  flex-grow: 1;
}

.content-info h4 {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
}

.content-info p {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 0.9rem;
}

.content-metrics {
  display: flex;
  gap: 15px;
  font-size: 0.85rem;
}

.payment-rate {
  color: #2e7d32;
}

.protocol {
  color: #1976d2;
}

.bridge-info {
  margin-top: 8px;
}

.bridge-info p {
  font-size: 0.85rem;
  color: #1976d2;
  font-style: italic;
}

.bridge-settings {
  margin-bottom: 20px;
}

.bridge-settings h4 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  color: #333;
}

.setting-group {
  margin-bottom: 15px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.setting-desc {
  margin: 4px 0 0 24px;
  font-size: 0.85rem;
  color: #666;
}

.setting-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  background-color: white;
  cursor: pointer;
}

.bridge-fees {
  background-color: #f5f5f5;
  border-radius: 6px;
  padding: 12px 15px;
  margin-top: 15px;
}

.fee-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  padding: 5px 0;
}

.fee-item.total {
  border-top: 1px solid #ddd;
  margin-top: 5px;
  padding-top: 8px;
  font-weight: bold;
}

.bridge-status {
  margin-bottom: 20px;
}

.progress-bar {
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 5px;
}

.progress-fill {
  height: 100%;
  background-color: #1976d2;
  transition: width 0.3s ease;
}

.status-text {
  font-size: 0.9rem;
  color: #666;
  text-align: center;
}

.bridge-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
}

.cancel-btn, .bridge-btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.cancel-btn {
  background-color: #f5f5f5;
  color: #666;
}

.cancel-btn:hover {
  background-color: #e0e0e0;
}

.bridge-btn {
  background-color: #1976d2;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
}

.bridge-btn:hover {
  background-color: #1565c0;
}

.bridge-btn:disabled {
  background-color: #90caf9;
  cursor: not-allowed;
}

.cancel-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Roman theme overrides */
.roman-theme {
  border: 1px solid #d5c3aa;
  background-color: #fcf8f3;
}

.roman-theme .bridge-header {
  border-bottom-color: #d5c3aa;
}

.roman-theme .chain-selector {
  background-color: #f5eee6;
  border-color: #d5c3aa;
}

.roman-theme .chain-arrow {
  color: #8B4513;
}

.roman-theme .content-details {
  background-color: #f5eee6;
}

.roman-theme .thumbnail-placeholder {
  background-color: #e6dac8;
}

.roman-theme .bridge-info p {
  color: #8B4513;
}

.roman-theme .bridge-settings h4 {
  color: #8B4513;
}

.roman-theme .bridge-fees {
  background-color: #f5eee6;
}

.roman-theme .fee-item.total {
  border-top-color: #d5c3aa;
}

.roman-theme .progress-fill {
  background-color: #8B4513;
}

.roman-theme .bridge-btn {
  background-color: #8B4513;
}

.roman-theme .bridge-btn:hover {
  background-color: #A0522D;
}

.roman-theme .bridge-btn:disabled {
  background-color: #D2B48C;
}

@media (max-width: 600px) {
  .chain-selection {
    flex-direction: column;
  }
  
  .chain-arrow {
    transform: rotate(90deg);
    margin: 5px 0;
  }
  
  .content-details {
    flex-direction: column;
  }
  
  .content-thumbnail {
    width: 100%;
    height: 120px;
  }
  
  .bridge-actions {
    flex-direction: column;
    gap: 10px;
  }
  
  .cancel-btn, .bridge-btn {
    width: 100%;
  }
}
</style>
