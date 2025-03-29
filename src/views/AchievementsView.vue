<template>
  <div class="achievements-view" :class="theme">
    <h1>Achievements</h1>
    
    <div class="user-stats">
      <div class="user-level">
        <div class="level-badge">
          <div class="level-circle">{{ user.level }}</div>
          <div class="level-title">{{ getLevelTitle(user.level) }}</div>
        </div>
      </div>
      
      <div class="achievements-summary">
        <div class="stat-box">
          <div class="stat-value">{{ unlockedAchievements.length }}</div>
          <div class="stat-label">Unlocked</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">{{ Math.round((unlockedAchievements.length / achievements.length) * 100) }}%</div>
          <div class="stat-label">Completion</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">{{ totalXpEarned }}</div>
          <div class="stat-label">XP Earned</div>
        </div>
      </div>
    </div>
    
    <div class="category-filter">
      <button 
        v-for="category in categories" 
        :key="category.id"
        :class="['category-btn', { active: currentCategory === category.id }]"
        @click="currentCategory = category.id"
      >
        <i :class="category.icon"></i>
        {{ category.name }}
      </button>
    </div>
    
    <div class="search-bar">
      <i class="fas fa-search"></i>
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="Search achievements..."
      />
    </div>
    
    <div class="achievements-container">
      <h2>{{ getCategoryName(currentCategory) }}</h2>
      
      <div v-if="filteredAchievements.length === 0" class="no-achievements">
        <i class="fas fa-medal"></i>
        <p v-if="searchQuery">No achievements found matching "{{ searchQuery }}"</p>
        <p v-else>No achievements in this category yet</p>
      </div>
      
      <div v-else class="achievements-grid">
        <div 
          v-for="achievement in filteredAchievements" 
          :key="achievement.id" 
          :class="['achievement-card', { unlocked: achievement.unlocked }]"
        >
          <div class="achievement-icon">
            <i :class="achievement.icon"></i>
          </div>
          <div class="achievement-details">
            <h3>{{ achievement.name }}</h3>
            <p>{{ achievement.description }}</p>
            <div class="achievement-footer">
              <div class="achievement-xp">+{{ achievement.xpReward }} XP</div>
              <div v-if="achievement.unlocked" class="unlock-date">
                {{ formatDate(achievement.date) }}
              </div>
              <div v-else class="achievement-locked">
                <i class="fas fa-lock"></i> Locked
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';

const theme = inject('currentTheme', 'roman-theme');

// User data
const user = ref({
  id: 'user123',
  username: 'Crypto Voyager',
  level: 3,
  xp: 275
});

// Achievement categories
const categories = [
  { id: 'all', name: 'All Achievements', icon: 'fas fa-medal' },
  { id: 'investor', name: 'Investor', icon: 'fas fa-chart-line' },
  { id: 'viewer', name: 'Viewer', icon: 'fas fa-eye' },
  { id: 'creator', name: 'Creator', icon: 'fas fa-video' },
  { id: 'community', name: 'Community', icon: 'fas fa-users' },
  { id: 'special', name: 'Special', icon: 'fas fa-star' }
];

// State
const currentCategory = ref('all');
const searchQuery = ref('');

// Mock achievements data
const achievements = ref([
  {
    id: 'a1',
    name: 'Early Adopter',
    description: 'Join during the platform beta phase',
    category: 'special',
    icon: 'fas fa-rocket',
    xpReward: 100,
    unlocked: true,
    date: '2023-09-10T14:22:10Z'
  },
  {
    id: 'a2',
    name: 'First Investment',
    description: 'Make your first stream investment',
    category: 'investor',
    icon: 'fas fa-hand-holding-usd',
    xpReward: 75,
    unlocked: true,
    date: '2023-09-12T09:47:35Z'
  },
  {
    id: 'a3',
    name: 'Content Consumer',
    description: 'Watch more than 10 hours of content',
    category: 'viewer',
    icon: 'fas fa-play-circle',
    xpReward: 50,
    unlocked: false
  },
  {
    id: 'a4',
    name: 'Social Butterfly',
    description: 'Leave comments on 5 different streams',
    category: 'community',
    icon: 'fas fa-comments',
    xpReward: 60,
    unlocked: false
  },
  {
    id: 'a5',
    name: 'K80 Pioneer',
    description: 'Watch a K80 protocol stream',
    category: 'viewer',
    icon: 'fas fa-shield-alt',
    xpReward: 40,
    unlocked: true,
    date: '2023-09-11T18:33:22Z'
  },
  {
    id: 'a6',
    name: 'Content Creator',
    description: 'Create your first stream',
    category: 'creator',
    icon: 'fas fa-video',
    xpReward: 100,
    unlocked: false
  },
  {
    id: 'a7',
    name: 'Blockchain Explorer',
    description: 'Watch streams from 3 different blockchain topics',
    category: 'viewer',
    icon: 'fas fa-cubes',
    xpReward: 75,
    unlocked: true,
    date: '2023-09-13T11:05:47Z'
  },
  {
    id: 'a8',
    name: 'Diving Deep',
    description: 'Watch a complete multi-part series',
    category: 'viewer',
    icon: 'fas fa-book-open',
    xpReward: 80,
    unlocked: false
  },
  {
    id: 'a9',
    name: 'Portfolio Manager',
    description: 'Invest in 5 different streams',
    category: 'investor',
    icon: 'fas fa-briefcase',
    xpReward: 100,
    unlocked: false
  },
  {
    id: 'a10',
    name: 'Big Spender',
    description: 'Invest more than 1 ETH in a single stream',
    category: 'investor',
    icon: 'fas fa-gem',
    xpReward: 120,
    unlocked: false
  },
  {
    id: 'a11',
    name: 'Stream Pioneer',
    description: 'Fork a stream and customize it',
    category: 'creator',
    icon: 'fas fa-code-branch',
    xpReward: 90,
    unlocked: false
  },
  {
    id: 'a12',
    name: 'Community Leader',
    description: 'Get 10 upvotes on your comments',
    category: 'community',
    icon: 'fas fa-award',
    xpReward: 70,
    unlocked: false
  }
]);

// Computed properties
const unlockedAchievements = computed(() => {
  return achievements.value.filter(a => a.unlocked);
});

const totalXpEarned = computed(() => {
  return unlockedAchievements.value.reduce((total, a) => total + a.xpReward, 0);
});

const filteredAchievements = computed(() => {
  let result = achievements.value;
  
  // Filter by category
  if (currentCategory !== 'all') {
    result = result.filter(a => a.category === currentCategory.value);
  }
  
  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(a => 
      a.name.toLowerCase().includes(query) || 
      a.description.toLowerCase().includes(query)
    );
  }
  
  return result;
});

// Lifecycle hooks
onMounted(() => {
  fetchUserAchievements();
});

// Methods
async function fetchUserAchievements() {
  // In a real app, this would make an API call to get the user's achievements
  console.log('Fetching user achievements...');
  // The achievements are already loaded in our mock data
}

function getCategoryName(categoryId) {
  const category = categories.find(c => c.id === categoryId);
  return category ? category.name : 'All Achievements';
}

function getLevelTitle(level) {
  const titles = {
    1: 'Novice Explorer',
    2: 'Stream Wanderer',
    3: 'Crypto Voyager',
    4: 'Web3 Pioneer',
    5: 'Stream Sage',
    6: 'Digital Nomad',
    7: 'Blockchain Wizard',
    8: 'Investment Guru',
    9: 'Crypto Oracle',
    10: 'Stream Master'
  };
  
  return titles[level] || `Level ${level} Master`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}
</script>

<style scoped>
.achievements-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 2rem;
}

.user-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f9f9f9;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 25px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.level-badge {
  display: flex;
  align-items: center;
  gap: 12px;
}

.level-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3498db, #1abc9c);
  color: white;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.level-title {
  font-weight: 600;
  font-size: 1.2rem;
}

.achievements-summary {
  display: flex;
  gap: 20px;
}

.stat-box {
  text-align: center;
  padding: 0 15px;
}

.stat-box:not(:last-child) {
  border-right: 1px solid #e0e0e0;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #3498db;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
}

.category-filter {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.category-btn {
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

.category-btn:hover {
  background-color: #e0e0e0;
}

.category-btn.active {
  background-color: #3498db;
  color: white;
}

.search-bar {
  position: relative;
  margin-bottom: 25px;
}

.search-bar i {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #aaa;
}

.search-bar input {
  width: 100%;
  padding: 12px 12px 12px 40px;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 1rem;
}

.search-bar input:focus {
  outline: none;
  border-color: #3498db;
}

.achievements-container h2 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.5rem;
}

.no-achievements {
  text-align: center;
  padding: 40px 0;
  color: #aaa;
}

.no-achievements i {
  font-size: 3rem;
  margin-bottom: 10px;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.achievement-card {
  background-color: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  filter: grayscale(100%);
  opacity: 0.7;
}

.achievement-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.achievement-card.unlocked {
  filter: none;
  opacity: 1;
}

.achievement-icon {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f39c12, #e74c3c);
  color: white;
  font-size: 2rem;
}

.achievement-details {
  padding: 15px;
}

.achievement-details h3 {
  margin: 0 0 10px 0;
  font-size: 1.1rem;
}

.achievement-details p {
  margin: 0 0 15px 0;
  font-size: 0.9rem;
  color: #666;
  flex-grow: 1;
}

.achievement-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px dashed #eee;
}

.achievement-xp {
  font-weight: 600;
  color: #2ecc71;
}

.unlock-date {
  font-size: 0.8rem;
  color: #999;
}

.achievement-locked {
  font-size: 0.85rem;
  color: #bbb;
}

/* Roman theme overrides */
.roman-theme .user-stats,
.roman-theme .achievements-container {
  background-color: #f8f5f0;
  border: 1px solid #d5c3aa;
}

.roman-theme .level-circle {
  background: linear-gradient(135deg, #8B4513, #CD853F);
}

.roman-theme .stat-box:not(:last-child) {
  border-right-color: #d5c3aa;
}

.roman-theme .stat-value {
  color: #8B4513;
}

.roman-theme .category-btn.active {
  background-color: #8B4513;
}

.roman-theme .search-bar input:focus {
  border-color: #8B4513;
}

.roman-theme .achievement-icon {
  background: linear-gradient(135deg, #CD853F, #8B4513);
}

.roman-theme .achievement-xp {
  color: #6B8E23;
}

.roman-theme .achievement-footer {
  border-top-color: #d5c3aa;
}

/* Responsive styles */
@media (max-width: 768px) {
  .user-stats {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }
  
  .achievements-summary {
    width: 100%;
  }
  
  .achievements-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}

@media (max-width: 480px) {
  .achievements-grid {
    grid-template-columns: 1fr;
  }
}
</style>
