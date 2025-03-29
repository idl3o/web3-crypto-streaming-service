import { CodeInstance } from './CodeInstance';

async function main() {
    const instance = CodeInstance.getInstance();
    console.log('🤖 Initializing Code Instance...');

    try {
        const testInstance = await instance.createInstance('test_runner');
        console.log('📊 Running codebase analysis...');
        
        const analysis = await instance.analyzeCodebase();
        console.log('\n🔍 Analysis Results:');
        console.table(analysis);

        const metrics = instance.getMetrics();
        console.log('\n📈 Instance Metrics:');
        console.table(metrics);

    } catch (error) {
        console.error('💥 Instance creation failed:', error);
    }
}

main().catch(console.error);
