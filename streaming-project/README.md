# Video Player — Selected Code Extract

This directory contains a simplified frontend extract from a larger private streaming application.

It focuses on a few representative parts of the playback experience:
- video playback integration
- playback resume handling
- periodic progress persistence
- next-episode flow
- auto-hidden controls and player state management

The goal is to showcase component-level frontend logic, playback-related state handling, and integration with a real product-oriented media workflow.

## Included files

streaming-project/
  video-player/
    VideoPlayer.js

## What this extract demonstrates

- integration of a third-party video player in React
- playback resume based on saved progress
- periodic persistence of playback position
- next-episode countdown and transition handling
- coordination of timers, refs, and UI state in a media component

## Execution flow

1. The player receives media metadata and playback parameters as props
2. Saved playback position is restored when resume is allowed
3. Playback progress is periodically sent to the backend
4. The component monitors player state for end-of-video and error cases
5. If applicable, a next-episode flow is triggered before transition

## Notes

This is a code extract, not a standalone production-ready media module.
Some project-specific dependencies and surrounding application context are intentionally omitted, including global styling, routing, and broader streaming-related business logic.
Most of my work is private, so this directory was prepared to show code structure, readability, and engineering approach on a real frontend use case.