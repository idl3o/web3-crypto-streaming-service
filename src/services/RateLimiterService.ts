export class RateLimiterService {
    private requests: Map<string, number[]> = new Map();
    private readonly windowMs: number;
    private readonly maxRequests: number;

    constructor(windowMs: number = 60000, maxRequests: number = 100) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
    }

    public isRateLimited(key: string): boolean {
        const now = Date.now();
        const timestamps = this.requests.get(key) || [];
        const windowStart = now - this.windowMs;
        
        // Clean old requests
        const validTimestamps = timestamps.filter(time => time > windowStart);
        this.requests.set(key, validTimestamps);

        if (validTimestamps.length >= this.maxRequests) {
            return true;
        }

        validTimestamps.push(now);
        return false;
    }
}
