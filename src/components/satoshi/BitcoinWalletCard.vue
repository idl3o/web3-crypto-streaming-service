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
    
    <!-- User Identity Section (ENS Support) -->
    <div v-if="ensName || linkedEthAddress" class="identity-section">
      <div class="identity-content">
        <img v-if="avatarUrl" :src="avatarUrl" class="ens-avatar" alt="ENS Avatar" />
        <div v-else class="ens-avatar-placeholder"></div>
        
        <div class="identity-details">
          <div v-if="ensName" class="ens-name">{{ ensName }}</div>
          <div v-if="linkedEthAddress" class="eth-address">
            {{ truncateAddress(linkedEthAddress) }}
          </div>
        </div>
      </div>
      
      <button v-if="!ensName && !isLoadingENS" @click="linkENS" class="link-ens-button">
        Link ENS
      </button>
      <span v-else-if="isLoadingENS" class="loading-ens">Loading ENS data...</span>
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
    
    <!-- ENS Link Dialog -->
    <div v-if="showENSLinkDialog" class="ens-link-dialog-overlay">
      <div class="ens-link-dialog">
        <h3>Link ENS Name</h3>
        
        <div class="ens-link-form">
          <div class="form-group">
            <label for="ens-name">Your ENS Name</label>
            <input 
              id="ens-name" 
              v-model="ensInput" 
              placeholder="yourname.eth"
              :class="{ 'invalid': ensError }"
            />
            <div v-if="ensError" class="ens-error">{{ ensError }}</div>
          </div>
          
          <div class="form-actions">
            <button @click="closeENSLinkDialog" class="cancel-button">Cancel</button>
            <button @click="confirmENSLink" class="confirm-button" :disabled="!isValidENS">
              <span v-if="isLinkingENS" class="loading-spinner"></span>
              <span v-else>Link</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { formatSatoshi, satoshiToBtc } from '../../utils/satoshi-utils';
import { ensService } from '../../services/ENSService';

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
    },
    linkedEthAddress: {
      type: String,
      default: ''
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
    
    // ENS related state
    const ensName = ref('');
    const avatarUrl = ref('');
    const ensInput = ref('');
    const ensError = ref('');
    const isLoadingENS = ref(false);
    const isLinkingENS = ref(false);
    const showENSLinkDialog = ref(false);
    
    const isValidENS = computed(() => {
      return ensInput.value && ensInput.value.endsWith('.eth') && !ensError.value;
    });
    
    // Load ENS data when component mounts or ethereum address changes
    watch(() => props.linkedEthAddress, async (newAddress) => {
      if (newAddress) {
        await loadENSData(newAddress);
      } else {
        ensName.value = '';
        avatarUrl.value = '';
      }
    }, { immediate: true });
    
    const loadENSData = async (address: string) => {
      if (!address) return;
      
      isLoadingENS.value = true;
      
      try {
        // Initialize ENS service if needed (would normally be done at app startup)
        if (!ensService.isInitialized) {
          await ensService.initialize('https://mainnet.infura.io/v3/YOUR_INFURA_KEY');
        }
        
        // Get profile
        const profile = await ensService.getProfile(address);
        
        if (profile) {
          ensName.value = profile.name;
          avatarUrl.value = profile.avatar || '';
        } else {
          ensName.value = '';
          avatarUrl.value = '';
        }
      } catch (error) {
        console.error('Error loading ENS data:', error);
        ensName.value = '';
        avatarUrl.value = '';
      } finally {
        isLoadingENS.value = false;
      }
    };
    
    const linkENS = () => {
      showENSLinkDialog.value = true;
      ensInput.value = '';
      ensError.value = '';
    };
    
    const closeENSLinkDialog = () => {
      showENSLinkDialog.value = false;
      ensInput.value = '';
      ensError.value = '';
    };
    
    const confirmENSLink = async () => {
      if (!ensInput.value || !ensInput.value.endsWith('.eth')) {
        ensError.value = 'Please enter a valid .eth name';
        return;
      }
      
      isLinkingENS.value = true;
      
      try {
        // Resolve the ENS name to an address
        const address = await ensService.resolveAddress(ensInput.value);
        
        if (!address) {
          ensError.value = 'ENS name not found or not resolved';
          return;
        }
        
        // Verify the address matches the linked eth address (if any)
        if (props.linkedEthAddress && address.toLowerCase() !== props.linkedEthAddress.toLowerCase()) {
          ensError.value = 'ENS name does not resolve to your address';
          return;
        }
        
        // Get avatar
        const avatar = await ensService.getAvatar(ensInput.value);
        
        // Update state
        ensName.value = ensInput.value;
        avatarUrl.value = avatar || '';
        
        // Emit event for parent components
        emit('ens-linked', { 
          ensName: ensInput.value, 
          address: address,
          avatar: avatar
        });
        
        // Close dialog
        showENSLinkDialog.value = false;
      } catch (error) {
        console.error('Error linking ENS:', error);
        ensError.value = 'Error linking ENS name';
      } finally {
        isLinkingENS.value = false;
      }
    };
    
    const truncateAddress = (address: string) => {
      if (!address) return '';
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
      formatSatoshi,
      
      // ENS related
      ensName,
      avatarUrl,
      linkedEthAddress: props.linkedEthAddress,
      isLoadingENS,
      ensInput,
      ensError,
      isLinkingENS,
      isValidENS,
      showENSLinkDialog,
      linkENS,
      closeENSLinkDialog,
      confirmENSLink,
      truncateAddress
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

/* ENS Related Styles */
.identity-section {
  margin: 1rem 0;
  padding: 0.75rem;
  background-color: #f7f9fb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.identity-content {
  display: flex;
  align-items: center;
}

.ens-avatar, .ens-avatar-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  margin-right: 0.75rem;
  background: #e0e0e0;
}

.identity-details {
  display: flex;
  flex-direction: column;
}

.ens-name {
  font-weight: 600;
  color: #2c3e50;
}

.eth-address {
  font-size: 0.8rem;
  color: #7f8c8d;
  font-family: monospace;
}

.link-ens-button {
  padding: 0.4rem 0.75rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.link-ens-button:hover {
  background: #2980b9;
}

.loading-ens {
  font-size: 0.85rem;
  color: #7f8c8d;
  font-style: italic;
}

.ens-link-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.ens-link-dialog {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.ens-link-dialog h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #2c3e50;
}

.ens-link-form .form-group {
  margin-bottom: 1.25rem;
}

.ens-link-form label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.ens-link-form input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.ens-link-form input.invalid {
  border-color: #e74c3c;
}

.ens-error {
  color: #e74c3c;
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.cancel-button,
.confirm-button {
  padding: 0.6rem 1rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
}

.cancel-button {
  background: #f1f1f1;
  border: 1px solid #ddd;
  color: #333;
}

.confirm-button {
  background: #3498db;
  border: none;
  color: white;
}

.cancel-button:hover {
  background: #e0e0e0;
}

.confirm-button:hover {
  background: #2980b9;
}

.confirm-button:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}
</style>
