export interface UserProfile {
    address: string;
    balance: number;
    streamingCredits: number;
    activeSubscriptions: string[];
    streamHistory: Array<{
        contentId: string;
        timestamp: number;
        duration: number;
    }>;
}

export class UserDashboard {
    private profile: UserProfile | null = null;
    private walletConnected = false;

    async connectWallet(): Promise<boolean> {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                this.profile = {
                    address: accounts[0],
                    balance: 0,
                    streamingCredits: 100,
                    activeSubscriptions: [],
                    streamHistory: []
                };
                this.walletConnected = true;
                this.broadcast('WALLET_CONNECTED');
                return true;
            } catch (error) {
                console.error('Wallet connection failed:', error);
                return false;
            }
        }
        return false;
    }

    private broadcast(type: string) {
        window.postMessage({
            type,
            payload: {
                profile: this.profile,
                isConnected: this.walletConnected
            }
        }, '*');
    }
}
