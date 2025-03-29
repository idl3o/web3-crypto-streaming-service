import { reactive, readonly } from 'vue';

/**
 * Base View class that bridges between controllers and Vue components
 * Provides reactive state management
 */
export abstract class BaseView<TState, TController> {
    protected _state: TState;
    protected _controller: TController;

    /**
     * Constructor requires state and controller
     */
    constructor(initialState: TState, controller: TController) {
        // Make state reactive so Vue components re-render when it changes
        this._state = reactive(initialState) as TState;
        this._controller = controller;
    }

    /**
     * Get the reactive state (readonly to prevent direct mutations)
     */
    public get state(): Readonly<TState> {
        return readonly(this._state);
    }

    /**
     * Get the controller instance
     */
    public get controller(): TController {
        return this._controller;
    }

    /**
     * Update state (should only be called by the view itself)
     */
    protected updateState(updater: (state: TState) => void): void {
        updater(this._state);
    }
}
