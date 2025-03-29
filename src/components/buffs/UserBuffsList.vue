<template>
  <div class="user-buffs-list" :class="theme">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading buffs...</div>
    </div>
    
    <div v-else-if="!buffs.length" class="no-buffs-state">
      <i class="fas fa-lightbulb no-buffs-icon"></i>
      <div class="no-buffs-text">No buffs available</div>
      <div class="no-buffs-hint" v-if="showHints">
        Earn buffs through special achievements, certificates, or community honors!
      </div>
    </div>
    
    <template v-else>
      <!-- Sunihamish Buff (if present) gets special treatment -->
      <div v-if="hasSunihamish" class="sunihamish-section">
        <SunihamishBuffBadge
          :buff="sunihamishBuff"
          size="large"
          :show-label="true"
          animation-level="high"
          @details="handleBuffDetails"
          @activate="handleBuffActivate"
        />
      </div>
      
      <div class="buffs-grid">
        <template v-for="buff in otherBuffs" :key="buff.id">
          <SunihamishBuffBadge
            :buff="buff"
            :size="size"
            :show-label="showLabels"
            @details="handleBuffDetails"
            @activate="handleBuffActivate"
          />
        </template>
      </div>
    </template>
    
    <!-- Buff Details Panel (if expanded view) -->
    <div v-if="expandedView && selectedBuff" class="expanded-buff-details">
      <h3 class="details-title">{{ selectedBuff.name }}</h3>
      <div class="details-content">
        <div class="details-icon" :style="{ backgroundColor: getBuffColor(selectedBuff) }">
          <i class="fas fa-sun"></i>
        </div>
        <div class="details-info">
          <div class="details-description">{{ selectedBuff.description }}</div>
          <div class="details-effects">
            <h4>Effects</h4>
            <ul>
              <li v-for="(value, key) in selectedBuff.effects" :key="key">
                <strong>{{ formatBuffKey(key) }}:</strong> {{ formatBuffValue(key, value) }}
              </li>
            </ul>
          </div>
          <div class="details-status">
            <span class="status-label">Status:</span>
            <span class="status-value" :class="selectedBuff.status">
              {{ formatBuffStatus(selectedBuff.status) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue';
import * as BuffService from '@/services/BuffService';
import SunihamishBuffBadge from './SunihamishBuffBadge.vue';

const props = defineProps({
  userAddress: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: 'medium',
    validator: (val) => ['small', 'medium', 'large'].includes(val)
  },
  showLabels: {
    type: Boolean,
    default: true
  },
  filter: {
    type: Object,
    default: () => ({ activeOnly: true })
  },
  expandedView: {
    type: Boolean,
    default: false
  },
  showHints: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['buff-selected', 'buff-activated']);
const theme = inject('currentTheme', 'roman-theme');

// State
const buffs = ref([]);
const loading = ref(true);
const selectedBuff = ref(null);

// Computed properties
const hasSunihamish = computed(() => {
  return buffs.value.some(buff => 
    buff.type === BuffService.BUFF_TYPES.SUNIHAMISH && 
    buff.status === BuffService.BUFF_STATUS.ACTIVE);
});

const sunihamishBuff = computed(() => {
  if (!hasSunihamish.value) return null;
  return buffs.value.find(buff => 
    buff.type === BuffService.BUFF_TYPES.SUNIHAMISH && 
    buff.status === BuffService.BUFF_STATUS.ACTIVE);
});

const otherBuffs = computed(() => {
  return buffs.value.filter(buff => 
    buff.type !== BuffService.BUFF_TYPES.SUNIHAMISH || 
    buff.status !== BuffService.BUFF_STATUS.ACTIVE);
});

// Methods
async function loadUserBuffs() {
  loading.value = true;
  
  try {
    const userBuffs = await BuffService.getUserBuffs(props.userAddress, props.filter);
    buffs.value = userBuffs;
  } catch (error) {
    console.error('Error loading user buffs:', error);
    buffs.value = [];
  } finally {
    loading.value = false;
  }
}

function handleBuffDetails(buff) {
  selectedBuff.value = buff;
  emit('buff-selected', buff);
}

function handleBuffActivate(buff) {
  emit('buff-activated', buff);
}

function getBuffColor(buff) {
  if (!buff) return '#ccc';
  
  const metadata = BuffService.getBuffMetadata(buff.type);
  return buff.metadata?.color || metadata.color || '#ccc';
}

function formatBuffKey(key) {
  return key.replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}

function formatBuffValue(key, value) {
  if (typeof value === 'boolean') {
    return value ? 'Enabled' : 'Disabled';
  }
  
  if (typeof value === 'number') {
    if (key.toLowerCase().includes('boost') || key.toLowerCase().includes('rate')) {
      return `+${value * 100}%`;
    }
    return value.toString();
  }
  
  return value;
}

function formatBuffStatus(status) {
  const statusMap = {
    [BuffService.BUFF_STATUS.ACTIVE]: 'Active',
    [BuffService.BUFF_STATUS.EXPIRED]: 'Expired',
    [BuffService.BUFF_STATUS.CONSUMED]: 'Consumed',
    [BuffService.BUFF_STATUS.SUSPENDED]: 'Suspended'
  };
  
  return statusMap[status] || status;
}

// Watch for user address changes
watch(() => props.userAddress, (newAddress) => {
  if (newAddress) {
    loadUserBuffs();
  }
});

// Watch for filter changes
watch(() => props.filter, () => {
  if (props.userAddress) {
    loadUserBuffs();
  }
}, { deep: true });

// Lifecycle
onMounted(() => {
  if (props.userAddress) {
    loadUserBuffs();
  }
});
</script>

<style scoped>
.user-buffs-list {
  width: 100%;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #2196F3;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: #666;
}

.no-buffs-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
}

.no-buffs-icon {
  font-size: 24px;
  color: #ccc;
  margin-bottom: 10px;
}

.no-buffs-text {
  font-size: 16px;
  color: #666;
  margin-bottom: 5px;
}

.no-buffs-hint {
  font-size: 13px;
  color: #999;
  max-width: 250px;
}

.sunihamish-section {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  padding: 10px;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0) 70%);
  border-radius: 50%;
}

.buffs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 15px;
  justify-items: center;
}

/* Expanded View Styles */
.expanded-buff-details {
  margin-top: 20px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.details-title {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 18px;
}

.details-content {
  display: flex;
  gap: 15px;
}

.details-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  flex-shrink: 0;
}

.details-info {
  flex: 1;
}

.details-description {
  margin-bottom: 10px;
  font-style: italic;
}

.details-effects h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.details-effects ul {
  margin: 0;
  padding-left: 20px;
}

.details-status {
  margin-top: 15px;
  display: flex;
  align-items: center;
}

.status-label {
  margin-right: 5px;
}

.status-value {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.status-value.active {
  background-color: rgba(76, 175, 80, 0.2);
  color: #2E7D32;
}

.status-value.expired {
  background-color: rgba(244, 67, 54, 0.2);
  color: #C62828;
}

.status-value.consumed {
  background-color: rgba(156, 39, 176, 0.2);
  color: #7B1FA2;
}

.status-value.suspended {
  background-color: rgba(255, 152, 0, 0.2);
  color: #EF6C00;
}

/* Roman theme styling */
.roman-theme .expanded-buff-details {
  background-color: rgba(210, 180, 140, 0.1);
  border: 1px solid var(--border-color, #D2B48C);
}

.roman-theme .loading-spinner {
  border-top-color: var(--primary-color, #8B4513);
}
</style>
