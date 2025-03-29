<template>
  <div class="minimal-mode-toggle" :class="[theme, { 'minimal-active': isMinimalMode }]">
    <button 
      class="toggle-button" 
      @click="toggleMode" 
      :title="isMinimalMode ? 'Disable Minimal Mode' : 'Enable Minimal Mode'"
    >
      <span v-if="showLabel" class="toggle-label">{{ isMinimalMode ? 'Standard' : 'Minimal' }}</span>
      <div class="toggle-icon">
        <i :class="`fas fa-${isMinimalMode ? 'expand' : 'compress'}`"></i>
      </div>
    </button>
    
    <div v-if="showSettings && isMinimalMode" class="settings-panel">
      <h4 class="settings-title">Minimal Mode Settings</h4>
      
      <div class="preset-selector">
        <span class="setting-label">Preset:</span>
        <select v-model="currentPreset" @change="changePreset">
          <option v-for="(value, key) in MINIMAL_PRESETS" :key="value" :value="value">
            {{ formatPresetName(key) }}
          </option>
        </select>
      </div>
      
      <div class="settings-list">
        <div class="setting-item">
          <label>
            <input type="checkbox" v-model="settings.hideAnimations" @change="updateSettings">
            Hide Animations
          </label>
        </div>
        
        <div class="setting-item">
          <label>
            <input type="checkbox" v-model="settings.hideNonEssentialUI" @change="updateSettings">
            Hide Non-Essential UI
          </label>
        </div>
        
        <div class="setting-item">
          <label>
            <input type="checkbox" v-model="settings.simplifyWidgets" @change="updateSettings">
            Simplify Widgets
          </label>
        </div>
        
        <div class="setting-item">
          <label>
            <input type="checkbox" v-model="settings.disableBackgroundEffects" @change="updateSettings">
            Disable Background Effects
          </label>
        </div>
        
        <div class="setting-item">
          <label>
            <input type="checkbox" v-model="settings.flattenUI" @change="updateSettings">
            Flatten UI Elements
          </label>
        </div>
        
        <div class="setting-item">
          <label>
            <input type="checkbox" v-model="settings.highContrastMode" @change="updateSettings">
            High Contrast Mode
          </label>
        </div>
      </div>
      
      <button class="reset-button" @click="resetSettings">Reset to Default</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted } from 'vue';
import * as MinimalModeService from '@/services/MinimalModeService';

const props = defineProps({
  showLabel: {
    type: Boolean,
    default: true
  },
  showSettings: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['toggle', 'update-settings']);
const theme = inject('currentTheme', 'roman-theme');

// State
const isMinimalMode = ref(false);
const settings = ref({
  hideAnimations: true,
  reduceMotion: true,
  hideNonEssentialUI: true,
  simplifyWidgets: true,
  disableBackgroundEffects: true,
  reduceShadows: true,
  flattenUI: false,
  highContrastMode: false,
  minimalNotifications: true
});
const currentPreset = ref(MinimalModeService.MINIMAL_PRESETS.BALANCED);
const MINIMAL_PRESETS = MinimalModeService.MINIMAL_PRESETS;

// Methods
function toggleMode() {
  const newState = MinimalModeService.toggleMinimalMode();
  isMinimalMode.value = newState;
  emit('toggle', newState);
  
  // Update settings
  settings.value = { ...MinimalModeService.getMinimalModeSettings() };
  currentPreset.value = MinimalModeService.getCurrentPreset();
}

function updateSettings() {
  MinimalModeService.updateSettings(settings.value);
  emit('update-settings', settings.value);
}

function changePreset() {
  MinimalModeService.setPreset(currentPreset.value);
  settings.value = { ...MinimalModeService.getMinimalModeSettings() };
  emit('update-settings', settings.value);
}

function resetSettings() {
  const defaultSettings = MinimalModeService.resetToDefaults();
  settings.value = { ...defaultSettings };
  currentPreset.value = MinimalModeService.getCurrentPreset();
  emit('update-settings', settings.value);
}

function formatPresetName(key) {
  return key.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Lifecycle hooks
onMounted(() => {
  // Initialize the service if not already initialized
  MinimalModeService.initMinimalModeService()
    .then(() => {
      // Get current state
      isMinimalMode.value = MinimalModeService.isMinimalModeActive();
      settings.value = { ...MinimalModeService.getMinimalModeSettings() };
      currentPreset.value = MinimalModeService.getCurrentPreset();
    });
});
</script>

<style scoped>
.minimal-mode-toggle {
  position: relative;
  display: inline-block;
}

.toggle-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-button:hover {
  background-color: #e5e7eb;
}

.toggle-label {
  font-size: 14px;
  font-weight: 500;
}

.toggle-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.minimal-active .toggle-button {
  background-color: #e5e7eb;
  border-color: #d1d5db;
}

.settings-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 250px;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 16px;
  z-index: 100;
}

.settings-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.preset-selector {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.setting-label {
  margin-right: 10px;
  font-size: 14px;
  font-weight: 500;
}

.preset-selector select {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background-color: #f9fafb;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
}

.setting-item label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}

.setting-item input[type="checkbox"] {
  cursor: pointer;
}

.reset-button {
  width: 100%;
  padding: 8px 12px;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-button:hover {
  background-color: #e5e7eb;
}

/* Roman Theme */
.roman-theme .toggle-button {
  background-color: #f8f5e6;
  border-color: #e0d5c5;
}

.roman-theme .toggle-button:hover {
  background-color: #f3ece2;
}

.roman-theme .toggle-icon {
  background-color: #fcf9f0;
}

.roman-theme .settings-panel {
  background-color: #fcf9f0;
  border-color: #e0d5c5;
}

.roman-theme .settings-title {
  color: #8B4513;
}

.roman-theme .preset-selector select {
  border-color: #e0d5c5;
  background-color: #f8f5e6;
}

.roman-theme .reset-button {
  background-color: #f3ece2;
  border-color: #e0d5c5;
}

.roman-theme .reset-button:hover {
  background-color: #e8e0d0;
}

/* Minimal Mode Applied to itself */
.minimal-active.minimal-mode-toggle .toggle-button {
  box-shadow: none;
  border-width: 1px;
  transition: none;
}

.minimal-active.minimal-mode-toggle .settings-panel {
  box-shadow: none;
  border-width: 1px;
}

.minimal-active.minimal-mode-toggle .reset-button,
.minimal-active.minimal-mode-toggle .preset-selector select {
  border-radius: 0;
  transition: none;
}
</style>
