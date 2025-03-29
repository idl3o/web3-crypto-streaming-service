export interface PathwayNode {
    id: string;
    type: 'entry' | 'process' | 'decision' | 'exit';
    weight: number;
    connections: Set<string>;
    metadata: Map<string, any>;
}

export class PathwayRefiner {
    private nodes = new Map<string, PathwayNode>();
    private readonly decayFactor = 0.95;
    private readonly strengthenFactor = 1.1;

    addNode(type: PathwayNode['type'], metadata: Record<string, any> = {}): string {
        const id = crypto.randomUUID();
        this.nodes.set(id, {
            id,
            type,
            weight: 1.0,
            connections: new Set(),
            metadata: new Map(Object.entries(metadata))
        });
        return id;
    }

    connect(fromId: string, toId: string): void {
        const from = this.nodes.get(fromId);
        if (from) from.connections.add(toId);
    }

    traverse(startId: string): string[] {
        const path: string[] = [];
        let currentId = startId;

        while (currentId) {
            const node = this.nodes.get(currentId);
            if (!node || node.type === 'exit') break;

            path.push(currentId);
            this.strengthenPath(path);

            const connections = Array.from(node.connections);
            if (connections.length === 0) break;

            currentId = this.selectNext(connections);
        }

        this.decayUnusedPaths(path);
        return path;
    }

    private strengthenPath(path: string[]): void {
        path.forEach(id => {
            const node = this.nodes.get(id);
            if (node) {
                node.weight *= this.strengthenFactor;
                node.weight = Math.min(node.weight, 10);
            }
        });
    }

    private decayUnusedPaths(usedPath: string[]): void {
        this.nodes.forEach((node, id) => {
            if (!usedPath.includes(id)) {
                node.weight *= this.decayFactor;
                node.weight = Math.max(node.weight, 0.1);
            }
        });
    }

    private selectNext(connections: string[]): string {
        const weights = connections.map(id => this.nodes.get(id)?.weight || 0);
        const total = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * total;

        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) return connections[i];
        }

        return connections[connections.length - 1];
    }
}
