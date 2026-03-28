# Backtest Service — Selected Code Extract

This repository contains a simplified backend extract from a larger private trading platform.

It focuses on a few representative parts of the backtest workflow:
- asynchronous backtest execution
- task-based status tracking
- parameter combination generation
- result validation
- capital evolution aggregation

The goal is to showcase backend structure, async orchestration, and data-processing logic without exposing private business code.

## Included files

controllers/
  backtestController.js

services/
  backtestService.js

utils/
  backtestUtils.js
  taskManager.js

## What this extract demonstrates

- controller / service / utility separation
- asynchronous task orchestration
- range-based parameter optimization
- validation of computed results
- aggregation of raw execution output into higher-level metrics

## Execution flow

1. A client starts a backtest and receives a taskId
2. The backtest runs asynchronously
3. The task state is updated in memory
4. The client polls the task status endpoint until completion

## Notes

This is a code extract, not a standalone production-ready service.
Some project-specific dependencies are intentionally omitted, and the full backtest engine is part of a larger private system.
Most of my work is private, so this repository was prepared to show code structure, readability, and engineering approach on a real backend use case.