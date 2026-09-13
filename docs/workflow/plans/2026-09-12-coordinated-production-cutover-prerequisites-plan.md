# Coordinated production cutover prerequisites

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Workflow | FreshForge managed phase — Plan |
| Goal | `coordinated-production-cutover-prerequisites` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Status | **Plan complete; Formal Review approved_with_changes; implementation authorized and complete** |
| Production | Untouched; this Plan authorizes no deployment, data operation, commit, push, release, or publication |

## 1. Goal and owner decisions

Prepare the smallest reviewed source and operating contract needed to make the existing
`portalPrintRequestItems` customer projection safe to introduce in production before the parent
program rebuilds M0 and proposes an M1 candidate freeze.

This Plan records the owner's settled decisions:

- the unexplained zero-byte root file has already been deleted and needs no further action;
- the two-ask/activity child is accepted as closed under the 2026-09-11 umbrella and is not reopened;
- production uses an **additive dual-read projection cutover**, not a deny-first cutover;
- a new production-locked projection runner must support DRY RUN and VERIFY before a separately
  owner-gated APPLY;
- the next Studio version is **1.0.10**;
- authenticated-customer read access to known-ID Staff Artwork `preview.webp` and `thumbnail.webp`
  is an accepted residual risk; `SECURITY.md`, `FIREBASE.md`, and `RISK_REGISTER.md` must describe
  the same boundary during implementation.

This child ends at Signoff of repository readiness. It does not freeze the parent candidate or
perform any production action.

## 2. Evidence and problem statement

The signed-off DEV implementation already has a strict Admin-maintained
`portalPrintRequestItems` projection, Staff Artwork enrichment, Portal projection readers, an
additive query index, Firestore/Storage Rules, and a DEV-only bounded population runner. The current
runner (`functions/scripts/backfill-portal-print-request-items-dev.ts`) deliberately rejects every
project except `fresh-prints-dev`; weakening that guard is forbidden.

The parent M0 reconciliation correctly stopped because its current cutover order could deny
customer reads of canonical `printRequestItems` before production projections exist. The parent
manifests are also working-tree evidence, not immutable candidate-byte evidence. This child must
resolve both prerequisites in source and documentation before M0 is rerun.

Production baselines remain those recorded by the parent: Portal build-003, Studio v1.0.9, 113
active Functions, and 77 live indexes. These are rollback anchors only, not deployment authority.

## 3. Scope

### In scope

1. Add an explicit transition Rules state that preserves the current customer canonical-item read
   while adding customer-owned projection reads; keep projection writes Admin-only.
2. Define the final Rules state that denies customer canonical-item reads only after population,
   verification, compatible runtime rollout, and smoke gates pass.
3. Add Portal dual-read behavior: projection is preferred, but missing projection rows fall back to
   the existing authorized canonical read during transition without merging duplicate rows or
   leaking broader fields.
4. Add a separate, production-hard-pinned, bounded reconciliation runner for
   `portalPrintRequestItems`, reusing the shared projection/enrichment implementation.
5. Add deterministic tests for transition, final state, rollback, runner safety, privacy, and
   convergence.
6. Synchronize `docs/standards/SECURITY.md`, `docs/architecture/FIREBASE.md`, and
   `docs/project/RISK_REGISTER.md` with the owner-accepted Staff Artwork preview/thumb known-ID
   risk and the projection cutover.
7. Set Studio package/release metadata to `1.0.10`, including lockfile metadata and any authoritative
   release-facing version constant discovered during implementation; do not publish it.
8. Add or amend parent manifest tooling/docs so every final manifest is generated from committed
   bytes at one candidate SHA, never from a dirty working tree.

### Out of scope

- Any production deploy, Rules/index/Functions/App Hosting rollout, Studio publish, data read/write,
  runner invocation, maintenance activation, Auth/secret/settings change, or external console action.
- Stage, commit, push, merge, tag, release, candidate freeze, PR creation, or branch/worktree creation.
- Changing canonical `printRequestItems` or `staffArtworks` schemas.
- Broad customer Firestore reads of `staffArtworks`, customer access to Staff Artwork production or
  interactive assets, signed-URL architecture, or removal of the accepted preview/thumb access.
- Reopening the closed two-ask/activity child, the deleted stray-file disposition, or unrelated M0
  findings.
- Backfills other than the projection reconciliation contract; no cleanup or deletion of orphaned
  projections.
- New Portal UX or Studio feature behavior beyond compatibility handling and version metadata.
- Parent M0 rerun, M1 freeze, M2/M3 rollout, production smoke execution, and Owner production QA.

## 4. Architecture and data boundaries

The canonical write path remains unchanged:

```text
printRequestItems (private canonical source)
  -> trusted synchronizer + Admin Staff Artwork enrichment
  -> portalPrintRequestItems (strict customer-safe projection)
  -> Portal service/hook/UI
```

`portalPrintRequestItems/{itemId}` remains an additive server-owned document with the same ID as
the canonical item. Customer access is parent-request ownership constrained. Clients cannot create,
update, or delete projections. Staff Artwork Firestore documents remain staff-only. Authenticated
customers may read only `/staff-artwork/{staffArtworkId}/preview.webp` and `thumbnail.webp`; a
customer who learns another valid ID may fetch those derivatives. The owner accepts that known-ID
residual risk, while production originals and all other Staff Artwork objects remain denied.

The transition must not create a second source of truth. Canonical items remain authoritative;
projection fields are allowlist-only derivatives and the trusted synchronizer remains the ongoing
convergence mechanism.

## 5. Exact implementation phases

### Phase A — shared cutover policy and transition/final Rules sources

1. Represent the two deployable Firestore Rules states explicitly in repository source or a
   deterministic generation mechanism:
   - **transition:** existing customer-owned canonical read remains allowed and customer-owned
     projection read is added;
   - **final:** customer-owned projection read remains allowed and customer direct canonical-item
     read is denied; staff access remains unchanged.
2. The authoritative default `firestore.rules` checked into the eventual release candidate must be
   the reviewed **final** state. The transition state must be a separately named, deployable,
   byte-stable artifact, not an operator-edited hunk or undocumented local modification.
3. Storage Rules retain authenticated customer preview/thumb access and deny production/interactive
   Staff Artwork objects. No Storage transition broadening is needed.
4. Add source-contract tests proving the transition and final files differ only in the intentional
   canonical customer-read predicate and comments/metadata needed to identify the state.

### Phase B — additive Portal dual-read compatibility

1. Projection remains the preferred query and DTO.
2. During transition, a request whose projection query is empty or incomplete may fetch the
   customer-authorized canonical items through the existing service mapper. Fallback is bounded to
   the same request and ownership boundary; it must not read `staffArtworks` directly.
3. Reconcile by stable item ID: projection wins for an ID present in both sources; canonical
   fallback supplies only missing IDs; ordering remains deterministic; no duplicate item renders.
4. Fallback errors must not erase successfully loaded projections. Telemetry/logging must contain no
   customer payload, Storage URL, Staff Artwork metadata, or secret.
5. The compatibility path remains in the first production Portal build through final Rules rollout
   and the observation window. Removing it is a later reviewed cleanup, not this child.

### Phase C — production-locked reconciliation runner

Add a new runner rather than changing the DEV guard, expected as
`functions/scripts/reconcile-portal-print-request-items-prod.ts` with focused tests. It may reuse
pure helpers from the DEV runner, but must not import a DEV project constant as an override.

The runner contract is locked:

- project ID must be explicitly supplied and equal exactly `fresh-prints-prod`; missing, whitespace,
  emulator, DEV, or any other project fails before Admin initialization or Firestore access;
- default mode is DRY RUN and performs zero writes; `VERIFY=1` is read-only; APPLY is enabled only by
  exact `APPLY=1` **and** exact `CONFIRM_PROD_PORTAL_PROJECTION_APPLY=1`; conflicting modes fail;
- one invocation processes one deterministic `__name__`-ordered page, default/max 200, with an
  explicit validated `START_AFTER_ITEM_ID`; no offsets, auto-loop, parallel pages, or unbounded scan;
- read `PAGE_LIMIT + 1` only to determine `hasMore`; report `nextCursor`; a missing cursor fails
  before writes;
- call the same strict projection and Staff Artwork Admin-enrichment helpers used by the live
  synchronizer; do not duplicate allowlist logic and never write canonical items or Staff Artwork;
- classify CREATE, UPDATE, ALREADY_CORRECT, and malformed/unsafe. Extra projection fields require
  replacement with the exact allowlist. Dry-run reports malformed IDs only; APPLY aborts the whole
  page before any commit;
- APPLY re-reads sources in one bounded optimistic transaction and writes at most 200 matching
  projection IDs. No deletes, orphan cleanup, repair inference, timestamp-only rewrite, or
  best-effort partial commit;
- output structured JSON including project, mode, candidate SHA, page controls, counts, error IDs,
  writes, last ID, cursor, and `hasMore`. Never print document payloads, PII, paths/URLs, tokens, or
  secret values;
- require an explicit candidate SHA input equal to the currently checked-out clean `HEAD`; reject a
  dirty tree and reject if the runner/shared mapper/synchronizer bytes do not match the reviewed
  commit-byte manifest;
- VERIFY recomputes exact equality, rejects missing/extra/private fields and malformed rows, proves
  canonical before/after fingerprints unchanged, and reports zero deletes/out-of-page writes;
- repeat APPLY is idempotent. After every APPLY page, the same page must pass VERIFY and repeat
  DRY RUN with zero proposed changes before the next cursor may be authorized.

Runner implementation and tests are authorized only after Formal Review. **No production runner
execution is authorized by implementation or Signoff.**

### Phase D — documentation and Studio version metadata

1. Update `SECURITY.md` with projection ownership, canonical final denial, Admin-only writes,
   preview/thumb-only Storage access, and the accepted known-ID risk.
2. Update `FIREBASE.md` with transition and final order, projection/synchronizer ownership, runner
   modes, and the exact Staff Artwork object boundary.
3. Update `RISK_REGISTER.md` with an open/accepted residual-risk entry: likelihood/impact, owner
   acceptance date, preview/thumb-only exposure, production-original denial, monitoring, and the
   ownership-bound signed-URL alternative if risk tolerance changes.
4. Update `DATA_MODEL.md` or `WORKFLOWS.md` only where needed to remove contradictions about the
   projection or cutover sequence.
5. Change Studio version metadata from `1.0.9` to `1.0.10` in `apps/studio/package.json`, matching
   lockfile workspace metadata and any actual release metadata source. Do not create tag `v1.0.10`,
   invoke the release workflow, build installers for publication, or modify release channels.

### Phase E — commit-byte manifest generation contract

The parent M0 manifests must be reproducible from a clean committed candidate SHA. Implement or
document a deterministic generator/audit that:

1. accepts an explicit full 40-character SHA and verifies it exists, is the checked-out clean HEAD,
   is on `development`, and matches the approved remote ref when that later checkpoint permits;
2. enumerates paths from Git objects (`git ls-tree` / `git show <sha>:<path>`), never filesystem
   working-tree bytes;
3. records SHA-256 and byte length for every runtime/config/rules/index/build/package input and for
   the transition Rules artifact, final Rules artifact, runner, shared mapper, synchronizer, version
   metadata, and manifest/audit code;
4. regenerates Function export/transitive closure, Rules map, additive index union, Portal inputs,
   Studio packaging inputs, configuration/data dispositions, and explicit exclusions from those
   committed bytes;
5. fails on an untracked/modified path, missing manifest member, duplicate/conflicting disposition,
   unresolved Function dependency, index deletion proposal, or byte/hash mismatch;
6. distinguishes documentation-only files from runtime bytes without allowing a later docs commit
   to silently change runtime inputs; if any runtime/config byte changes, discard every derived
   manifest and rerun M0 from the new SHA;
7. emits machine-readable data plus the human-readable parent review artifacts, with generator
   version/command, SHA, counts, hashes, and timestamp. Generated artifacts do not freeze or approve
   the SHA.

## 6. Production cutover runbook contract for the parent

This child documents and tests the following order; it does not execute it:

1. At a later owner-approved clean SHA, regenerate M0 commit-byte manifests and obtain M1 freeze.
2. Complete parent RC builds/tests and the pre-mutation GO/NO-GO checkpoint.
3. Deploy additive indexes only; never use `--force`; wait until required projection indexes are
   `READY`.
4. Deploy the reviewed synchronizer/refresh Functions and **transition Firestore Rules**. Storage
   Rules may deploy here only with its reviewed preview/thumb boundary. No canonical denial yet.
5. Deploy the dual-read Portal candidate. Verify existing canonical requests still load and new or
   edited items produce projections.
6. Invoke the production runner in DRY RUN page by page and retain all summaries. Then run VERIFY
   page by page. Stop on any malformed row, unknown drift, private field, missing projection, index
   error, or source/manifest mismatch.
7. Present exact dry-run/verify evidence and request the separate checkpoint:

   > **OWNER AUTHORIZATION: PROD PORTAL PRINT REQUEST PROJECTION POPULATION — APPLY**

8. Only after that authorization, apply one page, VERIFY it, repeat DRY RUN for zero diff, record the
   cursor, and stop on any discrepancy before requesting/continuing another page as the approved
   operating record specifies.
9. After all pages report complete coverage and zero diff, observe synchronizer convergence and run
   owner production smoke checks while transition Rules and Portal fallback remain active.
10. Request a separate final-boundary checkpoint, then deploy **final Firestore Rules** denying
    customer canonical reads. Immediately rerun Rules probes and Portal smoke checks.
11. Keep the dual-read Portal code during the observation window. Its fallback will fail closed under
    final Rules, while projections continue to serve; do not remove compatibility in this rollout.
12. Studio v1.0.10 publication, Portal traffic promotion, maintenance state changes, and any other
    parent actions retain their separate reviewed checkpoints and dependency order.

## 7. Transition, final-state, and rollback coupling

The transition and final Rules artifacts are indivisible from the matching runtime state:

- **Never deploy final Rules before** indexes READY, synchronizer live, full population VERIFY,
  dual-read Portal live, and owner final-boundary approval.
- Rolling back Portal before final denial is safe because transition Rules preserve canonical reads.
- After final denial, a rollback to any Portal build that requires canonical reads must be coupled in
  the same rollback decision/window with redeployment of the reviewed transition Rules. Do not roll
  back only one side.
- A synchronizer rollback after final denial must likewise restore transition Rules first (or in the
  same controlled operation), because new canonical writes could otherwise become invisible.
- Rules rollback must use the byte-hashed transition artifact from the same frozen SHA. Never
  reconstruct rules manually.
- Population writes are additive/idempotent. Normal rollback does not delete projections or reverse
  canonical data. Any projection stripping/deletion is a separate destructive data plan and owner
  checkpoint.
- The immediate Portal rollback target remains build-003 and Studio rollback remains v1.0.9, but
  neither is compatible with final canonical denial unless the transition Rules are restored.

Rollback triggers include customer item load failure, projection mismatch/private-field finding,
trigger error/backlog, index/query failure, Rules ownership regression, or elevated Portal errors.
At any trigger: stop further APPLY/finalization, retain evidence, restore the coupled transition
state as needed, and do not improvise data repair.

## 8. Expected affected files

Exact names may be narrowed by Formal Review, but implementation must remain within these areas:

- `firestore.rules` plus one explicit transition Rules artifact or deterministic generator;
- `storage.rules` only for contract synchronization/corrections required by review;
- Portal print-request service/hooks and focused dual-read tests;
- `functions/scripts/reconcile-portal-print-request-items-prod.ts` and focused tests;
- shared projection/enrichment helpers only to enable reuse without changing customer-visible schema;
- commit-byte manifest generator/audit and parent M0 manifest documentation;
- `apps/studio/package.json`, root lockfile/workspace version metadata, and actual release metadata;
- `docs/standards/SECURITY.md`, `docs/architecture/FIREBASE.md`,
  `docs/project/RISK_REGISTER.md`, and contradiction-only data/workflow docs;
- workflow Plan/Review/Test/Signoff/state/handoff artifacts required by FreshForge.

Any new runtime surface, schema change, callable, Storage access expansion, or destructive behavior
requires a Plan amendment and renewed Review.

## 9. Test strategy

### Automated and static checks

- Projection mapper/enrichment suites: exact allowlist, accepted image/title/pixel fields, forbidden
  production/internal fields, catalog/upload parity, missing Staff Artwork fail-soft behavior.
- Portal dual-read suites: projection-only, canonical-only transition fallback, partial projection,
  duplicate ID, ordering, realtime convergence, fallback denial under final Rules, and no direct
  `staffArtworks` read.
- Firestore emulator suites against both artifacts: transition canonical+projection customer reads;
  final projection-only reads; ownership denial; client projection write denial; unchanged staff.
- Storage emulator suites: authenticated preview/thumb allowed by accepted policy; unauthenticated
  and production/interactive object reads denied; writes unchanged.
- Runner unit/contract suites: hard production pin, no emulator/DEV escape, clean SHA/manifest guard,
  default zero-write dry-run, separate VERIFY, double-confirm APPLY, page/cursor limits, strict
  comparison, malformed-page atomic abort, no deletes, idempotency, redacted output.
- Synchronizer and runner parity tests prove identical projection bytes for representative catalog,
  upload, and Staff Artwork items.
- Manifest tests build from a temporary committed fixture and prove dirty/untracked changes and
  post-SHA byte changes fail; independently recompute hashes.
- Studio metadata tests/build checks prove all authoritative version sources say `1.0.10` without
  publication.
- Required repository checks: Functions build/typecheck, Portal typecheck/build, Studio applicable
  typecheck/build with baseline failures honestly documented, targeted lint, focused tests,
  `git diff --check`, and existing release-readiness audits affected by these files.

### Manual / evidence checks

- Review generated Rules diffs and prove transition-to-final delta is only the intentional denial.
- Locally exercise Portal request history/current drawer/queue with projection present, absent, and
  delayed; verify no duplicate/disappearing Staff Artwork and no private reads.
- Produce a simulated runner DRY RUN/VERIFY transcript using injected/local test data only; do not
  access production during this child.
- Review docs cross-references and risk wording for exact agreement.

Tests must be recorded in a child Test Report. No test may be reported as passed unless run.

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Deny-first outage | Additive transition, complete verify, separate final checkpoint |
| Partial projections hide items | Dual-read merge by ID; runner page verification; synchronizer observation |
| Private Staff Artwork leakage | One strict mapper/enricher; exact comparison; Rules and source-contract tests |
| Known-ID preview/thumb access | Owner-accepted residual risk, narrow filenames/auth, docs/risk synchronization, signed-URL fallback reserved |
| Wrong-project mutation | Separate production runner, exact hard pin, clean SHA/manifest guard, double-confirm APPLY |
| Partial/racy population | One bounded transaction/page, re-read sources, atomic malformed abort, page-by-page verify |
| Rollback incompatibility | Couple legacy Portal/Function rollback with transition Rules restoration |
| Manifest describes mutable files | Generate/hash only Git object bytes at the explicit clean SHA |
| Studio release collision | Locked 1.0.10 metadata; no tag/publish in child; parent verifies tag absence later |

## 11. Human checkpoints

1. **Now:** Formal Review of this Plan. No implementation before approval.
2. If Review is `approved_with_changes`, owner acceptance is required before implementation when
   changes alter security, production sequencing, data behavior, or scope.
3. After implementation/testing: Owner DEV QA if the Review/Test Agent requires live UI validation,
   then child Signoff. Signoff authorizes no production action.
4. Parent-only later checkpoints: candidate commit/push authorization; M1 freeze; production
   readiness GO/NO-GO; additive deploy/Portal rollout; production runner DRY RUN/VERIFY; explicit
   projection APPLY; explicit final Rules denial; Portal traffic/QA; Studio v1.0.10 publish; and any
   maintenance/config/data action.

## 12. Acceptance criteria and stop boundary

The child may be signed off only when:

- transition and final Rules artifacts are deterministic and tested;
- Portal dual-read behavior is implemented and tested without direct Staff Artwork reads;
- the production runner satisfies every safety invariant and has not been run against production;
- commit-byte manifest generation/audit is reproducible and rejects dirty/non-matching input;
- Studio metadata consistently says 1.0.10 without tag/release creation;
- SECURITY, FIREBASE, and Risk Register wording agrees with the accepted known-ID risk;
- tests are recorded honestly, implementation stays within reviewed scope, and state/handoff files
  are current.

**Stop after Plan now.** The next required action is Formal Review of this document. Do not implement,
test production connectivity, stage, commit, push, freeze, deploy, populate, deny reads, publish, or
release.
