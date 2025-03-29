<template>
    <div class="simulator-control" :class="theme">
        <div class="header">
            <h3 class="title">
                <i class="fas fa-robot"></i>
                Web3 Simulator
                <span v-if="simulatorService.isActive.value" class="status active">Active</span>
                <span v-else class="status inactive">Inactive</span>
            </h3>
            <div class="actions">
                <button v-if="!simulatorService.isActive.value" class="btn start-btn" @click="startSimulation"
                    :disabled="loading">
                    <i class="fas fa-play"></i> Start Simulation
                </button>
                <button v-else class="btn stop-btn" @click="stopSimulation">
                    <i class="fas fa-stop"></i> Stop Simulation
                </button>
            </div>
        </div>

        <div class="simulation-stats">
            <div class="stat-group">
                <div class="stat-item">
                    <div class="stat-label">Runtime</div>
                    <div class="stat-value">{{ formatDuration(runtimeSeconds) }}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Transactions</div>
                    <div class="stat-value">{{ simulatorService.stats.totalTransactions }}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Essence</div>
                    <div class="stat-value">{{ simulatorService.stats.totalEssenceGenerated.toFixed(2) }}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Streaming</div>
                    <div class="stat-value">{{ formatDuration(simulatorService.stats.totalStreamingTime) }}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Fees Saved</div>
                    <div class="stat-value">{{ simulatorService.stats.totalFeesSaved.toFixed(5) }} ETH</div>
                </div>
            </div>
        </div>

        <div v-if="expanded" class="settings-panel">
            <h4>Simulation Settings</h4>

            <div class="settings-form">
                <div class="form-group">
                    <label for="transactionInterval">Transaction Interval (seconds)</label>
                    <input id="transactionInterval" type="range" min="5" max="120" step="5"
                        v-model.number="localSettings.transactionInterval" @change="updateSettings">
                    <span class="value-display">{{ localSettings.transactionInterval / 1000 }}s</span>
                </div>

                <div class="form-group">
                    <label for="essenceRate">Essence Generation Rate (per minute)</label>
                    <input id="essenceRate" type="range" min="0.1" max="10" step="0.1"
                        v-model.number="localSettings.essenceGenerationRate" @change="updateSettings">
                    <span class="value-display">{{ localSettings.essenceGenerationRate.toFixed(1) }}</span>
                </div>

                <div class="form-group">
                    <label for="volatility">Price Volatility</label>
                    <input id="volatility" type="range" min="0" max="1" step="0.05"
                        v-model.number="localSettings.volatility" @change="updateSettings">
                    <span class="value-display">{{ (localSettings.volatility * 100).toFixed(0) }}%</span>
                </div>

                <div class="form-group">
                    <label for="successRate">Transaction Success Rate</label>
                    <input id="successRate" type="range" min="0.5" max="1" step="0.01"
                        v-model.number="localSettings.transactionSuccessRate" @change="updateSettings">
                    <span class="value-display">{{ (localSettings.transactionSuccessRate * 100).toFixed(0) }}%</span>
                </div>

                <div class="form-group checkbox">
                    <input id="randomEvents" type="checkbox" v-model="localSettings.enableRandomEvents"
                        @change="updateSettings">
                    <label for="randomEvents">Enable Random Events</label>
                </div>

                <div class="form-group checkbox">
                    <input id="networkDelays" type="checkbox" v-model="localSettings.enableNetworkDelays"
                        @change="updateSettings">
                    <label for="networkDelays">Simulate Network Delays</label>
                </div>

                <div class="form-group checkbox">
                    <input id="haskellEngine" type="checkbox" v-model="localSettings.useHaskellEngine"
                        @change="updateSettings">
                    <label for="haskellEngine">Use Haskell Engine (Advanced)</label>
                </div>
            </div>

            <div class="manual-actions">
                <button class="btn secondary" @click="triggerRandomEvent">
                    <i class="fas fa-dice"></i> Trigger Random Event
                </button>
                <button class="btn danger" @click="resetStats">
                    <i class="fas fa-redo"></i> Reset Stats
                </button>
            </div>
        </div>

        <div class="panel-toggle" @click="expanded = !expanded">
            <i :class="expanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
            {{ expanded ? 'Hide Settings' : 'Show Settings' }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, reactive, onUnmounted, onMounted } from 'vue';
import { simulatorService, SimulationSettings } from '@/services/simulatorService';
import { toastService } from '@/services/toastService';

const props = defineProps({
    theme: {
        type: String,
        default: 'roman-theme'
    }
});

// Get theme from injection if not provided in props
const injectedTheme = inject('currentTheme', '');
const theme = computed(() => props.theme || injectedTheme || 'roman-theme');

// Component state
const expanded = ref(false);
const loading = ref(false);
const updateTimer = ref<number | null>(null);

// Clone the simulator settings for local editing
const localSettings = reactive<SimulationSettings>({ ...simulatorService.settings });

// Calculate runtime in seconds
const runtimeSeconds = computed(() => {
    if (!simulatorService.isActive.value || !simulatorService.stats.simulationStartTime) {
        return 0;
    }
    return Math.floor((Date.now() - simulatorService.stats.simulationStartTime) / 1000);
});

// Start the simulation
function startSimulation() {
    loading.value = true;
    setTimeout(() => {
        try {
            simulatorService.startSimulation();
            toastService.success('Simulation started');

            // Update runtime display
            updateTimer.value = window.setInterval(() => {
                // This is just to trigger a reactivity update for the runtime display
                simulatorService.stats.simulatedNetworkLatency = simulatorService.stats.simulatedNetworkLatency;
            }, 1000);
        } catch (error) {
            toastService.error('Failed to start simulation');
            console.error('Simulation start error:', error);
        } finally {
            loading.value = false;
        }
    }, 500); // Simulate a slight delay for button feedback
}

// Stop the simulation
function stopSimulation() {
    try {
        simulatorService.stopSimulation();
        toastService.info('Simulation stopped');

        if (updateTimer.value) {
            clearInterval(updateTimer.value);
            updateTimer.value = null;
        }
    } catch (error) {
        toastService.error('Failed to stop simulation');
        console.error('Simulation stop error:', error);
    }
}

// Update simulation settings
function updateSettings() {
    simulatorService.updateSettings(localSettings);
    toastService.info('Simulation settings updated');
}

// Trigger a random event
function triggerRandomEvent() {
    simulatorService.triggerRandomEvent();
    toastService.info('Random event triggered');
}

// Reset simulation stats
function resetStats() {
    simulatorService.resetStats();
    toastService.info('Simulation stats reset');
}

// Format seconds into human-readable duration
function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
        return `${minutes}m ${remainingSeconds}s`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
}

// Clean up on component unmount
onUnmounted(() => {
    if (updateTimer.value) {
        clearInterval(updateTimer.value);
    }
});

// Initialize on component mount
onMounted(() => {
    // You can add initialization logic here if needed
});
</script>

<style scoped>
.simulator-control {
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
    background-color: #f8f9fa;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.title {
    display: flex;
    align-items: center;
    margin: 0;
    font-size: 1.2rem;
}

.title i {
    margin-right: 8px;
}

.status {
    margin-left: 10px;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: normal;
}

.status.active {
    background-color: #4caf50;
    color: white;
}

.status.inactive {
    background-color: #9e9e9e;
    color: white;
}

.btn {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
}

.btn i {
    font-size: 0.9em;
}

.start-btn {
    background-color: #4caf50;
    color: white;
}

.start-btn:hover {
    background-color: #43a047;
}

.stop-btn {
    background-color: #f44336;
    color: white;
}

.stop-btn:hover {
    background-color: #e53935;
}

.btn.secondary {
    background-color: #2196f3;
    color: white;
}

.btn.secondary:hover {
    background-color: #1e88e5;
}

.btn.danger {
    background-color: #ff5722;
    color: white;
}

.btn.danger:hover {
    background-color: #f4511e;
}

.simulation-stats {
    background-color: rgba(0, 0, 0, 0.04);
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 16px;
}

.stat-group {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
}

.stat-item {
    flex: 1 1 0;
    min-width: 120px;
}

.stat-label {
    font-size: 0.8rem;
    color: #757575;
    margin-bottom: 4px;
}

.stat-value {
    font-size: 1.1rem;
    font-weight: 600;
}

.settings-panel {
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    margin-top: 16px;
    padding-top: 16px;
}

.settings-panel h4 {
    margin: 0 0 16px;
    font-size: 1rem;
}

.settings-form {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.form-group label {
    font-size: 0.9rem;
    color: #555;
}

.form-group input[type="range"] {
    width: 100%;
}

.form-group.checkbox {
    flex-direction: row;
    align-items: center;
}

.form-group.checkbox input {
    margin-right: 8px;
}

.value-display {
    font-size: 0.8rem;
    color: #666;
    align-self: flex-end;
}

.manual-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
}

.panel-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    padding: 8px;
    font-size: 0.9rem;
    color: #666;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    margin-top: 16px;
    transition: all 0.2s ease;
}

.panel-toggle:hover {
    color: #333;
    background-color: rgba(0, 0, 0, 0.03);
}

/* Theme-specific styles */
.roman-theme {
    background-color: #fcf8f3;
    border: 1px solid #d5c3aa;
}

.roman-theme .title {
    font-family: 'Trajan Pro', 'Times New Roman', serif;
    color: #8B4513;
}

.roman-theme .simulation-stats {
    background-color: rgba(139, 69, 19, 0.05);
}

.roman-theme .start-btn {
    background-color: #8B4513;
}

.roman-theme .start-btn:hover {
    background-color: #7a3b10;
}

.roman-theme .panel-toggle {
    border-color: #d5c3aa;
}

/* Responsive styling */
@media (max-width: 768px) {
    .header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }

    .actions {
        width: 100%;
    }

    .btn {
        width: 100%;
    }

    .stat-group {
        flex-direction: column;
        gap: 12px;
    }

    .settings-form {
        grid-template-columns: 1fr;
    }

    .manual-actions {
        flex-direction: column;
    }
}
</style>
