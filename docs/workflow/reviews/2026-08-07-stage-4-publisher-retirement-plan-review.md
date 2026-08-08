# Review: Stage 4 publisher retirement plan

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-07-stage-4-publisher-retirement-plan.md` |
| Owner planning auth | `APPROVE STAGE 4 PLANNING` |
| Verdict | **approved_with_changes** |

---

## Summary

Plan correctly scopes Stage 4 to **publisher Function + source retirement** and **Portal generated-fallback removal**, keeps Algolia + Firestore, and excludes Stage 5 Storage cleanup and Stage 6 / PR merge. Inventory of six Functions (including P4 W2) and the Algolia classifier relocate dependency are accurate. Approve Implement **code work** after these required changes; **live Function delete remains a separate human phrase**.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear / bounded | pass | Dev Stage 4; Stage 5/6 out |
| Architecture | pass | Algolia + FS remain; generated writers go |
| Security | pass | No Rules widen; search-only keys unchanged |
| Data / migration | pass | Orphan state → Stage 5 documented |
| Backend | pass | Allowlist + remain-list explicit |
| Test strategy | pass | Containment + outage Network zero + no pub spike |
| Human checkpoints | pass | Deploy phrase separate from planning |
| No silent expansion | pass | TD-030 / prod excluded |
| Roadmap alignment | pass | Matches Amendment 8 §16 + Stage 1b Stage 4 gate |

---

## Required changes (Implement must follow)

1. **Before deleting `catalogSnapshots/`:** relocate `classifyPortalCatalogDesignChange` (+ tests) so Algolia sync compiles and behavior is covered.
2. **Portal generated fallback removal is a hard gate** before (or in the same PR as) publisher source delete — never deploy Function retirement while Portal still defaults to generated Storage on Algolia-off.
3. **At Implement start:** run live `functions:list` (or Console inventory) on `fresh-prints-dev`; paste allowlist match into the deploy record. Do not delete if names diverge without plan amendment.
4. **STOP for owner phrase** before any Firebase deploy that removes the six Functions. Suggested phrase for later use: `APPROVE DEV FUNCTIONS DELETE: STAGE 4 PUBLISHERS` (exact phrase to be confirmed with owner at that checkpoint).
5. **Prod Function delete** stays **Stage 6** (or later explicit auth) — do not extend Stage 4 Implement to `fresh-prints-prod`.
6. Grep for remaining `portalCatalogAssetService` / `listMatchingDesigns` / `generatedPortalCatalogEnabled` usages before Signoff; zero required for cutover flows.

---

## Recommended (non-blocking)

- Keep Shared catalog-snapshot parsers until Stage 5 if anything still imports types only.
- Document residual public-read Storage objects until Stage 5 as accepted risk (no secret data; cost/ clutter only).

---

## Verdict

**approved_with_changes** — Stage 4 **code Implement** may proceed under the required changes above.

**Forbidden until further owner phrases:** live Function delete/deploy, Stage 5, Stage 6, PR #40 merge, production.
