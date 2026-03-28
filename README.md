# Public Code Samples

This repository contains selected and cleaned-up code extracts from larger private projects I developed.

Most of my work cannot be shared publicly, so this repository focuses on representative modules that demonstrate:
- backend service design
- real-time runtime orchestration
- frontend state coordination
- asynchronous workflow handling
- maintainable code organization across different product contexts

## Included projects

trading-project/

    backtest-service/
        controllers/
          backtestController.js
        services/
          backtestService.js
        utils/
          backtestUtils.js
          taskManager.js

    frontend-backtest/
        pages/
          Backtest.jsx
        hooks/
          useBacktestTask.js
        utils/
          backtestResults.js

    realtime-engine/
        managers/
          StateManager.js
        services/
          realtimeService.js

    messaging-project/
        routes/
          conversationRoutes.js
        services/
          conversationService.js

    streaming-project/
        video-player/
          VideoPlayer.js

## trading-project

Extracts from a larger private trading platform, including:

- asynchronous backtest service orchestration
- frontend backtest workflow handling in React
- real-time runtime state management for live trading

## messaging-project

Backend extract from a messaging-related module, including:

- conversation summary retrieval
- unread conversation count
- route / service separation
- message-state aggregation and user metadata enrichment

## streaming-project

Frontend extract from a streaming application, including:

- video playback integration
- playback resume handling
- progress persistence
- next-episode flow
- component-level media state management

## Why these extracts?

These samples were selected to show how I structure real application code across both backend and frontend layers.

Rather than publishing incomplete private projects, I prepared focused extracts that highlight:

- architecture and separation of responsibilities
- readability and maintainability
- async workflows and state handling
- non-trivial product logic in real use cases

## Notes

These directories are code extracts, not standalone production-ready applications.

Some project-specific dependencies are intentionally omitted, including:

- internal models and data layers
- authentication middleware
- platform-specific integrations
- shared UI infrastructure
- proprietary business logic

Each project directory contains its own README with more context about the selected code.