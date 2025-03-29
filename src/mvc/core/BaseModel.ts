/**
 * Base Model class that all models should extend
 * Provides common functionality for data validation, serialization, etc.
 */
export abstract class BaseModel {
    // Track model validation errors
    protected _errors: Map<string, string> = new Map();

    /**
     * Validate the model data
     * Should be implemented by child classes
     */
    public abstract validate(): boolean;

    /**
     * Check if the model is valid
     */
    public get isValid(): boolean {
        this.validate();
        return this._errors.size === 0;
    }

    /**
     * Get validation errors
     */
    public get errors(): Record<string, string> {
        return Object.fromEntries(this._errors);
    }

    /**
     * Add a validation error
     */
    protected addError(field: string, message: string): void {
        this._errors.set(field, message);
    }

    /**
     * Clear validation errors
     */
    protected clearErrors(): void {
        this._errors.clear();
    }

    /**
     * Serialize the model to a plain object
     * Should be implemented by child classes
     */
    public abstract toObject(): Record<string, any>;

    /**
     * Deserialize from a plain object
     * Should be implemented by child classes
     */
    public abstract fromObject(obj: Record<string, any>): this;

    /**
     * Convert to JSON string
     */
    public toJson(): string {
        return JSON.stringify(this.toObject());
    }

    /**
     * Create from JSON string
     */
    public fromJson(json: string): this {
        const obj = JSON.parse(json);
        return this.fromObject(obj);
    }
}
