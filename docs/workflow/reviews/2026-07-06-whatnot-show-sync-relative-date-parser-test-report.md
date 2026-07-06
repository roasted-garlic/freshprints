# Whatnot Show Sync Relative Date Parser Test Report

Date: 2026-07-06

## Scope

QA correction for staff-assisted Whatnot import date parsing.

Fixed `shared/utils/whatnotShowImportCandidate.ts` so visible Whatnot show-card badges using
`Tomorrow 8:00 PM` parse to the next local calendar day instead of `needs_review`.

Also expanded weekday label handling to explicit common variants:

- `Sun`, `Sunday`, `Su`
- `Mon`, `Monday`, `Mo`
- `Tue`, `Tues`, `Tuesday`, `Tu`
- `Wed`, `Weds`, `Wednesday`, `We`
- `Thu`, `Thur`, `Thurs`, `Thursday`, `Th`
- `Fri`, `Friday`, `Fr`
- `Sat`, `Saturday`, `Sa`

No network requests, dependency changes, deploys, migrations, Firestore rules changes, or data writes
were performed.

## Tests Run

```bash
npx tsx --test shared/utils/whatnotShowImportCandidate.test.ts
```

Result: PASS, 24/24.

```bash
npx tsx --test shared/utils/whatnotAssistedImportReminder.test.ts shared/utils/whatnotShowImportCandidate.test.ts shared/utils/whatnotShowImportPlan.test.ts shared/utils/whatnotShowBaseUrl.test.ts shared/utils/whatnotShowUrl.test.ts
```

Result: PASS, 54/54.

```bash
npx tsc --noEmit
```

Result: PASS.

```bash
npm run lint
```

Result: PASS.

```bash
git diff --check
```

Result: PASS, standard Windows LF/CRLF warnings only.

## Remaining QA

Manual QA in a real Electron desktop session is still required against the real Whatnot page.
Specifically re-check that visible `Today`, `Tomorrow`, and weekday-abbreviation badges import with
the correct title/date/URL/ID and do not incorrectly land in `Needs review`.
