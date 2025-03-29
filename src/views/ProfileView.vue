<template>
  <div class="buffs-view" :class="theme">
    <div class="view-header">
      <h1>Buffs Management</h1>
      <p class="subtitle">Manage your active buffs and power-ups</p>
    </div>

    <div class="buffs-dashboard">
      <div class="active-buffs-summary">
        <div class="summary-card">
          <h3>Active Buffs</h3>
          <div class="buff-stats">
            <div class="stat-item">
              <div class="stat-value">{{ activeBuffs.length }}</div>
              <div class="stat-label">Active</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ totalBuffs }}</div>
              <div class="stat-label">Total</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="buffs-controls">
        <div class="filter-options">
          <select v-model="filterOption" class="filter-select">
            <option value="all">All Buffs</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="expiring">Expiring Soon</option>
          </select>
          <select v-model="sortOption" class="sort-select">
            <option value="recent">Most Recent</option>
            <option value="expiring">Expiring Soon</option>
            <option value="power">Highest Power</option>
          </select>
        </div>
        
        <button class="refresh-btn" @click="refreshBuffs">
          <i class="fas fa-sync-alt"></i> Refresh
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i> Loading buffs...
    </div>
    
    <div v-else-if="buffs.length === 0" class="no-buffs">
      <i class="fas fa-magic"></i>
      <p>You don't have any buffs yet</p>
      <router-link to="/rewards" class="rewards-btn">Explore Rewards Shop</router-link>
    </div>
    
    <div v-else class="buffs-list">
      <div 
        v-for="buff in filteredBuffs" 
        :key="buff.id" 
        class="buff-card"
        :class="{ 'buff-active': buff.active, 'buff-expiring': isExpiring(buff) }"
      >
        <div class="buff-icon">
          <i :class="buff.icon"></i>
        </div>
        
        <div class="buff-content">
          <div class="buff-header">
            <h3>{{ buff.name }}</h3>
            <div class="buff-status" :class="buff.active ? 'status-active' : 'status-inactive'">
              {{ buff.active ? 'Active' : 'Inactive' }}
            </div>
          </div>
          
          <p class="buff-description">{{ buff.description }}</p>
          
          <div class="buff-meta">
            <div class="buff-power">
              <i class="fas fa-bolt"></i> Power Level: {{ buff.powerLevel }}
            </div>
            <div v-if="buff.expiryDate" class="buff-expiry">
              <i class="fas fa-clock"></i> 
              {{ buff.active ? 'Expires' : 'Expired' }}: {{ formatDate(buff.expiryDate) }}
            </div>
            <div v-else class="buff-permanent">
              <i class="fas fa-infinity"></i> Permanent
            </div>
          </div>
          
          <div class="buff-effects">
            <div class="effect-title">Effects:</div>
            <ul class="effects-list">
              <li v-for="(effect, index) in buff.effects" :key="index">
                <span class="effect-value">{{ formatEffect(effect) }}</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div class="buff-actions">
          <button
            v-if="!buff.active && !isPastExpiry(buff)"
            class="activate-btn"
            @click="activateBuff(buff)"
          >
            <i class="fas fa-power-off"></i> Activate
          </button>
          
          <button
            v-else-if="buff.active"
            class="deactivate-btn"
            @click="deactivateBuff(buff)"
          >
            <i class="fas fa-power-off"></i> Deactivate
          </button>
          
          <button class="details-btn" @click="viewBuffDetails(buff)">
            <i class="fas fa-info-circle"></i> Details
          </button>
        </div>
      </div>
    </div>
    
    <!-- Buff Details Modal -->
    <div class="modal-overlay" v-if="showBuffDetails" @click.self="showBuffDetails = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ selectedBuff?.name }}</h3>
          <button class="close-modal-btn" @click="showBuffDetails = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="buff-detail-content">
          <div class="buff-detail-icon">
            <i :class="selectedBuff?.icon"></i>
          </div>
          
          <div class="buff-detail-info">
            <div class="detail-row">
              <div class="detail-label">Status:</div>
              <div class="detail-value" :class="selectedBuff?.active ? 'status-active' : 'status-inactive'">
                {{ selectedBuff?.active ? 'Active' : 'Inactive' }}
              </div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Power Level:</div>
              <div class="detail-value">{{ selectedBuff?.powerLevel }}</div>
            </div>
            
            <div class="detail-row" v-if="selectedBuff?.expiryDate">
              <div class="detail-label">Expiry Date:</div>
              <div class="detail-value">
                {{ formatDate(selectedBuff?.expiryDate) }}
                <span v-if="isExpiring(selectedBuff)" class="expiry-soon"> (Expiring Soon)</span>
              </div>
            </div>
            
            <div class="detail-row" v-else>
              <div class="detail-label">Duration:</div>
              <div class="detail-value">Permanent</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Acquired:</div>
              <div class="detail-value">{{ formatDate(selectedBuff?.acquiredDate) }}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Source:</div>
              <div class="detail-value">{{ selectedBuff?.source }}</div>
            </div>
          </div>
        </div>
        
        <div class="buff-detail-description">
          <h4>Description</h4>
          <p>{{ selectedBuff?.description }}</p>
        </div>
        
        <div class="buff-detail-effects">
          <h4>Effects</h4>
          <ul>
            <li v-for="(effect, index) in selectedBuff?.effects" :key="index">
              {{ formatEffect(effect) }}
            </li>
          </ul>
        </div>
        
        <div class="modal-actions">
          <button
            v-if="!selectedBuff?.active && !isPastExpiry(selectedBuff)"
            class="activate-btn"
            @click="activateSelectedBuff"
          >
            <i class="fas fa-power-off"></i> Activate Buff
          </button>
          
          <button
            v-else-if="selectedBuff?.active"
            class="deactivate-btn"
            @click="deactivateSelectedBuff"
          >
            <i class="fas fa-power-off"></i> Deactivate Buff
          </button>
          
          <button class="close-btn" @click="showBuffDetails = false">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const theme = inject('currentTheme', 'roman-theme');

// State
const buffs = ref([]);
const isLoading = ref(true);
const filterOption = ref('all');
const sortOption = ref('recent');
const showBuffDetails = ref(false);
const selectedBuff = ref(null);

// Computed properties
const activeBuffs = computed(() => {
  return buffs.value.filter(buff => buff.active);
});

const totalBuffs = computed(() => {
  return buffs.value.length;
});

const filteredBuffs = computed(() => {
  let result = [...buffs.value];
  
  // Apply filter
  if (filterOption.value === 'active') {
    result = result.filter(buff => buff.active);
  } else if (filterOption.value === 'inactive') {
    result = result.filter(buff => !buff.active);
  } else if (filterOption.value === 'expiring') {
    result = result.filter(buff => isExpiring(buff));
  }
  
  // Apply sort
  if (sortOption.value === 'recent') {
    result.sort((a, b) => new Date(b.acquiredDate) - new Date(a.acquiredDate));
  } else if (sortOption.value === 'expiring') {
    result.sort((a, b) => {
      // Put permanent buffs at the end
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return new Date(a.expiryDate) - new Date(b.expiryDate);
    });
  } else if (sortOption.value === 'power') {
    result.sort((a, b) => b.powerLevel - a.powerLevel);
  }
  
  return result;
});

// Lifecycle hooks
onMounted(async () => {
  await fetchUserBuffs();
});

// Methods
async function fetchUserBuffs() {
  isLoading.value = true;
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock data
    buffs.value = [
      {
        id: 'b1',
        name: 'Investment Fee Reduction',
        description: '5% reduction on investment fees for all content',
        icon: 'fas fa-percentage',
        active: true,
        powerLevel: 3,
        expiryDate: addDays(new Date(), 5), // 5 days from now
        acquiredDate: subDays(new Date(), 9), // 9 days ago
        source: 'Rewards Shop',
        effects: [
          { type: 'feeReduction', value: 5 }
        ]
      },
      {
        id: 'b2',
        name: 'Enhanced Analytics',
        description: 'Access to advanced investment performance analytics',
        icon: 'fas fa-chart-bar',
        active: false,
        powerLevel: 4,
        expiryDate: addDays(new Date(), 30), // 30 days from now
        acquiredDate: subDays(new Date(), 2), // 2 days ago
        source: 'Achievement Reward',
        effects: [
          { type: 'unlockFeature', value: 'advancedAnalytics' }
        ]
      },
      {
        id: 'b3',
        name: 'Verified Badge',
        description: 'Display a verified badge on your profile',
        icon: 'fas fa-check-circle',
        active: true,
        powerLevel: 2,
        expiryDate: null, // Permanent
        acquiredDate: subDays(new Date(), 20), // 20 days ago
        source: 'Rewards Shop',
        effects: [
          { type: 'profileBadge', value: 'verified' }
        ]
      },
      {
        id: 'b4',
        name: 'Investment Boost',
        description: 'Increases potential returns on investments by 10%',
        icon: 'fas fa-rocket',
        active: false,
        powerLevel: 5,
        expiryDate: subDays(new Date(), 3), // Expired 3 days ago
        acquiredDate: subDays(new Date(), 33), // 33 days ago
        source: 'Special Event',
        effects: [
          { type: 'returnBoost', value: 10 }
        ]
      },
      {
        id: 'b5',
        name: 'K80 Protocol Access',
        description: 'Priority access to K80 protocol streams',
        icon: 'fas fa-shield-alt',
        active: true,
        powerLevel: 4,
        expiryDate: addDays(new Date(), 15), // 15 days from now
        acquiredDate: subDays(new Date(), 5), // 5 days ago
        source: 'Level Up Reward',
        effects: [
          { type: 'priorityAccess', value: 'k80Protocol' },
          { type: 'loadingSpeed', value: 25 }
        ]
      },
      {
        id: 'b6',
        name: 'Custom Emotes',
        description: 'Use custom emotes in stream comments',
        icon: 'fas fa-smile',
        active: false,
        powerLevel: 2,
        expiryDate: null, // Permanent
        acquiredDate: subDays(new Date(), 15), // 15 days ago
        source: 'Rewards Shop',
        effects: [
          { type: 'unlockFeature', value: 'customEmotes' }
        ]
      }
    ];
  } catch (error) {
    console.error('Error fetching user buffs:', error);
  } finally {
    isLoading.value = false;
  }
}

function refreshBuffs() {
  fetchUserBuffs();
}

function activateBuff(buff) {
  if (isPastExpiry(buff)) return;
  
  // In a real app, this would send an API request
  const index = buffs.value.findIndex(b => b.id === buff.id);
  if (index !== -1) {
    buffs.value[index] = { ...buffs.value[index], active: true };
  }
}

function deactivateBuff(buff) {
  // In a real app, this would send an API request
  const index = buffs.value.findIndex(b => b.id === buff.id);
  if (index !== -1) {
    buffs.value[index] = { ...buffs.value[index], active: false };
  }
}

function viewBuffDetails(buff) {
  selectedBuff.value = buff;
  showBuffDetails.value = true;
}

function activateSelectedBuff() {
  if (selectedBuff.value) {
    activateBuff(selectedBuff.value);
    selectedBuff.value = { ...selectedBuff.value, active: true };
  }
}

function deactivateSelectedBuff() {
  if (selectedBuff.value) {
    deactivateBuff(selectedBuff.value);
    selectedBuff.value = { ...selectedBuff.value, active: false };
  }
}

function isExpiring(buff) {
  if (!buff || !buff.expiryDate) return false;
  
  const expiryDate = new Date(buff.expiryDate);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
  
  return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
}

function isPastExpiry(buff) {
  if (!buff || !buff.expiryDate) return false;
  
  const expiryDate = new Date(buff.expiryDate);
  const now = new Date();
  
  return expiryDate < now;
}

function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
}

function formatEffect(effect) {
  if (!effect) return '';
  
  switch (effect.type) {
    case 'feeReduction':
      return `${effect.value}% reduction in investment fees`;
    case 'returnBoost':
      return `${effect.value}% increase in potential returns`;
    case 'unlockFeature':
      return `Unlocks ${formatFeatureName(effect.value)}`;
    case 'profileBadge':
      return `Adds ${effect.value} badge to your profile`;
    case 'priorityAccess':
      return `Priority access to ${formatFeatureName(effect.value)}`;
    case 'loadingSpeed':
      return `${effect.value}% faster content loading`;
    default:
      return `${effect.type}: ${effect.value}`;
  }
}

function formatFeatureName(feature) {
  // Convert camelCase to spaces and capitalize
  return feature
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}

// Helper functions for date manipulation
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function subDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}
</script>

<style scoped>
.buffs-view {
  padding: 20px;
}

.view-header {
  margin-bottom: 20px;
}

.view-header h1 {
  margin: 0;
  font-size: 2rem;
}

.subtitle {
  color: #777;
  font-size: 1rem;
}

.buffs-dashboard {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 20px;
}

.active-buffs-summary {
  flex: 1;
  min-width: 250px;
}

.summary-card {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.summary-card h3 {
  margin: 0 0 15px 0;
  font-size: 1.2rem;
}

.buff-stats {
  display: flex;
  gap: 40px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #3498db;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
  margin-top: 5px;
}

.buffs-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.filter-options {
  display: flex;
  gap: 10px;
}

.filter-select,
.sort-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  font-size: 0.9rem;
  cursor: pointer;
}

.refresh-btn {
  padding: 8px 16px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background-color 0.2s;
}

.refresh-btn:hover {
  background-color: #2980b9;
}

.loading-indicator {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 1rem;
}

.no-buffs {
  text-align: center;
  padding: 50px 20px;
}

.no-buffs i {
  font-size: 3rem;
  color: #bbb;
  margin-bottom: 15px;
}

.no-buffs p {
  font-size: 1.1rem;
  color: #888;
  margin-bottom: 20px;
}

.rewards-btn {
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 500;
  transition: background-color 0.2s;
  display: inline-block;
}

.rewards-btn:hover {
  background-color: #2980b9;
  color: white;
}

.buffs-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.buff-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  position: relative;
  border-left: 4px solid #ddd;
}

.buff-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.buff-active {
  border-left-color: #3498db;
}

.buff-expiring {
  border-left-color: #f39c12;
}

.buff-icon {
  width: 60px;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #3498db;
}

.buff-content {
  flex-grow: 1;
  padding: 15px;
  min-width: 0;
}

.buff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.buff-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.buff-status {
  font-size: 0.8rem;
  padding: 3px 8px;
  border-radius: 12px;
  font-weight: 600;
}

.status-active {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-inactive {
  background-color: #f5f5f5;
  color: #757575;
}

.buff-description {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 10px;
  line-height: 1.4;
}

.buff-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 10px;
  font-size: 0.85rem;
  color: #666;
}

.buff-power,
.buff-expiry,
.buff-permanent {
  display: flex;
  align-items: center;
  gap: 5px;
}

.buff-permanent {
  color: #8e44ad;
}

.buff-effects {
  margin-top: 10px;
  font-size: 0.9rem;
}

.effect-title {
  font-weight: 600;
  margin-bottom: 5px;
}

.effects-list {
  padding-left: 20px;
  margin: 0;
}

.effect-value {
  color: #555;
}

.buff-actions {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  background-color: #f9f9f9;
}

.activate-btn,
.deactivate-btn,
.details-btn {
  padding: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 0.85rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.activate-btn {
  background-color: #27ae60;
  color: white;
}

.activate-btn:hover {
  background-color: #2ecc71;
}

.deactivate-btn {
  background-color: #e74c3c;
  color: white;
}

.deactivate-btn:hover {
  background-color: #c0392b;
}

.details-btn {
  background-color: #f5f5f5;
  color: #333;
}

.details-btn:hover {
  background-color: #e0e0e0;
}

/* Modal styles */
.modal-overlay {
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
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 500px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
}

.close-modal-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.7;
}

.close-modal-btn:hover {
  opacity: 1;
}

.buff-detail-content {
  display: flex;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.buff-detail-icon {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  color: #3498db;
  margin-right: 20px;
  flex-shrink: 0;
}

.buff-detail-info {
  flex-grow: 1;
}

.detail-row {
  display: flex;
  margin-bottom: 10px;
  font-size: 0.95rem;
}

.detail-label {
  width: 110px;
  color: #666;
}

.detail-value {
  font-weight: 500;
}

.expiry-soon {
  color: #e74c3c;
  font-size: 0.85rem;
  font-weight: normal;
  margin-left: 5px;
}

.buff-detail-description,
.buff-detail-effects {
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.buff-detail-description h4,
.buff-detail-effects h4 {
  margin: 0 0 10px 0;
  font-size: 1.1rem;
}

.buff-detail-description p {
  margin: 0;
  line-height: 1.5;
  color: #555;
}

.buff-detail-effects ul {
  margin: 0;
  padding-left: 20px;
}

.buff-detail-effects li {
  margin-bottom: 8px;
  color: #555;
}

.modal-actions {
  padding: 20px;
  display: flex;
  justify-content: space-between;
}

.close-btn {
  padding: 10px 20px;
  background-color: #f5f5f5;
  color: #333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: #e0e0e0;
}

/* Roman theme overrides */
.roman-theme .summary-card {
  background-color: #f8f5f0;
  border: 1px solid #d5c3aa;
}

.roman-theme .stat-value {
  color: #8B4513;
}

.roman-theme .refresh-btn {
  background-color: #8B4513;
}

.roman-theme .refresh-btn:hover {
  background-color: #A0522D;
}

.roman-theme .rewards-btn {
  background-color: #8B4513;
}

.roman-theme .rewards-btn:hover {
  background-color: #A0522D;
}

.roman-theme .buff-icon {
  color: #8B4513;
}

.roman-theme .buff-active {
  border-left-color: #8B4513;
}

.roman-theme .buff-expiring {
  border-left-color: #CD853F;
}

.roman-theme .status-active {
  background-color: #f0f5e6;
  color: #6B8E23;
}

.roman-theme .buff-permanent {
  color: #8B4513;
}

.roman-theme .activate-btn {
  background-color: #6B8E23;
}

.roman-theme .activate-btn:hover {
  background-color: #556B2F;
}

.roman-theme .buff-detail-icon {
  color: #8B4513;
}

@media (max-width: 768px) {
  .buffs-dashboard {
    flex-direction: column;
  }
  
  .buffs-controls {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }
  
  .filter-options {
    width: 100%;
    justify-content: space-between;
  }
  
  .filter-select,
  .sort-select {
    flex-grow: 1;
  }
  
  .refresh-btn {
    width: 100%;
    justify-content: center;
  }
  
  .buffs-list {
    grid-template-columns: 1fr;
  }
  
  .buff-card {
    flex-direction: column;
    border-left: none;
    border-top: 4px solid #ddd;
  }
  
  .buff-active {
    border-top-color: #3498db;
  }
  
  .buff-expiring {
    border-top-color: #f39c12;
  }
  
  .buff-icon {
    width: 100%;
    height: 60px;
  }
  
  .modal-actions {
    flex-direction: column;
    gap: 10px;
  }
  
  .modal-actions button {
    width: 100%;
  }
}
</style>