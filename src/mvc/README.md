# MVC Architecture

This folder contains the Model-View-Controller (MVC) implementation for the Web3 Crypto Streaming Service application.

## Architecture Overview

```
src/mvc/
  ├── models/      # Data structures and business logic
  ├── views/       # View connectors (bridge to Vue components)
  ├── controllers/ # Business logic and application flow
  └── core/        # MVC framework core components
```

## MVC in a Vue.js Context

While Vue.js typically follows an MVVM (Model-View-ViewModel) pattern, this MVC implementation provides:

1. **Models**: Pure data structures with validation and business rules
2. **Controllers**: Handle application logic and coordinate between models
3. **Views**: Bridge between MVC and Vue components

## Benefits

- Clear separation of concerns
- Improved testability
- More maintainable codebase
- Easier onboarding for new developers

## Usage Example

```typescript
// Import MVC components
import { StreamingModel } from '@/mvc/models/StreamingModel';
import { StreamingController } from '@/mvc/controllers/StreamingController';
import { useStreamingView } from '@/mvc/views/StreamingView';

// In a Vue component setup function
export default {
  setup() {
    // Connect to the MVC architecture
    const { state, startStream, stopStream } = useStreamingView();
    
    return {
      // Expose state and methods to the template
      activeStream: state.activeStream,
      streamingStats: state.stats,
      startStream,
      stopStream
    };
  }
}
```
