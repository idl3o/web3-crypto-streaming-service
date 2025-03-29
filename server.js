const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

// Check if dist directory exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.error('Error: Dist directory not found!');
  console.error('Please run "npm run build" before starting the server');
  process.exit(1);
}

// Serve static files from the dist directory
app.use(express.static(distPath));

// API endpoints could go here
// app.get('/api/example', (req, res) => { ... });

// Serve index.html for all other routes (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
