import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';

/**
 * Message payload for the event bus
 */
export interface EventMessage {
    type: string;
    source: string;
    payload: any;
    timestamp: number;
    id: string;
    correlationId?: string;
}

/**
 * Subscription options
 */
export interface SubscriptionOptions {
    source?: string;
    filter?: (message: EventMessage) => boolean;
}

/**
 * Central event bus for decoupled inter-service communication
 * Solves the tight coupling between services and provides observability
 */
export class EventBusService extends EventEmitter {
    private static instance: EventBusService;
    private messageLog: EventMessage[] = [];
    private readonly MAX_LOG_SIZE = 1000;
    private subscriptionCount: Map<string, number> = new Map();
    private debugMode = false;

    private constructor() {
        super();
        this.setMaxListeners(100); // Support many listeners
    }

    public static getInstance(): EventBusService {
        if (!EventBusService.instance) {
            EventBusService.instance = new EventBusService();
        }
        return EventBusService.instance;
    }

    /**
     * Enable debug mode for extra logging
     */
    public setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
    }

    /**
     * Publish a message to the event bus
     */
    public publish(eventType: string, payload: any, source: string, correlationId?: string): string {
        try {
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            
            const message: EventMessage = {
                type: eventType,
                source,
                payload,
                timestamp: Date.now(),
                id: messageId,
                correlationId
            };
            
            // Store in log
            this.logMessage(message);
            
            // Emit the event
            this.emit(eventType, message);
            
            // Also emit a wildcard event for global listeners
            this.emit('*', message);
            
            if (this.debugMode) {
                console.log(`EventBus: Published ${eventType} from ${source}`);
            }
            
            return messageId;
        } catch (error) {
            ioErrorService.reportError({
                type: IOErrorType.UNKNOWN,
                severity: IOErrorSeverity.ERROR,
                message: `Failed to publish event ${eventType}`,
                details: error instanceof Error ? error.message : String(error),
                source: 'EventBusService',
                retryable: false,
                error: error instanceof Error ? error : new Error(String(error))
            });
            
            return '';
        }
    }

    /**
     * Subscribe to events of a specific type
     */
    public subscribe(eventType: string, callback: (message: EventMessage) => void, options?: SubscriptionOptions): () => void {
        try {
            // Create wrapped callback that applies filters
            const wrappedCallback = (message: EventMessage) => {
                if (options?.source && message.source !== options.source) {
                    return;
                }
                
                if (options?.filter && !options.filter(message)) {
                    return;
                }
                
                callback(message);
            };
            
            // Register subscription
            this.incrementSubscriptionCount(eventType);
            this.on(eventType, wrappedCallback);
            
            if (this.debugMode) {
                console.log(`EventBus: New subscription to ${eventType}, total subscribers: ${this.subscriptionCount.get(eventType)}`);
            }
            
            // Return unsubscribe function
            return () => {
                this.off(eventType, wrappedCallback);
                this.decrementSubscriptionCount(eventType);
                
                if (this.debugMode) {
                    console.log(`EventBus: Unsubscribed from ${eventType}, remaining subscribers: ${this.subscriptionCount.get(eventType) || 0}`);
                }
            };
        } catch (error) {
            ioErrorService.reportError({
                type: IOErrorType.UNKNOWN,
                severity: IOErrorSeverity.ERROR,
                message: `Failed to subscribe to event ${eventType}`,
                details: error instanceof Error ? error.message : String(error),
                source: 'EventBusService',
                retryable: false,
                error: error instanceof Error ? error : new Error(String(error))
            });
            
            // Return a no-op unsubscribe function
            return () => {};
        }
    }

    /**
     * Subscribe to all events
     */
    public subscribeToAll(callback: (message: EventMessage) => void, options?: SubscriptionOptions): () => void {
        return this.subscribe('*', callback, options);
    }

    /**
     * Get recent messages from the log
     */
    public getRecentMessages(limit: number = 100, eventType?: string): EventMessage[] {
        let messages = [...this.messageLog];
        
        if (eventType && eventType !== '*') {
            messages = messages.filter(m => m.type === eventType);
        }
        
        return messages.slice(0, limit);
    }

    /**
     * Log a message
     */
    private logMessage(message: EventMessage): void {
        this.messageLog.unshift(message);
        
        if (this.messageLog.length > this.MAX_LOG_SIZE) {
            this.messageLog.length = this.MAX_LOG_SIZE;
        }
    }

    /**
     * Increment subscription count for an event type
     */
    private incrementSubscriptionCount(eventType: string): void {
        const count = this.subscriptionCount.get(eventType) || 0;
        this.subscriptionCount.set(eventType, count + 1);
    }

    /**
     * Decrement subscription count for an event type
     */
    private decrementSubscriptionCount(eventType: string): void {
        const count = this.subscriptionCount.get(eventType) || 0;
        
        if (count <= 1) {
            this.subscriptionCount.delete(eventType);
        } else {
            this.subscriptionCount.set(eventType, count - 1);
        }
    }

    /**
     * Get subscription stats
     */
    public getSubscriptionStats(): Record<string, number> {
        const stats: Record<string, number> = {};
        
        this.subscriptionCount.forEach((count, eventType) => {
            stats[eventType] = count;
        });
        
        return stats;
    }
}

export const eventBusService = EventBusService.getInstance();
export default eventBusService;
