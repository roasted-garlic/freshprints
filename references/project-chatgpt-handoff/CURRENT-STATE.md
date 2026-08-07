# Fresh Prints - Current State Snapshot

## 2026-08-07 - Amendment 9 live QA PASS WITH NOTES; P1/P3 signed off; P2 no-implement

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Overall Amendment 9 live QA | **PASS WITH NOTES** |
| P0 | **PASS** |
| P1 | **PASS WITH NOTES** → Signoff **approved_with_notes** (import 2.00/design) |
| P3 | **PASS** → Signoff **approved** (1 cold load / 89 hits / 1 instance) |
| P4 | **PASS** this run (3 pubs / 3,462 C+T+R; min interval OK) |
| P2 | Formal Review **approved — recommend NO IMPLEMENTATION** |
| Amendment 9 optimization set | **Closed** (P0/P1/P3/P4 live-validated; P2 accept fixed cost) |
| Stage 1b | **Not started** |
| Production / PR merge | **None** |

Attribution: `docs/workflow/reviews/2026-08-07-amendment-9-combined-live-qa-attribution.md`
P1 Signoff: `docs/workflow/reviews/2026-08-07-amendment-9-p1-signoff.md`
P3 Signoff: `docs/workflow/reviews/2026-08-07-amendment-9-p3-signoff.md`
P2 Plan: `docs/workflow/plans/2026-08-07-amendment-9-p2-studio-tag-library-read-containment-plan.md`
P2 Review: `docs/workflow/reviews/2026-08-07-amendment-9-p2-studio-tag-library-read-containment-review.md`

Console ~2K/~1.7K = stacked fixed costs (P3 cold + P4 pubs ± Studio tags), not O(n²).

## 2026-08-07 - Amendment 9 P3 deployed to fresh-prints-dev (await combined QA)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| P3 taxonomy cache | Impl **APPROVED** (`c3d3c45`); **deployed** to `fresh-prints-dev` |
| P1 import/approval reads | Impl **APPROVED** (`dab3c44`); Studio-only (no deploy) |
| Case D / P4 | Signoffs complete |
| Stage 1b | **Not started** |
| Production | **None** |

Deploy record: `docs/workflow/reviews/2026-08-07-amendment-9-p3-dev-deploy-record.md`
Combined QA: `docs/workflow/reviews/2026-08-07-amendment-9-p3-p1-combined-manual-qa.md`

Functions updated: `enqueueAiEnrichment`, `testAiEnrichmentPlayground`, `testAiEnrichmentTagRerank`, `updateAiEnrichmentSettings`.

## 2026-08-06 - Case D + Amendment 9 P4 Signoff complete

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Case D New This Week → `readyAt` | Signoff **approved** (`f9bc19c`) |
| Amendment 9 P4 rate guard | Signoff **approved_with_notes** (`9fe6430` + `fresh-prints-dev` deploy) |
| P4 live rate-guard | **PASSING** - 3 pubs; 3,436 C+T+R vs ~28,710 |
| P4 production-promotion blocker | **Cleared** |
| Stage 1b | **Not started** |
| Production deploy | **None** |

Note: each remaining full generated catalog publication still costs ~1.1K C+T+R; permanent
removal depends on later generated search/facet retirement/replacement.

Signoffs:
- `docs/workflow/reviews/2026-08-06-portal-new-this-week-readyat-signoff.md`
- `docs/workflow/reviews/2026-08-06-amendment-9-p4-signoff.md`
