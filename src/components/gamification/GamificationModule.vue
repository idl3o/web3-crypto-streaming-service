<template>
  <div class="gamification-module" :class="theme">
    <div class="g-header">
      <h3>{{ user.username }}'s Journey</h3>
      <div class="level-badge" @click="showLevelInfo = true">
        <div class="level-circle">{{ user.level }}</div>
        <div class="level-title">{{ getLevelTitle(user.level) }}</div>
      </div>
    </div>
    
    <div class="progress-section">
      <div class="xp-bar">
        <div class="xp-fill" :style="{ width: `${user.levelProgress}%` }"></div>
        <div class="xp-text">{{ user.xp }} / {{ nextLevelXp }} XP</div>
      </div>
      <div class="points-info">
        <div class="points-value">
          <i class="fas fa-coins"></i> {{ user.points }} Points
        </div>
        <router-link to="/rewards" class="rewards-link">
          <i class="fas fa-gift"></i> Rewards Shop
        </router-link>
      </div>
    </div>
    
    <div class="daily-quests">
      <h4>Daily Quests <span class="refresh-time">(Refreshes in {{ formatTime(questRefreshTime) }})</span></h4>
      <div class="quest-list">
        <div v-for="quest in activeQuests" :key="quest.id" class="quest-item">
          <div class="quest-info">
            <div class="quest-name">{{ quest.name }}</div>
            <div class="quest-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${quest.progress}%` }"></div>
              </div>
              <div class="progress-text">{{ quest.current }} / {{ quest.required }}</div>
            </div>
          </div>
          <div class="quest-reward" :class="{ 'reward-available': quest.progress >= 100 }">
            <button 
              @click="claimReward(quest)" 
              :disabled="quest.progress < 100 || quest.claimed"
              :class="{ 'claimed': quest.claimed }"
            >
              <template v-if="!quest.claimed">
                <span v-if="quest.progress >= 100">Claim</span>
                <span v-else>{{ quest.reward.amount }} {{ quest.reward.type }}</span>
              </template>
              <span v-else><i class="fas fa-check"></i> Claimed</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="achievements-section">
      <h4>Recent Achievements</h4>
      <div class="achievement-list">
        <div v-for="achievement in recentAchievements" :key="achievement.id" class="achievement-item">
          <div class="achievement-icon">
            <i :class="achievement.icon"></i>
          </div>
          <div class="achievement-info">
            <div class="achievement-name">{{ achievement.name }}</div>
            <div class="achievement-desc">{{ achievement.description }}</div>
          </div>
          <div class="achievement-xp">+{{ achievement.xpReward }} XP</div>
        </div>
      </div>
      <button class="view-all-btn" @click="openAchievementsView">
        View All Achievements
      </button>
    </div>

    <!-- Level Up Animation -->
    <div v-if="showLevelUpAnimation" class="level-up-animation">
      <div class="level-up-content">
        <div class="level-up-text">Level Up!</div>
        <div class="new-level">{{ user.level }}</div>
        <div class="level-title">{{ getLevelTitle(user.level) }}</div>
        <button class="level-up-close" @click="showLevelUpAnimation = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>

    <!-- Level Info Modal -->
    <div v-if="showLevelInfo" class="modal-overlay" @click.self="showLevelInfo = false">
      <div class="level-info-modal">
        <div class="modal-header">
          <h4>Level System</h4>
          <button class="close-modal" @click="showLevelInfo = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="level-progression">
          <div class="current-level-info">
            <div class="current-level">
              <div class="level-circle large">{{ user.level }}</div>
              <div class="level-title">{{ getLevelTitle(user.level) }}</div>
            </div>
            <div class="level-perks">
              <h5>Your Current Benefits</h5>
              <ul>
                <li v-for="(perk, index) in getCurrentLevelPerks(user.level)" :key="index">
                  <i class="fas fa-gem"></i> {{ perk }}
                </li>
              </ul>
            </div>
          </div>
          
          <div class="next-level-info">
            <h5>Next Level</h5>
            <div class="next-level">
              <div class="level-circle medium">{{ user.level + 1 }}</div>
              <div class="level-title">{{ getLevelTitle(user.level + 1) }}</div>
            </div>
            <div class="level-perks">
              <h5>Unlock These Benefits</h5>
              <ul>
                <li v-for="(perk, index) in getNextLevelPerks(user.level)" :key="index">
                  <i class="fas fa-lock"></i> {{ perk }}
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div class="all-levels-preview">
          <h5>Level Progression Path</h5>
          <div class="level-path">
            <div 
              v-for="level in 10" 
              :key="level" 
              :class="['path-node', { 'current': level === user.level, 'completed': level < user.level }]"
            >
              {{ level }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps({
  userId: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['quest-completed', 'level-up']);
const theme = inject('currentTheme', 'roman-theme');
const router = useRouter();

// User data with gamification info
const user = ref({
  id: props.userId || 'user123',
  username: 'Crypto Voyager',
  level: 3,
  xp: 275,
  levelProgress: 68,
  streak: 4,
  points: 450,
  inventory: []
});

// Levels
const nextLevelXp = computed(() => {
  return calculateNextLevelXp(user.value.level);
});

// Quest system
const questRefreshTime = ref(14 * 60 * 60); // 14 hours in seconds
const activeQuests = ref([
  {
    id: 'q1',
    name: 'Watch 3 K80 protocol streams',
    current: 2,
    required: 3,
    progress: 66,
    reward: { type: 'XP', amount: 50 },
    claimed: false
  },
  {
    id: 'q2',
    name: 'Invest in any stream',
    current: 1,
    required: 1,
    progress: 100,
    reward: { type: 'XP', amount: 75 },
    claimed: false
  },
  {
    id: 'q3',
    name: 'Fork a stream',
    current: 0,
    required: 1,
    progress: 0,
    reward: { type: 'XP', amount: 100 },
    claimed: false
  }
]);

// Achievements
const recentAchievements = ref([
  {
    id: 'a1',
    name: 'Early Adopter',
    description: 'Join during the platform beta phase',
    icon: 'fas fa-rocket',
    xpReward: 100,
    unlocked: true,
    date: '2023-09-10T14:22:10Z'
  },
  {
    id: 'a2',
    name: 'First Investment',
    description: 'Make your first stream investment',
    icon: 'fas fa-hand-holding-usd',
    xpReward: 75,
    unlocked: true,
    date: '2023-09-12T09:47:35Z'
  }
]);

// Animation states
const showLevelUpAnimation = ref(false);
const showLevelInfo = ref(false);

// Lifecycle hooks
onMounted(() => {
  startQuestRefreshTimer();
  loadUserGameData();
});

// Mock data loading (in a real app this would fetch from an API)
async function loadUserGameData() {
  // Simulated API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // This is where you'd fetch real user data
  console.log('User game data loaded');
}

function startQuestRefreshTimer() {
  // Update timer every second
  setInterval(() => {
    if (questRefreshTime.value > 0) {
      questRefreshTime.value -= 1;
    } else {
      resetDailyQuests();
    }
  }, 1000);
}

function resetDailyQuests() {
  // Reset quest timers and generate new quests
  questRefreshTime.value = 24 * 60 * 60; // 24 hours
  
  // In a real implementation, you'd generate new random quests here
  activeQuests.value.forEach(quest => {
    quest.claimed = false;
    quest.current = 0;
    quest.progress = 0;
  });
}

function claimReward(quest) {
  if (quest.progress < 100 || quest.claimed) return;
  
  // Mark quest as claimed
  quest.claimed = true;
  
  // Apply rewards
  if (quest.reward.type === 'XP') {
    addXp(quest.reward.amount);
  }
  
  emit('quest-completed', { questId: quest.id, reward: quest.reward });
}

function addXp(amount) {
  // Add XP and check for level up
  const currentLevel = user.value.level;
  user.value.xp += amount;
  
  // Check if we've leveled up
  const xpForNextLevel = calculateNextLevelXp(currentLevel);
  
  if (user.value.xp >= xpForNextLevel) {
    // Level up!
    user.value.level += 1;
    user.value.xp -= xpForNextLevel; // Excess XP rolls over to next level
    showLevelUpAnimation.value = true;
    
    // Emit level up event
    emit('level-up', { 
      newLevel: user.value.level, 
      title: getLevelTitle(user.value.level) 
    });
  }
  
  // Update progress percentage
  updateLevelProgress();
}

function updateLevelProgress() {
  const nextXp = calculateNextLevelXp(user.value.level);
  user.value.levelProgress = Math.min(100, (user.value.xp / nextXp) * 100);
}

function calculateNextLevelXp(level) {
  // Formula for XP required for next level: 100 * level^1.5
  return Math.floor(100 * Math.pow(level, 1.5));
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

function getCurrentLevelPerks(level) {
  const perks = {
    1: ['Access to basic streams', 'Investment capability'],
    2: ['5% investment fee reduction', 'Ability to add comments'],
    3: ['Custom profile badge', '10% investment fee reduction', 'Stream calendar access'],
    4: ['Access to exclusive streams', 'Investment alerts'],
    5: ['Early access to new features', '15% investment fee reduction', 'Custom theme'],
    6: ['Priority support', 'Creator tools access'],
    7: ['Portfolio analytics', 'Monthly bonus XP'],
    8: ['Investment pool access', '25% investment fee reduction'],
    9: ['Beta feature access', 'Premium stream access'],
    10: ['Governance voting rights', 'No investment fees', 'Custom stream badge']
  };
  
  return perks[level] || ['Advanced user benefits'];
}

function getNextLevelPerks(level) {
  const nextLevel = level + 1;
  return getCurrentLevelPerks(nextLevel) || ['Unknown benefits'];
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function openAchievementsView() {
  router.push('/achievements');
}
</script>

<style scoped>
.gamification-module {
  background-color: #f9f9f9;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.g-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.g-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.level-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: transform 0.2s;
}

.level-badge:hover {
  transform: translateY(-2px);
}

.level-circle {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3498db, #1abc9c);
  color: white;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.level-circle.large {
  width: 64px;
  height: 64px;
  font-size: 1.7rem;
}

.level-circle.medium {
  width: 50px;
  height: 50px;
  font-size: 1.4rem;
}

.level-title {
  font-weight: 600;
  font-size: 0.9rem;
}

.progress-section {
  margin-bottom: 15px;
}

.xp-bar {
  height: 20px;
  background-color: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.xp-fill {
  height: 100%;
  background: linear-gradient(90deg, #3498db, #1abc9c);
  transition: width 0.5s ease-out;
}

.xp-text {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: white;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}

.points-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.points-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: #f39c12;
  display: flex;
  align-items: center;
  gap: 5px;
}

.rewards-link {
  font-size: 0.85rem;
  text-decoration: none;
  color: #3498db;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
}

.rewards-link:hover {
  color: #2980b9;
  text-decoration: underline;
}

.daily-quests {
  margin-bottom: 20px;
}

.daily-quests h4 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1.1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.refresh-time {
  font-size: 0.8rem;
  font-weight: normal;
  color: #666;
}

.quest-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quest-item {
  background-color: white;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.quest-info {
  flex-grow: 1;
}

.quest-name {
  font-weight: 500;
  margin-bottom: 8px;
}

.quest-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  flex-grow: 1;
  height: 10px;
  background-color: #e0e0e0;
  border-radius: 5px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #3498db;
  transition: width 0.3s;
}

.progress-text {
  font-size: 0.8rem;
  color: #666;
  width: 45px;
  text-align: right;
}

.quest-reward {
  margin-left: 10px;
}

.quest-reward button {
  padding: 6px 10px;
  border-radius: 4px;
  border: none;
  background-color: #f0f0f0;
  color: #666;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 70px;
}

.quest-reward button:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.quest-reward button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reward-available button:not(.claimed) {
  background-color: #2ecc71;
  color: white;
}

.reward-available button:not(.claimed):hover {
  background-color: #27ae60;
}

button.claimed {
  background-color: #dfe6e9;
  color: #7f8c8d;
}

.achievements-section h4 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1.1rem;
}

.achievement-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.achievement-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: white;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.achievement-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f39c12, #e74c3c);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.achievement-info {
  flex-grow: 1;
}

.achievement-name {
  font-weight: 600;
  margin-bottom: 3px;
}

.achievement-desc {
  font-size: 0.85rem;
  color: #666;
}

.achievement-xp {
  color: #2ecc71;
  font-weight: 600;
  font-size: 0.9rem;
}

.view-all-btn {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 4px;
  background-color: #3498db;
  color: white;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.view-all-btn:hover {
  background-color: #2980b9;
}

/* Level Up Animation */
.level-up-animation {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  animation: fadeIn 0.5s;
}

.level-up-content {
  background: linear-gradient(135deg, #3498db, #1abc9c);
  padding: 40px;
  border-radius: 15px;
  text-align: center;
  color: white;
  box-shadow: 0 5px 25px rgba(0, 0, 0, 0.3);
  position: relative;
  animation: scaleIn 0.5s;
}

.level-up-text {
  font-size: 2.2rem;
  font-weight: bold;
  margin-bottom: 15px;
  text-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.new-level {
  font-size: 4rem;
  font-weight: bold;
  margin-bottom: 5px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.level-up-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.level-up-close:hover {
  opacity: 1;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Level Info Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.level-info-modal {
  background-color: white;
  border-radius: 10px;
  width: 600px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h4 {
  margin: 0;
  font-size: 1.3rem;
}

.close-modal {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.7;
}

.close-modal:hover {
  opacity: 1;
}

.level-progression {
  display: flex;
  gap: 30px;
  padding: 20px;
}

.current-level-info, .next-level-info {
  flex: 1;
}

.current-level, .next-level {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 15px;
}

.level-perks {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 15px;
}

.level-perks h5 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1rem;
}

.level-perks ul {
  margin: 0;
  padding-left: 20px;
}

.level-perks li {
  margin-bottom: 5px;
  font-size: 0.9rem;
}

.all-levels-preview {
  padding: 0 20px 20px 20px;
}

.all-levels-preview h5 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1rem;
}

.level-path {
  display: flex;
  justify-content: space-between;
  position: relative;
  margin-top: 20px;
}

.level-path::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #ddd;
  transform: translateY(-50%);
}

.path-node {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #f5f5f5;
  border: 2px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  font-weight: bold;
}

.path-node.current {
  background-color: #3498db;
  border-color: #2980b9;
  color: white;
  transform: scale(1.2);
}

.path-node.completed {
  background-color: #2ecc71;
  border-color: #27ae60;
  color: white;
}

/* Roman theme overrides */
.roman-theme {
  border: 1px solid #d5c3aa;
  background-color: #f8f5f0;
}

.roman-theme .level-circle {
  background: linear-gradient(135deg, #8B4513, #CD853F);
}

.roman-theme .xp-fill {
  background: linear-gradient(90deg, #8B4513, #CD853F);
}

.roman-theme .progress-fill {
  background-color: #8B4513;
}

.roman-theme .reward-available button:not(.claimed) {
  background-color: #6B8E23;
}

.roman-theme .reward-available button:not(.claimed):hover {
  background-color: #556B2F;
}

.roman-theme .achievement-icon {
  background: linear-gradient(135deg, #CD853F, #8B4513);
}

.roman-theme .achievement-xp {
  color: #6B8E23;
}

.roman-theme .view-all-btn {
  background-color: #8B4513;
}

.roman-theme .view-all-btn:hover {
  background-color: #A0522D;
}

.roman-theme .level-up-content {
  background: linear-gradient(135deg, #8B4513, #CD853F);
}

.roman-theme .path-node.current {
  background-color: #8B4513;
  border-color: #A0522D;
}

.roman-theme .path-node.completed {
  background-color: #6B8E23;
  border-color: #556B2F;
}

/* Responsive styles */
@media (max-width: 768px) {
  .level-progression {
    flex-direction: column;
    gap: 20px;
  }
}

@media (max-width: 480px) {
  .quest-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .quest-reward {
    margin-left: 0;
    width: 100%;
  }
  
  .quest-reward button {
    width: 100%;
  }
  
  .achievement-item {
    flex-wrap: wrap;
  }
  
  .achievement-xp {
    width: 100%;
    text-align: right;
    margin-top: 5px;
  }
}
</style>
