<template>
  <div class="investment-portfolio" :class="theme">
    <div class="portfolio-header">
      <h2>Investment Portfolio</h2>
      <div class="portfolio-summary">
        <div class="summary-item">
          <div class="summary-label">Total Invested</div>
          <div class="summary-value">{{ formatEth(totalInvested) }} ETH</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Current Value</div>
          <div class="summary-value">{{ formatEth(currentValue) }} ETH</div>
        </div>
        <div class="summary-item">
          <div :class="['summary-value', profitLossClass]">
            {{ formatProfitLoss(profitLoss) }}
            <span class="percentage">{{ formatPercentage(profitLossPercentage) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="portfolio-controls">
      <div class="filter-options">
        <select v-model="timeFilter" class="time-filter">
          <option value="1w">Last Week</option>
          <option value="1m">Last Month</option>
          <option value="3m">Last 3 Months</option>
          <option value="1y">Last Year</option>
          <option value="all">All Time</option>
        </select>
        <select v-model="sortOption" class="sort-options">
          <option value="value-desc">Highest Value</option>
          <option value="value-asc">Lowest Value</option>
          <option value="roi-desc">Best ROI</option>
          <option value="roi-asc">Worst ROI</option>
          <option value="date-desc">Most Recent</option>
          <option value="date-asc">Oldest</option>
        </select>
      </div>
      
      <button class="add-funds-btn" @click="showAddFundsDialog = true">
        <i class="fas fa-plus"></i> Add Funds
      </button>
    </div>

    <div class="performance-chart">
      <canvas ref="chartCanvas" height="200"></canvas>
    </div>

    <div class="investments-section">
      <h3>Your Investments</h3>
      
      <div v-if="isLoading" class="loading-indicator">
        <i class="fas fa-spinner fa-spin"></i> Loading investments...
      </div>
      
      <div v-else-if="filteredInvestments.length === 0" class="no-investments">
        <i class="fas fa-coins"></i>
        <p>You haven't made any investments yet.</p>
        <button class="explore-btn" @click="exploreContent">Explore Content to Invest</button>
      </div>
      
      <div v-else class="investments-list">
        <div 
          v-for="investment in filteredInvestments" 
          :key="investment.id" 
          class="investment-item"
        >
          <div class="investment-content">
            <div class="content-image">
              <img 
                v-if="investment.content.thumbnail" 
                :src="investment.content.thumbnail" 
                :alt="investment.content.title"
                @error="e => e.target.src = 'https://via.placeholder.com/100x60?text=Stream'"
              >
              <div v-else class="placeholder-image">
                <i class="fas fa-photo-video"></i>
              </div>
            </div>
            <div class="content-details">
              <h4>{{ investment.content.title }}</h4>
              <p class="creator">by {{ investment.content.creator }}</p>
            </div>
          </div>
          
          <div class="investment-metrics">
            <div class="metric">
              <div class="metric-label">Initial</div>
              <div class="metric-value">{{ formatEth(investment.amount) }} ETH</div>
            </div>
            <div class="metric">
              <div class="metric-label">Current</div>
              <div class="metric-value">{{ formatEth(investment.currentValue) }} ETH</div>
            </div>
            <div class="metric">
              <div :class="['metric-value', getROIClass(investment.roi)]">
                {{ formatPercentage(investment.roi) }}
              </div>
            </div>
          </div>
          
          <div class="investment-actions">
            <button class="action-btn view-btn" @click="viewStream(investment.content)">
              <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn add-btn" @click="addInvestment(investment)">
              <i class="fas fa-plus"></i>
            </button>
            <button 
              class="action-btn sell-btn" 
              @click="sellInvestment(investment)"
              :disabled="investment.lockPeriod > 0"
            >
              <i class="fas fa-dollar-sign"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Add Funds Dialog -->
    <div class="modal-overlay" v-if="showAddFundsDialog" @click.self="showAddFundsDialog = false">
      <div class="modal-content">
        <h3>Add Funds to Wallet</h3>
        <div class="form-group">
          <label for="fundAmount">Amount (ETH)</label>
          <input 
            type="number" 
            id="fundAmount" 
            v-model.number="fundAmount" 
            min="0.001" 
            step="0.001"
          >
        </div>
        <div class="modal-actions">
          <button class="cancel-btn" @click="showAddFundsDialog = false">Cancel</button>
          <button class="confirm-btn" @click="addFunds" :disabled="!fundAmount || fundAmount <= 0">
            <i class="fas fa-wallet"></i> Add to Wallet
          </button>
        </div>
      </div>
    </div>
    
    <!-- Investment Dialog -->
    <div class="modal-overlay" v-if="showInvestDialog" @click.self="showInvestDialog = false">
      <div class="modal-content">
        <h3>Invest in "{{ selectedInvestment?.content.title }}"</h3>
        <div class="investment-summary">
          <div class="summary-row">
            <span>Current Investment:</span>
            <span>{{ formatEth(selectedInvestment?.amount || 0) }} ETH</span>
          </div>
          <div class="summary-row">
            <span>Current Value:</span>
            <span>{{ formatEth(selectedInvestment?.currentValue || 0) }} ETH</span>
          </div>
        </div>
        
        <div class="form-group">
          <label for="investAmount">Additional Investment (ETH)</label>
          <input 
            type="number" 
            id="investAmount" 
            v-model.number="investAmount" 
            min="0.001" 
            step="0.001"
            :max="availableFunds"
          >
          <div class="available-funds">Available: {{ formatEth(availableFunds) }} ETH</div>
        </div>
        
        <div class="lock-period">
          <label>Lock Period</label>
          <div class="lock-options">
            <button 
              v-for="period in lockPeriods" 
              :key="period.value"
              :class="['lock-option', { active: selectedLockPeriod === period.value }]"
              @click="selectedLockPeriod = period.value"
            >
              {{ period.label }}
              <span v-if="period.value > 0" class="bonus">+{{ period.bonus }}%</span>
            </button>
          </div>
          <p class="lock-info">
            <i class="fas fa-info-circle"></i>
            Longer lock periods offer bonus returns but prevent selling until the period ends.
          </p>
        </div>
        
        <div class="modal-actions">
          <button class="cancel-btn" @click="showInvestDialog = false">Cancel</button>
          <button 
            class="confirm-btn" 
            @click="confirmInvestment" 
            :disabled="!investAmount || investAmount <= 0 || investAmount > availableFunds"
          >
            <i class="fas fa-check"></i> Confirm Investment
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue';
import Chart from 'chart.js/auto';

const props = defineProps({
  userId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['viewStream', 'exploreContent', 'notification']);
const theme = inject('currentTheme', 'roman-theme');

// State
const investments = ref([]);
const isLoading = ref(true);
const walletBalance = ref(0);
const timeFilter = ref('1m');
const sortOption = ref('value-desc');
const chartInstance = ref(null);
const chartCanvas = ref(null);

// Fund management
const showAddFundsDialog = ref(false);
const fundAmount = ref(0.1);

// Investment management
const showInvestDialog = ref(false);
const selectedInvestment = ref(null);
const investAmount = ref(0.05);
const selectedLockPeriod = ref(0);

const lockPeriods = [
  { label: 'No Lock', value: 0, bonus: 0 },
  { label: '1 Week', value: 7, bonus: 5 },
  { label: '1 Month', value: 30, bonus: 15 },
  { label: '3 Months', value: 90, bonus: 30 },
];

// Computed properties
const totalInvested = computed(() => {
  return investments.value.reduce((total, inv) => total + inv.amount, 0);
});

const currentValue = computed(() => {
  return investments.value.reduce((total, inv) => total + inv.currentValue, 0);
});

const profitLoss = computed(() => {
  return currentValue.value - totalInvested.value;
});

const profitLossPercentage = computed(() => {
  if (totalInvested.value === 0) return 0;
  return (profitLoss.value / totalInvested.value) * 100;
});

const profitLossClass = computed(() => {
  if (profitLoss.value > 0) return 'profit';
  if (profitLoss.value < 0) return 'loss';
  return '';
});

const availableFunds = computed(() => {
  return walletBalance.value;
});

const filteredInvestments = computed(() => {
  const now = new Date();
  let filtered = [...investments.value];
  
  // Apply time filter
  if (timeFilter.value !== 'all') {
    let cutoffDate = new Date();
    
    switch(timeFilter.value) {
      case '1w':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '1m':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '3m':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case '1y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    filtered = filtered.filter(inv => new Date(inv.date) >= cutoffDate);
  }
  
  // Apply sort
  switch (sortOption.value) {
    case 'value-desc':
      filtered.sort((a, b) => b.currentValue - a.currentValue);
      break;
    case 'value-asc':
      filtered.sort((a, b) => a.currentValue - b.currentValue);
      break;
    case 'roi-desc':
      filtered.sort((a, b) => b.roi - a.roi);
      break;
    case 'roi-asc':
      filtered.sort((a, b) => a.roi - b.roi);
      break;
    case 'date-desc':
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case 'date-asc':
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
  }
  
  return filtered;
});

// Lifecycle hooks
onMounted(async () => {
  await fetchInvestments();
  initChart();
});

watch([timeFilter, sortOption], () => {
  updateChart();
});

// Methods
async function fetchInvestments() {
  try {
    isLoading.value = true;
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock data
    investments.value = [
      {
        id: '1',
        contentId: 1,
        amount: 0.5,
        currentValue: 0.62,
        roi: 24,
        date: '2023-05-15T10:30:00Z',
        lockPeriod: 0,
        content: {
          id: 1,
          title: 'Introduction to Blockchain',
          creator: 'CryptoExpert',
          thumbnail: 'https://via.placeholder.com/300x180?text=Blockchain',
        }
      },
      {
        id: '2',
        contentId: 3,
        amount: 1.2,
        currentValue: 1.35,
        roi: 12.5,
        date: '2023-06-22T14:45:00Z',
        lockPeriod: 0,
        content: {
          id: 3,
          title: 'Secure Decentralized Applications',
          creator: 'Web3Security',
          thumbnail: 'https://via.placeholder.com/300x180?text=DApps+Security',
        }
      },
      {
        id: '3',
        contentId: 2,
        amount: 0.3,
        currentValue: 0.27,
        roi: -10,
        date: '2023-07-10T09:15:00Z',
        lockPeriod: 15, // 15 days lock remaining
        content: {
          id: 2,
          title: 'Smart Contract Development',
          creator: 'EthDev',
          thumbnail: 'https://via.placeholder.com/300x180?text=Smart+Contracts',
        }
      },
      {
        id: '4',
        contentId: 4,
        amount: 0.75,
        currentValue: 0.9,
        roi: 20,
        date: '2023-08-05T16:20:00Z',
        lockPeriod: 0,
        content: {
          id: 4,
          title: 'Advanced Cryptography',
          creator: 'CryptoMaster',
          thumbnail: 'https://via.placeholder.com/300x180?text=Cryptography',
        }
      }
    ];
    
    // Mock wallet balance
    walletBalance.value = 2.5;
    
  } catch (error) {
    console.error('Error fetching investments:', error);
    emit('notification', {
      type: 'error',
      message: 'Failed to load investment data'
    });
  } finally {
    isLoading.value = false;
  }
}

function initChart() {
  if (chartInstance.value) {
    chartInstance.value.destroy();
  }
  
  const ctx = chartCanvas.value.getContext('2d');
  
  // Prepare data for chart
  const chartData = prepareChartData();
  
  chartInstance.value = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Portfolio Value',
          data: chartData.values,
          borderColor: theme === 'roman-theme' ? '#8B4513' : '#3498db',
          backgroundColor: theme === 'roman-theme' ? 'rgba(139, 69, 19, 0.1)' : 'rgba(52, 152, 219, 0.1)',
          fill: true,
          tension: 0.3
        },
        {
          label: 'Invested Amount',
          data: chartData.invested,
          borderColor: '#95a5a6',
          backgroundColor: 'rgba(149, 165, 166, 0.1)',
          borderDash: [5, 5],
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(3) + ' ETH';
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Date'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Value (ETH)'
          },
          beginAtZero: true
        }
      }
    }
  });
}

function prepareChartData() {
  // This is a simplified implementation - in a real app,
  // this would use actual historical data points
  
  const labels = [];
  const values = [];
  const invested = [];
  
  // Generate dates for the selected time period
  const today = new Date();
  let startDate = new Date();
  
  switch(timeFilter.value) {
    case '1w':
      startDate.setDate(today.getDate() - 7);
      break;
    case '1m':
      startDate.setMonth(today.getMonth() - 1);
      break;
    case '3m':
      startDate.setMonth(today.getMonth() - 3);
      break;
    case '1y':
      startDate.setFullYear(today.getFullYear() - 1);
      break;
    case 'all':
      // Find earliest investment date
      if (investments.value.length > 0) {
        const dates = investments.value.map(inv => new Date(inv.date));
        startDate = new Date(Math.min(...dates));
      } else {
        startDate.setMonth(today.getMonth() - 1);
      }
      break;
  }
  
  // Generate data points between start date and today
  const dataPoints = 20; // Fixed number of points for simplicity
  const timeIncrement = (today - startDate) / (dataPoints - 1);
  
  for (let i = 0; i < dataPoints; i++) {
    const date = new Date(startDate.getTime() + timeIncrement * i);
    labels.push(date.toLocaleDateString());
    
    // Simulate portfolio value and invested amount at this date
    // In a real app, this would use actual historical data
    
    // For demonstration, we'll create a trend that shows growth over time
    // with a bit of randomness to make it look realistic
    let investedAmount = 0;
    investments.value.forEach(inv => {
      const invDate = new Date(inv.date);
      if (invDate <= date) {
        investedAmount += inv.amount;
      }
    });
    
    invested.push(parseFloat(investedAmount.toFixed(3)));
    
    // Calculate value with some random fluctuation
    // More recent investments have less time to grow
    const growthFactor = 1 + (Math.random() * 0.3 - 0.05); // -5% to +25% randomness
    const value = parseFloat((investedAmount * growthFactor).toFixed(3));
    values.push(value);
  }
  
  return { labels, values, invested };
}

function updateChart() {
  if (chartInstance.value) {
    const chartData = prepareChartData();
    
    chartInstance.value.data.labels = chartData.labels;
    chartInstance.value.data.datasets[0].data = chartData.values;
    chartInstance.value.data.datasets[1].data = chartData.invested;
    
    chartInstance.value.update();
  }
}

function viewStream(content) {
  emit('viewStream', content);
}

function exploreContent() {
  emit('exploreContent');
}

function addFunds() {
  if (!fundAmount.value || fundAmount.value <= 0) return;
  
  try {
    // In a real app, this would connect to a wallet
    walletBalance.value += fundAmount.value;
    
    emit('notification', {
      type: 'success',
      message: `Added ${fundAmount.value.toFixed(3)} ETH to your wallet`
    });
    
    showAddFundsDialog.value = false;
    fundAmount.value = 0.1; // Reset for next time
  } catch (error) {
    console.error('Error adding funds:', error);
    emit('notification', {
      type: 'error',
      message: 'Failed to add funds to wallet'
    });
  }
}

function addInvestment(investment) {
  selectedInvestment.value = investment;
  investAmount.value = Math.min(0.05, availableFunds.value);
  selectedLockPeriod.value = 0;
  showInvestDialog.value = true;
}

function sellInvestment(investment) {
  if (investment.lockPeriod > 0) return;
  
  try {
    // In a real app, this would execute a sell transaction
    walletBalance.value += investment.currentValue;
    
    // Remove the investment from the list
    const index = investments.value.findIndex(inv => inv.id === investment.id);
    if (index !== -1) {
      investments.value.splice(index, 1);
    }
    
    emit('notification', {
      type: 'success',
      message: `Sold investment for ${formatEth(investment.currentValue)} ETH`
    });
    
    updateChart();
  } catch (error) {
    console.error('Error selling investment:', error);
    emit('notification', {
      type: 'error',
      message: 'Failed to sell investment'
    });
  }
}

async function confirmInvestment() {
  if (!investAmount.value || investAmount.value <= 0 || investAmount.value > availableFunds.value) {
    return;
  }
  
  try {
    const selectedBonus = lockPeriods.find(period => period.value === selectedLockPeriod.value).bonus;
    
    // Deduct from wallet
    walletBalance.value -= investAmount.value;
    
    if (selectedInvestment.value) {
      // Add to existing investment
      selectedInvestment.value.amount += investAmount.value;
      selectedInvestment.value.lockPeriod = Math.max(selectedInvestment.value.lockPeriod, selectedLockPeriod.value);
      
      // Calculate new current value with bonus applied
      const bonusFactor = 1 + (selectedBonus / 100);
      selectedInvestment.value.currentValue += (investAmount.value * bonusFactor);
      
      // Recalculate ROI
      selectedInvestment.value.roi = ((selectedInvestment.value.currentValue / selectedInvestment.value.amount) - 1) * 100;
    }
    
    emit('notification', {
      type: 'success',
      message: `Successfully invested ${formatEth(investAmount.value)} ETH`
    });
    
    showInvestDialog.value = false;
    updateChart();
  } catch (error) {
    console.error('Error confirming investment:', error);
    emit('notification', {
      type: 'error',
      message: 'Failed to complete investment'
    });
  }
}

function formatEth(value) {
  if (value === undefined || value === null) return '0.000';
  return value.toFixed(3);
}

function formatProfitLoss(value) {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${formatEth(value)} ETH`;
}

function formatPercentage(value) {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

function getROIClass(roi) {
  if (roi > 0) return 'profit';
  if (roi < 0) return 'loss';
  return '';
}
</script>

<style scoped>
.investment-portfolio {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.portfolio-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.portfolio-header h2 {
  margin: 0;
  font-size: 1.8rem;
}

.portfolio-summary {
  display: flex;
  gap: 20px;
}

.summary-item {
  text-align: right;
}

.summary-label {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 1.4rem;
  font-weight: 600;
}

.profit {
  color: #27ae60;
}

.loss {
  color: #e74c3c;
}

.percentage {
  font-size: 0.9rem;
  margin-left: 4px;
  opacity: 0.8;
}

.portfolio-controls {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.filter-options {
  display: flex;
  gap: 10px;
}

.time-filter, .sort-options {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  font-size: 0.9rem;
  cursor: pointer;
}

.add-funds-btn {
  padding: 8px 16px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.add-funds-btn:hover {
  background-color: #2980b9;
}

.performance-chart {
  height: 300px;
  margin-bottom: 30px;
  position: relative;
}

.investments-section h3 {
  margin: 0 0 15px 0;
  font-size: 1.4rem;
}

.loading-indicator {
  text-align: center;
  padding: 40px;
  color: #666;
}

.no-investments {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.no-investments i {
  font-size: 3rem;
  margin-bottom: 15px;
  color: #bbb;
}

.explore-btn {
  margin-top: 15px;
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.explore-btn:hover {
  background-color: #2980b9;
}

.investment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 6px;
  margin-bottom: 15px;
  transition: transform 0.2s;
}

.investment-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.investment-content {
  display: flex;
  align-items: center;
  gap: 15px;
  max-width: 40%;
  min-width: 250px;
}

.content-image {
  width: 100px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.content-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  color: #aaa;
}

.content-details h4 {
  margin: 0 0 5px 0;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content-details .creator {
  margin: 0;
  font-size: 0.85rem;
  color: #666;
}

.investment-metrics {
  display: flex;
  gap: 20px;
}

.metric {
  text-align: center;
}

.metric-label {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 3px;
}

.metric-value {
  font-weight: 600;
}

.investment-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.view-btn {
  background-color: #f5f5f5;
  color: #333;
}

.view-btn:hover {
  background-color: #e0e0e0;
}

.add-btn {
  background-color: #3498db;
  color: white;
}

.add-btn:hover {
  background-color: #2980b9;
}

.sell-btn {
  background-color: #27ae60;
  color: white;
}

.sell-btn:hover {
  background-color: #2ecc71;
}

.sell-btn:disabled {
  background-color: #bdc3c7;
  color: #ecf0f1;
  cursor: not-allowed;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 25px;
  border-radius: 8px;
  width: 450px;
  max-width: 90%;
}

.modal-content h3 {
  margin: 0 0 20px 0;
  font-size: 1.4rem;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.available-funds {
  margin-top: 5px;
  font-size: 0.85rem;
  color: #666;
  text-align: right;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 20px;
}

.cancel-btn, .confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.cancel-btn {
  background-color: #f5f5f5;
  color: #333;
}

.cancel-btn:hover {
  background-color: #e0e0e0;
}

.confirm-btn {
  background-color: #3498db;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
}

.confirm-btn:hover {
  background-color: #2980b9;
}

.confirm-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.investment-summary {
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.summary-row:last-child {
  margin-bottom: 0;
}

.lock-period {
  margin-bottom: 20px;
}

.lock-period label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

.lock-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}

.lock-option {
  padding: 10px 8px;
  text-align: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  font-size: 0.9rem;
}

.lock-option:hover {
  background-color: #f5f5f5;
}

.lock-option.active {
  border-color: #3498db;
  background-color: rgba(52, 152, 219, 0.1);
}

.bonus {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #27ae60;
  margin-top: 3px;
}

.lock-info {
  font-size: 0.85rem;
  color: #666;
  margin: 5px 0 0 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.lock-info i {
  font-size: 1rem;
  color: #3498db;
}

/* Roman theme overrides */
.roman-theme {
  border: 1px solid #d5c3aa;
}

.roman-theme .add-funds-btn,
.roman-theme .explore-btn,
.roman-theme .add-btn,
.roman-theme .confirm-btn {
  background-color: #8B4513;
}

.roman-theme .add-funds-btn:hover,
.roman-theme .explore-btn:hover,
.roman-theme .add-btn:hover,
.roman-theme .confirm-btn:hover {
  background-color: #A0522D;
}

.roman-theme .sell-btn {
  background-color: #6B8E23;
}

.roman-theme .sell-btn:hover {
  background-color: #556B2F;
}

.roman-theme .profit {
  color: #6B8E23;
}

.roman-theme .time-filter,
.roman-theme .sort-options {
  border-color: #d5c3aa;
}

.roman-theme .investment-item {
  border-color: #d5c3aa;
}

.roman-theme .investment-summary {
  background-color: #f5eee6;
}

.roman-theme .lock-info i {
  color: #8B4513;
}

.roman-theme .lock-option.active {
  border-color: #8B4513;
  background-color: rgba(139, 69, 19, 0.1);
}

@media (max-width: 768px) {
  .portfolio-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .portfolio-summary {
    flex-wrap: wrap;
    gap: 15px 30px;
  }
  
  .investment-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .investment-content {
    max-width: 100%;
  }
  
  .investment-metrics {
    width: 100%;
    justify-content: space-between;
  }
  
  .investment-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .lock-options {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .summary-item {
    width: 100%;
    text-align: left;
  }
  
  .portfolio-controls {
    flex-direction: column;
  }
  
  .filter-options {
    width: 100%;
    justify-content: space-between;
  }
  
  .add-funds-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
