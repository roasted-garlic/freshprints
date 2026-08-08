# Formal Review: PR #40 — Production promotion + merge readiness plan

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-08-pr-40-production-promotion-plan.md` |
| Verdict | **approved_with_changes** |
| PR | #40 @ planned HEAD `2ae8b45` (re-verify at execution) |

---

## Summary

The plan correctly treats PR #40 as a **cumulative production-candidate** that is **not** merge-ready solely because GitHub reports `mergeable=true`. It separates source merge from destructive runtime deletes, documents Algolia fail-closed FS browse safety, pins Function allowlists, and correctly flags **Stage 5 Formal Signoff as MISSING**. Verdict is **approved_with_changes**: planning may proceed to owner-gated execution only after the required changes below are honored (no code implement in this pass).

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Planning/docs only; no merge/deploy in this pass |
| Architecture alignment | pass | Firestore taxonomy authority; Algolia search; publishers retired |
| Security impact addressed | pass | Secrets, Rules narrowing, no silent prod cleanup escape |
| Data model impact addressed | pass | Materialization derived; indexes; snapshotPublicationState |
| Backend impact addressed | pass | CREATE/UPDATE/DELETE + Waves A/B |
| Test strategy adequate | pass | Local suite substitutes for absent GitHub checks |
| Human checkpoints identified | pass | Separated destructive phrases |
| Roadmap alignment | pass | Stage 6 / prod promotion track |
| Documentation plan | pass | Plan + this review; Stage 5 Signoff still required |
| No silent scope expansion | pass | Out of scope explicit |

---

## Architecture Review

**Findings:**

- Stage 4 Portal fail-closed + Algolia ON/OFF behavior is correctly used as the production safety net for incomplete Algolia setup.
- Taxonomy bootstrap-before-dependence with FS fallback matches BACKEND.md / spike-elimination RC3.
- Publisher source deletion ≠ live Function deletion is correctly emphasized.
- Category I files are explained; no unexplained production-impacting mystery paths found in the plan’s inspection.

**Required changes:**

- [x] RC-R1: Before any production Storage cleanup narrative proceeds, complete **Stage 5 Formal Signoff** (dev) as a docs gate — plan already requires this; do not skip.
- [x] RC-R2: At execution, re-derive Function UPDATE allowlist from live `fresh-prints-prod` inventory + `git diff origin/production...HEAD` — do not treat the plan’s example Wave A as final without that inventory.

---

## Security Review

**Findings:**

- Admin Algolia key via Secret Manager; Portal search-only keys — correct.
- Default Functions index name `portal_catalog_ready_dev` is a **production footgun** if params unset — plan correctly requires override.
- Stage 5 script hard-pin to `fresh-prints-dev` is correctly treated as unable to clean prod (do not weaken pin for convenience).
- Dev console bridges gated to DEV + `fresh-prints-dev` — acceptable for production Studio packages.
- Attached `apphosting.yaml` prod Firebase public config is expected for production App Hosting; Algolia vars still absent — enablement must be explicit.

**Required changes:**

- [x] RC-R3: Production Algolia enablement must not proceed until owner confirms separate prod index (not `_dev`) and Secret Manager entry exist (**NEEDS PROD CHECK**).
- [x] RC-R4: Storage Rules that remove public-read of generated assets must not deploy **before** Portal Stage 4 code is live on production App Hosting.

**Human approval needed before production:**

- [x] Merge, Algolia config/secrets, Functions deploy, Function deletes, Rules, indexes, Storage cleanup, Studio release, final smoke — all separate (plan § Human Checkpoints)

---

## Data Model Review

**Findings:**

- `taxonomyMaterialization` staff-read Rules correct.
- `snapshotPublicationState` → default-deny after match removal — correct for Stage 5 posture.
- `readyAt` indexes required for New This Week / filtered ordering — deploy indexes before relying on those queries at scale.

**Required changes:**

- [ ] None beyond plan’s inventory of whether indexes already exist on prod.

---

## Backend Review

**Findings:**

- Six publisher delete names match Stage 4 Signoff.
- CREATE list for Algolia + taxonomy matches HEAD `index.ts`.
- Prefer allowlists; reject broad Functions deploy for this release — correct.
- Merge-before-destructive-delete timing is sound.
- App Hosting auto-deploy on merge is correctly flagged **NEEDS PROD CHECK** and changes merge risk profile.

**Required changes:**

- [x] RC-R5: If App Hosting auto-deploys on merge, Checkpoint 2 **is** Portal rollout — Algolia must remain OFF (or fully ready) at merge; document the chosen path in the inventory record before merging.
- [x] RC-R6: Do not authorize production generated Storage DELETE until: Portal Stage 4 live, publishers deleted (or proven idle), dry-run inventory recorded, and a **prod-capable** cleanup procedure exists (not the current dev-pinned script).

---

## Test Review

**Findings:**

- Absence of GitHub checks correctly forces a mandatory local pre-merge suite on exact HEAD.
- Live QA from taxonomy 45-design / Stage 4 / Stage 1b-C is evidence for **dev**, not a substitute for prod smoke or for re-running automated suites on final HEAD before merge.

**Required changes:**

- [x] RC-R7: Pre-merge verification must be re-executed and recorded against the **exact merge commit** (if HEAD moves past `2ae8b45`, re-pin).

---

## Required Changes (summary for execution)

| ID | Change |
|----|--------|
| RC-R1 | Complete Stage 5 Formal Signoff before treating Stage 5 done / before prod cleanup story |
| RC-R2 | Finalize Function allowlists from live prod inventory at execution |
| RC-R3 | Prove Algolia prod app/index/secrets (non-`_dev`) before enable |
| RC-R4 | Storage Rules after Portal Stage 4 live |
| RC-R5 | Resolve App Hosting auto-deploy behavior before merge |
| RC-R6 | Prod Storage delete only via separate procedure + late checkpoint |
| RC-R7 | Re-run/record pre-merge suite on exact merge HEAD |

---

## Verdict rationale

**approved_with_changes** — Plan is sufficient to guide production promotion. Source is a coherent cumulative release but **not** merge-ready until Stage 5 Signoff, prod inventory, Algolia strategy, and pre-merge verification gates clear. No implementation or production action is authorized by this review.

---

## Next required owner phrase

```text
APPROVE STAGE 5 SIGNOFF
```

(or explicitly request agent to draft Stage 5 Signoff from existing dev records, then owner confirms)

Then:

```text
APPROVE PR 40 PRODUCTION PROMOTION PLAN
```

Then proceed to read-only production inventory + pre-merge verification (still no merge until `APPROVE PR 40 MERGE TO PRODUCTION`).

---

## Amendment (2026-08-08) — `apphosting-env-secrets` integration

Concurrent goal **SIGNOFF `approved_with_notes`**: plaintext removed from
`apps/portal/apphosting.yaml`; eight Secret Manager secrets **READY**
(`APP HOSTING SECRETS READY`). Production-promotion plan updated to:

- Treat Firebase web + origin secrets create/grant as **closed**
- Require secret-backed YAML on `production` before App Hosting consumes it
- Add explicit checkpoint `APPROVE APP HOSTING ROLLOUT` + post-rollout smoke
- Forbid restoring plaintext Firebase values to YAML

Does **not** reopen the secrets create checkpoint. Does **not** authorize App Hosting deploy.
Formal Review verdict remains **approved_with_changes** (RC-R1–RC-R7 still apply).

---

## Confirmations

- NO implementation beyond docs integration of closed `apphosting-env-secrets`
- NO Firebase mutation
- NO Algolia mutation
- NO secret change
- NO App Hosting / production deploy
- NO production cleanup
- NO PR merge
- NO branch deletion
