<template>
  <div class="world-info-panel">
    <div class="panel-header">
      <h3>World Status</h3>
      <div class="panel-actions">
        <button @click="refreshData" class="refresh-button">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': isRefreshing }"></i>
        </button>
      </div>
    </div>
    
    <div class="panel-body">
      <div class="world-health">
        <div class="health-indicator" :class="healthClass">
          <div class="health-icon">
            <i :class="healthIcon"></i>
          </div>
          <div class="health-details">
            <div class="health-status">{{ worldState.health }}</div>
            <div class="health-description">{{ healthDescription }}</div>
          </div>
        </div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-title">Uptime</div>
          <div class="stat-value">{{ uptimeFormatted }}</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-title">Services</div>
          <div class="stat-value">{{ worldState.runningServices.length }}</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-title">Errors</div>
          <div class="stat-value" :class="{'text-danger': worldState.errors.length > 0}">
            {{ worldState.errors.length }}
          </div>
        </div>
      </div>
      
      <!-- Services List -->
      <div class="services-section">
        <h4>Active Services</h4>
        <div class="services-grid">
          <div v-for="service in servicesList" :key="service.name" 
               class="service-item" :class="{ active: service.active }">
            <div class="service-icon">
              <i :class="service.icon"></i>
            </div>
            <div class="service-name">{{ service.name }}</div>
            <div class="service-status">{{ service.active ? 'Active' : 'Inactive' }}</div>
          </div>
        </div>
      </div>
      
      <!-- Error Log -->
      <div v-if="worldState.errors.length > 0" class="error-section">
        <h4>System Error Log</h4>
        <div class="error-log">
          <div v-for="(error, index) in worldState.errors" :key="index" class="error-entry">
            <div class="error-timestamp">{{ formatDateTime(error.timestamp) }}</div>
            <div class="error-component">{{ error.component }}</div>
            <div class="error-message">{{ error.error }}</div>
          </div>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="action-section">
        <button @click="restartWorld" class="action-btn restart-btn">
          Restart World
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { world } from '@/core/world';

const worldState = ref(world.getState());
const isRefreshing = ref(false);
let refreshInterval = null;

// Available services with icons
const allServices = [
  { name: 'system', icon: 'fas fa-cogs' },
  { name: 'ui', icon: 'fas fa-desktop' },
  { name: 'blockchain', icon: 'fas fa-link' },
  { name: 'user', icon: 'fas fa-user' },
  { name: 'content', icon: 'fas fa-photo-video' },
  { name: 'streaming', icon: 'fas fa-play' },
  { name: 'core', icon: 'fas fa-microchip' }
];

// Computed properties
const healthClass = computed(() => {
  switch (worldState.value.health) {
    case 'healthy': return 'healthy';
    case 'degraded': return 'warning';
    case 'failing': return 'danger';
    default: return 'info';
  }
});

const healthIcon = computed(() => {
  switch (worldState.value.health) {
    case 'healthy': return 'fas fa-check-circle';
    case 'degraded': return 'fas fa-exclamation-triangle';
    case 'failing': return 'fas fa-times-circle';
    default: return 'fas fa-info-circle';
  }
});

const healthDescription = computed(() => {
  switch (worldState.value.health) {
    case 'healthy': return 'All systems operational';
    case 'degraded': return 'Some services experiencing issues';
    case 'failing': return 'Critical system failure';
    default: return 'System starting up';
  }
});

const uptimeFormatted = computed(() => {
  if (!worldState.value.startTime) return 'Not started';
  
  const uptime = Date.now() - worldState.value.startTime;
  const seconds = Math.floor(uptime / 1000) % 60;
  const minutes = Math.floor(uptime / (1000 * 60)) % 60;
  const hours = Math.floor(uptime / (1000 * 60 * 60)) % 24;
  const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  return `${hours}h ${minutes}m ${seconds}s`;
});

const servicesList = computed(() => {
  return allServices.map(service => ({
    ...service,
    active: worldState.value.runningServices.includes(service.name)
  }));
});

// Methods
function refreshData() {
  isRefreshing.value = true;
  worldState.value = world.getState();
  
  setTimeout(() => {
    isRefreshing.value = false;
  }, 500);
}

async function restartWorld() {
  const confirm = window.confirm('Are you sure you want to restart the world?');
  if (!confirm) return;
  
  try {
    await world.shutdown();
    await world.run();
    refreshData();
  } catch (error) {
    console.error('Failed to restart world:', error);
  }
}

function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Lifecycle hooks
onMounted(() => {
  refreshData();
  refreshInterval = setInterval(refreshData, 5000);
});

onUnmounted(() => {
  clearInterval(refreshInterval);
});
</script>

<style scoped>
.world-info-panel {
  background-color: rgba(26, 32, 44, 0.6);
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.panel-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.refresh-button {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
}

.refresh-button:hover {
  color: white;
}

.panel-body {
  padding: 1.5rem;
}

.world-health {
  margin-bottom: 1.5rem;
}

.health-indicator {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-radius: 0.5rem;
}

.health-indicator.healthy {
  background-color: rgba(72, 187, 120, 0.1);
}

.health-indicator.warning {
  background-color: rgba(237, 137, 54, 0.1);
}

.health-indicator.danger {
  background-color: rgba(229, 62, 62, 0.1);
}

.health-indicator.info {
  background-color: rgba(99, 179, 237, 0.1);
}

.health-icon {
  font-size: 2rem;
  margin-right: 1rem;
}

.health-indicator.healthy .health-icon {
  color: #48bb78;
}

.health-indicator.warning .health-icon {
  color: #ed8936;
}

.health-indicator.danger .health-icon {
  color: #e53e3e;
}

.health-indicator.info .health-icon {
  color: #63b3ed;
}

.health-status {
  font-size: 1.2rem;
  font-weight: 600;
  text-transform: uppercase;
}

.health-description {
  opacity: 0.8;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 0.5rem;
  padding: 1rem;
  text-align: center;
}

.stat-title {
  font-size: 0.9rem;
  opacity: 0.7;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
}

.text-danger {
  color: #e53e3e;
}

.services-section,
.error-section {
  margin-bottom: 1.5rem;
}

.services-section h4,
.error-section h4 {
  font-size: 1rem;
  margin-bottom: 1rem;
  opacity: 0.9;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.service-item {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 0.5rem;
  padding: 1rem;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.05);
  opacity: 0.5;
}

.service-item.active {
  opacity: 1;
  border-color: rgba(72, 187, 120, 0.5);
}

.service-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.service-name {
  font-weight: 600;
  text-transform: capitalize;
}

.service-status {
  font-size: 0.8rem;
  opacity: 0.8;
}

.error-log {
  max-height: 200px;
  overflow-y: auto;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 0.5rem;
}

.error-entry {
  padding: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.error-entry:last-child {
  border-bottom: none;
}

.error-timestamp {
  font-size: 0.8rem;
  opacity: 0.7;
}

.error-component {
  font-weight: 600;
  margin-top: 0.25rem;
}

.error-message {
  font-size: 0.9rem;
  opacity: 0.9;
}

.action-section {
  display: flex;
  justify-content: center;
}

.action-btn {
  padding: 0.75rem 2rem;
  border-radius: 0.25rem;
  font-weight: 600;
  cursor: pointer;
}

.restart-btn {
  background: linear-gradient(45deg, #4e44ce, #6e45e2);
  color: white;
  border: none;
}

.restart-btn:hover {
  background: linear-gradient(45deg, #5b50d6, #7a51ee);
}
</style>
