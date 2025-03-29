<template>
  <div class="score-view">
    <div class="container py-4">
      <!-- Add Score Banner -->
      <ScoreBanner :theme="currentTheme" ref="scoreBanner" />
      
      <div class="score-header mb-4">
        <h1 class="score-page-title">Your Performance Score</h1>
        <div class="score-overview">
          <div class="overall-rank">
            <div class="rank-badge" :class="`rank-tier-${scoreStore.scoreRank.tier}`">
              {{ scoreStore.scoreRank.rank }}
            </div>
          </div>
          <div class="overall-points">
            <div class="points-value">{{ formatNumber(scoreStore.scores.overall) }}</div>
            <div class="points-label">Total Points</div>
          </div>
        </div>
      </div>
      
      <div class="row">
        <div class="col-lg-8">
          <!-- Score cards grid -->
          <div class="score-categories">
            <h2 class="section-title">Performance Categories</h2>
            <div class="category-grid">
              <div 
                v-for="(score, category) in categoryScores" 
                :key="category"
                class="category-card"
                :class="`category-${category}`"
              >
                <div class="category-header">
                  <div class="category-icon">
                    <i :class="getCategoryIcon(category)"></i>
                  </div>
                  <div class="category-title">{{ formatCategoryName(category) }}</div>
                </div>
                <div class="category-score">{{ formatNumber(score) }}</div>
                <div class="chart-container" :ref="el => setCategoryChart(el, category)"></div>
              </div>
            </div>
          </div>
          
          <!-- Achievement list -->
          <div class="achievements-section mt-4">
            <h2 class="section-title">Recent Achievements</h2>
            <div class="achievements-list">
              <div 
                v-for="achievement in recentAchievements" 
                :key="achievement.id" 
                class="achievement-item"
              >
                <div class="achievement-icon">{{ achievement.icon }}</div>
                <div class="achievement-info">
                  <div class="achievement-name">{{ achievement.name }}</div>
                  <div class="achievement-desc">{{ achievement.description }}</div>
                </div>
                <div class="achievement-points">+{{ achievement.points }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-lg-4">
          <!-- Global leaderboard -->
          <Leaderboard :theme="currentTheme" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, computed, onMounted, nextTick } from 'vue';
import { useScoreStore, ScoreCategory } from '@/stores/scoreStore';
import Leaderboard from '@/components/score/Leaderboard.vue';
import ScoreBanner from '@/components/score/ScoreBanner.vue';
import { useCivilizationStore } from '@/stores/civilizationStore';
import Chart from 'chart.js/auto';

const currentTheme = inject('currentTheme', ref('roman-theme'));
const scoreStore = useScoreStore();
const civStore = useCivilizationStore();
const charts = ref<Map<string, Chart>>(new Map());
const scoreBanner = ref(null);

// Get category scores (excluding overall)
const categoryScores = computed(() => {
  const result: Record<string, number> = {};
  Object.entries(scoreStore.scores).forEach(([key, value]) => {
    if (key !== ScoreCategory.OVERALL) {
      result[key] = value;
    }
  });
  return result;
});

// Format category name for display
function formatCategoryName(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// Format a number with commas
function formatNumber(num: number): string {
  return num.toLocaleString();
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

// Create charts for each category
function setCategoryChart(el: HTMLElement | null, category: string) {
  if (!el) return;
  
  nextTick(() => {
    // Create chart if it doesn't exist for this category
    if (!charts.value.has(category)) {
      const ctx = el.getContext('2d');
      if (!ctx) return;
      
      const historyData = scoreStore.getCategoryScoreHistory(category as ScoreCategory, 7);
      
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: historyData.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          }),
          datasets: [{
            label: formatCategoryName(category),
            data: historyData.map(item => item.points),
            backgroundColor: getChartColor(category as ScoreCategory, 0.2),
            borderColor: getChartColor(category as ScoreCategory, 1),
            borderWidth: 2,
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            x: {
              display: false
            },
            y: {
              display: false,
              beginAtZero: true
            }
          }
        }
      });
      
      charts.value.set(category, chart);
    }
  });
}

// Get color based on category
function getChartColor(category: ScoreCategory, alpha: number): string {
  const colors: Record<ScoreCategory, string> = {
    [ScoreCategory.STREAMING]: `rgba(33, 150, 243, ${alpha})`,
    [ScoreCategory.ESSENCE]: `rgba(156, 39, 176, ${alpha})`,
    [ScoreCategory.TOKENS]: `rgba(255, 193, 7, ${alpha})`,
    [ScoreCategory.ECONOMY]: `rgba(76, 175, 80, ${alpha})`,
    [ScoreCategory.BUILDING]: `rgba(121, 85, 72, ${alpha})`,
    [ScoreCategory.ENGAGEMENT]: `rgba(233, 30, 99, ${alpha})`,
    [ScoreCategory.OVERALL]: `rgba(96, 125, 139, ${alpha})`
  };
  
  return colors[category] || `rgba(96, 125, 139, ${alpha})`;
}

// Get recent achievements
const recentAchievements = computed(() => {
  return civStore.unlockedAchievements.slice(0, 5);
});

onMounted(() => {
  scoreStore.initialize();
  
  // Always show banner on the score view page (reset dismissed state)
  if (scoreBanner.value) {
    // @ts-ignore: Object is possibly null
    scoreBanner.value.resetDismissed();
  }
  
  // Clean up charts when component unmounts
  return () => {
    charts.value.forEach(chart => chart.destroy());
  };
});
</script>

<style scoped>
.score-header {
  text-align: center;
}

.score-page-title {
  margin-bottom: 1.5rem;
}

.score-overview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
}

.overall-rank .rank-badge {
  padding: 0.5rem 1.5rem;
  border-radius: 50px;
  font-weight: 700;
  font-size: 1.25rem;
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
  box-shadow: 0 2px 8px rgba(255, 111, 0, 0.3);
}

.overall-points .points-value {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
}

.overall-points .points-label {
  color: #666;
  font-size: 1rem;
}

.section-title {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.category-card {
  background-color: #f9f5ef;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.category-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
}

.category-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.75rem;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.category-title {
  font-weight: 600;
}

.category-score {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.chart-container {
  height: 80px;
  margin-top: 0.5rem;
}

.achievements-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.achievement-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background-color: #f9f5ef;
  border-radius: 0.5rem;
}

.achievement-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
}

.achievement-info {
  flex: 1;
}

.achievement-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.achievement-desc {
  font-size: 0.875rem;
  color: #555;
}

.achievement-points {
  font-weight: 700;
  color: #4CAF50;
  font-size: 1.125rem;
}

/* Category-specific styling */
.category-streaming .category-icon {
  color: #2196F3;
}

.category-essence .category-icon {
  color: #9C27B0;
}

.category-tokens .category-icon {
  color: #FFC107;
}

.category-economy .category-icon {
  color: #4CAF50;
}

.category-building .category-icon {
  color: #795548;
}

.category-engagement .category-icon {
  color: #E91E63;
}

/* Theme-specific styling */
:deep(.roman-theme) .score-page-title,
:deep(.roman-theme) .section-title {
  font-family: 'Trajan Pro', 'Times New Roman', serif;
  color: #8B4513;
}

:deep(.arc-theme) .score-page-title,
:deep(.arc-theme) .section-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  color: var(--arc-text-primary);
}

:deep(.arc-theme) .category-card,
:deep(.arc-theme) .achievement-item {
  background-color: var(--arc-surface);
  border-radius: 12px;
  box-shadow: var(--arc-shadow-sm);
}

:deep(.vacay-theme) .score-page-title,
:deep(.vacay-theme) .section-title {
  font-family: 'Pacifico', cursive;
  color: var(--vacay-primary);
}

:deep(.vacay-theme) .category-card,
:deep(.vacay-theme) .achievement-item {
  background-color: rgba(224, 247, 250, 0.3);
  box-shadow: var(--vacay-shadow-sm);
}
</style>
