<template>
  <div class="satoshi-streaming-payment">
    <div class="payment-header">
      <h3>{{ title || 'Pay with Bitcoin' }}</h3>
      <div class="payment-amount">
        <strong>{{ formattedAmount }}</strong>
        <div class="payment-fiat" v-if="fiatAmount">≈ {{ fiatAmount }}</div>
      </div>
    </div>
    
    <div class="payment-details" v-if="showDetails">
      <div class="detail-row">
        <span class="detail-label">Content</span>
        <span class="detail-value">{{ contentTitle }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Creator</span>
        <span class="detail-value creator-info">
          <span v-if="creatorEnsName" class="creator-ens">{{ creatorEnsName }}</span>
          <span v-else>{{ creatorName }}</span>
          <img v-if="creatorEnsAvatar" :src="creatorEnsAvatar" class="creator-avatar" alt="Creator" />
        </span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Duration</span>
        <span class="detail-value">{{ duration }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Rate</span>
        <span class="detail-value">{{ rate }} sats/minute</span>
      </div>
    </div>

    <div class="payment-options">
      <div class="option-tabs">
        <button 
          class="tab-button" 
          :class="{ 'active': selectedOption === 'wallet' }" 
          @click="selectedOption = 'wallet'"
        >
          My Wallet
        </button>
        <button 
          class="tab-button" 
          :class="{ 'active': selectedOption === 'qr' }" 
          @click="selectedOption = 'qr'"
        >
          QR Code
        </button>
      </div>

      <div class="option-content">
        <div v-if="selectedOption === 'wallet'" class="wallet-option">
          <div class="wallet-balance">
            <span>Available Balance: {{ formatSatoshi(walletBalance) }}</span>
            <span v-if="isInsufficientBalance" class="insufficient-balance">Insufficient balance</span>
          </div>
          <button 
            class="pay-button" 
            :disabled="isPaymentProcessing || isInsufficientBalance" 
            @click="handleWalletPayment"
          >
            <span v-if="isPaymentProcessing" class="loading-spinner"></span>
            <span v-else>Pay with Wallet</span>
          </button>
        </div>

        <div v-else-if="selectedOption === 'qr'" class="qr-option">
          <div class="qr-placeholder"></div>
          <div class="qr-instructions">
            Scan with your Bitcoin wallet app
          </div>
        </div>
      </div>
    </div>

    <div class="payment-status" v-if="paymentStatus">
      <div class="status-icon" :class="paymentStatus.type">
        <span v-if="paymentStatus.type === 'success'">✓</span>
        <span v-else-if="paymentStatus.type === 'error'">×</span>
        <span v-else>⟳</span>
      </div>
      <div class="status-message">{{ paymentStatus.message }}</div>
      
      <button 
        v-if="paymentStatus.type === 'error'" 
        @click="retryPayment"
        class="retry-button"
        :disabled="isPaymentProcessing"
      >
        <span v-if="isPaymentProcessing" class="loading-spinner"></span>
        <span v-else>Retry</span>
      </button>
    </div>

    <div class="payment-footer">
      <button 
        class="cancel-button" 
        @click="$emit('cancel')" 
        :disabled="isPaymentProcessing"
      >
        Cancel
      </button>
      <div class="provider-info">
        <span>Secured by Bitcoin Lightning Network</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, PropType, onMounted } from 'vue';
import { formatSatoshi } from '../../utils/satoshi-utils';
import { ensService } from '../../services/ENSService';

export default defineComponent({
  name: 'SatoshiStreamingPayment',
  
  props: {
    title: {
      type: String,
      default: ''
    },
    contentId: {
      type: String,
      required: true
    },
    contentTitle: {
      type: String,
      required: true
    },
    creatorName: {
      type: String,
      required: true
    },
    creatorAddress: {
      type: String,
      required: true
    },
    creatorEthAddress: {
      type: String,
      default: ''
    },
    amount: {
      type: Number,
      default: 40000 // Default to 40k satoshi
    },
    duration: {
      type: String,
      default: '10 minutes'
    },
    rate: {
      type: Number,
      default: 4000 // 4000 sats per minute
    },
    fiatCurrency: {
      type: String,
      default: 'USD'
    },
    btcPrice: {
      type: Number,
      default: 0
    },
    walletBalance: {
      type: Number,
      default: 0
    },
    showDetails: {
      type: Boolean,
      default: true
    }
  },
  
  emits: ['cancel', 'payment-complete', 'payment-failed'],
  
  setup(props, { emit }) {
    const selectedOption = ref('wallet');
    const isPaymentProcessing = ref(false);
    const paymentStatus = ref<null | { type: string; message: string }>(null);
    const retryCount = ref(0);
    const maxRetries = 3;
    
    const formattedAmount = computed(() => formatSatoshi(props.amount));
    
    const fiatAmount = computed(() => {
      if (!props.btcPrice) return '';
      const btcValue = props.amount / 100_000_000;
      const fiatValue = btcValue * props.btcPrice;
      return `${props.fiatCurrency} ${fiatValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    });
    
    const isInsufficientBalance = computed(() => {
      return props.walletBalance < props.amount;
    });
    
    const handleWalletPayment = async () => {
      if (isPaymentProcessing.value) return;
      
      isPaymentProcessing.value = true;
      paymentStatus.value = {
        type: 'processing',
        message: 'Processing your payment...'
      };
      
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (isInsufficientBalance.value) {
          throw new Error('Insufficient balance');
        }
        
        if (retryCount.value === 0 && Math.random() < 0.3) {
          throw new Error('Network error. Please try again.');
        }
        
        paymentStatus.value = {
          type: 'success',
          message: 'Payment successful! Starting stream...'
        };
        
        retryCount.value = 0;
        
        emit('payment-complete', {
          contentId: props.contentId,
          amount: props.amount,
          timestamp: Date.now(),
          paymentId: `btc-streaming-${Date.now()}`,
          transactionId: `tx-${Date.now().toString(16)}`
        });
        
      } catch (error) {
        console.error('[SatoshiStreamingPayment]', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Payment failed';
        const canRetry = retryCount.value < maxRetries && 
                        errorMessage !== 'Insufficient balance';
                        
        paymentStatus.value = {
          type: 'error',
          message: `${errorMessage}${canRetry ? ' You can retry the payment.' : ''}`
        };
        
        emit('payment-failed', {
          contentId: props.contentId,
          error: errorMessage,
          canRetry
        });
      } finally {
        isPaymentProcessing.value = false;
      }
    };
    
    const retryPayment = async () => {
      if (retryCount.value < maxRetries) {
        retryCount.value++;
        paymentStatus.value = {
          type: 'processing',
          message: `Retrying payment (attempt ${retryCount.value} of ${maxRetries})...`
        };
        
        await handleWalletPayment();
      }
    };
    
    // ENS related state
    const creatorEnsName = ref('');
    const creatorEnsAvatar = ref('');
    const isLoadingEns = ref(false);
    
    // Load ENS data if ethereum address is provided
    onMounted(async () => {
      if (props.creatorEthAddress) {
        await loadCreatorEnsData();
      }
    });
    
    const loadCreatorEnsData = async () => {
      if (!props.creatorEthAddress) return;
      
      isLoadingEns.value = true;
      
      try {
        // Initialize ENS service if needed
        if (!ensService.isInitialized) {
          await ensService.initialize('https://mainnet.infura.io/v3/YOUR_INFURA_KEY');
        }
        
        // Get ENS profile
        const profile = await ensService.getProfile(props.creatorEthAddress);
        
        if (profile) {
          creatorEnsName.value = profile.name;
          creatorEnsAvatar.value = profile.avatar || '';
        }
      } catch (error) {
        console.error('Error loading creator ENS data:', error);
      } finally {
        isLoadingEns.value = false;
      }
    };
    
    return {
      selectedOption,
      isPaymentProcessing,
      paymentStatus,
      formattedAmount,
      fiatAmount,
      isInsufficientBalance,
      handleWalletPayment,
      retryPayment,
      formatSatoshi,
      creatorEnsName,
      creatorEnsAvatar
    };
  }
});
</script>

<style scoped>
.satoshi-streaming-payment {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  max-width: 400px;
  margin: 0 auto;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.payment-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.payment-header h3 {
  margin: 0 0 0.5rem;
  color: #333;
  font-weight: 600;
}

.payment-amount {
  font-size: 1.8rem;
  color: #f7931a;
}

.payment-fiat {
  font-size: 0.9rem;
  color: #666;
  margin-top: 0.25rem;
}

.payment-details {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  color: #666;
  flex: 1;
}

.detail-value {
  color: #333;
  font-weight: 500;
  text-align: right;
  flex: 2;
}

.payment-options {
  margin-bottom: 1.5rem;
}

.option-tabs {
  display: flex;
  border-bottom: 1px solid #ddd;
  margin-bottom: 1rem;
}

.tab-button {
  background: none;
  border: none;
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  color: #666;
  position: relative;
  transition: color 0.2s;
}

.tab-button.active {
  color: #f7931a;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: #f7931a;
}

.option-content {
  padding: 1rem 0;
}

.wallet-balance {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.insufficient-balance {
  color: #e74c3c;
  font-weight: 500;
}

.pay-button {
  width: 100%;
  background: #f7931a;
  border: none;
  color: white;
  padding: 0.75rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.pay-button:hover {
  background: #e78418;
}

.pay-button:disabled {
  background: #f7931a80;
  cursor: not-allowed;
}

.qr-option {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-placeholder {
  width: 200px;
  height: 200px;
  background: repeating-linear-gradient(
    45deg,
    #f7931a22,
    #f7931a22 10px,
    #f7931a11 10px,
    #f7931a11 20px
  );
  margin: 0 auto 1rem;
}

.qr-instructions {
  text-align: center;
  color: #666;
  font-size: 0.9rem;
}

.payment-status {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.status-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.75rem;
  font-weight: bold;
}

.status-icon.success {
  background: #2ecc7122;
  color: #2ecc71;
}

.status-icon.error {
  background: #e74c3c22;
  color: #e74c3c;
}

.status-icon.processing {
  background: #3498db22;
  color: #3498db;
}

.status-message {
  flex: 1;
}

.retry-button {
  background: #3498db;
  border: none;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  margin-left: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.retry-button:hover {
  background: #2980b9;
}

.retry-button:disabled {
  background: #3498db80;
  cursor: not-allowed;
}

.payment-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}

.cancel-button {
  background: none;
  border: 1px solid #ddd;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-button:hover {
  background: #f5f5f5;
}

.cancel-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.provider-info {
  color: #999;
}

/* Loading spinner */
.loading-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ENS Related Styles */
.creator-info {
  display: flex;
  align-items: center;
}

.creator-ens {
  font-weight: 500;
  color: #2c3e50;
}

.creator-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin-left: 8px;
}
</style>
