# Trading Project — Selected Code Extracts

This repository contains selected and cleaned-up code extracts from larger private trading systems I developed.

The original projects are not publicly available, so this repository focuses on representative backend modules that demonstrate:

- asynchronous service orchestration
- realtime runtime management
- stateful backend design
- backtest workflow structure
- frontend coordination around async trading workflows
- maintainable code organization

## Included extracts

backtest-service/
realtime-engine/
frontend-backtest/

## backtest-service

Backend extract focused on:

- asynchronous backtest execution
- task-based status tracking
- parameter combination generation
- result validation
- capital evolution aggregation

## realtime-engine

Backend extract focused on:

- account-level runtime state management
- realtime session orchestration
- position synchronization with external platforms
- connection lifecycle handling
- graceful shutdown and activity monitoring

## frontend-backtest

Frontend extract focused on:

- strategy configuration UI
- asynchronous backtest launch
- task-status polling
- result visualization
- page-level state orchestration in React

## Why these extracts?

Most of my work is developed in private repositories or project environments that cannot be shared publicly.
Instead of exposing incomplete or sensitive production code, I prepared a few focused extracts that reflect how I structure real trading-related systems across both backend and frontend layers.

## Notes

These directories are code extracts, not standalone production-ready applications.
Some project-specific dependencies are intentionally omitted.

Each subdirectory contains its own README with more context about the selected code.
