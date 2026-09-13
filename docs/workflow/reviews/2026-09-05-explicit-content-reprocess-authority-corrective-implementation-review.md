# Implementation Review — Explicit Content Reprocess Authority Corrective (ADR-FP-173)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Plan | `docs/workflow/plans/2026-09-05-explicit-content-reprocess-authority-corrective-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-05-explicit-content-reprocess-authority-corrective-review.md` |
| Status | **approved** |
| Deploy this pass | **NO** |

## IR checklist

| # | Check | Result |
|---|---|---|
| 1 | source is provenance-only | **YES** |
| 2 | staff source still permanently suppresses | **NO** |
| 3 | positive reprocess re-applies when unlocked | **YES** |
| 4 | no-match auto-clears | **NO** |
| 5 | lock field exact name | `explicitContentAutomationLocked` |
| 6 | lock UI location | AI Review Explicit panel + Design Library Explicit section |
| 7 | lock inferred from staff edit | **NO** |
| 8 | locked positive match suppresses root write | **YES** |
| 9 | unlocking immediately mutates | **NO** |
| 10 | subsequent reprocess after unlock may apply | **YES** (by contract) |
| 11 | legacy migration | **NO** |
| 12 | settings-fail unchanged | **YES** |
| 13 | Explicit remains non-blocking | **YES** |
| 14 | cucumber validator changed | **NO** |
| 15 | Model 2 changed | **NO** |
| 16 | Rules additive only | **YES** |
| 17 | Portal changed | **NO** |
| 18 | customer PR changed | **NO** |
| 19 | v34/v6/v1 unchanged | **YES** |
| 20 | tests | focused **77 pass / 0 fail**; Functions build **PASS** |
| 21 | DEV deploy allowlist | below |
| 22 | replacement QA C ready | **YES** (prepare only) |
| 23 | source ready for deploy | **YES** |

## Recommended DEV deploy allowlist (future auth only)

```text
firebase deploy --only "functions:enqueueAiEnrichment,functions:reprocessReadyDesignWithAi,functions:onCatalogReprocessJobWritten,firestore:rules" --project fresh-prints-dev
```

Studio: local DEV for lock UI (no Studio publish authorized this pass).

## Replacement QA C (after future deploy)

Fixture `CqkwDf1BOll43yojGd5Y` if still suitable: lock OFF → staff Explicit OFF + clear damn → save → reprocess → expect Explicit ON + damn + automation source → then lock ON → reprocess → staff state survives.

## Verdict

**approved** — source ready for owner-authorized DEV deploy. No deploy this pass. WS6 remains blocked. Autonomous OFF.
