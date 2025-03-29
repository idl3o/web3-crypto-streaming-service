import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Blockchain Module - Handles all blockchain interactions
 */
export class BlockchainModule {
    private provider: ethers.providers.Provider;
    private signer?: ethers.Signer;
    private contracts: Map<string, ethers.Contract> = new Map();

    constructor(providerUrl?: string) {
        this.provider = new ethers.providers.JsonRpcProvider(
            providerUrl || process.env.BLOCKCHAIN_URL
        );
    }

    /**
     * Connect with a private key
     */
    public connectWithPrivateKey(privateKey: string): void {
        const wallet = new ethers.Wallet(privateKey, this.provider);
        this.signer = wallet;
    }

    /**
     * Load a smart contract
     */
    public loadContract(name: string, address: string, abi: any): ethers.Contract {
        const contract = new ethers.Contract(
            address,
            abi,
            this.signer || this.provider
        );

        this.contracts.set(name, contract);
        return contract;
    }

    /**
     * Get contract by name
     */
    public getContract(name: string): ethers.Contract | undefined {
        return this.contracts.get(name);
    }

    /**
     * Get account balance
     */
    public async getBalance(address: string): Promise<string> {
        const balance = await this.provider.getBalance(address);
        return ethers.utils.formatEther(balance);
    }

    /**
     * Send transaction
     */
    public async sendTransaction(to: string, amount: string): Promise<ethers.providers.TransactionResponse> {
        if (!this.signer) {
            throw new Error('No signer available. Connect with private key first.');
        }

        const tx = await this.signer.sendTransaction({
            to,
            value: ethers.utils.parseEther(amount)
        });

        return tx;
    }
}

// Export singleton instance
export const blockchain = new BlockchainModule();
