import { aiModelSelectionService, AIModel, AIModelProvider } from './AIModelSelectionService';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';

export interface AIRequestOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    userId?: string;
    useLatestModel?: boolean;
    stream?: boolean;
    systemPrompt?: string;
    images?: Array<{
        url?: string;
        data?: Blob;
        mimeType?: string;
    }>;
}

export interface AIResponse {
    text: string;
    modelUsed: string;
    tokenCount?: {
        input: number;
        output: number;
    };
    finishReason?: string;
}

class AIService {
    private static instance: AIService;
    private initialized = false;
    private apiKeys: Record<AIModelProvider, string | null> = {
        [AIModelProvider.ANTHROPIC]: null,
        [AIModelProvider.OPENAI]: null,
        [AIModelProvider.GOOGLE]: null,
        [AIModelProvider.META]: null,
        [AIModelProvider.COHERE]: null,
        [AIModelProvider.CUSTOM]: null,
    };

    private constructor() {}

    public static getInstance(): AIService {
        if (!AIService.instance) {
            AIService.instance = new AIService();
        }
        return AIService.instance;
    }

    /**
     * Initialize the AI service
     */
    public async initialize(config: { apiKeys?: Partial<Record<AIModelProvider, string>> } = {}): Promise<boolean> {
        try {
            if (this.initialized) {
                return true;
            }

            // Initialize model selection service
            await aiModelSelectionService.initialize();

            // Set API keys if provided
            if (config.apiKeys) {
                Object.entries(config.apiKeys).forEach(([provider, key]) => {
                    this.setApiKey(provider as AIModelProvider, key);
                });
            }

            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize AI service:', error);
            return false;
        }
    }

    /**
     * Set API key for a provider
     */
    public setApiKey(provider: AIModelProvider, apiKey: string): void {
        this.apiKeys[provider] = apiKey;
    }

    /**
     * Generate text using the selected AI model
     */
    public async generateText(prompt: string, options: AIRequestOptions = {}): Promise<AIResponse> {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Select model based on options
            const model = this.determineModel(options);
            if (!model) {
                throw new Error('No suitable AI model available');
            }

            // Check for API key
            if (!this.apiKeys[model.provider]) {
                throw new Error(`API key not set for provider: ${model.provider}`);
            }

            // Call the appropriate provider API
            switch (model.provider) {
                case AIModelProvider.ANTHROPIC:
                    return await this.callAnthropic(prompt, model, options);
                case AIModelProvider.OPENAI:
                    return await this.callOpenAI(prompt, model, options);
                case AIModelProvider.GOOGLE:
                    return await this.callGoogle(prompt, model, options);
                default:
                    throw new Error(`Unsupported provider: ${model.provider}`);
            }
        } catch (error) {
            this.reportError('Text generation failed', error);
            throw error;
        }
    }

    /**
     * Get available models for the user
     */
    public getAvailableModels(userId?: string): AIModel[] {
        return aiModelSelectionService.getAllModels().filter(model => 
            aiModelSelectionService.isModelAvailableToUser(model.id, userId)
        );
    }

    // Private helper methods

    /**
     * Determine which model to use based on options
     */
    private determineModel(options: AIRequestOptions): AIModel | undefined {
        // If a specific model ID is provided and available, use it
        if (options.model) {
            const specificModel = aiModelSelectionService.getModel(options.model);
            if (specificModel && specificModel.available && 
                aiModelSelectionService.isModelAvailableToUser(specificModel.id, options.userId)) {
                return specificModel;
            }
        }

        // If latest model requested, try to get Claude 3.7 if available to the user
        if (options.useLatestModel) {
            const latestModels = aiModelSelectionService.getModelsFromProvider(AIModelProvider.ANTHROPIC)
                .filter(model => model.version === '3.7' && 
                      aiModelSelectionService.isModelAvailableToUser(model.id, options.userId));
            
            if (latestModels.length > 0) {
                return latestModels[0];
            }
        }

        // Use the user's selected model or default
        return aiModelSelectionService.getSelectedModel(options.userId);
    }

    /**
     * Call Anthropic Claude API
     */
    private async callAnthropic(prompt: string, model: AIModel, options: AIRequestOptions): Promise<AIResponse> {
        // In a real implementation, this would call the Anthropic API
        // Simulating API call and response
        
        return {
            text: `This is a simulated response from ${model.name}. In a real implementation, this would call the actual Anthropic API with the prompt: "${prompt.substring(0, 50)}..."`,
            modelUsed: model.id,
            tokenCount: {
                input: prompt.length / 4, // rough token count estimation
                output: 150
            },
            finishReason: 'stop'
        };
    }

    /**
     * Call OpenAI API
     */
    private async callOpenAI(prompt: string, model: AIModel, options: AIRequestOptions): Promise<AIResponse> {
        // In a real implementation, this would call the OpenAI API
        // Simulating API call and response
        
        return {
            text: `This is a simulated response from ${model.name}. In a real implementation, this would call the actual OpenAI API with the prompt: "${prompt.substring(0, 50)}..."`,
            modelUsed: model.id,
            tokenCount: {
                input: prompt.length / 4, // rough token count estimation
                output: 150
            },
            finishReason: 'stop'
        };
    }

    /**
     * Call Google Gemini API
     */
    private async callGoogle(prompt: string, model: AIModel, options: AIRequestOptions): Promise<AIResponse> {
        // In a real implementation, this would call the Google API
        // Simulating API call and response
        
        return {
            text: `This is a simulated response from ${model.name}. In a real implementation, this would call the actual Google API with the prompt: "${prompt.substring(0, 50)}..."`,
            modelUsed: model.id,
            tokenCount: {
                input: prompt.length / 4, // rough token count estimation
                output: 150
            },
            finishReason: 'stop'
        };
    }

    /**
     * Report errors using IOErrorService
     */
    private reportError(message: string, error: any): void {
        const errorDetails = error instanceof Error ? error.message : String(error);
        
        ioErrorService.reportError({
            type: IOErrorType.NETWORK_REQUEST,
            severity: IOErrorSeverity.ERROR,
            message: message,
            details: errorDetails,
            source: 'AIService',
            retryable: true,
            error: error instanceof Error ? error : new Error(errorDetails)
        });
    }
}

export const aiService = AIService.getInstance();
export default aiService;
