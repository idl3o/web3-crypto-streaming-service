# State Management System

This directory contains the organized state management system for the Web3 Crypto Streaming Service.

## Directory Structure

```
state/
├── index.ts             # Main entry point exporting all state categories
├── STATE_CATEGORIES.md  # Documentation of state categorization
├── ui/                  # UI-related state (theme, layout, UI components)
├── user/                # User profiles and preferences
├── blockchain/          # Blockchain interactions, wallet connections
│   ├── wallet.ts        # Wallet connection state
│   ├── contracts.ts     # Smart contract interactions
│   ├── transactions.ts  # Transaction tracking
│   └── networks.ts      # Network configuration
├── content/             # Content management and discovery
├── streaming/           # Streaming session management and payments
└── system/              # System configuration and operational state
    └── ConfigState.ts   # Application configuration
```

## Usage

Import state stores from their respective categories:

```typescript
// Use UI state for theme management
import { useUIStore } from '@/state/ui';

// Use blockchain state for wallet connections
import { useWalletStore } from '@/state/blockchain';

// Use content state for content library
import { useContentStore } from '@/state/content';
```

## Migration

We are gradually migrating from the flat `src/stores/` structure to this organized category-based approach. 
Legacy stores in `src/stores/` will continue to work during the transition.

## Best Practices

1. Import state from the appropriate category
2. Keep state mutations within their own category
3. Use actions for cross-category state updates
4. Document state dependencies between categories
5. Ensure unidirectional data flow (actions → mutations → state → views)
