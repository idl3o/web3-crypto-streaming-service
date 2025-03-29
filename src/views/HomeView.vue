<template>
  <div class="home">
    <h1>Welcome to the Crypto Streaming Service</h1>
    <p>Discover the latest in blockchain and cryptocurrency content.</p>
    
    <!-- User Dashboard with Gamification -->
    <div class="dashboard-section" v-if="isLoggedIn">
      <div class="game-elements-header">
        <div class="welcome-message">
          <h2>Welcome back, {{ currentUserName }}!</h2>
          <div class="streak-badge" v-if="userStreak > 0">
            <i class="fas fa-fire"></i> {{ userStreak }} Day Streak
          </div>
        </div>
        
        <div class="quick-links">
          <router-link to="/achievements" class="quick-link">
            <i class="fas fa-trophy"></i> Achievements
          </router-link>
          <router-link to="/rewards" class="quick-link">
            <i class="fas fa-gift"></i> Rewards
          </router-link>
        </div>
      </div>
      
      <GamificationModule 
        :userId="currentUserId" 
        @quest-completed="handleQuestCompleted"
        @level-up="handleLevelUp"
      />
      
      <div class="active-rewards" v-if="activeRewards.length > 0">
        <h3>Your Active Rewards</h3>
        <div class="rewards-list">
          <div v-for="reward in activeRewards" :key="reward.id" class="reward-item">
            <div class="reward-icon">
              <i :class="reward.icon"></i>
            </div>
            <div class="reward-info">
              <div class="reward-name">{{ reward.name }}</div>
              <div class="reward-expiry" v-if="reward.expiryDate">
                Expires: {{ formatDate(reward.expiryDate) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Holographic Featured Content -->
    <section class="holographic-showcase">
      <ContentHologram 
        title="Featured Streams"
        :contents="featuredContent"
        @view="navigateToContent"
        @invest="showInvestDialog"
      />
    </section>
    
    <!-- Investment Dialog -->
    <div class="modal-overlay" v-if="showInvestmentDialog" @click.self="showInvestmentDialog = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Invest in "{{ selectedContent?.title }}"</h3>
          <button class="close-modal-btn" @click="showInvestmentDialog = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="investment-preview">
          <div class="preview-thumbnail">
            <img 
              :src="selectedContent?.thumbnail" 
              :alt="selectedContent?.title"
              @error="e => e.target.src = 'https://via.placeholder.com/100x60?text=Stream'"
            >
          </div>
          <div class="preview-details">
            <h4>{{ selectedContent?.title }}</h4>
            <p>by {{ selectedContent?.creator }}</p>
          </div>
        </div>
        
        <div class="form-group">
          <label for="investAmount">Investment Amount (ETH)</label>
          <input 
            type="number" 
            id="investAmount" 
            v-model.number="investAmount" 
            min="0.001" 
            step="0.001"
            :max="walletBalance"
          >
          <div class="available-funds">Available: {{ formatEth(walletBalance) }} ETH</div>
        </div>
        
        <div class="estimated-returns">
          <div class="returns-label">Estimated Returns (3 months)</div>
          <div class="scenarios">
            <div class="scenario">
              <div class="scenario-label">Conservative</div>
              <div class="scenario-value">{{ formatEth(calculateReturn(investAmount, 5)) }} ETH</div>
            </div>
            <div class="scenario">
              <div class="scenario-label">Expected</div>
              <div class="scenario-value">{{ formatEth(calculateReturn(investAmount, 15)) }} ETH</div>
            </div>
            <div class="scenario">
              <div class="scenario-label">Optimistic</div>
              <div class="scenario-value">{{ formatEth(calculateReturn(investAmount, 25)) }} ETH</div>
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="cancel-btn" @click="showInvestmentDialog = false">Cancel</button>
          <button 
            class="confirm-btn" 
            @click="confirmInvestment" 
            :disabled="!investAmount || investAmount <= 0 || investAmount > walletBalance"
          >
            <i class="fas fa-check"></i> Confirm Investment
          </button>
        </div>
      </div>
    </div>
    
    <!-- Themes Showcase -->
    <section class="themes-showcase">
      <div class="container">
        <h2>Experience Different Visual Modes</h2>
        <div class="themes-grid">
          <div class="theme-preview uranium-theme glass-panel">
            <div class="theme-header">
              <h3 class="glow-text">Uranium Mode</h3>
              <span class="badge pulse">New</span>
            </div>
            <div class="theme-content">
              <p>Experience the glowing power of blockchain with our Uranium theme.</p>
              <button class="btn-primary glow" @click="activateTheme('uranium-theme')">
                Activate Uranium
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import ContentHologram from '@/components/content/ContentHologram.vue';
import GamificationModule from '@/components/gamification/GamificationModule.vue';

const router = useRouter();

// User state
const currentUserId = ref('user123');
const currentUserName = ref('Crypto Voyager');
const isLoggedIn = computed(() => !!currentUserId.value);
const userStreak = ref(5);

// Active rewards
const activeRewards = ref([
  {
    id: 'r2',
    name: 'Investment Fee Reduction (5%)',
    icon: 'fas fa-percentage',
    expiryDate: '2023-10-02T23:59:59Z'
  },
  {
    id: 'r3',
    name: 'Verified Badge',
    icon: 'fas fa-check-circle',
    expiryDate: null
  }
]);

// Hologram featured content
const featuredContent = ref([]);
const showInvestmentDialog = ref(false);
const selectedContent = ref(null);
const walletBalance = ref(2.5); // Mock wallet balance
const investAmount = ref(0.05);

onMounted(async () => {
  await loadFeaturedContent();
});

async function loadFeaturedContent() {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  featuredContent.value = [
    {
      id: 1,
      title: 'Introduction to Blockchain',
      creator: 'CryptoExpert',
      description: 'Learn the basics of blockchain technology and its applications.',
      thumbnail: 'https://via.placeholder.com/300x180?text=Blockchain',
      paymentRate: 0.002,
      views: 1250,
      protocol: 'standard'
    },
    {
      id: 3,
      title: 'Secure Decentralized Applications',
      creator: 'Web3Security',
      description: 'Building secure and resilient decentralized applications with advanced protocols.',
      thumbnail: 'https://via.placeholder.com/300x180?text=DApps+Security',
      paymentRate: 0.008,
      views: 650,
      protocol: 'k80'
    },
    {
      id: 6,
      title: 'NFT Market Analysis',
      creator: 'CryptoVision',
      description: 'Deep dive into current NFT market trends and projections for the future.',
      thumbnail: 'https://via.placeholder.com/300x180?text=NFT+Analysis',
      paymentRate: 0.005,
      views: 820,
      protocol: 'standard'
    },
    {
      id: 7,
      title: 'Layer 2 Solutions Deep Dive',
      creator: 'ScalingPro',
      description: 'Detailed analysis of Layer 2 scaling solutions for Ethereum and other blockchains.',
      thumbnail: 'https://via.placeholder.com/300x180?text=L2+Solutions',
      paymentRate: 0.007,
      views: 930,
      protocol: 'k80'
    }
  ];
}

function navigateToContent(content) {
  router.push({ 
    name: 'theater', 
    params: { id: content.id } 
  });
}

function showInvestDialog(content) {
  selectedContent.value = content;
  investAmount.value = 0.05; // Default investment amount
  showInvestmentDialog.value = true;
}

function calculateReturn(amount, percentage) {
  if (!amount) return 0;
  return amount * (1 + percentage / 100);
}

function formatEth(value) {
  if (value === undefined || value === null) return '0.000';
  return parseFloat(value).toFixed(3);
}

function confirmInvestment() {
  if (!investAmount.value || investAmount.value <= 0 || investAmount.value > walletBalance.value) {
    return;
  }
  
  try {
    // In a real app, this would execute a blockchain transaction
    walletBalance.value -= investAmount.value;
    
    // Show success notification
    alert(`Successfully invested ${formatEth(investAmount.value)} ETH in "${selectedContent.value.title}"`);
    
    // Close dialog
    showInvestmentDialog.value = false;
    
  } catch (error) {
    console.error('Error making investment:', error);
    alert('Failed to process investment. Please try again.');
  }
}

function handleQuestCompleted(questData) {
  // In a real app, this would update user records, potentially store this on the blockchain, etc.
  console.log('Quest completed:', questData);
  
  // Show toast notification
  alert(`Quest completed! Earned ${questData.reward.amount} ${questData.reward.type}`);
}

function handleLevelUp(levelData) {
  console.log('Level up:', levelData);
  
  // Show toast notification
  alert(`Congratulations! You've reached level ${levelData.newLevel}: ${levelData.title}`);
}

function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function activateTheme(themeName) {
  document.documentElement.classList.remove('default-theme', 'dark-theme', 'roman-theme', 'uranium-theme');
  document.documentElement.classList.add(themeName);
  localStorage.setItem('preferredTheme', themeName);
  this.$root.$emit('theme-changed', themeName);
}
</script>

<style scoped>
.home {
  padding: 20px;
  text-align: center;
}

.holographic-showcase {
  padding: 30px 20px;
  background-color: rgba(10, 20, 30, 0.05);
  border-radius: 10px;
  margin: 40px 0;
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
  border-radius: 8px;
  padding: 25px;
  width: 450px;
  max-width: 95%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
}

.close-modal-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.6;
}

.close-modal-btn:hover {
  opacity: 1;
}

.investment-preview {
  display: flex;
  gap: 15px;
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.preview-thumbnail {
  width: 100px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.preview-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-details h4 {
  margin: 0 0 5px 0;
  font-size: 1rem;
}

.preview-details p {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
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

.estimated-returns {
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.returns-label {
  font-weight: 600;
  margin-bottom: 12px;
}

.scenarios {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.scenario {
  text-align: center;
}

.scenario-label {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 4px;
}

.scenario-value {
  font-size: 1rem;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
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

/* Roman theme specific styles */
:deep(.roman-theme) .investment-preview {
  background-color: #f5eee6;
}

:deep(.roman-theme) .estimated-returns {
  background-color: #f5eee6;
}

:deep(.roman-theme) .confirm-btn {
  background-color: #8B4513;
}

:deep(.roman-theme) .confirm-btn:hover {
  background-color: #A0522D;
}

.dashboard-section {
  margin-bottom: 30px;
}

.game-elements-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 15px;
}

.welcome-message h2 {
  margin: 0 0 5px 0;
  font-size: 1.5rem;
}

.streak-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background-color: #f39c12;
  color: white;
  padding: 4px 10px;
  border-radius: 15px;
  font-size: 0.85rem;
  font-weight: 600;
}

.quick-links {
  display: flex;
  gap: 10px;
}

.quick-link {
  text-decoration: none;
  color: #3498db;
  padding: 6px 12px;
  border: 1px solid #3498db;
  border-radius: 20px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
}

.quick-link:hover {
  background-color: #3498db;
  color: white;
}

.active-rewards {
  margin-top: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
}

.active-rewards h3 {
  margin: 0 0 15px 0;
  font-size: 1.1rem;
}

.rewards-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
}

.reward-item {
  background-color: white;
  border-radius: 6px;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.reward-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.reward-name {
  font-weight: 500;
  margin-bottom: 3px;
}

.reward-expiry {
  font-size: 0.8rem;
  color: #999;
}

/* Roman theme specific styles */
:deep(.roman-theme) .streak-badge {
  background-color: #CD853F;
}

:deep(.roman-theme) .quick-link {
  color: #8B4513;
  border-color: #8B4513;
}

:deep(.roman-theme) .quick-link:hover {
  background-color: #8B4513;
}

:deep(.roman-theme) .active-rewards {
  background-color: #f5eee6;
  border: 1px solid #d5c3aa;
}

:deep(.roman-theme) .reward-icon {
  background: linear-gradient(135deg, #8B4513, #A0522D);
}

/* Uranium theme specific styles */
.themes-showcase {
  padding: 3rem 0;
}

.themes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.theme-preview {
  border-radius: 8px;
  overflow: hidden;
  height: 200px;
  display: flex;
  flex-direction: column;
}

.theme-header {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.theme-content {
  padding: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
</style>
