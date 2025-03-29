/**
 * Base Controller class that all controllers should extend
 * Handles business logic and coordinates between models
 */
export abstract class BaseController<TModel> {
    protected _model: TModel;

    /**
     * Constructor requires a model instance
     */
    constructor(model: TModel) {
        this._model = model;
    }

    /**
     * Get the current model instance
     */
    public get model(): TModel {
        return this._model;
    }

    /**
     * Initialize the controller
     * May be overridden by child classes
     */
    public async initialize(): Promise<void> {
        // Default implementation does nothing
    }

    /**
     * Clean up resources
     * May be overridden by child classes
     */
    public async dispose(): Promise<void> {
        // Default implementation does nothing
    }
}
