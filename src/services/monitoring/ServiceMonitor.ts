export class ServiceMonitor {
    private metrics: Map<string, number> = new Map();
    
    trackLatency(operation: string, duration: number): void {
        const current = this.metrics.get(operation) || 0;
        this.metrics.set(operation, (current + duration) / 2);
    }
}