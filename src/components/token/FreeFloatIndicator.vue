<template>
  <div class="free-float-indicator" :class="theme">
    <div class="indicator-header">
      <h3>{{ tokenData.symbol }} Free Float</h3>
      <div class="volatility-badge" :class="volatilityClass">
        {{ formatVolatility(tokenData.freeFloat.volatilityCategory) }}
      </div>
    </div>

    <div class="supply-chart">
      <div class="progress-container">
        <div class="progress-bar">
          <div 
            class="progress-free-float" 
            :style="{ width: `${tokenData.freeFloat.percentage}%` }"
            :class="volatilityClass"
          >
            <span v-if="tokenData.freeFloat.percentage > 10">
              {{ tokenData.freeFloat.percentage.toFixed(1) }}%
            </span>
          </div>
          <div v-if="tokenData.freeFloat.percentage < 10" class="low-float-label">
            {{ tokenData.freeFloat.percentage.toFixed(1) }}%
          </div>
        </div>
      </div>

      <div class="chart-legend">
        <div class="legend-item">
          <span class="legend-color free-float-color"></span>
          <span class="legend-label">Free Float</span>
        </div>
        <div class="legend-item">
          <span class="legend-color restricted-color"></span>
          <span class="legend-label">Restricted</span>
        </div>
      </div>

      <div class="metrics-breakdown">
        <div class="metric">
          <div class="metric-value">{{ formatNumber(tokenData.freeFloat.amount) }}</div>
          <div class="metric-label">Free Float</div>
        </div>
        <div class="metric">
          <div class="metric-value">{{ formatNumber(tokenData.totalRestricted.amount) }}</div>
          <div class="metric-label">Restricted</div>
        </div>
        <div class="metric">
          <div class="metric-value">{{ formatNumber(tokenData.totalSupply) }}</div>
          <div class="metric-label">Total Supply</div>
        </div>
      </div>
    </div>

    <div class="liquidity-ratio">
      <div class="ratio-label">Liquidity Ratio:</div>
      <div class="ratio-value" :class="liquidityRatioClass">
        {{ (tokenData.freeFloat.liquidityRatio * 100).toFixed(2) }}%
      </div>
    </div>

    <div v-if="expanded" class="restrictions-breakdown">
      <h4>Supply Restrictions</h4>
      <div v-for="restriction in tokenData.supplyRestrictions" :key="restriction.type" class="restriction-item">
        <div class="restriction-type">{{ formatRestrictionType(restriction.type) }}</div>
        <div class="restriction-details">
          <div class="restriction-amount">{{ formatNumber(restriction.amount) }}</div>
          <div class="restriction-percentage">{{ restriction.percentage.toFixed(1) }}%</div>
          <div v-if="restriction.endDate" class="restriction-date">
            Unlocks: {{ formatDate(restriction.endDate) }}
          </div>
        </div>
      </div>
    </div>
    
    <button @click="expanded = !expanded" class="toggle-button">
      {{ expanded ? 'Show Less' : 'Show Restrictions' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue';
import { VOLATILITY_CATEGORIES } from '@/services/FreeFloatService';

const props = defineProps({
  tokenData: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['click']);
const theme = inject('currentTheme', 'roman-theme');
const expanded = ref(false);

const volatilityClass = computed(() => {
  const category = props.tokenData.freeFloat.volatilityCategory;
  switch (category) {
    case VOLATILITY_CATEGORIES.VERY_LOW:
      return 'very-low';
    case VOLATILITY_CATEGORIES.LOW:
      return 'low';
    case VOLATILITY_CATEGORIES.MODERATE:
      return 'moderate';
    case VOLATILITY_CATEGORIES.HIGH:
      return 'high';
    case VOLATILITY_CATEGORIES.VERY_HIGH:
      return 'very-high';
    default:
      return 'moderate';
  }
});

const liquidityRatioClass = computed(() => {
  const ratio = props.tokenData.freeFloat.liquidityRatio;
  if (ratio < 0.1) return 'very-low';
  if (ratio < 0.25) return 'low';
  if (ratio < 0.5) return 'moderate';
  if (ratio < 0.75) return 'high';
  return 'very-high';
});

function formatVolatility(category) {
  switch (category) {
    case VOLATILITY_CATEGORIES.VERY_LOW:
      return 'Very Low Volatility';
    case VOLATILITY_CATEGORIES.LOW:
      return 'Low Volatility';
    case VOLATILITY_CATEGORIES.MODERATE:
      return 'Moderate Volatility';
    case VOLATILITY_CATEGORIES.HIGH:
      return 'High Volatility';
    case VOLATILITY_CATEGORIES.VERY_HIGH:
      return 'Very High Volatility';
    default:
      return 'Unknown';
  }
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toLocaleString();
}

function formatDate(dateString) {
  if (!dateString) return 'Indefinite';
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function formatRestrictionType(type) {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
</script>

<style scoped>
.free-float-indicator {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

.indicator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.indicator-header h3 {
  font-size: 1.2rem;
  margin: 0;
  font-weight: 600;
}

.volatility-badge {
  font-size: 0.8rem;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 500;
}

.volatility-badge.very-low {
  background-color: #e6f7ff;
  color: #0070f3;
}

.volatility-badge.low {
  background-color: #e6fffb;
  color: #13c2c2;
}

.volatility-badge.moderate {
  background-color: #fffbe6;
  color: #faad14;
}

.volatility-badge.high {
  background-color: #fff2e8;
  color: #fa8c16;
}

.volatility-badge.very-high {
  background-color: #fff1f0;
  color: #f5222d;
}

.supply-chart {
  margin-bottom: 20px;
}

.progress-container {
  margin-bottom: 10px;
}

.progress-bar {
  height: 24px;
  background-color: #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.progress-free-float {
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  transition: width 1s ease;
}

.progress-free-float.very-low {
  background-color: #0070f3;
}

.progress-free-float.low {
  background-color: #13c2c2;
}

.progress-free-float.moderate {
  background-color: #faad14;
}

.progress-free-float.high {
  background-color: #fa8c16;
}

.progress-free-float.very-high {
  background-color: #f5222d;
}

.low-float-label {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  font-size: 0.9rem;
  font-weight: 600;
}

.chart-legend {
  display: flex;
  justify-content: flex-start;
  margin-top: 12px;
  margin-bottom: 15px;
  gap: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  color: #666;
}

.legend-color {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 8px;
  border-radius: 2px;
}

.free-float-color {
  background-color: #0070f3;
}

.restricted-color {
  background-color: #f0f0f0;
}

.metrics-breakdown {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-top: 20px;
}

.metric {
  text-align: center;
  background-color: #f9fafb;
  border-radius: 8px;
  padding: 12px 8px;
}

.metric-value {
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 5px;
  color: #333;
}

.metric-label {
  font-size: 0.85rem;
  color: #666;
}

.liquidity-ratio {
  display: flex;
  align-items: center;
  margin-top: 20px;
  padding: 10px;
  background-color: #f9fafb;
  border-radius: 8px;
}

.ratio-label {
  font-weight: 600;
  font-size: 0.9rem;
  margin-right: 10px;
}

.ratio-value {
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.9rem;
}

.ratio-value.very-low {
  background-color: #e6f7ff;
  color: #0070f3;
}

.ratio-value.low {
  background-color: #e6fffb;
  color: #13c2c2;
}

.ratio-value.moderate {
  background-color: #fffbe6;
  color: #faad14;
}

.ratio-value.high {
  background-color: #fff2e8;
  color: #fa8c16;
}

.ratio-value.very-high {
  background-color: #fff1f0;
  color: #f5222d;
}

.restrictions-breakdown {
  margin-top: 25px;
}

.restrictions-breakdown h4 {
  font-size: 1rem;
  margin: 0 0 15px 0;
  font-weight: 600;
}

.restriction-item {
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.restriction-item:last-child {
  border-bottom: none;
}

.restriction-type {
  font-weight: 500;
  font-size: 0.9rem;
}

.restriction-details {
  display: flex;
  gap: 15px;
  align-items: center;
}

.restriction-amount {
  font-size: 0.9rem;
  color: #333;
}

.restriction-percentage {
  font-size: 0.9rem;
  font-weight: 600;
  color: #666;
}

.restriction-date {
  font-size: 0.85rem;
  color: #888;
}

.toggle-button {
  margin-top: 15px;
  width: 100%;
  padding: 8px;
  background: none;
  border: 1px solid #ddd;
  border-radius: 8px;
  color: #666;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-button:hover {
  background-color: #f5f5f5;
  border-color: #bbb;
}

/* Roman Theme */
.roman-theme {
  background-color: #f9f5f0;
  border: 1px solid #e0d5c5;
}

.roman-theme .progress-bar {
  background-color: #e0d5c5;
}

.roman-theme .metric {
  background-color: #f3ece2;
}

.roman-theme .liquidity-ratio {
  background-color: #f3ece2;
}

.roman-theme .restricted-color {
  background-color: #e0d5c5;
}

.roman-theme .ratio-value.very-low {
  background-color: #ecdfc9;
  color: #8B4513;
}

.roman-theme .ratio-value.low {
  background-color: #e8e0d0;
  color: #8B4513;
}

.roman-theme .ratio-value.moderate {
  background-color: #f7ebd0;
  color: #8B4513;
}

.roman-theme .ratio-value.high {
  background-color: #f5e0c5;
  color: #8B4513;
}

.roman-theme .ratio-value.very-high {
  background-color: #f5d0c0;
  color: #8B4513;
}

/* Responsive styles */
@media (max-width: 600px) {
  .metrics-breakdown {
    grid-template-columns: 1fr 1fr;
  }
  
  .restriction-details {
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
  }
}
</style>
