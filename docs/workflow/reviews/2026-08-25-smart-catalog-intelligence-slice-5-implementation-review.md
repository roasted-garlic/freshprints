# Implementation Review: Smart Catalog Intelligence — Slice 5

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-25-smart-catalog-intelligence-slice-5-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-08-25-smart-catalog-intelligence-slice-5-review.md` (`approved_with_changes`) |
| Verdict | **approved** |

---

## Summary

Slice 5 Gate C implementation unlocks **AI Review Queue** reprocess on the existing durable control plane: shared eligibility, bounded preview inventory, server Start preflight (Shadow + live OFF), reset-equivalent AI clear (including `smartProfile`), job-scoped `outcomes/{designId}`, Shadow lifecycle assertion with anomaly soft-pause, Studio Preview/Start UX, and Ready Catalog still locked. Automated verification passed. **No DEV deploy / Gate F–G execution in this phase.**

---

## Required Formal Review changes — verification

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Start preflight Shadow + live OFF | **pass** — `assertShadowCalibrationStartAllowed` in `startCatalogReprocessJob` |
| 2 | Reset-equivalent clear includes `smartProfile` | **pass** — `buildCatalogReprocessAiClearUpdate` |
| 3 | Preview inventory (exclusions, versions, notes) | **pass** — `buildAiReviewQueueInventory` |
| 4 | Job-scoped outcomes + counters | **pass** — `outcomes` subcollection + job increments |
| 5 | Job snapshot v29 + normalizer-v3 | **pass** — `promptVersion` / `normalizerVersion` / `pipelineVersion` |
| 6 | Ready Catalog gate remains false | **pass** — constant + tests |
| 7 | Locked defaults (include v29, clear notes, etc.) | **pass** |

---

## Explicit checklist (owner prompt)

| # | Check | Result |
|---|-------|--------|
| 1 | Eligibility matches repo contract | **pass** — `imported` + `needs_review` |
| 2 | Preservation matrix honored | **pass** — AI clear does not touch B/D keys; tested |
| 3 | `smartProfile` cleared before rerun | **pass** |
| 4 | Start hard-requires Shadow + live OFF | **pass** (server) |
| 5 | Outcomes job-scoped / idempotent | **pass** — succeeded outcomes skip rerun |
| 6 | Counters job-scoped / idempotent | **pass** — create vs replace_failed; attemptCount reset on progress |
| 7 | Ready Catalog disabled | **pass** |
| 8 | Shadow cannot publish ready | **pass** — post-write assert + Algolia non-ready behavior |
| 9 | Preview read-only | **pass** — inventory queries only |
| 10 | `aiReviewNotes` evidence at Gate F | **pass** — notes inventory + recommendation |
| 11 | No production behavior enabled | **pass** |
| 12 | No Slice 6 behavior enabled | **pass** |

---

## Tests run (this session)

| Check | Result |
|-------|--------|
| Slice 5 unit/contract (`tsx --test` …) | **20/20 pass** |
| `npm --prefix functions run build` | **pass** |
| Studio `tsc --noEmit` | **pass** |
| Studio `vite build` | **pass** |
| `npm run lint` | **pass** (max-warnings 0) |
| `git diff --check` | **pass** (CRLF warnings only) |
| Rules unit suite | **not run** — rules changed; no dedicated rules test runner invoked (document for Gate E) |

---

## Rules / indexes

| Change | Why |
|--------|-----|
| `firestore.rules` — owner read `catalogReprocessJobs/{jobId}/outcomes/{designId}` | Genuine — owner progress/calibration reads |
| `firestore.indexes.json` — `designs` `status` + `aiReviewStatus` + `__name__` ASC | Genuine — eligible paging cursor |

**Deploy allowlist must include these** with Functions/Studio. Not unexpected scope — required for `__name__` cursor + outcomes visibility.

---

## DEV deploy allowlist (Gate E — not authorized yet)

When owner authorizes deploy:

1. `functions:previewCatalogReprocessJob`
2. `functions:startCatalogReprocessJob`
3. `functions:pauseCatalogReprocessJob`
4. `functions:resumeCatalogReprocessJob`
5. `functions:retryCatalogReprocessJobFailures`
6. `functions:onCatalogReprocessJobWritten` (secrets: `GEMINI_API_KEY`; timeout/memory increased)
7. `firestore:rules`
8. `firestore:indexes` (new composite)
9. Studio release/build as needed for Catalog Reprocessing UI

**Do not** deploy production. **Do not** start a job as part of deploy.

---

## Gate F readiness

Preview callable is implemented and read-only. After Gate E deploy, owner may call Preview to obtain:

- eligibleCount, version distributions, already-v29, missing profile
- exclusion buckets (indexed status counts — not a full-catalog scan)
- `aiReviewNotes.recommendation` (`clear_ok` | `escalate_preserve_review`)

If notes recommendation is `escalate_preserve_review` → **STOP before Gate G**.

---

## Blockers before DEV deploy

None for Gate E authorize. Remaining human gates: **E → F → G** still require separate owner authorize. Live Autonomous must stay OFF; mode must be Shadow before Start.

---

## Verdict Rationale

**approved** — Implements Formal Review required changes within Slice 5 scope; verification green; Ready Catalog / production / Autonomous remain closed; STOP before deploy.

---

## Next Step

**STOP.** Await owner authorize **Gate E DEV deploy** (allowlist above). Do not Preview against live DEV, Start, or submit `REPROCESS AI REVIEW QUEUE` until separately authorized.
