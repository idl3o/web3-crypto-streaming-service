/**
 * Gemini AI Service
 * Integrates Google's Gemini AI model into the Web3 Crypto Streaming Service
 */

export interface GeminiRequestOptions {
    maxOutputTokens?: number;
    temperature?: number;
    topK?: number;
    topP?: number;
    stop?: string[];
    safetySettings?: any[];
    model?: string;
}

export interface GeminiResponse {
    text: string;
    safetyAttributes?: Record<string, any>;
    citationMetadata?: Record<string, any>;
    modelInfo?: {
        name: string;
        version: string;
        displayName: string;
    };
}

export class GeminiAIService {
    private apiKey: string;
    private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';
    private defaultModel: string = 'models/gemini-pro';

    constructor(apiKey: string = '') {
        this.apiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY || '';

        if (!this.apiKey) {
            console.warn('GeminiAIService: No API key provided. Set VITE_GEMINI_API_KEY in .env file.');
        }
    }

    /**
     * Set the Gemini API key
     */
    public setApiKey(apiKey: string): void {
        this.apiKey = apiKey;
    }

    /**
     * Check if the service is properly configured
     */
    public isConfigured(): boolean {
        return !!this.apiKey;
    }

    /**
     * Generate content using Gemini AI
     * @param prompt The text prompt to send to Gemini
     * @param options Configuration options for the request
     * @returns Promise with the generated text
     */
    public async generateContent(
        prompt: string,
        options: GeminiRequestOptions = {}
    ): Promise<GeminiResponse> {
        if (!this.apiKey) {
            throw new Error('Gemini API key is not configured');
        }

        try {
            const model = options.model || this.defaultModel;
            const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;

            const payload = {
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: options.temperature ?? 0.7,
                    topK: options.topK ?? 40,
                    topP: options.topP ?? 0.95,
                    maxOutputTokens: options.maxOutputTokens ?? 1024,
                    stopSequences: options.stop || []
                },
                safetySettings: options.safetySettings || []
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
            }

            const result = await response.json();

            // Extract the text content from Gemini's response
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

            return {
                text,
                safetyAttributes: result.candidates?.[0]?.safetyAttributes,
                citationMetadata: result.candidates?.[0]?.citationMetadata,
                modelInfo: {
                    name: result.candidates?.[0]?.model?.name || model,
                    version: result.candidates?.[0]?.model?.version || '',
                    displayName: result.candidates?.[0]?.model?.displayName || 'Gemini'
                }
            };
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            throw error;
        }
    }

    /**
     * Perform content analysis using Gemini AI
     * @param content The content to analyze
     * @param analysisType The type of analysis to perform
     * @returns Promise with analysis results
     */
    public async analyzeContent(
        content: string,
        analysisType: 'sentiment' | 'keywords' | 'summary' | 'moderation' = 'sentiment'
    ): Promise<GeminiResponse> {
        let prompt: string;

        switch (analysisType) {
            case 'sentiment':
                prompt = `Analyze the sentiment of the following content. Provide a rating from -1 (negative) to 1 (positive) and explain your rating briefly:\n\n${content}`;
                break;

            case 'keywords':
                prompt = `Extract the key topics and keywords from the following content. Return them as a comma-separated list:\n\n${content}`;
                break;

            case 'summary':
                prompt = `Provide a concise summary of the following content in 2-3 sentences:\n\n${content}`;
                break;

            case 'moderation':
                prompt = `Review this content for potential policy violations including: hate speech, harassment, dangerous content, or explicit content. If any violations are detected, explain them; otherwise respond with "Content is appropriate":\n\n${content}`;
                break;

            default:
                prompt = `Analyze the following content:\n\n${content}`;
        }

        return this.generateContent(prompt, {
            temperature: 0.1,  // Lower temperature for analysis tasks
            maxOutputTokens: 512
        });
    }

    /**
     * Generate suggestions for content improvement
     * @param content The content to improve
     * @param goal The improvement goal
     * @returns Promise with suggestions
     */
    public async generateSuggestions(content: string, goal: string): Promise<GeminiResponse> {
        const prompt = `
I have the following content for my Web3 crypto streaming platform:

"${content}"

Please provide suggestions to improve this content with the goal to ${goal}.
List 3-5 specific, actionable improvements and explain why they would be effective.
`;

        return this.generateContent(prompt, {
            temperature: 0.7,
            maxOutputTokens: 800
        });
    }

    /**
     * Generate related content ideas based on a topic
     * @param topic The topic to generate content ideas for
     * @param contentType The type of content to generate ideas for
     * @returns Promise with content ideas
     */
    public async generateContentIdeas(
        topic: string,
        contentType: 'video' | 'blog' | 'tweet' | 'stream' = 'video'
    ): Promise<GeminiResponse> {
        const prompt = `
Generate 5 engaging ${contentType} content ideas related to ${topic} for a Web3 crypto streaming platform.
For each idea, provide:
1. A catchy title
2. A brief description (1-2 sentences)
3. Why this would appeal to a Web3/crypto audience

Format each idea with a clear title and bullet points.
`;

        return this.generateContent(prompt, {
            temperature: 0.8,
            maxOutputTokens: 1000
        });
    }

    /**
     * Generate blockchain market insights based on current trends
     * @returns Promise with market insights
     */
    public async getMarketInsights(): Promise<GeminiResponse> {
        const prompt = `
Provide insightful analysis on current blockchain market trends. Include:
1. A key trend or development worth noting for crypto creators and viewers
2. One emerging opportunity in the Web3 space
3. A potential challenge or risk to be aware of

Keep responses educational, balanced, and avoid specific price predictions or financial advice.
`;

        return this.generateContent(prompt, {
            temperature: 0.7,
            maxOutputTokens: 800
        });
    }
}

// Create singleton instance
export const geminiAIService = new GeminiAIService();
export default geminiAIService;
