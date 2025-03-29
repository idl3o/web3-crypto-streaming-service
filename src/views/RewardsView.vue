<template>
  <div class="rewards-view" :class="theme">
    <h1>Rewards Shop</h1>
    <p class="intro-text">Redeem your earned points for exclusive benefits and features</p>
    
    <div class="user-points-banner">
      <div class="points-container">
        <i class="fas fa-coins points-icon"></i>
        <div class="points-info">
          <div class="points-label">Your Points</div>
          <div class="points-value">{{ userPoints }}</div>
        </div>
      </div>
      <div class="points-history">
        <button class="history-btn" @click="showPointsHistory = true">
          <i class="fas fa-history"></i> Transaction History
        </button>
      </div>
    </div>
    
    <div class="rewards-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-btn', { 'active': currentTab === tab.id }]"
        @click="currentTab = tab.id"
      >
        <i :class="tab.icon"></i> {{ tab.name }}
      </button>
    </div>
    
    <div class="rewards-grid">
      <div 
        v-for="reward in filteredRewards" 
        :key="reward.id" 
        class="reward-card"
        :class="{ 'reward-owned': userOwnedRewards.includes(reward.id) }"
      >
        <div class="reward-badge">
          <i :class="reward.icon"></i>
        </div>
        <div class="reward-details">
          <h3>{{ reward.name }}</h3>
          <p class="reward-description">{{ reward.description }}</p>
          <div class="reward-footer">
            <div class="reward-cost">
              <i class="fas fa-coins"></i> {{ reward.cost }}
            </div>
            <button 
              v-if="!userOwnedRewards.includes(reward.id)"
              class="redeem-btn" 
              @click="openPurchaseModal(reward)"
              :disabled="userPoints < reward.cost"
            >
              {{ userPoints >= reward.cost ? 'Redeem' : 'Not Enough Points' }}
            </button>
            <div v-else class="reward-status">
              <i class="fas fa-check-circle"></i> Redeemed
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="filteredRewards.length === 0" class="empty-rewards">
      <i class="fas fa-box-open"></i>
      <p>No rewards available in this category yet</p>
    </div>
    
    <!-- Purchase Confirmation Modal -->
    <div class="modal-overlay" v-if="showPurchaseModal" @click.self="showPurchaseModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Confirm Redemption</h3>
          <button class="close-modal" @click="showPurchaseModal = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="purchase-details">
          <div class="purchase-reward">
            <div class="reward-badge large">
              <i :class="selectedReward?.icon"></i>
            </div>
            <div class="reward-info">
              <h4>{{ selectedReward?.name }}</h4>
              <p>{{ selectedReward?.description }}</p>
            </div>
          </div>
          
          <div class="purchase-cost">
            <div class="cost-label">Cost</div>
            <div class="cost-value">
              <i class="fas fa-coins"></i> {{ selectedReward?.cost }} Points
            </div>
          </div>
          
          <div class="balance-after">
            <div class="balance-label">Balance after redemption</div>
            <div class="balance-value">{{ userPoints - (selectedReward?.cost || 0) }} Points</div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="cancel-btn" @click="showPurchaseModal = false">Cancel</button>
          <button class="confirm-btn" @click="purchaseReward">
            Confirm Redemption
          </button>
        </div>
      </div>
    </div>
    
    <!-- Points History Modal -->
    <div class="modal-overlay" v-if="showPointsHistory" @click.self="showPointsHistory = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Points Transaction History</h3>
          <button class="close-modal" @click="showPointsHistory = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="history-list">
          <div v-if="pointsHistory.length === 0" class="empty-history">
            <p>No transaction history yet</p>
          </div>
          
          <div v-else v-for="transaction in pointsHistory" :key="transaction.id" class="history-item">
            <div class="transaction-info">
              <div class="transaction-title">{{ transaction.description }}</div>
              <div class="transaction-date">{{ formatDate(transaction.date) }}</div>
            </div>
            <div :class="['transaction-amount', transaction.amount > 0 ? 'earned' : 'spent']">
              {{ transaction.amount > 0 ? '+' : '' }}{{ transaction.amount }}
            </div>
          </div>
        </div>
        
        <div class="modal-actions centered">
          <button class="close-btn" @click="showPointsHistory = false">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const theme = inject('currentTheme', 'roman-theme');

// State
const userPoints = ref(450);
const userOwnedRewards = ref(['r3', 'r7']);
const currentTab = ref('all');
const showPurchaseModal = ref(false);
const showPointsHistory = ref(false);
const selectedReward = ref(null);

// Tabs for filtering rewards
const tabs = [
  { id: 'all', name: 'All Rewards', icon: 'fas fa-star' },
  { id: 'investment', name: 'Investment', icon: 'fas fa-chart-line' },
  { id: 'profile', name: 'Profile', icon: 'fas fa-user' },
  { id: 'interface', name: 'Interface', icon: 'fas fa-palette' },
  { id: 'special', name: 'Special', icon: 'fas fa-gem' }
];

// Rewards data
const rewards = ref([
  {
    id: 'r1',
    name: 'Premium Content Access',
    description: 'Unlock access to premium content for 1 month',
    icon: 'fas fa-crown',
    cost: 200,
    category: 'special',
    effect: 'unlock_premium_content'
  },
  {
    id: 'r2',
    name: 'Investment Fee Reduction',
    description: '5% reduction on investment fees for 2 weeks',
    icon: 'fas fa-percentage',
    cost: 150,
    category: 'investment',
    effect: 'reduce_fees'
  },
  {
    id: 'r3',
    name: 'Verified Badge',
    description: 'Display a verified badge on your profile',
    icon: 'fas fa-check-circle',
    cost: 300,
    category: 'profile',
    effect: 'verified_badge'
  },
  {
    id: 'r4',
    name: 'Custom Profile Theme',
    description: 'Unlock exclusive profile theme options',
    icon: 'fas fa-paint-brush',
    cost: 250,
    category: 'interface',
    effect: 'custom_theme'
  },
  {
    id: 'r5',
    name: 'Investment Alerts',
    description: 'Receive early notifications about trending content',
    icon: 'fas fa-bell',
    cost: 180,
    category: 'investment',
    effect: 'investment_alerts'
  },
  {
    id: 'r6',
    name: 'Advanced Analytics',
    description: 'Access to advanced investment performance analytics',
    icon: 'fas fa-chart-bar',
    cost: 350,
    category: 'investment',
    effect: 'advanced_analytics'
  },
  {
    id: 'r7',
    name: 'Custom Username Color',
    description: 'Change the color of your username in comments',
    icon: 'fas fa-palette',
    cost: 120,
    category: 'profile',
    effect: 'username_color'
  },
  {
    id: 'r8',
    name: 'Exclusive Emotes',
    description: 'Unlock special emotes for stream comments',
    icon: 'fas fa-smile',
    cost: 200,
    category: 'profile',
    effect: 'exclusive_emotes'
  },
  {
    id: 'r9',
    name: 'Dark Theme',
    description: 'Unlock the dark theme for the platform interface',
    icon: 'fas fa-moon',
    cost: 150,
    category: 'interface',
    effect: 'dark_theme'
  },
  {
    id: 'r10',
    name: 'Priority Support',
    description: 'Get priority support for 1 month',
    icon: 'fas fa-headset',
    cost: 300,
    category: 'special',
    effect: 'priority_support'
  }
]);

// Mock points transaction history
const pointsHistory = ref([
  {
    id: 'tr1',
    description: 'Achievement: Early Adopter',
    amount: 100,
    date: '2023-09-10T14:22:10Z'
  },
  {
    id: 'tr2',
    description: 'Achievement: First Investment',
    amount: 75,
    date: '2023-09-12T09:47:35Z'
  },
  {
    id: 'tr3',
    description: 'Daily Quest: Watch 3 K80 protocol streams',
    amount: 50,
    date: '2023-09-13T16:18:42Z'
  },
  {
    id: 'tr4',
    description: 'Achievement: Blockchain Explorer',
    amount: 75,
    date: '2023-09-13T11:05:47Z'
  },
  {
    id: 'tr5',
    description: 'Daily Quest: Invest in any stream',
    amount: 75,
    date: '2023-09-14T14:30:22Z'
  },
  {
    id: 'tr6',
    description: 'Achievement: K80 Pioneer',
    amount: 40,
    date: '2023-09-11T18:33:22Z'
  },
  {
    id: 'tr7',
    description: 'Redeemed: Custom Username Color',
    amount: -120,
    date: '2023-09-15T10:12:33Z'
  },
  {
    id: 'tr8',
    description: 'Daily Login Streak Bonus (5 days)',
    amount: 50,
    date: '2023-09-15T08:00:00Z'
  },
  {
    id: 'tr9',
    description: 'Redeemed: Verified Badge',
    amount: -300,
    date: '2023-09-16T09:45:17Z'
  },
  {
    id: 'tr10',
    description: 'Level Up Bonus: Level 3',
    amount: 100,
    date: '2023-09-17T15:30:00Z'
  }
]);

// Computed
const filteredRewards = computed(() => {
  if (currentTab.value === 'all') {
    return rewards.value;
  } else {
    return rewards.value.filter(reward => reward.category === currentTab.value);
  }
});

// Lifecycle
onMounted(() => {
  fetchUserRewardsData();
});

// Methods
async function fetchUserRewardsData() {
  // In a real app, this would be an API call
  console.log('Fetching user rewards data...');
  // Mock data is already set up in our refs
}

function openPurchaseModal(reward) {
  if (userPoints.value < reward.cost) return;
  
  selectedReward.value = reward;
  showPurchaseModal.value = true;
}

function purchaseReward() {
  if (!selectedReward.value || userPoints.value < selectedReward.value.cost) {
    return;
  }
  
  // Update user points
  userPoints.value -= selectedReward.value.cost;
  
  // Add to owned rewards
  userOwnedRewards.value.push(selectedReward.value.id);
  
  // Add transaction to history
  const transaction = {
    id: `tr${pointsHistory.value.length + 1}`,
    description: `Redeemed: ${selectedReward.value.name}`,
    amount: -selectedReward.value.cost,
    date: new Date().toISOString()
  };
  pointsHistory.value.unshift(transaction);
  
  // In a real app, this would be an API call to the backend
  
  // Show confirmation
  alert(`Successfully redeemed ${selectedReward.value.name}!`);
  
  // Close modal
  showPurchaseModal.value = false;
}

function formatDate(dateString) {
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
}
</script>

<style scoped>
.rewards-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  margin-top: 0;
  margin-bottom: 5px;
  font-size: 2rem;
}

.intro-text {
  color: #666;
  margin-bottom: 20px;
}

.user-points-banner {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.points-container {
  display: flex;
  align-items: center;
  gap: 15px;
}

.points-icon {
  font-size: 2rem;
  color: #f39c12;
  animation: spin 4s infinite linear;
  width: 40px;
  height: 40px;
  background-color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(15deg); }
  75% { transform: rotate(-15deg); }
  100% { transform: rotate(0deg); }
}

.points-label {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 3px;
}

.points-value {
  font-size: 1.8rem;
  font-weight: 700;
}

.history-btn {
  padding: 8px 15px;
  background-color: transparent;
  border: 1px solid #ddd;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.history-btn:hover {
  background-color: #f5f5f5;
}

.rewards-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 25px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 8px 16px;
  border: none;
  background-color: #f5f5f5;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  font-size: 0.9rem;
  font-weight: 500;
}

.tab-btn:hover {
  background-color: #e0e0e0;
}

.tab-btn.active {
  background-color: #3498db;
  color: white;
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.reward-card {
  background-color: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  height: 100%;
}

.reward-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.reward-owned {
  border: 2px solid #27ae60;
}

.reward-badge {
  width: 80px;
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  flex-shrink: 0;
}

.reward-details {
  padding: 15px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.reward-details h3 {
  margin: 0 0 10px 0;
  font-size: 1.2rem;
}

.reward-description {
  margin: 0 0 15px 0;
  font-size: 0.9rem;
  color: #666;
  flex-grow: 1;
}

.reward-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.reward-cost {
  font-weight: 600;
  color: #f39c12;
  display: flex;
  align-items: center;
  gap: 5px;
}

.redeem-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background-color: #3498db;
  color: white;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.redeem-btn:hover:not(:disabled) {
  background-color: #2980b9;
}

.redeem-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.reward-status {
  color: #27ae60;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 5px;
}

.empty-rewards {
  text-align: center;
  padding: 40px 0;
  color: #999;
}

.empty-rewards i {
  font-size: 3rem;
  margin-bottom: 15px;
  opacity: 0.5;
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
  border-radius: 10px;
  padding: 25px;
  width: 500px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.4rem;
}

.close-modal {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.close-modal:hover {
  opacity: 1;
}

.purchase-details {
  margin-bottom: 25px;
}

.purchase-reward {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.reward-badge.large {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  font-size: 1.8rem;
  flex-shrink: 0;
}

.reward-info h4 {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
}

.reward-info p {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
}

.purchase-cost, .balance-after {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.cost-label, .balance-label {
  font-size: 0.95rem;
}

.cost-value {
  font-weight: 600;
  color: #f39c12;
  display: flex;
  align-items: center;
  gap: 5px;
}

.balance-value {
  font-weight: 600;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 20px;
}

.modal-actions.centered {
  justify-content: center;
}

.cancel-btn, .confirm-btn, .close-btn {
  padding: 10px 20px;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
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
}

.confirm-btn:hover {
  background-color: #2980b9;
}

.close-btn {
  background-color: #3498db;
  color: white;
  min-width: 120px;
}

.close-btn:hover {
  background-color: #2980b9;
}

/* History list styles */
.history-list {
  max-height: 400px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.transaction-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.transaction-date {
  font-size: 0.8rem;
  color: #999;
}

.transaction-amount {
  font-weight: 600;
  white-space: nowrap;
}

.transaction-amount.earned {
  color: #27ae60;
}

.transaction-amount.spent {
  color: #e74c3c;
}

.empty-history {
  text-align: center;
  padding: 30px 0;
  color: #999;
}

/* Roman theme overrides */
.roman-theme .user-points-banner {
  background-color: #f8f5f0;
  border: 1px solid #d5c3aa;
}

.roman-theme .points-icon {
  color: #CD853F;
}

.roman-theme .history-btn {
  border-color: #d5c3aa;
}

.roman-theme .tab-btn.active {
  background-color: #8B4513;
}

.roman-theme .reward-badge {
  background: linear-gradient(135deg, #8B4513, #A0522D);
}

.roman-theme .reward-owned {
  border-color: #6B8E23;
}

.roman-theme .reward-cost {
  color: #CD853F;
}

.roman-theme .redeem-btn {
  background-color: #8B4513;
}

.roman-theme .redeem-btn:hover:not(:disabled) {
  background-color: #A0522D;
}

.roman-theme .reward-status {
  color: #6B8E23;
}

.roman-theme .purchase-reward {
  border-bottom-color: #d5c3aa;
}

.roman-theme .cost-value {
  color: #CD853F;
}

.roman-theme .confirm-btn,
.roman-theme .close-btn {
  background-color: #8B4513;
}

.roman-theme .confirm-btn:hover,
.roman-theme .close-btn:hover {
  background-color: #A0522D;
}

.roman-theme .transaction-amount.earned {
  color: #6B8E23;
}

.roman-theme .history-item {
  border-bottom-color: #d5c3aa;
}

/* Responsive styles */
@media (max-width: 768px) {
  .user-points-banner {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .points-history {
    width: 100%;
  }
  
  .history-btn {
    width: 100%;
    justify-content: center;
  }
  
  .rewards-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

@media (max-width: 480px) {
  .rewards-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .cancel-btn, .confirm-btn, .close-btn {
    width: 100%;
  }
  
  .reward-card {
    flex-direction: column;
  }
  
  .reward-badge {
    width: 100%;
    height: 70px;
  }
}
</style>
