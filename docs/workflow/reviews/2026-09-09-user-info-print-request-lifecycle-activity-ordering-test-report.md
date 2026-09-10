# Test Report — User Info Print Request Lifecycle Activity Ordering

Date: 2026-09-09
Goal: `user-info-print-request-lifecycle-activity-ordering`

## Focused implementation tests

Command:

```text
npx tsx --test apps/studio/src/renderer/src/features/users/utils/buildPrintRequestHistoryCard.test.ts functions/src/onPrintRequestLifecycleRequestWritten.test.ts functions/src/onPrintRequestLifecycleAllocationWritten.test.ts
```

Result: **PASS** — 20 tests passed, 0 failed.

Coverage includes lifecycle-clock ordering/deduplication, newest-first forward/reconstructed
history merging, no raw `Last updated` event, deterministic request event IDs, monotonic mirror
comparison, show-add/requeue lineage, production milestones, and server-observed allocation removal.

Rules corrective coverage includes the exact Studio re-add sequence after remove-for-editing, with
lifecycle mirror fields present on the request after-image.

## Build and static checks

* `npm --prefix functions run build` — **PASS**.
* Targeted ESLint over changed Functions, Studio history, service, hook, modal, and print-request
  service files — **PASS**.
* `node -e "JSON.parse(...firestore.indexes.json...)"` — **PASS**.
* `git diff --check` — **PASS** (only Git's normal LF/CRLF conversion warnings).
* `npx tsc -p apps/studio/tsconfig.json --noEmit` — **FAILURES EXIST**, all reported failures are
  outside this change except the initially reported lifecycle-event source typing issue, which was
  corrected. Existing failures include PNG upscale typing, Firestore trace metadata, staff inbox
  unused symbols, and several shared test fixture/type mismatches.

## Rules suite

Command: `npm run test:rules`
Result: **PASS** — exit code 0. Firebase CLI 15.26.0 started the Firestore and Storage emulators;
the complete suite passed **170 tests across 22 suites: 170 passed, 0 failed, 0 cancelled, 0
skipped, 0 todo**. This includes the re-add-after-editing Rules regression.

Shell-local Java preflight:

* Existing compatible Java found: **yes**
* Vendor/version: Microsoft OpenJDK `25.0.4.1` (2026-08-18 LTS)
* Java path: `C:\Program Files\Microsoft\jdk-25.0.4.101-hotspot\bin\java.exe`
* `JAVA_HOME`: `C:\Program Files\Microsoft\jdk-25.0.4.101-hotspot`
* Global environment: unchanged; `JAVA_HOME`/`PATH` were configured only for the test shell.

The earlier `spawn java ENOENT` blocker was resolved by restoring access to this existing JDK. The
emulator emitted expected expression-budget diagnostics from existing deny-path cases; all tests
passed. The local lifecycle Rules corrective is covered by the new re-add regression; it was then
deployed in the separately authorized Rules-only DEV checkpoint.

## Scope confirmation

No Functions/index deploy, historical backfill execution, Studio publish, commit, or push was
performed in the test checkpoint. The separately authorized Rules-only corrective deployment was
completed afterward as documented in the DEV deployment record. The DEV backfill runner is
source-only and defaults to dry-run; indexed reader activation remains disabled pending Owner
re-QA and the separately authorized mirror-coverage checkpoint.
