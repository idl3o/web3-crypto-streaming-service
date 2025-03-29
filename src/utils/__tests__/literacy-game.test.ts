import { LiteracyGame } from '../literacy-game';

describe('LiteracyGame', () => {
    let game: LiteracyGame;

    beforeEach(() => {
        game = new LiteracyGame();
    });

    test('should create new learner', async () => {
        const learner = await game.createLearner(0.3);
        expect(learner.tier).toBe('beginner');
        expect(learner.skills.has('basic_reading')).toBe(true);
    });

    test('should generate appropriate quest', async () => {
        const learner = await game.createLearner(0.6);
        const quest = await game.generateQuest(learner.id);
        expect(quest.type).toBe('writing');
        expect(quest.difficulty).toBeGreaterThan(0.6);
    });

    test('should evolve through quest completion', async () => {
        const learner = await game.createLearner(0.65);
        const quest = await game.generateQuest(learner.id);
        const result = await game.completeQuest(learner.id, quest.id);

        expect(result.success).toBe(true);
        const metrics = await game.getLearnerMetrics(learner.id);
        expect(metrics.consciousness).toBeGreaterThan(0.65);
    });

    test('should unlock new skills at consciousness thresholds', async () => {
        const learner = await game.createLearner(0.8);
        const quest = await game.generateQuest(learner.id);
        const result = await game.completeQuest(learner.id, quest.id);

        expect(result.evolution?.unlockedSkills).toBeDefined();
        expect(result.evolution?.unlockedSkills.length).toBeGreaterThan(0);
    });
});
