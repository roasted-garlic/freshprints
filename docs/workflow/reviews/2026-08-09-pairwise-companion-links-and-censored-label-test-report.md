# Test Report: Pairwise companion links + Censored/Uncensored label

| Field | Value |
|-------|-------|
| Date | 2026-08-09 (overnight) |
| Tester | Test Agent |
| Plan | `docs/workflow/plans/2026-08-09-pairwise-companion-links-and-censored-label-plan.md` |
| Review | `docs/workflow/reviews/2026-08-09-pairwise-companion-links-and-censored-label-review.md` → approved_with_changes |
| Overall | **pending_manual** (automated **passed_with_notes**) |

---

## Summary

Pairwise `companionLinks` + `companionDesignIds` replace transitive `companionSets` for product behavior. Portal Matching Designs uses direct neighbors only. Censored toggle label is state-aware (Censored / Uncensored). Rules deployed to **fresh-prints-dev only**. No Algolia, Functions, or production deploys. Old DEV `companionSets` left in place (ignored by new clients) — owner should re-link pairwise for QA.

---

## Automated results

| Check | Result |
|-------|--------|
| Studio `tsc --noEmit` | **pass** |
| Portal `tsc --noEmit` | **pass** |
| Companion helpers + wiring unit tests | **pass** |
| Portal companion + censor unit tests | **pass** (prior Portal sweep 522/522 reported during implement) |
| Rules: companionLinks + unlink/mark-needs + companionSets + expression budget | **pass** (22 tests) |
| Indexes deploy | **not required** (Portal uses get-by-id; no new composite) |
| Functions deploy | **none** |
| Algolia | **unchanged** |

---

## Firestore read-impact assessment

| Surface | Reads |
|---------|--------|
| Catalog list cards | **0 extra** — hint from hydrated `companionDesignIds.length > 0` |
| Design Details / Matching Designs | Batch get neighbor IDs already on the design (cached `getReadyDesignsByIds`); filter ready client-side |
| Post-add suggestion | Same as Details |
| Studio Companion modal | `listLinkedDesigns` = design denorm + getDoc per neighbor |

No per-card companion queries. No Algolia fields.

---

## Old DEV companionSets treatment

- New clients **ignore** `companionSetId` for matching.
- Leftover DEV `companionSets` docs remain (e.g. prior turtle clique).
- **Do not** convert cliques to all-pairs.
- Owner QA: re-create pairwise links explicitly (A↔D, B↔D, C↔D separately). Optional manual delete of old `companionSets` / clear stale `companionSetId` fields.

---

## Deploys performed

| Target | Component | Status |
|--------|-----------|--------|
| fresh-prints-dev | `firestore:rules` | **deployed** (pairwise companionLinks + denorm fast path) |
| fresh-prints-dev | indexes | not changed this pass |
| fresh-prints-prod | anything | **untouched** |
| App Hosting / Studio prod / Algolia / myprintrequest.com | — | **untouched** |

---

## Manual QA

See `docs/workflow/reviews/2026-08-09-pairwise-companion-links-and-censored-label-owner-qa-checklist.md`
