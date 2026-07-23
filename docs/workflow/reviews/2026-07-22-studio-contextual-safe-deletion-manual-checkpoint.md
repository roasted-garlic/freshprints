# Human Checkpoint: Studio Contextual Safe Deletion — Manual QA

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Workflow | managed-phase / test / studio-contextual-safe-deletion |
| Reason | UI/UX and cross-entity deletion behavior require owner verification on fresh-prints-dev |
| Status | **resolved** |
| Resolution | **PASS** (2026-07-22) |

---

## What We Need From You

Run the manual QA checklist on **fresh-prints-dev** (after new Functions are deployed to that project) and reply with `PASS`, `FAIL: …`, or `PASS WITH NOTES: …`.

---

## Context

Implementation added server-authoritative deletion/tombstone callables and Studio contextual actions. Product Users path is tombstone-only; Test Data scratch hard-delete restored for `fresh-prints-dev` (owner clarification). No production deploy.

Plan: `docs/workflow/plans/2026-07-22-studio-contextual-safe-deletion-plan.md`  
ADR: ADR-FP-115 in `docs/project/DECISIONS.md`

---

## Owner resolution

**PASS** — 2026-07-22.

Notes recorded at close:
- Delete actions are owner-only and behind ⋯ overflow menus.
- Test Data `ownerDeleteUser` UI restored for scratch cleanup on allowlisted project (supersedes earlier “remove from Test Data UI” pass criterion).
- Users page remains tombstone + Auth disable; username reserved; `(Deleted)` display-only.

---

## Pass criteria (final)

- [x] Customer tombstone preserves history and username reservation
- [x] Auth disable prevents Portal sign-in
- [x] Allocated requests/shows blocked with clear warnings
- [x] Eligible hard deletes work without orphaning shared assets
- [x] Product Users path is tombstone-only; Test Data scratch hard-delete allowed on fresh-prints-dev
- [x] No production deploy performed
