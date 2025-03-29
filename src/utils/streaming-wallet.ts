export interface StreamingWallet {
    address: string;
    balance: number;
    streamingCredits: number;
}

export class WalletConnector {
    private wallet: StreamingWallet | null = null;
    private web3: any;

    async connect(): Promise<boolean> {
        if (typeof window.ethereum !== 'undefined') {
            try {
                this.web3 = new (window as any).Web3(window.ethereum);
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });

                this.wallet = {
                    address: accounts[0],
                    balance: await this.web3.eth.getBalance(accounts[0]),
                    streamingCredits: 100
                };

                this.setupEventListeners();
                return true;
            } catch (error) {
                console.error('Wallet connection failed:', error);
                return false;
            }
        }
        return false;
    }

    private setupEventListeners() {
        window.ethereum.on('accountsChanged', (accounts: string[]) => {
            if (accounts.length === 0) {
                this.wallet = null;
                this.broadcast('WALLET_DISCONNECTED');
            }
        });
    }

    async chargeCredits(amount: number): Promise<boolean> {
        if (!this.wallet) return false;

        if (this.wallet.streamingCredits >= amount) {
            this.wallet.streamingCredits -= amount;
            this.broadcast('CREDITS_UPDATED');
            return true;
        }

        return false;
    }

    private broadcast(type: string) {
        window.postMessage({
            type,
            payload: { wallet: this.wallet }
        }, '*');
    }
}
