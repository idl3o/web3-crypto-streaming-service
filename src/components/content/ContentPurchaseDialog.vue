<template>
  <div class="purchase-dialog" :class="theme" v-if="isOpen">
    <div class="dialog-overlay" @click="$emit('close')"></div>
    <div class="dialog-content">
      <div class="dialog-header">
        <h3>Purchase Content</h3>
        <button class="close-btn" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="content-preview">
        <div class="content-thumbnail">
          <img v-if="content.thumbnail" :src="content.thumbnail" :alt="content.title" 
              @error="e => e.target.src = 'https://via.placeholder.com/100x60?text=Content'">
          <div v-else class="thumbnail-placeholder">
            <i class="fas fa-photo-video"></i>
          </div>
        </div>
        <div class="content-details">
          <h4>{{ content.title || 'Untitled Content' }}</h4>
          <p class="creator">by {{ content.creator || 'Anonymous' }}</p>
          <div class="content-rating" v-if="content.testimonials && content.testimonials.length">
            <div class="stars">
              <i class="fas fa-star" v-for="i in averageRating" :key="i"></i>
              <i class="far fa-star" v-for="i in (5-averageRating)" :key="i+5"></i>
            </div>
            <span>({{ content.testimonials.length }})</span>
          </div>
        </div>
      </div>

      <div class="payment-breakdown">
        <h3>Payment Breakdown</h3>
        
        <div class="breakdown-row">
          <span>Content price:</span>
          <span>{{ formatAmount(contentPrice) }} {{ currency }}</span>
        </div>
        
        <div class="breakdown-row">
          <span>Service fee:</span>
          <span>{{ formatAmount(serviceFee) }} {{ currency }}</span>
        </div>
        
        <div class="breakdown-row">
          <span>Network fee:</span>
          <span>{{ formatAmount(networkFee) }} {{ currency }}</span>
        </div>
        
        <div class="breakdown-total">
          <span>Total:</span>
          <span>{{ formatAmount(totalAmount) }} {{ currency }}</span>
        </div>
        
        <div class="tax-free-notice">
          <i class="fas fa-check-circle"></i>
          <span>No tax applied - all transactions are tax-free</span>
        </div>
      </div>

      <div class="wallet-selection" v-if="walletConnected">
        <h3>Payment Method</h3>
        <div class="wallet-info">
          <div class="wallet-icon">
            <i class="fas fa-wallet"></i>
          </div>
          <div class="wallet-details">
            <div class="wallet-name">{{ walletName }}</div>
            <div class="wallet-address">{{ formatAddress(walletAddress) }}</div>
          </div>
          <div class="wallet-balance">
            <span>Balance: {{ formatAmount(walletBalance) }} {{ currency }}</span>
          </div>
        </div>
      </div>
      
      <div class="payment-actions">
        <button class="connect-wallet-btn" v-if="!walletConnected" @click="connectWallet">
          <i class="fas fa-wallet"></i> Connect Wallet
        </button>
        <template v-else>
          <button class="cancel-btn" @click="$emit('close')">Cancel</button>
          <button class="purchase-btn" 
            :disabled="walletBalance < totalAmount || isProcessing" 
            @click="processPayment">
            <i class="fas" :class="isProcessing ? 'fa-spinner fa-spin' : 'fa-shopping-cart'"></i>
            {{ isProcessing ? 'Processing...' : 'Purchase Now' }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  content: {
    type: Object,
    default: () => ({})
  },
  walletConnected: {
    type: Boolean,
    default: false
  },
  walletAddress: {
    type: String,
    default: ''
  },
  walletName: {
    type: String,
    default: 'MetaMask'
  },
  walletBalance: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['close', 'connect-wallet', 'purchase']);
const theme = inject('currentTheme', 'roman-theme');

const isProcessing = ref(false);
const currency = ref('ETH');

// Computed properties
const contentPrice = computed(() => {
  // Use content payment rate or a default if not available
  return props.content.paymentRate || 0.005; 
});

const serviceFee = computed(() => {
  return contentPrice.value * 0.025; // 2.5% service fee
});

const networkFee = computed(() => {
  return 0.0005; // Fixed network fee estimation
});

const totalAmount = computed(() => {
  // Total without tax
  return contentPrice.value + serviceFee.value + networkFee.value;
});

const averageRating = computed(() => {
  if (!props.content.testimonials || props.content.testimonials.length === 0) return 0;
  
  const sum = props.content.testimonials.reduce((acc, t) => acc + (t.rating || 0), 0);
  return Math.round(sum / props.content.testimonials.length);
});

// Methods
function formatAmount(amount) {
  if (amount === undefined || amount === null) return '0.000';
  return amount.toFixed(4);
}

function formatAddress(address) {
  if (!address) return '';
  return address.substring(0, 6) + '...' + address.substring(address.length - 4);
}

function connectWallet() {
  emit('connect-wallet');
}

async function processPayment() {
  try {
    isProcessing.value = true;
    
    // Simulate blockchain transaction delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Emit purchase event with details
    emit('purchase', {
      contentId: props.content.id,
      amount: totalAmount.value,
      currency: currency.value,
      timestamp: new Date().toISOString()
    });
    
    // Close the dialog on success (typically parent would handle this)
    isProcessing.value = false;
    emit('close');
  } catch (error) {
    console.error('Payment processing error:', error);
    isProcessing.value = false;
    // In a real app, we would show error message to user
  }
}
</script>

<style scoped>
.purchase-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.dialog-content {
  position: relative;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  width: 500px;
  max-width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 25px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.4rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.6;
}

.close-btn:hover {
  opacity: 1;
}

.content-preview {
  display: flex;
  gap: 15px;
  margin-bottom: 25px;
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
}

.content-thumbnail {
  width: 100px;
  height: 60px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
}

.content-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e0e0e0;
  color: #999;
  font-size: 1.5rem;
}

.content-details {
  flex-grow: 1;
}

.content-details h4 {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
}

.creator {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 0.9rem;
}

.content-rating {
  display: flex;
  align-items: center;
  gap: 5px;
}

.stars {
  color: #FFB400;
  font-size: 0.9rem;
}

.payment-breakdown {
  margin-bottom: 25px;
}

.payment-breakdown h3 {
  margin: 0 0 15px 0;
  font-size: 1.1rem;
}

.breakdown-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 0.95rem;
}

.breakdown-total {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
  font-weight: 600;
  font-size: 1.1rem;
}

.tax-free-notice {
  margin-top: 10px;
  padding: 8px;
  background-color: #e8f5e9;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #2e7d32;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tax-free-notice i {
  font-size: 1rem;
}

.wallet-selection {
  margin-bottom: 25px;
}

.wallet-selection h3 {
  margin: 0 0 15px 0;
  font-size: 1.1rem;
}

.wallet-info {
  display: flex;
  align-items: center;
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
}

.wallet-icon {
  width: 40px;
  height: 40px;
  background-color: #3498db;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
}

.wallet-details {
  margin-left: 15px;
  flex-grow: 1;
}

.wallet-name {
  font-weight: 600;
  margin-bottom: 3px;
}

.wallet-address {
  font-size: 0.85rem;
  color: #666;
}

.wallet-balance {
  font-size: 0.9rem;
  font-weight: 500;
}

.payment-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 20px;
}

.cancel-btn, .purchase-btn, .connect-wallet-btn {
  padding: 10px 20px;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cancel-btn {
  background-color: #f5f5f5;
  color: #333;
}

.cancel-btn:hover {
  background-color: #e0e0e0;
}

.purchase-btn {
  background-color: #4CAF50;
  color: white;
}

.purchase-btn:hover:not(:disabled) {
  background-color: #43A047;
}

.purchase-btn:disabled {
  background-color: #A5D6A7;
  cursor: not-allowed;
}

.connect-wallet-btn {
  background-color: #3498db;
  color: white;
}

.connect-wallet-btn:hover {
  background-color: #2980b9;
}

/* Roman theme overrides */
.roman-theme .dialog-content {
  background-color: #fcf8f3;
  border: 1px solid #d5c3aa;
}

.roman-theme .dialog-header h3 {
  font-family: 'Trajan Pro', 'Times New Roman', serif;
  color: #8B4513;
}

.roman-theme .content-preview {
  background-color: #f5eee6;
}

.roman-theme .breakdown-total {
  border-top-color: #d5c3aa;
}

.roman-theme .stars {
  color: #CD7F32;
}

.roman-theme .tax-free-notice {
  background-color: #f0f5e6;
  color: #6B8E23;
}

.roman-theme .wallet-info {
  background-color: #f5eee6;
}

.roman-theme .wallet-icon {
  background-color: #8B4513;
}

.roman-theme .purchase-btn {
  background-color: #8B4513;
}

.roman-theme .purchase-btn:hover:not(:disabled) {
  background-color: #A0522D;
}

.roman-theme .purchase-btn:disabled {
  background-color: #DEB887;
}

.roman-theme .connect-wallet-btn {
  background-color: #8B4513;
}

.roman-theme .connect-wallet-btn:hover {
  background-color: #A0522D;
}

/* Responsive styles */
@media (max-width: 480px) {
  .content-preview {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .content-thumbnail {
    width: 160px;
    height: 90px;
  }
  
  .wallet-info {
    flex-direction: column;
    text-align: center;
  }
  
  .wallet-details {
    margin: 10px 0;
  }
  
  .payment-actions {
    flex-direction: column;
  }
  
  .cancel-btn, .purchase-btn, .connect-wallet-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>