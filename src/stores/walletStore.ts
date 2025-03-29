import { defineStore } from 'pinia';
import { ethers } from 'ethers';

export const useWalletStore = defineStore('wallet', {
    state: () => ({
        address: '',
        balance: '0',
        provider: null as ethers.providers.Web3Provider | null,
    }),
    actions: {
        async connectWallet() {
            try {
                this.provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
                const accounts = await this.provider.send('eth_requestAccounts', []);
                this.address = accounts[0];
                await this.fetchBalance();
            } catch (error) {
                console.error('Wallet connection failed:', error);
            }
        },
        async fetchBalance() {
            if (!this.provider || !this.address) return;
            const balance = await this.provider.getBalance(this.address);
            this.balance = ethers.utils.formatEther(balance);
        },
    },
});
