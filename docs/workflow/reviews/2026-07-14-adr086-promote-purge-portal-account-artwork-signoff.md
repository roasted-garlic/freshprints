# Signoff: ADR-FP-086 promote purge + Portal account artwork

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-14-adr086-promote-purge-portal-account-artwork-plan.md |
| Review | docs/workflow/reviews/2026-07-14-adr086-promote-purge-portal-account-artwork-review.md |
| Test report | docs/workflow/reviews/2026-07-14-adr086-promote-purge-portal-account-artwork-test-report.md |
| Final status | **approved** |

---

## Summary

Finished ADR-FP-086 §4–§5 on `fresh-prints-dev`: promote-path donation cool-off purge (`purgePromotedDonationFullSize`, `promotedAt` on promote) and Portal `/dashboard` Artwork split into **Reusable** vs **Past uploads**. Manual Studio + Portal checks passed.

---

## Changes Delivered

### Behavior
- Promote to AI Review stamps `promotedAt`; after 14 days, Admin/owner callable purges customer-upload full-size (keeps thumb/preview)
- Studio Retention maintenance exposes promoted-donation purge (dry run + real)
- Portal account Artwork: Reusable (favorites + prior catalog) and Past uploads (lightbox-only history)

### Files Created
- Shared promote cool-off eligibility + unit tests
- `purgePromotedDonationFullSize` callable
- Portal account reusable designs service / gallery sections
- Plan, review, test report, this signoff

### Files Modified
- `promoteCustomerUploadToAiReview` (set `promotedAt`)
- Studio Retention UI
- Portal `/dashboard` artwork UI
- ADR / DATA_MODEL / BACKEND / ROADMAP as needed in implementation

### Documentation Updated
- Plan, review, test report, signoff under `docs/workflow/`
- ROADMAP item marked complete

---

## Tests

### Automated
- Unit: `promotedDonationFullSizeRetention.test.ts` — pass (2/2)
- Functions build — pass
- Portal typecheck — pass
- Dev deploy purge + promote + indexes — pass

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Studio promoted-donation purge dry run (+ optional real) | PASS | human (owner) |
| Portal `/dashboard` Reusable vs Past uploads + add from Reusable | PASS | human (owner) |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | | Dev only |
| Database migration | N/A | | Indexes deployed to dev |
| Design / UX | obtained | 2026-07-14 | Manual PASS |
| Business / policy | N/A | | Per ADR-FP-086 |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Retention callables not on Scheduler | low | Queued on ROADMAP |
| Production deploy not done | info | Separate release when ready |

---

## Deferred Items (Roadmap)
- Optional Cloud Scheduler for retention callables (ADR-FP-086)

---

## Open Blockers
- [x] None

---

## Verdict

**approved** — automated gates passed; owner manual PASS recorded 2026-07-14.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed (no change)
- [x] **`references/project-chatgpt-handoff/CURRENT-STATE.md` updated** — N/A (handoff package not present)
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated — N/A

**Recommended next action for user:** Pick next work (Firebase account linking, Phase 9 planning, production Portal deploy, or Scheduler for retention callables).
