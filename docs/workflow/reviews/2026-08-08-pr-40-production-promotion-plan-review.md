# Formal Review: PR #40 — Production promotion + merge readiness plan

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Reviewer | Review Agent (overnight closeout — independent re-challenge) |
| Plan | `docs/workflow/plans/2026-08-08-pr-40-production-promotion-plan.md` |
| Planned HEAD | `54b9fef8a0ccfa29c8b0dbcd238f8379a74e5608` |
| Stage 5 Signoff | `docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-signoff.md` (**approved_with_notes**) |
| Verdict | **approved_with_changes** |
| Owner auth | `APPROVE STAGE 5 SIGNOFF` + conditional `APPROVE PR 40 PRODUCTION PROMOTION PLAN` (docs only) |

---

## Summary

Independent Formal Review after Stage 5 closeout and App Hosting secrets integration. The
promotion Plan remains the correct cumulative release guide for PR #40. Stage 5 docs gate and
App Hosting **secrets create/grant** are now closed. Remaining blockers before merge are
**pre-merge verification on exact HEAD**, **read-only production inventory**, and **Algolia /
App Hosting auto-deploy strategy** — not missing Stage 5 Signoff. Verdict:
**approved_with_changes** (execution RCs still binding; no production action authorized).

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Docs/planning only |
| Architecture alignment | pass | Algolia search; taxonomy materialization; publishers retired |
| Security impact addressed | pass | Secret Manager YAML; no secret values; allowlists |
| Data model impact addressed | pass | Materialization; indexes; snapshotPublicationState |
| Backend impact addressed | pass | CREATE/UPDATE/DELETE Waves |
| Test strategy adequate | pass | Exact package.json commands listed |
| Human checkpoints identified | pass | Separated; Stage 5 + plan approval marked DONE |
| Roadmap alignment | pass | Stage 6 track |
| Documentation plan | pass | Stage 5 Signoff + this review |
| No silent scope expansion | pass | No merge/deploy in this pass |

---

## Independent challenges

| Challenge | Finding | Disposition |
|-----------|---------|-------------|
| Deployment ordering | Merge before destructive deletes; Algolia OFF initially; Storage Rules after Portal Stage 4 live | **Accept** |
| Rollback safety | Publisher delete + Storage cleanup irreversible without regen — correctly late-gated | **Accept** |
| Secret handling | Firebase web secrets CLOSED; never print values; Algolia admin still **[NEEDS OWNER CHECK]** | **Accept** + RC-R3 |
| Algolia outage | FS browse safe when flag off — evidenced Stage 1b-C / Stage 4 | **Accept** |
| Publisher deletion timing | After Portal cutover — correct | **Accept** |
| Taxonomy bootstrap timing | Functions + fallback before dependence; bootstrap before spike claim | **Accept** |
| Stage 5 prod cleanup timing | Separate from Stage 5 **dev** Signoff; script cannot hit prod | **Accept** |
| App Hosting rollout timing | After YAML on `production`; separate `APPROVE APP HOSTING ROLLOUT` | **Accept** |
| Project targeting | Explicit `--project fresh-prints-prod` on all future prod commands | **Accept** |
| Dev-only tools | Stage 5 script + Studio bridges gated | **Accept** |
| Merge point | After pre-merge suite + inventory; before deletes — correct | **Accept** |
| Missing owner checkpoints | Pre-merge verification still outstanding | **RC-R7** |
| Stage 5 Signoff missing | **Cleared** this pass | RC-R1 **SATISFIED** |

---

## Required Changes (execution-binding)

| ID | Status | Change |
|----|--------|--------|
| RC-R1 | **SATISFIED** | Stage 5 Formal Signoff complete (`approved_with_notes`) |
| RC-R2 | Open | Finalize Function allowlists from live `fresh-prints-prod` inventory |
| RC-R3 | Open | Prove Algolia prod app/index/secrets (non-`_dev`) before enable |
| RC-R4 | Open | Storage Rules after Portal Stage 4 live on prod |
| RC-R5 | Open | Resolve App Hosting auto-deploy behavior before merge |
| RC-R6 | Open | Prod Storage delete only via separate procedure + late checkpoint |
| RC-R7 | Open | Re-run/record pre-merge suite on exact merge HEAD (`54b9fef` or newer) |
| RC-R8 | Open (new) | Do not reopen App Hosting Firebase secret create; rollout remains `APPROVE APP HOSTING ROLLOUT` only |

---

## Architecture / Security / Backend

Prior review findings stand. Additional overnight notes:

- PR head refreshed: **54 commits / 415 files / +42399/−6907**; mergeable clean; **0** GitHub checks.
- Checkpoint 2b secrets create/grant = **SATISFIED**; rollout = **NOT RUN**.
- Stage 5 Signoff notes (Rules emulator unrun; optional post-Rules smoke) do **not** block promotion planning.

**Human approval needed before production:** all remaining phrases in plan § Human Checkpoints 3–14.

---

## Verdict

**approved_with_changes**

Owner may treat the production-promotion **Plan as accepted for sequencing**. Next live human
checkpoint is **pre-merge verification** (and/or read-only prod inventory), **not** merge,
App Hosting rollout, or any Firebase mutation.

---

## Next required owner phrase

```text
APPROVE PR 40 PRE-MERGE VERIFICATION
```

(After recording PASS on exact HEAD suite — or request agent to run the suite under that phrase.)

Alternate concurrent prep (read-only):

```text
APPROVE PR 40 PROD INVENTORY
```

---

## Confirmations

- NO application implementation
- NO production mutation
- NO Firebase / Algolia / secret / App Hosting / taxonomy / Function / Storage / Rules action
- NO PR merge
- NO force push
