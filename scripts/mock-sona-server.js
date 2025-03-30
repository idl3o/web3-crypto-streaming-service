#!/usr/bin/env node

/**
 * Mock Sona server for testing purposes
 * This provides a test double for the Sona Streaming API
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.MOCK_SONA_PORT || 3030;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Mock data
const mockTokens = new Map();
const mockStreams = new Map();
let nextStreamId = 1000;

// Health endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'mock-sona-server' });
});

// Authentication
app.post('/auth/token', (req, res) => {
    const { token } = req.body;

    if (!token || token.length < 20) {
        return res.status(400).json({ error: 'Invalid token' });
    }

    const userId = `user-${token.substring(10, 16)}`;
    const expiresAt = Date.now() + 3600000; // 1 hour

    const authToken = {
        token: `mock-token-${Date.now()}`,
        refreshToken: `mock-refresh-${Date.now()}`,
        userId,
        expiresAt
    };

    mockTokens.set(authToken.token, authToken);

    res.json(authToken);
});

app.post('/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'Missing refresh token' });
    }

    // Find the original token
    let userId = null;
    for (const [_, authToken] of mockTokens.entries()) {
        if (authToken.refreshToken === refreshToken) {
            userId = authToken.userId;
            break;
        }
    }

    if (!userId) {
        return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const expiresAt = Date.now() + 3600000; // 1 hour

    const newAuthToken = {
        token: `mock-token-${Date.now()}`,
        refreshToken: `mock-refresh-${Date.now()}`,
        userId,
        expiresAt
    };

    mockTokens.set(newAuthToken.token, newAuthToken);

    res.json(newAuthToken);
});

// Streaming
app.post('/stream/start', (req, res) => {
    const { authorization } = req.headers;
    const token = authorization?.split(' ')[1];

    if (!token || !mockTokens.has(token)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { contentId, streamQuality, paymentAddress, paymentAmount, duration } = req.body;

    if (!contentId || !streamQuality || !paymentAddress || !paymentAmount || !duration) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    const streamId = `sona-${Date.now()}-${nextStreamId++}`;

    mockStreams.set(streamId, {
        contentId,
        streamQuality,
        paymentAddress,
        paymentAmount,
        duration,
        status: {
            isActive: false,
            bytesDelivered: 0,
            quality: streamQuality,
            paymentStatus: 'pending'
        },
        createdAt: Date.now()
    });

    res.json({ streamId });
});

app.get('/stream/:streamId/status', (req, res) => {
    const { authorization } = req.headers;
    const token = authorization?.split(' ')[1];

    if (!token || !mockTokens.has(token)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { streamId } = req.params;

    if (!mockStreams.has(streamId)) {
        return res.status(404).json({ error: 'Stream not found' });
    }

    const stream = mockStreams.get(streamId);

    res.json(stream.status);
});

app.post('/stream/:streamId/payment', (req, res) => {
    const { authorization } = req.headers;
    const token = authorization?.split(' ')[1];

    if (!token || !mockTokens.has(token)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { streamId } = req.params;

    if (!mockStreams.has(streamId)) {
        return res.status(404).json({ error: 'Stream not found' });
    }

    const stream = mockStreams.get(streamId);

    // Simulate successful payment
    stream.status.paymentStatus = 'confirmed';

    // Start the stream
    stream.status.isActive = true;
    stream.status.startTime = Date.now();
    stream.status.endTime = Date.now() + (stream.duration * 1000);

    mockStreams.set(streamId, stream);

    res.json({ success: true });
});

app.delete('/stream/:streamId', (req, res) => {
    const { authorization } = req.headers;
    const token = authorization?.split(' ')[1];

    if (!token || !mockTokens.has(token)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { streamId } = req.params;

    if (!mockStreams.has(streamId)) {
        return res.status(404).json({ error: 'Stream not found' });
    }

    const stream = mockStreams.get(streamId);
    stream.status.isActive = false;
    stream.status.endTime = Date.now();

    mockStreams.set(streamId, stream);

    res.json({ success: true });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Mock Sona server running on http://localhost:${PORT}`);
});
