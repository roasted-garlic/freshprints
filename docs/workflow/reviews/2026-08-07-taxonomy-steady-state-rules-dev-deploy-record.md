# Dev Deploy Record — Taxonomy steady-state Firestore Rules (`fresh-prints-dev`)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Owner phrase | `APPROVE DEV TAXONOMY STEADY-STATE RULES DEPLOY` |
| Project | **fresh-prints-dev** |
| Verdict | **TAXONOMY STEADY-STATE RULES DEPLOY: PASS** |
| Prior Functions deploy | `docs/workflow/reviews/2026-08-07-taxonomy-steady-state-functions-dev-deploy-record.md` |
| Rules test evidence | `docs/workflow/reviews/2026-08-07-taxonomy-steady-state-deployment-checkpoint.md` — **59/59 PASS** |

---

## Pre-deploy checks

| Check | Result |
|-------|--------|
| Project | `fresh-prints-dev` |
| Rules source includes `taxonomyMaterialization` staff read / client write deny | **PASS** (`isStaff()`; `create, update, delete: if false`) |
| Stage 5 Storage: no `generated/portal-catalog` / `catalog-reference` matches | **PASS** |
| Bootstrap meta healthy (r1 / 1 / 1121 / 18 / hash) | **PASS** |
| Scope | `firestore:rules` only |

---

## Exact command

```bash
firebase deploy --only firestore:rules --project fresh-prints-dev
```

## Deploy result

**Deploy complete!** (exit 0)

- `cloud.firestore: rules file firestore.rules compiled successfully`
- `firestore: released rules firestore.rules to cloud.firestore`

Compiler warnings present (pre-existing unused/invalid-name diagnostics) — did not block release.

---

## Post-deploy verification

| Check | Result |
|-------|--------|
| Rules release active | **Yes** — CLI reported released to cloud.firestore |
| Functions updated this gate | **No** |
| Storage Rules deployed | **No** |
| Indexes deployed | **No** (indexes file read during firestore deploy prep only; `--only firestore:rules`) |
| Materialization revision before | **1** |
| Materialization revision after | **1** (same `updatedAtMs` / contentHash) |
| Unexpected rebuild | **No** |

Active Rules content cannot be pulled via a dedicated CLI `firestore:rules:get` (command absent); release confirmation is from deploy output + unchanged local source that passed 59/59 emulator tests.

---

## Containment

- NO Functions deploy
- NO Storage deploy
- NO taxonomy mutation
- NO Algolia change
- NO production
- NO PR merge

---

## Next (owner / Studio)

1. Reload Studio (`fresh-prints-dev`, signed in as staff)
2. Verify staff can read `taxonomyMaterialization` meta/chunks (warm short-circuit path)
3. One controlled taxonomy mutation → prove revision **1 → 2**
4. Optional warm-cache / 45-design validation

**STOP.**
