import { DigitalMonad } from './monad-entities';
import { AIKeyOpinionLeader } from './ai-kol';
import { DIContentCreator } from './di-content-creator';

export interface BotConfig {
    role: 'creator' | 'curator' | 'amplifier';
    expertise: string[];
    maxConnections: number;
    updateInterval: number;
}

export class BotNetwork {
    private bots = new Map<string, {
        monad: DigitalMonad;
        kol: AIKeyOpinionLeader;
        creator: DIContentCreator;
        config: BotConfig;
    }>();

    private readonly maxBots = 50;
    private readonly updateInterval = 1000;
    private isRunning = false;

    constructor(private monadSystem: MonadSystem) { }

    createBot(config: BotConfig): string {
        if (this.bots.size >= this.maxBots) return '';

        const monad = this.monadSystem.createMonad('bot');
        const kol = new AIKeyOpinionLeader(config.expertise);
        const creator = new DIContentCreator(monad, config.expertise);
        const botId = monad.id;

        this.bots.set(botId, { monad, kol, creator, config });
        return botId;
    }

    start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.runNetwork();
    }

    stop(): void {
        this.isRunning = false;
    }

    private async runNetwork(): Promise<void> {
        while (this.isRunning) {
            const botEntries = Array.from(this.bots.entries());

            // Process bots in parallel with resource limits
            await Promise.all(botEntries.map(async ([id, bot]) => {
                if (!this.isRunning) return;

                try {
                    await this.processBotActions(bot);
                } catch (error) {
                    console.error(`Bot ${id} error:`, error);
                }
            }));

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, this.updateInterval));
        }
    }

    private async processBotActions(bot: typeof this.bots extends Map<any, infer T> ? T : never) {
        const { monad, kol, creator, config } = bot;

        // Generate content based on role
        switch (config.role) {
            case 'creator':
                await this.generateContent(creator);
                break;
            case 'curator':
                await this.curateContent(kol);
                break;
            case 'amplifier':
                await this.amplifyContent(monad);
                break;
        }

        // Update network connections
        this.updateConnections(monad, config.maxConnections);
    }

    private async generateContent(creator: DIContentCreator) {
        const plan = {
            type: 'stream',
            topics: ['market-update', 'trending'],
            format: {
                duration: 300,
                segments: [{ type: 'insight', weight: 1 }],
                style: { depth: 0.5, technicality: 0.5, interactivity: 0.5 }
            },
            targetAudience: ['traders', 'investors'],
            collaborators: []
        };

        await creator.generateContent(plan);
    }

    private async curateContent(kol: AIKeyOpinionLeader) {
        await kol.generateInsight('content curation');
    }

    private async amplifyContent(monad: DigitalMonad) {
        // Simulate content amplification through network effects
        monad.synchronicity *= 1.01;
    }

    private updateConnections(monad: DigitalMonad, maxConnections: number) {
        const connectedBots = Array.from(this.bots.values())
            .filter(b => b.monad.id !== monad.id)
            .slice(0, maxConnections);

        connectedBots.forEach(other => {
            this.monadSystem.interact(monad, other.monad);
        });
    }
}
