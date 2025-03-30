<template>
  <div class="my-connection-network">
    <div class="section-header">
      <h2>My Connection Network</h2>
      <div class="actions">
        <button @click="refreshAllConnections" class="refresh-btn" :disabled="isRefreshing">
          <span v-if="isRefreshing" class="spinner"></span>
          <span v-else>Refresh All</span>
        </button>
        <button @click="showAddNetworkModal = true" class="add-btn">Add Network</button>
      </div>
    </div>

    <div class="networks-container" v-if="!isLoading">
      <div v-if="networks.length === 0" class="empty-state">
        <div class="empty-icon">🔌</div>
        <p>No blockchain networks configured</p>
        <button @click="showAddNetworkModal = true" class="add-network-btn">Add Your First Network</button>
      </div>
      
      <div v-else class="network-grid">
        <div 
          v-for="network in networks" 
          :key="network.chainId" 
          class="network-card"
          :class="{ 
            'connected': getNetworkStatus(network.name) === ConnectionStatus.CONNECTED,
            'error': getNetworkStatus(network.name) === ConnectionStatus.ERROR,
            'connecting': getNetworkStatus(network.name) === ConnectionStatus.CONNECTING,
            'fallback': getNetworkStatus(network.name) === ConnectionStatus.FALLBACK,
            'disconnected': getNetworkStatus(network.name) === ConnectionStatus.DISCONNECTED
          }"
        >
          <div class="network-header">
            <div class="network-icon" v-if="network.icon" v-html="network.icon"></div>
            <div class="network-icon default-icon" v-else>
              {{ network.name.charAt(0).toUpperCase() }}
            </div>
            <div class="network-info">
              <h3 class="network-name">{{ network.name }}</h3>
              <div class="network-details">Chain ID: {{ network.chainId }}</div>
            </div>
            <div class="network-status-indicator" :title="getStatusTooltip(network.name)">
              {{ getStatusLabel(network.name) }}
            </div>
          </div>
          
          <div class="network-body">
            <div class="connection-stats" v-if="getNetworkStats(network.name)">
              <div class="stats-item">
                <span class="stats-label">Avg. Latency:</span>
                <span class="stats-value">{{ formatLatency(getNetworkStats(network.name)?.avgLatency) }}</span>
              </div>
              <div class="stats-item">
                <span class="stats-label">Uptime:</span>
                <span class="stats-value">{{ getNetworkStats(network.name)?.uptime.toFixed(1) }}%</span>
              </div>
              <div class="stats-item">
                <span class="stats-label">Requests:</span>
                <span class="stats-value">{{ getNetworkStats(network.name)?.requestCount }}</span>
              </div>
            </div>
            
            <div class="rpc-urls">
              <div class="rpc-label">RPC URLs:</div>
              <div class="rpc-list">
                <div 
                  v-for="(url, index) in network.rpcUrls" 
                  :key="index" 
                  class="rpc-url"
                  :class="{ 'active': isActiveRpcUrl(network.name, url) }"
                >
                  {{ truncateUrl(url) }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="network-actions">
            <button 
              @click="connectToNetwork(network.name)" 
              class="connect-btn"
              v-if="getNetworkStatus(network.name) !== ConnectionStatus.CONNECTED && 
                   getNetworkStatus(network.name) !== ConnectionStatus.CONNECTING"
            >
              Connect
            </button>
            <button 
              @click="reconnectNetwork(network.name)" 
              class="reconnect-btn"
              v-else-if="getNetworkStatus(network.name) === ConnectionStatus.CONNECTED"
            >
              Reconnect
            </button>
            <button 
              class="connecting-btn" 
              disabled
              v-else
            >
              <span class="spinner small"></span> Connecting...
            </button>
            
            <button @click="editNetwork(network)" class="edit-btn">Edit</button>
            <button @click="removeNetwork(network.name)" class="remove-btn">Remove</button>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="loading-container">
      <div class="spinner"></div>
      <p>Loading network connections...</p>
    </div>
    
    <!-- Add/Edit Network Modal -->
    <div v-if="showAddNetworkModal" class="network-modal">
      <div class="modal-overlay" @click="cancelAddNetwork"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ isEditMode ? 'Edit Network' : 'Add Network' }}</h3>
          <button @click="cancelAddNetwork" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label for="network-name">Network Name:</label>
            <input 
              type="text" 
              id="network-name" 
              v-model="newNetwork.name"
              placeholder="e.g., Mainnet, Arbitrum, etc."
            >
          </div>
          
          <div class="form-group">
            <label for="chain-id">Chain ID:</label>
            <input 
              type="number" 
              id="chain-id" 
              v-model.number="newNetwork.chainId"
              placeholder="e.g., 1 for Ethereum Mainnet"
            >
          </div>
          
          <div class="form-group">
            <label>RPC URLs:</label>
            <div 
              v-for="(url, index) in newNetwork.rpcUrls" 
              :key="index"
              class="rpc-input-group"
            >
              <input 
                type="text" 
                v-model="newNetwork.rpcUrls[index]"
                placeholder="https://..."
              >
              <button 
                @click="removeRpcUrl(index)" 
                class="remove-url-btn"
                v-if="newNetwork.rpcUrls.length > 1"
              >
                Remove
              </button>
            </div>
            <button @click="addRpcUrl" class="add-url-btn">+ Add RPC URL</button>
          </div>
          
          <div class="form-group">
            <label for="currency-symbol">Currency Symbol:</label>
            <input 
              type="text" 
              id="currency-symbol" 
              v-model="newNetwork.nativeCurrency.symbol"
              placeholder="e.g., ETH, MATIC"
            >
          </div>
          
          <div class="form-group">
            <label for="currency-decimals">Currency Decimals:</label>
            <input 
              type="number" 
              id="currency-decimals" 
              v-model.number="newNetwork.nativeCurrency.decimals"
              placeholder="18"
            >
          </div>
          
          <div class="form-group">
            <label for="explorer-url">Block Explorer URL:</label>
            <input 
              type="text" 
              id="explorer-url" 
              v-model="explorerUrl"
              placeholder="https://etherscan.io"
            >
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="cancelAddNetwork" class="cancel-btn">Cancel</button>
          <button @click="saveNetwork" class="save-btn" :disabled="!isFormValid">
            {{ isEditMode ? 'Update Network' : 'Add Network' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { connectionManager, ConnectionStatus, NetworkConfig } from '../../services/ConnectionManagerService';

export default defineComponent({
  name: 'MyConnectionNetwork',
  
  setup() {
    const networks = ref<NetworkConfig[]>([]);
    const isLoading = ref(true);
    const isRefreshing = ref(false);
    const showAddNetworkModal = ref(false);
    const isEditMode = ref(false);
    
    const newNetwork = ref<NetworkConfig>({
      name: '',
      chainId: 1,
      rpcUrls: [''],
      blockExplorerUrls: [''],
      nativeCurrency: {
        name: '',
        symbol: '',
        decimals: 18
      }
    });
    
    const explorerUrl = ref('');
    
    // Reset the form for a new network
    const resetForm = () => {
      newNetwork.value = {
        name: '',
        chainId: 1,
        rpcUrls: [''],
        blockExplorerUrls: [''],
        nativeCurrency: {
          name: '',
          symbol: '',
          decimals: 18
        }
      };
      explorerUrl.value = '';
      isEditMode.value = false;
    };
    
    // Load all networks
    const loadNetworks = () => {
      isLoading.value = true;
      try {
        networks.value = connectionManager.getNetworks();
      } catch (error) {
        console.error('Failed to load networks:', error);
      } finally {
        isLoading.value = false;
      }
    };
    
    // Get connection status for a specific network
    const getNetworkStatus = (networkName: string): ConnectionStatus => {
      return connectionManager.getConnectionStatus(networkName);
    };
    
    // Get status text for display
    const getStatusLabel = (networkName: string): string => {
      const status = getNetworkStatus(networkName);
      switch (status) {
        case ConnectionStatus.CONNECTED:
          return 'Connected';
        case ConnectionStatus.CONNECTING:
          return 'Connecting...';
        case ConnectionStatus.FALLBACK:
          return 'Fallback';
        case ConnectionStatus.ERROR:
          return 'Error';
        case ConnectionStatus.DISCONNECTED:
        default:
          return 'Disconnected';
      }
    };
    
    // Get tooltip text for status
    const getStatusTooltip = (networkName: string): string => {
      const status = getNetworkStatus(networkName);
      const stats = getNetworkStats(networkName);
      
      switch (status) {
        case ConnectionStatus.CONNECTED:
          return `Connected to ${networkName} with ${formatLatency(stats?.avgLatency || 0)} latency`;
        case ConnectionStatus.CONNECTING:
          return `Establishing connection to ${networkName}...`;
        case ConnectionStatus.FALLBACK:
          return `Using fallback RPC for ${networkName}`;
        case ConnectionStatus.ERROR:
          return `Connection error: ${stats?.lastError || 'Unknown error'}`;
        case ConnectionStatus.DISCONNECTED:
        default:
          return `Not connected to ${networkName}`;
      }
    };
    
    // Get network statistics
    const getNetworkStats = (networkName: string) => {
      return connectionManager.getConnectionStats(networkName);
    };
    
    // Format latency for display
    const formatLatency = (latency: number): string => {
      if (!latency) return 'N/A';
      
      if (latency < 100) {
        return `${Math.round(latency)}ms`;
      } else if (latency < 1000) {
        return `${Math.round(latency)}ms`;
      } else {
        return `${(latency / 1000).toFixed(1)}s`;
      }
    };
    
    // Truncate URL for display
    const truncateUrl = (url: string): string => {
      if (url.length <= 30) return url;
      return url.substring(0, 15) + '...' + url.substring(url.length - 15);
    };
    
    // Check if an RPC URL is currently active
    const isActiveRpcUrl = (networkName: string, url: string): boolean => {
      // In a real implementation, we would check if this is the actual URL being used
      // For now, we'll just return true for the first URL in the list for connected networks
      const network = networks.value.find(n => n.name === networkName);
      if (!network) return false;
      
      const status = getNetworkStatus(networkName);
      return status === ConnectionStatus.CONNECTED && url === network.rpcUrls[0];
    };
    
    // Connect to a network
    const connectToNetwork = async (networkName: string) => {
      try {
        await connectionManager.getProvider(networkName);
      } catch (error) {
        console.error(`Failed to connect to ${networkName}:`, error);
        // In a real app, you might want to show an error notification
      }
    };
    
    // Reconnect to a network
    const reconnectNetwork = async (networkName: string) => {
      try {
        await connectionManager.reconnect(networkName);
      } catch (error) {
        console.error(`Failed to reconnect to ${networkName}:`, error);
      }
    };
    
    // Refresh all connections
    const refreshAllConnections = async () => {
      isRefreshing.value = true;
      
      try {
        for (const network of networks.value) {
          if (getNetworkStatus(network.name) === ConnectionStatus.CONNECTED) {
            await connectionManager.reconnect(network.name);
          }
        }
      } catch (error) {
        console.error('Error refreshing connections:', error);
      } finally {
        isRefreshing.value = false;
      }
    };
    
    // Edit a network
    const editNetwork = (network: NetworkConfig) => {
      isEditMode.value = true;
      newNetwork.value = JSON.parse(JSON.stringify(network)); // Deep copy
      explorerUrl.value = network.blockExplorerUrls?.[0] || '';
      showAddNetworkModal.value = true;
    };
    
    // Save network changes
    const saveNetwork = () => {
      if (!isFormValid.value) return;
      
      // Update blockExplorerUrls from the explorerUrl input
      newNetwork.value.blockExplorerUrls = explorerUrl.value ? [explorerUrl.value] : [];
      
      // Set currency name if not provided
      if (!newNetwork.value.nativeCurrency.name) {
        newNetwork.value.nativeCurrency.name = newNetwork.value.nativeCurrency.symbol;
      }
      
      if (isEditMode.value) {
        // Updating existing network
        connectionManager.removeNetwork(newNetwork.value.name);
        connectionManager.addNetwork(newNetwork.value);
      } else {
        // Adding new network
        connectionManager.addNetwork(newNetwork.value);
      }
      
      // Refresh the network list
      loadNetworks();
      
      // Close the modal
      showAddNetworkModal.value = false;
      resetForm();
    };
    
    // Cancel adding/editing network
    const cancelAddNetwork = () => {
      showAddNetworkModal.value = false;
      resetForm();
    };
    
    // Remove a network
    const removeNetwork = (networkName: string) => {
      if (confirm(`Are you sure you want to remove the ${networkName} network?`)) {
        connectionManager.removeNetwork(networkName);
        loadNetworks();
      }
    };
    
    // Add a new RPC URL field
    const addRpcUrl = () => {
      newNetwork.value.rpcUrls.push('');
    };
    
    // Remove an RPC URL field
    const removeRpcUrl = (index: number) => {
      if (newNetwork.value.rpcUrls.length > 1) {
        newNetwork.value.rpcUrls.splice(index, 1);
      }
    };
    
    // Check if form is valid
    const isFormValid = computed(() => {
      return (
        newNetwork.value.name.trim() !== '' &&
        newNetwork.value.chainId > 0 &&
        newNetwork.value.rpcUrls.length > 0 &&
        newNetwork.value.rpcUrls.every(url => url.trim() !== '') &&
        newNetwork.value.nativeCurrency.symbol.trim() !== '' &&
        newNetwork.value.nativeCurrency.decimals >= 0
      );
    });
    
    // Status change listener
    const handleStatusChange = (network: string, status: ConnectionStatus) => {
      // This will trigger a UI update when a network status changes
      // We don't need to do anything explicit here as Vue's reactivity will handle the update
    };
    
    onMounted(() => {
      loadNetworks();
      connectionManager.on('statusChange', handleStatusChange);
    });
    
    onBeforeUnmount(() => {
      connectionManager.off('statusChange', handleStatusChange);
    });
    
    return {
      networks,
      isLoading,
      isRefreshing,
      showAddNetworkModal,
      newNetwork,
      explorerUrl,
      isEditMode,
      isFormValid,
      ConnectionStatus,
      getNetworkStatus,
      getStatusLabel,
      getStatusTooltip,
      getNetworkStats,
      formatLatency,
      truncateUrl,
      isActiveRpcUrl,
      connectToNetwork,
      reconnectNetwork,
      refreshAllConnections,
      editNetwork,
      saveNetwork,
      cancelAddNetwork,
      removeNetwork,
      addRpcUrl,
      removeRpcUrl
    };
  }
});
</script>

<style scoped>
.my-connection-network {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}

.actions {
  display: flex;
  gap: 0.75rem;
}

.refresh-btn, .add-btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
}

.refresh-btn {
  background: #f0f0f0;
  color: #333;
}

.refresh-btn:hover {
  background: #e0e0e0;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.add-btn {
  background: #f7931a;
  color: white;
}

.add-btn:hover {
  background: #e68318;
}

.networks-container {
  position: relative;
}

.empty-state {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 3rem 1rem;
  text-align: center;
  color: #666;
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.add-network-btn {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: #f7931a;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
}

.add-network-btn:hover {
  background: #e68318;
}

.network-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.network-card {
  background: #f9f9f9;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #eaeaea;
  transition: all 0.3s ease;
}

.network-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.network-card.connected {
  border-color: #4caf50;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
}

.network-card.error {
  border-color: #f44336;
}

.network-card.connecting {
  border-color: #2196f3;
}

.network-card.fallback {
  border-color: #ff9800;
}

.network-header {
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid #eaeaea;
}

.network-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  font-weight: 600;
  font-size: 1.2rem;
}

.network-info {
  flex: 1;
}

.network-name {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  color: #333;
}

.network-details {
  font-size: 0.8rem;
  color: #666;
}

.network-status-indicator {
  background: #f0f0f0;
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  color: #666;
}

.connected .network-status-indicator {
  background: #e8f5e9;
  color: #2e7d32;
}

.error .network-status-indicator {
  background: #ffebee;
  color: #c62828;
}

.connecting .network-status-indicator {
  background: #e3f2fd;
  color: #1565c0;
}

.fallback .network-status-indicator {
  background: #fff3e0;
  color: #e65100;
}

.network-body {
  padding: 1rem;
  border-bottom: 1px solid #eaeaea;
}

.connection-stats {
  margin-bottom: 1rem;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.35rem;
  font-size: 0.85rem;
}

.stats-label {
  color: #666;
}

.stats-value {
  font-weight: 600;
  color: #333;
}

.rpc-urls {
  font-size: 0.85rem;
}

.rpc-label {
  color: #666;
  margin-bottom: 0.35rem;
}

.rpc-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.rpc-url {
  background: #f0f0f0;
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
  color: #555;
  word-break: break-all;
  font-family: monospace;
  font-size: 0.8rem;
}

.rpc-url.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.network-actions {
  padding: 1rem;
  display: flex;
  gap: 0.5rem;
}

.connect-btn, .reconnect-btn, .connecting-btn, .edit-btn, .remove-btn {
  flex: 1;
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.connect-btn {
  background: #2196f3;
  color: white;
}

.connect-btn:hover {
  background: #1976d2;
}

.reconnect-btn {
  background: #4caf50;
  color: white;
}

.reconnect-btn:hover {
  background: #388e3c;
}

.connecting-btn {
  background: #bbdefb;
  color: #1565c0;
  cursor: not-allowed;
}

.edit-btn {
  background: #f0f0f0;
  color: #555;
}

.edit-btn:hover {
  background: #e0e0e0;
}

.remove-btn {
  background: #ffebee;
  color: #c62828;
}

.remove-btn:hover {
  background: #ffcdd2;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: #666;
}

.spinner {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: #333;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
  margin-bottom: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal Styles */
.network-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  background: white;
  width: 100%;
  max-width: 500px;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid #eaeaea;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  line-height: 1;
}

.modal-body {
  padding: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.rpc-input-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.rpc-input-group input {
  flex: 1;
}

.remove-url-btn {
  background: #ffebee;
  color: #c62828;
  border: none;
  border-radius: 4px;
  padding: 0 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
}

.add-url-btn {
  background: #e3f2fd;
  color: #1565c0;
  border: none;
  border-radius: 4px;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid #eaeaea;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.cancel-btn, .save-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
}

.cancel-btn {
  background: #f0f0f0;
  color: #333;
}

.save-btn {
  background: #f7931a;
  color: white;
}

.save-btn:disabled {
  background: #fad296;
  cursor: not-allowed;
}
</style>
