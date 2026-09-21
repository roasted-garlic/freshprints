# Signoff: Studio / Portal Print Request, Inbox, and AI Queue Batch

| Field | Value |
|-------|-------|
| Date | 2026-09-21 |
| Signoff by | FreshForge Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-20-studio-portal-print-request-inbox-ai-queue-batch-plan.md` |
| Review | `docs/workflow/reviews/2026-09-20-studio-portal-print-request-inbox-ai-queue-batch-formal-review.md`; `docs/workflow/reviews/2026-09-20-studio-portal-print-request-inbox-ai-queue-batch-implementation-review.md`; `docs/workflow/reviews/2026-09-21-print-request-gang-sheet-selection-amendment-review.md` |
| Test report | `docs/workflow/reviews/2026-09-20-studio-portal-print-request-inbox-ai-queue-batch-test-report.md` |
| Owner DEV QA | **PASS** — owner reports the complete manual QA looks great |
| Owner authorization | **COMPLETE SIGNOFF AND FULL COORDINATED PRODUCTION ROLLOUT** |
| Final status | **approved_with_notes** — no unresolved goal-owned blocker; release-critical verification and production records are appended below |

---

## Summary

The reviewed A/B/C/D/E batch is signed off after the owner’s DEV QA PASS. The implementation delivers adaptive gang-sheet labels, Staff Inbox pagination, selected-show Portal Admin search/grouping/totals, export-only partial Print Request gang-sheet selection with thumbnails and quantity overrides, and explicit Staff Artwork/AI Processing lifecycle and multi-page queue behavior.

The candidate is intended to promote only the reviewed application changes and release metadata. Unrelated working-tree changes remain excluded. Production promotion is through the protected `development` → `production` pull request path.

## Changes Delivered

### Studio and shared

- Adaptive label measurement/wrapping, cache versioning, grouped/continuous layout parity, and PNG/export geometry.
- Staff Inbox cursor pagination, stable ordering, live-page reconciliation, direct request-context hydration, and accessible Load More behavior.
- Print Request export-only item selection, thumbnails, quantity snapshotting, and no-mutation guarantees.
- Staff Artwork AI lifecycle routing and AI Processing continuation/prefetch across cursor pages with pause/stop/retry/stale/terminal safeguards.
- Shared Portal Admin DTO/privacy and snapshot-first pricing helpers.
- Studio release metadata for stable `1.0.18`.

### Portal and Functions

- Selected-show `/admin/show-queue` search, response-scoped privacy-safe customer grouping, separate request/show totals, responsive layout, and accessibility behavior.
- Exact reviewed Function targets only:
  - `getPortalAdminUpcomingShowQueueDashboard`
  - `promoteStaffArtworkToAiReview`

### Firestore indexes

The exact additive index manifest is:

1. `showAllocations`: `requestOriginSnapshot ASC`, `updatedAt DESC`, `__name__ DESC`
2. `upcomingShows`: `updatedAt DESC`, `__name__ DESC`
3. `designIssueReports`: `status ASC`, `createdAt DESC`, `__name__ DESC`
4. `designIssueReports`: `status ASC`, `resolvedAt DESC`, `__name__ DESC`

No Rules, Storage Rules, schema migration, backfill, production data rewrite, secret, IAM, or customer/request mutation is authorized by this signoff.

## Exact candidate scope

The candidate includes the reviewed goal-owned files and workflow artifacts, plus only the Studio `1.0.18` release-version updates required by the canonical stable workflow. The candidate excludes the unrelated customer-upload changes, prior Staff Artwork signoff edits, Portal-halftone plan/review/test artifacts, unrelated `firebase.json` edits, and all non-reviewed local Firestore index additions.

### Pre-commit reconciliation (2026-09-21)

| Check | Result |
|-------|--------|
| `firestore.indexes.json` isolation | **PASS** — working tree had 18 unrelated additive indexes (halftone/`designs`, `customerUploads`, `printRequests`) mixed with Staff Inbox work. Candidate rewritten from `HEAD` + exactly the four approved Staff Inbox signatures (99 total; +4 vs HEAD/prod; 0 removals). Unrelated index WIP preserved outside the commit for later owner work. |
| Missing `designIssueReports` `status+resolvedAt+__name__` | **FIXED** — restored into the candidate before commit. |
| Studio `1.0.18` release-policy assertions | **FIXED** — signing-policy test expectations aligned to `1.0.18` (30/30 pass). |
| Gang-sheet modal typecheck | **FIXED** — upload preview mat uses Print Request item snapshot (`StudioCustomerUploadSummary` has no `artworkBackgroundHex`). Studio `tsc` PASS after fix. |
| Portal `.next/trace` EPERM | **RESOLVED for candidate** — lock was concurrent local `npm run dev:portal` / `next dev --port 3100`, not a code defect. Portal next-dev stopped temporarily; `npm run build:portal` then **PASS** (includes `/admin/show-queue`). |

The staged candidate manifest and commit SHA are recorded before protected promotion.

## Tests

### Automated

- Focused A/D suites: **84 passed**.
- Staff Inbox B suites: **32 passed**.
- AI/Staff Artwork E suites: **32 + 52 passed**.
- Portal/Functions/C suites: **75 passed**.
- Shared + Studio pricing regression: **14 passed**.
- Studio and Portal typechecks: **PASS**.
- Functions build: **PASS**.
- Targeted ESLint: **PASS** for changed Studio/shared and Portal/Functions lanes.
- Studio Vite and packaged builds: **PASS**; recoverable electron-builder rename warnings documented.
- Firestore index JSON/signature validation and `git diff --check`: **PASS**.

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Studio adaptive labels, partial export, Staff Inbox, Staff Artwork, and AI Processing flows | **PASS** | Owner DEV QA |
| Portal `/admin/show-queue` search, grouping, totals, responsive/accessibility behavior | **PASS** | Owner DEV QA |

## Risks and known issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| The earlier Portal production build hit `EPERM` opening `apps/portal/.next/trace`. | Environment | Recheck and rerun the canonical Portal production build from the exact production candidate. If it cannot pass, stop before Portal rollout. |
| Repository-wide `npm run lint` has the documented unrelated baseline of 14 errors and 1 warning outside this goal. | Low / pre-existing | Targeted lint for all goal-owned changed files passed; do not expand scope to unrelated fixes. |
| Studio stable publication is internal-unsigned under the existing owner-approved policy; Windows SmartScreen and macOS Gatekeeper warnings are expected. | Operational | Use the canonical `studio-release.yml` workflow and stable publish helper; verify all eight assets and retain prior stable rollback. |

## Rollout manifest and evidence

| Item | Intended value before promotion | Final value |
|------|---------------------------------|-------------|
| Development candidate commit | To be recorded after staging | `35b0ea80b8821726f8cf1a9c1c23abe3ba0b3bbe` |
| Protected PR | `development` → `production` | [#106](https://github.com/roasted-garlic/freshprints/pull/106) |
| Production merge SHA | exact promoted candidate | `f09dafc6a9566fa0ee021646e5b7d1318cc010a9` |
| Production Firebase project | `fresh-prints-prod` | **verified** |
| Functions | two exact targets listed above | **ACTIVE** `…-00003-meq` / `…-00004-qif` (hash `1610f772…`) |
| Firestore indexes | four additive signatures listed above | **3 READY composites**; `upcomingShows(updatedAt+__name__)` covered by GCP single-field controls (composite create rejected as unnecessary); **0 removals** |
| Portal backend | `fresh-prints-portal` | `fresh-prints-portal-build-2026-09-21-001` **100%** traffic; smoke HTTP 200 |
| Studio stable | `1.0.18`, Windows + macOS arm64/x64, eight assets | **`v1.0.18` Latest**; workflow `35619359510`; rollback `v1.0.17` |

Production evidence: `docs/workflow/reviews/2026-09-21-studio-portal-print-request-inbox-ai-queue-batch-production-rollout.md`.

## Human approvals obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Owner DEV QA | **obtained** | 2026-09-21 | `OWNER DEV QA: studio-portal-print-request-inbox-ai-queue-batch - PASS` |
| Signoff | **obtained** | 2026-09-21 | This artifact records the reviewed scope and gate closure. |
| Coordinated production rollout | **obtained** | 2026-09-21 | Owner explicitly authorized signoff, commit/push, protected promotion, backend/index deployment, Portal rollout, Studio stable release, verification, and closeout. |
| Database migration/data rewrite | not required | 2026-09-21 | None in scope. |
| Secrets/IAM change | not required | 2026-09-21 | None in scope. |

## Open blockers

- [ ] None goal-owned. The Portal build exception is a release-candidate verification gate, not a known code blocker.

## Verdict

**approved_with_notes** — Owner DEV QA PASS and implementation/test gates are complete. Proceed with the exact protected promotion and rollout manifest above; stop on any new goal-owned validation failure, destructive index delta, missing production prerequisite, or failed canonical Portal build.

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with final rollout status
- [x] `docs/project/ROADMAP.md` updated
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Final production reconciliation appended to this artifact / rollout record

**Recommended next action:** None — goal closed. FreshForge IDLE.
