# Print Request Item Sizing And Username Naming Signoff

Date: 2026-07-04
Phase: `print-request-item-sizing-and-username-naming`
Status: PASS WITH FOLLOW-UP NOTES

## Plan

Plan: `docs/workflow/plans/2026-07-04-print-request-item-sizing-and-username-naming-plan.md`

Implementation was approved by the user and stayed within the approved Phase 6 follow-up scope:

- Customer username requirements and transaction-safe username reservations.
- Username/internal request naming counters.
- Standard Print Request item quantity, requested-size, DPI feedback, duplicate, and remove behavior.
- Hidden standard item notes/status UI while preserving existing persisted compatibility fields.
- Firestore rules updates for the approved data model changes.
- Focused tests and durable documentation updates.

## Verification

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

Result: passed. Vite reported the existing warning:
`Circular chunk: vendor -> react-vendor -> vendor. Please adjust the manual chunk logic for these chunks.`

```txt
git diff --check
```

Result: passed with standard Windows LF/CRLF conversion warnings only.

## Dev Rules Deploy

The user approved a dev-only Firestore rules deployment for manual QA.

```txt
firebase deploy --only firestore:rules --project fresh-prints-dev
```

Result: Firestore rules deployed successfully to `fresh-prints-dev`.

No Functions, Hosting, Storage rules, Firestore indexes, migration, backfill, rules relaxation, Portal work, Print Runs, Custom Requests, Remove Background/Upscale, production status workflow, or design lifecycle status changes were deployed or implemented.

## Manual QA

User-run authenticated manual QA passed in the dev session.

Verified:

- Created a customer with username.
- Edited a customer username.
- Confirmed duplicate username is blocked.
- Created a customer request and confirmed username-based name.
- Created another request for the same customer and confirmed sequence increments.
- Created an internal request and confirmed internal sequence name.
- Added a design to a request.
- Duplicated that design.
- Changed size on the duplicate.
- Confirmed both items persisted separately after reload/revisit.
- Adjusted width and confirmed height recalculated.
- Adjusted height and confirmed width recalculated.
- Tried requested width and height above 22 inches and confirmed saves were blocked with Custom Request guidance.
- Confirmed DPI feedback changed as dimensions changed.
- Confirmed the 22-inch max rule is enforced independently from DPI warnings.
- Increased and decreased quantity with buttons.
- Typed quantity directly and confirmed validation.
- Confirmed delete requires confirmation before the item is removed.
- Confirmed notes and production status dropdown are not shown.
- Confirmed production status badge is not shown.
- Confirmed no design lifecycle status changes occurred.
- Confirmed a customer without a username cannot be used to create a new print request until the username is added, if applicable.

## Follow-Up Notes

Captured for future planning, not fixed in this phase:

- Remove native browser number spinners from Print Request quantity, width, and height inputs.
- Make duplicate item updates refresh the request item list dynamically without a full page refresh.
- Convert normal Print Request item edits to autosave, remove item-level save buttons, remove noisy success alerts, and add a subtle autosave indicator.
- Ensure saving an item does not move it up the list.
- Make request status non-editable from the Print Request page.
- Lock customer request names and customer/internal sequence numbers after creation.
- Revise future request naming to `username-CR001` for customer requests and `baseName-IR001` for internal requests, with editable internal base name and locked internal sequence.

These follow-ups are tracked in `docs/project/TECH_DEBT.md`.

## Signoff

`print-request-item-sizing-and-username-naming` is signed off as PASS WITH FOLLOW-UP NOTES.

