import { ethers } from 'ethers';

/**
 * Service to handle Web3 wallet interactions
 */
export class WalletService {
    private provider: ethers.BrowserProvider | null = null;
    private signer: ethers.JsonRpcSigner | null = null;
    private address: string = '';
    private chainId: number = 0;
    private isConnected: boolean = false;

    /**
     * Initialize wallet connection
     */
    async initialize(): Promise<boolean> {
        try {
            if (!window.ethereum) {
                console.warn('Ethereum provider not found');
                return false;
            }

            this.provider = new ethers.BrowserProvider(window.ethereum);
            const network = await this.provider.getNetwork();
            this.chainId = Number(network.chainId);

            return true;
        } catch (error) {
            console.error('Wallet initialization failed:', error);
            return false;
        }
    }

    /**
     * Connect to the wallet
     */
    async connect(): Promise<boolean> {
        try {
            if (!this.provider) {
                await this.initialize();
            }

            if (!this.provider) {
                return false;
            }

            this.signer = await this.provider.getSigner();
            this.address = await this.signer.getAddress();
            this.isConnected = true;

            return true;
        } catch (error) {
            console.error('Connection failed:', error);
            return false;
        }
    }

    /**
     * Disconnect the wallet
     */
    disconnect(): void {
        this.signer = null;
        this.address = '';
        this.isConnected = false;
    }

    /**
     * Get current connection status
     */
    getConnectionStatus(): { isConnected: boolean; address: string; chainId: number } {
        return {
            isConnected: this.isConnected,
            address: this.address,
            chainId: this.chainId
        };
    }

    /**
     * Sign a message with connected wallet
     */
    async signMessage(message: string): Promise<string> {
        if (!this.signer) {
            throw new Error('Wallet not connected');
        }

        return await this.signer.signMessage(message);
    }

    /**
     * Get ethers provider
     */
    getProvider(): ethers.BrowserProvider | null {
        return this.provider;
    }

    /**
     * Get ethers signer
     */
    getSigner(): ethers.JsonRpcSigner | null {
        return this.signer;
    }
}

// Export singleton instance
export default new WalletService();
