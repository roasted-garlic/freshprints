# Dev Deploy Record — Taxonomy steady-state Functions (`fresh-prints-dev`)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Owner phrase | `APPROVE DEV TAXONOMY STEADY-STATE FUNCTIONS DEPLOY` |
| Project | **fresh-prints-dev** |
| Verdict | **TAXONOMY STEADY-STATE FUNCTIONS DEPLOY: PASS** |
| Checkpoint | `docs/workflow/reviews/2026-08-07-taxonomy-steady-state-deployment-checkpoint.md` |

---

## Pre-deploy checks

| Check | Result |
|-------|--------|
| `firebase use` / gcloud project | `fresh-prints-dev` |
| Bootstrap meta healthy (r1 / 1 / 1121 / 18 / hash) | **PASS** |
| Export names match `functions/src/index.ts` | **PASS** |
| Rules/Storage in command | **Not included** |
| Callable redeploy | **Skipped** (not in allowlist) |

---

## Exact command

```bash
firebase deploy --only functions:onTagTaxonomySourceWritten,functions:onCategoryTaxonomySourceWritten,functions:enqueueAiEnrichment,functions:testAiEnrichmentPlayground,functions:testAiEnrichmentTagRerank --project fresh-prints-dev
```

## Deploy result

**Deploy complete!** (exit success)

| Function | Operation |
|----------|-----------|
| `onTagTaxonomySourceWritten` | **Successful create** (`us-central1`, Firestore document written) |
| `onCategoryTaxonomySourceWritten` | **Successful create** (`us-central1`, Firestore document written) |
| `enqueueAiEnrichment` | **Successful update** |
| `testAiEnrichmentPlayground` | **Successful update** |
| `testAiEnrichmentTagRerank` | **Successful update** |

`rebuildTaxonomyMaterializationCallable` — **not** redeployed.

---

## Post-deploy `functions:list` verification

| Function | Present | Type |
|----------|---------|------|
| `onTagTaxonomySourceWritten` | **Yes** | firestore document written |
| `onCategoryTaxonomySourceWritten` | **Yes** | firestore document written |
| `enqueueAiEnrichment` | **Yes** | callable |
| `testAiEnrichmentPlayground` | **Yes** | callable |
| `testAiEnrichmentTagRerank` | **Yes** | callable |
| `rebuildTaxonomyMaterializationCallable` | **Yes** (unchanged) | callable |

---

## Materialization revision

| When | revision | ready | contentHash |
|------|----------|-------|-------------|
| Before | **1** | true | `38e69b3851688e963470b1dc17c879a3e947a481c6d111a0d2a4fe74bdd33e59` |
| After | **1** | true | same (updatedAtMs unchanged `1786154932285`) |

**Unexpected rebuild from deploy:** **No**

No bootstrap callable invoke; no manual tag/category mutation this gate.

---

## Containment

- NO Firestore Rules deploy
- NO Storage deploy
- NO Algolia change
- NO Studio deploy
- NO production
- NO PR merge

---

## Next owner gate

`APPROVE DEV TAXONOMY STEADY-STATE RULES DEPLOY`

```bash
firebase deploy --only firestore:rules --project fresh-prints-dev
```

**STOP.**
