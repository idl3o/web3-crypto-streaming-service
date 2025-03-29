import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import https from 'https';
import fs from 'fs';
import { modules } from './modules';
import { StreamMonitor } from './server-farm/monitor';

// Load environment variables
dotenv.config();

const { logger, config } = modules;
const serverConfig = config.getServerConfig();

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Basic routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.get('/player', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/player.html'));
});

app.get('/documentation', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/documentation.html'));
});

app.get('/capabilities', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/capabilities.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '0.1.0' });
});

// Start HTTP server
const httpServer = app.listen(serverConfig.port, serverConfig.host, () => {
    logger.info(`HTTP server running at http://${serverConfig.host}:${serverConfig.port}`);
});

// Start HTTPS server if enabled
if (serverConfig.httpsEnabled) {
    try {
        const httpsOptions = {
            key: fs.readFileSync(serverConfig.sslKeyPath),
            cert: fs.readFileSync(serverConfig.sslCertPath)
        };

        const httpsServer = https.createServer(httpsOptions, app);
        httpsServer.listen(serverConfig.httpsPort, serverConfig.host, () => {
            logger.info(`HTTPS server running at https://${serverConfig.host}:${serverConfig.httpsPort}`);
        });
    } catch (err) {
        logger.error(`Failed to start HTTPS server: ${err}`);
    }
}

// Start Stream Monitor
const monitor = new StreamMonitor();

// Handle termination
const gracefulShutdown = () => {
    logger.info('Shutting down...');
    httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);