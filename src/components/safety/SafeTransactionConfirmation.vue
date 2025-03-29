<template>
  <div class="safe-transaction-confirmation" :class="theme">
    <div class="confirmation-header">
      <h3>
        <i class="fas fa-shield-alt"></i> 
        Security Verification
      </h3>
    </div>
    
    <div class="transaction-details">
      <div class="detail-item">
        <div class="detail-label">Transaction Type</div>
        <div class="detail-value">{{ transactionData.type || 'Transfer' }}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Amount</div>
        <div class="detail-value">{{ formatAmount(transactionData.amount) }}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Recipient</div>
        <div class="detail-value recipient">
          <span>{{ formatAddress(transactionData.recipient) }}</span>
          <span class="recipient-status" :class="recipientStatusClass">{{ recipientStatus }}</span>
        </div>
      </div>
      <div class="detail-item" v-if="transactionData.fee">
        <div class="detail-label">Network Fee</div>
        <div class="detail-value">{{ formatAmount(transactionData.fee) }}</div>
      </div>
    </div>
    
    <div v-if="safetyCheck.warnings.length > 0" class="safety-warnings">
      <div class="warnings-header">
        <i class="fas fa-exclamation-triangle"></i>
        Security Warnings
      </div>
      <ul class="warnings-list">
        <li v-for="(warning, index) in safetyCheck.warnings" :key="index">
          <i class="fas fa-exclamation-circle"></i>
          {{ warning }}
        </li>
      </ul>
    </div>
    
    <div class="safety-recommendations" v-if="safetyCheck.recommendations.length > 0">
      <div class="recommendations-header">
        <i class="fas fa-lightbulb"></i>
        Recommendations
      </div>
      <ul class="recommendations-list">
        <li v-for="(recommendation, index) in safetyCheck.recommendations" :key="index">
          {{ recommendation }}
        </li>
      </ul>
    </div>
    
    <div class="safety-status" :class="safetyStatusClass">
      <i :class="safetyStatusIcon"></i>
      <span>{{ safetyStatusMessage }}</span>
    </div>
    
    <div class="verification-actions">
      <label class="verification-checkbox">
        <input type="checkbox" v-model="hasVerified">
        <span>I have verified all transaction details</span>
      </label>
      
      <div class="action-buttons">
        <button 
          class="cancel-btn" 
          @click="$emit('cancel')"
        >
          Cancel
        </button>
        <button 
          class="confirm-btn" 
          :disabled="!canConfirm || confirmingTransaction" 
          @click="confirmTransaction"
        >
          <i v-if="confirmingTransaction" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-shield-alt"></i>
          {{ confirmingTransaction ? 'Processing...' : 'Confirm Secure Transaction' }}
        </button>
      </div>
    </div>
    
    <!-- Countdown for high-risk transactions -->
    <div v-if="showCountdown" class="confirmation-countdown">
      <div class="countdown-bar">
        <div class="countdown-progress" :style="{ width: `${countdownProgress}%` }"></div>
      </div>
      <div class="countdown-text">
        <div>Security check: {{ countdownSeconds }}s remaining</div>
        <div class="countdown-note">
          <i class="fas fa-info-circle"></i>
          High-risk transactions require additional verification time
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, inject } from 'vue';
import { analyzeSafetyForTransaction, getSafetySettings } from '@/services/SafetyService';

const props = defineProps({
  transactionData: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['cancel', 'confirm']);
const theme = inject('currentTheme', 'roman-theme');

// State
const hasVerified = ref(false);
const confirmingTransaction = ref(false);
const countdownSeconds = ref(0);
const countdownProgress = ref(100);
const countdownTimer = ref(null);
const safetyCheck = ref({
  safe: true,
  warnings: [],
  recommendations: [],
  requiresDelay: false,
  delayTimeMs: 0
});

// Perform safety check when component is mounted
onMounted(() => {
  performSafetyCheck();
});

// Clean up timer on unmount
onUnmounted(() => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value);
  }
});

// Computed properties
const recipientStatus = computed(() => {
  if (props.transactionData.recipientVerified) {
    return 'Verified';
  } else if (props.transactionData.recipientKnown) {
    return 'Known';
  }
  return 'Unverified';
});

const recipientStatusClass = computed(() => {
  if (props.transactionData.recipientVerified) {
    return 'verified';
  } else if (props.transactionData.recipientKnown) {
    return 'known';
  }
  return 'unverified';
});

const safetyStatusClass = computed(() => {
  if (!safetyCheck.value.safe) {
    return 'status-warning';
  }
  
  if (safetyCheck.value.warnings.length > 0) {
    return 'status-caution';
  }
  
  return 'status-safe';
});

const safetyStatusIcon = computed(() => {
  if (!safetyCheck.value.safe) {
    return 'fas fa-exclamation-circle';
  }
  
  if (safetyCheck.value.warnings.length > 0) {
    return 'fas fa-exclamation-triangle';
  }
  
  return 'fas fa-check-circle';
});

const safetyStatusMessage = computed(() => {
  if (!safetyCheck.value.safe) {
    return 'High-risk transaction detected';
  }
  
  if (safetyCheck.value.warnings.length > 0) {
    return 'Proceed with caution';
  }
  
  return 'Transaction appears safe';
});

const canConfirm = computed(() => {
  return hasVerified.value && countdownSeconds.value === 0;
});

const showCountdown = computed(() => {
  return countdownSeconds.value > 0;
});

// Methods
function performSafetyCheck() {
  // Use the safety service to analyze transaction
  const analysis = analyzeSafetyForTransaction(props.transactionData);
  
  // Update local state with analysis results
  safetyCheck.value = analysis;
  
  // Start countdown timer if needed
  if (analysis.requiresDelay && analysis.delayTimeMs > 0) {
    startCountdownTimer(analysis.delayTimeMs);
  }
}

function startCountdownTimer(delayMs) {
  const totalSeconds = Math.ceil(delayMs / 1000);
  countdownSeconds.value = totalSeconds;
  
  // Set up the interval
  countdownTimer.value = setInterval(() => {
    if (countdownSeconds.value > 0) {
      countdownSeconds.value -= 1;
      countdownProgress.value = (countdownSeconds.value / totalSeconds) * 100;
    } else {
      clearInterval(countdownTimer.value);
    }
  }, 1000);
}

function formatAmount(amount) {
  if (!amount) return '0 ETH';
  return `${amount} ETH`;
}

function formatAddress(address) {
  if (!address) return 'Unknown Address';
  if (address.length > 20) {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
  return address;
}

async function confirmTransaction() {
  if (!canConfirm.value) return;
  
  confirmingTransaction.value = true;
  
  try {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Emit confirmation event
    emit('confirm', props.transactionData);
  } catch (error) {
    console.error('Error confirming transaction:', error);
  } finally {
    confirmingTransaction.value = false;
  }
}
</script>

<style scoped>
.safe-transaction-confirmation {
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 3px 15px rgba(0, 0, 0, 0.1);
  padding: 20px;
  max-width: 500px;
  width: 100%;
}

.confirmation-header {
  margin-bottom: 20px;
  text-align: center;
}

.confirmation-header h3 {
  margin: 0;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #333;
}

.transaction-details {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-size: 0.9rem;
  color: #666;
}

.detail-value {
  font-weight: 600;
  font-size: 0.9rem;
}

.detail-value.recipient {
  display: flex;
  align-items: center;
  gap: 8px;
}

.recipient-status {
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
}

.recipient-status.verified {
  background-color: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.recipient-status.known {
  background-color: rgba(52, 152, 219, 0.1);
  color: #3498db;
}

.recipient-status.unverified {
  background-color: rgba(243, 156, 18, 0.1);
  color: #f39c12;
}

.safety-warnings {
  background-color: rgba(231, 76, 60, 0.05);
  border: 1px solid rgba(231, 76, 60, 0.2);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.warnings-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e74c3c;
  font-weight: 600;
  margin-bottom: 10px;
}

.warnings-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.warnings-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: #333;
}

.warnings-list li i {
  color: #e74c3c;
  margin-top: 3px;
}

.safety-recommendations {
  background-color: rgba(52, 152, 219, 0.05);
  border: 1px solid rgba(52, 152, 219, 0.2);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.recommendations-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #3498db;
  font-weight: 600;
  margin-bottom: 10px;
}

.recommendations-list {
  margin: 0;
  padding: 0 0 0 25px;
  font-size: 0.9rem;
}

.recommendations-list li {
  margin-bottom: 8px;
}

.safety-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-weight: 600;
}

.status-safe {
  background-color: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.status-caution {
  background-color: rgba(243, 156, 18, 0.1);
  color: #f39c12;
}

.status-warning {
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.verification-actions {
  margin-top: 25px;
}

.verification-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  cursor: pointer;
  font-size: 0.95rem;
}

.verification-checkbox input {
  width: 18px;
  height: 18px;
}

.action-buttons {
  display: flex;
  gap: 15px;
}

.cancel-btn, .confirm-btn {
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.cancel-btn {
  background-color: #f5f5f5;
  color: #333;
  flex: 1;
}

.cancel-btn:hover {
  background-color: #e0e0e0;
}

.confirm-btn {
  background-color: #2ecc71;
  color: white;
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.confirm-btn:hover:not(:disabled) {
  background-color: #27ae60;
}

.confirm-btn:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.confirmation-countdown {
  margin-top: 20px;
  border-top: 1px solid #eee;
  padding-top: 20px;
}

.countdown-bar {
  height: 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.countdown-progress {
  height: 100%;
  background-color: #3498db;
  border-radius: 4px;
  transition: width 1s linear;
}

.countdown-text {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #666;
  align-items: center;
}

.countdown-note {
  font-size: 0.8rem;
  color: #999;
  display: flex;
  align-items: center;
  gap: 5px;
}

/* Roman theme overrides */
.roman-theme {
  border: 1px solid #d5c3aa;
}

.roman-theme .transaction-details {
  background-color: #f8f5f0;
}

.roman-theme .recipient-status.verified {
  background-color: rgba(107, 142, 35, 0.1);
  color: #6B8E23;
}

.roman-theme .recipient-status.known {
  background-color: rgba(139, 69, 19, 0.1);
  color: #8B4513;
}

.roman-theme .safety-warnings {
  background-color: rgba(178, 34, 34, 0.05);
  border-color: rgba(178, 34, 34, 0.2);
}

.roman-theme .warnings-header,
.roman-theme .warnings-list li i {
  color: #B22222;
}

.roman-theme .safety-recommendations {
  background-color: rgba(139, 69, 19, 0.05);
  border-color: rgba(139, 69, 19, 0.2);
}

.roman-theme .recommendations-header {
  color: #8B4513;
}

.roman-theme .status-safe {
  background-color: rgba(107, 142, 35, 0.1);
  color: #6B8E23;
}

.roman-theme .status-caution {
  background-color: rgba(205, 133, 63, 0.1);
  color: #CD853F;
}

.roman-theme .status-warning {
  background-color: rgba(178, 34, 34, 0.1);
  color: #B22222;
}

.roman-theme .confirm-btn {
  background-color: #6B8E23;
}

.roman-theme .confirm-btn:hover:not(:disabled) {
  background-color: #556B2F;
}

.roman-theme .countdown-progress {
  background-color: #8B4513;
}

.roman-theme .confirmation-countdown {
  border-top-color: #d5c3aa;
}
</style>
