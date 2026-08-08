# Signoff: Amendment 9 P4 — Portal catalog publication rate guard

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-08-06-post-launch-catalog-and-processing-stability-amendment-9-p4-plan.md` |
| Review | Formal: `docs/workflow/reviews/2026-08-06-post-launch-catalog-and-processing-stability-amendment-9-p4-review.md`; Impl: `docs/workflow/reviews/2026-08-06-amendment-9-p4-implementation-review.md` |
| Test report | `docs/workflow/reviews/2026-08-06-amendment-9-p4-test-report.md` |
| Manual QA | `docs/workflow/reviews/2026-08-06-amendment-9-p4-manual-qa.md` |
| Attribution | `docs/workflow/reviews/2026-08-06-amendment-9-p4-owner-qa-fail-attribution.md` |
| Implement commit | `9fe6430` (`fix(functions): bound portal catalog publication reads`) |
| Dev deploy | `fresh-prints-dev` from `9fe6430` (record `4dbb1c6`) |
| Related corrective | Case D New This Week Signoff **approved** (`f9bc19c`; `docs/workflow/reviews/2026-08-06-portal-new-this-week-readyat-signoff.md`) |
| Branch / PR | `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**) |
| Final status | **approved_with_notes** |

---

## Summary

Amendment 9 P4 bounds Portal full-catalog publication reads during paced AI approval batches via quiet window, minimum publication interval, single-pass drains, W2 coordination-doc wake, and non-ready INDEX_FILTER skip. Live owner QA on `fresh-prints-dev` showed the **rate-guard itself PASSING** (3 full pubs; **3,436** C+T+R vs prior ~**28,710**). An initial overall QA **FAIL** was caused by a **separate** Case D Discover “New This Week” product-semantics issue (not P4 Portal ordering changes — P4 did not modify `apps/portal/**`). That corrective is now owner-**PASS**ed and signed off; the P4 production-promotion blocker is **cleared**.

No production Functions deploy. No PR merge. Stage 1b / P3 not started. P4 is a **transition guard**, not snapshot retirement.

---

## Guard configuration (shipped)

| Parameter | Value |
|-----------|-------|
| Quiet window | **30s** |
| Minimum successful full-publication interval | **120s** |
| Claim liability | **240s** |
| Lease | **10 minutes** |
| Portal `passLimit` | **1** |
| W2 wake | `onPortalCatalogPublicationStateWritten` drains final dirty state |
| Non-ready INDEX_FILTER | Suppressed (no full C+T scan storm from import churn alone) |

---

## Live rate-guard evidence (owner QA window)

| Metric | Value |
|--------|------:|
| Approx. AI enqueue batch | ~45 |
| Successful full Portal publications | **3** |
| Timestamps (UTC) | 02:29:48Z; 02:31:49Z; 02:34:35Z |
| Spacing | ~120.8s; ~166.6s |
| C+T+R total | **3,436** |
| Prior comparable total | **~28,710** |
| Approx. C+T+R reduction | **~88%** |
| `joined-existing-debounce-window` | 88 |
| `claimed-debounce-waiter` | 2 |
| Deferred wake requested / claimed | 2 / 2 |
| W2 publications | 1 |
| Not-yet-eligible | 0 |
| Lease-busy | 0 |
| Failures | 0 |

---

## Owner QA disposition

| Item | Result |
|------|--------|
| Rate-guard live target (≤6 pubs; reads ≪ 28.7K) | **PASSING** |
| Search / multi-tag / facets / non-ready import (P4 QA) | **PASS** (owner) |
| Initial overall FAIL cause | Case D Discover New This Week `createdAt` semantics |
| Case D corrective | Owner **PASS** + Signoff **approved** |
| P4 production-promotion blocker | **Cleared** |

---

## Changes Delivered

- Portal publication quiet + min-interval + `passLimit=1` + `nextEligiblePublishAt`
- W2 `onPortalCatalogPublicationStateWritten`
- Classifier skip for non-ready INDEX_FILTER
- Dev Functions deploy to `fresh-prints-dev` only

### Out of scope (unchanged / deferred)
- Generated text search / multi-tag / facets remain **temporary**
- Snapshot retirement / Function retirement
- Stage 1b provider selection / P3 taxonomy caching
- Production deploy / PR #40 merge

---

## Tests

### Automated (Implement)
- catalogSnapshots suite green at Implement; Functions build exit 0 (see P4 test report)

### Manual / live
- Cloud Logging attribution for QA window (see attribution doc)
- Owner rate-guard criteria met; Case D ordering signed off separately

---

## Human checkpoints

| Item | Result |
|------|--------|
| Dev Functions deploy | Approved + completed (`fresh-prints-dev`) |
| Owner Manual QA (rate guard) | Rate-guard **PASS**; overall FAIL resolved via Case D Signoff |
| Case D Manual QA | **PASS** |
| Production deploy | **Not performed** |
| PR merge | **Not performed** — PR #40 remains open |

---

## Notes (`approved_with_notes`)

P4 materially reduced publication-read amplification, but each remaining full generated catalog publication still costs roughly **~1.1K C+T+R** reads at the current catalog size. Permanent removal of that cost depends on later retirement/replacement of the remaining generated search/facet architecture (Stage 1b / related follow-ups — **not** started in this Signoff).

---

## Final status

**approved_with_notes**
