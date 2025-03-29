<template>
  <div class="content-transaction-history" :class="theme">
    <div v-if="isLoading" class="spinner-container">
      <div class="spinner-sm">
        <i class="fas fa-circle-notch fa-spin"></i>
      </div>
      <p>Loading transactions...</p>
    </div>
    
    <div v-else-if="!transactions.length" class="empty-state">
      <p>No transactions for this content yet.</p>
    </div>
    
    <div v-else>
      <!-- List View -->
      <div v-if="viewMode === 'list'" class="transaction-timeline">
        <div v-for="tx in transactions" :key="tx.id" class="timeline-item">
          <div class="timeline-icon" :class="getIconClass(tx.type)">
            <i :class="getIcon(tx.type)"></i>
          </div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-title">{{ getTitle(tx) }}</span>
              <span class="timeline-amount" :class="getAmountClass(tx)">
                {{ formatAmount(tx) }}
              </span>
            </div>
            <div class="timeline-time">{{ formatTime(tx.timestamp) }}</div>
            
            <!-- Fae discount info -->
            <div v-if="tx.discountApplied && tx.discountApplied > 0" class="discount-info">
              <span class="discount-badge">
                {{ (tx.discountApplied * 100).toFixed(0) }}% Fae discount
                <span class="savings">({{ formatEth(tx.originalAmount - tx.amount) }} ETH saved)</span>
              </span>
            </div>
            
            <!-- Essence earned info -->
            <div v-if="tx.faeEssence" class="essence-info">
              <span class="essence-badge">
                +{{ tx.faeEssence.toFixed(2) }} essence earned
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Cell View -->
      <div v-else class="transaction-grid">
        <div class="transaction-cells">
          <TransactionCell 
            v-for="tx in transactions" 
            :key="tx.id"
            :transaction="tx" 
            :theme="theme" 
            @view-details="showTransactionDetails"
          />
        </div>
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
            <div class="detail-value">{{ getTitle(selectedTransaction) }}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Amount:</div>
            <div class="detail-value" :class="getAmountClass(selectedTransaction)">
              {{ formatAmount(selectedTransaction) }}
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
import { computed, onMounted, ref, inject } from 'vue';
import { useTransactionStore } from '@/stores/transactionStore';
import { Transaction, TransactionType } from '@/services/transactionService';
import TransactionCell from './TransactionCell.vue';

const props = defineProps({
  contentId: {
    type: String,
    required: true
  },
  themeName: {
    type: String,
    default: 'roman-theme'
  },
  viewMode: {
    type: String,
    default: 'list'
  }
});

const theme = computed(() => props.themeName);

const transactionStore = useTransactionStore();
const isLoading = ref(true);
const selectedTransaction = ref<Transaction | null>(null);

// Get transactions for the specific content
const transactions = computed(() => {
  if (!props.contentId) return [];
  return transactionStore.getContentTransactions(props.contentId);
});

// Helper methods
function getIcon(type: TransactionType): string {
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

function getIconClass(type: TransactionType): string {
  switch (type) {
    case TransactionType.STREAM_PAYMENT:
      return 'icon-payment';
    case TransactionType.ESSENCE_EARNED:
      return 'icon-essence';
    case TransactionType.TOKEN_MINTED:
      return 'icon-token';
    case TransactionType.TOKEN_ENCHANTED:
      return 'icon-enchant';
    case TransactionType.FEE_DISCOUNT:
      return 'icon-discount';
    default:
      return 'icon-default';
  }
}

function getTitle(tx: Transaction): string {
  switch (tx.type) {
    case TransactionType.STREAM_PAYMENT:
      return 'Content Streaming Payment';
    case TransactionType.ESSENCE_EARNED:
      return 'Fae Essence Earned';
    case TransactionType.TOKEN_MINTED:
      return 'Fae Token Minted';
    case TransactionType.TOKEN_ENCHANTED:
      return 'Token Enchantment Applied';
    case TransactionType.FEE_DISCOUNT:
      return 'Fee Discount Applied';
    default:
      return 'Transaction';
  }
}

function getAmountClass(tx: Transaction): string {
  if (tx.type === TransactionType.STREAM_PAYMENT) {
    return 'amount-negative';
  } else if (tx.type === TransactionType.ESSENCE_EARNED) {
    return 'amount-positive';
  }
  return '';
}

function formatAmount(tx: Transaction): string {
  if (tx.type === TransactionType.STREAM_PAYMENT) {
    return `-${formatEth(tx.amount)} ETH`;
  } else if (tx.type === TransactionType.ESSENCE_EARNED && tx.faeEssence) {
    return `+${tx.faeEssence.toFixed(2)} Essence`;
  }
  return formatEth(tx.amount);
}

function formatEth(amount: number): string {
  return amount.toFixed(6);
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

onMounted(async () => {
  // Make sure transaction store is initialized
  if (!transactionStore.isInitialized) {
    await transactionStore.initialize();
  }
  isLoading.value = false;
});

// New methods for details modal
function showTransactionDetails(tx: Transaction) {
  selectedTransaction.value = tx;
}

function closeTransactionDetails() {
  selectedTransaction.value = null;
}
</script>

<style scoped>
.roman-theme {
  font-family: 'Cinzel', serif;
  color: #3c2415;
}

.content-transaction-history {
  background-color: #fcf8f3;
  border-radius: 0.25rem;
  padding: 1.5rem;
  box-shadow: 0 1px 4px rgba(120, 90, 60, 0.15);
  border: 1px solid #d5c3aa;
}

.transaction-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e6d6bf;
  padding-bottom: 0.75rem;
}

.transaction-header h5 {
  margin: 0;
  font-size: 1.125rem;
  color: #5D4037;
  font-family: 'Trajan Pro', 'Times New Roman', serif;
  letter-spacing: 1px;
}

.spinner-sm {
  color: #8D6E63;
  font-size: 0.875rem;
}

.empty-state {
  text-align: center;
  padding: 2.5rem 0;
  color: #8D6E63;
  font-style: italic;
}

.transaction-timeline {
  position: relative;
}

.transaction-timeline::before {
  content: '';
  position: absolute;
  left: 16px;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: #d5c3aa;
}

.timeline-item {
  display: flex;
  margin-bottom: 1.5rem;
  position: relative;
}

.timeline-item:last-child {
  margin-bottom: 0;
}

.timeline-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  flex-shrink: 0;
  font-size: 0.875rem;
  z-index: 1;
  border: 2px solid #d5c3aa;
  box-shadow: 0 0 0 4px #fcf8f3;
}

.icon-payment {
  background: linear-gradient(to bottom, #f9e8d5, #e8cbae);
  color: #B71C1C;
}

.icon-essence, .icon-token {
  background: linear-gradient(to bottom, #f9e8d5, #e8cbae);
  color: #D4AF37;
}

.icon-enchant {
  background: linear-gradient(to bottom, #f9e8d5, #e8cbae);
  color: #8B4513;
}

.icon-discount {
  background: linear-gradient(to bottom, #f9e8d5, #e8cbae);
  color: #BF8970;
}

.icon-default {
  background: linear-gradient(to bottom, #f9e8d5, #e8cbae);
  color: #757575;
}

.timeline-content {
  flex: 1;
  min-width: 0;
  background-color: #f9f5ef;
  padding: 1rem;
  border-radius: 0.25rem;
  border: 1px solid #e6d6bf;
  box-shadow: 0 1px 3px rgba(120, 90, 60, 0.1);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid rgba(213, 195, 170, 0.5);
  padding-bottom: 0.5rem;
}

.timeline-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #5D4037;
  font-family: 'Cinzel', serif;
}

.timeline-amount {
  font-size: 0.95rem;
  font-weight: 600;
  font-family: 'Cinzel', serif;
}

.amount-negative {
  color: #B71C1C;
}

.amount-positive {
  color: #2E7D32;
}

.timeline-time {
  font-size: 0.75rem;
  color: #8D6E63;
  margin-bottom: 0.5rem;
  font-style: italic;
}

.discount-info, .essence-info {
  margin-top: 0.5rem;
}

.discount-badge {
  display: inline-block;
  background-color: #F9E7CF;
  color: #8B4513;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  border: 1px solid rgba(213, 195, 170, 0.5);
}

.essence-badge {
  display: inline-block;
  background-color: #F1F8E9;
  color: #33691E;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  border: 1px solid rgba(174, 213, 129, 0.5);
}

.savings {
  color: #2E7D32;
  font-size: 0.75rem;
}

/* Arc theme styles */
.arc-theme {
  font-family: 'Quicksand', sans-serif;
  color: var(--arc-text-primary);
}

.arc-theme.content-transaction-history {
  background-color: #ffffff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(30, 41, 59, 0.08);
  border: none;
}

.arc-theme .transaction-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.75rem;
}

.arc-theme .transaction-header h5 {
  margin: 0;
  font-size: 1.125rem;
  color: #1e293b;
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
}

.arc-theme .empty-state {
  text-align: center;
  padding: 2.5rem 0;
  color: #64748b;
  font-style: normal;
}

.arc-theme .transaction-timeline::before {
  background-color: #e2e8f0;
}

.arc-theme .timeline-icon {
  border-radius: 10px;
  box-shadow: 0 0 0 4px white;
  border: none;
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

.arc-theme .timeline-content {
  background-color: #f8fafc;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(30, 41, 59, 0.05);
  transition: all 0.3s ease;
}

.arc-theme .timeline-content:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(30, 41, 59, 0.05);
}

.arc-theme .timeline-header {
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
}

.arc-theme .timeline-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  color: #1e293b;
}

.arc-theme .discount-badge, .arc-theme .essence-badge {
  border-radius: 50px;
  font-weight: 600;
}

.arc-theme .discount-badge {
  background-color: #eff6ff;
  color: #1e40af;
  border: none;
}

.arc-theme .essence-badge {
  background-color: #ecfdf5;
  color: #047857;
  border: none;
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

.spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
}

/* Modal styles - same as in TransactionHistory component */
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

/* ... remaining modal styles (same as in TransactionHistory) ... */
</style>
