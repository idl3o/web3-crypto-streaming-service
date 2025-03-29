<template>
  <div class="safe-mode-toggle" :class="[theme, { 'safe-enabled': enabled }]">
    <div class="toggle-container">
      <button 
        class="toggle-button" 
        :class="{ 'enabled': enabled }" 
        @click="toggleSafeMode" 
        aria-label="Toggle Safe Mode"
      >
        <div class="toggle-slider"></div>
        <div class="toggle-icon">
          <i v-if="enabled" class="fas fa-shield-alt"></i>
          <i v-else class="fas fa-shield-alt"></i>
        </div>
      </button>
      
      <div class="toggle-label">
        <span>Safe Mode</span>
        <span class="status-text">{{ enabled ? 'ON' : 'OFF' }}</span>
        
        <button class="info-button" @click="showInfoPanel = true" aria-label="Safe Mode Information">
          <i class="fas fa-info-circle"></i>
        </button>
      </div>
    </div>
    
    <!-- Info panel -->
    <div v-if="showInfoPanel" class="safe-info-panel">
      <div class="info-panel-header">
        <h4>Safe Mode</h4>
        <button class="close-button" @click="showInfoPanel = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="info-panel-content">
        <p>
          Safe Mode provides additional protection for your crypto activities:
        </p>
        <ul>
          <li>
            <i class="fas fa-check-circle"></i>
            <span>Warns about high-risk investments</span>
          </li>
          <li>
            <i class="fas fa-check-circle"></i>
            <span>Verifies transaction safety</span>
          </li>
          <li>
            <i class="fas fa-check-circle"></i>
            <span>Identifies suspicious content</span>
          </li>
          <li>
            <i class="fas fa-check-circle"></i>
            <span>Shows content safety ratings</span>
          </li>
        </ul>
        
        <div class="customize-link">
          <router-link to="/safety/settings">
            <i class="fas fa-sliders-h"></i> Customize Safe Mode Settings
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import { toggleSafeMode, getSafetySettings } from '@/services/SafetyService';

const emit = defineEmits(['change']);
const theme = inject('currentTheme', 'roman-theme');

// State
const enabled = ref(true);
const showInfoPanel = ref(false);

// Initialize from saved settings
onMounted(() => {
  const settings = getSafetySettings();
  enabled.value = settings.enabled;
});

// Toggle safe mode
function toggleSafeMode() {
  const settings = toggleSafeMode(!enabled.value);
  enabled.value = settings.enabled;
  emit('change', settings.enabled);
}
</script>

<style scoped>
.safe-mode-toggle {
  position: relative;
}

.toggle-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-button {
  position: relative;
  width: 46px;
  height: 24px;
  background-color: #e0e0e0;
  border-radius: 12px;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: background-color 0.3s;
}

.toggle-button.enabled {
  background-color: #2ecc71;
}

.toggle-slider {
  position: absolute;
  left: 2px;
  top: 2px;
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  transition: left 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-button.enabled .toggle-slider {
  left: 24px;
}

.toggle-icon {
  position: absolute;
  top: 5px;
  left: 5px;
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.5);
  transition: all 0.3s;
}

.toggle-button.enabled .toggle-icon {
  left: 27px;
  color: white;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9rem;
  font-weight: 500;
}

.status-text {
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.7;
}

.info-button {
  background: none;
  border: none;
  font-size: 0.9rem;
  color: #777;
  cursor: pointer;
  padding: 3px;
  margin-left: 3px;
}

.info-button:hover {
  color: #333;
}

/* Info panel */
.safe-info-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 280px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 3px 15px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
}

.info-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
}

.info-panel-header h4 {
  margin: 0;
  font-size: 1.1rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: #777;
}

.info-panel-content {
  padding: 15px;
}

.info-panel-content p {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
}

.info-panel-content ul {
  list-style: none;
  padding: 0;
  margin: 0 0 15px 0;
}

.info-panel-content li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.85rem;
  margin-bottom: 10px;
}

.info-panel-content li i {
  color: #2ecc71;
  margin-top: 3px;
}

.customize-link {
  padding-top: 10px;
  border-top: 1px dashed #eee;
  text-align: center;
}

.customize-link a {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.85rem;
  text-decoration: none;
  color: #3498db;
  transition: color 0.2s;
}

.customize-link a:hover {
  color: #2980b9;
  text-decoration: underline;
}

/* Roman theme overrides */
.roman-theme .toggle-button.enabled {
  background-color: #6B8E23;
}

.roman-theme .info-panel-content li i {
  color: #6B8E23;
}

.roman-theme .customize-link a {
  color: #8B4513;
}

.roman-theme .customize-link a:hover {
  color: #A0522D;
}

.roman-theme .safe-info-panel {
  border: 1px solid #d5c3aa;
}

.roman-theme .info-panel-header {
  border-bottom-color: #d5c3aa;
}

.roman-theme .customize-link {
  border-top-color: #d5c3aa;
}
</style>
