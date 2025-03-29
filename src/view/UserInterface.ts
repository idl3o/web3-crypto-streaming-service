import { uiConfig } from '../config/ui.config';

export class UserInterface {
    private container: HTMLElement;
    private loadingStates: Map<string, boolean> = new Map();

    constructor(containerId: string) {
        this.container = document.getElementById(containerId) || document.body;
        this.initializeUI();
    }

    private initializeUI(): void {
        this.loadStyles();
        this.container.style.maxWidth = uiConfig.layout.maxWidth;
        this.container.style.margin = '0 auto';
        this.createLoadingIndicator();
        this.createNotificationArea();
    }

    private loadStyles(): void {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/styles/main.css';
        document.head.appendChild(link);
    }

    public showLoading(componentName: string): void {
        this.loadingStates.set(componentName, true);
        this.updateLoadingState();
    }

    public hideLoading(componentName: string): void {
        this.loadingStates.set(componentName, false);
        this.updateLoadingState();
    }

    public showNotification(message: string, type: 'success' | 'error' | 'info'): void {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        this.container.querySelector('.notification-area')?.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }, uiConfig.notifications.duration);
    }

    private getNotificationColor(type: string): string {
        switch(type) {
            case 'success': return uiConfig.theme.success;
            case 'error': return uiConfig.theme.error;
            default: return uiConfig.theme.primary;
        }
    }

    private createLoadingIndicator(): void {
        const loader = document.createElement('div');
        loader.className = 'loading-indicator';
        this.container.appendChild(loader);
    }

    private createNotificationArea(): void {
        const notificationArea = document.createElement('div');
        notificationArea.className = 'notification-area';
        notificationArea.style.position = 'fixed';
        notificationArea.style.top = uiConfig.layout.spacing.lg;
        notificationArea.style.right = uiConfig.layout.spacing.lg;
        this.container.appendChild(notificationArea);
    }

    private updateLoadingState(): void {
        const isLoading = Array.from(this.loadingStates.values()).some(state => state);
        const loader = this.container.querySelector('.loading-indicator');
        if (loader) {
            loader.style.display = isLoading ? 'block' : 'none';
        }
    }

    public createButton(text: string, options: {
        type?: 'primary' | 'secondary' | 'success' | 'error',
        outline?: boolean,
        onClick?: () => void,
        loading?: boolean
    } = {}): HTMLButtonElement {
        const button = document.createElement('button');
        button.className = `button ${options.type || 'primary'} ${options.outline ? 'outline' : ''}`;
        button.textContent = text;
        
        if (options.onClick) {
            button.addEventListener('click', async (e) => {
                if (button.disabled) return;
                
                button.disabled = true;
                button.classList.add('button-loading');
                
                try {
                    await options.onClick();
                } catch (error) {
                    this.showNotification(error.message, 'error');
                } finally {
                    button.disabled = false;
                    button.classList.remove('button-loading');
                }
            });
        }
        
        return button;
    }

    public createButtonGroup(buttons: HTMLButtonElement[]): HTMLDivElement {
        const group = document.createElement('div');
        group.className = 'button-group';
        buttons.forEach(button => group.appendChild(button));
        return group;
    }
}
