/**
 * Live Reload Service for Web3 Crypto Streaming Service
 * 
 * Provides WebSocket-based auto-refresh functionality for development
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const debounce = require('lodash.debounce');

class LiveReloadService {
  constructor(options = {}) {
    this.port = options.port || 35729;
    this.watchPaths = options.paths || ['./src'];
    this.watchExtensions = options.extensions || ['.html', '.css', '.vue', '.js', '.ts'];
    this.excludePaths = options.exclude || ['node_modules', 'dist', '.git'];
    this.quiet = options.quiet || false;
    
    this.wss = null;
    this.watcher = null;
    this.clients = new Set();
    
    this.initialize();
  }
  
  initialize() {
    this.startWebSocketServer();
    this.startFileWatcher();
    
    if (!this.quiet) {
      console.log(`🔄 Live Reload server started on port ${this.port}`);
    }
  }
  
  startWebSocketServer() {
    this.wss = new WebSocket.Server({ port: this.port });
    
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      
      if (!this.quiet) {
        console.log(`🔄 Live Reload client connected (${this.clients.size} active)`);
      }
      
      ws.on('close', () => {
        this.clients.delete(ws);
        
        if (!this.quiet) {
          console.log(`🔄 Live Reload client disconnected (${this.clients.size} active)`);
        }
      });
    });
  }
  
  startFileWatcher() {
    // Setup file watcher with chokidar
    const watchOptions = {
      ignored: (filePath) => {
        if (typeof filePath !== 'string') {
          return false;
        }
        
        // Check if the path contains any excluded directory
        return this.excludePaths.some(exclude => filePath.includes(exclude));
      },
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100
      }
    };
    
    this.watcher = chokidar.watch(this.watchPaths, watchOptions);
    
    // Debounce file change notifications to prevent multiple rapid reloads
    const handleChange = debounce((filePath) => {
      const ext = path.extname(filePath);
      
      if (this.watchExtensions.includes(ext)) {
        if (!this.quiet) {
          console.log(`🔄 File changed: ${filePath}`);
        }
        
        this.notifyClients({
          type: 'refresh',
          path: filePath,
          extension: ext,
          timestamp: Date.now()
        });
      }
    }, 300);
    
    // Watch for file changes
    this.watcher.on('change', handleChange);
  }
  
  notifyClients(data) {
    const message = JSON.stringify(data);
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
    
    if (!this.quiet) {
      console.log(`🔄 Sent refresh notification to ${this.clients.size} clients`);
    }
  }
  
  middleware() {
    return (req, res, next) => {
      const originalEnd = res.end;
      const port = this.port;
      
      // Only process HTML responses
      res.end = function(chunk, encoding) {
        if (res.getHeader('Content-Type') && 
            res.getHeader('Content-Type').includes('text/html')) {
          
          const injectScript = `
            <script>
              // Web3 Crypto Streaming Service Live Reload
              (function() {
                const ws = new WebSocket('ws://localhost:${port}');
                
                ws.onopen = () => {
                  console.log('Live reload connected');
                };
                
                ws.onmessage = (event) => {
                  const data = JSON.parse(event.data);
                  
                  if (data.type === 'refresh') {
                    console.log('Refreshing due to changes in ' + data.path);
                    window.location.reload();
                  }
                };
                
                ws.onclose = () => {
                  console.log('Live reload disconnected. Attempting to reconnect...');
                  setTimeout(() => {
                    window.location.reload();
                  }, 2000);
                };
                
                document.addEventListener('visibilitychange', () => {
                  if (document.visibilityState === 'visible' && ws.readyState !== WebSocket.OPEN) {
                    window.location.reload();
                  }
                });
              })();
            </script>
          `;
          
          // Add the script before the closing body tag
          if (chunk) {
            let html = chunk.toString();
            html = html.replace('</body>', `${injectScript}</body>`);
            arguments[0] = Buffer.from(html);
          }
        }
        
        originalEnd.apply(res, arguments);
      };
      
      next();
    };
  }
  
  close() {
    if (this.wss) {
      this.wss.close();
    }
    
    if (this.watcher) {
      this.watcher.close();
    }
    
    if (!this.quiet) {
      console.log('🔄 Live Reload service stopped');
    }
  }
}

module.exports = LiveReloadService;
