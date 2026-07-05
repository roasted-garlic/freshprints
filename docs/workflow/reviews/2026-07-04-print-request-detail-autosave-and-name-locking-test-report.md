# Print Request Detail Autosave And Name Locking Test Report

Date: 2026-07-04
Phase: `print-request-detail-autosave-and-name-locking`
Result: Automated verification PASS; dev Firestore rules deploy PASS; user-run authenticated manual QA PASS

## Scope Verified

- Print Request detail item quantity, width, and height autosave.
- Bottom-right autosave indicator states and retry path.
- Dynamic duplicate/remove detail-list updates without a full detail reload.
- Stable request item display ordering with legacy item compatibility.
- Customer request names generated as `username-CR001`.
- Internal request names generated as `baseName-IR001`.
- Internal base-name manual save with locked sequence handling.
- Generated internal request-name preview updates while staff type the internal base name.
- Request status and generated customer request names locked in the standard detail UI.
- Native number spinners hidden on quantity, width, and height inputs.
- Dev Firestore rules deployed for approved metadata fields.

## Automated Verification

| Command | Result |
|---------|--------|
| `npx tsx --test src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts` | PASS - 20/20 tests |
| `npx tsc --noEmit` | PASS - exit 0 |
| `npm run lint` | PASS - exit 0 |
| `npx vite build` | PASS - exit 0; existing circular manual-chunk warning reported |
| `git diff --check` | PASS - exit 0; standard Windows LF/CRLF warnings only |

Verification rerun after the Request Detail manual-save correction:

| Command | Result |
|---------|--------|
| `npx tsx --test src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts` | PASS - 20/20 tests |
| `npx tsc --noEmit` | PASS - exit 0 |
| `npm run lint` | PASS - exit 0 |
| `npx vite build` | PASS - exit 0; existing circular manual-chunk warning reported |
| `git diff --check` | PASS - exit 0; standard Windows LF/CRLF warnings only |

## Firebase Deploy Status

Dev Firestore rules deploy was approved by the user and completed on 2026-07-04.

Command used:

```bash
firebase deploy --only firestore:rules --project fresh-prints-dev
```

Target project:

```txt
fresh-prints-dev
```

Result:

- `firestore.rules` compiled successfully.
- Firebase CLI reported the latest ruleset was already up to date and skipped upload.
- Firebase CLI released the rules to `cloud.firestore`.
- Deploy completed successfully.

The deployed rules allow:

- `printRequests.internalBaseName`
- `printRequests.nameFormatVersion`
- `printRequestItems.sortOrder`

No Functions, Hosting, Storage rules, Firestore indexes, migration, backfill, or out-of-scope deploy
was performed.

## Manual QA Status

Codex could not complete browser-based manual QA because in-app browser automation failed before app
navigation with a tool runtime metadata error.

User-run authenticated manual QA passed in the dev session and is recorded for signoff.

## Manual QA Passed

- Opened `/print-requests`.
- Confirmed request cards load.
- Created an internal request with default `Internal base name` and confirmed `internal-IR###`.
- Created an internal request with a custom base name and confirmed `baseName-IR###`.
- Confirmed internal sequence is displayed locked and cannot be edited.
- Created a customer request and confirmed `username-CR###`.
- Confirmed customer request name and sequence are not editable.
- Confirmed request status is not editable from the detail page.
- Added an approved design to a request.
- Updated quantity and confirmed autosave indicator reaches `Saved`.
- Updated width and confirmed height recalculates and autosaves.
- Updated height and confirmed width recalculates and autosaves.
- Confirmed no item-level save buttons or normal edit success alerts appear.
- Duplicated an item and confirmed the new row appears without a disruptive detail reload.
- Changed size on the duplicate and confirmed both same-design rows persist after reload/revisit.
- Removed an item and confirmed confirmation is required.
- Confirmed saving an item does not move it unexpectedly.
- Confirmed legacy request items without `sortOrder`, if present, remain visible.
- Confirmed notes and production status dropdown/badge remain hidden for standard item UI.
- Confirmed no design lifecycle status changes occur.

Correction verified:

- Request Detail does not autosave.
- Item quantity, width, and height still autosave.
- Typing in `Internal base name` updates the generated request name preview live.
- Nothing in Request Detail persists until `Save request detail` is clicked.
- Request notes save only through the same `Save request detail` button.
- Customer request name, request status, and sequence remain locked.
- After saving Request Detail, reload/revisit confirms the saved internal base name, generated
  request name, and notes persist.
