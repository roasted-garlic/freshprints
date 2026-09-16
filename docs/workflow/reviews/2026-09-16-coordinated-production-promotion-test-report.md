# Test Report: Coordinated production promotion — 2026-09-16

| Field | Value |
|-------|-------|
| Date | 2026-09-16 |
| Goal | `coordinated-production-promotion-2026-09-16` |
| Plan | `docs/workflow/plans/2026-09-16-coordinated-production-promotion-plan.md` |
| Review | `docs/workflow/reviews/2026-09-16-coordinated-production-promotion-formal-review.md` |
| Candidate status | Corrective candidate promoted to production; Studio v1.0.13 published successfully; owner production smoke remains pending. |

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

## Disposition at the initial lint stop

The Studio fix and reviewed deterministic release corrections passed their
focused checks, and the initial candidate was frozen and promoted through the
protected PR path. Backend and Portal production promotion completed with the
recorded readbacks, but the coordinated rollout was incomplete at this point
because the Studio release lint gate failed. The owner-accepted 179/182 Rules
limitation remained unchanged and was not the blocker. The subsequent
owner-authorized corrective and retry are recorded below.

## Corrective revalidation

The owner-authorized bounded corrective was implemented under the focused
review. The canonical lint comparator now passes locally with `current=15`,
`baseline=25`, `new=0`, and `removed=10`; the checked-in baseline was not
changed. The release workflow and local package script both use the same
`npm run lint:release` command.

| Check | Result |
|---|---|
| Canonical `npm run lint:release` | **pass** — zero new diagnostics; six workflow findings resolved |
| Lint runner and release-policy contracts | **40/40 pass** |
| Affected Portal/Studio regression contracts | **75/75 pass** |
| Portal typecheck | **pass** |
| Studio typecheck | **pass** |
| Studio local build/package preflight | **pass** — renderer, Electron main/preload, Windows installer, and blockmap completed |
| `git diff --check` | **pass** |

The corrective delta is limited to Portal/Studio client lint-safe cleanup,
root/release workflow lint invocation parity, and workflow evidence. It has no
Functions, Rules, Portal App Hosting, IAM, index, Storage Rules, schema,
secret, or production-data delta. Existing live surfaces must not be
redeployed for this corrective.

The corrective passed review and was committed on `development`, promoted
through the protected path, and dispatched from the new exact production SHA.
The accepted Rules limitation remains exactly 179/182 and is unchanged.

## Corrective production publication and machine verification

The owner-authorized corrective was committed as
`2bf6c59c599ccd702eba4523a035e7d7954aab62` and merged through protected PR
[#98](https://github.com/roasted-garlic/freshprints/pull/98). The resulting
production merge SHA is
`ccad1920bf382947dbc5d48d997f16fa037a0277`, with the original production
candidate `3802ff8564efb0d24e6c783a23c4b4b65d7cef8f` as an ancestor.

The corrective diff is limited to the reviewed Portal/Studio lint-safe source
cleanup, the canonical release-lint invocation, and workflow evidence. The
protected runtime files (`functions/src/index.ts`, `firestore.rules`,
`storage.rules`, `firestore.indexes.json`, and `firebase.json`) are unchanged
relative to `3802ff8`; no Functions, Rules, Portal App Hosting, IAM, index,
Storage Rules, schema, secret, or production-data redeploy was performed for
the corrective. The live Portal rollout remains
`build-2026-09-16-001` / revision
`fresh-prints-portal-build-2026-09-16-001` at 100% traffic.

Studio workflow run `35141319164` completed successfully for the exact
production SHA. Windows, macOS arm64/x64 packaging, and finalization all
passed. The canonical helper then published GitHub stable release `v1.0.13`
(`1.0.13`) as latest, targeting the exact production SHA, with the eight
required Windows/macOS installer, archive, blockmap, and update-manifest
assets. Stable `v1.0.12` remains available at
`840d596b058b3f7bef2dae886154aa667f9e2a57`.

Final read-only machine verification passed:

- production checkout and remote branch are clean at `ccad1920`;
- all 179 listed production Functions are `ACTIVE`, including the exact six
  newly added targets; all 94 composite indexes are `READY`;
- IAM has exactly one binding, the reviewed self-binding of
  `roles/iam.serviceAccountTokenCreator`;
- Portal latest-ready revision is the existing 2026-09-16 revision with 100%
  traffic; public `/`, `/login`, `/register`, `/robots.txt`,
  `/admin/show-queue`, and `/admin/staff-artwork` checks returned HTTP 200 with
  no known application-error marker;
- the active Firestore release points to Ruleset
  `3ca899da-de8c-43bb-b651-7cdcc033601a`; Rules remain the accepted exact
  `179/182` result with only the three known 1,000-expression transition
  baseline failures;
- production AI settings remain `catalogWorkflowMode=shadow`,
  `catalogAutonomousLiveEnabled=false`, `visionModelId=gemini-2.5-flash-lite`,
  and absent `semanticReviewPlaygroundEnabled`; maintenance is OFF and
  `settings/portalDevCustomerAccess` remains absent.

The automated production rollout is complete. The remaining gate is Owner
Production Smoke; no data repair, backfill, Apply, AI-setting change, or other
runtime mutation is authorized by this record.
