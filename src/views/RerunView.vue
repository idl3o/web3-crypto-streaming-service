<template>
  <div class="rerun-view">
    <div class="page-header">
      <h1>Transaction Rerun Analysis</h1>
      <p>Replay and optimize your transaction history with powerful "what-if" scenarios</p>
    </div>
    
    <div class="main-content">
      <div class="info-panel">
        <div class="panel-header">
          <h3>About Rerun Analysis</h3>
        </div>
        <div class="panel-content">
          <p>Rerun analysis lets you replay historical blockchain transactions to analyze different outcomes under various conditions. Use this to:</p>
          
          <ul class="feature-list">
            <li>
              <i class="fas fa-search"></i>
              <div>
                <strong>Analyze Past Transactions</strong>
                <span>Understand the details and outcomes of your historical blockchain activity</span>
              </div>
            </li>
            <li>
              <i class="fas fa-bolt"></i>
              <div>
                <strong>Optimize Execution</strong>
                <span>Discover better gas prices, timing, and parameters for your transactions</span>
              </div>
            </li>
            <li>
              <i class="fas fa-random"></i>
              <div>
                <strong>Explore Alternatives</strong>
                <span>See how different execution paths might have affected your results</span>
              </div>
            </li>
            <li>
              <i class="fas fa-question-circle"></i>
              <div>
                <strong>Run What-If Scenarios</strong>
                <span>Experiment with parameter changes to predict different outcomes</span>
              </div>
            </li>
          </ul>
          
          <div class="stats-section">
            <h4>Your Statistics</h4>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value">{{ userStats.transactionCount }}</div>
                <div class="stat-label">Transactions</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ userStats.rerunsPerformed }}</div>
                <div class="stat-label">Reruns</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ userStats.savingsPercent }}%</div>
                <div class="stat-label">Potential Savings</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ userStats.optimizationsFound }}</div>
                <div class="stat-label">Optimizations</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="analyzer-container">
        <RerunAnalyzer 
          :address="currentAddress"
          @rerun-complete="handleRerunComplete"
        />
      </div>
      
      <div class="insights-panel" v-if="recentInsights.length > 0">
        <div class="panel-header">
          <h3>Recent Insights</h3>
        </div>
        <div class="panel-content">
          <ul class="insights-list">
            <li v-for="(insight, index) in recentInsights" :key="index">
              <div class="insight-icon">
                <i class="fas fa-lightbulb"></i>
              </div>
              <div class="insight-content">
                <p>{{ insight.text }}</p>
                <div class="insight-meta">
                  <span class="transaction-type">{{ insight.transactionType }}</span>
                  <span class="insight-time">{{ insight.time }}</span>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import RerunAnalyzer from '@/components/rerun/RerunAnalyzer.vue';
import * as BlockchainService from '@/services/BlockchainService';

// State
const currentAddress = ref(null);
const recentInsights = ref([]);
const userStats = ref({
  transactionCount: 0,
  rerunsPerformed: 0,
  savingsPercent: 0,
  optimizationsFound: 0
});

// Methods
async function loadUserData() {
  try {
    // Get current wallet address
    if (BlockchainService.isConnected()) {
      currentAddress.value = BlockchainService.getCurrentAccount();
    }
    
    // Load mock statistics for demo
    userStats.value = {
      transactionCount: Math.floor(Math.random() * 100) + 20, // 20-119
      rerunsPerformed: Math.floor(Math.random() * 30) + 5,    // 5-34
      savingsPercent: Math.floor(Math.random() * 15) + 3,     // 3-17%
      optimizationsFound: Math.floor(Math.random() * 25) + 2  // 2-26
    };
    
    // Load mock insights
    const mockInsights = [
      {
        text: "Using a higher gas price for streaming payments during peak hours could increase transaction success rate by 32%",
        transactionType: "Streaming Payment",
        time: "2 hours ago"
      },
      {
        text: "Lowering quality level for short-form content could reduce costs by 0.003 ETH without affecting user experience",
        transactionType: "Content Streaming",
        time: "Yesterday"
      },
      {
        text: "Alternative execution path found that could have saved 42% on gas fees for your recent NFT mint",
        transactionType: "NFT Mint",
        time: "3 days ago"
      },
      {
        text: "Long position investment transaction could have yielded 3% better returns with optimized timing",
        transactionType: "Investment",
        time: "Last week"
      }
    ];
    
    recentInsights.value = mockInsights;
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// Event Handlers
function handleRerunComplete(result) {
  if (result && result.success) {
    // Increment stats
    userStats.value.rerunsPerformed++;
    
    // Add a new insight based on the rerun result
    if (result.simulation.results.insights && result.simulation.results.insights.length > 0) {
      const newInsight = {
        text: result.simulation.results.insights[0],
        transactionType: formatCategoryName(result.transaction.category),
        time: "Just now"
      };
      
      recentInsights.value.unshift(newInsight);
      
      // Keep only the latest 5 insights
      if (recentInsights.value.length > 5) {
        recentInsights.value.pop();
      }
    }
  }
}

// Helper functions
function formatCategoryName(category) {
  if (!category) return 'Transaction';
  
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Initialize
onMounted(async () => {
  await loadUserData();
});
</script>

<style scoped>
.rerun-view {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-header h1 {
  font-size: 2.2rem;
  margin-bottom: 10px;
  color: #2c3e50;
}

.page-header p {
  color: #7f8c8d;
  font-size: 1.1rem;
  max-width: 600px;
  margin: 0 auto;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 30px;
}

.info-panel, .insights-panel {
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.panel-header {
  padding: 15px 20px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e6e9ed;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #2c3e50;
}

.panel-content {
  padding: 20px;
}

.panel-content p {
  margin-top: 0;
  color: #34495e;
  line-height: 1.5;
}

.feature-list {
  list-style-type: none;
  padding: 0;
  margin: 20px 0;
}

.feature-list li {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  align-items: flex-start;
}

.feature-list li i {
  background-color: #edf7ff;
  color: #3498db;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feature-list li div {
  display: flex;
  flex-direction: column;
}

.feature-list li strong {
  margin-bottom: 4px;
  color: #2c3e50;
}

.feature-list li span {
  font-size: 0.9rem;
  color: #7f8c8d;
}

.stats-section {
  margin-top: 30px;
  border-top: 1px solid #edf0f7;
  padding-top: 20px;
}

.stats-section h4 {
  margin: 0 0 15px 0;
  font-size: 1rem;
  color: #2c3e50;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 20px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 1.6rem;
  font-weight: 600;
  color: #3498db;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 0.8rem;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.insights-panel {
  grid-column: 1 / -1;
  margin-top: 30px;
}

.insights-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.insights-list li {
  display: flex;
  gap: 15px;
  padding: 15px 0;
  border-bottom: 1px solid #edf0f7;
}

.insights-list li:last-child {
  border-bottom: none;
}

.insight-icon {
  width: 36px;
  height: 36px;
  background-color: #fdf5ed;
  color: #f39c12;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.insight-content {
  flex: 1;
}

.insight-content p {
  margin: 0 0 5px 0;
  color: #34495e;
}

.insight-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.transaction-type {
  color: #3498db;
  font-weight: 500;
}

.insight-time {
  color: #95a5a6;
}

@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  
  .info-panel {
    order: 2;
  }
  
  .analyzer-container {
    order: 1;
  }
  
  .insights-panel {
    order: 3;
  }
}

@media (max-width: 768px) {
  .page-header h1 {
    font-size: 1.8rem;
  }
  
  .page-header p {
    font-size: 1rem;
  }
}
</style>
