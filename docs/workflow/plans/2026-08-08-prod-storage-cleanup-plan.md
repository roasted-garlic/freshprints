# Plan: PR #40 — Production generated Storage + snapshotPublicationState cleanup

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Author | Planning Agent |
| Status | **approved_with_changes** (Formal Review 2026-08-08) |
| Workflow | managed-phase |
| Managed goal | `pr-40-prod-storage-cleanup` |
| Owner authorization | **`APPROVE PROD STORAGE CLEANUP PLAN`** (2026-08-08) — Plan + Formal Review only |
| Parent | PR #40 remaining production gates — Gate 6 |
| Related checkpoint | `docs/workflow/reviews/2026-08-08-pr-40-prod-storage-cleanup-checkpoint.md` |
| Dev precedent | Stage 5 plan/signoff + `functions/scripts/stage5-generated-asset-cleanup.mjs` (**dev-hard-pinned**) |
| Production tip | `51db805d2fce6fcb6edee71b1a7f1a9b531fb50f` |
| Live Portal | `build-2026-08-08-004` @ tip, Algolia **OFF** |

---

## Goal

Safely remove residual **generated catalog Storage objects** and orphan **`snapshotPublicationState`** docs from **`fresh-prints-prod`** after Stage 4 Portal cutover, Storage Rules deny, and publisher Function DELETE — using a **production-dedicated** ops procedure that reuses Stage 5 allowlists and APPLY resilience **without** weakening the Stage 5 `fresh-prints-dev` hard pin.

**Does not** revive publishers. **Does not** touch design artwork, customer uploads, or other Storage roots. **Does not** redeploy Rules (already narrowed on prod). **Does not** enable Algolia or ship Studio.

---

## Background

| Prerequisite | Status |
|--------------|--------|
| Portal Stage 4 live (ordinary browse ≠ generated assets) | **DONE** — `build-2026-08-08-004` |
| Storage Rules deny generated public reads | **DONE** — ruleset `ccb8e2ea-…` |
| Publisher Functions deleted (5) | **DONE** — Gate 5 verify PASS |
| Taxonomy materialization bootstrapped | **DONE** — Gate 4 |
| Stage 5 script usable on prod | **NO** — `STAGE5_ALLOWED_PROJECT_ID = "fresh-prints-dev"`; Formal Review forbade prod escape hatch |

Residuals (last inventory):

| Target | Count / size |
|--------|--------------|
| `generated/portal-catalog/**` | ~**31557** objs / ~32.5 MiB |
| `generated/catalog-reference/**` | ~**229** objs / ~39.4 MiB |
| `snapshotPublicationState` | **2** (`catalog-reference`, `portal-catalog`) |

Historical PR #40 production-promotion Checkpoint 8: *"Separate procedure (not current Stage 5 script)."*

---

## Scope

### In Scope

1. **Source tooling (after Implement approval)**
   - Add a **prod-dedicated** local Admin SDK ops script (non-callable), e.g. `functions/scripts/prod-generated-asset-cleanup.mjs`
   - Add a **prod-dedicated** guard module hard-pinned to `fresh-prints-prod` only (mirror Stage 5 guard shape)
   - **Reuse** Stage 5 APPLY helpers (`stage5GeneratedAssetCleanupApply.mjs`) for concurrency, transient retry, batch delete, verification — those helpers are project-agnostic and already proven on `fresh-prints-dev`
   - **Do not** add `ALLOW_NON_DEV` to the Stage 5 script; Stage 5 remains unchanged and continues to refuse non-dev projects
   - Optional: extract shared prefix/collection constants only if it does not weaken either project pin (prefer duplicate frozen allowlists in the prod guard for isolation)

2. **Safety gates in the prod script**
   - Default mode = **dry-run** (list + write inventory JSON; **no deletes**)
   - Destructive mode only when `APPLY=1` **and** an explicit second confirm env (recommended: `CONFIRM_PROD_STORAGE_CLEANUP=1`) is set
   - Refuse any `FIREBASE_PROJECT_ID` / resolved project other than `fresh-prints-prod`
   - Refuse any Storage path outside:
     - `generated/portal-catalog/`
     - `generated/catalog-reference/`
   - Firestore deletes limited to collection `snapshotPublicationState` only
   - Negative roots documented and never targeted: `originals/`, `thumbnails/`, `previews/`, `display/`, `customer-uploads/`
   - APPLY resilience: default concurrency **8** (override via `STAGE5_CONCURRENCY` or prod-named alias), per-object retry/backoff, re-list resume, final verification exit non-zero if residuals remain

3. **Unit / guard tests**
   - Prod guard: project pin, prefix allow/deny, negative roots, confirm-env required for APPLY
   - Reuse or lightly extend APPLY helper tests (already cover retry/batch)

4. **Live dry-run (after separate owner phrase)**
   - List-only against `fresh-prints-prod`
   - Write dry-run record under `docs/workflow/reviews/`
   - Refresh object counts / samples / negative checklist
   - Owner: `PROD STORAGE CLEANUP DRY-RUN: PASS` (or fail notes)

5. **Live APPLY (after separate owner phrase)**
   - Delete allowlisted Storage objects + `snapshotPublicationState` docs
   - Safe to re-run until `fullyClean`
   - Write delete/apply record; agent read-only verify after owner PASS

6. **Docs**
   - Short note in `BACKEND.md` / `DECISIONS.md` (or ADR): prod generated Storage retired; Stage 5 remains dev-only; prod uses separate script
   - Update remaining-gates matrix / ROADMAP / workflow state as gates complete

### Out of Scope

- Modifying Stage 5 script to accept production (explicitly forbidden)
- Firestore/Storage **Rules** redeploy (already COMPLETE on prod)
- Algolia config / Functions / enable
- Publisher Function recreate
- Studio production package (Gate 7 — separate)
- App Hosting rollout / domain cutover
- Deleting `packages/shared/src/catalog-snapshots/*` types
- Broad `gsutil -m rm` / Firebase console bulk delete without this allowlisted script
- Any Storage root outside the two generated prefixes
- Production deploy of Cloud Functions for cleanup (local Admin SDK only)

---

## Affected Areas

### Files / Modules (expected)

| Area | Paths |
|------|-------|
| Prod ops script | `functions/scripts/prod-generated-asset-cleanup.mjs` *(new)* |
| Prod guard | `functions/scripts/lib/prodGeneratedAssetCleanupGuard.mjs` *(new)* |
| Prod guard tests | `functions/scripts/lib/prodGeneratedAssetCleanupGuard.test.mjs` *(new)* |
| Shared APPLY helpers | `functions/scripts/lib/stage5GeneratedAssetCleanupApply.mjs` *(reuse; change only if shared bugfix required)* |
| Stage 5 script / guard | **unchanged** |
| Docs | `docs/architecture/BACKEND.md`, `docs/project/DECISIONS.md` (short), workflow reviews/records |

### Architecture Impact

- [x] Details: Removes dead generated-asset bytes on prod; Portal remains Firestore browse (+ optional Algolia later). No new runtime readers. No callable cleanup surface.

### Security Impact

- [x] Details: **Narrowing / cost cleanup only** — deletes obsolete objects already denied by Storage Rules. Hard project pin + path allowlist + dual APPLY confirm. Must not widen Rules or add a deployed delete endpoint. Irreversible without regenerating retired publishers.

### Data Model Impact

- [x] Details: Delete orphan `snapshotPublicationState` docs on prod. No design/tag/category schema change. Collection may remain empty/unused thereafter.

### Backend Impact

- [x] Details: Local Admin SDK ops script only. No Functions deploy. No Rules deploy. No Secret Manager changes.

### UI / UX Impact

- [x] None expected if Stage 4 holds. Manual Portal smoke (`/` `/catalog`) after APPLY; Algolia remains OFF.

### Migration Impact

- [x] Forward: Implement source → Test → DRY-RUN → owner PASS → APPLY → verify empty prefixes + empty `snapshotPublicationState`
- [x] Rollback: **Storage objects not restored** by app tooling; Rules already deny public reads so customer impact of residual absence is low. Do not revive publishers solely to regenerate obsolete assets.

---

## Approach

### Phase 0 — Plan + Formal Review (this authorization)

1. Write this plan.
2. Formal Review → **approved** / **approved_with_changes**.
3. **STOP** — no Implement until `APPROVE IMPLEMENT: PROD STORAGE CLEANUP`.

### Phase 1 — Implement (after Implement phrase)

1. Add prod guard hard-pinned to `fresh-prints-prod`.
2. Add prod script: dry-run default; APPLY requires `APPLY=1` + `CONFIRM_PROD_STORAGE_CLEANUP=1`.
3. Wire Storage list/delete + Firestore orphan delete using Stage 5 APPLY helpers.
4. Unit tests for prod guard + confirm gate.
5. Docs note (BACKEND / DECISIONS).
6. Implementation Review.
7. **STOP** — no live dry-run/delete.

### Phase 2 — Dry-run (after `APPROVE PROD STORAGE CLEANUP DRY-RUN`)

```powershell
$env:FIREBASE_PROJECT_ID = "fresh-prints-prod"
# APPLY unset
node functions/scripts/prod-generated-asset-cleanup.mjs
```

Write dry-run record. Owner reviews counts. **STOP**.

### Phase 3 — APPLY (after `APPROVE PROD STORAGE CLEANUP DELETE`)

```powershell
$env:FIREBASE_PROJECT_ID = "fresh-prints-prod"
$env:CONFIRM_PROD_STORAGE_CLEANUP = "1"
$env:APPLY = "1"
# optional: $env:STAGE5_CONCURRENCY = "4" if GCS internals recur
node functions/scripts/prod-generated-asset-cleanup.mjs
```

Re-run until verification `fullyClean: true`. Owner: `PROD STORAGE CLEANUP DELETED: PASS`. Agent read-only verify. Update Gate 6 COMPLETE.

---

## Test Strategy

### Automated (before Implement signoff / before live phrases)

| Check | Command / action | Required |
|-------|------------------|----------|
| Prod guard unit tests | `node --test functions/scripts/lib/prodGeneratedAssetCleanupGuard.test.mjs` | yes |
| Stage 5 APPLY helper tests (regression) | `node --test functions/scripts/lib/stage5GeneratedAssetCleanup*.test.mjs` | yes |
| eslint on touched scripts | project eslint path | yes |
| Accidental Stage 5 prod escape | assert Stage 5 guard still refuses `fresh-prints-prod` | yes |

### Manual

| Check | Expected |
|-------|----------|
| Dry-run inventory | Counts + samples only under allowlisted prefixes; negative roots not listed as delete targets |
| Post-APPLY Portal `/` `/catalog` | **200**; Algolia OFF; browse OK |
| Post-APPLY Storage/FS | Both generated prefixes empty; `snapshotPublicationState` count **0** |
| Publisher Functions | Still **ABSENT** |

---

## Human Checkpoints (separate phrases — do not combine)

| # | Phrase | Authorizes |
|---|--------|------------|
| 0 | `APPROVE PROD STORAGE CLEANUP PLAN` | Plan + Formal Review (**this phrase**) |
| 1 | `APPROVE IMPLEMENT: PROD STORAGE CLEANUP` | Source script/guard/tests/docs only |
| 2 | `APPROVE PROD STORAGE CLEANUP DRY-RUN` | Live list-only on prod |
| 3 | `APPROVE PROD STORAGE CLEANUP DELETE` | Live APPLY deletes |

After dry-run: owner replies `PROD STORAGE CLEANUP DRY-RUN: PASS`.
After APPLY: owner replies `PROD STORAGE CLEANUP DELETED: PASS`.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Path escape into artwork / uploads | Hard prefix allowlist + assert before every delete; negative-root checklist in dry-run record |
| Weakening Stage 5 pin | Leave Stage 5 untouched; separate prod guard |
| Running APPLY without confirm | Require `CONFIRM_PROD_STORAGE_CLEANUP=1` in addition to `APPLY=1` |
| GCS transient failures mid-delete | Reuse Stage 5 retry/backoff/concurrency 8; resume via re-list |
| Irreversible delete | Prerequisites already remove runtime dependency; Rules deny public reads; deferrable until owner ready |
| Agent hooks block live prod Admin deletes | Owner CLI path expected (same as other prod mutations) |
| Accidental Algolia / Rules / Studio scope creep | Explicit Out of Scope; remaining-gates matrix |

---

## Open Questions

1. None blocking — residual recount during dry-run is sufficient; last full Storage counts are acceptable for planning.
2. Owner may defer Gate 6 indefinitely (deferrable post-launch) and prioritize Gate 7 Studio package instead — not assumed here.

---

## FreshForge impact classification

| Area | Impact |
|------|--------|
| Starter Surface | None (project workflow docs/scripts only) |
| Development Tooling | Ops scripts under `functions/scripts/` |
| Distribution/Installer | None |
| Documentation | Workflow plans/reviews + BACKEND/DECISIONS notes |
| Development History | None |

---

## Acceptance (Plan complete when)

- [x] Prerequisites documented
- [x] Prod-dedicated script approach chosen (not Stage 5 escape hatch)
- [x] Allowlists / negative roots / dual APPLY confirm specified
- [x] Phrase sequence includes Implement + DRY-RUN + DELETE
- [x] Rules / Algolia / Studio excluded
- [x] Formal Review verdict recorded (`approved_with_changes`)
- [ ] Implement deferred until separate phrase

**Next owner phrase:** `APPROVE IMPLEMENT: PROD STORAGE CLEANUP`

**STOP** after Formal Review — await Implement phrase.
