import { CryptoDataService } from '../services/CryptoDataService';
import { AssistantBot } from '../services/bots/AssistantBot';

interface DungeonLevel {
    name: string;
    difficulty: 'easy' | 'medium' | 'hard';
    tests: TestCase[];
}

interface TestCase {
    name: string;
    setup: () => Promise<void>;
    execute: () => Promise<boolean>;
    cleanup: () => Promise<void>;
}

export class DungeonTester {
    private service: CryptoDataService;
    private levels: DungeonLevel[] = [];
    private results: Map<string, boolean> = new Map();

    constructor() {
        this.service = new CryptoDataService({
            apiKey: process.env.TEST_API_KEY || 'test_key',
            wsEndpoint: 'wss://testnet.binance.vision/ws',
            enableBots: true,
            mediaStorage: {
                storageDir: './test_media'
            }
        });
        this.initializeLevels();
    }

    private initializeLevels(): void {
        this.levels = [
            {
                name: 'Connection Chamber',
                difficulty: 'easy',
                tests: [
                    {
                        name: 'WebSocket Connection Test',
                        setup: async () => {
                            await this.service.reset();
                        },
                        execute: async () => {
                            return this.service.isConnectionActive();
                        },
                        cleanup: async () => {
                            await this.service.cleanup();
                        }
                    }
                ]
            },
            {
                name: 'Bot Laboratory',
                difficulty: 'medium',
                tests: [
                    {
                        name: 'Assistant Bot Creation',
                        setup: async () => {
                            const bot = this.service.createAssistantBot('test_user', {
                                name: 'TestBot'
                            });
                            return bot.addPriceAlert('btcusdt', 50000, 'above');
                        },
                        execute: async () => {
                            const bot = this.service.getAssistantBot('test_user');
                            return bot !== undefined;
                        },
                        cleanup: async () => {
                            this.service.removeAssistantBot('test_user');
                        }
                    }
                ]
            }
        ];
    }

    public async enterDungeon(): Promise<Map<string, boolean>> {
        console.log('🏰 Entering the Testing Dungeon...');

        for (const level of this.levels) {
            console.log(`\n⚔️ Level: ${level.name} (${level.difficulty})`);
            
            for (const test of level.tests) {
                try {
                    await test.setup();
                    const result = await test.execute();
                    this.results.set(test.name, result);
                    console.log(`${result ? '✅' : '❌'} ${test.name}`);
                    await test.cleanup();
                } catch (error) {
                    console.error(`💀 Test failed: ${test.name}`, error);
                    this.results.set(test.name, false);
                }
            }
        }

        return this.results;
    }

    public async optimizeInstance(): Promise<void> {
        console.log('🔄 Optimizing service instance...');
        
        // Memory optimization
        const memoryBefore = process.memoryUsage().heapUsed;
        this.service.cleanup();
        const memoryAfter = process.memoryUsage().heapUsed;
        
        console.log(`Memory optimization: ${((memoryBefore - memoryAfter) / 1024 / 1024).toFixed(2)}MB freed`);
        
        // Connection optimization
        this.service = new CryptoDataService({
            ...this.service['config'],
            maxReconnectAttempts: 3,
            reconnectInterval: 3000
        });
    }

    public getDungeonStats(): object {
        return {
            totalTests: this.results.size,
            passedTests: Array.from(this.results.values()).filter(Boolean).length,
            failedTests: Array.from(this.results.values()).filter(r => !r).length,
            levels: this.levels.length
        };
    }
}
