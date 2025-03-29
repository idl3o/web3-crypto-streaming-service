import { EventEmitter } from 'events';

interface StreamStats {
    bandwidthUsed: number;
    packetsTransmitted: number;
    activeViewers: number;
    bufferHealth: number;
    errors: string[];
    timestamp: number;
}

class ServerFarm extends EventEmitter {
    private stats: Map<string, StreamStats>;
    private interval: NodeJS.Timeout | null = null;

    constructor() {
        super();
        this.stats = new Map();
    }

    public observeStream(streamId: string): void {
        if (!this.stats.has(streamId)) {
            // Initialize stats for new stream
            this.stats.set(streamId, {
                bandwidthUsed: 0,
                packetsTransmitted: 0,
                activeViewers: Math.floor(Math.random() * 100),
                bufferHealth: 100,
                errors: [],
                timestamp: Date.now()
            });

            // Start simulating if this is the first stream
            if (!this.interval) {
                this.startSimulation();
            }
        }

        // Update existing stream stats and emit metrics
        const currentStats = this.stats.get(streamId);
        if (currentStats) {
            // Simulate some changes in stats
            currentStats.bandwidthUsed += Math.random() * 1000;
            currentStats.packetsTransmitted += Math.floor(Math.random() * 50);
            currentStats.activeViewers = Math.max(0, currentStats.activeViewers + (Math.random() > 0.5 ? 1 : -1));
            currentStats.bufferHealth = Math.min(100, Math.max(0, currentStats.bufferHealth + (Math.random() > 0.7 ? 5 : -5)));
            currentStats.timestamp = Date.now();

            // Random error simulation (10% chance)
            if (Math.random() < 0.1 && currentStats.errors.length < 5) {
                currentStats.errors.push(`Minor buffer issue at ${new Date().toISOString()}`);
            }

            this.stats.set(streamId, currentStats);
            this.emit('metrics', { streamId, ...currentStats });
        }
    }

    private startSimulation(): void {
        // Periodically emit all stats
        this.interval = setInterval(() => {
            for (const [streamId, stats] of this.stats.entries()) {
                this.emit('metrics', { streamId, ...stats });
            }
        }, 5000);
    }

    public stopSimulation(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

// Singleton instance
export const farm = new ServerFarm();
