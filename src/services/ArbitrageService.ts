/**
 * Arbitrage Service
 * Fetches crypto arbitrage opportunities across different exchanges
 */

export interface ArbitrageOpportunity {
    id: string;
    pair: string;
    buyExchange: string;
    sellExchange: string;
    buyPrice: number;
    sellPrice: number;
    priceDiff: number;
    profitPercent: number;
    timestamp: number;
}

export interface ArbitrageFilter {
    minProfitPercent?: number;
    maxProfitPercent?: number;
    exchanges?: string[];
    pairs?: string[];
}

export class ArbitrageService {
    private rapidApiKey: string;
    private rapidApiHost: string = 'crypto-arbitrage3.p.rapidapi.com';
    private lastFetchTime: Record<string, number> = {};
    private cacheExpiration: number = 5 * 60 * 1000; // 5 minutes
    private cachedOpportunities: Record<string, ArbitrageOpportunity[]> = {};

    constructor(apiKey: string = '') {
        this.rapidApiKey = apiKey || import.meta.env.VITE_RAPIDAPI_KEY || '';

        if (!this.rapidApiKey) {
            console.warn('ArbitrageService: No RapidAPI key provided. Set VITE_RAPIDAPI_KEY in .env file.');
        }
    }

    /**
     * Set the RapidAPI key
     */
    public setApiKey(apiKey: string): void {
        this.rapidApiKey = apiKey;
    }

    /**
     * Get arbitrage opportunities for a specific keyword/exchange
     * @param keyword Exchange keyword (e.g., 'binance', 'kraken')
     * @param forceRefresh Whether to bypass cache
     * @returns Array of arbitrage opportunities
     */
    public async getArbitrageOpportunities(keyword: string = 'binance', forceRefresh: boolean = false): Promise<ArbitrageOpportunity[]> {
        const cacheKey = `arbitrage_${keyword}`;

        // Check cache first
        if (!forceRefresh &&
            this.cachedOpportunities[cacheKey] &&
            this.lastFetchTime[cacheKey] &&
            Date.now() - this.lastFetchTime[cacheKey] < this.cacheExpiration) {
            return this.cachedOpportunities[cacheKey];
        }

        if (!this.rapidApiKey) {
            throw new Error('RapidAPI key is not configured');
        }

        try {
            const response = await fetch(`https://crypto-arbitrage3.p.rapidapi.com/arbitrage?keyword=${encodeURIComponent(keyword)}`, {
                method: 'GET',
                headers: {
                    'x-rapidapi-host': this.rapidApiHost,
                    'x-rapidapi-key': this.rapidApiKey
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch arbitrage data: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Process and format the arbitrage data
            const opportunities: ArbitrageOpportunity[] = this.formatArbitrageData(data);

            // Update cache
            this.cachedOpportunities[cacheKey] = opportunities;
            this.lastFetchTime[cacheKey] = Date.now();

            return opportunities;
        } catch (error) {
            console.error('Error fetching arbitrage opportunities:', error);

            // Return cached data if available, otherwise an empty array
            return this.cachedOpportunities[cacheKey] || [];
        }
    }

    /**
     * Format raw arbitrage data into standardized format
     * @private
     */
    private formatArbitrageData(data: any): ArbitrageOpportunity[] {
        if (!data || !Array.isArray(data.data)) {
            return [];
        }

        try {
            return data.data.map((item: any, index: number) => ({
                id: `arb-${Date.now()}-${index}`,
                pair: item.pair || 'Unknown Pair',
                buyExchange: item.buy_exchange || 'Unknown Exchange',
                sellExchange: item.sell_exchange || 'Unknown Exchange',
                buyPrice: parseFloat(item.buy_price) || 0,
                sellPrice: parseFloat(item.sell_price) || 0,
                priceDiff: parseFloat(item.price_diff) || 0,
                profitPercent: parseFloat(item.profit_percent) || 0,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Error formatting arbitrage data:', error);
            return [];
        }
    }

    /**
     * Filter arbitrage opportunities
     * @param opportunities List of opportunities
     * @param filter Filter criteria
     */
    public filterOpportunities(
        opportunities: ArbitrageOpportunity[],
        filter: ArbitrageFilter = {}
    ): ArbitrageOpportunity[] {
        return opportunities.filter(opp => {
            // Filter by profit percentage
            if (filter.minProfitPercent !== undefined && opp.profitPercent < filter.minProfitPercent) {
                return false;
            }

            if (filter.maxProfitPercent !== undefined && opp.profitPercent > filter.maxProfitPercent) {
                return false;
            }

            // Filter by exchanges
            if (filter.exchanges && filter.exchanges.length > 0) {
                const matchesBuyExchange = filter.exchanges.includes(opp.buyExchange);
                const matchesSellExchange = filter.exchanges.includes(opp.sellExchange);

                if (!matchesBuyExchange && !matchesSellExchange) {
                    return false;
                }
            }

            // Filter by pairs
            if (filter.pairs && filter.pairs.length > 0) {
                if (!filter.pairs.includes(opp.pair)) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Get supported exchanges
     */
    public async getSupportedExchanges(): Promise<string[]> {
        // Get a sample of arbitrage data to extract exchanges
        try {
            const opportunities = await this.getArbitrageOpportunities();

            // Extract unique exchanges
            const exchanges = new Set<string>();
            opportunities.forEach(opp => {
                exchanges.add(opp.buyExchange);
                exchanges.add(opp.sellExchange);
            });

            return Array.from(exchanges).filter(exchange => exchange !== 'Unknown Exchange');
        } catch (error) {
            console.error('Error getting supported exchanges:', error);
            return [];
        }
    }

    /**
     * Get supported trading pairs
     */
    public async getSupportedPairs(): Promise<string[]> {
        // Get a sample of arbitrage data to extract pairs
        try {
            const opportunities = await this.getArbitrageOpportunities();

            // Extract unique pairs
            const pairs = new Set<string>();
            opportunities.forEach(opp => {
                pairs.add(opp.pair);
            });

            return Array.from(pairs).filter(pair => pair !== 'Unknown Pair');
        } catch (error) {
            console.error('Error getting supported pairs:', error);
            return [];
        }
    }

    /**
     * Clear arbitrage cache
     */
    public clearCache(): void {
        this.cachedOpportunities = {};
        this.lastFetchTime = {};
    }
}

// Create singleton instance
export const arbitrageService = new ArbitrageService();
export default arbitrageService;
