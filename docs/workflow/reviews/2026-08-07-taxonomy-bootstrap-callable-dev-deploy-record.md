# Dev Deploy Record — Taxonomy materialization bootstrap callable

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Owner phrase | `APPROVE DEV TAXONOMY BOOTSTRAP CALLABLE DEPLOY` |
| Project | **fresh-prints-dev** |
| Follow-up | `taxonomy-read-spike-elimination` |
| Result | **PASS** |

---

## Deploy command

```bash
firebase deploy --only functions:rebuildTaxonomyMaterializationCallable --project fresh-prints-dev
```

## Deploy result

- Predeploy `tsc` build: success
- Operation: **creating** Node.js 20 (2nd Gen) function `rebuildTaxonomyMaterializationCallable(us-central1)`
- Result: **Successful create operation**
- Overall: **Deploy complete!**
- Console: https://console.firebase.google.com/project/fresh-prints-dev/overview

## Export name verification (pre-deploy)

| Export | Kind | Deployed this gate? |
|--------|------|---------------------|
| `rebuildTaxonomyMaterializationCallable` | `onCall` Cloud Function | **Yes** |
| `onTagTaxonomySourceWritten` | Firestore trigger | **No** |
| `onCategoryTaxonomySourceWritten` | Firestore trigger | **No** |
| `rebuildTaxonomyMaterialization` | Plain shared helper export (not a Cloud Function) | N/A |

## `firebase functions:list --project fresh-prints-dev` verification

| Function | Present? |
|----------|----------|
| `rebuildTaxonomyMaterializationCallable` | **Yes** — `v2` · `callable` · `nodejs20` · `us-central1` · `256` · `1` |
| `onTagTaxonomySourceWritten` | **Absent** |
| `onCategoryTaxonomySourceWritten` | **Absent** |

## Gate confirmations

- Callable **NOT** invoked
- No intentional `taxonomyMaterialization/**` bootstrap this pass
- No taxonomy triggers deployed
- No Firestore Rules deploy
- No Studio deploy
- No Storage mutation
- No production action
- No PR merge

## Next owner gate

`APPROVE DEV TAXONOMY MATERIALIZATION BOOTSTRAP` — invoke callable, verify meta + chunks, STOP before triggers/loader/Rules.
