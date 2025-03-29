import { InferenceEngine } from '../utils/inference-engine';

export class DIService {
    private inferenceEngine: InferenceEngine;

    async analyzePath(path: string): Promise<{
        activeCount: number;
        suggestions: string[];
        confidence: number;
    }> {
        const analysis = await this.inferenceEngine.analyze(path);

        return {
            activeCount: analysis.activeAgents,
            suggestions: analysis.recommendations,
            confidence: analysis.confidenceScore,
        };
    }

    async generateContent(prompt: string): Promise<{
        content: string;
        metadata: any;
    }> {
        return await this.inferenceEngine.generate(prompt);
    }
}
