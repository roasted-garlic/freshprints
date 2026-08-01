# Checkpoint: Implement complete — await production Functions deploy

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Slice | `production-portal-catalog-tag-removal-publication` |
| Implement approval | `APPROVE PORTAL CATALOG TAG REMOVAL PUBLICATION FIX IMPLEMENTATION` |
| Automated tests | **passed** — see test report |
| Production Functions | **deployed** 2026-07-31 — see functions-deploy-checkpoint |
| Dev Functions | **deployed** 2026-07-31 — see functions-deploy-checkpoint |
| Production catch-up | **not invoked** (coordination still failed/stuck on prod until catch-up) |

---

## Implemented (repo only)

| Change | Path |
|--------|------|
| Transient Storage retry helpers + pass retry classification | `functions/src/catalogSnapshots/publicationRecovery.ts` |
| Storage save/load wrapped in retries; catch-up loop no longer abandons on lease-busy; exported `runPublicationCatchUpLoop` | `functions/src/catalogSnapshots/publishCatalogSnapshots.ts` |
| Owner/admin catch-up callable (no `markDirty` bump) | `retryPortalCatalogPublication` in same file |
| Export callable | `functions/src/index.ts` |
| Failing-before / passing-after recovery + tag-removal classification tests | `functions/src/catalogSnapshots/publicationRecovery.test.ts` |
| ADR-FP-120 amendment (failed-publish recovery) | `docs/project/DECISIONS.md` |
| Architecture note | `docs/architecture/ARCHITECTURE.md` |
| Risk R-017 | `docs/project/RISK_REGISTER.md` |

No Portal/Studio client changes. No Firestore/Storage rules changes. No production data repair in this pass.

### Behavior preserved

- Firestore canonical; ADR-FP-120 manifests; 15s debounce; 10m lease
- Tag/`categoryId` remain `index-filter` full republish
- Card-only path still unused for tag changes
- `rebuildCatalogSnapshots` unchanged (still bumps dirty + publishes both kinds)

---

## Required next human actions

### 1. Production Functions deploy

```bash
firebase deploy --only functions --project fresh-prints-prod
```

Suggested approval phrase:

```text
APPROVE PRODUCTION FUNCTIONS DEPLOY: PORTAL CATALOG TAG REMOVAL PUBLICATION FIX
```

Optional pre-prod:

```text
APPROVE DEV FUNCTIONS DEPLOY: PORTAL CATALOG TAG REMOVAL PUBLICATION FIX
```

### 2. Production catch-up (after deploy)

Prefer the narrow callable (does **not** bump `requestedGeneration`):

```text
APPROVE PRODUCTION PORTAL CATALOG PUBLICATION CATCH-UP: RETRY
```

Fallback if retry is insufficient (owner-approved full rebuild — **not** silent):

```text
APPROVE PRODUCTION PORTAL CATALOG PUBLICATION CATCH-UP: REBUILD
```

Expect after success: `snapshotPublicationState/portal-catalog` has
`publishedGeneration >= requestedGeneration` and `status` not stuck on `failed`; generated assets
omit the removed tag from cards, tag filters, facet, and search.

### 3. Owner Portal QA

Remove / verify tag surfaces → `PASS` / `FAIL` / `PASS WITH NOTES`. Stage 2 remains separately gated.

## Rollback

Redeploy prior Functions revision from git / Console. Prior Storage content versions remain
addressable where retained by ADR-FP-120 manifests.
