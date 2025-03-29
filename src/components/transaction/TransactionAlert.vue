<template>
  <Transition :name="getTransitionName()">
    <div v-if="transaction" class="transaction-alert" :class="[alertClass, getThemeClass()]">
      <div class="alert-content">
        <div class="alert-icon">
          <i :class="getTransactionIcon(transaction.type)"></i>
        </div>
        <div class="alert-message">
          <div class="alert-title">{{ getAlertTitle(transaction) }}</div>
          <div class="alert-details">{{ getAlertDetails(transaction) }}</div>
        </div>
        <button class="alert-close" @click="dismiss">&times;</button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, PropType, inject } from 'vue';
import { Transaction, TransactionType } from '@/services/transactionService';

const props = defineProps({
  transaction: {
    type: Object as PropType<Transaction>,
    default: null
  }
});

const emit = defineEmits(['dismiss']);
const currentTheme = inject('currentTheme', 'roman-theme');

const alertClass = computed(() => {
  if (!props.transaction) return '';
  
  switch (props.transaction.type) {
    case TransactionType.STREAM_PAYMENT:
      return 'alert-payment';
    case TransactionType.ESSENCE_EARNED:
      return 'alert-essence';
    case TransactionType.TOKEN_MINTED:
      return 'alert-token';
    case TransactionType.TOKEN_ENCHANTED:
      return 'alert-enchant';
    case TransactionType.FEE_DISCOUNT:
      return 'alert-discount';
    default:
      return 'alert-default';
  }
});

// Get the correct transition name based on current theme
function getTransitionName() {
  if (currentTheme === 'vacay-theme') {
    return 'vacay-alert';
  } else if (currentTheme === 'arc-theme') {
    return 'arc-alert';
  } else {
    return 'roman-alert';
  }
}

// Get additional class based on theme
function getThemeClass() {
  return currentTheme; 
}

function getTransactionIcon(type: TransactionType): string {
  switch (type) {
    case TransactionType.STREAM_PAYMENT:
      return 'fas fa-play-circle';
    case TransactionType.ESSENCE_EARNED:
      return 'fas fa-star';
    case TransactionType.TOKEN_MINTED:
      return 'fas fa-coins';
    case TransactionType.TOKEN_ENCHANTED:
      return 'fas fa-magic';
    case TransactionType.FEE_DISCOUNT:
      return 'fas fa-percentage';
    default:
      return 'fas fa-exchange-alt';
  }
}

function getAlertTitle(tx: Transaction): string {
  switch (tx.type) {
    case TransactionType.STREAM_PAYMENT:
      return 'Payment Processed';
    case TransactionType.ESSENCE_EARNED:
      return 'Fae Essence Earned';
    case TransactionType.TOKEN_MINTED:
      return 'New Fae Token Minted';
    case TransactionType.TOKEN_ENCHANTED:
      return 'Token Enchantment Applied';
    case TransactionType.FEE_DISCOUNT:
      return 'Fae Discount Applied';
    default:
      return 'Transaction Processed';
  }
}

function getAlertDetails(tx: Transaction): string {
  switch (tx.type) {
    case TransactionType.STREAM_PAYMENT:
      return `You paid ${tx.amount.toFixed(6)} ETH for streaming "${tx.contentTitle || 'content'}"`;
    case TransactionType.ESSENCE_EARNED:
      return `You earned ${tx.faeEssence?.toFixed(2) || 0} essence from streaming`;
    case TransactionType.TOKEN_MINTED:
      return `Successfully minted a new Fae token`;
    case TransactionType.TOKEN_ENCHANTED:
      return `Enchantment applied to token #${tx.tokenId?.substring(0, 4)}`;
    case TransactionType.FEE_DISCOUNT:
      return `You saved ${((tx.originalAmount || 0) - tx.amount).toFixed(6)} ETH with your Fae discount`;
    default:
      return 'Transaction successfully processed';
  }
}

function dismiss() {
  emit('dismiss');
}
</script>

<style scoped>
.roman-theme {
  font-family: 'Cinzel', serif;
}

.transaction-alert {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  width: 350px;
  max-width: calc(100% - 40px);
  background-color: #fcf8f3;
  border-radius: 0.25rem;
  box-shadow: 0 4px 12px rgba(120, 90, 60, 0.2);
  overflow: hidden;
  border: 1px solid #d5c3aa;
}

.alert-content {
  display: flex;
  align-items: center;
  padding: 1.25rem;
}

.alert-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  flex-shrink: 0;
  font-size: 1.25rem;
  border: 1px solid rgba(213, 195, 170, 0.75);
}

.alert-message {
  flex-grow: 1;
}

.alert-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
  font-family: 'Trajan Pro', 'Times New Roman', serif;
  letter-spacing: 0.5px;
  color: #5D4037;
}

.alert-details {
  font-size: 0.875rem;
  color: #8D6E63;
}

.alert-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #A1887F;
  padding: 0 0.5rem;
}

.alert-payment {
  border-left: 4px solid #B71C1C;
}
.alert-payment .alert-icon {
  background-color: #FFEBEE;
  color: #B71C1C;
}

.alert-essence, .alert-token {
  border-left: 4px solid #D4AF37;
}
.alert-essence .alert-icon, .alert-token .alert-icon {
  background-color: #FFF8E1;
  color: #D4AF37;
}

.alert-enchant {
  border-left: 4px solid #8B4513;
}
.alert-enchant .alert-icon {
  background-color: #F9E7CF;
  color: #8B4513;
}

.alert-discount {
  border-left: 4px solid #BF8970;
}
.alert-discount .alert-icon {
  background-color: #EFEBE9;
  color: #BF8970;
}

.alert-default {
  border-left: 4px solid #757575;
}
.alert-default .alert-icon {
  background-color: #F5F5F5;
  color: #757575;
}

.roman-alert-enter-active,
.roman-alert-leave-active {
  transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.roman-alert-enter-from {
  transform: translateX(100%) rotateY(-10deg);
  opacity: 0;
}

.roman-alert-leave-to {
  transform: translateX(100%) rotateY(10deg);
  opacity: 0;
}

/* Vacay theme styles */
.vacay-theme.transaction-alert {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  width: 350px;
  max-width: calc(100% - 40px);
  background-color: white;
  border-radius: 12px;
  box-shadow: var(--vacay-shadow);
  overflow: hidden;
  border: none;
}

.vacay-theme .alert-content {
  padding: 1.25rem;
  display: flex;
  align-items: center;
}

.vacay-theme .alert-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  flex-shrink: 0;
  font-size: 1.25rem;
  border: none;
  background-color: rgba(33, 150, 243, 0.1);
  color: var(--vacay-primary);
}

.vacay-theme .alert-message {
  flex-grow: 1;
}

.vacay-theme .alert-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
  font-family: 'Poppins', sans-serif;
  color: var(--vacay-text);
}

.vacay-theme .alert-details {
  font-size: 0.875rem;
  color: var(--vacay-text-light);
}

.vacay-theme .alert-payment {
  border-top: 4px solid var(--vacay-ocean);
}

.vacay-theme .alert-payment .alert-icon {
  background-color: rgba(33, 150, 243, 0.1);
  color: var(--vacay-ocean);
}

.vacay-theme .alert-essence, .vacay-theme .alert-token {
  border-top: 4px solid var(--vacay-palm);
}

.vacay-theme .alert-essence .alert-icon, .vacay-theme .alert-token .alert-icon {
  background-color: rgba(38, 166, 154, 0.1);
  color: var(--vacay-palm);
}

.vacay-theme .alert-enchant {
  border-top: 4px solid var(--vacay-primary);
}

.vacay-theme .alert-enchant .alert-icon {
  background-color: rgba(33, 150, 243, 0.1);
  color: var(--vacay-primary);
}

.vacay-theme .alert-discount {
  border-top: 4px solid var(--vacay-sunset);
}

.vacay-theme .alert-discount .alert-icon {
  background-color: rgba(255, 152, 0, 0.1);
  color: var(--vacay-sunset);
}

.vacay-theme .alert-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--vacay-text-light);
  padding: 0 0.5rem;
  transition: color 0.2s ease;
}

.vacay-theme .alert-close:hover {
  color: var(--vacay-text);
}

.vacay-alert-enter-active,
.vacay-alert-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.vacay-alert-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.vacay-alert-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
