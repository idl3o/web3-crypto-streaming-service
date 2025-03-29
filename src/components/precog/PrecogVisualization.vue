<template>
  <div class="precog-visualization" :class="theme">
    <div class="visualization-header">
      <h3>{{ title }}</h3>
      <div class="visualization-controls">
        <div class="time-horizon-selector">
          <label>Time Horizon</label>
          <div class="time-buttons">
            <button 
              v-for="option in timeHorizonOptions" 
              :key="option.value"
              :class="['time-btn', { active: timeHorizon === option.value }]"
              @click="timeHorizon = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <div class="display-options">
          <button class="option-btn" @click="toggleConfidenceInterval">
            <i class="fas" :class="showConfidenceInterval ? 'fa-eye-slash' : 'fa-eye'"></i>
            {{ showConfidenceInterval ? 'Hide' : 'Show' }} Uncertainty
          </button>
          <button class="option-btn" @click="toggleDataView">
            <i class="fas" :class="currentView === 'chart' ? 'fa-table' : 'fa-chart-line'"></i>
            {{ currentView === 'chart' ? 'Table View' : 'Chart View' }}
          </button>
        </div>
      </div>
    </div>
    
    <div v-if="loading" class="visualization-loading">
      <div class="loading-spinner"></div>
      <div class="loading-text">Calculating predictive models...</div>
    </div>
    
    <template v-else>
      <!-- Chart View -->
      <div v-if="currentView === 'chart'" class="chart-container" ref="chartContainer">
        <div class="metrics-summary">
          <div class="metric-card" v-for="(metric, index) in metrics" :key="index">
            <div class="metric-label">{{ metric.label }}</div>
            <div class="metric-value">{{ metric.value }}</div>
            <div class="metric-trend" v-if="metric.trend">
              <i class="fas" :class="getTrendIconClass(metric.trend)"></i>
              <span>{{ metric.trend }}</span>
            </div>
          </div>
        </div>
        
        <canvas ref="chartCanvas" height="300"></canvas>
        
        <div class="confidence-indicator" v-if="forecast">
          <div class="confidence-label">
            <i class="fas fa-brain"></i> 
            Prediction Confidence:
          </div>
          <div class="confidence-bar-container">
            <div class="confidence-bar" :style="{ width: `${forecast.metadata.confidence * 100}%` }"></div>
            <div class="confidence-value">{{ Math.round(forecast.metadata.confidence * 100) }}%</div>
          </div>
        </div>
      </div>
      
      <!-- Table View -->
      <div v-else class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Value</th>
              <th>Prediction Type</th>
              <th v-if="showConfidenceInterval">Range (± Uncertainty)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(point, index) in forecastData" :key="index" :class="point.type">
              <td>{{ formatDate(point.date) }}</td>
              <td>{{ formatValue(point.value) }}</td>
              <td>
                <span class="data-type-badge" :class="point.type">
                  {{ point.type === 'historical' ? 'Actual' : 'Predicted' }}
                </span>
              </td>
              <td v-if="showConfidenceInterval && point.type === 'forecast'">
                {{ formatValue(point.confidenceLower) }} - {{ formatValue(point.confidenceUpper) }}
              </td>
              <td v-else-if="showConfidenceInterval"></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="insight-section" v-if="insights.length > 0">
        <h4>Precognitive Insights</h4>
        <ul class="insights-list">
          <li v-for="(insight, index) in insights" :key="index">
            <i class="fas fa-lightbulb"></i>
            <span>{{ insight }}</span>
          </li>
        </ul>
      </div>
    </template>
    
    <div class="precog-footer">
      <div class="last-updated" v-if="forecast && forecast.metadata.lastUpdated">
        Last updated: {{ formatDateTime(forecast.metadata.lastUpdated) }}
      </div>
      <div class="disclaimer">
        Predictions are based on historical patterns and market indicators.
        Actual results may vary.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, inject, computed, nextTick } from 'vue';
import Chart from 'chart.js/auto';
import { generateForecastTimeSeries } from '@/services/PrecogEngine';

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: value => ['viewership', 'investment', 'engagement', 'market'].includes(value)
  },
  title: {
    type: String,
    default: 'Predictive Analysis'
  },
  initialParams: {
    type: Object,
    default: () => ({})
  },
  insights: {
    type: Array,
    default: () => []
  },
  metrics: {
    type: Array,
    default: () => []
  }
});

const theme = inject('currentTheme', 'roman-theme');

// State
const loading = ref(true);
const forecast = ref(null);
const chartInstance = ref(null);
const chartCanvas = ref(null);
const timeHorizon = ref(30);
const showConfidenceInterval = ref(true);
const currentView = ref('chart');

// Time horizon options
const timeHorizonOptions = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
  { value: 180, label: '180d' }
];

// Computed properties
const forecastData = computed(() => {
  if (!forecast.value) return [];
  return forecast.value.dataPoints;
});

const forecastParams = computed(() => {
  return {
    ...props.initialParams,
    days: timeHorizon.value
  };
});

// Watch for changes that require regenerating forecasts
watch([() => props.type, timeHorizon], () => {
  generateForecast();
}, { deep: true });

// Lifecycle hooks
onMounted(async () => {
  await generateForecast();
  loading.value = false;
});

// Methods
async function generateForecast() {
  loading.value = true;
  
  try {
    // Generate forecast data using the PrecogEngine
    forecast.value = generateForecastTimeSeries(props.type, forecastParams.value);
    
    // Create or update chart when data is ready
    await nextTick();
    if (currentView.value === 'chart') {
      updateChart();
    }
  } catch (error) {
    console.error('Error generating forecast:', error);
  } finally {
    loading.value = false;
  }
}

function updateChart() {
  if (!chartCanvas.value || !forecast.value) return;

  // Destroy existing chart if it exists
  if (chartInstance.value) {
    chartInstance.value.destroy();
  }
  
  const ctx = chartCanvas.value.getContext('2d');
  
  // Prepare data for chart
  const labels = forecast.value.dataPoints.map(point => point.date);
  const historicalData = forecast.value.dataPoints
    .filter(point => point.type === 'historical')
    .map(point => point.value);
  const forecastData = forecast.value.dataPoints
    .filter(point => point.type === 'forecast')
    .map(point => point.value);
  
  // Fill in null values for alignment
  const historicalDataset = [...historicalData, ...Array(forecastData.length).fill(null)];
  const forecastDataset = [...Array(historicalData.length).fill(null), ...forecastData];
  
  // Create confidence interval data if enabled
  let confidenceUpperDataset = null;
  let confidenceLowerDataset = null;
  
  if (showConfidenceInterval.value) {
    confidenceUpperDataset = forecast.value.dataPoints.map(point => {
      return point.type === 'forecast' ? point.confidenceUpper : null;
    });
    
    confidenceLowerDataset = forecast.value.dataPoints.map(point => {
      return point.type === 'forecast' ? point.confidenceLower : null;
    });
  }
  
  // Set up chart colors based on theme
  const colors = getChartColors();
  
  // Create chart
  chartInstance.value = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Historical',
          data: historicalDataset,
          borderColor: colors.historical,
          backgroundColor: 'transparent',
          borderWidth: 3,
          pointRadius: 3,
          pointBackgroundColor: colors.historical,
          tension: 0.3
        },
        {
          label: 'Forecast',
          data: forecastDataset,
          borderColor: colors.forecast,
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          borderWidth: 3,
          pointRadius: 2,
          pointBackgroundColor: colors.forecast,
          tension: 0.3
        },
        ...(showConfidenceInterval.value ? [
          {
            label: 'Upper Confidence',
            data: confidenceUpperDataset,
            borderColor: 'transparent',
            backgroundColor: colors.confidenceArea,
            borderWidth: 1,
            pointRadius: 0,
            fill: '+1'
          },
          {
            label: 'Lower Confidence',
            data: confidenceLowerDataset,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            borderWidth: 1,
            pointRadius: 0,
            fill: false
          }
        ] : [])
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            filter: item => {
              // Only show Historical and Forecast in legend
              return ['Historical', 'Forecast'].includes(item.text);
            }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += formatValue(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: colors.gridLines
          },
          ticks: {
            color: colors.textColor,
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          grid: {
            color: colors.gridLines
          },
          ticks: {
            color: colors.textColor,
            callback: function(value) {
              return formatValue(value, true);
            }
          },
          beginAtZero: false
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  });
}

function toggleConfidenceInterval() {
  showConfidenceInterval.value = !showConfidenceInterval.value;
  
  if (currentView.value === 'chart') {
    updateChart();
  }
}

function toggleDataView() {
  currentView.value = currentView.value === 'chart' ? 'table' : 'chart';
  
  // If switching to chart view, make sure chart is initialized
  if (currentView.value === 'chart') {
    nextTick(() => {
      updateChart();
    });
  }
}

function getChartColors() {
  if (theme.value.includes('roman')) {
    return {
      historical: '#8B4513',
      forecast: '#6B8E23',
      confidenceArea: 'rgba(107, 142, 35, 0.2)',
      gridLines: 'rgba(210, 180, 140, 0.2)',
      textColor: '#8B4513'
    };
  }
  
  // Default blue theme
  return {
    historical: '#3498db',
    forecast: '#2ecc71',
    confidenceArea: 'rgba(46, 204, 113, 0.1)',
    gridLines: 'rgba(0, 0, 0, 0.1)',
    textColor: '#666'
  };
}

function formatDate(dateStr) {
  const options = { month: 'short', day: 'numeric' };
  return new Date(dateStr).toLocaleDateString(undefined, options);
}

function formatDateTime(dateStr) {
  const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateStr).toLocaleString(undefined, options);
}

function formatValue(value, short = false) {
  if (value === null || value === undefined) return '-';
  
  if (props.type === 'viewership') {
    return formatNumber(value, short);
  } else if (props.type === 'investment') {
    return `${value.toFixed(3)} ETH`;
  } else if (props.type === 'engagement') {
    return `${value.toFixed(1)}%`;
  } else if (props.type === 'market') {
    return `$${formatNumber(value, short)}`;
  }
  
  // Default formatter
  return value.toFixed(2);
}

function formatNumber(num, short = false) {
  if (short) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(0);
  }
  
  return new Intl.NumberFormat().format(Math.round(num));
}

function getTrendIconClass(trend) {
  if (!trend) return '';
  
  const trendLower = trend.toLowerCase();
  
  if (trendLower.includes('up') || trendLower.includes('high') || trendLower.includes('increase') || trendLower.includes('bull')) {
    return 'fa-arrow-up trend-up';
  } else if (trendLower.includes('down') || trendLower.includes('low') || trendLower.includes('decrease') || trendLower.includes('bear')) {
    return 'fa-arrow-down trend-down';
  }
  
  return 'fa-arrow-right trend-neutral';
}
</script>

<style scoped>
.precog-visualization {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 20px;
  margin-bottom: 25px;
  overflow: hidden;
}

.visualization-header {
  margin-bottom: 20px;
}

.visualization-header h3 {
  margin: 0 0 15px 0;
  font-size: 1.3rem;
}

.visualization-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.time-horizon-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.time-horizon-selector label {
  font-size: 0.85rem;
  color: #666;
}

.time-buttons {
  display: flex;
}

.time-btn {
  border: 1px solid #ddd;
  background-color: white;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.time-btn:first-child {
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

.time-btn:last-child {
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}

.time-btn:not(:first-child) {
  border-left: none;
}

.time-btn:hover:not(.active) {
  background-color: #f5f5f5;
}

.time-btn.active {
  background-color: #3498db;
  border-color: #3498db;
  color: white;
}

.display-options {
  display: flex;
  gap: 10px;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.option-btn:hover {
  background-color: #f5f5f5;
}

.visualization-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #3498db;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

.loading-text {
  color: #666;
  font-style: italic;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.chart-container {
  position: relative;
  height: 400px;
  margin-bottom: 20px;
}

.metrics-summary {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.metric-card {
  background-color: #f9f9f9;
  border-radius: 6px;
  padding: 10px 15px;
  min-width: 120px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.metric-label {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 3px;
}

.metric-value {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 3px;
}

.metric-trend {
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.trend-up {
  color: #2ecc71;
}

.trend-down {
  color: #e74c3c;
}

.trend-neutral {
  color: #f39c12;
}

.confidence-indicator {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.confidence-label {
  font-size: 0.9rem;
  color: #666;
  display: flex;
  align-items: center;
  gap: 5px;
  width: 170px;
}

.confidence-bar-container {
  position: relative;
  flex-grow: 1;
  height: 10px;
  background-color: #f0f0f0;
  border-radius: 5px;
  overflow: hidden;
}

.confidence-bar {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  transition: width 0.5s ease-out;
}

.confidence-value {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  font-size: 0.8rem;
  font-weight: 600;
  color: #555;
}

.table-container {
  margin: 20px 0;
  max-height: 400px;
  overflow-y: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th, .data-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.data-table th {
  background-color: #f5f5f5;
  font-weight: 600;
  font-size: 0.9rem;
  color: #555;
}

.data-table tr.forecast {
  background-color: #f9f9f9;
  color: #666;
}

.data-table tr:hover {
  background-color: #f5f5f5;
}

.data-type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.data-type-badge.historical {
  background-color: #e8f4fd;
  color: #3498db;
}

.data-type-badge.forecast {
  background-color: #e8f6e8;
  color: #2ecc71;
}

.insight-section {
  margin: 20px 0;
}

.insight-section h4 {
  font-size: 1.1rem;
  margin: 0 0 10px 0;
}

.insights-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.insights-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 0.95rem;
  color: #555;
}

.insights-list li i {
  color: #f39c12;
  margin-top: 3px;
}

.precog-footer {
  margin-top: 20px;
  font-size: 0.8rem;
  color: #999;
  text-align: center;
}

.last-updated {
  margin-bottom: 5px;
}

/* Roman theme overrides */
.roman-theme {
  background-color: #f8f5f0;
  border: 1px solid #d5c3aa;
}

.roman-theme .time-btn.active {
  background-color: #8B4513;
  border-color: #8B4513;
}

.roman-theme .loading-spinner {
  border-top-color: #8B4513;
}

.roman-theme .metric-card {
  background-color: #f5eee6;
}

.roman-theme .metric-value {
  color: #8B4513;
}

.roman-theme .trend-up {
  color: #6B8E23;
}

.roman-theme .confidence-bar {
  background: linear-gradient(90deg, #8B4513, #6B8E23);
}

.roman-theme .data-table th {
  background-color: #f5eee6;
}

.roman-theme .data-table tr.forecast {
  background-color: #f8f5f0;
}

.roman-theme .data-type-badge.historical {
  background-color: #f5eee6;
  color: #8B4513;
}

.roman-theme .data-type-badge.forecast {
  background-color: #f0f5e6;
  color: #6B8E23;
}

.roman-theme .insights-list li i {
  color: #CD853F;
}

/* Responsive styles */
@media (max-width: 768px) {
  .visualization-controls {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .chart-container {
    height: 300px;
  }
  
  .confidence-indicator {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .confidence-bar-container {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .time-horizon-selector {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
  }
  
  .time-buttons {
    width: 100%;
  }
  
  .time-btn {
    flex: 1;
    text-align: center;
  }
  
  .display-options {
    width: 100%;
  }
  
  .option-btn {
    flex: 1;
    justify-content: center;
  }
  
  .metrics-summary {
    flex-direction: column;
  }
  
  .metric-card {
    width: 100%;
  }
  
  .table-container {
    overflow-x: auto;
  }
}
</style>
