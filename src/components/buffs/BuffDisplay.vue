<template>
  <div class="buff-display" :class="[size, theme, { interactive }]">
    <div class="buff-header" :style="headerStyle">
      <div class="buff-icon-container">
        <SunihamishBuffBadge 
          :buff="buff" 
          :size="size"
          :show-label="false"
          :interactive="false"
        />
      </div>
      <div class="buff-title-container">
        <h3 class="buff-title">{{ buff.name }}</h3>
        <div class="buff-subtitle" v-if="showSubtitle">
          <span class="buff-status" :class="buff.status">
            {{ formatStatus(buff.status) }}
          </span>
          <span class="buff-tier">{{ tierData.name }}</span>
          <span v-if="powerLevel" class="buff-power">
            <i class="fas fa-bolt"></i> {{ powerLevel }}
          </span>
        </div>
      </div>
    </div>
    
    <div v-if="!compact" class="buff-content">
      <p v-if="showDescription" class="buff-description">{{ buff.description }}</p>
      
      <div v-if="showEffects && hasEffects" class="buff-effects">
        <h4 class="effects-title">Effects</h4>
        <ul class="effects-list">
          <li v-for="(value, key) in buff.effects" :key="key" class="effect-item">
            <span class="effect-name">{{ formatKey(key) }}:</span>
            <span class="effect-value">{{ formatBuffEffect(key, value) }}</span>
          </li>
        </ul>
      </div>
      
      <div v-if="showExpiryInfo" class="buff-expiry">
        <template v-if="buff.expiresAt">
          <div class="expiry-info" :class="{ 'expiry-soon': isExpiringSoon }">
            <i class="fas fa-clock"></i> 
            {{ isActive ? 'Expires' : 'Expired' }}: {{ formatDate(buff.expiresAt) }}
            <span v-if="isExpiringSoon" class="expiry-countdown">
              ({{ expiryCountdown }})
            </span>
          </div>
        </template>
        <div v-else class="expiry-info permanent">
          <i class="fas fa-infinity"></i> Permanent
        </div>
      </div>
      
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue';
import * as BuffService from '@/services/BuffService';
import SunihamishBuffBadge from './SunihamishBuffBadge.vue';

const props = defineProps({
  buff: {
    type: Object,
    required: true
  },
  size: {
    type: String,
    default: 'medium',
    validator: (val) => ['small', 'medium', 'large'].includes(val)
  },
  compact: {
    type: Boolean,
    default: false
  },
  showDescription: {
    type: Boolean,
    default: true
  },
  showEffects: {
    type: Boolean,
    default: true
  },
  showSubtitle: {
    type: Boolean,
    default: true
  },
  showExpiryInfo: {
    type: Boolean,
    default: true
  },
  interactive: {
    type: Boolean,
    default: false
  },
  showPower: {
    type: Boolean,
    default: false
  }
});

const theme = inject('currentTheme', 'roman-theme');

// Computed properties
const tierData = computed(() => {
  return BuffService.getBuffTierDisplayData(props.buff.tier);
});

const metadata = computed(() => {
  return BuffService.getBuffMetadata(props.buff.type);
});

const headerStyle = computed(() => {
  const color = props.buff.metadata?.color || metadata.value.color || '#ccc';
  return {
    backgroundColor: color
  };
});

const isActive = computed(() => {
  return props.buff.status === BuffService.BUFF_STATUS.ACTIVE;
});

const hasEffects = computed(() => {
  return props.buff.effects && Object.keys(props.buff.effects).length > 0;
});

const isExpiringSoon = computed(() => {
  if (!props.buff.expiresAt) return false;
  
  const expiryDate = new Date(props.buff.expiresAt);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
  
  return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
});

const expiryCountdown = computed(() => {
  if (!props.buff.expiresAt) return '';
  
  const expiryDate = new Date(props.buff.expiresAt);
  const now = new Date();
  const diff = expiryDate - now;
  
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 1) return `${days} days left`;
  if (days === 1) return `1 day ${hours}h left`;
  return `${hours}h left`;
});

const powerLevel = computed(() => {
  if (!props.showPower) return null;
  return BuffService.calculateBuffPowerLevel(props.buff);
});

// Methods
function formatStatus(status) {
  return {
    [BuffService.BUFF_STATUS.ACTIVE]: 'Active',
    [BuffService.BUFF_STATUS.EXPIRED]: 'Expired',
    [BuffService.BUFF_STATUS.CONSUMED]: 'Consumed',
    [BuffService.BUFF_STATUS.SUSPENDED]: 'Suspended'
  }[status] || status;
}

function formatKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}

function formatBuffEffect(key, value) {
  return BuffService.formatBuffEffect(key, value);
}

function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
</script>

<style scoped>
.buff-display {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  background-color: #fff;
  transition: transform 0.2s, box-shadow 0.2s;
}

.interactive {
  cursor: pointer;
}

.interactive:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.buff-header {
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
}

.small .buff-header {
  padding: 8px;
  gap: 8px;
}

.large .buff-header {
  padding: 16px;
  gap: 16px;
}

.buff-icon-container {
  flex-shrink: 0;
}

.buff-title-container {
  flex-grow: 1;
  min-width: 0;
}

.buff-title {
  margin: 0;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.small .buff-title {
  font-size: 0.9rem;
}

.large .buff-title {
  font-size: 1.2rem;
}

.buff-subtitle {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.buff-status, .buff-tier, .buff-power {
  font-size: 0.75rem;
  background-color: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 10px;
}

.buff-power {
  display: flex;
  align-items: center;
  gap: 3px;
}

.buff-content {
  padding: 12px;
}

.small .buff-content {
  padding: 8px;
}

.large .buff-content {
  padding: 16px;
}

.buff-description {
  margin: 0 0 10px 0;
  color: #555;
  font-size: 0.9rem;
  line-height: 1.4;
}

.effects-title {
  font-size: 0.9rem;
  margin: 0 0 8px 0;
  color: #333;
}

.effects-list {
  margin: 0;
  padding-left: 18px;
}

.effect-item {
  margin-bottom: 4px;
  font-size: 0.85rem;
}

.effect-name {
  color: #555;
}

.effect-value {
  font-weight: 500;
  color: #333;
}

.buff-expiry {
  margin-top: 10px;
  font-size: 0.85rem;
  color: #666;
}

.expiry-info {
  display: flex;
  align-items: center;
  gap: 5px;
}

.expiry-soon {
  color: #e74c3c;
}

.permanent {
  color: #8e44ad;
}

.expiry-countdown {
  font-weight: 600;
}

/* Status colors */
.buff-status.active {
  background-color: rgba(76, 175, 80, 0.3);
}

.buff-status.expired {
  background-color: rgba(158, 158, 158, 0.3);
}

.buff-status.consumed {
  background-color: rgba(156, 39, 176, 0.3);
}

.buff-status.suspended {
  background-color: rgba(255, 152, 0, 0.3);
}

/* Roman theme */
.roman-theme {
  border: 1px solid rgba(210, 180, 140, 0.3);
}

.roman-theme .buff-display {
  background-color: #fbf7f0;
}

.roman-theme .buff-description {
  color: #5d4037;
}

.roman-theme .permanent {
  color: #8b4513;
}

.roman-theme .expiry-soon {
  color: #c0392b;
}

.roman-theme .effect-name {
  color: #5d4037;
}

.roman-theme .effect-value {
  color: #3e2723;
}
</style>
