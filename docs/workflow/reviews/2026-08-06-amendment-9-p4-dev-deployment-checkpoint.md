# Dev Deployment Checkpoint: Amendment 9 P4

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Project | `fresh-prints-dev` only |
| Status | **Awaiting owner phrase** — do not deploy until approved |
| Required phrase | `APPROVE DEV FUNCTIONS DEPLOY: AMENDMENT 9 P4` |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| PR | #40 — keep open / unmerged |

---

## Why these Functions

All listed exports are defined in `functions/src/catalogSnapshots/publishCatalogSnapshots.ts`
and re-exported from `functions/src/index.ts`. P4 changed shared publication modules, so every
runtime that loads that bundle for these exports must be redeployed together. Category/tag
triggers share the module (catalog-reference path unchanged in behavior, but same artifact).

**New Function (must create on first deploy of this commit):**
`onPortalCatalogPublicationStateWritten`

---

## Exact scoped deploy command (do not run until approved)

```bash
firebase deploy --only functions:onPortalCatalogSnapshotSourceWritten,functions:onPortalCatalogPublicationStateWritten,functions:onCategorySnapshotSourceWritten,functions:onTagSnapshotSourceWritten,functions:rebuildCatalogSnapshots,functions:retryPortalCatalogPublication --project fresh-prints-dev
```

### Allowlist (6)

| Export / Cloud Function name | Role |
|------------------------------|------|
| `onPortalCatalogSnapshotSourceWritten` | Design-write portal schedule (P4 quiet/interval/passLimit=1) |
| `onPortalCatalogPublicationStateWritten` | **W2** coordination deferred wake |
| `onCategorySnapshotSourceWritten` | Catalog-reference (shared module) |
| `onTagSnapshotSourceWritten` | Catalog-reference (shared module) |
| `rebuildCatalogSnapshots` | Admin rebuild (bypass min-interval) |
| `retryPortalCatalogPublication` | Admin drain (bypass min-interval) |

---

## Out of scope for this deploy

- Storage / Firestore Rules
- Indexes
- Production project
- PR merge
- Other Functions

---

## After deploy

Run manual QA checklist:
`docs/workflow/reviews/2026-08-06-amendment-9-p4-manual-qa.md`
