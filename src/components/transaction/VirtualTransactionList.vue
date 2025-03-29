<template>
    <div class="virtual-transaction-list" :class="theme" ref="containerRef">
        <div class="virtual-transactions-height" :style="{ height: `${totalHeight}px` }">
            <TransactionItem v-for="item in visibleItems" :key="item.id" :transaction="item" :theme="theme"
                :style="item.style" :is-new="isNewTransaction(item)" :is-expanded="expandedTransaction === item.id"
                @toggle-engagement="toggleTransactionEngagement(item.id)" @view-details="$emit('view-details', item)" />
        </div>

        <!-- Skeleton loading state -->
        <div v-if="loading" class="skeleton-loader">
            <div v-for="i in 5" :key="i" class="skeleton-item" :class="theme">
                <div class="skeleton-icon"></div>
                <div class="skeleton-content">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                </div>
            </div>
        </div>

        <!-- Empty state -->
        <div v-if="!loading && visibleItems.length === 0" class="empty-state">
            No transactions found.
        </div>

        <!-- Scroll to top button -->
        <button v-show="showScrollTop" class="scroll-top-btn" @click="scrollToTop">
            <i class="fas fa-arrow-up"></i>
        </button>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { debounce, batchDomOperations } from '@/components/transaction/TransactionOptimizer';
import TransactionItem from './TransactionItem.vue';

const props = defineProps({
    transactions: {
        type: Array,
        required: true
    },
    loading: {
        type: Boolean,
        default: false
    },
    theme: {
        type: String,
        default: 'roman-theme'
    },
    itemHeight: {
        type: Number,
        default: 150 // Default height of each transaction item
    },
    recentTransactions: {
        type: Set,
        default: () => new Set()
    }
});

const emit = defineEmits(['view-details']);

// Refs
const containerRef = ref(null);
const scrollY = ref(0);
const expandedTransaction = ref(null);
const showScrollTop = ref(false);

// Virtual scrolling state
const visibleItems = ref([]);
const overscan = 5; // Number of items to render beyond viewport
const totalHeight = computed(() => props.transactions.length * props.itemHeight);

// Function to check if a transaction is new
function isNewTransaction(tx) {
    return props.recentTransactions.has(tx.id);
}

// Update visible items based on scroll position
const updateVisibleItems = debounce(() => {
    if (!containerRef.value) return;

    const scrollTop = containerRef.value.scrollTop;
    scrollY.value = scrollTop;
    const viewportHeight = containerRef.value.clientHeight;

    // Calculate indices
    const startIndex = Math.max(0, Math.floor(scrollTop / props.itemHeight) - overscan);
    const endIndex = Math.min(
        props.transactions.length - 1,
        Math.ceil((scrollTop + viewportHeight) / props.itemHeight) + overscan
    );

    // Prepare operations for batch update
    const operations = [];

    // Update visible items with position information
    const newVisibleItems = props.transactions.slice(startIndex, endIndex + 1).map((tx, i) => ({
        ...tx,
        style: {
            position: 'absolute',
            top: `${(startIndex + i) * props.itemHeight}px`,
            left: 0,
            width: '100%',
            height: `${props.itemHeight}px`
        }
    }));

    // Batch update visible items
    visibleItems.value = newVisibleItems;

}, 16); // ~60fps

// Handle scroll events
function handleScroll() {
    updateVisibleItems();
}

// Scroll to the top
function scrollToTop() {
    if (containerRef.value) {
        containerRef.value.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
}

// Toggle engagement panel for a transaction
function toggleTransactionEngagement(txId) {
    expandedTransaction.value = expandedTransaction.value === txId ? null : txId;
}

// Update when transactions change
watch(() => props.transactions, () => {
    updateVisibleItems();
}, { deep: true });

// Lifecycle
onMounted(() => {
    if (containerRef.value) {
        containerRef.value.addEventListener('scroll', handleScroll);
        updateVisibleItems();
    }
});

onBeforeUnmount(() => {
    if (containerRef.value) {
        containerRef.value.removeEventListener('scroll', handleScroll);
    }
});
</script>

<style scoped>
.virtual-transaction-list {
    position: relative;
    height: 500px;
    /* Default height, can be overridden */
    overflow-y: auto;
    width: 100%;
}

.virtual-transactions-height {
    position: relative;
    width: 100%;
}

/* Skeleton loading state */
.skeleton-loader {
    padding: 1rem;
}

.skeleton-item {
    display: flex;
    padding: 1rem;
    margin-bottom: 0.75rem;
    border-radius: 0.25rem;
    animation: pulse 1.5s infinite;
}

.skeleton-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin-right: 1rem;
    background-color: #e2e8f0;
}

.skeleton-content {
    flex: 1;
}

.skeleton-line {
    height: 0.875rem;
    margin-bottom: 0.75rem;
    background-color: #e2e8f0;
    border-radius: 0.25rem;
    width: 100%;
}

.skeleton-line.short {
    width: 60%;
}

@keyframes pulse {

    0%,
    100% {
        opacity: 0.6;
    }

    50% {
        opacity: 0.8;
    }
}

/* Empty state */
.empty-state {
    padding: 2rem;
    text-align: center;
    color: #64748b;
}

/* Scroll to top button */
.scroll-top-btn {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: white;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s ease;
}

.scroll-top-btn:hover {
    opacity: 1;
}

/* Theme-specific styles */
.roman-theme.skeleton-item {
    background-color: #f9f5ef;
    border: 1px solid #e6d6bf;
}

.roman-theme .skeleton-icon,
.roman-theme .skeleton-line {
    background-color: #e6d6bf;
}

.arc-theme.skeleton-item {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
}

.arc-theme .skeleton-icon {
    border-radius: 10px;
}

.vacay-theme.skeleton-item {
    background-color: rgba(255, 255, 255, 0.7);
    border: none;
    border-radius: 12px;
    box-shadow: var(--vacay-shadow-sm);
}

.vacay-theme .skeleton-icon,
.vacay-theme .skeleton-line {
    background-color: rgba(224, 247, 250, 0.5);
}
</style>
