<template>
    <div class="token-view" :class="theme">
        <div class="token-header">
            <h2>$STREAM Tokens</h2>
            <p class="subtitle">Manage your tokens and participate in the ecosystem</p>
        </div>

        <div class="token-balance">
            <div class="balance-label">Your Balance:</div>
            <div class="balance-value">{{ formatBalance(tokenBalance) }} $STREAM</div>
        </div>

        <div class="token-actions">
            <button class="action-btn primary-btn" @click="openTransferDialog">
                <i class="fas fa-exchange-alt"></i> Transfer Tokens
            </button>
            <button class="action-btn secondary-btn" @click="openStakeDialog">
                <i class="fas fa-hand-holding-usd"></i> Stake Tokens
            </button>
        </div>

        <div class="airdrop-section">
            <airdrop-list :wallet-connected="walletConnected" :wallet-address="walletAddress"
                @claim="handleAirdropClaim" @connect-wallet="emit('connect-wallet')"
                @check-eligibility="handleCheckEligibility" />
        </div>

        <div class="fee-metrics">
            <h3>Fee Payment Metrics</h3>
            <p>Track your fee payments and usage statistics.</p>
            <div class="metrics">
                <div class="metric-item">
                    <span class="metric-label">Total Fees Paid:</span>
                    <span class="metric-value">{{ formatBalance(totalFeesPaid) }} $STREAM</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Average Fee Per Transaction:</span>
                    <span class="metric-value">{{ formatBalance(averageFeePerTransaction) }} $STREAM</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
// filepath: c:\Users\Sam\gh\web3-crypto-streaming-service\src\views\TokenView.vue
import { ref, computed, onMounted, inject } from 'vue';
import AirdropList from '@/components/token/AirdropList.vue';

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

const emit = defineEmits(['connect-wallet', 'token-transfer', 'token-stake']);
const theme = inject('currentTheme', 'roman-theme');

// State
const tokenBalance = ref(1500);
const showTransferDialog = ref(false);
const showStakeDialog = ref(false);
const totalFeesPaid = ref(300);
const averageFeePerTransaction = ref(15);

// Methods
function formatBalance(balance) {
    return new Intl.NumberFormat().format(balance);
}

function openTransferDialog() {
    showTransferDialog.value = true;
}

function closeTransferDialog() {
    showTransferDialog.value = false;
}

function openStakeDialog() {
    showStakeDialog.value = true;
}

function closeStakeDialog() {
    showStakeDialog.value = false;
}

function handleAirdropClaim(event) {
    // Handle airdrop claim event
    console.log('Airdrop claimed:', event);

    // Update token balance (simulation)
    tokenBalance.value += event.amount;

    // Emit to parent
    emit('token-transfer', {
        to: props.walletAddress,
        amount: event.amount,
        tokenSymbol: event.tokenSymbol,
        type: 'airdrop'
    });
}

function handleCheckEligibility(event) {
    // Handle check eligibility event
    console.log('Eligibility checked:', event);
}
</script>

<style scoped>
// filepath: c:\Users\Sam\gh\web3-crypto-streaming-service\src\views\TokenView.vue
.token-view {
    padding: 20px;
}

.token-header {
    margin-bottom: 20px;
}

.token-header h2 {
    margin: 0;
    font-size: 2rem;
}

.token-header .subtitle {
    color: #777;
    font-size: 1rem;
}

.token-balance {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 12px 16px;
    background-color: #f5f5f5;
    border-radius: 8px;
}

.token-balance .balance-label {
    font-size: 1.1rem;
    color: #555;
}

.token-balance .balance-value {
    font-size: 1.3rem;
    font-weight: 500;
    color: #333;
}

.token-actions {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
}

.action-btn {
    padding: 10px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
}

.action-btn i {
    font-size: 1.2rem;
}

.primary-btn {
    background-color: #4CAF50;
    color: white;
}

.secondary-btn {
    background-color: #f0f0f0;
    color: #333;
}

.airdrop-section {
    flex-grow: 1;
}

.fee-metrics {
    margin-top: 20px;
    padding: 12px 16px;
    background-color: #f9f9f9;
    border-radius: 8px;
}

.fee-metrics h3 {
    margin: 0 0 10px;
    font-size: 1.5rem;
    color: #333;
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
.roman-theme .token-header h2 {
    color: var(--primary-color, #8B4513);
    font-family: var(--heading-font);
}

.roman-theme .token-balance {
    background-color: rgba(255, 252, 245, 0.8);
}

.roman-theme .primary-btn {
    background-color: var(--primary-color, #8B4513);
}

.roman-theme .secondary-btn {
    background-color: var(--secondary-color, #CD853F);
    color: white;
}

.roman-theme .fee-metrics {
    background-color: rgba(255, 252, 245, 0.9);
}
</style>
