import { ASCIIAnimator } from '../ascii-animation';

describe('ASCIIAnimator', () => {
    let animator: ASCIIAnimator;

    beforeEach(() => {
        animator = new ASCIIAnimator();
    });

    test('should add single frame', async () => {
        const frameIndex = await animator.addFrame({
            content: '▓░▒',
            duration: 100
        });
        expect(frameIndex).toBe(0);
    });

    test('should generate transition frames', () => {
        const from = '█▀▄';
        const to = '▄▀█';
        const frames = ASCIIAnimator.generateTransition(from, to, 2);
        expect(frames).toHaveLength(3);
        expect(frames[0].content).toBe(from);
        expect(frames[frames.length - 1].content).toBe(to);
    });

    test('should control animation playback', async () => {
        let frameCount = 0;
        await animator.addSequence([
            { content: '█', duration: 100 },
            { content: '▀', duration: 100 },
            { content: '▄', duration: 100 }
        ]);

        await animator.play(frame => {
            frameCount++;
            expect(frame.content).toBeDefined();
        });

        animator.pause();
        expect(frameCount).toBeGreaterThan(0);
    });
});
