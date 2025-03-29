import { DungeonTester } from './DungeonTester';

async function main() {
    const dungeon = new DungeonTester();
    
    console.log('🏰 Welcome to the Crypto Testing Dungeon! 🏰');
    
    try {
        const results = await dungeon.enterDungeon();
        console.log('\n📊 Test Results:');
        console.table(Object.fromEntries(results));
        
        await dungeon.optimizeInstance();
        console.log('\n📈 Dungeon Stats:');
        console.table(dungeon.getDungeonStats());
        
    } catch (error) {
        console.error('💥 Dungeon run failed:', error);
    }
}

main().catch(console.error);
