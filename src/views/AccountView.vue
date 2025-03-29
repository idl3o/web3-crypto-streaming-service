<template>
  <div class="modal-overlay" v-if="isOpen" @click.self="closeDialog">
    <div class="forgive-dialog" :class="theme">
      <div class="dialog-header">
        <h3>Forgive Payment</h3>
        <button class="close-btn" @click="closeDialog">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div v-if="errorMessage" class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        {{ errorMessage }}
      </div>

      <div class="dialog-body">
        <p class="dialog-info">
          This action will forgive a user's payment obligation. This is typically used for special circumstances
          where a payment should be waived or marked as paid without requiring actual payment.
        </p>
        
        <div class="form-group" :class="{ 'has-error': errors.address }">
          <label for="userAddress">User Address <span class="required">*</span></label>
          <input 
            type="text" 
            id="userAddress" 
            v-model="formData.address" 
            placeholder="0x..." 
            @blur="validateAddress"
          >
          <span class="error-text" v-if="errors.address">{{ errors.address }}</span>
        </div>
        
        <div class="form-group" :class="{ 'has-error': errors.amount }">
          <label for="amount">Amount <span class="required">*</span></label>
          <input 
            type="number" 
            id="amount" 
            v-model.number="formData.amount" 
            placeholder="0.00" 
            step="0.001"
            @blur="validateAmount" 
          >
          <span class="error-text" v-if="errors.amount">{{ errors.amount }}</span>
        </div>
        
        <div class="form-group">
          <label for="currency">Currency</label>
          <select id="currency" v-model="formData.currency">
            <option value="ETH">ETH</option>
            <option value="USDC">USDC</option>
            <option value="DAI">DAI</option>
            <option value="STREAM">STREAM</option>
          </select>
        </div>
        
        <div class="form-group" :class="{ 'has-error': errors.reason }">
          <label for="reason">Reason for Forgiveness <span class="required">*</span></label>
          <textarea 
            id="reason" 
            v-model="formData.reason" 
            rows="3" 
            placeholder="Explain why this payment is being forgiven"
            @blur="validateReason"
          ></textarea>
          <span class="error-text" v-if="errors.reason">{{ errors.reason }}</span>
        </div>
        
        <div class="form-group">
          <div class="confirmation-checkbox">
            <input type="checkbox" id="confirmation" v-model="formData.confirmed">
            <label for="confirmation">I confirm this action is authorized and necessary</label>
          </div>
          <span class="error-text" v-if="errors.confirmed">{{ errors.confirmed }}</span>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn cancel-btn" @click="closeDialog">Cancel</button>
        <button 
          class="btn forgive-btn" 
          @click="handleForgive" 
          :disabled="isSubmitting || !isFormValid"
        >
          <span v-if="isSubmitting">
            <i class="fas fa-spinner fa-spin"></i> Processing...
          </span>
          <span v-else>
            <i class="fas fa-hand-holding-heart"></i> Forgive Payment
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, inject } from 'vue';
import * as BlockchainService from '@/services/BlockchainService';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  prefilledAddress: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'forgive-success']);
const theme = inject('currentTheme', 'roman-theme');

// Form data
const formData = ref({
  address: '',
  amount: '',
  currency: 'ETH',
  reason: '',
  confirmed: false
});

// Validation errors
const errors = ref({
  address: '',
  amount: '',
  reason: '',
  confirmed: ''
});

// State
const isSubmitting = ref(false);
const errorMessage = ref('');

// Watch for changes in prefilledAddress
watch(() => props.prefilledAddress, (newVal) => {
  if (newVal) {
    formData.value.address = newVal;
    validateAddress();
  }
}, { immediate: true });

// Watch for dialog opening to reset form
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resetFormErrors();
    errorMessage.value = '';
    
    // Keep the prefilled address if available
    if (!formData.value.address && props.prefilledAddress) {
      formData.value.address = props.prefilledAddress;
      validateAddress();
    }
  }
});

// Computed properties
const isFormValid = computed(() => {
  return !errors.value.address && 
         !errors.value.amount && 
         !errors.value.reason &&
         formData.value.confirmed &&
         formData.value.address &&
         formData.value.amount > 0 &&
         formData.value.reason;
});

// Validation methods
function validateAddress() {
  const address = formData.value.address.trim();
  
  if (!address) {
    errors.value.address = 'Address is required';
  } else if (!isValidEthereumAddress(address)) {
    errors.value.address = 'Invalid Ethereum address';
  } else {
    errors.value.address = '';
  }
}

function validateAmount() {
  const amount = formData.value.amount;
  
  if (!amount) {
    errors.value.amount = 'Amount is required';
  } else if (isNaN(amount) || amount <= 0) {
    errors.value.amount = 'Amount must be greater than 0';
  } else {
    errors.value.amount = '';
  }
}

function validateReason() {
  const reason = formData.value.reason.trim();
  
  if (!reason) {
    errors.value.reason = 'Reason is required';
  } else if (reason.length < 10) {
    errors.value.reason = 'Please provide a more detailed reason';
  } else {
    errors.value.reason = '';
  }
}

function validateConfirmation() {
  if (!formData.value.confirmed) {
    errors.value.confirmed = 'You must confirm this action';
  } else {
    errors.value.confirmed = '';
  }
}

function validateForm() {
  validateAddress();
  validateAmount();
  validateReason();
  validateConfirmation();
  
  return isFormValid.value;
}

function isValidEthereumAddress(address) {
  // Basic Ethereum address validation (starts with 0x followed by 40 hex characters)
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Action methods
async function handleForgive() {
  if (!validateForm()) {
    return;
  }
  
  try {
    isSubmitting.value = true;
    errorMessage.value = '';
    
    // Call blockchain service to forgive payment
    const result = await forgivePayment(
      formData.value.address,
      formData.value.amount,
      formData.value.currency,
      formData.value.reason
    );
    
    // Emit success event
    emit('forgive-success', {
      address: formData.value.address,
      amount: formData.value.amount,
      currency: formData.value.currency,
      reason: formData.value.reason,
      transactionHash: result.transactionHash
    });
    
    // Reset and close
    resetForm();
    closeDialog();
    
  } catch (error) {
    console.error('Error forgiving payment:', error);
    errorMessage.value = error.message || 'Failed to forgive payment. Please try again.';
  } finally {
    isSubmitting.value = false;
  }
}

function closeDialog() {
  emit('close');
}

function resetForm() {
  formData.value = {
    address: '',
    amount: '',
    currency: 'ETH',
    reason: '',
    confirmed: false
  };
  resetFormErrors();
}

function resetFormErrors() {
  errors.value = {
    address: '',
    amount: '',
    reason: '',
    confirmed: ''
  };
  errorMessage.value = '';
}

// Blockchain service mock (in a real app, this would call the actual blockchain service)
async function forgivePayment(address, amount, currency, reason) {
  // This is a placeholder for the actual blockchain interaction
  // In a real app, this would call BlockchainService methods
  
  console.log(`Forgiving payment of ${amount} ${currency} for ${address}. Reason: ${reason}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Return mock transaction data
  return {
    success: true,
    address,
    amount,
    currency,
    transactionHash: '0x' + Math.random().toString(16).substr(2, 40),
    timestamp: new Date().