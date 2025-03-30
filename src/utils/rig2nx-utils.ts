import { cryptoSecurityService, RIG2NXToken } from '../services/CryptoSecurityService';

/**
 * Format a RIG2NX token for display (partially masked)
 * @param token RIG2NX token string
 */
export function formatRIG2NXToken(token: string): string {
  if (!token || token.length < 20) {
    return '********';
  }
  
  // Show first 10 and last 5 characters
  const prefix = token.substring(0, 10);
  const suffix = token.substring(token.length - 5);
  const maskedLength = token.length - 15;
  
  return `${prefix}${'*'.repeat(maskedLength)}${suffix}`;
}

/**
 * Verify if a string is a valid RIG2NX token
 * @param token String to verify
 */
export function isValidRIG2NXToken(token: string): boolean {
  if (!token || !token.startsWith('rig2nx')) {
    return false;
  }
  
  return cryptoSecurityService.validateRIG2NXToken(token) !== null;
}

/**
 * Generate a RIG2NX token for authentication
 * @param userIdentifier User identifier to include in token
 * @param type Token type
 */
export function generateAuthRIG2NXToken(userIdentifier: string, type: string = 'a'): string {
  // Create custom payload with user identifier
  const timestamp = Date.now().toString().slice(-10);
  const payload = `${timestamp}${userIdentifier.slice(0, 14)}`;
  
  // Generate token
  const tokenData = cryptoSecurityService.generateRIG2NXToken(payload, type);
  return tokenData.token;
}

/**
 * Extract user identifier from RIG2NX token payload
 * @param token RIG2NX token
 */
export function extractUserIdentifier(token: string): string | null {
  const tokenData = cryptoSecurityService.validateRIG2NXToken(token);
  
  if (!tokenData) {
    return null;
  }
  
  // Payload format: [timestamp-10-digits][user-identifier]
  return tokenData.payload.slice(10);
}

/**
 * Get token generation time
 * @param token RIG2NX token
 */
export function getTokenTimestamp(token: string): Date | null {
  const tokenData = cryptoSecurityService.validateRIG2NXToken(token);
  
  if (!tokenData) {
    return null;
  }
  
  // Extract timestamp from the beginning of payload
  const timestampStr = tokenData.payload.slice(0, 10);
  const timestamp = parseInt(timestampStr, 10);
  
  if (isNaN(timestamp)) {
    return null;
  }
  
  return new Date(timestamp);
}

/**
 * Generate a challenge-response token based on a challenge
 * @param challenge Challenge token
 * @param secret Secret value (e.g. private key) 
 */
export async function generateResponseToken(challenge: string, secret: string): Promise<string> {
  if (!isValidRIG2NXToken(challenge)) {
    throw new Error('Invalid challenge token');
  }
  
  // Calculate response based on challenge and secret
  const challengeData = cryptoSecurityService.validateRIG2NXToken(challenge);
  if (!challengeData) {
    throw new Error('Challenge validation failed');
  }
  
  // Create response payload by combining challenge payload and secret hash
  const secretHash = await sha256(secret);
  const shortHash = secretHash.slice(0, 8);
  
  // Use challenge payload and hash for response
  const responsePayload = `${challengeData.payload}${shortHash}`;
  
  // Generate response token
  const responseToken = cryptoSecurityService.generateRIG2NXToken(
    responsePayload.slice(0, 24), // Keep within length limit
    'r' // Response type
  );
  
  return responseToken.token;
}

/**
 * Simple SHA-256 hash function
 * @param message Message to hash
 */
async function sha256(message: string): Promise<string> {
  // Use Web Crypto API if available
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Fallback for non-browser environments
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(message).digest('hex');
  }
}
