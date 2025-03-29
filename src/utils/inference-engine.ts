export interface InferenceResult {
    confidence: number;
    suggestion: string;
    category: 'streaming' | 'wallet' | 'content' | 'general';
    priority: number;
}

export class InferenceEngine {
    private readonly patterns = {
        streaming: /\b(stream|watch|play|video|content)\b/i,
        wallet: /\b(wallet|connect|metamask|balance|payment)\b/i,
        content: /\b(upload|create|publish|share)\b/i
    };

    analyze(input: string): InferenceResult[] {
        const results: InferenceResult[] = [];

        Object.entries(this.patterns).forEach(([category, pattern]) => {
            const matches = (input.match(pattern) || []).length;
            if (matches > 0) {
                results.push(this.generateSuggestion(category as keyof typeof this.patterns, matches));
            }
        });

        return results.sort((a, b) => b.priority - a.priority);
    }

    private generateSuggestion(category: keyof typeof this.patterns, matchCount: number): InferenceResult {
        const confidence = Math.min(matchCount * 0.25, 1);

        const suggestions = {
            streaming: {
                text: 'Would you like to start streaming content?',
                priority: 3
            },
            wallet: {
                text: 'Do you need help connecting your wallet?',
                priority: 2
            },
            content: {
                text: 'Looking to share your content?',
                priority: 1
            }
        };

        return {
            confidence,
            suggestion: suggestions[category].text,
            category: category as any,
            priority: suggestions[category].priority
        };
    }
}
