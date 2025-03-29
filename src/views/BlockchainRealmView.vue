<template>
  <div class="blockchain-realm-view">
    <div class="page-header">
      <h1>Blockchain Realm Explorer</h1>
      <p class="subtitle">Explore platforms, islands and geographic distributions in the decentralized ecosystem</p>
    </div>

    <div class="realm-container">
      <BlockchainRealmDisplay 
        @select-island="handleIslandSelect" 
        @select-platform="handlePlatformSelect"
      />
    </div>

    <!-- Selected Island Modal -->
    <div class="modal" v-if="selectedIsland" @click="closeIslandModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedIsland.name }}</h3>
          <button class="close-btn" @click="closeIslandModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="island-banner" :style="{ backgroundColor: selectedIsland.color }">
            <i class="fas fa-island-tropical"></i>
          </div>
          
          <div class="island-details">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Blockchain</div>
                <div class="info-value chain-badge" :style="{ backgroundColor: getChainColor(selectedIsland.chain) }">
                  {{ getChainName(selectedIsland.chain) }}
                </div>
              </div>
              
              <div class="info-item">
                <div class="info-label">Population</div>
                <div class="info-value">{{ formatNumber(selectedIsland.population) }}</div>
              </div>
              
              <div class="info-item">
                <div class="info-label">Value</div>
                <div class="info-value">{{ formatCurrency(selectedIsland.value) }}</div>
              </div>
              
              <div class="info-item">
                <div class="info-label">Created</div>
                <div class="info-value">{{ formatDate(selectedIsland.createdAt) }}</div>
              </div>
            </div>
            
            <div class="info-section">
              <h4>About This Island</h4>
              <p>
                {{ selectedIsland.name }} is a thriving digital realm on the {{ getChainName(selectedIsland.chain) }} 
                blockchain with a community of {{ formatNumber(selectedIsland.population) }} users. This island 
                represents a unique collection of digital assets and experiences within the Web3 crypto streaming ecosystem.
              </p>
              <p>
                Islands serve as hubs for content creators and consumers, enabling seamless transactions and interactions
                in a decentralized environment. Each island contributes to the overall ecosystem value and diversity.
              </p>
            </div>
            
            <div class="action-buttons">
              <button class="primary-btn">
                <i class="fas fa-link"></i> Connect Wallet
              </button>
              <button class="secondary-btn">
                <i class="fas fa-info-circle"></i> Explore Resources
              </button>
              <button class="secondary-btn">
                <i class="fas fa-user-plus"></i> Join Community
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import BlockchainRealmDisplay from '@/components/realm/BlockchainRealmDisplay.vue';
import { useRealmService } from '@/services/RealmService';

// Initialize realm service
const { getChainName, getChainColor } = useRealmService();

// State
const selectedIsland = ref(null);
const selectedPlatform = ref(null);

// Event handlers
function handleIslandSelect(island) {
  selectedIsland.value = island;
}

function handlePlatformSelect(platform) {
  selectedPlatform.value = platform;
}

function closeIslandModal() {
  selectedIsland.value = null;
}

// Helper functions
function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString();
}

function formatCurrency(value) {
  if (value === undefined || value === null) return '0 ETH';
  return `${value.toFixed(4)} ETH`;
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
}
</script>

<style scoped>
.blockchain-realm-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-header h1 {
  margin-bottom: 10px;
  font-size: 2.2rem;
  color: #2c3e50;
}

.subtitle {
  color: #7f8c8d;
  font-size: 1.1rem;
}

.realm-container {
  height: 600px;
  margin-bottom: 30px;
}

/* Modal styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 0;
}

.island-banner {
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 4rem;
}

.island-details {
  padding: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.info-item {
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.info-label {
  font-size: 0.85rem;
  color: #7f8c8d;
  margin-bottom: 5px;
}

.info-value {
  font-weight: 600;
  font-size: 1.1rem;
}

.chain-badge {
  display: inline-block;
  padding: 5px 10px;
  border-radius: 20px;
  color: white;
  font-weight: 500;
  font-size: 0.9rem;
}

.info-section {
  margin-bottom: 25px;
}

.info-section h4 {
  margin: 0 0 15px 0;
  font-size: 1.1rem;
  color: #2c3e50;
}

.info-section p {
  line-height: 1.6;
  color: #555;
  margin-bottom: 15px;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.primary-btn, .secondary-btn {
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.primary-btn {
  background-color: #3498db;
  color: white;
}

.primary-btn:hover {
  background-color: #2980b9;
}

.secondary-btn {
  background-color: #f5f5f5;
  color: #333;
}

.secondary-btn:hover {
  background-color: #e0e0e0;
}

/* Responsive styles */
@media (max-width: 768px) {
  .page-header h1 {
    font-size: 1.8rem;
  }
  
  .subtitle {
    font-size: 1rem;
  }
  
  .realm-container {
    height: 500px;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .primary-btn, .secondary-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
