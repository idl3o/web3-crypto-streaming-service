<template>
  <div class="invest-button-container">
    <button 
      class="invest-button" 
      @click.stop="showInvestOptions = !showInvestOptions"
      :disabled="isDisabled"
      :title="buttonTitle"
    >
      <i class="fas fa-coins"></i>
      <span v-if="showLabel">{{ buttonText }}</span>
    </button>
    
    <div class="investment-popup" v-if="showInvestOptions">
      <div class="popup-header">
        <h4>Invest in Stream</h4>
        <button class="close-btn" @click.stop="showInvestOptions = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div v-if="currentInvestment" class="current-investment">
        <div class="investment-label">Your Investment</div>
        <div class="investment-value">
          {{ formatEth(currentInvestment.amount) }} ETH
          <span class="roi" :class="getRoiClass(currentInvestment.roi)">
            {{ formatRoi(currentInvestment.roi) }}
          </span>
        </div>
      </div>
      
      <div class="quick-amounts">
        <button 
          v-for="amount in quickAmounts" 
          :key="amount"
          class="amount-btn"
          :class="{ active: investAmount === amount }"
          @click.stop="investAmount = amount"
        >
          {{ amount }} ETH
        </button>
        
        <div class="custom-amount">
          <input 
            type="number" 
            v-model.number="investAmount" 
            min="0.001" 
            step="0.001" 
            placeholder="Custom"
          />
        </div>
      </div>
      
      <div class="estimated-returns">
        <div class="returns-label">
          <span>Estimated Returns</span>
          <span class="tooltip-icon" title="Based on past performance and volatility">
            <i class="fas fa-info-circle"></i>
          </span>
        </div>
        <div class="returns-values">
          <div class="return-scenario">
            <div class="scenario-label">Conservative</div>
            <div class="scenario-value">
              {{ formatEth(calculateReturn(investAmount, returnScenarios.conservative)) }} ETH
              <span class="return-percentage">+{{ returnScenarios.conservative }}%</span>
            </div>
          </div>
          <div class="return-scenario">
            <div class="scenario-label">Expected</div>
            <div class="scenario-value">
              {{ formatEth(calculateReturn(investAmount, returnScenarios.expected)) }} ETH
              <span class="return-percentage">+{{ returnScenarios.expected }}%</span>
            </div>
          </div>
          <div class="return-scenario">
            <div class="scenario-label">Optimistic</div>
            <div class="scenario-value">
              {{ formatEth(calculateReturn(investAmount, returnScenarios.optimistic)) }} ETH
              <span class="return-percentage">+{{ returnScenarios.optimistic }}%</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="available-balance">
        Available: {{ formatEth(walletBalance) }} ETH
      </div>
      
      <button 
        class="invest-action-btn" 
        @click.stop="invest"
        :disabled="!isValidAmount"
      >
        <i class="fas fa-check"></i> Confirm Investment
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue';

const props = defineProps({
  contentId: {
    type: [String, Number],
    required: true
  },
  contentTitle: {
    type: String,
    default: 'Stream'
  },
  showLabel: {
    type: Boolean,
    default: true
  },
  currentInvestment: {
    type: Object,
    default: null
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  disabled: {
    type: Boolean,
    default: false
  },
  // Performance metrics to estimate potential returns
  metrics: {
    type: Object,
    default: () => ({
      popularity: 7, // Scale 1-10
      engagement: 6, // Scale 1-10
      growthRate: 5, // Scale 1-10
      volatility: 3  // Scale 1-10 (lower is more stable)
    })
  }
});

const emit = defineEmits(['invest']);
const theme = inject('currentTheme', 'roman-theme');

// State
const showInvestOptions = ref(false);
const investAmount = ref(0.05);

// Quick investment options
const quickAmounts = [0.01, 0.05, 0.1, 0.5];

// Computed properties
const buttonText = computed(() => {
  if (props.currentInvestment) {
    return 'Add Investment';
  }
  return 'Invest';
});

const isDisabled = computed(() => {
  return props.disabled || props.walletBalance <= 0;
});

const buttonTitle = computed(() => {
  if (props.walletBalance <= 0) {
    return 'No funds available for investment';
  }
  if (props.disabled) {
    return 'Investment not available for this stream';
  }
  return props.currentInvestment ? 'Add to your investment' : 'Invest in this stream';
});

const isValidAmount = computed(() => {
  return investAmount.value > 0 && investAmount.value <= props.walletBalance;
});

const returnScenarios = computed(() => {
  // Calculate expected returns based on content metrics
  // This is a simplified model - a real system would use more sophisticated analysis
  const { popularity, engagement, growthRate, volatility } = props.metrics;
  
  // Base return expectations adjusted by metrics
  const baseReturn = (popularity * 0.5 + engagement * 0.3 + growthRate * 0.8) * 1.2;
  
  // Volatility affects the spread between scenarios
  const spread = volatility * 1.5;
  
  return {
    conservative: Math.max(3, Math.round(baseReturn - spread)),
    expected: Math.round(baseReturn),
    optimistic: Math.round(baseReturn + spread * 1.2)
  };
});

// Methods
function calculateReturn(amount, percentage) {
  if (!amount) return 0;
  return amount * (1 + percentage / 100);
}

function formatEth(value) {
  if (value === undefined || value === null) return '0.000';
  return value.toFixed(3);
}

function formatRoi(roi) {
  if (roi === undefined || roi === null) return '';
  const prefix = roi >= 0 ? '+' : '';
  return `${prefix}${roi.toFixed(1)}%`;
}

function getRoiClass(roi) {
  if (!roi) return '';
  return roi >= 0 ? 'positive' : 'negative';
}

function invest() {
  if (!isValidAmount.value) return;
  
  emit('invest', {
    contentId: props.contentId,
    amount: investAmount.value
  });
  
  showInvestOptions.value = false;
}
</script>

<style scoped>
.invest-button-container {
  position: relative;
}

.invest-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: #f39c12;
  color: white;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.invest-button:hover {
  background-color: #e67e22;
}

.invest-button:disabled {
  background-color: #f0ad4e;
  opacity: 0.7;
  cursor: not-allowed;
}

.investment-popup {
  position: absolute;
  bottom: calc(100% + 10px);
  right: 0;
  width: 300px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 3px 15px rgba(0, 0, 0, 0.15);
  padding: 15px;
  z-index: 100;
}

.investment-popup::after {
  content: '';
  position: absolute;
  bottom: -8px;
  right: 20px;
  width: 15px;
  height: 15px;
  background-color: white;
  transform: rotate(45deg);
  box-shadow: 3px 3px 5px rgba(0, 0, 0, 0.05);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.popup-header h4 {
  margin: 0;
  font-size: 1.1rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  opacity: 0.6;
  padding: 4px;
  transition: opacity 0.2s;
}

.close-btn:hover {
  opacity: 1;
}

.current-investment {
  margin-bottom: 15px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.investment-label {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 4px;
}

.investment-value {
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.roi {
  font-size: 0.85rem;
  font-weight: 500;
}

.roi.positive {
  color: #27ae60;
}

.roi.negative {
  color: #e74c3c;
}

.quick-amounts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 15px;
}

.amount-btn {
  padding: 8px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.amount-btn:hover {
  background-color: #e0e0e0;
}

.amount-btn.active {
  background-color: #3498db;
  color: white;
  border-color: #2980b9;
}

.custom-amount {
  grid-column: span 2;
  margin-top: 8px;
}

.custom-amount input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.estimated-returns {
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 6px;
}

.returns-label {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 600;
}

.tooltip-icon {
  color: #666;
  cursor: help;
}

.return-scenario {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 0.85rem;
}

.return-scenario:last-child {
  margin-bottom: 0;
}

.return-percentage {
  color: #27ae60;
  margin-left: 4px;
  font-size: 0.75rem;
}

.available-balance {
  margin-bottom: 12px;
  font-size: 0.85rem;
  color: #666;
  text-align: right;
}

.invest-action-btn {
  width: 100%;
  padding: 10px;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.invest-action-btn:hover {
  background-color: #2ecc71;
}

.invest-action-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

/* Roman theme overrides */
.roman-theme .invest-button {
  background-color: #CD853F;
}

.roman-theme .invest-button:hover {
  background-color: #D2691E;
}

.roman-theme .invest-button:disabled {
  background-color: #DEB887;
}

.roman-theme .amount-btn.active {
  background-color: #8B4513;
  border-color: #A0522D;
}

.roman-theme .invest-action-btn {
  background-color: #6B8E23;
}

.roman-theme .invest-action-btn:hover {
  background-color: #556B2F;
}

.roman-theme .roi.positive {
  color: #6B8E23;
}

.roman-theme .return-percentage {
  color: #6B8E23;
}

.roman-theme .current-investment {
  border-bottom-color: #d5c3aa;
}
</style>
