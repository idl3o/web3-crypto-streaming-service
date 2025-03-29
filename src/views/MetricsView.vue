<template>
  <div class="metrics-view">
    <header class="metrics-header">
      <h1>Performance Metrics</h1>
      <div class="time-range-selector">
        <button 
          v-for="period in periods" 
          :key="period.value"
          :class="['period-btn', { active: selectedPeriod === period.value }]"
          @click="selectedPeriod = period.value"
        >
          {{ period.label }}
        </button>
      </div>
    </header>
    
    <section class="dashboard-section">
      <h2>Year to Date Performance</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <YearToDateMetrics 
            metricType="investment" 
            title="Investment Performance" 
            :comparisonPeriod="selectedPeriod"
            @view-details="navigateToDetails('investment')"
          />
        </div>
        <div class="metric-card">
          <YearToDateMetrics 
            metricType="token" 
            title="Token Performance" 
            :comparisonPeriod="selectedPeriod"
            @view-details="navigateToDetails('token')"
          />
        </div>
        <div class="metric-card">
          <YearToDateMetrics 
            metricType="content" 
            title="Content Performance" 
            :comparisonPeriod="selectedPeriod"
            @view-details="navigateToDetails('content')"
          />
        </div>
        <div class="metric-card">
          <YearToDateMetrics 
            metricType="platform" 
            title="Platform Metrics" 
            :comparisonPeriod="selectedPeriod"
            @view-details="navigateToDetails('platform')"
          />
        </div>
      </div>
    </section>
    
    <section class="performance-details" v-if="selectedEntityType">
      <div class="performance-header">
        <h2>{{ getDetailTitle() }}</h2>
        <button class="back-btn" @click="selectedEntityType = null">
          <i class="fas fa-arrow-left"></i> Back to Dashboard
        </button>
      </div>
      
      <div class="detailed-metrics">
        <YearToDateMetrics 
          :metricType="selectedEntityType" 
          :comparisonPeriod="selectedPeriod"
          size="large"
          :showViewDetails="false"
        />
        
        <!-- Additional details would be shown here based on entity type -->
        <div class="additional-metrics">
          <h3>Performance Breakdown</h3>
          <p class="metrics-description">
            Detailed performance breakdown for 
            {{ getEntityTypeDescription() }} including historical trends, 
            key performance indicators, and comparative analysis.
          </p>
          
          <!-- Placeholder for detailed metrics that would be implemented in a real application -->
          <div class="metrics-placeholder">
            <i class="fas fa-chart-line"></i>
            <span>Detailed metrics visualization would be displayed here</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import YearToDateMetrics from '@/components/analytics/YearToDateMetrics.vue';

// Available comparison periods
const periods = [
  { label: 'Previous Year', value: 'previous-year' },
  { label: 'Previous Quarter', value: 'previous-quarter' },
  { label: 'YTD Last Year', value: 'ytd-previous-year' }
];

// State
const selectedPeriod = ref('previous-year');
const selectedEntityType = ref(null);

// Methods
function navigateToDetails(entityType) {
  selectedEntityType.value = entityType;
  
  // Scroll to details section
  setTimeout(() => {
    const detailsSection = document.querySelector('.performance-details');
    if (detailsSection) {
      detailsSection.scrollIntoView({ behavior: 'smooth' });
    }
  }, 100);
}

function getDetailTitle() {
  switch (selectedEntityType.value) {
    case 'investment': return 'Investment Performance Details';
    case 'token': return 'Token Performance Details';
    case 'content': return 'Content Performance Details';
    case 'platform': return 'Platform Performance Details';
    default: return 'Performance Details';
  }
}

function getEntityTypeDescription() {
  switch (selectedEntityType.value) {
    case 'investment': return 'your investment portfolio';
    case 'token': return 'platform tokens';
    case 'content': return 'your content';
    case 'platform': return 'the platform';
    default: return 'performance';
  }
}
</script>

<style scoped>
.metrics-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.metrics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 20px;
}

.metrics-header h1 {
  margin: 0;
  font-size: 1.8rem;
  color: var(--text-color);
  font-family: var(--heading-font);
}

.time-range-selector {
  display: flex;
  gap: 10px;
}

.period-btn {
  background: none;
  border: 1px solid var(--border-color);
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  color: var(--text-color);
}

.period-btn.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.period-btn:hover:not(.active) {
  background-color: rgba(139, 69, 19, 0.1);
}

.dashboard-section {
  margin-bottom: 40px;
}

.dashboard-section h2 {
  margin: 0 0 20px 0;
  font-size: 1.4rem;
  color: var(--text-color);
  font-family: var(--heading-font);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.metric-card {
  height: 300px;
}

.performance-details {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.performance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.performance-header h2 {
  margin: 0;
  font-size: 1.4rem;
  color: var(--text-color);
  font-family: var(--heading-font);
}

.back-btn {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9rem;
  padding: 5px 0;
}

.back-btn:hover {
  text-decoration: underline;
}

.detailed-metrics {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.additional-metrics {
  background-color: white;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  padding: 20px;
}

.additional-metrics h3 {
  margin: 0 0 15px 0;
  font-size: 1.2rem;
  color: var(--primary-color);
  font-family: var(--heading-font);
}

.metrics-description {
  color: var(--light-text-color);
  margin-bottom: 20px;
}

.metrics-placeholder {
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(139, 69, 19, 0.05);
  border-radius: 8px;
  color: var(--light-text-color);
  gap: 10px;
}

.metrics-placeholder i {
  font-size: 2rem;
  color: var(--primary-color);
}

@media (min-width: 768px) {
  .detailed-metrics {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 600px) {
  .metrics-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>
