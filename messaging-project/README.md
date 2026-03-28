# Messaging Project — Selected Code Extract

This directory contains a simplified backend extract from a larger private application.

It focuses on a few representative parts of a messaging module:
- conversation summary retrieval
- unread conversation count
- route / service separation
- message-state aggregation
- enrichment of conversation data with user metadata

The goal is to showcase backend structure, service-oriented organization, and non-trivial data transformation logic in a Node.js / Express context.

## Included files

messaging-project/
  routes/
    conversationRoutes.js
  services/
    conversationService.js

## What this extract demonstrates

- thin Express routes delegating business logic to services
- conversation deduplication by participant pair
- aggregation of unread conversation state
- enrichment of message data with related user metadata
- maintainable backend structure for a messaging-related feature

## Execution flow

1. The authenticated user requests their conversation list
2. The route delegates the request to a dedicated service
3. Messages are grouped into distinct conversations
4. Each conversation is enriched with partner-related metadata
5. A summarized response is returned to the client

A second endpoint exposes the number of distinct conversations containing unread messages for the current user.

## Notes

This is a code extract, not a standalone production-ready messaging service.
Some project-specific dependencies are intentionally omitted, including database models, authentication middleware, and surrounding application context.
Most of my work is private, so this directory was prepared to show code structure, readability, and engineering approach on a real backend use case.