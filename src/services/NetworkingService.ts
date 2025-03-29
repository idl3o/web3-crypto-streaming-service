import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { RateLimiterService } from './RateLimiterService';

interface NetworkMessage {
    type: 'chat' | 'alert' | 'event' | 'signal';
    from: string;
    content: any;
    timestamp: number;
    room?: string;
}

interface UserProfile {
    userId: string;
    walletAddress?: string;
    username: string;
    avatar?: string;
    reputation: number;
    joined: number;
}

interface TradeSignal {
    symbol: string;
    type: 'LONG' | 'SHORT';
    entry: number;
    target: number;
    stopLoss: number;
    timestamp: number;
    confidence: number;
}

interface Room {
    id: string;
    name: string;
    description: string;
    members: Set<string>;
    type: 'public' | 'private';
    signals: TradeSignal[];
    history: NetworkMessage[];
}

export class NetworkingService extends EventEmitter {
    private ws: WebSocket.Server;
    private clients: Map<string, WebSocket> = new Map();
    private users: Map<string, UserProfile> = new Map();
    private rooms: Map<string, Room> = new Map();
    private messageHistory: NetworkMessage[] = [];
    private readonly MAX_HISTORY = 1000;
    private rateLimiter: RateLimiterService;
    private readonly MAX_MESSAGE_SIZE = 1024 * 10; // 10KB
    private readonly MAX_ROOM_MEMBERS = 1000;
    private readonly MAX_ROOMS_PER_USER = 50;

    constructor(port: number = 8080) {
        super();
        this.ws = new WebSocket.Server({ port });
        this.rateLimiter = new RateLimiterService();
        this.setupWebSocket();
    }

    private setupWebSocket(): void {
        this.ws.on('connection', (socket: WebSocket, request) => {
            const userId = this.generateUserId();
            this.clients.set(userId, socket);

            socket.on('message', (data: WebSocket.Data) => {
                this.handleMessage(userId, data);
            });

            socket.on('close', () => {
                this.handleDisconnect(userId);
            });
        });
    }

    private handleMessage(userId: string, data: WebSocket.Data): void {
        try {
            if (this.rateLimiter.isRateLimited(userId)) {
                throw new Error('Rate limit exceeded');
            }

            if (data.toString().length > this.MAX_MESSAGE_SIZE) {
                throw new Error('Message size exceeds limit');
            }

            const message: NetworkMessage = JSON.parse(data.toString());
            message.timestamp = Date.now();
            message.from = userId;

            this.persistMessage(message);

            if (message.room) {
                this.broadcastToRoom(message.room, message);
                const room = this.rooms.get(message.room);
                if (room) {
                    room.history.push(message);
                }
            } else {
                this.broadcast(message);
            }
        } catch (error) {
            console.error('Error handling message:', error);
            this.disconnectUser(userId, 'Protocol violation');
        }
    }

    private persistMessage(message: NetworkMessage): void {
        this.messageHistory.push(message);
        if (this.messageHistory.length > this.MAX_HISTORY) {
            this.messageHistory.shift();
        }
    }

    private broadcastToRoom(room: string, message: NetworkMessage): void {
        const members = this.rooms.get(room)?.members;
        if (!members) return;

        members.forEach(userId => {
            const client = this.clients.get(userId);
            if (client?.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }

    public joinRoom(userId: string, room: string): boolean {
        const userRoomCount = Array.from(this.rooms.values())
            .filter(r => r.members.has(userId)).length;

        if (userRoomCount >= this.MAX_ROOMS_PER_USER) {
            return false;
        }

        const roomData = this.rooms.get(room);
        if (roomData && roomData.members.size >= this.MAX_ROOM_MEMBERS) {
            return false;
        }

        if (!this.rooms.has(room)) {
            this.rooms.set(room, {
                id: room,
                name: room,
                description: '',
                members: new Set(),
                type: 'public',
                signals: [],
                history: []
            });
        }
        this.rooms.get(room)?.members.add(userId);
        return true;
    }

    public createRoom(name: string, type: 'public' | 'private'): string {
        const roomId = `room_${Date.now()}`;
        this.rooms.set(roomId, {
            id: roomId,
            name,
            description: '',
            members: new Set(),
            type,
            signals: [],
            history: []
        });
        return roomId;
    }

    public async shareTradeSignal(userId: string, room: string, signal: TradeSignal): Promise<void> {
        const message: NetworkMessage = {
            type: 'signal',
            from: userId,
            content: signal,
            timestamp: Date.now(),
            room
        };
        
        this.broadcastToRoom(room, message);
        const roomData = this.rooms.get(room);
        if (roomData) {
            roomData.signals.push(signal);
            roomData.history.push(message);
        }
    }

    public getUserProfile(userId: string): UserProfile | undefined {
        return this.users.get(userId);
    }

    public updateUserProfile(userId: string, profile: Partial<UserProfile>): void {
        const existing = this.users.get(userId) || {
            userId,
            username: userId,
            reputation: 0,
            joined: Date.now()
        };
        this.users.set(userId, { ...existing, ...profile });
    }

    public getRoomSignals(roomId: string): TradeSignal[] {
        return this.rooms.get(roomId)?.signals || [];
    }

    public getRoomHistory(roomId: string): NetworkMessage[] {
        return this.rooms.get(roomId)?.history || [];
    }

    private generateUserId(): string {
        return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private handleDisconnect(userId: string): void {
        this.clients.delete(userId);
        this.rooms.forEach(room => room.members.delete(userId));
    }

    private disconnectUser(userId: string, reason: string): void {
        const client = this.clients.get(userId);
        if (client) {
            client.close(1008, reason);
            this.handleDisconnect(userId);
        }
    }

    public cleanup(): void {
        this.clients.forEach(client => client.terminate());
        this.ws.close();
    }
}
