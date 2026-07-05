# Print Request Origin Tracking Signoff

Date: 2026-07-04
Phase: `print-request-origin-tracking`
Result: PASS

## Scope Signed Off

This Phase 6 follow-up is signed off after implementation, automated verification, dev Firestore
rules deployment, and user-run authenticated manual QA.

Completed scope:

- Added optional `PrintRequest.requestOrigin`.
- Added supported origin values:
  - `studio_internal`
  - `studio_customer`
  - `portal_customer`
- New Studio internal requests write `studio_internal`.
- New staff-created Studio customer requests write `studio_customer`.
- `portal_customer` is reserved for future Portal-created customer requests.
- Existing requests without `requestOrigin` remain readable.
- Studio origin badges display:
  - `Internal`
  - `Staff Created`
  - `Customer Submitted`
  - fallback `Legacy`
- Origin badge fallback uses `requestOrigin`, then `isInternal`, then `customerId`; it does not
  parse request names.
- Request names and CR/IR naming behavior remain unchanged.
- Item autosave, sizing, duplicate/remove, and Request Detail manual-save behavior remain unchanged.

## Files Changed Summary

- Shared type and utility:
  `shared/types/printRequest/printRequest.types.ts`,
  `shared/utils/printRequestOrigin.ts`.
- Print Request implementation:
  `src/renderer/src/features/print-requests/services/printRequestService.ts`,
  `src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`,
  `src/renderer/src/styles/components/print-requests.css`.
- Firestore rules:
  `firestore.rules`.
- Tests:
  `src/renderer/src/features/print-requests/utils/printRequestOrigin.test.ts`.
- Durable docs and workflow state:
  `docs/architecture/DATA_MODEL.md`,
  `docs/WORKFLOWS.md`,
  `docs/standards/SECURITY.md`,
  `docs/project/DECISIONS.md`,
  `docs/project/ROADMAP.md`,
  `project-chatgpt-handoff/CURRENT-STATE.md`,
  `.cursor/workflow/state.md`,
  `docs/workflow/plans/2026-07-04-print-request-origin-tracking-plan.md`,
  `docs/workflow/reviews/2026-07-04-print-request-origin-tracking-test-report.md`.

## Automated Verification

| Command | Result |
|---------|--------|
| `npx tsx --test src/renderer/src/features/print-requests/utils/printRequestOrigin.test.ts` | PASS - 3/3 tests |
| `npx tsc --noEmit` | PASS - exit 0 |
| `npm run lint` | PASS - exit 0 |
| `npx vite build` | PASS - exit 0; existing circular manual-chunk warning only |
| `git diff --check` | PASS - exit 0; standard Windows LF/CRLF warnings only |

The existing circular manual-chunk warning is unrelated to this phase and remains non-blocking
technical debt.

## Dev Firestore Rules Deploy

Dev Firestore rules were deployed to `fresh-prints-dev` after user approval.

Command:

```bash
firebase deploy --only firestore:rules --project fresh-prints-dev
```

No Functions, Hosting, Storage rules, Firestore indexes, migrations, or backfills were deployed.

## Manual QA

User-run authenticated manual QA passed in the dev session.

Verified:

- Opened `/print-requests`.
- Confirmed request cards load normally.
- Created a new internal request and confirmed badge `Internal`.
- Created a new customer request for an existing customer and confirmed badge `Staff Created`.
- Opened older internal and customer requests created before this change and confirmed they load
  with `Internal` and `Staff Created` fallback badges.
- Confirmed request names did not change.
- Confirmed `username-CR###` customer naming still works.
- Confirmed `baseName-IR###` internal naming still works.
- Added an approved design to a request.
- Changed quantity and width and confirmed item autosave still works.
- Duplicated an item and confirmed duplicate/remove behavior still works.
- Confirmed no Portal behavior was added.
- Confirmed no customer Auth/login behavior was added.
- Confirmed no design lifecycle status changes occurred.

## Out Of Scope Confirmed

No Portal UI, Portal request creation, customer Auth/login, customer-created Portal requests, Print
Runs, show capacity, Custom Requests, request naming format changes, origin filters, origin indexes,
Firestore index deploy, Functions deploy, Hosting deploy, Storage rules deploy, migrations,
backfills, production status writes to `designs`, or design lifecycle status changes were deployed
or implemented.

## Remaining Follow-Up Notes

- `portal_customer` remains a reserved value for future Phase 8 Portal-created customer requests.
- Existing circular manual-chunk build warning remains unrelated non-blocking tech debt.

