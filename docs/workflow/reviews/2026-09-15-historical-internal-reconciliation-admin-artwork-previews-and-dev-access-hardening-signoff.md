# Signoff: Historical Internal reconciliation, Admin artwork previews, and DEV access hardening

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-15-historical-internal-reconciliation-admin-artwork-previews-and-dev-access-hardening-plan.md` |
| Review | `docs/workflow/reviews/2026-09-15-historical-internal-reconciliation-admin-artwork-previews-and-dev-access-hardening-formal-review.md` |
| Test report | `docs/workflow/reviews/2026-09-15-historical-internal-reconciliation-admin-artwork-previews-and-dev-access-hardening-test-report.md` |
| DEV QA prep | `docs/workflow/reviews/2026-09-15-historical-internal-reconciliation-admin-artwork-previews-and-dev-access-hardening-dev-qa-preparation.md` |
| Final status | **approved** |

---

## Summary

Closed the managed goal that delivers (A) owner-only History Preview→Apply repair for completed Internal Gang Sheets without opening a new cycle, (B) Portal Admin View Designs Staff Artwork derivative previews under ADR-FP-187, and (C) DEV-only login/register overlay (every visit) plus server-authoritative approved-email customer access on `fresh-prints-dev` with production short-circuit. Owner DEV QA recorded **PASS**. No production mutation.

---

## Changes Delivered

### Behavior
- **A:** Owner Preview→Apply historical reconciliation on one selected completed Internal History sheet; reuses `finishShowAllocationsInTransaction` + `reconcilePrintRequestsAfterShowFinish`; Apply re-asserts `staff_gang_sheet` + completed; no N+1 cycle; button hidden when no finishable allocations remain; centered modal overlay.
- **B:** Admin View Designs signs Staff Artwork via `previewStoragePath ?? thumbnailStoragePath`; retires intentional blank; missing/signing failures remain honest; no Storage Rules widen; no production IAM.
- **C:** Full-screen DEV overlay on every `/login` and `/register` visit (visit-only dismiss); localhost + `myprintrequest.dev` tunnel; `settings/portalDevCustomerAccess` allowlist (owner/admin); `registerCustomer` + bootstrap gate on DEV only; production open / no overlay.

### Files Created (selected)
- `functions/src/lib/internalGangSheetHistoricalReconciliation.ts` (+ contract tests)
- `functions/src/previewInternalGangSheetHistoricalReconciliation.ts`
- `functions/src/lib/portalDevCustomerAccess.ts` (+ tests)
- `functions/src/getPortalDevCustomerAccessSettings.ts` / `update…` / `check…`
- Studio Historical Reconciliation dialog + service; DEV customer access Settings section
- Portal `PortalDevelopmentAuthOverlay` + shared allowlist constants
- Workflow plan/review/test/DEV QA/signoff docs

### Files Modified (selected)
- `functions/src/registerCustomer.ts`, `getPortalAdminShowQueueRequestDesigns.ts`, `index.ts`
- Studio `UpcomingShowsPage`, `permissionService`, Settings page
- Portal login/register, AuthProvider, `portalSearchIndexing`, `shell.css`
- `firestore.rules` (`settings/portalDevCustomerAccess`)
- `docs/architecture/BACKEND.md`, `DATA_MODEL.md`

### Documentation Updated
- Plan/Formal Review corrections (hosting + visit-only overlay)
- Test report + DEV QA preparation
- BACKEND.md DEV overlay/access note
- Cumulative Production Promotion Manifest (this Signoff + companion file)

---

## Tests

### Automated
- Focused suites **50/50 PASS** (plus corrective overlay/hosting contracts)
- Functions build PASS
- Portal typecheck PASS
- Studio typecheck PASS
- Targeted lint on changed files PASS
- Rules contract PASS
- `git diff --check` PASS
- Portal `next build` **EPERM** on `.next/trace` (documented environment blocker)

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Owner DEV QA A–C | **PASS** | Owner 2026-09-15 |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required / not authorized | | |
| Database migration | N/A | | |
| Design / UX | obtained (DEV QA) | 2026-09-15 | Overlay every login/register visit |
| Business / policy | obtained | 2026-09-15 | DEV allowlist; production open |
| Secrets / env | N/A | | |
| Production IAM | not authorized | | Record only if later evidence requires TokenCreator |
| Portal production App Hosting | not authorized | | DEV uses localhost + tunnel only |
| Studio release | not authorized | | |

---

## Production Promotion Manifest (compact; cumulative)

Companion: `docs/workflow/reviews/2026-09-pre-production-promotion-manifest.md`

### This goal entry — `historical-internal-reconciliation-admin-artwork-previews-and-dev-access-hardening`

| Kind | Entry |
|------|-------|
| Functions (prod later) | `previewInternalGangSheetHistoricalReconciliation`, `applyInternalGangSheetHistoricalReconciliation`, `getPortalAdminShowQueueRequestDesigns` (Staff Artwork path), `registerCustomer` (prod short-circuit), `getPortalDevCustomerAccessSettings`, `updatePortalDevCustomerAccessSettings`, `checkPortalDevCustomerAccess` |
| Firestore Rules | `settings/portalDevCustomerAccess` allowlist (owner/admin read; write false) |
| Portal publication | **Production App Hosting only** (`myprintrequest.com`) when promoting Portal source — **not** a DEV App Hosting step. DEV QA = localhost `:3100` + `myprintrequest.dev` tunnel. |
| Studio release | Required for History reconcile UI + DEV customer access Settings |
| Production IAM (B) | **Only if** read-only prod evidence confirms TokenCreator/signBlob gap — record exact self-binding action; separate checkpoint. Not confirmed/applied in this goal. |
| One-time data | Prod Internal History: Preview → owner authorize → Apply |
| Minimal prod smoke | One historical Internal PR Printed after Apply; Admin View Designs catalog/upload/Staff Artwork; production login/register open; no DEV overlay/gate on prod |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Auth orphans on DEV (no GCIP blocking) | Med (accepted) | Application gate denies use; disable/delete remains separate ops |
| Production historical Apply | High (ops) | Separate owner Preview then Apply checkpoints |
| Production signing IAM unproven | Med | Separate read-only evidence + IAM checkpoint if needed |
| Portal Windows `.next` EPERM | Low | Known local blocker; typecheck covers |

---

## Deferred Items (Roadmap)
- Coordinated production promotion (Functions + Rules + Portal App Hosting + Studio) — separately gated
- Production Internal History Preview → Apply
- Production Gen2 TokenCreator IAM if confirmed
- Optional Identity Platform Auth blocking (out of scope)

---

## Open Blockers
- [x] None for Signoff of this DEV goal

---

## Verdict

**approved** — Owner DEV QA **PASS**; A/B/C accepted on DEV; production remains unauthorized.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Production Promotion Manifest appended (cumulative companion)

**Recommended next action for user:** When ready, start a separately gated production promotion plan — or leave FreshForge IDLE.
