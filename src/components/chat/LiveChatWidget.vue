<template>
    <div class="live-chat-widget" :class="[theme, {
        'expanded': isExpanded,
        'minimized': isMinimized,
        'connected': isConnected,
        'disconnected': !isConnected
    }]">
        <!-- Chat Header -->
        <div class="chat-header" @click="toggleMinimize">
            <div class="header-info">
                <div class="connection-status" :class="isConnected ? 'connected' : 'disconnected'"></div>
                <div class="header-title">
                    {{ currentRoom ? currentRoom : 'Live Chat' }}
                    <span class="user-count" v-if="activeUsers.length > 0">
                        {{ activeUsers.length }} online
                    </span>
                </div>
            </div>
            <div class="header-actions">
                <button class="action-button user-lookup-button" @click.stop="toggleUserLookup">
                    <i class="fas fa-users"></i>
                </button>
                <button class="action-button toggle-button" @click.stop="toggleExpand">
                    <i class="fas" :class="isExpanded ? 'fa-compress-alt' : 'fa-expand-alt'"></i>
                </button>
                <button class="action-button minimize-button" @click.stop="toggleMinimize">
                    <i class="fas" :class="isMinimized ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </button>
            </div>
        </div>

        <!-- Chat Body -->
        <div class="chat-body" v-show="!isMinimized">
            <!-- User Lookup Panel -->
            <div v-if="showUserLookup" class="user-lookup-panel">
                <user-lookup-component @select-user="handleUserSelect" @message-user="startDirectMessage"
                    @tip-user="tipUser" />
            </div>

            <!-- Room Selection -->
            <div class="room-selector" v-if="showRoomSelector && !showUserLookup">
                <select v-model="selectedRoom" @change="changeRoom">
                    <option v-for="room in availableRooms" :key="room.id" :value="room.id">
                        {{ room.name || room.id }} ({{ room.users ? room.users.size : 0 }})
                    </option>
                </select>
            </div>

            <!-- Messages Container -->
            <div class="messages-container" ref="messagesContainer" v-show="!showUserLookup">
                <div v-if="loading" class="loading-indicator">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Loading messages...</span>
                </div>

                <div v-else-if="messages.length === 0" class="empty-chat">
                    <i class="fas fa-comments"></i>
                    <p>No messages yet. Start the conversation!</p>
                </div>

                <div v-else class="messages-list">
                    <live-chat-message v-for="message in messages" :key="message.id" :message="message"
                        :current-user="userProfile" :verified-users="verifiedUsers" />
                </div>
            </div>

            <!-- User is typing indicator -->
            <div v-if="typingUsers.length > 0 && !showUserLookup" class="typing-indicator">
                {{ typingUsers.join(', ') }} {{ typingUsers.length === 1 ? 'is' : 'are' }} typing...
            </div>

            <!-- Message Input -->
            <div class="message-input" v-if="isConnected && !showUserLookup">
                <div v-if="!isAuthenticated" class="auth-prompt">
                    <button class="connect-wallet-btn" @click="connectWallet">
                        <i class="fas fa-wallet"></i>
                        Connect Wallet to Chat
                    </button>
                </div>
                <div v-else class="input-container">
                    <textarea ref="messageInput" v-model="newMessage" placeholder="Type your message..."
                        @keydown.enter.exact.prevent="sendMessage" @input="handleInput"></textarea>
                    <button class="send-button" :disabled="!newMessage.trim()" @click="sendMessage">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>

            <!-- Reconnect Prompt -->
            <div v-if="!isConnected && !showUserLookup" class="reconnect-prompt">
                <p>Chat disconnected</p>
                <button @click="reconnect" class="reconnect-button">
                    <i class="fas fa-sync"></i>
                    Reconnect
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch, inject } from 'vue';
import LiveChatMessage from './LiveChatMessage.vue';
import UserLookupComponent from './UserLookupComponent.vue';
import * as ChatService from '@/services/ChatService';

const props = defineProps({
    defaultRoom: {
        type: String,
        default: 'general'
    },
    autoConnect: {
        type: Boolean,
        default: true
    },
    walletConnected: {
        type: Boolean,
        default: false
    },
    walletAddress: {
        type: String,
        default: ''
    },
    username: {
        type: String,
        default: ''
    },
    expanded: {
        type: Boolean,
        default: false
    },
    minimized: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['connect-wallet', 'message-sent', 'room-changed', 'tip-user']);
const theme = inject('currentTheme', 'roman-theme');

// Refs
const messagesContainer = ref(null);
const messageInput = ref(null);
const isExpanded = ref(props.expanded);
const isMinimized = ref(props.minimized);
const selectedRoom = ref(props.defaultRoom);
const currentRoom = ref(null);
const messages = ref([]);
const newMessage = ref('');
const isConnected = ref(false);
const loading = ref(true);
const userProfile = ref(null);
const availableRooms = ref([]);
const activeUsers = ref([]);
const typingUsers = ref([]);
const verifiedUsers = ref(new Set());
const typingTimeout = ref(null);
const showRoomSelector = ref(true);
const showUserLookup = ref(false);

// Computed
const isAuthenticated = computed(() => {
    return !!userProfile.value && !!userProfile.value.walletAddress;
});

// Methods
async function initialize() {
    loading.value = true;

    try {
        // Initialize chat service
        const result = await ChatService.initializeChatService({
            userProfile: props.walletConnected ? {
                walletAddress: props.walletAddress,
                username: props.username || truncateAddress(props.walletAddress)
            } : null
        });

        isConnected.value = result.success;

        if (result.success) {
            // Set up event listeners
            setupEventListeners();

            // Join default room
            await joinRoom(props.defaultRoom);

            // Get user profile
            if (props.walletConnected) {
                userProfile.value = {
                    walletAddress: props.walletAddress,
                    username: props.username || truncateAddress(props.walletAddress)
                };
            }

            // Load available rooms
            loadAvailableRooms();
        }
    } catch (error) {
        console.error('Error initializing chat:', error);
    } finally {
        loading.value = false;
    }
}

function setupEventListeners() {
    // Connect event
    ChatService.onEvent('connect', handleConnect);

    // Disconnect event
    ChatService.onEvent('disconnect', handleDisconnect);

    // Message event
    ChatService.onEvent('message', handleMessage);

    // User joined event
    ChatService.onEvent('user_joined', handleUserJoined);

    // User left event
    ChatService.onEvent('user_left', handleUserLeft);

    // Room update event
    ChatService.onEvent('room_update', handleRoomUpdate);

    // Rooms list event
    ChatService.onEvent('rooms_list', handleRoomsList);

    // Error event
    ChatService.onEvent('error', handleError);
}

function handleConnect(data) {
    isConnected.value = true;

    // Join previously selected room if any
    if (selectedRoom.value && !currentRoom.value) {
        joinRoom(selectedRoom.value);
    }
}

function handleDisconnect(data) {
    isConnected.value = false;

    // If not reconnecting, clear current room
    if (!data.reconnecting) {
        currentRoom.value = null;
    }
}

function handleMessage(data) {
    // Only process messages for current room
    if (data.roomId !== currentRoom.value) return;

    // Add message to list
    messages.value.push(data.message);

    // Scroll to bottom
    scrollToBottom();

    // Handle typing indicator
    if (data.message.sender) {
        removeUserFromTyping(data.message.sender.username);
    }
}

function handleUserJoined(data) {
    // Only process for current room
    if (data.roomId !== currentRoom.value) return;

    // Update active users
    updateActiveUsers();
}

function handleUserLeft(data) {
    // Only process for current room
    if (data.roomId !== currentRoom.value) return;

    // Update active users
    updateActiveUsers();

    // Remove from typing users if they were typing
    const user = ChatService.getActiveUsers().find(u => u.id === data.userId);
    if (user) {
        removeUserFromTyping(user.username);
    }
}

function handleRoomUpdate(data) {
    // Update available rooms
    const index = availableRooms.value.findIndex(room => room.id === data.room.id);
    if (index !== -1) {
        availableRooms.value[index] = data.room;
    } else {
        availableRooms.value.push(data.room);
    }

    // Update active users if this is the current room
    if (data.room.id === currentRoom.value) {
        updateActiveUsers();
    }
}

function handleRoomsList(data) {
    availableRooms.value = data.rooms;
}

function handleError(data) {
    console.error('Chat error:', data);
    // Could show an error toast here
}

async function joinRoom(roomId) {
    if (!roomId) return;

    loading.value = true;

    try {
        // Check if user has token-gated access
        if (userProfile.value && userProfile.value.walletAddress) {
            const hasAccess = await ChatService.verifyRoomAccess(
                userProfile.value.walletAddress,
                roomId
            );

            if (!hasAccess) {
                // Handle no access
                console.warn(`No access to room ${roomId}`);
                loading.value = false;
                return;
            }
        }

        // Join room
        const success = ChatService.joinRoom(roomId);

        if (success) {
            currentRoom.value = roomId;
            selectedRoom.value = roomId;
            messages.value = ChatService.getMessages(roomId);
            updateActiveUsers();

            // Emit room change event
            emit('room-changed', roomId);
        }
    } catch (error) {
        console.error(`Error joining room ${roomId}:`, error);
    } finally {
        loading.value = false;
    }

    // Scroll to bottom after joining
    nextTick(scrollToBottom);
}

function changeRoom() {
    if (selectedRoom.value !== currentRoom.value) {
        joinRoom(selectedRoom.value);
    }
}

function loadAvailableRooms() {
    ChatService.getAvailableRooms().then(rooms => {
        availableRooms.value = rooms;
    });
}

function updateActiveUsers() {
    activeUsers.value = ChatService.getActiveUsers(currentRoom.value);

    // Update verified users set
    activeUsers.value.forEach(user => {
        if (user.verified) {
            verifiedUsers.value.add(user.walletAddress);
        }
    });
}

async function sendMessage() {
    // Don't send empty messages
    const message = newMessage.value.trim();
    if (!message || !isConnected.value || !currentRoom.value) return;

    // Send message
    const success = ChatService.sendMessage(
        message,
        ChatService.MESSAGE_TYPE.TEXT,
        currentRoom.value
    );

    if (success) {
        // Clear input
        newMessage.value = '';

        // Emit event
        emit('message-sent', {
            content: message,
            roomId: currentRoom.value,
            timestamp: new Date().toISOString()
        });

        // Focus input
        nextTick(() => {
            if (messageInput.value) {
                messageInput.value.focus();
            }
        });
    }
}

function toggleExpand() {
    isExpanded.value = !isExpanded.value;
}

function toggleMinimize() {
    isMinimized.value = !isMinimized.value;

    // If expanding, scroll to bottom
    if (!isMinimized.value) {
        nextTick(scrollToBottom);
    }
}

function scrollToBottom() {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
    });
}

function truncateAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

function connectWallet() {
    emit('connect-wallet');
}

async function reconnect() {
    await initialize();
}

function handleInput() {
    // Send typing indicator
    if (isAuthenticated.value && currentRoom.value) {
        // Send typing indicator (could implement in ChatService)
        // For now, we'll just use local state

        // Clear previous timeout
        if (typingTimeout.value) {
            clearTimeout(typingTimeout.value);
        }

        // Set new timeout to clear typing status after 3 seconds
        typingTimeout.value = setTimeout(() => {
            // Clear typing status
        }, 3000);
    }

    // Auto-resize textarea
    if (messageInput.value) {
        messageInput.value.style.height = 'auto';
        messageInput.value.style.height = `${messageInput.value.scrollHeight}px`;
    }
}

function addUserToTyping(username) {
    if (!typingUsers.value.includes(username)) {
        typingUsers.value.push(username);
    }
}

function removeUserFromTyping(username) {
    const index = typingUsers.value.indexOf(username);
    if (index !== -1) {
        typingUsers.value.splice(index, 1);
    }
}

/**
 * Toggle user lookup panel
 */
function toggleUserLookup() {
    showUserLookup.value = !showUserLookup.value;
}

/**
 * Handle user selection from lookup
 */
function handleUserSelect(user) {
    console.log('Selected user:', user);
    // You can show user profile or do something else with the selected user
}

/**
 * Start a direct message with user
 */
function startDirectMessage(user) {
    // Create or join a direct message room
    const dmRoomId = `dm-${user.id}`;
    joinRoom(dmRoomId);
    showUserLookup.value = false; // Close the lookup panel
}

/**
 * Send a tip to user
 */
function tipUser(user) {
    emit('tip-user', {
        recipient: user,
        roomId: currentRoom.value
    });
}

// Watch for wallet connection changes
watch(() => props.walletConnected, (newVal, oldVal) => {
    if (newVal && !oldVal) {
        // Wallet was just connected
        userProfile.value = {
            walletAddress: props.walletAddress,
            username: props.username || truncateAddress(props.walletAddress)
        };

        // Re-initialize chat
        initialize();
    } else if (!newVal && oldVal) {
        // Wallet was disconnected
        userProfile.value = null;
    }
});

// Watch for changes to wallet address
watch(() => props.walletAddress, (newVal, oldVal) => {
    if (newVal && newVal !== oldVal && props.walletConnected) {
        userProfile.value = {
            walletAddress: newVal,
            username: props.username || truncateAddress(newVal)
        };

        // Re-initialize chat
        initialize();
    }
});

// Watch for changes to username
watch(() => props.username, (newVal, oldVal) => {
    if (newVal !== oldVal && props.walletConnected && userProfile.value) {
        userProfile.value.username = newVal || truncateAddress(props.walletAddress);
    }
});

// Lifecycle hooks
onMounted(() => {
    if (props.autoConnect) {
        initialize();
    }
});

onUnmounted(() => {
    // Disconnect from chat
    ChatService.disconnect();

    // Clear typing timeout if any
    if (typingTimeout.value) {
        clearTimeout(typingTimeout.value);
    }
});
</script>

<style scoped>
.live-chat-widget {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 350px;
    height: 500px;
    display: flex;
    flex-direction: column;
    background-color: #ffffff;
    border-radius: 12px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    z-index: 1000;
    overflow: hidden;
}

.live-chat-widget.expanded {
    width: 450px;
    height: 600px;
}

.live-chat-widget.minimized {
    height: 50px;
}

.chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #4a4a4a;
    color: white;
    padding: 12px 16px;
    cursor: pointer;
}

.header-info {
    display: flex;
    align-items: center;
    gap: 8px;
}

.connection-status {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 5px;
}

.connection-status.connected {
    background-color: #4CAF50;
    box-shadow: 0 0 5px #4CAF50;
}

.connection-status.disconnected {
    background-color: #F44336;
    box-shadow: 0 0 5px #F44336;
}

.header-title {
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
}

.user-count {
    font-size: 0.8rem;
    opacity: 0.8;
    background: rgba(255, 255, 255, 0.2);
    padding: 2px 6px;
    border-radius: 10px;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.action-button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 4px;
    font-size: 0.9rem;
    opacity: 0.8;
    transition: opacity 0.2s;
}

.action-button:hover {
    opacity: 1;
}

.chat-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: calc(100% - 50px);
    overflow: hidden;
}

.room-selector {
    padding: 10px;
    border-bottom: 1px solid #f0f0f0;
}

.room-selector select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background-color: white;
}

.messages-container {
    flex: 1;
    padding: 15px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #d4d4d4 #f1f1f1;
}

.messages-container::-webkit-scrollbar {
    width: 6px;
}

.messages-container::-webkit-scrollbar-track {
    background: #f1f1f1;
}

.messages-container::-webkit-scrollbar-thumb {
    background-color: #d4d4d4;
    border-radius: 3px;
}

.loading-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #888;
    gap: 10px;
}

.empty-chat {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #888;
    text-align: center;
}

.empty-chat i {
    font-size: 2rem;
    margin-bottom: 10px;
    opacity: 0.5;
}

.messages-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.typing-indicator {
    padding: 5px 15px;
    font-size: 0.8rem;
    font-style: italic;
    color: #888;
    border-top: 1px solid #f0f0f0;
}

.message-input {
    padding: 10px;
    border-top: 1px solid #f0f0f0;
}

.auth-prompt {
    display: flex;
    justify-content: center;
}

.connect-wallet-btn {
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 10px 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    transition: background-color 0.2s;
}

.connect-wallet-btn:hover {
    background-color: #3d9140;
}

.input-container {
    display: flex;
    gap: 10px;
}

.input-container textarea {
    flex: 1;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    resize: none;
    min-height: 40px;
    max-height: 120px;
    font-family: inherit;
    font-size: 0.95rem;
}

.send-button {
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 6px;
    width: 40px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.send-button:hover:not(:disabled) {
    background-color: #3d9140;
}

.send-button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

.reconnect-prompt {
    padding: 15px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
}

.reconnect-prompt p {
    color: #F44336;
    margin: 0;
}

.reconnect-button {
    background-color: #2196F3;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background-color 0.2s;
}

.reconnect-button:hover {
    background-color: #0d8bf2;
}

/* Roman theme */
.live-chat-widget.roman-theme .chat-header {
    background-color: var(--primary-color, #8B4513);
}

.live-chat-widget.roman-theme .connect-wallet-btn {
    background-color: var(--primary-color, #8B4513);
}

.live-chat-widget.roman-theme .connect-wallet-btn:hover {
    background-color: var(--primary-dark-color, #704012);
}

.live-chat-widget.roman-theme .send-button {
    background-color: var(--primary-color, #8B4513);
}

.live-chat-widget.roman-theme .send-button:hover:not(:disabled) {
    background-color: var(--primary-dark-color, #704012);
}

/* Add styles for user lookup button and panel */
.user-lookup-button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 4px;
    font-size: 0.9rem;
    opacity: 0.8;
    transition: opacity 0.2s;
}

.user-lookup-button:hover {
    opacity: 1;
}

.user-lookup-panel {
    padding: 15px;
    border-bottom: 1px solid #f0f0f0;
}

/* Responsive design for mobile */
@media (max-width: 576px) {
    .live-chat-widget {
        width: calc(100% - 20px);
        right: 10px;
        bottom: 10px;
        height: 400px;
    }

    .live-chat-widget.expanded {
        width: calc(100% - 20px);
        height: 80vh;
    }
}
</style>
