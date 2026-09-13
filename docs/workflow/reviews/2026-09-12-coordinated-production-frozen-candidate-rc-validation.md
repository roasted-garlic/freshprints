# Frozen-candidate RC validation — coordinated production promotion

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Candidate | `ff533c835508e65bb3cfd9d2739f72bafe1fc895` (M1 FROZEN) |
| Parent Plan / Review | `2026-09-10-coordinated-production-promotion-release-readiness-plan.md` / `2026-09-10-coordinated-production-promotion-release-readiness-review.md` |
| Readiness result | **C — NO-GO for production mutation** |
| Production boundary | Read-only baseline capture only; no mutation, deployment, publication, or runner execution |

This is the frozen-SHA release-candidate record authorized by the owner. It validates the immutable
candidate and records the minimum RC, rollback, DEV/local rehearsal, and production-readiness
evidence. It does not authorize a production GO, deploy, publish, maintenance transition, or data
operation.

Owner subsequently invalidated this candidate for production release purposes to allow the reviewed
Studio release-workflow corrective. The SHA and evidence below remain historical and must not be
rewritten; a new M0/M1 candidate cycle is required after the workflow/config change.

## Remediation revalidation — owner checkpoint 2026-09-12

### Portal production build — blocker closed

An isolated clean checkout was created at
`C:\Users\Roasted Garlic\AppData\Local\Temp\freshforge-rc-portal-ff533c8`, detached at the
exact frozen SHA. Node was `v20.20.1`, npm `10.8.2`, and `npm ci --ignore-scripts` completed. The
production-equivalent command `npm run build:portal` passed: compilation, lint/type validation,
21/21 static pages, and trace collection completed. `.next/trace` exists (818,950 bytes; 298
`.next` files); the EPERM condition did not reproduce. The build used synthetic non-production
public Firebase/Algolia placeholders so no secret values were read or recorded. The clean checkout
was not a production deployment or publication.

### Studio 1.0.10 package — blocker remains and requires candidate invalidation for source changes

The repository-supported `Studio release` workflow was dispatched in validation-only mode with
`ref=ff533c835508e65bb3cfd9d2739f72bafe1fc895`, `release_type=prerelease`, and
`distribution_mode=internal-unsigned` (run
`34735296362 <https://github.com/roasted-garlic/freshprints/actions/runs/34735296362>`). Both
Windows and macOS jobs reached the real workflow’s whole-repository `Lint` step and failed on the
documented existing Studio/shared lint baseline; packaging, artifact verification, install, and
update steps were skipped. No GitHub Release or stable/prerelease release was created.

This proves the real release path cannot currently produce Studio 1.0.10 from the frozen candidate
without changing release/runtime source or the lint gate. Such a change is outside this checkpoint
and would invalidate the frozen candidate and require a new M0/M1 cycle. The candidate itself was
not patched.

### Remote Rules snapshot — blocker remains

Supported read-only Rules API attempts for both rulesets and releases returned `403` because the
available local ADC has no quota project and the Rules API is service-disabled for that credential.
No IAM or quota-project change was made. Source baseline hashes remain recorded, but remote
Firestore and Storage Rules release IDs/exports/hashes are not yet available.

### Sequencing and catalog disposition

The owner-directed Studio-first order is recorded in the sequencing amendment Plan/Formal Review
and this packet’s runbook: backend/indexes/transition Rules → Studio 1.0.10 → keep maintenance
absent/OFF → Portal dual-read rollout/smoke → `FULL MAINTENANCE CAPABILITY READY` → projection
DRY RUN/VERIFY/APPLY gates. The accepted parent Review already established Studio-before-Portal
technical compatibility; the amendment changes only the coordination order.

The later production catalog operation is now **SELECTED FOR POST-ROLLOUT OVERNIGHT OPERATION**:
full eligible-design Smart Profile reprocess/backfill, followed by production Algolia reconcile
only if required by the final reviewed search contract. It remains separately owner-gated,
maintenance-window-bound, and unexecuted. Legacy tag physical deletion remains a later cleanup
phase after zero-consumer proof.

## 1. Freeze integrity

| Check | Result |
|---|---|
| `HEAD` | exact frozen SHA `ff533c835508e65bb3cfd9d2739f72bafe1fc895` |
| Upstream | `origin/development` resolves to the same SHA |
| Branch / divergence | `development`; ahead/behind `0 / 0` |
| Staged paths | `0` |
| Post-freeze status | all paths documentation-only; `0` non-documentation paths |
| Runtime/config diff | clean against frozen SHA; ignored Studio generated build config only |
| Root stray file | zero-byte `{console.error(e)` is absent |
| Core manifest | 10 members; audit `mismatches: []` |
| Portal input manifest | 747 files; digest `69f3814242727afa4330cadb11937ad334f64251bf4fc87d3fc57858d0c17b5b`; audit 0 mismatches |
| Studio input manifest | 1,145 files; digest `d565d27c2d4857ae2267c45b52004382a0bd37f7321026992dd37e366d5f0718`; audit 0 mismatches |
| Function closure | 186 current / 120 production exports; 530 closure paths; digest `22e56a4810c0714999f6793a350bb67c22215b0ec556179524948552812f9fbc` |
| Rules / config | final Rules `dc4fc83dcf36382aa7d2273dc4e35bd6e41b3da02b33e85a3bd21c710204d2ee`; transition `8a50d5bb85fa41fca82652582730940fb1a936cb0aae059a0b05e59099db9945`; transition config `c07e7c2772b6fcf94b14f42af211883f248952d28bddd6e40c9efe6c8aef0c03` |
| Indexes | 95 candidate / 77 production; 18 additive; 0 removed/replaced; 3 candidate field overrides |
| Diff check | `git diff --check` PASS; line-ending warnings only |

The immutable evidence and its hashes are also recorded in the M1 freeze proposal and the
read-only production baseline record. The six documentation-only paths are permitted by the
post-freeze continuation contract and do not alter the frozen runtime tuple.

## 2. Automated RC validation

| Check | Result | Evidence / interpretation |
|---|---|---|
| Focused cutover/projection/Rules/Staff Artwork/release-policy suites | **87/87 PASS** | Exact command recorded in the child Test Report; rerun on the frozen source |
| Functions build | **PASS** | `npm --prefix functions run build` |
| Portal typecheck | **PASS** | `npm run typecheck --workspace @fresh-prints/portal` |
| Targeted lint | **PASS** | ESLint over changed cutover/Portal/Functions/shared/generator files |
| `git diff --check` | **PASS** | Conversion warnings only |
| Whole-repository lint | **FAILED — existing baseline** | `npm run lint`: 20 errors / 5 warnings; unrelated files and diagnostics, not newly introduced |
| Portal production build | **PASS — clean RC environment** | Isolated frozen-SHA checkout compiled, typechecked, prerendered 21/21 pages, and collected `.next/trace`; EPERM absent. Local dirty-checkout baseline remains documented. |
| Full Firestore Rules emulator suite | **FAILED — existing baseline** | Existing expression-budget limit at `firestore.rules` `isOptionalMap`; local emulator only |
| Studio full typecheck | **FAILED — existing baseline** | Existing unrelated typing/unused-import/nullable-field/keyboard-overload diagnostics |
| Studio RC package | **BLOCKED before artifact** | Real prerelease workflow run `34735296362` failed its existing whole-repository lint gate on Windows and macOS; no installer was emitted |
| Studio install/update | **NOT RUN** | No RC package exists to install; no stable publication or updater action was invoked |

The Studio packaging build was attempted only in prerelease validation mode and stopped before
electron-builder. The ignored `apps/studio/electron/generated/packagedBuildConfig.ts` is not a
candidate change. No installer-producing workflow or stable release was invoked.

## 3. Frozen release and rollback evidence

- Portal candidate inputs are immutable at 747 files. Immediate rollback is live Portal build-003;
  after final raw-read tightening, rollback is coupled to restoring transitional/prior Rules
  before routing traffic to build-003. Build-002 is secondary only.
- Studio candidate inputs are immutable at 1,145 files and package metadata is `1.0.10`.
  Immediate rollback is stable `v1.0.9`; `v1.0.8` is secondary only. The live v1.0.9 release
  has eight uploaded assets. No RC or stable publication occurred.
- The Function action manifest is explicit: ADD 54, UPDATE 110, RETAIN LIVE VERSION 3,
  EXCLUDE 10, NO ACTION 9. Hard-delete exports remain excluded.
- Final and transition Firestore Rules, Storage Rules, additive index union, and the production-
  hard-pinned projection runner are source evidence only. No deployment command was run.

## 4. Five DEV/local journeys

The following are accepted terminal Owner DEV QA evidence, not production smoke claims:

| Journey | Result | Evidence |
|---|---|---|
| Portal request/upload/edit | **PASS** | Owner DEV QA PASS; child Test Report and Signoff |
| Studio catalog → Ready/search | **PASS** | Owner DEV QA PASS; projection/Staff Artwork contracts |
| Studio request/show/gang-sheet | **PASS** | Owner DEV QA PASS; request/order/queue contracts |
| Combined identity/User Info + admin queue | **PASS** | Owner DEV QA PASS; approved read-only admin evidence |
| Maintenance gate | **PASS** | Signed-off DEV maintenance prerequisite; absent/OFF production contract preserved |

Owner record: **`OWNER DEV QA: coordinated-production-cutover-prerequisites - PASS`**. The owner’s
validation was limited to DEV/local behavior and did not authorize production action.

## 5. Projection and rollback rehearsals

- **Projection cutover rehearsal — PASS (DEV/local/injected data):** focused tests cover
  projection-preferred reads, stable deduplication/order, bounded canonical fallback, delayed or
  stale projection reconciliation, projection-read error fallback, transition Rules, shared
  mapping, and production-runner guard behavior. The production runner was never invoked.
- **VERIFY semantics — PASS (contract evidence):** pre-APPLY VERIFY reports expected missing or
  stale rows as population deltas; malformed, unsafe, or unclassified drift fails closed.
  Post-APPLY VERIFY requires exact equality, followed by a zero-diff DRY RUN. APPLY remains a
  separately owner-gated production action and was not simulated against production.
- **Rollback rehearsal — PASS as a documented, non-mutating rehearsal:** Portal rollback is
  build-003 plus transitional/prior Rules coupling; Studio rollback is v1.0.9; Functions use the
  explicit closure allowlist; projection rollback stops exposure and preserves the canonical
  reader/projection rows; final Rules tightening is not rolled back independently of Portal
  compatibility. No rollback action was executed.

## 6. Data-operation classifications

| Operation | Classification | RC disposition |
|---|---|---|
| `portalPrintRequestItems` population | **REQUIRED** for final projection-only exposure | Production runner is hard-pinned, dry-run/VERIFY first; APPLY separately owner-gated and not run |
| Lifecycle mirror population | **CONDITIONAL / DEFERRED** | Keep compatibility reader unless a later owner decision selects indexed reads and a production-safe runner |
| Historical `queueTab` backfill | **DEFERRED / NOT REQUIRED** | Compatibility derivation admits legacy absent fields; DEV-only runner is not a production target |
| Algolia reconcile/rebuild | **CONDITIONAL** | Existing production index/settings retained; no provider call, clear, or rebuild |
| Smart Profile/reprocess/taxonomy operations | **CONDITIONAL / DEFERRED** | Autonomy and Pass 2 remain OFF; no provider or data operation |
| Retention scheduler, cleanup, hard-delete, merge, wipe, physical deletion | **EXCLUDED / DEFERRED** | No destructive or scheduled operation |
| Settings/Auth/secrets/provider changes | **EXCLUDED from RC** | Preserve existing values; names/metadata only, never secret values |

## 7. Baseline comparison and blockers

The unchanged failures are carried as known baselines, not new candidate regressions: the local
dirty-checkout Portal `.next/trace` EPERM, Firestore expression-budget exhaustion, unrelated Studio
typecheck errors, and unrelated whole-repository lint errors/warnings. The clean Portal RC build
closed the build blocker. The RC still cannot claim production readiness because the Studio 1.0.10
package, install, and update checks could not be completed. In addition, remote Firestore/Storage
Rules release metadata/export could not be captured with the available read-only credential (API
returned 403), so the required immutable remote Rules rollback snapshot is still outstanding.

These are the unresolved blockers:

1. Produce the prerelease Studio 1.0.10 artifacts and complete install/update validation. The
   real workflow’s lint gate prevents this without a reviewed source/workflow change; that change
   would invalidate the frozen candidate and require a new M0/M1 cycle.
2. Capture the immutable remote Firestore/Storage Rules release IDs/exports/hashes before any
   Rules replacement. The current credential lacks the required Rules API access.
3. Re-open the GO/NO-GO checkpoint only after the above evidence is attached; any runtime/config
   change requires a new candidate and freeze.

## 8. Readiness disposition

**C — NO-GO for production mutation.** The candidate’s frozen source integrity and focused
behavioral evidence are intact, and the documented failures are existing baselines/environment
limitations rather than newly introduced defects. RC release artifacts and the mandatory remote
Rules rollback snapshot are incomplete, so no production GO, deployment, publication, maintenance
activation, projection APPLY, or backfill may proceed.

## 9. Boundary and exact next checkpoint

Production was untouched except for the explicitly recorded read-only baseline queries. No
production runner, DRY RUN, VERIFY, APPLY/backfill, Rules deployment, Functions deployment,
Portal publication, Studio publication, maintenance activation, production settings/data/Auth/
secrets mutation, staging, commit, push, freeze, or parent M0 rerun occurred.

**Exact next owner checkpoint:** `OWNER DECIDE INVALIDATE FROZEN CANDIDATE / RETURN TO M0-M1 FOR STUDIO RC REMEDIATION`
