import { CryptoDataService } from '../CryptoDataService';
import { BotPersonality } from '../../personality/BotPersonality';
import { AgentContemplation } from '../../contemplation/AgentContemplation';

type AlertCondition = {
    symbol: string;
    threshold: number;
    type: 'above' | 'below';
};

interface BotConfig {
    name: string;
    userId: string;
    alertThresholds?: AlertCondition[];
    autoTrade?: boolean;
    notificationChannel?: 'email' | 'webhook';
    webhookUrl?: string;
    mediaEnabled?: boolean;
    credits?: number;
    serviceProvider?: boolean;
    personality?: boolean;
    contemplationEnabled?: boolean;
}

export class AssistantBot {
    private cryptoService: CryptoDataService;
    private config: BotConfig;
    private alerts: Map<string, AlertCondition[]> = new Map();
    private credits: number;
    private isServiceProvider: boolean;
    private personality?: BotPersonality;
    private contemplation?: AgentContemplation;
    private activeContemplation?: string;

    constructor(cryptoService: CryptoDataService, config: BotConfig) {
        this.cryptoService = cryptoService;
        this.config = config;
        this.credits = config.credits || 0;
        this.isServiceProvider = config.serviceProvider || false;
        if (config.personality) {
            this.personality = new BotPersonality(config.name);
        }
        if (config.contemplationEnabled) {
            this.contemplation = new AgentContemplation();
            this.scheduleContemplation();
        }
        this.initialize();
        this.registerServices();
    }

    private initialize(): void {
        if (this.config.alertThresholds) {
            this.config.alertThresholds.forEach(alert => {
                this.addAlert(alert);
            });
        }
    }

    private registerServices(): void {
        if (this.isServiceProvider) {
            this.cryptoService.registerBotService({
                id: `${this.config.userId}_alerts`,
                name: 'Price Alerts',
                cost: 10,
                provider: this.config.userId
            });
        }
    }

    private addAlert(condition: AlertCondition): void {
        const alerts = this.alerts.get(condition.symbol) || [];
        alerts.push(condition);
        this.alerts.set(condition.symbol, alerts);

        this.cryptoService.onPriceUpdate(condition.symbol, (data) => {
            this.checkAlertConditions(data);
        });
    }

    private checkAlertConditions(data: { symbol: string; price: number }): void {
        const alerts = this.alerts.get(data.symbol) || [];
        alerts.forEach(alert => {
            if (alert.type === 'above' && data.price > alert.threshold) {
                this.notify(`Price alert: ${data.symbol} is above ${alert.threshold}`);
            } else if (alert.type === 'below' && data.price < alert.threshold) {
                this.notify(`Price alert: ${data.symbol} is below ${alert.threshold}`);
            }
        });
    }

    private async notify(message: string, mediaFilename?: string): Promise<void> {
        if (this.personality) {
            message = await this.personality.respond(message);
        }
        if (this.config.notificationChannel === 'webhook' && this.config.webhookUrl) {
            const payload: any = { message, userId: this.config.userId };
            if (mediaFilename) {
                const media = await this.cryptoService.getMedia(mediaFilename);
                if (media) {
                    payload.media = media.toString('base64');
                }
            }
            fetch(this.config.webhookUrl, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
            }).catch(console.error);
        }
        console.log(`[${this.config.name}] ${message}`);
    }

    public async attachMedia(symbol: string, file: Buffer, filename: string, type: string): Promise<string | null> {
        if (!this.config.mediaEnabled) {
            return null;
        }
        return this.cryptoService.storeMedia(file, `${symbol}_${filename}`, type);
    }

    public addPriceAlert(symbol: string, threshold: number, type: 'above' | 'below'): void {
        this.addAlert({ symbol, threshold, type });
    }

    public removePriceAlert(symbol: string, threshold: number, type: 'above' | 'below'): void {
        const alerts = this.alerts.get(symbol) || [];
        this.alerts.set(symbol, alerts.filter(alert => 
            alert.threshold !== threshold || alert.type !== type
        ));
    }

    public getActiveAlerts(): Map<string, AlertCondition[]> {
        return new Map(this.alerts);
    }

    public async requestService(serviceId: string): Promise<boolean> {
        return this.cryptoService.processBotTransaction({
            fromId: this.config.userId,
            toId: serviceId.split('_')[0],
            amount: 10,
            service: serviceId,
            timestamp: Date.now()
        });
    }

    public getCredits(): number {
        return this.credits;
    }

    private async scheduleContemplation(): Promise<void> {
        setInterval(async () => {
            await this.runContemplationSession();
        }, 3600000); // Contemplate every hour
    }

    private async runContemplationSession(): Promise<void> {
        if (!this.contemplation) return;

        this.activeContemplation = await this.contemplation.startSession(this.config.userId);
        
        const performanceData = {
            responseTime: this.calculateAverageResponseTime(),
            successRate: this.calculateSuccessRate(),
            alertCount: this.alerts.size
        };

        await this.contemplation.contemplate(this.activeContemplation, performanceData);
        
        const insights = this.contemplation.getSessionInsights(this.activeContemplation);
        console.log(`[${this.config.name}] Contemplation insights:`, insights);
    }

    private calculateAverageResponseTime(): number {
        // Implementation specific to bot's response time tracking
        return 100; // Example value
    }

    private calculateSuccessRate(): number {
        // Implementation specific to bot's success tracking
        return 0.95; // Example value
    }
}
