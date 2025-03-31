import { 
  poeStreamTokenService, 
  TokenType, 
  SecurityTier, 
  POEStreamToken 
} from '../services/POEStreamCryptoTokenProtocolService';

/**
 * Generate a streaming access token
 * @param contentId Content identifier
 * @param userId User identifier
 * @param durationMinutes Token duration in minutes
 */
export async function generateStreamingToken(
  contentId: string,
  userId: string,
  durationMinutes: number = 60
): Promise<string> {
  const payload = {
    contentId,
    userId,
    timestamp: Date.now()
  };
  
  const token = await poeStreamTokenService.generateToken(
    TokenType.STREAMING,
    payload,
    durationMinutes,
    SecurityTier.STANDARD,
    { source: 'streaming-api' }
  );
  
  return token.id;
}

/**
 * Generate a transaction token for payments
 * @param paymentId Payment identifier
 * @param amount Payment amount
 * @param currency Currency code
 * @param userId User identifier
 */
export async function generateTransactionToken(
  paymentId: string,
  amount: number,
  currency: string,
  userId: string
): Promise<string> {
  const payload = {
    paymentId,
    amount,
    currency,
    userId,
    timestamp: Date.now()
  };
  
  const token = await poeStreamTokenService.generateToken(
    TokenType.TRANSACTION,
    payload,
    120, // 2 hours
    SecurityTier.FINANCIAL,
    { source: 'payment-api' }
  );
  
  return token.id;
}

/**
 * Generate an administrative access token
 * @param userId Admin user identifier
 * @param permissions Array of permission strings
 */
export async function generateAdminToken(
  userId: string,
  permissions: string[]
): Promise<string> {
  const payload = {
    userId,
    permissions,
    timestamp: Date.now()
  };
  
  const token = await poeStreamTokenService.generateToken(
    TokenType.ACCESS,
    payload,
    240, // 4 hours
    SecurityTier.ADMIN,
    { source: 'admin-api' }
  );
  
  return token.id;
}

/**
 * Verify a POE Stream token
 * @param tokenId Token ID to verify
 */
export async function verifyToken(tokenId: string): Promise<boolean> {
  const result = await poeStreamTokenService.verifyToken(tokenId);
  return result.valid;
}

/**
 * Extract payload from a token
 * @param tokenId Token ID
 */
export async function getTokenPayload<T = Record<string, any>>(tokenId: string): Promise<T | null> {
  try {
    const token = poeStreamTokenService.getToken(tokenId);
    
    if (!token) {
      return null;
    }
    
    // Parse payload
    if (typeof token.payload === 'string') {
      try {
        return JSON.parse(token.payload) as T;
      } catch {
        return null;
      }
    }
    
    return token.payload as unknown as T;
  } catch (error) {
    console.error('Error getting token payload:', error);
    return null;
  }
}

/**
 * Format a token ID for display (partially masked)
 * @param tokenId Token ID
 */
export function formatTokenId(tokenId: string): string {
  if (!tokenId || tokenId.length < 15) {
    return '********';
  }
  
  const parts = tokenId.split('-');
  
  if (parts.length < 3) {
    return tokenId.substring(0, 4) + '...' + tokenId.substring(tokenId.length - 4);
  }
  
  return `${parts[0]}-${parts[1]}-***-${parts[parts.length - 1].substring(0, 4)}`;
}

/**
 * Check if a token has required permissions
 * @param tokenId Token ID
 * @param requiredPermissions Array of required permission strings
 */
export async function hasPermissions(
  tokenId: string,
  requiredPermissions: string[]
): Promise<boolean> {
  const result = await poeStreamTokenService.verifyToken(tokenId);
  
  if (!result.valid || !result.token) {
    return false;
  }
  
  // For admin tokens, check permissions in payload
  if (result.token.type === TokenType.ACCESS) {
    try {
      const payload = JSON.parse(result.token.payload);
      const permissions = payload.permissions || [];
      
      // Check if all required permissions are in the token
      return requiredPermissions.every(perm => permissions.includes(perm));
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * Revoke a token
 * @param tokenId Token ID to revoke
 * @param reason Reason for revocation
 */
export function revokeToken(tokenId: string, reason?: string): boolean {
  return poeStreamTokenService.revokeToken(tokenId, reason);
}

/**
 * Create an authorization header with POEStream token
 * @param tokenId Token ID
 */
export function createAuthHeader(tokenId: string): string {
  return `POEStream ${tokenId}`;
}

/**
 * Extract token ID from authorization header
 * @param authHeader Authorization header
 */
export function extractTokenFromHeader(authHeader: string): string | null {
  if (!authHeader || !authHeader.startsWith('POEStream ')) {
    return null;
  }
  
  return authHeader.substring(10);
}
