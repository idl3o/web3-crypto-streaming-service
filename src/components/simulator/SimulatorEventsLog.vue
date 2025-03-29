<template>
    <div class="simulator-events-log">
        <div class="log-header">
            <h3>Event Log</h3>
            <button class="clear-btn" @click="clearEvents">Clear</button>
        </div>

        <div class="log-container" ref="logContainer">
            <div v-if="events.length === 0" class="empty-log">
                No events yet. Simulator is running...
            </div>

            <div v-else class="events-list">
                <div v-for="(event, index) in events" :key="`event-${index}`" class="event-item" :class="event.type">
                    <div class="event-time">{{ formatTime(event.timestamp) }}</div>
                    <div class="event-icon">
                        <i :class="getEventIcon(event.type)"></i>
                    </div>
                    <div class="event-content">
                        <div class="event-title">{{ getEventTitle(event) }}</div>
                        <div class="event-description">{{ event.description }}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="log-footer">
            <div class="network-info">
                <span class="network-label">Simulated Network:</span>
                <span class="network-status" :class="getNetworkStatusClass()">
                    {{ getNetworkStatus() }}
                </span>
            </div>
            <div class="events-count">{{ events.length }} events</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useTransactionStore } from '@/stores/transactionStore';
import { useFaeStore } from '@/stores/fae';
import { simulatorService } from '@/services/simulatorService';

// Event structure
interface SimulatorEvent {
    type: string;
    timestamp: number;
    title?: string;
    description: string;
    data?: any;
}

const transactionStore = useTransactionStore();
const faeStore = useFaeStore();
const events = ref<SimulatorEvent[]>([]);
const logContainer = ref<HTMLElement | null>(null);
const maxEvents = 100;

// Watch for new transactions
watch(() => transactionStore.transactions.length, (newCount, oldCount) => {
    if (newCount > oldCount) {
        const newTx = transactionStore.transactions[0]; // Newest transaction
        addEvent({
            type: 'transaction',
            timestamp: Date.now(),
            title: `New ${newTx.type}`,
            description: `Amount: ${newTx.amount?.toFixed(5) || 'N/A'} | Status: ${newTx.status}`,
            data: newTx
        });
    }
});

// Watch for essence changes
let lastEssence = faeStore.essence;
watch(() => faeStore.essence, (newAmount) => {
    if (newAmount > lastEssence) {
        const gained = newAmount - lastEssence;
        addEvent({
            type: 'essence',
            timestamp: Date.now(),
            title: 'Essence Gained',
            description: `+${gained.toFixed(2)} Fae Essence | New total: ${newAmount.toFixed(2)}`,
            data: { gained, total: newAmount }
        });
    }
    lastEssence = newAmount;
});

// Add event to log
function addEvent(event: SimulatorEvent) {
    events.value.unshift(event);

    // Limit the number of events
    if (events.value.length > maxEvents) {
        events.value = events.value.slice(0, maxEvents);
    }

    // Scroll to top if needed
    nextTick(() => {
        if (logContainer.value) {
            logContainer.value.scrollTop = 0;
        }
    });
}

// Format timestamp as time
function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Get icon for event type
function getEventIcon(type: string): string {
    switch (type) {
        case 'transaction':
            return 'fas fa-exchange-alt';
        case 'essence':
            return 'fas fa-star';
        case 'network':
            return 'fas fa-wifi';
        case 'error':
            return 'fas fa-exclamation-triangle';
        case 'system':
            return 'fas fa-cog';
        case 'random':
            return 'fas fa-dice';
        default:
            return 'fas fa-info-circle';
    }
}

// Get event title
function getEventTitle(event: SimulatorEvent): string {
    return event.title || event.type.charAt(0).toUpperCase() + event.type.slice(1);
}

// Clear event log
function clearEvents() {
    events.value = [];
}

// Get network status
function getNetworkStatus(): string {
    if (!simulatorService.isActive.value) return 'Offline';

    const latency = simulatorService.stats.simulatedNetworkLatency;
    if (latency < 100) return 'Excellent';
    if (latency < 300) return 'Good';
    if (latency < 800) return 'Fair';
    return 'Poor';
}

// Get network status CSS class
function getNetworkStatusClass(): string {
    if (!simulatorService.isActive.value) return 'offline';

    const latency = simulatorService.stats.simulatedNetworkLatency;
    if (latency < 100) return 'excellent';
    if (latency < 300) return 'good';
    if (latency < 800) return 'fair';
    return 'poor';
}

// Handle simulator events
function handleSimulatorEvent(e: CustomEvent) {
    const { type, timestamp } = e.detail;

    let title, description;

    switch (type) {
        case 'networkCongestion':
            title = 'Network Congestion';
            description = 'The simulated blockchain network is experiencing high traffic. Transactions may be delayed.';
            break;
        case 'priceSpike':
            title = 'Price Spike';
            description = 'A sudden price change has been detected. Market volatility increased.';
            break;
        case 'serviceMaintenance':
            title = 'Service Maintenance';
            description = 'A simulated service maintenance has begun. Some features may be temporarily unavailable.';
            break;
        case 'tokenReward':
            title = 'Token Reward';
            description = 'You received a surprise token reward!';
            break;
        case 'specialOffer':
            title = 'Special Offer';
            description = 'A limited-time special offer is available for token minting.';
            break;
        default:
            title = 'Unknown Event';
            description = 'An unrecognized event occurred in the simulator.';
    }

    addEvent({
        type: 'random',
        timestamp,
        title,
        description
    });
}

onMounted(() => {
    // Add initial system event
    addEvent({
        type: 'system',
        timestamp: Date.now(),
        title: 'Simulation Active',
        description: 'The simulator is now running and generating events.'
    });

    // Listen for simulator events
    document.addEventListener('simulator:event', handleSimulatorEvent as EventListener);
});

onUnmounted(() => {
    document.removeEventListener('simulator:event', handleSimulatorEvent as EventListener);
});
</script>

<style scoped>
.simulator-events-log {
    display: flex;
    flex-direction: column;
    height: 400px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    overflow: hidden;
}

.log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    background-color: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
}

.log-header h3 {
    margin: 0;
    font-size: 1rem;
}

.clear-btn {
    background: none;
    border: none;
    color: #2196f3;
    cursor: pointer;
    font-size: 0.9rem;
}

.clear-btn:hover {
    text-decoration: underline;
}

.log-container {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    background-color: #fafafa;
}

.empty-log {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #9e9e9e;
    font-style: italic;
}

.events-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.event-item {
    display: flex;
    align-items: flex-start;
    padding: 10px;
    border-radius: 4px;
    background-color: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    position: relative;
    overflow: hidden;
}

.event-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
}

.event-item.transaction::before {
    background-color: #2196f3;
}

.event-item.essence::before {
    background-color: #9c27b0;
}

.event-item.network::before {
    background-color: #ff9800;
}

.event-item.error::before {
    background-color: #f44336;
}

.event-item.system::before {
    background-color: #607d8b;
}

.event-item.random::before {
    background-color: #4caf50;
}

.event-time {
    font-size: 0.8rem;
    color: #9e9e9e;
    width: 80px;
    flex-shrink: 0;
}

.event-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background-color: #f5f5f5;
    border-radius: 50%;
    margin-right: 12px;
}

.event-content {
    flex: 1;
    min-width: 0;
}

.event-title {
    font-weight: 600;
    margin-bottom: 4px;
}

.event-description {
    font-size: 0.9rem;
    color: #616161;
}

.log-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    background-color: #f5f5f5;
    border-top: 1px solid #e0e0e0;
}

.network-info {
    display: flex;
    align-items: center;
    gap: 6px;
}

.network-label {
    font-size: 0.8rem;
    color: #757575;
}

.network-status {
    font-size: 0.8rem;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 10px;
}

.network-status.offline {
    background-color: #9e9e9e;
    color: white;
}

.network-status.excellent {
    background-color: #4caf50;
    color: white;
}

.network-status.good {
    background-color: #8bc34a;
    color: white;
}

.network-status.fair {
    background-color: #ff9800;
    color: white;
}

.network-status.poor {
    background-color: #f44336;
    color: white;
}

.events-count {
    font-size: 0.8rem;
    color: #757575;
}
</style>
