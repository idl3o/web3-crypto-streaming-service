<template>
  <div class="blockchain-realm-display" :class="theme">
    <div class="realm-header">
      <h3>Blockchain Realm Explorer</h3>
      <div class="view-controls">
        <button 
          v-for="view in viewOptions" 
          :key="view.id" 
          @click="currentView = view.id"
          :class="{ active: currentView === view.id }">
          <i :class="'fas ' + view.icon"></i>
          {{ view.label }}
        </button>
      </div>
    </div>

    <div class="realm-content">
      <!-- Island Grid View -->
      <div v-if="currentView === 'islands'" class="islands-view">
        <div class="grid-controls">
          <div class="search-box">
            <input type="text" v-model="searchQuery" placeholder="Search islands...">
            <i class="fas fa-search"></i>
          </div>
          <div class="filters">
            <select v-model="filterChain">
              <option value="">All Chains</option>
              <option v-for="chain in availableChains" :key="chain.id" :value="chain.id">
                {{ chain.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="islands-grid">
          <div 
            v-for="island in filteredIslands" 
            :key="island.id" 
            class="island-card"
            @click="selectIsland(island)">
            <div class="island-image" :style="{ backgroundColor: island.color }">
              <img v-if="island.image" :src="island.image" :alt="island.name">
              <i v-else class="fas fa-island-tropical"></i>
            </div>
            <div class="island-info">
              <h4>{{ island.name }}</h4>
              <div class="island-stats">
                <span><i class="fas fa-users"></i> {{ formatNumber(island.population) }}</span>
                <span><i class="fas fa-coins"></i> {{ formatNumber(island.value) }}</span>
              </div>
              <div class="island-chain">
                <div class="chain-icon" :style="{ backgroundColor: getChainColor(island.chain) }">
                  {{ island.chain.substring(0, 1).toUpperCase() }}
                </div>
                <span>{{ getChainName(island.chain) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="no-results" v-if="filteredIslands.length === 0">
          <i class="fas fa-search"></i>
          <p>No islands matching your search</p>
        </div>
      </div>

      <!-- Platforms View -->
      <div v-else-if="currentView === 'platforms'" class="platforms-view">
        <div class="platforms-list">
          <div 
            v-for="platform in filteredPlatforms" 
            :key="platform.id" 
            class="platform-item"
            :class="{ active: selectedPlatform && selectedPlatform.id === platform.id }"
            @click="selectPlatform(platform)">
            <div class="platform-icon" :style="{ backgroundColor: platform.color }">
              <i :class="'fas ' + (platform.icon || 'fa-layer-group')"></i>
            </div>
            <div class="platform-info">
              <h4>{{ platform.name }}</h4>
              <div class="platform-stats">
                <span>{{ platform.islandCount }} islands</span>
                <span>{{ platform.type }}</span>
              </div>
            </div>
            <div class="platform-status" :class="platform.status">
              {{ platform.status }}
            </div>
          </div>
        </div>

        <div class="platform-details" v-if="selectedPlatform">
          <div class="details-header">
            <h3>{{ selectedPlatform.name }}</h3>
            <button class="close-details" @click="selectedPlatform = null">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="details-content">
            <div class="detail-section">
              <h4>Platform Information</h4>
              <div class="detail-row">
                <span class="label">Type:</span>
                <span class="value">{{ selectedPlatform.type }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Status:</span>
                <span class="value status" :class="selectedPlatform.status">
                  {{ selectedPlatform.status }}
                </span>
              </div>
              <div class="detail-row">
                <span class="label">Created:</span>
                <span class="value">{{ formatDate(selectedPlatform.createdAt) }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Island Count:</span>
                <span class="value">{{ selectedPlatform.islandCount }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Total Value:</span>
                <span class="value">{{ formatCurrency(selectedPlatform.totalValue) }}</span>
              </div>
            </div>
            
            <div class="detail-section">
              <h4>Connected Islands</h4>
              <div class="mini-island-list">
                <div 
                  v-for="island in selectedPlatformIslands" 
                  :key="island.id" 
                  class="mini-island-item">
                  <div class="island-marker" :style="{ backgroundColor: island.color }"></div>
                  <span>{{ island.name }}</span>
                </div>
              </div>
            </div>
            
            <div class="platform-actions">
              <button class="action-button">
                <i class="fas fa-link"></i> Connect Island
              </button>
              <button class="action-button">
                <i class="fas fa-chart-bar"></i> View Analytics
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Geographic View -->
      <div v-else-if="currentView === 'geographic'" class="geographic-view">
        <div class="realm-map">
          <div v-if="loading" class="loading-overlay">
            <div class="spinner"></div>
            <span>Loading geographic data...</span>
          </div>
          
          <div class="map-container">
            <!-- This would be replaced with a real map component in production -->
            <div class="map-placeholder">
              <div 
                v-for="(cluster, index) in geographicClusters" 
                :key="index" 
                class="geo-cluster"
                :style="{
                  left: `${cluster.x}%`,
                  top: `${cluster.y}%`,
                  backgroundColor: cluster.color,
                  width: `${10 + (cluster.size * 5)}px`,
                  height: `${10 + (cluster.size * 5)}px`,
                }">
                <div class="cluster-tooltip">
                  {{ cluster.name }}<br>
                  {{ cluster.count }} islands<br>
                  {{ formatCurrency(cluster.value) }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="map-legend">
            <div class="legend-item" v-for="chain in availableChains" :key="chain.id">
              <div class="legend-color" :style="{ backgroundColor: chain.color }"></div>
              <span>{{ chain.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue';
import { useRealmService } from '@/services/RealmService';

const props = defineProps({
  initialView: {
    type: String,
    default: 'islands'
  }
});

const emit = defineEmits(['select-island', 'select-platform']);
const theme = inject('currentTheme', 'roman-theme');

// Use the realm service
const { 
  fetchIslands, 
  fetchPlatforms, 
  fetchGeographicData,
  getChainName,
  getChainColor,
  availableChains
} = useRealmService();

// State
const islands = ref([]);
const platforms = ref([]);
const geographicClusters = ref([]);
const currentView = ref(props.initialView);
const searchQuery = ref('');
const filterChain = ref('');
const selectedIsland = ref(null);
const selectedPlatform = ref(null);
const loading = ref(false);

// View options
const viewOptions = [
  { id: 'islands', label: 'Islands', icon: 'fa-island-tropical' },
  { id: 'platforms', label: 'Platforms', icon: 'fa-layer-group' },
  { id: 'geographic', label: 'Geographic', icon: 'fa-globe-americas' }
];

// Computed properties
const filteredIslands = computed(() => {
  return islands.value.filter(island => {
    const matchesSearch = !searchQuery.value || 
      island.name.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesChain = !filterChain.value || island.chain === filterChain.value;
    return matchesSearch && matchesChain;
  });
});

const filteredPlatforms = computed(() => {
  return platforms.value;
});

const selectedPlatformIslands = computed(() => {
  if (!selectedPlatform.value) return [];
  
  return islands.value.filter(island => 
    island.platformId === selectedPlatform.value.id
  );
});

// Fetch data
async function loadData() {
  loading.value = true;
  
  try {
    islands.value = await fetchIslands();
    platforms.value = await fetchPlatforms();
    
    if (currentView.value === 'geographic') {
      loadGeographicData();
    }
  } catch (error) {
    console.error('Error loading realm data:', error);
  } finally {
    loading.value = false;
  }
}

async function loadGeographicData() {
  try {
    geographicClusters.value = await fetchGeographicData();
  } catch (error) {
    console.error('Error loading geographic data:', error);
  }
}

// Methods
function selectIsland(island) {
  selectedIsland.value = island;
  emit('select-island', island);
}

function selectPlatform(platform) {
  selectedPlatform.value = platform;
  emit('select-platform', platform);
}

function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString();
}

function formatCurrency(value) {
  if (value === undefined || value === null) return '0 ETH';
  return `${value.toFixed(4)} ETH`;
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

// Watch for view changes
watch(currentView, (newView) => {
  if (newView === 'geographic' && geographicClusters.value.length === 0) {
    loadGeographicData();
  }
});

// Initialize
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.blockchain-realm-display {
  font-family: 'Inter', sans-serif;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 500px;
}

.realm-header {
  padding: 15px 20px;
  background-color: #2c3e50;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.realm-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.view-controls {
  display: flex;
  gap: 5px;
}

.view-controls button {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 5px;
}

.view-controls button:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.view-controls button.active {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.realm-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Islands View */
.islands-view {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.grid-controls {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}

.search-box {
  position: relative;
  flex: 1;
}

.search-box input {
  width: 100%;
  padding: 10px 15px 10px 35px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
}

.search-box i {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #aaa;
}

.filters select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  background-color: white;
}

.islands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 15px;
  overflow-y: auto;
  padding-right: 5px;
  flex: 1;
}

.island-card {
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  border: 1px solid #eee;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.island-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.island-image {
  height: 120px;
  background-size: cover;
  background-position: center;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
}

.island-info {
  padding: 15px;
}

.island-info h4 {
  margin: 0 0 10px 0;
  font-size: 1.1rem;
}

.island-stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 10px;
}

.island-chain {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.chain-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.7rem;
}

.no-results {
  text-align: center;
  padding: 40px;
  color: #999;
}

.no-results i {
  font-size: 2rem;
  margin-bottom: 10px;
  opacity: 0.5;
}

/* Platforms View */
.platforms-view {
  display: flex;
  height: 100%;
}

.platforms-list {
  width: 300px;
  border-right: 1px solid #eee;
  overflow-y: auto;
  padding: 10px;
}

.platform-item {
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background-color 0.2s;
}

.platform-item:hover {
  background-color: #f8f9fa;
}

.platform-item.active {
  background-color: #e3f2fd;
}

.platform-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
}

.platform-info {
  flex: 1;
}

.platform-info h4 {
  margin: 0 0 5px 0;
  font-size: 1rem;
}

.platform-stats {
  font-size: 0.8rem;
  color: #666;
  display: flex;
  gap: 10px;
}

.platform-status {
  font-size: 0.75rem;
  padding: 3px 8px;
  border-radius: 12px;
  text-transform: uppercase;
}

.platform-status.active {
  background-color: #e3f9e5;
  color: #2e7d32;
}

.platform-status.pending {
  background-color: #fff8e1;
  color: #f57c00;
}

.platform-status.inactive {
  background-color: #f5f5f5;
  color: #757575;
}

.platform-details {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.details-header h3 {
  margin: 0;
  font-size: 1.3rem;
}

.close-details {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #757575;
  cursor: pointer;
}

.close-details:hover {
  color: #333;
}

.detail-section {
  margin-bottom: 25px;
}

.detail-section h4 {
  margin: 0 0 15px 0;
  font-size: 1rem;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.detail-row {
  display: flex;
  margin-bottom: 10px;
  font-size: 0.95rem;
}

.detail-row .label {
  width: 120px;
  color: #757575;
}

.detail-row .value {
  flex: 1;
  font-weight: 500;
}

.detail-row .value.status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
}

.detail-row .value.status.active {
  background-color: #e3f9e5;
  color: #2e7d32;
}

.detail-row .value.status.pending {
  background-color: #fff8e1;
  color: #f57c00;
}

.detail-row .value.status.inactive {
  background-color: #f5f5f5;
  color: #757575;
}

.mini-island-list {
  background-color: #f8f9fa;
  border-radius: 6px;
  padding: 10px;
}

.mini-island-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 5px;
  transition: background-color 0.2s;
}

.mini-island-item:hover {
  background-color: #f0f0f0;
}

.island-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.platform-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.action-button {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  background-color: #f0f0f0;
  color: #333;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.action-button:hover {
  background-color: #e0e0e0;
}

/* Geographic View */
.geographic-view {
  height: 100%;
  position: relative;
}

.realm-map {
  height: 100%;
  padding: 20px;
  position: relative;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.map-container {
  height: calc(100% - 60px);
  position: relative;
}

.map-placeholder {
  height: 100%;
  background-color: #f0f8ff;
  border-radius: 8px;
  position: relative;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f0f8ff"/><path d="M0,0 L100,100 M0,100 L100,0" stroke="%23e6f0fb" stroke-width="0.5"/></svg>');
}

.geo-cluster {
  position: absolute;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  transition: transform 0.2s;
}

.geo-cluster:hover {
  transform: translate(-50%, -50%) scale(1.2);
  z-index: 5;
}

.cluster-tooltip {
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  background-color: white;
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  white-space: nowrap;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  visibility: hidden;
  opacity: 0;
  transition: visibility 0s, opacity 0.2s;
  text-align: center;
}

.geo-cluster:hover .cluster-tooltip {
  visibility: visible;
  opacity: 1;
}

.map-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.85rem;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

/* Roman theme styling */
.roman-theme .realm-header {
  background-color: #8B4513;
}

.roman-theme .island-card {
  border-color: #d5c3aa;
}

.roman-theme .platform-item.active {
  background-color: #f5eee6;
}

.roman-theme .map-placeholder {
  background-color: #f9f5ec;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f9f5ec"/><path d="M0,0 L100,100 M0,100 L100,0" stroke="%23f0e8d9" stroke-width="0.5"/></svg>');
}

/* Responsive styling */
@media (max-width: 768px) {
  .platforms-view {
    flex-direction: column;
  }
  
  .platforms-list {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #eee;
    max-height: 300px;
  }
  
  .grid-controls {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
