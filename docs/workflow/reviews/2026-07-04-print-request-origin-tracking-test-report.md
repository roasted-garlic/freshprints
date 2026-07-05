# Print Request Origin Tracking Test Report

Date: 2026-07-04
Phase: `print-request-origin-tracking`
Result: Automated verification PASS; dev Firestore rules deploy PASS; user-run authenticated manual QA PASS

## Scope Verified

- Shared `PrintRequestOrigin` type added with `studio_internal`, `studio_customer`, and
  `portal_customer`.
- `PrintRequest.requestOrigin` added as optional for legacy compatibility.
- New Studio internal requests write `requestOrigin: "studio_internal"`.
- New staff-created Studio customer requests write `requestOrigin: "studio_customer"`.
- Existing requests without `requestOrigin` remain readable.
- Studio origin badges use the approved fallback labels:
  - `Internal`
  - `Staff Created`
  - `Customer Submitted`
  - `Legacy`
- Request names and existing CR/IR naming behavior are unchanged.
- No origin filters or origin indexes were added.
- No Portal behavior, customer Auth, Portal login, customer-created requests, migration, or backfill
  was added.

## Automated Verification

| Command | Result |
|---------|--------|
| `npx tsx --test src/renderer/src/features/print-requests/utils/printRequestOrigin.test.ts` | PASS - 3/3 tests |
| `npx tsc --noEmit` | PASS - exit 0 |
| `npm run lint` | PASS - exit 0 |
| `npx vite build` | PASS - exit 0; existing circular manual-chunk warning reported |
| `git diff --check` | PASS - exit 0; standard Windows LF/CRLF warnings only |

## Firestore Rules Status

`firestore.rules` was updated locally to allow and validate optional
`printRequests.requestOrigin`.

Dev Firestore rules deploy was approved by the user and completed against `fresh-prints-dev`.

Command:

```bash
firebase deploy --only firestore:rules --project fresh-prints-dev
```

No Functions, Hosting, Storage rules, Firestore indexes, migrations, or backfills were deployed.

## Manual QA Status

User-run authenticated manual QA passed in the dev session.

Verified:

- Opened `/print-requests`.
- Confirmed request cards load normally.
- Create a new internal request and confirm it shows `Internal`.
- Create a new staff-created customer request and confirm it shows `Staff Created`.
- Confirm existing internal requests without `requestOrigin` still show `Internal`.
- Confirm existing customer requests without `requestOrigin` still show `Staff Created`.
- Confirm request cards/details load without migration or backfill.
- Confirm request names did not change.
- Confirm `username-CR###` customer naming still works.
- Confirm `baseName-IR###` internal naming still works.
- Add an approved design to a request.
- Confirm item autosave still works.
- Confirm duplicate/remove behavior still works.
- Confirm no Portal behavior was added.
- Confirm no customer Auth/login behavior was added.
- Confirm no design lifecycle status changes occurred.

## Deploys

Dev Firestore rules were deployed to `fresh-prints-dev`.

No Functions deploy, Hosting deploy, Storage rules deploy, Firestore index deploy, migration,
backfill, Portal work, customer Auth/login, customer-created Portal request workflow, request naming
change, origin filter/index, Print Runs, Custom Requests, production status write to `designs`, or
design lifecycle status change was performed.
