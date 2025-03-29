/**
 * WebPilot Service
 * 
 * Provides intelligent web navigation, on-chain data monitoring,
 * and automated interactions for the Web3 Crypto Streaming platform.
 */

import * as BlockchainService from './BlockchainService';
import * as SecurityService from './RiceAdvancedNetworkSecurityService';
import * as DataVerificationService from './DataVerificationService';
import * as PrecogEngine from './PrecogEngine';

// Constants
export const PILOT_MODE = {
  PASSIVE: 'passive',         // Only monitor, don't take actions
  ASSISTED: 'assisted',       // Suggest actions but require confirmation
  AUTONOMOUS: 'autonomous'    // Take actions automatically based on rules
};

export const DATA_SOURCE = {
  ONCHAIN: 'onchain',         // Data directly from blockchain
  INDEXER: 'indexer',         // Data from blockchain indexers
  WEB: 'web',                 // Data from websites
  SOCIAL: 'social',           // Data from social media
  STREAMING: 'streaming'      // Data from streaming sources
};

export const ALERT_LEVEL = {
  INFO: 'info',
  NOTICE: 'notice',
  WARNING: 'warning',
  CRITICAL: 'critical'
};

// Service state
let initialized = false;
let serviceConfig = {
  mode: PILOT_MODE.ASSISTED,
  enabledDataSources: [DATA_SOURCE.ONCHAIN, DATA_SOURCE.INDEXER, DATA_SOURCE.WEB],
  scanInterval: 60 * 1000, // 1 minute
  alertThreshold: ALERT_LEVEL.NOTICE,
  maxConcurrentTasks: 5,
  userAgentIdentifier: 'WebPilot/1.0 Web3CryptoStreamingService',
  webRequestTimeout: 30000,
  trustThreshold: 0.7,
  maxRetries: 3
};

// Active monitors and trackers
const activeMonitors = new Map();
const activeAlerts = new Map();
const activeTasks = new Map();
const taskQueue = [];
let monitoringIntervalId = null;

/**
 * Initialize the WebPilot service
 * @param {Object} options Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initialize(options = {}) {
  if (initialized) {
    return true;
  }

  try {
    console.log('Initializing WebPilot Service...');
    
    // Apply configuration options
    if (options.config) {
      serviceConfig = {
        ...serviceConfig,
        ...options.config
      };
    }

    // Initialize required dependencies
    if (!BlockchainService.isInitialized()) {
      await BlockchainService.initialize();
    }
    
    await SecurityService.initSecurityService();

    // Set up periodic monitoring
    if (monitoringIntervalId) {
      clearInterval(monitoringIntervalId);
    }
    
    monitoringIntervalId = setInterval(() => {
      _processMonitoringCycle();
    }, serviceConfig.scanInterval);
    
    // Start initial monitoring cycle
    setTimeout(() => {
      _processMonitoringCycle();
    }, 1000);

    initialized = true;
    console.log('WebPilot Service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize WebPilot Service:', error);
    return false;
  }
}

/**
 * Process a monitoring cycle
 * @private
 */
async function _processMonitoringCycle() {
  try {
    // Process all active monitors
    for (const [monitorId, monitor] of activeMonitors) {
      if (monitor.enabled) {
        // Skip if monitor is already running
        if (monitor.isRunning) continue;
        
        // Mark monitor as running
        monitor.isRunning = true;
        
        // Execute monitor
        monitor.lastRun = Date.now();
        
        try {
          await _executeMonitor(monitor);
        } catch (error) {
          console.error(`Error executing monitor ${monitorId}:`, error);
          monitor.lastError = error;
        }
        
        // Mark monitor as finished
        monitor.isRunning = false;
      }
    }
    
    // Process task queue
    await _processTasks();
  } catch (error) {
    console.error('Error during monitoring cycle:', error);
  }
}

/**
 * Execute a single monitor
 * @param {Object} monitor Monitor object
 * @private
 */
async function _executeMonitor(monitor) {
  const { type, config, callback } = monitor;
  
  let data = null;
  let alerts = [];
  
  switch (type) {
    case 'contract':
      // Monitor smart contract events or state
      data = await _monitorContract(config);
      break;
    
    case 'website':
      // Monitor website data
      data = await _monitorWebsite(config);
      break;
      
    case 'price':
      // Monitor asset price
      data = await _monitorPrice(config);
      break;
      
    case 'network':
      // Monitor blockchain network stats
      data = await _monitorNetwork(config);
      break;
      
    case 'wallet':
      // Monitor wallet activities
      data = await _monitorWallet(config);
      break;
      
    default:
      throw new Error(`Unknown monitor type: ${type}`);
  }
  
  // Process the data through monitor's filters
  if (data && config.filters) {
    alerts = _processFilters(data, config.filters);
  }
  
  // Store any alerts
  if (alerts.length > 0) {
    _storeAlerts(monitor.id, alerts);
  }
  
  // Update the monitor's state
  monitor.lastData = data;
  monitor.lastAlerts = alerts;
  monitor.lastSuccess = Date.now();
  
  // Call the callback if provided
  if (callback && typeof callback === 'function') {
    callback(data, alerts);
  }
  
  return { data, alerts };
}

/**
 * Monitor a smart contract
 * @param {Object} config Configuration for the contract monitor
 * @returns {Promise<Object>} Monitoring results
 * @private
 */
async function _monitorContract(config) {
  const { address, abi, events = [], methods = [], chainId } = config;
  
  if (!address || !abi) {
    throw new Error('Contract address and ABI are required for contract monitoring');
  }
  
  try {
    const provider = await BlockchainService.getProvider(chainId);
    const contract = new ethers.Contract(address, abi, provider);
    
    // Get data from contract methods
    const methodResults = {};
    for (const method of methods) {
      try {
        const args = method.args || [];
        methodResults[method.name] = await contract[method.name](...args);
      } catch (error) {
        console.warn(`Error calling contract method ${method.name}:`, error);
        methodResults[method.name] = { error: error.message };
      }
    }
    
    // Get recent events
    const eventResults = {};
    for (const event of events) {
      try {
        const filter = contract.filters[event.name](...(event.args || []));
        const blockRange = event.blockRange || 1000;
        const latestBlock = await provider.getBlockNumber();
        const logs = await contract.queryFilter(
          filter, 
          latestBlock - blockRange, 
          latestBlock
        );
        
        eventResults[event.name] = logs.map(log => ({
          ...log.args,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          timestamp: Date.now() // We would ideally get this from the block
        }));
      } catch (error) {
        console.warn(`Error querying contract event ${event.name}:`, error);
        eventResults[event.name] = { error: error.message };
      }
    }
    
    return {
      address,
      chainId,
      methods: methodResults,
      events: eventResults,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error(`Error monitoring contract ${address}:`, error);
    throw error;
  }
}

/**
 * Monitor a website for changes
 * @param {Object} config Configuration for the website monitor
 * @returns {Promise<Object>} Monitoring results
 * @private
 */
async function _monitorWebsite(config) {
  const { url, selectors = [], cssSelectors = [], fullPage = false } = config;
  
  if (!url) {
    throw new Error('URL is required for website monitoring');
  }
  
  // This would typically use a headless browser or fetch API to scrape website data
  // Since we can't actually scrape websites in this environment, we'll mock the response
  
  return {
    url,
    title: `Mock page title for ${url}`,
    timestamp: Date.now(),
    selections: selectors.map(selector => ({
      selector,
      text: `Mock data for ${selector} on ${url}`,
      html: `<div>Mock HTML for ${selector}</div>`
    })),
    cssSelections: cssSelectors.map(selector => ({
      selector,
      text: `Mock data for ${selector} on ${url}`,
      html: `<div>Mock HTML for ${selector}</div>`
    })),
    screenshot: fullPage ? "mock-base64-screenshot-data" : null
  };
}

/**
 * Monitor an asset's price from various sources
 * @param {Object} config Configuration for the price monitor
 * @returns {Promise<Object>} Price data
 * @private
 */
async function _monitorPrice(config) {
  const { symbol, sources = ['coingecko', 'binance'], currency = 'USD' } = config;
  
  if (!symbol) {
    throw new Error('Symbol is required for price monitoring');
  }
  
  // This would call real price APIs in a production environment
  
  return {
    symbol,
    currency,
    price: Math.random() * 10000, // Mock price
    change24h: (Math.random() * 20) - 10, // Mock 24h price change (-10% to +10%)
    volume24h: Math.random() * 1000000,
    sources: sources.map(source => ({
      name: source,
      price: Math.random() * 10000,
      lastUpdated: Date.now()
    })),
    timestamp: Date.now()
  };
}

/**
 * Monitor blockchain network stats
 * @param {Object} config Configuration for the network monitor
 * @returns {Promise<Object>} Network data
 * @private
 */
async function _monitorNetwork(config) {
  const { chainId, metrics = ['gasPrice', 'blockTime', 'txCount'] } = config;
  
  if (!chainId) {
    throw new Error('ChainId is required for network monitoring');
  }
  
  try {
    const provider = await BlockchainService.getProvider(chainId);
    const results = {};
    
    if (metrics.includes('gasPrice')) {
      results.gasPrice = await provider.getGasPrice();
    }
    
    if (metrics.includes('blockTime')) {
      const blockNumber = await provider.getBlockNumber();
      const block = await provider.getBlock(blockNumber);
      const prevBlock = await provider.getBlock(blockNumber - 10);
      
      if (block && prevBlock) {
        const avgTime = (block.timestamp - prevBlock.timestamp) / 10;
        results.blockTime = avgTime;
      }
    }
    
    if (metrics.includes('txCount')) {
      const blockNumber = await provider.getBlockNumber();
      const block = await provider.getBlock(blockNumber);
      results.txCount = block ? block.transactions.length : 0;
    }
    
    return {
      chainId,
      metrics: results,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error(`Error monitoring network ${chainId}:`, error);
    throw error;
  }
}

/**
 * Monitor a wallet's activities
 * @param {Object} config Configuration for the wallet monitor
 * @returns {Promise<Object>} Wallet data
 * @private
 */
async function _monitorWallet(config) {
  const { address, chainId, includeTokens = true } = config;
  
  if (!address) {
    throw new Error('Wallet address is required for wallet monitoring');
  }
  
  try {
    const provider = await BlockchainService.getProvider(chainId);
    
    // Get ETH balance
    const balance = await provider.getBalance(address);
    
    // In a real implementation, we would get token balances from something like Covalent or Moralis
    const tokens = includeTokens ? [
      { 
        symbol: 'MOCK', 
        name: 'Mock Token',
        address: '0x1234567890123456789012345678901234567890',
        decimals: 18,
        balance: ethers.utils.parseUnits('100', 18)
      }
    ] : [];
    
    // Get recent transactions
    // In a real implementation, we would get this from an indexer like Etherscan
    const transactions = [
      {
        hash: '0x' + '1'.repeat(64),
        from: address.toLowerCase() === '0x1234' ? '0x5678' : address,
        to: address.toLowerCase() === '0x1234' ? address : '0x5678',
        value: ethers.utils.parseEther('1.0'),
        timestamp: Date.now() - 3600000
      }
    ];
    
    return {
      address,
      chainId,
      balance,
      tokens,
      transactions,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error(`Error monitoring wallet ${address}:`, error);
    throw error;
  }
}

/**
 * Process data through filters to generate alerts
 * @param {Object} data Data to process
 * @param {Array} filters Array of filters to apply
 * @returns {Array} Generated alerts
 * @private
 */
function _processFilters(data, filters) {
  const alerts = [];
  
  for (const filter of filters) {
    try {
      let matches = false;
      
      switch (filter.type) {
        case 'threshold':
          // Check if a value crosses a threshold
          const value = _getValueByPath(data, filter.path);
          if (filter.operator === '>' && value > filter.value) matches = true;
          if (filter.operator === '<' && value < filter.value) matches = true;
          if (filter.operator === '>=' && value >= filter.value) matches = true;
          if (filter.operator === '<=' && value <= filter.value) matches = true;
          if (filter.operator === '==' && value == filter.value) matches = true;
          if (filter.operator === '!=' && value != filter.value) matches = true;
          break;
          
        case 'change':
          // Check if a value changes by percentage
          const newValue = _getValueByPath(data, filter.path);
          const oldValue = filter.previousValue;
          if (oldValue !== undefined && oldValue !== 0) {
            const changePercent = ((newValue - oldValue) / Math.abs(oldValue)) * 100;
            if (Math.abs(changePercent) >= filter.minChangePercent) {
              matches = true;
              filter.changePercent = changePercent;
            }
          }
          filter.previousValue = newValue;
          break;
          
        case 'pattern':
          // Check if a value matches a regex pattern
          const patternValue = _getValueByPath(data, filter.path);
          if (typeof patternValue === 'string' && new RegExp(filter.pattern).test(patternValue)) {
            matches = true;
          }
          break;
          
        case 'presence':
          // Check if a field exists or has a value
          const presenceValue = _getValueByPath(data, filter.path);
          if (filter.shouldExist && presenceValue !== undefined && presenceValue !== null) {
            matches = true;
          } else if (!filter.shouldExist && (presenceValue === undefined || presenceValue === null)) {
            matches = true;
          }
          break;
      }
      
      if (matches && filter.alert) {
        alerts.push({
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          level: filter.alertLevel || ALERT_LEVEL.NOTICE,
          message: filter.message || `Alert triggered for filter ${filter.type}`,
          data,
          filter,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.warn(`Error processing filter ${filter.type}:`, error);
    }
  }
  
  return alerts;
}

/**
 * Get a nested value from an object using a dot-notation path
 * @param {Object} obj Object to extract value from
 * @param {string} path Path to the value
 * @returns {any} Extracted value
 * @private
 */
function _getValueByPath(obj, path) {
  return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
}

/**
 * Store alerts from monitors
 * @param {string} monitorId Monitor ID
 * @param {Array} alerts Alerts to store
 * @private
 */
function _storeAlerts(monitorId, alerts) {
  for (const alert of alerts) {
    if (alert.level === ALERT_LEVEL.INFO && serviceConfig.alertThreshold === ALERT_LEVEL.NOTICE) {
      continue;
    }
    if (alert.level === ALERT_LEVEL.NOTICE && serviceConfig.alertThreshold === ALERT_LEVEL.WARNING) {
      continue;
    }
    if (alert.level === ALERT_LEVEL.WARNING && serviceConfig.alertThreshold === ALERT_LEVEL.CRITICAL) {
      continue;
    }
    
    // Store the alert
    activeAlerts.set(alert.id, {
      ...alert,
      monitorId,
      read: false,
      processed: false
    });
  }
  
  // Clean up old alerts (keep last 100)
  const alertEntries = Array.from(activeAlerts.entries());
  if (alertEntries.length > 100) {
    const toDeleteCount = alertEntries.length - 100;
    const sortedByTime = alertEntries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    for (let i = 0; i < toDeleteCount; i++) {
      if (sortedByTime[i][1].processed) {
        activeAlerts.delete(sortedByTime[i][0]);
      }
    }
  }
}

/**
 * Process pending tasks
 * @private
 */
async function _processTasks() {
  // Process up to maxConcurrentTasks from the queue
  while (activeTasks.size < serviceConfig.maxConcurrentTasks && taskQueue.length > 0) {
    const task = taskQueue.shift();
    activeTasks.set(task.id, task);
    
    try {
      task.status = 'running';
      task.startTime = Date.now();
      task.result = await _executeTask(task);
      task.status = 'completed';
    } catch (error) {
      console.error(`Error executing task ${task.id}:`, error);
      task.status = 'failed';
      task.error = error.message;
      
      // Retry if attempts remain
      if (task.attempts < serviceConfig.maxRetries) {
        task.attempts += 1;
        task.status = 'queued';
        taskQueue.push(task);
      }
    } finally {
      task.endTime = Date.now();
      
      // If the task has a callback, call it
      if (task.callback && typeof task.callback === 'function') {
        task.callback(task);
      }
      
      // Remove from active tasks if completed or failed
      if (task.status === 'completed' || (task.status === 'failed' && task.attempts >= serviceConfig.maxRetries)) {
        activeTasks.delete(task.id);
      }
    }
  }
}

/**
 * Execute a task
 * @param {Object} task Task to execute
 * @returns {Promise<any>} Task result
 * @private
 */
async function _executeTask(task) {
  switch (task.type) {
    case 'fetch':
      return _executeWebFetch(task);
      
    case 'contract-call':
      return _executeContractCall(task);
      
    case 'transaction':
      return _executeTransaction(task);
      
    default:
      throw new Error(`Unknown task type: ${task.type}`);
  }
}

/**
 * Execute a web fetch task
 * @param {Object} task Task configuration
 * @returns {Promise<Object>} Fetch result
 * @private
 */
async function _executeWebFetch(task) {
  const { url, options = {} } = task.config;
  
  // In a real implementation, this would use fetch or axios
  // For this example, we'll return mock data
  
  return {
    url,
    statusCode: 200,
    headers: {
      'content-type': 'application/json',
      'server': 'mock-server'
    },
    data: {
      success: true,
      message: `Mock response from ${url}`,
      timestamp: Date.now()
    }
  };
}

/**
 * Execute a contract call task
 * @param {Object} task Task configuration
 * @returns {Promise<any>} Call result
 * @private
 */
async function _executeContractCall(task) {
  const { address, abi, method, args = [], chainId } = task.config;
  
  if (!address || !abi || !method) {
    throw new Error('Contract address, ABI, and method are required for contract calls');
  }
  
  try {
    const provider = await BlockchainService.getProvider(chainId);
    const contract = new ethers.Contract(address, abi, provider);
    
    const result = await contract[method](...args);
    return result;
  } catch (error) {
    console.error(`Error executing contract call ${address}.${method}:`, error);
    throw error;
  }
}

/**
 * Execute a transaction task
 * @param {Object} task Task configuration
 * @returns {Promise<Object>} Transaction result
 * @private
 */
async function _executeTransaction(task) {
  const { address, abi, method, args = [], value = 0, chainId } = task.config;
  
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet not connected. Cannot execute transaction.');
  }
  
  if (!address || !abi || !method) {
    throw new Error('Contract address, ABI, and method are required for transactions');
  }
  
  try {
    // First verify transaction with security service
    const securityCheck = await SecurityService.verifyTransactionSecurity({
      to: address,
      value: value.toString(),
      data: 'contract-call', // In a real implementation, this would be the encoded call data
      method
    });
    
    if (!securityCheck.safe) {
      throw new Error(`Transaction security check failed: ${securityCheck.reason}`);
    }
    
    const signer = await BlockchainService.getSigner();
    const contract = new ethers.Contract(address, abi, signer);
    
    const tx = await contract[method](...args, {
      value: ethers.BigNumber.from(value)
    });
    
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status
    };
  } catch (error) {
    console.error(`Error executing transaction ${address}.${method}:`, error);
    throw error;
  }
}

/**
 * Add a new monitor
 * @param {Object} monitor Monitor configuration
 * @returns {string} Monitor ID
 */
export function addMonitor(monitor) {
  if (!initialized) {
    initialize();
  }
  
  if (!monitor.type || !monitor.config) {
    throw new Error('Monitor must have a type and config');
  }
  
  const monitorId = monitor.id || `monitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  activeMonitors.set(monitorId, {
    ...monitor,
    id: monitorId,
    enabled: monitor.enabled !== false,
    created: Date.now(),
    lastRun: null,
    lastSuccess: null,
    lastError: null,
    isRunning: false,
    lastData: null,
    lastAlerts: []
  });
  
  return monitorId;
}

/**
 * Get a monitor by ID
 * @param {string} monitorId Monitor ID
 * @returns {Object} Monitor object
 */
export function getMonitor(monitorId) {
  return activeMonitors.get(monitorId);
}

/**
 * Get all monitors
 * @returns {Array} Array of monitors
 */
export function getAllMonitors() {
  return Array.from(activeMonitors.values());
}

/**
 * Update a monitor
 * @param {string} monitorId Monitor ID
 * @param {Object} updates Updates to apply
 * @returns {boolean} Success status
 */
export function updateMonitor(monitorId, updates) {
  const monitor = activeMonitors.get(monitorId);
  
  if (!monitor) {
    return false;
  }
  
  activeMonitors.set(monitorId, {
    ...monitor,
    ...updates,
    config: {
      ...monitor.config,
      ...(updates.config || {})
    }
  });
  
  return true;
}

/**
 * Remove a monitor
 * @param {string} monitorId Monitor ID
 * @returns {boolean} Success status
 */
export function removeMonitor(monitorId) {
  return activeMonitors.delete(monitorId);
}

/**
 * Get all alerts
 * @param {boolean} includeRead Whether to include read alerts
 * @returns {Array} Array of alerts
 */
export function getAlerts(includeRead = true) {
  const alerts = Array.from(activeAlerts.values());
  return includeRead ? alerts : alerts.filter(alert => !alert.read);
}

/**
 * Mark an alert as read
 * @param {string} alertId Alert ID
 * @returns {boolean} Success status
 */
export function markAlertAsRead(alertId) {
  const alert = activeAlerts.get(alertId);
  
  if (!alert) {
    return false;
  }
  
  activeAlerts.set(alertId, {
    ...alert,
    read: true
  });
  
  return true;
}

/**
 * Process an alert
 * @param {string} alertId Alert ID
 * @param {string} action Action to take
 * @returns {Promise<boolean>} Success status
 */
export async function processAlert(alertId, action) {
  const alert = activeAlerts.get(alertId);
  
  if (!alert) {
    return false;
  }
  
  switch (action) {
    case 'dismiss':
      activeAlerts.set(alertId, {
        ...alert,
        processed: true,
        read: true,
        processedAction: 'dismiss'
      });
      return true;
      
    case 'automate':
      // Create a task based on this alert
      const task = _createTaskFromAlert(alert);
      if (task) {
        return await addTask(task);
      }
      return false;
      
    default:
      return false;
  }
}

/**
 * Create a task from an alert
 * @param {Object} alert Alert object
 * @returns {Object|null} Task object or null if not applicable
 * @private
 */
function _createTaskFromAlert(alert) {
  // In a real implementation, this would be more sophisticated
  // For this example, we'll create a mock task
  
  return {
    type: 'fetch',
    config: {
      url: 'https://example.com/api/respond-to-alert',
      options: {
        method: 'POST',
        body: JSON.stringify({
          alertId: alert.id,
          alertType: alert.filter.type,
          alertLevel: alert.level,
          timestamp: Date.now()
        })
      }
    },
    priority: alert.level === ALERT_LEVEL.CRITICAL ? 'high' : 'normal',
    description: `Automated response to ${alert.level} alert: ${alert.message}`
  };
}

/**
 * Add a task to the queue
 * @param {Object} task Task configuration
 * @returns {Promise<string>} Task ID
 */
export async function addTask(task) {
  if (!initialized) {
    await initialize();
  }
  
  if (!task.type || !task.config) {
    throw new Error('Task must have a type and config');
  }
  
  const taskId = task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const fullTask = {
    ...task,
    id: taskId,
    status: 'queued',
    created: Date.now(),
    attempts: 0,
    priority: task.priority || 'normal'
  };
  
  // Add to queue based on priority
  if (fullTask.priority === 'high') {
    taskQueue.unshift(fullTask);
  } else {
    taskQueue.push(fullTask);
  }
  
  // Immediately process tasks if possible
  await _processTasks();
  
  return taskId;
}

/**
 * Get a task by ID
 * @param {string} taskId Task ID
 * @returns {Object|undefined} Task object
 */
export function getTask(taskId) {
  // Check active tasks first
  if (activeTasks.has(taskId)) {
    return activeTasks.get(taskId);
  }
  
  // Then check queue
  return taskQueue.find(task => task.id === taskId);
}

/**
 * Get all tasks
 * @returns {Array} Array of all tasks (active and queued)
 */
export function getAllTasks() {
  return [
    ...Array.from(activeTasks.values()),
    ...taskQueue
  ];
}

/**
 * Cancel a queued task
 * @param {string} taskId Task ID
 * @returns {boolean} Success status
 */
export function cancelTask(taskId) {
  // Remove from queue if present
  const taskIndex = taskQueue.findIndex(task => task.id === taskId);
  if (taskIndex !== -1) {
    taskQueue.splice(taskIndex, 1);
    return true;
  }
  
  // Can't cancel active tasks for now
  return false;
}

/**
 * Get service status
 * @returns {Object} Status information
 */
export function getStatus() {
  return {
    initialized,
    activeMonitors: activeMonitors.size,
    pendingAlerts: Array.from(activeAlerts.values()).filter(a => !a.read).length,
    activeTasks: activeTasks.size,
    queuedTasks: taskQueue.length,
    mode: serviceConfig.mode,
    lastCycleSummary: {
      startTime: Date.now() - serviceConfig.scanInterval + 1000, // Mock
      endTime: Date.now(), // Mock
      monitorsRun: activeMonitors.size,
      alertsGenerated: Array.from(activeAlerts.values()).filter(a => a.timestamp > (Date.now() - serviceConfig.scanInterval)).length,
      tasksCompleted: 3 // Mock value
    }
  };
}

/**
 * Get service configuration
 * @returns {Object} Current configuration
 */
export function getConfiguration() {
  return { ...serviceConfig };
}

/**
 * Update service configuration
 * @param {Object} newConfig New configuration
 * @returns {Object} Updated configuration
 */
export function updateConfiguration(newConfig = {}) {
  serviceConfig = {
    ...serviceConfig,
    ...newConfig
  };
  
  // If scan interval changed, update the timer
  if (monitoringIntervalId && newConfig.scanInterval) {
    clearInterval(monitoringIntervalId);
    monitoringIntervalId = setInterval(() => {
      _processMonitoringCycle();
    }, serviceConfig.scanInterval);
  }
  
  return { ...serviceConfig };
}

export default {
  initialize,
  getStatus,
  getConfiguration,
  updateConfiguration,
  addMonitor,
  getMonitor,
  getAllMonitors,
  updateMonitor,
  removeMonitor,
  getAlerts,
  markAlertAsRead,
  processAlert,
  addTask,
  getTask,
  getAllTasks,
  cancelTask,
  PILOT_MODE,
  DATA_SOURCE,
  ALERT_LEVEL
};
