# Production promotion checkpoint: Studio smoke corrective A–E

| Field | Value |
|-------|-------|
| Date | 2026-08-12 |
| Status | **READY TO PROMOTE — AWAITING OWNER AUTHORIZATION** |
| Do not deploy yet | **yes** |
| Do not publish Studio 1.0.4 yet | **yes** |
| Branch | `hotfix/studio-smoke-corrective-a-e` |
| Implementation (product) SHA | `13e0af88f843571e3f49eae07899c38a23c90fd4` |
| Branch tip (docs included) | see latest HEAD after QA commits |
| Base | `origin/production` |
| Target PR base | `production` |

---

## Gate status

| Gate | Status |
|------|--------|
| Plan + formal review | approved_with_changes |
| Implementation | complete (`13e0af8`) |
| DEV backend deploy (dev project) | done earlier this phase |
| Owner DEV QA | **PASS** 2026-08-12 |
| Focused automated gates | **pass** (see test report) |
| PR to `production` | open / pending (see return block) |
| Production Rules / Functions deploy | **blocked** — needs owner phrase |
| Studio 1.0.4 package / publish | **blocked** — after backend deploy confirmed |

DEV QA record: `docs/workflow/reviews/2026-08-12-studio-smoke-corrective-a-e-dev-qa-checklist.md`  
Test report: `docs/workflow/reviews/2026-08-12-studio-smoke-corrective-a-e-test-report.md`

---

## Production deployment matrix (unchanged)

| Workstream | Studio 1.0.4 | Functions | Firestore Rules | Algolia settings | Storage Rules |
|------------|--------------|-----------|-----------------|------------------|---------------|
| A/B | yes | no | no | **no** (query-only) | no |
| C | no (docs only) | no | no | no | no |
| D | yes | **yes** | no | no | no |
| E | yes | **yes** | **yes** | no | no |

---

## Exact Firestore Rules deployment required

- Deploy **Firestore Rules** from the merged production SHA (includes `settings/showQueue` → `isOwnerOrAdmin()` write).
- **Do not** deploy Storage Rules (no change).

---

## Exact Functions deployment allowlist

Deploy **only** these changed callables (from merged production SHA):

1. `promoteCustomerUploadToAiReview`
2. `retryCustomerUploadProcessing`
3. `enqueueAiEnrichment`
4. `resetAiEnrichmentForProcessing`

Do **not** deploy unrelated Functions. Pipeline tag-dedupe ships via the enrichment path used by enqueue/reset.

---

## Studio 1.0.4 packaging requirements

1. Run **stable** Studio packaging workflow from **`production`** after merge (exact production Git SHA).
2. Bake **production** Firebase project + **production search-only** Algolia (`Z1FVCM5QUX` / `portal_catalog_ready_prod`) into the package.
3. Publish/install Studio **1.0.4** only **after** production Rules + allowlisted Functions are confirmed deployed.
4. Do **not** mutate Algolia index settings.

---

## Required production ordering (after PR merge + separate owner approval)

1. Verify exact production Git SHA (merge commit / tip).
2. Deploy required Firestore Rules.
3. Deploy only the approved changed Functions (allowlist above).
4. Verify backend/rules production deployment.
5. Prepare Studio 1.0.4 from the exact production SHA.
6. Stable Studio workflow must be run from `production`.
7. Production Firebase + production search-only Algolia must be baked into the package.
8. Publish/install Studio 1.0.4 only after backend deployment is confirmed.
9. Run reduced production smoke with a real Helper account.
10. Final signoff.
11. Sync production back into development afterward if required by current branch state.

---

## Reduced production smoke checklist (Helper)

- [ ] Helper can Send to AI Processing for eligible uploaded designs
- [ ] Helper can complete AI Review / image-processing workflow
- [ ] Helper can edit / review / approve / reject as intended
- [ ] No permission-denied on intended paths
- [ ] Helper remains non-admin
- [ ] Helper does **not** have Show Queue Settings
- [ ] Owner/Admin Show Queue Settings still works
- [ ] Spot-check: tag facet counts before Load More; Load More with filters; AI tags do not wipe human tags

---

## Human authorization required before production

**Do not deploy** until the owner replies with an explicit authorization such as:

```text
AUTHORIZE PRODUCTION DEPLOY: Studio smoke corrective A-E
```

Optionally include: Rules + Functions allowlist + Studio 1.0.4 package after backend confirm.

Until that phrase (or equivalent explicit approval) is recorded, agents must **STOP** before any production Firebase action and before Studio 1.0.4 publication.

---

## Safety confirmation

| Check | Expected |
|-------|----------|
| Production remains safe to promote after PR? | **Yes**, if PR contains only A–E corrective + docs/tests and matrix above is followed |
| Algolia settings mutation | **Forbidden** |
| DNS / cutover / Phase 9–10 | **Out of scope** |
| Unrelated production hotfixes | Do not bundle |
