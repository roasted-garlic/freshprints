# Plan: PR #40 — Remaining production gates (post-2026-08-08 reconciliation)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Author | Planning Agent |
| Status | **approved_with_changes** (sequencing amendment 2026-08-08 Rules preflight) |
| Workflow | managed-phase |
| Managed goal | `pr-40-remaining-production-gates` |
| Related reconciliation | `docs/workflow/reviews/2026-08-08-pr-40-remaining-production-gates-reconciliation.md` |
| Rules preflight | `docs/workflow/reviews/2026-08-08-pr-40-prod-rules-deploy-checkpoint.md` |
| Historical plan (partially stale) | `docs/workflow/plans/2026-08-08-pr-40-production-promotion-plan.md` — **retain as history; do not execute by old checkpoint numbers** |
| Production tip | `7e139685099f90eb1532771e927384316a432e87` |
| Live Portal | `build-2026-08-08-004` @ same SHA, **100%**, Algolia **OFF** |

---

## Goal

Define the **true remaining** production-promotion gates for the PR #40 track after Portal cutover, readyAt indexes/backfill, Home/Discover correctives, and TD-031 closeout — without mutating production in this planning pass.

---

## Background

The original PR #40 production-promotion plan is **partially stale**. Multiple separately approved production corrections completed on 2026-08-08. Ordinary Portal browse is already live with Algolia OFF. Remaining work is mostly: Algolia (optional managed search), Rules, scoped Functions, taxonomy bootstrap, cleanup, and Studio packaging.

---

## Scope

### In Scope

- Forward execution order and allowlists grounded in 2026-08-08 live inventory
- Split Functions Wave A into **Taxonomy** vs **Algolia**
- Explicit launch-blocker vs deferrable classification
- Human checkpoint phrases (one at a time)

### Out of Scope (this plan / this pass)

- Any production mutation or deploy
- Reopening TD-031 / R-018
- Broad `firebase deploy --only functions`
- Domain cutover / Studio stable signing beyond noting residual
- Overwriting historical PR #40 plan/inventory records

---

## Affected Areas

### Architecture Impact

- [x] Details: Firestore remains catalog/taxonomy authority; Algolia remains managed search only; Portal Stage 4 fail-closed when Algolia OFF already live

### Security Impact

- [x] Details: Storage still publicly readable for generated catalog prefixes on **live** Rules — tip removes those matches; Algolia admin key Secret Manager only; never ship `_dev` index to prod Functions params

### Data Model Impact

- [x] Details: `taxonomyMaterialization` still absent on prod; `readyAt` backfill done; `snapshotPublicationState` residual docs remain until cleanup

### Backend Impact

- [x] Details: Scoped Function CREATE/UPDATE/DELETE allowlists; Rules delta; no index redeploy

### UI / UX Impact

- [x] Details: Managed search/facets remain unavailable until Algolia enable; ordinary browse unchanged

### Migration Impact

- [x] Forward: taxonomy bootstrap after Functions; optional Algolia reconcile; optional Storage cleanup after publisher delete
- [x] Rollback: keep Algolia OFF; prior Ruleset IDs; Function digests; publisher delete is heavy to restore

---

## Approach (execution order)

### Production-parity lane (Rules → taxonomy) — **active next**

1. **Firestore Rules deploy** — `taxonomyMaterialization` staff-read; `readyAt` optional validation; snapshot match cleanup (no-op vs live deny-all). Preflight: `…-pr-40-prod-rules-deploy-checkpoint.md`
2. **Storage Rules deploy** — remove generated public reads; Assisted proof **80 MB** (**separate** phrase after Gate 1 verify)
3. **Functions Wave A-Taxonomy** — CREATE taxonomy triggers/callable; UPDATE `enqueueAiEnrichment` + `getPortalGlobalOpenGraph`
4. **Taxonomy materialization bootstrap** — owner-gated callable invoke
5. **Publisher DELETE** (5 live) — separate phrase; prefer after Storage Rules deny
6. **Generated Storage + snapshotPublicationState cleanup** — separate DRY-RUN/DELETE
7. **Studio package** — tip-based package for taxonomy disk-cache; separate release approval
8. **Final smoke** — path-dependent

### Optional parallel lane (managed search) — **not a prerequisite**

A. **Algolia production configuration** (dashboard + admin secret + Functions params ≠ `portal_catalog_ready_dev`) — enable flag stays **false**
B. **Functions Wave A-Algolia** — CREATE sync/reconcile/scheduled **only after** A
C. **Algolia reconcile + Portal enable** — optional; separate phrase

Algolia may remain **OFF** indefinitely while the Rules/taxonomy lane proceeds. Do **not** block Rules on Algolia.

**Do not** mechanically resume old Checkpoints 0–10 numbering.

---

## Test Strategy

### Automated (before each mutation gate)

| Check | Command / action | Required |
|-------|------------------|----------|
| Rules suite | `npm run test:rules` (or project-documented portable JDK path) | Before Rules deploy |
| Functions typecheck/lint focused | existing functions scripts | Before Functions waves |
| Portal Algolia OFF smoke | HTTP `/` `/catalog` | After any App Hosting change |

### Manual

| Check | Expected |
|-------|----------|
| Portal FS browse | Healthy with Algolia OFF |
| After Algolia enable (later) | Search/facets only; kill-switch OFF restores browse |
| After taxonomy bootstrap | Studio materialization read (packaged build) |

---

## Human Checkpoints (separate phrases — do not combine)

| # | Phrase | Scope | Lane |
|---|--------|-------|------|
| 1 | `APPROVE PROD FIRESTORE RULES DEPLOY: PR40 REMAINING` | Firestore tip delta only | Parity |
| 2 | `APPROVE PROD STORAGE RULES DEPLOY: PR40 REMAINING` | Storage tip delta only (after #1 verified) | Parity |
| 3 | `APPROVE PROD FUNCTIONS WAVE A TAXONOMY` | Taxonomy CREATE + listed UPDATEs | Parity |
| 4 | `APPROVE PROD TAXONOMY MATERIALIZATION BOOTSTRAP` | Callable invoke | Parity |
| 5 | `APPROVE PROD FUNCTIONS DELETE: STAGE 4 PUBLISHERS` | Five deletes | Parity cleanup |
| 6 | Storage cleanup DRY-RUN / DELETE phrases | Later | Parity cleanup |
| 7 | Studio release approval | Later | Staff |
| A | `ALGOLIA PROD APP: SEPARATE\|REUSE WQ6OPP2E6Z` (+ App ID + `ALGOLIA ADMIN SECRET: READY`) | Config only; no enable | **Optional** |
| B | `APPROVE PROD FUNCTIONS WAVE A ALGOLIA` | Algolia CREATE only | **Optional** |
| C | `APPROVE PROD ALGOLIA ENABLE` | Flag + public env | **Optional** |

**Immediate next (only):** phrase row **#1** (Firestore Rules).

---

## Risks

| Risk | Mitigation |
|------|------------|
| Deploy Algolia Functions with `_dev` default | Gate 1 hard prerequisite for Wave A-Algolia |
| Bundle taxonomy + Algolia in one deploy | Split waves |
| Storage Rules deny before Stage 4 | **N/A — Stage 4 already live** |
| Delete publishers before Rules deny | Prefer Rules first; still deferrable |
| Treat cleanup as launch blocker | Explicit defer classification |
| Index redeploy | Forbidden — already 71/71 |

---

## Open Questions

1. Owner Algolia app choice: SEPARATE vs REUSE `WQ6OPP2E6Z`?
2. After config, does owner prioritize Rules/taxonomy (staff) or Algolia enable (managed search)?

---

## FreshForge impact classification

| Area | Impact |
|------|--------|
| Starter Surface | Docs/workflow artifacts only |
| Development Tooling | None |
| Distribution/Installer | Studio package residual noted (not executed) |
| Documentation | Workflow plans/reviews + state |
| Development History | None |
