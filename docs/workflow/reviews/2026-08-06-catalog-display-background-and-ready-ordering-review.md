# Formal Review: Catalog display background + ready-approval ordering

| Field | Value |
|---|---|
| Date | 2026-08-06 |
| Plan | `docs/workflow/plans/2026-08-06-catalog-display-background-and-ready-ordering-plan.md` |
| HEAD | `120337a` |
| Verdict | **APPROVED** |

## Checks

| Check | Result |
|---|---|
| Details modal omits `artworkBackgroundHex` on thumbnail + lightbox (card passes it) | Confirmed in source |
| Helper reuse (`resolveArtworkBackgroundHex`) — no second color source | Pass |
| No PNG/Storage/Firestore write | Pass |
| Studio readyAt server order + completeness already present | Pass — no rewrite |
| Portal default browse currently `orderBy(createdAt)` while cursor value uses readyAtMs — inconsistent | Confirmed defect |
| Portal `readyAt` composite indexes already in `firestore.indexes.json` | Pass — no new index deploy in this task |
| Generated search ID order still publisher createdAt | Deferred follow-up (out of snapshot scope) — nonblocking |
| No Amendment 9 / Phase 1B / deploy | Pass |
| Product decisions clear | Pass — owner pre-approved implement if no blocker |

## Required changes before implement

None.

## Nonblocking notes

1. Generated multi-tag/search remains publisher-ordered until a later snapshot/publisher task.
2. Portal `readyAt` index-not-ready fallback must mirror Studio (`createdAt`).

**Proceed to implement.**
