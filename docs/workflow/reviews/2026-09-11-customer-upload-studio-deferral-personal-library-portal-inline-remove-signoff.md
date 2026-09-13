# Signoff: Customer-upload Studio deferral, personal library, and Portal inline Remove

| Field | Value |
|-------|-------|
| Date | 2026-09-11 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-11-customer-upload-studio-deferral-personal-library-portal-inline-remove-plan.md` |
| Review | `docs/workflow/reviews/2026-09-11-customer-upload-studio-deferral-personal-library-portal-inline-remove-review.md` |
| Test report | `docs/workflow/reviews/2026-09-11-customer-upload-studio-deferral-personal-library-portal-inline-remove-test-report.md`; prior corrective evidence: `docs/workflow/reviews/2026-09-11-pre-freeze-owner-qa-correctives-request-editing-live-sync-and-denied-intake-test-report.md` |
| Final status | **approved_with_notes** |

---

## Summary

The reviewed DEV-only follow-up is complete. Studio customer-upload intake is deferred until a
successful Add to Show, queue alerts wait for the post-success settle window, Portal item removal
uses inline Cancel/Confirm, and Your designs separates Personal artwork from promoted Design Library
artwork with bounded retention. The owner explicitly reported **`OWNER DEV QA: PASS`** on 2026-09-11,
clearing the remaining Workstream D QA checkpoint. The related gallery Add-to-Request / Your designs
Owner QA is also recorded as PASS.

---

## Changes Delivered

### Behavior

- `studioIntakeHoldUntilShow` keeps print-request uploads out of Studio intake until Add to Show;
  successful queue/allocation paths release the hold into the appropriate Pending or Denied state.
- Personal Don’t-allow uploads use the reviewed 30-day retention episode; staff Excluded remains a
  separate 14-day episode; B1 request/allocation blockers remain authoritative.
- Portal Remove follows the inline Duplicate / Cancel / Confirm interaction and preserves existing
  mutation and restoration behavior.
- Staff Inbox queue sound/toast presentation waits for the post-success settle window and remains
  coalesced.
- Your designs provides Personal / Uploaded / Donated and Design Library tabs, Add to Request, and
  retention copy; Uploaded/Donated staff-managed artwork is not customer-deletable.

### Files Created

- Runtime and focused contract files are included in owner-authorized commit `35d80ec7`; see the
  commit’s 101-path implementation/test/documentation set.
- This signoff record.

### Files Modified

- Portal request/gallery, notifications, and customer-upload flows.
- Studio customer-upload intake, Add-to-Show, Staff Inbox alert timing, and styling.
- Shared customer-upload retention/intake-release types and helpers.
- Functions for attach, follow-up, retention, restore, and notification-history paths.
- `firestore.indexes.json` with the reviewed additive indexes.

### Documentation Updated

- `docs/project/ROADMAP.md`
- `.cursor/workflow/state.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md`
- `references/project-chatgpt-handoff/03-roadmap-and-phases.md`
- `references/project-chatgpt-handoff/04-features-inventory.md`
- `references/project-chatgpt-handoff/05-workflows-summary.md`
- `references/project-chatgpt-handoff/06-data-model-essentials.md`
- `references/project-chatgpt-handoff/07-backend-and-ai-pipeline.md`
- `references/project-chatgpt-handoff/12-decisions-and-constraints.md`
- `references/project-chatgpt-handoff/13-recent-completed-work.md`

---

## Tests

### Automated

- Reviewed focused rerun: **92 passed / 1 failed / 93 total**; full breakdown is in the child Test Report.
- The single failure is the known unrelated `functions/src/lib/customerUploadDeletionEligibility.test.ts`
  manifest baseline: the current expected list still includes
  `interactiveEnhancedProductionStoragePath`, while the implementation manifest omits it. No
  implementation-scoped contract failed.
- Prior implementation validation remains recorded: Functions build, Portal typecheck, Studio Vite
  build, targeted ESLint, and `git diff --check` passed. The unrelated Studio full typecheck and
  Windows Portal build baselines remain documented in the test evidence.

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Workstream D intake deferral / Add-to-Show release | PASS | Owner (`OWNER DEV QA: PASS`) |
| Workstream A post-success queue alert timing | PASS | Owner DEV QA checkpoint |
| Portal inline Remove and live request sync | PASS | Owner DEV QA checkpoint |
| Your designs Personal / Design Library, Add to Request, retention copy | PASS | Owner (gallery QA report) |
| Personal-only customer delete UI and staff-managed upload protection | PASS | Owner (gallery QA report) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Owner DEV QA | **obtained** | 2026-09-11 | Exact owner response: `OWNER DEV QA: PASS` |
| Production deploy | not required | 2026-09-11 | Production remains untouched and separately gated |
| Database migration | not required | 2026-09-11 | No production data operation or backfill |
| Design / UX | obtained | 2026-09-11 | Gallery / inline Remove behavior accepted in Owner QA |
| Business / policy | obtained | 2026-09-11 | Reviewed retention policy is implemented in DEV only |
| Secrets / env | not required | 2026-09-11 | No secret or shared environment change |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Deletion-eligibility manifest baseline expects `interactiveEnhancedProductionStoragePath` | Medium | Existing unrelated baseline; resolve in a separate reviewed maintenance task, not by weakening this signoff |
| Full Studio typecheck and Windows Portal production build retain documented unrelated baselines | Low | Existing diagnostics are recorded; changed-file validation and Vite build passed |
| Retention scheduler is deployed/represented for DEV evidence but remains paused | Low | Do not trigger destructive cleanup without a separately authorized controlled fixture run |

---

## Deferred Items (Roadmap)

- Rerun coordinated-production M0 with this child and the maintenance runtime included.
- Regenerate immutable manifests and assemble a new candidate SHA.
- Candidate freeze, production deploy/publish, maintenance activation, backfills, cleanup, and merge
  remain separate owner checkpoints.

---

## Open Blockers

- [x] None for this child. Parent M0 reconciliation and new candidate assembly remain the next
      managed checkpoint and are not part of this child’s Signoff gate.

---

## Verdict

**approved_with_notes** — Owner DEV QA passed. The notes are limited to the documented unrelated test
baseline and parent-level M0/freeze/production gates.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [ ] `RISK_REGISTER.md` updated if needed (no new product risk identified)
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Other handoff files refreshed per `references/project-chatgpt-handoff/MANIFEST.md`

**Recommended next action for user:**

Rerun the coordinated-production M0 packet, regenerate manifests from the resulting clean candidate
SHA, and request the separate owner decision before any M1 freeze or production action.
