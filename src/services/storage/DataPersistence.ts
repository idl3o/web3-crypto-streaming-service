import { PrismaClient } from '@prisma/client';

export class DataPersistence {
    private prisma: PrismaClient;
    
    constructor() {
        this.prisma = new PrismaClient();
    }

    async storeTradeHistory(symbol: string, price: number, timestamp: number): Promise<void> {
        await this.prisma.tradeHistory.create({
            data: { symbol, price, timestamp }
        });
    }
}