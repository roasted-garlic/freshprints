# Signoff: Production Portal catalog tag-removal publication

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-07-31-production-portal-catalog-tag-removal-publication-plan.md` |
| Review | `docs/workflow/reviews/2026-07-31-production-portal-catalog-tag-removal-publication-review.md` (**approved**) |
| Incident | `docs/workflow/reviews/2026-07-31-production-portal-catalog-tag-removal-publication-incident.md` |
| Test report | `docs/workflow/reviews/2026-07-31-production-portal-catalog-tag-removal-publication-test-report.md` |
| Implement | `docs/workflow/reviews/2026-07-31-production-portal-catalog-tag-removal-publication-implement-checkpoint.md` |
| Functions deploy | `docs/workflow/reviews/2026-07-31-production-portal-catalog-tag-removal-publication-functions-deploy-checkpoint.md` |
| Catch-up | `docs/workflow/reviews/2026-07-31-production-portal-catalog-tag-removal-publication-catchup-checkpoint.md` |
| Final status | **approved** |

---

## Summary

Removing a tag from a ready catalog design in Studio now clears that tag from Portal generated-catalog
surfaces after publication settles. Root cause was a failed portal-catalog republish (`FetchError`)
that left `requestedGeneration=9` / `publishedGeneration=8` / `status=failed`, so Portal kept serving
generation 8 assets that still listed the removed tag. Category looked correct only because generation
8 already had the new category.

Remediation preserved ADR-FP-120: Storage I/O retries, durable catch-up (no lease-busy abandon), and
owner/admin `retryPortalCatalogPublication` (no dirty bump). Production catch-up published generation
**9**; live assets verified; owner Portal QA: **PASS**.

This closes `production-portal-catalog-tag-removal-publication` under Goal #13.
`production-release` continues (Stage 2 hosted.app smoke and custom-domain cutover remain deferred
until separately authorized). Prior resize / branding / registration PASSes are unchanged.

---

## Changes Delivered

### Behavior

- Transient Storage/`FetchError` retries during catalog publish
- Catch-up loop continues through lease-busy and transient failures instead of abandoning a higher
  `requestedGeneration`
- `retryPortalCatalogPublication` drains an existing dirty watermark without bumping generation
- Tag/`categoryId` remain `index-filter` full republish (unchanged classifier)

### Production

- Functions deployed to `fresh-prints-dev` and `fresh-prints-prod` (scoped catalog-snapshot set;
  `retryPortalCatalogPublication` created)
- Catch-up RETRY: portal-catalog **generation 9** (`9-ebbc2bff6074f3c5`), `status=idle`

### Files

- `functions/src/catalogSnapshots/publicationRecovery.ts` (+ tests)
- `functions/src/catalogSnapshots/publishCatalogSnapshots.ts`
- `functions/src/index.ts`
- `functions/scripts/retry-portal-catalog-publication-prod.mjs` (ops invoke helper)
- `docs/project/DECISIONS.md` (ADR-FP-120 amendment)
- `docs/architecture/ARCHITECTURE.md`
- `docs/project/RISK_REGISTER.md` (R-017)
- Workflow plan / review / test / deploy / catch-up / this signoff

---

## Tests

### Automated

| Check | Result |
|-------|--------|
| `publicationRecovery.test.ts` + classifier suite | 19/19 |
| `npm run build` (`functions`) | exit 0 |

### Live verification (post catch-up)

| Check | Result |
|-------|--------|
| Coordination `publishedGeneration` / `status` | 9 / `idle` |
| Discover tags on affected design | `funny` only |
| Tag filter/facet for removed tag | cleared |

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Portal tag-removal surfaces after catch-up | **PASS** | owner |

---

## Human Approvals Obtained

| Approval | Status | Date |
|----------|--------|------|
| `APPROVE PORTAL CATALOG TAG REMOVAL PUBLICATION FIX IMPLEMENTATION` | obtained | 2026-07-31 |
| `APPROVE DEV FUNCTIONS DEPLOY: PORTAL CATALOG TAG REMOVAL PUBLICATION FIX` | obtained | 2026-07-31 |
| `APPROVE PRODUCTION FUNCTIONS DEPLOY: PORTAL CATALOG TAG REMOVAL PUBLICATION FIX` | obtained | 2026-07-31 |
| `APPROVE PRODUCTION PORTAL CATALOG PUBLICATION CATCH-UP: RETRY` | obtained | 2026-07-31 |
| Owner Portal QA | **PASS** | 2026-07-31 |

---

## Risks / follow-ups

| Item | Notes |
|------|-------|
| R-017 | Closed — catch-up + owner QA PASS |
| Card-overrides vs index-filter asymmetry | Secondary risk from incident; not causal here; monitor |
| Stage 2 | Still paused — resume only with separate owner authorization |
| Domain cutover | Deferred |
| Optional redeploy | Local `drainPortalCatalogPublicationCatchUp` export is repo-only until next Functions deploy; live callable already worked |

---

## Final Status

**approved** — catalog tag-removal publication slice closed. Goal #13 continues; next gated step is
Stage 2 when the owner authorizes it.
