import WebSocket from 'ws';
import { CryptoServiceError } from './errors/CryptoServiceError';
import { AssistantBot } from './bots/AssistantBot';
import { MediaStorage } from './storage/MediaStorage';
import { BotEconomy } from './economy/BotEconomy';
import { SourceMediaMatrix } from '../matrix/SourceMediaMatrix';
import { ProjectReflector } from '../reflection/ProjectReflector';
import { VersionToken } from '../tokenization/VersionToken';
import { CommunityStreamManager } from '../streams/CommunityStreamManager';
import { VirtualMachineManager } from '../vm/VirtualMachineManager';
import { TradingContest } from '../contest/TradingContest';
import { PopularMediaIntegrator } from '../media/PopularMediaIntegrator';
import { CelestialEmulator } from '../physics/CelestialEmulator';
import { PromptManager } from '../prompts/PromptManager';

interface CryptoServiceConfig {
    apiKey: string;
    maxReconnectAttempts?: number;
    reconnectInterval?: number;
    symbols?: string[];
    wsEndpoint?: string;
    enableCircuitBreaker?: boolean;
    requestTimeout?: number;
    errorThreshold?: number;
    errorTimeout?: number;
    heartbeatInterval?: number;
    debug?: boolean;
    enableBots?: boolean;
    mediaStorage?: {
        storageDir: string;
        maxFileSize?: number;
        allowedTypes?: string[];
    };
    githubToken?: string;
    enableCommunityStreams?: boolean;
    enableVM?: boolean;
    enableContests?: boolean;
    enableMediaIntegration?: boolean;
    mediaSourceConfig?: {
        youtube?: string;
        twitter?: string;
        discord?: string;
        telegram?: string;
    };
    enablePhysics?: boolean;
    enablePromptOptimization?: boolean;
}

interface SubscriptionData {
    symbol: string;
    price: number;
    timestamp: number;
}

interface BinanceTradeData {
    e: string;    // Event type
    s: string;    // Symbol
    p: string;    // Price
    T: number;    // Trade time
}

interface BinanceResponse {
    result: null | any;
    id: number;
}

interface SubscriptionRequest {
    id: number;
    resolve: (value: boolean) => void;
    reject: (reason: any) => void;
    timestamp: number;
}

export class CryptoDataService {
    private ws: WebSocket;
    private dataListeners: Map<string, Function[]> = new Map();
    private reconnectAttempts: number = 0;
    private isConnected: boolean = false;
    private reconnectTimeout?: NodeJS.Timeout;
    private readonly config: Required<CryptoServiceConfig>;
    private activeSubscriptions: Set<string> = new Set();
    private pendingSubscriptions: Set<string> = new Set();
    private connectionPromise?: Promise<void>;
    private pendingRequests: Map<number, SubscriptionRequest> = new Map();
    private readonly REQUEST_TIMEOUT: number;
    private subscriptionQueue: Array<string> = [];
    private processingQueue = false;
    private circuitBreakerTripped: boolean = false;
    private lastError: number = 0;
    private errorCount: number = 0;
    private readonly ERROR_THRESHOLD: number;
    private readonly ERROR_TIMEOUT: number;
    private bots: Map<string, AssistantBot> = new Map();
    private mediaStorage?: MediaStorage;
    private botEconomy: BotEconomy;
    private matrix: SourceMediaMatrix;
    private reflector?: ProjectReflector;
    private versionToken: VersionToken;
    private communityStreams?: CommunityStreamManager;
    private vm?: VirtualMachineManager;
    private startTime: number;
    private activeContest?: TradingContest;
    private mediaIntegrator?: PopularMediaIntegrator;
    private physicsEmulator?: CelestialEmulator;
    private promptManager?: PromptManager;

    constructor(config: CryptoServiceConfig) {
        this.config = {
            maxReconnectAttempts: 5,
            reconnectInterval: 5000,
            symbols: ['btcusdt', 'ethusdt'],
            wsEndpoint: 'wss://stream.binance.com:9443/ws',
            enableCircuitBreaker: true,
            requestTimeout: 10000,
            errorThreshold: 5,
            errorTimeout: 60000,
            heartbeatInterval: 30000,
            debug: false,
            enableBots: true,
            ...config
        };
        this.REQUEST_TIMEOUT = this.config.requestTimeout;
        this.ERROR_THRESHOLD = this.config.errorThreshold;
        this.ERROR_TIMEOUT = this.config.errorTimeout;
        this.ws = this.createWebSocket();
        if (config.mediaStorage) {
            this.mediaStorage = new MediaStorage(config.mediaStorage);
        }
        this.botEconomy = new BotEconomy();
        this.matrix = new SourceMediaMatrix();
        this.initializeMatrix();
        if (config.githubToken) {
            this.reflector = new ProjectReflector(config.githubToken);
            this.initializeReflection();
        }
        this.versionToken = new VersionToken('1.0.0', [
            'websocket',
            'bot-economy',
            'media-matrix',
            'contemplation'
        ]);
        if (config.enableCommunityStreams) {
            this.communityStreams = new CommunityStreamManager();
        }
        this.startTime = Date.now();
        if (config.enableVM) {
            this.vm = new VirtualMachineManager();
        }
        if (config.enableContests) {
            this.initializeContest();
        }
        if (config.enableMediaIntegration) {
            this.mediaIntegrator = new PopularMediaIntegrator();
            this.initializeMediaSources(config.mediaSourceConfig);
        }
        if (config.enablePhysics) {
            this.physicsEmulator = new CelestialEmulator();
            this.initializePhysicsSystem();
        }
        if (config.enablePromptOptimization) {
            this.promptManager = new PromptManager();
        }
    }

    private createWebSocket(): WebSocket {
        const ws = new WebSocket(this.config.wsEndpoint);
        this.connectionPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new CryptoServiceError('Connection timeout', 'TIMEOUT'));
            }, 10000);

            ws.once('open', () => {
                clearTimeout(timeout);
                resolve();
            });

            ws.once('error', (error) => {
                clearTimeout(timeout);
                reject(new CryptoServiceError('Connection failed', 'CONNECTION_ERROR', error));
            });
        });
        this.initializeWebSocket(ws);
        return ws;
    }

    private initializeWebSocket(ws: WebSocket): void {
        ws.on('open', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.processPendingSubscriptions();
        });

        ws.on('message', (data: WebSocket.Data) => {
            try {
                const parsedData = JSON.parse(data.toString());
                
                // Handle subscription responses
                if ('id' in parsedData) {
                    this.handleSubscriptionResponse(parsedData as BinanceResponse);
                    return;
                }

                // Handle trade data
                if (this.isValidTradeData(parsedData)) {
                    const tradeData = parsedData as BinanceTradeData;
                    const subscription: SubscriptionData = {
                        symbol: tradeData.s.toLowerCase(),
                        price: parseFloat(tradeData.p),
                        timestamp: tradeData.T
                    };
                    this.processData(subscription);
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.isConnected = false;
            this.handleDisconnection();
        });

        ws.on('close', () => {
            console.warn('WebSocket closed');
            this.isConnected = false;
            this.handleDisconnection();
        });
    }

    private handleSubscriptionResponse(response: BinanceResponse): void {
        const request = this.pendingRequests.get(response.id);
        if (request) {
            this.pendingRequests.delete(response.id);
            request.resolve(response.result === null);
        }
    }

    private async processPendingSubscriptions(): Promise<void> {
        if (this.pendingSubscriptions.size > 0) {
            const channels = Array.from(this.pendingSubscriptions).map(s => `${s}@trade`);
            try {
                await this.sendSubscription(channels);
                channels.forEach(channel => {
                    const symbol = channel.split('@')[0];
                    this.activeSubscriptions.add(symbol);
                    this.pendingSubscriptions.delete(symbol);
                });
            } catch (error) {
                console.error('Failed to process pending subscriptions:', error);
            }
        }
    }

    private subscribe(channels: string[]): void {
        this.ws.send(JSON.stringify({
            method: 'SUBSCRIBE',
            params: channels,
            id: 1
        }));
    }

    private processData(data: any): void {
        const listeners = this.dataListeners.get(data.symbol) || [];
        listeners.forEach(listener => listener(data));
        this.matrix.injectSource('crypto_source', 'price_data', Buffer.from(JSON.stringify(data)));
    }

    private isValidTradeData(data: any): data is BinanceTradeData {
        return data && 
               typeof data === 'object' && 
               typeof data.e === 'string' &&
               typeof data.s === 'string' &&
               typeof data.p === 'string' &&
               typeof data.T === 'number';
    }

    private handleDisconnection(): void {
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);
            this.reconnectTimeout = setTimeout(() => {
                if (!this.isConnected) {
                    this.ws = this.createWebSocket();
                }
            }, this.config.reconnectInterval * this.reconnectAttempts);
        } else {
            console.error('Max reconnection attempts reached');
            throw new Error('Failed to maintain connection to crypto service');
        }
    }

    public reset(): void {
        this.reconnectAttempts = 0;
    }

    public async subscribeToSymbol(symbol: string): Promise<boolean> {
        if (!this.validateSubscription(symbol)) {
            return false;
        }
        const normalizedSymbol = symbol.toLowerCase();
        if (this.activeSubscriptions.has(normalizedSymbol)) {
            return true;
        }

        try {
            await this.connectionPromise;
            if (!this.isConnected) {
                this.pendingSubscriptions.add(normalizedSymbol);
                return false;
            }

            await this.sendSubscription([`${normalizedSymbol}@trade`]);
            this.activeSubscriptions.add(normalizedSymbol);
            return true;
        } catch (error) {
            console.error(`Failed to subscribe to ${symbol}:`, error);
            this.pendingSubscriptions.add(normalizedSymbol);
            return false;
        }
    }

    private async sendSubscription(channels: string[]): Promise<void> {
        if (!this.isConnected) {
            throw new Error('WebSocket is not connected');
        }

        const id = Date.now();
        const promise = new Promise<boolean>((resolve, reject) => {
            const request: SubscriptionRequest = { id, resolve, reject, timestamp: Date.now() };
            this.pendingRequests.set(id, request);

            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new CryptoServiceError('Subscription timeout', 'TIMEOUT'));
                }
            }, this.REQUEST_TIMEOUT);
        });

        this.ws.send(JSON.stringify({
            method: 'SUBSCRIBE',
            params: channels,
            id
        }));

        return promise;
    }

    private async processSubscriptionQueue(): Promise<void> {
        if (this.processingQueue) return;
        this.processingQueue = true;

        while (this.subscriptionQueue.length > 0) {
            const symbol = this.subscriptionQueue.shift();
            if (!symbol) continue;

            try {
                await this.sendSubscription([`${symbol}@trade`]);
                this.activeSubscriptions.add(symbol);
            } catch (error) {
                console.error(`Failed to process subscription for ${symbol}:`, error);
                // Re-queue failed subscriptions
                this.subscriptionQueue.push(symbol);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        this.processingQueue = false;
    }

    public async unsubscribeFromSymbol(symbol: string): Promise<boolean> {
        const normalizedSymbol = symbol.toLowerCase();
        if (!this.activeSubscriptions.has(normalizedSymbol)) {
            return true;
        }

        try {
            const id = Date.now();
            await this.ws.send(JSON.stringify({
                method: 'UNSUBSCRIBE',
                params: [`${normalizedSymbol}@trade`],
                id
            }));
            this.activeSubscriptions.delete(normalizedSymbol);
            this.dataListeners.delete(normalizedSymbol);
            return true;
        } catch (error) {
            console.error(`Failed to unsubscribe from ${symbol}:`, error);
            return false;
        }
    }

    public getActiveSubscriptions(): string[] {
        return Array.from(this.activeSubscriptions);
    }

    public onPriceUpdate(symbol: string, callback: (data: SubscriptionData) => void): void {
        const normalizedSymbol = symbol.toLowerCase();
        if (!this.dataListeners.has(normalizedSymbol)) {
            this.dataListeners.set(normalizedSymbol, []);
            this.subscribeToSymbol(normalizedSymbol).catch(console.error);
        }
        this.dataListeners.get(normalizedSymbol)?.push(callback);
    }

    public cleanup(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        this.pendingSubscriptions.clear();
        this.activeSubscriptions.clear();
        this.dataListeners.clear();
        this.pendingRequests.clear();
        this.subscriptionQueue = [];
        this.processingQueue = false;
        if (this.ws) {
            this.ws.terminate();
        }
        this.isConnected = false;
        this.bots.clear();
    }

    public isConnectionActive(): boolean {
        return this.isConnected;
    }

    private handleError(error: Error): void {
        const now = Date.now();
        if (now - this.lastError < this.ERROR_TIMEOUT) {
            this.errorCount++;
            if (this.errorCount >= this.ERROR_THRESHOLD) {
                this.tripCircuitBreaker();
            }
        } else {
            this.errorCount = 1;
        }
        this.lastError = now;
    }

    private tripCircuitBreaker(): void {
        this.circuitBreakerTripped = true;
        this.cleanup();
        setTimeout(() => {
            this.circuitBreakerTripped = false;
            this.errorCount = 0;
            this.ws = this.createWebSocket();
        }, this.ERROR_TIMEOUT);
    }

    private validateSubscription(symbol: string): boolean {
        return /^[a-zA-Z0-9]{2,20}$/.test(symbol) && 
               symbol.length <= 20 && 
               !this.circuitBreakerTripped;
    }

    public createAssistantBot(userId: string, config: { name: string }): AssistantBot {
        if (!this.config.enableBots) {
            throw new Error('Bots are disabled in service configuration');
        }
        const bot = new AssistantBot(this, {
            userId,
            name: config.name,
            notificationChannel: 'webhook',
            credits: 100, // Initial credits
            serviceProvider: true
        });
        this.bots.set(userId, bot);
        return bot;
    }

    public removeAssistantBot(userId: string): void {
        this.bots.delete(userId);
    }

    public getAssistantBot(userId: string): AssistantBot | undefined {
        return this.bots.get(userId);
    }

    public async storeMedia(file: Buffer, filename: string, type: string): Promise<string | null> {
        if (!this.mediaStorage) {
            return null;
        }
        return this.mediaStorage.storeMedia(file, filename, type);
    }

    public async getMedia(filename: string): Promise<Buffer | null> {
        if (!this.mediaStorage) {
            return null;
        }
        return this.mediaStorage.getMedia(filename);
    }

    public registerBotService(service: BotService): void {
        this.botEconomy.registerService(service);
    }

    public processBotTransaction(tx: BotTransaction): Promise<boolean> {
        return this.botEconomy.processTransaction(tx);
    }

    public addBotCredits(botId: string, amount: number): void {
        this.botEconomy.addCredits(botId, amount);
    }

    private initializeMatrix(): void {
        this.matrix.addNode('crypto_source', 'source', {
            type: 'crypto_feed',
            initialized: Date.now()
        });
    }

    private async initializeReflection(): Promise<void> {
        if (!this.reflector) return;
        
        const insights = await this.reflector.reflectOnSimilarProjects();
        const recommendations = this.reflector.getRecommendations();
        
        console.log('🔍 Project Insights:', Object.fromEntries(insights));
        console.log('💡 Integration Recommendations:', recommendations);
    }

    public getVersionToken(): string {
        return this.versionToken.getToken();
    }

    public async checkForUpdates(): Promise<boolean> {
        if (!this.reflector) return false;
        
        try {
            const latestVersion = await this.fetchLatestVersion();
            return this.versionToken.isUpdateAvailable(latestVersion);
        } catch {
            return false;
        }
    }

    private async fetchLatestVersion(): Promise<string> {
        // Implementation to fetch latest version token from repository
        return 'WCSS_eyJ2ZXJzaW9uIjoiMS4wLjEifQ==';
    }

    public async registerCommunityStream(id: string, metadata: StreamMetadata): Promise<boolean> {
        if (!this.communityStreams) return false;
        return this.communityStreams.registerStream(id, metadata);
    }

    public getMemoryUsage(): number {
        return process.memoryUsage().heapUsed;
    }

    private initializeContest(): void {
        this.activeContest = new TradingContest({
            name: 'Grand Crypto Challenge',
            startTime: Date.now(),
            duration: 24 * 60 * 60 * 1000, // 24 hours
            minParticipants: 5,
            maxParticipants: 100,
            entryFee: 50,
            prizePool: 10000
        });
    }

    public async joinContest(botId: string): Promise<boolean> {
        if (!this.activeContest) return false;
        const bot = this.getAssistantBot(botId);
        if (!bot) return false;
        return this.activeContest.registerParticipant(bot);
    }

    private async initializeMediaSources(config?: CryptoServiceConfig['mediaSourceConfig']): Promise<void> {
        if (!this.mediaIntegrator || !config) return;

        if (config.youtube) {
            await this.mediaIntegrator.addSource('youtube_main', {
                platform: 'youtube',
                channelId: config.youtube,
                type: 'stream'
            });
        }

        if (config.twitter) {
            await this.mediaIntegrator.addSource('twitter_main', {
                platform: 'twitter',
                channelId: config.twitter,
                type: 'post',
                filters: ['crypto', 'trading']
            });
        }
    }

    public async searchMediaContent(query: string): Promise<any[]> {
        if (!this.mediaIntegrator) return [];
        return this.mediaIntegrator.searchContent(query);
    }

    public getPopularContent(): any[] {
        if (!this.mediaIntegrator) return [];
        return this.mediaIntegrator.getPopularContent();
    }

    private initializePhysicsSystem(): void {
        if (!this.physicsEmulator) return;

        // Initialize with demo solar system
        this.physicsEmulator.addBody({
            id: 'sun',
            mass: 1.989e30,
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            radius: 696340000,
            type: 'star'
        });

        this.physicsEmulator.startSimulation();
        this.physicsEmulator.on('physicsUpdate', this.handlePhysicsUpdate.bind(this));
    }

    private handlePhysicsUpdate(data: any): void {
        // Map celestial events to market influences
        const systemState = this.physicsEmulator?.getSystemState();
        if (systemState) {
            this.matrix.injectSource('physics', 'celestial_data', 
                Buffer.from(JSON.stringify(Object.fromEntries(systemState))));
        }
    }

    public async optimizePrompt(input: string): Promise<string> {
        if (!this.promptManager) return input;
        return this.promptManager.createPrompt(input);
    }

    public getPromptStats(): object | null {
        if (!this.promptManager) return null;
        return this.promptManager.getTemplateStats();
    }
}
