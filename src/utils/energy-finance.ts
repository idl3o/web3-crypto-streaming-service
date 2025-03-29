import { ethers } from 'ethers';
import { EnergyToken, BlockchainUtility } from './blockchain';

export interface AffiliateProgram {
    id: string;
    energyStake: number;
    resonanceScore: number;
    affiliates: Map<string, number>;
    rewards: Map<string, number>;
    consciousness: number;
}

export interface EnergyReward {
    amount: number;
    resonanceBonus: number;
    stakingMultiplier: number;
    consciousnessLevel: number;
}

export class EnergyFinance {
    private programs: Map<string, AffiliateProgram> = new Map();
    private blockchain: BlockchainUtility;
    private readonly minStake = 0.5;
    private readonly resonanceThreshold = 0.7;

    constructor(blockchain: BlockchainUtility) {
        this.blockchain = blockchain;
    }

    async createProgram(energyStake: number): Promise<AffiliateProgram> {
        if (energyStake < this.minStake) {
            throw new Error('Insufficient energy stake');
        }

        const tx = await this.blockchain.getOptimalTransaction(21000);
        const program: AffiliateProgram = {
            id: ethers.utils.id(`program_${Date.now()}`).slice(0, 16),
            energyStake,
            resonanceScore: tx.dreamtimeMetrics.resonance,
            affiliates: new Map(),
            rewards: new Map(),
            consciousness: tx.dreamtimeMetrics.wisdom
        };

        this.programs.set(program.id, program);
        return program;
    }

    async joinProgram(programId: string, affiliateId: string, stake: number): Promise<boolean> {
        const program = this.programs.get(programId);
        if (!program) return false;

        const tx = await this.blockchain.getOptimalTransaction(21000);
        const resonance = tx.dreamtimeMetrics.resonance;

        if (resonance < this.resonanceThreshold) return false;

        program.affiliates.set(affiliateId, stake);
        program.rewards.set(affiliateId, 0);

        return true;
    }

    async distributeRewards(programId: string): Promise<Map<string, EnergyReward>> {
        const program = this.programs.get(programId);
        if (!program) throw new Error('Program not found');

        const rewards = new Map<string, EnergyReward>();
        const tx = await this.blockchain.getOptimalTransaction(21000);

        for (const [affiliateId, stake] of program.affiliates) {
            const baseReward = stake * program.energyStake;
            const resonanceBonus = program.resonanceScore * tx.dreamtimeMetrics.resonance;
            const stakingMultiplier = Math.sqrt(stake);
            const consciousnessBonus = tx.dreamtimeMetrics.wisdom;

            const reward: EnergyReward = {
                amount: baseReward * (1 + resonanceBonus),
                resonanceBonus,
                stakingMultiplier,
                consciousnessLevel: consciousnessBonus
            };

            rewards.set(affiliateId, reward);
            program.rewards.set(
                affiliateId,
                (program.rewards.get(affiliateId) || 0) + reward.amount
            );
        }

        return rewards;
    }

    async getAffiliateMetrics(programId: string, affiliateId: string): Promise<{
        stake: number;
        totalRewards: number;
        resonance: number;
        consciousness: number;
    }> {
        const program = this.programs.get(programId);
        if (!program) throw new Error('Program not found');

        return {
            stake: program.affiliates.get(affiliateId) || 0,
            totalRewards: program.rewards.get(affiliateId) || 0,
            resonance: program.resonanceScore,
            consciousness: program.consciousness
        };
    }
}
