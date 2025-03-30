import { hashTokenVerificationService, VerificationResult } from '../services/HashTokenVerificationService';

/**
 * Generate a new hash token
 * @param payload Data to include in token
 * @param expirationMinutes Minutes until token expires
 */
export async function generateHashToken(
  payload: string | Record<string, any>,
  expirationMinutes?: number
): Promise<string> {
  const expiresInMs = expirationMinutes ? expirationMinutes * 60 * 1000 : undefined;
  return hashTokenVerificationService.generateToken(payload, expiresInMs);
}

/**
 * Verify a hash token
 * @param token Token to verify
 */
export async function verifyHashToken(token: string): Promise<VerificationResult> {
  return hashTokenVerificationService.verifyToken(token);
}

/**
 * Format a token for display (partially masked)
 * @param token Hash token
 */
export function formatHashToken(token: string): string {
  if (!token || token.length < 15) {
    return '*******';
  }
  
  // Show prefix and last 4 characters
  const prefix = token.substring(0, 6);
  const suffix = token.substring(token.length - 4);
  const maskedLength = token.length - 10;
  
  return `${prefix}${'*'.repeat(maskedLength)}${suffix}`;
}

/**
 * Create a verification URL with token
 * @param baseUrl Base URL
 * @param token Hash token
 */
export function createVerificationUrl(baseUrl: string, token: string): string {
  return `${baseUrl}?verify=${encodeURIComponent(token)}`;
}

/**
 * Extract token from URL
 * @param url URL containing token
 */
export function extractTokenFromUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.searchParams.get('verify');
  } catch {
    // Try to extract from string
    const match = url.match(/[?&]verify=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
}

/**
 * Format risk level for display
 * @param level Risk level
 */
export function formatRiskLevel(level: string): {
  text: string;
  color: string;
} {
  switch (level) {
    case 'none':
      return { text: 'No Risk', color: '#4caf50' };
    case 'low':
      return { text: 'Low Risk', color: '#8bc34a' };
    case 'moderate':
      return { text: 'Moderate Risk', color: '#ffc107' };
    case 'high':
      return { text: 'High Risk', color: '#ff9800' };
    case 'critical':
      return { text: 'Critical Risk', color: '#f44336' };
    default:
      return { text: 'Unknown', color: '#9e9e9e' };
  }
}

/**
 * Validate a hash token format
 * @param token Token to validate
 */
export function isValidHashTokenFormat(token: string): boolean {
  // Basic format validation for H#TBVKCS# tokens
  const validPatterns = [
    /^h#t[a-zA-Z0-9]{8}[a-zA-Z0-9]{16}[a-zA-Z0-9]{4}$/,
    /^v#k[a-zA-Z0-9]{6}b[a-zA-Z0-9]{10}cs#$/,
    /^h#k[a-zA-Z0-9]{6}s[a-zA-Z0-9]{24}$/
  ];
  
  return validPatterns.some(pattern => pattern.test(token));
}
