# Plan: Studio permission two-ask, activity modal, Denied→Excluded handoff

| Field | Value |
|-------|-------|
| Date | 2026-09-11 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase (amendment / owner QA correctives) |
| Parent | `docs/workflow/plans/2026-09-11-customer-upload-studio-deferral-personal-library-portal-inline-remove-plan.md` |
| Related | Studio Uploaded Designs Denied/Excluded; ADR-FP-074 follow-up |

---

## Goal

Staff can ask a customer **up to two times** for Design Library permission after the initial Don’t-allow. Permission lifecycle (initial denial + each ask/response) lives in a compact **Activity** modal instead of long copy on the detail pane. After the **second decline**, the row leaves **Denied** and parks on **Excluded** for cleanup/retention. Remove the Imports/Halftone help blurb and place the overflow menu beside the status pill.

## Background

Owner accepted the Denied→Excluded handoff for terminal declines, and locked: two asks; activity list modal; remove “Same controls as Imports…”; overflow next to the pill.

Current v1 allows **one** Ask Again; second request is blocked. Declined follow-ups stay on Denied forever, cluttering the actionable list.

## Scope

### In Scope
- Server: allow a second Ask Again after a first decline; block a third
- Server-authored activity log for: initial denial, ask sent (1/2), customer allow/decline (1/2)
- Studio Denied filter = actionable permission denials only; terminal second decline → Excluded tab
- Studio UI: remove preview-controls help; pill + Activity + Ask again + overflow on one row; Activity modal
- Docs: DATA_MODEL follow-up wording; deploy allowlist if new/changed Functions

### Out of Scope
- C1 30-day personal retention / C2 Your designs tabs (still gated on `DEV DEPLOY DONE`)
- Changing Portal permission modal copy beyond what respond already does
- Production deploy; Rules/Storage changes (Admin SDK activity writes only)
- Healing already-read Portal Alerts (separate optional heal)

---

## Affected Areas

### Files / Modules (expected)
- `packages/shared` — types, helpers for ask count / terminal / activity
- `functions/src/requestCustomerUploadCatalogPermissionFollowUp.ts`
- `functions/src/respondToCustomerUploadCatalogPermissionFollowUp.ts`
- `functions/src/lib/customerUploadCatalogConfirmation.ts` — stamp initial activity on first denial
- Studio intake queries/filters + `CustomerUploadIntakeSection` (+ small Activity modal component)
- `docs/architecture/DATA_MODEL.md`; workflow state / DEV deploy note

### Architecture Impact
- [x] Details: Shared helpers + server-authored activity array on `customerUploads`; Studio filters only

### Security Impact
- [x] Details: Staff-only request; customer respond unchanged auth; activity Admin-only writes; no new public endpoints

### Data Model Impact
- [x] Details:
  - `catalogPermissionAskCount` (0–2): number of Ask Again sends
  - `catalogPermissionActivity[]`: append-only `{ id, kind, attempt?, at, byUid? }`
  - Kinds: `initial_denial` | `ask_sent` | `customer_allow` | `customer_decline`
  - Terminal Denied→Excluded (UI): `askCount >= 2` && status `declined` (legacy: missing count + `declined` → treat as askCount `1`, one more ask allowed)

### Backend Impact
- [x] Details: Extend request/respond + confirmation patch; redeploy those Functions

### UI / UX Impact
- [x] Details: Studio Uploaded Designs detail; Activity modal; manual smoke after DEV deploy

### Migration Impact
- [x] Forward: Additive fields; legacy declined = 1 ask used
- [x] Rollback: Redeploy prior Functions; hide Activity UI; filters revert

---

## Approach

1. Shared helpers: resolve ask count, canAskAgain, isTerminalPermissionDenial, activity visibility for tabs
2. Confirmation: on first customer_permission_denied, append `initial_denial` if missing
3. Request: allow when denied + not open request + askCount < 2; increment askCount; append `ask_sent`
4. Respond: append allow/decline; on 2nd decline keep excluded reason; Studio filter moves to Excluded
5. Studio: compact permission row + Activity modal; remove help blurb; overflow beside pill
6. Contracts + DATA_MODEL update

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Shared helpers | `npx tsx --test packages/shared/...` | yes |
| Permission contracts | `npx tsx --test tests/customerUploadCatalogPermission.contract.test.ts` | yes |
| Intake query filters | existing intake query tests | yes |

### Manual
| Check | Notes |
|-------|-------|
| Ask again twice | First decline stays Denied; second Ask works; third blocked |
| Activity modal | Shows initial + asks/responses |
| Excluded handoff | After 2nd decline appears under Excluded |
| Layout | No Imports help; `…` beside pill |

---

## Human Checkpoints
- [x] Product locks (owner 2026-09-11): two asks; activity modal; Denied→Excluded after 2nd decline; remove help; overflow beside pill
- [ ] DEV Functions redeploy for request/respond/confirm paths after Implement
- [ ] Owner Studio smoke on Denied/Excluded

---

## Risks

| Risk | Mitigation |
|------|------------|
| Legacy one-ask declined rows | Treat as askCount 1 → one more ask under new policy |
| Activity array growth | Max 1 initial + 2 asks + 2 responses (≤5 entries) |
| Excluded confusion with staff exclude | Keep `customer_permission_denied` reason; badge still explains |

## Rollback
Redeploy prior Functions; revert Studio filter/UI.

## Open Questions
None — owner locked.
