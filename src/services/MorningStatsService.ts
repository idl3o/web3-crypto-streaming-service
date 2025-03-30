/**
 * Morning Stats Service
 * Provides blockchain-related morning statistics for the GM greeting
 */

export interface MorningStats {
    timestamp: number;
    bitcoin: {
        price: number;
        change24h: number;
        volume24h: number;
    };
    ethereum: {
        price: number;
        change24h: number;
        volume24h: number;
    };
    totalMarketCap: number;
    marketCapChange24h: number;
    latestBlock: number;
    gasPrice: number;
    dailyInsight: string;
}

class MorningStatsService {
    private apiUrl = 'https://api.coingecko.com/api/v3';
    private cachedStats: MorningStats | null = null;
    private lastFetchTime: number = 0;
    private cacheValidityMs: number = 5 * 60 * 1000; // 5 minutes

    /**
     * Get morning cryptocurrency and blockchain stats
     */
    async getMorningStats(): Promise<MorningStats> {
        // Return cached data if it's still valid
        if (this.cachedStats && Date.now() - this.lastFetchTime < this.cacheValidityMs) {
            return this.cachedStats;
        }

        try {
            const stats = await this.fetchRealStatsFromAPI();
            this.cachedStats = stats;
            this.lastFetchTime = Date.now();
            return stats;
        } catch (error) {
            console.error('Failed to fetch morning stats:', error);
            // Return mock data if API call fails
            return this.getMockStats();
        }
    }

    /**
     * Fetch real stats from external API
     */
    private async fetchRealStatsFromAPI(): Promise<MorningStats> {
        try {
            // Fetch Bitcoin and Ethereum data
            const response = await fetch(
                `${this.apiUrl}/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`
            );

            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            const data = await response.json();

            // Fetch global market data
            const globalResponse = await fetch(`${this.apiUrl}/global`);
            const globalData = await globalResponse.json();

            // Get gas price (this would typically come from an Ethereum node)
            const gasPrice = Math.floor(Math.random() * 50) + 30; // Mock gas price between 30-80 gwei

            // Get latest block (also would come from an Ethereum node)
            const latestBlock = 18000000 + Math.floor(Math.random() * 10000);

            return {
                timestamp: Date.now(),
                bitcoin: {
                    price: data.bitcoin.usd || 0,
                    change24h: data.bitcoin.usd_24h_change || 0,
                    volume24h: data.bitcoin.usd_24h_vol || 0
                },
                ethereum: {
                    price: data.ethereum.usd || 0,
                    change24h: data.ethereum.usd_24h_change || 0,
                    volume24h: data.ethereum.usd_24h_vol || 0
                },
                totalMarketCap: globalData.data?.total_market_cap?.usd || 0,
                marketCapChange24h: globalData.data?.market_cap_change_percentage_24h_usd || 0,
                latestBlock,
                gasPrice,
                dailyInsight: this.getRandomInsight()
            };
        } catch (error) {
            console.error('Error fetching crypto stats:', error);
            throw error;
        }
    }

    /**
     * Get mock stats when API is unavailable
     */
    private getMockStats(): MorningStats {
        // Generate slightly different numbers each time
        const btcPrice = 55000 + Math.floor(Math.random() * 5000);
        const ethPrice = 3000 + Math.floor(Math.random() * 500);
        const btcChange = (Math.random() * 6) - 3; // -3% to +3%
        const ethChange = (Math.random() * 8) - 4; // -4% to +4%

        return {
            timestamp: Date.now(),
            bitcoin: {
                price: btcPrice,
                change24h: btcChange,
                volume24h: 30000000000
            },
            ethereum: {
                price: ethPrice,
                change24h: ethChange,
                volume24h: 15000000000
            },
            totalMarketCap: 2500000000000, // $2.5T
            marketCapChange24h: (Math.random() * 4) - 2, // -2% to +2%
            latestBlock: 18005000 + Math.floor(Math.random() * 1000),
            gasPrice: Math.floor(Math.random() * 50) + 30, // 30-80 gwei
            dailyInsight: this.getRandomInsight()
        };
    }

    /**
     * Get a random insight for the day
     */
    private getRandomInsight(): string {
        const insights = [
            "Build in the bear, thrive in the bull.",
            "Focus on fundamentals, not just price action.",
            "The best Web3 projects solve real problems.",
            "Decentralization is a journey, not a destination.",
            "Not your keys, not your crypto.",
            "Don't trust, verify.",
            "Blockchain is a team sport.",
            "The next bull run is built during the bear market.",
            "Web3 is about ownership, not just speculation.",
            "Community > Technology > Token price."
        ];

        return insights[Math.floor(Math.random() * insights.length)];
    }
}

export const morningStatsService = new MorningStatsService();
export default morningStatsService;
