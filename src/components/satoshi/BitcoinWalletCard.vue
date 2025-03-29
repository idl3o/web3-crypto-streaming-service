<template>
  <div class="bitcoin-wallet-card">
    <div class="wallet-header">
      <h3 class="wallet-title">
        <img src="/assets/images/bitcoin-logo.svg" alt="Bitcoin" class="bitcoin-icon" />
        Bitcoin Wallet
      </h3>
      <div class="wallet-actions">
        <button @click="refreshBalance" class="refresh-button" :disabled="isLoading">
          <span v-if="isLoading" class="loading-spinner"></span>
          <span v-else>↻</span>
        </button>
        <button @click="toggleQRCode" class="qr-toggle">{{ showQR ? 'Hide' : 'Show' }} Address</button>
      </div>
    </div>
    
    <div class="wallet-balance-container">
      <div class="wallet-balance">
        <span class="balance-amount">{{ formattedBalance }}</span>
        <span class="balance-fiat" v-if="fiatBalance">≈ {{ fiatBalance }}</span>
      </div>
      
      <div class="stats">
        <div class="stat-item">
          <span class="stat-label">Pending</span>
          <span class="stat-value">{{ formattedPendingBalance }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Earned this month</span>
          <span class="stat-value">{{ formattedMonthlyEarnings }}</span>
        </div>
      </div>
    </div>
    
    <div v-if="showQR" class="address-container">
      <div class="qr-code">
        <!-- This would be replaced with an actual QR code component -->
        <div class="qr-placeholder"></div>
      </div>
      <div class="address-text">
        <span class="address">{{ truncatedAddress }}</span>
        <button @click="copyAddress" class="copy-button">Copy</button>
      </div>
      <div v-if="addressCopied" class="copied-notification">Address copied!</div>
    </div>
    
    <div class="transaction-list">
      <h4>Recent Transactions</h4>
      <div v-if="transactions.length === 0" class="no-transactions">
        No recent transactions
      </div>
      <div v-else class="transactions">
        <div v-for="tx in transactions" :key="tx.id" class="transaction-item">
          <div class="tx-type" :class="tx.type">
            {{ tx.type === 'received' ? '↓' : '↑' }}
          </div>
          <div class="tx-details">
            <div class="tx-title">{{ tx.title }}</div>
            <div class="tx-date">{{ formatDate(tx.timestamp) }}</div>
          </div>
          <div class="tx-amount" :class="tx.type">
            {{ tx.type === 'received' ? '+' : '-' }}{{ formatSatoshi(tx.amount) }}
          </div>
        </div>
      </div>
    </div>
    
    <div class="wallet-actions-footer">
      <button @click="showSendDialog" class="action-button send-button">Send</button>
      <button @click="showReceiveDialog" class="action-button receive-button">Receive</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { formatSatoshi, satoshiToBtc } from '../../utils/satoshi-utils';

interface Transaction {
  id: string;
  type: 'sent' | 'received';
  title: string;
  amount: number; // in satoshis
  timestamp: number;
  status: 'confirmed' | 'pending';
  txid?: string;
}

export default defineComponent({
  name: 'BitcoinWalletCard',
  props: {
    address: {
      type: String,
      required: true
    },
    initialBalance: {
      type: Number,
      default: 0
    },
    initialPendingBalance: {
      type: Number,
      default: 0
    },
    initialTransactions: {
      type: Array as () => Transaction[],
      default: () => []
    },
    fiatCurrency: {
      type: String,
      default: 'USD'
    },
    btcPrice: {
      type: Number,
      default: 0
    }
  },
  
  setup(props, { emit }) {
    const balance = ref(props.initialBalance);
    const pendingBalance = ref(props.initialPendingBalance);
    const monthlyEarnings = ref(0);
    const transactions = ref<Transaction[]>(props.initialTransactions);
    const isLoading = ref(false);
    const showQR = ref(false);
    const addressCopied = ref(false);
    
    // Format the balances using the satoshi utils
    const formattedBalance = computed(() => formatSatoshi(balance.value));
    const formattedPendingBalance = computed(() => formatSatoshi(pendingBalance.value));
    const formattedMonthlyEarnings = computed(() => formatSatoshi(monthlyEarnings.value));
    
    // Calculate fiat value
    const fiatBalance = computed(() => {
      if (!props.btcPrice) return '';
      const btcValue = satoshiToBtc(balance.value);
      const fiatValue = btcValue * props.btcPrice;
      return `${props.fiatCurrency} ${fiatValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    });
    
    // Truncate the address for display
    const truncatedAddress = computed(() => {
      if (!props.address) return '';
      return `${props.address.slice(0, 6)}...${props.address.slice(-6)}`;
    });
    
    // Format date for transaction display
    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp);
      return date.toLocaleDateString();
    };
    
    // Methods
    const refreshBalance = async () => {
      isLoading.value = true;
      
      try {
        // In a real implementation, this would call a wallet API
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // For demo purposes, slightly adjust balance
        balance.value = Math.round(balance.value * (1 + (Math.random() * 0.01 - 0.005)));
        
        // Calculate monthly earnings
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        
        monthlyEarnings.value = transactions.value
          .filter(tx => {
            const txDate = new Date(tx.timestamp);
            return tx.type === 'received' && 
                  txDate.getMonth() === thisMonth && 
                  txDate.getFullYear() === thisYear;
          })
          .reduce((sum, tx) => sum + tx.amount, 0);
          
        emit('balance-updated', { balance: balance.value, pending: pendingBalance.value });
      } finally {
        isLoading.value = false;
      }
    };
    
    const toggleQRCode = () => {
      showQR.value = !showQR.value;
    };
    
    const copyAddress = () => {
      navigator.clipboard.writeText(props.address);
      addressCopied.value = true;
      setTimeout(() => {
        addressCopied.value = false;
      }, 2000);
    };
    
    const showSendDialog = () => {
      emit('show-send-dialog');
    };
    
    const showReceiveDialog = () => {
      showQR.value = true;
      emit('show-receive-dialog');
    };
    
    // Load initial data
    onMounted(() => {
      refreshBalance();
    });
    
    return {
      balance,
      pendingBalance,
      formattedBalance,
      formattedPendingBalance,
      formattedMonthlyEarnings,
      fiatBalance,
      transactions,
      isLoading,
      showQR,
      addressCopied,
      truncatedAddress,
      formatDate,
      refreshBalance,
      toggleQRCode,
      copyAddress,
      showSendDialog,
      showReceiveDialog,
      formatSatoshi
    };
  }
});
</script>

<style scoped>
.bitcoin-wallet-card {
  background: linear-gradient(135deg, #f7931a11, #f7931a05);
  border: 1px solid #f7931a33;
  border-radius: 12px;
  padding: 1.5rem;
  color: var(--text-primary, #333);
  box-shadow: 0 4px 12px rgba(247, 147, 26, 0.1);
  margin-bottom: 1.5rem;
}

.wallet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.wallet-title {
  display: flex;
  align-items: center;
  font-size: 1.2rem;
  margin: 0;
  color: #f7931a;
}

.bitcoin-icon {
  height: 1.5rem;
  margin-right: 0.5rem;
}

.wallet-actions {
  display: flex;
  gap: 0.5rem;
}

.refresh-button, .qr-toggle {
  background: transparent;
  border: 1px solid #f7931a33;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-button:hover, .qr-toggle:hover {
  background: #f7931a11;
}

.wallet-balance-container {
  margin-bottom: 1rem;
}

.wallet-balance {
  text-align: center;
  margin-bottom: 1rem;
}

.balance-amount {
  font-size: 2rem;
  font-weight: 600;
  display: block;
}

.balance-fiat {
  font-size: 1rem;
  color: var(--text-secondary, #666);
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1rem;
}

.stat-item {
  background: #f7931a0a;
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary, #666);
  display: block;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-weight: 600;
}

.address-container {
  margin: 1rem 0;
  text-align: center;
  position: relative;
}

.qr-placeholder {
  width: 150px;
  height: 150px;
  background: repeating-linear-gradient(
    45deg,
    #f7931a22,
    #f7931a22 10px,
    #f7931a11 10px,
    #f7931a11 20px
  );
  margin: 0 auto;
  border-radius: 4px;
}

.address-text {
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.address {
  font-family: monospace;
  padding: 0.25rem 0.5rem;
  background: #f7931a11;
  border-radius: 4px;
}

.copy-button {
  background: #f7931a;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}

.copied-notification {
  position: absolute;
  bottom: -2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #2ecc71;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.transaction-list {
  margin-top: 1.5rem;
}

.transaction-list h4 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1rem;
  color: var(--text-secondary, #666);
}

.no-transactions {
  text-align: center;
  padding: 1rem;
  color: var(--text-tertiary, #999);
  font-style: italic;
}

.transaction-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f7931a22;
}

.tx-type {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.75rem;
  font-weight: bold;
}

.tx-type.received {
  background: #2ecc7122;
  color: #2ecc71;
}

.tx-type.sent {
  background: #e74c3c22;
  color: #e74c3c;
}

.tx-details {
  flex: 1;
}

.tx-title {
  font-weight: 500;
}

.tx-date {
  font-size: 0.8rem;
  color: var(--text-tertiary, #999);
}

.tx-amount {
  font-weight: 600;
}

.tx-amount.received {
  color: #2ecc71;
}

.tx-amount.sent {
  color: #e74c3c;
}

.wallet-actions-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1.5rem;
}

.action-button {
  padding: 0.75rem;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.send-button {
  background: #f7931a;
  color: white;
}

.send-button:hover {
  background: #e78418;
}

.receive-button {
  background: white;
  border: 1px solid #f7931a;
  color: #f7931a;
}

.receive-button:hover {
  background: #f7931a11;
}

/* Loading spinner */
.loading-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #f7931a;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
