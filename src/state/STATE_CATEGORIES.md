# State Management Categories

This document outlines the state categorization system used in the Web3 Crypto Streaming Service platform.

## Core Categories

### 1. UI State (`ui/`)
- **Purpose**: Manages presentation and interaction state
- **Examples**: Dark mode preferences, sidebar state, modals, notifications, responsive layout state
- **Storage**: Client-side only, Pinia store, localStorage for persistence
- **Lifecycle**: Session-based with persistent user preferences

### 2. User State (`user/`)
- **Purpose**: Manages user data, profiles, and preferences
- **Examples**: User profiles, preferences, achievements, watch history
- **Storage**: Local cache with blockchain verification
- **Lifecycle**: Persisted between sessions with secure authentication

### 3. Blockchain State (`blockchain/`)
- **Purpose**: Manages wallet interactions and blockchain state
- **Subcategories**:
  - `wallet`: Connection status, addresses, balances
  - `contracts`: Smart contract interactions
  - `transactions`: Transaction history and status
  - `networks`: Network configuration and status
- **Storage**: Wallet providers, local cache
- **Lifecycle**: Connected session with off-chain caching

### 4. Content State (`content/`)
- **Purpose**: Manages content metadata, discovery, recommendations
- **Examples**: Content library, metadata, search indices, recommendations
- **Storage**: IPFS for metadata, local cache for performance
- **Lifecycle**: Long-lived with IPFS persistence

### 5. Streaming State (`streaming/`)
- **Purpose**: Manages active streaming sessions and payments
- **Examples**: Stream quality, payment channels, stream status
- **Storage**: In-memory with blockchain anchoring for payments
- **Lifecycle**: Active sessions only

### 6. System State (`system/`)
- **Purpose**: Manages application configuration and status
- **Examples**: Feature flags, API endpoints, system health
- **Storage**: Config files and environment variables
- **Lifecycle**: Application lifecycle

## Implementation Details

### State Access Patterns

1. **Component-Level State**: Use local `ref()` or `reactive()` for component-specific state
2. **Feature-Level State**: Use Pinia stores for feature-specific state
3. **Application-Level State**: Use centralized stores with appropriate categorization

### Data Flow

State mutation should follow unidirectional data flow:
- Actions → Mutations → State → Views

### State Storage Strategy

| Category   | In-Memory | localStorage | IndexedDB | Blockchain | IPFS  |
| ---------- | :-------: | :----------: | :-------: | :--------: | :---: |
| UI         |     ✓     |      ✓       |           |            |       |
| User       |     ✓     |      ✓       |     ✓     |     ✓      |       |
| Blockchain |     ✓     |              |           |     ✓      |       |
| Content    |     ✓     |              |     ✓     |     ✓      |   ✓   |
| Streaming  |     ✓     |              |           |     ✓      |       |
| System     |     ✓     |              |           |            |       |

### State Access Control

Each state category implements appropriate access control:
- **Public**: Anyone can read
- **Protected**: Only authenticated users can read
- **Private**: Only owner can read
- **Immutable**: Cannot be changed after creation
- **Mutable**: Can be updated by authorized users
