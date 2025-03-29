# State Management Migration Guide

This document outlines the migration process from the flat store structure (`src/stores/`) to the categorized state architecture (`src/state/`).

## Current Status

We are transitioning from a flat organization where all state stores were in the `src/stores/` directory to a more organized, category-based approach in `src/state/`. This migration will improve code organization, make dependencies clearer, and facilitate better state management.

## Key Categories

- **UI State**: Presentation and UI component state
- **User State**: User profiles, preferences, and history
- **Blockchain State**: Wallet, contracts, transactions, and networks
- **Content State**: Content library, metadata, discovery
- **Streaming State**: Active streams, payments, streaming sessions
- **System State**: Configuration, meta-analysis, operational metrics

## Migration Strategy

### Phase 1: Backward Compatibility Layer (Current)

We've implemented a compatibility layer that:
- Re-exports existing stores from the new category-based structure
- Creates wrapper stores in the new location that use the existing implementations
- Ensures zero breaking changes for existing code

### Phase 2: Incremental Store Migration

For each store, follow these steps:

1. Create a new, well-designed store implementation in the appropriate category directory
2. Update the wrapper store to use the new implementation
3. Maintain the re-export for backward compatibility
4. Update documentation to reference the new location

### Phase 3: Codebase Updates

Once the new stores are in place:

1. Update imports throughout the codebase to reference the new locations
2. Remove usage of the legacy import paths
3. Add deprecation warnings to the legacy re-exports

### Phase 4: Cleanup

After all usage has been migrated:

1. Remove the backward compatibility layers
2. Remove legacy stores
3. Update documentation

## Migration Example

### Before Migration

```typescript
// Component code
import { useWalletStore } from '@/stores/wallet';

export default defineComponent({
  setup() {
    const walletStore = useWalletStore();
    // ...
  }
});
```

### During Migration

```typescript
// New import path
import { useWalletStore } from '@/state/blockchain';

export default defineComponent({
  setup() {
    const walletStore = useWalletStore();
    // ...
  }
});
```

### Migration Checklist

- [ ] UI State migration
- [ ] User State migration
- [ ] Blockchain State migration
  - [x] Wallet store wrapper created
  - [ ] Complete wallet store migration
  - [ ] Contracts store implementation
  - [ ] Transactions store implementation
  - [ ] Networks store implementation
- [ ] Content State migration
  - [x] Content store wrapper created
  - [ ] Complete content store migration
- [ ] Streaming State migration
  - [x] Streaming store wrapper created
  - [ ] Complete streaming store migration
- [ ] System State migration
  - [x] Config store implemented
  - [x] Meta store wrapper created
  - [ ] Complete meta store migration

## Notes for Developers

- Always import from the new locations (`@/state/...`)
- The compatibility layer ensures your code won't break
- When creating new components, use the new state architecture
- Follow the categorization guidelines in `STATE_CATEGORIES.md`
