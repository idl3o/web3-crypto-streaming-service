<template>
  <div class="transaction-history" :class="theme">
    <div class="transaction-filters" v-if="showFilters">
      <div class="filters-header">
        <h4>Transaction History</h4>
        <div class="filter-options">
          <div class="view-toggle-wrapper me-3">
            <div class="view-toggle-buttons">
              <button 
                class="view-toggle-btn" 
                :class="{ active: viewMode === 'list' }" 
                @click="viewMode = 'list'"
                title="List View"
              >
                <i class="fas fa-list"></i>
              </button>
              <button 
                class="view-toggle-btn" 
                :class="{ active: viewMode === 'cell' }" 
                @click="viewMode = 'cell'"
                title="Grid View"
              >
                <i class="fas fa-th"></i>
              </button>
            </div>
          </div>
          
          <div :class="{'btn-group': theme === 'roman-theme', 'arc-tabs': theme === 'arc-theme', 'vacay-tabs': theme === 'vacay-theme'}">
            <button 
              v-for="option in filterOptions" 
              :key="option.value"
              :class="[
                theme === 'roman-theme' ? 'btn btn-sm' : (theme === 'arc-theme' ? 'arc-tab' : 'vacay-tab'),
                currentFilter === option.value ? (theme === 'roman-theme' ? 'btn-primary' : 'active') : (theme === 'roman-theme' ? 'btn-outline-primary' : '')
              ]"
              @click="currentFilter = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Engagement summary section -->
    <div v-if="showEngagementSummary" class="engagement-summary" :class="{ 'arc-stats': theme === 'arc-theme' }">
      <div :class="theme === 'roman-theme' ? 'engagement-stat-card' : 'arc-stat'">
        <div v-if="theme === 'roman-theme'" class="stat-icon"><i class="fas fa-hand-point-up"></i></div>
        <div v-if="theme === 'arc-theme'" class="arc-stat-label">Reactions</div>
        <div :class="theme === 'roman-theme' ? 'stat-value' : 'arc-stat-value'">{{ engagementStore.totalReactions }}</div>
        <div v-if="theme === 'roman-theme'" class="stat-label">Reactions</div>
      </div>
      <div :class="theme === 'roman-theme' ? 'engagement-stat-card' : 'arc-stat'">
        <div v-if="theme === 'roman-theme'" class="stat-icon"><i class="fas fa-star"></i></div>
        <div v-if="theme === 'arc-theme'" class="arc-stat-label">Reviews</div>
        <div :class="theme === 'roman-theme' ? 'stat-value' : 'arc-stat-value'">{{ engagementStore.totalReviews }}</div>
        <div v-if="theme === 'roman-theme'" class="stat-label">Reviews</div>
      </div>
      <div :class="theme === 'roman-theme' ? 'engagement-stat-card' : 'arc-stat'">
        <div v-if="theme === 'roman-theme'" class="stat-icon"><i class="fas fa-bookmark"></i></div>
        <div v-if="theme === 'arc-theme'" class="arc-stat-label">Saved</div>
        <div :class="theme === 'roman-theme' ? 'stat-value' : 'arc-stat-value'">{{ engagementStore.totalHighlights }}</div>
        <div v-if="theme === 'roman-theme'" class="stat-label">Saved</div>
      </div>
    </div>

    <div class="transaction-stats" :class="{ 'arc-stats': theme === 'arc-theme' }">
      <div :class="theme === 'roman-theme' ? 'stat-card' : 'arc-stat'">
        <div v-if="theme === 'roman-theme'" class="stat-icon"><i class="fas fa-coins"></i></div>
        <div v-if="theme === 'arc-theme'" class="arc-stat-label">Total Spent</div>
        <div :class="theme === 'roman-theme' ? 'stat-value' : 'arc-stat-value'">{{ formatEth(totalSpent) }} ETH</div>
        <div v-if="theme === 'roman-theme'" class="stat-label">Total Spent</div>
      </div>
      <div :class="theme === 'roman-theme' ? 'stat-card' : 'arc-stat'">
        <div v-if="theme === 'roman-theme'" class="stat-icon"><i class="fas fa-percentage"></i></div>
        <div v-if="theme === 'arc-theme'" class="arc-stat-label">Fae Savings</div>
        <div :class="theme === 'roman-theme' ? 'stat-value' : 'arc-stat-value'">{{ formatEth(totalSavings) }} ETH</div>
        <div v-if="theme === 'roman-theme'" class="stat-label">Fae Savings</div>
      </div>
      <div :class="theme === 'roman-theme' ? 'stat-card' : 'arc-stat'">
        <div v-if="theme === 'roman-theme'" class="stat-icon"><i class="fas fa-gem"></i></div>
        <div v-if="theme === 'arc-theme'" class="arc-stat-label">Essence Earned</div>
        <div :class="theme === 'roman-theme' ? 'stat-value' : 'arc-stat-value'">{{ totalEssenceEarned.toFixed(2) }}</div>
        <div v-if="theme === 'roman-theme'" class="stat-label">Essence Earned</div>
      </div>
    </div>

    <!-- Add civilization progress section before transaction list -->
    <div v-if="showCivilization" class="civilization-section">
      <CivilizationProgress 
        :theme="themeName" 
        :show-achievements="expandedCivilization" 
        :show-buildings="expandedCivilization"
      />
      
      <div class="civ-toggle-container">
        <button class="civ-toggle-btn" @click="toggleCivilizationDetails">
          {{ expandedCivilization ? 'Less Details' : 'More Details' }}
          <i :class="expandedCivilization ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
        </button>
      </div>
    </div>

    <!-- List View with Virtual Scrolling -->
    <div v-if="viewMode === 'list'" class="transaction-list" :class="{ 'arc-list': theme === 'arc-theme' }">
      <VirtualTransactionList
        v-if="filteredTransactions.length > 20"
        :transactions="filteredTransactions"
        :loading="isLoading"
        :recent-transactions="recentNewTransactions"
        :theme="theme"
        :item-height="160"
        @view-details="showTransactionDetails"
        class="virtual-list"
      />
      
      <div v-else-if="isLoading" class="loading-container">
        <div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i></div>
        <p>Loading transactions...</p>
      </div>
      
      <div v-else-if="filteredTransactions.length === 0" class="no-transactions">
        <i class="fas fa-receipt text-muted mb-2"></i>
        <p>No transactions found.</p>
      </div>
      
      <TransactionItem
        v-else
        v-for="tx in filteredTransactions"
        :key="tx.id"
        :transaction="tx"
        :theme="theme"
        :is-new="isNewTransaction(tx)"
        :is-expanded="expandedTransaction === tx.id"
        @toggle-engagement="toggleTransactionEngagement(tx.id)"
        @view-details="showTransactionDetails(tx)"
      />
    </div>

    <!-- Optimized Cell View with LazyLoading -->
    <div v-else class="transaction-grid">
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i></div>
        <p>Loading transactions...</p>
      </div>
      
      <div v-else-if="filteredTransactions.length === 0" class="no-transactions">
        <i class="fas fa-receipt text-muted mb-2"></i>
        <p>No transactions found.</p>
      </div>
      
      <div v-else class="transaction-cells">
        <LazyTransactionCell 
          v-for="tx in visibleCells" 
          :key="tx.id"
          :transaction="tx" 
          :theme="theme" 
          :class="{'new-transaction-cell': isNewTransaction(tx)}"
          @view-details="showTransactionDetails"
        />
        
        <IntersectionObserver @intersect="loadMoreCells" v-if="hasMoreCells">
          <div class="cell-loading">
            <div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i></div>
            <p>Loading more...</p>
          </div>
        </IntersectionObserver>
      </div>
    </div>

    <!-- Transaction Details Modal -->
    <div v-if="selectedTransaction" class="transaction-modal-backdrop" @click="closeTransactionDetails">
      <div class="transaction-modal" :class="theme" @click.stop>
        <div class="transaction-modal-header">
          <h5>Transaction Details</h5>
          <button class="close-button" @click="closeTransactionDetails">&times;</button>
        </div>
        <div class="transaction-modal-body">
          <div class="detail-row">
            <div class="detail-label">Type:</div>
            <div class="detail-value">{{ getTransactionTitle(selectedTransaction) }}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Amount:</div>
            <div class="detail-value" :class="getAmountClass(selectedTransaction)">
              {{ formatTransactionAmount(selectedTransaction) }}
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Date:</div>
            <div class="detail-value">{{ formatTime(selectedTransaction.timestamp) }}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Status:</div>
            <div class="detail-value">
              <span class="status-badge" :class="getStatusClass(selectedTransaction.status)">
                {{ selectedTransaction.status }}
              </span>
            </div>
          </div>
          <div class="detail-row" v-if="selectedTransaction.contentTitle">
            <div class="detail-label">Content:</div>
            <div class="detail-value">{{ selectedTransaction.contentTitle }}</div>
          </div>
          <div class="detail-row" v-if="selectedTransaction.discountApplied">
            <div class="detail-label">Discount:</div>
            <div class="detail-value">{{ (selectedTransaction.discountApplied * 100).toFixed(0) }}%</div>
          </div>
          <div class="detail-row" v-if="selectedTransaction.faeEssence">
            <div class="detail-label">Essence Earned:</div>
            <div class="detail-value positive">+{{ selectedTransaction.faeEssence.toFixed(2) }}</div>
          </div>
          <div class="detail-row" v-if="selectedTransaction.txHash">
            <div class="detail-label">TX Hash:</div>
            <div class="detail-value hash">{{ selectedTransaction.txHash }}</div>
          </div>
        </div>
        <div class="transaction-modal-footer">
          <button class="btn btn-primary" @click="closeTransactionDetails">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, shallowRef, defineAsyncComponent, onMounted, onUnmounted } from 'vue';
import { Transaction, TransactionType } from '@/services/transactionService';
import { useTransactionStore } from '@/stores/transactionStore';
import { useEngagementStore } from '@/stores/engagementStore';
import VirtualTransactionList from './VirtualTransactionList.vue';
import TransactionItem from './TransactionItem.vue';
import IntersectionObserver from '@/components/shared/IntersectionObserver.vue';
import CivilizationProgress from '@/components/civilization/CivilizationProgress.vue';
import { useCivilizationStore } from '@/stores/civilizationStore';

// Lazy load TransactionCell for better performance
const LazyTransactionCell = defineAsyncComponent(() => 
  import('./TransactionCell.vue')
);

const props = defineProps({
  contentId: {
    type: String,
    default: ''
  },
  showFilters: {
    type: Boolean,
    default: true
  },
  maxTransactions: {
    type: Number,
    default: 0 // 0 means show all
  },
  themeName: {
    type: String,
    default: 'roman-theme'
  },
  showEngagementSummary: {
    type: Boolean,
    default: true
  },
  showCivilization: {
    type: Boolean,
    default: true
  }
});

const theme = computed(() => props.themeName);
const transactionStore = useTransactionStore();
const engagementStore = useEngagementStore();

// Loading state
const isLoading = ref(true);

// Filter options
const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Streaming', value: 'streaming' },
  { label: 'Fae Ecosystem', value: 'fae' }
];

const currentFilter = ref('all');

// Use shallowRef for better performance with large sets
const recentNewTransactions = shallowRef(new Set());

// Expanded transaction for engagement panel
const expandedTransaction = ref(null);

// Watch for new transaction alerts
watch(() => transactionStore.newTransactionAlert, (newTx) => {
  if (newTx) {
    recentNewTransactions.value.add(newTx.id);
    
    // Remove from recent after animation completes
    setTimeout(() => {
      recentNewTransactions.value.delete(newTx.id);
    }, 3000);
  }
});

// Optimized filtered transactions with computation caching
const filteredTransactions = computed(() => {
  let txList = props.contentId 
    ? transactionStore.getContentTransactions(props.contentId)
    : transactionStore.transactions;
  
  if (currentFilter.value === 'streaming') {
    txList = txList.filter(tx => tx.type === TransactionType.STREAM_PAYMENT);
  } else if (currentFilter.value === 'fae') {
    txList = txList.filter(tx => 
      tx.type === TransactionType.ESSENCE_EARNED ||
      tx.type === TransactionType.TOKEN_MINTED ||
      tx.type === TransactionType.TOKEN_ENCHANTED ||
      tx.type === TransactionType.FEE_DISCOUNT
    );
  }
  
  // Apply max limit if specified
  if (props.maxTransactions > 0) {
    txList = txList.slice(0, props.maxTransactions);
  }
  
  return txList;
});

// Cell view pagination
const cellsPerPage = 12;
const currentCellPage = ref(1);
const visibleCells = computed(() => {
  return filteredTransactions.value.slice(0, currentCellPage.value * cellsPerPage);
});
const hasMoreCells = computed(() => {
  return visibleCells.value.length < filteredTransactions.value.length;
});

function loadMoreCells() {
  currentCellPage.value++;
}

// Reset pagination when filters change
watch(currentFilter, () => {
  currentCellPage.value = 1;
});

// Computed values from store
const totalSpent = computed(() => transactionStore.totalSpent);
const totalSavings = computed(() => transactionStore.totalSavings);
const totalEssenceEarned = computed(() => transactionStore.totalEssenceEarned);

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function formatEth(amount: number): string {
  return amount.toFixed(6);
}

function formatDuration(minutes: number): string {
  if (!minutes) return '0m';
  
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}

function getTransactionTitle(tx: Transaction): string {
  switch (tx.type) {
    case TransactionType.STREAM_PAYMENT:
      return 'Content Streaming Payment';
    case TransactionType.ESSENCE_EARNED:
      return 'Fae Essence Earned';
    case TransactionType.TOKEN_MINTED:
      return 'Fae Token Minted';
    case TransactionType.TOKEN_ENCHANTED:
      return 'Fae Token Enchanted';
    case TransactionType.FEE_DISCOUNT:
      return 'Fee Discount Applied';
    default:
      return 'Transaction';
  }
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

function getTransactionIconClass(type: TransactionType): string {
  switch (type) {
    case TransactionType.STREAM_PAYMENT:
      return theme.value === 'roman-theme' ? 'icon-payment' : 'arc-icon-payment';
    case TransactionType.ESSENCE_EARNED:
      return theme.value === 'roman-theme' ? 'icon-essence' : 'arc-icon-essence';
    case TransactionType.TOKEN_MINTED:
      return theme.value === 'roman-theme' ? 'icon-token' : 'arc-icon-token';
    case TransactionType.TOKEN_ENCHANTED:
      return theme.value === 'roman-theme' ? 'icon-enchant' : 'arc-icon-enchant';
    case TransactionType.FEE_DISCOUNT:
      return theme.value === 'roman-theme' ? 'icon-discount' : 'arc-icon-discount';
    default:
      return theme.value === 'roman-theme' ? 'icon-default' : 'arc-icon-default';
  }
}

function getAmountClass(tx: Transaction): string {
  if (tx.type === TransactionType.STREAM_PAYMENT) {
    return 'tx-negative';
  } else if (tx.type === TransactionType.ESSENCE_EARNED) {
    return 'tx-positive';
  }
  return '';
}

function formatTransactionAmount(tx: Transaction): string {
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

function getStatusClass(status: string): string {
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

function isNewTransaction(tx: Transaction): boolean {
  return recentNewTransactions.value.has(tx.id);
}

// View mode for list/cell toggle
const viewMode = ref(localStorage.getItem('tx-view-mode') || 'list');
const selectedTransaction = ref<Transaction | null>(null);

// Save view mode preference
watch(viewMode, (newMode) => {
  localStorage.setItem('tx-view-mode', newMode);
});

// Transaction details methods
function showTransactionDetails(tx: Transaction) {
  selectedTransaction.value = tx;
}

function closeTransactionDetails() {
  selectedTransaction.value = null;
}

// Toggle engagement panel for list view
function toggleTransactionEngagement(transactionId: string) {
  if (expandedTransaction.value === transactionId) {
    expandedTransaction.value = null;
  } else {
    expandedTransaction.value = transactionId;
  }
}

// New state for civilization details
const expandedCivilization = ref(false);

function toggleCivilizationDetails() {
  expandedCivilization.value = !expandedCivilization.value;
}

// Use civilization store to get fee discount
const civStore = useCivilizationStore();
const feeDiscount = computed(() => civStore.feeDiscount);

// Lifecycle hooks
onMounted(() => {
  // Set loading state
  isLoading.value = true;
  
  // Simulate loading delay for better UX with skeleton loader
  setTimeout(() => {
    isLoading.value = false;
  }, 300);
});

onUnmounted(() => {
  // Clean up resources
  expandedTransaction.value = null;
})
</script>

<style scoped>
.roman-theme {
  font-family: 'Cinzel', serif;
  color: #3c2415;
}

.roman-theme h4 {
  font-family: 'Trajan Pro', 'Times New Roman', serif;
  letter-spacing: 1px;
  font-weight: 400;
  color: #8B4513;
}

.transaction-history {
  width: 100%;
  background: #fcf8f3;
  border: 1px solid #d5c3aa;
  padding: 1.5rem;
  border-radius: 0.25rem;
}

.transaction-filters {
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #d5c3aa;
  padding-bottom: 1rem;
}

.filters-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.filters-header h4 {
  margin: 0;
  position: relative;
}

.filters-header h4::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(to right, #d5c3aa, transparent);
  width: 60%;
}

.transaction-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: linear-gradient(to bottom, #f0e6d9 0%, #e6d6bf 100%);
  padding: 1.5rem;
  border-radius: 0.25rem;
  box-shadow: 0 1px 3px rgba(120, 90, 60, 0.2);
  border: 1px solid #d5c3aa;
  flex: 1;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(to right, #8B4513, #D2B48C);
}

.stat-icon {
  color: #8B4513;
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #5D4037;
  margin-bottom: 0.25rem;
  font-family: 'Cinzel', serif;
}

.stat-label {
  font-size: 0.875rem;
  color: #8D6E63;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.transaction-list {
  background-color: #f9f5ef;
  border-radius: 0.25rem;
  box-shadow: 0 1px 3px rgba(120, 90, 60, 0.1);
  border: 1px solid #d5c3aa;
}

.no-transactions {
  padding: 2rem;
  text-align: center;
  color: #8D6E63;
}

.transaction-item {
  display: flex;
  padding: 1rem;
  border-bottom: 1px solid #e6d6bf;
  transition: background-color 0.3s;
}

.transaction-item:last-child {
  border-bottom: none;
}

.transaction-item:hover {
  background-color: #f0e6d9;
}

.new-transaction {
  animation: roman-highlight 3s ease-out;
}

@keyframes roman-highlight {
  0% { background-color: rgba(139, 69, 19, 0.15); }
  100% { background-color: transparent; }
}

.transaction-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  flex-shrink: 0;
  border: 1px solid #d5c3aa;
}

.icon-payment {
  background: linear-gradient(to bottom, #f44336, #c62828);
  color: white;
}

.icon-essence, .icon-token {
  background: linear-gradient(to bottom, #D4AF37, #AA8C2C);
  color: white;
}

.icon-enchant {
  background: linear-gradient(to bottom, #8B4513, #654321);
  color: white;
}

.icon-discount {
  background: linear-gradient(to bottom, #BF8970, #A0715E);
  color: white;
}

.icon-default {
  background: linear-gradient(to bottom, #9E9E9E, #757575);
  color: white;
}

.tx-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  font-family: 'Cinzel', serif;
  color: #5D4037;
}

.tx-amount {
  font-weight: 600;
}

.tx-negative {
  color: #B71C1C;
}

.tx-positive {
  color: #2E7D32;
}

.transaction-details {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #8D6E63;
  margin-bottom: 0.5rem;
}

.discount-info, .stream-details, .essence-details {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.discount-badge {
  display: inline-block;
  background-color: #F9E7CF;
  color: #8B4513;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid #D4AF37;
  font-weight: 500;
}

.savings {
  color: #10b981;
  font-weight: 400;
}

.essence-badge {
  display: inline-block;
  background-color: #ecfdf5;
  color: #047857;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  font-weight: 500;
}

.token-badge {
  display: inline-block;
  background-color: #f3e8ff;
  color: #7e22ce;
  padding: 0.125rem 0.375rem;
  border-radius: 1rem;
  font-size: 0.75rem;
}

.transaction-status {
  margin-left: 1rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-completed {
  background-color: #EAF7EF;
  color: #2E7D32;
  border: 1px solid #81C784;
}

.status-pending {
  background-color: #FFF8E1;
  color: #F57F17;
  border: 1px solid #FFD54F;
}

.status-failed {
  background-color: #FFEBEE;
  color: #B71C1C;
  border: 1px solid #E57373;
}

.btn-group .btn {
  border-color: #d5c3aa;
  color: #8B4513;
}

.btn-group .btn-primary {
  background-color: #8B4513;
  color: #F9E7CF;
}

@media (max-width: 768px) {
  .transaction-stats {
    flex-direction: column;
  }
  
  .transaction-header {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .transaction-details {
    flex-direction: column;
    gap: 0.25rem;
  }
}

/* Arc theme adjustments */
.arc-theme .transaction-history {
  border-radius: 16px;
  border: none;
  background: white;
  box-shadow: var(--arc-shadow);
  padding: 1.5rem;
}

.arc-theme .filters-header {
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--arc-border);
  padding-bottom: 1rem;
}

.arc-theme .filters-header h4 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  color: var(--arc-text-primary);
  margin: 0;
}

.arc-theme .transaction-item {
  border-radius: 12px;
  margin-bottom: 0.75rem;
  border: 1px solid var(--arc-border);
  transition: all 0.3s ease;
}

.arc-theme .transaction-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--arc-shadow-sm);
}

.arc-theme .transaction-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  margin-right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.arc-theme .icon-payment {
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  color: white;
}

.arc-theme .icon-essence, .arc-theme .icon-token {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.arc-theme .icon-enchant {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
}

.arc-theme .icon-discount {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

.arc-theme .tx-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
}

.arc-theme .discount-badge,
.arc-theme .essence-badge {
  border-radius: 50px;
  font-weight: 600;
  font-size: 0.75rem;
}

.arc-theme .status-badge {
  border-radius: 50px;
  font-weight: 600;
}

.arc-theme .status-completed {
  background-color: #d1fae5;
  color: #047857;
  border: none;
}

.arc-theme .status-pending {
  background-color: #fef3c7;
  color: #b45309;
  border: none;
}

.arc-theme .status-failed {
  background-color: #fee2e2;
  color: #b91c1c;
  border: none;
}

@keyframes arc-highlight {
  0% { background-color: rgba(99, 102, 241, 0.15); }
  100% { background-color: transparent; }
}

.arc-theme .new-transaction {
  animation: arc-highlight 3s ease-out;
}

/* View toggle styles */
.view-toggle-wrapper {
  display: flex;
  align-items: center;
}

.view-toggle-buttons {
  display: flex;
  background-color: #f0f0f0;
  border-radius: 4px;
  padding: 2px;
}

.view-toggle-btn {
  border: none;
  background: none;
  padding: 5px 10px;
  cursor: pointer;
  border-radius: 3px;
}

.view-toggle-btn.active {
  background-color: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Cell grid styles */
.transaction-grid {
  width: 100%;
}

.transaction-cells {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

@media (max-width: 576px) {
  .transaction-cells {
    grid-template-columns: 1fr;
  }
}

.new-transaction-cell {
  animation: cell-highlight 3s ease-out;
}

@keyframes cell-highlight {
  0% { box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.5); }
  100% { box-shadow: none; }
}

/* Modal styles */
.transaction-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.transaction-modal {
  width: 90%;
  max-width: 500px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.transaction-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e6e6e6;
}

.transaction-modal-header h5 {
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.transaction-modal-body {
  padding: 1.5rem 1rem;
  max-height: 70vh;
  overflow-y: auto;
}

.detail-row {
  display: flex;
  margin-bottom: 1rem;
}

.detail-label {
  width: 120px;
  font-weight: 600;
}

.detail-value {
  flex: 1;
}

.detail-value.hash {
  word-break: break-all;
  font-family: monospace;
  font-size: 0.9rem;
}

.detail-value.positive {
  color: #10b981;
}

.transaction-modal-footer {
  padding: 1rem;
  border-top: 1px solid #e6e6e6;
  text-align: right;
}

/* Arc theme adjustments */
.arc-theme .view-toggle-buttons {
  background-color: rgba(226, 232, 240, 0.5);
  border-radius: 20px;
}

.arc-theme .view-toggle-btn.active {
  background-color: white;
  box-shadow: var(--arc-shadow-sm);
}

.arc-theme .transaction-modal {
  border-radius: 16px;
  border: none;
  box-shadow: var(--arc-shadow-lg);
}

.arc-theme .transaction-modal-header {
  border-bottom-color: var(--arc-border);
}

.arc-theme .transaction-modal-header h5 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
}

.arc-theme .detail-label {
  color: var(--arc-text-secondary);
}

.arc-theme .transaction-modal-footer {
  border-top-color: var(--arc-border);
}

/* Roman theme adjustments */
.roman-theme .view-toggle-buttons {
  background-color: #f0e6d9;
}

.roman-theme .view-toggle-btn.active {
  background-color: #fcf8f3;
}

.roman-theme .transaction-modal {
  background-color: #fcf8f3;
  border: 1px solid #d5c3aa;
}

.roman-theme .transaction-modal-header,
.roman-theme .transaction-modal-footer {
  border-color: #e6d6bf;
}

.roman-theme .transaction-modal-header h5 {
  font-family: 'Trajan Pro', 'Times New Roman', serif;
  color: #5D4037;
}

.roman-theme .detail-label {
  color: #8D6E63;
  font-family: 'Cinzel', serif;
}

/* Vacay theme adjustments */
.vacay-theme .transaction-history {
  border-radius: 16px;
  border: none;
  background: var(--vacay-card);
  box-shadow: var(--vacay-shadow);
  padding: 1.5rem;
}

.vacay-theme .filters-header {
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--vacay-border);
  padding-bottom: 1rem;
}

.vacay-theme .filters-header h4 {
  font-family: 'Pacifico', cursive;
  font-weight: normal;
  color: var(--vacay-primary);
  margin: 0;
}

.vacay-theme .transaction-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.vacay-theme .stat-card {
  background: linear-gradient(120deg, rgba(255,255,255,0.8) 0%, rgba(247,253,255,0.9) 100%);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: var(--vacay-shadow-sm);
  border: none;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.vacay-theme .stat-card:nth-child(1)::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--vacay-ocean);
}

.vacay-theme .stat-card:nth-child(2)::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--vacay-sunset);
}

.vacay-theme .stat-card:nth-child(3)::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--vacay-palm);
}

.vacay-theme .stat-icon {
  color: var(--vacay-primary);
  font-size: 1.75rem;
  margin-bottom: 0.75rem;
}

.vacay-theme .stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--vacay-text);
  margin-bottom: 0.25rem;
  font-family: 'Poppins', sans-serif;
}

.vacay-theme .stat-label {
  font-size: 0.875rem;
  color: var(--vacay-text-light);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.vacay-theme .transaction-list {
  background-color: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  box-shadow: var(--vacay-shadow-sm);
  border: none;
  overflow: hidden;
}

.vacay-theme .transaction-item {
  background-color: rgba(255, 255, 255, 0.7);
  border-bottom: 1px solid var(--vacay-border);
  transition: all 0.3s ease;
}

.vacay-theme .transaction-item:hover {
  background-color: white;
  transform: translateY(-2px);
  box-shadow: var(--vacay-shadow-sm);
}

.vacay-theme .transaction-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  margin-right: 1rem;
  border: none;
  box-shadow: var(--vacay-shadow-sm);
}

.vacay-theme .icon-payment {
  background: linear-gradient(135deg, var(--vacay-ocean), #29b6f6);
  color: white;
}

.vacay-theme .icon-essence, 
.vacay-theme .icon-token {
  background: linear-gradient(135deg, var(--vacay-palm), #9ccc65);
  color: white;
}

.vacay-theme .icon-enchant {
  background: linear-gradient(135deg, var(--vacay-primary), var(--vacay-secondary));
  color: white;
}

.vacay-theme .icon-discount {
  background: linear-gradient(135deg, var(--vacay-sunset), #ff7043);
  color: white;
}

.vacay-theme .tx-title {
  font-family: 'Poppins', sans-serif;
  font-weight: 500;
  color: var(--vacay-text);
}

.vacay-theme .tx-negative {
  color: var(--vacay-error);
}

.vacay-theme .tx-positive {
  color: var(--vacay-success);
}

.vacay-theme .status-badge {
  border-radius: 50px;
  font-weight: 500;
  font-size: 0.7rem;
  box-shadow: var(--vacay-shadow-sm);
  border: none;
}

.vacay-theme .status-completed {
  background-color: rgba(38, 166, 154, 0.1);
  color: var(--vacay-success);
}

.vacay-theme .status-pending {
  background-color: rgba(255, 183, 77, 0.1);
  color: var(--vacay-warning);
}

.vacay-theme .status-failed {
  background-color: rgba(239, 83, 80, 0.1);
  color: var(--vacay-error);
}

.vacay-theme .discount-badge,
.vacay-theme .essence-badge {
  border-radius: 50px;
  font-weight: 500;
  box-shadow: var(--vacay-shadow-sm);
  border: none;
}

.vacay-theme .discount-badge {
  background-color: rgba(255, 152, 0, 0.1);
  color: var(--vacay-sunset);
}

.vacay-theme .essence-badge {
  background-color: rgba(38, 166, 154, 0.1);
  color: var(--vacay-palm);
}

.vacay-theme .view-toggle-wrapper .view-toggle-buttons {
  background-color: rgba(224, 247, 250, 0.5);
  border-radius: 20px;
}

.vacay-theme .view-toggle-btn.active {
  background-color: white;
  color: var(--vacay-primary);
  box-shadow: var(--vacay-shadow-sm);
}

@keyframes vacay-highlight {
  0% { background-color: rgba(33, 150, 243, 0.15); }
  100% { background-color: transparent; }
}

.vacay-theme .new-transaction {
  animation: vacay-highlight 3s ease-out;
}

/* Transaction cells in vacation theme */
.vacay-theme .transaction-cells {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.vacay-theme .transaction-modal {
  border-radius: 16px;
  border: none;
  background-color: white;
  box-shadow: var(--vacay-shadow-lg);
}

.vacay-theme .transaction-modal-header {
  border-bottom: 1px solid var(--vacay-border);
  padding: 1.25rem;
}

.vacay-theme .transaction-modal-header h5 {
  font-family: 'Pacifico', cursive;
  color: var(--vacay-primary);
}

.vacay-theme .transaction-modal-body {
  padding: 1.5rem;
}

.vacay-theme .transaction-modal-footer {
  border-top: 1px solid var(--vacay-border);
  padding: 1.25rem;
}

/* NEW: Engagement styles for list view */
.transaction-engagement {
  padding: 0.75rem;
  margin-top: 0.5rem;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 0.25rem;
}

.engagement-toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: none;
  border: none;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  margin-left: auto;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-label {
  font-size: 0.7rem;
}

/* Engagement summary stats */
.engagement-summary {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.engagement-stat-card {
  background: linear-gradient(to bottom, #e6f7ff 0%, #cceeff 100%);
  padding: 1.25rem;
  border-radius: 0.25rem;
  box-shadow: 0 1px 3px rgba(120, 90, 60, 0.1);
  border: 1px solid #bce0fd;
  flex: 1;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.engagement-stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(to right, #2196F3, #90CAF9);
}

/* Theme-specific engagement styles */
.roman-theme .engagement-toggle-btn {
  color: #8D6E63;
}

.roman-theme .engagement-toggle-btn:hover {
  color: #5D4037;
  background-color: rgba(213, 195, 170, 0.2);
}

.roman-theme .transaction-engagement {
  background-color: #f9f5ef;
  border: 1px solid #e6d6bf;
}

/* Arc theme engagement styles */
.arc-theme .engagement-toggle-btn {
  color: var(--arc-text-secondary);
}

.arc-theme .engagement-toggle-btn:hover {
  color: var(--arc-text-primary);
  background-color: rgba(226, 232, 240, 0.5);
}

.arc-theme .transaction-engagement {
  background-color: var(--arc-surface);
  border-radius: 0.5rem;
  box-shadow: var(--arc-shadow-sm);
}

/* Vacay theme engagement styles */
.vacay-theme .engagement-toggle-btn {
  color: var(--vacay-text-light);
}

.vacay-theme .engagement-toggle-btn:hover {
  color: var(--vacay-text);
  background-color: rgba(224, 247, 250, 0.3);
}

.vacay-theme .transaction-engagement {
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 0.5rem;
  box-shadow: var(--vacay-shadow-sm);
}

.vacay-theme .engagement-stat-card {
  background: linear-gradient(120deg, rgba(255,255,255,0.7) 0%, rgba(236, 246, 250, 0.8) 100%);
  border: none;
  box-shadow: var(--vacay-shadow-sm);
}

.vacay-theme .engagement-stat-card:nth-child(1)::before {
  background: var(--vacay-ocean);
}

.vacay-theme .engagement-stat-card:nth-child(2)::before {
  background: var(--vacay-sunset);
}

.vacay-theme .engagement-stat-card:nth-child(3)::before {
  background: var(--vacay-primary);
}

/* New styles for loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
  color: #8D6E63;
}

.loading-spinner {
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.cell-loading {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  color: #8D6E63;
}

/* Virtual list styles */
.virtual-list {
  height: 600px;
  border: 1px solid #d5c3aa;
  border-radius: 0.25rem;
  overflow: hidden;
}

.arc-theme .virtual-list {
  border: 1px solid var(--arc-border);
  border-radius: 16px;
  box-shadow: var(--arc-shadow-sm);
}

.vacay-theme .virtual-list {
  border: none;
  border-radius: 12px;
  box-shadow: var(--vacay-shadow);
}

/* Optimized loading states */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 0;
  color: #8D6E63;
  text-align: center;
}

.loading-spinner {
  margin-bottom: 1rem;
  font-size: 1.25rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.no-transactions {
  padding: 2.5rem 0;
  text-align: center;
  color: #8D6E63;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.95rem;
}

.no-transactions i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.arc-theme .no-transactions {
  color: var(--arc-text-secondary);
}

.vacay-theme .no-transactions {
  color: var(--vacay-text-light);
}

.cell-loading {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  color: #8D6E63;
}

/* Civilization section styles */
.civilization-section {
  margin-bottom: 1.5rem;
}

.civ-toggle-container {
  display: flex;
  justify-content: center;
  margin-top: -0.5rem;
}

.civ-toggle-btn {
  background: none;
  border: none;
  font-size: 0.875rem;
  color: #8D6E63;
  cursor: pointer;
  padding: 0.375rem 0.75rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: all 0.2s ease;
}

.civ-toggle-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.roman-theme .civ-toggle-btn {
  color: #8D6E63;
}

.roman-theme .civ-toggle-btn:hover {
  background-color: rgba(213, 195, 170, 0.2);
}

.arc-theme .civ-toggle-btn {
  color: var(--arc-text-secondary);
}

.arc-theme .civ-toggle-btn:hover {
  background-color: rgba(226, 232, 240, 0.5);
}

.vacay-theme .civ-toggle-btn {
  color: var(--vacay-text-light);
}

.vacay-theme .civ-toggle-btn:hover {
  background-color: rgba(224, 247, 250, 0.3);
}
</style>
