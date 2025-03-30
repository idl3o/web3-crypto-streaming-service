/**
 * Logging configuration for Web3 Crypto Streaming Service
 * 
 * Configures logging levels and destinations for various services
 */

module.exports = {
  // General logging configuration
  general: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    colorize: process.env.NODE_ENV !== 'production',
    timestamp: true
  },
  
  // Service-specific logging configuration
  services: {
    // Sona streaming service
    sonaStreaming: {
      level: process.env.SONA_LOG_LEVEL || 'info',
      enabled: true,
      includeMetrics: true,
      rotateInterval: '1d', // Daily log rotation
      maxFiles: 7, // Keep logs for 7 days
      filename: 'sona-streaming-%DATE%.log'
    },
    
    // Bitcoin payment service
    bitcoinPayment: {
      level: process.env.BITCOIN_LOG_LEVEL || 'info',
      enabled: true,
      includeMetrics: true,
      rotateInterval: '1d',
      maxFiles: 7,
      filename: 'bitcoin-payment-%DATE%.log'
    },
    
    // MituSax service
    mituSax: {
      level: process.env.MITUSAX_LOG_LEVEL || 'info',
      enabled: true,
      includeMetrics: true,
      rotateInterval: '1d',
      maxFiles: 7,
      filename: 'mitusax-%DATE%.log'
    }
  },
  
  // Error reporting configuration
  errors: {
    reportToConsole: true,
    reportToFile: true,
    reportToService: process.env.NODE_ENV === 'production',
    serviceEndpoint: process.env.ERROR_REPORTING_ENDPOINT,
    includeMetadata: true,
    groupSimilarErrors: true
  },
  
  // Performance metrics logging
  metrics: {
    enabled: true,
    interval: 60000, // Log metrics every 60 seconds
    destination: process.env.METRICS_DESTINATION || 'file',
    includeResourceUsage: true
  }
};
