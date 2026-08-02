# Formal Review: Donated Designs Amendment 2

Date: 2026-08-01
Plan: `docs/workflow/plans/2026-08-01-donated-designs-overflow-menu-no-op-amendment-2-plan.md`
Verdict: **approved_with_changes**

## Independent findings

- The native prompt is directly proven in the hook; replacing only its error copy would not fix Electron compatibility.
- Admin support cannot be UI-only because both preview and execute callables currently enforce owner. A named shared authorization assertion is required and must be used by both callables.
- Exclusion currently violates the owner's clarified reversible/preserve-assets behavior specifically for `catalog_donation`; removing that purge branch is required. No migration is needed for future exclusions, but already-purged historical records cannot be restored and must not be silently repaired.
- Existing delete blockers are narrow and fail closed for the two supported dependency types: any print-request-item reference and promoted-design linkage. No source establishes direct upload references from allocations, customers, or batches that should be deleted or rewritten.

## Required changes

1. Preview errors and blocked outcomes must stay inside the application modal with user-safe copy.
2. Confirm must be disabled unless preview is `allowed_hard_delete`; duplicate submission must be guarded.
3. Modal keyboard containment must include Escape cancel, Tab wrap, Cancel initial focus, and focus return after cancel/completion.
4. No `window.prompt`, `window.confirm`, or `window.alert` may remain in customer-upload intake.
5. Delete Storage cleanup must remain allowlisted to four upload asset fields and document deletion must occur only after dependency recheck.
6. Exclusion must not import or call Storage APIs.
7. Owner/admin/helper role tests must cover both client capability and trusted callable assertion.

## Verdict rationale

With these constraints, the amendment preserves existing safe deletion while correcting the confirmed UI incompatibility, role mismatch, and destructive exclusion behavior. Approved for development source implementation only; Functions deployment and production promotion remain separately gated.
