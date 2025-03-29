import { TrainingModule } from '../training';

describe('TrainingModule', () => {
    let training: TrainingModule;
    const userId = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

    beforeEach(() => {
        training = new TrainingModule();
    });

    test('should start tutorial for new user', async () => {
        const firstStep = await training.startTutorial(userId);
        expect(firstStep.id).toBe('welcome');
        expect(firstStep.hints).toHaveLength(2);
    });

    test('should validate wallet connection', async () => {
        await training.startTutorial(userId);
        const result = await training.completeStep(userId, 'welcome', userId);
        expect(result.success).toBe(true);
        expect(result.nextStep?.id).toBe('energy_basics');
    });

    test('should track user progress', async () => {
        await training.startTutorial(userId);
        await training.completeStep(userId, 'welcome', userId);

        const progress = await training.getUserProgress(userId);
        expect(progress?.completedSteps.has('welcome')).toBe(true);
        expect(progress?.skillLevel).toBeGreaterThan(0);
    });

    test('should award completion rewards', async () => {
        await training.startTutorial(userId);

        // Complete all steps
        await training.completeStep(userId, 'welcome', userId);
        await training.completeStep(userId, 'energy_basics', { energyValue: 0.5 });
        const result = await training.completeStep(userId, 'dreamtime', 0.6);

        expect(result.reward).toBe('day1_mastery_badge');
    });
});
