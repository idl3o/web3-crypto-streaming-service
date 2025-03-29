<template>
  <div class="world-status">
    <div class="status-indicator" :class="healthClass">
      <span class="status-dot"></span>
      <span class="status-text">{{ worldState.health }}</span>
    </div>
    
    <div class="status-details" v-if="showDetails">
      <div class="status-card">
        <h4>System Health</h4>
        
        <div class="info-row">
          <span class="label">Status:</span>
          <span class="value" :class="healthClass">{{ worldState.health }}</span>
        </div>
        
        <div class="info-row">
          <span class="label">Uptime:</span>
          <span class="value">{{ uptimeFormatted }}</span>
        </div>
        
        <div class="info-row">
          <span class="label">Running Services:</span>
          <span class="value">{{ worldState.runningServices.length }}</span>
        </div>
        
        <div class="services">
          <div v-for="service in worldState.runningServices" :key="service" 
               class="service-item">
            {{ service }}
          </div>
        </div>
        
        <div v-if="worldState.errors.length > 0">
          <h5>System Errors</h5>
          <div class="error-list">
            <div v-for="(error, index) in worldState.errors" :key="index" class="error-item">
              <div class="error-component">{{ error.component }}</div>
              <div class="error-message">{{ error.error }}</div>
              <div class="error-time">{{ formatTime(error.timestamp) }}</div>
            </div>
          </div>
        </div>
        
        <div class="actions">
          <button v-if="!worldState.initialized" 
                  @click="initializeWorld"
                  class="action-button primary">
            Initialize World
          </button>
          <button v-else @click="restartWorld" class="action-button warning">
            Restart World
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { world } from '@/core/world';

const showDetails = ref(false);
const worldState = ref(world.getState());
let refreshInterval = null;

// Computed properties
const healthClass = computed(() => {
  switch (worldState.value.health) {
    case 'healthy': return 'healthy';
    case 'degraded': return 'warning';
    case 'failing': return 'danger';
    default: return 'info';
  }
});

const uptimeFormatted = computed(() => {
  if (!worldState.value.startTime) return 'Not started';
  
  const uptime = Date.now() - worldState.value.startTime;
  const seconds = Math.floor(uptime / 1000) % 60;
  const minutes = Math.floor(uptime / (1000 * 60)) % 60;
  const hours = Math.floor(uptime / (1000 * 60 * 60));
  
  return `${hours}h ${minutes}m ${seconds}s`;
});

// Methods
function refreshWorldState() {
  worldState.value = world.getState();
}

function toggleDetails() {
  showDetails.value = !showDetails.value;
}

async function initializeWorld() {
  await world.run();
  refreshWorldState();
}

async function restartWorld() {
  await world.shutdown();
  await world.run();
  refreshWorldState();
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}

// Lifecycle hooks
onMounted(() => {
  refreshInterval = setInterval(refreshWorldState, 1000);
});

onUnmounted(() => {
  clearInterval(refreshInterval);
});
</script>

<style scoped>
.world-status {
  position: relative;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 0.5rem;
}

.healthy {
  color: #48bb78;
}

.healthy .status-dot {
  background-color: #48bb78;
  box-shadow: 0 0 8px #48bb78;
}

.warning {
  color: #ed8936;
}

.warning .status-dot {
  background-color: #ed8936;
  box-shadow: 0 0 8px #ed8936;
}

.danger {
  color: #e53e3e;
}

.danger .status-dot {
  background-color: #e53e3e;
  box-shadow: 0 0 8px #e53e3e;
}

.info {
  color: #63b3ed;
}

.info .status-dot {
  background-color: #63b3ed;
  box-shadow: 0 0 8px #63b3ed;
}

.status-details {
  position: absolute;
  top: 100%;
  right: 0;
  width: 300px;
  margin-top: 0.5rem;
  background-color: rgba(26, 32, 44, 0.95);
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.status-card {
  padding: 1rem;
}

.status-card h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
}

.status-card h5 {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.label {
  opacity: 0.8;
}

.services {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1rem 0;
}

.service-item {
  background-color: rgba(255, 255, 255, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.8rem;
}

.error-list {
  max-height: 150px;
  overflow-y: auto;
  margin-bottom: 1rem;
}

.error-item {
  background-color: rgba(229, 62, 62, 0.1);
  border-left: 3px solid #e53e3e;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
}

.error-component {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.error-message {
  opacity: 0.8;
  margin-bottom: 0.25rem;
}

.error-time {
  font-size: 0.7rem;
  opacity: 0.6;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.action-button {
  padding: 0.4rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.85rem;
  border: none;
  cursor: pointer;
}

.primary {
  background-color: #4e44ce;
  color: white;
}

.warning {
  background-color: #ed8936;
  color: white;
}
</style>
