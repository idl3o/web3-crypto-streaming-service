import { OptimizedEnvironment } from '../environment/OptimizedEnvironment';

async function main() {
    const env = OptimizedEnvironment.getInstance({
        maxInstances: 5,
        memoryLimit: 512 * 1024 * 1024 // 512MB
    });

    console.log('🌍 Initializing Optimized Environment...');

    try {
        const service = env.createOptimizedService('test1');
        
        console.log('\n📊 Environment Stats:');
        console.table(env.getEnvironmentStats());

        // Run for a while to test optimization
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        console.log('\n📈 Updated Environment Stats:');
        console.table(env.getEnvironmentStats());

    } catch (error) {
        console.error('💥 Environment test failed:', error);
    } finally {
        env.cleanup();
    }
}

main().catch(console.error);
