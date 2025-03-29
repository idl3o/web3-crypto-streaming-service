/**
 * Web3 Crypto Streaming Service Launcher
 * 
 * This script initializes core services and launches the web server.
 */

const path = require('path');
const express = require('express');
const fs = require('fs');

// Import core services
let RiceSecurityService, BlockchainService, MetricsService;

const app = express();
const port = process.env.PORT || 3000;

// Check if dist directory exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
    console.error('Error: Dist directory not found!');
    console.error('Please run "npm run build" before starting the server');
    process.exit(1);
}

// Initialize core services
async function initializeServices() {
    console.log('Initializing core services...');

    try {
        // Import services
        try {
            RiceSecurityService = require('./src/services/RiceAdvancedNetworkSecurityService');
            BlockchainService = require('./src/services/BlockchainService');
            MetricsService = require('./src/services/MetricsService');
        } catch (error) {
            console.warn('Warning: Could not import service modules directly. Services will be initialized at runtime.');
        }

        // Initialize security service
        if (RiceSecurityService) {
            console.log('Initializing RICE Advanced Network Security...');
            await RiceSecurityService.initSecurityService({
                protectionMode: 'proactive'
            });
            console.log('RICE Security Service initialized');
        }

        // Initialize blockchain service
        if (BlockchainService) {
            console.log('Initializing Blockchain Service...');
            await BlockchainService.init();
            console.log('Blockchain Service initialized');
        }

        // Initialize metrics service
        if (MetricsService) {
            console.log('Initializing Metrics Service...');
            await MetricsService.init();
            console.log('Metrics Service initialized');
        }

        console.log('All core services initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing services:', error);
        return false;
    }
}

// Start the server
async function startServer() {
    // Initialize core services
    await initializeServices();

    // Serve static files from the dist directory
    app.use(express.static(distPath));

    // API endpoint for server status
    app.get('/api/status', (req, res) => {
        res.json({
            status: 'online',
            version: require('./package.json').version,
            serverTime: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        });
    });

    // Serve index.html for all other routes (for SPA routing)
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });

    // Start the server
    app.listen(port, () => {
        console.log(`✨ Server running at http://localhost:${port}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

// Start the application
startServer().catch(err => {
    console.error('Fatal error starting server:', err);
    process.exit(1);
});
