# Web3 Crypto Streaming Service Repository Index

This document provides a comprehensive index of all components and files in the Web3 Crypto Streaming Service project, organized by category for easier navigation.

## Table of Contents

- [Core Application Files](#core-application-files)
- [Views](#views)
- [Components](#components)
  - [Analytics Components](#analytics-components)
  - [Content Components](#content-components)
  - [Project Components](#project-components)
  - [Investment Components](#investment-components)
  - [Press Components](#press-components)
  - [Music Components](#music-components)
  - [Gamification Components](#gamification-components)
  - [Safety Components](#safety-components)
  - [Factual Components](#factual-components)
  - [Bridges Components](#bridges-components)
  - [Hologram Components](#hologram-components)
  - [Precog Components](#precog-components)
- [Services](#services)
- [Router and Navigation](#router-and-navigation)
- [Styles and Assets](#styles-and-assets)

## Core Application Files

| File                   | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| [main.js](src/main.js) | Application entry point, initializes Vue app and core services   |
| [App.vue](src/App.vue) | Root component that contains the application layout              |
| [main.htm](main.htm)   | HTML entry point with Web3 initialization and loading indicators |

## Views

These files represent the main pages of the application.

| View                                                           | Description                                                |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| [HomeView.vue](src/views/HomeView.vue)                         | Landing page with featured content and platform highlights |
| [ContentView.vue](src/views/ContentView.vue)                   | Content browsing and discovery interface                   |
| [MetricsView.vue](src/views/MetricsView.vue)                   | Performance metrics and analytics dashboard                |
| [InvestmentView.vue](src/views/InvestmentView.vue)             | Investment management and portfolio tracking               |
| [AchievementsView.vue](src/views/AchievementsView.vue)         | User achievements and gamification progress                |
| [RewardsView.vue](src/views/RewardsView.vue)                   | Token rewards and incentives management                    |
| [TranscendentalDjView.vue](src/views/TranscendentalDjView.vue) | Transcendental EDM DJ experiences and sessions             |

## Components

### Analytics Components

| Component                                                               | Description                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| [YearToDateMetrics.vue](src/components/analytics/YearToDateMetrics.vue) | Displays year-to-date performance metrics with visualizations |

### Content Components

| Component                                                                     | Description                                 |
| ----------------------------------------------------------------------------- | ------------------------------------------- |
| [ContentCard.vue](src/components/content/ContentCard.vue)                     | Card component for displaying content items |
| [ForkStreamDialog.vue](src/components/content/ForkStreamDialog.vue)           | Dialog for forking content streams          |
| [TestimonialDialog.vue](src/components/content/TestimonialDialog.vue)         | Dialog for user testimonials about content  |
| [DependencyUnityDialog.vue](src/components/content/DependencyUnityDialog.vue) | Dialog for managing content dependencies    |
| [TheaterModeViewer.vue](src/components/content/TheaterModeViewer.vue)         | Immersive content viewing experience        |
| [ContentHologram.vue](src/components/content/ContentHologram.vue)             | Holographic content representation          |

### Project Components

| Component                                                 | Description                                      |
| --------------------------------------------------------- | ------------------------------------------------ |
| [ProjectCard.vue](src/components/project/ProjectCard.vue) | Card component for displaying community projects |

### Investment Components

| Component                                                                    | Description                             |
| ---------------------------------------------------------------------------- | --------------------------------------- |
| [InvestmentPortfolio.vue](src/components/investment/InvestmentPortfolio.vue) | Portfolio management interface          |
| [InvestButton.vue](src/components/investment/InvestButton.vue)               | Button component for investment actions |

### Press Components

| Component                                                         | Description                                  |
| ----------------------------------------------------------------- | -------------------------------------------- |
| [PressReleaseCard.vue](src/components/press/PressReleaseCard.vue) | Card component for displaying press releases |

### Music Components

| Component                                                                     | Description                                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [TranscendentalDjCard.vue](src/components/music/TranscendentalDjCard.vue)     | Card component for displaying transcendental DJ profiles      |
| [DjSessionVisualization.vue](src/components/music/DjSessionVisualization.vue) | Interactive visualization for DJ sessions with audio controls |

### Gamification Components

| Component                                                                    | Description                                    |
| ---------------------------------------------------------------------------- | ---------------------------------------------- |
| [GamificationModule.vue](src/components/gamification/GamificationModule.vue) | Gamification elements and achievement tracking |

### Safety Components

| Component                                                                                | Description                                 |
| ---------------------------------------------------------------------------------------- | ------------------------------------------- |
| [SafeModeToggle.vue](src/components/safety/SafeModeToggle.vue)                           | Toggle for enabling/disabling safe mode     |
| [ContentSafetyBadge.vue](src/components/safety/ContentSafetyBadge.vue)                   | Badge indicating content safety level       |
| [SafeTransactionConfirmation.vue](src/components/safety/SafeTransactionConfirmation.vue) | Confirmation dialog for secure transactions |

### Factual Components

| Component                                                         | Description                               |
| ----------------------------------------------------------------- | ----------------------------------------- |
| [FactualityBadge.vue](src/components/factual/FactualityBadge.vue) | Badge indicating content factual accuracy |

### Bridges Components

| Component                                                           | Description                            |
| ------------------------------------------------------------------- | -------------------------------------- |
| [PortPlanckBridge.vue](src/components/bridges/PortPlanckBridge.vue) | Bridge for cross-chain token transfers |

### Hologram Components

| Component                                                        | Description                            |
| ---------------------------------------------------------------- | -------------------------------------- |
| [HologramViewer.vue](src/components/hologram/HologramViewer.vue) | Interactive holographic content viewer |

### Precog Components

| Component                                                                | Description                         |
| ------------------------------------------------------------------------ | ----------------------------------- |
| [PrecogVisualization.vue](src/components/precog/PrecogVisualization.vue) | Predictive content visualization    |
| [PrecogInsightCard.vue](src/components/precog/PrecogInsightCard.vue)     | Card displaying predictive insights |

## Services

Backend services powering the application logic.

| Service                                                                         | Description                                                           |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [MetricsService.js](src/services/MetricsService.js)                             | Provides metrics and analytics functionality                          |
| [TokenService.js](src/services/TokenService.js)                                 | Manages platform tokens, creator tokens, and NFT operations           |
| [ExecutionEngine.js](src/services/ExecutionEngine.js)                           | High-performance execution for computation-heavy tasks                |
| [OptimizationService.js](src/services/OptimizationService.js)                   | Performance optimization for computation-intensive tasks              |
| [TransactionProcessingService.js](src/services/TransactionProcessingService.js) | High-performance transaction processing and batching                  |
| [EvaluationService.js](src/services/EvaluationService.js)                       | Evaluation capabilities for content and investments                   |
| [OpenParkService.js](src/services/OpenParkService.js)                           | Community space functionality for discovery and collaboration         |
| [PressReleaseService.js](src/services/PressReleaseService.js)                   | Press release management and distribution                             |
| [MusicStreamingService.js](src/services/MusicStreamingService.js)               | Provides functionality for transcendental EDM.DJ streaming experience |
| [PrecogEngine.js](src/services/PrecogEngine.js)                                 | Predictive analytics for content performance                          |
| [SafetyService.js](src/services/SafetyService.js)                               | Content safety and user protection                                    |
| [FactCheckService.js](src/services/FactCheckService.js)                         | Content fact-checking and verification                                |
| [TardisEmdriveService.js](src/services/TardisEmdriveService.js)                 | Temporal processing for content scheduling                            |

## Router and Navigation

| File                            | Description                                    |
| ------------------------------- | ---------------------------------------------- |
| [index.js](src/router/index.js) | Vue Router configuration and route definitions |

## Styles and Assets

| File                 | Description                                   |
| -------------------- | --------------------------------------------- |
| [main.htm](main.htm) | Contains global CSS variables and base styles |

---

## Component Relationships

### Core Platform Flow

```
App.vue
  ├─ HomeView.vue
  │   ├─ ContentCard.vue
  │   └─ GamificationModule.vue
  ├─ ContentView.vue
  │   ├─ ContentCard.vue
  │   ├─ TheaterModeViewer.vue
  │   └─ ContentSafetyBadge.vue
  └─ MetricsView.vue
      └─ YearToDateMetrics.vue
```

### Music Experience Flow

```
TranscendentalDjView.vue
  ├─ TranscendentalDjCard.vue
  └─ DjSessionVisualization.vue
```

### Investment Flow

```
InvestmentView.vue
  ├─ InvestmentPortfolio.vue
  ├─ InvestButton.vue
  └─ YearToDateMetrics.vue (investment metrics)
```

### Content Creation Flow

```
ContentView.vue
  ├─ ContentCard.vue
  ├─ ForkStreamDialog.vue
  ├─ TestimonialDialog.vue
  └─ DependencyUnityDialog.vue
```

### Community Project Flow

```
OpenParkService.js
  └─ ProjectCard.vue
```

### Press Release Flow

```
PressReleaseService.js
  └─ PressReleaseCard.vue
```

---

## Service Dependencies

```
ExecutionEngine.js ◄── OptimizationService.js ◄── Other Services
                                                   (MetricsService.js,
                                                    TokenService.js, 
                                                    TransactionProcessingService.js,
                                                    MusicStreamingService.js, etc.)
```

This document will be updated as the project evolves.
