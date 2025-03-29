<template>
    <div class="simulator-view container py-4">
        <h1 class="page-title">Web3 Crypto Simulator</h1>

        <div class="row">
            <div class="col-md-8 offset-md-2">
                <div class="alert info-alert">
                    <i class="fas fa-info-circle"></i>
                    <div>
                        <strong>Developer Mode</strong>
                        <p>This simulator lets you test the app without real blockchain transactions. Use it to explore
                            features, test the UI, and simulate various scenarios.</p>
                    </div>
                </div>

                <SimulatorControl :theme="currentTheme" />

                <div class="card">
                    <div class="card-header">
                        <h2><i class="fas fa-chart-line"></i> Live Activity</h2>
                    </div>
                    <div class="card-body">
                        <SimulatorEventsLog v-if="simulatorService.isActive.value" />
                        <div v-else class="empty-state">
                            <i class="fas fa-power-off"></i>
                            <p>Start the simulator to see live activity</p>
                        </div>
                    </div>
                </div>

                <div class="card mt-4">
                    <div class="card-header">
                        <h2><i class="fas fa-cog"></i> Configuration</h2>
                    </div>
                    <div class="card-body">
                        <h3>Development Environment</h3>
                        <p>This simulator is using the following configuration:</p>
                        <ul>
                            <li><strong>Network:</strong> Local Simulator (No real blockchain)</li>
                            <li><strong>API:</strong> Mocked responses</li>
                            <li><strong>Data:</strong> In-memory storage (cleared on refresh)</li>
                        </ul>

                        <h3 class="mt-4">Getting Started</h3>
                        <ol>
                            <li>Click <strong>Start Simulation</strong> to begin generating simulated activity</li>
                            <li>Adjust the settings to control transaction frequency, volatility, and more</li>
                            <li>Use the app normally - all blockchain interactions will be simulated</li>
                            <li>Check the transaction log and your wallet balance to see the effects</li>
                        </ol>

                        <div class="alert warning-alert mt-3">
                            <i class="fas fa-exclamation-triangle"></i>
                            <div>
                                <strong>Developer Note</strong>
                                <p>All transactions are simulated and do not involve real cryptocurrencies. Your actual
                                    wallet will not be affected.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import SimulatorControl from '@/components/simulator/SimulatorControl.vue';
import SimulatorEventsLog from '@/components/simulator/SimulatorEventsLog.vue';
import { simulatorService } from '@/services/simulatorService';

const currentTheme = inject('currentTheme', 'roman-theme');
</script>

<style scoped>
.simulator-view {
    margin-bottom: 60px;
}

.page-title {
    margin-bottom: 1.5rem;
    font-weight: 700;
}

.card {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 1.5rem;
}

.card-header {
    padding: 1rem;
    background-color: #f5f5f5;
    border-bottom: 1px solid #ddd;
}

.card-header h2 {
    margin: 0;
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.card-body {
    padding: 1.5rem;
    background-color: #fff;
}

h3 {
    font-size: 1.1rem;
    margin-bottom: 1rem;
}

.alert {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
}

.alert i {
    font-size: 1.5rem;
    align-self: flex-start;
}

.alert strong {
    display: block;
    margin-bottom: 0.5rem;
}

.alert p {
    margin: 0;
}

.info-alert {
    background-color: rgba(33, 150, 243, 0.1);
    border-left: 4px solid #2196f3;
}

.warning-alert {
    background-color: rgba(255, 152, 0, 0.1);
    border-left: 4px solid #ff9800;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    color: #9e9e9e;
    text-align: center;
}

.empty-state i {
    font-size: 2.5rem;
    margin-bottom: 1rem;
}
</style>
