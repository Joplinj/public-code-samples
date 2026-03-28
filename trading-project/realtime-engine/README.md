# Realtime Engine — Selected Code Extract

This repository contains a simplified backend extract from a larger private real-time trading system.

It focuses on a few representative parts of the runtime layer:
- account-level state management
- realtime session orchestration
- position synchronization with external platforms
- connection lifecycle handling
- graceful shutdown and activity monitoring

The goal is to showcase runtime coordination, service structure, and stateful backend design without exposing private business logic or platform-specific infrastructure.

## Included files

```text
managers/
  StateManager.js

services/
  realtimeService.js
```

## What this extract demonstrates

- account-scoped runtime state management
- service orchestration for starting and stopping realtime execution
- synchronization between platform state, in-memory state, and persisted metadata
- lifecycle handling for active realtime connections
- separation between state management and service coordination

## Execution flow

1. An account is marked as started in persisted account status
2. The realtime service restores or starts the runtime for that account
3. A StateManager instance is created for the account
4. Strategy-specific runtime components are initialized on top of that shared state
5. Public market-data connections are started and tracked in memory
6. The service can stop, restart, or monitor the runtime for each account

## Notes

This is a code extract, not a standalone production-ready service.
Some project-specific dependencies are intentionally omitted, including database models, platform adapters, connection implementations, and strategy-specific execution logic.
Most of my work is private, so this repository was prepared to show code structure, readability, and engineering approach on a real-time backend use case.