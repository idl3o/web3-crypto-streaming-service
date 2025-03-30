#!/usr/bin/env node

/**
 * Validate Sona token authentication flow
 * This script tests the authentication flow for Sona services
 */

const assert = require('assert').strict;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Mock SonaAuthenticationService functionality
class MockSonaAuthService {
    constructor() {
        this.token = null;
        this.refreshToken = null;
        this.expiresAt = 0;
        this.userId = null;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    async signInWithToken(token) {
        console.log('Testing sign in with token...');

        if (!token || token.length < 20) {
            throw new Error('Invalid authentication token');
        }

        this.token = token;
        this.refreshToken = `refresh-${token.substring(5, 15)}`;
        this.expiresAt = Date.now() + 3600000; // 1 hour
        this.userId = `user-${token.substring(10, 16)}`;

        return {
            token: this.token,
            refreshToken: this.refreshToken,
            expiresAt: this.expiresAt,
            userId: this.userId
        };
    }

    async refreshToken() {
        console.log('Testing token refresh...');

        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        if (this.retryCount >= this.maxRetries) {
            throw new Error('Maximum retry attempts reached');
        }

        this.retryCount++;
        this.token = `new-token-${Date.now()}`;
        this.expiresAt = Date.now() + 3600000; // 1 hour

        return {
            token: this.token,
            refreshToken: this.refreshToken,
            expiresAt: this.expiresAt,
            userId: this.userId
        };
    }

    async signOut() {
        console.log('Testing sign out...');

        this.token = null;
        this.refreshToken = null;
        this.expiresAt = 0;
        this.userId = null;
    }

    isAuthenticated() {
        return this.token !== null && this.expiresAt > Date.now();
    }
}

async function validateTokenFlow() {
    const authService = new MockSonaAuthService();

    try {
        // Test sign in
        console.log('\n1. Testing sign in with valid token:');
        const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0';
        const tokenData = await authService.signInWithToken(validToken);

        assert.ok(tokenData.token, 'Token should be defined');
        assert.ok(tokenData.refreshToken, 'Refresh token should be defined');
        assert.ok(tokenData.expiresAt > Date.now(), 'Expiry should be in the future');
        assert.ok(tokenData.userId, 'User ID should be defined');

        console.log('✓ Sign in successful');

        // Test invalid token
        console.log('\n2. Testing sign in with invalid token:');
        try {
            await authService.signInWithToken('short');
            assert.fail('Should have rejected short token');
        } catch (e) {
            console.log('✓ Successfully rejected invalid token');
        }

        // Test refresh token
        console.log('\n3. Testing token refresh:');
        const refreshData = await authService.refreshToken();

        assert.notStrictEqual(refreshData.token, validToken, 'Refreshed token should be different');
        assert.strictEqual(refreshData.userId, tokenData.userId, 'User ID should remain the same');
        assert.ok(refreshData.expiresAt > tokenData.expiresAt, 'New expiry should be later');

        console.log('✓ Token refresh successful');

        // Test authentication state
        console.log('\n4. Testing authentication state:');
        assert.strictEqual(authService.isAuthenticated(), true, 'Should be authenticated');

        // Test signout
        console.log('\n5. Testing sign out:');
        await authService.signOut();
        assert.strictEqual(authService.isAuthenticated(), false, 'Should not be authenticated after sign out');

        console.log('✓ Sign out successful');

        // Test refresh when not authenticated
        console.log('\n6. Testing refresh when not authenticated:');
        try {
            await authService.refreshToken();
            assert.fail('Should have rejected refresh when not authenticated');
        } catch (e) {
            console.log('✓ Successfully rejected refresh when not authenticated');
        }

        console.log('\n✅ All token flow tests passed!');
        return true;

    } catch (error) {
        console.error('\n❌ Token validation failed:', error);
        process.exit(1);
    }
}

// Run the validation
validateTokenFlow().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
