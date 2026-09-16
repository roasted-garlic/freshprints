# Signoff: Portal Admin Staff Artwork upload and Studio AI Review

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-15-portal-admin-staff-artwork-upload-plan.md` |
| Review | `docs/workflow/reviews/2026-09-15-portal-admin-staff-artwork-upload-formal-review.md` |
| Test report | `docs/workflow/reviews/2026-09-15-portal-admin-staff-artwork-upload-test-report.md` |
| Owner DEV QA | `docs/workflow/reviews/2026-09-15-portal-admin-staff-artwork-upload-owner-dev-qa-checklist.md` — **PASS** |
| Final status | **approved_with_notes** |

---

## Summary

Closed managed goal `portal-admin-staff-artwork-upload` on DEV after Owner DEV QA **PASS**, including
the corrective retests. Workstream A delivers an owner/admin-only, upload-only Portal Staff Artwork
route. Workstream B delivers full-card Multiple Select and bulk Send to AI Review in both Studio
libraries, canonical Ready → AI Review → Ready lifecycle behavior, truthful retry accounting, and
bounded Staff Artwork promotion diagnostics.

The original Ready-preserving dual-visibility implementation and its failed QA result remain recorded
in the Plan, Formal Review, and Test Report as history. The final active lifecycle is:

`ready + approved` → `imported + pending` normal Processing/Needs Review/Rejected → approval →
`ready + approved` → Design Library.

Production promotion remains a separate owner checkpoint.

## Changes Delivered

### Behavior

- Added Portal Admin `/admin/staff-artwork` navigation and browser PNG upload using the existing
  Staff Artwork create, canonical Storage source upload, and finalize callables.
- Corrected the Portal upload silent no-op under React development Strict Mode and added fallback-safe
  client ID generation for runtimes without a usable `crypto.randomUUID`.
- Added separate owner/admin Studio Multiple Select orchestration for Design Library and Staff
  Artwork. Entire eligible cards select/deselect; selected state is visible/accessibly exposed;
  normal Details/preview behavior is suppressed while active and restored on exit.
- Restored normal Design Library Ready reprocess semantics: accepted designs leave the Ready browse,
  enter normal AI Review, use existing Auto-process and retry controls, and return through approval.
- Removed obsolete active `aiReprocessState` / `ready_reprocess` dual-visibility logic.
- Added safe Staff Artwork promotion diagnostics while preserving owner/admin authorization, helper
  denial, deletion blockers, idempotency, no duplicate catalog design, sequential processing, and
  partial-failure isolation.

### Files Created

- `apps/portal/app/(admin)/admin/staff-artwork/`
- `apps/portal/features/admin-staff-artwork/`
- `apps/studio/src/renderer/src/features/designs/components/designCardMultiSelect.contract.test.ts`
- `apps/studio/src/renderer/src/features/designs/utils/designAiReprocessEligibility.ts`
- `apps/studio/src/renderer/src/features/staff-artwork/pages/staffArtworkAiReview.contract.test.ts`
- `apps/studio/src/renderer/src/features/staff-artwork/utils/staffArtworkCallableErrorMessage.ts`
- `apps/studio/src/renderer/src/features/staff-artwork/utils/staffArtworkCallableErrorMessage.test.ts`
- This Signoff and the related Plan, Formal Review, Test Report, and Owner QA checklist.

### Files Modified

- Portal Admin shell/auth/return-url and styling files.
- Studio Design Library, AI Review, Staff Artwork, shared styling, and related types/services.
- Functions AI pipeline/reprocess and `staffArtwork.ts` diagnostics.
- `docs/project/ROADMAP.md`, `docs/project/DECISIONS.md`, `docs/architecture/BACKEND.md`,
  `docs/architecture/FIREBASE.md`, `docs/standards/SECURITY.md`, and `docs/standards/TESTING.md`.
- Handoff package files required by `references/project-chatgpt-handoff/MANIFEST.md`.

### Documentation Updated

- Durable docs now describe the canonical imported/pending AI Review lifecycle and no active hybrid
  Ready/AI Review authority.
- The cumulative Production Promotion Manifest records actual production requirements and the exact
  changed Functions.
- Workflow state, CURRENT-STATE, roadmap, recent completed work, and next-goal handoff are closed/
  idle and retain corrective history and notes.

## Tests

### Automated

- Latest Workstream B focused suite: **86/86 PASS** (55 Studio, 31 Functions).
- Portal typecheck: **PASS**.
- Studio typecheck: **PASS**.
- Functions build: **PASS**.
- Changed-file TypeScript lint: **PASS**.
- `git diff --check`: **PASS**.
- Safe unauthenticated probes for all three DEV-deployed Functions: expected **401** responses.
- Portal production build was attempted but hit the known Windows `EPERM` opening ignored
  `.next/trace`; no source workaround was made.

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Owner DEV QA — Portal Admin upload/navigation and corrective no-op retest | **PASS** | Owner, 2026-09-15 |
| Owner DEV QA — Staff Artwork bulk/single, full-card selection, safety blockers, Auto ON/OFF | **PASS** | Owner, 2026-09-15 |
| Owner DEV QA — Design Library bulk/single, full-card selection, canonical lifecycle, retry accounting, Auto ON/OFF | **PASS** | Owner, 2026-09-15 |

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Owner DEV QA | **obtained — PASS** | 2026-09-15 | All required corrective retests passed. |
| Production deploy | **not authorized / not performed** | 2026-09-15 | Separate owner checkpoint. |
| Database migration | **N/A** | 2026-09-15 | No migration, schema change, or backfill. |
| Design / UX | **obtained through Owner DEV QA** | 2026-09-15 | Full-card interaction and modal suppression passed. |
| Business / policy | **obtained through Owner DEV QA** | 2026-09-15 | Canonical lifecycle and safety behavior passed. |
| Secrets / env | **N/A** | 2026-09-15 | No secret or shared environment change. |

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Portal production build remains locally blocked by Windows EPERM on ignored `.next/trace` | Low | Portal typecheck, focused tests, targeted lint, and Owner DEV QA passed; rerun in the production promotion environment. |
| Historic Staff Artwork bulk 400 cannot be tied to exact old selected IDs because logs lacked request payload IDs | Low | Safe diagnostics were added; current clean eligible records passed Owner DEV QA and safety blockers remain enforced. |
| Production promotion has not occurred | Informational | Manifest records required Portal App Hosting, Studio release, and three exact Functions for a future separately authorized promotion. |

## Deferred Items (Roadmap)

- Separately authorized production promotion of the three Functions, Portal App Hosting, and Studio
  release listed in the cumulative Promotion Manifest.
- Production smoke listed in the manifest; no production step is executed by this Signoff.

## Open Blockers

- [x] None for DEV goal closure.

## Verdict

**approved_with_notes** — Owner DEV QA PASS. Notes are non-blocking: the local Portal production
build has the known Windows ignored-file EPERM condition; the historical Staff Artwork 400 lacks
exact old request IDs despite its proven precondition-guard failure class; the original
Ready-preserving design was rejected and replaced by the canonical lifecycle; and all prior failed
QA/corrective history remains documented rather than rewritten.

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` reviewed; no new risk entry required beyond existing Staff Artwork risk
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Applicable handoff files updated: roadmap, feature, workflow, data model, backend/AI,
  security, and decisions summaries
- [x] Cumulative Production Promotion Manifest updated

**Recommended next action:** Owner-authorized production promotion review, or a new managed goal.
