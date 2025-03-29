/**
 * Dashboard JavaScript for CryptoStream
 * Version: 2023
 */
document.addEventListener('DOMContentLoaded', function () {
    try {
        console.log('CryptoStream Dashboard initialized - 2023 version');

        // Initialize tooltips
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        if (tooltipTriggerList.length > 0) {
            [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
        }

        // Set default Chart.js config for better performance
        Chart.defaults.font.size = 11;
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.animation.duration = 750;
        Chart.defaults.animation.easing = 'easeOutQuart';
        Chart.defaults.plugins.tooltip.cornerRadius = 6;
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0,0,0,0.7)';
        Chart.defaults.plugins.tooltip.padding = 8;
        Chart.defaults.elements.point.radius = 3;
        Chart.defaults.elements.point.hoverRadius = 4;

        // Create sparkline charts for stat cards
        createSparkline('balanceSparkline', [3.2, 3.5, 3.8, 3.6, 3.9, 4.1, 4.28], '#6366f1');
        createSparkline('incomingSparkline', [0.8, 0.6, 1.1, 0.9, 1.2, 1.0, 1.45], '#10b981');
        createSparkline('outgoingSparkline', [0.4, 0.5, 0.3, 0.6, 0.8, 0.7, 0.87], '#ef4444');

        // Gas Trend Chart
        createGasTrendChart();

        // Activity Chart with optimized rendering
        const activityChartConfig = {
            weekly: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                incoming: [0.5, 0.7, 0.4, 0.9, 0.5, 1.1, 0.8],
                outgoing: [0.3, 0.2, 0.5, 0.4, 0.6, 0.3, 0.2]
            },
            monthly: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                incoming: [1.2, 1.8, 2.5, 3.1, 2.9, 4.2],
                outgoing: [0.8, 1.2, 1.1, 1.9, 1.3, 2.1]
            },
            yearly: {
                labels: ['2018', '2019', '2020', '2021', '2022', '2023'],
                incoming: [5.2, 8.1, 12.3, 18.5, 22.1, 28.4],
                outgoing: [3.1, 5.4, 7.8, 10.2, 14.5, 17.9]
            }
        };

        // Initialize activity chart with weekly data by default
        const activityCtx = document.getElementById('activityChart').getContext('2d');
        const activityChart = createActivityChart(activityCtx, activityChartConfig.weekly);

        // Distribution Chart with improved performance
        const distributionCtx = document.getElementById('distributionChart').getContext('2d');
        const distributionChart = new Chart(distributionCtx, {
            type: 'doughnut',
            data: {
                labels: ['ETH', 'USDC', 'DAI', 'WBTC', 'Other'],
                datasets: [{
                    data: [65, 15, 10, 5, 5],
                    backgroundColor: [
                        '#6366f1',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#64748b'
                    ],
                    borderWidth: 0,
                    borderRadius: 4,
                    hoverOffset: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: 1.5,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            boxWidth: 12,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        displayColors: false,
                        padding: 8,
                        caretSize: 5
                    }
                },
                cutout: '70%',
                animation: {
                    animateRotate: true,
                    animateScale: false
                }
            }
        });

        // Ensure charts stay within their containers and don't cause scrolling
        const limitChartScroll = () => {
            const chartWrappers = document.querySelectorAll('.chart-wrapper');
            chartWrappers.forEach(wrapper => {
                const rect = wrapper.getBoundingClientRect();
                const canvas = wrapper.querySelector('canvas');
                if (canvas && rect.height > 0) {
                    // Ensure Chart.js knows the actual size of its container
                    canvas.style.maxHeight = `${rect.height}px`;
                }
            });
        };

        // Run on initial load
        limitChartScroll();

        // Add animation on cards with memory management
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            const handleEnter = function () {
                this.style.transform = 'translateY(-5px)';
                this.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.1)';
            };

            const handleLeave = function () {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)';
            };

            card.addEventListener('mouseenter', handleEnter);
            card.addEventListener('mouseleave', handleLeave);
        });

        // Initialize time range buttons for activity chart
        initTimeRangeButtons(activityChart, activityChartConfig);

        // Initialize gas price options
        initGasPriceOptions();

        // Add click events to quick actions
        initQuickActions();

        // Window resize handler for responsive charts
        let resizeTimeout;
        window.addEventListener('resize', function () {
            // Debounce resize event to prevent multiple redraws
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function () {
                if (activityChart && distributionChart) {
                    limitChartScroll(); // Add this call
                    activityChart.resize();
                    distributionChart.resize();
                }
            }, 250);
        });
    } catch (error) {
        console.error('Chart initialization error:', error);
        // Fallback for when charts fail to load
        document.querySelectorAll('canvas').forEach(canvas => {
            const parent = canvas.parentNode;
            const errorMsg = document.createElement('div');
            errorMsg.className = 'alert alert-warning mt-3';
            errorMsg.textContent = 'Chart data is currently unavailable. Please try again later.';
            parent.appendChild(errorMsg);
        });
    }
});

/**
 * Creates a sparkline chart
 * @param {string} elementId - The ID of the canvas element
 * @param {array} data - The data points for the sparkline
 * @param {string} color - The color of the sparkline
 */
function createSparkline(elementId, data, color) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const ctx = element.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(data.length).fill(''),
            datasets: [{
                data: data,
                borderColor: color,
                backgroundColor: color + '10',
                borderWidth: 2,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 3,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    displayColors: false,
                    callbacks: {
                        title: () => null,
                        label: (context) => `${context.parsed.y} ETH`
                    }
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: false
                }
            },
            elements: {
                line: {
                    tension: 0.4
                }
            }
        }
    });
}

/**
 * Creates the gas trend chart
 */
function createGasTrendChart() {
    const ctx = document.getElementById('gasTrendChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
            datasets: [{
                data: [22, 18, 30, 15, 12, 10, 20],
                borderColor: '#64748b',
                backgroundColor: 'rgba(100, 116, 139, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    displayColors: false,
                    callbacks: {
                        label: (context) => `${context.parsed.y} GWEI`
                    }
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: false,
                    min: 5,
                    max: 35
                }
            }
        }
    });
}

/**
 * Creates or updates the activity chart
 * @param {Object} ctx - The canvas context
 * @param {Object} data - The data for the chart
 * @param {Chart} existingChart - Optional existing chart to update
 * @returns {Chart} The created or updated chart
 */
function createActivityChart(ctx, data, existingChart = null) {
    const config = {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Incoming ETH',
                    data: data.incoming,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 4
                },
                {
                    label: 'Outgoing ETH',
                    data: data.outgoing,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: 1.5,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    enabled: true,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    titleFont: {
                        size: 12
                    },
                    bodyFont: {
                        size: 11
                    },
                    displayColors: true,
                    padding: 8,
                    caretSize: 5
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        drawBorder: false,
                        display: true,
                        color: 'rgba(0,0,0,0.05)',
                        drawTicks: false
                    },
                    ticks: {
                        maxTicksLimit: 5,
                        padding: 10
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 6,
                        padding: 5
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            elements: {
                line: {
                    tension: 0.4
                }
            },
            animation: {
                duration: 1000
            },
            parsing: false,
            normalized: true,
            spanGaps: true
        }
    };

    if (existingChart) {
        existingChart.data.labels = config.data.labels;
        existingChart.data.datasets[0].data = config.data.datasets[0].data;
        existingChart.data.datasets[1].data = config.data.datasets[1].data;
        existingChart.update();
        return existingChart;
    }

    return new Chart(ctx, config);
}

/**
 * Initialize time range buttons for activity chart
 * @param {Chart} chart - The activity chart
 * @param {Object} chartConfig - Configuration for different time ranges
 */
function initTimeRangeButtons(chart, chartConfig) {
    const timeRangeButtons = document.querySelectorAll('.btn-group-sm .btn');
    if (timeRangeButtons.length === 0) return;

    timeRangeButtons.forEach(button => {
        button.addEventListener('click', function () {
            // Remove active class from all buttons
            timeRangeButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Get the range from the button text
            const range = this.textContent.trim().toLowerCase();

            // Update chart with new data
            if (chartConfig[range]) {
                chart.data.labels = chartConfig[range].labels;
                chart.data.datasets[0].data = chartConfig[range].incoming;
                chart.data.datasets[1].data = chartConfig[range].outgoing;
                chart.update();
            }
        });
    });
}

/**
 * Initialize gas price options
 */
function initGasPriceOptions() {
    const gasOptions = document.querySelectorAll('.gas-option');
    if (gasOptions.length === 0) return;

    gasOptions.forEach(option => {
        option.addEventListener('click', function () {
            // Remove active class from all options
            gasOptions.forEach(opt => opt.classList.remove('active'));

            // Add active class to clicked option
            this.classList.add('active');

            // Get the gas price from the option
            const gasPrice = this.querySelector('.text-success, .text-warning, .text-danger');
            if (gasPrice) {
                const gasPriceValue = gasPrice.textContent;

                // Update current gas price display
                const currentGasPrice = document.querySelector('.d-flex .mb-0');
                if (currentGasPrice) {
                    currentGasPrice.textContent = gasPriceValue.split(' ')[0];
                }

                // Update gas indicator
                const gasIndicator = document.querySelector('.gas-indicator');
                if (gasIndicator) {
                    // Reset all classes
                    gasIndicator.className = 'gas-indicator';

                    // Add appropriate class based on selected option
                    if (gasPrice.classList.contains('text-success')) {
                        gasIndicator.classList.add('text-success');
                        gasIndicator.innerHTML = '<i class="fas fa-circle me-1"></i> Low';
                    } else if (gasPrice.classList.contains('text-warning')) {
                        gasIndicator.classList.add('text-warning');
                        gasIndicator.innerHTML = '<i class="fas fa-circle me-1"></i> Average';
                    } else if (gasPrice.classList.contains('text-danger')) {
                        gasIndicator.classList.add('text-danger');
                        gasIndicator.innerHTML = '<i class="fas fa-circle me-1"></i> High';
                    }
                }
            }
        });
    });
}

/**
 * Initialize quick actions
 */
function initQuickActions() {
    const quickActions = document.querySelectorAll('.quick-action');
    if (quickActions.length === 0) return;

    quickActions.forEach(action => {
        action.addEventListener('click', function (e) {
            e.preventDefault();

            // Get action type from the text
            const actionType = this.querySelector('span').textContent.trim();

            // Handle different actions
            switch (actionType) {
                case 'New Stream':
                    showModal('Create New Stream', 'Configure your new payment stream');
                    break;
                case 'Transfer':
                    showModal('Transfer Funds', 'Send crypto to another wallet');
                    break;
                case 'Receive':
                    showModal('Receive Crypto', 'Your wallet address and QR code');
                    break;
                case 'History':
                    window.location.href = '#transactions-history';
                    break;
                case 'Stop Stream':
                    showModal('Stop Stream', 'Select the stream you want to stop');
                    break;
                case 'Settings':
                    window.location.href = 'settings.html';
                    break;
                default:
                    console.log('Action:', actionType);
            }
        });
    });
}

/**
 * Show a modal dialog
 * @param {string} title - Modal title
 * @param {string} content - Modal content
 */
function showModal(title, content) {
    // Check if modal already exists
    let modal = document.getElementById('actionModal');

    if (!modal) {
        // Create modal if it doesn't exist
        modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'actionModal';
        modal.tabIndex = -1;
        modal.setAttribute('aria-hidden', 'true');

        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"></h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body"></div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary">Confirm</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // Set modal content
    modal.querySelector('.modal-title').textContent = title;
    modal.querySelector('.modal-body').textContent = content;

    // Initialize and show the modal
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}