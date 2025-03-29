import { FaeEcosystem, FaeRealm, FaeToken } from '../utils/fae-ecosystem';
import { ContentStream } from './streamingService';

/**
 * Service that connects streaming activities with the Fae ecosystem
 */
export class FaeIntegrationService {
    private faeEcosystem: FaeEcosystem;

    constructor(faeEcosystem: FaeEcosystem) {
        this.faeEcosystem = faeEcosystem;
    }

    /**
     * Calculate Fae rewards based on streaming activity
     */
    async calculateStreamingRewards(
        address: string,
        stream: ContentStream,
        duration: number // in minutes
    ): Promise<{
        essence: number;
        luminanceBoost: number;
        resonanceBoost: number;
        tokens: FaeToken[];
    }> {
        // Get user tokens
        const userTokens = this.faeEcosystem.getUserTokens(address);
        if (!userTokens.length) {
            return { essence: 0, luminanceBoost: 0, resonanceBoost: 0, tokens: [] };
        }

        // Base reward calculation
        const baseEssence = duration * 0.1; // 0.1 essence per minute
        let totalEssence = baseEssence;
        let luminanceBoost = 0;
        let resonanceBoost = 0;

        // Find tokens that will receive rewards
        // Prioritize tokens that match content affinity
        // For simplicity, determine content affinity based on tags
        const streamAffinity = this.determineContentAffinity(stream);
        const affectedTokens: FaeToken[] = [];

        // Apply rewards to tokens with matching affinity
        const matchingTokens = userTokens.filter(token =>
            this.isAffinityMatch(token.affinity, streamAffinity)
        );

        if (matchingTokens.length > 0) {
            // Distribute essence among matching tokens
            const essencePerToken = totalEssence * 1.5 / matchingTokens.length; // 50% bonus for matching affinity

            for (const token of matchingTokens) {
                // Apply essence boost to token
                token.essence += essencePerToken;

                // Apply small luminance and resonance boosts
                const tokenLuminanceBoost = 0.01 * duration / 60; // +0.01 per hour
                const tokenResonanceBoost = 0.005 * duration / 60; // +0.005 per hour

                token.luminance = Math.min(1, token.luminance + tokenLuminanceBoost);
                token.resonance = Math.min(1, token.resonance + tokenResonanceBoost);

                luminanceBoost += tokenLuminanceBoost;
                resonanceBoost += tokenResonanceBoost;

                affectedTokens.push(token);
            }
        }

        return {
            essence: totalEssence,
            luminanceBoost,
            resonanceBoost,
            tokens: affectedTokens
        };
    }

    /**
     * Apply Fae boosts to streaming experience
     */
    calculateStreamingBoosts(address: string): {
        costReduction: number; // percentage discount on streaming costs
        qualityBoost: boolean; // whether streaming quality gets a boost
    } {
        // Get user tokens
        const userTokens = this.faeEcosystem.getUserTokens(address);

        // Calculate cost reduction based on token properties
        let costReduction = 0;
        let highLuminanceTokens = 0;

        for (const token of userTokens) {
            // Each token provides a small discount
            costReduction += 0.01; // 1% per token

            // High luminance tokens provide extra discount
            if (token.luminance > 0.7) {
                costReduction += 0.03; // Additional 3% for high luminance
                highLuminanceTokens++;
            }

            // Realm-specific bonuses
            if (token.realm === FaeRealm.Seelie) {
                costReduction += 0.02; // Seelie tokens give better discounts
            }
        }

        // Cap the reduction at 30%
        costReduction = Math.min(0.3, costReduction);

        // Quality boost if user has at least 3 high luminance tokens
        const qualityBoost = highLuminanceTokens >= 3;

        return { costReduction, qualityBoost };
    }

    /**
     * Determine content affinity based on content metadata
     */
    private determineContentAffinity(stream: ContentStream): string {
        if (!stream.tags || stream.tags.length === 0) {
            return 'earth'; // Default affinity
        }

        const tags = stream.tags.map(t => t.toLowerCase());

        if (tags.some(tag => ['water', 'ocean', 'river', 'flow', 'liquid', 'fluid'].includes(tag))) {
            return 'water';
        }

        if (tags.some(tag => ['fire', 'flame', 'hot', 'burn', 'energy', 'passion'].includes(tag))) {
            return 'fire';
        }

        if (tags.some(tag => ['air', 'wind', 'sky', 'flight', 'breath', 'cloud'].includes(tag))) {
            return 'air';
        }

        if (tags.some(tag => ['earth', 'ground', 'soil', 'rock', 'mountain', 'nature'].includes(tag))) {
            return 'earth';
        }

        if (tags.some(tag => ['magic', 'mystic', 'spiritual', 'ethereal', 'cosmos'].includes(tag))) {
            return 'aether';
        }

        return 'earth'; // Default affinity
    }

    /**
     * Check if token affinity matches content affinity
     */
    private isAffinityMatch(tokenAffinity: string, contentAffinity: string): boolean {
        return tokenAffinity.toLowerCase() === contentAffinity.toLowerCase();
    }

    async integrate(): Promise<boolean> {
        // Placeholder for Fae integration logic
        console.log('Integrating with Fae...');
        return true;
    }
}
