import { 
  gubchlllrbService, 
  GubchlllrbOperation, 
  GubchlllrbToken 
} from '../services/GubchlllrbService';

/**
 * Format a token for display (partially masked)
 * @param token Token string
 */
export function formatToken(token: string): string {
  if (!token || token.length < 20) {
    return '********';
  }
  
  // Show prefix and last 8 characters, mask the middle part
  const prefix = token.substring(0, 13); // /gubchlllrb<>
  const suffix = token.substring(token.length - 8);
  const maskedLength = token.length - (prefix.length + suffix.length);
  
  return `${prefix}${'*'.repeat(maskedLength)}${suffix}`;
}

/**
 * Check if a token is valid
 * @param token Token to check
 */
export function isValidToken(token: string): boolean {
  const result = gubchlllrbService.validateToken(token);
  return result.valid;
}

/**
 * Generate an authentication token
 * @param userId User identifier
 */
export function generateAuthToken(userId: string): string {
  const token = gubchlllrbService.generateToken(
    GubchlllrbOperation.AUTHENTICATE,
    userId
  );
  
  return token.token;
}

/**
 * Create a token chain with specified length
 * @param length Number of tokens in the chain
 * @param baseData Base data for the first token
 */
export async function createTokenChain(length: number, baseData: string): Promise<string[]> {
  if (length < 1) {
    return [];
  }
  
  // Create the first token
  const firstToken = gubchlllrbService.generateToken(
    GubchlllrbOperation.CHAIN,
    baseData
  );
  
  const chain: string[] = [firstToken.token];
  
  // Generate the chain
  let currentToken = firstToken.token;
  
  for (let i = 1; i < length; i++) {
    const nextToken = gubchlllrbService.chainToken(
      currentToken,
      `${baseData}-${i}`
    );
    
    if (!nextToken) break;
    
    chain.push(nextToken.token);
    currentToken = nextToken.token;
  }
  
  return chain;
}

/**
 * Get token information in human-readable format
 * @param token Token string or object
 */
export function getTokenInfo(token: string | GubchlllrbToken): {
  type: string;
  created: Date;
  isValid: boolean;
  operation: string;
} {
  // Convert string to token object if needed
  let tokenObj: GubchlllrbToken | null;
  
  if (typeof token === 'string') {
    const result = gubchlllrbService.validateToken(token);
    tokenObj = result.valid ? result.token! : null;
  } else {
    tokenObj = token;
  }
  
  if (!tokenObj) {
    return {
      type: 'Unknown',
      created: new Date(),
      isValid: false,
      operation: 'Invalid'
    };
  }
  
  // Map operation to readable name
  const operationLabels: Record<string, string> = {
    'v': 'Validation',
    'a': 'Authentication',
    'c': 'Chain',
    'r': 'Reference',
    'b': 'Build'
  };
  
  return {
    type: 'GUBCHLLLRB Token',
    created: new Date(tokenObj.timestamp),
    isValid: tokenObj.isValid,
    operation: operationLabels[tokenObj.operation] || tokenObj.operation
  };
}

/**
 * Create a reference URL with embedded token
 * @param baseUrl Base URL
 * @param resourceId Resource identifier
 * @param metadata Additional metadata
 */
export function createReferenceUrl(
  baseUrl: string,
  resourceId: string,
  metadata?: Record<string, any>
): string {
  const token = gubchlllrbService.createReferenceToken(resourceId, metadata);
  return `${baseUrl}?ref=${encodeURIComponent(token.token)}`;
}

/**
 * Extract resource ID from a reference token
 * @param token Reference token
 */
export function extractResourceFromToken(token: string): string | null {
  try {
    const result = gubchlllrbService.validateToken(token);
    
    if (!result.valid || result.token?.operation !== GubchlllrbOperation.REFERENCE) {
      return null;
    }
    
    // Extract data from hash
    // In a real implementation, this would decode properly stored data
    // This is a simplified version
    return result.token.hash;
  } catch (error) {
    console.error('Error extracting resource from token:', error);
    return null;
  }
}
