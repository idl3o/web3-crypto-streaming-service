<template>
  <div class="score-display" :class="theme">
    <div class="score-header">
      <h3 class="score-title">
        <i class="fas fa-trophy"></i> 
        Score Board
      </h3>
      <div class="rank-badge" :class="`rank-tier-${scoreStore.scoreRank.tier}`">
        {{ scoreStore.scoreRank.rank }}
      </div>
    </div>
    
    <div class="overall-score">
      <div class="score-value">{{ formatNumber(scoreStore.scores.overall) }}</div>
      <div class="score-label">Overall Points</div>
    </div>
    
    <div class="category-scores">
      <div 
        v-for="(score, category) in filteredScores" 
        :key="category"
        class="score-category"
        :class="`category-${category}`"
        @click="toggleSelectedCategory(category)"
      >
        <div class="category-icon">
          <i :class="getCategoryIcon(category)"></i>
        </div>
        <div class="category-info">
          <div class="category-name">{{ formatCategoryName(category) }}</div>
          <div class="category-value">{{ formatNumber(score) }}</div>
        </div>
      </div>
    </div>
    
    <div v-if="selectedCategory" class="score-chart">
      <h4 class="chart-title">{{ formatCategoryName(selectedCategory) }} History</h4>
      <div class="chart-container" ref="chartContainer"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useScoreStore, ScoreCategory } from '@/stores/scoreStore';
import Chart from 'chart.js/auto';

const props = defineProps({
  theme: {
    type: String,
    default: 'roman-theme'
  },
  compact: {
    type: Boolean,
    default: false
  }
});

const scoreStore = useScoreStore();
const selectedCategory = ref<ScoreCategory | null>(null);
const chartContainer = ref<HTMLElement | null>(null);
let chart: Chart | null = null;

// Filter out the overall score for the category list
const filteredScores = computed(() => {
  const result: Record<string, number> = {};
  Object.entries(scoreStore.scores).forEach(([key, value]) => {
    if (key !== ScoreCategory.OVERALL) {
      result[key] = value;
    }
  });
  return result;
});

// Format a number with commas
function formatNumber(num: number): string {
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

// Toggle selected category for chart display
function toggleSelectedCategory(category: ScoreCategory) {
  if (selectedCategory.value === category) {
    selectedCategory.value = null;
  } else {
    selectedCategory.value = category;
  }
}

// Create or update chart when selected category changes
watch(selectedCategory, async () => {
  if (!selectedCategory.value) {
    if (chart) {
      chart.destroy();
      chart = null;
    }
    return;
  }
  
  await nextTick();
  updateChart();
});

// Create or update the chart
function updateChart() {
  if (!chartContainer.value || !selectedCategory.value) return;
  
  const historyData = scoreStore.getCategoryScoreHistory(selectedCategory.value, 7);
  
  const chartData = {
    labels: historyData.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }),
    datasets: [{
      label: formatCategoryName(selectedCategory.value),
      data: historyData.map(item => item.points),
      backgroundColor: getChartColor(selectedCategory.value, 0.2),
      borderColor: getChartColor(selectedCategory.value, 1),
      borderWidth: 2,
      tension: 0.4,
      fill: true
    }]
  };
  
  // If chart exists, update it
  if (chart) {
    chart.data = chartData;
    chart.update();
    return;
  }
  
  // Create new chart
  const ctx = chartContainer.value.getContext('2d');
  if (!ctx) return;
  
  chart = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              return `Points: ${formatNumber(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
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

onMounted(() => {
  scoreStore.initialize();
});
</script>

<style scoped>
.score-display {
  background-color: #fcf8f3;
  border-radius: 0.5rem;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.score-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.score-title {
  margin: 0;
  font-size: 1.25rem;
}

.rank-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 50px;
  font-weight: 600;
  font-size: 0.875rem;
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

.overall-score {
  text-align: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 0.5rem;
}

.score-value {
  font-size: 2rem;
  font-weight: 700;
}

.score-label {
  font-size: 0.875rem;
  color: #555;
}

.category-scores {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.score-category {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.score-category:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.category-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.75rem;
  font-size: 1.25rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.category-info {
  flex: 1;
}

.category-name {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.category-value {
  font-size: 1rem;
  font-weight: 700;
}

.score-chart {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.chart-title {
  font-size: 1rem;
  margin: 0 0 1rem;
}

.chart-container {
  height: 200px;
  width: 100%;
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
.roman-theme .score-title {
  font-family: 'Trajan Pro', 'Times New Roman', serif;
  color: #8B4513;
}

.roman-theme .category-name {
  font-family: 'Cinzel', serif;
  color: #5D4037;
}

.roman-theme .score-category {
  border: 1px solid rgba(213, 195, 170, 0.3);
}

/* Arc theme styling */
.arc-theme.score-display {
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(30, 41, 59, 0.08);
}

.arc-theme .score-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  color: var(--arc-text-primary);
}

.arc-theme .overall-score {
  background-color: var(--arc-surface);
  border-radius: 12px;
}

.arc-theme .score-category {
  background-color: var(--arc-surface);
  border: none;
  border-radius: 12px;
  box-shadow: var(--arc-shadow-sm);
}

/* Vacay theme styling */
.vacay-theme.score-display {
  background: linear-gradient(120deg, rgba(255,255,255,0.8) 0%, rgba(247,253,255,0.9) 100%);
  box-shadow: var(--vacay-shadow);
  border-radius: 12px;
}

.vacay-theme .score-title {
  font-family: 'Pacifico', cursive;
  color: var(--vacay-primary);
}

.vacay-theme .overall-score {
  background-color: rgba(224, 247, 250, 0.3);
}

.vacay-theme .score-category {
  background-color: rgba(224, 247, 250, 0.3);
  box-shadow: var(--vacay-shadow-sm);
}
</style>
