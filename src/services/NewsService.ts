/**
 * News Service
 * Provides access to cryptocurrency news from various sources
 */

export interface NewsArticle {
    id: string;
    title: string;
    description: string;
    url: string;
    source: string;
    image?: string;
    publishedAt: string;
    category?: string;
    tags?: string[];
}

export interface NewsSource {
    id: string;
    name: string;
    enabled: boolean;
}

export class NewsService {
    private rapidApiKey: string;
    private rapidApiHost: string = 'cryptocurrency-news2.p.rapidapi.com';
    private lastFetchTime: Record<string, number> = {};
    private cacheExpiration: number = 30 * 60 * 1000; // 30 minutes
    private cachedNews: Record<string, NewsArticle[]> = {};

    constructor(apiKey: string = '') {
        this.rapidApiKey = apiKey || import.meta.env.VITE_RAPIDAPI_KEY || '';

        if (!this.rapidApiKey) {
            console.warn('NewsService: No RapidAPI key provided. Set VITE_RAPIDAPI_KEY in .env file.');
        }
    }

    /**
     * Set the RapidAPI key
     */
    public setApiKey(apiKey: string): void {
        this.rapidApiKey = apiKey;
    }

    /**
     * Get cryptocurrency news from CryptoDaily
     * @param forceRefresh Whether to bypass the cache
     * @returns Array of news articles
     */
    public async getCryptoDailyNews(forceRefresh: boolean = false): Promise<NewsArticle[]> {
        const sourceId = 'cryptodaily';

        // Check cache first
        if (!forceRefresh &&
            this.cachedNews[sourceId] &&
            this.lastFetchTime[sourceId] &&
            Date.now() - this.lastFetchTime[sourceId] < this.cacheExpiration) {
            return this.cachedNews[sourceId];
        }

        if (!this.rapidApiKey) {
            throw new Error('RapidAPI key is not configured');
        }

        try {
            const response = await fetch('https://cryptocurrency-news2.p.rapidapi.com/v1/cryptodaily', {
                method: 'GET',
                headers: {
                    'x-rapidapi-host': this.rapidApiHost,
                    'x-rapidapi-key': this.rapidApiKey
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch news: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Process and format the news data
            const articles: NewsArticle[] = this.formatCryptoDailyNews(data);

            // Update cache
            this.cachedNews[sourceId] = articles;
            this.lastFetchTime[sourceId] = Date.now();

            return articles;
        } catch (error) {
            console.error('Error fetching crypto news:', error);

            // Return cached data if available, otherwise an empty array
            return this.cachedNews[sourceId] || [];
        }
    }

    /**
     * Get news from multiple sources
     * @param sources Array of source IDs to fetch from
     * @returns Object with news by source
     */
    public async getMultiSourceNews(sources: string[] = ['cryptodaily']): Promise<Record<string, NewsArticle[]>> {
        const result: Record<string, NewsArticle[]> = {};

        // Use Promise.all for parallel fetching
        await Promise.all(
            sources.map(async (source) => {
                try {
                    if (source === 'cryptodaily') {
                        result[source] = await this.getCryptoDailyNews();
                    }
                    // Add more sources when available
                } catch (error) {
                    console.error(`Error fetching news from ${source}:`, error);
                    result[source] = [];
                }
            })
        );

        return result;
    }

    /**
     * Format CryptoDaily news data into standard format
     * @private
     */
    private formatCryptoDailyNews(data: any): NewsArticle[] {
        if (!data || !data.data) {
            return [];
        }

        try {
            return data.data.map((article: any, index: number) => ({
                id: article.id || `cryptodaily-${index}`,
                title: article.title || 'No title',
                description: article.description || '',
                url: article.url || '',
                source: 'CryptoDaily',
                image: article.thumbnail || '',
                publishedAt: article.createdAt || new Date().toISOString(),
                category: 'cryptocurrency',
                tags: article.tags || []
            }));
        } catch (error) {
            console.error('Error formatting CryptoDaily news:', error);
            return [];
        }
    }

    /**
     * Get available news sources
     */
    public getAvailableNewsSources(): NewsSource[] {
        return [
            {
                id: 'cryptodaily',
                name: 'CryptoDaily',
                enabled: true
            }
            // Additional sources can be added here
        ];
    }

    /**
     * Clear news cache
     */
    public clearCache(): void {
        this.cachedNews = {};
        this.lastFetchTime = {};
    }
}

// Create singleton instance
export const newsService = new NewsService();
export default newsService;
