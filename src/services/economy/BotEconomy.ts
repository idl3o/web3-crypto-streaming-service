interface BotTransaction {
    fromId: string;
    toId: string;
    amount: number;
    service: string;
    timestamp: number;
}

interface BotService {
    id: string;
    name: string;
    cost: number;
    provider: string;
}

export class BotEconomy {
    private balances: Map<string, number> = new Map();
    private transactions: BotTransaction[] = [];
    private services: Map<string, BotService> = new Map();
    
    public registerService(service: BotService): void {
        this.services.set(service.id, service);
    }

    public async processTransaction(tx: BotTransaction): Promise<boolean> {
        const fromBalance = this.balances.get(tx.fromId) || 0;
        
        if (fromBalance < tx.amount) {
            return false;
        }

        this.balances.set(tx.fromId, fromBalance - tx.amount);
        this.balances.set(tx.toId, (this.balances.get(tx.toId) || 0) + tx.amount);
        this.transactions.push(tx);
        
        return true;
    }

    public getBalance(botId: string): number {
        return this.balances.get(botId) || 0;
    }

    public addCredits(botId: string, amount: number): void {
        this.balances.set(botId, (this.balances.get(botId) || 0) + amount);
    }
}
