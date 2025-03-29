<template>
  <div class="buff-detail-view">
    <div class="container py-4">
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Loading buff details...</p>
      </div>

      <div v-else-if="error" class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i> {{ error }}
        <div class="mt-3">
          <router-link to="/buffs" class="btn btn-outline-secondary btn-sm">
            <i class="fas fa-arrow-left me-1"></i> Back to Buffs
          </router-link>
        </div>
      </div>

      <template v-else-if="buff">
        <!-- Back navigation -->
        <div class="mb-3">
          <router-link to="/buffs" class="btn btn-outline-secondary btn-sm">
            <i class="fas fa-arrow-left me-1"></i> All Buffs
          </router-link>
        </div>

        <!-- Buff header section -->
        <div class="card shadow-sm border-0 mb-4">
          <div class="card-body p-0">
            <div class="buff-header" :style="{ backgroundColor: headerColor }">
              <div class="buff-header-content">
                <div class="buff-badge-container">
                  <SunihamishBuffBadge 
                    :buff="buff" 
                    size="large" 
                    :show-label="false"
                  />
                </div>
                <div class="buff-header-info">
                  <h1 class="buff-title">{{ buff.name }}</h1>
                  <div class="buff-status-row">
                    <span class="buff-status" :class="buff.status">
                      {{ formatBuffStatus(buff.status) }}
                    </span>
                    <span class="buff-tier">
                      {{ tierDisplayData.name }} Tier
                    </span>
                    <span class="buff-type">
                      {{ formatBuffType(buff.type) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="buff-actions p-3 border-bottom">
              <button 
                v-if="canActivate" 
                class="btn btn-success btn-sm me-2" 
                @click="activateBuff"
              >
                <i class="fas fa-magic me-1"></i> Activate Buff
              </button>
              <button 
                v-if="canDeactivate" 
                class="btn btn-danger btn-sm me-2" 
                @click="deactivateBuff"
              >
                <i class="fas fa-power-off me-1"></i> Deactivate
              </button>
              <button 
                v-if="canShare" 
                class="btn btn-outline-primary btn-sm"
                @click="shareBuff"
              >
                <i class="fas fa-share-alt me-1"></i> Share
              </button>
            </div>
          </div>
        </div>

        <!-- Buff details -->
        <div class="row">
          <div class="col-md-8">
            <!-- Description card -->
            <div class="card shadow-sm border-0 mb-4">
              <div class="card-body">
                <h3>About this Buff</h3>
                <p class="buff-description">{{ buff.description }}</p>
                
                <h4 class="mt-4">Effects</h4>
                <div class="effects-list">
                  <div v-if="!hasEffects" class="text-muted">
                    This buff has no special effects.
                  </div>
                  <div v-else class="row">
                    <div 
                      v-for="(value, key) in buff.effects" 
                      :key="key"
                      class="col-md-6 mb-3"
                    >
                      <div class="effect-card">
                        <div class="effect-name">{{ formatKey(key) }}</div>
                        <div class="effect-value">{{ formatEffectValue(key, value) }}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Metadata -->
                <template v-if="hasMetadata">
                  <h4 class="mt-4">Additional Details</h4>
                  <table class="table">
                    <tbody>
                      <tr v-for="(value, key) in buff.metadata" :key="key"
                          v-show="!['color', 'iconUrl', 'glowEffect', 'animationLevel'].includes(key)">
                        <th>{{ formatKey(key) }}</th>
                        <td>{{ formatMetadataValue(key, value) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </template>
              </div>
            </div>
            
            <!-- Usage history -->
            <div class="card shadow-sm border-0 mb-4">
              <div class="card-body">
                <h3>Usage History</h3>
                <div v-if="!hasUsageHistory" class="text-muted">
                  No usage history available for this buff.
                </div>
                <div v-else>
                  <!-- Placeholder for usage history -->
                  <ul class="timeline">
                    <li v-for="(event, index) in usageHistory" :key="index" class="timeline-item">
                      <div class="timeline-badge" :class="event.type">
                        <i :class="event.icon"></i>
                      </div>
                      <div class="timeline-content">
                        <h5 class="timeline-title">{{ event.title }}</h5>
                        <p class="timeline-text">{{ event.description }}</p>
                        <p class="timeline-date">{{ formatDate(event.timestamp) }}</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div class="col-md-4">
            <!-- Validity info card -->
            <div class="card shadow-sm border-0 mb-4">
              <div class="card-body">
                <h3>Validity</h3>
                <ul class="list-group list-group-flush">
                  <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span>Granted</span>
                    <span>{{ formatDate(buff.grantedAt) }}</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span>Expires</span>
                    <span>{{ buff.expiresAt ? formatDate(buff.expiresAt) : 'Never' }}</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span>Status</span>
                    <span class="badge" :class="`bg-${statusClass}`">
                      {{ formatBuffStatus(buff.status) }}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Source info card -->
            <div class="card shadow-sm border-0 mb-4">
              <div class="card-body">
                <h3>Source</h3>
                <div v-if="isCertificateGranted" class="certificate-source">
                  <p>
                    <i class="fas fa-certificate me-2"></i>
                    This buff was granted by a certificate: 
                  </p>
                  <router-link 
                    :to="`/certificate/verify/${buff.grantedBy}`"
                    class="btn btn-outline-primary btn-sm d-block mt-2"
                  >
                    View Certificate
                  </router-link>
                </div>
                <div v-else-if="buff.type === 'sunihamish'" class="sunihamish-source">
                  <p>
                    <i class="fas fa-sun me-2 text-warning"></i>
                    This is a special Sunihamish buff granted directly by the platform.
                  </p>
                </div>
                <div v-else class="general-source">
                  <p>
                    <i class="fas fa-info-circle me-2"></i>
                    Source information unavailable.
                  </p>
                </div>
              </div>
            </div>

            <!-- Similar buffs card -->
            <div class="card shadow-sm border-0">
              <div class="card-body">
                <h3>Similar Buffs</h3>
                <div v-if="!hasSimilarBuffs" class="text-muted">
                  No similar buffs available.
                </div>
                <div v-else class="similar-buffs-list">
                  <div 
                    v-for="similarBuff in similarBuffs" 
                    :key="similarBuff.id"
                    class="similar-buff-item"
                    @click="viewBuffDetails(similarBuff.id)"
                  >
                    <SunihamishBuffBadge 
                      :buff="similarBuff" 
                      size="small" 
                      :show-label="true"
                      :interactive="false"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWalletStore } from '@/stores/wallet';
import * as BuffService from '@/services/BuffService';
import SunihamishBuffBadge from '@/components/buffs/SunihamishBuffBadge.vue';

// Router and store
const route = useRoute();
const router = useRouter();
const walletStore = useWalletStore();

// Component state
const loading = ref(true);
const error = ref(null);
const buff = ref(null);
const usageHistory = ref([]);
const similarBuffs = ref([]);

// Computed properties
const buffId = computed(() => route.params.id);

const metadata = computed(() => {
  if (!buff.value) return {};
  return BuffService.getBuffMetadata(buff.value.type);
});

const tierDisplayData = computed(() => {
  if (!buff.value) return {};
  return BuffService.getBuffTierDisplayData(buff.value.tier);
});

const headerColor = computed(() => {
  if (!buff.value) return '#f0f0f0';
  return buff.value.metadata?.color || metadata.value.color || '#f0f0f0';
});

const hasEffects = computed(() => {
  return buff.value && buff.value.effects && Object.keys(buff.value.effects).length > 0;
});

const hasMetadata = computed(() => {
  return buff.value && 
         buff.value.metadata && 
         Object.keys(buff.value.metadata).filter(
           key => !['color', 'iconUrl', 'glowEffect', 'animationLevel'].includes(key)
         ).length > 0;
});

const hasUsageHistory = computed(() => {
  return usageHistory.value.length > 0;
});

const hasSimilarBuffs = computed(() => {
  return similarBuffs.value.length > 0;
});

const isCertificateGranted = computed(() => {
  return buff.value && buff.value.grantedBy && buff.value.grantedBy.startsWith('0x');
});

const canActivate = computed(() => {
  return buff.value && 
         buff.value.status !== BuffService.BUFF_STATUS.ACTIVE &&
         buff.value.status !== BuffService.BUFF_STATUS.CONSUMED;
});

const canDeactivate = computed(() => {
  return buff.value && buff.value.status === BuffService.BUFF_STATUS.ACTIVE;
});

const canShare = computed(() => {
  return navigator.share !== undefined;
});

const statusClass = computed(() => {
  if (!buff.value) return 'secondary';
  
  switch (buff.value.status) {
    case BuffService.BUFF_STATUS.ACTIVE:
      return 'success';
    case BuffService.BUFF_STATUS.EXPIRED:
      return 'warning';
    case BuffService.BUFF_STATUS.CONSUMED:
      return 'primary';
    case BuffService.BUFF_STATUS.SUSPENDED:
      return 'danger';
    default:
      return 'secondary';
  }
});

// Methods
async function loadBuffDetails() {
  loading.value = true;
  error.value = null;
  
  try {
    if (!walletStore.isConnected) {
      await walletStore.connectWallet();
    }
    
    // Load the specific buff
    const userBuffs = await BuffService.getUserBuffs(walletStore.account);
    const buffData = userBuffs.find(b => b.id === buffId.value);
    
    if (!buffData) {
      error.value = 'Buff not found or you do not have access to this buff';
      return;
    }
    
    buff.value = buffData;
    
    // Load usage history (simulated for the demo)
    usageHistory.value = await loadBuffUsageHistory(buffId.value);
    
    // Load similar buffs (simulated for the demo)
    similarBuffs.value = await loadSimilarBuffs(buffData.type, buffId.value);
  } catch (err) {
    error.value = `Error loading buff details: ${err.message}`;
    console.error('Error loading buff details:', err);
  } finally {
    loading.value = false;
  }
}

async function loadBuffUsageHistory(buffId) {
  // In a real implementation, this would load from the blockchain or backend
  // For the demo, we'll return simulated data
  
  // Randomly decide if we have history
  if (Math.random() > 0.5) {
    return [];
  }
  
  return [
    {
      type: 'activation',
      icon: 'fas fa-power-on',
      title: 'Buff Activated',
      description: 'Buff was activated by user',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    },
    {
      type: 'usage',
      icon: 'fas fa-bolt',
      title: 'Effect Applied',
      description: 'Buff effect was applied to stream #1234',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
    },
    {
      type: 'usage',
      icon: 'fas fa-bolt',
      title: 'Effect Applied',
      description: 'Buff effect was applied to stream #5678',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    }
  ];
}

async function loadSimilarBuffs(buffType, currentBuffId) {
  try {
    // Get all user buffs
    const userBuffs = await BuffService.getUserBuffs(walletStore.account);
    
    // Filter for similar buffs (same type, but not the current buff)
    return userBuffs
      .filter(b => b.type === buffType && b.id !== currentBuffId)
      .slice(0, 4); // Limit to 4 similar buffs
  } catch (error) {
    console.error('Error loading similar buffs:', error);
    return [];
  }
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

function formatBuffType(type) {
  const typeMap = {
    [BuffService.BUFF_TYPES.SUNIHAMISH]: 'Sunihamish',
    [BuffService.BUFF_TYPES.TRANSCENDENT]: 'Transcendent',
    [BuffService.BUFF_TYPES.AMPLIFY]: 'Amplify',
    [BuffService.BUFF_TYPES.INSIGHT]: 'Insight',
    [BuffService.BUFF_TYPES.ESSENCE]: 'Essence',
    [BuffService.BUFF_TYPES.CUSTOM]: 'Custom'
  };
  
  return typeMap[type] || type;
}

function formatKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}

function formatEffectValue(key, value) {
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

function formatMetadataValue(key, value) {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  
  return value;
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function activateBuff() {
  try {
    // In a real implementation, this would be a call to activate the buff
    alert(`Buff ${buff.value.name} has been activated!`);
    
    // Refresh the buff data
    await loadBuffDetails();
  } catch (error) {
    console.error('Error activating buff:', error);
  }
}

async function deactivateBuff() {
  try {
    // In a real implementation, this would be a call to deactivate the buff
    alert(`Buff ${buff.value.name} has been deactivated.`);
    
    // Refresh the buff data
    await loadBuffDetails();
  } catch (error) {
    console.error('Error deactivating buff:', error);
  }
}

function shareBuff() {
  if (!buff.value) return;
  
  const shareData = {
    title: `${buff.value.name} Buff`,
    text: `Check out my ${buff.value.tier} tier ${buff.value.name} buff!`,
    url: window.location.href
  };
  
  navigator.share(shareData)
    .catch(err => console.error('Error sharing:', err));
}

function viewBuffDetails(buffId) {
  router.push(`/buffs/${buffId}`);
}

// Lifecycle hooks
onMounted(async () => {
  if (!buffId.value) {
    error.value = 'No buff ID provided';
    loading.value = false;
    return;
  }
  
  await loadBuffDetails();
});
</script>

<style scoped>
.buff-detail-view {
  min-height: calc(100vh - 150px);
}

.buff-header {
  padding: 32px 24px;
  background-color: #f8f9fa;
  position: relative;
  overflow: hidden;
}

.buff-header-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.buff-badge-container {
  flex-shrink: 0;
  transform: scale(1.5);
}

.buff-header-info {
  color: white;
}

.buff-title {
  margin: 0 0 8px 0;
  font-size: 1.75rem;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.buff-status-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.buff-status {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 600;
  background-color: rgba(255, 255, 255, 0.25);
}

.buff-status.active {
  background-color: rgba(76, 175, 80, 0.25);
}

.buff-status.expired {
  background-color: rgba(158, 158, 158, 0.25);
}

.buff-status.consumed {
  background-color: rgba(156, 39, 176, 0.25);
}

.buff-status.suspended {
  background-color: rgba(255, 152, 0, 0.25);
}

.buff-tier, .buff-type {
  background-color: rgba(255, 255, 255, 0.25);
  padding: 3px 10px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 600;
}

.buff-description {
  font-size: 1.1rem;
  line-height: 1.5;
  color: #333;
}

.effect-card {
  background-color: #f8f9fa;
  border-radius: 6px;
  padding: 12px;
  height: 100%;
}

.effect-name {
  font-weight: 600;
  margin-bottom: 4px;
  color: #444;
}

.effect-value {
  font-size: 1.1rem;
  color: #222;
}

/* Timeline styles */
.timeline {
  position: relative;
  padding: 0;
  list-style: none;
  margin: 0;
}

.timeline:before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ddd;
  left: 16px;
  margin-left: -1px;
}

.timeline-item {
  position: relative;
  padding-left: 40px;
  padding-bottom: 20px;
}

.timeline-badge {
  position: absolute;
  top: 0;
  left: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  text-align: center;
  line-height: 30px;
  background: #ddd;
  color: white;
}

.timeline-badge.activation {
  background-color: #4CAF50;
}

.timeline-badge.usage {
  background-color: #2196F3;
}

.timeline-badge.update {
  background-color: #FF9800;
}

.timeline-content {
  padding: 10px 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.timeline-title {
  margin-top: 0;
  margin-bottom: 5px;
  font-size: 1rem;
}

.timeline-text {
  margin-bottom: 5px;
}

.timeline-date {
  margin: 0;
  font-size: 0.8rem;
  color: #666;
}

/* Similar buffs */
.similar-buffs-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.similar-buff-item {
  cursor: pointer;
}

/* Certificate source */
.certificate-source, .sunihamish-source, .general-source {
  padding: 8px;
  border-radius: 6px;
}

.certificate-source {
  background-color: rgba(33, 150, 243, 0.1);
}

.sunihamish-source {
  background-color: rgba(255, 193, 7, 0.1);
}

.general-source {
  background-color: #f8f9fa;
}
</style>
