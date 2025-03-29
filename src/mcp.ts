import { AppModel } from './model';
import { AppView } from './view';
import { UserInterface } from './view/UserInterface';
import { CryptoDataService } from './services/CryptoDataService';
import { SocialMediaService } from './services/SocialMediaService';

export class MasterControlProgram {
    private model: AppModel;
    private view: AppView;
    private ui: UserInterface;
    private cryptoService: CryptoDataService;
    private socialService: SocialMediaService;
    private components: Map<string, any> = new Map();

    constructor(model: AppModel, view: AppView) {
        this.model = model;
        this.view = view;
        this.ui = new UserInterface('app-container');
        this.cryptoService = new CryptoDataService(config.api.cryptoApiKey);
        this.socialService = new SocialMediaService(config.social.twitter.apiKey);
        this.initializeCryptoStreams();
        this.initializeSocialStreams();
    }

    // Register a component with the MCP
    registerComponent(name: string, component: any): void {
        try {
            if (this.components.has(name)) {
                throw new Error(`Component '${name}' is already registered.`);
            }
            this.components.set(name, component);
            console.log(`Component '${name}' registered successfully.`);
            this.ui.showNotification(`Component '${name}' registered successfully.`, 'success');
        } catch (error) {
            this.ui.showNotification(error.message, 'error');
        }
    }

    // Initialize all registered components
    initializeComponents(): void {
        this.components.forEach((component, name) => {
            if (typeof component.initialize === 'function') {
                console.log(`Initializing component: ${name}`);
                component.initialize();
            } else {
                console.warn(`Component '${name}' does not have an initialize method.`);
            }
        });
    }

    // Monitor the status of all components
    monitorComponents(): void {
        this.components.forEach((component, name) => {
            if (typeof component.getStatus === 'function') {
                console.log(`Status of '${name}':`, component.getStatus());
            } else {
                console.warn(`Component '${name}' does not have a getStatus method.`);
            }
        });
    }

    // Control a specific component
    controlComponent(name: string, action: string, ...args: any[]): void {
        try {
            this.ui.showLoading(name);
            const component = this.components.get(name);
            if (!component) {
                throw new Error(`Component '${name}' not found.`);
            }
            if (typeof component[action] === 'function') {
                console.log(`Executing action '${action}' on component '${name}'`);
                component[action](...args);
            } else {
                throw new Error(`Action '${action}' not found on component '${name}'.`);
            }
            this.ui.hideLoading(name);
        } catch (error) {
            this.ui.hideLoading(name);
            this.ui.showNotification(error.message, 'error');
        }
    }

    // Optimized method to update the view based on model changes
    updateView(): void {
        this.view.render(this.model.getData());
    }

    // Optimized method to display all registered components
    displayComponents(): void {
        if (!this.components.size) {
            console.warn("No components are registered.");
            return;
        }
        this.view.renderComponents(this.components);
    }

    // Optimized method to display the status of a specific component
    displayComponentStatus(name: string): void {
        const component = this.components.get(name);
        if (!component) {
            console.warn(`Component '${name}' is not registered.`);
            return;
        }
        if (typeof component.getStatus !== 'function') {
            console.warn(`Component '${name}' does not have a getStatus method.`);
            return;
        }
        this.view.renderComponentStatus(name, component.getStatus());
    }

    // Display available actions for a specific component
    displayComponentActions(name: string): void {
        const component = this.components.get(name);
        if (!component) {
            console.warn(`Component '${name}' is not registered.`);
            return;
        }
        const actions = Object.keys(component).filter(key => typeof component[key] === 'function');
        this.view.renderComponentActions(name, actions);
    }

    private initializeCryptoStreams(): void {
        const symbols = ['BTCUSDT', 'ETHUSDT'];
        symbols.forEach(symbol => {
            this.cryptoService.onPriceUpdate(symbol, (price) => {
                this.model.updateCryptoPrice(symbol, price);
                this.updateView();
            });
        });
    }

    private async initializeSocialStreams(): Promise<void> {
        try {
            await this.socialService.startTwitterStream(config.social.twitter.keywords);
            this.ui.showNotification('Social media streams initialized', 'success');
        } catch (error) {
            this.ui.showNotification('Failed to initialize social streams', 'error');
        }
    }

    private handleServiceError(service: string, error: Error): void {
        console.error(`${service} error:`, error);
        this.ui.showNotification(`${service} service error: ${error.message}`, 'error');
        // Attempt reconnection after 5 seconds
        setTimeout(() => this.reconnectService(service), 5000);
    }

    private reconnectService(service: string): void {
        if (service === 'crypto') {
            this.initializeCryptoStreams();
        } else if (service === 'social') {
            this.initializeSocialStreams();
        }
    }
}
