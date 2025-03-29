export interface DigitalMonad {
    id: string;
    essence: {
        type: 'content' | 'user' | 'interaction' | 'reward';
        state: Map<string, any>;
        perceptions: Set<string>;
    };
    relations: Map<string, WeakSet<DigitalMonad>>;
    entropy: number;
    synchronicity: number;
    market?: {
        position: MarketPosition;
        lastTrade: number;
        volume: number;
    };
}

export class MonadSystem {
    private monads: Map<string, DigitalMonad> = new Map();
    private readonly entropyThreshold = 0.7;
    private marketIntelligence: MarketIntelligence;

    constructor() {
        this.marketIntelligence = new MarketIntelligence();
    }

    createMonad(type: DigitalMonad['essence']['type']): DigitalMonad {
        const monad: DigitalMonad = {
            id: crypto.randomUUID(),
            essence: {
                type,
                state: new Map(),
                perceptions: new Set()
            },
            relations: new Map(),
            entropy: 0,
            synchronicity: 1
        };

        this.monads.set(monad.id, monad);
        return monad;
    }

    interact(monad1: DigitalMonad, monad2: DigitalMonad): void {
        // Leibnizian harmony - monads influence each other without direct causation
        const harmony = Math.min(monad1.synchronicity, monad2.synchronicity);

        // Update perceptions
        monad1.essence.perceptions.add(monad2.id);
        monad2.essence.perceptions.add(monad1.id);

        // Establish relation if sufficient harmony
        if (harmony > this.entropyThreshold) {
            this.establishRelation(monad1, monad2);
        }

        // Adjust entropy based on interaction
        this.adjustEntropy(monad1);
        this.adjustEntropy(monad2);

        // Update pathway
        if (monad1.essence.type === 'user' && monad2.essence.type === 'reward') {
            const pathMultiplier = this.calculatePathwayStrength(monad1, monad2);
            monad2.synchronicity *= pathMultiplier;
        }

        // Market interaction
        if (this.shouldTrade(monad1, monad2)) {
            this.facilitateTrade(monad1, monad2);
        }
    }

    private establishRelation(m1: DigitalMonad, m2: DigitalMonad): void {
        if (!m1.relations.has(m2.essence.type)) {
            m1.relations.set(m2.essence.type, new WeakSet());
        }
        m1.relations.get(m2.essence.type)?.add(m2);
    }

    private adjustEntropy(monad: DigitalMonad): void {
        const perceptionCount = monad.essence.perceptions.size;
        const relationCount = Array.from(monad.relations.values())
            .reduce((sum, set) => sum + set.size, 0);

        monad.entropy = 1 - (relationCount / Math.max(perceptionCount, 1));
        monad.synchronicity = Math.exp(-monad.entropy);
    }

    private calculatePathwayStrength(source: DigitalMonad, target: DigitalMonad): number {
        const directStrength = source.relations.get(target.essence.type)?.has(target) ? 1.5 : 1.0;
        const entropyFactor = Math.exp(-(source.entropy + target.entropy) / 2);
        return directStrength * entropyFactor;
    }

    private shouldTrade(m1: DigitalMonad, m2: DigitalMonad): boolean {
        if (!m1.market || !m2.market) {
            m1.market = { position: this.marketIntelligence.assignPosition(m1), lastTrade: 0, volume: 0 };
            m2.market = { position: this.marketIntelligence.assignPosition(m2), lastTrade: 0, volume: 0 };
        }

        const complementary =
            (m1.market.position.role === 'maker' && m2.market.position.role === 'taker') ||
            (m1.market.position.role === 'taker' && m2.market.position.role === 'maker');

        return complementary && this.hasTradeCapacity(m1, m2);
    }

    private facilitateTrade(m1: DigitalMonad, m2: DigitalMonad): void {
        const now = Date.now();
        const volume = Math.min(m1.market!.position.stake, m2.market!.position.stake);

        m1.market!.lastTrade = now;
        m2.market!.lastTrade = now;
        m1.market!.volume += volume;
        m2.market!.volume += volume;

        this.adjustSynchronicity(m1, m2, volume);
    }

    private hasTradeCapacity(m1: DigitalMonad, m2: DigitalMonad): boolean {
        const cooldown = 5000; // 5 seconds between trades
        const now = Date.now();
        return (now - m1.market!.lastTrade > cooldown) &&
            (now - m2.market!.lastTrade > cooldown);
    }

    private adjustSynchronicity(m1: DigitalMonad, m2: DigitalMonad, volume: number): void {
        const impact = volume / 1000; // 0.1% per unit volume
        m1.synchronicity *= (1 + impact);
        m2.synchronicity *= (1 + impact);
    }
}
