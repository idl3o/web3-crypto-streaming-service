<template>
    <div class="governance-dashboard" :class="theme">
        <div class="dashboard-header">
            <h2>Governance Dashboard</h2>
            <p class="subtitle">Track proposals, vote, and shape the future of the platform</p>
        </div>

        <div class="proposals-section">
            <h3>Active Proposals</h3>
            <div class="proposal-list">
                <!-- List of active proposals -->
            </div>
        </div>

        <div class="analytics-section">
            <h3>Governance Analytics</h3>
            <!-- Charts and stats about governance participation -->
        </div>
    </div>
</template>

<script setup>
import { inject } from 'vue';

const theme = inject('currentTheme', 'roman-theme');
</script>

<style scoped>
.governance-dashboard {
    padding: 20px;
}

.dashboard-header {
    margin-bottom: 20px;
}

.dashboard-header h2 {
    margin: 0;
    font-size: 2rem;
}

.dashboard-header .subtitle {
    color: #777;
    font-size: 1rem;
}

.proposals-section {
    margin-bottom: 30px;
}

.proposals-section h3 {
    margin-top: 0;
    font-size: 1.5rem;
}

.analytics-section h3 {
    margin-top: 0;
    font-size: 1.5rem;
}
</style>
