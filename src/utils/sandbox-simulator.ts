export interface SandboxMetrics {
    contractCalls: number;
    activeUsers: number;
    pendingTransactions: number;
    gasUsage: number;
    timestamp: number;
    progressUpdates: Array<{
        task: string;
        status: 'pending' | 'in-progress' | 'complete';
        completion: number;
        lastUpdate: number;
    }>;
}

export class SandboxSimulator {
    private metrics: SandboxMetrics;
    private interval: NodeJS.Timer | null = null;

    constructor() {
        this.metrics = {
            contractCalls: 0,
            activeUsers: 0,
            pendingTransactions: 0,
            gasUsage: 0,
            timestamp: Date.now(),
            progressUpdates: [
                { task: 'Smart Contract Development', status: 'in-progress', completion: 65, lastUpdate: Date.now() },
                { task: 'Frontend Integration', status: 'in-progress', completion: 40, lastUpdate: Date.now() },
                { task: 'Testing Suite', status: 'pending', completion: 25, lastUpdate: Date.now() },
                { task: 'Documentation', status: 'in-progress', completion: 50, lastUpdate: Date.now() }
            ]
        };
    }

    start() {
        this.interval = setInterval(() => this.updateMetrics(), 2000);
    }

    stop() {
        if (this.interval) clearInterval(this.interval);
    }

    private updateMetrics() {
        const prevMetrics = { ...this.metrics };
        this.metrics = {
            contractCalls: this.smoothUpdate(prevMetrics.contractCalls, 100),
            activeUsers: this.smoothUpdate(prevMetrics.activeUsers, 50),
            pendingTransactions: this.smoothUpdate(prevMetrics.pendingTransactions, 25),
            gasUsage: this.smoothUpdate(prevMetrics.gasUsage, 1000000),
            timestamp: Date.now(),
            progressUpdates: this.updateProgress(prevMetrics.progressUpdates)
        };
        this.broadcast();
    }

    private smoothUpdate(prev: number, max: number): number {
        const change = Math.random() * 0.3 - 0.15; // -15% to +15%
        const newValue = prev * (1 + change);
        return Math.min(Math.max(Math.floor(newValue), 0), max);
    }

    private updateProgress(updates: SandboxMetrics['progressUpdates']) {
        return updates.map(update => {
            if (update.status === 'complete') return update;

            const progressChange = Math.random() * 2;
            const newCompletion = Math.min(update.completion + progressChange, 100);

            return {
                ...update,
                completion: newCompletion,
                status: newCompletion >= 100 ? 'complete' : update.status,
                lastUpdate: Date.now()
            };
        });
    }

    private broadcast() {
        window.postMessage({
            type: 'SANDBOX_UPDATE',
            payload: this.metrics
        }, '*');
    }
}
