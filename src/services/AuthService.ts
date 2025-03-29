import { ethers } from 'ethers';
import { CryptoServiceError } from './errors/CryptoServiceError';

export class AuthService {
    private activeUsers: Map<string, string> = new Map(); // userId -> walletAddress

    public async authenticateUser(signature: string, message: string): Promise<string> {
        try {
            const address = ethers.utils.verifyMessage(message, signature);
            const userId = `user_${address.substring(2, 10)}`;
            this.activeUsers.set(userId, address);
            return userId;
        } catch (error) {
            throw new CryptoServiceError('Authentication failed', 'AUTH_FAILED', error);
        }
    }

    public isAuthenticated(userId: string): boolean {
        return this.activeUsers.has(userId);
    }

    public getWalletAddress(userId: string): string | undefined {
        return this.activeUsers.get(userId);
    }

    public logout(userId: string): void {
        this.activeUsers.delete(userId);
    }
}
