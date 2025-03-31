/**
 * Development Server for Web3 Crypto Streaming Service
 * 
 * Provides a development environment with live reloading capabilities
 */

const express = require('express');
const path = require('path');
const LiveReloadService = require('./live-reload');

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Initialize live reload service
const liveReload = new LiveReloadService({
  paths: [
    path.join(__dirname, '../views'),
    path.join(__dirname, '../components'),
    path.join(__dirname, '../public')
  ],
  extensions: ['.html', '.css', '.js', '.vue', '.ts']
});

// Use live reload middleware
app.use(liveReload.middleware());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// API routes would go here
// app.use('/api', apiRouter);

// Serve HTML files from views directory
app.use(express.static(path.join(__dirname, '../views')));

// Default route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`💻 Development server running at http://localhost:${port}`);
  console.log(`🔄 Live reload active - changes to HTML, CSS, and JS will auto-refresh`);
  console.log(`🛑 Press Ctrl+C to stop`);
});

// Handle shutdown
process.on('SIGINT', () => {
  liveReload.close();
  process.exit();
});
