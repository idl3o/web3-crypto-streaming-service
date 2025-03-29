<template>
  <div class="local-network-bridge" :class="theme">
    <div class="bridge-header">
      <h3 class="bridge-title">Local Network Bridge</h3>
      <div class="connection-status" :class="{ 'connected': isConnected, 'disconnected': !isConnected }">
        {{ connectionStatus }}
      </div>
    </div>

    <div class="network-controls">
      <div class="control-group">
        <div class="form-group">
          <label for="network-type">Network Type</label>
          <select id="network-type" v-model="networkType" :disabled="isConnected">
            <option v-for="(label, type) in networkTypes" :key="type" :value="type">{{ label }}</option>
          </select>
        </div>

        <div class="form-group">
          <label for="network-url">Network URL</label>
          <input type="text" id="network-url" v-model="networkUrl" placeholder="http://localhost:8545" 
                :disabled="isConnected">
        </div>
      </div>

      <div class="actions">
        <button v-if="!isConnected" @click="connectNetwork" class="connect-btn" :disabled="connecting">
          <i class="fas" :class="connecting ? 'fa-spinner fa-spin' : 'fa-plug'"></i>
          {{ connecting ? 'Connecting...' : 'Connect' }}
        </button>
        <button v-else @click="disconnectNetwork" class="disconnect-btn" :disabled="disconnecting">
          <i class="fas" :class="disconnecting ? 'fa-spinner fa-spin' : 'fa-unlink'"></i>
          {{ disconnecting ? 'Disconnecting...' : 'Disconnect' }}
        </button>
      </div>
    </div>

    <div class="network-details" v-if="isConnected">
      <div class="detail-item">
        <div class="detail-label">Chain ID</div>
        <div class="detail-value">{{ connectionState.chainId }}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Latest Block</div>
        <div class="detail-value">{{ connectionState.lastBlock }}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Accounts</div>
        <div class="detail-value">{{ connectionState.accounts.length || 'Loading...' }}</div>
      </div>
    </div>

    <div class="network-actions" v-if="isConnected">
      <button class="action-btn" @click="fetchAccounts">
        <i class="fas fa-users"></i> Fetch Accounts
      </button>
      <button class="action-btn" @click="sendTransaction">
        <i class="fas fa-paper-plane"></i> Test Transaction
      </button>
      <button class="action-btn" @click="deployContract">
        <i class="fas fa-file-contract"></i> Deploy Test Contract
      </button>
      <button class="action-btn marriage-btn" @click="marriageMarryLocalNet">
        <i class="fas fa-heart"></i> Marry Local Net
      </button>
    </div>

    <div class="network-events">
      <h4>Network Events</h4>
      <div class="events-container">
        <div v-for="(event, index) in events" :key="index" class="event-item" :class="event.type">
          <div class="event-time">{{ formatTime(event.timestamp) }}</div>
          <div class="event-icon">
            <i :class="getEventIcon(event.type)"></i>
          </div>
          <div class="event-details">
            <div class="event-type">{{ formatEventType(event.type) }}</div>
            <div class="event-message">{{ event.message }}</div>
          </div>
        </div>
        <div v-if="events.length === 0" class="no-events">
          No events recorded yet
        </div>
      </div>
    </div>

    <!-- Marriage Status Dialog -->
    <div v-if="showMarriageDialog" class="marriage-dialog-backdrop">
      <div class="marriage-dialog">
        <div class="marriage-header">
          <h3>Local Net Marriage Status</h3>
          <button class="close-btn" @click="showMarriageDialog = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="marriage-body">
          <div class="marriage-status" :class="marriageStatus">
            <i :class="marriageStatusIcon"></i>
            <span>{{ marriageStatusText }}</span>
          </div>
          <div class="marriage-details">
            <p>Your application is {{ marriageStatus === 'married' ? 'successfully married' : 'not yet married' }} to the local network.</p>
            <ul v-if="marriageStatus === 'married'">
              <li>Remote operations will be routed to local network</li>
              <li>Transactions will be executed on local chain</li>
              <li>Smart contracts will deploy locally first</li>
              <li>Wallet connections will prefer local accounts</li>
            </ul>
          </div>
        </div>
        <div class="marriage-actions">
          <button v-if="marriageStatus !== 'married'" 
                  class="marry-btn" 
                  @click="marriageMarryLocalNet">
            <i class="fas fa-heart"></i> Marry Local Net
          </button>
          <button v-else 
                  class="divorce-btn" 
                  @click="marriageDivorceLocalNet">
            <i class="fas fa-heart-broken"></i> Divorce Local Net
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, inject, watch } from 'vue';
import * as LocalNetworkService from '@/services/LocalNetworkService';
import * as MarriageService from '@/services/MarriageService';

const theme = inject('currentTheme', 'roman-theme');

// Network type options
const networkTypes = {
  [LocalNetworkService.LOCAL_NETWORK_TYPES.HARDHAT]: 'Hardhat',
  [LocalNetworkService.LOCAL_NETWORK_TYPES.GANACHE]: 'Ganache',
  [LocalNetworkService.LOCAL_NETWORK_TYPES.GETH_DEV]: 'Geth Dev',
  [LocalNetworkService.LOCAL_NETWORK_TYPES.CUSTOM]: 'Custom'
};

// Component state
const networkType = ref(LocalNetworkService.LOCAL_NETWORK_TYPES.HARDHAT);
const networkUrl = ref(getDefaultNetworkUrl(LocalNetworkService.LOCAL_NETWORK_TYPES.HARDHAT));
const connecting = ref(false);
const disconnecting = ref(false);
const connectionState = ref({
  connected: false,
  networkType: null,
  chainId: null,
  lastBlock: null,
  accounts: []
});
const events = ref([]);
const marriageStatus = ref('unmarried'); // 'unmarried', 'married', 'pending'
const showMarriageDialog = ref(false);

// Computed properties
const isConnected = computed(() => connectionState.value.connected);
const connectionStatus = computed(() => {
  if (connectionState.value.connected) {
    return `Connected to ${formatNetworkType(connectionState.value.networkType)}`;
  }
  return 'Disconnected';
});

const marriageStatusText = computed(() => {
  switch (marriageStatus.value) {
    case 'married': return 'Married';
    case 'pending': return 'Marriage in Progress';
    default: return 'Not Married';
  }
});

const marriageStatusIcon = computed(() => {
  switch (marriageStatus.value) {
    case 'married': return 'fas fa-heart text-danger';
    case 'pending': return 'fas fa-spinner fa-spin';
    default: return 'fas fa-heart-broken';
  }
});

// Methods
function formatNetworkType(type) {
  return networkTypes[type] || 'Unknown';
}

async function connectNetwork() {
  if (connecting.value || isConnected.value) return;

  connecting.value = true;

  try {
    addEvent('info', 'Connecting to local network...');

    const result = await LocalNetworkService.connectToLocalNetwork({
      networkType: networkType.value,
      url: networkUrl.value
    });

    if (result.success) {
      // Connection successful
      connectionState.value = LocalNetworkService.getConnectionState();
      addEvent('success', `Connected to local network: Chain ID ${result.chainId}, Block #${result.blockNumber}`);

      // Automatically fetch accounts
      fetchAccounts();
    } else {
      // Connection failed
      addEvent('error', `Connection failed: ${result.error}`);
    }
  } catch (error) {
    addEvent('error', `Error connecting to network: ${error.message}`);
  } finally {
    connecting.value = false;
  }
}

async function disconnectNetwork() {
  if (disconnecting.value || !isConnected.value) return;

  disconnecting.value = true;

  try {
    addEvent('info', 'Disconnecting from local network...');

    const result = await LocalNetworkService.disconnectFromLocalNetwork();

    if (result.success) {
      // Disconnection successful
      connectionState.value = LocalNetworkService.getConnectionState();
      addEvent('success', 'Disconnected from local network');

      // Automatically divorce if we were married
      if (marriageStatus.value === 'married') {
        marriageDivorceLocalNet(false); // Silent divorce
      }
    } else {
      // Disconnection failed
      addEvent('error', `Disconnection failed: ${result.error}`);
    }
  } catch (error) {
    addEvent('error', `Error disconnecting from network: ${error.message}`);
  } finally {
    disconnecting.value = false;
  }
}

async function fetchAccounts() {
  if (!isConnected.value) return;

  try {
    addEvent('info', 'Fetching local accounts...');

    const accounts = await LocalNetworkService.getLocalAccounts();
    connectionState.value = LocalNetworkService.getConnectionState();

    addEvent('success', `Found ${accounts.length} local accounts`);
  } catch (error) {
    addEvent('error', `Error fetching accounts: ${error.message}`);
  }
}

async function sendTransaction() {
  if (!isConnected.value) return;

  try {
    addEvent('info', 'Sending test transaction...');

    const result = await LocalNetworkService.sendTestTransaction();

    if (result.success) {
      addEvent('success', `Test transaction sent: ${result.hash}`);
    }
  } catch (error) {
    addEvent('error', `Error sending transaction: ${error.message}`);
  }
}

async function deployContract() {
  if (!isConnected.value) return;

  try {
    addEvent('info', 'Deploying test contract...');

    const result = await LocalNetworkService.deployTestContract();

    if (result.success) {
      addEvent('success', `Test contract deployed at: ${result.address}`);
    }
  } catch (error) {
    addEvent('error', `Error deploying contract: ${error.message}`);
  }
}

// Update the marriage functions to use the MarriageService
function marriageMarryLocalNet() {
  if (!isConnected.value) {
    addEvent('error', 'Cannot marry: Not connected to local network');
    return;
  }

  // Set marriage status to pending
  marriageStatus.value = 'pending';
  addEvent('info', 'Marrying local network...');

  // Use the MarriageService
  MarriageService.marryLocalNet()
    .then(result => {
      if (result.success) {
        marriageStatus.value = 'married';
        showMarriageDialog.value = true;
        addEvent('success', 'Successfully married to local network!');
      } else {
        marriageStatus.value = 'unmarried';
        addEvent('error', `Marriage failed: ${result.error}`);
      }
    })
    .catch(error => {
      marriageStatus.value = 'unmarried';
      addEvent('error', `Marriage error: ${error.message}`);
    });
}

function marriageDivorceLocalNet(notify = true) {
  if (marriageStatus.value !== 'married') return;

  MarriageService.divorceLocalNet()
    .then(result => {
      if (result.success) {
        marriageStatus.value = 'unmarried';
        if (notify) {
          addEvent('info', 'Divorced from local network');
        }
      }
    })
    .catch(error => {
      if (notify) {
        addEvent('error', `Divorce error: ${error.message}`);
      }
    });
}

function addEvent(type, message) {
  events.value.unshift({
    type,
    message,
    timestamp: new Date()
  });

  // Limit events history
  if (events.value.length > 50) {
    events.value = events.value.slice(0, 50);
  }
}

function formatTime(date) {
  return date.toLocaleTimeString();
}

function formatEventType(type) {
  switch (type) {
    case 'success': return 'Success';
    case 'error': return 'Error';
    case 'info': return 'Info';
    case 'warning': return 'Warning';
    default: return 'Event';
  }
}

function getEventIcon(type) {
  switch (type) {
    case 'success': return 'fas fa-check-circle';
    case 'error': return 'fas fa-exclamation-circle';
    case 'info': return 'fas fa-info-circle';
    case 'warning': return 'fas fa-exclamation-triangle';
    default: return 'fas fa-circle';
  }
}

function getDefaultNetworkUrl(type) {
  switch (type) {
    case LocalNetworkService.LOCAL_NETWORK_TYPES.HARDHAT:
      return 'http://localhost:8545';
    case LocalNetworkService.LOCAL_NETWORK_TYPES.GANACHE:
      return 'http://localhost:7545';
    case LocalNetworkService.LOCAL_NETWORK_TYPES.GETH_DEV:
      return 'http://localhost:8545';
    default:
      return 'http://localhost:8545';
  }
}

// Watch for network type changes and update default URL
watch(networkType, (newType) => {
  if (!isConnected.value) {
    networkUrl.value = getDefaultNetworkUrl(newType);
  }
});

// Event handlers for LocalNetworkService
function handleBlockEvent(data) {
  // Update connection state
  connectionState.value = LocalNetworkService.getConnectionState();
  addEvent('info', `New block: #${data.blockNumber}`);
}

function handleTransactionEvent(data) {
  addEvent('success', `Transaction processed: ${data.hash}`);
}

function handleErrorEvent(data) {
  addEvent('error', data.message);
}

function handleMarriageEvent(event) {
  if (event.type === 'married') {
    marriageStatus.value = 'married';
  } else if (event.type === 'divorced') {
    marriageStatus.value = 'unmarried';
  }
}

// Lifecycle hooks
onMounted(() => {
  // Register event listeners
  const blockUnregister = LocalNetworkService.addEventListener('block', handleBlockEvent);
  const txUnregister = LocalNetworkService.addEventListener('transaction', handleTransactionEvent);
  const errorUnregister = LocalNetworkService.addEventListener('error', handleErrorEvent);
  
  // Add marriage event listener
  const marriageUnregister = MarriageService.addEventListener('all', handleMarriageEvent);

  // Check if already married
  const marriageState = MarriageService.getMarriageState();
  if (marriageState.married) {
    marriageStatus.value = 'married';
  }
  
  // Store unregister functions
  onUnmounted(() => {
    blockUnregister();
    txUnregister();
    errorUnregister();
    marriageUnregister();
    
    // Disconnect from network if connected
    if (LocalNetworkService.isConnected()) {
      LocalNetworkService.disconnectFromLocalNetwork().catch(console.error);
    }
  });
});
</script>

<style scoped>
.local-network-bridge {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 16px;
}

.bridge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.bridge-title {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.connection-status {
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
}

.connection-status.connected {
  background-color: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
}

.connection-status.disconnected {
  background-color: rgba(158, 158, 158, 0.1);
  color: #9E9E9E;
}

.network-controls {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-group {
  display: flex;
  gap: 16px;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 0.875rem;
  color: #666;
}

.form-group select,
.form-group input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
}

.actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}

.connect-btn,
.disconnect-btn,
.action-btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  transition: background-color 0.2s;
}

.connect-btn {
  background-color: #2196F3;
  color: white;
}

.connect-btn:hover:not(:disabled) {
  background-color: #1976D2;
}

.disconnect-btn {
  background-color: #F44336;
  color: white;
}

.disconnect-btn:hover:not(:disabled) {
  background-color: #D32F2F;
}

.connect-btn:disabled,
.disconnect-btn:disabled,
.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.network-details {
  margin-bottom: 16px;
  background-color: #f9f9f9;
  border-radius: 6px;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
}

.detail-label {
  font-size: 0.75rem;
  color: #666;
}

.detail-value {
  font-size: 0.95rem;
  font-weight: 500;
}

.network-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.action-btn {
  background-color: #f0f0f0;
  color: #333;
  flex: 1;
  justify-content: center;
  min-width: 120px;
}

.action-btn:hover {
  background-color: #e0e0e0;
}

.marriage-btn {
  background-color: #E91E63;
  color: white;
}

.marriage-btn:hover {
  background-color: #C2185B;
}

.network-events {
  margin-top: 24px;
}

.network-events h4 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  color: #333;
}

.events-container {
  border: 1px solid #eee;
  border-radius: 6px;
  height: 200px;
  overflow-y: auto;
}

.event-item {
  padding: 8px 12px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border-bottom: 1px solid #f5f5f5;
}

.event-item:last-child {
  border-bottom: none;
}

.event-item.success {
  background-color: rgba(76, 175, 80, 0.05);
}

.event-item.error {
  background-color: rgba(244, 67, 54, 0.05);
}

.event-item.warning {
  background-color: rgba(255, 152, 0, 0.05);
}

.event-time {
  font-size: 0.75rem;
  color: #999;
  min-width: 80px;
}

.event-icon {
  color: #666;
}

.event-item.success .event-icon {
  color: #4CAF50;
}

.event-item.error .event-icon {
  color: #F44336;
}

.event-item.warning .event-icon {
  color: #FF9800;
}

.event-details {
  flex: 1;
}

.event-type {
  font-size: 0.75rem;
  font-weight: 500;
  color: #666;
}

.event-message {
  font-size: 0.875rem;
}

.no-events {
  padding: 16px;
  text-align: center;
  color: #999;
  font-style: italic;
}

/* Marriage Dialog */
.marriage-dialog-backdrop {
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

.marriage-dialog {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.marriage-header {
  padding: 16px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.marriage-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 1.25rem;
  padding: 4px;
}

.marriage-body {
  padding: 16px;
}

.marriage-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 6px;
  font-size: 1.25rem;
  font-weight: 500;
}

.marriage-status.married {
  background-color: rgba(233, 30, 99, 0.1);
  color: #E91E63;
}

.marriage-status.unmarried {
  background-color: #f5f5f5;
  color: #666;
}

.marriage-status.pending {
  background-color: rgba(255, 152, 0, 0.1);
  color: #FF9800;
}

.marriage-details {
  margin-bottom: 16px;
}

.marriage-details p {
  margin-top: 0;
}

.marriage-details ul {
  margin-bottom: 0;
  padding-left: 20px;
}

.marriage-actions {
  padding: 16px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.marry-btn,
.divorce-btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
}

.marry-btn {
  background-color: #E91E63;
  color: white;
}

.marry-btn:hover {
  background-color: #C2185B;
}

.divorce-btn {
  background-color: #9E9E9E;
  color: white;
}

.divorce-btn:hover {
  background-color: #757575;
}

/* Roman Theme */
.roman-theme.local-network-bridge {
  background-color: rgba(255, 252, 245, 0.95);
}

.roman-theme .bridge-title {
  color: var(--primary-color, #8B4513);
  font-family: var(--heading-font);
}

.roman-theme .connect-btn {
  background-color: var(--primary-color, #8B4513);
}

.roman-theme .connect-btn:hover:not(:disabled) {
  background-color: var(--primary-dark-color, #704012);
}

.roman-theme .action-btn {
  background-color: rgba(210, 180, 140, 0.2);
}

.roman-theme .action-btn:hover {
  background-color: rgba(210, 180, 140, 0.3);
}

.roman-theme .marriage-btn {
  background-color: var(--primary-color, #8B4513);
}

.roman-theme .marriage-btn:hover {
  background-color: var(--primary-dark-color, #704012);
}

.roman-theme .marry-btn {
  background-color: var(--primary-color, #8B4513);
}

.roman-theme .marry-btn:hover {
  background-color: var(--primary-dark-color, #704012);
}

.roman-theme .marriage-status.married {
  background-color: rgba(139, 69, 19, 0.1);
  color: var(--primary-color, #8B4513);
}
</style>
