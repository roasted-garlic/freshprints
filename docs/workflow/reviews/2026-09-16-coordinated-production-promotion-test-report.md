# Test Report: Coordinated production promotion — 2026-09-16

| Field | Value |
|-------|-------|
| Date | 2026-09-16 |
| Goal | `coordinated-production-promotion-2026-09-16` |
| Plan | `docs/workflow/plans/2026-09-16-coordinated-production-promotion-plan.md` |
| Review | `docs/workflow/reviews/2026-09-16-coordinated-production-promotion-formal-review.md` |
| Candidate status | Not frozen; production merge and deployment remain on owner hold. |

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

## Firestore Rules result

The candidate command `npm run test:rules` completed against the local
emulators with **179/182 tests passing and 3 failing**. The failures are:

1. `print request completion — current-schema failing-before matrix` — denies
   draft, completed, and archived to completed.
2. The same suite — denies regression from completed while preserving a
   representative active detail edit.
3. `Show Queue allocation — allocatePrintRequestItem sequence` — allows staff
   to set `needsStaffRequeue` fields on a print request.

Each failure reports the emulator error that the maximum of 1,000 expressions
was reached while evaluating an update. Baseline checks were run against
`firestore.transition.rules`: the Print Request completion suite reproduced
the same two failures (12/14 pass), and the Show Queue suite reproduced the
same failure (22/23 pass). This establishes that the three failures predate
the current candidate Rules delta; it does not make the candidate Rules gate
clean.

## Disposition

The Studio fix and reviewed deterministic release corrections pass their
focused checks. The full Rules gate is documented but non-clean, so the
candidate is not frozen and no production merge, Firebase deploy, Portal
rollout, Studio dispatch/publication, IAM mutation, or production smoke was
performed. A future production execution requires an explicit owner release
instruction and disposition of the non-clean Rules gate.
