# Plan: Studio Inbox design report name + in-place edit

| Field | Value |
|-------|-------|
| Date | 2026-08-01 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-08-01-studio-inbox-design-report-name-and-edit-review.md |

---

## Goal

On Studio Inbox design-report rows: show the submitter (Anonymous when unknown), and open Edit Design in-place on the Inbox page so staff can fix then Mark Resolved without navigating away.

## Decisions

- Display only: authenticated submit remains; Studio shows display name → username → Anonymous.
- In-place edit uses `EditDesignModal` via a child host (route containment preserved on `StaffInboxPage.tsx`).
- Inbox page open action only; bell/toasts may still navigate.

## Scope

### In Scope
- Submitter line on open rows and resolved-history list
- `StaffInboxDesignEditHost` + Inbox page wiring
- Button label/icon for design reports
- Tests + workflow docs

### Out of Scope
- Anonymous guest submission
- Rules/indexes deploy
- Bell/toast navigation changes

## Test Strategy

| Check | Command |
|-------|---------|
| Contract | `npx tsx --test packages/shared/src/designIssueReports/designIssueReportContract.test.ts` |
| Containment | `npx tsx --test apps/studio/src/renderer/src/features/firebase/utils/firestoreRouteContainment.test.ts` |
| Submitter util | colocated unit test |
