/**
 * VSCode Server for Web3 Crypto Streaming Service
 * 
 * Launches a VSCode server instance that can be accessed remotely through a web browser,
 * enabling collaborative development and remote access to the codebase.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');
const open = require('open');

// Configuration
const CONFIG = {
  PORT: process.env.VSCODE_SERVER_PORT || 8000,
  HOST: process.env.VSCODE_SERVER_HOST || '0.0.0.0',
  EXTENSIONS_DIR: path.join(__dirname, '.vscode-server', 'extensions'),
  DATA_DIR: path.join(__dirname, '.vscode-server', 'data'),
  LOG_LEVEL: process.env.VSCODE_SERVER_LOG_LEVEL || 'info',
  AUTH_TOKEN: process.env.VSCODE_SERVER_AUTH_TOKEN || generateToken(),
  CONNECTION_TOKEN: process.env.VSCODE_SERVER_CONNECTION_TOKEN || generateToken(),
  WITHOUT_CONNECTION_TOKEN: process.env.WITHOUT_CONNECTION_TOKEN === 'true' || false,
  OPEN_BROWSER: process.env.OPEN_BROWSER !== 'false',
  EXTENSIONS: [
    'dbaeumer.vscode-eslint',
    'esbenp.prettier-vscode',
    'JuanBlanco.solidity',
    'Vue.volar',
    'redhat.vscode-yaml'
  ]
};

// Generate a random token for authentication
function generateToken() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Ensure directories exist
function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Get server binary path based on platform
function getServerPath() {
  const platform = os.platform();
  const arch = os.arch();
  const baseDir = path.join(__dirname, 'node_modules', 'code-server');
  
  if (!fs.existsSync(baseDir)) {
    console.error('Error: code-server module not found. Please install it with: npm install code-server');
    process.exit(1);
  }
  
  let binaryPath;
  
  if (platform === 'win32') {
    binaryPath = path.join(baseDir, 'bin', 'code-server.cmd');
  } else {
    binaryPath = path.join(baseDir, 'bin', 'code-server');
  }
  
  if (!fs.existsSync(binaryPath)) {
    console.error(`Error: code-server binary not found at ${binaryPath}`);
    process.exit(1);
  }
  
  return binaryPath;
}

// Install recommended extensions
async function installExtensions() {
  console.log('Installing recommended extensions...');
  const serverPath = getServerPath();
  
  for (const extension of CONFIG.EXTENSIONS) {
    console.log(`Installing extension: ${extension}`);
    const args = [
      '--install-extension',
      extension,
      '--extensions-dir',
      CONFIG.EXTENSIONS_DIR
    ];
    
    try {
      await new Promise((resolve, reject) => {
        const proc = spawn(serverPath, args);
        
        proc.stdout.on('data', (data) => {
          console.log(`Extension output: ${data}`);
        });
        
        proc.stderr.on('data', (data) => {
          console.error(`Extension error: ${data}`);
        });
        
        proc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Failed to install extension ${extension} with code ${code}`));
          }
        });
      });
    } catch (error) {
      console.error(`Failed to install extension ${extension}:`, error.message);
      // Continue with other extensions
    }
  }
  
  console.log('Extensions installation completed');
}

// Start the VSCode server
async function startServer() {
  // Ensure directories exist
  ensureDirExists(CONFIG.EXTENSIONS_DIR);
  ensureDirExists(CONFIG.DATA_DIR);
  
  // Install extensions
  await installExtensions();
  
  console.log('Starting VSCode Server...');
  
  const serverPath = getServerPath();
  const args = [
    '--port', CONFIG.PORT.toString(),
    '--host', CONFIG.HOST,
    '--extensions-dir', CONFIG.EXTENSIONS_DIR,
    '--user-data-dir', CONFIG.DATA_DIR,
    '--log', CONFIG.LOG_LEVEL,
    '--auth', 'none'
  ];
  
  if (CONFIG.WITHOUT_CONNECTION_TOKEN) {
    args.push('--without-connection-token');
  } else {
    args.push('--connection-token', CONFIG.CONNECTION_TOKEN);
  }
  
  // Current working directory is the project root
  const proc = spawn(serverPath, args, { 
    cwd: __dirname,
    env: { ...process.env }
  });
  
  proc.stdout.on('data', (data) => {
    console.log(`${data}`);
  });
  
  proc.stderr.on('data', (data) => {
    console.error(`${data}`);
  });
  
  proc.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
  
  proc.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
  });
  
  // Wait for server to start
  await waitForServer();
  
  // Print access information
  const localUrl = `http://localhost:${CONFIG.PORT}/`;
  const networkUrl = `http://${getLocalIp()}:${CONFIG.PORT}/`;
  
  console.log('\n');
  console.log('⚡️ VSCode Server is now running!');
  console.log('\n');
  console.log(`📘 Local URL:     ${localUrl}`);
  console.log(`🌐 Network URL:   ${networkUrl}`);
  
  if (!CONFIG.WITHOUT_CONNECTION_TOKEN) {
    console.log(`🔑 Access Token:  ${CONFIG.CONNECTION_TOKEN}`);
  }
  
  console.log('\n');
  console.log('Press Ctrl+C to stop the server');
  
  // Open browser if configured
  if (CONFIG.OPEN_BROWSER) {
    await open(localUrl);
  }
}

// Wait for the server to be available
async function waitForServer() {
  const maxAttempts = 30;
  const delayMs = 1000;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${CONFIG.PORT}/`, (res) => {
          if (res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302) {
            resolve();
          } else {
            reject(new Error(`Server responded with status code ${res.statusCode}`));
          }
        });
        
        req.on('error', reject);
        req.end();
      });
      
      return;
    } catch (error) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.error(`Server did not start after ${maxAttempts} attempts`);
}

// Get the local IP address
function getLocalIp() {
  const networkInterfaces = os.networkInterfaces();
  
  for (const interfaceName of Object.keys(networkInterfaces)) {
    const interfaces = networkInterfaces[interfaceName];
    
    for (const iface of interfaces) {
      if (!iface.internal && iface.family === 'IPv4') {
        return iface.address;
      }
    }
  }
  
  return '127.0.0.1';
}

// Handle termination
process.on('SIGINT', () => {
  console.log('\nShutting down VSCode server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down VSCode server...');
  process.exit(0);
});

// Start the server
startServer().catch(error => {
  console.error('Failed to start VSCode server:', error);
  process.exit(1);
});
