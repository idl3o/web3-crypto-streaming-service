/**
 * Worldwide Payment Service
 * 
 * Handles global payment processing, currency conversion, and 
 * region-specific payment methods for the streaming platform.
 */

import { ethers } from 'ethers';
import * as BlockchainService from './BlockchainService';

// Payment regions with their specific configurations
export const PAYMENT_REGIONS = {
  NORTH_AMERICA: 'na',
  EUROPE: 'eu',
  ASIA_PACIFIC: 'apac',
  LATIN_AMERICA: 'latam',
  MIDDLE_EAST: 'me',
  AFRICA: 'af',
  GLOBAL: 'global'
};

// Payment methods available across regions
export const PAYMENT_METHODS = {
  CRYPTO: 'crypto',           // Cryptocurrency payments
  CREDIT_CARD: 'credit_card', // Traditional credit card payments
  MOBILE: 'mobile',           // Mobile payment solutions
  BANK: 'bank',               // Bank transfers
  LOCAL: 'local'              // Region-specific payment methods
};

// Supported currencies
export const CURRENCIES = {
  CRYPTO: {
    ETH: 'ETH',
    USDT: 'USDT',
    USDC: 'USDC',
    BTC: 'BTC',
    DAI: 'DAI',
    PLATFORM_TOKEN: 'PTK' // Platform's native token
  },
  FIAT: {
    USD: 'USD',
    EUR: 'EUR',
    GBP: 'GBP',
    JPY: 'JPY',
    CNY: 'CNY',
    AUD: 'AUD',
    CAD: 'CAD',
    INR: 'INR',
    BRL: 'BRL'
  }
};

// Default payment settings
const defaultSettings = {
  preferredCurrency: CURRENCIES.CRYPTO.ETH,
  fallbackCurrency: CURRENCIES.FIAT.USD,
  minimumPayment: {
    [CURRENCIES.CRYPTO.ETH]: '0.005',
    [CURRENCIES.CRYPTO.USDT]: '5',
    [CURRENCIES.FIAT.USD]: '5'
  },
  gasLimit: 250000,
  defaultSlippage: 0.005 // 0.5%
};

// Cache for exchange rates
const exchangeRateCache = new Map();
let userRegion = null;
let userSettings = { ...defaultSettings };

/**
 * Initialize the payment service
 * 
 * @returns {Promise<boolean>} Success status
 */
export async function initPaymentService() {
  try {
    // Detect user's region
    userRegion = await detectUserRegion();
    
    // Load user settings from local storage
    const savedSettings = localStorage.getItem('payment_settings');
    if (savedSettings) {
      userSettings = { ...defaultSettings, ...JSON.parse(savedSettings) };
    }
    
    // Initialize exchange rates
    await refreshExchangeRates();
    
    // Set up periodic refresh of exchange rates (every 5 minutes)
    setInterval(refreshExchangeRates, 5 * 60 * 1000);
    
    console.log('Payment service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize payment service:', error);
    return false;
  }
}

/**
 * Detect user's region based on IP or browser settings
 * 
 * @returns {Promise<string>} Detected region code
 */
export async function detectUserRegion() {
  try {
    // In a real implementation, this would use a geolocation service
    // For demo purposes, we'll use a simple API call
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    // Map country code to our regions
    const countryCode = data.country_code;
    const regionMapping = {
      'US': PAYMENT_REGIONS.NORTH_AMERICA,
      'CA': PAYMENT_REGIONS.NORTH_AMERICA,
      'MX': PAYMENT_REGIONS.NORTH_AMERICA,
      
      // EU countries
      'DE': PAYMENT_REGIONS.EUROPE,
      'FR': PAYMENT_REGIONS.EUROPE,
      'GB': PAYMENT_REGIONS.EUROPE,
      'IT': PAYMENT_REGIONS.EUROPE,
      'ES': PAYMENT_REGIONS.EUROPE,
      // More EU countries would be listed here
      
      // Asia Pacific
      'JP': PAYMENT_REGIONS.ASIA_PACIFIC,
      'CN': PAYMENT_REGIONS.ASIA_PACIFIC,
      'AU': PAYMENT_REGIONS.ASIA_PACIFIC,
      'IN': PAYMENT_REGIONS.ASIA_PACIFIC,
      
      // Latin America
      'BR': PAYMENT_REGIONS.LATIN_AMERICA,
      'AR': PAYMENT_REGIONS.LATIN_AMERICA,
      'CL': PAYMENT_REGIONS.LATIN_AMERICA,
      'CO': PAYMENT_REGIONS.LATIN_AMERICA,
      
      // Middle East
      'AE': PAYMENT_REGIONS.MIDDLE_EAST,
      'SA': PAYMENT_REGIONS.MIDDLE_EAST,
      'IL': PAYMENT_REGIONS.MIDDLE_EAST,
      
      // Africa
      'ZA': PAYMENT_REGIONS.AFRICA,
      'NG': PAYMENT_REGIONS.AFRICA,
      'EG': PAYMENT_REGIONS.AFRICA,
      'KE': PAYMENT_REGIONS.AFRICA
    };
    
    return regionMapping[countryCode] || PAYMENT_REGIONS.GLOBAL;
  } catch (error) {
    console.error('Error detecting user region:', error);
    return PAYMENT_REGIONS.GLOBAL; // Default to global
  }
}

/**
 * Get available payment methods based on region
 * 
 * @param {string} region Region code
 * @returns {Array} Available payment methods
 */
export function getAvailablePaymentMethods(region = userRegion) {
  // Base payment methods available everywhere
  const baseMethods = [PAYMENT_METHODS.CRYPTO];
  
  // Region-specific payment methods
  const regionMethods = {
    [PAYMENT_REGIONS.NORTH_AMERICA]: [
      PAYMENT_METHODS.CREDIT_CARD, 
      PAYMENT_METHODS.BANK,
      {
        id: 'venmo',
        name: 'Venmo',
        type: PAYMENT_METHODS.LOCAL,
        icon: 'fab fa-cc-venmo'
      }
    ],
    [PAYMENT_REGIONS.EUROPE]: [
      PAYMENT_METHODS.CREDIT_CARD, 
      PAYMENT_METHODS.BANK,
      {
        id: 'sepa',
        name: 'SEPA Transfer',
        type: PAYMENT_METHODS.LOCAL,
        icon: 'fas fa-university'
      }
    ],
    [PAYMENT_REGIONS.ASIA_PACIFIC]: [
      PAYMENT_METHODS.CREDIT_CARD,
      PAYMENT_METHODS.MOBILE,
      {
        id: 'alipay',
        name: 'Alipay',
        type: PAYMENT_METHODS.LOCAL,
        icon: 'fab fa-alipay'
      },
      {
        id: 'wechat_pay',
        name: 'WeChat Pay',
        type: PAYMENT_METHODS.LOCAL,
        icon: 'fab fa-weixin'
      }
    ],
    [PAYMENT_REGIONS.LATIN_AMERICA]: [
      PAYMENT_METHODS.CREDIT_CARD,
      {
        id: 'pix',
        name: 'PIX (Brazil)',
        type: PAYMENT_METHODS.LOCAL,
        icon: 'fas fa-money-bill-wave'
      },
      {
        id: 'oxxo',
        name: 'OXXO (Mexico)',
        type: PAYMENT_METHODS.LOCAL,
        icon: 'fas fa-receipt'
      }
    ],
    [PAYMENT_REGIONS.MIDDLE_EAST]: [
      PAYMENT_METHODS.CREDIT_CARD,
      PAYMENT_METHODS.BANK
    ],
    [PAYMENT_REGIONS.AFRICA]: [
      PAYMENT_METHODS.MOBILE,
      {
        id: 'm_pesa',
        name: 'M-Pesa',
        type: PAYMENT_METHODS.LOCAL,
        icon: 'fas fa-mobile-alt'
      }
    ],
    [PAYMENT_REGIONS.GLOBAL]: [
      PAYMENT_METHODS.CREDIT_CARD,
      PAYMENT_METHODS.BANK
    ]
  };
  
  return [...baseMethods, ...(regionMethods[region] || regionMethods[PAYMENT_REGIONS.GLOBAL])];
}

/**
 * Process a payment
 * 
 * @param {Object} paymentDetails Payment details
 * @returns {Promise<Object>} Payment result
 */
export async function processPayment(paymentDetails) {
  try {
    validatePaymentDetails(paymentDetails);
    
    // Handle different payment methods
    switch (paymentDetails.method) {
      case PAYMENT_METHODS.CRYPTO:
        return await processCryptoPayment(paymentDetails);
      
      case PAYMENT_METHODS.CREDIT_CARD:
        return await processCreditCardPayment(paymentDetails);
      
      case PAYMENT_METHODS.MOBILE:
        return await processMobilePayment(paymentDetails);
      
      case PAYMENT_METHODS.BANK:
        return await processBankPayment(paymentDetails);
      
      case PAYMENT_METHODS.LOCAL:
        return await processLocalPayment(paymentDetails);
      
      default:
        throw new Error(`Unsupported payment method: ${paymentDetails.method}`);
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    return {
      success: false,
      error: error.message || 'Payment processing failed',
      errorCode: error.code || 'PAYMENT_FAILED'
    };
  }
}

/**
 * Process a cryptocurrency payment
 * 
 * @param {Object} paymentDetails Payment details
 * @returns {Promise<Object>} Payment result
 */
async function processCryptoPayment(paymentDetails) {
  const { amount, currency, recipient, memo } = paymentDetails;
  
  // Get the appropriate provider based on marriage status
  const provider = BlockchainService.getProvider();
  const signer = provider.getSigner();
  
  try {
    // For ERC-20 tokens, we need to use the token contract
    if (currency !== CURRENCIES.CRYPTO.ETH) {
      // This would use the appropriate token contract for the currency
      // For simplicity, we're not implementing the full ERC-20 logic here
      console.log(`Processing ${currency} payment...`);
      
      // Simulate successful payment for demo purposes
      return {
        success: true,
        transactionHash: `0x${Math.random().toString(16).substring(2, 42)}`,
        timestamp: new Date().toISOString(),
        amount,
        currency,
        recipient
      };
    }
    
    // For ETH payments, we can send directly
    const tx = await signer.sendTransaction({
      to: recipient,
      value: ethers.utils.parseEther(amount.toString()),
      gasLimit: userSettings.gasLimit
    });
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    return {
      success: true,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      timestamp: new Date().toISOString(),
      amount,
      currency,
      recipient,
      memo
    };
  } catch (error) {
    throw new Error(`Crypto payment failed: ${error.message}`);
  }
}

/**
 * Process a credit card payment
 * 
 * @param {Object} paymentDetails Payment details
 * @returns {Promise<Object>} Payment result
 */
async function processCreditCardPayment(paymentDetails) {
  // In a real implementation, this would integrate with a payment processor
  // For demo purposes, we'll simulate a successful payment
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
  
  return {
    success: true,
    authorizationCode: `AUTH${Date.now().toString().substring(6)}`,
    timestamp: new Date().toISOString(),
    amount: paymentDetails.amount,
    currency: paymentDetails.currency,
    last4: paymentDetails.cardDetails?.last4 || '****'
  };
}

/**
 * Process a mobile payment
 * 
 * @param {Object} paymentDetails Payment details
 * @returns {Promise<Object>} Payment result
 */
async function processMobilePayment(paymentDetails) {
  // Simulate mobile payment processing
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    success: true,
    referenceId: `MOB${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    amount: paymentDetails.amount,
    currency: paymentDetails.currency,
    provider: paymentDetails.mobileProvider || 'Unknown'
  };
}

/**
 * Process a bank transfer payment
 * 
 * @param {Object} paymentDetails Payment details
 * @returns {Promise<Object>} Payment result
 */
async function processBankPayment(paymentDetails) {
  // Bank payments typically involve generating payment instructions
  // rather than immediate processing
  
  return {
    success: true,
    referenceId: `BNK${Date.now().toString(36).substring(5)}`,
    timestamp: new Date().toISOString(),
    amount: paymentDetails.amount,
    currency: paymentDetails.currency,
    instructions: {
      accountName: 'Web3 Crypto Streaming',
      accountNumber: 'XXXX-XXXX-XXXX-1234',
      routingNumber: '123456789',
      bankName: 'Global Digital Bank',
      reference: `PAY-${Date.now().toString().substring(6)}`
    }
  };
}

/**
 * Process a local payment method
 * 
 * @param {Object} paymentDetails Payment details
 * @returns {Promise<Object>} Payment result
 */
async function processLocalPayment(paymentDetails) {
  const { localMethodId } = paymentDetails;
  
  // Handle different local payment methods
  switch (localMethodId) {
    case 'alipay':
    case 'wechat_pay':
      // Generate QR code payment data
      return {
        success: true,
        qrCodeData: `https://pay.example.com/qr/${Date.now()}`,
        expiresIn: 3600, // 1 hour in seconds
        amount: paymentDetails.amount,
        currency: paymentDetails.currency
      };
      
    case 'pix':
      // Generate PIX code for Brazil
      return {
        success: true,
        pixCode: `PIX${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
        expiresIn: 86400, // 24 hours in seconds
        amount: paymentDetails.amount,
        currency: paymentDetails.currency
      };
      
    case 'oxxo':
      // Generate OXXO voucher for Mexico
      return {
        success: true,
        voucherCode: `OXXO-${Date.now().toString().substring(3, 12)}`,
        expiresIn: 172800, // 48 hours in seconds
        amount: paymentDetails.amount,
        currency: paymentDetails.currency
      };
      
    case 'm_pesa':
      // Generate M-Pesa payment request
      return {
        success: true,
        mpesaReference: `MP${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        phoneNumber: paymentDetails.phoneNumber,
        amount: paymentDetails.amount,
        currency: paymentDetails.currency
      };
      
    default:
      throw new Error(`Unsupported local payment method: ${localMethodId}`);
  }
}

/**
 * Convert amount between currencies
 * 
 * @param {number} amount Amount to convert
 * @param {string} fromCurrency Source currency
 * @param {string} toCurrency Target currency
 * @returns {Promise<number>} Converted amount
 */
export async function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  try {
    const rate = await getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
  } catch (error) {
    console.error('Currency conversion error:', error);
    throw new Error(`Failed to convert from ${fromCurrency} to ${toCurrency}`);
  }
}

/**
 * Get exchange rate between two currencies
 * 
 * @param {string} fromCurrency Source currency
 * @param {string} toCurrency Target currency
 * @returns {Promise<number>} Exchange rate
 */
export async function getExchangeRate(fromCurrency, toCurrency) {
  const cacheKey = `${fromCurrency}_${toCurrency}`;
  
  // Check cache first
  if (exchangeRateCache.has(cacheKey)) {
    const cached = exchangeRateCache.get(cacheKey);
    // Return cached rate if less than 5 minutes old
    if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.rate;
    }
  }
  
  try {
    // In a real implementation, this would call a price oracle or API
    // For demo purposes, we'll use hardcoded sample rates
    const sampleRates = {
      // ETH to fiat
      'ETH_USD': 3000,
      'ETH_EUR': 2800,
      'ETH_GBP': 2400,
      'ETH_JPY': 330000,
      
      // BTC to fiat
      'BTC_USD': 50000,
      'BTC_EUR': 46000,
      'BTC_GBP': 40000,
      
      // Stablecoins to fiat
      'USDT_USD': 1,
      'USDC_USD': 1,
      'DAI_USD': 1,
      
      // Fiat to fiat
      'USD_EUR': 0.93,
      'USD_GBP': 0.79,
      'USD_JPY': 110,
      'EUR_USD': 1.07,
      'GBP_USD': 1.26
    };
    
    // Attempt to find direct rate
    let rate = sampleRates[`${fromCurrency}_${toCurrency}`];
    
    // If no direct rate, try to calculate via USD
    if (!rate && fromCurrency !== 'USD' && toCurrency !== 'USD') {
      const fromToUsd = sampleRates[`${fromCurrency}_USD`];
      const usdToTarget = sampleRates[`USD_${toCurrency}`];
      
      if (fromToUsd && usdToTarget) {
        rate = fromToUsd * usdToTarget;
      }
    }
    
    // If still no rate, use reverse rate
    if (!rate) {
      const reverseRate = sampleRates[`${toCurrency}_${fromCurrency}`];
      if (reverseRate) {
        rate = 1 / reverseRate;
      }
    }
    
    // If we still don't have a rate, throw an error
    if (!rate) {
      throw new Error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
    }
    
    // Cache the rate
    exchangeRateCache.set(cacheKey, {
      rate,
      timestamp: Date.now()
    });
    
    return rate;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    throw error;
  }
}

/**
 * Refresh all exchange rates in the cache
 * 
 * @returns {Promise<boolean>} Success status
 */
export async function refreshExchangeRates() {
  try {
    // In a real implementation, this would batch-update all relevant rates
    // For demo purposes, we'll clear the cache to force fresh fetches
    exchangeRateCache.clear();
    
    // Pre-cache some common rates
    const currencies = [
      CURRENCIES.CRYPTO.ETH,
      CURRENCIES.CRYPTO.BTC,
      CURRENCIES.CRYPTO.USDT,
      CURRENCIES.FIAT.USD,
      CURRENCIES.FIAT.EUR,
      CURRENCIES.FIAT.GBP
    ];
    
    // Build a matrix of currency pairs and fetch rates
    for (const from of currencies) {
      for (const to of currencies) {
        if (from !== to) {
          try {
            await getExchangeRate(from, to);
          } catch (err) {
            console.warn(`Could not pre-cache rate for ${from} to ${to}`);
          }
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to refresh exchange rates:', error);
    return false;
  }
}

/**
 * Get user's payment settings
 * 
 * @returns {Object} User payment settings
 */
export function getUserSettings() {
  return { ...userSettings };
}

/**
 * Update user's payment settings
 * 
 * @param {Object} newSettings New settings
 * @returns {Object} Updated settings
 */
export function updateUserSettings(newSettings) {
  userSettings = {
    ...userSettings,
    ...newSettings
  };
  
  // Save to local storage
  localStorage.setItem('payment_settings', JSON.stringify(userSettings));
  
  return { ...userSettings };
}

/**
 * Validate payment details
 * 
 * @param {Object} details Payment details to validate
 * @throws {Error} If validation fails
 */
function validatePaymentDetails(details) {
  if (!details) {
    throw new Error('Payment details are required');
  }
  
  // Required fields for all payment types
  if (!details.amount || isNaN(parseFloat(details.amount)) || parseFloat(details.amount) <= 0) {
    throw new Error('Valid payment amount is required');
  }
  
  if (!details.currency) {
    throw new Error('Payment currency is required');
  }
  
  if (!details.method) {
    throw new Error('Payment method is required');
  }
  
  // Method-specific validation
  switch (details.method) {
    case PAYMENT_METHODS.CRYPTO:
      if (!details.recipient || !ethers.utils.isAddress(details.recipient)) {
        throw new Error('Valid recipient address is required for crypto payments');
      }
      break;
      
    case PAYMENT_METHODS.CREDIT_CARD:
      if (!details.cardDetails || !details.cardDetails.token) {
        throw new Error('Card details are required for credit card payments');
      }
      break;
      
    case PAYMENT_METHODS.MOBILE:
      if (!details.phoneNumber) {
        throw new Error('Phone number is required for mobile payments');
      }
      break;
      
    case PAYMENT_METHODS.LOCAL:
      if (!details.localMethodId) {
        throw new Error('Local payment method ID is required');
      }
      break;
  }
  
  // Check minimum payment amount
  const minAmount = userSettings.minimumPayment[details.currency] || 0;
  if (parseFloat(details.amount) < parseFloat(minAmount)) {
    throw new Error(`Minimum payment amount for ${details.currency} is ${minAmount}`);
  }
}

/**
 * Forgive an outstanding payment amount for a user
 * 
 * @param {string} address User wallet address
 * @param {number} amount Amount to forgive (default: 2.55)
 * @param {string} currency Currency of amount
 * @param {Object} options Additional options
 * @returns {Promise<Object>} Forgiveness result
 */
export async function forgivePaymentAmount(address, amount = 2.55, currency = CURRENCIES.CRYPTO.ETH, options = {}) {
  if (!BlockchainService.isConnected()) {
    throw new Error('Wallet not connected');
  }
  
  if (!address || !ethers.utils.isAddress(address)) {
    throw new Error('Valid wallet address is required');
  }
  
  try {
    // Check if caller has permission to forgive payments
    const caller = BlockchainService.getCurrentAccount();
    const hasPermission = await checkForgivePermission(caller);
    
    if (!hasPermission) {
      throw new Error('You do not have permission to forgive payments');
    }
    
    // Validate the amount is exactly 2.55 for the special forgiveness program
    if (options.strictAmount && Math.abs(parseFloat(amount) - 2.55) > 0.0001) {
      throw new Error('Only exactly 2.55 can be forgiven with this special program');
    }
    
    // Check if user has outstanding balance
    // In a real implementation, this would check against a database or smart contract
    // For demo purposes, we'll simulate the check
    
    // Generate a transaction hash for the forgiveness operation
    const txHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    // Log the forgiveness action for audit purposes
    console.log(`Payment of ${amount} ${currency} forgiven for ${address} by ${caller}`);
    
    // Return success response
    return {
      success: true,
      address,
      amount,
      currency,
      forgiveTimestamp: new Date().toISOString(),
      forgivenBy: caller,
      transactionHash: txHash,
      reason: options.reason || 'Special forgiveness program'
    };
  } catch (error) {
    console.error('Error forgiving payment:', error);
    return {
      success: false,
      error: error.message,
      address,
      amount,
      currency
    };
  }
}

/**
 * Check if an address has permission to forgive payments
 * 
 * @param {string} address Address to check
 * @returns {Promise<boolean>} Whether the address has permission
 */
async function checkForgivePermission(address) {
  // In a real implementation, this would check against a role-based system
  // For demo purposes, we'll use a simple list of authorized addresses
  
  // Platform admin addresses
  const authorizedAddresses = [
    '0x1234567890123456789012345678901234567890', // Example admin
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'  // Example finance team
  ];
  
  // If the user has a special role (like community moderator)
  if (await hasModeratorRole(address)) {
    return true;
  }
  
  return authorizedAddresses.includes(address.toLowerCase());
}

/**
 * Check if an address has moderator role
 * 
 * @param {string} address Address to check
 * @returns {Promise<boolean>} Whether the address has moderator role
 */
async function hasModeratorRole(address) {
  // In a real implementation, this would query a roles contract
  // For demo purposes, we'll return false
  return false;
}

/**
 * Calculate payment totals including fees
 * 
 * @param {number} baseAmount Base payment amount
 * @param {string} currency Payment currency
 * @param {Object} options Additional calculation options
 * @returns {Object} Payment calculation result
 */
export function calculatePaymentTotals(baseAmount, currency, options = {}) {
  if (!baseAmount || isNaN(baseAmount) || baseAmount <= 0) {
    throw new Error('Valid base amount required');
  }
  
  const {
    includeServiceFee = true,
    includeGasCost = true,
    serviceFeeBps = 250, // 2.5% default service fee
    gasEstimate = null,
  } = options;
  
  // Service fee calculation
  const serviceFee = includeServiceFee ? (baseAmount * serviceFeeBps / 10000) : 0;
  
  // Gas cost estimation
  let gasCost = 0;
  if (includeGasCost) {
    const gasPrice = options.gasPrice || DEFAULT_GAS_PRICE_GWEI;
    const gasLimit = gasEstimate || estimateGasForAmount(baseAmount, currency);
    gasCost = gasLimit * gasPrice * 1e-9; // Convert to ETH
  }
  
  // Tax completely removed (no calculation)
  const taxAmount = 0;
  
  // Calculate totals
  const subtotal = baseAmount;
  const totalFees = serviceFee + gasCost;
  const grandTotal = subtotal + totalFees;
  
  return {
    baseAmount: baseAmount,
    currency: currency,
    serviceFee: serviceFee,
    gasCost: gasCost,
    taxAmount: 0, // Always zero now
    subtotal: subtotal,
    totalFees: totalFees,
    grandTotal: grandTotal,
    isTaxFree: true, // Flag to indicate this is a tax-free calculation
    breakdown: {
      base: baseAmount,
      serviceFee: serviceFee,
      gas: gasCost,
      tax: 0  // Always zero
    }
  };
}

/**
 * Get current payment policy
 *
 * @returns {Object} Current payment policy
 */
export function getPaymentPolicy() {
  return {
    serviceFeeBps: 250, // 2.5%
    taxPolicy: {
      enabled: false, // Tax is now disabled
      rate: 0,
      description: "All transactions are tax-free"
    },
    gasSubsidy: {
      enabled: gasSubsidyEnabled,
      rate: gasSubsidyRate,
      eligibilityCriteria: gasSubsidyEligibilityCriteria
    }
  };
}

export default {
  initPaymentService,
  detectUserRegion,
  getAvailablePaymentMethods,
  processPayment,
  convertCurrency,
  getExchangeRate,
  refreshExchangeRates,
  getUserSettings,
  updateUserSettings,
  forgivePaymentAmount,
  calculatePaymentTotals,
  getPaymentPolicy,
  PAYMENT_REGIONS,
  PAYMENT_METHODS,
  CURRENCIES
};
