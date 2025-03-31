<template>
  <div class="satoshi-payment-dashboard">
    <div class="dashboard-header">
      <h2>Satoshi Payment Dashboard</h2>
      <div class="balance-card">
        <div class="balance-label">Available Balance</div>
        <div class="balance-amount">{{ formattedBalance }} <span class="unit">sats</span></div>
        <div class="btc-equivalent">≈ {{ satToBtc(balance) }} BTC</div>
      </div>
    </div>

    <div class="dashboard-actions">
      <button class="action-button primary" @click="showTopUpModal = true">
        <i class="icon icon-plus"></i> Top Up Balance
      </button>
      <button class="action-button secondary" @click="showWithdrawModal = true">
        <i class="icon icon-withdraw"></i> Withdraw
      </button>
      <button class="action-button" @click="refreshTransactions">
        <i class="icon icon-refresh"></i> Refresh
      </button>
    </div>

    <div class="dashboard-section">
      <h3>Recent Transactions</h3>
      <div v-if="loading" class="loading-indicator">
        <div class="spinner"></div> Loading transactions...
      </div>
      <div v-else-if="transactions.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <p>No transactions yet</p>
      </div>
      <div v-else class="transaction-list">
        <div v-for="tx in transactions" :key="tx.id" class="transaction-item" :class="tx.type">
          <div class="tx-icon" :class="'tx-' + tx.type">
            <i :class="'icon-' + tx.type"></i>
          </div>
          <div class="tx-details">
            <div class="tx-title">{{ tx.title }}</div>
            <div class="tx-date">{{ formatDate(tx.timestamp) }}</div>
          </div>
          <div class="tx-amount" :class="{ 'positive': tx.type === 'deposit', 'negative': tx.type === 'payment' }">
            {{ tx.type === 'deposit' ? '+' : '-' }} {{ formatSatoshis(tx.amount) }} sats
          </div>
          <div class="tx-status" :class="tx.status">
            {{ tx.status }}
          </div>
        </div>
      </div>
    </div>

    <div class="dashboard-section">
      <h3>Active Subscriptions</h3>
      <div v-if="subscriptions.length === 0" class="empty-state">
        <div class="empty-icon">📺</div>
        <p>No active subscriptions</p>
        <button class="action-button secondary">Browse Content</button>
      </div>
      <div v-else class="subscription-list">
        <div v-for="sub in subscriptions" :key="sub.id" class="subscription-item">
          <div class="sub-image">
            <img :src="sub.image" :alt="sub.title">
          </div>
          <div class="sub-details">
            <div class="sub-title">{{ sub.title }}</div>
            <div class="sub-period">{{ sub.billingPeriod }}</div>
          </div>
          <div class="sub-price">
            {{ formatSatoshis(sub.pricePerPeriod) }} sats
            <div class="sub-frequency">per {{ sub.billingFrequency }}</div>
          </div>
          <div class="sub-next-payment">
            Next payment: {{ formatDate(sub.nextPaymentDate) }}
          </div>
          <div class="sub-actions">
            <button class="btn-cancel" @click="cancelSubscription(sub.id)">Cancel</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Up Modal -->
    <div v-if="showTopUpModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Top Up Your Balance</h3>
          <button class="close-btn" @click="showTopUpModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="payment-qr">
            <img src="/assets/images/sample-btc-qr.png" alt="Bitcoin QR Code">
          </div>
          <div class="payment-address">
            <input type="text" readonly :value="bitcoinAddress" class="address-input">
            <button class="copy-btn" @click="copyAddress">Copy</button>
          </div>
          <div class="payment-info">
            <p>Send any amount of Bitcoin to this address. Your balance will be updated after 1 confirmation.</p>
            <p class="note">Minimum deposit: 10,000 sats (≈ 0.0001 BTC)</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Withdraw Modal -->
    <div v-if="showWithdrawModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Withdraw Funds</h3>
          <button class="close-btn" @click="showWithdrawModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="input-group">
            <label for="withdraw-address">Bitcoin Address</label>
            <input type="text" id="withdraw-address" v-model="withdrawAddress" placeholder="Enter Bitcoin address">
          </div>
          <div class="input-group">
            <label for="withdraw-amount">Amount (sats)</label>
            <input type="number" id="withdraw-amount" v-model="withdrawAmount" placeholder="Enter amount in satoshis">
            <div class="amount-buttons">
              <button @click="setWithdrawAmount('min')">Min</button>
              <button @click="setWithdrawAmount('half')">Half</button>
              <button @click="setWithdrawAmount('max')">Max</button>
            </div>
          </div>
          <div class="withdrawal-fee">
            Network Fee: {{ networkFee }} sats
            <div class="fee-options">
              <label><input type="radio" v-model="feeRate" value="low"> Low</label>
              <label><input type="radio" v-model="feeRate" value="medium"> Medium</label>
              <label><input type="radio" v-model="feeRate" value="high"> High</label>
            </div>
          </div>
          <div class="withdrawal-total">
            Total Amount: {{ formatSatoshis(withdrawAmount - networkFee) }} sats
          </div>
          <div class="modal-actions">
            <button class="cancel-btn" @click="showWithdrawModal = false">Cancel</button>
            <button class="withdraw-btn" :disabled="!canWithdraw" @click="processWithdrawal">Withdraw</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { formatSatoshis, satToBtc, btcToSat } from '../../utils/satoshi-utils';

export default defineComponent({
  name: 'SatoshiPaymentDashboard',
  data() {
    return {
      balance: 1250000, // Example: 1.25M satoshis
      transactions: [] as Array<{
        id: string;
        type: 'payment' | 'deposit' | 'withdrawal' | 'refund';
        title: string;
        timestamp: number;
        amount: number;
        status: 'confirmed' | 'pending' | 'failed';
      }>,
      subscriptions: [] as Array<{
        id: string;
        title: string;
        image: string;
        pricePerPeriod: number;
        billingFrequency: string;
        billingPeriod: string;
        nextPaymentDate: number;
      }>,
      loading: true,
      showTopUpModal: false,
      showWithdrawModal: false,
      bitcoinAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      withdrawAddress: '',
      withdrawAmount: 0,
      networkFee: 1500, // Example: 1500 sats
      feeRate: 'medium',
    };
  },
  computed: {
    formattedBalance(): string {
      return formatSatoshis(this.balance);
    },
    canWithdraw(): boolean {
      return this.withdrawAddress.length > 25 && 
             this.withdrawAmount > this.networkFee &&
             this.withdrawAmount <= this.balance;
    }
  },
  methods: {
    formatSatoshis,
    satToBtc,
    formatDate(timestamp: number): string {
      return new Date(timestamp).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    refreshTransactions() {
      this.loading = true;
      
      // In a real application, this would be an API call
      setTimeout(() => {
        this.transactions = [
          {
            id: 'tx-1',
            type: 'payment',
            title: 'Premium Stream Subscription',
            timestamp: Date.now() - 24 * 60 * 60 * 1000,
            amount: 25000,
            status: 'confirmed'
          },
          {
            id: 'tx-2',
            type: 'deposit',
            title: 'Bitcoin Deposit',
            timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
            amount: 500000,
            status: 'confirmed'
          },
          {
            id: 'tx-3',
            type: 'payment',
            title: 'One-time Content Purchase',
            timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
            amount: 15000,
            status: 'confirmed'
          },
          {
            id: 'tx-4',
            type: 'withdrawal',
            title: 'Withdrawal to External Wallet',
            timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000,
            amount: 200000,
            status: 'confirmed'
          }
        ];
        
        this.subscriptions = [
          {
            id: 'sub-1',
            title: 'Premium Crypto Content',
            image: '/assets/images/premium-content.jpg',
            pricePerPeriod: 100000,
            billingFrequency: 'month',
            billingPeriod: 'Monthly',
            nextPaymentDate: Date.now() + 7 * 24 * 60 * 60 * 1000
          },
          {
            id: 'sub-2',
            title: 'Blockchain Analysis',
            image: '/assets/images/blockchain-analysis.jpg',
            pricePerPeriod: 25000,
            billingFrequency: 'week',
            billingPeriod: 'Weekly',
            nextPaymentDate: Date.now() + 3 * 24 * 60 * 60 * 1000
          }
        ];
        
        this.loading = false;
      }, 1000);
    },
    copyAddress() {
      navigator.clipboard.writeText(this.bitcoinAddress)
        .then(() => {
          alert('Bitcoin address copied to clipboard!');
        })
        .catch(err => {
          console.error('Could not copy text: ', err);
        });
    },
    setWithdrawAmount(option: 'min' | 'half' | 'max') {
      if (option === 'min') {
        this.withdrawAmount = Math.max(10000, this.networkFee * 2);
      } else if (option === 'half') {
        this.withdrawAmount = Math.floor(this.balance / 2);
      } else if (option === 'max') {
        this.withdrawAmount = Math.max(0, this.balance - this.networkFee);
      }
    },
    processWithdrawal() {
      // In a real application, this would call an API
      alert(`Withdrawal of ${formatSatoshis(this.withdrawAmount)} satoshis initiated`);
      this.showWithdrawModal = false;
      
      // Simulate the transaction being added
      this.transactions.unshift({
        id: `tx-withdrawal-${Date.now()}`,
        type: 'withdrawal',
        title: 'Withdrawal to External Wallet',
        timestamp: Date.now(),
        amount: this.withdrawAmount,
        status: 'pending'
      });
      
      // Update balance (in a real app this would happen when the transaction confirms)
      this.balance -= this.withdrawAmount;
    },
    cancelSubscription(id: string) {
      // In a real application, this would call an API
      if (confirm('Are you sure you want to cancel this subscription?')) {
        this.subscriptions = this.subscriptions.filter(sub => sub.id !== id);
        alert('Subscription canceled successfully');
      }
    }
  },
  mounted() {
    this.refreshTransactions();
  }
});
</script>

<style scoped>
.satoshi-payment-dashboard {
  background-color: var(--background-color, #f7f9fb);
  border-radius: 10px;
  padding: 2rem;
  color: var(--text-color, #333);
  max-width: 1000px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.balance-card {
  background-color: var(--primary-color, #6c5ce7);
  color: white;
  padding: 1.5rem;
  border-radius: 10px;
  width: 300px;
  text-align: center;
}

.balance-label {
  font-size: 0.9rem;
  opacity: 0.8;
}

.balance-amount {
  font-size: 2rem;
  font-weight: bold;
  margin: 0.5rem 0;
}

.btc-equivalent {
  font-size: 0.9rem;
  opacity: 0.8;
}

.unit {
  font-size: 1rem;
  opacity: 0.8;
}

.dashboard-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.action-button {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background-color 0.2s;
}

.action-button.primary {
  background-color: var(--primary-color, #6c5ce7);
  color: white;
}

.action-button.primary:hover {
  background-color: var(--secondary-color, #a29bfe);
}

.action-button.secondary {
  background-color: var(--accent-color, #00cec9);
  color: white;
}

.action-button.secondary:hover {
  background-color: #89d8d3;
}

.action-button:not(.primary):not(.secondary) {
  background-color: var(--card-bg, #fff);
  color: var(--text-color, #333);
  border: 1px solid var(--border-color, #dfe6e9);
}

.action-button:not(.primary):not(.secondary):hover {
  background-color: #f5f5f5;
}

.dashboard-section {
  background-color: var(--card-bg, #fff);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.dashboard-section h3 {
  margin-top: 0;
  color: var(--primary-color, #6c5ce7);
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color, #dfe6e9);
}

.loading-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  color: #888;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--primary-color, #6c5ce7);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 10px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 0;
  color: #888;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.transaction-list, .subscription-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.transaction-item {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  padding: 1rem;
  border-radius: 8px;
  background-color: #f9f9f9;
  gap: 1rem;
}

.tx-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
}

.tx-payment .tx-icon {
  background-color: var(--warning-color, #ff7675);
}

.tx-deposit .tx-icon {
  background-color: var(--success-color, #55efc4);
}

.tx-withdrawal .tx-icon {
  background-color: var(--accent-color, #00cec9);
}

.tx-refund .tx-icon {
  background-color: var(--secondary-color, #a29bfe);
}

.tx-title {
  font-weight: 500;
}

.tx-date {
  font-size: 0.85rem;
  color: #888;
}

.tx-amount {
  font-weight: bold;
}

.tx-amount.positive {
  color: var(--success-color, #55efc4);
}

.tx-amount.negative {
  color: var(--warning-color, #ff7675);
}

.tx-status {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
}

.tx-status.confirmed {
  background-color: rgba(85, 239, 196, 0.2);
  color: #2ecc71;
}

.tx-status.pending {
  background-color: rgba(253, 203, 110, 0.2);
  color: #f39c12;
}

.tx-status.failed {
  background-color: rgba(255, 118, 117, 0.2);
  color: #e74c3c;
}

.subscription-item {
  display: grid;
  grid-template-columns: auto 2fr 1fr 1fr auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.sub-image {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
}

.sub-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sub-title {
  font-weight: 500;
}

.sub-period {
  font-size: 0.85rem;
  color: #888;
}

.sub-price {
  font-weight: bold;
}

.sub-frequency {
  font-size: 0.85rem;
  font-weight: normal;
  color: #888;
}

.sub-next-payment {
  font-size: 0.9rem;
}

.btn-cancel {
  background-color: transparent;
  color: var(--warning-color, #ff7675);
  border: 1px solid var(--warning-color, #ff7675);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background-color: var(--warning-color, #ff7675);
  color: white;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--card-bg, #fff);
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color, #dfe6e9);
}

.modal-header h3 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-body {
  padding: 1.5rem;
}

.payment-qr {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.payment-qr img {
  max-width: 200px;
  height: auto;
}

.payment-address {
  display: flex;
  margin-bottom: 1rem;
}

.address-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border-color, #dfe6e9);
  border-radius: 4px 0 0 4px;
  font-family: monospace;
}

.copy-btn {
  padding: 0.75rem 1rem;
  background-color: var(--primary-color, #6c5ce7);
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
}

.payment-info {
  font-size: 0.9rem;
}

.note {
  color: #888;
  font-style: italic;
}

.input-group {
  margin-bottom: 1.5rem;
}

.input-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.input-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color, #dfe6e9);
  border-radius: 4px;
  font-size: 1rem;
}

.amount-buttons {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.amount-buttons button {
  flex: 1;
  padding: 0.5rem;
  background-color: #f5f5f5;
  border: 1px solid var(--border-color, #dfe6e9);
  border-radius: 4px;
  cursor: pointer;
}

.amount-buttons button:hover {
  background-color: #e9e9e9;
}

.withdrawal-fee {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.fee-options {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.withdrawal-total {
  margin-bottom: 1.5rem;
  font-weight: bold;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.cancel-btn {
  padding: 0.75rem 1.5rem;
  background-color: transparent;
  border: 1px solid var(--border-color, #dfe6e9);
  border-radius: 4px;
  cursor: pointer;
}

.withdraw-btn {
  padding: 0.75rem 1.5rem;
  background-color: var(--primary-color, #6c5ce7);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.withdraw-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .balance-card {
    width: auto;
  }
  
  .dashboard-actions {
    flex-direction: column;
  }
  
  .subscription-item {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .sub-actions {
    justify-self: flex-end;
  }
  
  .transaction-item {
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
  }
  
  .tx-status {
    grid-column: 2;
    justify-self: flex-start;
  }
  
  .tx-amount {
    grid-column: 2;
    justify-self: flex-start;
  }
}
</style>
