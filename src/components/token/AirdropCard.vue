<template>
    <div class="airdrop-card" :class="[theme, { 'is-claimed': claimed, 'is-inactive': !isActive }]">
        <!-- Status badge -->
        <div class="status-badge" :class="statusClass">
            {{ formatStatus(airdrop.status) }}
        </div>

        <!-- Card header with image -->
        <div class="card-header">
            <div class="airdrop-image">
                <img :src="airdropImage" :alt="airdrop.title">
            </div>
            <div class="token-info">
                <div class="token-symbol">{{ airdrop.tokenSymbol }}</div>
                <div class="token-amount">{{ airdrop.tokenAmount }}</div>
            </div>
        </div>

        <!-- Card content -->
        <div class="card-content">
            <h3 class="airdrop-title">{{ airdrop.title }}</h3>
            <p class="airdrop-description">{{ airdrop.description }}</p>

            <!-- Period information -->
            <div class="airdrop-period">
                <div class="date-range">
                    <span class="date-label">Start:</span>
                    <span class="date-value">{{ formatDate(airdrop.startDate) }}</span>
                </div>
                <div class="date-range">
                    <span class="date-label">End:</span>
                    <span class="date-value">{{ formatDate(airdrop.endDate) }}</span>
                </div>
            </div>

            <!-- Progress bar for distribution -->
            <div class="distribution-progress">
                <div class="progress-label">
                    <span>Distribution progress</span>
                    <span>{{ distributionPercentage }}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: distributionPercentage + '%' }"></div>
                </div>
                <div class="progress-stats">
                    <span>{{ formatNumber(airdrop.distributedSupply) }}</span>
                    <span>/ {{ formatNumber(airdrop.totalSupply) }}</span>
                </div>
            </div>

            <!-- Eligibility criteria -->
            <div class="eligibility-section">
                <h4>Eligibility Criteria:</h4>
                <ul class="criteria-list">
                    <li v-for="(criterion, index) in airdrop.eligibilityCriteria" :key="index">
                        {{ criterion.description }}
                    </li>
                </ul>
            </div>

            <!-- Claim button -->
            <div class="claim-section">
                <template v-if="isActive && !claimed && walletConnected">
                    <template v-if="eligibilityChecked">
                        <button v-if="isEligible" class="claim-button" :disabled="claiming" @click="claimAirdrop">
                            <span v-if="!claiming">Claim {{ airdrop.tokenAmount }} {{ airdrop.tokenSymbol }}</span>
                            <span v-else><i class="fas fa-spinner fa-spin"></i> Claiming...</span>
                        </button>
                        <div v-else class="not-eligible">
                            <i class="fas fa-times-circle"></i>
                            <span>{{ eligibilityReason }}</span>
                        </div>
                    </template>
                    <button v-else class="check-button" :disabled="checkingEligibility" @click="checkEligibility">
                        <span v-if="!checkingEligibility">Check Eligibility</span>
                        <span v-else><i class="fas fa-spinner fa-spin"></i> Checking...</span>
                    </button>
                </template>
                <div v-else-if="!walletConnected" class="connect-wallet-prompt">
                    <button class="connect-button" @click="$emit('connect-wallet')">
                        Connect Wallet to Check Eligibility
                    </button>
                </div>
                <div v-else-if="claimed" class="claimed-status">
                    <i class="fas fa-check-circle"></i>
                    <span>Claimed</span>
                </div>
                <div v-else class="inactive-status">
                    <span>{{ getInactiveMessage() }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue';
import { checkEligibility, claimAirdrop, AIRDROP_STATUS } from '@/services/AirdropService';

const props = defineProps({
    airdrop: {
        type: Object,
        required: true
    },
    walletConnected: {
        type: Boolean,
        default: false
    },
    walletAddress: {
        type: String,
        default: ''
    },
    claimed: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['claim', 'connect-wallet', 'check-eligibility']);
const theme = inject('currentTheme', 'roman-theme');

// State
const eligibilityChecked = ref(false);
const isEligible = ref(false);
const eligibilityReason = ref('');
const eligibilityData = ref(null);
const checkingEligibility = ref(false);
const claiming = ref(false);

// Computed
const isActive = computed(() => {
    return props.airdrop.status === AIRDROP_STATUS.ACTIVE;
});

const statusClass = computed(() => {
    switch (props.airdrop.status) {
        case AIRDROP_STATUS.ACTIVE: return 'status-active';
        case AIRDROP_STATUS.UPCOMING: return 'status-upcoming';
        case AIRDROP_STATUS.COMPLETED: return 'status-completed';
        case AIRDROP_STATUS.CANCELLED: return 'status-cancelled';
        default: return '';
    }
});

const distributionPercentage = computed(() => {
    if (!props.airdrop.totalSupply || props.airdrop.totalSupply === 0) return 0;
    return Math.min(100, Math.round((props.airdrop.distributedSupply / props.airdrop.totalSupply) * 100));
});

const airdropImage = computed(() => {
    return props.airdrop.imageUrl || 'https://via.placeholder.com/300x150?text=Airdrop';
});

// Methods
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function formatStatus(status) {
    switch (status) {
        case AIRDROP_STATUS.ACTIVE: return 'Active';
        case AIRDROP_STATUS.UPCOMING: return 'Upcoming';
        case AIRDROP_STATUS.COMPLETED: return 'Completed';
        case AIRDROP_STATUS.CANCELLED: return 'Cancelled';
        default: return status;
    }
}

function formatNumber(num) {
    if (num === undefined || num === null) return '0';

    return new Intl.NumberFormat().format(num);
}

function getInactiveMessage() {
    if (props.airdrop.status === AIRDROP_STATUS.UPCOMING) {
        return 'Airdrop has not started yet';
    } else if (props.airdrop.status === AIRDROP_STATUS.COMPLETED) {
        return 'Airdrop has ended';
    } else if (props.airdrop.status === AIRDROP_STATUS.CANCELLED) {
        return 'Airdrop was cancelled';
    }
    return 'Airdrop is not active';
}

async function checkEligibility() {
    if (!props.walletConnected || !props.walletAddress) {
        emit('connect-wallet');
        return;
    }

    checkingEligibility.value = true;

    try {
        const result = await checkEligibility(props.airdrop.id, props.walletAddress);

        eligibilityChecked.value = true;
        isEligible.value = result.eligible;
        eligibilityReason.value = result.reason || '';
        eligibilityData.value = result;

        emit('check-eligibility', {
            airdropId: props.airdrop.id,
            eligible: result.eligible,
            reason: result.reason,
            data: result
        });
    } catch (error) {
        console.error('Error checking eligibility:', error);
        isEligible.value = false;
        eligibilityReason.value = 'Error checking eligibility';
    } finally {
        checkingEligibility.value = false;
    }
}

async function claimAirdrop() {
    if (!props.walletConnected || !props.walletAddress) {
        emit('connect-wallet');
        return;
    }

    claiming.value = true;

    try {
        const result = await claimAirdrop(props.airdrop.id, props.walletAddress);

        emit('claim', {
            airdropId: props.airdrop.id,
            success: true,
            txHash: result.txHash,
            amount: result.amount,
            tokenSymbol: result.tokenSymbol
        });
    } catch (error) {
        console.error('Error claiming airdrop:', error);
        emit('claim', {
            airdropId: props.airdrop.id,
            success: false,
            error: error.message || 'Failed to claim airdrop'
        });
    } finally {
        claiming.value = false;
    }
}

// If wallet is connected, check eligibility automatically
onMounted(() => {
    if (props.walletConnected && props.walletAddress && isActive.value && !props.claimed) {
        checkEligibility();
    }
});
</script>

<style scoped>
.airdrop-card {
    background-color: white;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    position: relative;
    border: 1px solid #e0e0e0;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.airdrop-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

/* Status badge */
.status-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 500;
    z-index: 2;
}

.status-active {
    background-color: rgba(46, 204, 113, 0.8);
    color: white;
}

.status-upcoming {
    background-color: rgba(52, 152, 219, 0.8);
    color: white;
}

.status-completed {
    background-color: rgba(142, 142, 142, 0.8);
    color: white;
}

.status-cancelled {
    background-color: rgba(231, 76, 60, 0.8);
    color: white;
}

/* Card header */
.card-header {
    position: relative;
}

.airdrop-image {
    height: 120px;
    overflow: hidden;
}

.airdrop-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* Token info */
.token-info {
    position: absolute;
    left: 10px;
    bottom: 10px;
    background-color: rgba(0, 0, 0, 0.7);
    padding: 5px 10px;
    border-radius: 5px;
    color: white;
    display: flex;
    align-items: center;
    gap: 5px;
}

.token-symbol {
    font-weight: 600;
    font-size: 0.8rem;
}

.token-amount {
    font-size: 0.9rem;
    font-weight: 700;
}

/* Card content */
.card-content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}

.airdrop-title {
    font-size: 1.1rem;
    margin: 0 0 10px 0;
}

.airdrop-description {
    font-size: 0.9rem;
    color: #555;
    margin: 0 0 12px 0;
    flex-grow: 1;
}

/* Period information */
.airdrop-period {
    margin-bottom: 12px;
    font-size: 0.85rem;
    color: #666;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.date-label {
    font-weight: 600;
    margin-right: 4px;
}

/* Progress bar */
.distribution-progress {
    margin-bottom: 15px;
}

.progress-label {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    margin-bottom: 4px;
    color: #666;
}

.progress-bar {
    height: 8px;
    background-color: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background-color: #4CAF50;
    border-radius: 4px;
    transition: width 0.3s ease;
}

.progress-stats {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    margin-top: 4px;
    color: #777;
}

/* Eligibility criteria */
.eligibility-section {
    margin-bottom: 15px;
}

.eligibility-section h4 {
    font-size: 0.9rem;
    margin: 0 0 6px 0;
}

.criteria-list {
    list-style-type: none;
    padding-left: 0;
    margin: 0;
}

.criteria-list li {
    font-size: 0.85rem;
    color: #555;
    margin-bottom: 4px;
    position: relative;
    padding-left: 16px;
}

.criteria-list li::before {
    content: "•";
    position: absolute;
    left: 0;
    color: #666;
}

/* Claim section */
.claim-section {
    margin-top: auto;
    text-align: center;
}

.claim-button,
.check-button,
.connect-button {
    width: 100%;
    padding: 10px;
    border-radius: 5px;
    border: none;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
}

.claim-button {
    background-color: #4CAF50;
    color: white;
}

.claim-button:hover:not(:disabled) {
    background-color: #3d8b40;
}

.check-button {
    background-color: #2196F3;
    color: white;
}

.check-button:hover:not(:disabled) {
    background-color: #0b7dda;
}

.connect-button {
    background-color: #FF9800;
    color: white;
}

.connect-button:hover {
    background-color: #e68a00;
}

button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.not-eligible,
.claimed-status,
.inactive-status {
    padding: 10px;
    border-radius: 5px;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.not-eligible {
    background-color: #FFEBEE;
    color: #D32F2F;
    border: 1px solid #FFCDD2;
}

.claimed-status {
    background-color: #E8F5E9;
    color: #388E3C;
    border: 1px solid #C8E6C9;
}

.inactive-status {
    background-color: #ECEFF1;
    color: #607D8B;
    border: 1px solid #CFD8DC;
}

i.fa-spinner {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

/* States */
.airdrop-card.is-claimed .airdrop-image::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1;
}

.airdrop-card.is-claimed .airdrop-image::before {
    content: 'CLAIMED';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-45deg);
    color: white;
    font-size: 1.5rem;
    font-weight: bold;
    z-index: 2;
    text-shadow: 0 0 10px rgba(0, 0, 0, 0.7);
}

.airdrop-card.is-inactive {
    opacity: 0.8;
}

/* Roman theme styles */
.airdrop-card.roman-theme {
    border: 1px solid var(--border-color);
    box-shadow: 0 2px 8px rgba(139, 69, 19, 0.05);
}

.roman-theme .claim-button {
    background-color: var(--primary-color);
}

.roman-theme .claim-button:hover:not(:disabled) {
    background-color: #6B4226;
}

.roman-theme .check-button {
    background-color: #8B6914;
}

.roman-theme .check-button:hover:not(:disabled) {
    background-color: #6B4226;
}

.roman-theme .connect-button {
    background-color: #CD853F;
}

.roman-theme .connect-button:hover {
    background-color: #A0522D;
}

.roman-theme .airdrop-title,
.roman-theme .eligibility-section h4 {
    color: var(--primary-color);
    font-family: var(--heading-font);
}

.roman-theme .progress-fill {
    background-color: var(--primary-color);
}

.roman-theme .claimed-status {
    background-color: rgba(139, 69, 19, 0.1);
    color: var(--primary-color);
    border: 1px solid rgba(139, 69, 19, 0.2);
}
</style>
