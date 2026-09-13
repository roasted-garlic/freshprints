# Test Report: Customer-upload Studio deferral, personal library, and Portal inline Remove

| Field | Value |
|-------|-------|
| Date | 2026-09-11 |
| Goal | `customer-upload-studio-deferral-personal-library-portal-inline-remove` |
| Scope | D intake deferral, A post-success alert timing, R inline Remove, C1 retention, C2 gallery |
| Result | **passed_with_notes** |

## Focused automated suite

The reviewed Portal, Studio, Functions, shared, and maintenance contracts were run together with
`npx tsx --test` across the child’s changed behavior. TAP result:

- **93 tests total**
- **92 passed**
- **1 failed (known unrelated baseline)**

The failure is `functions/src/lib/customerUploadDeletionEligibility.test.ts` (manifest alignment
expects `interactiveEnhancedProductionStoragePath`, while the current implementation manifest omits
it). This is unrelated to the child’s changed behavior and is retained as a separate follow-up; no
implementation-scoped contract failed.

Covered contracts include:

- Studio intake hold/release and Pending/Denied query/count filtering.
- Add-to-Show/allocation transition wiring and atomic customer-upload writes.
- Personal / Uploaded / Donated / Design Library gallery tabs, Add to Request, and Personal-only
  customer deletion UI.
- Portal inline Remove, live request/item synchronization, and terminal quota error recovery.
- Staff Inbox queue-alert settle timing.
- Follow-up Ask Again / Allow / Decline, notification history, maintenance guard, and retention
  clocks/scheduler safety.
- Existing customer-upload deletion blockers and Portal maintenance contracts.

## Build and validation evidence

- Functions build: **PASS**.
- Portal typecheck: **PASS**.
- Studio Vite build: **PASS** (existing chunk-size/dynamic-import warnings only).
- Targeted ESLint: **PASS**.
- `git diff --check`: **PASS**.
- Full Studio typecheck and Windows Portal production build retain their documented unrelated
  baseline diagnostics; no changed-file diagnostic was introduced.

## DEV / owner evidence

- Reviewed DEV Functions and additive indexes were deployed to `fresh-prints-dev`; local Portal and
  Studio served the current source; the retention scheduler remained paused.
- Owner reported **`OWNER DEV QA: PASS`** on 2026-09-11. Gallery Add-to-Request / Your designs QA is
  recorded separately as PASS in
  `docs/workflow/reviews/2026-09-11-gallery-add-to-request-owner-qa.md`.

## Boundary

No production deployment, publication, candidate freeze, maintenance activation, backfill,
destructive cleanup, or production data operation was performed.
