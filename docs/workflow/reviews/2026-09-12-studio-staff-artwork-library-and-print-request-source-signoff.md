# Signoff: Studio Staff Artwork library and Print Request source

| Field | Value |
|-------|-------|
| Date | 2026-09-12 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-11-studio-staff-artwork-library-and-print-request-source-plan.md` |
| Review | `docs/workflow/reviews/2026-09-11-studio-staff-artwork-library-and-print-request-source-review.md` |
| Test report | `docs/workflow/reviews/2026-09-11-studio-staff-artwork-library-and-print-request-source-test-report.md` |
| DEV deployment | `docs/workflow/reviews/2026-09-11-studio-staff-artwork-library-dev-deployment.md` |
| Final status | **approved_with_notes** |

---

## Summary

The accepted Staff Artwork Plan/Formal Review was implemented, deployed to the authorized DEV
allowlist, and passed Owner DEV QA. The owner reports full testing of the original scope plus the
subsequent corrective work: PNG-only uploads with Auto/Light/Dark background handling, completed
show/sheet deletion release, queue/allocation source fallback, catalog create permission repair,
Portal/Studio parity, and explicit AI Review promotion behavior.

Production remains untouched. Parent M0, candidate freeze, Studio publication, migration/backfill,
commit/push, and production promotion remain separate checkpoints.

## Changes Delivered

### Behavior

- Added the private `staffArtworks` entity and `/staff-artwork/{staffArtworkId}/` asset namespace.
- Added trusted upload/finalize, metadata CRUD, archive/restore, safe deletion, and AI Review
  promotion with private metadata stripping and idempotency.
- Propagated `staff_artwork` through Print Requests, CR/IR attachment, sizing, enhancement,
  allocation, exports, ZIPs, gang sheets, copy/convert, and history.
- Added Studio Staff Artwork library, customer picker, helper selection-only permissions, direct
  request selection, and Portal customer-safe projection.
- Added Rules/index coverage and lean source-specific request-item create validation to stay within
  the Firestore expression budget.

### Files Created / Modified

The implementation and corrective changes are distributed across shared types/utilities, Functions,
Firestore/Storage Rules and indexes, Studio/Portal request flows, and the handoff documentation.
The complete source-branch inventory is in the Implementation Review and the DEV deployment record.

### Documentation Updated

- `docs/project/ROADMAP.md`
- `.cursor/workflow/state.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md`
- `references/project-chatgpt-handoff/13-recent-completed-work.md`
- Applicable handoff feature, workflow, data-model, backend, and decision summaries

## Tests

### Automated

- Source-focused contracts: **31/31 passed**.
- Emulator-backed Staff Artwork/catalog create Rules suites: **11/11 passed**.
- Prior Staff Artwork focused suite: **22/22 passed**.
- Functions build: **PASS**.
- Portal typecheck: **PASS**.
- Targeted changed-source lint and `git diff --check`: **PASS** after final UI cleanup.
- Repository-wide Rules command retains a documented legacy expression-budget baseline; no new
  Staff Artwork focused failure was observed.
- Studio full typecheck/build retain the documented unrelated baseline diagnostics.

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Staff Artwork library upload, PNG restriction, and Auto/Light/Dark handling | PASS | Owner DEV QA |
| Customer association/editing and request selection | PASS | Owner DEV QA |
| Helper selection versus management denial | PASS | Owner DEV QA |
| CR/IR attachment, Portal/Studio parity, sizing, enhancement, queue/allocation, and export flows | PASS | Owner DEV QA |
| Archive/delete blockers and completed show/sheet release | PASS | Owner DEV QA |
| Send to AI Review confirmation, enqueue, promotion, and library removal | PASS | Owner DEV QA |
| Catalog Design Library add regression after Rules repair | PASS | Owner DEV QA |

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Owner DEV QA | **obtained** | 2026-09-12 | Owner reported: “I have fully tested and added other things we needed and I believe this is a pass.” |
| Production deploy | not required | 2026-09-12 | Production remains untouched and separately gated |
| Database migration | not required | 2026-09-12 | No migration or backfill performed |
| Design / UX | obtained | 2026-09-12 | Included in Owner DEV QA pass |
| Business / policy | obtained | 2026-09-12 | Accepted Plan/Formal Review decisions remain authoritative |
| Secrets / env | not required | 2026-09-12 | No secrets or shared environment changes |

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Legacy/heavy Firestore request Rules paths can hit the emulator expression budget | Medium | Focused lean catalog/Staff Artwork paths pass; track broader Rules simplification separately |
| Studio full typecheck/build retain unrelated baseline diagnostics | Low | Documented in the Test Report; no Staff Artwork file appears in those diagnostics |
| Parent candidate manifests are stale after this child | Medium | Rerun parent M0 and regenerate manifests from a new reviewed development snapshot |

## Deferred Items (Roadmap)

- Rerun coordinated-production M0 and regenerate all manifests.
- Assemble a new immutable candidate SHA and request the separate M1 freeze decision.
- Studio publication, production deploy, migrations/backfills, maintenance activation, and cleanup
  remain separately gated.

## Open Blockers

- [x] None for this child. Parent M0 reconciliation and production-readiness gates remain outside
      this signoff.

## Verdict

**approved_with_notes** — Owner DEV QA passed. Notes are limited to documented baseline Rules and
Studio diagnostics plus the parent-level candidate/freeze/production gates.

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Applicable handoff summaries refreshed

**Recommended next action:**

Rerun coordinated-production M0, regenerate manifests from the resulting clean candidate snapshot,
and request the separate owner decision before any M1 freeze or production action.
