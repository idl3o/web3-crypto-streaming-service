export class AppModel {
    private cryptoPrices: Map<string, number> = new Map();
    private priceHistory: Map<string, number[]> = new Map();
    private socialSentiment: Map<string, number> = new Map();
    private recentTweets: Map<string, any[]> = new Map();

    updateCryptoPrice(symbol: string, price: number): void {
        this.cryptoPrices.set(symbol, price);
        if (!this.priceHistory.has(symbol)) {
            this.priceHistory.set(symbol, []);
        }
        this.priceHistory.get(symbol)?.push(price);
        // Keep last 100 price points
        if (this.priceHistory.get(symbol)!.length > 100) {
            this.priceHistory.get(symbol)?.shift();
        }
    }

    updateSocialData(symbol: string, data: any): void {
        if (!this.recentTweets.has(symbol)) {
            this.recentTweets.set(symbol, []);
        }
        this.recentTweets.get(symbol)?.unshift(data);
        this.recentTweets.get(symbol)?.splice(10); // Keep last 10 tweets

        // Update sentiment
        const sentiment = this.recentTweets.get(symbol)
            ?.reduce((acc, tweet) => acc + tweet.sentiment, 0) || 0;
        this.socialSentiment.set(symbol, sentiment);
    }

    getCryptoPrices(): Map<string, number> {
        return new Map(this.cryptoPrices);
    }

    getPriceHistory(symbol: string): number[] {
        return [...(this.priceHistory.get(symbol) || [])];
    }

    getSocialSentiment(symbol: string): number {
        return this.socialSentiment.get(symbol) || 0;
    }

    getRecentTweets(symbol: string): any[] {
        return this.recentTweets.get(symbol) || [];
    }
}
