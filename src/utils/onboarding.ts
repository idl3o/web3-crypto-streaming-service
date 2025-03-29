export interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    isCompleted: boolean;
    action?: () => Promise<void>;
}

export class OnboardingManager {
    private steps: OnboardingStep[] = [
        {
            id: 'wallet',
            title: 'Connect Wallet',
            description: 'Connect your Web3 wallet to get started',
            isCompleted: false
        },
        {
            id: 'credits',
            title: 'Get Credits',
            description: 'Acquire streaming credits to access content',
            isCompleted: false
        },
        {
            id: 'profile',
            title: 'Complete Profile',
            description: 'Set up your streaming preferences',
            isCompleted: false
        }
    ];

    completeStep(stepId: string) {
        const step = this.steps.find(s => s.id === stepId);
        if (step) {
            step.isCompleted = true;
            this.broadcast();
        }
    }

    private broadcast() {
        window.postMessage({
            type: 'ONBOARDING_UPDATE',
            payload: { steps: this.steps }
        }, '*');
    }
}
