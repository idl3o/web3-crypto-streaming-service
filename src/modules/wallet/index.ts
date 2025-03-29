import { ethers } from 'ethers';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { logger } from '../logger';

dotenv.config();

interface UserSession {
    address: string;
    nonce: string;
    expires: number;
    authenticated: boolean;
}

/**
 * Wallet Module - Handles wallet connections and authentication
 */
export class WalletModule {
    private sessions: Map<string, UserSession>;
    private tokenExpiry: number;

    constructor() {
        this.sessions = new Map();
        this.tokenExpiry = parseInt(process.env.AUTH_TOKEN_EXPIRY || '3600') * 1000;

        // Clean expired sessions periodically
        setInterval(() => this.cleanExpiredSessions(), 15 * 60 * 1000);
    }

    /**
     * Generate authentication challenge
     */
    public generateChallenge(address: string): { nonce: string, message: string } {
        const nonce = crypto.randomBytes(16).toString('hex');
        const message = `Sign this message to authenticate with Web3 Crypto Streaming Service. Nonce: ${nonce}`;

        // Store session with nonce
        this.sessions.set(address.toLowerCase(), {
            address: address.toLowerCase(),
            nonce,
            expires: Date.now() + this.tokenExpiry,
            authenticated: false
        });

        return { nonce, message };
    }

    /**
     * Verify signature
     */
    public async verifySignature(
        address: string,
        message: string,
        signature: string
    ): Promise<boolean> {
        try {
            // Recover the address from the signature
            const recoveredAddress = ethers.utils.verifyMessage(message, signature);

            // Check if addresses match
            if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
                logger.warn(`Signature verification failed: address mismatch for ${address}`);
                return false;
            }

            // Check if we have a session for this address
            const session = this.sessions.get(address.toLowerCase());
            if (!session) {
                logger.warn(`No authentication challenge found for ${address}`);
                return false;
            }

            // Check if the message contains the correct nonce
            if (!message.includes(session.nonce)) {
                logger.warn(`Signature verification failed: nonce mismatch for ${address}`);
                return false;
            }

            // Mark session as authenticated
            session.authenticated = true;
            this.sessions.set(address.toLowerCase(), session);

            return true;
        } catch (err) {
            logger.error(`Signature verification error: ${err}`);
            return false;
        }
    }

    /**
     * Check authentication status
     */
    public isAuthenticated(address: string): boolean {
        const session = this.sessions.get(address.toLowerCase());

        if (!session) {
            return false;
        }

        // Check if session has expired
        if (session.expires < Date.now()) {
            this.sessions.delete(address.toLowerCase());
            return false;
        }

        return session.authenticated;
    }

    /**
     * Generate authentication token
     */
    public generateAuthToken(address: string): string | null {
        const session = this.sessions.get(address.toLowerCase());

        if (!session || !session.authenticated) {
            return null;
        }

        // Generate a token
        const token = crypto.randomBytes(32).toString('hex');

        // Store token
        session.expires = Date.now() + this.tokenExpiry;
        this.sessions.set(address.toLowerCase(), session);

        return token;
    }

    /**
     * Clean expired sessions
     */
    private cleanExpiredSessions(): void {
        const now = Date.now();
        let expiredCount = 0;

        for (const [address, session] of this.sessions.entries()) {
            if (session.expires < now) {
                this.sessions.delete(address);
                expiredCount++;
            }
        }

        if (expiredCount > 0) {
            logger.info(`Cleaned ${expiredCount} expired sessions`);
        }
    }
}

// Export singleton instance
export const wallet = new WalletModule();
