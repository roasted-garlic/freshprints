# Plan: Studio Inbox design inspect + archive

| Field | Value |
|-------|-------|
| Date | 2026-08-01 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-08-01-studio-inbox-design-inspect-and-archive-review.md |

## Goal

From Inbox design reports, open Design Details (preview/lightbox) in place, with Edit and Archive (confirm dialog), without leaving Inbox.

## Approach

Expand `StaffInboxDesignEditHost` to host `DesignDetailsModal` first; wire `EditDesignModal` and `ArchiveDesignConfirmDialog` like Design Library (no purge/restore required for this amendment).

## Out of scope

Bell/toast navigation; purge assets; anonymous submit; deploys.
