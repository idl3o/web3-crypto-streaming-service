<template>
  <div class="payment-summary" :class="theme">
    <h3 class="summary-title">Payment Summary</h3>
    
    <div class="summary-content">
      <div class="summary-row">
        <span class="row-label">Base Amount</span>
        <span class="row-value">{{ formatCurrency(paymentDetails.baseAmount) }} {{ paymentDetails.currency }}</span>
      </div>
      
      <div class="summary-row" v-if="paymentDetails.serviceFee > 0">
        <span class="row-label">Service Fee</span>
        <span class="row-value">{{ formatCurrency(paymentDetails.serviceFee) }} {{ paymentDetails.currency }}</span>
      </div>
      
      <div class="summary-row" v-if="paymentDetails.gasCost > 0">
        <span class="row-label">Network Fee</span>
        <span class="row-value">{{ formatCurrency(paymentDetails.gasCost) }} {{ paymentDetails.currency }}</span>
      </div>
      
      <!-- Tax row removed -->
      
      <div class="summary-divider"></div>
      
      <div class="summary-row total">
        <span class="row-label">Total</span>
        <span class="row-value">{{ formatCurrency(paymentDetails.grandTotal) }} {{ paymentDetails.currency }}</span>
      </div>
      
      <div class="tax-free-notice">
        <i class="fas fa-check-circle"></i>
        <span>All transactions are tax-free</span>
      </div>
    </div>
    
    <div class="payment-actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue';

const props = defineProps({
  paymentDetails: {
    type: Object,
    required: true,
    default: () => ({
      baseAmount: 0,
      currency: 'ETH',
      serviceFee: 0,
      gasCost: 0,
      taxAmount: 0,
      subtotal: 0,
      totalFees: 0,
      grandTotal: 0
    })
  }
});

// Get current theme
const theme = inject('currentTheme', 'roman-theme');

function formatCurrency(value) {
  if (value === undefined || value === null) return '0';
  return parseFloat(value).toFixed(6);
}
</script>

<style scoped>
.payment-summary {
  background-color: #f5f7fa;
  border-radius: 10px;
  padding: 20px;
  font-family: 'Inter', sans-serif;
}

.summary-title {
  margin: 0 0 15px 0;
  font-size: 1.2rem;
  color: #2c3e50;
}

.summary-content {
  margin-bottom: 20px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 0.95rem;
}

.row-label {
  color: #7f8c8d;
}

.row-value {
  font-weight: 500;
  color: #2c3e50;
}

.summary-divider {
  height: 1px;
  background-color: #e0e0e0;
  margin: 10px 0;
}

.total {
  font-weight: 600;
  font-size: 1.1rem;
}

.total .row-label,
.total .row-value {
  color: #2c3e50;
}

.tax-free-notice {
  margin-top: 15px;
  padding: 10px;
  background-color: #e1f5fe;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #0288d1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tax-free-notice i {
  color: #0288d1;
}

/* Theme variations */
.roman-theme {
  background-color: #f8f5e6;
}

.roman-theme .summary-title,
.roman-theme .total .row-label,
.roman-theme .total .row-value {
  color: #8B4513;
}

.roman-theme .tax-free-notice {
  background-color: #f5ecd5;
  color: #8B4513;
}

.roman-theme .tax-free-notice i {
  color: #8B4513;
}
</style>
