<template>
  <div 
    class="transaction-item" 
    :class="[
      theme,
      {'new-transaction': isNew},
      {'transaction-expanded': isExpanded},
      getStatusClass(transaction.status)
    ]"
  >
    <div class="transaction-icon" :class="getTransactionIconClass(transaction.type)">
      <i :class="getTransactionIcon(transaction.type)"></i>
    </div>
    
    <div class="transaction-content">
      <div class="transaction-header">
        <h5 class="tx-title">{{ getTransactionTitle(transaction) }}</h5>
        <div class="tx-amount" :class="getAmountClass(transaction)">
          {{ formatTransactionAmount(transaction) }}
        </div>
      </div>
      
      <div class="transaction-details">
        <div class="tx-info">
          {{ transaction.contentTitle || 'N/A' }}
          <span v-if="transaction.tokenId" class="ms-2 token-badge">Token #{{ transaction.tokenId.substring(0, 4) }}</span>
        </div>
        <div class="tx-time">{{ formatTime(transaction.timestamp) }}</div>
      </div>
      
      <div v-if="transaction.discountApplied && transaction.discountApplied > 0" class="discount-info">
        <span class="discount-badge">
          {{ (transaction.discountApplied * 100).toFixed(0) }}% Fae Discount Applied
          <span class="savings">({{ formatEth(transaction.originalAmount - transaction.amount) }} ETH saved)</span>
        </span>
      </div>
      
      <div v-if="transaction.details && transaction.type === 'stream_payment'" class="stream-details">
        <span>{{ formatDuration(transaction.details.timeWatched) }} streamed at {{ formatEth(transaction.details.paymentRate) }} ETH/min</span>
      </div>
      
      <div v-if="transaction.faeEssence" class="essence-details">
        <span class="essence-badge">
          +{{ transaction.faeEssence.toFixed(2) }} Essence Earned
        </span>
      </div>
      
      <!-- Engagement Panel with Lazy Loading -->
      <ClientOnly>
        <Suspense>
          <EngagementPanel 
            v-if="isExpanded"
            :transaction="transaction"
            :theme="theme"
          />
          <template #fallback>
            <div class="engagement-loading">
              <div class="loading-spinner">
                <i class="fas fa-circle-notch fa-spin"></i>
              </div>
            </div>
          </template>
        </Suspense>
      </ClientOnly>
    </div>
    
    <div class="transaction-actions">
      <div class="transaction-status">
        <span class="status-badge" :class="getStatusClass(transaction.status)">
          {{ transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1) }}
        </span>
      </div>
      
      <div class="action-buttons">
        <!-- Engagement toggle button -->
        <button 
          class="engagement-toggle-btn"
          @click="$emit('toggle-engagement')"
          :aria-label="isExpanded ? 'Collapse' : 'Expand'"
        >
          <i :class="isExpanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
          <span class="toggle-label">{{ isExpanded ? 'Less' : 'Engage' }}</span>
        </button>
        
        <button class="details-btn" @click="$emit('view-details')">
          <i class="fas fa-info-circle"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, shallowRef, defineAsyncComponent } from 'vue';
import { TransactionType } from '@/services/transactionService';

// Lazy load engagement panel for better initial load performance
const EngagementPanel = defineAsyncComponent({
  loader: () => import('./EngagementPanel.vue'),
  delay: 200, // Delay to avoid flash during fast loads
  // Use suspense for loading state
  loadingComponent: {
    template: `
      <div class="engagement-loading">
        <div class="loading-spinner">
          <i class="fas fa-circle-notch fa-spin"></i>
        </div>
      </div>
    `
  }
});

// Use shallowRef for complex props that don't need reactivity inside
const props = defineProps({
  transaction: {
    type: Object,
    required: true
  },
  theme: {
    type: String,
    default: 'roman-theme'
  },
  isNew: {
    type: Boolean,
    default: false
  },
  isExpanded: {
    type: Boolean,
    default: false
  }
});

defineEmits(['toggle-engagement', 'view-details']);

// Cache for expensive computations
const iconCache = new Map();
const titleCache = new Map();

// Memoized getters with cached results
const getTransactionIcon = (() => {
  const cache = new Map();
  return (type) => {
    if (cache.has(type)) return cache.get(type);
    
    let icon;
    switch (type) {
      case TransactionType.STREAM_PAYMENT:
        icon = 'fas fa-play-circle';
        break;
      case TransactionType.ESSENCE_EARNED:
        icon = 'fas fa-star';
        break;
      case TransactionType.TOKEN_MINTED:
        icon = 'fas fa-coins';
        break;
      case TransactionType.TOKEN_ENCHANTED:
        icon = 'fas fa-magic';
        break;
      case TransactionType.FEE_DISCOUNT:
        icon = 'fas fa-percentage';
        break;
      default:
        icon = 'fas fa-exchange-alt';
    }
    
    cache.set(type, icon);
    return icon;
  };
})();

const getTransactionIconClass = (() => {
  const cache = new Map();
  return (type) => {
    const cacheKey = `${type}-${props.theme}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    
    let iconClass;
    switch (type) {
      case TransactionType.STREAM_PAYMENT:
        iconClass = props.theme === 'roman-theme' ? 'icon-payment' : 'arc-icon-payment';
        break;
      case TransactionType.ESSENCE_EARNED:
        iconClass = props.theme === 'roman-theme' ? 'icon-essence' : 'arc-icon-essence';
        break;
      case TransactionType.TOKEN_MINTED:
        iconClass = props.theme === 'roman-theme' ? 'icon-token' : 'arc-icon-token';
        break;
      case TransactionType.TOKEN_ENCHANTED:
        iconClass = props.theme === 'roman-theme' ? 'icon-enchant' : 'arc-icon-enchant';
        break;
      case TransactionType.FEE_DISCOUNT:
        iconClass = props.theme === 'roman-theme' ? 'icon-discount' : 'arc-icon-discount';
        break;
      default:
        iconClass = props.theme === 'roman-theme' ? 'icon-default' : 'arc-icon-default';
    }
    
    cache.set(cacheKey, iconClass);
    return iconClass;
  };
})();

const getTransactionTitle = (() => {
  const cache = new Map();
  return (tx) => {
    if (cache.has(tx.type)) return cache.get(tx.type);
    
    let title;
    switch (tx.type) {
      case TransactionType.STREAM_PAYMENT:
        title = 'Content Streaming Payment';
        break;
      case TransactionType.ESSENCE_EARNED:
        title = 'Fae Essence Earned';
        break;
      case TransactionType.TOKEN_MINTED:
        title = 'Fae Token Minted';
        break;
      case TransactionType.TOKEN_ENCHANTED:
        title = 'Fae Token Enchanted';
        break;
      case TransactionType.FEE_DISCOUNT:
        title = 'Fee Discount Applied';
        break;
      default:
        title = 'Transaction';
    }
    
    cache.set(tx.type, title);
    return title;
  };
})();

function getAmountClass(tx) {
  if (tx.type === TransactionType.STREAM_PAYMENT) {
    return 'tx-negative';
  } else if (tx.type === TransactionType.ESSENCE_EARNED) {
    return 'tx-positive';
  }
  return '';
}

function getStatusClass(status) {
  switch (status) {
    case 'completed':
      return 'status-completed';
    case 'pending':
      return 'status-pending';
    case 'failed':
      return 'status-failed';
    default:
      return '';
  }
}

function formatTransactionAmount(tx) {
  if (tx.type === TransactionType.STREAM_PAYMENT) {
    return `-${formatEth(tx.amount)} ETH`;
  } else if (tx.type === TransactionType.ESSENCE_EARNED && tx.faeEssence) {
    return `+${tx.faeEssence.toFixed(2)} Essence`;
  } else if (tx.type === TransactionType.TOKEN_MINTED) {
    return 'New Token';
  } else if (tx.type === TransactionType.TOKEN_ENCHANTED) {
    return 'Enchanted';
  }
  return formatEth(tx.amount);
}

function formatEth(amount) {
  return amount.toFixed(6);
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function formatDuration(minutes) {
  if (!minutes) return '0m';
  
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}
</script>

<style scoped>
/* Base styles and theme-specific styling from TransactionHistory.vue */
.transaction-item {
  display: flex;
  padding: 1rem;
  border-bottom: 1px solid #e6d6bf;
  transition: background-color 0.3s, transform 0.2s, box-shadow 0.2s;
  width: 100%;
}

/* Additional optimization styles */
.transaction-expanded {
  background-color: #f9f7f2;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  z-index: 1;
}

.transaction-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: auto;
}

.engagement-loading {
  padding: 1rem;
  display: flex;
  justify-content: center;
}

.loading-spinner {
  color: #8D6E63;
  font-size: 1rem;
}

.engagement-toggle-btn,
.details-btn {
  background: none;
  border: none;
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.engagement-toggle-btn:hover,
.details-btn:hover {
  opacity: 1;
}

.toggle-label {
  font-size: 0.75rem;
}

/* Additional theme overrides */
.roman-theme.transaction-expanded {
  background-color: #f3efe7;
}

.arc-theme.transaction-expanded {
  background-color: #f8fafc;
}

.vacay-theme.transaction-expanded {
  background-color: rgba(255, 255, 255, 0.9);
}
</style>
