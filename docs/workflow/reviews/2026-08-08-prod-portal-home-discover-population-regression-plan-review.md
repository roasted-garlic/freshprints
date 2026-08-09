# Formal Review: Production Portal Home/Discover population regression plan

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Reviewer | Review Agent (independent) |
| Plan | `docs/workflow/plans/2026-08-08-prod-portal-home-discover-population-regression-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The plan correctly proves a Firestore Home-pool failure mode that explains `/catalog` fullness vs
Home ~1 design under Algolia OFF. Index deploy alone is correctly marked insufficient. Required
changes are narrow documentation/sequence tightenings, not a different root cause.

---

## Challenge responses

| Challenge | Finding |
|-----------|---------|
| Proven failing query? | **YES** — `listHomeDiscoveryPool` → `orderBy(readyAt)` fails (index required); metrics return 1; early return |
| Missing indexes matter? | **YES** for preferred readyAt path; **not sufficient alone** (0 docs have `readyAt`) |
| Env vs source? | **Both** — missing prod indexes **and** Home lacks catalog’s `WithSortFallback` / early-return gap |
| Read amplification? | Acceptable if bounded to existing pool/membership caps; call out in implement |
| Stage 4 violation? | **No** — repair stays Firestore-primary; no generated restore |
| Accidental Algolia dependency? | **Forbidden** — plan correctly rejects Algolia-as-fix |
| Rollback safe? | **Yes** — prior App Hosting build; indexes additive |
| Minimum deploy? | Source fix + readyAt index deploy + App Hosting; backfill optional |

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | |
| Architecture alignment | pass | Firestore Home/Discover preserved |
| Security impact addressed | pass | None |
| Data model impact addressed | pass | Optional readyAt backfill noted |
| Backend impact addressed | pass | Index deploy |
| Test strategy adequate | pass | Needs explicit home-pool regression test case |
| Human checkpoints identified | pass | |
| Roadmap alignment | pass | Blocks production promotion content QA |
| Documentation plan | pass | |
| No silent scope expansion | pass | |

---

## Required changes (approved_with_changes)

1. **Implement must add an explicit automated test** that encodes the proven production failure mode:
   preferred sorts reject or return metric-only tiny set → Home pool must still return createdAt-eligible ready designs (bounded), not short-circuit at size 1.
2. **Sequence:** Prefer merging/shipping the **source Home-pool fix before or with** index deploy; do not tell owner that indexes alone restore Home on current data.
3. **New This Week:** Document that until `readyAt` backfill, “new” rail may rank/filter weakly even after Home is populated via createdAt pool — acceptable interim if called out in owner QA.
4. Do **not** expand into Algolia enable, Rules, or publisher deletes in this fix.

---

## Architecture Review

**Findings:** Contract holds — Home/Discover are Firestore; Algolia OFF is unrelated. Stage 4 not at fault.

**Required changes:**
- [x] None beyond sequencing notes above

---

## Security Review

**Findings:** None.

**Required changes:**
- [x] None

---

## Verdict

**approved_with_changes**

Root cause is proven. Proceed to implementation only after owner phrase.

---

## Next owner phrase

```text
APPROVE PROD HOME DISCOVER FIX IMPLEMENT
```

---

## Confirmations

- NO implementation in this review pass
- NO production mutation
