# Dev Deploy Record — Taxonomy trigger rebuild corrective

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Owner phrase | `APPROVE DEV TAXONOMY TRIGGER REBUILD CORRECTIVE DEPLOY` |
| Project | **fresh-prints-dev** |
| Verdict | **TAXONOMY TRIGGER REBUILD CORRECTIVE DEPLOY: PASS** |
| Impl Review | **APPROVED** |
| Live re-QA mutation | **Not run** (separate step) |

---

## Pre-deploy checks

| Check | Result |
|-------|--------|
| Target `fresh-prints-dev` | **PASS** (`firebase use` → fresh-prints-dev) |
| meta ready / rev 1 / chunk 1 / 1121 / 18 | **PASS** |
| contentHash | `38e69b3851688e963470b1dc17c879a3e947a481c6d111a0d2a4fe74bdd33e59` |
| `tags/acdc` has `taxonomy-smoke-20260807` | **PASS** |
| chunk-0 lacks alias | **PASS** (intentional stale mismatch) |
| Impl Review APPROVED | **PASS** |
| Focused tests 18/18 | **PASS** |
| Allowlist = two triggers only | **PASS** |

---

## Deploy command

```bash
firebase deploy --only functions:onTagTaxonomySourceWritten,functions:onCategoryTaxonomySourceWritten --project fresh-prints-dev
```

## Deploy result

- Predeploy `tsc` build: success
- Operation: **updating** both Gen2 Functions (`us-central1`)
- `onTagTaxonomySourceWritten`: **Successful update operation**
- `onCategoryTaxonomySourceWritten`: **Successful update operation**
- CLI: **Deploy complete!**
- Exit code: **0**

---

## Post-deploy verification

| Check | Result |
|-------|--------|
| Both triggers present | **PASS** |
| State ACTIVE | **PASS** (`onTagTaxonomySourceWritten`, `onCategoryTaxonomySourceWritten`) |
| Unrelated Functions intentionally updated | **None** (allowlist only) |
| `rebuildTaxonomyMaterializationCallable` present | **PASS** (ACTIVE; not in deploy set) |
| Rules deploy | **No** |
| Storage deploy | **No** |
| Algolia change | **No** |
| Materialization revision before | **1** |
| Materialization revision after | **1** |
| Unexpected rebuild from deploy | **No** (hash unchanged; no rebuild-success in deploy window) |
| Alias still canonical-only on `acdc` | **PASS** |
| Chunk still lacks alias | **PASS** |

---

## Containment

| Surface | Touched? |
|---------|----------|
| Two approved triggers | **Yes** (updated) |
| Callable | Present, not redeployed |
| Rules / Storage / Hosting / Algolia | **No** |
| Production | **No** |
| PR merge | **No** |
| Taxonomy mutation / alias removal | **No** |
| Callable invoke | **No** |

---

## Next (not this pass)

Owner: remove `taxonomy-smoke-20260807` from `acdc` exactly once → prove revision 1→2 + awaited rebuild path. Then separate Studio stale-cache proof.
