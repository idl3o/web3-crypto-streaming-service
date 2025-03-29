<template>
    <div class="transaction-view" :class="currentTheme">
        <div class="container py-4">
            <!-- Add Score Banner -->
            <ScoreBanner :theme="currentTheme" />

            <div class="page-header">
                <div :class="getHeaderClass()">
                    <h1>{{ getPageTitle() }}</h1>
                </div>
                <p class="text-muted">Review your streaming payments and Fae ecosystem history</p>
            </div>

            <!-- Vacation theme decorative wave if using that theme -->
            <div v-if="currentTheme === 'vacay-theme'" class="vacay-wave"></div>

            <!-- Civilization Milestones -->
            <div class="row mb-4">
                <div class="col-12">
                    <div :class="['card', 'shadow-sm', currentTheme === 'arc-theme' ? 'arc-card' : '']">
                        <div class="card-body">
                            <CivilizationMilestones :theme="currentTheme" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="card shadow-sm mb-4">
                        <div class="card-body">
                            <h5 class="card-title">Summary</h5>
                            <div class="summary-stats">
                                <div class="stat-item">
                                    <div class="stat-value">{{ formatEth(totalSpent) }}</div>
                                    <div class="stat-label">Total ETH Spent</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">{{ totalEssenceEarned.toFixed(2) }}</div>
                                    <div class="stat-label">Total Essence Earned</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">{{ formatEth(totalSavings) }}</div>
                                    <div class="stat-label">Total ETH Saved</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">Spending vs. Rewards</h5>
                            <canvas ref="chartRef" height="200"></canvas>
                        </div>
                    </div>
                </div>

                <!-- NEW: Add an engagement chart -->
                <div class="col-md-4">
                    <div class="card shadow-sm mb-4">
                        <div class="card-body">
                            <h5 class="card-title">Engagement Analytics</h5>
                            <canvas ref="engagementChartRef" height="200"></canvas>

                            <div class="engagement-stats mt-3">
                                <div class="stat-badge">
                                    <span class="stat-value">{{ engagementStore.engagementAnalytics.totalEngagements
                                        }}</span>
                                    <span class="stat-label">Total Engagements</span>
                                </div>
                                <div class="stat-badge">
                                    <span class="stat-value">{{ engagementStore.engagementAnalytics.engagedTransactions
                                        }}</span>
                                    <span class="stat-label">Engaged Transactions</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Transaction history column with civilization -->
                <div class="col-md-8">
                    <div :class="['card', 'shadow-sm', currentTheme === 'arc-theme' ? 'arc-card' : '']">
                        <div class="card-body">
                            <TransactionHistory :show-filters="true" :theme-name="currentTheme"
                                :show-civilization="true" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <TransactionAlert :transaction="transactionStore.newTransactionAlert"
            @dismiss="transactionStore.clearTransactionAlert" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, inject } from 'vue';
import { useTransactionStore } from '@/stores/transactionStore';
import { useEngagementStore } from '@/stores/engagementStore';
import { useWalletStore } from '@/stores/wallet';
import TransactionHistory from '@/components/transaction/TransactionHistory.vue';
import TransactionAlert from '@/components/transaction/TransactionAlert.vue';
import Chart from 'chart.js/auto';
import CivilizationMilestones from '@/components/civilization/CivilizationMilestones.vue';
import { useCivilizationStore } from '@/stores/civilizationStore';
import ScoreDisplay from '@/components/score/ScoreDisplay.vue';
import ScoreBadge from '@/components/score/ScoreBadge.vue';
import ScoreBanner from '@/components/score/ScoreBanner.vue';

// Get current theme from provide/inject
const currentTheme = inject('currentTheme', ref('roman-theme'));

const walletStore = useWalletStore();
const transactionStore = useTransactionStore();
const chartRef = ref<HTMLCanvasElement | null>(null);
const chart = ref<Chart | null>(null);

// NEW: Add engagement store and chart ref
const engagementStore = useEngagementStore();
const engagementChartRef = ref<HTMLCanvasElement | null>(null);
const engagementChart = ref<Chart | null>(null);

const civStore = useCivilizationStore();

// Computed properties from the store
const totalSpent = computed(() => transactionStore.totalSpent);
const totalEssenceEarned = computed(() => transactionStore.totalEssenceEarned);
const totalSavings = computed(() => transactionStore.totalSavings);
const dailyStats = computed(() => transactionStore.dailyStats);

function formatEth(value: number): string {
    return value.toFixed(6);
}

// Update chart styling based on theme
watch(currentTheme, () => {
    initializeChart();
});

function initializeChart() {
    if (!chartRef.value) return;

    const ctx = chartRef.value.getContext('2d');
    if (!ctx) return;

    // Destroy previous chart if it exists
    if (chart.value) {
        chart.value.destroy();
    }

    // Labels for the chart (dates)
    const labels = dailyStats.value.map(stat => stat.date);

    // Apply theme-specific styling to chart
    const isArcTheme = currentTheme.value === 'arc-theme';

    // Customize chart options based on theme
    const chartOptions = {
        responsive: true,
        scales: {
            y: {
                title: {
                    display: true,
                    text: 'ETH'
                },
                beginAtZero: true,
                ticks: {
                    font: {
                        family: isArcTheme ? "'Quicksand', sans-serif" : "'Cinzel', serif"
                    }
                }
            },
            y1: {
                position: 'right',
                title: {
                    display: true,
                    text: 'Essence'
                },
                beginAtZero: true,
                grid: {
                    drawOnChartArea: false
                },
                ticks: {
                    font: {
                        family: isArcTheme ? "'Quicksand', sans-serif" : "'Cinzel', serif"
                    }
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Date'
                },
                ticks: {
                    font: {
                        family: isArcTheme ? "'Quicksand', sans-serif" : "'Cinzel', serif"
                    }
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        },
        plugins: {
            legend: {
                labels: {
                    font: {
                        family: isArcTheme ? "'Quicksand', sans-serif" : "'Cinzel', serif"
                    }
                }
            }
        }
    };

    // Prepare data for the chart
    chart.value = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'ETH Spent',
                    data: dailyStats.value.map(stat => stat.spent),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'ETH Saved',
                    data: dailyStats.value.map(stat => stat.saved),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Essence Earned',
                    data: dailyStats.value.map(stat => stat.essence),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    tension: 0.3,
                    fill: true,
                    yAxisID: 'y1'
                }
            ]
        },
        options: chartOptions
    });
}

// Update chart when data changes
watch(dailyStats, () => {
    initializeChart();
}, { deep: true });

// NEW: Initialize engagement chart
function initializeEngagementChart() {
    if (!engagementChartRef.value) return;

    const ctx = engagementChartRef.value.getContext('2d');
    if (!ctx) return;

    // Destroy previous chart if it exists
    if (engagementChart.value) {
        engagementChart.value.destroy();
    }

    // Get distribution data
    const distribution = engagementStore.engagementAnalytics.reactionDistribution;
    const labels = Object.keys(distribution);
    const data = Object.values(distribution);

    // Map reaction IDs to emoji labels
    const emojiMap: Record<string, string> = {
        'like': '👍 Like',
        'love': '❤️ Love',
        'laugh': '😂 Laugh',
        'wow': '😮 Wow',
        'sad': '😢 Sad'
    };

    const formattedLabels = labels.map(l => emojiMap[l] || l);

    // Create doughnut chart
    engagementChart.value = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: formattedLabels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: currentTheme.value === 'roman-theme'
                                ? "'Cinzel', serif"
                                : (currentTheme.value === 'arc-theme' ? "'Quicksand', sans-serif" : "'Poppins', sans-serif")
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0) as number;
                            const value = context.raw as number;
                            const percentage = Math.round((value / total) * 100);
                            return `${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Update engagement chart when data changes
watch(() => engagementStore.totalReactions, () => {
    initializeEngagementChart();
});

// Update chart when theme changes
watch(currentTheme, () => {
    initializeEngagementChart();
});

// Lifecycle hooks
onMounted(async () => {
    // Connect wallet if not already connected
    if (!walletStore.isConnected) {
        await walletStore.connectWallet();
    }

    // Initialize transaction store
    if (!transactionStore.isInitialized) {
        await transactionStore.initialize();
    }

    // Initialize charts after data is loaded
    initializeChart();
    initializeEngagementChart();

    // Initialize civilization
    civStore.initialize();
});

// Enhanced cleanup to prevent memory leaks
onBeforeUnmount(() => {
    // Clean up charts
    if (chart.value) {
        chart.value.destroy();
        chart.value = null;
    }

    if (engagementChart.value) {
        engagementChart.value.destroy();
        engagementChart.value = null;
    }

    // Clean up stores to free memory
    transactionStore.cleanup();
    engagementStore.cleanup();
});

// Methods to handle different themes
function getHeaderClass() {
    if (currentTheme.value === 'roman-theme') {
        return 'laurel-border';
    } else if (currentTheme.value === 'arc-theme') {
        return 'arc-section-header';
    } else if (currentTheme.value === 'vacay-theme') {
        return 'vacay-section-header';
    }
    return '';
}

function getPageTitle() {
    if (currentTheme.value === 'roman-theme') {
        return 'Transaction Ledger';
    } else if (currentTheme.value === 'vacay-theme') {
        return 'My Transactions';
    } else {
        return 'Transactions';
    }
}
</script>

<style scoped>
.roman-theme {
    font-family: 'Cinzel', serif;
    color: #3c2415;
}

.transaction-view {
    min-height: 100vh;
    background-color: #f9f5ef;
    background-image: url('@/assets/subtle-parchment-bg.png');
    background-repeat: repeat;
    background-size: 300px 300px;
}

.page-header {
    margin-bottom: 2.5rem;
    text-align: center;
}

.page-header h1 {
    color: #8B4513;
    font-family: 'Trajan Pro', 'Times New Roman', serif;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: 400;
    margin-bottom: 0.5rem;
}

.laurel-border {
    position: relative;
    padding: 1.5rem 0;
    max-width: 600px;
    margin: 0 auto;
}

.laurel-border::before,
.laurel-border::after {
    content: '✦';
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.5rem;
    color: #D4AF37;
}

.laurel-border::before {
    left: 0;
}

.laurel-border::after {
    right: 0;
}

.text-muted {
    color: #A1887F !important;
    font-style: italic;
}

.card {
    background-color: #fcf8f3;
    border: 1px solid #d5c3aa !important;
}

.card-title {
    color: #5D4037;
    font-family: 'Trajan Pro', 'Times New Roman', serif;
    letter-spacing: 1px;
    font-weight: 400;
    border-bottom: 1px solid #e6d6bf;
    padding-bottom: 0.75rem;
    margin-bottom: 1.25rem;
}

.summary-stats {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.stat-item {
    background-color: #f9f5ef;
    padding: 1.25rem;
    border-radius: 0.25rem;
    border: 1px solid #e6d6bf;
    position: relative;
}

.stat-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(to right, #D4AF37, transparent);
}

.stat-value {
    font-size: 1.75rem;
    font-weight: 600;
    color: #5D4037;
    margin-bottom: 0.25rem;
    font-family: 'Cinzel', serif;
}

.stat-label {
    font-size: 0.875rem;
    color: #8D6E63;
    text-transform: uppercase;
    letter-spacing: 1px;
}

/* Add styles for the chart */
canvas {
    border: 1px solid #e6d6bf;
    border-radius: 0.25rem;
    background-color: rgba(252, 248, 243, 0.75);
}

/* Arc theme styles */
.arc-theme.transaction-view {
    background-color: #f8fafc;
    min-height: 100vh;
}

.arc-theme .page-header {
    margin-bottom: 2rem;
    text-align: center;
}

.arc-theme .page-header h1 {
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 0.5rem;
}

.arc-theme .text-muted {
    color: #64748b !important;
    font-style: normal;
}

.arc-theme .card {
    border-radius: 16px;
    border: none;
    box-shadow: 0 4px 12px rgba(30, 41, 59, 0.08);
    overflow: hidden;
}

.arc-theme .card-title {
    font-family: 'Montserrat', sans-serif;
    font-weight: 600;
    color: #1e293b;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 0.75rem;
    margin-bottom: 1.25rem;
}

.arc-theme .stat-item {
    background-color: #ffffff;
    border-radius: 12px;
    padding: 1.5rem;
    position: relative;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    transition: all 0.3s ease;
}

.arc-theme .stat-item:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(30, 41, 59, 0.08);
}

.arc-theme .stat-value {
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
    font-size: 1.75rem;
    color: #1e293b;
    margin-bottom: 0.25rem;
}

.arc-theme .stat-label {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
}

.arc-theme canvas {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background-color: white;
}

/* Vacay theme styles */
.vacay-theme.transaction-view {
    background-color: #f8fdff;
    background-image: url(@/assets/images/subtle-beach-bg.png);
    background-size: cover;
    min-height: 100vh;
}

.vacay-theme .page-header {
    margin-bottom: 1.5rem;
    text-align: center;
}

.vacay-theme .page-header h1 {
    font-family: 'Pacifico', cursive;
    color: var(--vacay-primary);
    font-weight: normal;
    margin-bottom: 0.5rem;
}

.vacay-theme .text-muted {
    color: var(--vacay-text-light) !important;
}

.vacay-theme .card {
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 16px;
    border: none !important;
    box-shadow: var(--vacay-shadow);
}

.vacay-theme .card-title {
    font-family: 'Poppins', sans-serif;
    color: var(--vacay-text);
    font-weight: 600;
    border-bottom: 1px solid var(--vacay-border);
    padding-bottom: 0.75rem;
    margin-bottom: 1.25rem;
}

.vacay-theme .stat-item {
    background-color: white;
    border-radius: 12px;
    padding: 1.25rem;
    border: none;
    box-shadow: var(--vacay-shadow-sm);
    position: relative;
    overflow: hidden;
}

.vacay-theme .stat-item:nth-child(1)::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--vacay-ocean);
}

.vacay-theme .stat-item:nth-child(2)::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--vacay-palm);
}

.vacay-theme .stat-item:nth-child(3)::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--vacay-sunset);
}

.vacay-theme .stat-value {
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--vacay-text);
    margin-bottom: 0.25rem;
    font-family: 'Poppins', sans-serif;
}

.vacay-theme .stat-label {
    font-size: 0.875rem;
    color: var(--vacay-text-light);
    text-transform: uppercase;
    letter-spacing: 1px;
}

.vacay-theme canvas {
    border: 1px solid var(--vacay-border);
    border-radius: 12px;
    background-color: rgba(255, 255, 255, 0.8);
}

/* Wave decoration */
.vacay-wave {
    position: relative;
    height: 40px;
    margin-bottom: 2rem;
}

.vacay-wave::before {
    content: "";
    position: absolute;
    left: 0;
    bottom: 0;
    right: 0;
    height: 10px;
    background-image:
        linear-gradient(45deg, transparent 33.33%, var(--vacay-ocean) 33.33%, var(--vacay-ocean) 66.66%, transparent 66.66%),
        linear-gradient(45deg, transparent 33.33%, var(--vacay-secondary) 33.33%, var(--vacay-secondary) 66.66%, transparent 66.66%);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
    opacity: 0.3;
}

/* Vacay section header */
.vacay-section-header {
    position: relative;
    display: inline-block;
    margin-bottom: 0.5rem;
}

.vacay-section-header::after {
    content: '🏝️';
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: -30px;
    font-size: 1.5rem;
}

/* NEW: Engagement stats styling */
.engagement-stats {
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.stat-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.75rem;
    border-radius: 8px;
    background-color: #f8f9fa;
    min-width: 100px;
}

.stat-value {
    font-weight: 600;
    font-size: 1.25rem;
}

.stat-label {
    font-size: 0.75rem;
    color: #6c757d;
}

/* Theme-specific styles */
.roman-theme .stat-badge {
    background-color: #f9f5ef;
    border: 1px solid #e6d6bf;
}

.roman-theme .stat-value {
    font-family: 'Cinzel', serif;
    color: #5D4037;
}

.roman-theme .stat-label {
    color: #8D6E63;
}

.arc-theme .stat-badge {
    background-color: var(--arc-surface);
    box-shadow: var(--arc-shadow-sm);
    border-radius: 12px;
}

.arc-theme .stat-value {
    font-family: 'Montserrat', sans-serif;
    color: var(--arc-text-primary);
}

.arc-theme .stat-label {
    color: var(--arc-text-secondary);
}

.vacay-theme .stat-badge {
    background-color: rgba(255, 255, 255, 0.7);
    box-shadow: var(--vacay-shadow-sm);
    border-radius: 12px;
}

.vacay-theme .stat-value {
    font-family: 'Poppins', sans-serif;
    color: var(--vacay-text);
}

.vacay-theme .stat-label {
    color: var(--vacay-text-light);
}
</style>
