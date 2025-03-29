import crypto from 'crypto';

/**
 * Simple creator authentication service.
 * In a production environment, this would use proper JWT verification
 * and role-based access control.
 */
export class CreatorAuth {
    private static instance: CreatorAuth;
    private tokens: Map<string, { userId: string; expires: number }>;

    private constructor() {
        this.tokens = new Map();
    }

    public static getInstance(): CreatorAuth {
        if (!CreatorAuth.instance) {
            CreatorAuth.instance = new CreatorAuth();
        }
        return CreatorAuth.instance;
    }

    /**
     * Generate a token for a creator
     */
    public generateCreatorToken(userId: string, expiresInHours: number = 24): string {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = Date.now() + (expiresInHours * 60 * 60 * 1000);

        this.tokens.set(token, {
            userId,
            expires
        });

        return token;
    }

    /**
     * Verify if a token grants creator access
     */
    public verifyCreatorAccess(token: string): boolean {
        const tokenData = this.tokens.get(token);

        if (!tokenData) {
            return false;
        }

        if (tokenData.expires < Date.now()) {
            this.tokens.delete(token);
            return false;
        }

        return true;
    }

    /**
     * Get user ID associated with a token
     */
    public getUserId(token: string): string | null {
        const tokenData = this.tokens.get(token);
        return tokenData && tokenData.expires > Date.now() ? tokenData.userId : null;
    }

    /**
     * Clean expired tokens periodically
     */
    public startCleanupJob(): void {
        setInterval(() => {
            const now = Date.now();
            for (const [token, data] of this.tokens.entries()) {
                if (data.expires < now) {
                    this.tokens.delete(token);
                }
            }
        }, 1000 * 60 * 60); // Clean every hour
    }
}
