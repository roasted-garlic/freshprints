# Print Request Detail Autosave And Name Locking Signoff

Date: 2026-07-04
Phase: `print-request-detail-autosave-and-name-locking`
Result: PASS

## Scope Signed Off

This Phase 6 follow-up is signed off after implementation, automated verification, dev Firestore
rules deployment, and user-run authenticated manual QA.

The approved scope was completed:

- Print Request item quantity, width, and height autosave with a subtle bottom-right indicator.
- Normal item edits no longer use item-level save buttons or noisy success alerts.
- Duplicate and remove update the request detail item list without a disruptive detail reload.
- Stable item ordering keeps saved items from moving unexpectedly and keeps legacy items without
  `sortOrder` visible through the compatibility ordering path.
- Native browser number spinners are hidden on quantity, width, and height inputs.
- Customer request names use `username-CR###` and remain locked.
- Internal request names use `baseName-IR###` with locked internal sequence.
- Internal create uses a blank `Internal base name` input; blank input normalizes to `internal`.
- Request status is not editable from the Print Request detail page.
- Request Detail fields are manual-save only.
- Request Detail internal base-name typing updates the generated request-name preview live.
- Request notes/internal base-name/generated internal request name persist only when staff clicks
  `Save request detail`.
- Notes and production status controls/badges remain hidden in the standard item UI.
- No design lifecycle status changes occur from Print Request detail work.

## Files Changed Summary

- Print Request UI and hooks:
  `src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`,
  `src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx`,
  `src/renderer/src/features/print-requests/hooks/usePrintRequestDetails.ts`,
  `src/renderer/src/features/print-requests/hooks/usePrintRequests.ts`,
  `src/renderer/src/styles/components/print-requests.css`.
- Print Request/customer services and shared utilities:
  `src/renderer/src/features/print-requests/services/printRequestService.ts`,
  `src/renderer/src/features/customers/services/customerService.ts`,
  `shared/utils/printRequestNaming.ts`,
  `shared/utils/printRequestItemSizing.ts`,
  `shared/utils/customerUsername.ts`.
- Shared types and Firestore constants/rules:
  `shared/types/printRequest/printRequest.types.ts`,
  `shared/types/customer/customer.types.ts`,
  `src/renderer/src/features/firebase/constants/firestoreCollections.ts`,
  `src/renderer/src/features/firebase/services/firestoreCollectionService.ts`,
  `firestore.rules`.
- Customer/user UI touched by the prerequisite username work:
  `src/renderer/src/features/users/components/AddUserModal.tsx`,
  `src/renderer/src/features/users/components/EditCustomerModal.tsx`,
  `src/renderer/src/features/users/components/CustomerDirectoryTable.tsx`,
  `src/renderer/src/features/users/pages/UserManagementPage.tsx`.
- Focused tests:
  `src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts`,
  `src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts`.
- Durable docs and workflow artifacts:
  `docs/architecture/DATA_MODEL.md`,
  `docs/WORKFLOWS.md`,
  `docs/project/DECISIONS.md`,
  `docs/project/ROADMAP.md`,
  `docs/project/TECH_DEBT.md`,
  `docs/standards/SECURITY.md`,
  `project-chatgpt-handoff/CURRENT-STATE.md`,
  `.cursor/workflow/state.md`,
  `docs/workflow/plans/2026-07-04-print-request-detail-autosave-and-name-locking-plan.md`,
  `docs/workflow/reviews/2026-07-04-print-request-detail-autosave-and-name-locking-test-report.md`.

## Automated Verification

| Command | Result |
|---------|--------|
| `npx tsx --test src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts` | PASS - 20/20 tests |
| `npx tsc --noEmit` | PASS - exit 0 |
| `npm run lint` | PASS - exit 0 |
| `npx vite build` | PASS - exit 0; existing circular manual-chunk warning only |
| `git diff --check` | PASS - exit 0; standard Windows LF/CRLF warnings only |

The correction for Request Detail manual-save behavior was rerun through the same focused test,
typecheck, lint, build, and diff-check set and passed.

## Dev Firestore Rules Deploy

Dev rules deploy was explicitly approved by the user and completed against `fresh-prints-dev`.

Command:

```bash
firebase deploy --only firestore:rules --project fresh-prints-dev
```

Result:

- `firestore.rules` compiled successfully.
- Firebase CLI reported the latest ruleset was already up to date and skipped upload.
- Firebase CLI released the rules to `cloud.firestore`.
- Deploy completed successfully.

No deploy was needed for the final Request Detail manual-save correction.

## Manual QA

User-run authenticated manual QA passed in the dev session.

Verified:

- Opened `/print-requests`.
- Confirmed request cards load.
- Created internal requests with default and custom internal base names.
- Confirmed internal names use `internal-IR###` or `baseName-IR###`.
- Confirmed internal sequence is locked and cannot be edited.
- Created a customer request and confirmed `username-CR###`.
- Confirmed customer request name, request status, and sequence are locked.
- Added an approved design to a request.
- Updated quantity, width, and height and confirmed item autosave reaches `Saved`.
- Confirmed width/height recalculation.
- Confirmed no item-level save buttons or normal edit success alerts appear.
- Duplicated an item without a disruptive detail reload.
- Confirmed same-design duplicate rows persist separately after reload/revisit.
- Removed an item with confirmation.
- Confirmed saving an item does not move it unexpectedly.
- Confirmed legacy items without `sortOrder`, if present, remain visible.
- Confirmed standard item notes and production status controls/badges remain hidden.
- Confirmed no design lifecycle status changes occur.

Correction verified:

- Request Detail does not autosave.
- Item quantity, width, and height still autosave.
- Typing `Internal base name` updates the generated request-name preview live.
- Nothing in Request Detail persists until `Save request detail` is clicked.
- Request notes save only through `Save request detail`.
- After saving Request Detail, reload/revisit confirms internal base name, generated request name,
  and notes persist.

## Out Of Scope Confirmed

No Functions, Hosting, Storage rules, Firestore indexes, migrations, backfills, Portal behavior,
Print Runs, Custom Requests, show capacity, Remove Background/Upscale, production status workflow,
or design lifecycle status changes were deployed or implemented.

## Remaining Follow-Up Notes

- TD-015 remains open: long Firebase index error URLs can stretch operational error panels
  horizontally. Recommended follow-up remains shared error text wrapping such as
  `overflow-wrap: anywhere` without changing error content.

