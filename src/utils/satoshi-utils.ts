/**
 * Satoshi Utilities
 * Provides Bitcoin-specific functionality for the Web3 Crypto Streaming Service
 */

// Constants
export const SATOSHI_PER_BITCOIN = 100_000_000;
export const SATOSHI_SYMBOL = 'sat';
export const BITCOIN_SYMBOL = '₿';
export const STANDARD_STREAMING_AMOUNT = 40_000; // 40k sats standard payment
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * Convert Bitcoin to Satoshi
 * @param btc Bitcoin amount
 * @returns Satoshi amount (1 BTC = 100,000,000 satoshi)
 */
export function btcToSatoshi(btc: number): number {
  return Math.floor(btc * SATOSHI_PER_BITCOIN);
}

/**
 * Convert Satoshi to Bitcoin
 * @param satoshi Satoshi amount
 * @returns Bitcoin amount
 */
export function satoshiToBtc(satoshi: number): number {
  return satoshi / SATOSHI_PER_BITCOIN;
}

/**
 * Format a Satoshi amount with appropriate units
 * @param satoshi Satoshi amount
 * @param includeSymbol Whether to include the symbol in the output
 * @returns Formatted string
 */
export function formatSatoshi(satoshi: number, includeSymbol = true): string {
  if (satoshi < 1000) {
    return `${satoshi}${includeSymbol ? ' ' + SATOSHI_SYMBOL : ''}`;
  } else if (satoshi < SATOSHI_PER_BITCOIN) {
    return `${(satoshi / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })}k ${SATOSHI_SYMBOL}`;
  } else {
    const btc = satoshiToBtc(satoshi);
    return `${btc.toLocaleString('en-US', { maximumFractionDigits: 8 })}${includeSymbol ? ' ' + BITCOIN_SYMBOL : ''}`;
  }
}

/**
 * Validate Bitcoin address (basic validation)
 * @param address Bitcoin address to validate
 * @returns Boolean indicating if address appears valid
 */
export function isValidBitcoinAddress(address: string): boolean {
  // Basic validation - can be enhanced with more complete validation logic
  if (!address) return false;
  
  // Check for basic formats
  const legacyFormat = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
  const segwitFormat = /^bc1[ac-hj-np-z02-9]{39,59}$/.test(address);
  
  return legacyFormat || segwitFormat;
}

/**
 * Calculate transaction fee in satoshis
 * @param sizeInBytes Transaction size in bytes
 * @param satPerByte Fee rate in satoshis per byte
 * @returns Fee in satoshis
 */
export function calculateTxFee(sizeInBytes: number, satPerByte: number): number {
  return Math.ceil(sizeInBytes * satPerByte);
}

/**
 * Determine if a satoshi amount is dust (economically unviable to spend)
 * @param amount Amount in satoshis
 * @param dustThreshold Threshold in satoshis (default: 546, common Bitcoin dust threshold)
 * @returns Boolean indicating if amount is considered dust
 */
export function isDust(amount: number, dustThreshold = 546): boolean {
  return amount < dustThreshold;
}

/**
 * Calculates optimized fee for retry attempts (generally lower on retries)
 * @param baseFeeSats Base fee in satoshis
 * @param retryAttempt The retry attempt number (0 = original attempt)
 * @returns Optimized fee for the retry attempt
 */
export function calculateRetryFee(baseFeeSats: number, retryAttempt: number): number {
  if (retryAttempt === 0) return baseFeeSats;
  
  // Apply discount to incentivize retry (up to 30% discount)
  const discountFactor = Math.min(retryAttempt * 0.1, 0.3);
  return Math.max(Math.floor(baseFeeSats * (1 - discountFactor)), 1);
}

/**
 * Generate a human-readable message for retry attempts
 * @param attempt Current retry attempt (0 = initial attempt)
 * @param maxAttempts Maximum number of attempts allowed
 * @returns User-friendly message
 */
export function getRetryMessage(attempt: number, maxAttempts: number = MAX_RETRY_ATTEMPTS): string {
  if (attempt === 0) return "";
  if (attempt >= maxAttempts) return "Final retry attempt";
  
  return `Retry attempt ${attempt} of ${maxAttempts}`;
}

/**
 * Check if a transaction should be retried automatically
 * @param errorCode Error code from failed transaction
 * @returns Whether the transaction should be retried automatically
 */
export function shouldAutoRetry(errorCode: string): boolean {
  // List of error codes that should be automatically retried
  const autoRetryErrors = [
    'timeout',
    'network_error',
    'insufficient_fee',
    'mempool_conflict',
    'temporary_failure'
  ];
  
  return autoRetryErrors.includes(errorCode);
}
