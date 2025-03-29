import { TwitterApi } from 'twitter-api-v2';

export class SocialMediaService {
    private twitterClient: TwitterApi;
    private streams: Map<string, any> = new Map();
    private listeners: Map<string, Function[]> = new Map();

    constructor(private apiKey: string) {
        this.twitterClient = new TwitterApi(apiKey);
    }

    async startTwitterStream(keywords: string[]): Promise<void> {
        try {
            const stream = await this.twitterClient.v2.searchStream({
                'tweet.fields': ['created_at', 'public_metrics'],
                expansions: ['author_id'],
                rules: keywords.map(keyword => ({ value: keyword }))
            });

            stream.on('data', tweet => this.processTweet(tweet));
            this.streams.set('twitter', stream);
        } catch (error) {
            console.error('Twitter stream error:', error);
        }
    }

    public addListener(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)?.push(callback);
    }

    private notifyListeners(event: string, data: any): void {
        this.listeners.get(event)?.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Listener error:', error);
            }
        });
    }

    public async reconnect(): Promise<void> {
        try {
            // Close existing streams
            for (const [_, stream] of this.streams) {
                await stream.close();
            }
            this.streams.clear();
            
            // Reinitialize streams
            await this.startTwitterStream(config.social.twitter.keywords);
        } catch (error) {
            throw new Error(`Failed to reconnect: ${error.message}`);
        }
    }

    private processTweet(tweet: any): void {
        const sentiment = this.analyzeSentiment(tweet.text);
        this.notifyListeners('twitter', {
            text: tweet.text,
            sentiment,
            metrics: tweet.public_metrics,
            timestamp: tweet.created_at
        });
    }

    private analyzeSentiment(text: string): number {
        // Basic sentiment analysis (replace with more sophisticated solution)
        const positive = ['bullish', 'up', 'gain', 'profit', 'moon'];
        const negative = ['bearish', 'down', 'loss', 'crash', 'dump'];
        
        let score = 0;
        positive.forEach(word => {
            if (text.toLowerCase().includes(word)) score += 1;
        });
        negative.forEach(word => {
            if (text.toLowerCase().includes(word)) score -= 1;
        });
        return score;
    }
}
