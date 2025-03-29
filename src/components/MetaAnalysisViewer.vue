<template>
  <div class="meta-analysis-container">
    <div class="controls">
      <input v-model="searchQuery" placeholder="Search metadata..." class="search-input" />
      <div class="filter-controls">
        <select v-model="currentSection" @change="updateVisualization">
          <option value="all">All Sections</option>
          <option v-for="section in sections" :key="section" :value="section">{{ formatSectionName(section) }}</option>
        </select>
        <button @click="toggleViewMode" class="view-toggle">
          {{ isVisualMode ? 'Text View' : 'Visual View' }}
        </button>
      </div>
    </div>
    
    <div class="visualization" v-if="isVisualMode">
      <div class="visualization-header">
        <h2>{{ metaTitle }}</h2>
        <span class="version">v{{ metaVersion }}</span>
      </div>
      
      <div class="visualization-content">
        <div v-for="(group, groupName) in filteredGroups" :key="groupName" class="meta-group">
          <h3 class="group-title" @click="toggleGroupExpand(groupName)">
            {{ formatSectionName(groupName) }}
            <span class="expand-icon">{{ expandedGroups.includes(groupName) ? '▼' : '►' }}</span>
          </h3>
          
          <transition name="expand">
            <div v-if="expandedGroups.includes(groupName)" class="group-content">
              <div v-for="(item, idx) in group" :key="groupName + idx" class="meta-item">
                <div v-if="typeof item === 'object'" class="object-item">
                  <div v-for="(value, key) in item" :key="key" class="property">
                    <strong>{{ formatPropertyName(key) }}:</strong> 
                    <span :class="getValueClass(value)">{{ formatValue(value) }}</span>
                  </div>
                </div>
                <div v-else class="simple-item">{{ item }}</div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
    
    <div class="text-view" v-else>
      <pre class="code-block"><code>{{ filteredMetaText }}</code></pre>
    </div>
    
    <div class="metrics-summary">
      <h3>Key Metrics</h3>
      <div class="metrics-grid">
        <div v-for="(value, metric) in keyMetrics" :key="metric" class="metric-card">
          <div class="metric-value">{{ formatMetricValue(value) }}</div>
          <div class="metric-name">{{ formatPropertyName(metric) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import metaAnalysisService from '@/services/meta-analysis';
import { useMetaStore } from '@/stores/meta';

const metaStore = useMetaStore();
const searchQuery = ref('');
const currentSection = ref('all');
const isVisualMode = ref(true);
const expandedGroups = ref(['CORE_PATTERNS']);

const metaTitle = computed(() => metaStore.metaData?.INNOVATION_CATEGORY || 'Meta Analysis');
const metaVersion = computed(() => metaStore.metaData?.META_ANALYSIS_VERSION || '1.0');

const sections = computed(() => {
  return Object.keys(metaStore.sections || {}).filter(section => 
    section !== 'META_ANALYSIS_VERSION' && 
    section !== 'ANALYSIS_TYPE' && 
    section !== 'INNOVATION_CATEGORY'
  );
});

const filteredGroups = computed(() => {
  if (!metaStore.sections) return {};
  
  const groups = currentSection.value === 'all' 
    ? metaStore.sections 
    : { [currentSection.value]: metaStore.sections[currentSection.value] };
  
  if (!searchQuery.value) return groups;
  
  // Filter by search query
  const result = {};
  Object.entries(groups).forEach(([groupName, items]) => {
    const filteredItems = items.filter(item => {
      if (typeof item === 'string') {
        return item.toLowerCase().includes(searchQuery.value.toLowerCase());
      } else {
        return Object.entries(item).some(([k, v]) => {
          const stringValue = String(v).toLowerCase();
          return k.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                 stringValue.includes(searchQuery.value.toLowerCase());
        });
      }
    });
    
    if (filteredItems.length > 0) {
      result[groupName] = filteredItems;
    }
  });
  
  return result;
});

const filteredMetaText = computed(() => {
  return metaAnalysisService.formatMetaToText(filteredGroups.value);
});

const keyMetrics = computed(() => {
  const metrics = metaStore.sections?.INNOVATION_METRICS || {};
  const validation = metaStore.sections?.VALIDATION_METRICS || {};
  return { ...metrics, ...validation };
});

function formatSectionName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatPropertyName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatValue(value: any): string {
  if (typeof value === 'number') {
    return value.toString().includes('.') ? value.toFixed(2) : value.toString();
  }
  return String(value);
}

function formatMetricValue(value: any): string {
  if (typeof value === 'number') {
    // Format as percentage if between 0-1
    if (value >= 0 && value <= 1) {
      return `${(value * 100).toFixed(0)}%`;
    }
    return value.toFixed(2);
  }
  return String(value);
}

function getValueClass(value: any): string {
  if (typeof value === 'number') {
    if (value >= 0.9) return 'value-excellent';
    if (value >= 0.75) return 'value-good';
    if (value >= 0.5) return 'value-average';
    return 'value-poor';
  }
  return '';
}

function toggleGroupExpand(groupName: string): void {
  if (expandedGroups.value.includes(groupName)) {
    expandedGroups.value = expandedGroups.value.filter(g => g !== groupName);
  } else {
    expandedGroups.value.push(groupName);
  }
}

function toggleViewMode(): void {
  isVisualMode.value = !isVisualMode.value;
}

function updateVisualization(): void {
  // Update visualization when section changes
}

onMounted(async () => {
  await metaStore.loadMetaAnalysis();
});
</script>

<style scoped>
.meta-analysis-container {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.search-input {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  width: 300px;
  max-width: 100%;
}

.filter-controls {
  display: flex;
  gap: 0.5rem;
}

select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.view-toggle {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.visualization {
  margin-bottom: 2rem;
}

.visualization-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.version {
  font-size: 0.8rem;
  color: #666;
  background-color: #f0f0f0;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.meta-group {
  margin-bottom: 1rem;
  border: 1px solid #eee;
  border-radius: 6px;
  overflow: hidden;
}

.group-title {
  margin: 0;
  padding: 0.75rem 1rem;
  background-color: #f5f5f5;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.expand-icon {
  font-size: 0.8rem;
  color: #666;
}

.group-content {
  padding: 1rem;
  background-color: #fafafa;
}

.meta-item {
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.object-item .property {
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
}

.simple-item {
  font-size: 0.9rem;
}

.text-view {
  background-color: #f5f5f5;
  border-radius: 6px;
  overflow: auto;
  max-height: 600px;
}

.code-block {
  margin: 0;
  padding: 1rem;
  font-family: monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #333;
}

.metrics-summary {
  margin-top: 2rem;
  border-top: 1px solid #eee;
  padding-top: 1rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.metric-card {
  background: linear-gradient(135deg, #f5f7fa, #e4e8eb);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.metric-value {
  font-size: 2rem;
  font-weight: bold;
  color: var(--primary-color);
  margin-bottom: 0.5rem;
}

.metric-name {
  font-size: 0.8rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.value-excellent {
  color: #2ecc71;
}

.value-good {
  color: #3498db;
}

.value-average {
  color: #f39c12;
}

.value-poor {
  color: #e74c3c;
}

/* Transition effects */
.expand-enter-active,
.expand-leave-active {
  transition: max-height 0.3s ease, opacity 0.3s ease;
  max-height: 1000px;
  overflow: hidden;
  opacity: 1;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
