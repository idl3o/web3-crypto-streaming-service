<template>
    <div class="abundance-pool-card" :class="[theme, poolTypeClass]">
        <div class="card-header">
            <div class="pool-type-badge">{{ formatPoolType(pool.type) }}</div>
            <div class="pool-status" :class="{ 'is-active': pool.active }">
                {{ pool.active ? 'Active' : 'Inactive' }}
            </div>
        </div>

        <div class="card-body">
            <h3 class="pool-name">{{ pool.name }}</h3>
            <p class="pool-description">{{ shortenDescription(pool.description) }}</p>

            <div class="pool-stats">
                <div class="stat">
                    <span class="stat-label">Total Size</span>
                    <div class="stat-value">{{ formatNumber(pool.totalTokens) }} {{ pool.tokenSymbol }}</div>
                </div>

                <div class="stat">
                    <span class="stat-label">Participants</span>
                    <div class="stat-value">{{ formatNumber(pool.participantCount) }}</div>
                </div>

                <div class="stat">
                    <span class="stat-label">Regeneration</span>
                    <div class="stat-value">{{ formatPercent(pool.regenerationRate * 100) }}/mo</div>
                </div>

                <div class="stat">
                    <span class="stat-label">Lock Period</span>
                    <div class="stat-value">{{ formatDays(pool.terms.lockPeriod) }}</div>
                </div>
            </div>

            <div class="contribution-limits">
                <div class="limit-item">
                    <span class="limit-label">Min</span>
                    <span class="limit-value">{{ pool.minimumContribution }} {{ pool.tokenSymbol }}</span>
                </div>
                <div class="limit-divider"></div>
                <div class="limit-item">
                    <span class="limit-label">Max</span>
                    <span class="limit-value">{{ pool.maximumContribution }} {{ pool.tokenSymbol }}</span>
                </div>
            </div>

            <div class="regeneration-info">
                <div class="regen-mode">
                    <i class="fas fa-sync-alt"></i>
                    <span>{{ formatRegenerationMode(pool.regenerationMode) }}</span>
                </div>
            </div>
        </div>

        <div class="card-footer">
            <div class="user-balance" v-if="userBalance">
                <span class="balance-label">Your Balance:</span>
                <span class="balance-value">{{ formatNumber(userBalance) }} {{ pool.tokenSymbol }}</span>
            </div>

            <div class="card-actions">
                <button class="action-btn primary-btn" @click="handleJoinClick" :disabled="!canJoin">
                    {{ userBalance ? 'Add More' : 'Join Pool' }}
                </button>

                <button class="action-btn secondary-btn" @click="$emit('details', pool.id)">
                    Details
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, inject } from 'vue';
import { ABUNDANCE_POOL_TYPES, REGENERATION_MODES } from '@/services/AbundanceService';

const props = defineProps({
    pool: {
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
    userBalance: {
        type: Number,
        default: null
    }
});

const emit = defineEmits(['join', 'details']);
const theme = inject('currentTheme', 'roman-theme');

// Computed
const poolTypeClass = computed(() => {
    return `type-${props.pool.type}`;
});

const canJoin = computed(() => {
    return props.walletConnected && props.pool.active;
});

// Methods
function formatPoolType(type) {
    switch (type) {
        case ABUNDANCE_POOL_TYPES.COMMUNITY:
            return 'Community';
        case ABUNDANCE_POOL_TYPES.CREATOR:
            return 'Creator';
        case ABUNDANCE_POOL_TYPES.STAKING:
            return 'Staking';
        case ABUNDANCE_POOL_TYPES.CONTRIBUTION:
            return 'Contribution';
        case ABUNDANCE_POOL_TYPES.GOVERNANCE:
            return 'Governance';
        default:
            return 'Unknown';
    }
}

function formatRegenerationMode(mode) {
    switch (mode) {
        case REGENERATION_MODES.LINEAR:
            return 'Linear Growth';
        case REGENERATION_MODES.EXPONENTIAL:
            return 'Exponential Growth';
        case REGENERATION_MODES.LOGARITHMIC:
            return 'Logarithmic Growth';
        case REGENERATION_MODES.CYCLICAL:
            return 'Cyclical Pattern';
        case REGENERATION_MODES.ADAPTIVE:
            return 'Adaptive Growth';
        default:
            return 'Standard Growth';
    }
}

function shortenDescription(description) {
    if (!description) return 'No description provided';
    return description.length > 120 ? description.substring(0, 120) + '...' : description;
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

function formatPercent(num) {
    return num.toFixed(1) + '%';
}

function formatDays(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    return `${days} days`;
}

function handleJoinClick() {
    if (!props.walletConnected) {
        emit('connect-wallet');
        return;
    }

    emit('join', props.pool.id);
}
</script>

<style scoped>
.abundance-pool-card {
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.abundance-pool-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.card-header {
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #f0f0f0;
}

.pool-type-badge {
    background-color: #f5f5f5;
    color: #555;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 500;
}

.pool-status {
    font-size: 0.8rem;
    color: #999;
}

.pool-status.is-active {
    color: #4CAF50;
}

.card-body {
    padding: 20px;
}

.pool-name {
    margin: 0 0 8px 0;
    font-size: 1.5rem;
    color: #333;
}

.pool-description {
    color: #666;
    font-size: 0.95rem;
    line-height: 1.5;
    margin-bottom: 16px;
    min-height: 3em;
}

.pool-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
}

.stat {
    display: flex;
    flex-direction: column;
}

.stat-label {
    font-size: 0.8rem;
    color: #888;
    margin-bottom: 4px;
}

.stat-value {
    font-size: 1.1rem;
    font-weight: 500;
    color: #333;
}

.contribution-limits {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f9f9f9;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 16px;
}

.limit-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
}

.limit-label {
    font-size: 0.8rem;
    color: #888;
    margin-bottom: 4px;
}

.limit-value {
    font-weight: 500;
}

.limit-divider {
    width: 1px;
    height: 30px;
    background-color: #ddd;
}

.regeneration-info {
    margin-top: 16px;
}

.regen-mode {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #666;
    font-size: 0.9rem;
}

.card-footer {
    padding: 16px 20px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.user-balance {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.9rem;
}

.balance-label {
    color: #666;
}

.balance-value {
    font-weight: 500;
}

.card-actions {
    display: flex;
    gap: 12px;
}

.action-btn {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    font-size: 0.95rem;
}

.action-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.primary-btn {
    background-color: #4CAF50;
    color: white;
}

.primary-btn:hover:not(:disabled) {
    background-color: #3e9c42;
}

.secondary-btn {
    background-color: #f0f0f0;
    color: #333;
}

.secondary-btn:hover {
    background-color: #e0e0e0;
}

/* Pool type specific styling */
.type-community {
    border-top: 4px solid #2196F3;
}

.type-community .pool-type-badge {
    background-color: rgba(33, 150, 243, 0.1);
    color: #2196F3;
}

.type-creator {
    border-top: 4px solid #9C27B0;
}

.type-creator .pool-type-badge {
    background-color: rgba(156, 39, 176, 0.1);
    color: #9C27B0;
}

.type-staking {
    border-top: 4px solid #FF9800;
}

.type-staking .pool-type-badge {
    background-color: rgba(255, 152, 0, 0.1);
    color: #FF9800;
}

.type-contribution {
    border-top: 4px solid #4CAF50;
}

.type-contribution .pool-type-badge {
    background-color: rgba(76, 175, 80, 0.1);
    color: #4CAF50;
}

.type-governance {
    border-top: 4px solid #607D8B;
}

.type-governance .pool-type-badge {
    background-color: rgba(96, 125, 139, 0.1);
    color: #607D8B;
}

/* Roman theme */
.roman-theme.abundance-pool-card {
    background-color: rgba(255, 252, 245, 1);
}

.roman-theme .pool-name {
    color: var(--primary-color, #8B4513);
    font-family: var(--heading-font);
}

.roman-theme .primary-btn {
    background-color: var(--primary-color, #8B4513);
}

.roman-theme .primary-btn:hover:not(:disabled) {
    background-color: var(--primary-dark-color, #704012);
}

.roman-theme.type-community {
    border-top: 4px solid var(--primary-color, #8B4513);
}

.roman-theme.type-creator {
    border-top: 4px solid var(--accent-color, #A0522D);
}

.roman-theme.type-staking {
    border-top: 4px solid var(--secondary-color, #CD853F);
}

.roman-theme.type-contribution {
    border-top: 4px solid var(--tertiary-color, #D2B48C);
}

.roman-theme.type-governance {
    border-top: 4px solid var(--quaternary-color, #DEB887);
}
</style>
