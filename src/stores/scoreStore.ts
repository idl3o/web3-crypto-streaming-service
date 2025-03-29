import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useTransactionStore } from './transactionStore';
import { useCivilizationStore } from './civilizationStore';
import { useEngagementStore } from './engagementStore';
import { TransactionType } from '@/services/transactionService';

export enum ScoreCategory {
    STREAMING = 'streaming',
    ESSENCE = 'essence',
    TOKENS = 'tokens',
    ECONOMY = 'economy',
    BUILDING = 'building',
    ENGAGEMENT = 'engagement',
    OVERALL = 'overall'
}

interface ScoreHistory {
    timestamp: number;
    category: ScoreCategory;
    points: number;
    reason: string;
}

export const useScoreStore = defineStore('score', () => {
    const transactionStore = useTransactionStore();
    const civilizationStore = useCivilizationStore();
    const engagementStore = useEngagementStore();

    // Current scores by category
    const scores = ref<Record<ScoreCategory, number>>({
        [ScoreCategory.STREAMING]: 0,
        [ScoreCategory.ESSENCE]: 0,
        [ScoreCategory.TOKENS]: 0,
        [ScoreCategory.ECONOMY]: 0,
        [ScoreCategory.BUILDING]: 0,
        [ScoreCategory.ENGAGEMENT]: 0,
        [ScoreCategory.OVERALL]: 0
    });

    // Score history for tracking progress
    const scoreHistory = ref<ScoreHistory[]>([]);

    // Last processed transaction timestamp
    const lastProcessedTimestamp = ref(
        parseInt(localStorage.getItem('score_last_processed') || '0')
    );

    // Load scores from localStorage
    function loadScores() {
        Object.keys(scores.value).forEach(key => {
            const stored = localStorage.getItem(`score_${key}`);
            if (stored) {
                scores.value[key as ScoreCategory] = parseFloat(stored);
            }
        });

        const storedHistory = localStorage.getItem('score_history');
        if (storedHistory) {
            scoreHistory.value = JSON.parse(storedHistory);
        }
    }

    // Save scores to localStorage
    function saveScores() {
        Object.entries(scores.value).forEach(([key, value]) => {
            localStorage.setItem(`score_${key}`, value.toString());
        });

        // Only store the last 100 history items to keep storage reasonable
        const trimmedHistory = scoreHistory.value.slice(-100);
        localStorage.setItem('score_history', JSON.stringify(trimmedHistory));

        // Save last processed timestamp
        localStorage.setItem('score_last_processed', lastProcessedTimestamp.value.toString());
    }

    // Calculate score based on transactions and activities
    function processNewActivity() {
        // Get new transactions since last processing
        const newTransactions = transactionStore.transactions.filter(
            tx => tx.timestamp > lastProcessedTimestamp.value
        );

        if (newTransactions.length === 0) return;

        // Process each transaction
        newTransactions.forEach(tx => {
            let scoreChanges: Partial<Record<ScoreCategory, number>> = {};

            switch (tx.type) {
                case TransactionType.STREAM_PAYMENT:
                    // Score based on amount spent
                    scoreChanges[ScoreCategory.STREAMING] = tx.amount * 1000;
                    break;

                case TransactionType.ESSENCE_EARNED:
                    // Score based on essence earned
                    if (tx.faeEssence) {
                        scoreChanges[ScoreCategory.ESSENCE] = tx.faeEssence * 5;
                    }
                    break;

                case TransactionType.TOKEN_MINTED:
                    scoreChanges[ScoreCategory.TOKENS] = 100;
                    break;

                case TransactionType.TOKEN_ENCHANTED:
                    scoreChanges[ScoreCategory.TOKENS] = 50;
                    break;

                case TransactionType.FEE_DISCOUNT:
                    if (tx.originalAmount && tx.amount) {
                        const savings = tx.originalAmount - tx.amount;
                        scoreChanges[ScoreCategory.ECONOMY] = savings * 2000;
                    }
                    break;
            }

            // Apply score changes and record in history
            Object.entries(scoreChanges).forEach(([category, points]) => {
                if (points) {
                    scores.value[category as ScoreCategory] += points;

                    // Record in history
                    scoreHistory.value.push({
                        timestamp: tx.timestamp,
                        category: category as ScoreCategory,
                        points,
                        reason: tx.type
                    });
                }
            });

            // Update last processed timestamp
            lastProcessedTimestamp.value = Math.max(lastProcessedTimestamp.value, tx.timestamp);
        });

        // Add building score based on civilization buildings
        const buildingCount = civilizationStore.buildings.length;
        const currentBuildingScore = buildingCount * 50;
        const previousBuildingScore = scores.value[ScoreCategory.BUILDING];

        if (currentBuildingScore > previousBuildingScore) {
            const buildingScoreIncrease = currentBuildingScore - previousBuildingScore;
            scores.value[ScoreCategory.BUILDING] = currentBuildingScore;

            scoreHistory.value.push({
                timestamp: Date.now(),
                category: ScoreCategory.BUILDING,
                points: buildingScoreIncrease,
                reason: 'building_constructed'
            });
        }

        // Add engagement score based on engagement store
        const engagementScore =
            engagementStore.totalReactions * 5 +
            engagementStore.totalReviews * 20 +
            engagementStore.totalHighlights * 10;

        const previousEngagementScore = scores.value[ScoreCategory.ENGAGEMENT];
        if (engagementScore > previousEngagementScore) {
            const engagementScoreIncrease = engagementScore - previousEngagementScore;
            scores.value[ScoreCategory.ENGAGEMENT] = engagementScore;

            scoreHistory.value.push({
                timestamp: Date.now(),
                category: ScoreCategory.ENGAGEMENT,
                points: engagementScoreIncrease,
                reason: 'engagement_activity'
            });
        }

        // Calculate overall score
        calculateOverallScore();

        // Save updated scores
        saveScores();
    }

    // Calculate overall score as weighted sum of categories
    function calculateOverallScore() {
        const weights = {
            [ScoreCategory.STREAMING]: 0.25,
            [ScoreCategory.ESSENCE]: 0.2,
            [ScoreCategory.TOKENS]: 0.15,
            [ScoreCategory.ECONOMY]: 0.15,
            [ScoreCategory.BUILDING]: 0.15,
            [ScoreCategory.ENGAGEMENT]: 0.1
        };

        let overallScore = 0;
        Object.entries(weights).forEach(([category, weight]) => {
            overallScore += scores.value[category as ScoreCategory] * weight;
        });

        scores.value[ScoreCategory.OVERALL] = Math.floor(overallScore);
    }

    // Get category scores for the past N days
    function getCategoryScoreHistory(category: ScoreCategory, days: number = 7): { date: string, points: number }[] {
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - days);
        const startTimestamp = startDate.getTime();

        // Filter history by category and time range
        const relevantHistory = scoreHistory.value.filter(
            entry => entry.category === category && entry.timestamp >= startTimestamp
        );

        // Group by date
        const scoresByDate = new Map<string, number>();
        for (let i = 0; i < days; i++) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            scoresByDate.set(dateString, 0);
        }

        // Sum points by date
        relevantHistory.forEach(entry => {
            const date = new Date(entry.timestamp).toISOString().split('T')[0];
            if (scoresByDate.has(date)) {
                scoresByDate.set(date, scoresByDate.get(date)! + entry.points);
            }
        });

        // Convert to array and sort by date
        return Array.from(scoresByDate.entries())
            .map(([date, points]) => ({ date, points }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    // Get rank based on overall score
    const scoreRank = computed(() => {
        const overallScore = scores.value[ScoreCategory.OVERALL];

        if (overallScore >= 10000) return { rank: 'Legendary', tier: 5 };
        if (overallScore >= 5000) return { rank: 'Master', tier: 4 };
        if (overallScore >= 2000) return { rank: 'Expert', tier: 3 };
        if (overallScore >= 500) return { rank: 'Intermediate', tier: 2 };
        return { rank: 'Novice', tier: 1 };
    });

    // Initialize the store
    function initialize() {
        loadScores();
        processNewActivity();
    }

    return {
        scores,
        scoreHistory,
        scoreRank,
        getCategoryScoreHistory,
        initialize,
        processNewActivity
    };
});
