# Print Request Item Sizing And Username Naming Test Report

Date: 2026-07-04
Phase: `print-request-item-sizing-and-username-naming`
Status: automated verification passed; dev Firestore rules deployed; manual QA passed by user

## Scope Verified

- Customer username validation and request-name formatting helpers.
- Standard Print Request item size validation, 22-inch cap, and DPI quality rules.
- Existing Print Request query-planning tests after removing deprecated list-scanned request naming.
- TypeScript, lint, renderer/electron Vite build, and diff whitespace checks.

## Commands Run

```txt
npx tsx --test src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts
```

Result: passed, 17 tests.

```txt
npx tsc --noEmit
```

Result: passed.

```txt
npm run lint
```

Result: passed.

```txt
npx vite build
```

Result: passed. Vite reported the existing circular chunk warning:
`Circular chunk: vendor -> react-vendor -> vendor. Please adjust the manual chunk logic for these chunks.`

```txt
git diff --check
```

Result: passed with standard Windows LF/CRLF conversion warnings only.

## Manual QA Status

Manual authenticated QA was completed by the user in the dev session after the approved rules deploy.
The required dev Firestore rules deploy was approved and run:

```txt
firebase deploy --only firestore:rules --project fresh-prints-dev
```

Result: passed. Firestore rules compiled and released to `cloud.firestore` for `fresh-prints-dev`.

Codex could not complete browser-based manual QA because the browser automation tool failed before
app navigation with a runtime metadata error. User-run authenticated manual QA passed and is recorded
in `docs/workflow/reviews/2026-07-04-print-request-item-sizing-and-username-naming-signoff.md`.

The rules deploy covered:

- `customers.username`
- `customers.nextPrintRequestSequence`
- `customerUsernames/{username}`
- `counters/printRequests`
- `printRequests.requestSequenceNumber`
- request snapshot fields
- standard item size validation

No Functions deploy, Hosting deploy, Storage rules deploy, Firestore index deploy, migration,
backfill, rules relaxation, production write, Portal behavior, Print Runs, Custom Requests, Remove
Background, Upscale, or design lifecycle status change was performed.
