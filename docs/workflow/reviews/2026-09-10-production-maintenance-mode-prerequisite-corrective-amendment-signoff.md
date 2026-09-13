# Signoff: Production maintenance-mode prerequisite — corrective amendment

| Field | Value |
|-------|-------|
| Date | 2026-09-10 |
| Signoff by | Codex / FreshForge Signoff |
| Managed goal | `production-maintenance-mode-prerequisite` |
| Plan | `docs/workflow/plans/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-review.md` |
| Implementation Review | `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-implementation-review.md` |
| Test report | `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-test-report.md` |
| DEV deployment | `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-dev-deployment.md` |
| Owner DEV QA | **PASS** (2026-09-10) — `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-dev-qa.md` |
| Final status | **approved_with_notes** |

## Summary

The production maintenance-mode prerequisite is complete in DEV. The corrective amendment now
uses one shared customer-safe heading/body contract, native Studio Settings controls, and a trusted
owner/admin tester candidate list that excludes merged, disabled, deleted, guest, orphaned, and
inactive-user accounts. The trusted backend guard revalidates tester eligibility before covered
customer mutations. Owner DEV QA passed the complete revised journey.

This signoff closes the managed goal in `fresh-prints-dev`. It does not authorize production
deployment or activation, the parent coordinated production rollout, Studio/Portal publishing,
data operations, commit, or push.

## Changes Delivered

### Behavior

- Portal renders the saved maintenance heading/body at runtime; missing state remains OFF with
  friendly defaults.
- Portal auth/navigation gating keeps blocked sessions out of the customer shell and returns a
  signed-out maintenance tester to login.
- Studio Settings exposes separately styled maintenance heading/message fields and a searchable
  tester selector backed by the owner/admin-only candidate-list callable.
- The shared eligibility helper is used by candidate listing, save validation, caller-specific
  public access, and the mutation guard; stale merged/disabled/inactive testers lose bypass access.
- Public state never exposes the configured tester UID or audit fields.
- Exactly 37 reviewed Functions are ACTIVE in `fresh-prints-dev/us-central1`; no corrective Rules,
  indexes, hosting, or production deployment was performed.

### Files Created

- `functions/src/listPortalMaintenanceTestCustomers.ts` and maintenance shared/backend tests.
- Corrective Studio/Portal maintenance source and contract coverage.
- Workflow artifacts: corrective implementation review, Test report, DEV deployment, Owner DEV QA,
  and this Signoff.

### Files Modified

- Shared maintenance constants, trusted maintenance resolver, maintenance callables, and the
  existing guard-bearing customer callables.
- Portal maintenance context/experience, auth/login/navigation maintenance gating, and Studio
  maintenance Settings component, hook, and service.
- `docs/architecture/BACKEND.md` plus FreshForge state/handoff records.

### Documentation Updated

- `docs/project/ROADMAP.md` marks the DEV goal DONE.
- Handoff `CURRENT-STATE.md`, `NEXT-PLANNED-GOAL.md`, `03-roadmap-and-phases.md`,
  `04-features-inventory.md`, `05-workflows-summary.md`, `07-backend-and-ai-pipeline.md`,
  `10-security-essentials.md`, and `13-recent-completed-work.md`.

## Tests

### Automated

- Corrective shared/Functions/Portal/Studio contracts: **10/10 PASS**.
- Trusted resolver integration under Firestore emulator: **4/4 PASS**.
- Firestore + Storage Rules emulator regression: **182/182 PASS** across 22 suites.
- Functions build: **PASS**.
- Portal typecheck: **PASS**.
- Changed-source ESLint: **PASS**, zero warnings/errors.
- `git diff --check`: **PASS**.
- Deployed Function verification: **37/37 present and ACTIVE**.
- Deployed public maintenance read: **HTTP 200**, customer-safe projection; unauthenticated
  candidate-list endpoint: **HTTP 401**.

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Studio styling and separate heading/message fields | **PASS** | Owner |
| Saved copy appears in Portal without rebuild | **PASS** | Owner |
| Merged/disabled accounts excluded; valid active linked tester saves | **PASS** | Owner |
| Ordinary-customer full-screen maintenance | **PASS** | Owner |
| Configured tester normal access, yellow banner, and safe mutation | **PASS** | Owner |
| Owner/admin Show Queue access and unauthorized centered denial | **PASS** | Owner |
| Turning maintenance OFF restores normal Portal and removes banner | **PASS** | Owner |

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Corrective Plan / Formal Review | obtained | 2026-09-10 | Owner accepted; Implement authorized |
| Owner DEV QA | obtained — **PASS** | 2026-09-10 | Final corrective journey passed |
| Production deploy | not required / not authorized | 2026-09-10 | Remains a separate checkpoint |
| Database migration | not required | 2026-09-10 | No migration or initialization |
| Design / UX | obtained — **PASS** | 2026-09-10 | Owner verified Studio styling and Portal states |
| Business / policy | not required | 2026-09-10 | No policy change |
| Secrets / env | not required | 2026-09-10 | No secret or shared environment change |

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Studio project typecheck retains 25 unrelated baseline diagnostics | Low | No diagnostic references corrective files; track separately |
| Portal production build hits existing Windows `.next/trace` EPERM while dev server owns output | Low | Re-run with the dev process stopped when a production build is separately needed |
| Functions deployment warns Node.js 20 deprecation | Medium | Track a separately reviewed runtime-upgrade phase; no scope expansion here |
| Live DEV maintenance document remains owner-controlled and ON | Informational | No Codex mutation; owner controls future QA/settings state |

## Deferred Items (Roadmap)

- Production Functions/Rules/Storage/Hosting deployment or maintenance activation.
- Parent coordinated production candidate freeze, rollout, or Signoff.
- Studio publish, Portal production hosting deployment, commit, and push.
- Any production data operation or maintenance-setting initialization/migration.

## Open Blockers

- [x] None for this DEV managed goal.

## Verdict

**approved_with_notes** — implementation, automated Test, narrow DEV deployment, and final Owner DEV
QA are complete. Notes are limited to documented unrelated local diagnostics/build/runtime
follow-ups and the explicitly separate production/parent-release gates.

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` unchanged; no new project risk was introduced
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Other applicable handoff files refreshed

**Recommended next action for owner:** select the next managed goal with `Continue FreshForge`.
