/**
 * Network Service
 * 
 * Provides networking capabilities for real-time communication,
 * peer-to-peer content delivery, and decentralized data synchronization.
 */

import { optimizeComputation } from './OptimizationService';
import { EXECUTION_STRATEGIES, PRIORITY_LEVELS } from './ExecutionEngine';

// Configuration constants
const CONFIG = {
    ICE_SERVERS: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ],
    RECONNECT_DELAY: 2000, // 2 seconds
    MAX_RECONNECT_ATTEMPTS: 5,
    PING_INTERVAL: 30000, // 30 seconds
    CONNECTION_TIMEOUT: 15000, // 15 seconds
    CHUNK_SIZE: 16384 // 16KB chunks for file transfer
};

// Connection states
export const CONNECTION_STATE = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
    ERROR: 'error'
};

// Network quality levels
export const NETWORK_QUALITY = {
    EXCELLENT: 'excellent',
    GOOD: 'good',
    FAIR: 'fair',
    POOR: 'poor',
    BAD: 'bad'
};

// Static map of active connections
const activeConnections = new Map();

// Singleton state for network service
let globalState = {
    connectionCount: 0,
    bytesReceived: 0,
    bytesSent: 0,
    connectionState: CONNECTION_STATE.DISCONNECTED,
    lastError: null,
    networkStats: {
        latency: null,
        packetLoss: 0,
        jitter: 0,
        bandwidth: {
            up: null,
            down: null
        }
    },
    peers: new Map(),
    signaling: null
};

// Event listeners
const eventListeners = {
    'connection-state': [],
    'peer-connected': [],
    'peer-disconnected': [],
    'data-received': [],
    'network-stats': []
};

/**
 * Initialize the network service
 * 
 * @param {Object} options Configuration options
 * @returns {Promise<void>}
 */
export async function initializeNetwork(options = {}) {
    console.log('Initializing NetworkService...');

    try {
        // Apply custom options
        const config = { ...CONFIG, ...options.config };

        // Create signaling connection
        if (options.signalingServer) {
            await connectToSignalingServer(options.signalingServer);
        }

        // Start network monitoring
        startNetworkMonitoring();

        // Set initial state
        updateConnectionState(CONNECTION_STATE.CONNECTED);

        console.log('NetworkService initialized successfully');
        return { success: true };
    } catch (error) {
        console.error('Failed to initialize NetworkService:', error);
        updateConnectionState(CONNECTION_STATE.ERROR, error);
        throw error;
    }
}

/**
 * Connect to a signaling server for peer discovery
 * 
 * @param {string} serverUrl Signaling server URL
 * @returns {Promise<void>}
 */
export async function connectToSignalingServer(serverUrl) {
    if (globalState.signaling && globalState.signaling.readyState !== WebSocket.CLOSED) {
        globalState.signaling.close();
    }

    return new Promise((resolve, reject) => {
        try {
            const ws = new WebSocket(serverUrl);

            ws.onopen = () => {
                console.log('Connected to signaling server');
                globalState.signaling = ws;
                resolve();
            };

            ws.onclose = (event) => {
                console.log(`Disconnected from signaling server: ${event.code} - ${event.reason}`);
                globalState.signaling = null;

                // Attempt reconnect
                handleSignalingDisconnect(serverUrl);
            };

            ws.onerror = (error) => {
                console.error('Signaling server error:', error);
                if (globalState.signaling === ws) {
                    globalState.signaling = null;
                }
                reject(error);
            };

            ws.onmessage = (event) => {
                handleSignalingMessage(JSON.parse(event.data));
            };
        } catch (error) {
            console.error('Error connecting to signaling server:', error);
            reject(error);
        }
    });
}

/**
 * Handle reconnection logic for signaling server
 * 
 * @param {string} serverUrl Signaling server URL
 */
function handleSignalingDisconnect(serverUrl) {
    let attempts = 0;
    const reconnector = setInterval(async () => {
        if (attempts >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
            clearInterval(reconnector);
            console.log('Max reconnection attempts reached');
            updateConnectionState(CONNECTION_STATE.DISCONNECTED);
            return;
        }

        if (globalState.signaling === null || globalState.signaling.readyState === WebSocket.CLOSED) {
            attempts++;
            console.log(`Attempting to reconnect to signaling server (${attempts}/${CONFIG.MAX_RECONNECT_ATTEMPTS})`);

            try {
                updateConnectionState(CONNECTION_STATE.RECONNECTING);
                await connectToSignalingServer(serverUrl);
                // If we get here, connection was successful
                clearInterval(reconnector);
                updateConnectionState(CONNECTION_STATE.CONNECTED);
            } catch (error) {
                console.error(`Reconnection attempt ${attempts} failed:`, error);
            }
        } else {
            // Already reconnected elsewhere
            clearInterval(reconnector);
        }
    }, CONFIG.RECONNECT_DELAY);
}

/**
 * Handle incoming messages from the signaling server
 * 
 * @param {Object} message The parsed message
 */
function handleSignalingMessage(message) {
    switch (message.type) {
        case 'peer-joined':
            console.log(`Peer joined: ${message.peerId}`);
            initiatePeerConnection(message.peerId);
            break;

        case 'peer-left':
            console.log(`Peer left: ${message.peerId}`);
            cleanupPeerConnection(message.peerId);
            break;

        case 'offer':
            handlePeerOffer(message.from, message.offer);
            break;

        case 'answer':
            handlePeerAnswer(message.from, message.answer);
            break;

        case 'ice-candidate':
            handleIceCandidate(message.from, message.candidate);
            break;

        case 'error':
            console.error('Signaling server error:', message.error);
            break;

        default:
            console.log('Unknown message type from signaling server:', message.type);
    }
}

/**
 * Send message through the signaling server
 * 
 * @param {Object} message Message to send
 * @returns {boolean} Success state
 */
function sendSignalingMessage(message) {
    if (!globalState.signaling || globalState.signaling.readyState !== WebSocket.OPEN) {
        console.error('Cannot send message: No active signaling connection');
        return false;
    }

    try {
        globalState.signaling.send(JSON.stringify(message));
        return true;
    } catch (error) {
        console.error('Error sending message to signaling server:', error);
        return false;
    }
}

/**
 * Initiate a new peer connection
 * 
 * @param {string} peerId The peer to connect to
 */
function initiatePeerConnection(peerId) {
    if (globalState.peers.has(peerId)) {
        console.log(`Already connected to peer ${peerId}`);
        return;
    }

    console.log(`Initiating connection to peer ${peerId}`);

    const peerConnection = new RTCPeerConnection({
        iceServers: CONFIG.ICE_SERVERS
    });

    // Setup data channel
    const dataChannel = peerConnection.createDataChannel('data');
    setupDataChannel(dataChannel, peerId);

    // Setup ICE handling
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignalingMessage({
                type: 'ice-candidate',
                to: peerId,
                from: getLocalPeerId(),
                candidate: event.candidate
            });
        }
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
        console.log(`ICE connection state with ${peerId}: ${peerConnection.iceConnectionState}`);

        if (peerConnection.iceConnectionState === 'failed' ||
            peerConnection.iceConnectionState === 'disconnected' ||
            peerConnection.iceConnectionState === 'closed') {
            cleanupPeerConnection(peerId);
        }
    };

    // Handle data channel events from remote peer
    peerConnection.ondatachannel = (event) => {
        console.log(`Received data channel from ${peerId}`);
        setupDataChannel(event.channel, peerId);
    };

    // Create and send offer
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            sendSignalingMessage({
                type: 'offer',
                to: peerId,
                from: getLocalPeerId(),
                offer: peerConnection.localDescription
            });
        })
        .catch(error => {
            console.error(`Error creating offer for ${peerId}:`, error);
            cleanupPeerConnection(peerId);
        });

    // Store the connection
    globalState.peers.set(peerId, {
        connection: peerConnection,
        dataChannel,
        state: 'connecting',
        stats: {
            bytesReceived: 0,
            bytesSent: 0,
            messagesReceived: 0,
            messagesSent: 0,
            latency: null,
            lastActivity: Date.now()
        }
    });
}

/**
 * Handle an offer from a remote peer
 * 
 * @param {string} peerId The peer ID
 * @param {RTCSessionDescriptionInit} offer The session description offer
 */
function handlePeerOffer(peerId, offer) {
    console.log(`Received offer from ${peerId}`);

    // Create new peer connection if it doesn't exist
    if (!globalState.peers.has(peerId)) {
        const peerConnection = new RTCPeerConnection({
            iceServers: CONFIG.ICE_SERVERS
        });

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignalingMessage({
                    type: 'ice-candidate',
                    to: peerId,
                    from: getLocalPeerId(),
                    candidate: event.candidate
                });
            }
        };

        // Handle connection state changes
        peerConnection.oniceconnectionstatechange = () => {
            console.log(`ICE connection state with ${peerId}: ${peerConnection.iceConnectionState}`);

            if (peerConnection.iceConnectionState === 'failed' ||
                peerConnection.iceConnectionState === 'disconnected' ||
                peerConnection.iceConnectionState === 'closed') {
                cleanupPeerConnection(peerId);
            }
        };

        // Handle data channel
        peerConnection.ondatachannel = (event) => {
            console.log(`Received data channel from ${peerId}`);
            setupDataChannel(event.channel, peerId);
        };

        // Store the connection
        globalState.peers.set(peerId, {
            connection: peerConnection,
            dataChannel: null, // Will be set when received
            state: 'connecting',
            stats: {
                bytesReceived: 0,
                bytesSent: 0,
                messagesReceived: 0,
                messagesSent: 0,
                latency: null,
                lastActivity: Date.now()
            }
        });
    }

    const peerData = globalState.peers.get(peerId);
    const peerConnection = peerData.connection;

    // Apply the offer and create answer
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => peerConnection.createAnswer())
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => {
            sendSignalingMessage({
                type: 'answer',
                to: peerId,
                from: getLocalPeerId(),
                answer: peerConnection.localDescription
            });
        })
        .catch(error => {
            console.error(`Error handling offer from ${peerId}:`, error);
            cleanupPeerConnection(peerId);
        });
}

/**
 * Handle an answer from a remote peer
 * 
 * @param {string} peerId The peer ID
 * @param {RTCSessionDescriptionInit} answer The session description answer
 */
function handlePeerAnswer(peerId, answer) {
    console.log(`Received answer from ${peerId}`);

    if (!globalState.peers.has(peerId)) {
        console.error(`Received answer from unknown peer ${peerId}`);
        return;
    }

    const peerData = globalState.peers.get(peerId);
    const peerConnection = peerData.connection;

    peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        .catch(error => {
            console.error(`Error handling answer from ${peerId}:`, error);
            cleanupPeerConnection(peerId);
        });
}

/**
 * Handle an ICE candidate from a remote peer
 * 
 * @param {string} peerId The peer ID
 * @param {RTCIceCandidate} candidate The ICE candidate
 */
function handleIceCandidate(peerId, candidate) {
    if (!globalState.peers.has(peerId)) {
        console.error(`Received ICE candidate from unknown peer ${peerId}`);
        return;
    }

    const peerData = globalState.peers.get(peerId);
    const peerConnection = peerData.connection;

    peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
        .catch(error => {
            console.error(`Error adding ICE candidate from ${peerId}:`, error);
        });
}

/**
 * Set up a data channel for peer communication
 * 
 * @param {RTCDataChannel} dataChannel The data channel to set up
 * @param {string} peerId The peer ID
 */
function setupDataChannel(dataChannel, peerId) {
    if (!globalState.peers.has(peerId)) {
        console.error(`Cannot setup data channel for unknown peer ${peerId}`);
        return;
    }

    const peerData = globalState.peers.get(peerId);

    // Update peer data
    peerData.dataChannel = dataChannel;

    // Set up data channel event listeners
    dataChannel.onopen = () => {
        console.log(`Data channel to ${peerId} opened`);
        peerData.state = 'connected';

        // Emit peer connected event
        emitEvent('peer-connected', { peerId });

        // Update global connection state
        updateConnectionCount();
    };

    dataChannel.onclose = () => {
        console.log(`Data channel to ${peerId} closed`);
        cleanupPeerConnection(peerId);
    };

    dataChannel.onerror = (error) => {
        console.error(`Data channel error with ${peerId}:`, error);
        cleanupPeerConnection(peerId);
    };

    dataChannel.onmessage = (event) => {
        handleDataChannelMessage(event, peerId);
    };
}

/**
 * Handle a message received over a data channel
 * 
 * @param {MessageEvent} event The message event
 * @param {string} peerId The peer ID
 */
function handleDataChannelMessage(event, peerId) {
    if (!globalState.peers.has(peerId)) {
        console.error(`Received message from unknown peer ${peerId}`);
        return;
    }

    const peerData = globalState.peers.get(peerId);
    const now = Date.now();

    // Update stats
    peerData.stats.lastActivity = now;
    peerData.stats.messagesReceived++;

    // Calculate data size
    let dataSize = 0;
    if (typeof event.data === 'string') {
        dataSize = event.data.length * 2; // Rough estimation for string
    } else if (event.data instanceof ArrayBuffer) {
        dataSize = event.data.byteLength;
    } else if (event.data instanceof Blob) {
        dataSize = event.data.size;
    }

    peerData.stats.bytesReceived += dataSize;
    globalState.bytesReceived += dataSize;

    // Parse message if it's a string
    if (typeof event.data === 'string') {
        try {
            const message = JSON.parse(event.data);

            // Handle system messages
            if (message.system) {
                handleSystemMessage(message, peerId);
                return;
            }

            // Emit data received event for application messages
            emitEvent('data-received', {
                peerId,
                data: message,
                timestamp: now
            });
        } catch (error) {
            console.error('Error parsing message from peer:', error);
        }
    } else {
        // Handle binary data
        emitEvent('data-received', {
            peerId,
            data: event.data,
            binary: true,
            timestamp: now
        });
    }
}

/**
 * Handle system messages
 * 
 * @param {Object} message The system message
 * @param {string} peerId The peer ID
 */
function handleSystemMessage(message, peerId) {
    switch (message.type) {
        case 'ping':
            // Send pong response
            sendToPeer(peerId, {
                system: true,
                type: 'pong',
                timestamp: Date.now(),
                pingTimestamp: message.timestamp
            });
            break;

        case 'pong':
            // Calculate latency
            if (message.pingTimestamp) {
                const latency = Date.now() - message.pingTimestamp;

                if (globalState.peers.has(peerId)) {
                    globalState.peers.get(peerId).stats.latency = latency;

                    // Update global stats
                    updateNetworkStats();
                }
            }
            break;

        case 'stats':
            // Update peer stats
            if (globalState.peers.has(peerId)) {
                const peerData = globalState.peers.get(peerId);
                peerData.remoteStats = message.stats;
            }
            break;

        default:
            console.log(`Unknown system message type: ${message.type}`);
    }
}

/**
 * Clean up a peer connection
 * 
 * @param {string} peerId The peer ID to clean up
 */
function cleanupPeerConnection(peerId) {
    if (!globalState.peers.has(peerId)) {
        return;
    }

    const peerData = globalState.peers.get(peerId);

    // Close data channel if it exists
    if (peerData.dataChannel) {
        peerData.dataChannel.close();
    }

    // Close RTCPeerConnection
    if (peerData.connection) {
        peerData.connection.close();
    }

    // Remove from peers map
    globalState.peers.delete(peerId);

    // Emit event
    emitEvent('peer-disconnected', { peerId });

    // Update connection count
    updateConnectionCount();
}

/**
 * Get a list of connected peers
 * 
 * @returns {Array<string>} Array of peer IDs
 */
export function getConnectedPeers() {
    const connectedPeers = [];

    for (const [peerId, peerData] of globalState.peers.entries()) {
        if (peerData.state === 'connected') {
            connectedPeers.push(peerId);
        }
    }

    return connectedPeers;
}

/**
 * Send data to a specific peer
 * 
 * @param {string} peerId Destination peer ID
 * @param {Object|ArrayBuffer|Blob} data Data to send
 * @returns {boolean} Success state
 */
export function sendToPeer(peerId, data) {
    if (!globalState.peers.has(peerId)) {
        console.error(`Cannot send to unknown peer ${peerId}`);
        return false;
    }

    const peerData = globalState.peers.get(peerId);

    if (peerData.state !== 'connected' || !peerData.dataChannel || peerData.dataChannel.readyState !== 'open') {
        console.error(`Cannot send to peer ${peerId}: not connected`);
        return false;
    }

    try {
        // Convert object to JSON string if needed
        if (typeof data === 'object' && !(data instanceof ArrayBuffer) && !(data instanceof Blob)) {
            data = JSON.stringify(data);
        }

        // Send the data
        peerData.dataChannel.send(data);

        // Update stats
        peerData.stats.messagesSent++;

        // Calculate data size
        let dataSize = 0;
        if (typeof data === 'string') {
            dataSize = data.length * 2; // Rough estimation for string
        } else if (data instanceof ArrayBuffer) {
            dataSize = data.byteLength;
        } else if (data instanceof Blob) {
            dataSize = data.size;
        }

        peerData.stats.bytesSent += dataSize;
        globalState.bytesSent += dataSize;
        peerData.stats.lastActivity = Date.now();

        return true;
    } catch (error) {
        console.error(`Error sending data to peer ${peerId}:`, error);
        return false;
    }
}

/**
 * Send data to all connected peers
 * 
 * @param {Object|ArrayBuffer|Blob} data Data to broadcast
 * @returns {Object} Results mapping peer IDs to success states
 */
export function broadcast(data) {
    const results = {};

    for (const peerId of getConnectedPeers()) {
        results[peerId] = sendToPeer(peerId, data);
    }

    return results;
}

/**
 * Send a large file to a peer in chunks
 * 
 * @param {string} peerId Destination peer ID
 * @param {Blob|File|ArrayBuffer} file The file to send
 * @param {Object} options Additional options
 * @returns {Promise<Object>} Transfer result
 */
export async function sendFileToPeer(peerId, file, options = {}) {
    if (!globalState.peers.has(peerId)) {
        throw new Error(`Cannot send file to unknown peer ${peerId}`);
    }

    const peerData = globalState.peers.get(peerId);

    if (peerData.state !== 'connected' || !peerData.dataChannel || peerData.dataChannel.readyState !== 'open') {
        throw new Error(`Cannot send file to peer ${peerId}: not connected`);
    }

    // Generate a transfer ID
    const transferId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get file metadata
    const fileSize = file instanceof Blob ? file.size : (file instanceof ArrayBuffer ? file.byteLength : 0);
    const chunkSize = options.chunkSize || CONFIG.CHUNK_SIZE;
    const fileName = file instanceof File ? file.name : options.fileName || 'unnamed-file';
    const fileType = file instanceof File ? file.type : options.fileType || '';

    // Send file metadata first
    sendToPeer(peerId, {
        system: true,
        type: 'file-start',
        transferId,
        fileName,
        fileType,
        fileSize,
        chunkSize,
        timestamp: Date.now()
    });

    // Wait a bit to ensure metadata is processed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Convert to ArrayBuffer if needed
    let buffer;
    if (file instanceof Blob) {
        buffer = await file.arrayBuffer();
    } else if (file instanceof ArrayBuffer) {
        buffer = file;
    } else {
        throw new Error('File must be a Blob, File, or ArrayBuffer');
    }

    // Split into chunks and send
    const totalChunks = Math.ceil(buffer.byteLength / chunkSize);
    let sentChunks = 0;

    for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, buffer.byteLength);
        const chunk = buffer.slice(start, end);

        // Create chunk metadata
        const metadata = {
            system: true,
            type: 'file-chunk',
            transferId,
            chunkIndex: i,
            lastChunk: i === totalChunks - 1,
            timestamp: Date.now()
        };

        // Send metadata
        sendToPeer(peerId, metadata);

        // Send binary chunk
        sendToPeer(peerId, chunk);

        sentChunks++;

        // If progress callback is provided, call it
        if (options.onProgress) {
            options.onProgress({
                transferId,
                sentChunks,
                totalChunks,
                progress: sentChunks / totalChunks
            });
        }

        // Small delay to prevent flooding
        await new Promise(resolve => setTimeout(resolve, 5));
    }

    // Send file end metadata
    sendToPeer(peerId, {
        system: true,
        type: 'file-end',
        transferId,
        totalChunks,
        timestamp: Date.now()
    });

    return {
        transferId,
        peerId,
        fileName,
        fileSize,
        sentChunks,
        totalChunks,
        success: sentChunks === totalChunks
    };
}

/**
 * Optimize data transmission based on network conditions
 * 
 * @param {string} peerId Target peer ID
 * @param {Object|ArrayBuffer|Blob} data Data to send
 * @param {Object} options Optimization options
 * @returns {Promise<boolean>} Success state
 */
export async function optimizedSend(peerId, data, options = {}) {
    // Get current network quality
    const networkQuality = getCurrentNetworkQuality();
    const peerQuality = getPeerNetworkQuality(peerId);

    // If network quality is bad, optimize the data
    if (networkQuality === NETWORK_QUALITY.POOR ||
        networkQuality === NETWORK_QUALITY.BAD ||
        peerQuality === NETWORK_QUALITY.POOR ||
        peerQuality === NETWORK_QUALITY.BAD) {

        // Use optimizeComputation for data optimization
        const optimizedData = await optimizeComputation(
            optimizeDataForNetwork,
            {
                params: { data, networkQuality, peerQuality },
                strategy: EXECUTION_STRATEGIES.IMMEDIATE,
                priority: PRIORITY_LEVELS.HIGH
            }
        );

        return sendToPeer(peerId, optimizedData);
    }

    // Otherwise, send as-is
    return sendToPeer(peerId, data);
}

/**
 * Get the current network quality level
 * 
 * @returns {string} Network quality level
 */
export function getCurrentNetworkQuality() {
    const stats = globalState.networkStats;

    // No stats available yet
    if (stats.latency === null) {
        return NETWORK_QUALITY.FAIR;
    }

    // Determine quality based on latency and packet loss
    if (stats.latency < 50 && stats.packetLoss < 0.01) {
        return NETWORK_QUALITY.EXCELLENT;
    } else if (stats.latency < 100 && stats.packetLoss < 0.03) {
        return NETWORK_QUALITY.GOOD;
    } else if (stats.latency < 200 && stats.packetLoss < 0.07) {
        return NETWORK_QUALITY.FAIR;
    } else if (stats.latency < 500 && stats.packetLoss < 0.15) {
        return NETWORK_QUALITY.POOR;
    } else {
        return NETWORK_QUALITY.BAD;
    }
}

/**
 * Get network quality for a specific peer
 * 
 * @param {string} peerId The peer ID
 * @returns {string} Network quality level
 */
function getPeerNetworkQuality(peerId) {
    if (!globalState.peers.has(peerId)) {
        return NETWORK_QUALITY.FAIR; // Default to fair if unknown
    }

    const peerStats = globalState.peers.get(peerId).stats;

    // No latency data yet
    if (peerStats.latency === null) {
        return NETWORK_QUALITY.FAIR;
    }

    // Determine quality based on latency
    if (peerStats.latency < 50) {
        return NETWORK_QUALITY.EXCELLENT;
    } else if (peerStats.latency < 100) {
        return NETWORK_QUALITY.GOOD;
    } else if (peerStats.latency < 200) {
        return NETWORK_QUALITY.FAIR;
    } else if (peerStats.latency < 500) {
        return NETWORK_QUALITY.POOR;
    } else {
        return NETWORK_QUALITY.BAD;
    }
}

/**
 * Optimize data for network conditions
 * 
 * @param {Object} params Parameters object
 * @param {Object|ArrayBuffer|Blob} params.data Data to optimize
 * @param {string} params.networkQuality Network quality level
 * @param {string} params.peerQuality Peer network quality level
 * @returns {Object|ArrayBuffer|Blob} Optimized data
 */
function optimizeDataForNetwork({ data, networkQuality, peerQuality }) {
    // If data is a string or already an object, parse/use it directly
    let jsonData;
    if (typeof data === 'string') {
        try {
            jsonData = JSON.parse(data);
        } catch (error) {
            // Not JSON, return as is
            return data;
        }
    } else if (typeof data === 'object' && !(data instanceof ArrayBuffer) && !(data instanceof Blob)) {
        jsonData = data;
    } else {
        // Binary data, can't optimize further
        return data;
    }

    // Don't optimize system messages
    if (jsonData.system) {
        return data;
    }

    // Create optimized version based on network quality
    const worstQuality = networkQuality === NETWORK_QUALITY.BAD || peerQuality === NETWORK_QUALITY.BAD
        ? NETWORK_QUALITY.BAD
        : (networkQuality === NETWORK_QUALITY.POOR || peerQuality === NETWORK_QUALITY.POOR
            ? NETWORK_QUALITY.POOR
            : NETWORK_QUALITY.FAIR);

    // Level of optimization (0 = none, 1 = full)
    let optimizationLevel = 0;

    switch (worstQuality) {
        case NETWORK_QUALITY.BAD:
            optimizationLevel = 1;
            break;
        case NETWORK_QUALITY.POOR:
            optimizationLevel = 0.7;
            break;
        case NETWORK_QUALITY.FAIR:
            optimizationLevel = 0.3;
            break;
        default:
            optimizationLevel = 0;
    }

    // If no optimization needed
    if (optimizationLevel === 0) {
        return data;
    }

    // Apply optimizations based on data content
    // This is a simple example - in real applications, this would be more sophisticated
    const optimized = { ...jsonData };

    // Example optimizations:
    // 1. Remove non-essential fields
    if (optimizationLevel > 0.5 && optimized.metadata) {
        delete optimized.metadata;
    }

    // 2. Truncate large text fields
    if (optimizationLevel > 0.3) {
        for (const key in optimized) {
            if (typeof optimized[key] === 'string' && optimized[key].length > 100) {
                optimized[key] = optimized[key].substring(0, 100) + '...';
            }
        }
    }

    // Add optimization metadata
    optimized._optimized = {
        level: optimizationLevel,
        quality: worstQuality,
        timestamp: Date.now()
    };

    return optimized;
}

/**
 * Start monitoring network conditions
 */
function startNetworkMonitoring() {
    // Ping all peers every PING_INTERVAL
    setInterval(() => {
        for (const peerId of getConnectedPeers()) {
            sendToPeer(peerId, {
                system: true,
                type: 'ping',
                timestamp: Date.now()
            });
        }
    }, CONFIG.PING_INTERVAL);

    // Update network stats every 5 seconds
    setInterval(updateNetworkStats, 5000);

    // Monitor for disconnected peers
    setInterval(checkForDisconnectedPeers, 10000);
}

/**
 * Check for disconnected peers
 */
function checkForDisconnectedPeers() {
    const now = Date.now();
    const timeout = CONFIG.CONNECTION_TIMEOUT;

    for (const [peerId, peerData] of globalState.peers.entries()) {
        if (peerData.state === 'connected' && now - peerData.stats.lastActivity > timeout) {
            console.log(`Peer ${peerId} timed out (${timeout}ms inactive)`);
            cleanupPeerConnection(peerId);
        }
    }
}

/**
 * Update network statistics
 */
function updateNetworkStats() {
    // Calculate average latency
    let totalLatency = 0;
    let peerCount = 0;

    for (const [_, peerData] of globalState.peers.entries()) {
        if (peerData.stats.latency !== null) {
            totalLatency += peerData.stats.latency;
            peerCount++;
        }
    }

    globalState.networkStats.latency = peerCount > 0 ? Math.round(totalLatency / peerCount) : null;

    // Emit network stats event
    emitEvent('network-stats', {
        ...globalState.networkStats,
        connectedPeers: globalState.connectionCount,
        bytesReceived: globalState.bytesReceived,
        bytesSent: globalState.bytesSent,
        timestamp: Date.now()
    });
}

/**
 * Update global connection count
 */
function updateConnectionCount() {
    let count = 0;

    for (const [_, peerData] of globalState.peers.entries()) {
        if (peerData.state === 'connected') {
            count++;
        }
    }

    globalState.connectionCount = count;
    updateConnectionState(count > 0 ? CONNECTION_STATE.CONNECTED : CONNECTION_STATE.DISCONNECTED);
}

/**
 * Update the connection state
 * 
 * @param {string} state New connection state
 * @param {Error} [error] Optional error
 */
function updateConnectionState(state, error = null) {
    if (state === CONNECTION_STATE.ERROR && error) {
        globalState.lastError = error;
    }

    if (globalState.connectionState !== state) {
        globalState.connectionState = state;

        // Emit connection state event
        emitEvent('connection-state', {
            state,
            error: error ? error.message : null,
            timestamp: Date.now()
        });
    }
}

/**
 * Get the current connection state
 * 
 * @returns {Object} Connection state info
 */
export function getConnectionState() {
    return {
        state: globalState.connectionState,
        peerCount: globalState.connectionCount,
        error: globalState.lastError ? globalState.lastError.message : null,
        networkStats: { ...globalState.networkStats },
        timestamp: Date.now()
    };
}

/**
 * Get the local peer ID
 * 
 * @returns {string} Local peer ID
 */
function getLocalPeerId() {
    // For this example, generate a random ID if not already generated
    if (!globalState.localPeerId) {
        globalState.localPeerId = `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    return globalState.localPeerId;
}

/**
 * Add an event listener
 * 
 * @param {string} eventName Event name to listen for
 * @param {Function} listener Listener function
 * @returns {Function} Function to remove the listener
 */
export function addEventListener(eventName, listener) {
    if (!eventListeners[eventName]) {
        eventListeners[eventName] = [];
    }

    eventListeners[eventName].push(listener);

    // Return function to remove this listener
    return () => {
        if (eventListeners[eventName]) {
            const index = eventListeners[eventName].indexOf(listener);
            if (index !== -1) {
                eventListeners[eventName].splice(index, 1);
            }
        }
    };
}

/**
 * Emit an event to all listeners
 * 
 * @param {string} eventName Event name
 * @param {Object} data Event data
 */
function emitEvent(eventName, data) {
    if (eventListeners[eventName]) {
        for (const listener of eventListeners[eventName]) {
            try {
                listener(data);
            } catch (error) {
                console.error(`Error in ${eventName} listener:`, error);
            }
        }
    }
}

/**
 * Clean up and disconnect from all peers
 */
export function disconnect() {
    // Close all peer connections
    for (const peerId of getConnectedPeers()) {
        cleanupPeerConnection(peerId);
    }

    // Close signaling connection
    if (globalState.signaling) {
        globalState.signaling.close();
        globalState.signaling = null;
    }

    updateConnectionState(CONNECTION_STATE.DISCONNECTED);
    console.log('NetworkService disconnected');
}

/**
 * Get network metrics for debugging
 * 
 * @returns {Object} Network metrics
 */
export function getNetworkMetrics() {
    const peerMetrics = {};

    for (const [peerId, peerData] of globalState.peers.entries()) {
        peerMetrics[peerId] = {
            state: peerData.state,
            connectionState: peerData.connection ? peerData.connection.iceConnectionState : 'unknown',
            dataChannelState: peerData.dataChannel ? peerData.dataChannel.readyState : 'unknown',
            stats: { ...peerData.stats },
            remoteStats: peerData.remoteStats || {}
        };
    }

    return {
        timestamp: Date.now(),
        connectionState: globalState.connectionState,
        connectionCount: globalState.connectionCount,
        bytesReceived: globalState.bytesReceived,
        bytesSent: globalState.bytesSent,
        networkQuality: getCurrentNetworkQuality(),
        networkStats: { ...globalState.networkStats },
        peers: peerMetrics
    };
}
