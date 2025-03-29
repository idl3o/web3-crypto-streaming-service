import { MonadSystem } from '../utils/monad-entities';
import { BotNetwork } from '../utils/bot-network';

const ROLES = ['creator', 'curator', 'amplifier'] as const;
const EXPERTISE = [
    ['defi', 'trading'],
    ['nft', 'gaming'],
    ['web3', 'social']
];

async function main() {
    // Initialize systems
    const monadSystem = new MonadSystem();
    const network = new BotNetwork(monadSystem);

    // Create bot population
    for (let i = 0; i < 10; i++) {
        const role = ROLES[i % ROLES.length];
        const expertise = EXPERTISE[i % EXPERTISE.length];

        network.createBot({
            role,
            expertise,
            maxConnections: 5,
            updateInterval: 2000
        });
    }

    // Start network
    console.log('Starting local bot network...');
    network.start();

    // Handle shutdown
    process.on('SIGINT', () => {
        console.log('Stopping bot network...');
        network.stop();
        process.exit(0);
    });
}

main().catch(console.error);
