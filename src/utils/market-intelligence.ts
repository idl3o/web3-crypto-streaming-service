import { DigitalMonad } from './monad-entities';

export interface MarketPosition {
    role: 'maker' | 'taker' | 'validator';
    confidence: number;
    stake: number;
    reputation: number;
}

export class MarketIntelligence {
    private positions = new Map<string, MarketPosition>();
    private readonly minStake = 10;
    private readonly maxReputation = 100;

    assignPosition(monad: DigitalMonad): MarketPosition {
        const position = {
            role: this.determineRole(monad),
            confidence: monad.synchronicity,
            stake: this.calculateStake(monad),
            reputation: this.evaluateReputation(monad)
        } as const;

        this.positions.set(monad.id, position);
        return position;
    }

    private determineRole(monad: DigitalMonad): MarketPosition['role'] {
        const entropy = monad.entropy;
        const connections = monad.relations.size;

        if (entropy < 0.3 && connections > 5) return 'maker';
        if (entropy < 0.6) return 'validator';
        return 'taker';
    }

    private calculateStake(monad: DigitalMonad): number {
        return Math.max(
            this.minStake,
            monad.synchronicity * 100
        );
    }

    private evaluateReputation(monad: DigitalMonad): number {
        return Math.min(
            this.maxReputation,
            (1 - monad.entropy) * 100
        );
    }
}
