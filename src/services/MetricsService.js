/**
 * Metrics Service
 * 
 * Provides metrics and analytics functionality with a focus on YTD (Year-to-Date)
 * and comparative performance indicators.
 */

import { optimizeComputation } from './OptimizationService';
import { EXECUTION_STRATEGIES, PRIORITY_LEVELS } from './ExecutionEngine';
import { getLatestEvaluation } from './EvaluationService';

// Cache for metrics data to prevent redundant calculations
const metricsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch year-to-date metrics for different entity types
 * 
 * @param {Object} options Configuration options
 * @param {string} options.metricType Type of metrics to fetch (investment, content, token, platform)
 * @param {string} options.entityId ID of the entity (optional)
 * @param {string} options.comparisonPeriod Period to compare against (previous-year, previous-month, ytd-previous-year)
 * @returns {Promise<Object>} YTD metrics
 */
export async function fetchYearToDateMetrics(options = {}) {
    const { metricType, entityId, comparisonPeriod = 'previous-year' } = options;

    // Generate cache key
    const cacheKey = `ytd-${metricType}-${entityId || 'global'}-${comparisonPeriod}`;

    // Check cache
    const cachedData = checkCache(cacheKey);
    if (cachedData) return cachedData;

    // Determine the correct fetching function based on metric type
    let fetchFunction;
    switch (metricType) {
        case 'investment':
            fetchFunction = fetchInvestmentYTD;
            break;
        case 'content':
            fetchFunction = fetchContentYTD;
            break;
        case 'token':
            fetchFunction = fetchTokenYTD;
            break;
        case 'platform':
            fetchFunction = fetchPlatformYTD;
            break;
        default:
            throw new Error(`Unsupported metric type: ${metricType}`);
    }

    try {
        // Fetch metrics with optimized computation
        const result = await optimizeComputation(
            fetchFunction,
            {
                params: { entityId, comparisonPeriod },
                strategy: EXECUTION_STRATEGIES.WORKER,
                priority: PRIORITY_LEVELS.LOW
            }
        );

        // Cache the result
        cacheMetrics(cacheKey, result);

        return result;
    } catch (error) {
        console.error(`Error fetching YTD metrics for ${metricType}:`, error);
        throw error;
    }
}

/**
 * Get summary metrics for dashboard
 * 
 * @param {Object} options Options for metrics retrieval
 * @returns {Promise<Object>} Summary metrics
 */
export async function getDashboardMetrics(options = {}) {
    try {
        // Fetch different types of metrics in parallel
        const [investment, content, token, platform] = await Promise.all([
            fetchYearToDateMetrics({ metricType: 'investment', ...options }),
            fetchYearToDateMetrics({ metricType: 'content', ...options }),
            fetchYearToDateMetrics({ metricType: 'token', ...options }),
            fetchYearToDateMetrics({ metricType: 'platform', ...options })
        ]);

        return {
            investment,
            content,
            token,
            platform,
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        throw error;
    }
}

/**
 * Fetch custom comparative metrics
 * 
 * @param {Object} options Custom metric options
 * @returns {Promise<Object>} Custom metrics
 */
export async function fetchComparativeMetrics(options = {}) {
    const { metricType, entityId, startDate, endDate, comparisonType } = options;

    // Generate cache key
    const cacheKey = `comp-${metricType}-${entityId || 'global'}-${startDate}-${endDate}-${comparisonType}`;

    // Check cache
    const cachedData = checkCache(cacheKey);
    if (cachedData) return cachedData;

    try {
        // Fetch comparative metrics with optimized computation
        const result = await optimizeComputation(
            fetchCustomComparativeData,
            {
                params: options,
                strategy: EXECUTION_STRATEGIES.WORKER,
                priority: PRIORITY_LEVELS.LOW
            }
        );

        // Cache the result
        cacheMetrics(cacheKey, result);

        return result;
    } catch (error) {
        console.error(`Error fetching comparative metrics:`, error);
        throw error;
    }
}

// Helper functions for caching
function checkCache(key) {
    if (metricsCache.has(key)) {
        const { data, timestamp } = metricsCache.get(key);
        if (Date.now() - timestamp < CACHE_TTL) {
            return data;
        }
    }
    return null;
}

function cacheMetrics(key, data) {
    metricsCache.set(key, {
        data,
        timestamp: Date.now()
    });
}

// YTD fetching implementations
async function fetchInvestmentYTD({ entityId, comparisonPeriod }) {
    // This would fetch real data from an API in production
    // For example, simulating investment YTD performance

    // Get the current date and the start of the year
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Simulate YTD performance calculation
    const ytdPerformance = simulatePerformanceData(entityId, 5, 30);
    const comparisonPerformance = simulatePerformanceData(entityId, -2, 25);

    // Calculate percent change
    const percentChange = calculatePercentChange(ytdPerformance, comparisonPerformance);

    // Generate chart data - monthly points for the year
    const chartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].slice(0, now.getMonth() + 1),
        values: generateMonthlyData(ytdPerformance)
    };

    // Return formatted data
    return {
        primaryValue: ytdPerformance,
        primaryChange: percentChange,
        secondaryMetrics: [
            {
                label: 'Avg Return',
                value: ytdPerformance / (now.getMonth() + 1),
                format: 'percent',
                change: percentChange / 2
            },
            {
                label: 'Risk Score',
                value: 35 + Math.floor(Math.random() * 30),
                format: 'number',
                change: -5.2
            },
            {
                label: 'Holdings',
                value: 4500 + Math.floor(Math.random() * 2000),
                format: 'currency'
            }
        ],
        chartData,
        startDate: startOfYear.toISOString(),
        endDate: now.toISOString(),
        comparisonPeriod
    };
}

async function fetchContentYTD({ entityId, comparisonPeriod }) {
    // Simulate content metrics for YTD

    // Get the current date and the start of the year
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Simulate views and engagement
    const totalViews = 10000 + Math.floor(Math.random() * 90000);
    const lastYearViews = 8000 + Math.floor(Math.random() * 70000);
    const percentChange = calculatePercentChange(totalViews, lastYearViews);

    // Generate chart data
    const chartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].slice(0, now.getMonth() + 1),
        values: generateMonthlyData(totalViews, true)
    };

    return {
        primaryValue: totalViews,
        primaryChange: percentChange,
        secondaryMetrics: [
            {
                label: 'Engagement',
                value: 5.7 + (Math.random() * 2),
                format: 'percent',
                change: 12.3
            },
            {
                label: 'Avg Watch',
                value: 4.2 + (Math.random() * 3),
                format: 'number',
                change: 8.7
            },
            {
                label: 'Subscribers',
                value: 1200 + Math.floor(Math.random() * 3800),
                format: 'compact',
                change: 15.2
            }
        ],
        chartData,
        startDate: startOfYear.toISOString(),
        endDate: now.toISOString(),
        comparisonPeriod
    };
}

async function fetchTokenYTD({ entityId, comparisonPeriod }) {
    // Simulate token metrics for YTD

    // Get the current date and the start of the year
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Simulate token performance
    const tokenValue = 0.75 + Math.random() * 2;
    const previousValue = 0.60 + Math.random() * 1.5;
    const percentChange = calculatePercentChange(tokenValue, previousValue);

    // Generate chart data
    const chartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].slice(0, now.getMonth() + 1),
        values: generateTokenPriceData(tokenValue)
    };

    return {
        primaryValue: tokenValue,
        primaryChange: percentChange,
        secondaryMetrics: [
            {
                label: 'Market Cap',
                value: tokenValue * (1000000 + Math.floor(Math.random() * 9000000)),
                format: 'currency',
                change: percentChange
            },
            {
                label: 'Volume',
                value: 250000 + Math.floor(Math.random() * 750000),
                format: 'compact',
                change: 23.5
            },
            {
                label: 'Holders',
                value: 5200 + Math.floor(Math.random() * 4800),
                format: 'compact',
                change: 12.7
            }
        ],
        chartData,
        startDate: startOfYear.toISOString(),
        endDate: now.toISOString(),
        comparisonPeriod
    };
}

async function fetchPlatformYTD({ comparisonPeriod }) {
    // Simulate platform-wide metrics for YTD

    // Get the current date and the start of the year
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Simulate platform growth
    const userGrowth = 15 + Math.random() * 45;
    const transactionVolume = 5000000 + Math.floor(Math.random() * 15000000);
    const previousVolume = 4000000 + Math.floor(Math.random() * 10000000);
    const percentChange = calculatePercentChange(transactionVolume, previousVolume);

    // Get performance evaluation
    const evaluation = await getLatestEvaluation('system', 'performance');
    const performanceScore = evaluation ? evaluation.overallScore : 75 + Math.floor(Math.random() * 15);

    // Generate chart data
    const chartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].slice(0, now.getMonth() + 1),
        values: generateMonthlyData(transactionVolume, true, true)
    };

    return {
        primaryValue: transactionVolume,
        primaryChange: percentChange,
        secondaryMetrics: [
            {
                label: 'User Growth',
                value: userGrowth,
                format: 'percent',
                change: 5.3
            },
            {
                label: 'Performance',
                value: performanceScore,
                format: 'number',
                change: 3.2
            },
            {
                label: 'Avg Response',
                value: 120 + Math.floor(Math.random() * 80),
                format: 'number',
                change: -12.5
            }
        ],
        chartData,
        startDate: startOfYear.toISOString(),
        endDate: now.toISOString(),
        comparisonPeriod
    };
}

async function fetchCustomComparativeData({ metricType, entityId, startDate, endDate, comparisonType }) {
    // This would call appropriate APIs based on metric type and comparison parameters
    // For now, return simulated data

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate duration in days
    const duration = Math.floor((end - start) / (1000 * 60 * 60 * 24));

    // Generate appropriate data based on metric type
    let primaryValue, primaryChange, secondaryMetrics, chartData;

    switch (metricType) {
        case 'investment':
            primaryValue = 12.5 + Math.random() * 10;
            primaryChange = 3.2 + Math.random() * 10;
            secondaryMetrics = [
                { label: 'Alpha', value: 2.3 + Math.random() * 3, format: 'percent', change: 15.4 },
                { label: 'Beta', value: 0.8 + Math.random() * 0.4, format: 'number', change: -5.2 },
                { label: 'Sharpe', value: 1.2 + Math.random() * 0.8, format: 'number', change: 10.7 }
            ];
            chartData = generateTimeSeriesData(start, end, primaryValue);
            break;

        case 'content':
            primaryValue = 25000 + Math.floor(Math.random() * 75000);
            primaryChange = 17.8 + Math.random() * 20;
            secondaryMetrics = [
                { label: 'Retention', value: 65 + Math.random() * 20, format: 'percent', change: 8.3 },
                { label: 'Shares', value: 1200 + Math.floor(Math.random() * 2800), format: 'compact', change: 25.1 },
                { label: 'Comments', value: 850 + Math.floor(Math.random() * 1150), format: 'compact', change: 14.2 }
            ];
            chartData = generateTimeSeriesData(start, end, primaryValue, true);
            break;

        default:
            primaryValue = 100 + Math.random() * 900;
            primaryChange = 5 + Math.random() * 25;
            secondaryMetrics = [
                { label: 'Metric 1', value: 50 + Math.random() * 50, format: 'number', change: 7.5 },
                { label: 'Metric 2', value: 120 + Math.random() * 80, format: 'number', change: 12.3 },
                { label: 'Metric 3', value: 200 + Math.random() * 300, format: 'number', change: -3.8 }
            ];
            chartData = generateTimeSeriesData(start, end, primaryValue);
    }

    return {
        primaryValue,
        primaryChange,
        secondaryMetrics,
        chartData,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        comparisonType
    };
}

// Helper functions for data generation
function simulatePerformanceData(entityId, basePerformance, variance) {
    // Generate a stable pseudo-random value based on entity ID
    let seed = 0;
    if (entityId) {
        for (let i = 0; i < entityId.length; i++) {
            seed += entityId.charCodeAt(i);
        }
    }

    // Use the seed to generate a stable but randomized performance value
    const random = Math.sin(seed || Date.now()) * 10000;
    const performance = basePerformance + (random % variance);

    return performance;
}

function calculatePercentChange(current, previous) {
    if (!previous) return 0;
    return ((current - previous) / Math.abs(previous)) * 100;
}

function generateMonthlyData(total, isAccumulating = false, smoothGrowth = false) {
    const currentMonth = new Date().getMonth() + 1;
    const result = [];

    // Distribute the total across months
    let runningTotal = 0;
    for (let i = 0; i < currentMonth; i++) {
        let monthValue;

        if (smoothGrowth) {
            // Create a smooth growth curve
            const growthFactor = 1 + (i / currentMonth);
            monthValue = (total / currentMonth) * growthFactor * (0.8 + Math.random() * 0.4);
        } else {
            // More random distribution
            monthValue = (total / currentMonth) * (0.5 + Math.random());
        }

        if (isAccumulating) {
            runningTotal += monthValue;
            result.push(runningTotal);
        } else {
            result.push(monthValue);
        }
    }

    // If accumulating, scale to match the total
    if (isAccumulating) {
        const scaleFactor = total / result[result.length - 1];
        return result.map(val => val * scaleFactor);
    }

    return result;
}

function generateTokenPriceData(currentPrice) {
    const currentMonth = new Date().getMonth() + 1;
    const result = [];

    // Start with a base price around 80% of current
    let price = currentPrice * 0.8;

    // Generate price movement with some volatility
    for (let i = 0; i < currentMonth; i++) {
        // Add some volatility - price can go up or down by up to 15%
        const change = price * (Math.random() * 0.3 - 0.15);
        price += change;

        // Ensure price doesn't go negative
        price = Math.max(0.1, price);

        result.push(price);
    }

    // Ensure the last value matches current price
    result[result.length - 1] = currentPrice;

    return result;
}

function generateTimeSeriesData(startDate, endDate, total, isAccumulating = false) {
    // Calculate number of data points (1 per day)
    const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    const dataPoints = Math.min(days, 30); // Cap at 30 points for visual clarity

    // Generate labels (dates)
    const labels = [];
    const values = [];

    let runningTotal = 0;
    for (let i = 0; i < dataPoints; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + Math.floor(i * days / dataPoints));

        labels.push(date.toLocaleDateString());

        let value;
        if (isAccumulating) {
            const portion = total * ((i + 1) / dataPoints) * (0.8 + Math.random() * 0.4);
            runningTotal = Math.min(total, portion);
            value = runningTotal;
        } else {
            value = (total / dataPoints) * (0.5 + Math.random());
        }

        values.push(value);
    }

    // Ensure final value matches total for accumulating data
    if (isAccumulating) {
        values[values.length - 1] = total;
    }

    return { labels, values };
}
