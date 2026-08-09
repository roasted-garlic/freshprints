# Formal Review: PR #40 — Production promotion + merge readiness plan

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Reviewer | Review Agent (pre-merge verification + prod inventory reconciliation) |
| Plan | `docs/workflow/plans/2026-08-08-pr-40-production-promotion-plan.md` |
| Source verification SHA | `1d13edf2eb3d685773157c469b1b2e154fe0fd93` |
| Verification record | `docs/workflow/reviews/2026-08-08-pr-40-pre-merge-verification-result.md` |
| Inventory record | `docs/workflow/reviews/2026-08-08-pr-40-production-inventory-result.md` |
| Stage 5 Signoff | **approved_with_notes** |
| Verdict | **approved_with_changes** |

---

## Summary

Exact-HEAD pre-merge verification **PASS WITH NOTES** and read-only `fresh-prints-prod` inventory completed under owner phrases. RC-R2, RC-R5, RC-R7 are now **SATISFIED**. RC-R3 remains **OPEN** (Algolia admin secret absent; app/index unproven). RC-R4 / RC-R6 remain gated until Portal is live / Storage cleanup is separately approved. App Hosting automatic rollouts are **proven disabled** — merge ≠ Portal rollout.

---

## RC reconciliation

| ID | Status | Evidence |
|----|--------|----------|
| RC-R1 | **SATISFIED** | Stage 5 Signoff `approved_with_notes` |
| RC-R2 | **SATISFIED** | Live Function inventory → Wave A CREATE/UPDATE + Wave B DELETE allowlists finalized |
| RC-R3 | **OPEN** | `ALGOLIA_ADMIN_API_KEY` NOT_FOUND; Algolia app/index/search key **[NEEDS OWNER CHECK]** |
| RC-R4 | **OPEN** | Binding until Portal Stage 4 code live on prod App Hosting |
| RC-R5 | **SATISFIED** | `rolloutPolicy.disabled=true`, branch `production` — **MANUAL ROLLOUT PROVEN** |
| RC-R6 | **OPEN** | Residual ~31.5k+229 generated objects; delete still separately gated |
| RC-R7 | **SATISFIED** | Suite PASS WITH NOTES on `1d13edf` (md trailing whitespace only) |
| RC-R8 | **SATISFIED / BINDING** | App Hosting Firebase secrets CLOSED; rollout still `APPROVE APP HOSTING ROLLOUT` |

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Docs + read-only inventory only |
| Architecture alignment | pass | |
| Security impact addressed | pass | No secret values accessed |
| Backend impact addressed | pass | Allowlists grounded |
| Test strategy adequate | pass | Exact HEAD suite recorded |
| Human checkpoints identified | pass | Next: merge phrase (source only) |
| No silent scope expansion | pass | |

---

## Challenges after inventory

| Topic | Finding |
|-------|---------|
| Merge vs App Hosting | Safe: auto-rollout **disabled**; merge alone does not ship Portal |
| Algolia before merge | Not required for source merge; FS browse safe with Algolia OFF; RC-R3 blocks **enable**, not merge |
| Indexes missing | Four `readyAt` composites missing — deploy after merge under indexes phrase; New This Week may degrade until then |
| Publishers still live | Expected; Wave B after Portal Stage 4 live |
| PR body Stage 5 text | Still stale (“Signoff still separate if pending”) — **agent PR body PATCH blocked by hook**; owner should refresh description |

---

## Verdict

**approved_with_changes**

Source merge may proceed under owner phrase once owner accepts remaining notes (Algolia/indexes/post-merge runtime remain gated). Do **not** treat this as deploy or Algolia enable authorization.

---

## Next required owner phrase

```text
APPROVE PR 40 MERGE TO PRODUCTION
```

(Merge only. Does **not** deploy Functions, Rules, indexes, App Hosting, Algolia, or Storage cleanup.)

---

## Confirmations

- NO application implementation
- NO production mutation / deploy / bootstrap / Algolia / secrets / App Hosting / merge
