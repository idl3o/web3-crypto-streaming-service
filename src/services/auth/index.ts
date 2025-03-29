import { ethers } from 'ethers';

export class AuthService {
    private provider: ethers.providers.Web3Provider;

    async connectWallet(): Promise<{ address: string; chainId: number }> {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask not installed');
        }

        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        const signer = this.provider.getSigner();
        const address = await signer.getAddress();
        const network = await this.provider.getNetwork();

        return {
            address,
            chainId: network.chainId,
        };
    }

    async signMessage(message: string): Promise<string> {
        const signer = this.provider.getSigner();
        return await signer.signMessage(message);
    }
}
