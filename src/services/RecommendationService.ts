/**
 * Recommendation Service
 * Handles content recommendations based on user viewing history and blockchain activity
 */
import { aiService } from './aiService';

export interface ContentItem {
    id: string;
    title: string;
    description: string;
    creator: string;
    creatorAddress: string;
    tags: string[];
    duration: number; // in seconds
    price: number; // in satoshis
    thumbnailUrl: string;
    createdAt: number; // timestamp
    viewCount: number;
    rating: number; // 0-5 scale
    category: string;
}

export interface UserPreferences {
    favoriteCategories?: string[];
    favoriteCreators?: string[];
    priceSensitivity?: number; // 0-1 scale (0: not sensitive, 1: very sensitive)
    contentDurationPreference?: 'short' | 'medium' | 'long';
    preferredTags?: string[];
}

export interface ViewingHistoryItem {
    contentId: string;
    timestamp: number;
    watchedPercentage: number;
    completed: boolean;
    liked?: boolean;
}

export class RecommendationService {
    /**
     * Get recommended content based on user history and preferences
     * @param userId User ID
     * @param limit Number of recommendations to return
     * @returns Array of recommended content items
     */
    async getRecommendedContent(userId: string, limit: number = 10): Promise<ContentItem[]> {
        try {
            // Get user preferences and viewing history
            const preferences = await this.getUserPreferences(userId);
            const viewingHistory = await this.getUserViewingHistory(userId);
            const allContent = await this.getAllAvailableContent();

            // Filter out content the user has already watched
            const watchedContentIds = viewingHistory.filter(item => item.completed).map(item => item.contentId);
            const unwatchedContent = allContent.filter(content => !watchedContentIds.includes(content.id));

            // Score and sort content
            const scoredContent = this.scoreContent(unwatchedContent, preferences, viewingHistory);

            return scoredContent.slice(0, limit);
        } catch (error) {
            console.error('Error generating recommendations:', error);
            return [];
        }
    }

    /**
     * Get personalized recommendations with AI-enhanced descriptions
     */
    async getAIEnhancedRecommendations(userId: string, limit: number = 5): Promise<{
        content: ContentItem,
        personalization: string
    }[]> {
        const recommendations = await this.getRecommendedContent(userId, limit);
        const preferences = await this.getUserPreferences(userId);

        // Enhance each recommendation with personalized explanation
        const enhanced = await Promise.all(recommendations.map(async content => {
            try {
                let personalization = '';
                if (aiService) {
                    const prompt = `Based on user preferences ${JSON.stringify(preferences)},
          explain in 1-2 sentences why this content "${content.title}" (${content.description}) by creator ${content.creator}
          about ${content.category} would be interesting to the user. Keep it conversational and friendly.`;

                    personalization = await aiService.generateWithGemini(prompt, {
                        temperature: 0.7,
                        maxOutputTokens: 100
                    });
                } else {
                    personalization = `Content by ${content.creator} in the ${content.category} category.`;
                }

                return { content, personalization };
            } catch (error) {
                console.error('Error generating AI personalization:', error);
                return {
                    content,
                    personalization: `Recommended based on your interest in ${content.category}.`
                };
            }
        }));

        return enhanced;
    }

    /**
     * Score content based on user preferences and history
     * @param content Available content to score
     * @param preferences User preferences
     * @param history User viewing history
     * @returns Scored and sorted content items
     */
    private scoreContent(
        content: ContentItem[],
        preferences: UserPreferences,
        history: ViewingHistoryItem[]
    ): ContentItem[] {
        return content.map(item => {
            let score = 0;

            // Base score from content rating and popularity
            score += item.rating * 10;
            score += Math.log(Math.max(1, item.viewCount)) * 2;

            // Category preference
            if (preferences.favoriteCategories?.includes(item.category)) {
                score += 15;
            }

            // Creator preference
            if (preferences.favoriteCreators?.includes(item.creator)) {
                score += 20;
            }

            // Tag preference
            const matchingTags = item.tags.filter(tag =>
                preferences.preferredTags?.includes(tag)
            ).length;
            score += matchingTags * 5;

            // Price sensitivity (inverse relationship)
            if (preferences.priceSensitivity !== undefined) {
                // Higher price sensitivity means lower scores for expensive content
                score -= item.price / 1000 * preferences.priceSensitivity;
            }

            // Content duration preference
            if (preferences.contentDurationPreference) {
                const durationMatch = this.matchDurationPreference(
                    item.duration,
                    preferences.contentDurationPreference
                );
                score += durationMatch * 10;
            }

            // Collaborative filtering signals from similar users
            // In a real implementation, this would use data from users with similar tastes

            return {
                ...item,
                _score: score // Attach score for sorting
            };
        }).sort((a: any, b: any) => b._score - a._score)
            .map(({ _score, ...item }: any) => item); // Remove score before returning
    }

    /**
     * Match content duration to preference
     */
    private matchDurationPreference(duration: number, preference: string): number {
        // Convert duration to minutes
        const minutes = duration / 60;

        switch (preference) {
            case 'short':
                return minutes <= 10 ? 1 : minutes <= 20 ? 0.5 : 0;
            case 'medium':
                return minutes > 10 && minutes <= 30 ? 1 : minutes <= 45 ? 0.5 : 0;
            case 'long':
                return minutes > 30 ? 1 : minutes > 20 ? 0.5 : 0;
            default:
                return 0.5;
        }
    }

    /**
     * Get user preferences from profile or derive from behavior
     */
    private async getUserPreferences(userId: string): Promise<UserPreferences> {
        // This would typically come from a database or user settings
        // For demo purposes, we return mock preferences
        return {
            favoriteCategories: ['gaming', 'technology', 'science'],
            favoriteCreators: ['TechGuru', 'ScienceExplained', 'CryptoDaily'],
            priceSensitivity: 0.5,
            contentDurationPreference: 'medium',
            preferredTags: ['blockchain', 'tutorial', 'crypto', 'programming']
        };
    }

    /**
     * Get user viewing history
     */
    private async getUserViewingHistory(userId: string): Promise<ViewingHistoryItem[]> {
        // This would typically come from a user activity database
        // For demo purposes, we return mock viewing history
        return [
            {
                contentId: 'content-1',
                timestamp: Date.now() - 86400000, // 1 day ago
                watchedPercentage: 100,
                completed: true,
                liked: true
            },
            {
                contentId: 'content-2',
                timestamp: Date.now() - 172800000, // 2 days ago
                watchedPercentage: 75,
                completed: false
            },
            {
                contentId: 'content-3',
                timestamp: Date.now() - 259200000, // 3 days ago
                watchedPercentage: 100,
                completed: true,
                liked: true
            }
        ];
    }

    /**
     * Get all available content from the platform
     */
    private async getAllAvailableContent(): Promise<ContentItem[]> {
        // This would typically come from a content database
        // For demo purposes, we return mock content items
        return [
            {
                id: 'content-4',
                title: 'Web3 Development Tutorial',
                description: 'Learn how to build decentralized applications with Web3 technologies',
                creator: 'TechGuru',
                creatorAddress: '0x1234567890abcdef1234567890abcdef12345678',
                tags: ['blockchain', 'tutorial', 'programming', 'web3'],
                duration: 1800, // 30 minutes
                price: 40000, // 40k sats
                thumbnailUrl: '/thumbnails/web3-tutorial.jpg',
                createdAt: Date.now() - 604800000, // 1 week ago
                viewCount: 1250,
                rating: 4.8,
                category: 'technology'
            },
            {
                id: 'content-5',
                title: 'Bitcoin Mining Explained',
                description: 'Deep dive into the mechanics of Bitcoin mining and proof-of-work',
                creator: 'CryptoDaily',
                creatorAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
                tags: ['bitcoin', 'mining', 'crypto', 'blockchain'],
                duration: 1200, // 20 minutes
                price: 25000, // 25k sats
                thumbnailUrl: '/thumbnails/bitcoin-mining.jpg',
                createdAt: Date.now() - 1209600000, // 2 weeks ago
                viewCount: 3200,
                rating: 4.5,
                category: 'crypto'
            },
            {
                id: 'content-6',
                title: 'Quantum Computing and Blockchain',
                description: 'How quantum computing could impact blockchain security',
                creator: 'ScienceExplained',
                creatorAddress: '0x7890abcdef1234567890abcdef1234567890abcd',
                tags: ['quantum', 'blockchain', 'security', 'science'],
                duration: 2400, // 40 minutes
                price: 50000, // 50k sats
                thumbnailUrl: '/thumbnails/quantum-blockchain.jpg',
                createdAt: Date.now() - 2592000000, // 1 month ago
                viewCount: 980,
                rating: 4.7,
                category: 'science'
            },
            {
                id: 'content-7',
                title: 'Creating NFT Art',
                description: 'Step-by-step guide to creating and selling your NFT artwork',
                creator: 'CryptoArtist',
                creatorAddress: '0x2345678901abcdef2345678901abcdef23456789',
                tags: ['nft', 'art', 'crypto', 'tutorial'],
                duration: 1500, // 25 minutes
                price: 35000, // 35k sats
                thumbnailUrl: '/thumbnails/nft-art.jpg',
                createdAt: Date.now() - 1728000000, // 20 days ago
                viewCount: 2100,
                rating: 4.6,
                category: 'art'
            },
            {
                id: 'content-8',
                title: 'DeFi Investment Strategies',
                description: 'Advanced strategies for decentralized finance investments',
                creator: 'CryptoDaily',
                creatorAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
                tags: ['defi', 'finance', 'crypto', 'investment'],
                duration: 3000, // 50 minutes
                price: 60000, // 60k sats
                thumbnailUrl: '/thumbnails/defi-strategies.jpg',
                createdAt: Date.now() - 864000000, // 10 days ago
                viewCount: 1800,
                rating: 4.4,
                category: 'finance'
            }
        ];
    }
}

export const recommendationService = new RecommendationService();
export default recommendationService;
