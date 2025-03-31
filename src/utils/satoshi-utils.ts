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
 * Convert BTC to satoshis
 * @param btcAmount Amount in BTC
 */
export function btcToSatoshis(btcAmount: number): number {
  return Math.floor(btcAmount * 100000000);
}

/**
 * Convert satoshis to BTC
 * @param satoshis Amount in satoshis
 */
export function satoshisToBtc(satoshis: number): number {
  return satoshis / 100000000;
}

/**
 * Format BTC amount for display
 * @param btcAmount Amount in BTC
 */
export function formatBtc(btcAmount: number): string {
  return `₿${btcAmount.toLocaleString(undefined, { 
    minimumFractionDigits: 8,
    maximumFractionDigits: 8
  })}`;
}

/**
 * Format satoshi amount for display
 * @param satoshis Amount in satoshis
 */
export function formatSatoshis(satoshis: number): string {
  return `${satoshis.toLocaleString()} sat`;
}

/**
 * Convert BTC to fiat currency
 * @param btcAmount Amount in BTC
 * @param btcPrice Price of 1 BTC in fiat currency
 * @param currency Fiat currency code
 */
export function btcToFiat(
  btcAmount: number, 
  btcPrice: number, 
  currency = 'USD'
): string {
  const fiatAmount = btcAmount * btcPrice;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(fiatAmount);
}

/**
 * Convert fiat to BTC amount
 * @param fiatAmount Amount in fiat currency
 * @param btcPrice Price of 1 BTC in fiat currency
 */
export function fiatToBtc(fiatAmount: number, btcPrice: number): number {
  return fiatAmount / btcPrice;
}

/**
 * Validate a Bitcoin address
 * @param address Bitcoin address to validate
 */
export function isValidBtcAddress(address: string): boolean {
  // Basic validation: Legacy, SegWit, or Native SegWit
  const legacyRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
  const segwitRegex = /^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/;
  const bech32Regex = /^(bc1)[a-zA-HJ-NP-Z0-9]{25,90}$/;
  
  return legacyRegex.test(address) || segwitRegex.test(address) || bech32Regex.test(address);
}

/**
 * Generate a QR code value for a Bitcoin payment
 * @param address Bitcoin address
 * @param amount Amount in BTC
 * @param label Optional label
 */
export function generateBtcQrValue(
  address: string, 
  amount?: number, 
  label?: string
): string {
  let qrValue = `bitcoin:${address}`;
  const params = [];
  
  if (amount !== undefined && amount > 0) {
    params.push(`amount=${amount.toFixed(8)}`);
  }
  
  if (label) {
    params.push(`label=${encodeURIComponent(label)}`);
  }
  
  if (params.length > 0) {
    qrValue += `?${params.join('&')}`;
  }
  
  return qrValue;
}

/**
 * Truncate a Bitcoin address for display
 * @param address Bitcoin address
 */
export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Calculate estimated transaction fee
 * @param sizeInBytes Transaction size in bytes
 * @param satoshisPerByte Fee rate in satoshis per byte
 */
export function calculateTxFee(sizeInBytes: number, satoshisPerByte: number): number {
  return Math.ceil(sizeInBytes * satoshisPerByte);
}
