<template>
  <div class="dashboard-container">
    <!-- Network Status Alert -->
    <div 
      class="alert alert-success alert-dismissible fade show d-flex align-items-center mb-4"
      role="alert"
      v-if="networkStatus.online"
    >
      <i class="fas fa-check-circle me-2"></i>
      <div>
        {{ networkStatus.message }}
        <span v-if="gasPrices.current" class="ms-1">
          Current gas: {{ gasPrices.current }} GWEI
        </span>
      </div>
      <button type="button" class="btn-close" @click="dismissAlert" aria-label="Close"></button>
    </div>

    <div class="alert alert-warning alert-dismissible fade show d-flex align-items-center mb-4" 
         role="alert" 
         v-else-if="!walletConnected">
      <i class="fas fa-wallet me-2"></i>
      <div>
        Connect your wallet to access all dashboard features
        <button class="btn btn-sm btn-primary ms-3" @click="connectWallet">
          Connect Wallet
        </button>
      </div>
      <button type="button" class="btn-close" @click="dismissWalletAlert" aria-label="Close"></button>
    </div>

    <!-- Stats Cards -->
    <div class="row g-4 mb-4">
      <div class="col-sm-6 col-xl-3">
        <div class="card border-0 shadow-sm h-100 stat-card">
          <div class="card-body">
            <div class="d-flex align-items-center mb-3">
              <div class="stat-icon bg-primary-subtle rounded-circle me-3">
                <i class="fas fa-wallet text-primary"></i>
              </div>
              <h6 class="card-subtitle text-muted mb-0">Total Balance</h6>
            </div>
            <h3 class="card-text fw-bold">{{ formatEth(balance) }}</h3>
            <p class="card-text" :class="balanceChange >= 0 ? 'text-success' : 'text-danger'">
              {{ balanceChange >= 0 ? '+' : '' }}{{ balanceChange }}% 
              <small class="text-muted">from last week</small>
            </p>
            <div class="sparkline mt-3" ref="balanceSparkline"></div>
          </div>
        </div>
      </div>
      <!-- ... existing stats cards ... -->
    </div>

    <!-- Charts Section -->
    <div class="row g-4 mb-4">
      <div class="col-lg-8">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-white border-0 d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">Payment Activity</h5>
            <div class="btn-group btn-group-sm">
              <button 
                v-for="period in timePeriods" 
                :key="period"
                type="button" 
                class="btn btn-outline-secondary" 
                :class="{ active: activePeriod === period }"
                @click="changeTimePeriod(period)"
              >
                {{ period }}
              </button>
            </div>
          </div>
          <div class="card-body chart-container">
            <div class="chart-wrapper">
              <canvas ref="activityChart" height="250"></canvas>
            </div>
          </div>
        </div>
      </div>
      <!-- ... distribution chart section ... -->
    </div>

    <!-- Active Streams & Recent Transactions -->
    <div class="row g-4 mb-4">
      <div class="col-lg-5">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-white border-0 d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">Active Streams</h5>
            <router-link to="/streams" class="btn btn-sm btn-outline-primary">Manage All</router-link>
          </div>
          <div class="card-body p-0">
            <div v-if="activeStreams.length" class="list-group list-group-flush">
              <div 
                v-for="stream in activeStreams" 
                :key="stream.id"
                class="list-group-item d-flex justify-content-between align-items-center p-3"
              >
                <div class="d-flex align-items-center">
                  <div :class="`stream-icon ${stream.iconBg} rounded-circle me-3`">
                    <i :class="`fas ${stream.icon} ${stream.iconColor}`"></i>
                  </div>
                  <div>
                    <h6 class="mb-0">{{ stream.name }}</h6>
                    <small class="text-muted">{{ stream.rate }}</small>
                  </div>
                </div>
                <span :class="`badge ${stream.statusClass}`">{{ stream.status }}</span>
              </div>
            </div>
            <div v-else class="p-4 text-center">
              <p class="text-muted mb-3">No active streams found</p>
              <router-link to="/streams/new" class="btn btn-sm btn-primary">
                Create Stream
              </router-link>
            </div>
          </div>
        </div>
      </div>
      <!-- ... transactions section ... -->
    </div>

    <!-- Quick Actions & Gas Tracker -->
    <div class="row g-4 mb-4">
      <!-- ... existing content ... -->
    </div>

    <!-- Connect Wallet Modal -->
    <div class="modal fade" id="connectWalletModal" tabindex="-1" aria-labelledby="connectWalletModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="connectWalletModalLabel">Connect Your Wallet</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="d-grid gap-2">
              <button @click="connectMetaMask" class="btn btn-outline-primary d-flex align-items-center justify-content-between p-3">
                <span>MetaMask</span>
                <img src="/images/metamask.svg" alt="MetaMask" width="30" />
              </button>
              <button @click="connectWalletConnect" class="btn btn-outline-primary d-flex align-items-center justify-content-between p-3">
                <span>WalletConnect</span>
                <img src="/images/walletconnect.svg" alt="WalletConnect" width="30" />
              </button>
              <button @click="connectCoinbaseWallet" class="btn btn-outline-primary d-flex align-items-center justify-content-between p-3">
                <span>Coinbase Wallet</span>
                <img src="/images/coinbase.svg" alt="Coinbase Wallet" width="30" />
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive } from 'vue';
import { useWalletStore } from '../stores/walletStore';
import Chart from 'chart.js/auto';
import bootstrap from 'bootstrap/dist/js/bootstrap.js';

// Store imports
const walletStore = useWalletStore();

// Reactive state
const activityChart = ref(null);
const balanceSparkline = ref(null);
const activePeriod = ref('Weekly');
const timePeriods = ['Weekly', 'Monthly', 'Yearly'];
const showWalletAlert = ref(true);
const networkStatus = reactive({
  online: true,
  message: "All systems operational. Network gas fees are currently low - great time for transactions!"
});

// Computed properties
const walletConnected = computed(() => !!walletStore.address);
const balance = computed(() => walletStore.balance);
const balanceChange = computed(() => 2.5); // Placeholder - would be calculated from historical data

// Sample data for streams
const activeStreams = ref([
  {
    id: 1,
    name: 'Monthly Subscription',
    rate: '0.05 ETH/month',
    icon: 'fa-arrow-down',
    iconColor: 'text-primary',
    iconBg: 'bg-primary-subtle',
    status: 'Active',
    statusClass: 'bg-success'
  },
  {
    id: 2,
    name: 'Team Payroll',
    rate: '0.2 ETH/week',
    icon: 'fa-arrow-up',
    iconColor: 'text-danger',
    iconBg: 'bg-danger-subtle',
    status: 'Active',
    statusClass: 'bg-success'
  },
  {
    id: 3,
    name: 'Server Costs',
    rate: '0.01 ETH/day',
    icon: 'fa-arrow-up',
    iconColor: 'text-warning',
    iconBg: 'bg-warning-subtle',
    status: 'Low Balance',
    statusClass: 'bg-warning'
  }
]);

// Gas prices
const gasPrices = reactive({
  current: 15,
  slow: 10,
  average: 15,
  fast: 25
});

// Methods
const connectWallet = () => {
  const modal = new bootstrap.Modal(document.getElementById('connectWalletModal'));
  modal.show();
};

const connectMetaMask = async () => {
  await walletStore.connectWallet();
  const modal = bootstrap.Modal.getInstance(document.getElementById('connectWalletModal'));
  modal.hide();
};

const connectWalletConnect = async () => {
  // Implementation would use WalletConnect
  console.log('WalletConnect integration to be implemented');
};

const connectCoinbaseWallet = async () => {
  // Implementation would use Coinbase Wallet SDK
  console.log('Coinbase Wallet integration to be implemented');
};

const dismissAlert = () => {
  networkStatus.online = false;
};

const dismissWalletAlert = () => {
  showWalletAlert.value = false;
};

const formatEth = (value) => {
  return `${parseFloat(value).toFixed(2)} ETH`;
};

const changeTimePeriod = (period) => {
  activePeriod.value = period;
  // This would update the activity chart with data for the selected period
  // For now we're using the existing chart code from dashboard.js
};

// On component mount, initialize the dashboard with data from our stores
onMounted(async () => {
  // Check if wallet is connected
  if (!walletStore.address) {
    try {
      // Try to connect if the user has previously connected
      await walletStore.connectWallet();
    } catch (error) {
      console.log('Wallet not connected:', error);
    }
  }
  
  // Let the existing dashboard.js handle the charts for now
  // This is a temporary solution until charts are fully Vue-ified
  const script = document.createElement('script');
  script.src = '/js/dashboard-2023.js';
  document.body.appendChild(script);
});
</script>
