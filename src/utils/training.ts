import { ethers } from 'ethers';

export interface TutorialStep {
    id: string;
    title: string;
    description: string;
    task: string;
    hints: string[];
    validation: (input: unknown) => Promise<boolean>;
}

export interface UserProgress {
    userId: string;
    completedSteps: Set<string>;
    skillLevel: number;
    questHistory: Map<string, boolean>;
    energyMastery: number;
}

export class TrainingModule {
    private tutorials: Map<string, TutorialStep[]> = new Map();
    private userProgress: Map<string, UserProgress> = new Map();

    constructor() {
        this.initializeTutorials();
    }

    private initializeTutorials(): void {
        // Day 1 Basics Tutorial
        this.tutorials.set('day1', [
            {
                id: 'welcome',
                title: 'Welcome to the Web3 Evolution',
                description: 'Learn about energy-based blockchain systems',
                task: 'Connect your wallet to begin',
                hints: ['Install MetaMask', 'Create new wallet'],
                validation: async (address) => ethers.utils.isAddress(address as string)
            },
            {
                id: 'energy_basics',
                title: 'Understanding Energy Tokens',
                description: 'Learn about Proof of Energy (PoE)',
                task: 'Generate your first energy token',
                hints: ['Solar efficiency > 0.3', 'Check energy threshold'],
                validation: async (token) => Boolean(token && (token as any).energyValue > 0)
            },
            {
                id: 'dreamtime',
                title: 'Connecting to Dreamtime',
                description: 'Experience ancestral wisdom integration',
                task: 'Achieve spiritual resonance',
                hints: ['Observe moon phases', 'Feel the resonance'],
                validation: async (resonance) => (resonance as number) > 0.5
            }
        ]);
    }

    async startTutorial(userId: string): Promise<TutorialStep> {
        const progress: UserProgress = {
            userId,
            completedSteps: new Set(),
            skillLevel: 0,
            questHistory: new Map(),
            energyMastery: 0
        };
        this.userProgress.set(userId, progress);

        const day1Steps = this.tutorials.get('day1') || [];
        return day1Steps[0];
    }

    async completeStep(userId: string, stepId: string, submission: unknown): Promise<{
        success: boolean;
        nextStep?: TutorialStep;
        reward?: string;
    }> {
        const progress = this.userProgress.get(userId);
        if (!progress) throw new Error('User not found');

        const day1Steps = this.tutorials.get('day1') || [];
        const currentStep = day1Steps.find(step => step.id === stepId);
        if (!currentStep) throw new Error('Step not found');

        const isValid = await currentStep.validation(submission);
        if (isValid) {
            progress.completedSteps.add(stepId);
            progress.skillLevel += 1;
            progress.energyMastery += 0.1;

            const currentIndex = day1Steps.findIndex(step => step.id === stepId);
            const nextStep = day1Steps[currentIndex + 1];

            return {
                success: true,
                nextStep,
                reward: this.calculateReward(progress)
            };
        }

        return { success: false };
    }

    private calculateReward(progress: UserProgress): string {
        if (progress.completedSteps.size >= 3) {
            return 'day1_mastery_badge';
        }
        return 'energy_token_boost';
    }

    async getUserProgress(userId: string): Promise<UserProgress | null> {
        return this.userProgress.get(userId) || null;
    }
}
