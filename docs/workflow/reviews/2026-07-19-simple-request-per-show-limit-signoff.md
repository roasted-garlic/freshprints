# Signoff: Simple request-per-show limit (ADR-FP-102) + Portal UX polish

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-19-simple-request-per-show-limit-plan.md |
| Review | docs/workflow/reviews/2026-07-19-simple-request-per-show-limit-review.md |
| Test report | docs/workflow/reviews/2026-07-19-simple-request-per-show-limit-test-report.md |
| Manual QA | docs/workflow/reviews/2026-07-19-simple-request-per-show-limit-manual-qa.md |
| Final status | **approved_with_notes** |

---

## Summary

Owner **PASS** (2026-07-20) closed Small Managed Items **#3**: sole Portal print limit `L` (ADR-FP-102) plus in-phase UX polish (L banner/help, full-request helper, show callouts, qty-0 remove, design-card full label, Upload Designs overlay/slot cap, simplified upload/donate quota badges, ownership-gate clarity, quota hydrate / no green flash). Soft-deployed to **fresh-prints-dev** only. Cap A daily + Cap B remainder/choose-prints removed from Portal.

---

## Changes Delivered

### Behavior
- One limit `L` = `maxQuantityPerShowPerCustomer` (Current Request max = max prints per customer per show)
- Atomic full-queue-or-reject to exactly one show; empty Current Request after queue; no remainder / Choose Prints
- Cap A daily quota callable removed; legacy Cap A settings field write-only mirror of `L`
- Portal UX polish: L banner + help, centered full helper, spots-exhausted show callouts, qty-0 remove, full design-card label, Upload Designs full overlay + slot cap, request-room vs donate images/day badges, ownership gate copy, hydrate-before-ready (no green “L left” flash)
- Out-of-band absorbed: customer upload per-image 25→80 MB; Donate midnight CST + ZIP 2 GB (dev)

### Documentation Updated
- ADR-FP-102 in `docs/project/DECISIONS.md`
- Manual QA + test report marked PASS WITH NOTES 2026-07-20
- ROADMAP Small Managed Items #3 → Done

---

## Tests

### Automated
- Unit tests (38 + follow-up format/charge), Functions `tsc` build, Portal `tsc --noEmit` — passed (see test report)
- Scoped Functions + Firestore rules soft-deploy to `fresh-prints-dev`

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| ADR-FP-102 L limit + queue-to-show checklist | PASS WITH NOTES | owner 2026-07-20 |
| Cart drawer / L banner / show callouts / qty-0 / full labels | PASS | owner 2026-07-20 |
| Upload Designs overlay, slot cap, ownership gate, hydrate | PASS | owner 2026-07-20 |
| Upload/donate quota badge simplification | PASS | owner 2026-07-20 |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | | fresh-prints-dev only |
| Database migration | N/A | | |
| Design / UX | obtained | 2026-07-20 | Owner called polish + limit work PASSED |
| Business / policy | obtained | 2026-07-19 | Sole `L` model (ADR-FP-102) |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Functions still enforces **one Portal print request per customer per show**; Portal show callouts correctly describe **spots exhausted (used L)**, not uniqueness | medium | Product follow-up: confirm whether multi-request-under-L is desired; if yes, relax Functions uniqueness. ADR-FP-102 currently documents one-request-per-show. |
| Orphan remote Functions on fresh-prints-dev (`ensurePortalWorkingPrintRequest`, `customerDownloadAssistedCreationApprovedProof`) block full functions deploy | low | Hygiene pass later |
| Production Portal / Google / email still not released | — | Separate human approval |

---

## Deferred Items (Roadmap)
- Small Managed Items **#4** — Design library always newest first (next queued)
- #5–#10 account recovery / OG / share (queued)
- Parked: Review Request nav after rapid add; Clear request reuse same working id; rapid Add duplicate-create race; Portal auth busy gaps
- Phase 9 deferred: Create My Design with AI; design fee / Stripe; assisted questionnaire branching
- Production App Hosting / production Google enablement

---

## Open Blockers
- [x] None for this phase (manual QA human checkpoint cleared)

---

## Verdict

**approved_with_notes** — Owner PASS closes #3 and in-phase Portal UX polish. Note remains: align or explicitly keep Functions one-request-per-show vs possible multi-request-under-L product intent.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated (#3 Done)
- [ ] `RISK_REGISTER.md` updated if needed — N/A (known note in signoff)
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action for user:** Start Small Managed Items **#4** (design library always newest first), or pick a parked UX bug / production deploy / Phase 9 deferred slice explicitly.
