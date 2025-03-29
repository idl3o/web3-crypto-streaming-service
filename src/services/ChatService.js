/**
 * Live Chat Service
 * 
 * Provides functionality for real-time chat interactions between users,
 * with support for token-gated access, chat rooms, and Web3 verification.
 */

import { optimizeComputation } from './OptimizationService';
import { EXECUTION_STRATEGIES, PRIORITY_LEVELS } from './ExecutionEngine';
import { ethers } from 'ethers';

// WebSocket connection
let chatSocket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000; // 3 seconds

// Chat state
const chatState = {
    connected: false,
    currentRoom: null,
    rooms: new Map(),
    messages: new Map(),
    users: new Map(),
    pendingMessages: [],
    userProfile: null
};

// Event listeners
const eventListeners = new Map();

/**
 * Message types
 */
export const MESSAGE_TYPE = {
    TEXT: 'text',
    SYSTEM: 'system',
    ACTION: 'action',
    TIP: 'tip',
    NFT: 'nft',
    TOKEN: 'token',
    MEDIA: 'media'
};

/**
 * User roles
 */
export const USER_ROLE = {
    GUEST: 'guest',
    USER: 'user',
    MODERATOR: 'moderator',
    ADMIN: 'admin',
    CREATOR: 'creator',
    VIP: 'vip'
};

/**
 * Initialize chat service
 * 
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Connection result
 */
export async function initializeChatService(options = {}) {
    console.log('Initializing Chat Service...');

    try {
        const url = options.url || getDefaultChatEndpoint();

        if (chatSocket) {
            // Close existing connection
            chatSocket.close();
        }

        // Set up user profile if provided
        if (options.userProfile) {
            chatState.userProfile = {
                ...options.userProfile,
                role: options.userProfile.role || USER_ROLE.GUEST
            };
        }

        // Create new connection
        await connectToChat(url);

        return {
            success: true,
            connected: chatState.connected
        };
    } catch (error) {
        console.error('Failed to initialize Chat Service:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Connect to chat server
 * 
 * @param {string} url - WebSocket URL
 * @returns {Promise<boolean>} Connection result
 */
async function connectToChat(url) {
    return new Promise((resolve, reject) => {
        try {
            chatSocket = new WebSocket(url);

            // Connection opened
            chatSocket.addEventListener('open', (event) => {
                console.log('Connected to chat server');
                chatState.connected = true;
                reconnectAttempts = 0;

                // Authenticate user if profile exists
                if (chatState.userProfile && chatState.userProfile.walletAddress) {
                    authenticateUser(chatState.userProfile);
                }

                // Send any pending messages
                if (chatState.pendingMessages.length > 0 && chatState.currentRoom) {
                    chatState.pendingMessages.forEach(msg => {
                        sendMessage(msg.content, msg.type, chatState.currentRoom, msg.options);
                    });
                    chatState.pendingMessages = [];
                }

                // Join previous room if any
                if (chatState.currentRoom) {
                    joinRoom(chatState.currentRoom);
                }

                // Trigger event
                triggerEvent('connect', { connected: true });

                resolve(true);
            });

            // Connection error
            chatSocket.addEventListener('error', (event) => {
                console.error('Chat connection error:', event);
                reject(new Error('Failed to connect to chat server'));
            });

            // Connection closed
            chatSocket.addEventListener('close', (event) => {
                console.log('Chat connection closed', event.code, event.reason);
                chatState.connected = false;

                // Attempt to reconnect
                if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts++;
                    console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

                    setTimeout(() => {
                        connectToChat(url).catch(err => {
                            console.error('Reconnect attempt failed:', err);
                        });
                    }, RECONNECT_INTERVAL * reconnectAttempts);
                }

                // Trigger event
                triggerEvent('disconnect', {
                    code: event.code,
                    reason: event.reason,
                    reconnecting: reconnectAttempts < MAX_RECONNECT_ATTEMPTS
                });
            });

            // Listen for messages
            chatSocket.addEventListener('message', handleIncomingMessage);

        } catch (error) {
            console.error('Error creating WebSocket connection:', error);
            reject(error);
        }
    });
}

/**
 * Authenticate user with server
 * 
 * @param {Object} profile - User profile information
 */
function authenticateUser(profile) {
    if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
        console.error('Cannot authenticate: Chat not connected');
        return;
    }

    const authMessage = {
        type: 'auth',
        data: {
            walletAddress: profile.walletAddress,
            username: profile.username || truncateAddress(profile.walletAddress),
            avatar: profile.avatar || '',
            signature: profile.signature || '',
            timestamp: Date.now()
        }
    };

    chatSocket.send(JSON.stringify(authMessage));
}

/**
 * Join a chat room
 * 
 * @param {string} roomId - Room identifier
 * @param {Object} options - Join options
 * @returns {boolean} Success status
 */
export function joinRoom(roomId, options = {}) {
    if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
        console.error('Cannot join room: Chat not connected');
        return false;
    }

    const joinMessage = {
        type: 'join',
        data: {
            roomId,
            options
        }
    };

    chatSocket.send(JSON.stringify(joinMessage));
    chatState.currentRoom = roomId;

    // Create room in state if it doesn't exist
    if (!chatState.rooms.has(roomId)) {
        chatState.rooms.set(roomId, {
            id: roomId,
            users: new Set(),
            lastActivity: Date.now()
        });
    }

    // Create message collection for this room if it doesn't exist
    if (!chatState.messages.has(roomId)) {
        chatState.messages.set(roomId, []);
    }

    return true;
}

/**
 * Leave a chat room
 * 
 * @param {string} roomId - Room to leave (defaults to current room)
 * @returns {boolean} Success status
 */
export function leaveRoom(roomId = null) {
    const targetRoom = roomId || chatState.currentRoom;

    if (!targetRoom) {
        console.error('No room specified to leave');
        return false;
    }

    if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
        console.error('Cannot leave room: Chat not connected');
        return false;
    }

    const leaveMessage = {
        type: 'leave',
        data: {
            roomId: targetRoom
        }
    };

    chatSocket.send(JSON.stringify(leaveMessage));

    // Clear current room if leaving current room
    if (targetRoom === chatState.currentRoom) {
        chatState.currentRoom = null;
    }

    return true;
}

/**
 * Send a message to the current room
 * 
 * @param {string} content - Message content
 * @param {string} type - Message type
 * @param {string} roomId - Target room (defaults to current room)
 * @param {Object} options - Additional options
 * @returns {boolean} Success status
 */
export function sendMessage(content, type = MESSAGE_TYPE.TEXT, roomId = null, options = {}) {
    const targetRoom = roomId || chatState.currentRoom;

    if (!targetRoom) {
        console.error('No room specified to send message to');
        return false;
    }

    if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
        console.log('Chat not connected, queuing message for later');
        chatState.pendingMessages.push({
            content,
            type,
            options
        });
        return false;
    }

    // Build message object
    const message = {
        type: 'message',
        data: {
            roomId: targetRoom,
            content,
            messageType: type,
            timestamp: Date.now(),
            options
        }
    };

    // Add message to local state with pending status
    const localMessage = {
        id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        content,
        type,
        sender: chatState.userProfile,
        timestamp: new Date().toISOString(),
        pending: true,
        options
    };

    addMessageToRoom(targetRoom, localMessage);

    // Send message
    chatSocket.send(JSON.stringify(message));
    return true;
}

/**
 * Get messages for a room
 * 
 * @param {string} roomId - Room to get messages for (defaults to current room)
 * @param {Object} options - Query options
 * @returns {Array} Messages in the room
 */
export function getMessages(roomId = null, options = {}) {
    const targetRoom = roomId || chatState.currentRoom;

    if (!targetRoom) {
        console.error('No room specified to get messages from');
        return [];
    }

    // Get messages from local state
    const messages = chatState.messages.get(targetRoom) || [];

    // Apply options
    let filteredMessages = [...messages];

    // Filter by type
    if (options.type) {
        filteredMessages = filteredMessages.filter(msg => msg.type === options.type);
    }

    // Filter by sender
    if (options.sender) {
        filteredMessages = filteredMessages.filter(msg =>
            msg.sender && msg.sender.walletAddress === options.sender
        );
    }

    // Apply limit
    if (options.limit && options.limit > 0) {
        filteredMessages = filteredMessages.slice(-options.limit);
    }

    return filteredMessages;
}

/**
 * Get active users in a room
 * 
 * @param {string} roomId - Room to get users for (defaults to current room)
 * @returns {Array} Users in the room
 */
export function getActiveUsers(roomId = null) {
    const targetRoom = roomId || chatState.currentRoom;

    if (!targetRoom) {
        console.error('No room specified to get users from');
        return [];
    }

    const room = chatState.rooms.get(targetRoom);
    if (!room) return [];

    // Convert user IDs to user objects
    const users = [];
    for (const userId of room.users) {
        const user = chatState.users.get(userId);
        if (user) {
            users.push(user);
        }
    }

    return users;
}

/**
 * Get available chat rooms
 * 
 * @param {Object} options - Filter options
 * @returns {Array} Available rooms
 */
export async function getAvailableRooms(options = {}) {
    if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
        console.error('Cannot get rooms: Chat not connected');
        return [];
    }

    // Request rooms from server
    const requestMessage = {
        type: 'get_rooms',
        data: { options }
    };

    chatSocket.send(JSON.stringify(requestMessage));

    // Return rooms from local state (will be updated when server responds)
    return Array.from(chatState.rooms.values());
}

/**
 * Disconnect from chat
 */
export function disconnect() {
    if (chatSocket) {
        chatSocket.close();
        chatSocket = null;
    }

    chatState.connected = false;
    chatState.currentRoom = null;
}

/**
 * Check if connected to chat
 * 
 * @returns {boolean} Connection status
 */
export function isConnected() {
    return chatState.connected;
}

/**
 * Check if user is in a specific room
 * 
 * @param {string} roomId - Room to check
 * @returns {boolean} Whether user is in the room
 */
export function isInRoom(roomId) {
    return chatState.currentRoom === roomId;
}

/**
 * Register an event listener
 * 
 * @param {string} event - Event name
 * @param {Function} callback - Callback function
 * @returns {Function} Unregister function
 */
export function onEvent(event, callback) {
    if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set());
    }

    eventListeners.get(event).add(callback);

    // Return unregister function
    return () => {
        const listeners = eventListeners.get(event);
        if (listeners) {
            listeners.delete(callback);
        }
    };
}

/**
 * Handle incoming WebSocket messages
 * 
 * @param {MessageEvent} event - WebSocket message event
 */
function handleIncomingMessage(event) {
    try {
        const message = JSON.parse(event.data);

        switch (message.type) {
            case 'message':
                handleChatMessage(message.data);
                break;
            case 'user_joined':
                handleUserJoined(message.data);
                break;
            case 'user_left':
                handleUserLeft(message.data);
                break;
            case 'room_update':
                handleRoomUpdate(message.data);
                break;
            case 'rooms_list':
                handleRoomsList(message.data);
                break;
            case 'error':
                handleError(message.data);
                break;
            default:
                console.log('Unknown message type:', message.type, message);
        }

    } catch (error) {
        console.error('Error handling incoming message:', error, event.data);
    }
}

/**
 * Handle chat message from server
 * 
 * @param {Object} data - Message data
 */
function handleChatMessage(data) {
    const { roomId, message } = data;

    // Add message to room
    addMessageToRoom(roomId, message);

    // Trigger event
    triggerEvent('message', { roomId, message });
}

/**
 * Handle user joined notification
 * 
 * @param {Object} data - Join data
 */
function handleUserJoined(data) {
    const { roomId, user } = data;

    // Add user to room
    const room = chatState.rooms.get(roomId);
    if (room) {
        room.users.add(user.id);
        room.lastActivity = Date.now();
    }

    // Add user to users map
    chatState.users.set(user.id, user);

    // Add system message
    const systemMessage = {
        id: `system-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        content: `${user.username} joined the room`,
        type: MESSAGE_TYPE.SYSTEM,
        timestamp: new Date().toISOString(),
        user: { id: 'system' }
    };

    addMessageToRoom(roomId, systemMessage);

    // Trigger event
    triggerEvent('user_joined', { roomId, user });
}

/**
 * Handle user left notification
 * 
 * @param {Object} data - Leave data
 */
function handleUserLeft(data) {
    const { roomId, userId } = data;

    // Remove user from room
    const room = chatState.rooms.get(roomId);
    if (room) {
        room.users.delete(userId);
        room.lastActivity = Date.now();
    }

    // Get user info
    const user = chatState.users.get(userId);

    // Add system message
    const systemMessage = {
        id: `system-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        content: `${user ? user.username : 'A user'} left the room`,
        type: MESSAGE_TYPE.SYSTEM,
        timestamp: new Date().toISOString(),
        user: { id: 'system' }
    };

    addMessageToRoom(roomId, systemMessage);

    // Trigger event
    triggerEvent('user_left', { roomId, userId });
}

/**
 * Handle room update notification
 * 
 * @param {Object} data - Room update data
 */
function handleRoomUpdate(data) {
    const { room } = data;

    // Update room in state
    chatState.rooms.set(room.id, {
        ...room,
        users: new Set(room.users),
        lastActivity: Date.now()
    });

    // Trigger event
    triggerEvent('room_update', { room });
}

/**
 * Handle rooms list response
 * 
 * @param {Object} data - Rooms data
 */
function handleRoomsList(data) {
    const { rooms } = data;

    // Update rooms in state
    rooms.forEach(room => {
        chatState.rooms.set(room.id, {
            ...room,
            users: new Set(room.users),
            lastActivity: Date.now()
        });
    });

    // Trigger event
    triggerEvent('rooms_list', { rooms });
}

/**
 * Handle error from server
 * 
 * @param {Object} data - Error data
 */
function handleError(data) {
    console.error('Chat server error:', data);

    // Trigger event
    triggerEvent('error', data);
}

/**
 * Add message to a room's history
 * 
 * @param {string} roomId - Room ID
 * @param {Object} message - Message object
 */
function addMessageToRoom(roomId, message) {
    if (!chatState.messages.has(roomId)) {
        chatState.messages.set(roomId, []);
    }

    const messages = chatState.messages.get(roomId);
    messages.push(message);

    // Limit message history size
    const MAX_MESSAGES = 100;
    if (messages.length > MAX_MESSAGES) {
        chatState.messages.set(roomId, messages.slice(-MAX_MESSAGES));
    }

    // Update room last activity
    const room = chatState.rooms.get(roomId);
    if (room) {
        room.lastActivity = Date.now();
    }
}

/**
 * Trigger an event for listeners
 * 
 * @param {string} eventName - Event name
 * @param {Object} data - Event data
 */
function triggerEvent(eventName, data) {
    const listeners = eventListeners.get(eventName);
    if (listeners) {
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${eventName} listener:`, error);
            }
        });
    }

    // Also trigger 'all' event
    const allListeners = eventListeners.get('all');
    if (allListeners) {
        allListeners.forEach(callback => {
            try {
                callback({ type: eventName, data });
            } catch (error) {
                console.error(`Error in 'all' listener:`, error);
            }
        });
    }
}

/**
 * Get default chat endpoint URL
 * 
 * @returns {string} WebSocket URL
 */
function getDefaultChatEndpoint() {
    // Check if running in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';

    return isDevelopment
        ? 'ws://localhost:8080/chat'
        : 'wss://api.web3streamingservice.com/chat';
}

/**
 * Create a truncated address for display
 * 
 * @param {string} address - Ethereum address
 * @returns {string} Truncated address
 */
function truncateAddress(address) {
    if (!address) return '';
    if (address.length < 10) return address;

    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Verify a user's token-gated access to a room
 * 
 * @param {string} walletAddress - User wallet address
 * @param {string} roomId - Room to check access for
 * @returns {Promise<boolean>} Access result
 */
export async function verifyRoomAccess(walletAddress, roomId) {
    try {
        // Simulate checking token-gated access
        // In a real implementation, this would check if the user has the required tokens
        await new Promise(resolve => setTimeout(resolve, 100));

        // For simulation, return true most of the time
        return Math.random() > 0.2; // 80% chance of access
    } catch (error) {
        console.error(`Error verifying room access for ${walletAddress}:`, error);
        return false;
    }
}

/**
 * Sign a message to verify wallet ownership
 * 
 * @param {string} message - Message to sign
 * @returns {Promise<string>} Signature
 */
export async function signAuthMessage(message) {
    try {
        // Check if window.ethereum is available
        if (!window.ethereum) {
            throw new Error('No wallet provider found');
        }

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();

        // Sign message
        const signature = await signer.signMessage(message);
        return signature;
    } catch (error) {
        console.error('Error signing message:', error);
        throw error;
    }
}

/**
 * Look up users by username or wallet address
 * 
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Matching users
 */
export async function lookupUsers(query, options = {}) {
    if (!query || query.trim().length < 2) {
        return []; // Require at least 2 characters
    }

    try {
        if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
            throw new Error('Chat not connected');
        }

        // Create a promise that will resolve when we get search results
        return new Promise((resolve, reject) => {
            const requestId = `lookup-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

            // Set up a one-time listener for the response
            const unregister = onEvent('search_results', (data) => {
                if (data.requestId === requestId) {
                    unregister(); // Remove the listener
                    resolve(data.users);
                }
            });

            // Set a timeout to prevent waiting forever
            const timeoutId = setTimeout(() => {
                unregister();
                reject(new Error('User lookup request timed out'));
            }, 5000);

            // Send the lookup request
            const lookupMessage = {
                type: 'lookup_users',
                data: {
                    query,
                    options,
                    requestId
                }
            };

            chatSocket.send(JSON.stringify(lookupMessage));

            // For demo/development, simulate a response
            setTimeout(() => {
                // This simulated response would come from the server in production
                triggerEvent('search_results', {
                    requestId,
                    users: simulateUserLookup(query)
                });

                clearTimeout(timeoutId);
            }, 300);
        });
    } catch (error) {
        console.error('Error looking up users:', error);

        // Fall back to local search even when disconnected (for demo)
        return simulateUserLookup(query);
    }
}

/**
 * Get user profile by ID
 * 
 * @param {string} userId - User ID or wallet address
 * @returns {Promise<Object>} User profile
 */
export async function getUserProfile(userId) {
    try {
        // Check local cache first
        if (chatState.users.has(userId)) {
            return chatState.users.get(userId);
        }

        // Simulate API call to fetch user profile
        await new Promise(resolve => setTimeout(resolve, 200));

        const user = {
            id: userId,
            username: userId.startsWith('0x') ? truncateAddress(userId) : userId,
            walletAddress: userId.startsWith('0x') ? userId : `0x${Math.random().toString(36).substring(2, 38)}`,
            avatar: null,
            joinedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
            role: Math.random() > 0.9 ? USER_ROLE.MODERATOR : USER_ROLE.USER,
            verified: Math.random() > 0.7
        };

        // Save to cache
        chatState.users.set(userId, user);

        return user;
    } catch (error) {
        console.error(`Error fetching user profile for ${userId}:`, error);
        throw error;
    }
}

// Simulate user lookup functionality for development/demo
function simulateUserLookup(query) {
    const lowercaseQuery = query.toLowerCase();

    // Mock user list
    const mockUsers = [
        { id: 'alice', username: 'alice', walletAddress: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', role: USER_ROLE.MODERATOR, verified: true },
        { id: 'bob', username: 'bob', walletAddress: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c', role: USER_ROLE.USER, verified: false },
        { id: 'charlie', username: 'charlie', walletAddress: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2', role: USER_ROLE.CREATOR, verified: true },
        { id: 'david', username: 'david', walletAddress: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3', role: USER_ROLE.USER, verified: false },
        { id: 'emma', username: 'emma', walletAddress: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4', role: USER_ROLE.VIP, verified: true },
        { id: 'luke', username: 'luke', walletAddress: '0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5', role: USER_ROLE.USER, verified: false },
        { id: 'luka', username: 'luka', walletAddress: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6', role: USER_ROLE.CREATOR, verified: true },
        { id: 'lucy', username: 'lucy', walletAddress: '0x8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7', role: USER_ROLE.ADMIN, verified: true },
        { id: 'lucas', username: 'lucas', walletAddress: '0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8', role: USER_ROLE.USER, verified: false },
        { id: 'lukasz', username: 'lukasz', walletAddress: '0x0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9', role: USER_ROLE.USER, verified: true }
    ];

    // Filter users by query
    return mockUsers.filter(user =>
        user.username.toLowerCase().includes(lowercaseQuery) ||
        user.walletAddress.toLowerCase().includes(lowercaseQuery)
    );
}

// Export chat service
export default {
    initializeChatService,
    joinRoom,
    leaveRoom,
    sendMessage,
    getMessages,
    getActiveUsers,
    getAvailableRooms,
    disconnect,
    isConnected,
    isInRoom,
    onEvent,
    MESSAGE_TYPE,
    USER_ROLE,
    verifyRoomAccess,
    signAuthMessage,
    lookupUsers,
    getUserProfile
};
