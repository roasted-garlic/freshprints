# Formal Review: Donated Designs overflow menu Amendment 1

Date: 2026-08-01
Plan: `docs/workflow/plans/2026-08-01-donated-designs-overflow-menu-no-op-amendment-1-plan.md`
Verdict: **approved_with_changes**

## Independent findings

- The owner's placement request is compatible with the existing action and does not require product behavior changes.
- No reusable portal exists in current Studio source. Reusing the collision idea from `Select`/`TagChipInput` is appropriate, but their in-tree absolute rendering cannot escape the confirmed clip.
- A body portal with `position: fixed` is narrower than removing intake-panel clipping and generalizes safely for the existing shared destructive-menu consumer.

## Required changes

1. The outside-click check must include the portaled panel or item clicks may close/unmount before selection.
2. Positioning must use measured menu dimensions, prefer below, flip only for insufficient space, and clamp to the viewport.
3. Resize and scrolling must recompute while open; all listeners must be removed on close/unmount.
4. The z-index must remain `var(--z-dropdown, 20)`.
5. Preserve all existing focus, accessibility, stale-context, permission, and mutation boundaries.

## Verdict rationale

Approved for a narrow development-only implementation with the required changes above. Production promotion and installer work remain prohibited; owner QA remains unsigned.
