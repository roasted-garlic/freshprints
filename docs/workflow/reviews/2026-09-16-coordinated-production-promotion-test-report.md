# Test Report: Coordinated production promotion — 2026-09-16

| Field | Value |
|-------|-------|
| Date | 2026-09-16 |
| Goal | `coordinated-production-promotion-2026-09-16` |
| Plan | `docs/workflow/plans/2026-09-16-coordinated-production-promotion-plan.md` |
| Review | `docs/workflow/reviews/2026-09-16-coordinated-production-promotion-formal-review.md` |
| Candidate status | Ready to freeze after final read-only anchor capture; owner hold lifted with accepted Rules baseline disposition. |

## Reviewed correction checks

- Function closure audit: **pass** — 192 current exports, 186 production
  exports, 546 unique local closure paths; `completeStaffGangSheetAndOpenNext`
  remains an existing UPDATE rather than a deletion. The callable name is
  `completeStaffGangSheetAndOpenNext`.
- Studio release metadata: **pass** — package and root lockfile workspace entry
  are `1.0.13`; the stable workflow guard and signing-policy contract match.
- `git diff --check`: **pass**.

## Automated results

| Check | Result |
|-------|--------|
| `npm --prefix functions run build` | **pass** |
| Studio `npx tsc --noEmit` | **pass** |
| Portal `npm run typecheck --workspace @fresh-prints/portal` | **pass** |
| Focused Studio export contract | **8/8 pass** |
| Focused Function contracts | **15/15 pass** |
| Studio release policy and publish-helper contracts | **40/40 pass** |
| Closure audit summary | **pass** — 192 / 186 / 546; 6 ADD, 52 UPDATE, 115 RETAIN LIVE VERSION, 10 EXCLUDE, 9 NO ACTION |
| Portal isolated production build | **pass** — Next 15.5.20 compiled, type validity passed, and 22/22 static pages generated; temporary output directory was removed and tracked config restored |

## Firestore Rules result

The final candidate command `npm run test:rules` completed against the local
emulators with **179/182 tests passing and 3 failing**. The failures are:

1. `print request completion — current-schema failing-before matrix` — denies
   draft, completed, and archived to completed.
2. The same suite — denies regression from completed while preserving a
   representative active detail edit.
3. `Show Queue allocation — allocatePrintRequestItem sequence` — allows staff
   to set `needsStaffRequeue` fields on a print request.

Each failure reports only the emulator error that the maximum of 1,000
expressions was reached while evaluating an update. Baseline checks were run against
`firestore.transition.rules`: the Print Request completion suite reproduced
the same two failures (12/14 pass), and the Show Queue suite reproduced the
same failure (22/23 pass). This establishes that the three failures predate
the current candidate Rules delta. The owner accepted this exact result as a
known non-blocking baseline limitation for this release; Rules source and tests
were not changed to force 182/182. A fourth failure, a real allow/deny
mismatch, or a candidate-only regression is a hard stop.

## Disposition

The Studio fix and reviewed deterministic release corrections pass their
focused checks. The candidate is eligible for exact-SHA freeze under the
owner’s release instruction. Production execution must still use the protected
PR path, the reviewed Rules/Function allowlists, no data operations, preserved
AI settings, and the exact rollback packet.
