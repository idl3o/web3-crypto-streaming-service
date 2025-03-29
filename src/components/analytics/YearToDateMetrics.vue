<template>
    <div class="ytd-metrics-container" :class="[theme, size]">
        <div class="metrics-header">
            <h3 class="metrics-title">{{ title || defaultTitle }}</h3>
            <div class="time-period">
                <span class="period-label">{{ displayPeriod }}</span>
                <div class="date-selector" v-if="showDateSelector">
                    <button class="selector-btn" @click="openDateSelector">
                        <i class="fas fa-calendar-alt"></i>
                    </button>
                </div>
            </div>
        </div>

        <div class="metrics-content">
            <!-- Loading state -->
            <div v-if="loading" class="loading-state">
                <div class="spinner"></div>
                <span>Loading metrics...</span>
            </div>

            <!-- Error state -->
            <div v-else-if="error" class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <span>{{ error }}</span>
            </div>

            <!-- Data display -->
            <div v-else class="metrics-data">
                <!-- Primary metric -->
                <div class="primary-metric">
                    <div class="metric-value">{{ formattedPrimaryValue }}</div>
                    <div class="metric-change" :class="primaryTrend">
                        <i :class="primaryTrendIcon"></i>
                        {{ formattedPrimaryChange }}
                    </div>
                </div>

                <!-- Chart -->
                <div class="metrics-chart" v-if="showChart">
                    <canvas ref="chartCanvas" height="120"></canvas>
                </div>

                <!-- Secondary metrics -->
                <div class="secondary-metrics" v-if="secondaryMetrics && secondaryMetrics.length">
                    <div v-for="(metric, index) in secondaryMetrics" :key="index" class="secondary-metric">
                        <div class="metric-label">{{ metric.label }}</div>
                        <div class="metric-value">{{ formatValue(metric.value, metric.format) }}</div>
                        <div v-if="metric.change !== undefined" class="metric-change"
                            :class="getTrendClass(metric.change)">
                            <i :class="getTrendIcon(metric.change)"></i>
                            {{ formatChange(metric.change) }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="metrics-footer" v-if="showViewDetails">
            <button class="view-details-btn" @click="$emit('view-details')">
                View Details <i class="fas fa-arrow-right"></i>
            </button>
        </div>
    </div>

    <div class="year-to-date-metrics" :class="theme">
        <div class="metrics-header">
            <h3>Year-to-Date Performance</h3>
            <span class="date-range">{{ currentYear }}</span>
        </div>

        <div class="metrics-body">
            <div class="metric-card">
                <div class="metric-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="metric-content">
                    <span class="metric-label">Total Revenue</span>
                    <span class="metric-value">${{ formatNumber(metrics.totalRevenue) }}</span>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="metric-content">
                    <span class="metric-label">New Users</span>
                    <span class="metric-value">{{ formatNumber(metrics.newUsers) }}</span>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon">
                    <i class="fas fa-play"></i>
                </div>
                <div class="metric-content">
                    <span class="metric-label">Content Streams</span>
                    <span class="metric-value">{{ formatNumber(metrics.contentStreams) }}</span>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon">
                    <i class="fas fa-hand-holding-heart"></i>
                </div>
                <div class="metric-content">
                    <span class="metric-label">Tips Received</span>
                    <span class="metric-value">${{ formatNumber(metrics.tipsReceived) }}</span>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon">
                    <i class="fas fa-money-bill-wave"></i>
                </div>
                <div class="metric-content">
                    <span class="metric-label">Fee Payments</span>
                    <span class="metric-value">{{ formatNumber(metrics.feePayments) }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue';
import { fetchYearToDateMetrics, getYearToDateMetrics } from '@/services/MetricsService';

const props = defineProps({
    metricType: {
        type: String,
        required: true,
        validator: (value) => ['investment', 'content', 'token', 'platform', 'custom'].includes(value)
    },
    entityId: {
        type: String,
        default: null
    },
    customData: {
        type: Object,
        default: null
    },
    title: {
        type: String,
        default: null
    },
    size: {
        type: String,
        default: 'medium',
        validator: (value) => ['small', 'medium', 'large'].includes(value)
    },
    showChart: {
        type: Boolean,
        default: true
    },
    showDateSelector: {
        type: Boolean,
        default: false
    },
    showViewDetails: {
        type: Boolean,
        default: true
    },
    primaryValueFormat: {
        type: String,
        default: 'number' // 'number', 'currency', 'percent', 'compact'
    },
    comparisonPeriod: {
        type: String,
        default: 'previous-year', // 'previous-year', 'previous-month', 'ytd-previous-year'
    }
});

const emit = defineEmits(['view-details', 'date-change', 'metrics-loaded', 'error']);
const theme = inject('currentTheme', 'roman-theme');

// State
const loading = ref(true);
const error = ref(null);
const metrics = ref(null);
const secondaryMetrics = ref([]);
const chartInstance = ref(null);
const chartCanvas = ref(null);
const currentYear = ref(new Date().getFullYear());

// Computed properties
const defaultTitle = computed(() => {
    switch (props.metricType) {
        case 'investment': return 'Investment Performance (YTD)';
        case 'content': return 'Content Performance (YTD)';
        case 'token': return 'Token Performance (YTD)';
        case 'platform': return 'Platform Metrics (YTD)';
        default: return 'Year to Date Metrics';
    }
});

const displayPeriod = computed(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const formatOptions = { month: 'short', day: 'numeric' };
    const start = startOfYear.toLocaleDateString(undefined, formatOptions);
    const end = now.toLocaleDateString(undefined, formatOptions);

    return `${start} - ${end}, ${now.getFullYear()}`;
});

const formattedPrimaryValue = computed(() => {
    if (!metrics.value || metrics.value.primaryValue === undefined) return '-';
    return formatValue(metrics.value.primaryValue, props.primaryValueFormat);
});

const formattedPrimaryChange = computed(() => {
    if (!metrics.value || metrics.value.primaryChange === undefined) return '-';
    return formatChange(metrics.value.primaryChange);
});

const primaryTrend = computed(() => {
    if (!metrics.value || metrics.value.primaryChange === undefined) return 'neutral';
    return getTrendClass(metrics.value.primaryChange);
});

const primaryTrendIcon = computed(() => {
    if (!metrics.value || metrics.value.primaryChange === undefined) return 'fas fa-minus';
    return getTrendIcon(metrics.value.primaryChange);
});

// Methods
function formatValue(value, format = 'number') {
    if (value === undefined || value === null) return '-';

    switch (format) {
        case 'currency':
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: 'USD'
            }).format(value);

        case 'percent':
            return new Intl.NumberFormat(undefined, {
                style: 'percent',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(value / 100);

        case 'compact':
            return new Intl.NumberFormat(undefined, {
                notation: 'compact',
                compactDisplay: 'short'
            }).format(value);

        default: // number
            return new Intl.NumberFormat(undefined).format(value);
    }
}

function formatChange(change) {
    if (change === 0) return '0%';

    const formattedValue = Math.abs(change).toFixed(1);
    return change > 0 ? `+${formattedValue}%` : `-${formattedValue}%`;
}

function getTrendClass(change) {
    if (change === 0) return 'neutral';
    return change > 0 ? 'positive' : 'negative';
}

function getTrendIcon(change) {
    if (change === 0) return 'fas fa-minus';
    return change > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
}

function openDateSelector() {
    // In a real implementation, this would open a date selector
    // For now, we'll just emit an event
    emit('date-change');
}

function drawChart(chartData) {
    if (!chartCanvas.value || !chartData || !chartData.labels || !chartData.values) return;

    // In a real implementation, this would use Chart.js or similar
    // For this example, we'll simulate drawing a chart
    const canvas = chartCanvas.value;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw chart background
    ctx.fillStyle = theme.value === 'roman-theme' ? '#f8f1e5' : '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    // Draw axes
    ctx.strokeStyle = '#ccc';
    ctx.beginPath();
    ctx.moveTo(40, 10);
    ctx.lineTo(40, height - 20);
    ctx.lineTo(width - 10, height - 20);
    ctx.stroke();

    // Draw data
    if (chartData.values.length > 1) {
        const dataPoints = chartData.values;
        const maxValue = Math.max(...dataPoints) * 1.1;
        const dataWidth = (width - 50) / (dataPoints.length - 1);
        const dataHeight = (height - 30) / maxValue;

        // Draw line
        ctx.strokeStyle = theme.value === 'roman-theme' ? '#8B4513' : '#3498db';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < dataPoints.length; i++) {
            const x = 40 + i * dataWidth;
            const y = height - 20 - (dataPoints[i] * dataHeight);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            // Draw point
            ctx.fillStyle = theme.value === 'roman-theme' ? '#CD853F' : '#2980b9';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.stroke();
    }
}

async function loadMetrics() {
    try {
        const data = await getYearToDateMetrics();
        metrics.value = data;
    } catch (error) {
        console.error('Error loading YTD metrics:', error);
    }
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

// Lifecycle
onMounted(async () => {
    try {
        loading.value = true;
        error.value = null;

        // If using custom data, use that instead of fetching
        if (props.metricType === 'custom' && props.customData) {
            metrics.value = props.customData;
            secondaryMetrics.value = props.customData.secondaryMetrics || [];
            loading.value = false;
            emit('metrics-loaded', metrics.value);

            // Draw chart if available
            if (props.showChart && props.customData.chartData) {
                drawChart(props.customData.chartData);
            }
            return;
        }

        // Fetch year-to-date metrics
        const result = await fetchYearToDateMetrics({
            metricType: props.metricType,
            entityId: props.entityId,
            comparisonPeriod: props.comparisonPeriod
        });

        metrics.value = result;
        secondaryMetrics.value = result.secondaryMetrics || [];

        // Draw chart if available
        if (props.showChart && result.chartData) {
            drawChart(result.chartData);
        }

        emit('metrics-loaded', result);
    } catch (err) {
        console.error('Failed to load YTD metrics:', err);
        error.value = 'Failed to load metrics. Please try again.';
        emit('error', err);
    } finally {
        loading.value = false;
    }

    loadMetrics();
});

// Watch for theme changes to redraw chart
watch(() => theme.value, () => {
    if (metrics.value?.chartData) {
        drawChart(metrics.value.chartData);
    }
});
</script>

<style scoped>
.ytd-metrics-container {
    background-color: white;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    padding: 16px;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.metrics-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.metrics-title {
    margin: 0;
    font-size: 1.1rem;
    color: #333;
}

.time-period {
    display: flex;
    align-items: center;
    font-size: 0.8rem;
    color: #666;
}

.date-selector {
    margin-left: 8px;
}

.selector-btn {
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    padding: 2px;
}

.selector-btn:hover {
    color: #333;
}

.metrics-content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
}

.loading-state,
.error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
    font-size: 0.9rem;
}

.spinner {
    width: 24px;
    height: 24px;
    border: 2px solid rgba(0, 0, 0, 0.1);
    border-top-color: #333;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 8px;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.error-state i {
    color: #e74c3c;
    font-size: 1.5rem;
    margin-bottom: 8px;
}

.metrics-data {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}

.primary-metric {
    text-align: center;
    margin-bottom: 16px;
}

.primary-metric .metric-value {
    font-size: 2rem;
    font-weight: 600;
    color: #333;
}

.metric-change {
    display: inline-flex;
    align-items: center;
    font-size: 0.9rem;
    font-weight: 500;
    padding: 2px 6px;
    border-radius: 10px;
}

.metric-change.positive {
    background-color: rgba(46, 204, 113, 0.1);
    color: #2ecc71;
}

.metric-change.negative {
    background-color: rgba(231, 76, 60, 0.1);
    color: #e74c3c;
}

.metric-change.neutral {
    background-color: rgba(52, 152, 219, 0.1);
    color: #3498db;
}

.metric-change i {
    margin-right: 4px;
}

.metrics-chart {
    margin: 8px 0 16px;
    height: 120px;
}

.secondary-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 16px;
    margin-top: auto;
}

.secondary-metric {
    text-align: center;
}

.secondary-metric .metric-label {
    font-size: 0.8rem;
    color: #666;
    margin-bottom: 4px;
}

.secondary-metric .metric-value {
    font-size: 1rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 2px;
}

.secondary-metric .metric-change {
    display: inline-flex;
    font-size: 0.75rem;
    padding: 1px 4px;
}

.metrics-footer {
    margin-top: 16px;
    text-align: center;
}

.view-details-btn {
    background: none;
    border: none;
    color: #3498db;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
}

.view-details-btn i {
    margin-left: 4px;
    font-size: 0.8rem;
}

.view-details-btn:hover {
    color: #2980b9;
    text-decoration: underline;
}

/* Size variants */
.ytd-metrics-container.small {
    padding: 12px;
}

.ytd-metrics-container.small .metrics-title {
    font-size: 0.95rem;
}

.ytd-metrics-container.small .primary-metric .metric-value {
    font-size: 1.5rem;
}

.ytd-metrics-container.small .metrics-chart {
    height: 80px;
}

.ytd-metrics-container.large {
    padding: 20px;
}

.ytd-metrics-container.large .metrics-title {
    font-size: 1.25rem;
}

.ytd-metrics-container.large .primary-metric .metric-value {
    font-size: 2.5rem;
}

.ytd-metrics-container.large .metrics-chart {
    height: 150px;
}

/* Roman theme styling */
.ytd-metrics-container.roman-theme {
    background-color: #fff8f0;
    border: 1px solid #d5c3aa;
}

.ytd-metrics-container.roman-theme .metrics-title {
    color: #8B4513;
    font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
}

.ytd-metrics-container.roman-theme .primary-metric .metric-value {
    color: #6B4226;
}

.ytd-metrics-container.roman-theme .metric-change.positive {
    background-color: rgba(107, 142, 35, 0.1);
    color: #6B8E23;
}

.ytd-metrics-container.roman-theme .metric-change.negative {
    background-color: rgba(178, 34, 34, 0.1);
    color: #B22222;
}

.ytd-metrics-container.roman-theme .metric-change.neutral {
    background-color: rgba(139, 69, 19, 0.1);
    color: #8B4513;
}

.ytd-metrics-container.roman-theme .view-details-btn {
    color: #8B4513;
    font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
}

.ytd-metrics-container.roman-theme .view-details-btn:hover {
    color: #6B4226;
}

.year-to-date-metrics {
    background-color: white;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    overflow: hidden;
}

.year-to-date-metrics .metrics-header {
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
}

.year-to-date-metrics .metrics-header h3 {
    margin: 0 0 5px 0;
    font-size: 1.3rem;
}

.year-to-date-metrics .metrics-header .date-range {
    color: #777;
    font-size: 0.9rem;
}

.year-to-date-metrics .metrics-body {
    padding: 20px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
}

.year-to-date-metrics .metric-card {
    background-color: #f9f9f9;
    border-radius: 8px;
    padding: 15px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.year-to-date-metrics .metric-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #e0e0e0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: #555;
}

.year-to-date-metrics .metric-content {
    display: flex;
    flex-direction: column;
}

.year-to-date-metrics .metric-label {
    font-size: 0.85rem;
    color: #777;
}

.year-to-date-metrics .metric-value {
    font-size: 1.2rem;
    font-weight: 500;
}

/* Roman theme */
.year-to-date-metrics.roman-theme .metrics-header {
    border-bottom-color: var(--border-color);
}

.year-to-date-metrics.roman-theme .metrics-header h3 {
    color: var(--primary-color);
    font-family: var(--heading-font);
}

.year-to-date-metrics.roman-theme .metric-card {
    background-color: rgba(255, 252, 245, 0.7);
}

.year-to-date-metrics.roman-theme .metric-icon {
    background-color: rgba(139, 69, 19, 0.1);
    color: var(--primary-color);
}
</style>
