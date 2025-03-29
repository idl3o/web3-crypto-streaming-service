<template>
  <div class="rerun-analyzer" :class="theme">
    <div class="analyzer-header">
      <div class="header-left">
        <h3>
          <i class="fas fa-redo-alt"></i>
          Transaction Rerun Analyzer
        </h3>
        <div class="badge" :class="isRunning ? 'badge-active' : 'badge-idle'">
          {{ isRunning ? 'RUNNING' : 'IDLE' }}
        </div>
      </div>
      <div class="header-controls">
        <button class="btn-toggle" @click="toggleFullScreen">
          <i :class="isFullScreen ? 'fas fa-compress-alt' : 'fas fa-expand-alt'"></i>
        </button>
      </div>
    </div>

    <div class="analyzer-content" :class="{ 'fullscreen': isFullScreen }">
      <!-- Transaction Selection -->
      <div class="section transaction-selection" v-if="!selectedTransaction">
        <div class="section-header">
          <h4>Select Transaction to Rerun</h4>
          <div class="section-controls">
            <button class="refresh-btn" @click="loadTransactions" :disabled="loading">
              <i class="fas" :class="loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'"></i>
            </button>
          </div>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading transaction history...</p>
        </div>

        <div v-else>
          <div class="filters-row">
            <div class="filter-group">
              <label>Category</label>
              <select v-model="filters.category">
                <option value="all">All Categories</option>
                <option v-for="(value, key) in transactionCategories" :key="key" :value="value">
                  {{ formatCategoryName(value) }}
                </option>
              </select>
            </div>
            <div class="filter-group">
              <label>Time Period</label>
              <select v-model="filters.timePeriod">
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
                <option value="0">All time</option>
              </select>
            </div>
            <div class="filter-group search-group">
              <label>Search</label>
              <div class="search-input">
                <input type="text" v-model="filters.search" placeholder="Search by hash or address...">
                <i class="fas fa-search"></i>
              </div>
            </div>
          </div>

          <div v-if="transactions.length === 0" class="empty-state">
            <i class="fas fa-history"></i>
            <p>No transaction history found for the selected filters</p>
            <button class="btn" @click="loadTransactions">Refresh</button>
          </div>

          <div v-else class="transactions-list">
            <div
              v-for="tx in filteredTransactions"
              :key="tx.hash"
              class="transaction-item"
              :class="{ 'has-error': tx.isError }"
              @click="selectTransaction(tx)"
            >
              <div class="tx-icon">
                <i class="fas" :class="getTransactionIcon(tx.category)"></i>
              </div>
              <div class="tx-details">
                <div class="tx-primary">
                  <span class="tx-hash">{{ shortenHash(tx.hash) }}</span>
                  <span class="tx-category">{{ formatCategoryName(tx.category) }}</span>
                </div>
                <div class="tx-secondary">
                  <span class="tx-time">{{ formatTime(tx.timestamp) }}</span>
                  <span class="tx-value">{{ formatValue(tx.value) }}</span>
                </div>
              </div>
              <div class="tx-arrow">
                <i class="fas fa-angle-right"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rerun Analysis -->
      <div class="section rerun-analysis" v-if="selectedTransaction">
        <div class="section-header">
          <h4>
            Rerun Analysis
            <span class="tx-hash">{{ shortenHash(selectedTransaction.hash) }}</span>
          </h4>
          <div class="section-controls">
            <button class="back-btn" @click="backToTransactions">
              <i class="fas fa-arrow-left"></i> Back
            </button>
          </div>
        </div>

        <div class="rerun-types">
          <div
            v-for="(label, type) in simulationTypes"
            :key="type"
            class="rerun-type"
            :class="{ active: currentRerunType === type }"
            @click="selectRerunType(type)"
          >
            <i class="fas" :class="getRerunTypeIcon(type)"></i>
            <span>{{ label }}</span>
          </div>
        </div>

        <div class="transaction-overview">
          <div class="overview-card">
            <div class="overview-header">Transaction Details</div>
            <div class="overview-content">
              <div class="detail-row">
                <div class="detail-label">Type</div>
                <div class="detail-value">{{ formatCategoryName(selectedTransaction.category) }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">From</div>
                <div class="detail-value address">{{ shortenAddress(selectedTransaction.from) }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">To</div>
                <div class="detail-value address">{{ shortenAddress(selectedTransaction.to) }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Value</div>
                <div class="detail-value">{{ formatValue(selectedTransaction.value) }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Gas Used</div>
                <div class="detail-value">{{ formatNumber(selectedTransaction.gasUsed) }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Block</div>
                <div class="detail-value">{{ formatNumber(selectedTransaction.blockNumber) }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Status</div>
                <div class="detail-value" :class="selectedTransaction.isError ? 'status-error' : 'status-success'">
                  {{ selectedTransaction.isError ? 'Failed' : 'Success' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Parameters Form -->
        <div class="rerun-params" v-if="currentRerunType === 'what-if'">
          <div class="params-header">Adjust Parameters</div>
          <div class="params-form">
            <div class="param-group">
              <label>Gas Price (gwei)</label>
              <input
                type="number"
                v-model.number="rerunParams.gasPrice"
                :placeholder="selectedTransaction.gasPrice"
                min="1"
              />
            </div>
            <div
              class="param-group"
              v-if="selectedTransaction.category === transactionCategories.STREAMING_PAYMENT"
            >
              <label>Quality Level</label>
              <select v-model="rerunParams.qualityLevel">
                <option value="SD">Standard Definition</option>
                <option value="HD">High Definition</option>
                <option value="UHD">Ultra High Definition</option>
              </select>
            </div>
            <div
              class="param-group"
              v-if="selectedTransaction.category === transactionCategories.INVESTMENT"
            >
              <label>Position Type</label>
              <select v-model="rerunParams.positionType">
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Rerun Controls -->
        <div class="rerun-controls">
          <button
            class="run-btn"
            @click="runSimulation"
            :disabled="isRunning"
          >
            <i class="fas" :class="isRunning ? 'fa-spinner fa-spin' : 'fa-play'"></i>
            {{ isRunning ? 'Running Simulation...' : 'Run Simulation' }}
          </button>
        </div>

        <!-- Rerun Results -->
        <div v-if="rerunResult" class="rerun-results">
          <div class="results-header">
            <h5>
              <i class="fas fa-chart-line"></i>
              Simulation Results
            </h5>
            <span class="simulation-type">{{ getSimulationTypeLabel(rerunResult.simulation.type) }}</span>
          </div>

          <div class="results-metrics">
            <!-- Different metrics based on transaction category -->
            <template v-if="selectedTransaction.category === transactionCategories.STREAMING_PAYMENT">
              <div class="metric-card" v-if="rerunResult.simulation.results.originalMetrics">
                <div class="metric-title">Original Metrics</div>
                <div class="metric-grid">
                  <div class="metric-item">
                    <div class="metric-value">{{ formatCurrency(rerunResult.simulation.results.originalMetrics.cost) }}</div>
                    <div class="metric-label">Cost</div>
                  </div>
                  <div class="metric-item">
                    <div class="metric-value">{{ formatPercent(rerunResult.simulation.results.originalMetrics.efficiency) }}</div>
                    <div class="metric-label">Efficiency</div>
                  </div>
                  <div class="metric-item">
                    <div class="metric-value">{{ formatPercent(rerunResult.simulation.results.originalMetrics.quality) }}</div>
                    <div class="metric-label">Quality</div>
                  </div>
                </div>
              </div>

              <div class="metric-card" v-if="rerunResult.simulation.results.optimizedMetrics">
                <div class="metric-title">Optimized Metrics</div>
                <div class="metric-grid">
                  <div class="metric-item">
                    <div class="metric-value improved">{{ formatCurrency(rerunResult.simulation.results.optimizedMetrics.cost) }}</div>
                    <div class="metric-label">Cost</div>
                    <div class="improvement" v-if="rerunResult.simulation.results.improvements.costReduction">
                      -{{ rerunResult.simulation.results.improvements.costReduction }} <i class="fas fa-arrow-down"></i>
                    </div>
                  </div>
                  <div class="metric-item">
                    <div class="metric-value improved">{{ formatPercent(rerunResult.simulation.results.optimizedMetrics.efficiency) }}</div>
                    <div class="metric-label">Efficiency</div>
                    <div class="improvement" v-if="rerunResult.simulation.results.improvements.efficiencyGain">
                      +{{ rerunResult.simulation.results.improvements.efficiencyGain }} <i class="fas fa-arrow-up"></i>
                    </div>
                  </div>
                  <div class="metric-item">
                    <div class="metric-value">{{ formatPercent(rerunResult.simulation.results.optimizedMetrics.quality) }}</div>
                    <div class="metric-label">Quality</div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="selectedTransaction.category === transactionCategories.INVESTMENT">
              <!-- Investment-specific metrics -->
              <div class="metric-card" v-if="rerunResult.simulation.results.originalMetrics">
                <div class="metric-title">Original Metrics</div>
                <div class="metric-grid">
                  <div class="metric-item">
                    <div class="metric-value">{{ formatPercent(rerunResult.simulation.results.originalMetrics.estimatedReturn) }}</div>
                    <div class="metric-label">Return</div>
                  </div>
                  <div class="metric-item">
                    <div class="metric-value">{{ formatPercent(rerunResult.simulation.results.originalMetrics.risk) }}</div>
                    <div class="metric-label">Risk</div>
                  </div>
                  <div class="metric-item">
                    <div class="metric-value">{{ formatCurrency(rerunResult.simulation.results.originalMetrics.amount) }}</div>
                    <div class="metric-label">Amount</div>
                  </div>
                </div>
              </div>

              <div class="metric-card" v-if="rerunResult.simulation.results.optimizedMetrics">
                <!-- Similar structure to streaming metrics but with investment-specific data -->
              </div>
            </template>

            <template v-else>
              <!-- Generic metrics for other transaction types -->
              <div class="metric-card">
                <div class="metric-title">Transaction Metrics</div>
                <div class="metric-grid">
                  <div class="metric-item">
                    <div class="metric-value">{{ formatPercent(rerunResult.simulation.results.originalMetrics?.gasEfficiency || 1) }}</div>
                    <div class="metric-label">Gas Efficiency</div>
                  </div>
                  <div class="metric-item">
                    <div class="metric-value">{{ formatNumber(rerunResult.simulation.gasUsed || selectedTransaction.gasUsed) }}</div>
                    <div class="metric-label">Gas Used</div>
                  </div>
                  <div class="metric-item">
                    <div class="metric-value">{{ formatDuration(rerunResult.simulation.duration) }}</div>
                    <div class="metric-label">Duration</div>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <div class="insights-section">
            <h5>Analysis Insights</h5>
            <ul class="insights-list">
              <li v-for="(insight, index) in rerunResult.simulation.results.insights" :key="index">
                <i class="fas fa-lightbulb"></i>
                <span>{{ insight }}</span>
              </li>
            </ul>
          </div>

          <div class="alternatives-section" v-if="rerunResult.simulation.results.alternatives">
            <h5>Alternative Execution Paths</h5>
            <div class="alternatives-list">
              <div
                v-for="(alt, index) in rerunResult.simulation.results.alternatives"
                :key="index"
                class="alternative-item"
                :class="{ 'recommended': rerunResult.simulation.results.recommendedPath === alt.path }"
              >
                <div class="alternative-header">
                  <span class="path-name">Path {{ index + 1 }}</span>
                  <span class="recommended-badge" v-if="rerunResult.simulation.results.recommendedPath === alt.path">
                    Recommended <i class="fas fa-star"></i>
                  </span>
                </div>
                <div class="alternative-metrics">
                  <div class="alt-metric">
                    <span class="metric-label">Gas:</span>
                    <span class="metric-value">{{ formatNumber(alt.gasUsed) }}</span>
                  </div>
                  <div class="alt-metric">
                    <span class="metric-label">Cost:</span>
                    <span class="metric-value">{{ formatCurrency(alt.cost) }}</span>
                  </div>
                  <div class="alt-metric">
                    <span class="metric-label">Success:</span>
                    <span class="metric-value" :class="alt.success ? 'status-success' : 'status-error'">
                      {{ alt.success ? 'Yes' : 'No' }}
                    </span>
                  </div>
                </div>
                <div class="alternative-description">
                  {{ alt.description }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue';
import * as SatoshiPonService from '@/services/SatoshiPonService';
import { shortenAddress } from '@/services/NamingService';

// Props and theme
const props = defineProps({
  address: {
    type: String,
    default: null
  },
  initialTransaction: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['rerun-complete']);
const theme = inject('currentTheme', 'roman-theme');

// State
const loading = ref(false);
const transactions = ref([]);
const selectedTransaction = ref(props.initialTransaction);
const isRunning = ref(false);
const isFullScreen = ref(false);
const rerunResult = ref(null);

// Constants
const transactionCategories = SatoshiPonService.TRANSACTION_CATEGORIES;
const simulationTypes = {
  'basic': 'Basic Replay',
  'optimized': 'Optimized Execution',
  'alternative': 'Alternative Paths',
  'what-if': 'What-If Scenarios'
};

// Filters
const filters = ref({
  category: 'all',
  timePeriod: '30',  // Default to last 30 days
  search: ''
});

// Rerun configuration
const currentRerunType = ref('basic');
const rerunParams = ref({
  gasPrice: null,
  qualityLevel: 'HD',
  positionType: 'long'
});

// Computed properties
const filteredTransactions = computed(() => {
  let result = [...transactions.value];
  
  // Apply category filter
  if (filters.value.category !== 'all') {
    result = result.filter(tx => tx.category === filters.value.category);
  }
  
  // Apply time period filter
  if (parseInt(filters.value.timePeriod) > 0) {
    const cutoffTime = Date.now() - (parseInt(filters.value.timePeriod) * 24 * 60 * 60 * 1000);
    result = result.filter(tx => tx.timestamp * 1000 >= cutoffTime);
  }
  
  // Apply search filter
  if (filters.value.search) {
    const searchTerm = filters.value.search.toLowerCase();
    result = result.filter(tx =>
      tx.hash.toLowerCase().includes(searchTerm) ||
      tx.from.toLowerCase().includes(searchTerm) ||
      tx.to.toLowerCase().includes(searchTerm)
    );
  }
  
  return result;
});

// Methods
async function loadTransactions() {
  loading.value = true;
  try {
    const address = props.address || (await getCurrentAccount());
    if (!address) {
      throw new Error('No wallet address available');
    }
    
    const result = await SatoshiPonService.fetchHistoricalTransactions(address);
    if (result.success) {
      transactions.value = result.transactions;
    } else {
      console.error('Failed to fetch transactions:', result.error);
      transactions.value = [];
    }
  } catch (error) {
    console.error('Error loading transactions:', error);
    transactions.value = [];
  } finally {
    loading.value = false;
  }
}

async function selectTransaction(tx) {
  selectedTransaction.value = tx;
  currentRerunType.value = 'basic';
  rerunResult.value = null;
  
  // Reset rerun params
  rerunParams.value = {
    gasPrice: tx.gasPrice,
    qualityLevel: tx.specificData?.qualityLevel || 'HD',
    positionType: tx.specificData?.position || 'long'
  };
}

function backToTransactions() {
  selectedTransaction.value = null;
  rerunResult.value = null;
}

function selectRerunType(type) {
  currentRerunType.value = type;
  rerunResult.value = null;
}

async function runSimulation() {
  if (!selectedTransaction.value || isRunning.value) return;
  
  isRunning.value = true;
  rerunResult.value = null;
  
  try {
    const parameters = currentRerunType.value === 'what-if' ? {
      gasPrice: rerunParams.value.gasPrice || selectedTransaction.value.gasPrice,
      qualityLevel: rerunParams.value.qualityLevel,
      position: rerunParams.value.positionType
    } : {};
    
    const result = await SatoshiPonService.rerunTransaction(
      selectedTransaction.value,
      currentRerunType.value,
      parameters
    );
    
    rerunResult.value = result;
    emit('rerun-complete', result);
  } catch (error) {
    console.error('Error running simulation:', error);
  } finally {
    isRunning.value = false;
  }
}

function toggleFullScreen() {
  isFullScreen.value = !isFullScreen.value;
}

// Helper methods
function getTransactionIcon(category) {
  switch(category) {
    case transactionCategories.STREAMING_PAYMENT:
      return 'fa-play-circle';
    case transactionCategories.INVESTMENT:
      return 'fa-chart-line';
    case transactionCategories.CONTRACT_INTERACTION:
      return 'fa-file-contract';
    case transactionCategories.NFT_MINT:
      return 'fa-palette';
    case transactionCategories.TOKEN_SWAP:
      return 'fa-exchange-alt';
    case transactionCategories.GOVERNANCE:
      return 'fa-vote-yea';
    default:
      return 'fa-exchange-alt';
  }
}

function getRerunTypeIcon(type) {
  switch(type) {
    case 'basic':
      return 'fa-redo';
    case 'optimized':
      return 'fa-bolt';
    case 'alternative':
      return 'fa-random';
    case 'what-if':
      return 'fa-question-circle';
    default:
      return 'fa-redo';
  }
}

function formatCategoryName(category) {
  if (!category) return 'Unknown';
  
  // Convert SNAKE_CASE to Title Case
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getSimulationTypeLabel(type) {
  return simulationTypes[type] || type;
}

function shortenHash(hash) {
  if (!hash) return '';
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

function formatValue(value) {
  if (!value || value === '0') return '0 ETH';
  
  // Convert string to number if needed
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return `${numValue.toFixed(6)} ETH`;
}

function formatPercent(value) {
  if (value === undefined || value === null) return '0%';
  return `${(value * 100).toFixed(1)}%`;
}

function formatCurrency(value) {
  if (value === undefined || value === null) return '0 ETH';
  return `${parseFloat(value).toFixed(6)} ETH`;
}

function formatNumber(value) {
  if (value === undefined || value === null) return '0';
  return value.toLocaleString();
}

function formatDuration(ms) {
  if (!ms) return '0ms';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

// Placeholder for getting the current account
async function getCurrentAccount() {
  // This would normally use the wallet store or BlockchainService
  // For demo purposes, return a mock address
  return '0x0000000000000000000000000000000000000000';
}

// Initialize
onMounted(async () => {
  if (!selectedTransaction.value) {
    await loadTransactions();
  }
});

// Watch for address changes
watch(() => props.address, async (newAddress) => {
  if (newAddress) {
    await loadTransactions();
  }
});
</script>

<style scoped>
.rerun-analyzer {
  font-family: 'Inter', sans-serif;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.analyzer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #2c3e50;
  color: white;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.analyzer-header h3 {
  margin: 0;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.badge {
  font-size: 0.7rem;
  padding: 4px 8px;
  border-radius: 20px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.badge-idle {
  background-color: #95a5a6;
  color: white;
}

.badge-active {
  background-color: #2ecc71;
  color: white;
}

.btn-toggle {
  background: none;
  border: none;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.btn-toggle:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.analyzer-content {
  padding: 20px;
  transition: all 0.3s ease;
}

.analyzer-content.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
  background-color: #fff;
  padding: 20px;
  overflow-y: auto;
}

.section {
  margin-bottom: 25px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-header h4 {
  margin: 0;
  font-size: 1.1rem;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-header .tx-hash {
  font-family: monospace;
  font-size: 0.9rem;
  color: #7f8c8d;
  font-weight: normal;
}

.refresh-btn, .back-btn {
  background: none;
  border: none;
  color: #3498db;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background-color 0.2s;
}

.refresh-btn:hover, .back-btn:hover {
  background-color: #f0f8ff;
}

.refresh-btn:disabled {
  color: #bdc3c7;
  cursor: not-allowed;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
}

.loading-state .spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.filters-row {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-group {
  flex: 1;
  min-width: 150px;
}

.filter-group label {
  display: block;
  font-size: 0.8rem;
  margin-bottom: 5px;
  color: #7f8c8d;
}

.filter-group select,
.filter-group input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #dfe6e9;
  border-radius: 4px;
  font-size: 0.9rem;
}

.search-group {
  flex: 2;
}

.search-input {
  position: relative;
}

.search-input input {
  padding-right: 30px;
}

.search-input i {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #95a5a6;
}

.empty-state {
  text-align: center;
  padding: 30px 0;
}

.empty-state i {
  font-size: 3rem;
  color: #ecf0f1;
  margin-bottom: 15px;
}

.empty-state p {
  margin-bottom: 15px;
  color: #7f8c8d;
}

.btn {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:hover {
  background-color: #2980b9;
}

.transactions-list {
  border: 1px solid #ecf0f1;
  border-radius: 8px;
  overflow: hidden;
  max-height: 400px;
  overflow-y: auto;
}

.transaction-item {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid #ecf0f1;
  cursor: pointer;
  transition: background-color 0.2s;
}

.transaction-item:last-child {
  border-bottom: none;
}

.transaction-item:hover {
  background-color: #f7fafc;
}

.transaction-item.has-error {
  background-color: #fdf2f0;
}

.transaction-item.has-error:hover {
  background-color: #fce5e0;
}

.tx-icon {
  width: 40px;
  height: 40px;
  background-color: #ecf0f1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  flex-shrink: 0;
}

.tx-icon i {
  color: #7f8c8d;
  font-size: 1.1rem;
}

.tx-details {
  flex: 1;
}

.tx-primary {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.tx-hash {
  font-family: monospace;
  font-size: 0.9rem;
  font-weight: 500;
  color: #2c3e50;
}

.tx-category {
  font-size: 0.75rem;
  padding: 2px 8px;
  background-color: #f0f8ff;
  color: #3498db;
  border-radius: 20px;
}

.tx-secondary {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  color: #7f8c8d;
}

.tx-arrow {
  color: #bdc3c7;
  margin-left: 10px;
}

.rerun-types {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 5px;
}

.rerun-type {
  padding: 10px 15px;
  border-radius: 8px;
  background-color: #f7f9fc;
  border: 1px solid #ecf0f1;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.rerun-type i {
  color: #7f8c8d;
}

.rerun-type span {
  font-size: 0.9rem;
  white-space: nowrap;
}

.rerun-type.active {
  background-color: #edf7ff;
  border-color: #3498db;
  color: #3498db;
}

.rerun-type.active i {
  color: #3498db;
}

.transaction-overview {
  margin-bottom: 20px;
}

.overview-card {
  background-color: #f7f9fc;
  border-radius: 8px;
  overflow: hidden;
}

.overview-header {
  background-color: #ecf0f1;
  padding: 10px 15px;
  font-weight: 500;
  font-size: 0.9rem;
}

.overview-content {
  padding: 15px;
}

.detail-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  width: 80px;
  font-weight: 500;
  color: #7f8c8d;
}

.detail-value {
  flex: 1;
}

.detail-value.address {
  font-family: monospace;
}

.status-success {
  color: #27ae60;
}

.status-error {
  color: #e74c3c;
}

.rerun-params {
  margin-bottom: 20px;
  background-color: #f7f9fc;
  border-radius: 8px;
  overflow: hidden;
}

.params-header {
  background-color: #ecf0f1;
  padding: 10px 15px;
  font-weight: 500;
  font-size: 0.9rem;
}

.params-form {
  padding: 15px;
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.param-group {
  flex: 1;
  min-width: 150px;
}

.param-group label {
  display: block;
  font-size: 0.8rem;
  margin-bottom: 5px;
  color: #7f8c8d;
}

.param-group input,
.param-group select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #dfe6e9;
  border-radius: 4px;
  font-size: 0.9rem;
}

.rerun-controls {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

.run-btn {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.run-btn:hover:not(:disabled) {
  background-color: #2980b9;
}

.run-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.rerun-results {
  border: 1px solid #e0e7ff;
  border-radius: 8px;
  overflow: hidden;
}

.results-header {
  background-color: #edf5ff;
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.results-header h5 {
  margin: 0;
  font-size: 0.95rem;
  color: #3498db;
  display: flex;
  align-items: center;
  gap: 8px;
}

.simulation-type {
  font-size: 0.8rem;
  font-weight: normal;
  padding: 2px 8px;
  background-color: #dfedfa;
  color: #3498db;
  border-radius: 20px;
}

.results-metrics {
  padding: 15px;
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.metric-card {
  flex: 1;
  min-width: 250px;
  background-color: #f8fafc;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #edf0f7;
}

.metric-title {
  background-color: #edf2f7;
  padding: 8px 12px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #4a5568;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 10px;
  padding: 15px;
}

.metric-item {
  text-align: center;
}

.metric-value {
  font-size: 1.1rem;
  font-weight: 500;
  color: #2d3748;
  margin-bottom: 4px;
}

.metric-value.improved {
  color: #2ecc71;
}

.metric-label {
  font-size: 0.75rem;
  color: #718096;
}

.improvement {
  font-size: 0.75rem;
  color: #2ecc71;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.insights-section {
  padding: 15px;
  border-top: 1px solid #e2e8f0;
}

.insights-section h5 {
  margin: 0 0 15px 0;
  font-size: 0.95rem;
  color: #4a5568;
}

.insights-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.insights-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f4f8;
  font-size: 0.9rem;
}

.insights-list li:last-child {
  border-bottom: none;
}

.insights-list li i {
  color: #f39c12;
  margin-top: 3px;
  flex-shrink: 0;
}

.alternatives-section {
  padding: 15px;
  border-top: 1px solid #e2e8f0;
}

.alternatives-section h5 {
  margin: 0 0 15px 0;
  font-size: 0.95rem;
  color: #4a5568;
}

.alternatives-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 15px;
}

.alternative-item {
  border: 1px solid #edf0f7;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f8fafc;
  transition: transform 0.2s ease;
}

.alternative-item:hover {
  transform: translateY(-3px);
}

.alternative-item.recommended {
  border-color: #3498db;
  box-shadow: 0 2px 5px rgba(52, 152, 219, 0.2);
}

.alternative-header {
  padding: 10px;
  background-color: #edf2f7;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.path-name {
  font-weight: 500;
  font-size: 0.85rem;
  color: #4a5568;
}

.recommended-badge {
  font-size: 0.75rem;
  color: #3498db;
  display: flex;
  align-items: center;
  gap: 5px;
}

.alternative-metrics {
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
  border-bottom: 1px solid #edf0f7;
}

.alt-metric {
  text-align: center;
  font-size: 0.8rem;
}

.alt-metric .metric-label {
  color: #718096;
  margin-bottom: 3px;
}

.alternative-description {
  padding: 10px;
  font-size: 0.85rem;
  color: #4a5568;
}

/* Roman theme styling */
.roman-theme .analyzer-header {
  background-color: #8B4513;
}

.roman-theme .btn {
  background-color: #A0522D;
}

.roman-theme .btn:hover {
  background-color: #8B4513;
}

.roman-theme .refresh-btn,
.roman-theme .back-btn {
  color: #A0522D;
}

.roman-theme .refresh-btn:hover,
.roman-theme .back-btn:hover {
  background-color: #FDF5E6;
}

.roman-theme .tx-category {
  background-color: #FDF5E6;
  color: #A0522D;
}

.roman-theme .rerun-type.active {
  background-color: #FDF5E6;
  border-color: #A0522D;
  color: #A0522D;
}

.roman-theme .rerun-type.active i {
  color: #A0522D;
}

.roman-theme .run-btn {
  background-color: #A0522D;
}

.roman-theme .run-btn:hover:not(:disabled) {
  background-color: #8B4513;
}

.roman-theme .results-header {
  background-color: #FDF5E6;
}

.roman-theme .results-header h5 {
  color: #A0522D;
}

.roman-theme .simulation-type {
  background-color: #F5E6D0;
  color: #A0522D;
}

.roman-theme .alternative-item.recommended {
  border-color: #A0522D;
}

.roman-theme .recommended-badge {
  color: #A0522D;
}

/* Responsive design */
@media (max-width: 768px) {
  .analyzer-content {
    padding: 15px;
  }
  
  .filters-row {
    flex-direction: column;
    gap: 10px;
  }
  
  .filter-group {
    width: 100%;
  }
  
  .detail-row {
    flex-direction: column;
    margin-bottom: 12px;
  }
  
  .detail-label {
    width: 100%;
    margin-bottom: 3px;
  }
  
  .rerun-types {
    overflow-x: auto;
    padding-bottom: 10px;
  }
  
  .results-metrics {
    flex-direction: column;
  }
  
  .alternatives-list {
    grid-template-columns: 1fr;
  }
}
</style>
