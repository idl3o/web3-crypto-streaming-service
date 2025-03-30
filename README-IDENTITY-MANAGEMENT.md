# Web3 Identity Management

This document explains the identity management system used in the Web3 Crypto Streaming Service.

## Overview

The identity management system provides:

- Web3 wallet authentication (MetaMask, WalletConnect)
- Traditional authentication mechanisms (email, social)
- Guest access for quick onboarding
- NFT-based authorization for premium content
- Identity verification levels

## Components

### IdentityManager

The core service that manages user identities, wallet connections, and verification states.

```typescript
import { identityManager, IdentityProvider } from './services/IdentityManager';

// Connect with MetaMask
const identity = await identityManager.connect({
  provider: IdentityProvider.METAMASK
});

// Check current identity
const currentUser = identityManager.getCurrentIdentity();

// Disconnect
await identityManager.disconnect();
```

### AuthService

Builds on the IdentityManager to provide session management and authentication events.

```typescript
import { authService } from './services/AuthService';

// Login
await authService.login(IdentityProvider.METAMASK);

// Check authentication
const isLoggedIn = authService.isAuthenticated();

// Get current user
const user = authService.getCurrentUser();

// Logout
await authService.logout();
```

## Identity Providers

The system supports multiple identity providers:

- **MetaMask**: Connect using the MetaMask browser extension
- **WalletConnect**: Connect using the WalletConnect protocol
- **Email**: Traditional email/password authentication
- **Social**: OAuth authentication via social providers
- **NFT**: Authentication based on NFT ownership
- **Guest**: Temporary anonymous access

## Verification Levels

Users can have different verification levels:

- **None (0)**: Unverified user (guest access)
- **Basic (1)**: Basic verification (wallet connected)
- **Verified (2)**: Enhanced verification (email verified, KYC)
- **Premium (3)**: Premium verification (NFT ownership)

## Usage Examples

### Connecting a Wallet

```typescript
import { authService } from './services/AuthService';
import { IdentityProvider } from './services/IdentityManager';

try {
  // Connect with MetaMask
  const user = await authService.login(IdentityProvider.METAMASK);
  console.log(`Connected as ${user.displayName}`);
} catch (error) {
  console.error('Failed to connect wallet:', error);
}
```

### Checking NFT Access

```typescript
import { identityManager, VerificationLevel } from './services/IdentityManager';

function checkPremiumAccess(userId: string): boolean {
  const level = identityManager.getVerificationLevel(userId);
  return level >= VerificationLevel.PREMIUM;
}
```

### Listen for Authentication Events

```typescript
import { authService } from './services/AuthService';

authService.on('authenticated', (data) => {
  console.log(`User ${data.userId} authenticated`);
});

authService.on('logout', (data) => {
  console.log(`User ${data.userId} logged out`);
});
```

## Extending the System

To add a new identity provider:

1. Add the provider to the `IdentityProvider` enum
2. Implement a connection method in `IdentityManager`
3. Update the `connect` method to handle the new provider

## Security Considerations

- All wallet connections require signature verification
- Sessions expire automatically based on provider type
- Guest sessions have shorter expiration times
- Premium verification requires cryptographic proof
