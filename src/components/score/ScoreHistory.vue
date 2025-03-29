<template>
  <div class="score-history" :class="theme">
    <div class="history-header">
      <h3 class="history-title">
        <i class="fas fa-history"></i> Score History
      </h3>
      <div class="history-filters">
        <div class="filter-group">
          <label for="category-filter">Category:</label>
          <select id="category-filter" v-model="selectedCategory">
            <option value="all">All Categories</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ formatCategoryName(category) }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label for="time-filter">Time Period:</label>
          <select id="time-filter" v-model="selectedTimePeriod">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="history-summary">
      <div class="summary-stats">
        <div class="summary-item">
          <div class="summary-value">{{ formatNumber(totalPointsEarned) }}</div>
          <div class="summary-label">Total Points</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">{{ eventsCount }}</div>
          <div class="summary-label">Events</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">{{ formatNumber(averagePointsPerEvent) }}</div>
          <div class="summary-label">Avg per Event</div>
        </div>
      </div>
    </div>

    <div class="history-chart" ref="chartContainer"></div>
    
    <div class="history-timeline">
      <div v-if="filteredHistory.length === 0" class="empty-history">
        No score history found for the selected filters.
      </div>
      <div v-else class="timeline">
        <div 
          v-for="(group, date) in groupedHistory" 
          :key="date" 
          class="date-group"
        >
          <div class="date-header">{{ formatDate(date) }}</div>
          <div
            v-for="(entry, index) in group"
            :key="`${date}-${index}`"
            class="history-item"
            :class="`category-${entry.category}`"
          >
            <div class="time-badge">{{ formatTime(entry.timestamp) }}</div>
            <div class="history-content">
              <div class="history-icon">
                <i :class="getCategoryIcon(entry.category)"></i>
              </div>
              <div class="history-details">
                <div class="history-reason">{{ formatReason(entry.reason) }}</div>
                <div class="history-category">{{ formatCategoryName(entry.category) }}</div>
              </div>
              <div class="history-points" :class="{'positive': entry.points > 0, 'negative': entry.points < 0}">
                {{ entry.points > 0 ? '+' : '' }}{{ formatNumber(entry.points) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="filteredHistory.length > 10" class="history-footer">
      <button @click="loadMore" class="load-more-btn" v-if="displayLimit < filteredHistory.length">
        Load More
      </button>
      <button @click="scrollToTop" class="scroll-top-btn">
        <i class="fas fa-arrow-up"></i> Back to Top
      </button>
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
  initialLimit: {
    type: Number,
    default: 20
  }
});

const scoreStore = useScoreStore();
const chartContainer = ref<HTMLElement | null>(null);
let chart: Chart | null = null;

// Filters
const selectedCategory = ref('all');
const selectedTimePeriod = ref('30');
const displayLimit = ref(props.initialLimit);

// List of all categories
const categories = Object.values(ScoreCategory).filter(c => c !== ScoreCategory.OVERALL);

// Filter history based on selections
const filteredHistory = computed(() => {
  let history = [...scoreStore.scoreHistory];
  
  // Filter by category
  if (selectedCategory.value !== 'all') {
    history = history.filter(entry => entry.category === selectedCategory.value);
  }
  
  // Filter by time period
  if (selectedTimePeriod.value !== 'all') {
    const cutoffTime = Date.now() - (parseInt(selectedTimePeriod.value) * 24 * 60 * 60 * 1000);
    history = history.filter(entry => entry.timestamp >= cutoffTime);
  }
  
  // Sort by most recent first
  return history.sort((a, b) => b.timestamp - a.timestamp);
});

// Grouped history by date
const groupedHistory = computed(() => {
  const groups: Record<string, any[]> = {};
  
  // Only process entries up to the display limit
  filteredHistory.value.slice(0, displayLimit.value).forEach(entry => {
    const date = new Date(entry.timestamp).toISOString().split('T')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
  });
  
  return groups;
});

// Summary statistics
const totalPointsEarned = computed(() => {
  return filteredHistory.value.reduce((sum, entry) => sum + entry.points, 0);
});

const eventsCount = computed(() => {
  return filteredHistory.value.length;
});

const averagePointsPerEvent = computed(() => {
  if (eventsCount.value === 0) return 0;
  return totalPointsEarned.value / eventsCount.value;
});

// Format helpers
function formatCategoryName(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatReason(reason: string): string {
  return reason
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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

// Load more history entries
function loadMore() {
  displayLimit.value += 20;
}

// Scroll to top
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// Chart data
function updateChart() {
  if (!chartContainer.value) return;
  
  // Group by date and category for chart
  const dates = new Set<string>();
  const chartData: Record<string, Record<string, number>> = {};
  
  // Create a date range for the selected time period
  const endDate = new Date();
  let startDate = new Date();
  
  if (selectedTimePeriod.value !== 'all') {
    startDate.setDate(endDate.getDate() - parseInt(selectedTimePeriod.value));
  } else {
    // For "all time", use the oldest entry date
    if (filteredHistory.value.length > 0) {
      const oldestTimestamp = Math.min(...filteredHistory.value.map(entry => entry.timestamp));
      startDate = new Date(oldestTimestamp);
    } else {
      startDate.setDate(endDate.getDate() - 30); // Default to 30 days if no data
    }
  }
  
  // Fill dates array with all dates in the range
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    dates.add(dateStr);
    chartData[dateStr] = {};
    
    // Initialize with zero for each category
    categories.forEach(category => {
      chartData[dateStr][category] = 0;
    });
  }
  
  // Fill data
  filteredHistory.value.forEach(entry => {
    const dateStr = new Date(entry.timestamp).toISOString().split('T')[0];
    if (dates.has(dateStr)) {
      if (!chartData[dateStr][entry.category]) {
        chartData[dateStr][entry.category] = 0;
      }
      chartData[dateStr][entry.category] += entry.points;
    }
  });
  
  // Convert to Chart.js format
  const labels = Array.from(dates).sort();
  const datasets = categories.map(category => {
    const color = getCategoryColor(category as ScoreCategory);
    return {
      label: formatCategoryName(category),
      data: labels.map(date => chartData[date][category] || 0),
      backgroundColor: color.bg,
      borderColor: color.border,
      borderWidth: 2,
      tension: 0.4
    };
  });
  
  // If chart exists, update it
  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets = datasets;
    chart.update();
    return;
  }
  
  // Create new chart
  const ctx = chartContainer.value.getContext('2d');
  if (!ctx) return;
  
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true
        },
        y: {
          stacked: true,
          beginAtZero: true
        }
      },
      plugins: {
        tooltip: {
          mode: 'index',
          callbacks: {
            title: function(tooltipItems) {
              return formatDate(tooltipItems[0].label);
            }
          }
        },
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// Get colors for chart
function getCategoryColor(category: ScoreCategory): { bg: string; border: string } {
  switch (category) {
    case ScoreCategory.STREAMING:
      return {
        bg: 'rgba(33, 150, 243, 0.2)',
        border: 'rgba(33, 150, 243, 1)'
      };
    case ScoreCategory.ESSENCE:
      return {
        bg: 'rgba(156, 39, 176, 0.2)',
        border: 'rgba(156, 39, 176, 1)'
      };
    case ScoreCategory.TOKENS:
      return {
        bg: 'rgba(255, 193, 7, 0.2)',
        border: 'rgba(255, 193, 7, 1)'
      };
    case ScoreCategory.ECONOMY:
      return {
        bg: 'rgba(76, 175, 80, 0.2)',
        border: 'rgba(76, 175, 80, 1)'
      };
    case ScoreCategory.BUILDING:
      return {
        bg: 'rgba(121, 85, 72, 0.2)',
        border: 'rgba(121, 85, 72, 1)'
      };
    case ScoreCategory.ENGAGEMENT:
      return {
        bg: 'rgba(233, 30, 99, 0.2)',
        border: 'rgba(233, 30, 99, 1)'
      };
    default:
      return {
        bg: 'rgba(96, 125, 139, 0.2)',
        border: 'rgba(96, 125, 139, 1)'
      };
  }
}

// Watch filter changes and update chart
watch([selectedCategory, selectedTimePeriod], () => {
  displayLimit.value = props.initialLimit; // Reset display limit when filters change
  nextTick(() => {
    updateChart();
  });
});

onMounted(() => {
  scoreStore.initialize();
  nextTick(() => {
    updateChart();
  });
  
  // Clean up chart when component unmounts
  return () => {
    if (chart) {
      chart.destroy();
    }
  };
});
</script>

<style scoped>
.score-history {
  background-color: #fcf8f3;
  border-radius: 0.5rem;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.history-title {
  margin: 0;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.history-filters {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-group select {
  padding: 0.375rem 0.75rem;
  border-radius: 0.25rem;
  border: 1px solid #ddd;
  background-color: white;
}

.history-summary {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 0.5rem;
}

.summary-stats {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 1rem;
}

.summary-item {
  text-align: center;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.summary-label {
  font-size: 0.875rem;
  color: #666;
}

.history-chart {
  height: 250px;
  margin-bottom: 1.5rem;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.date-header {
  font-weight: 600;
  margin-bottom: 0.5rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.history-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.75rem;
  position: relative;
}

.time-badge {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 0.75rem;
  color: #666;
}

.history-content {
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 0.5rem;
  padding: 0.75rem;
}

.history-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.75rem;
  font-size: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.history-details {
  flex: 1;
}

.history-reason {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.history-category {
  font-size: 0.75rem;
  color: #666;
}

.history-points {
  font-weight: 700;
  font-size: 1.125rem;
  margin-left: 1rem;
}

.history-points.positive {
  color: #4CAF50;
}

.history-points.negative {
  color: #F44336;
}

.empty-history {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.history-footer {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.load-more-btn,
.scroll-top-btn {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.load-more-btn {
  background-color: #f0f0f0;
}

.scroll-top-btn {
  background-color: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.load-more-btn:hover,
.scroll-top-btn:hover {
  background-color: #e0e0e0;
  transform: translateY(-2px);
}

/* Category-specific styling */
.category-streaming .history-icon {
  color: #2196F3;
}

.category-essence .history-icon {
  color: #9C27B0;
}

.category-tokens .history-icon {
  color: #FFC107;
}

.category-economy .history-icon {
  color: #4CAF50;
}

.category-building .history-icon {
  color: #795548;
}

.category-engagement .history-icon {
  color: #E91E63;
}

/* Roman theme styling */
.roman-theme .history-title {
  font-family: 'Trajan Pro', 'Times New Roman', serif;
  color: #8B4513;
}

.roman-theme .history-content {
  border: 1px solid rgba(213, 195, 170, 0.3);
}

.roman-theme .load-more-btn,
.roman-theme .scroll-top-btn {
  border: 1px solid #d5c3aa;
  color: #8B4513;
}

/* Arc theme styling */
.arc-theme.score-history {
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(30, 41, 59, 0.08);
}

.arc-theme .history-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  color: var(--arc-text-primary);
}

.arc-theme .history-summary {
  background-color: var(--arc-surface);
  border-radius: 12px;
}

.arc-theme .history-content {
  background-color: var(--arc-surface);
  border: none;
  border-radius: 12px;
  box-shadow: var(--arc-shadow-sm);
}

.arc-theme .filter-group select,
.arc-theme .load-more-btn,
.arc-theme .scroll-top-btn {
  border: none;
  box-shadow: var(--arc-shadow-sm);
  border-radius: 12px;
}

/* Vacay theme styling */
.vacay-theme.score-history {
  background: linear-gradient(120deg, rgba(255,255,255,0.8) 0%, rgba(247,253,255,0.9) 100%);
  box-shadow: var(--vacay-shadow);
  border-radius: 12px;
}

.vacay-theme .history-title {
  font-family: 'Pacifico', cursive;
  color: var(--vacay-primary);
}

.vacay-theme .history-summary {
  background-color: rgba(224, 247, 250, 0.3);
  border-radius: 12px;
}

.vacay-theme .history-content {
  background-color: rgba(255, 255, 255, 0.6);
  border: none;
  border-radius: 12px;
  box-shadow: var(--vacay-shadow-sm);
}

.vacay-theme .filter-group select,
.vacay-theme .load-more-btn,
.vacay-theme .scroll-top-btn {
  background-color: rgba(255, 255, 255, 0.8);
  border: none;
  box-shadow: var(--vacay-shadow-sm);
  border-radius: 50px;
  color: var(--vacay-text);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .history-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .history-filters {
    width: 100%;
  }
  
  .filter-group {
    flex: 1;
  }
  
  .filter-group select {
    width: 100%;
  }
  
  .summary-stats {
    flex-direction: column;
    align-items: center;
  }
}
</style>
