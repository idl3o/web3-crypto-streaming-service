<template>
  <div class="leaderboard" :class="theme">
    <div class="leaderboard-header">
      <h3 class="leaderboard-title">
        <i class="fas fa-trophy"></i> Top Performers
      </h3>
      <div class="leaderboard-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab-button"
          :class="{ active: currentTab === tab.id }"
          @click="currentTab = tab.id"
        >
          {{ tab.name }}
        </button>
      </div>
    </div>
    
    <div class="leaderboard-content">
      <div v-if="loading" class="leaderboard-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Loading leaderboard...</span>
      </div>
      
      <div v-else-if="!leaders.length" class="leaderboard-empty">
        No entries found
      </div>
      
      <div v-else class="leaderboard-list">
        <div 
          v-for="(leader, index) in leaders" 
          :key="leader.userId"
          class="leaderboard-item"
          :class="{ 'is-current-user': leader.isCurrentUser }"
        >
          <div class="leader-rank">{{ index + 1 }}</div>
          <div class="leader-avatar">
            <img :src="leader.avatar" :alt="leader.name">
          </div>
          <div class="leader-info">
            <div class="leader-name">{{ leader.name }}</div>
            <div class="leader-stats">
              <span class="leader-category">{{ formatCategoryName(currentTab) }}</span>
              <span class="leader-civilization">{{ leader.civilization }}</span>
            </div>
          </div>
          <div class="leader-score">{{ formatNumber(leader.score) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ScoreCategory } from '@/stores/scoreStore';

const props = defineProps({
  theme: {
    type: String,
    default: 'roman-theme'
  }
});

const tabs = [
  { id: ScoreCategory.OVERALL, name: 'Overall' },
  { id: ScoreCategory.STREAMING, name: 'Streaming' },
  { id: ScoreCategory.ESSENCE, name: 'Essence' },
  { id: ScoreCategory.TOKENS, name: 'Tokens' }
];

const currentTab = ref(ScoreCategory.OVERALL);
const loading = ref(false);
const leaders = ref<any[]>([]);

// Format a number with commas
function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Format category name for display
function formatCategoryName(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// Simulate fetching leader data
async function fetchLeaders() {
  loading.value = true;
  
  try {
    // Simulated API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock data
    leaders.value = [
      { 
        userId: 'user1', 
        name: 'CryptoKing', 
        avatar: 'https://i.pravatar.cc/150?img=1',
        score: 12450,
        civilization: 'Digital Empire',
        isCurrentUser: false
      },
      { 
        userId: 'user2', 
        name: 'BlockchainQueen', 
        avatar: 'https://i.pravatar.cc/150?img=5',
        score: 10820,
        civilization: 'Neon City',
        isCurrentUser: true
      },
      { 
        userId: 'user3', 
        name: 'TokenMaster', 
        avatar: 'https://i.pravatar.cc/150?img=3',
        score: 9340,
        civilization: 'Virtual Nation',
        isCurrentUser: false
      },
      { 
        userId: 'user4', 
        name: 'EtherDreamer', 
        avatar: 'https://i.pravatar.cc/150?img=4',
        score: 7890,
        civilization: 'Crypto Metropolis',
        isCurrentUser: false
      },
      { 
        userId: 'user5', 
        name: 'ByteBuilder', 
        avatar: 'https://i.pravatar.cc/150?img=7',
        score: 6250,
        civilization: 'Quantum Paradise',
        isCurrentUser: false
      }
    ];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    leaders.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(fetchLeaders);
</script>

<style scoped>
.leaderboard {
  background-color: #fcf8f3;
  border-radius: 0.5rem;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.leaderboard-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 1.25rem;
}

.leaderboard-title {
  margin: 0 0 1rem;
  font-size: 1.25rem;
}

.leaderboard-tabs {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
}

.tab-button {
  padding: 0.375rem 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background-color: transparent;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
  white-space: nowrap;
}

.tab-button.active {
  background-color: rgba(0, 0, 0, 0.05);
  font-weight: 600;
}

.leaderboard-loading,
.leaderboard-empty {
  padding: 2rem 0;
  text-align: center;
  color: #777;
}

.leaderboard-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 0.5rem;
  transition: transform 0.2s ease;
}

.leaderboard-item:hover {
  transform: translateY(-2px);
}

.is-current-user {
  background-color: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.2);
}

.leader-rank {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 50%;
  margin-right: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.leader-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 0.75rem;
}

.leader-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.leader-info {
  flex: 1;
}

.leader-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.leader-stats {
  font-size: 0.75rem;
  color: #666;
}

.leader-category {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  margin-right: 0.5rem;
}

.leader-score {
  font-weight: 700;
  font-size: 1.125rem;
}

/* Theme-specific styling */
.roman-theme .leaderboard-title {
  font-family: 'Trajan Pro', 'Times New Roman', serif;
  color: #8B4513;
}

.roman-theme .tab-button.active {
  color: #8B4513;
  border-color: #d5c3aa;
}

.roman-theme .leader-name {
  font-family: 'Cinzel', serif;
}

.roman-theme.is-current-user {
  background-color: rgba(139, 69, 19, 0.1);
  border: 1px solid rgba(139, 69, 19, 0.2);
}

/* Arc theme styling */
.arc-theme.leaderboard {
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(30, 41, 59, 0.08);
}

.arc-theme .leaderboard-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  color: var(--arc-text-primary);
}

.arc-theme .tab-button {
  border-radius: 50px;
  border: none;
  background-color: var(--arc-surface);
}

.arc-theme .tab-button.active {
  background-color: var(--arc-primary);
  color: white;
}

.arc-theme .leaderboard-item {
  border-radius: 12px;
}

/* Vacay theme styling */
.vacay-theme.leaderboard {
  background: linear-gradient(120deg, rgba(255,255,255,0.8) 0%, rgba(247,253,255,0.9) 100%);
  box-shadow: var(--vacay-shadow);
  border-radius: 12px;
}

.vacay-theme .leaderboard-title {
  font-family: 'Pacifico', cursive;
  color: var(--vacay-primary);
}

.vacay-theme .tab-button {
  border-radius: 50px;
  border: none;
  background-color: rgba(224, 247, 250, 0.3);
}

.vacay-theme .tab-button.active {
  background-color: var(--vacay-primary);
  color: white;
}
</style>
