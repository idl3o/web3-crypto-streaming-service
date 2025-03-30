import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { authRecoveryHandler } from './AuthRecoveryHandler';

/**
 * Supported identity providers
 */
export enum IdentityProvider {
    METAMASK = 'metamask',
    WALLET_CONNECT = 'walletconnect',
    EMAIL = 'email',
    SOCIAL = 'social',
    NFT = 'nft',
    GUEST = 'guest',
}

/**
 * Identity verification level
 */
export enum VerificationLevel {
    NONE = 0,
    BASIC = 1,
    VERIFIED = 2,
    PREMIUM = 3,
}

/**
 * User identity interface
 */
export interface UserIdentity {
    id: string;
    provider: IdentityProvider;
    walletAddress?: string;
    email?: string;
    displayName?: string;
    avatarUrl?: string;
    verificationLevel: VerificationLevel;
    metadata: Record<string, any>;
    createdAt: Date;
    lastLoginAt: Date;
}

/**
 * Connection options for identity providers
 */
export interface ConnectionOptions {
    provider: IdentityProvider;
    silent?: boolean;
    forceRefresh?: boolean;
    timeout?: number;
    chainId?: number;
}

/**
 * Central identity management service for the Web3 Crypto Streaming platform
 * Handles user authentication, wallet connections, and identity verification
 */
export class IdentityManager extends EventEmitter {
    private static instance: IdentityManager;
    private currentIdentity: UserIdentity | null = null;
    private provider: any = null;
    private connectedWallet: string | null = null;
    private supportedProviders: Set<IdentityProvider> = new Set();
    private verificationCache: Map<string, { level: VerificationLevel, expiresAt: number }> = new Map();

    private constructor() {
        super();

        // Initialize supported providers
        this.supportedProviders.add(IdentityProvider.METAMASK);
        this.supportedProviders.add(IdentityProvider.WALLET_CONNECT);
        this.supportedProviders.add(IdentityProvider.GUEST);

        this.setupEventListeners();
    }

    public static getInstance(): IdentityManager {
        if (!IdentityManager.instance) {
            IdentityManager.instance = new IdentityManager();
        }
        return IdentityManager.instance;
    }

    private setupEventListeners(): void {
        // Listen for window events when in browser environment
        if (typeof window !== 'undefined') {
            window.addEventListener('focus', () => {
                this.refreshIdentityIfNeeded();
            });
        }

        // Use the AuthRecoveryHandler for recovery
        authRecoveryHandler.on('recovery-success', this.handleRecoverySuccess.bind(this));
    }

    /**
     * Handle successful recovery by refreshing the current identity
     */
    private async handleRecoverySuccess(data: { userId: string }): Promise<void> {
        if (this.currentIdentity && this.currentIdentity.id === data.userId) {
            await this.refreshIdentity();
        }
    }

    /**
     * Check if a provider is supported
     */
    public isProviderSupported(provider: IdentityProvider): boolean {
        return this.supportedProviders.has(provider);
    }

    /**
     * Connect with a specific identity provider
     */
    public async connect(options: ConnectionOptions): Promise<UserIdentity> {
        if (!this.isProviderSupported(options.provider)) {
            throw new Error(`Identity provider ${options.provider} is not supported`);
        }

        try {
            let identity: UserIdentity | null = null;

            switch (options.provider) {
                case IdentityProvider.METAMASK:
                    identity = await this.connectWithMetaMask(options);
                    break;

                case IdentityProvider.WALLET_CONNECT:
                    identity = await this.connectWithWalletConnect(options);
                    break;

                case IdentityProvider.GUEST:
                    identity = await this.createGuestIdentity();
                    break;

                default:
                    throw new Error(`Identity provider ${options.provider} not implemented`);
            }

            if (!identity) {
                throw new Error(`Failed to establish identity with provider ${options.provider}`);
            }

            this.currentIdentity = identity;
            this.emit('identity:connected', { identity });

            return identity;
        } catch (error) {
            this.emit('identity:error', {
                provider: options.provider,
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw error;
        }
    }

    /**
     * Connect using MetaMask
     */
    private async connectWithMetaMask(options: ConnectionOptions): Promise<UserIdentity> {
        if (typeof window === 'undefined' || !window.ethereum) {
            throw new Error('MetaMask not available');
        }

        try {
            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const address = accounts[0];

            // Create ethers provider
            this.provider = new ethers.providers.Web3Provider(window.ethereum);

            // Switch to specified chain if needed
            if (options.chainId) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: `0x${options.chainId.toString(16)}` }],
                    });
                } catch (switchError: any) {
                    // Chain doesn't exist - we could handle adding it here
                    if (switchError.code === 4902) {
                        throw new Error(`Chain with ID ${options.chainId} not available`);
                    }
                    throw switchError;
                }
            }

            // Verify ownership of address through signature
            const timestamp = Date.now();
            const message = `Authenticate with Web3 Crypto Streaming Service: ${timestamp}`;
            const signature = await this.provider.getSigner().signMessage(message);

            // Generate a consistent ID from the address
            const id = `eth:${address.toLowerCase()}`;

            // Create identity object
            const identity: UserIdentity = {
                id,
                provider: IdentityProvider.METAMASK,
                walletAddress: address,
                displayName: this.formatAddress(address),
                verificationLevel: VerificationLevel.BASIC,
                metadata: {
                    signature,
                    timestamp,
                    chainId: await this.provider.getNetwork().then(network => network.chainId),
                },
                createdAt: new Date(),
                lastLoginAt: new Date(),
            };

            this.connectedWallet = address;

            // Register on-chain events
            this.registerEthereumEvents();

            return identity;
        } catch (error) {
            // Cleanup any partial state
            this.provider = null;
            this.connectedWallet = null;
            throw error;
        }
    }

    /**
     * Connect using WalletConnect
     */
    private async connectWithWalletConnect(options: ConnectionOptions): Promise<UserIdentity> {
        // Dynamically import WalletConnect to avoid browser bundle issues
        try {
            // In a real implementation, we'd use the actual WalletConnect library
            throw new Error('WalletConnect implementation pending');
        } catch (error) {
            throw new Error('WalletConnect provider not available');
        }
    }

    /**
     * Create a guest identity
     */
    private async createGuestIdentity(): Promise<UserIdentity> {
        // Generate random id for guest
        const randomId = Math.random().toString(36).substring(2, 15);
        const id = `guest:${randomId}`;

        // Create identity object
        const identity: UserIdentity = {
            id,
            provider: IdentityProvider.GUEST,
            displayName: `Guest ${randomId.substring(0, 4)}`,
            verificationLevel: VerificationLevel.NONE,
            metadata: {
                isTemporary: true,
                expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            },
            createdAt: new Date(),
            lastLoginAt: new Date(),
        };

        return identity;
    }

    /**
     * Register Ethereum-specific events
     */
    private registerEthereumEvents(): void {
        if (typeof window === 'undefined' || !window.ethereum) {
            return;
        }

        // Account changes
        window.ethereum.on('accountsChanged', (accounts: string[]) => {
            if (accounts.length === 0) {
                this.handleDisconnect();
            } else if (this.connectedWallet !== accounts[0]) {
                this.handleAccountChanged(accounts[0]);
            }
        });

        // Chain changes
        window.ethereum.on('chainChanged', (chainId: string) => {
            this.handleChainChanged(parseInt(chainId, 16));

            // Refresh the page as recommended by MetaMask
            if (typeof window !== 'undefined') {
                window.location.reload();
            }
        });

        // Disconnect
        window.ethereum.on('disconnect', () => {
            this.handleDisconnect();
        });
    }

    /**
     * Handle wallet account change
     */
    private async handleAccountChanged(newAccount: string): Promise<void> {
        this.connectedWallet = newAccount;

        // If we have a current identity, update it
        if (this.currentIdentity && this.currentIdentity.provider === IdentityProvider.METAMASK) {
            this.currentIdentity = {
                ...this.currentIdentity,
                walletAddress: newAccount,
                displayName: this.formatAddress(newAccount),
                lastLoginAt: new Date(),
            };

            this.emit('identity:updated', { identity: this.currentIdentity });
        }
    }

    /**
     * Handle chain change
     */
    private handleChainChanged(chainId: number): void {
        if (this.currentIdentity && this.currentIdentity.metadata) {
            this.currentIdentity.metadata.chainId = chainId;
            this.emit('identity:chainChanged', { chainId, identity: this.currentIdentity });
        }
    }

    /**
     * Handle wallet disconnect
     */
    private handleDisconnect(): void {
        const previousIdentity = this.currentIdentity;

        // Clear current state
        this.currentIdentity = null;
        this.provider = null;
        this.connectedWallet = null;

        if (previousIdentity) {
            this.emit('identity:disconnected', { identity: previousIdentity });
        }
    }

    /**
     * Check if user is currently authenticated
     */
    public isAuthenticated(): boolean {
        return this.currentIdentity !== null;
    }

    /**
     * Get current user identity
     */
    public getCurrentIdentity(): UserIdentity | null {
        return this.currentIdentity;
    }

    /**
     * Refresh current identity
     */
    public async refreshIdentity(): Promise<UserIdentity | null> {
        if (!this.currentIdentity) {
            return null;
        }

        // Update last login time
        this.currentIdentity.lastLoginAt = new Date();

        // For wallet-based identities, verify the connection is still active
        if (this.currentIdentity.provider === IdentityProvider.METAMASK && typeof window !== 'undefined' && window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length === 0 || accounts[0] !== this.connectedWallet) {
                    this.handleDisconnect();
                    return null;
                }
            } catch (error) {
                console.error('Failed to refresh wallet identity:', error);
            }
        }

        return this.currentIdentity;
    }

    /**
     * Refresh identity if it hasn't been updated recently
     */
    private async refreshIdentityIfNeeded(): Promise<void> {
        if (!this.currentIdentity) {
            return;
        }

        const timeSinceLastLogin = Date.now() - this.currentIdentity.lastLoginAt.getTime();
        const refreshThreshold = 15 * 60 * 1000; // 15 minutes

        if (timeSinceLastLogin > refreshThreshold) {
            await this.refreshIdentity();
        }
    }

    /**
     * Disconnect current identity
     */
    public async disconnect(): Promise<void> {
        const previousIdentity = this.currentIdentity;

        // Clear current state
        this.currentIdentity = null;
        this.provider = null;

        // Specific provider cleanup
        if (previousIdentity?.provider === IdentityProvider.WALLET_CONNECT) {
            // In a real implementation, we'd close WalletConnect session
        }

        this.connectedWallet = null;

        if (previousIdentity) {
            this.emit('identity:disconnected', { identity: previousIdentity });
        }
    }

    /**
     * Format address for display
     */
    private formatAddress(address: string): string {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    /**
     * Verify a user's identity to a specific level
     */
    public async verifyIdentity(userId: string, level: VerificationLevel): Promise<boolean> {
        // In a real implementation, this would perform verification steps
        // based on the requested level

        // For now, we just cache the verification
        this.verificationCache.set(userId, {
            level,
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        });

        // Update current identity if it's the same user
        if (this.currentIdentity && this.currentIdentity.id === userId) {
            this.currentIdentity.verificationLevel = level;
            this.emit('identity:verified', {
                identity: this.currentIdentity,
                level
            });
        }

        return true;
    }

    /**
     * Get a user's verification level
     */
    public getVerificationLevel(userId: string): VerificationLevel {
        // Check current user
        if (this.currentIdentity && this.currentIdentity.id === userId) {
            return this.currentIdentity.verificationLevel;
        }

        // Check verification cache
        const cached = this.verificationCache.get(userId);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.level;
        }

        return VerificationLevel.NONE;
    }
}

// Create and export singleton instance
export const identityManager = IdentityManager.getInstance();
export default identityManager;
