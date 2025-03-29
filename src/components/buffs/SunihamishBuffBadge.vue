<template>
  <div 
    class="sunihamish-buff-badge" 
    :class="[sizeClass, theme, { 'is-legendary': isLegendary }]"
    @click="showDetails"
  >
    <div class="buff-icon-wrapper" :style="buffStyle">
      <div class="buff-icon">
        <i v-if="!customIcon" class="fas fa-sun"></i>
        <img v-else :src="customIcon" alt="Sunihamish Buff" />
      </div>
      <div class="buff-glow" v-if="buff.tier === 'legendary'"></div>
      <div class="buff-tier" :style="tierStyle">{{ tierData.icon }}</div>
    </div>
    <div v-if="showLabel" class="buff-label">{{ buff.name }}</div>
    
    <!-- Buff Details Popup -->
    <div v-if="showPopup" class="buff-details-popup" @click.stop>
      <div class="popup-header" :style="{ backgroundColor: metadata.color }">
        <h3 class="popup-title">
          <i :class="metadata.icon"></i> 
          {{ buff.name }}
        </h3>
        <div class="popup-tier" :style="{ backgroundColor: tierData.color }">
          {{ tierData.name }}
        </div>
        <button class="close-button" @click.stop="closeDetails">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="popup-body">
        <div class="buff-description">{{ buff.description }}</div>
        
        <div class="buff-effects">
          <h4>Effects</h4>
          <ul>
            <li v-for="(effect, key) in formatEffects(buff.effects)" :key="key">
              <strong>{{ formatKey(key) }}:</strong> {{ effect }}
            </li>
          </ul>
        </div>
        
        <div class="buff-info">
          <div class="info-row">
            <span class="info-label">Status</span>
            <span class="info-value status-badge" :class="buff.status">
              {{ formatStatus(buff.status) }}
            </span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Granted</span>
            <span class="info-value">{{ formatDate(buff.grantedAt) }}</span>
          </div>
          
          <div v-if="buff.expiresAt" class="info-row">
            <span class="info-label">Expires</span>
            <span class="info-value">{{ formatDate(buff.expiresAt) }}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Origin</span>
            <span class="info-value">{{ metadata.origin || 'Unknown' }}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Rarity</span>
            <span class="info-value rarity-value">{{ metadata.rarity }}</span>
          </div>
        </div>
      </div>
      
      <div class="popup-footer">
        <button 
          v-if="canActivate" 
          class="activate-button"
          @click="activateBuff"
        >
          <i class="fas fa-magic"></i> Activate Buff
        </button>
        <span v-else-if="isActive" class="active-status">
          <i class="fas fa-check-circle"></i> Buff Active
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch } from 'vue';
import * as BuffService from '@/services/BuffService';

const props = defineProps({
  buff: {
    type: Object,
    required: true
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  showLabel: {
    type: Boolean,
    default: true
  },
  interactive: {
    type: Boolean,
    default: true
  },
  customIcon: {
    type: String,
    default: null
  },
  animationLevel: {
    type: String,
    default: 'medium',
    validator: (value) => ['none', 'low', 'medium', 'high', 'extreme'].includes(value)
  }
});

const emit = defineEmits(['activate', 'details', 'close']);
const theme = inject('currentTheme', 'roman-theme');

// State
const showPopup = ref(false);

// Computed properties
const sizeClass = computed(() => `size-${props.size}`);

const metadata = computed(() => {
  return BuffService.getBuffMetadata(props.buff.type);
});

const tierData = computed(() => {
  return BuffService.getBuffTierDisplayData(props.buff.tier);
});

const isLegendary = computed(() => {
  return props.buff.tier === BuffService.BUFF_TIERS.LEGENDARY;
});

const buffStyle = computed(() => {
  const style = {
    backgroundColor: props.buff.metadata?.color || metadata.value.color,
    cursor: props.interactive ? 'pointer' : 'default'
  };
  
  if (isLegendary.value) {
    style.boxShadow = tierData.value.glow;
  }
  
  return style;
});

const tierStyle = computed(() => ({
  backgroundColor: tierData.value.color,
  border: tierData.value.border
}));

const isActive = computed(() => {
  return props.buff.status === BuffService.BUFF_STATUS.ACTIVE;
});

const canActivate = computed(() => {
  return props.buff.status !== BuffService.BUFF_STATUS.ACTIVE &&
         props.buff.status !== BuffService.BUFF_STATUS.CONSUMED;
});

// Methods
function showDetails() {
  if (props.interactive) {
    showPopup.value = true;
    emit('details', props.buff);
  }
}

function closeDetails() {
  showPopup.value = false;
  emit('close');
}

function formatEffects(effects) {
  if (!effects || typeof effects !== 'object') {
    return {};
  }
  
  const formatted = {};
  
  for (const [key, value] of Object.entries(effects)) {
    if (typeof value === 'boolean') {
      formatted[key] = value ? 'Enabled' : 'Disabled';
    } else if (typeof value === 'number') {
      if (key.toLowerCase().includes('boost') || key.toLowerCase().includes('rate')) {
        formatted[key] = `+${value * 100}%`;
      } else {
        formatted[key] = value.toString();
      }
    } else {
      formatted[key] = value;
    }
  }
  
  return formatted;
}

function formatKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .split(/(?=[A-Z])/)
    .join(' ')
    .replace(/^./, str => str.toUpperCase());
}

function formatStatus(status) {
  switch (status) {
    case BuffService.BUFF_STATUS.ACTIVE:
      return 'Active';
    case BuffService.BUFF_STATUS.EXPIRED:
      return 'Expired';
    case BuffService.BUFF_STATUS.CONSUMED:
      return 'Consumed';
    case BuffService.BUFF_STATUS.SUSPENDED:
      return 'Suspended';
    default:
      return status;
  }
}

function formatDate(dateString) {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleString();
}

function activateBuff() {
  emit('activate', props.buff);
}

// Handle outside clicks to close popup
let clickHandler;
watch(showPopup, (value) => {
  if (value) {
    // Add click handler when popup is shown
    clickHandler = (event) => {
      // Check if click is outside popup and buffer element
      if (!event.target.closest('.sunihamish-buff-badge')) {
        closeDetails();
      }
    };
    setTimeout(() => {
      document.addEventListener('click', clickHandler);
    }, 10);
  } else if (clickHandler) {
    // Remove click handler when popup is hidden
    document.removeEventListener('click', clickHandler);
  }
});
</script>

<style scoped>
.sunihamish-buff-badge {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
}

.buff-icon-wrapper {
  position: relative;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: transform 0.2s, box-shadow 0.2s;
  overflow: visible;
}

.buff-icon-wrapper:hover {
  transform: scale(1.1);
}

.size-small .buff-icon-wrapper {
  width: 28px;
  height: 28px;
  font-size: 14px;
}

.size-medium .buff-icon-wrapper {
  width: 40px;
  height: 40px;
  font-size: 20px;
}

.size-large .buff-icon-wrapper {
  width: 56px;
  height: 56px;
  font-size: 28px;
}

.buff-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 50%;
  background: transparent;
  box-shadow: 0 0 15px #FFD700;
  opacity: 0.6;
  animation: pulse 2s infinite;
  z-index: -1;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.2); opacity: 0.3; }
  100% { transform: scale(1); opacity: 0.6; }
}

.buff-tier {
  position: absolute;
  bottom: -3px;
  right: -3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: bold;
  z-index: 2;
}

.size-small .buff-tier {
  width: 13px;
  height: 13px;
  font-size: 7px;
  bottom: -2px;
  right: -2px;
}

.size-large .buff-tier {
  width: 22px;
  height: 22px;
  font-size: 13px;
  bottom: -4px;
  right: -4px;
}

.buff-label {
  font-size: 11px;
  text-align: center;
  max-width: 80px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.size-small .buff-label {
  font-size: 10px;
  max-width: 60px;
}

.size-large .buff-label {
  font-size: 13px;
  max-width: 100px;
}

/* Special effects for legendary buff */
.is-legendary .buff-icon-wrapper::after {
  content: '';
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  border-radius: 50%;
  background: linear-gradient(45deg, #FFD700, transparent, #FFD700);
  animation: rotate 3s linear infinite;
  z-index: -1;
  opacity: 0.7;
}

@keyframes rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Popup styles */
.buff-details-popup {
  position: absolute;
  top: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.popup-header {
  padding: 12px;
  border-radius: 8px 8px 0 0;
  color: white;
  position: relative;
}

.popup-title {
  margin: 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.popup-tier {
  position: absolute;
  top: 12px;
  right: 36px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.close-button {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 14px;
  opacity: 0.8;
}

.close-button:hover {
  opacity: 1;
}

.popup-body {
  padding: 12px;
}

.buff-description {
  margin-bottom: 12px;
  font-style: italic;
}

.buff-effects {
  margin-bottom: 16px;
}

.buff-effects h4 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
}

.buff-effects ul {
  margin: 0;
  padding-left: 20px;
}

.buff-effects li {
  margin-bottom: 4px;
  font-size: 0.85rem;
}

.buff-info {
  background-color: #f9f9f9;
  border-radius: 6px;
  padding: 10px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 0.85rem;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  font-weight: 500;
  color: #555;
}

.status-badge {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.75rem;
}

.status-badge.active {
  background-color: rgba(76, 175, 80, 0.2);
  color: #2E7D32;
}

.status-badge.expired {
  background-color: rgba(244, 67, 54, 0.2);
  color: #C62828;
}

.status-badge.consumed {
  background-color: rgba(156, 39, 176, 0.2);
  color: #7B1FA2;
}

.status-badge.suspended {
  background-color: rgba(255, 152, 0, 0.2);
  color: #EF6C00;
}

.rarity-value {
  font-weight: 500;
}

.popup-footer {
  padding: 12px;
  border-top: 1px solid #eee;
  text-align: center;
}

.activate-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 0.9rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.activate-button:hover {
  background-color: #388E3C;
}

.active-status {
  color: #388E3C;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* Roman theme styling */
.roman-theme .buff-details-popup {
  background-color: rgba(255, 252, 245, 0.95);
  border: 1px solid var(--border-color, #D2B48C);
}

.roman-theme .buff-info {
  background-color: rgba(210, 180, 140, 0.1);
}

.roman-theme .popup-footer {
  border-top: 1px solid var(--border-color, #D2B48C);
}

.roman-theme .activate-button {
  background-color: var(--primary-color, #8B4513);
}

.roman-theme .activate-button:hover {
  background-color: var(--primary-dark-color, #704012);
}

.roman-theme .active-status {
  color: var(--primary-color, #8B4513);
}
</style>
