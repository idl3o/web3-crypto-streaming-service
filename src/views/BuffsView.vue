<template>
  <div class="buffs-view">
    <div class="container py-4">
      <div class="row">
        <div class="col-12">
          <div class="d-flex align-items-center justify-content-between mb-4">
            <h1 class="h3 mb-0">User Buffs</h1>
            <div class="view-controls">
              <div class="btn-group">
                <button 
                  class="btn" 
                  :class="viewMode === 'grid' ? 'btn-primary' : 'btn-outline-secondary'"
                  @click="viewMode = 'grid'"
                >
                  <i class="fas fa-th"></i>
                </button>
                <button 
                  class="btn" 
                  :class="viewMode === 'list' ? 'btn-primary' : 'btn-outline-secondary'"
                  @click="viewMode = 'list'"
                >
                  <i class="fas fa-list"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="card shadow-sm border-0">
            <div class="card-header bg-white">
              <div class="row align-items-center">
                <div class="col-md-6">
                  <ul class="nav nav-tabs card-header-tabs">
                    <li class="nav-item">
                      <button 
                        class="nav-link" 
                        :class="{ active: activeTab === 'all' }"
                        @click="activeTab = 'all'"
                      >
                        All
                      </button>
                    </li>
                    <li class="nav-item">
                      <button 
                        class="nav-link" 
                        :class="{ active: activeTab === 'active' }"
                        @click="activeTab = 'active'"
                      >
                        Active
                      </button>
                    </li>
                    <li class="nav-item">
                      <button 
                        class="nav-link" 
                        :class="{ active: activeTab === 'inactive' }"
                        @click="activeTab = 'inactive'"
                      >
                        Inactive
                      </button>
                    </li>
                  </ul>
                </div>
                <div class="col-md-6">
                  <div class="input-group search-box">
                    <input 
                      type="text" 
                      class="form-control" 
                      placeholder="Search buffs..." 
                      v-model="searchQuery"
                    >
                    <span class="input-group-text">
                      <i class="fas fa-search"></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="card-body p-4">
              <div v-if="loading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading buffs...</p>
              </div>

              <div v-else-if="!hasBuffs" class="text-center py-5">
                <div class="no-buffs-icon">
                  <i class="fas fa-solar-panel fa-3x text-muted"></i>
                </div>
                <h4 class="mt-3">No Buffs Found</h4>
                <p class="text-muted">You don't have any buffs at the moment.</p>
                <button class="btn btn-primary" @click="showBuffAcquisitionInfo">
                  How to Get Buffs
                </button>
              </div>

              <div v-else>
                <!-- Grid View -->
                <div v-if="viewMode === 'grid'" class="buff-grid">
                  <div v-if="filteredBuffs.length === 0" class="text-center py-4">
                    <p>No buffs match your filters.</p>
                  </div>
                  <div v-else class="row g-4">
                    <div 
                      v-for="buff in filteredBuffs" 
                      :key="buff.id" 
                      class="col-6 col-sm-4 col-md-3"
                    >
                      <div class="buff-card" @click="viewBuffDetails(buff)">
                        <div class="buff-card-header" :style="{ backgroundColor: getBuffColor(buff) }">
                          <SunihamishBuffBadge 
                            :buff="buff" 
                            size="large" 
                            :showLabel="false"
                            :interactive="false"
                          />
                        </div>
                        <div class="buff-card-body">
                          <h5 class="buff-name">{{ buff.name }}</h5>
                          <div class="buff-status" :class="buff.status">
                            {{ formatBuffStatus(buff.status) }}
                          </div>
                          <div class="buff-tier">
                            {{ getTierName(buff.tier) }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- List View -->
                <div v-else class="buff-list">
                  <div v-if="filteredBuffs.length === 0" class="text-center py-4">
                    <p>No buffs match your filters.</p>
                  </div>
                  <div v-else>
                    <div class="list-group">
                      <div 
                        v-for="buff in filteredBuffs" 
                        :key="buff.id"
                        class="list-group-item list-group-item-action buff-list-item"
                        @click="viewBuffDetails(buff)"
                      >
                        <div class="d-flex align-items-center">
                          <div class="flex-shrink-0">
                            <SunihamishBuffBadge 
                              :buff="buff" 
                              size="medium" 
                              :showLabel="false" 
                              :interactive="false"
                            />
                          </div>
                          <div class="flex-grow-1 ms-3">
                            <div class="d-flex w-100 justify-content-between">
                              <h5 class="mb-1">{{ buff.name }}</h5>
                              <span class="buff-status" :class="buff.status">
                                {{ formatBuffStatus(buff.status) }}
                              </span>
                            </div>
                            <p class="mb-1 buff-description text-truncate">
                              {{ buff.description }}
                            </p>
                            <div class="buff-meta">
                              <span class="buff-tier">{{ getTierName(buff.tier) }}</span>
                              <span class="buff-granted">
                                Granted: {{ formatDate(buff.grantedAt) }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Buff Acquisition Info Modal -->
    <div v-if="showAcquisitionModal" class="modal-backdrop" @click="showAcquisitionModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>How to Get Buffs</h3>
          <button class="close-btn" @click="showAcquisitionModal = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="acquisition-methods">
            <div class="acquisition-method">
              <i class="fas fa-certificate method-icon"></i>
              <h4>Community Certificates</h4>
              <p>Earn certificates for your contributions to the community and platform. Some certificates grant special buffs.</p>
            </div>
            
            <div class="acquisition-method">
              <i class="fas fa-trophy method-icon"></i>
              <h4>Complete Achievements</h4>
              <p>Unlock platform achievements to earn buffs based on your activities and milestones.</p>
            </div>
            
            <div class="acquisition-method">
              <i class="fas fa-users method-icon"></i>
              <h4>Community Recognition</h4>
              <p>Be recognized by community leaders to receive special buffs as a reward.</p>
            </div>
            
            <div class="acquisition-method">
              <i class="fas fa-code method-icon"></i>
              <h4>Platform Contribution</h4>
              <p>Contributing to the platform codebase or reporting bugs can earn you developer buffs.</p>
            </div>
          </div>
          
          <div class="legendary-buffs-section">
            <h4><i class="fas fa-sun"></i> Sunihamish Legendary Buff</h4>
            <p>The coveted Sunihamish buff is granted only by the platform's core team to individuals who have made extraordinary contributions.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWalletStore } from '@/stores/wallet';
import * as BuffService from '@/services/BuffService';
import SunihamishBuffBadge from '@/components/buffs/SunihamishBuffBadge.vue';

// Router and store
const route = useRoute();
const router = useRouter();
const walletStore = useWalletStore();

// Component state
const viewMode = ref(localStorage.getItem('buffs_view_mode') || 'grid');
const activeTab = ref(route.query.tab || 'all');
const searchQuery = ref(route.query.search || '');
const loading = ref(true);
const buffs = ref([]);
const showAcquisitionModal = ref(false);

// Watch for view mode changes to save preference
watch(viewMode, (newValue) => {
  localStorage.setItem('buffs_view_mode', newValue);
});

// Watch for active tab changes to update URL
watch(activeTab, (newValue) => {
  updateRouteQuery();
});

// Watch for search query changes to update URL
watch(searchQuery, (newValue) => {
  updateRouteQuery();
});

// Computed properties
const hasBuffs = computed(() => buffs.value.length > 0);

const filteredBuffs = computed(() => {
  let filtered = [...buffs.value];
  
  // Apply tab filter
  if (activeTab.value === 'active') {
    filtered = filtered.filter(buff => buff.status === BuffService.BUFF_STATUS.ACTIVE);
  } else if (activeTab.value === 'inactive') {
    filtered = filtered.filter(buff => buff.status !== BuffService.BUFF_STATUS.ACTIVE);
  }
  
  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(buff => 
      buff.name.toLowerCase().includes(query) || 
      buff.description.toLowerCase().includes(query) ||
      buff.type.toLowerCase().includes(query)
    );
  }
  
  return filtered;
});

// Methods
async function loadUserBuffs() {
  loading.value = true;
  
  try {
    if (!walletStore.isConnected || !walletStore.account) {
      await walletStore.connectWallet();
    }
    
    if (walletStore.account) {
      const userBuffs = await BuffService.getUserBuffs(walletStore.account, { skipCache: true });
      buffs.value = userBuffs;
    }
  } catch (error) {
    console.error('Error loading buffs:', error);
  } finally {
    loading.value = false;
  }
}

function viewBuffDetails(buff) {
  router.push(`/buffs/${buff.id}`);
}

function formatBuffStatus(status) {
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

function getTierName(tier) {
  const tierData = BuffService.getBuffTierDisplayData(tier);
  return tierData.name;
}

function getBuffColor(buff) {
  const metadata = BuffService.getBuffMetadata(buff.type);
  return buff.metadata?.color || metadata.color;
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  
  // Format: Oct 21, 2023
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function updateRouteQuery() {
  const query = { ...route.query };
  
  if (activeTab.value !== 'all') {
    query.tab = activeTab.value;
  } else {
    delete query.tab;
  }
  
  if (searchQuery.value) {
    query.search = searchQuery.value;
  } else {
    delete query.search;
  }
  
  router.replace({ query });
}

function showBuffAcquisitionInfo() {
  showAcquisitionModal.value = true;
}

// Lifecycle hooks
onMounted(async () => {
  // Get active tab from URL query
  if (route.query.tab) {
    activeTab.value = route.query.tab;
  }
  
  // Get search query from URL
  if (route.query.search) {
    searchQuery.value = route.query.search;
  }
  
  // Load user buffs
  await loadUserBuffs();
});
</script>

<style scoped>
.buffs-view {
  min-height: calc(100vh - 150px);
}

.search-box {
  float: right;
  max-width: 300px;
}

/* Grid View */
.buff-grid {
  margin-top: 1rem;
}

.buff-card {
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
  background-color: white;
}

.buff-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.buff-card-header {
  padding: 24px 0;
  text-align: center;
}

.buff-card-body {
  padding: 16px;
  text-align: center;
}

.buff-name {
  margin-bottom: 8px;
  font-size: 1.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.buff-status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 6px;
}

.buff-status.active {
  background-color: rgba(76, 175, 80, 0.15);
  color: #2E7D32;
}

.buff-status.expired {
  background-color: rgba(158, 158, 158, 0.15);
  color: #616161;
}

.buff-status.consumed {
  background-color: rgba(156, 39, 176, 0.15);
  color: #7B1FA2;
}

.buff-status.suspended {
  background-color: rgba(255, 152, 0, 0.15);
  color: #EF6C00;
}

.buff-tier {
  font-size: 0.8rem;
  color: #555;
}

/* List View */
.buff-list-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.buff-description {
  color: #666;
  max-width: 500px;
}

.buff-meta {
  display: flex;
  font-size: 0.8rem;
  color: #555;
  gap: 16px;
}

.buff-granted {
  color: #777;
}

/* No buffs state */
.no-buffs-icon {
  margin-bottom: 20px;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #777;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
}

.acquisition-methods {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.acquisition-method {
  padding: 16px;
  border-radius: 8px;
  background-color: #f8f9fa;
  text-align: center;
}

.method-icon {
  font-size: 32px;
  color: #4CAF50;
  margin-bottom: 12px;
}

.acquisition-method h4 {
  font-size: 1rem;
  margin-bottom: 8px;
}

.acquisition-method p {
  font-size: 0.9rem;
  color: #666;
  margin: 0;
}

.legendary-buffs-section {
  margin-top: 24px;
  padding: 16px;
  border-radius: 8px;
  background-color: rgba(255, 215, 0, 0.1);
  border: 1px dashed #FFD700;
}

.legendary-buffs-section h4 {
  color: #DAA520;
  font-size: 1.1rem;
  margin-bottom: 8px;
}

.legendary-buffs-section i {
  margin-right: 6px;
}

.legendary-buffs-section p {
  margin: 0;
  font-size: 0.95rem;
}
</style>
