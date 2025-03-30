/**
 * Format DOGE amount for display
 * @param dogeAmount Amount in DOGE
 */
export function formatDoge(dogeAmount: number): string {
  return `Ð${dogeAmount.toLocaleString(undefined, { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 8
  })}`;
}

/**
 * Convert DOGE to fiat currency
 * @param dogeAmount Amount in DOGE
 * @param dogePrice Price of 1 DOGE in fiat currency
 * @param currency Fiat currency code
 */
export function dogeToFiat(
  dogeAmount: number, 
  dogePrice: number, 
  currency = 'USD'
): string {
  const fiatAmount = dogeAmount * dogePrice;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(fiatAmount);
}

/**
 * Convert fiat to DOGE amount
 * @param fiatAmount Amount in fiat currency
 * @param dogePrice Price of 1 DOGE in fiat currency
 */
export function fiatToDoge(fiatAmount: number, dogePrice: number): number {
  return fiatAmount / dogePrice;
}

/**
 * Validate a Dogecoin address
 * @param address Dogecoin address to validate
 */
export function isValidDogeAddress(address: string): boolean {
  // Basic validation: Dogecoin addresses start with D, A or 9
  if (!/^[DA9][1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) {
    return false;
  }
  
  // In a real implementation, this would include additional validation logic
  // such as Base58Check encoding validation
  
  return true;
}

/**
 * Generate a QR code value for a Dogecoin payment
 * @param address Dogecoin address
 * @param amount Amount in DOGE
 * @param label Optional label
 */
export function generateDogeQrValue(
  address: string, 
  amount?: number, 
  label?: string
): string {
  let qrValue = `dogecoin:${address}`;
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
 * Truncate a Dogecoin address for display
 * @param address Dogecoin address
 */
export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}
