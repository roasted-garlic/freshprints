# Formal Review: PR #40 production Rules deploy checkpoint

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Reviewer | Review Agent (independent) |
| Checkpoint | `docs/workflow/reviews/2026-08-08-pr-40-prod-rules-deploy-checkpoint.md` |
| Remaining-gates plan | `docs/workflow/plans/2026-08-08-pr-40-remaining-production-gates-plan.md` (amended) |
| Verdict | **approved_with_changes** |

---

## Summary

Preflight correctly re-derives live vs tip Rules deltas, proves Stage 4 live so generated public-read removal is safe, runs the authoritative `npm run test:rules` suite (**59/59**), and prepares **unexecuted** deploy commands. Verdict **approved_with_changes**: require **separate** Firestore-then-Storage owner phrases (not one bundled deploy), keep Algolia optional/off, and treat the failing `firestoreRulesPublicCatalogAlignment` regex as a non-blocking pre-existing test defect.

**STOP — no production deploy from this review.**

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Prep/test/checkpoint only |
| Architecture alignment | pass | Materialization staff-only; FS authority preserved |
| Security impact addressed | pass | Expansions limited; generated public reads restricted |
| Stage 4 prerequisite | pass | Live build-004 = tip; no Portal generated path consumers |
| Test strategy adequate | pass | Emulator 59/59 + relevant alignment 8/8 |
| Human checkpoints identified | pass | One next phrase = Firestore only |
| No silent scope expansion | pass | No Algolia/Functions/bootstrap |
| No production mutation | pass | Commands not executed |

---

## Security Review

**Findings:**

- **Permission expansion:** (1) staff-read on `taxonomyMaterialization` (customers still denied); (2) Assisted proof upload ceiling 25→80 MB for owner/admin paths already gated.
- **Permission restriction:** remove public reads on retired generated catalog prefixes — correct post–Stage 4 hardening.
- **No-op:** `snapshotPublicationState` dedicated deny match removal.
- **readyAt:** optional timestamp validation only — does not require field presence; aligns with completed backfill.

**Required changes:**

- [x] Do not deploy Storage in the same owner phrase as Firestore (rollback isolation).
- [x] Do not treat Algolia config as a blocker for this Rules gate.

**Human approval needed before production:**

- [x] `APPROVE PROD FIRESTORE RULES DEPLOY: PR40 REMAINING` then later Storage phrase

---

## Challenges

| Challenge | Disposition |
|-----------|-------------|
| Rules-before-cutover | **Retired** — Stage 4 live |
| Generated public-read removal breaks Portal | **Disproven** for tip/live |
| Bundled FS+Storage deploy | **Reject** — use Option B |
| Algolia-first sequencing | **Superseded** — Rules/taxonomy parity lane first |
| Index/backfill reopen | **Forbidden** — none remain |
| Alignment test failure blocks deploy | **No** — false positive regex; upcomingShows staff-only |

---

## Required changes (binding)

1. Next owner checkpoint is **Firestore Rules only**.
2. Storage Rules require a **second** explicit phrase after Gate 1 verification.
3. Algolia remains optional parallel; stays OFF.
4. Do not implement product/Rules “fixes” for the public-catalog alignment regex in this gate.

---

## Verdict

**approved_with_changes**

STOP.
