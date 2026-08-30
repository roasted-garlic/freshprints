# Pre–Gate E Rules Test — Slice 5

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Command | `npm run test:rules` (JAVA_HOME = `%USERPROFILE%\.local-jdk\jdk-21.0.11+10`) |
| Result | **PASS** — 134 / 134 |
| Scope | No reopen of Slice 5 app implementation; narrow Rules regression only |

## Coverage added

`tests/firebase/catalogReprocess.rules.test.ts` (wired into `package.json` `test:rules`):

| Case | Result |
|------|--------|
| Owner read `catalogReprocessJobs/{jobId}` | pass |
| Owner read `…/outcomes/{designId}` | pass |
| Non-owner (admin/helper/customer) deny outcome read | pass |
| Signed-out deny outcome read | pass |
| Client create/update/delete outcome deny (incl. owner) | pass |
| Client write parent job deny | pass |

## Gate E status

Rules suite green. **Deploy still not authorized** — await owner Gate E authorize.
