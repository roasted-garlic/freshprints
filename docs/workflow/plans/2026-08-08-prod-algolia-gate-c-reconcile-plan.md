# Plan: Production Algolia Gate C — reconcile only

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Managed goal | `pr-40-prod-algolia-gate-c-reconcile` |
| Related | Gate B record `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-algolia-deploy-record.md`; reconciliation `docs/workflow/reviews/2026-08-08-pr-40-remaining-production-gates-reconciliation.md` |

---

## Goal

Populate the production Algolia index `portal_catalog_ready_prod` (app `Z1FVCM5QUX`) from Firestore `designs` with `status == ready`, using the already-ACTIVE callable `reconcilePortalCatalogAlgoliaIndex` on `fresh-prints-prod`. Keep Portal managed search **OFF**. Do **not** set App Hosting / Portal search-only env in this goal.

---

## Background

- Gate A COMPLETE: SEPARATE app + prod index + rotated admin secret.
- Gate B COMPLETE: Algolia trio ACTIVE @ tip `92d176c`; live params `ALGOLIA_APP_ID=Z1FVCM5QUX`, `ALGOLIA_PORTAL_CATALOG_INDEX_NAME=portal_catalog_ready_prod`.
- Reconciliation matrix Gate C historically bundled “reconcile + Portal enable”. Owner started **`CONTINUE WORKFLOW: PROD ALGOLIA GATE C RECONCILE`** — this plan **splits** enable into a later gate (`APPROVE PROD ALGOLIA ENABLE`).
- Callable behavior (`runPortalCatalogAlgoliaReconcile`): dry-run counts only; apply **clears** the index then upserts ready-design records (owner/admin only). Portal customers still use Firestore browse while the flag is off.
- Studio `window.freshPrintsDev.reconcilePortalCatalogAlgoliaIndex` is **dev-only** — prod invoke is owner CLI / custom-token script (same pattern as taxonomy bootstrap).
- Scheduled `reconcilePortalCatalogAlgoliaIndexScheduled` already runs every 24h with `dryRun: false`; explicit Gate C reconcile still required for controlled, recorded population before enable.

---

## Scope

### In Scope

- Preflight: trio ACTIVE; params ≠ `_dev`; Portal enable OFF.
- Owner **dry-run** invoke: `{ dryRun: true }` → record scanned/upserted counts.
- Owner **apply** invoke: `{ dryRun: false }` → clear + write `portal_catalog_ready_prod`.
- Deploy/verify records; update reconciliation matrix + workflow state.
- Human phrases for dry-run and apply.

### Out of Scope

- Portal `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=true`
- Search-only API key collection / App Hosting Algolia secrets
- App Hosting rollout for search enable
- Functions redeploy / Rules / Storage / Studio
- Broad `firebase deploy --only functions`
- Using index `portal_catalog_ready_dev` on prod

---

## Affected Areas

### Files / Modules (expected)

- Docs only this goal (unless a throwaway local invoke script — **do not commit**):
  - `docs/workflow/plans/2026-08-08-prod-algolia-gate-c-reconcile-plan.md` (this file)
  - `docs/workflow/reviews/2026-08-08-prod-algolia-gate-c-reconcile-checkpoint.md`
  - `docs/workflow/reviews/2026-08-08-prod-algolia-gate-c-reconcile-*-review.md` / dry-run / apply records
  - Reconciliation + state / CURRENT-STATE updates

### Architecture Impact

- [x] None (existing callable; no new layers)

### Security Impact

- [x] Details: Owner/admin Auth required; admin Algolia key already in SM; do not print keys; clear+rewrite is Algolia-index destructive but Portal flag stays OFF so customers unaffected.

### Data Model Impact

- [x] None (Firestore unchanged; Algolia index contents only)

### Backend Impact

- [x] Details: One-time (plus scheduled) Algolia index rebuild via existing Gen2 callable.

### UI / UX Impact

- [x] None this goal (search still Firestore)

### Migration Impact

- [x] Forward: dry-run → apply populate `portal_catalog_ready_prod`
- [x] Rollback: keep Portal flag OFF; optional clear index or re-run reconcile; scheduled will re-apply within 24h

---

## Approach

1. **Plan + Formal Review** (this doc) — approve reconcile-only scope.
2. **Checkpoint** with exact phrases and owner invoke script (custom token + `httpsCallable`).
3. Owner phrase **`APPROVE PROD ALGOLIA RECONCILE DRY-RUN`** → invoke `{ dryRun: true }` → reply `PROD ALGOLIA RECONCILE DRY-RUN: PASS` with counts.
4. Owner phrase **`APPROVE PROD ALGOLIA RECONCILE APPLY`** → invoke `{ dryRun: false }` → reply `PROD ALGOLIA RECONCILE: COMPLETE` with counts.
5. Agent read-only verify (logs / owner-reported counts; no secret access). Update records. **STOP** before enable.

### Owner invoke sketch (do not commit; no secrets in chat)

Same pattern as taxonomy bootstrap: Admin SDK custom token for an active prod **owner** uid → client Auth → `httpsCallable('reconcilePortalCatalogAlgoliaIndex')({ dryRun: true|false })` against `fresh-prints-prod` / `us-central1`. Timeout ≥ 540s.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck / lint / unit | N/A (no code change) | no |
| Live Function state | `gcloud functions describe …` / `firebase functions:list` | yes (preflight) |

### Manual

- [x] Dry-run returns `{ dryRun: true, scanned, upserted, cleared: false }` with `upserted` ≤ `scanned` and plausible vs ready catalog size
- [x] Apply returns `{ dryRun: false, scanned, upserted, cleared: true }` with similar counts
- [x] Portal still Firestore-only (flag OFF)

---

## Human Checkpoints Anticipated

- [x] Production Algolia index clear+rewrite (apply)
- [x] Owner CLI invoke (agent expected hook-blocked)
- [ ] Portal enable — **deferred** to separate `APPROVE PROD ALGOLIA ENABLE`

### Exact phrases

| Step | Phrase |
|------|--------|
| Authorize dry-run | `APPROVE PROD ALGOLIA RECONCILE DRY-RUN` |
| Dry-run done | `PROD ALGOLIA RECONCILE DRY-RUN: PASS` |
| Authorize apply | `APPROVE PROD ALGOLIA RECONCILE APPLY` |
| Apply done | `PROD ALGOLIA RECONCILE: COMPLETE` |

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Apply clears wrong index (`_dev`) | High | Preflight live env shows `portal_catalog_ready_prod`; refuse if `_dev` |
| Apply while Portal flag ON | Med | Confirm enable OFF before apply; this goal forbids enable |
| Timeout / partial write | Med | Function timeout 540s; clear-then-chunked save; re-run apply if incomplete |
| Agent cannot invoke | Low | Owner CLI only (known hook pattern) |
| Scope creep into enable | Med | Explicit out of scope; separate phrase later |

---

## Rollback Plan

- Leave Portal search OFF (default).
- Re-run apply reconcile, or wait for scheduled job.
- Do not delete Algolia Functions unless rolling back Gate B intentionally.

---

## Documentation Updates Required

- [x] Other: Gate C reconcile plan/checkpoint/review/records; reconciliation matrix Gate C row split or note reconcile vs enable; CURRENT-STATE / workflow state
- [ ] BACKEND.md only if enable path docs need a pointer (optional follow-up)

---

## Open Questions

- [x] None blocking — enable is deferred by design

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-08-prod-algolia-gate-c-reconcile-plan-review.md`
- Verdict: **approved**
- Status: ready_for_review → **approved** (2026-08-08)
