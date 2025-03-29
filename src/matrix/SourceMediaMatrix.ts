import { EventEmitter } from 'events';

interface MatrixNode {
    id: string;
    type: 'source' | 'processor' | 'output';
    connections: Set<string>;
    metadata: any;
}

interface MediaStream {
    id: string;
    type: string;
    data: Buffer;
    timestamp: number;
    source: string;
}

export class SourceMediaMatrix extends EventEmitter {
    private nodes: Map<string, MatrixNode> = new Map();
    private streams: Map<string, MediaStream> = new Map();
    private activeProcesses: Set<string> = new Set();
    private readonly maxNodes: number = 100;

    constructor() {
        super();
        this.initializeMatrix();
    }

    private initializeMatrix(): void {
        // Create root node
        this.addNode('matrix_root', 'source', {
            description: 'Matrix control node',
            createdAt: Date.now()
        });
    }

    public injectSource(sourceId: string, mediaType: string, data: Buffer): void {
        const stream: MediaStream = {
            id: `stream_${Date.now()}`,
            type: mediaType,
            data,
            timestamp: Date.now(),
            source: sourceId
        };

        this.streams.set(stream.id, stream);
        this.emit('sourceInjected', { sourceId, streamId: stream.id });
        this.processStream(stream);
    }

    private async processStream(stream: MediaStream): Promise<void> {
        if (this.activeProcesses.size >= this.maxNodes) {
            await this.optimizeMatrix();
        }

        this.activeProcesses.add(stream.id);
        try {
            const processors = this.getProcessorNodes();
            for (const processor of processors) {
                await this.routeStreamToProcessor(stream, processor);
            }
        } finally {
            this.activeProcesses.delete(stream.id);
        }
    }

    private async routeStreamToProcessor(stream: MediaStream, processor: MatrixNode): Promise<void> {
        const node = this.nodes.get(processor.id);
        if (!node) return;

        this.emit('processing', {
            streamId: stream.id,
            processorId: processor.id
        });

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    private getProcessorNodes(): MatrixNode[] {
        return Array.from(this.nodes.values())
            .filter(node => node.type === 'processor');
    }

    public addNode(id: string, type: 'source' | 'processor' | 'output', metadata: any): void {
        const node: MatrixNode = {
            id,
            type,
            connections: new Set(),
            metadata
        };
        this.nodes.set(id, node);
    }

    private async optimizeMatrix(): Promise<void> {
        const oldestStreamId = Array.from(this.streams.keys())[0];
        if (oldestStreamId) {
            this.streams.delete(oldestStreamId);
        }

        this.emit('matrixOptimized', {
            activeStreams: this.streams.size,
            activeProcesses: this.activeProcesses.size
        });
    }

    public getMatrixStatus(): object {
        return {
            nodes: this.nodes.size,
            streams: this.streams.size,
            activeProcesses: this.activeProcesses.size,
            maxNodes: this.maxNodes
        };
    }
}
