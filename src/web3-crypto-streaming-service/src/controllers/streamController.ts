export class StreamController {
    private streams: Map<string, any>;

    constructor() {
        this.streams = new Map();
    }

    createStream(streamId: string, streamData: any): string {
        if (this.streams.has(streamId)) {
            throw new Error('Stream already exists');
        }
        this.streams.set(streamId, streamData);
        return `Stream ${streamId} created successfully.`;
    }

    getStreamStatus(streamId: string): string {
        if (!this.streams.has(streamId)) {
            throw new Error('Stream not found');
        }
        return `Stream ${streamId} is active.`;
    }
}