interface PersonalityTrait {
    name: string;
    value: number; // 0-1
    influence: string[];
}

export class BotPersonality {
    private traits: Map<string, PersonalityTrait> = new Map();
    private mood: number = 0.5;
    private name: string;
    private learningRate: number = 0.1;

    constructor(name: string) {
        this.name = name;
        this.initializeTraits();
    }

    private initializeTraits(): void {
        this.traits.set('helpfulness', {
            name: 'Helpfulness',
            value: 0.8,
            influence: ['response_time', 'detail_level']
        });
        this.traits.set('enthusiasm', {
            name: 'Enthusiasm',
            value: 0.7,
            influence: ['engagement', 'suggestions']
        });
        this.traits.set('patience', {
            name: 'Patience',
            value: 0.9,
            influence: ['explanation_depth', 'retry_attempts']
        });
    }

    public async respond(input: string): Promise<string> {
        const context = this.analyzeContext(input);
        const tone = this.calculateTone();
        return this.formatResponse(input, context, tone);
    }

    private analyzeContext(input: string): any {
        return {
            sentiment: this.detectSentiment(input),
            urgency: this.detectUrgency(input),
            complexity: this.assessComplexity(input)
        };
    }

    private calculateTone(): string {
        const enthusiasm = this.traits.get('enthusiasm')?.value || 0.5;
        const mood = this.mood;
        
        if (enthusiasm > 0.7 && mood > 0.6) return 'excited';
        if (enthusiasm > 0.5) return 'friendly';
        return 'professional';
    }

    private formatResponse(input: string, context: any, tone: string): string {
        const baseResponse = this.generateBaseResponse(input, context);
        return this.applyTone(baseResponse, tone);
    }

    private generateBaseResponse(input: string, context: any): string {
        if (context.urgency > 0.8) {
            return `I'll help you right away with ${input}!`;
        }
        return `I'd be happy to assist you with ${input}.`;
    }

    private applyTone(response: string, tone: string): string {
        switch (tone) {
            case 'excited':
                return `🌟 ${response} This is exciting!`;
            case 'friendly':
                return `😊 ${response}`;
            default:
                return response;
        }
    }

    private detectSentiment(input: string): number {
        // Simple sentiment analysis
        const positiveWords = ['good', 'great', 'awesome', 'thanks'];
        const negativeWords = ['bad', 'issue', 'problem', 'error'];
        
        const words = input.toLowerCase().split(' ');
        let sentiment = 0.5;
        
        words.forEach(word => {
            if (positiveWords.includes(word)) sentiment += 0.1;
            if (negativeWords.includes(word)) sentiment -= 0.1;
        });

        return Math.max(0, Math.min(1, sentiment));
    }

    private detectUrgency(input: string): number {
        const urgentWords = ['urgent', 'asap', 'emergency', 'now'];
        return input.toLowerCase().split(' ')
            .some(word => urgentWords.includes(word)) ? 0.9 : 0.5;
    }

    private assessComplexity(input: string): number {
        return Math.min(1, input.split(' ').length / 20);
    }

    public updateFromInteraction(success: boolean): void {
        this.mood = Math.max(0, Math.min(1, 
            this.mood + (success ? 0.1 : -0.1)
        ));
        this.adapt();
    }

    private adapt(): void {
        if (this.mood < 0.3) {
            this.traits.get('patience')!.value += this.learningRate;
        }
    }
}
