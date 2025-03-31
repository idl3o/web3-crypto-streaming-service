import { Request, Response, NextFunction } from 'express';
import { extractTokenFromHeader, verifyToken, hasPermissions } from '../../utils/poestream-utils';
import { poeStreamTokenService, TokenType } from '../../services/POEStreamCryptoTokenProtocolService';
import { ioErrorService, IOErrorType, IOErrorSeverity } from '../../services/IOErrorService';

/**
 * Middleware options
 */
export interface POEAuthOptions {
  tokenTypes?: TokenType[];
  requiredPermissions?: string[];
  allowExpired?: boolean;
}

/**
 * POE Stream token authentication middleware
 * Verifies POE Stream tokens in request headers
 * @param options Authentication options
 */
export function poeTokenAuth(options: POEAuthOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'auth_required'
        });
      }
      
      // Extract token from header
      const token = extractTokenFromHeader(authHeader);
      
      if (!token) {
        return res.status(401).json({ 
          error: 'Invalid authentication format',
          code: 'invalid_auth_format' 
        });
      }
      
      // Verify token
      const verificationResult = await poeStreamTokenService.verifyToken(token);
      
      if (!verificationResult.valid || !verificationResult.token) {
        return res.status(401).json({ 
          error: verificationResult.error || 'Invalid token',
          code: 'invalid_token'
        });
      }
      
      // Check token type if specified
      if (options.tokenTypes && options.tokenTypes.length > 0) {
        if (!options.tokenTypes.includes(verificationResult.token.type)) {
          return res.status(403).json({
            error: 'Incorrect token type',
            code: 'invalid_token_type'
          });
        }
      }
      
      // Check permissions if required
      if (options.requiredPermissions && options.requiredPermissions.length > 0) {
        const hasRequiredPermissions = await hasPermissions(token, options.requiredPermissions);
        
        if (!hasRequiredPermissions) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            code: 'insufficient_permissions'
          });
        }
      }
      
      // Attach token info to request
      req.user = {
        tokenId: token,
        ...JSON.parse(verificationResult.token.payload)
      };
      
      next();
    } catch (error) {
      // Log error
      ioErrorService.reportError({
        type: IOErrorType.SECURITY,
        severity: IOErrorSeverity.WARNING,
        message: 'POE Token authentication failed',
        details: error instanceof Error ? error.message : String(error),
        retryable: false,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return res.status(500).json({
        error: 'Authentication error',
        code: 'auth_error'
      });
    }
  };
}

// Export types for Express request augmentation
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
