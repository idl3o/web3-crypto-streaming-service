import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import SwitchboardService, { FEATURE_STATES } from './SwitchboardService';

/**
 * Represents an AI model provider (like Anthropic, OpenAI, etc)
 */
export enum AIModelProvider {
    ANTHROPIC = 'anthropic',
    OPENAI = 'openai',
    GOOGLE = 'google',
    META = 'meta',
    COHERE = 'cohere',
    CUSTOM = 'custom'
}

/**
 * Represents an AI model with its metadata and availability status
 */
export interface AIModel {
    id: string;
    name: string;
    version: string;
    provider: AIModelProvider;
    capabilities: string[];
    available: boolean;
    beta: boolean;
    previewOnly: boolean;
    featureFlagId?: string;
    contextWindow: number;
    launchDate?: string;
    description?: string;
    imageSupport: boolean;
    apiEndpoint?: string;
    pricing?: {
        inputPerMillion: number;
        outputPerMillion: number;
        currency: string;
    };
}

/**
 * Service for managing AI model availability and selection
 */
export class AIModelSelectionService extends EventEmitter {
    private static instance: AIModelSelectionService;
    private models: Map<string, AIModel> = new Map();
    private userPreferences: Map<string, string> = new Map();
    private selectedModels: Map<string, string> = new Map(); // userId -> modelId
    private providerStatus: Map<AIModelProvider, boolean> = new Map();
    private userRoleOverrides: Map<string, boolean> = new Map();
    private initialized: boolean = false;

    private constructor() {
        super();
        this.initializeProviderStatus();
        this.registerDefaultModels();
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): AIModelSelectionService {
        if (!AIModelSelectionService.instance) {
            AIModelSelectionService.instance = new AIModelSelectionService();
        }
        return AIModelSelectionService.instance;
    }

    /**
     * Initialize the service
     */
    public async initialize(): Promise<boolean> {
        if (this.initialized) {
            return true;
        }
        
        try {
            // Load user preferences from local storage
            this.loadUserPreferences();
            
            // Load available models from API
            await this.refreshAvailableModels();
            
            this.initialized = true;
            return true;
        } catch (error) {
            this.reportError('Failed to initialize AI model selection service', error);
            return false;
        }
    }

    /**
     * Get all available AI models
     */
    public getAllModels(): AIModel[] {
        return Array.from(this.models.values()).filter(model => model.available);
    }

    /**
     * Get models from a specific provider
     */
    public getModelsFromProvider(provider: AIModelProvider): AIModel[] {
        return Array.from(this.models.values()).filter(
            model => model.provider === provider && model.available
        );
    }

    /**
     * Get a specific model by ID
     */
    public getModel(modelId: string): AIModel | undefined {
        return this.models.get(modelId);
    }

    /**
     * Select an AI model for a user
     */
    public selectModel(modelId: string, userId?: string): boolean {
        const userIdentifier = userId || 'default';
        const model = this.models.get(modelId);
        
        if (!model) {
            return false;
        }
        
        // Check if the model is available
        if (!model.available) {
            return false;
        }
        
        // Check feature flag for limited availability models
        if (model.featureFlagId && !this.isFeatureFlagEnabled(model.featureFlagId, userId)) {
            return false;
        }
        
        // Store user's selection
        this.selectedModels.set(userIdentifier, modelId);
        localStorage.setItem(`ai_model_selection_${userIdentifier}`, modelId);
        
        this.emit('model-selected', { userId: userIdentifier, modelId, model });
        return true;
    }

    /**
     * Get the currently selected model for a user
     */
    public getSelectedModel(userId?: string): AIModel | undefined {
        const userIdentifier = userId || 'default';
        const modelId = this.selectedModels.get(userIdentifier) || 
                       localStorage.getItem(`ai_model_selection_${userIdentifier}`);
                       
        if (modelId) {
            const model = this.models.get(modelId);
            if (model && model.available) {
                return model;
            }
        }
        
        // Fall back to the best available model
        return this.getDefaultModel();
    }

    /**
     * Register a new AI model
     */
    public registerModel(model: AIModel): void {
        this.models.set(model.id, model);
        this.emit('model-registered', { model });
    }

    /**
     * Update an AI model's availability
     */
    public updateModelAvailability(modelId: string, available: boolean): void {
        const model = this.models.get(modelId);
        if (model) {
            model.available = available;
            this.models.set(modelId, model);
            this.emit('model-availability-changed', { modelId, available });
        }
    }

    /**
     * Check if a model is available to a user
     */
    public isModelAvailableToUser(modelId: string, userId?: string): boolean {
        const model = this.models.get(modelId);
        if (!model || !model.available) {
            return false;
        }
        
        // Check if feature flag is required
        if (model.featureFlagId) {
            return this.isFeatureFlagEnabled(model.featureFlagId, userId);
        }
        
        return true;
    }

    /**
     * Get the best available model
     */
    public getDefaultModel(): AIModel | undefined {
        // Find Claude 3.7 if available
        const claude37 = Array.from(this.models.values()).find(
            model => model.provider === AIModelProvider.ANTHROPIC && 
                    model.version === '3.7' && 
                    model.available
        );
        
        if (claude37) {
            return claude37;
        }
        
        // Otherwise, find Claude 3.5
        const claude35 = Array.from(this.models.values()).find(
            model => model.provider === AIModelProvider.ANTHROPIC && 
                    model.version === '3.5' && 
                    model.available
        );
        
        if (claude35) {
            return claude35;
        }
        
        // Fall back to any available model
        return Array.from(this.models.values()).find(model => model.available);
    }

    /**
     * Refresh the list of available models from providers
     */
    public async refreshAvailableModels(): Promise<void> {
        try {
            // In a real implementation, this would call APIs to check model availability
            // Here we're simulating by registering hardcoded models
            
            // Check API status and model availability
            await this.checkProviderStatus();
            
            // Mark all models as loaded
            this.emit('models-refreshed', { 
                modelsCount: this.models.size,
                availableCount: Array.from(this.models.values()).filter(m => m.available).length
            });
        } catch (error) {
            this.reportError('Failed to refresh available models', error);
            throw error;
        }
    }

    /**
     * Grant early access to a model for a specific user
     */
    public grantEarlyAccess(userId: string, modelId: string): boolean {
        const model = this.models.get(modelId);
        if (!model) {
            return false;
        }
        
        const key = `${userId}:${modelId}`;
        this.userRoleOverrides.set(key, true);
        
        return true;
    }

    /**
     * Check if the provider is currently available
     */
    public isProviderAvailable(provider: AIModelProvider): boolean {
        return this.providerStatus.get(provider) || false;
    }

    // Private helper methods

    /**
     * Initialize provider status
     */
    private initializeProviderStatus(): void {
        Object.values(AIModelProvider).forEach(provider => {
            this.providerStatus.set(provider, true);
        });
    }

    /**
     * Register default models
     */
    private registerDefaultModels(): void {
        // Register Claude 3.5 Sonnet
        this.registerModel({
            id: 'claude-3-5-sonnet',
            name: 'Claude 3.5 Sonnet',
            version: '3.5',
            provider: AIModelProvider.ANTHROPIC,
            capabilities: ['text-generation', 'reasoning', 'coding'],
            available: true,
            beta: false,
            previewOnly: false,
            contextWindow: 200000,
            launchDate: '2023-12-15',
            description: 'Claude 3.5 Sonnet offers enhanced reasoning and coding capabilities.',
            imageSupport: true,
            apiEndpoint: 'https://api.anthropic.com/v1/messages',
            pricing: {
                inputPerMillion: 3.00,
                outputPerMillion: 15.00,
                currency: 'USD'
            }
        });
        
        // Register Claude 3.7 Sonnet - limited availability
        this.registerModel({
            id: 'claude-3-7-sonnet',
            name: 'Claude 3.7 Sonnet',
            version: '3.7',
            provider: AIModelProvider.ANTHROPIC,
            capabilities: ['text-generation', 'reasoning', 'coding', 'advanced-reasoning'],
            available: true, // Available but access controlled by feature flag
            beta: true,
            previewOnly: false,
            featureFlagId: 'ai_claude_3_7_access', // Feature flag to control access
            contextWindow: 250000,
            launchDate: '2024-08-15',
            description: 'Claude 3.7 Sonnet offers our most advanced reasoning and coding capabilities.',
            imageSupport: true,
            apiEndpoint: 'https://api.anthropic.com/v1/messages',
            pricing: {
                inputPerMillion: 4.00,
                outputPerMillion: 20.00,
                currency: 'USD'
            }
        });
        
        // Register other models...
        this.registerModel({
            id: 'gpt-4o',
            name: 'GPT-4o',
            version: '4o',
            provider: AIModelProvider.OPENAI,
            capabilities: ['text-generation', 'reasoning', 'coding'],
            available: true,
            beta: false,
            previewOnly: false,
            contextWindow: 128000,
            description: 'GPT-4o for multimodal tasks',
            imageSupport: true,
            apiEndpoint: 'https://api.openai.com/v1/chat/completions'
        });
        
        // Register Gemini Pro
        this.registerModel({
            id: 'gemini-pro',
            name: 'Gemini Pro',
            version: '1.0',
            provider: AIModelProvider.GOOGLE,
            capabilities: ['text-generation', 'reasoning'],
            available: true,
            beta: false,
            previewOnly: false,
            contextWindow: 32000,
            imageSupport: true,
            apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        });
    }

    /**
     * Check if a feature flag is enabled
     */
    private isFeatureFlagEnabled(flagId: string, userId?: string): boolean {
        // Check for user override first
        if (userId) {
            const key = `${userId}:${flagId}`;
            if (this.userRoleOverrides.has(key)) {
                return this.userRoleOverrides.get(key) || false;
            }
        }
        
        // Otherwise check with the SwitchboardService
        try {
            return SwitchboardService.isFeatureEnabled(flagId, { userId });
        } catch (error) {
            // If switchboard isn't available, default to false for beta features
            return false;
        }
    }

    /**
     * Check the status of all providers
     */
    private async checkProviderStatus(): Promise<void> {
        // In a real implementation, this would ping provider APIs
        // Here we're simulating provider status
        this.providerStatus.set(AIModelProvider.ANTHROPIC, true);
        this.providerStatus.set(AIModelProvider.OPENAI, true);
        this.providerStatus.set(AIModelProvider.GOOGLE, true);
        this.providerStatus.set(AIModelProvider.META, true);
        this.providerStatus.set(AIModelProvider.COHERE, true);
    }

    /**
     * Load user preferences from storage
     */
    private loadUserPreferences(): void {
        try {
            const storedPreferences = localStorage.getItem('ai_model_preferences');
            if (storedPreferences) {
                const preferences = JSON.parse(storedPreferences);
                Object.entries(preferences).forEach(([key, value]) => {
                    this.userPreferences.set(key, value as string);
                });
            }
        } catch (error) {
            this.reportError('Failed to load user AI model preferences', error);
        }
    }

    /**
     * Save user preferences to storage
     */
    private saveUserPreferences(): void {
        try {
            const preferences: Record<string, string> = {};
            this.userPreferences.forEach((value, key) => {
                preferences[key] = value;
            });
            localStorage.setItem('ai_model_preferences', JSON.stringify(preferences));
        } catch (error) {
            this.reportError('Failed to save user AI model preferences', error);
        }
    }

    /**
     * Report errors using IOErrorService
     */
    private reportError(message: string, error: any): void {
        const errorDetails = error instanceof Error ? error.message : String(error);
        
        ioErrorService.reportError({
            type: IOErrorType.UNKNOWN,
            severity: IOErrorSeverity.ERROR,
            message: message,
            details: errorDetails,
            source: 'AIModelSelectionService',
            retryable: false,
            error: error instanceof Error ? error : new Error(errorDetails)
        });
        
        this.emit('error', { message, error });
    }
}

export const aiModelSelectionService = AIModelSelectionService.getInstance();
export default aiModelSelectionService;
