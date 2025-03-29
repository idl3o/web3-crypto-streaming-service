import { ethers } from 'ethers';

export enum FaeRealm {
    Seelie = 'seelie',   // Light/summer court
    Unseelie = 'unseelie', // Dark/winter court
    Wyldwood = 'wyldwood', // Neutral/ancient
    Twilight = 'twilight'  // Boundary/dawn-dusk
}

export enum FaeAffinity {
    Earth = 'earth',
    Air = 'air',
    Fire = 'fire',
    Water = 'water',
    Aether = 'aether'
}

export enum QuestDifficulty {
    Simple = 'simple',
    Moderate = 'moderate',
    Complex = 'complex',
    Mythical = 'mythical'
}

// New seasonal cycle enum
export enum SeasonalCycle {
    Spring = 'spring',
    Summer = 'summer',
    Autumn = 'autumn',
    Winter = 'winter'
}

export interface FaeToken {
    id: string;
    realm: FaeRealm;
    affinity: FaeAffinity;
    luminance: number;     // 0-1: brightness/energy level
    resonance: number;     // 0-1: harmonization with holder
    essence: number;       // Token amount/value
    harvestTime: number;   // Timestamp when minted/harvested
    enchantments: string[]; // Special properties
    // Add migration history
    migrations: {
        fromRealm: FaeRealm;
        toRealm: FaeRealm;
        season: SeasonalCycle;
        timestamp: number;
    }[];
}

export interface FaeEnchantment {
    name: string;
    description: string;
    luminanceBoost: number;
    resonanceBoost: number;
    essenceMultiplier: number;
    duration: number; // In milliseconds
    seasonalBoost?: SeasonalCycle; // Season when this enchantment is strongest
}

export interface FaeQuest {
    id: string;
    title: string;
    description: string;
    difficulty: QuestDifficulty;
    requiredRealm?: FaeRealm;
    requiredAffinity?: FaeAffinity;
    minLuminance?: number;
    minResonance?: number;
    rewardEssence: number;
    rewardEnchantment?: string;
    duration: number; // Time to complete in milliseconds
    completedBy: string[]; // List of addresses who completed
    createdAt: number;
    seasonalBonus?: SeasonalCycle; // Season when this quest gives more rewards
}

// New interface for seasonal events
export interface SeasonalEvent {
    id: string;
    name: string;
    description: string;
    season: SeasonalCycle;
    startDate: number;
    endDate: number;
    realmInfluence: Map<FaeRealm, number>; // How realms are influenced during this event
    bonuses: {
        tokenMinting?: number;
        essenceHarvest?: number;
        questRewards?: number;
    };
    participants: string[]; // Addresses participating
}

// New interface for realm migration records
export interface RealmMigration {
    address: string;
    tokenIds: string[];
    fromSeason: SeasonalCycle;
    toSeason: SeasonalCycle;
    essenceBonus: number;
    timestamp: number;
}

export class FaeEcosystem {
    private tokens: Map<string, FaeToken> = new Map();
    private enchantments: Map<string, FaeEnchantment> = new Map();
    private quests: Map<string, FaeQuest> = new Map();
    private activeQuests: Map<string, string[]> = new Map(); // Address -> Quest IDs
    private seasonalEvents: Map<string, SeasonalEvent> = new Map();
    private realmMigrations: RealmMigration[] = [];
    private readonly seasonCycle: number = 28 * 24 * 60 * 60 * 1000; // 28 days in ms

    // Seasonal state
    private currentSeason: SeasonalCycle;
    private seasonStartTime: number;
    private relaunchAvailable: boolean = false;

    constructor() {
        this.initializeEnchantments();
        this.initializeQuests();
        this.initializeSeasons();
    }

    private initializeEnchantments(): void {
        const defaultEnchantments: FaeEnchantment[] = [
            {
                name: 'Moonlight Blessing',
                description: 'Enhances tokens during lunar cycles',
                luminanceBoost: 0.2,
                resonanceBoost: 0.1,
                essenceMultiplier: 1.15,
                duration: 7 * 24 * 60 * 60 * 1000 // 7 days
            },
            {
                name: 'Sylvan Harmony',
                description: 'Attunes tokens to natural growth cycles',
                luminanceBoost: 0.05,
                resonanceBoost: 0.25,
                essenceMultiplier: 1.1,
                duration: 14 * 24 * 60 * 60 * 1000 // 14 days
            },
            {
                name: 'Twilight Resonance',
                description: 'Amplifies during threshold periods',
                luminanceBoost: 0.15,
                resonanceBoost: 0.15,
                essenceMultiplier: 1.2,
                duration: 3 * 24 * 60 * 60 * 1000 // 3 days
            }
        ];

        defaultEnchantments.forEach(enchantment => {
            const id = ethers.utils.id(enchantment.name).slice(0, 16);
            this.enchantments.set(id, enchantment);
        });

        // Add seasonal enchantments
        const seasonalEnchantments: FaeEnchantment[] = [
            {
                name: 'Spring Bloom',
                description: 'Tokens flourish with the renewal energy of spring',
                luminanceBoost: 0.15,
                resonanceBoost: 0.2,
                essenceMultiplier: 1.25,
                duration: 21 * 24 * 60 * 60 * 1000, // 21 days
                seasonalBoost: SeasonalCycle.Spring
            },
            {
                name: 'Summer Solstice',
                description: 'Harness the peak energy of the summer sun',
                luminanceBoost: 0.25,
                resonanceBoost: 0.1,
                essenceMultiplier: 1.3,
                duration: 14 * 24 * 60 * 60 * 1000, // 14 days
                seasonalBoost: SeasonalCycle.Summer
            },
            {
                name: 'Autumn Harvest',
                description: 'Reap abundant essence in the harvest season',
                luminanceBoost: 0.1,
                resonanceBoost: 0.15,
                essenceMultiplier: 1.4,
                duration: 21 * 24 * 60 * 60 * 1000, // 21 days
                seasonalBoost: SeasonalCycle.Autumn
            },
            {
                name: 'Winter\'s Deep',
                description: 'Draw upon ancient magic during winter\'s stillness',
                luminanceBoost: 0.05,
                resonanceBoost: 0.3,
                essenceMultiplier: 1.2,
                duration: 28 * 24 * 60 * 60 * 1000, // 28 days
                seasonalBoost: SeasonalCycle.Winter
            }
        ];

        seasonalEnchantments.forEach(enchantment => {
            const id = ethers.utils.id(enchantment.name).slice(0, 16);
            this.enchantments.set(id, enchantment);
        });
    }

    private initializeQuests(): void {
        const defaultQuests: FaeQuest[] = [
            {
                id: ethers.utils.id('quest_moonlight_gathering').slice(0, 16),
                title: 'Moonlight Essence Gathering',
                description: 'Harvest essence from your tokens during the full moon phase to gain amplified rewards.',
                difficulty: QuestDifficulty.Simple,
                requiredRealm: FaeRealm.Twilight,
                rewardEssence: 25,
                duration: 2 * 24 * 60 * 60 * 1000, // 2 days
                completedBy: [],
                createdAt: Date.now()
            },
            {
                id: ethers.utils.id('quest_elemental_harmony').slice(0, 16),
                title: 'Elemental Harmony',
                description: 'Collect tokens of all five affinities to establish elemental balance.',
                difficulty: QuestDifficulty.Moderate,
                rewardEssence: 50,
                rewardEnchantment: Array.from(this.enchantments.keys())[0],
                duration: 7 * 24 * 60 * 60 * 1000, // 7 days
                completedBy: [],
                createdAt: Date.now()
            },
            {
                id: ethers.utils.id('quest_luminance_mastery').slice(0, 16),
                title: 'Luminance Mastery',
                description: 'Achieve 0.8 or higher luminance on any token through enchantments and harvesting.',
                difficulty: QuestDifficulty.Complex,
                minLuminance: 0.8,
                rewardEssence: 75,
                rewardEnchantment: Array.from(this.enchantments.keys())[1],
                duration: 5 * 24 * 60 * 60 * 1000, // 5 days
                completedBy: [],
                createdAt: Date.now()
            },
            {
                id: ethers.utils.id('quest_wyldwood_resonance').slice(0, 16),
                title: 'Wyldwood Resonance',
                description: 'Maintain a token of Wyldwood realm and harvest it three times consecutively.',
                difficulty: QuestDifficulty.Mythical,
                requiredRealm: FaeRealm.Wyldwood,
                minResonance: 0.7,
                rewardEssence: 100,
                rewardEnchantment: Array.from(this.enchantments.keys())[2],
                duration: 14 * 24 * 60 * 60 * 1000, // 14 days
                completedBy: [],
                createdAt: Date.now()
            }
        ];

        defaultQuests.forEach(quest => {
            this.quests.set(quest.id, quest);
        });
    }

    private initializeSeasons(): void {
        // Determine current season based on real world date
        const now = new Date();
        const month = now.getMonth(); // 0-11

        if (month >= 2 && month <= 4) {
            this.currentSeason = SeasonalCycle.Spring;
        } else if (month >= 5 && month <= 7) {
            this.currentSeason = SeasonalCycle.Summer;
        } else if (month >= 8 && month <= 10) {
            this.currentSeason = SeasonalCycle.Autumn;
        } else {
            this.currentSeason = SeasonalCycle.Winter;
        }

        this.seasonStartTime = Date.now();

        // Initialize seasonal events
        this.createSeasonalEvents();
    }

    private createSeasonalEvents(): void {
        const now = Date.now();
        const seasonNames = {
            [SeasonalCycle.Spring]: "Springtide Awakening",
            [SeasonalCycle.Summer]: "Solstice Brilliance",
            [SeasonalCycle.Autumn]: "Amber Convergence",
            [SeasonalCycle.Winter]: "Frostweave Descent"
        };

        // Create an event for the current season
        const seasonalEvent: SeasonalEvent = {
            id: ethers.utils.id(`event_${this.currentSeason}_${now}`).slice(0, 16),
            name: seasonNames[this.currentSeason],
            description: `The realms shift as ${this.currentSeason} brings its influence to the Fae ecosystem.`,
            season: this.currentSeason,
            startDate: now,
            endDate: now + (90 * 24 * 60 * 60 * 1000), // Approximately 3 months
            realmInfluence: this.calculateSeasonalRealmInfluence(),
            bonuses: this.calculateSeasonalBonuses(),
            participants: []
        };

        this.seasonalEvents.set(seasonalEvent.id, seasonalEvent);
    }

    private calculateSeasonalRealmInfluence(): Map<FaeRealm, number> {
        // Different realms have different power levels based on the season
        const influence = new Map<FaeRealm, number>();

        switch (this.currentSeason) {
            case SeasonalCycle.Spring:
                influence.set(FaeRealm.Seelie, 1.3);
                influence.set(FaeRealm.Unseelie, 0.7);
                influence.set(FaeRealm.Wyldwood, 1.1);
                influence.set(FaeRealm.Twilight, 0.9);
                break;
            case SeasonalCycle.Summer:
                influence.set(FaeRealm.Seelie, 1.5);
                influence.set(FaeRealm.Unseelie, 0.5);
                influence.set(FaeRealm.Wyldwood, 1.2);
                influence.set(FaeRealm.Twilight, 0.8);
                break;
            case SeasonalCycle.Autumn:
                influence.set(FaeRealm.Seelie, 0.8);
                influence.set(FaeRealm.Unseelie, 1.2);
                influence.set(FaeRealm.Wyldwood, 1.4);
                influence.set(FaeRealm.Twilight, 1.1);
                break;
            case SeasonalCycle.Winter:
                influence.set(FaeRealm.Seelie, 0.6);
                influence.set(FaeRealm.Unseelie, 1.5);
                influence.set(FaeRealm.Wyldwood, 0.8);
                influence.set(FaeRealm.Twilight, 1.3);
                break;
        }

        return influence;
    }

    private calculateSeasonalBonuses(): SeasonalEvent['bonuses'] {
        // Different bonuses based on the season
        switch (this.currentSeason) {
            case SeasonalCycle.Spring:
                return {
                    tokenMinting: 1.2,
                    essenceHarvest: 1.1,
                    questRewards: 1.0
                };
            case SeasonalCycle.Summer:
                return {
                    tokenMinting: 1.1,
                    essenceHarvest: 1.3,
                    questRewards: 1.1
                };
            case SeasonalCycle.Autumn:
                return {
                    tokenMinting: 1.0,
                    essenceHarvest: 1.2,
                    questRewards: 1.3
                };
            case SeasonalCycle.Winter:
                return {
                    tokenMinting: 0.9,
                    essenceHarvest: 1.0,
                    questRewards: 1.4
                };
        }
    }

    /**
     * Creates a new Fae token based on user's resonance and energy
     */
    async mintToken(
        address: string,
        resonanceScore: number,
        energyLevel: number
    ): Promise<FaeToken> {
        // Determine realm based on cosmic timing
        const realm = this.determineRealm();

        // Determine affinity based on address and energy
        const affinity = this.determineAffinity(address, energyLevel);

        // Calculate base luminance from energy level
        const luminance = Math.min(energyLevel / 10, 1);

        // Calculate base token amount
        const essence = this.calculateEssence(resonanceScore, energyLevel);

        const token: FaeToken = {
            id: ethers.utils.id(`${address}_${Date.now()}`).slice(0, 16),
            realm,
            affinity,
            luminance,
            resonance: resonanceScore,
            essence,
            harvestTime: Date.now(),
            enchantments: [],
            migrations: [] // New field for tracking realm migrations
        };

        // Add token to collection
        this.tokens.set(token.id, token);

        return token;
    }

    /**
     * Applies an enchantment to a token to boost its properties
     */
    async enchantToken(tokenId: string, enchantmentId: string): Promise<FaeToken | null> {
        const token = this.tokens.get(tokenId);
        const enchantment = this.enchantments.get(enchantmentId);

        if (!token || !enchantment) return null;

        // Apply enchantment effects
        token.luminance = Math.min(token.luminance + enchantment.luminanceBoost, 1);
        token.resonance = Math.min(token.resonance + enchantment.resonanceBoost, 1);
        token.essence *= enchantment.essenceMultiplier;

        // Record the enchantment
        token.enchantments.push(enchantmentId);

        return token;
    }

    /**
     * Harvests essence from a token based on time elapsed
     */
    async harvestEssence(tokenId: string): Promise<number> {
        const token = this.tokens.get(tokenId);
        if (!token) return 0;

        const now = Date.now();
        const timeElapsed = now - token.harvestTime;
        const cyclePosition = (timeElapsed % this.seasonCycle) / this.seasonCycle;

        // Calculate harvest based on realm, affinity, and cycle
        let harvestMultiplier = 1.0;

        // Apply seasonal realm influence
        const event = this.getCurrentSeasonalEvent();
        if (event) {
            const realmInfluence = event.realmInfluence.get(token.realm) || 1.0;
            harvestMultiplier *= realmInfluence;

            // Apply seasonal harvest bonus
            harvestMultiplier *= event.bonuses.essenceHarvest || 1.0;
        }

        // Realm bonuses during different cycle positions
        switch (token.realm) {
            case FaeRealm.Seelie:
                harvestMultiplier *= cyclePosition < 0.5 ? 1.2 : 0.8; // Stronger in first half (summer)
                break;
            case FaeRealm.Unseelie:
                harvestMultiplier *= cyclePosition > 0.5 ? 1.2 : 0.8; // Stronger in second half (winter)
                break;
            case FaeRealm.Twilight:
                // Stronger at dawn/dusk (transitions)
                harvestMultiplier *= (cyclePosition < 0.1 || (cyclePosition > 0.4 && cyclePosition < 0.6) || cyclePosition > 0.9) ? 1.3 : 0.9;
                break;
            case FaeRealm.Wyldwood:
                // Consistent but with occasional surges
                harvestMultiplier *= Math.random() < 0.1 ? 1.5 : 1.0;
                break;
        }

        // Calculate harvest amount
        const baseHarvest = token.essence * (token.luminance * 0.5 + token.resonance * 0.5);
        const finalHarvest = baseHarvest * harvestMultiplier * (timeElapsed / (7 * 24 * 60 * 60 * 1000)); // Scale by week

        // Update harvest time
        token.harvestTime = now;

        // Check if we should enable relaunch after significant harvests
        this.checkRelaunchAvailability();

        return finalHarvest;
    }

    /**
     * Start a quest for a user
     */
    async startQuest(address: string, questId: string): Promise<boolean> {
        const quest = this.quests.get(questId);
        if (!quest) return false;

        // Check if user already has active quests
        const userQuests = this.activeQuests.get(address) || [];

        // Add this quest to active quests
        if (!userQuests.includes(questId)) {
            userQuests.push(questId);
            this.activeQuests.set(address, userQuests);
        }

        return true;
    }

    /**
     * Check if a quest is completed
     */
    async checkQuestCompletion(address: string, questId: string): Promise<boolean> {
        const quest = this.quests.get(questId);
        if (!quest) return false;

        // Get user tokens
        const userTokens = this.getUserTokens(address);

        // Check if quest is already completed
        if (quest.completedBy.includes(address)) return true;

        let completed = false;

        // Check completion conditions based on quest type
        switch (quest.id) {
            case ethers.utils.id('quest_moonlight_gathering').slice(0, 16):
                // Check if we're in full moon phase (simplified)
                const dayOfMonth = new Date().getDate();
                const moonCycle = (dayOfMonth % 30) / 30;
                const isFullMoonPhase = Math.abs(moonCycle - 0.5) < 0.1;

                // Check if user has a twilight token
                const hasTwilightToken = userTokens.some(token => token.realm === FaeRealm.Twilight);

                completed = isFullMoonPhase && hasTwilightToken;
                break;

            case ethers.utils.id('quest_elemental_harmony').slice(0, 16):
                // Check if user has all five affinities
                const affinities = new Set(userTokens.map(token => token.affinity));
                completed = affinities.size === 5;
                break;

            case ethers.utils.id('quest_luminance_mastery').slice(0, 16):
                // Check if any token has luminance >= 0.8
                completed = userTokens.some(token => token.luminance >= 0.8);
                break;

            case ethers.utils.id('quest_wyldwood_resonance').slice(0, 16):
                // Check if user has Wyldwood token with high resonance
                completed = userTokens.some(token =>
                    token.realm === FaeRealm.Wyldwood &&
                    token.resonance >= (quest.minResonance || 0)
                );
                break;
        }

        // If completed, award rewards
        if (completed) {
            quest.completedBy.push(address);

            // Remove from active quests
            const userQuests = this.activeQuests.get(address) || [];
            this.activeQuests.set(
                address,
                userQuests.filter(id => id !== questId)
            );
        }

        return completed;
    }

    /**
     * Get reward for completing a quest
     */
    async claimQuestReward(address: string, questId: string): Promise<{
        essence: number;
        enchantment: string | null;
    }> {
        const quest = this.quests.get(questId);
        if (!quest || !quest.completedBy.includes(address)) {
            return { essence: 0, enchantment: null };
        }

        return {
            essence: quest.rewardEssence,
            enchantment: quest.rewardEnchantment || null
        };
    }

    /**
     * Determines the current prevalent Fae realm based on time cycles
     */
    private determineRealm(): FaeRealm {
        const date = new Date();
        const month = date.getMonth(); // 0-11
        const hour = date.getHours(); // 0-23

        // Seasonal determination
        if (month >= 2 && month <= 4) {
            // Spring - Favor Twilight/Seelie
            return hour >= 5 && hour <= 19 ? FaeRealm.Seelie : FaeRealm.Twilight;
        } else if (month >= 5 && month <= 7) {
            // Summer - Favor Seelie/Wyldwood
            return hour >= 5 && hour <= 19 ? FaeRealm.Seelie : FaeRealm.Wyldwood;
        } else if (month >= 8 && month <= 10) {
            // Fall - Favor Twilight/Unseelie
            return hour >= 5 && hour <= 19 ? FaeRealm.Twilight : FaeRealm.Unseelie;
        } else {
            // Winter - Favor Unseelie/Wyldwood
            return hour >= 8 && hour <= 16 ? FaeRealm.Wyldwood : FaeRealm.Unseelie;
        }
    }

    /**
     * Determines token affinity based on address and energy
     */
    private determineAffinity(address: string, energy: number): FaeAffinity {
        // Use address to generate a deterministic but seemingly random affinity
        const addressSum = address
            .toLowerCase()
            .split('')
            .reduce((sum, char) => sum + char.charCodeAt(0), 0);

        // Modify based on energy level
        const modifiedValue = (addressSum + Math.floor(energy * 100)) % 100;

        if (modifiedValue < 20) return FaeAffinity.Earth;
        if (modifiedValue < 40) return FaeAffinity.Water;
        if (modifiedValue < 60) return FaeAffinity.Air;
        if (modifiedValue < 80) return FaeAffinity.Fire;
        return FaeAffinity.Aether;
    }

    /**
     * Calculates base essence amount based on user stats
     */
    private calculateEssence(resonance: number, energy: number): number {
        // Base calculation
        const baseAmount = 10 + (resonance * 20) + (energy * 5);

        // Add some mystical variability
        const moonPhase = this.getMoonPhaseMultiplier();
        return baseAmount * moonPhase;
    }

    /**
     * Get a multiplier based on lunar cycle
     */
    private getMoonPhaseMultiplier(): number {
        const dayOfMonth = new Date().getDate();
        const moonCycle = (dayOfMonth % 30) / 30; // 0-1 representing moon phase

        // Full moon (0.5) gives highest bonus
        const moonBonus = 1 - Math.abs(moonCycle - 0.5) * 0.4;
        return 0.8 + moonBonus;
    }

    /**
     * Check if this ecosystem is ready for a relaunch (seasonal shift)
     */
    private checkRelaunchAvailability(): void {
        // Determine if enough time has passed in current season (simplified for demo)
        const now = Date.now();
        const seasonElapsed = now - this.seasonStartTime;

        // Make relaunch available after ~90 days or if it's a new actual season
        const daysElapsed = seasonElapsed / (24 * 60 * 60 * 1000);

        if (daysElapsed >= 90 || this.hasRealSeasonChanged()) {
            this.relaunchAvailable = true;
        }
    }

    private hasRealSeasonChanged(): boolean {
        const now = new Date();
        const month = now.getMonth(); // 0-11

        let currentRealSeason: SeasonalCycle;

        if (month >= 2 && month <= 4) {
            currentRealSeason = SeasonalCycle.Spring;
        } else if (month >= 5 && month <= 7) {
            currentRealSeason = SeasonalCycle.Summer;
        } else if (month >= 8 && month <= 10) {
            currentRealSeason = SeasonalCycle.Autumn;
        } else {
            currentRealSeason = SeasonalCycle.Winter;
        }

        return currentRealSeason !== this.currentSeason;
    }

    /**
     * Perform a seasonal relaunch of the ecosystem
     * This shifts the seasonal influence and migrations tokens between realms
     */
    async performRelaunch(address: string): Promise<{
        season: SeasonalCycle;
        migratedTokens: FaeToken[];
        essenceBonus: number;
    }> {
        if (!this.relaunchAvailable) {
            throw new Error("Seasonal relaunch is not available yet");
        }

        // Determine the next season
        const nextSeason = this.getNextSeason();

        // Get user tokens
        const userTokens = this.getUserTokens(address);
        const migratedTokens: FaeToken[] = [];
        let totalEssenceBonus = 0;

        // Migrate each token to a realm aligned with the new season
        for (const token of userTokens) {
            const oldRealm = token.realm;
            const newRealm = this.determineRealmForSeason(token, nextSeason);

            // Only migrate if realm changed
            if (oldRealm !== newRealm) {
                // Record migration history
                token.migrations.push({
                    fromRealm: oldRealm,
                    toRealm: newRealm,
                    season: nextSeason,
                    timestamp: Date.now()
                });

                // Calculate essence bonus from migration
                const migrationBonus = token.essence * 0.1 * (token.migrations.length * 0.05 + 1);
                token.essence += migrationBonus;
                totalEssenceBonus += migrationBonus;

                // Apply the realm change
                token.realm = newRealm;

                migratedTokens.push(token);
            }
        }

        // Record the migration
        if (migratedTokens.length > 0) {
            this.realmMigrations.push({
                address,
                tokenIds: migratedTokens.map(t => t.id),
                fromSeason: this.currentSeason,
                toSeason: nextSeason,
                essenceBonus: totalEssenceBonus,
                timestamp: Date.now()
            });
        }

        // Shift the season
        this.currentSeason = nextSeason;
        this.seasonStartTime = Date.now();
        this.relaunchAvailable = false;

        // Create new seasonal events
        this.createSeasonalEvents();

        return {
            season: nextSeason,
            migratedTokens,
            essenceBonus: totalEssenceBonus
        };
    }

    private getNextSeason(): SeasonalCycle {
        switch (this.currentSeason) {
            case SeasonalCycle.Spring: return SeasonalCycle.Summer;
            case SeasonalCycle.Summer: return SeasonalCycle.Autumn;
            case SeasonalCycle.Autumn: return SeasonalCycle.Winter;
            case SeasonalCycle.Winter: return SeasonalCycle.Spring;
        }
    }

    private determineRealmForSeason(token: FaeToken, season: SeasonalCycle): FaeRealm {
        // Different affinities pull tokens toward different realms in different seasons

        // Higher chance to return realm aligned with the season
        const seasonalRealms = {
            [SeasonalCycle.Spring]: [FaeRealm.Seelie, FaeRealm.Twilight],
            [SeasonalCycle.Summer]: [FaeRealm.Seelie, FaeRealm.Wyldwood],
            [SeasonalCycle.Autumn]: [FaeRealm.Unseelie, FaeRealm.Wyldwood],
            [SeasonalCycle.Winter]: [FaeRealm.Unseelie, FaeRealm.Twilight]
        };

        // Affinity influences realm alignment
        const affinityAlignments = {
            [FaeAffinity.Earth]: FaeRealm.Wyldwood,
            [FaeAffinity.Air]: FaeRealm.Seelie,
            [FaeAffinity.Fire]: FaeRealm.Twilight,
            [FaeAffinity.Water]: FaeRealm.Unseelie,
            [FaeAffinity.Aether]: token.realm // Aether tends to stay where it is
        };

        // Roll for migration with weighted chances
        const roll = Math.random();

        // 60% chance to align with season
        if (roll < 0.6) {
            const seasonRealms = seasonalRealms[season];
            return seasonRealms[Math.floor(Math.random() * seasonRealms.length)];
        }
        // 30% chance to align with affinity
        else if (roll < 0.9) {
            return affinityAlignments[token.affinity];
        }
        // 10% chance for random realm
        else {
            const allRealms = Object.values(FaeRealm);
            return allRealms[Math.floor(Math.random() * allRealms.length)];
        }
    }

    /**
     * Gets the current seasonal event
     */
    getCurrentSeasonalEvent(): SeasonalEvent | undefined {
        const now = Date.now();

        for (const event of this.seasonalEvents.values()) {
            if (now >= event.startDate && now <= event.endDate) {
                return event;
            }
        }

        return undefined;
    }

    /**
     * Gets all available seasonal events
     */
    getSeasonalEvents(): SeasonalEvent[] {
        return Array.from(this.seasonalEvents.values());
    }

    /**
     * Get ecosystem status including seasonal info
     */
    getEcosystemStatus(): {
        currentSeason: SeasonalCycle;
        seasonStartTime: number;
        relaunchAvailable: boolean;
        realmInfluence: Map<FaeRealm, number>;
        seasonalBonuses: SeasonalEvent['bonuses'];
    } {
        const event = this.getCurrentSeasonalEvent();

        return {
            currentSeason: this.currentSeason,
            seasonStartTime: this.seasonStartTime,
            relaunchAvailable: this.relaunchAvailable,
            realmInfluence: event?.realmInfluence || new Map(),
            seasonalBonuses: event?.bonuses || {}
        };
    }

    /**
     * Get migration history for a user
     */
    getUserMigrationHistory(address: string): RealmMigration[] {
        return this.realmMigrations.filter(migration =>
            migration.address === address
        );
    }

    /**
     * Gets available enchantments
     */
    getAvailableEnchantments(): Map<string, FaeEnchantment> {
        return new Map(this.enchantments);
    }

    /**
     * Gets user's tokens
     */
    getUserTokens(address: string): FaeToken[] {
        // In a real implementation, this would filter by owner
        // For demo, just return all tokens
        return Array.from(this.tokens.values());
    }

    /**
     * Gets available quests
     */
    getAvailableQuests(): Map<string, FaeQuest> {
        return new Map(this.quests);
    }

    /**
     * Gets user's active quests
     */
    getUserActiveQuests(address: string): FaeQuest[] {
        const activeQuestIds = this.activeQuests.get(address) || [];
        return activeQuestIds
            .map(id => this.quests.get(id))
            .filter(quest => quest !== undefined) as FaeQuest[];
    }

    /**
     * Gets user's completed quests
     */
    getUserCompletedQuests(address: string): FaeQuest[] {
        return Array.from(this.quests.values())
            .filter(quest => quest.completedBy.includes(address));
    }
}
