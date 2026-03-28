# Backtest UI — Selected Code Extract

This directory contains a simplified frontend extract from a larger private trading platform.

It focuses on a few representative parts of the backtest interface:
- strategy configuration
- asynchronous backtest launch
- task-status polling
- result visualization
- page-level state orchestration in React

The goal is to showcase frontend structure, async workflow handling, and UI coordination around a real trading-related use case.

## Included files

```text
frontend-backtest/
  pages/
    Backtest.jsx
  hooks/
    useBacktestTask.js
  utils/
    backtestResults.js
```

## What this extract demonstrates

- React page composition for a complex workflow
- separation between UI state, async task handling, and pure helpers
- asynchronous polling of long-running backend tasks
- rendering of paginated trade results and aggregated metrics
- maintainable frontend structure for a data-heavy interface

## Execution flow

1. The user configures one or more strategies in the backtest form
2. The page sends a backtest request to the backend
3. A task id is returned by the API
4. The UI polls the task-status endpoint until completion
5. Results, capital evolution, and summary metrics are displayed in the interface

## Notes

This is a code extract, not a standalone production-ready frontend module.
Some project-specific components and surrounding application context are intentionally omitted, including styling details, shared UI elements, and additional business-specific logic.
Most of my work is private, so this repository was prepared to show code structure, readability, and engineering approach on a real frontend use case.