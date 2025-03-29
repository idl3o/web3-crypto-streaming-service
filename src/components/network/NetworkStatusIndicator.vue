<template>
    <div class="network-status-indicator" :class="[theme, statusClass]" @click="showDetails = !showDetails">
        <div class="status-icon">
            <i :class="statusIcon"></i>
        </div>

        <div class="status-text" v-if="!compact">
            {{ statusMessage }}
        </div>

        <div class="peer-count" v-if="!compact && connectionState.peerCount > 0">
            <i class="fas fa-users"></i> {{ connectionState.peerCount }}
        </div>

        <div v-if="showLocalBadge" class="local-badge" @click="toggleLocalDetails">
            <i class="fas fa-laptop-code"></i>
            <span>Local</span>
            <span v-if="isMarried" class="marriage-indicator" title="Married to Local Network">❤️</span>
        </div>

        <!-- Detailed status panel -->
        <div v-if="showDetails" class="status-details">
            <div class="details-header">
                <h3>Network Status</h3>
                <button class="close-btn" @click.stop="showDetails = false">&times;</button>
            </div>

            <div class="details-content">
                <div class="details-item">
                    <span class="details-label">Status:</span>
                    <span class="details-value" :class="statusClass">{{ statusMessage }}</span>
                </div>

                <div class="details-item">
                    <span class="details-label">Peers:</span>
                    <span class="details-value">{{ connectionState.peerCount }}</span>
                </div>

                <div class="details-item">
                    <span class="details-label">Latency:</span>
                    <span class="details-value">{{ formatLatency(connectionState.networkStats.latency) }}</span>
                </div>

                <div class="details-item">
                    <span class="details-label">Traffic:</span>
                    <span class="details-value">
                        <i class="fas fa-arrow-down"></i> {{ formatBytes(connectionState.bytesReceived) }}
                        <i class="fas fa-arrow-up ml-2"></i> {{ formatBytes(connectionState.bytesSent) }}
                    </span>
                </div>

                <div class="details-item">
                    <span class="details-label">Quality:</span>
                    <span class="details-value" :class="'quality-' + networkQuality.toLowerCase()">
                        {{ networkQuality }}
                    </span>
                </div>

                <div v-if="connectionState.error" class="details-item error">
                    <span class="details-label">Error:</span>
                    <span class="details-value">{{ connectionState.error }}</span>
                </div>
            </div>

            <div v-if="enabledControls.reconnect" class="details-actions">
                <button class="action-btn" @click.stop="reconnect">Reconnect</button>
            </div>
        </div>

        <!-- Local Network Details Popover -->
        <div v-if="showLocalDetails" class="local-details-popover">
            <div class="local-details-header">
                <h4>Local Network</h4>
                <button class="close-btn" @click="showLocalDetails = false">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="local-details-body">
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value" :class="localNetwork.connected ? 'text-success' : 'text-muted'">
                        {{ localNetwork.connected ? 'Connected' : 'Disconnected' }}
                    </div>
                </div>
                <div v-if="localNetwork.connected" class="detail-item">
                    <div class="detail-label">Chain ID</div>
                    <div class="detail-value">{{ localNetwork.chainId }}</div>
                </div>
                <div v-if="localNetwork.connected" class="detail-item">
                    <div class="detail-label">Latest Block</div>
                    <div class="detail-value">{{ localNetwork.lastBlock }}</div>
                </div>
                <div v-if="localNetwork.connected" class="detail-item">
                    <div class="detail-label">Marriage Status</div>
                    <div class="detail-value" :class="marriageClass">
                        {{ marriageText }}
                    </div>
                </div>
                <div v-if="localNetwork.connected && isMarried" class="detail-item">
                    <div class="detail-label">Operations</div>
                    <div class="detail-value text-success">
                        Routed to Local Network
                    </div>
                </div>
            </div>
            <div class="local-details-footer">
                <div class="marriage-actions" v-if="localNetwork.connected">
                    <button v-if="!isMarried" class="marriage-btn marry-btn" @click="marryLocalNetwork">
                        <i class="fas fa-heart"></i> Marry
                    </button>
                    <button v-else class="marriage-btn divorce-btn" @click="divorceLocalNetwork">
                        <i class="fas fa-heart-broken"></i> Divorce
                    </button>
                </div>
                <router-link to="/settings?tab=network" class="settings-link">
                    Network Settings
                </router-link>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, inject } from 'vue';
import {
    getConnectionState,
    addEventListener,
    CONNECTION_STATE,
    NETWORK_QUALITY,
    getCurrentNetworkQuality,
    initializeNetwork
} from '@/services/NetworkService';
import { useNetworkStore } from '@/stores/networkStore';
import * as MarriageService from '@/services/MarriageService';

const props = defineProps({
    compact: {
        type: Boolean,
        default: false
    },
    enabledControls: {
        type: Object,
        default: () => ({
            reconnect: true
        })
    }
});

const emit = defineEmits(['status-change', 'reconnect']);
const theme = inject('currentTheme', 'roman-theme');

// State
const connectionState = ref({
    state: CONNECTION_STATE.DISCONNECTED,
    peerCount: 0,
    networkStats: {
        latency: null,
        packetLoss: 0
    },
    bytesReceived: 0,
    bytesSent: 0,
    error: null
});
const networkQuality = ref(NETWORK_QUALITY.GOOD);
const showDetails = ref(false);
const network = useNetworkStore();
const showLocalDetails = ref(false);
const localNetwork = ref({
    connected: false,
    chainId: null,
    lastBlock: null,
});
const isMarried = ref(false);

// Computed
const statusClass = computed(() => {
    switch (connectionState.value.state) {
        case CONNECTION_STATE.CONNECTED:
            return 'status-connected';
        case CONNECTION_STATE.CONNECTING:
            return 'status-connecting';
        case CONNECTION_STATE.RECONNECTING:
            return 'status-reconnecting';
        case CONNECTION_STATE.ERROR:
            return 'status-error';
        default:
            return 'status-disconnected';
    }
});

const statusIcon = computed(() => {
    switch (connectionState.value.state) {
        case CONNECTION_STATE.CONNECTED:
            return 'fas fa-wifi';
        case CONNECTION_STATE.CONNECTING:
            return 'fas fa-spinner fa-spin';
        case CONNECTION_STATE.RECONNECTING:
            return 'fas fa-sync fa-spin';
        case CONNECTION_STATE.ERROR:
            return 'fas fa-exclamation-triangle';
        default:
            return 'fas fa-wifi-slash';
    }
});

const statusMessage = computed(() => {
    switch (connectionState.value.state) {
        case CONNECTION_STATE.CONNECTED:
            return 'Connected';
        case CONNECTION_STATE.CONNECTING:
            return 'Connecting';
        case CONNECTION_STATE.RECONNECTING:
            return 'Reconnecting';
        case CONNECTION_STATE.ERROR:
            return 'Error';
        default:
            return 'Disconnected';
    }
});

const networkLabel = computed(() => {
    if (isMarried.value && localNetwork.value.connected) {
        return '🖤 Local Network (Married)';
    } else if (localNetwork.value.connected && showLocalBadge.value) {
        return `Local: ${localNetwork.value.chainId || 'Unknown'}`;
    }

    return network.isConnected
        ? `${network.networkName} (${network.connectionQuality})`
        : 'Offline';
});

const showLocalBadge = computed(() => {
    return localNetwork.value.connected;
});

const marriageText = computed(() => {
    return isMarried.value ? 'Married' : 'Not Married';
});

const marriageClass = computed(() => {
    return isMarried.value ? 'text-danger' : 'text-muted';
});

// Methods
function formatLatency(latency) {
    if (latency === null) return 'N/A';
    return `${latency} ms`;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

function reconnect() {
    emit('reconnect');

    // Re-initialize the network service
    initializeNetwork()
        .then(() => {
            updateConnectionState();
        })
        .catch(error => {
            console.error('Failed to reconnect:', error);
        });
}

function updateConnectionState() {
    const state = getConnectionState();
    connectionState.value = state;
    networkQuality.value = getCurrentNetworkQuality();

    emit('status-change', {
        state: state.state,
        peerCount: state.peerCount,
        quality: networkQuality.value,
        error: state.error
    });
}

function toggleLocalDetails() {
    showLocalDetails.value = !showLocalDetails.value;
}

// Check if local network service has been initialized
function checkLocalNetwork() {
    try {
        const LocalNetworkService = require('@/services/LocalNetworkService').default;

        if (LocalNetworkService) {
            localNetwork.value = LocalNetworkService.getConnectionState();

            // Set up event listener for LocalNetworkService
            const unregister = LocalNetworkService.addEventListener('all', (data) => {
                // Update local network state
                localNetwork.value = LocalNetworkService.getConnectionState();
            });

            // Clean up event listener on unmount
            onUnmounted(unregister);
        }
    } catch (error) {
        console.error('LocalNetworkService not available:', error);
    }
}

function marryLocalNetwork() {
    MarriageService.marryLocalNet()
        .then(result => {
            if (result.success) {
                isMarried.value = true;
            }
        })
        .catch(console.error);

    showLocalDetails.value = false;
}

function divorceLocalNetwork() {
    MarriageService.divorceLocalNet()
        .then(result => {
            if (result.success) {
                isMarried.value = false;
            }
        })
        .catch(console.error);

    showLocalDetails.value = false;
}

// Handle marriage events
function handleMarriageEvent(event) {
    isMarried.value = event.detail.married;
}

// Lifecycle hooks
onMounted(() => {
    // Initialize with current state
    updateConnectionState();

    // Listen for connection state changes
    const removeConnectionListener = addEventListener('connection-state', () => {
        updateConnectionState();
    });

    // Listen for network stats updates
    const removeStatsListener = addEventListener('network-stats', () => {
        updateConnectionState();
    });

    // Setup cleanup
    onUnmounted(() => {
        removeConnectionListener();
        removeStatsListener();
    });

    checkLocalNetwork();

    // Listen for marriage events
    window.addEventListener('localnet-marriage', handleMarriageEvent);

    // Also listen for events from the MarriageService
    const marriageUnregister = MarriageService.addEventListener('all', (event) => {
        isMarried.value = event.type === 'married';
    });

    // Check current marriage status
    isMarried.value = MarriageService.isMarried();

    // Cleanup
    onUnmounted(() => {
        window.removeEventListener('localnet-marriage', handleMarriageEvent);
        marriageUnregister();
    });
});

onUnmounted(() => {
    window.removeEventListener('localnet-marriage', handleMarriageEvent);
});
</script>

<style scoped>
.network-status-indicator {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 16px;
    background-color: #f5f5f5;
    font-size: 0.85rem;
    cursor: pointer;
    position: relative;
    gap: 6px;
}

.status-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
}

.status-text {
    font-weight: 500;
}

.peer-count {
    display: flex;
    align-items: center;
    gap: 3px;
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
    padding: 2px 6px;
    font-size: 0.75rem;
}

/* Status colors */
.status-connected {
    color: #4CAF50;
}

.status-connecting,
.status-reconnecting {
    color: #2196F3;
}

.status-disconnected {
    color: #9E9E9E;
}

.status-error {
    color: #F44336;
}

/* Status details panel */
.status-details {
    position: absolute;
    top: 100%;
    right: 0;
    width: 280px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    margin-top: 8px;
    border: 1px solid #e0e0e0;
}

.details-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #e0e0e0;
}

.details-header h3 {
    margin: 0;
    font-size: 1rem;
}

.close-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0;
    color: #9E9E9E;
}

.details-content {
    padding: 12px;
}

.details-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
}

.details-label {
    font-weight: 500;
    color: #757575;
}

.details-value {
    text-align: right;
}

.details-item.error {
    color: #F44336;
}

/* Network quality colors */
.quality-excellent {
    color: #4CAF50;
}

.quality-good {
    color: #8BC34A;
}

.quality-fair {
    color: #FFC107;
}

.quality-poor {
    color: #FF9800;
}

.quality-bad {
    color: #F44336;
}

.details-actions {
    padding: 8px 12px;
    border-top: 1px solid #e0e0e0;
    display: flex;
    justify-content: flex-end;
}

.action-btn {
    background-color: #2196F3;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 0.85rem;
    cursor: pointer;
}

.ml-2 {
    margin-left: 8px;
}

/* Roman theme */
.roman-theme.network-status-indicator {
    background-color: rgba(139, 69, 19, 0.1);
}

.roman-theme .status-connected {
    color: #8B4513;
}

.roman-theme .status-connecting,
.roman-theme .status-reconnecting {
    color: #CD853F;
}

.roman-theme .action-btn {
    background-color: #8B4513;
}

/* Local badge styles */
.local-badge {
    display: inline-flex;
    align-items: center;
    background-color: #4caf50;
    color: white;
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 10px;
    margin-left: 8px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.local-badge:hover {
    background-color: #43a047;
}

.local-badge i {
    margin-right: 4px;
}

.local-badge .marriage-indicator {
    margin-left: 4px;
    animation: pulse 1.5s infinite;
}

@keyframes pulse {
    0% {
        transform: scale(1);
    }

    50% {
        transform: scale(1.2);
    }

    100% {
        transform: scale(1);
    }
}

.local-details-popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 250px;
    background-color: white;
    border-radius: 6px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
    z-index: 1000;
}

.local-details-header {
    padding: 12px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.local-details-header h4 {
    margin: 0;
    font-size: 1rem;
}

.local-details-body {
    padding: 12px;
}

.detail-item {
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
}

.detail-item:last-child {
    margin-bottom: 0;
}

.detail-label {
    font-size: 0.8rem;
    color: #666;
}

.detail-value {
    font-size: 0.9rem;
    font-weight: 500;
}

.text-success {
    color: #4caf50;
}

.text-danger {
    color: #f44336;
}

.text-muted {
    color: #9e9e9e;
}

.close-btn {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    font-size: 1rem;
    padding: 4px;
}

.close-btn:hover {
    color: #666;
}

.local-details-footer {
    padding: 12px;
    border-top: 1px solid #eee;
    text-align: right;
}

.settings-link {
    color: #2196f3;
    font-size: 0.85rem;
    text-decoration: none;
}

.settings-link:hover {
    text-decoration: underline;
}

/* Add styles for marriage buttons */
.marriage-actions {
    display: flex;
    margin-bottom: 8px;
}

.marriage-btn {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
}

.marry-btn {
    color: #E91E63;
}

.marry-btn:hover {
    background-color: rgba(233, 30, 99, 0.1);
}

.divorce-btn {
    color: #9E9E9E;
}

.divorce-btn:hover {
    background-color: rgba(158, 158, 158, 0.1);
}

/* Roman theme styles */
.roman-theme .marry-btn {
    color: var(--primary-color, #8B4513);
}

.roman-theme .marry-btn:hover {
    background-color: rgba(139, 69, 19, 0.1);
}

.roman-theme .local-badge {
    background-color: var(--primary-color, #8B4513);
}

.roman-theme .local-badge:hover {
    background-color: var(--primary-dark-color, #704012);
}

.roman-theme .local-details-popover {
    background-color: rgba(255, 252, 245, 0.98);
}

.roman-theme .settings-link {
    color: var(--primary-color, #8B4513);
}
</style>
