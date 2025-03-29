import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
import { memoize } from '@/components/transaction/TransactionOptimizer';

interface Reaction {
    transactionId: string;
    userId: string;
    type: string;
    timestamp: number;
}

interface Review {
    transactionId: string;
    userId: string;
    rating: number;
    comment: string;
    timestamp: number;
}

interface HighlightedTransaction {
    transactionId: string;
    userId: string;
    timestamp: number;
}

// Performance optimizations for engagement store
export const useEngagementStore = defineStore('engagement', () => {
    // State - using shallowRef for better performance with large arrays
    const reactions = shallowRef<Reaction[]>([]);
    const reviews = shallowRef<Review[]>([]);
    const highlightedTransactions = shallowRef<HighlightedTransaction[]>([]);
    const currentUserId = ref<string>(localStorage.getItem('userId') || generateUserId());

    // Indexing for faster lookups
    const reactionsByTransaction = shallowRef(new Map<string, Reaction[]>());
    const reviewsByTransaction = shallowRef(new Map<string, Review[]>());
    const highlightsByUser = shallowRef(new Map<string, Set<string>>());

    // Caching
    const reactionCounts = shallowRef(new Map<string, Map<string, number>>());
    const userReactionCache = shallowRef(new Map<string, string[]>());

    // Last update timestamps for cache invalidation
    const lastUpdated = ref({
        reactions: 0,
        reviews: 0,
        highlights: 0
    });

    // Helper to generate a temporary user ID until real authentication is used
    function generateUserId(): string {
        const id = `user_${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem('userId', id);
        return id;
    }

    // Rebuild indexes for optimal performance
    function rebuildIndexes() {
        // Index reactions by transaction
        const newReactionsByTransaction = new Map<string, Reaction[]>();
        const newReactionCounts = new Map<string, Map<string, number>>();

        reactions.value.forEach(reaction => {
            if (!newReactionsByTransaction.has(reaction.transactionId)) {
                newReactionsByTransaction.set(reaction.transactionId, []);
            }
            newReactionsByTransaction.get(reaction.transactionId)!.push(reaction);

            // Count reactions by type for each transaction
            if (!newReactionCounts.has(reaction.transactionId)) {
                newReactionCounts.set(reaction.transactionId, new Map());
            }
            const counts = newReactionCounts.get(reaction.transactionId)!;
            counts.set(reaction.type, (counts.get(reaction.type) || 0) + 1);
        });

        reactionsByTransaction.value = newReactionsByTransaction;
        reactionCounts.value = newReactionCounts;

        // Index reviews by transaction
        const newReviewsByTransaction = new Map<string, Review[]>();
        reviews.value.forEach(review => {
            if (!newReviewsByTransaction.has(review.transactionId)) {
                newReviewsByTransaction.set(review.transactionId, []);
            }
            newReviewsByTransaction.get(review.transactionId)!.push(review);
        });
        reviewsByTransaction.value = newReviewsByTransaction;

        // Index highlights by user
        const newHighlightsByUser = new Map<string, Set<string>>();
        highlightedTransactions.value.forEach(highlight => {
            if (!newHighlightsByUser.has(highlight.userId)) {
                newHighlightsByUser.set(highlight.userId, new Set());
            }
            newHighlightsByUser.get(highlight.userId)!.add(highlight.transactionId);
        });
        highlightsByUser.value = newHighlightsByUser;

        // Clear user reaction cache
        userReactionCache.value = new Map();
    }

    // Load data from local storage on initialization
    function loadFromStorage() {
        try {
            // Load with chunking for large datasets
            const loadChunked = <T>(key: string): T[] => {
                const count = parseInt(localStorage.getItem(`${key}_count`) || '0');
                if (count === 0) {
                    const data = localStorage.getItem(key);
                    return data ? JSON.parse(data) : [];
                }

                let result: T[] = [];
                for (let i = 0; i < count; i++) {
                    const chunk = localStorage.getItem(`${key}_${i}`);
                    if (chunk) {
                        result = result.concat(JSON.parse(chunk));
                    }
                }
                return result;
            };

            reactions.value = loadChunked<Reaction>('tx_reactions');
            reviews.value = loadChunked<Review>('tx_reviews');
            highlightedTransactions.value = loadChunked<HighlightedTransaction>('tx_highlights');

            // Rebuild all indexes after loading
            rebuildIndexes();
        } catch (error) {
            console.error('Error loading engagement data from storage:', error);
        }
    }

    // Save data to local storage with chunking for large datasets
    function saveToStorage() {
        try {
            // Helper to save large arrays in chunks
            const saveChunked = <T>(key: string, data: T[], chunkSize = 500): void => {
                if (data.length <= chunkSize) {
                    localStorage.setItem(key, JSON.stringify(data));
                    localStorage.removeItem(`${key}_count`);
                    return;
                }

                // Clear any existing chunks
                const oldCount = parseInt(localStorage.getItem(`${key}_count`) || '0');
                for (let i = 0; i < oldCount; i++) {
                    localStorage.removeItem(`${key}_${i}`);
                }

                // Save in chunks
                const chunkCount = Math.ceil(data.length / chunkSize);
                localStorage.setItem(`${key}_count`, chunkCount.toString());

                for (let i = 0; i < chunkCount; i++) {
                    const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
                    localStorage.setItem(`${key}_${i}`, JSON.stringify(chunk));
                }
            };

            saveChunked('tx_reactions', reactions.value);
            saveChunked('tx_reviews', reviews.value);
            saveChunked('tx_highlights', highlightedTransactions.value);
        } catch (error) {
            console.error('Error saving engagement data to storage:', error);
        }
    }

    // Load data on initialization
    loadFromStorage();

    // Optimized getters using indexes
    function getUserReactions(transactionId: string): string[] {
        const cacheKey = `${currentUserId.value}_${transactionId}`;

        // Check cache first
        if (userReactionCache.value.has(cacheKey)) {
            return userReactionCache.value.get(cacheKey)!;
        }

        // Use the index to find reactions for this transaction
        const txReactions = reactionsByTransaction.value.get(transactionId) || [];
        const result = txReactions
            .filter(r => r.userId === currentUserId.value)
            .map(r => r.type);

        // Update cache
        userReactionCache.value.set(cacheKey, result);

        return result;
    }

    // Optimized reaction count getter
    function getReactionCount(transactionId: string, reactionType: string): number {
        const counts = reactionCounts.value.get(transactionId);
        if (counts) {
            return counts.get(reactionType) || 0;
        }
        return 0;
    }

    // Fast highlight check
    function isTransactionHighlighted(transactionId: string): boolean {
        const userHighlights = highlightsByUser.value.get(currentUserId.value);
        return userHighlights ? userHighlights.has(transactionId) : false;
    }

    // Optimized review getters
    const getUserRatingMemoized = memoize((transactionId: string, userId: string): number | null => {
        const txReviews = reviewsByTransaction.value.get(transactionId) || [];
        const review = txReviews.find(r => r.userId === userId);
        return review ? review.rating : null;
    });

    function getUserRating(transactionId: string): number | null {
        return getUserRatingMemoized(transactionId, currentUserId.value);
    }

    const getUserReviewMemoized = memoize((transactionId: string, userId: string): string | null => {
        const txReviews = reviewsByTransaction.value.get(transactionId) || [];
        const review = txReviews.find(r => r.userId === userId);
        return review ? review.comment : null;
    });

    function getUserReview(transactionId: string): string | null {
        return getUserReviewMemoized(transactionId, currentUserId.value);
    }

    // Computed total engagement metrics with memoization
    const totalReactions = computed(() => reactions.value.length);
    const totalReviews = computed(() => reviews.value.length);
    const totalHighlights = computed(() => highlightedTransactions.value.length);

    // Average ratings by transaction ID
    const getAverageRatingMemoized = memoize((transactionId: string): number => {
        const txReviews = reviewsByTransaction.value.get(transactionId) || [];
        if (txReviews.length === 0) return 0;

        const sum = txReviews.reduce((total, review) => total + review.rating, 0);
        return sum / txReviews.length;
    });

    function getAverageRating(transactionId: string): number {
        return getAverageRatingMemoized(transactionId);
    }

    // Actions
    function toggleReaction(transactionId: string, reactionType: string) {
        const existingIndex = reactions.value.findIndex(
            r => r.transactionId === transactionId &&
                r.userId === currentUserId.value &&
                r.type === reactionType
        );

        if (existingIndex >= 0) {
            // Remove reaction if it exists
            reactions.value = [...reactions.value.slice(0, existingIndex), ...reactions.value.slice(existingIndex + 1)];
        } else {
            // Add new reaction
            reactions.value = [...reactions.value, {
                transactionId,
                userId: currentUserId.value,
                type: reactionType,
                timestamp: Date.now()
            }];
        }

        // Update timestamp and rebuild indexes
        lastUpdated.value.reactions = Date.now();
        rebuildIndexes();

        // Batch storage operations slightly delayed for better UI responsiveness
        setTimeout(() => {
            saveToStorage();
        }, 300);
    }

    function toggleHighlight(transactionId: string) {
        const existingIndex = highlightedTransactions.value.findIndex(
            h => h.transactionId === transactionId && h.userId === currentUserId.value
        );

        if (existingIndex >= 0) {
            // Remove highlight if it exists
            highlightedTransactions.value = [
                ...highlightedTransactions.value.slice(0, existingIndex),
                ...highlightedTransactions.value.slice(existingIndex + 1)
            ];
        } else {
            // Add new highlight
            highlightedTransactions.value = [...highlightedTransactions.value, {
                transactionId,
                userId: currentUserId.value,
                timestamp: Date.now()
            }];
        }

        // Update timestamp and rebuild indexes
        lastUpdated.value.highlights = Date.now();
        rebuildIndexes();

        // Batch storage operations
        setTimeout(() => {
            saveToStorage();
        }, 300);
    }

    function saveReview(transactionId: string, reviewData: { rating: number, comment: string, timestamp: number }) {
        const existingIndex = reviews.value.findIndex(
            r => r.transactionId === transactionId && r.userId === currentUserId.value
        );

        if (existingIndex >= 0) {
            // Update existing review
            const updatedReview = {
                ...reviews.value[existingIndex],
                rating: reviewData.rating,
                comment: reviewData.comment,
                timestamp: reviewData.timestamp
            };

            reviews.value = [
                ...reviews.value.slice(0, existingIndex),
                updatedReview,
                ...reviews.value.slice(existingIndex + 1)
            ];
        } else {
            // Add new review
            reviews.value = [...reviews.value, {
                transactionId,
                userId: currentUserId.value,
                rating: reviewData.rating,
                comment: reviewData.comment,
                timestamp: reviewData.timestamp
            }];
        }

        // Update timestamp and rebuild indexes
        lastUpdated.value.reviews = Date.now();
        rebuildIndexes();

        // Batch storage operations
        setTimeout(() => {
            saveToStorage();
        }, 300);
    }

    // Pre-compute reaction distribution only when reactions change
    const reactionDistributionCache = computed(() => {
        const distribution: Record<string, number> = {};

        reactions.value.forEach(reaction => {
            if (!distribution[reaction.type]) {
                distribution[reaction.type] = 0;
            }
            distribution[reaction.type]++;
        });

        return distribution;
    });

    // Analytics with memoization
    const engagementAnalytics = computed(() => {
        // Get unique transaction IDs
        const uniqueTransactionIds = new Set<string>();

        // Using the indexes for better performance
        reactionsByTransaction.value.forEach((_, transactionId) => {
            uniqueTransactionIds.add(transactionId);
        });

        reviewsByTransaction.value.forEach((_, transactionId) => {
            uniqueTransactionIds.add(transactionId);
        });

        highlightedTransactions.value.forEach(highlight => {
            uniqueTransactionIds.add(highlight.transactionId);
        });

        const totalEngagements = totalReactions.value + totalReviews.value + totalHighlights.value;
        const engagedTransactions = uniqueTransactionIds.size;

        return {
            totalEngagements,
            engagedTransactions,
            averageEngagementsPerTransaction: engagedTransactions > 0
                ? totalEngagements / engagedTransactions
                : 0,
            reactionDistribution: reactionDistributionCache.value
        };
    });

    // Cleanup method to free memory when store is no longer needed
    function cleanup() {
        reactions.value = [];
        reviews.value = [];
        highlightedTransactions.value = [];
        rebuildIndexes();
    }

    // Clear memory-intensive data structures when not in use
    reactions.value = [];
    reviews.value = [];
    highlightedTransactions.value = [];

    // Clear indices
    reactionsByTransaction.value = new Map();
    reviewsByTransaction.value = new Map();
    highlightsByUser.value = new Map();

    // Clear caches
    reactionCounts.value = new Map();
    userReactionCache.value = new Map();

    return {
        // State
        reactions,
        reviews,
        highlightedTransactions,
        currentUserId,
        lastUpdated,

        // Getters
        getUserReactions,
        getReactionCount,
        isTransactionHighlighted,
        getUserRating,
        getUserReview,
        getAverageRating,
        totalReactions,
        totalReviews,
        totalHighlights,
        engagementAnalytics,

        // Actions
        toggleReaction,
        toggleHighlight,
        saveReview,
        cleanup,

        // For debugging/testing
        rebuildIndexes,
    };
});
