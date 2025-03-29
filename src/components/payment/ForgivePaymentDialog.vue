<template>
  <div class="forgive-payment-dialog">
    <div class="dialog-overlay" v-if="isOpen" @click="closeDialog"></div>
    
    <div class="dialog-container" :class="{ active: isOpen }">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header">
          <h3>Forgive Outstanding Payment</h3>
          <button class="close-button" @click="closeDialog">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="dialog-body">
          <div v-if="loading" class="dialog-loading">
            <div class="spinner">
              <i class="fas fa-circle-notch fa-spin"></i>
            </div>
            <p>Processing...</p>
          </div>
          
          <div v-else-if="result" class="dialog-result">
            <div v-if="result.success" class="result-success">
              <div class="success-icon">
                <i class="fas fa-check-circle"></i>
              </div>
              <h4>Payment Forgiven</h4>
              <p>The amount of {{ result.amount }} {{ result.currency }} has been forgiven for wallet:</p>
              <div class="address-display">{{ shortenAddress(result.address) }}</div>
              <p class="transaction-hash">
                Transaction: <a :href="`https://etherscan.io/tx/${result.transactionHash}`" 
                   target="_blank" rel="noopener noreferrer">{{ shortenAddress(result.transactionHash) }}</a>
              </p>
            </div>
            
            <div v-else class="result-error">
              <div class="error-icon">
                <i class="fas fa-exclamation-circle"></i>
              </div>
              <h4>Forgiveness Failed</h4>
              <p>{{ result.error || 'Unknown error occurred' }}</p>
            </div>
            
            <div class="dialog-actions">
              <button @click="closeDialog" class="btn btn-primary">Close</button>
            </div>
          </div>
          
          <form v-else @submit.prevent="forgivePayment" class="forgive-form">
            <div class="form-group">
              <label for="wallet-address">Wallet Address</label>
              <input 
                type="text" 
                id="wallet-address" 
                v-model="walletAddress" 
                placeholder="0x..."
                required
              >
            </div>
            
            <div class="form-group">
              <label for="amount">Amount to Forgive</label>
              <div class="amount-input-group">
                <input 
                  type="number" 
                  id="amount" 
                  v-model="amount" 
                  step="0.01" 
                  :readonly="useSpecialProgram"
                  required
                >
                <select v-model="currency">
                  <option v-for="(value, key) in currencies.CRYPTO" :key="key" :value="value">{{ value }}</option>
                </select>
              </div>
              <div class="form-note" v-if="useSpecialProgram">
                Amount fixed at 2.55 for special forgiveness program
              </div>
            </div>
            
            <div class="form-group">
              <label>Forgiveness Program</label>
              <div class="checkbox-group">
                <input 
                  type="checkbox" 
                  id="special-program" 
                  v-model="useSpecialProgram" 
                  @change="onSpecialProgramChange"
                >
                <label for="special-program">Use special 2.55 forgiveness program</label>
              </div>
            </div>
            
            <div class="form-group">
              <label for="reason">Reason</label>
              <textarea 
                id="reason" 
                v-model="reason" 
                placeholder="Provide a reason for forgiving this payment..."
                rows="3"
              ></textarea>
            </div>
            
            <div class="form-group form-alert">
              <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                <span>
                  This action will forgive the outstanding payment and cannot be undone.
                  It will be recorded in the blockchain for audit purposes.
                </span>
              </div>
            </div>
            
            <div class="dialog-actions">
              <button type="button" class="btn btn-secondary" @click="closeDialog">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="!isFormValid">
                Forgive Payment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { ethers } from 'ethers';
import * as WorldwidePaymentService from '@/services/WorldwidePaymentService';
import { shortenAddress } from '@/services/NamingService';

export default {
  name: 'ForgivePaymentDialog',
  
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    prefilledAddress: {
      type: String,
      default: ''
    }
  },
  
  emits: ['close', 'forgive-success'],
  
  setup(props, { emit }) {
    const walletAddress = ref(props.prefilledAddress);
    const amount = ref(2.55); // Default to 2.55
    const currency = ref(WorldwidePaymentService.CURRENCIES.CRYPTO.ETH);
    const reason = ref('');
    const useSpecialProgram = ref(true);
    
    const loading = ref(false);
    const result = ref(null);
    
    const currencies = WorldwidePaymentService.CURRENCIES;
    
    // Update wallet address when prefilled address changes
    watch(() => props.prefilledAddress, (newVal) => {
      if (newVal) walletAddress.value = newVal;
    });
    
    // Reset form when dialog opens
    watch(() => props.isOpen, (isOpen) => {
      if (isOpen) {
        resetForm();
        if (props.prefilledAddress) {
          walletAddress.value = props.prefilledAddress;
        }
      }
    });
    
    // Handle special program checkbox change
    const onSpecialProgramChange = () => {
      if (useSpecialProgram.value) {
        amount.value = 2.55;
      }
    };
    
    // Form validation
    const isFormValid = computed(() => {
      if (!walletAddress.value || !amount.value) return false;
      
      // Validate wallet address
      try {
        return ethers.utils.isAddress(walletAddress.value);
      } catch (e) {
        return false;
      }
    });
    
    // Process forgiveness
    const forgivePayment = async () => {
      loading.value = true;
      result.value = null;
      
      try {
        const forgiveResult = await WorldwidePaymentService.forgivePaymentAmount(
          walletAddress.value,
          parseFloat(amount.value),
          currency.value,
          {
            reason: reason.value,
            strictAmount: useSpecialProgram.value
          }
        );
        
        result.value = forgiveResult;
        
        if (forgiveResult.success) {
          emit('forgive-success', forgiveResult);
        }
      } catch (error) {
        result.value = {
          success: false,
          error: error.message,
          address: walletAddress.value,
          amount: amount.value,
          currency: currency.value
        };
      } finally {
        loading.value = false;
      }
    };
    
    const closeDialog = () => {
      emit('close');
    };
    
    const resetForm = () => {
      walletAddress.value = '';
      amount.value = 2.55;
      currency.value = WorldwidePaymentService.CURRENCIES.CRYPTO.ETH;
      reason.value = '';
      useSpecialProgram.value = true;
      result.value = null;
    };
    
    return {
      walletAddress,
      amount,
      currency,
      reason,
      useSpecialProgram,
      loading,
      result,
      currencies,
      isFormValid,
      onSpecialProgramChange,
      forgivePayment,
      closeDialog,
      shortenAddress
    };
  }
};
</script>

<style scoped>
.forgive-payment-dialog {
  font-family: 'Inter', sans-serif;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.dialog-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.dialog-container.active {
  pointer-events: all;
  opacity: 1;
}

.dialog-content {
  background: white;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.dialog-header {
  padding: 16px;
  background: #f5f5f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-button:hover {
  background-color: #eee;
  color: #333;
}

.dialog-body {
  padding: 20px;
}

.dialog-loading {
  text-align: center;
  padding: 30px 0;
}

.spinner {
  font-size: 2rem;
  color: #3498db;
  margin-bottom: 15px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 0.9rem;
}

input[type="text"],
input[type="number"],
textarea,
select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.amount-input-group {
  display: flex;
}

.amount-input-group input {
  flex: 1;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.amount-input-group select {
  width: auto;
  border-left: 0;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  background-color: #f5f5f5;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-group input {
  width: auto;
}

.form-note {
  margin-top: 6px;
  font-size: 0.8rem;
  color: #666;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  padding: 10px 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  border: none;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover {
  background-color: #2980b9;
}

.btn-primary:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #e0e0e0;
  color: #333;
}

.btn-secondary:hover {
  background-color: #ccc;
}

.alert {
  padding: 12px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.alert-info {
  background-color: #d1ecf1;
  color: #0c5460;
}

.result-success,
.result-error {
  text-align: center;
  padding: 20px 0;
}

.success-icon,
.error-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.success-icon {
  color: #2ecc71;
}

.error-icon {
  color: #e74c3c;
}

.address-display {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  margin: 10px 0;
  word-break: break-all;
}

.transaction-hash {
  font-size: 0.9rem;
  margin-top: 15px;
}

.transaction-hash a {
  color: #3498db;
  text-decoration: none;
}

.transaction-hash a:hover {
  text-decoration: underline;
}
</style>
