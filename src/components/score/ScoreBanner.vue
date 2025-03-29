<template>
  <div v-if="!dismissed" class="score-banner" :class="[theme, { 'collapsed': isCollapsed }]">
    <div class="banner-background"></div>
    
    <div class="banner-content">
      <div class="banner-header">
        <div class="banner-title">
          <i class="fas fa-trophy banner-icon"></i>
          <h3>Score & Rank System</h3>
        </div>
        
        <div class="banner-controls">
          <button 
            class="toggle-btn" 
            @click="toggleCollapse"
            :aria-label="isCollapsed ? 'Expand' : 'Collapse'"
          >
            <i :class="isCollapsed ? 'fas fa-chevron-down' : 'fas fa-chevron-up'"></i>
          </button>
          <button 
            class="close-btn" 
            @click="dismiss"
            aria-label="Close"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <div class="banner-body">
        <div class="banner-stats">
          <div class="rank-display">
            <div class="rank-badge" :class="`rank-tier-${scoreStore.scoreRank.tier}`">
              {{ scoreStore.scoreRank.rank }}
            </div>
            <div class="rank-progress">
              <div class="rank-info">
                <span>{{ formatNumber(scoreStore.scores.overall) }} points</span>
                <span v-if="nextRankPoints" class="next-rank">Next: {{ formatNumber(nextRankPoints) }}</span>
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar" :style="{width: `${progressPercent}%`}"></div>
              </div>
            </div>
          </div>
          
          <div class="category-stats">
            <div 
              v-for="(value, category) in topCategories" 
              :key="category" 
              class="category-stat"
            >
              <i :class="getCategoryIcon(category)"></i>
              <div class="category-value">{{ formatNumber(value) }}</div>
              <div class="category-name">{{ formatCategoryName(category) }}</div>
            </div>
          </div>
        </div>
        
        <div class="banner-message">
          <p>Earn points by streaming content, collecting essence, and engaging with the community!</p>
          <div class="banner-actions">
            <router-link to="/score" class="primary-action">View Full Dashboard</router-link>
            <router-link to="/docs/comic" class="secondary-action">How It Works</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useScoreStore, ScoreCategory } from '@/stores/scoreStore';

const props = defineProps({
  theme: {
    type: String,
    default: 'roman-theme'
  }
});

const scoreStore = useScoreStore();
const isCollapsed = ref(localStorage.getItem('score_banner_collapsed') === 'true');
const dismissed = ref(localStorage.getItem('score_banner_dismissed') === 'true');

// Format a number with commas
function formatNumber(num: number | null): string {
  if (num === null) return '';
  return num.toLocaleString();
}

// Format category name for display
function formatCategoryName(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// Get icon for each category
function getCategoryIcon(category: string): string {
  switch (category) {
    case ScoreCategory.STREAMING:
      return 'fas fa-play-circle';
    case ScoreCategory.ESSENCE:
      return 'fas fa-star';
    case ScoreCategory.TOKENS:
      return 'fas fa-coins';
    case ScoreCategory.ECONOMY:
      return 'fas fa-percentage';
    case ScoreCategory.BUILDING:
      return 'fas fa-building';
    case ScoreCategory.ENGAGEMENT:
      return 'fas fa-heart';
    default:
      return 'fas fa-chart-line';
  }
}

// Get the top 3 categories by score
const topCategories = computed(() => {
  const categories = Object.entries(scoreStore.scores)
    .filter(([key]) => key !== ScoreCategory.OVERALL)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, number>);
  
  return categories;
});

// Calculate points needed for next rank
const nextRankPoints = computed(() => {
  const currentScore = scoreStore.scores.overall;
  
  if (currentScore >= 10000) return null; // Already at max rank
  if (currentScore >= 5000) return 10000; // Next is Legendary
  if (currentScore >= 2000) return 5000;  // Next is Master
  if (currentScore >= 500) return 2000;   // Next is Expert
  return 500; // Next is Intermediate
});

// Calculate progress percentage toward next rank
const progressPercent = computed(() => {
  const currentScore = scoreStore.scores.overall;
  
  if (currentScore >= 10000) return 100;
  
  if (currentScore >= 5000) {
    // Progress from Master to Legendary
    return Math.min(100, ((currentScore - 5000) / (10000 - 5000)) * 100);
  }
  
  if (currentScore >= 2000) {
    // Progress from Expert to Master
    return Math.min(100, ((currentScore - 2000) / (5000 - 2000)) * 100);
  }
  
  if (currentScore >= 500) {
    // Progress from Intermediate to Expert
    return Math.min(100, ((currentScore - 500) / (2000 - 500)) * 100);
  }
  
  // Progress from Novice to Intermediate
  return Math.min(100, (currentScore / 500) * 100);
});

// Toggle collapse state
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
  localStorage.setItem('score_banner_collapsed', isCollapsed.value.toString());
}

// Dismiss the banner
function dismiss() {
  dismissed.value = true;
  localStorage.setItem('score_banner_dismissed', 'true');
}

// Reset dismissed state (can be called externally)
function resetDismissed() {
  dismissed.value = false;
  localStorage.removeItem('score_banner_dismissed');
}

// Initialize the store
onMounted(() => {
  scoreStore.initialize();
});

// Expose methods for parent components
defineExpose({
  resetDismissed
});
</script>

<style scoped>
.score-banner {
  position: relative;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.banner-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  background-image: linear-gradient(135deg, rgba(255,255,255,0.5) 25%, transparent 25%, 
                      transparent 50%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.5) 75%, 
                      transparent 75%, transparent);
  background-size: 20px 20px;
  opacity: 0.2;
  animation: slide 20s linear infinite;
}

@keyframes slide {
  from { background-position: 0 0; }
  to { background-position: 40px 40px; }
}

.banner-content {
  padding: 1.25rem;
}

.banner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.banner-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.banner-icon {
  font-size: 1.5rem;
}

.banner-title h3 {
  margin: 0;
  font-size: 1.25rem;
}

.banner-controls {
  display: flex;
  gap: 0.5rem;
}

.toggle-btn, .close-btn {
  background: none;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s, background-color 0.2s;
}

.toggle-btn:hover, .close-btn:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.05);
}

.banner-body {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  transform-origin: top;
  transition: all 0.3s ease;
}

.collapsed .banner-body {
  height: 0;
  opacity: 0;
  transform: scaleY(0);
  margin-top: -1rem;
}

.banner-stats {
  flex: 1;
  min-width: 280px;
}

.rank-display {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.rank-badge {
  padding: 0.5rem 1rem;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1rem;
  color: white;
}

.rank-tier-1 {
  background-color: #78909c;
}

.rank-tier-2 {
  background-color: #26a69a;
}

.rank-tier-3 {
  background-color: #5c6bc0;
}

.rank-tier-4 {
  background-color: #e57373;
}

.rank-tier-5 {
  background: linear-gradient(135deg, #ff6f00, #ffca28);
  box-shadow: 0 2px 5px rgba(255, 111, 0, 0.3);
}

.rank-progress {
  flex: 1;
}

.rank-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  margin-bottom: 0.375rem;
}

.next-rank {
  opacity: 0.7;
}

.progress-bar-container {
  height: 8px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  transition: width 0.5s ease-out;
}

.category-stats {
  display: flex;
  justify-content: space-between;
}

.category-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.category-stat i {
  font-size: 1.25rem;
  margin-bottom: 0.375rem;
}

.category-value {
  font-weight: 700;
  font-size: 1rem;
}

.category-name {
  font-size: 0.75rem;
  opacity: 0.8;
}

.banner-message {
  flex: 1;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.banner-message p {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.banner-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.primary-action,
.secondary-action {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
}

.primary-action {
  background-color: #4CAF50;
  color: white;
}

.primary-action:hover {
  background-color: #43A047;
  transform: translateY(-2px);
}

.secondary-action {
  background-color: rgba(0, 0, 0, 0.05);
  color: inherit;
}

.secondary-action:hover {
  background-color: rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

/* Roman theme styling */
.roman-theme {
  background-color: #fcf8f3;
  border: 1px solid #d5c3aa;
}

.roman-theme .banner-title h3 {
  font-family: 'Trajan Pro', 'Times New Roman', serif;
  color: #8B4513;
}

.roman-theme .progress-bar {
  background: linear-gradient(90deg, #8B4513, #D4AF37);
}

.roman-theme .primary-action {
  background-color: #8B4513;
}

.roman-theme .primary-action:hover {
  background-color: #7a3b10;
}

/* Arc theme styling */
.arc-theme {
  background-color: white;
  border: none;
  box-shadow: var(--arc-shadow);
}

.arc-theme .banner-title h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  color: var(--arc-text-primary);
}

.arc-theme .progress-bar {
  background: linear-gradient(90deg, var(--arc-primary), var(--arc-secondary));
}

.arc-theme .primary-action {
  background-color: var(--arc-primary);
}

.arc-theme .primary-action:hover {
  background-color: var(--arc-primary-dark);
}

.arc-theme .secondary-action {
  color: var(--arc-text-primary);
}

/* Vacay theme styling */
.vacay-theme {
  background: linear-gradient(120deg, rgba(255,255,255,0.8) 0%, rgba(247,253,255,0.9) 100%);
  border: none;
  box-shadow: var(--vacay-shadow);
}

.vacay-theme .banner-title h3 {
  font-family: 'Pacifico', cursive;
  color: var(--vacay-primary);
}

.vacay-theme .progress-bar {
  background: linear-gradient(90deg, var(--vacay-ocean), var(--vacay-primary));
}

.vacay-theme .primary-action {
  background-color: var(--vacay-primary);
  box-shadow: var(--vacay-shadow-sm);
}

.vacay-theme .primary-action:hover {
  background-color: var(--vacay-secondary);
}

.vacay-theme .secondary-action {
  background-color: rgba(224, 247, 250, 0.3);
  color: var(--vacay-text);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .banner-body {
    flex-direction: column;
    gap: 1rem;
  }
  
  .category-stats {
    margin-top: 1rem;
  }
}

@media (max-width: 480px) {
  .rank-display {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .banner-controls {
    position: absolute;
    top: 1.25rem;
    right: 1.25rem;
  }
}
</style>
