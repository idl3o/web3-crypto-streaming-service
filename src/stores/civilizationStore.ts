import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { useTransactionStore } from './transactionStore';
import { useEngagementStore } from './engagementStore';

// Civilization levels configuration
const CIVILIZATION_LEVELS = [
    { level: 1, name: 'Settlement', requiredPoints: 0, icon: '🏕️', reward: 'Basic Transaction Fee Discount (1%)' },
    { level: 2, name: 'Village', requiredPoints: 100, icon: '🏘️', reward: 'Enhanced Essence Generation (+5%)' },
    { level: 3, name: 'Town', requiredPoints: 250, icon: '🏙️', reward: 'Transaction Fee Discount (2%)' },
    { level: 4, name: 'City', requiredPoints: 500, icon: '🌆', reward: 'Daily Essence Bonus' },
    { level: 5, name: 'Metropolis', requiredPoints: 1000, icon: '🌃', reward: 'Transaction Fee Discount (3%)' },
    { level: 6, name: 'Region', requiredPoints: 2000, icon: '🏞️', reward: 'Custom Transaction Badge' },
    { level: 7, name: 'Nation', requiredPoints: 5000, icon: '🗽', reward: 'Enhanced Essence Generation (+10%)' },
    { level: 8, name: 'Empire', requiredPoints: 10000, icon: '🏛️', reward: 'Transaction Fee Discount (5%)' },
    { level: 9, name: 'Continental Power', requiredPoints: 20000, icon: '🌍', reward: 'Exclusive Fae Token Enchantment' },
    { level: 10, name: 'Global Civilization', requiredPoints: 50000, icon: '🌌', reward: 'Maximum Fee Discount (10%)' }
];

// Resource types that can be earned
export enum CivResourceType {
    GOLD = 'gold',
    CULTURE = 'culture',
    SCIENCE = 'science',
    PRODUCTION = 'production',
    FOOD = 'food'
}

// Resource metadata
const RESOURCE_META = {
    [CivResourceType.GOLD]: { icon: '💰', color: '#FFD700', earnRate: 1.0 },
    [CivResourceType.CULTURE]: { icon: '🎭', color: '#9C27B0', earnRate: 0.5 },
    [CivResourceType.SCIENCE]: { icon: '🧪', color: '#2196F3', earnRate: 0.7 },
    [CivResourceType.PRODUCTION]: { icon: '⚒️', color: '#F44336', earnRate: 0.8 },
    [CivResourceType.FOOD]: { icon: '🌽', color: '#4CAF50', earnRate: 1.2 }
};

// Resource earning rules for different transaction types
const RESOURCE_EARNING_RULES = {
    'stream_payment': [
        { type: CivResourceType.GOLD, formula: (tx) => tx.amount * 100 },
        { type: CivResourceType.CULTURE, formula: (tx) => tx.amount * 50 * (tx.details?.timeWatched || 1) / 5 }
    ],
    'essence_earned': [
        { type: CivResourceType.SCIENCE, formula: (tx) => (tx.faeEssence || 0) * 20 },
        { type: CivResourceType.PRODUCTION, formula: (tx) => (tx.faeEssence || 0) * 10 }
    ],
    'token_minted': [
        { type: CivResourceType.PRODUCTION, formula: () => 200 },
        { type: CivResourceType.GOLD, formula: () => 100 }
    ],
    'token_enchanted': [
        { type: CivResourceType.SCIENCE, formula: () => 150 },
        { type: CivResourceType.CULTURE, formula: () => 100 }
    ],
    'fee_discount': [
        { type: CivResourceType.GOLD, formula: (tx) => ((tx.originalAmount || 0) - tx.amount) * 200 }
    ]
};

// Achievement definitions
const ACHIEVEMENTS = [
    { id: 'first_stream', name: 'First Stream', description: 'Complete your first content stream', icon: '🎬', points: 10 },
    { id: 'stream_marathon', name: 'Stream Marathon', description: 'Stream for over 60 minutes total', icon: '⏱️', points: 50 },
    { id: 'essence_collector', name: 'Essence Collector', description: 'Earn over 100 Fae Essence', icon: '✨', points: 30 },
    { id: 'token_master', name: 'Token Master', description: 'Mint 3 or more Fae Tokens', icon: '🏆', points: 100 },
    { id: 'engagement_guru', name: 'Engagement Guru', description: 'Earn 50+ reactions across all transactions', icon: '👍', points: 75 },
    { id: 'savings_expert', name: 'Savings Expert', description: 'Save over 0.1 ETH in transaction fees', icon: '💸', points: 50 },
    { id: 'enchantment_wizard', name: 'Enchantment Wizard', description: 'Enchant at least 2 tokens', icon: '🧙', points: 60 }
];

// Buildings that can be constructed
const BUILDINGS = [
    { id: 'marketplace', name: 'Marketplace', icon: '🏪', cost: { [CivResourceType.GOLD]: 500, [CivResourceType.PRODUCTION]: 300 }, effect: 'Increases Gold generation by 10%', unlockLevel: 2 },
    { id: 'library', name: 'Library', icon: '📚', cost: { [CivResourceType.SCIENCE]: 400, [CivResourceType.CULTURE]: 200 }, effect: 'Increases Science generation by 15%', unlockLevel: 3 },
    { id: 'theater', name: 'Theater', icon: '🎭', cost: { [CivResourceType.CULTURE]: 600, [CivResourceType.GOLD]: 300 }, effect: 'Increases Culture generation by 20%', unlockLevel: 4 },
    { id: 'workshop', name: 'Workshop', icon: '🔧', cost: { [CivResourceType.PRODUCTION]: 800, [CivResourceType.SCIENCE]: 400 }, effect: 'Increases Production generation by 25%', unlockLevel: 5 },
    { id: 'bank', name: 'Bank', icon: '🏦', cost: { [CivResourceType.GOLD]: 1000, [CivResourceType.PRODUCTION]: 500 }, effect: 'Increases transaction fee discounts by 2%', unlockLevel: 6 },
    { id: 'university', name: 'University', icon: '🎓', cost: { [CivResourceType.SCIENCE]: 1200, [CivResourceType.CULTURE]: 600 }, effect: 'Unlocks special token enchantments', unlockLevel: 7 },
    { id: 'stock_exchange', name: 'Stock Exchange', icon: '📈', cost: { [CivResourceType.GOLD]: 2000, [CivResourceType.SCIENCE]: 1000 }, effect: 'Increases all resource generation by 10%', unlockLevel: 8 }
];

export const useCivilizationStore = defineStore('civilization', () => {
    const transactionStore = useTransactionStore();
    const engagementStore = useEngagementStore();

    // User's civilization stats
    const name = ref(localStorage.getItem('civ_name') || 'My Civilization');
    const points = ref(parseInt(localStorage.getItem('civ_points') || '0'));
    const resources = ref<Record<CivResourceType, number>>({
        [CivResourceType.GOLD]: parseInt(localStorage.getItem('civ_gold') || '0'),
        [CivResourceType.CULTURE]: parseInt(localStorage.getItem('civ_culture') || '0'),
        [CivResourceType.SCIENCE]: parseInt(localStorage.getItem('civ_science') || '0'),
        [CivResourceType.PRODUCTION]: parseInt(localStorage.getItem('civ_production') || '0'),
        [CivResourceType.FOOD]: parseInt(localStorage.getItem('civ_food') || '0')
    });

    // Constructed buildings
    const buildings = ref<string[]>(
        JSON.parse(localStorage.getItem('civ_buildings') || '[]')
    );

    // Unlocked achievements
    const achievements = ref<string[]>(
        JSON.parse(localStorage.getItem('civ_achievements') || '[]')
    );

    // Last processed transaction timestamp
    const lastProcessedTimestamp = ref(
        parseInt(localStorage.getItem('civ_last_processed') || '0')
    );

    // Computed
    const level = computed(() => {
        for (let i = CIVILIZATION_LEVELS.length - 1; i >= 0; i--) {
            if (points.value >= CIVILIZATION_LEVELS[i].requiredPoints) {
                return CIVILIZATION_LEVELS[i];
            }
        }
        return CIVILIZATION_LEVELS[0];
    });

    const nextLevel = computed(() => {
        const currentLevelIndex = CIVILIZATION_LEVELS.findIndex(l => l.level === level.value.level);
        if (currentLevelIndex < CIVILIZATION_LEVELS.length - 1) {
            return CIVILIZATION_LEVELS[currentLevelIndex + 1];
        }
        return null;
    });

    const progressToNextLevel = computed(() => {
        if (!nextLevel.value) return 100;

        const currentPoints = points.value;
        const requiredPoints = nextLevel.value.requiredPoints;
        const previousLevelPoints = level.value.requiredPoints;

        return Math.min(100, Math.floor(
            ((currentPoints - previousLevelPoints) / (requiredPoints - previousLevelPoints)) * 100
        ));
    });

    const unlockedAchievements = computed(() => {
        return ACHIEVEMENTS.filter(a => achievements.value.includes(a.id));
    });

    const availableBuildings = computed(() => {
        return BUILDINGS
            .filter(b => b.unlockLevel <= level.value.level)
            .filter(b => !buildings.value.includes(b.id));
    });

    const constructedBuildings = computed(() => {
        return BUILDINGS.filter(b => buildings.value.includes(b.id));
    });

    const resourceMultipliers = computed(() => {
        // Calculate resource multipliers based on constructed buildings
        let multipliers = {
            [CivResourceType.GOLD]: 1.0,
            [CivResourceType.CULTURE]: 1.0,
            [CivResourceType.SCIENCE]: 1.0,
            [CivResourceType.PRODUCTION]: 1.0,
            [CivResourceType.FOOD]: 1.0
        };

        constructedBuildings.value.forEach(building => {
            if (building.id === 'marketplace') {
                multipliers[CivResourceType.GOLD] += 0.1;
            } else if (building.id === 'library') {
                multipliers[CivResourceType.SCIENCE] += 0.15;
            } else if (building.id === 'theater') {
                multipliers[CivResourceType.CULTURE] += 0.2;
            } else if (building.id === 'workshop') {
                multipliers[CivResourceType.PRODUCTION] += 0.25;
            } else if (building.id === 'stock_exchange') {
                // Increase all resource generation
                Object.keys(multipliers).forEach(key => {
                    multipliers[key as CivResourceType] += 0.1;
                });
            }
        });

        return multipliers;
    });

    // Fee discount based on civilization level and buildings
    const feeDiscount = computed(() => {
        let discount = 0;

        // Discount from civilization level
        if (level.value.level >= 1) discount += 0.01;
        if (level.value.level >= 3) discount += 0.01;
        if (level.value.level >= 5) discount += 0.01;
        if (level.value.level >= 8) discount += 0.02;
        if (level.value.level >= 10) discount += 0.05;

        // Discount from buildings
        if (buildings.value.includes('bank')) {
            discount += 0.02;
        }

        return Math.min(0.1, discount); // Cap at 10%
    });

    // Methods
    function renameCivilization(newName: string) {
        name.value = newName;
        localStorage.setItem('civ_name', newName);
    }

    function processTransactions() {
        // Get all transactions that haven't been processed yet
        const newTransactions = transactionStore.transactions.filter(
            tx => tx.timestamp > lastProcessedTimestamp.value
        );

        if (newTransactions.length === 0) return;

        let pointsEarned = 0;
        let newAchievements: string[] = [];
        const resourcesEarned: Record<CivResourceType, number> = {
            [CivResourceType.GOLD]: 0,
            [CivResourceType.CULTURE]: 0,
            [CivResourceType.SCIENCE]: 0,
            [CivResourceType.PRODUCTION]: 0,
            [CivResourceType.FOOD]: 0
        };

        // Process each transaction
        newTransactions.forEach(tx => {
            // Add base points for any transaction
            pointsEarned += 5;

            // Apply specific rules for transaction types
            const rules = RESOURCE_EARNING_RULES[tx.type] || [];
            rules.forEach(rule => {
                const amount = rule.formula(tx);
                const multiplier = resourceMultipliers.value[rule.type];
                resourcesEarned[rule.type] += amount * multiplier;
            });

            // Track latest timestamp
            lastProcessedTimestamp.value = Math.max(lastProcessedTimestamp.value, tx.timestamp);
        });

        // Process achievements
        const allTransactions = transactionStore.transactions;

        // First Stream achievement
        if (!achievements.value.includes('first_stream') &&
            allTransactions.some(tx => tx.type === 'stream_payment')) {
            newAchievements.push('first_stream');
        }

        // Stream Marathon achievement
        const totalStreamTime = allTransactions
            .filter(tx => tx.type === 'stream_payment' && tx.details?.timeWatched)
            .reduce((total, tx) => total + (tx.details?.timeWatched || 0), 0);

        if (!achievements.value.includes('stream_marathon') && totalStreamTime >= 60) {
            newAchievements.push('stream_marathon');
        }

        // Essence Collector achievement
        const totalEssence = allTransactions
            .filter(tx => tx.faeEssence)
            .reduce((total, tx) => total + (tx.faeEssence || 0), 0);

        if (!achievements.value.includes('essence_collector') && totalEssence >= 100) {
            newAchievements.push('essence_collector');
        }

        // Token Master achievement
        const mintedTokens = allTransactions
            .filter(tx => tx.type === 'token_minted')
            .length;

        if (!achievements.value.includes('token_master') && mintedTokens >= 3) {
            newAchievements.push('token_master');
        }

        // Engagement Guru achievement
        const totalReactions = engagementStore.totalReactions;
        if (!achievements.value.includes('engagement_guru') && totalReactions >= 50) {
            newAchievements.push('engagement_guru');
        }

        // Savings Expert achievement
        const totalSavings = allTransactions
            .filter(tx => tx.originalAmount && tx.amount)
            .reduce((total, tx) => total + ((tx.originalAmount || 0) - tx.amount), 0);

        if (!achievements.value.includes('savings_expert') && totalSavings >= 0.1) {
            newAchievements.push('savings_expert');
        }

        // Enchantment Wizard achievement
        const enchantedTokens = allTransactions
            .filter(tx => tx.type === 'token_enchanted')
            .length;

        if (!achievements.value.includes('enchantment_wizard') && enchantedTokens >= 2) {
            newAchievements.push('enchantment_wizard');
        }

        // Add points for new achievements
        if (newAchievements.length > 0) {
            const achievementPoints = newAchievements.reduce((total, id) => {
                const achievement = ACHIEVEMENTS.find(a => a.id === id);
                return total + (achievement?.points || 0);
            }, 0);

            pointsEarned += achievementPoints;
            achievements.value = [...achievements.value, ...newAchievements];
            localStorage.setItem('civ_achievements', JSON.stringify(achievements.value));
        }

        // Update points and resources
        if (pointsEarned > 0) {
            points.value += pointsEarned;
            localStorage.setItem('civ_points', points.value.toString());
        }

        // Apply earned resources
        Object.entries(resourcesEarned).forEach(([type, amount]) => {
            if (amount > 0) {
                resources.value[type as CivResourceType] += Math.floor(amount);
            }
        });

        // Save resources to localStorage
        Object.entries(resources.value).forEach(([type, amount]) => {
            localStorage.setItem(`civ_${type}`, amount.toString());
        });

        // Save last processed timestamp
        localStorage.setItem('civ_last_processed', lastProcessedTimestamp.value.toString());

        return {
            pointsEarned,
            resourcesEarned,
            newAchievements
        };
    }

    function constructBuilding(buildingId: string) {
        const building = BUILDINGS.find(b => b.id === buildingId);
        if (!building) return false;

        // Check if already constructed
        if (buildings.value.includes(buildingId)) return false;

        // Check level requirement
        if (building.unlockLevel > level.value.level) return false;

        // Check resource requirements
        for (const [resourceType, cost] of Object.entries(building.cost)) {
            if (resources.value[resourceType as CivResourceType] < cost) {
                return false;
            }
        }

        // Deduct resources
        for (const [resourceType, cost] of Object.entries(building.cost)) {
            resources.value[resourceType as CivResourceType] -= cost;
            localStorage.setItem(
                `civ_${resourceType}`,
                resources.value[resourceType as CivResourceType].toString()
            );
        }

        // Add building
        buildings.value.push(buildingId);
        localStorage.setItem('civ_buildings', JSON.stringify(buildings.value));

        return true;
    }

    function getResourceMetadata(type: CivResourceType) {
        return RESOURCE_META[type];
    }

    function getAllAchievements() {
        return ACHIEVEMENTS;
    }

    function getAllBuildings() {
        return BUILDINGS;
    }

    function getMaxLevel() {
        return CIVILIZATION_LEVELS[CIVILIZATION_LEVELS.length - 1].level;
    }

    // Initialize the store by processing transactions
    function initialize() {
        processTransactions();
    }

    // Watch for new transactions and process them
    watch(() => transactionStore.newTransactionAlert, (newTransaction) => {
        if (newTransaction) {
            processTransactions();
        }
    });

    return {
        // State
        name,
        points,
        resources,
        buildings,
        achievements,

        // Computed
        level,
        nextLevel,
        progressToNextLevel,
        unlockedAchievements,
        availableBuildings,
        constructedBuildings,
        feeDiscount,
        resourceMultipliers,

        // Methods
        renameCivilization,
        processTransactions,
        constructBuilding,
        getResourceMetadata,
        getAllAchievements,
        getAllBuildings,
        getMaxLevel,
        initialize,

        // Constants (exposing for components)
        ACHIEVEMENTS,
        BUILDINGS,
        CIVILIZATION_LEVELS,
        RESOURCE_META,
        CivResourceType
    };
});
