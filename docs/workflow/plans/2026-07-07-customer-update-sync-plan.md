# Plan: Customer Update Sync (Email + Username)

| Field | Value |
|-------|-------|
| Date | 2026-07-07 |
| Status | approved (user request) |

## Goal

When staff edit a customer in Studio, keep Firebase identity layers in sync:

- **Email:** `customers`, `users/{uid}`, and Firebase Auth (when `userId` is linked)
- **Username:** `customers`, `customerUsernames` reservation swap (existing behavior, server-owned)
- **Display name:** `customers` and `users/{uid}` when linked

## Out of scope

- Renaming existing print request names (snapshots remain by design)
- Customer delete

## Implementation

- `updateCustomer` callable (Admin SDK)
- Studio Edit Customer → callable via `customerUpdateService`
- UI: require email for Portal customers; username change notice
