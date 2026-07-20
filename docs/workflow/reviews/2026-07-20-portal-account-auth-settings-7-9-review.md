# Review: Portal account auth settings (#7–#9) + Owner delete users (#10)

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-20-portal-account-auth-settings-7-9-plan.md |
| Verdict | **approved** (re-review after owner scope expansion) |

---

## Summary

Re-review after owner follow-up expanding the batch to include **#10 Owner delete users**. Prior approval of #7–#9 stands. #10 is correctly gated (owner + `fresh-prints-dev` + DEV Studio UI), hard-delete scoped to one selected identity, and distinct from bulk operational wipe (which preserves accounts). #12 remains backlog-only. Combined manual QA covering #7–#10 is appropriate.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | #7–#10; #11–#12 out |
| Architecture alignment | pass | Portal Auth/callables; Studio Test Data + new owner callable |
| Security impact addressed | pass | Request-only #9; hard delete #10 owner+allowlist; no self/last-owner delete |
| Data Model impact addressed | pass | Deletion request entity + cascade inventory for #10 |
| Backend impact addressed | pass | New Functions; fresh-prints-dev only |
| Test strategy adequate | pass | Automated + combined manual checkpoint |
| Human checkpoints identified | pass | One QA after all four built |
| Roadmap alignment | pass | Matches owner-directed batch |
| Documentation plan | pass | DATA_MODEL, BACKEND, DECISIONS, ROADMAP, SECURITY |
| No silent scope expansion | pass | #12 explicitly excluded |

---

## Security Review

**Findings:**
- #10 must reuse wipe project allowlist and owner-only assert; typed `DELETE USER` confirm.
- Must not allow deleting caller's own account or the last active owner.
- #9 remains request-only (no customer hard delete).

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] Production excluded

---

## Verdict Rationale

Owner-directed scope expansion is coherent (all account deletion/management before QA). Re-approve and continue implement without optional clarifications.

---

## Next Step

Implement #7–#10; deploy Functions to fresh-prints-dev; combined Manual Test Checkpoint.
