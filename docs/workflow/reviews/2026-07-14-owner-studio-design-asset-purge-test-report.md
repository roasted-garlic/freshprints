# Test Report: Owner Studio archive-first design asset purge

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Goal | owner-studio-design-asset-purge |
| Status | passed |

---

## Automated

| Check | Exit | Result |
|-------|------|--------|
| `npx tsx --test packages/shared/src/utils/purgeArchivedDesignAssetsValidation.test.ts` | 0 | pass (5) |
| `npm --prefix functions run build` | 0 | pass |
| Studio `tsc --noEmit` | n/a | blocked by pre-existing `ignoreDeprecations: "6.0"` (TS 5.2) |
| ESLint (touched Studio purge files) | 0 | pass |

---

## Deploy required before manual

```bash
firebase deploy --only functions:purgeArchivedDesignAssets,firestore:rules --project fresh-prints-dev
```

---

## Manual

| Test | Result | Date |
|------|--------|------|
| Archive → single/bulk Delete images; restore blocked; helper cannot purge | **PASS** (owner) | 2026-07-14 |

### Deploy notes
- Function + firestore rules deployed to `fresh-prints-dev` by owner
