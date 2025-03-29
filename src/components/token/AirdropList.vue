<template>
    <div class="airdrop-list" :class="theme">
        <div class="list-header">
            <h2>Available Airdrops</h2>
            <p class="subtitle">Claim your free tokens and participate in the community</p>

            <div class="header-actions">
                <button class="refresh-btn" @click="loadAirdrops" :disabled="isLoading">
                    <i class="fas fa-sync" :class="{ 'fa-spin': isLoading }"></i>
                    Refresh
                </button>
            </div>
        </div>

        <div class="list-body">
            <div v-if="isLoading" class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading airdrops...</span>
            </div>

            <div v-else-if="airdrops.length === 0" class="empty-state">
                <i class="fas fa-gift"></i>
                <h3>No airdrops available</h3>
                <p>Check back later for new opportunities</p>
            </div>

            <div v-else class="airdrop-grid">
                <airdrop-card v-for="airdrop in airdrops" :key="airdrop.id" :airdrop="airdrop"
                    :wallet-connected="walletConnected" :wallet-address="walletAddress" :claimed="isClaimed(airdrop.id)"
                    @claim="handleAirdropClaim" @connect-wallet="emit('connect-wallet')"
                    @check-eligibility="handleCheckEligibility" />
            </div>
        </div>

        <div class="fee-metrics">
            <h3>Fee Payment Metrics</h3>
            <p>Track your fee payments and usage statistics here.</p>
            <div class="metrics">
                <div class="metric-item">
                    <span class="metric-label">Total Fees Paid:</span>
                    <span class="metric-value">{{ formatNumber(totalFeesPaid) }} $STREAM</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Average Fee Per Claim:</span>
                    <span class="metric-value">{{ formatNumber(averageFeePerClaim) }} $STREAM</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import AirdropCard from './AirdropCard.vue';
import { getActiveAirdrops } from '@/services/AirdropService';

const props = defineProps({
    walletConnected: {
        type: Boolean,
        default: false
    },
    walletAddress: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['claim', 'connect-wallet', 'check-eligibility']);
const theme = inject('currentTheme', 'roman-theme');

// State
const airdrops = ref([]);
const isLoading = ref(false);
const claimedAirdrops = ref(new Set());
const totalFeesPaid = ref(50); // Mock data
const averageFeePerClaim = ref(2); // Mock data

// Computed
const hasAirdrops = computed(() => airdrops.value.length > 0);

// Methods
async function loadAirdrops() {
    isLoading.value = true;

    try {
        airdrops.value = await getActiveAirdrops();
    } catch (error) {
        console.error('Error loading airdrops:', error);
    } finally {
        isLoading.value = false;
    }
}

function handleAirdropClaim(event) {
    // Handle claim event
    claimedAirdrops.value.add(event.airdropId);

    // Emit to parent
    emit('claim', event);
}

function handleCheckEligibility(event) {
    // Handle check eligibility event
    console.log('Eligibility checked:', event);

    // Emit to parent
    emit('check-eligibility', event);
}

function isClaimed(airdropId) {
    return claimedAirdrops.value.has(airdropId);
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

// Lifecycle hooks
onMounted(() => {
    loadAirdrops();
});
</script>

<style scoped>
.airdrop-list {
    background-color: white;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100%;
}

.list-header {
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
}

.list-header h2 {
    margin: 0 0 8px 0;
    font-size: 1.5rem;
}

.list-header .subtitle {
    color: #777;
    font-size: 0.9rem;
    margin: 0;
}

.header-actions {
    margin-top: 12px;
    text-align: right;
}

.refresh-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 5px;
    background-color: #f0f0f0;
    cursor: pointer;
    transition: background-color 0.2s;
}

.refresh-btn:hover:not(:disabled) {
    background-color: #ddd;
}

.list-body {
    padding: 20px;
    flex-grow: 1;
}

.loading-state,
.empty-state {
    text-align: center;
    color: #999;
    padding: 30px;
}

.loading-state i,
.empty-state i {
    font-size: 3rem;
    margin-bottom: 10px;
}

.airdrop-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    height: 100%;
}

.fee-metrics {
    padding: 20px;
    border-top: 1px solid #e0e0e0;
    background-color: #f9f9f9;
    text-align: center;
}

.fee-metrics h3 {
    margin: 0 0 10px 0;
    font-size: 1.2rem;
    color: #333;
}

.fee-metrics p {
    margin: 0;
    color: #666;
    font-size: 0.9rem;
}

.fee-metrics .metrics {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.fee-metrics .metric-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.fee-metrics .metric-label {
    font-size: 1.1rem;
    color: #555;
}

.fee-metrics .metric-value {
    font-size: 1.3rem;
    font-weight: 500;
    color: #333;
}

/* Roman theme */
.roman-theme .list-header {
    border-bottom-color: var(--border-color);
}

.roman-theme .list-header h2 {
    color: var(--primary-color);
    font-family: var(--heading-font);
}

.roman-theme .refresh-btn {
    background-color: rgba(139, 69, 19, 0.1);
    color: var(--primary-color);
}

.roman-theme .refresh-btn:hover:not(:disabled) {
    background-color: rgba(139, 69, 19, 0.2);
}
</style>
