import { ethers } from 'ethers';
import { DreamtimeMetrics } from './blockchain';

export interface LiteracyLevel {
    id: string;
    tier: 'beginner' | 'intermediate' | 'advanced' | 'enlightened';
    consciousness: number;
    skills: Set<string>;
    dreamstate: DreamtimeMetrics;
    resonance: number;
}

export interface LearningQuest {
    id: string;
    type: 'reading' | 'writing' | 'comprehension' | 'synthesis';
    difficulty: number;
    consciousness: number;
    requirements: string[];
    rewards: {
        skillPoints: number;
        consciousness: number;
        resonance: number;
    };
}

export class LiteracyGame {
    private levels: Map<string, LiteracyLevel> = new Map();
    private quests: Map<string, LearningQuest> = new Map();
    private readonly evolutionThreshold = 0.7;
    private questCache: Map<string, {
        quest: LearningQuest;
        timestamp: number;
    }> = new Map();
    private readonly questCacheTTL = 30 * 60 * 1000; // 30 minutes

    private cleanupQuestCache(): void {
        const now = Date.now();
        for (const [id, cached] of this.questCache) {
            if (now - cached.timestamp > this.questCacheTTL) {
                this.questCache.delete(id);
            }
        }
    }

    async createLearner(baseConsciousness: number): Promise<LiteracyLevel> {
        const id = ethers.utils.id(`learner_${Date.now()}`).slice(0, 16);

        const level: LiteracyLevel = {
            id,
            tier: 'beginner',
            consciousness: baseConsciousness,
            skills: new Set(['basic_reading']),
            dreamstate: {
                ancestralWisdom: 0.1,
                dreamCyclePhase: 'dreaming',
                collectiveMemory: new Map(),
                spiritualResonance: 0.5
            },
            resonance: 0.1
        };

        this.levels.set(id, level);
        return level;
    }

    async generateQuest(learnerId: string): Promise<LearningQuest> {
        this.cleanupQuestCache();
        const cached = this.questCache.get(learnerId);
        if (cached && Date.now() - cached.timestamp < this.questCacheTTL) {
            return cached.quest;
        }

        const quest = await this.createNewQuest(learnerId);
        this.questCache.set(learnerId, {
            quest,
            timestamp: Date.now()
        });
        return quest;
    }

    private async createNewQuest(learnerId: string): Promise<LearningQuest> {
        const level = this.levels.get(learnerId);
        if (!level) throw new Error('Learner not found');

        const quest: LearningQuest = {
            id: ethers.utils.id(`quest_${Date.now()}`).slice(0, 16),
            type: this.determineQuestType(level),
            difficulty: level.consciousness * 1.2,
            consciousness: level.consciousness,
            requirements: Array.from(level.skills),
            rewards: {
                skillPoints: Math.floor(level.consciousness * 10),
                consciousness: 0.1,
                resonance: 0.05
            }
        };

        this.quests.set(quest.id, quest);
        return quest;
    }

    private determineQuestType(level: LiteracyLevel): LearningQuest['type'] {
        if (level.consciousness > 0.9) return 'synthesis';
        if (level.consciousness > 0.7) return 'comprehension';
        if (level.consciousness > 0.5) return 'writing';
        return 'reading';
    }

    async completeQuest(learnerId: string, questId: string): Promise<{
        success: boolean;
        evolution?: {
            newTier: LiteracyLevel['tier'];
            unlockedSkills: string[];
        };
    }> {
        const level = this.levels.get(learnerId);
        const quest = this.quests.get(questId);
        if (!level || !quest) return { success: false };

        // Apply rewards
        level.consciousness += quest.rewards.consciousness;
        level.resonance += quest.rewards.resonance;

        // Unlock new skills based on consciousness
        const unlockedSkills = this.unlockSkills(level);

        // Check for tier evolution
        const prevTier = level.tier;
        level.tier = this.determineTier(level.consciousness);

        return {
            success: true,
            evolution: prevTier !== level.tier ? {
                newTier: level.tier,
                unlockedSkills
            } : undefined
        };
    }

    private unlockSkills(level: LiteracyLevel): string[] {
        const newSkills: string[] = [];

        if (level.consciousness > 0.5 && !level.skills.has('advanced_reading')) {
            level.skills.add('advanced_reading');
            newSkills.push('advanced_reading');
        }

        if (level.consciousness > 0.7 && !level.skills.has('metaphysical_comprehension')) {
            level.skills.add('metaphysical_comprehension');
            newSkills.push('metaphysical_comprehension');
        }

        if (level.consciousness > 0.9 && !level.skills.has('transcendent_synthesis')) {
            level.skills.add('transcendent_synthesis');
            newSkills.push('transcendent_synthesis');
        }

        return newSkills;
    }

    private determineTier(consciousness: number): LiteracyLevel['tier'] {
        if (consciousness > 0.9) return 'enlightened';
        if (consciousness > 0.7) return 'advanced';
        if (consciousness > 0.5) return 'intermediate';
        return 'beginner';
    }

    async getLearnerMetrics(learnerId: string): Promise<{
        tier: string;
        consciousness: number;
        skillCount: number;
        resonance: number;
        canEvolve: boolean;
    }> {
        const level = this.levels.get(learnerId);
        if (!level) throw new Error('Learner not found');

        return {
            tier: level.tier,
            consciousness: level.consciousness,
            skillCount: level.skills.size,
            resonance: level.resonance,
            canEvolve: level.consciousness >= this.evolutionThreshold
        };
    }
}
