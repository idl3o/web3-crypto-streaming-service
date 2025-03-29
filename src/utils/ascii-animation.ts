export interface AnimationFrame {
    content: string;
    duration: number;  // milliseconds
    metadata?: {
        name?: string;
        tags?: string[];
        effects?: string[];
    };
}

export class ASCIIAnimator {
    private frames: AnimationFrame[] = [];
    private currentFrame = 0;
    private isPlaying = false;
    private interval: NodeJS.Timeout | null = null;

    async addFrame(frame: AnimationFrame): Promise<number> {
        this.frames.push(frame);
        return this.frames.length - 1;
    }

    async addSequence(frames: AnimationFrame[]): Promise<void> {
        this.frames.push(...frames);
    }

    async play(onFrame?: (frame: AnimationFrame) => void, onError?: (error: Error) => void): Promise<void> {
        this.isPlaying = true;
        this.interval = setInterval(() => {
            try {
                if (!this.isPlaying) return;
                if (this.currentFrame >= this.frames.length) {
                    this.pause();
                    return;
                }
                const frame = this.frames[this.currentFrame];
                if (!frame) throw new Error('Invalid frame');
                if (onFrame) onFrame(frame);
                this.currentFrame = (this.currentFrame + 1) % this.frames.length;
            } catch (error) {
                this.pause();
                if (onError) onError(error as Error);
            }
        }, this.frames[this.currentFrame]?.duration || 100);
    }

    pause(): void {
        this.isPlaying = false;
        if (this.interval) clearInterval(this.interval);
    }

    cleanup(): void {
        this.pause();
        this.frames = [];
        this.currentFrame = 0;
    }

    async exportGIF(filename: string): Promise<void> {
        // Simulated GIF export
        console.log(`Exporting animation to ${filename}`);
        console.log(`Total frames: ${this.frames.length}`);
        console.log('Animation preview:');
        this.frames.forEach((frame, i) => {
            console.log(`\nFrame ${i + 1}:`);
            console.log(frame.content);
        });
    }

    static generateTransition(from: string, to: string, steps: number): AnimationFrame[] {
        const frames: AnimationFrame[] = [];
        const lines1 = from.split('\n');
        const lines2 = to.split('\n');

        for (let step = 0; step <= steps; step++) {
            const progress = step / steps;
            const interpolated = lines1.map((line1, i) => {
                const line2 = lines2[i] || '';
                return ASCIIAnimator.interpolateLine(line1, line2, progress);
            });

            frames.push({
                content: interpolated.join('\n'),
                duration: 100,
                metadata: {
                    name: `transition_${step}`,
                    effects: ['fade', 'interpolate']
                }
            });
        }

        return frames;
    }

    private static interpolateLine(line1: string, line2: string, progress: number): string {
        const maxLength = Math.max(line1.length, line2.length);
        let result = '';

        for (let i = 0; i < maxLength; i++) {
            const char1 = line1[i] || ' ';
            const char2 = line2[i] || ' ';

            if (progress < 0.5) {
                result += char1;
            } else {
                result += char2;
            }
        }

        return result;
    }
}
