<template>
    <div class="transaction-cell" :class="[theme, getStatusClass(transaction.status)]">
        <div class="cell-icon" :class="getIconClass(transaction.type)">
            <i :class="getIcon(transaction.type)"></i>
        </div>

        <div class="cell-content">
            <div class="cell-header">
                <h5 class="tx-title">{{ getTitle(transaction) }}</h5>
                <div class="tx-amount" :class="getAmountClass(transaction)">
                    {{ formatAmount(transaction) }}
                </div>
            </div>

            <div class="cell-details">
                <div class="tx-content">{{ transaction.contentTitle || 'N/A' }}</div>
                <div class="tx-time">{{ formatTime(transaction.timestamp) }}</div>
            </div>

            <div v-if="transaction.discountApplied && transaction.discountApplied > 0" class="discount-info">
                <span class="discount-badge">
                    {{ (transaction.discountApplied * 100).toFixed(0) }}% Discount
                </span>
            </div>

            <div v-if="transaction.faeEssence" class="essence-info">
                <span class="essence-badge">
                    +{{ transaction.faeEssence.toFixed(2) }} Essence
                </span>
            </div>
        </div>

        <div class="cell-footer">
            <span class="status-badge" :class="getStatusClass(transaction.status)">
                {{ transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1) }}
            </span>

            <div class="status-actions">
                <button class="cell-details-btn" @click="$emit('view-details')">
                    <i class="fas fa-info-circle"></i>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { PropType } from 'vue';
import { Transaction, TransactionType } from '@/services/transactionService';

const props = defineProps({
    transaction: {
        type: Object as PropType<Transaction>,
        required: true
    },
    theme: {
        type: String,
        default: 'roman-theme'
    }
});

defineEmits(['view-details']);

function getIcon(type: TransactionType): string {
    switch (type) {
        case TransactionType.STREAM_PAYMENT:
            return 'fas fa-play-circle';
        case TransactionType.ESSENCE_EARNED:
            return 'fas fa-star';
        case TransactionType.TOKEN_MINTED:
            return 'fas fa-coins';
        case TransactionType.TOKEN_ENCHANTED:
            return 'fas fa-magic';
        case TransactionType.FEE_DISCOUNT:
            return 'fas fa-percentage';
        default:
            return 'fas fa-exchange-alt';
    }
}

function getIconClass(type: TransactionType): string {
    switch (type) {
        case TransactionType.STREAM_PAYMENT:
            return 'icon-payment';
        case TransactionType.ESSENCE_EARNED:
            return 'icon-essence';
        case TransactionType.TOKEN_MINTED:
            return 'icon-token';
        case TransactionType.TOKEN_ENCHANTED:
            return 'icon-enchant';
        case TransactionType.FEE_DISCOUNT:
            return 'icon-discount';
        default:
            return 'icon-default';
    }
}

function getTitle(tx: Transaction): string {
    switch (tx.type) {
        case TransactionType.STREAM_PAYMENT:
            return 'Content Streaming Payment';
        case TransactionType.ESSENCE_EARNED:
            return 'Fae Essence Earned';
        case TransactionType.TOKEN_MINTED:
            return 'Fae Token Minted';
        case TransactionType.TOKEN_ENCHANTED:
            return 'Fae Token Enchanted';
        case TransactionType.FEE_DISCOUNT:
            return 'Fee Discount Applied';
        default:
            return 'Transaction';
    }
}

function getAmountClass(tx: Transaction): string {
    if (tx.type === TransactionType.STREAM_PAYMENT) {
        return 'amount-negative';
    } else if (tx.type === TransactionType.ESSENCE_EARNED) {
        return 'amount-positive';
    }
    return '';
}

function formatAmount(tx: Transaction): string {
    if (tx.type === TransactionType.STREAM_PAYMENT) {
        return `-${formatEth(tx.amount)} ETH`;
    } else if (tx.type === TransactionType.ESSENCE_EARNED && tx.faeEssence) {
        return `+${tx.faeEssence.toFixed(2)} Essence`;
    } else if (tx.type === TransactionType.TOKEN_MINTED) {
        return 'New Token';
    } else if (tx.type === TransactionType.TOKEN_ENCHANTED) {
        return 'Enchanted';
    }
    return formatEth(tx.amount);
}

function formatEth(amount: number): string {
    return amount.toFixed(6);
}

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function getStatusClass(status: string): string {
    switch (status) {
        case 'completed':
            return 'status-completed';
        case 'pending':
            return 'status-pending';
        case 'failed':
            return 'status-failed';
        default:
            return '';
    }
}
</script>

<style scoped>
/* Base cell styling */
.transaction-cell {
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100%;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.transaction-cell:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.cell-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: -1px;
    border-radius: 8px 0;
    position: absolute;
    top: 0;
    left: 0;
    font-size: 1.25rem;
}

.cell-content {
    padding: 1rem;
    padding-top: 2.5rem;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}

.cell-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
}

.tx-title {
    margin: 0;
    font-size: 0.9rem;
}

.tx-amount {
    font-weight: 600;
    font-size: 0.9rem;
}

.amount-negative {
    color: #B71C1C;
}

.amount-positive {
    color: #2E7D32;
}

.cell-details {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    margin-bottom: 0.75rem;
}

.tx-content {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 70%;
}

.tx-time {
    font-size: 0.75rem;
    color: #64748b;
}

.discount-info,
.essence-info {
    margin-top: 0.5rem;
}

.discount-badge,
.essence-badge {
    display: inline-block;
    font-size: 0.7rem;
    padding: 0.125rem 0.375rem;
    border-radius: 1rem;
    font-weight: 500;
}

.cell-footer {
    border-top: 1px solid;
    padding: 0.5rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.status-badge {
    text-transform: uppercase;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.5px;
}

.cell-details-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    font-size: 0.9rem;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.7;
    transition: opacity 0.2s ease, background-color 0.2s ease;
}

.cell-details-btn:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.05);
}

/* NEW: Engagement toggle button */
.engage-toggle-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: none;
    border: none;
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.toggle-label {
    font-size: 0.7rem;
}

.status-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

/* Roman theme styling */
.roman-theme.transaction-cell {
    background-color: #f9f5ef;
    border: 1px solid #d5c3aa;
}

.roman-theme .cell-footer {
    border-top-color: #e6d6bf;
    background-color: #fcf8f3;
}

.roman-theme .tx-title {
    font-family: 'Cinzel', serif;
    color: #5D4037;
}

.roman-theme .icon-payment {
    background: linear-gradient(to bottom, #f44336, #c62828);
    color: white;
}

.roman-theme .icon-essence,
.roman-theme .icon-token {
    background: linear-gradient(to bottom, #D4AF37, #AA8C2C);
    color: white;
}

.roman-theme .icon-enchant {
    background: linear-gradient(to bottom, #8B4513, #654321);
    color: white;
}

.roman-theme .icon-discount {
    background: linear-gradient(to bottom, #BF8970, #A0715E);
    color: white;
}

.roman-theme .discount-badge {
    background-color: #F9E7CF;
    color: #8B4513;
    border: 1px solid #D4AF37;
}

.roman-theme .essence-badge {
    background-color: #ecfdf5;
    color: #047857;
    border: 1px solid rgba(174, 213, 129, 0.5);
}

.roman-theme.status-completed {
    border-left: 3px solid #2E7D32;
}

.roman-theme.status-pending {
    border-left: 3px solid #F57F17;
}

.roman-theme.status-failed {
    border-left: 3px solid #B71C1C;
}

.roman-theme .status-completed {
    color: #2E7D32;
}

.roman-theme .status-pending {
    color: #F57F17;
}

.roman-theme .status-failed {
    color: #B71C1C;
}

.roman-theme .engage-toggle-btn {
    color: #8D6E63;
}

.roman-theme .engage-toggle-btn:hover {
    background-color: rgba(213, 195, 170, 0.2);
}

/* Arc theme styling */
.arc-theme.transaction-cell {
    background-color: white;
    border: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.arc-theme .cell-footer {
    border-top-color: #e2e8f0;
    background-color: #f8fafc;
}

.arc-theme .tx-title {
    font-family: 'Montserrat', sans-serif;
    font-weight: 600;
    color: #1e293b;
}

.arc-theme .icon-payment {
    background: linear-gradient(135deg, #ef4444, #b91c1c);
    color: white;
}

.arc-theme .icon-essence,
.arc-theme .icon-token {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
}

.arc-theme .icon-enchant {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    color: white;
}

.arc-theme .icon-discount {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
}

.arc-theme .discount-badge {
    background-color: #eff6ff;
    color: #1e40af;
    border: none;
}

.arc-theme .essence-badge {
    background-color: #ecfdf5;
    color: #047857;
    border: none;
}

.arc-theme.status-completed {
    border-top: 3px solid #10b981;
}

.arc-theme.status-pending {
    border-top: 3px solid #f59e0b;
}

.arc-theme.status-failed {
    border-top: 3px solid #ef4444;
}

.arc-theme .status-completed {
    color: #10b981;
}

.arc-theme .status-pending {
    color: #f59e0b;
}

.arc-theme .status-failed {
    color: #ef4444;
}

.arc-theme .engage-toggle-btn {
    color: var(--arc-text-secondary);
}

.arc-theme .engage-toggle-btn:hover {
    background-color: rgba(226, 232, 240, 0.5);
}

/* Vacay theme styling */
.vacay-theme.transaction-cell {
    background-color: rgba(255, 255, 255, 0.8);
    border: none;
    border-radius: 12px;
    box-shadow: var(--vacay-shadow-sm);
    overflow: hidden;
}

.vacay-theme.transaction-cell:hover {
    transform: translateY(-4px);
    box-shadow: var(--vacay-shadow);
}

.vacay-theme .cell-icon {
    border-radius: 0;
    width: 100%;
    height: 6px;
    position: relative;
    margin: 0;
    top: 0;
}

.vacay-theme .cell-content {
    padding-top: 1.25rem;
}

.vacay-theme .icon-payment {
    background: linear-gradient(135deg, var(--vacay-ocean), #29b6f6);
}

.vacay-theme .icon-essence,
.vacay-theme .icon-token {
    background: linear-gradient(135deg, var(--vacay-palm), #9ccc65);
}

.vacay-theme .icon-enchant {
    background: linear-gradient(135deg, var(--vacay-primary), var(--vacay-secondary));
}

.vacay-theme .icon-discount {
    background: linear-gradient(135deg, var(--vacay-sunset), #ff7043);
}

.vacay-theme .cell-footer {
    border-top-color: var(--vacay-border);
    background-color: rgba(240, 247, 250, 0.3);
}

.vacay-theme .tx-title {
    font-family: 'Poppins', sans-serif;
    font-weight: 500;
    color: var(--vacay-text);
}

.vacay-theme .discount-badge {
    background-color: rgba(255, 152, 0, 0.1);
    color: var(--vacay-sunset);
    border: none;
}

.vacay-theme .essence-badge {
    background-color: rgba(38, 166, 154, 0.1);
    color: var(--vacay-palm);
    border: none;
}

.vacay-theme.status-completed {
    border-top: none;
}

.vacay-theme.status-pending {
    border-top: none;
}

.vacay-theme.status-failed {
    border-top: none;
}

.vacay-theme .status-completed {
    color: var(--vacay-success);
}

.vacay-theme .status-pending {
    color: var(--vacay-warning);
}

.vacay-theme .status-failed {
    color: var(--vacay-error);
}

.vacay-theme .engage-toggle-btn {
    color: var(--vacay-text-light);
}

.vacay-theme .engage-toggle-btn:hover {
    background-color: rgba(224, 247, 250, 0.3);
}
</style>
