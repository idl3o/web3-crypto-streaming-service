import { CryptoDataService } from '../services/CryptoDataService';
import { CodeInstance } from '../testing/CodeInstance';
import { DungeonTester } from '../testing/DungeonTester';

interface EnvironmentConfig {
    maxInstances: number;
    memoryLimit: number;
    cleanupInterval: number;
    optimizationThreshold: number;
}

export class OptimizedEnvironment {
    private static instance: OptimizedEnvironment;
    private services: Map<string, CryptoDataService> = new Map();
    private instances: Map<string, CodeInstance> = new Map();
    private testers: Map<string, DungeonTester> = new Map();
    private metrics: Map<string, number> = new Map();
    private readonly config: EnvironmentConfig;

    private constructor(config: Partial<EnvironmentConfig> = {}) {
        this.config = {
            maxInstances: 10,
            memoryLimit: 1024 * 1024 * 1024, // 1GB
            cleanupInterval: 300000, // 5 minutes
            optimizationThreshold: 0.8,
            ...config
        };
        this.initializeEnvironment();
    }

    private initializeEnvironment(): void {
        // Set up periodic cleanup
        setInterval(() => this.optimizeResources(), this.config.cleanupInterval);
        
        // Monitor system resources
        this.monitorResources();
    }

    private async optimizeResources(): Promise<void> {
        const memoryUsage = process.memoryUsage().heapUsed;
        if (memoryUsage > this.config.memoryLimit * this.config.optimizationThreshold) {
            console.log('🔄 Optimizing environment resources...');
            
            // Cleanup inactive services
            for (const [id, service] of this.services) {
                if (!service.isConnectionActive()) {
                    service.cleanup();
                    this.services.delete(id);
                }
            }

            // Reset metrics
            this.metrics.clear();
            global.gc?.();
        }
    }

    private monitorResources(): void {
        const updateMetrics = () => {
            this.metrics.set('memory', process.memoryUsage().heapUsed);
            this.metrics.set('services', this.services.size);
            this.metrics.set('instances', this.instances.size);
        };

        setInterval(updateMetrics, 10000);
    }

    public createOptimizedService(id: string): CryptoDataService {
        if (this.services.size >= this.config.maxInstances) {
            throw new Error('Maximum service instances reached');
        }

        const service = new CryptoDataService({
            apiKey: `opt_${id}`,
            enableBots: true,
            debug: true,
            maxReconnectAttempts: 3,
            reconnectInterval: 3000
        });

        this.services.set(id, service);
        return service;
    }

    public getEnvironmentStats(): object {
        return {
            activeServices: this.services.size,
            activeInstances: this.instances.size,
            activeTesters: this.testers.size,
            memoryUsage: this.metrics.get('memory'),
            healthScore: this.calculateHealthScore()
        };
    }

    private calculateHealthScore(): number {
        const memoryScore = 1 - (process.memoryUsage().heapUsed / this.config.memoryLimit);
        const instanceScore = 1 - (this.services.size / this.config.maxInstances);
        return (memoryScore + instanceScore) / 2;
    }

    public static getInstance(config?: Partial<EnvironmentConfig>): OptimizedEnvironment {
        if (!OptimizedEnvironment.instance) {
            OptimizedEnvironment.instance = new OptimizedEnvironment(config);
        }
        return OptimizedEnvironment.instance;
    }

    public cleanup(): void {
        this.services.forEach(service => service.cleanup());
        this.services.clear();
        this.instances.clear();
        this.testers.clear();
        this.metrics.clear();
    }
}
