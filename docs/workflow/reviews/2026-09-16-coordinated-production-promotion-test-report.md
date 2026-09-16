# Test Report: Coordinated production promotion — 2026-09-16

| Field | Value |
|-------|-------|
| Date | 2026-09-16 |
| Goal | `coordinated-production-promotion-2026-09-16` |
| Plan | `docs/workflow/plans/2026-09-16-coordinated-production-promotion-plan.md` |
| Review | `docs/workflow/reviews/2026-09-16-coordinated-production-promotion-formal-review.md` |
| Candidate status | Frozen candidate promoted to production; rollout hard-stopped at the Studio release lint gate before Studio publication. |

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

## Production execution result

The final frozen candidate merged through protected PR #97 as
`3802ff8564efb0d24e6c783a23c4b4b65d7cef8f`. The reviewed production changes
completed as follows:

- Firestore Rules deployed successfully as Ruleset
  `3ca899da-de8c-43bb-b651-7cdcc033601a`; deployed source hash matched the
  candidate `c1df84ad2c3774fc3446932116cd359999f45f1458f526050baff93f56f943de`.
- The exact reviewed 58-function ADD/UPDATE allowlist deployed successfully;
  all 58 targets read back `ACTIVE` in `us-central1`, with no scoped deletion.
- Portal App Hosting build/rollout `build-2026-09-16-001` reached `READY` /
  `SUCCEEDED`; Cloud Run revision
  `fresh-prints-portal-build-2026-09-16-001` serves 100% traffic. Root,
  login, register, robots, Admin Show Queue, and Admin Staff Artwork checks
  returned HTTP 200 with no known DEV customer-access surface or application
  error marker.
- The exact reviewed IAM self-binding was applied to
  `473623863375-compute@developer.gserviceaccount.com`; readback showed one
  binding only: `roles/iam.serviceAccountTokenCreator` for that same service
  account.
- Firestore indexes and Storage Rules were not deployed; no data Apply,
  backfill, repair, or other production data mutation was invoked.

The Studio workflow run `35138234015` used the exact production SHA but both
Windows and Mac jobs failed closed at the release lint step. The deterministic
result was `current=21`, `baseline=25`, `new=6`, `removed=10`. The six new
diagnostics are in existing Portal/admin and Studio source files in the
cumulative candidate; local reproduction matched both hosted jobs. The
finalize job was skipped, no v1.0.13 draft/release was created, and stable
v1.0.12 remains the published Studio release. This is an explicit hard stop:
do not change or auto-expand the lint baseline, retry around the gate, or
publish until a reviewed correction/disposition is recorded.

## Disposition

The Studio fix and reviewed deterministic release corrections pass their
focused checks, and the candidate was frozen and promoted through the
protected PR path. Backend and Portal production promotion completed with the
recorded readbacks, but the coordinated rollout is not complete because the
Studio release lint gate failed. The goal remains open at this hard stop; a
new reviewed correction/disposition is required before re-freezing a candidate
and retrying Studio. The owner-accepted 179/182 Rules limitation remains
unchanged and is not the blocker.
