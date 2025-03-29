import { CryptoDataService } from '../services/CryptoDataService';
import { AssistantBot } from '../services/bots/AssistantBot';
import { DungeonTester } from './DungeonTester';

interface InstanceMetrics {
    memoryUsage: number;
    activeConnections: number;
    botCount: number;
    pendingOperations: number;
}

export class CodeInstance {
    private static instance: CodeInstance;
    private service: CryptoDataService;
    private dungeon: DungeonTester;
    private instances: Map<string, any> = new Map();
    private metrics: InstanceMetrics = {
        memoryUsage: 0,
        activeConnections: 0,
        botCount: 0,
        pendingOperations: 0
    };

    private constructor() {
        this.service = new CryptoDataService({
            apiKey: 'self_instance',
            enableBots: true,
            debug: true
        });
        this.dungeon = new DungeonTester();
        this.initializeSelfInstance();
    }

    private async initializeSelfInstance(): Promise<void> {
        // Create self-aware instance
        const selfBot = this.service.createAssistantBot('self_instance', {
            name: 'CodeInstanceBot',
            mediaEnabled: true
        });

        // Monitor own performance
        selfBot.addPriceAlert('system_memory', this.metrics.memoryUsage * 1.5, 'above');
        
        // Add self-optimization capability
        setInterval(() => this.optimizeInstances(), 60000);
    }

    private async optimizeInstances(): Promise<void> {
        const currentMemory = process.memoryUsage().heapUsed;
        if (currentMemory > this.metrics.memoryUsage * 1.2) {
            await this.dungeon.optimizeInstance();
            this.metrics.memoryUsage = process.memoryUsage().heapUsed;
        }
    }

    public async createInstance(name: string): Promise<any> {
        const instance = {
            service: this.service,
            bot: this.service.createAssistantBot(name, { name: `Instance_${name}` }),
            metrics: { ...this.metrics }
        };
        this.instances.set(name, instance);
        return instance;
    }

    public static getInstance(): CodeInstance {
        if (!CodeInstance.instance) {
            CodeInstance.instance = new CodeInstance();
        }
        return CodeInstance.instance;
    }

    public async analyzeCodebase(): Promise<object> {
        const results = await this.dungeon.enterDungeon();
        const stats = this.dungeon.getDungeonStats();
        return {
            testResults: Object.fromEntries(results),
            stats,
            instances: this.instances.size,
            metrics: this.metrics
        };
    }

    public getMetrics(): InstanceMetrics {
        return { ...this.metrics };
    }
}
