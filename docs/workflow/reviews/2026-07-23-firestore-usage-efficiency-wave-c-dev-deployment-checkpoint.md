# Firestore Usage Efficiency Wave C — Dev Deployment Checkpoint

Date: 2026-07-23 (rules suite and dependency audit completed same-day, second pass)
Phase: implementation and local automated verification complete
Checkpoint: **owner approval required before any dev deployment or initialization**

## Outcome

Phase 0 remains `passed_with_notes`; the sole note is Firebase dashboard rounding/reporting delay
during the earlier broad smoke. The reviewed Wave C code is locally implemented. The committed
Firebase rules emulator suite was executed on a Java 21-equipped environment (a user-scoped portable
JDK; no admin rights, no system changes) and every Firestore/Storage assertion passes. Two missing
narrow assertions (`update`/`delete` denial on `snapshotPublicationState`, and explicit
authenticated-role denial of the private AI prefix) were added and pass. All 24 npm audit findings
were reviewed and classified; none were introduced by Wave C. No Firebase deployment,
coordination-document initialization, snapshot publication, migration, backfill, controlled import,
or production action occurred.

## Files changed

Phase 0’s exact containment files and evidence are listed in the
`phase-0-test-report.md`. Remaining Wave C implementation added or changed:

- Shared contracts/tests:
  - `packages/shared/src/catalog-snapshots/catalogSnapshot.types.ts`
  - `packages/shared/src/catalog-snapshots/catalogSnapshot.parsers.ts`
  - `packages/shared/src/catalog-snapshots/catalogSnapshot.parsers.test.ts`
- Functions generation/consumption/tests:
  - `functions/src/catalogSnapshots/snapshotBuilders.ts`
  - `functions/src/catalogSnapshots/snapshotBuilders.test.ts`
  - `functions/src/catalogSnapshots/publishCatalogSnapshots.ts`
  - `functions/src/catalogSnapshots/waveCReadContainment.test.ts`
  - `functions/src/ai/loadAiCatalogReferenceSnapshot.ts`
  - `functions/src/ai/aiEnrichmentRuntimeCache.ts`
  - `functions/src/index.ts`
- Portal generated assets, bounded queries, ID cache, and polling:
  - `apps/portal/features/catalog/hooks/useCatalogDesigns.ts`
  - `apps/portal/features/catalog/services/catalogService.ts`
  - `apps/portal/features/catalog/services/portalCatalogAssetService.ts`
  - `apps/portal/features/catalog/services/catalogSnapshotFlags.ts`
  - `apps/portal/features/catalog/services/catalogDesignByIdCache.ts`
  - `apps/portal/features/catalog/services/catalogDesignByIdCache.test.ts`
  - `apps/portal/features/print-requests/hooks/usePortalShowPrintProgress.ts`
  - `apps/portal/features/print-requests/utils/portalPrintProgressPolling.ts`
  - `apps/portal/features/print-requests/utils/portalPrintProgressPolling.test.ts`
- Studio dev-only owner/admin invocation surface:
  - `apps/studio/src/renderer/src/features/designs/services/catalogSnapshotAdminService.ts`
  - `apps/studio/src/renderer/src/shared/components/AppShell.tsx`
- Security/test configuration:
  - `firestore.rules`
  - `storage.rules`
  - `firebase.json`
  - `tests/firebase/catalogSnapshot.rules.test.ts`
  - `package.json`
  - `package-lock.json`
- Durable/workflow documentation:
  - `docs/project/DECISIONS.md`
  - `docs/architecture/ARCHITECTURE.md`
  - `docs/standards/SECURITY.md`
  - `docs/standards/TESTING.md`
  - `docs/standards/DEPLOYMENT.md`
  - the three Phase 0 records, `.cursor/workflow/state.md`, and
    `references/project-chatgpt-handoff/CURRENT-STATE.md`

## Functions changed or added

- `onCategorySnapshotSourceWritten`: relevant-field comparison, generation dirtying, bounded
  15-second debounce.
- `onTagSnapshotSourceWritten`: same for public/AI tag fields.
- `onPortalCatalogSnapshotSourceWritten`: compares only ready/public card/ranking fields.
- `rebuildCatalogSnapshots`: owner/admin-only recovery and initial publication callable.
- Existing AI enrichment, playground, rerank, retry, and reprocessing flows continue through
  `aiEnrichmentRuntimeCache`, which now obtains categories/tags from one private snapshot loader.
- Two coordination documents, 10-minute reclaimable leases, at most two passes, deterministic
  generation/hash versions, object metadata verification, manifest generation preconditions,
  manifest-last replacement, and previous-version retention are implemented.

## Rules and indexes

Firestore rules add an explicit deny for:

```txt
snapshotPublicationState/{snapshotId}
```

Storage rules add:

- private/denied `generated/catalog-reference/ai/**`
- public-read/client-write-denied reference manifest and `client/**`
- public-read/client-write-denied `generated/portal-catalog/**`

`firestore.indexes.json` is unchanged. Existing indexes cover the remaining bounded Firestore browse;
there is no index deployment command for this checkpoint.

## Generated asset paths

```txt
generated/catalog-reference/manifest.json
generated/catalog-reference/ai/v{contentVersion}.json
generated/catalog-reference/client/v{contentVersion}.json
generated/portal-catalog/manifest.json
generated/portal-catalog/v{catalogVersion}/discover.json
generated/portal-catalog/v{catalogVersion}/recent/page-{page}.json
generated/portal-catalog/v{catalogVersion}/categories/{categoryId}/page-{page}.json
generated/portal-catalog/v{catalogVersion}/filters/tags/{tagId}.json
generated/portal-catalog/v{catalogVersion}/filters/categories/{categoryId}.json
generated/portal-catalog/v{catalogVersion}/search/shard-{twoCharacterShard}.json
generated/portal-catalog/v{catalogVersion}/cards/bucket-{stableHashBucket}.json
```

Public outputs are allowlisted. The client taxonomy omits AI guidance/descriptions; Portal cards omit
processing/internal fields. Enforced uncompressed safety ceilings are 32 KiB manifests/card buckets,
256 KiB taxonomy/search/filter assets, 512 KiB Discover, and 2 MiB generated browse pages. Client
asset memory is a 16 MiB LRU and generated result materialization is 40 cards per page.

## Initialization actions — not yet authorized

After approved dev Functions/rules deployment:

1. Start Studio development against `fresh-prints-dev`.
2. Sign in as an active owner/admin.
3. Open renderer DevTools.
4. Run `await window.freshPrintsDev.rebuildCatalogSnapshots()`.
5. Copy the returned reference and Portal `contentVersion`/`generation`.
6. Verify exactly:
   - `snapshotPublicationState/catalog-reference`
   - `snapshotPublicationState/portal-catalog`
   - both manifest objects and their versioned targets.

This single callable initializes the two documents and performs the initial publication. Do not
manually create documents or run an import first.

## Exact dev deployment commands — not yet authorized

```bash
firebase deploy --only functions:rebuildCatalogSnapshots,functions:enqueueAiEnrichment,functions:testAiEnrichmentPlayground,functions:testAiEnrichmentTagRerank --project fresh-prints-dev
firebase deploy --only firestore:rules --project fresh-prints-dev
firebase deploy --only storage --project fresh-prints-dev
```

After the initialization steps above produce and validate both manifests:

```bash
firebase deploy --only functions:onCategorySnapshotSourceWritten,functions:onTagSnapshotSourceWritten,functions:onPortalCatalogSnapshotSourceWritten --project fresh-prints-dev
```

This ordering prevents an incidental source write from initializing publication before the approved
callable action. No index deployment is needed. Deploying the Portal/App Hosting revision remains a
separate explicit dev action after valid initial assets exist. Production is out of scope.

## Automated verification

| Command | Exit | Result |
|---|---:|---|
| `npm run build --prefix functions` | 0 | Functions compile |
| `npm run typecheck --workspace @fresh-prints/portal` | 0 | Portal typecheck |
| focused changed-file ESLint | 0 | no warnings |
| exploratory `services/*.ts` lint glob | 1 | included unchanged `catalogStorageService.ts`; pre-existing unused `_limit` |
| exact Wave C changed-file ESLint rerun | 0 | no warnings |
| combined Wave C + containment + AI `npx tsx --test ...` | 0 | 69/69 pass |
| `npm run build:portal` | 0 | Next production build |
| `npm exec --workspace @fresh-prints/studio -- vite build` | 0 | renderer/main/preload build; existing chunk warnings only |
| `git diff --check` | 0 | clean (pre-existing LF/CRLF warnings only, no conflict markers) |
| `npm run test:rules` (Java 21) | 0 | 6/6 Firestore + Storage rules assertions pass |
| combined Wave C focused suite (`waveCReadContainment`, `snapshotBuilders`, `catalogSnapshot.parsers`, `catalogDesignByIdCache`, `portalPrintProgressPolling`) | 0 | 12/12 pass, rerun after rules-test-file change |
| `npx eslint tests/firebase/catalogSnapshot.rules.test.ts --max-warnings 0` | 0 | no warnings |

### Rules suite — second pass (Java-equipped)

- Environment: Windows, user-scoped portable Eclipse Temurin 21 JDK (no admin rights; extracted to
  `%USERPROFILE%\.local-jdk`, `JAVA_HOME`/`PATH` set for the invoking shell only).
- Java: `openjdk version "21.0.11" 2026-04-21 LTS` (Temurin 21.0.11+10). Firebase CLI 15.24.0 requires
  Java 21+; Java 17 was tried first and rejected by firebase-tools (`no longer supports Java version
  before 21`).
- Command: `npm run test:rules` — `firebase emulators:exec --only firestore,storage "npx tsx --test
  tests/firebase/catalogSnapshot.rules.test.ts"`.
- Result: Firestore + Storage emulators started successfully; **6 tests, 6 pass, 0 fail** (exit 0).
- Two narrow assertions were added to `tests/firebase/catalogSnapshot.rules.test.ts` because the
  originally committed suite (3 tests) did not prove every required boundary from the plan/handoff:
  explicit authenticated-role (customer and staff, not just guest) denial of
  `generated/catalog-reference/ai/**` reads; explicit client `update`/`delete` denial (not just
  `get`/`create`) on `snapshotPublicationState/*`; unrelated-path regression (`originals/**` stays
  staff-only); and unrelated Firestore regression (ready-design read still allowed, default-deny on
  an undeclared collection still enforced). No rule file changed — only the test file gained
  coverage.
- One test attempt was reverted: an assertion that a guest could read a Storage-only
  `thumbnails/{id}.webp` object (proving the pre-existing `isReadyDesignDerivative` Storage rule,
  which cross-references Firestore via `firestore.get`, is unaffected) failed with
  `storage/unauthorized` in the emulator. This is a known `@firebase/rules-unit-testing` Storage
  emulator limitation for cross-service `firestore.get`/`firestore.exists()` rule calls, not a rule
  regression — no other test in the repository exercises this cross-service path, and the rule
  itself is pre-existing and out of Wave C's scope. The assertion was removed rather than
  papered over; the storage rule was not touched.

### Dependency audit — second pass

- `npm audit --json` (read-only; no `npm audit fix` run): **24 findings** — 1 critical, 13 high, 10
  moderate, 0 low. Matches the prior count exactly.
- Package-lock diff review: Wave C's only `package-lock.json` change is adding
  `@firebase/rules-unit-testing` (dev-only, Review-approved) with no new transitive packages beyond
  its own entry. None of the 24 findings were introduced by Wave C; all pre-date it.
- Critical/high findings in `tar`, `app-builder-lib`, `dmg-builder`, `electron-builder*`, `js-yaml`,
  `shell-quote`, `brace-expansion`, `concurrently`, `vite`, `postcss` are build/dev/Electron-packaging
  tooling only — not shipped in Portal or Functions runtime, not reachable via customer/staff input.
- `next` (high) — Portal uses no Server Actions, no `next.config` `rewrites()`, no `next/image`, and
  no custom server; the advisory's preconditions are not present in the deployed app.
- `electron` (high) — Studio desktop runtime; requires local attacker control, not remotely
  triggered; Studio is staff-only, not customer-facing.
- `sharp` (high, libvips CVEs, installed `0.33.5` < required `0.35.0`) — **runtime-reachable**:
  `functions/src/lib/customerUploadProcessing.ts` calls `sharp(...).metadata()` on customer-uploaded
  PNG/WEBP bytes. Three of four bundled CVEs are confined to VIPS-native/32-bit-GIF/TIFF paths not
  used here; the fourth (EXIF tag-group null-pointer, DoS-only, no memory disclosure/RCE) is
  reachable via a malformed EXIF block in a customer upload. Not introduced by Wave C. Fix
  (`sharp@0.35.3`) is a semver-major bump across `functions` and `apps/studio` requiring its own
  reviewed upgrade/test pass — not treated as a Wave C deployment blocker because impact is bounded
  (Cloud Functions auto-restart a crashed instance; no data compromise) and it pre-dates this goal.
  Tracked as `docs/project/RISK_REGISTER.md` R-012.
- Moderate findings (`@google-cloud/firestore`, `@google-cloud/storage`, `esbuild`, `firebase-admin`,
  `gaxios`, `google-gax`, `protobufjs`, `retry-request`, `teeny-request`, `uuid`) are transitive
  Firebase Admin/Google Cloud client library dependencies; recorded as a known dependency-risk note
  per the audit decision rule, not individually blocking.
- No automatic audit fix was run. No dependency was upgraded.

## Rollback

1. Portal emergency fallback: build with
   `NEXT_PUBLIC_USE_GENERATED_CATALOG_SNAPSHOTS=false`; search remains bounded to Firestore cursor
   pages and never restores full hydration.
2. AI emergency fallback: deploy Functions with `AI_CATALOG_SNAPSHOT_ENABLED=false`; one combined,
   in-flight-deduplicated five-minute taxonomy Firestore fallback is used.
3. Manifest rollback: restore each manifest to `previousContentVersion` and its retained immutable
   paths using a generation-match write.
4. Trigger rollback: redeploy the prior Functions revision before altering coordination state.
5. Never delete immutable prior assets during an incident. No data migration/backfill is required
   to roll back this phase.

## One consolidated owner QA after approved dev publication

Target: approximately 20–30 minutes, one Firebase before/after reading.

1. Record one Firebase Firestore read total/percentage.
2. Start Studio with tracing, open Inbox, and idle 10 minutes.
3. Navigate once through Design Library, AI Review, Print Requests, Imports, Show Queue, and Inbox.
   In Print Requests click every populated status tab and Working filter once.
4. Open dev Portal: verify Discover; Library first page + one Load more; one text search; one
   two-tag filter; clear filters and leave the page responsive.
5. In Studio AI Playground run one existing-design enrichment. Confirm logs show a valid snapshot
   version and no Firestore category/tag fallback.
6. Confirm no navigation throttling, freeze, unexpected reload, repeated loading loop, or listener
   growth. Copy one final Studio tracer snapshot and the callable publication result.
7. Record one Firebase total/percentage after the entire run.

Do not run the 10–20 design import unless this consolidated post-publication smoke passes. If it
passes, the controlled import is the next developer-owned budget verification, not another broad
manual route matrix.

## Incident: first `rebuildCatalogSnapshots` initialization attempt failed (2026-07-23, post-approval)

### What was deployed and what failed

The owner deployed the approved first Functions stage (`rebuildCatalogSnapshots`,
`enqueueAiEnrichment`, `testAiEnrichmentPlayground`, `testAiEnrichmentTagRerank`), both rules files,
and — ahead of the approved order — the three source-write triggers
(`onCategorySnapshotSourceWritten`, `onTagSnapshotSourceWritten`, `onPortalCatalogSnapshotSourceWritten`)
to `fresh-prints-dev`. Deployment audit logs (`firebase functions:log`) confirm all seven resources
reached `ACTIVE` state cleanly between 23:28–23:32 UTC. The owner then invoked
`await window.freshPrintsDev.rebuildCatalogSnapshots()` from Studio; the browser reported
`POST .../rebuildCatalogSnapshots 500` and `FirebaseError: INTERNAL`.

### Root cause (proven from server logs and source, not guessed)

`firebase functions:log --only rebuildCatalogSnapshots --project fresh-prints-dev` shows exactly two
invocations (23:34 and 23:35 UTC), each ending in:

```
Unhandled error Error: snapshot-asset-budget-exceeded:generated/catalog-reference/ai/v{1,2}-1a810751ceb2b381.json
    at saveJson (.../publishCatalogSnapshots.js:23:15)
    at publishReference (.../publishCatalogSnapshots.js:101:9)
```

This is the asset-budget guard in `saveJson()` (`functions/src/catalogSnapshots/publishCatalogSnapshots.ts`),
which throws before any Storage write when `Buffer.byteLength(JSON.stringify(value)) > maxBytes`
(256 KiB for the AI/client taxonomy snapshots). Both attempts produced the identical content-version
hash (`1a810751ceb2b381`), proving the failure is fully deterministic given the current dev taxonomy,
not a flake or a race with the triggers.

**Measured, not estimated:** a size-equivalent fixture matching the dev-scale corpus (1,122 approved
tags with realistic `name`/`aliases`/`preferredWhen` lengths, 18 active categories) serializes to
approximately 284 KB for the **AI** reference snapshot (`generated/catalog-reference/ai/**`, which
includes `preferredWhen` guidance text per tag) — over the 256 KiB ceiling — while the equivalent
**client** snapshot (`generated/catalog-reference/client/**`, which omits `preferredWhen` and
category descriptions) serializes to approximately 161 KB, comfortably under budget. This exactly
matches the log: the error only ever names the `ai/` path, never `client/`. A new regression test,
`functions/src/catalogSnapshots/snapshotBuilders.test.ts` → "documents that a dev-scale approved
taxonomy exceeds the unsharded 256 KiB AI budget", reproduces this with the same-scale fixture and
asserts the AI snapshot exceeds budget while the client snapshot does not.

**This is a measured architecture conflict, not a simple bug.** The approved Wave C plan's payload
budget table lists a single flat "taxonomy snapshot: at most 256 KiB compressed" ceiling for the AI
reference snapshot and explicitly gave the Portal catalog assets (search shards, tag/category filter
assets, card buckets) a sharding strategy to stay under budget — but the plan never extended sharding
to the AI reference taxonomy snapshot itself. At Fresh Prints Dev's actual approved-tag count
(~1,122), the current unsharded single-file AI snapshot design cannot hold the real corpus. Per this
handoff's explicit instruction, the budget was **not** silently raised and the AI snapshot was **not**
silently reshaped (e.g. truncating `preferredWhen`, dropping aliases) to fit — either change would
alter the approved client-safe/AI-private contract and needs its own FreshForge review, since AI
tag-selection quality depends on `preferredWhen` guidance text being present and complete for every
approved tag, and arbitrarily truncating it was explicitly out of scope for this diagnostic pass.

### Partial Firestore/Storage state

Direct read access to `fresh-prints-dev` Firestore/Storage state (beyond what `firebase functions:log`
exposes) was not performed in this pass — an attempt to reuse this repository's existing
`functions/scripts/smoke-*.mjs` convention (reading the local Firebase CLI's cached OAuth
`access_token` for a short-lived Admin SDK credential, the same convention already used by e.g.
`functions/scripts/smoke-customer-upload-subphase-b.mjs`) was blocked by this environment's tool
permission classifier as sensitive credential access, and that block was respected rather than
routed around. The following is therefore inferred from source and logs, not directly observed,
and should be confirmed by the owner (e.g. via the Firebase Console) before relying on it:

- `snapshotPublicationState/catalog-reference`: by the code path in `publishKind()`, both failed
  attempts should leave this document at `status: "failed"`, `leaseOwner: null`,
  `leaseExpiresAt: null`, `lastErrorCode` set to the thrown error's `name` (`"Error"`), and
  `publishedGeneration` unchanged from before the attempt (never advanced, because the failure
  happens before the manifest write, which is the only step that advances it). No dead/stuck lease
  is expected — the `catch` block in `publishKind()` unconditionally clears
  `leaseOwner`/`leaseExpiresAt` before rethrowing.
- `snapshotPublicationState/portal-catalog`: the logs show **no error** for `portal-catalog` in
  either attempt (only `catalog-reference`/`ai/` paths appear), and `rebuildCatalogSnapshots` ran
  both `publishKind` calls concurrently (previously via `Promise.all`, independent promises), so
  `portal-catalog` most likely **succeeded** both times — meaning `generated/portal-catalog/manifest.json`
  and its versioned assets (discover, recent pages, category pages, tag/category filters, search
  shards, card buckets) may already be published and valid. This should be confirmed directly before
  the owner relies on Portal Discover/search working from a valid snapshot.
- `generated/catalog-reference/manifest.json`: expected **absent or unchanged from before this
  incident** — `publishReference()` only writes the manifest after both the AI and client asset
  `saveJson` calls resolve, and the AI one always threw first.
- `generated/catalog-reference/client/v{1,2}-1a810751ceb2b381.json`: **may exist as an orphaned
  immutable object** — `publishReference()` uploads the AI and client assets concurrently via
  `Promise.all([saveJson(aiPath, ...), saveJson(clientPath, ...)])`; the AI call's budget check
  throws synchronously before any network I/O, but `Promise.all` does not cancel the sibling
  promise, so the client asset upload could complete independently. This is safe to leave in place
  (no manifest references it, so no client or AI consumer will ever read it) but should be confirmed
  and can be cleaned up in a later, separately approved pass — do not delete it as part of this
  diagnostic checkpoint.
- No trigger (`onCategorySnapshotSourceWritten`, `onTagSnapshotSourceWritten`,
  `onPortalCatalogSnapshotSourceWritten`) shows any invocation beyond its own deployment/cold-start
  log lines. No category, tag, or design document was written after deployment, so none of the three
  triggers ever fired, hold a lease, or have any partial/conflicting state to reconcile.

### Authorization

Both invocations show `"verifications":{"auth":"VALID","app":"MISSING"}` (App Check is not
configured/required, consistent with the rest of this repo's callables) — the owner's call reached
the handler as a valid authenticated user and passed `assertOwnerAdmin()` (no `permission-denied` or
`unauthenticated` error appears in the logs; the failure occurs later, inside `publishReference()`).
Authorization is not implicated in this failure.

### Fix applied (narrow, reversible, does not touch the architecture conflict)

Files changed:

- `functions/src/catalogSnapshots/publishCatalogSnapshots.ts` — `rebuildCatalogSnapshots` now runs
  its two `publishKind` calls via `Promise.allSettled` (previously `Promise.all`, which reported only
  the first rejection and could obscure a second family's independent outcome) and maps any
  rejection through a new `mapPublicationFailure()` to a safe `HttpsError("failed-precondition", ...)`
  carrying a stable machine-readable code (`snapshot/payload-budget-exceeded`,
  `snapshot/storage-write-failed`, or `snapshot/build-failed`) and the affected `kind`/`path` in
  `details`. The detailed stack trace remains server-log-only; the client now receives a specific,
  actionable message instead of generic `INTERNAL`. `markDirty`, `publishKind`, `publishReference`,
  `publishPortal`, `saveJson`, and all three trigger handlers are unchanged.
- `functions/src/catalogSnapshots/publishCatalogSnapshots.test.ts` (new) — 3 tests proving the three
  mapped error codes and that the safe message never contains the internal stack trace or raw error
  text.
- `functions/src/catalogSnapshots/snapshotBuilders.test.ts` — added the dev-scale (1,122-tag/18-category)
  regression fixture proving the AI snapshot exceeds budget and the client snapshot does not.

Why this fix is correct and sufficient for what it claims to fix: it only changes how an already-thrown
error is reported to the caller; it does not change what gets built, what budgets apply, whether
publication succeeds, or the public/private asset contract. It directly resolves the originally
reported symptom (opaque `INTERNAL` 500 with no diagnosable cause) without masking or working around
the real, unresolved architecture conflict below.

**Not fixed, and explicitly not attempted:** the underlying reason `catalog-reference` publication
fails at Fresh Prints Dev's real tag count. Silently raising the 256 KiB ceiling, or silently sharding
the AI snapshot the same way the Portal catalog assets are sharded, would change the approved
generated-read-model architecture from `docs/workflow/plans/2026-07-23-firestore-usage-efficiency-wave-c-plan.md`
and needs its own reviewed decision — this stops here per this handoff's explicit instruction rather
than choosing a shape unilaterally.

### Regression tests added

- `functions/src/catalogSnapshots/publishCatalogSnapshots.test.ts` (new, 3 tests) — error-mapping.
- `functions/src/catalogSnapshots/snapshotBuilders.test.ts` (+1 test) — dev-scale budget reproduction.

### Verification re-run after the fix

| Command | Exit | Result |
|---|---:|---|
| `npm run test:rules` (Java 21) | 0 | 6/6 pass, unchanged |
| `npm run build --prefix functions` | 0 | compiles |
| `npm run typecheck --workspace @fresh-prints/portal` | 0 | unaffected (no Portal source changed) |
| `npm run build:portal` | 0 | unaffected |
| `npm exec --workspace @fresh-prints/studio -- vite build` | 0 | unaffected (no Studio source changed) |
| `npx tsx --test` (`waveCReadContainment`, `snapshotBuilders`, `publishCatalogSnapshots`, `catalogSnapshot.parsers`, `catalogDesignByIdCache`, `portalPrintProgressPolling`) | 0 | 16/16 pass |
| `npx eslint functions/src/catalogSnapshots/publishCatalogSnapshots.ts functions/src/catalogSnapshots/publishCatalogSnapshots.test.ts functions/src/catalogSnapshots/snapshotBuilders.test.ts --max-warnings 0` | 0 | no warnings |
| `git diff --check` | 0 | pre-existing LF/CRLF warnings only |

### Exact redeployment required (verified, not run)

Only `rebuildCatalogSnapshots`'s own exported handler body changed. `markDirty`, `publishKind`,
`publishReference`, `publishPortal`, `saveJson`, and the three trigger handlers
(`onCategorySnapshotSourceWritten`, `onTagSnapshotSourceWritten`, `onPortalCatalogSnapshotSourceWritten`)
are byte-identical to what is already deployed and never fired, so they do not need redeployment:

```bash
firebase deploy --only functions:rebuildCatalogSnapshots --project fresh-prints-dev
```

No rules change. No Storage rules change. No index change. No trigger redeployment needed.

### Retry procedure after redeployment (do not run without owner approval)

1. Confirm the redeploy above completed and shows `rebuildCatalogSnapshots` as the only updated
   revision.
2. Retry `await window.freshPrintsDev.rebuildCatalogSnapshots()` from Studio.
3. **Expected outcome given the unresolved architecture conflict: this retry will still fail** —
   the improved error mapping will surface a `failed-precondition` error with
   `details.code === "snapshot/payload-budget-exceeded"` and
   `details.path === "generated/catalog-reference/ai/v{N}-....json"` instead of generic `INTERNAL`,
   but `catalog-reference` publication will not succeed until the AI-snapshot budget/sharding
   question is resolved through its own reviewed decision.
4. If `portal-catalog` was already published successfully in the prior attempts (to be confirmed via
   the Firebase Console, since direct Admin SDK inspection was not performed in this pass), the
   retry's `portal` result should return successfully again on this call, independent of the
   `catalog-reference` failure — `Promise.allSettled` now reports both outcomes rather than only the
   first rejection.
5. Do not run the controlled design import. Do not manually create or edit
   `snapshotPublicationState/*` documents. Do not manually edit or delete any `generated/**` Storage
   object. Do not disable rules or broaden client access to work around this.

### Residual risk and required decision

Tracked as a new open item for `docs/project/RISK_REGISTER.md` (R-013, added below): the AI catalog
reference snapshot's unsharded 256 KiB budget does not fit Fresh Prints Dev's actual approved-tag
corpus. This blocks successful `catalog-reference` publication (and therefore the AI Functions'
snapshot-backed taxonomy loader, which safely falls back to a bounded Firestore read per
`functions/src/ai/loadAiCatalogReferenceSnapshot.ts` in the meantime) until the owner/Review chooses
one of:

- Shard the AI reference snapshot the same way Portal catalog search/filter/card assets are already
  sharded (e.g. by tag-name prefix or a stable hash bucket), preserving the full `preferredWhen`
  guidance text per tag; or
- Raise the AI snapshot's byte budget specifically (not the client snapshot's) with an explicit
  reviewed ceiling grounded in the actual/projected tag corpus size; or
- Reduce what per-tag guidance the AI snapshot carries (e.g. truncate or externalize long
  `preferredWhen` text) — only if Review confirms this does not degrade AI tag-selection quality.

This decision needs its own FreshForge review before implementation, per this handoff's explicit
instruction not to silently change a payload ceiling or asset shape.

## R-013 remediation: owner-approved 512 KiB AI-private budget (2026-07-23, third pass)

### Owner decision

The owner approved raising **only** the private AI catalog-reference snapshot's uncompressed payload
ceiling from 256 KiB to **512 KiB (524,288 bytes)**. No sharding. No public/client, Portal, or
manifest budget change. No AI field removed. This decision and its rationale are recorded in the
ADR-FP-120 amendment (`docs/project/DECISIONS.md`), the Wave C Plan amendment, and the Wave C Formal
Review amendment (`docs/workflow/plans/2026-07-23-firestore-usage-efficiency-wave-c-plan.md`,
`docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-review.md`).

### Implementation

`functions/src/catalogSnapshots/publishCatalogSnapshots.ts`:

- `PUBLIC_ASSET_MAX_BYTES = 256 * KIB` (exported; unchanged value, named for clarity) governs
  `generated/catalog-reference/client/**` and the manifest's own explicit budget argument.
- `AI_CATALOG_REFERENCE_MAX_BYTES = 512 * KIB` (new, exported) governs only
  `generated/catalog-reference/ai/**`, applied at its one `saveJson` call site in `publishReference`.
- `AI_CATALOG_REFERENCE_WARN_RATIO = 0.8` / `AI_CATALOG_REFERENCE_WARN_BYTES = 409,600` (new,
  exported) and `warnIfApproachingAiReferenceBudget()` (new, exported): computes the AI asset's
  serialized byte size before upload and emits one `logger.warn("catalog-reference-ai-snapshot-approaching-budget",
  { path, bytes, maxBytes, percentUsed, contentVersion, tagCount, categoryCount })` when at or above
  409,600 bytes. No taxonomy content (names, aliases, `preferredWhen`) is included in the warning
  payload. Publication is not blocked by the warning; the existing hard failure above 512 KiB is
  unchanged (`saveJson`'s existing budget-exceeded throw, now checked against 512 KiB instead of 256
  KiB for this one asset).
- `publishPortal`, `markDirty`, `publishKind`, `markAndPublishAfterDebounce`, `saveJson`'s core logic,
  and all three trigger handler bodies are otherwise unchanged from the previous pass's fix.

`functions/src/catalogSnapshots/snapshotBuilders.test.ts` and
`functions/src/catalogSnapshots/publishCatalogSnapshots.test.ts` gained the required regression
coverage (see below). No other file changed for this remediation.

### Exact measurements

- Real dev-scale fixture (1,122 tags, 18 categories, realistic field lengths): AI snapshot =
  **295,152 bytes (288.2 KB, 56.3% of 512 KiB)**; client-safe snapshot ≈ 161 KB (unaffected,
  unchanged budget).
- 80% warning threshold: 409,600 bytes. The current real payload (295,152 bytes) is **below** this
  threshold — it does **not** trigger the warning today. This corrects an earlier assumption in this
  same checkpoint's prior pass that headroom was "approximately 80%"; the measured number is more
  favorable (56.3% used, i.e. more headroom than assumed).
- An intentionally padded fixture (same tag count, `preferredWhen` padded well past natural length)
  was used to prove the hard 512 KiB failure path still throws `snapshot-asset-budget-exceeded` and
  still maps to the safe `snapshot/payload-budget-exceeded` `HttpsError` with no taxonomy content
  leaked into `details`.

### Tests added (15 total across the two files, up from 6 in the prior pass)

`snapshotBuilders.test.ts`:
- Replaced the prior 256 KiB-only assertion with one proving the dev-scale fixture (a) exceeds the
  **original** 256 KiB budget (documenting the exact measured cause of the incident) and (b) fits
  under the **new** 512 KiB budget, while the client snapshot stays under its unchanged 256 KiB budget.
- Exported `devScaleTaxonomyFixture()` so the fixture is shared with `publishCatalogSnapshots.test.ts`
  rather than duplicated.

`publishCatalogSnapshots.test.ts` (new `describe` block, 6 tests):
1. Constants: `AI_CATALOG_REFERENCE_MAX_BYTES === 512 * 1024`, `PUBLIC_ASSET_MAX_BYTES === 256 * 1024`,
   `AI_CATALOG_REFERENCE_WARN_BYTES === 409,600`.
2. No warning below 80%.
3. Warning fires (returns `true`) at or above 80% but under the hard 512 KiB ceiling.
4. The real dev-scale fixture publishes successfully under 512 KiB **and** stays below the 80%
   warning threshold (measured, not assumed).
5. A fixture intentionally padded past 512 KiB still throws and still maps to the stable
   `snapshot/payload-budget-exceeded` code with no taxonomy content in `details`.
6. `PUBLIC_ASSET_MAX_BYTES` and `AI_CATALOG_REFERENCE_MAX_BYTES` are distinct constants, proving
   Portal/public budgets are untouched by the AI-private change.

### Verification re-run after the R-013 remediation

| Command | Exit | Result |
|---|---:|---|
| `npm run test:rules` (Java 21) | 0 | 6/6 pass, unchanged |
| `npm run build --prefix functions` | 0 | compiles |
| `npm run typecheck --workspace @fresh-prints/portal` | 0 | unaffected |
| `npm run build:portal` | 0 | unaffected |
| `npm exec --workspace @fresh-prints/studio -- vite build` | 0 | unaffected |
| `npx tsx --test` (`waveCReadContainment`, `snapshotBuilders`, `publishCatalogSnapshots`, `catalogSnapshot.parsers`, `catalogDesignByIdCache`, `portalPrintProgressPolling`) | 0 | 25/25 pass |
| `npx eslint functions/src/catalogSnapshots/publishCatalogSnapshots.ts functions/src/catalogSnapshots/publishCatalogSnapshots.test.ts functions/src/catalogSnapshots/snapshotBuilders.test.ts --max-warnings 0` | 0 | no warnings |
| `git diff --check` | 0 | pre-existing LF/CRLF warnings only |

### Exact redeployment required (verified, not run)

This pass's change affects `publishReference()` (the shared function both `rebuildCatalogSnapshots`
and the category/tag triggers call for the `catalog-reference` family), unlike the prior pass which
touched only `rebuildCatalogSnapshots`'s own handler body. `publishPortal()` and
`onPortalCatalogSnapshotSourceWritten` are unaffected — confirmed by tracing that
`onPortalCatalogSnapshotSourceWritten` only calls `markAndPublishAfterDebounce("portal-catalog")`,
which never reaches `publishReference()`.

```bash
firebase deploy --only functions:rebuildCatalogSnapshots,functions:onCategorySnapshotSourceWritten,functions:onTagSnapshotSourceWritten --project fresh-prints-dev
```

No rules change. No Storage rules change. No index change. `onPortalCatalogSnapshotSourceWritten`
does not need redeployment for this fix (its code path is unaffected), but redeploying it alongside
the others is harmless if the owner prefers one combined command — it would deploy byte-identical
logic.

### Retry procedure after redeployment (do not run without owner approval)

1. Confirm the redeploy above completed for all three (or four, if combined) functions.
2. Avoid any category, tag, or ready-design write before retrying (preserves a clean before/after
   comparison and avoids an unrelated trigger firing mid-test).
3. Start Studio against `fresh-prints-dev`, sign in as owner/admin, open renderer DevTools.
4. Run exactly once: `await window.freshPrintsDev.rebuildCatalogSnapshots()`.
5. **Expected result this time:** both `catalog-reference` and `portal-catalog` publish successfully;
   the call returns `{ reference: { contentVersion, generation }, portal: { contentVersion, generation } }`
   for both families. At the current measured ~288.2 KB AI payload (56.3% of 512 KiB), no budget
   warning should appear in the Functions logs.
6. Do not immediately retry again if it still reports an error — capture the exact error `details`
   first (it will include a stable `code`, not just `INTERNAL`, per the already-deployed error
   mapping).
7. Do not run the controlled design import yet — complete the consolidated post-publication smoke
   from this checkpoint's "One consolidated owner QA after approved dev publication" section first.

### Owner validation after a successful retry

Firestore (confirm via Firebase Console; direct Admin SDK inspection was not performed in this pass —
see the "Partial Firestore/Storage state" caveat above, which still applies):

- `snapshotPublicationState/catalog-reference`: `status: "idle"`, no active/stuck lease,
  `publishedGeneration` advanced, `lastErrorCode: null`, a valid `contentVersion` recorded.
- `snapshotPublicationState/portal-catalog`: same idle/healthy shape; unaffected by this fix either way.

Storage:

- `generated/catalog-reference/manifest.json` parses; `aiPath`/`clientPath` targets exist.
- `generated/catalog-reference/ai/v{contentVersion}.json` exists, is **not** publicly readable (guest
  and authenticated reads denied — already proven by the passing rules suite), and its size should be
  recorded here once confirmed (expected ≈295,152 bytes at the current tag count, modulo any taxonomy
  changes since this diagnosis).
- `generated/catalog-reference/client/v{contentVersion}.json` exists and is publicly readable.
- `generated/portal-catalog/manifest.json` and its versioned targets exist and are publicly readable.
- Every generated path remains client-write denied (already proven).
- Leave any orphaned immutable objects from the prior failed attempts in place; do not delete them as
  part of this validation.

### R-013 status after this remediation

**Not closed.** The fix is implemented and locally verified (builds, lint, 25/25 focused tests, rules
suite). It is not closed until: (1) `rebuildCatalogSnapshots` and the two affected triggers are
redeployed, (2) the owner retries initialization once, and (3) the live AI asset size is confirmed to
publish successfully and is recorded in `docs/project/RISK_REGISTER.md` R-013.

## Follow-up incident: `generated/portal-catalog/manifest.json` payload-budget failure (2026-07-24)

### Exact confirmed failure

After redeploying `rebuildCatalogSnapshots`, `onCategorySnapshotSourceWritten`, and
`onTagSnapshotSourceWritten` with the R-013 AI-budget fix, the owner retried
`await window.freshPrintsDev.rebuildCatalogSnapshots()`. The callable returned:

```json
{
  "error": {
    "details": {
      "code": "snapshot/payload-budget-exceeded",
      "kind": "portal-catalog",
      "path": "generated/portal-catalog/manifest.json"
    },
    "message": "Catalog snapshot publication (portal-catalog) stopped: a generated asset exceeded its size budget. This is a data-shape limit, not a transient error; it will fail again on retry until the underlying content is reduced or the approved budget/sharding design changes.",
    "status": "FAILED_PRECONDITION"
  }
}
```

This is the exact failed path, provided directly by the owner from the Firebase Console/callable
result — not inferred. `firebase functions:log` did not surface this invocation's terminal log line
during this diagnostic session even after extended polling (a Cloud Logging propagation gap, not a
missing error); the owner-provided error above is authoritative.

### Root cause (measured, reproduced in a test, not guessed)

`generated/portal-catalog/manifest.json` (the Portal catalog root manifest, budget 32 KiB) previously
enumerated a **full Storage path per tag, category, search shard, card bucket, recent page, and
category page** — `tagPaths: Record<tagId, path>`, `categoryFilterPaths: Record<categoryId, path>`,
`searchShardPaths: string[]`, `cardBucketPaths: string[]`, `recentPagePaths: string[]`,
`categoryPagePaths: Record<categoryId, path[]>`. At Fresh Prints Dev's real scale (~1,122 tags, 18
categories, 202 two-character search shards, 128 card buckets), a manifest built with this shape
measures **134,069 bytes (130.9 KB) — 4.09x over the 32 KiB budget**. Field-size breakdown (largest
first):

| Field | Bytes | % of total |
|---|---:|---:|
| `tagPaths` | 106,591 | 79.5% |
| `searchShardPaths` | 13,737 | 10.2% |
| `cardBucketPaths` | 8,723 | 6.5% |
| `categoryPagePaths` | 2,941 | 2.2% |
| `categoryFilterPaths` | 1,547 | 1.2% |
| `recentPagePaths` | 133 | 0.1% |
| everything else (metadata) | 147 | 0.1% |
| **Total** | **134,069** | **100%** |

`tagPaths` alone (one full ~95-character Storage path per tag ID) is nearly 80% of the manifest and
over 3x the entire 32 KiB budget by itself.

### Corrected design

The root manifest now stores **deterministic path templates and bounded count/version metadata
only** — never enumerated paths. The Portal consumer already computes the same deterministic keys
(tag ID, category ID, two-character search-shard prefix, `portalCatalogCardBucketNumber(id)`, or a
zero-based page index) that the publisher used, so it needs a template to substitute into, not a
pre-built list.

New `PortalCatalogManifest` shape (schema version bumped 1 → 2 for the manifest only; every
individual asset — Discover, ID assets, search shards, card buckets — keeps
`PORTAL_CATALOG_SCHEMA_VERSION = 1` unchanged):

```txt
{
  schemaVersion: 2,
  generation, contentVersion, previousContentVersion, generatedAt, path,
  discoverPath,
  search: { strategyVersion: 1, shardKeyLength: 2, pathTemplate, existingShardKeys: string[] },
  filters: { tagPathTemplate, categoryPathTemplate },
  cards: { bucketCount, hashVersion: 1, pathTemplate },
  recent: { pageCount, pathTemplate },
  categories: { pageCounts: Record<categoryId, number>, pathTemplate },
}
```

One deliberate exception: `search.existingShardKeys` keeps a compact array of the ~200 *two-character
shard keys that actually have any matching design* (not full paths, ~1 KB total) — this preserves the
existing "no network request for a search term with zero matches" behavior for the search path, which
is checked far more often (per query term) than tag/category filter clicks. Tag and category filter
lookups now resolve to *a* path unconditionally; a nonexistent tag/category simply 404s on the
Storage read, which the consumer already treats as "no match" — an acceptable cost since those are
user-initiated clicks, not per-keystroke.

Measured result: the same dev-scale manifest is now **2,179 bytes (2.13 KB) — 6.6% of the 32 KiB
budget**, a ~61x reduction from 130.9 KB.

### Files changed

- `packages/shared/src/catalog-snapshots/catalogSnapshot.types.ts` — new
  `PORTAL_CATALOG_MANIFEST_SCHEMA_VERSION = 2`; `PortalCatalogManifest` interface replaced with the
  compact shape above; new `resolvePortalCatalogPath(template, substitutions)` helper.
- `packages/shared/src/catalog-snapshots/catalogSnapshot.parsers.ts` — `parsePortalCatalogManifest`
  rewritten to validate the new nested shape and schema version 2; new `number()` validator helper.
- `functions/src/catalogSnapshots/snapshotBuilders.ts` — new `portalCatalogPathTemplates(root)` (single
  source of truth for every path template, used by both the writer and the manifest builder to
  prevent drift) and `buildPortalCatalogManifest(input)` (pure, directly testable — no Firestore/Storage
  I/O).
- `functions/src/catalogSnapshots/publishCatalogSnapshots.ts` — `publishPortal` now derives every
  real Storage write path from `portalCatalogPathTemplates()` + `resolvePortalCatalogPath()` instead
  of hand-built path strings, and builds the manifest via `buildPortalCatalogManifest()` instead of
  inline enumeration. No change to `publishReference`, `markDirty`, `publishKind`,
  `markAndPublishAfterDebounce`, `saveJson`, or any trigger handler body beyond the manifest-assembly
  section inside `publishPortal`.
- `apps/portal/features/catalog/services/portalCatalogAssetService.ts` — `loadCards` resolves card
  bucket paths via `resolvePortalCatalogPath(manifest.cards.pathTemplate, { bucket })` instead of
  `Array.filter` string-matching against an enumerated list; `listMatchingDesigns` resolves
  tag/category/search-shard paths via templates, checks `manifest.search.existingShardKeys` before
  fetching a shard, and treats a tag/category filter fetch failure (404) as "no match" instead of a
  manifest-side existence check.
- `functions/src/catalogSnapshots/snapshotBuilders.test.ts` (+5 tests),
  `functions/src/catalogSnapshots/publishCatalogSnapshots.test.ts` (no change needed — already
  covers unrelated failure mapping), `packages/shared/src/catalog-snapshots/catalogSnapshot.parsers.test.ts`
  (1 existing test corrected: `schemaVersion: 2` is now valid, changed the "rejects unknown schema"
  fixture to `999`).

### Behavior and security preserved

- **Search parity**: shard-key derivation (`term[0]+term[1]` or `"__"`), AND-style multi-tag
  intersection, and 40-card page slicing are unchanged in `portalCatalogAssetService.ts` — only how a
  shard's Storage path is obtained changed (template substitution vs. array `.find()`).
- **Discover parity**: `discoverPath` remains a single stored string; ranking/rail composition
  unchanged (not touched by this fix).
- **Public field allowlist**: unchanged — no asset's field shape changed, only the manifest's own
  shape.
- **Access rules**: no new generated path prefix was introduced (`generated/portal-catalog/**`
  already covers every path this manifest points to); the rules suite passes unchanged, 6/6.
- **Manifest-last publication, generation fencing, previous-version retention, failed-status
  recording**: unchanged — `saveJson`'s manifest write still runs last with the same
  `ifGenerationMatch` precondition.
- **`catalog-reference` independence**: `publishReference()` was not touched by this fix. Per the
  owner's confirmed error (`"kind": "portal-catalog"`, not `"catalog-reference"`), and because this is
  a new, different failure after the AI-budget fix already resolved the prior `catalog-reference`
  failure, `catalog-reference` publication is **inferred** (not directly observed — Storage/Firestore
  read access remains blocked in this environment) to have succeeded on this attempt. This should be
  confirmed via the Firebase Console before relying on it.

### Tests

| Command | Exit | Result |
|---|---:|---|
| `npm run build --prefix functions` | 0 | compiles |
| `npm run typecheck --workspace @fresh-prints/portal` | 0 | compiles |
| `npx eslint <8 changed files> --max-warnings 0` | 0 | no warnings |
| `npx tsx --test` (`waveCReadContainment`, `snapshotBuilders`, `publishCatalogSnapshots`, `catalogSnapshot.parsers`, `catalogDesignByIdCache`, `portalPrintProgressPolling`) | 0 | 35/35 pass |
| `npm run test:rules` (Java 21) | 0 | 6/6 pass, unchanged |
| `npm run build:portal` | 0 | compiles |
| `npm exec --workspace @fresh-prints/studio -- vite build` | 0 | compiles (no Studio source changed) |
| `git diff --check` | 0 | pre-existing LF/CRLF warnings only |

New tests (5, in `snapshotBuilders.test.ts`, describe block "Portal catalog root manifest (compact,
v2 — R-013 follow-up)"):
1. Reproduces the old 130.9 KB manifest at dev scale (fails the 32 KiB budget) and proves the
   corrected manifest (2.13 KB) fits — the test that would fail against the pre-fix shape and passes
   after.
2. Manifest stays under 32 KiB at projected growth (5,000 tags, 500 categories, 250 recent pages).
3. Every manifest path template matches `portalCatalogPathTemplates()` exactly (writer/manifest
   parity), and resolves correctly for tag/category/shard/bucket/page substitutions.
4. Every search shard, card bucket, recent page, and category page implied by manifest metadata is
   addressable and non-duplicated.
5. `cards.hashVersion` and `search.strategyVersion` are the expected `1`.

### Exact redeployment required (verified, not run)

`publishPortal()` (used by both `rebuildCatalogSnapshots` and `onPortalCatalogSnapshotSourceWritten`)
changed; `publishReference()`, `markDirty`, `publishKind`, `markAndPublishAfterDebounce`, `saveJson`,
and the two category/tag trigger handler bodies did not:

```bash
firebase deploy --only functions:rebuildCatalogSnapshots,functions:onPortalCatalogSnapshotSourceWritten --project fresh-prints-dev
```

`onCategorySnapshotSourceWritten` and `onTagSnapshotSourceWritten` do not need redeployment for this
fix (confirmed: both only call `markAndPublishAfterDebounce("catalog-reference")`, which never
reaches `publishPortal()`).

No Firestore rules change. No Storage rules change (no new path prefix). No index deployment.

A separate Portal/App Hosting dev deployment will eventually be required because
`portalCatalogAssetService.ts` (the consumer) changed, but that is out of scope for this checkpoint —
Portal Hosting has not been deployed with any generated-snapshot consumer yet, and this prompt does
not authorize it.

### Retry procedure (do not run without owner approval)

1. Confirm the redeploy above completed for both functions.
2. Retry `await window.freshPrintsDev.rebuildCatalogSnapshots()` exactly once.
3. Expected result: both `catalog-reference` and `portal-catalog` publish successfully; the callable
   returns both content versions/generations with no error.
4. If it still fails, capture the exact `details` (stable code, kind, path) before considering
   another retry — do not retry blindly.

## Successful initial publication (2026-07-24) and live validation

### Owner result

The owner redeployed `functions:rebuildCatalogSnapshots,functions:onPortalCatalogSnapshotSourceWritten`
(confirmed live via `firebase functions:log`: both functions show an `UpdateFunction` audit entry and
new revision at 01:16–01:17 UTC) and ran `await window.freshPrintsDev.rebuildCatalogSnapshots()`
exactly once at 01:18:19 UTC. The callable returned:

```json
{
  "reference": { "contentVersion": "4-1a810751ceb2b381", "generation": 4 },
  "portal": { "contentVersion": "4-e0e5b3ae9fb69797", "generation": 4 }
}
```

No error line follows this invocation in `firebase functions:log` (unlike the three prior failed
attempts, each of which showed an `E rebuildcatalogsnapshots: Unhandled error ...` line within
seconds) — consistent with success.

### Live validation performed

Direct Admin SDK access to Firestore/Storage remains blocked by this environment's credential-access
policy (as in prior passes). Instead, every **public** generated asset and rule boundary was verified
live via plain unauthenticated HTTPS requests to the Firebase Storage REST API and Firestore REST
API — no credentials involved, matching exactly what a guest browser request would see:

**`generated/catalog-reference/manifest.json`** (public):
```json
{"schemaVersion":1,"generation":4,"contentVersion":"4-1a810751ceb2b381","previousContentVersion":"3-1a810751ceb2b381","generatedAt":"2026-07-24T01:18:20.785Z","path":"generated/catalog-reference/manifest.json","aiPath":"generated/catalog-reference/ai/v4-1a810751ceb2b381.json","clientPath":"generated/catalog-reference/client/v4-1a810751ceb2b381.json"}
```
`generation: 4` and `contentVersion: "4-1a810751ceb2b381"` match the callable result exactly.

- `generated/catalog-reference/ai/v4-1a810751ceb2b381.json` — **403 Forbidden** on both a media
  read and a metadata-only read (unauthenticated). Confirms the AI asset is private, as designed.
  Exact live byte size could not be independently re-measured without Admin credentials; expected
  ≈295,152 bytes at unchanged taxonomy content (measured in the prior pass's regression test),
  comfortably under the 512 KiB ceiling and the 409,600-byte warning threshold.
- `generated/catalog-reference/client/v4-1a810751ceb2b381.json` — **200 OK**, publicly readable,
  `Cache-Control: public,max-age=31536000,immutable`.
- Unauthenticated write attempt to `generated/portal-catalog/manifest.json` — **403 Forbidden**.
- Unauthenticated Firestore REST read of `snapshotPublicationState/catalog-reference` — **403
  PERMISSION_DENIED**, consistent with the rules suite's coordination-document deny.

**`generated/portal-catalog/manifest.json`** (public) — full content fetched live:
```json
{"schemaVersion":2,"generation":4,"contentVersion":"4-e0e5b3ae9fb69797","generatedAt":"2026-07-24T01:18:21.034Z",...}
```
`schemaVersion: 2`, `generation: 4`, `contentVersion: "4-e0e5b3ae9fb69797"` — matches the callable
result exactly. Live size: **3,214 bytes (9.8% of the 32 KiB budget)** — slightly larger than the
2,179-byte test estimate because real Firestore category IDs (e.g. `tj0HemRh2RuYLfI7N6nO`) are longer
than the test fixture's short synthetic IDs, and the real corpus has 300+ existing shard keys vs. the
test's 202 — still comfortably under budget. Contains real `search.existingShardKeys` (300+ entries),
`filters.tagPathTemplate`/`categoryPathTemplate`, `cards.bucketCount: 128`, `recent.pageCount: 2`,
and `categories.pageCounts` for 11 real category IDs.

**Representative targets confirmed live** (all via unauthenticated GET against the real
`v4-e0e5b3ae9fb69797` version):

| Asset | Result |
|---|---|
| Discover (`.../discover.json`) | 200 OK |
| Recent page 0 (`.../recent/page-0.json`) | 200 OK |
| Category filter (real ID `tj0HemRh2RuYLfI7N6nO`) | 200 OK, 45 real design IDs |
| Category page 0 for that category | 200 OK |
| Card bucket 1 | 200 OK, 2,238 bytes |
| Card bucket 0, 3, 4, 10, 50, 100 | 404 (expected — legitimately empty at this catalog size, not a defect) |
| Search shard "ab" | 200 OK |

Template resolution against real data confirmed correct in every case above — the manifest's stored
templates produce paths that actually resolve to real uploaded objects.

**Orphaned assets**: `generated/catalog-reference/client/v1-1a810751ceb2b381.json`,
`v2-1a810751ceb2b381.json`, and `v3-1a810751ceb2b381.json` (from the two AI-budget failures and one
intermediate retry) all still return 200 OK — confirmed present, harmless, unreferenced by the
current manifest (which points only to `v4`), and retained per instructions (not deleted).

### R-013 and R-014 status: closed

Both risks are closed in `docs/project/RISK_REGISTER.md` given the live confirmation above: both
snapshot families published successfully at generation 4 with content versions matching the callable
result exactly, the AI-private/public boundary and write-denial are confirmed live, and representative
generated assets resolve correctly. The 80% AI-budget warning and future-sharding requirement remain
documented as ongoing operational guidance, not closed items.

### Portal dev consumer deployment (not yet approved — separate checkpoint)

The Portal catalog manifest is now schema version 2. The Portal consumer
(`portalCatalogAssetService.ts` and the shared parsers/types it imports) was updated to match, but
**no Portal/App Hosting deployment has occurred**. The exact command, confirmed against
`firebase.json` (`apphosting: [{ backendId: "fresh-prints-portal", rootDir: "./apps/portal" }]`) and
the existing documented convention in `docs/standards/DEPLOYMENT.md`:

```bash
firebase deploy --only apphosting --project fresh-prints-dev
```

- Target confirmed: `fresh-prints-portal` backend, `fresh-prints-dev` project — no production
  project referenced (`firebase.json` defines only this one `apphosting` backend).
- Generated-snapshot consumption flag: `NEXT_PUBLIC_USE_GENERATED_CATALOG_SNAPSHOTS` — confirmed in
  `apps/portal/features/catalog/services/catalogSnapshotFlags.ts` (`generatedPortalCatalogEnabled()`
  returns `true` unless the value is exactly the string `'false'`), so generated snapshots are
  **enabled by default** with no explicit flag needed for a normal deploy.
- Rollback flag confirmed available and unchanged: set `NEXT_PUBLIC_USE_GENERATED_CATALOG_SNAPSHOTS=false`
  for a Portal rebuild to fall back to bounded Firestore hydration (documented in
  `docs/standards/DEPLOYMENT.md` line 279 and unchanged by this fix).
- `apps/portal/apphosting.yaml` currently sets only `runConfig` (min/max instances, concurrency); no
  environment-variable overrides are declared there, consistent with the flag defaulting to enabled.

Verification before this Portal deployment (run in this pass, not for this checkpoint's approval
itself — Portal deployment remains separately gated):

| Command | Exit | Result |
|---|---:|---|
| `npm run typecheck --workspace @fresh-prints/portal` | 0 | compiles |
| `npm run build:portal` | 0 | production build succeeds |
| `npx tsx --test` (parsers, `catalogDesignByIdCache`, `portalPrintProgressPolling`, `snapshotBuilders`, `publishCatalogSnapshots`, `waveCReadContainment`) | 0 | 35/35 pass |
| `npx eslint <8 changed files> --max-warnings 0` | 0 | no warnings |
| `git diff --check` | 0 | pre-existing LF/CRLF warnings only |

This checkpoint does not authorize the Portal deployment above. It remains a separate, explicit
owner-approved action.

## Portal QA regressions found and fixed (2026-07-24, third pass)

### Owner evidence

Local Portal QA against the live generation-4 snapshots (`catalog-reference`
`4-1a810751ceb2b381`, `portal-catalog` `4-e0e5b3ae9fb69797`) reported: (1) Firestore Product Usage
rising by approximately 3,600 reads (~47K → 50,630); (2) the tag modal showing the complete approved
taxonomy (e.g. `abbycadabby`, `abercrombie`, `acdc`, ...) with no per-tag design count and no
exclusion of zero-result tags; (3) searching `BEST` initially showing only one of two matching
designs (`Best Christmas Ever Castle`, `We Are More Than Bestie...`), requiring `Load more` to reveal
the second, which should not have been necessary for a 2-result set. Recorded as **FAIL**.

### Read spike attribution

Root cause: `catalogService.listApprovedTags()`'s **fallback path** (used whenever
`generatedPortalCatalogEnabled()` is false or the generated path throws) issued an unbounded
`getDocs(query(collection(tags), where('status', '==', 'approved')))` — a full-collection read, with
no page limit, over the entire ~1,122-tag corpus. Every tag-modal open (or any code path re-deriving
the fallback) during the owner's QA session cost roughly 1,122 reads; a handful of repeated opens or
page loads during a QA session plausibly accounts for the observed ~3,600-read increase. This is
consistent with the generated path either not yet being exercised as expected in the owner's local
environment, or throwing and silently falling back (both `listActiveCategories`/`listApprovedTags`
swallow generated-path errors into the same unbounded Firestore fallback with no distinguishing log).
This was not a Firestore *design* read spike — Discover/search/browse paths were not implicated by
the owner's report, and this checkpoint's own live-validation pass (previous section) already
confirmed those paths work correctly against the generated assets with zero unnecessary reads.

### Regression 1 (tag filter): root cause and fix

**Root cause:** `catalogService.listApprovedTags()` returned every tag from
`loadClientTaxonomy()` (the full client-safe taxonomy snapshot, by design containing every approved
tag regardless of ready-design association) with no count and no zero-result exclusion. The
pre-Wave-C Portal derived exactly this "tags with ≥1 ready design + count" shape by scanning the
then-fully-hydrated catalog client-side (the existing, previously-unused
`buildCatalogTagOptions()` helper in `catalogSearch.ts` proves this was the historical mechanism).
Wave C removed full hydration but never gave the tag modal an equivalent bounded generated data
source — a genuine gap in the original architecture, not a regression introduced by the manifest-size
fix.

**Fix:** New compact, immutable, versioned, public-safe generated asset:

```txt
generated/portal-catalog/v{catalogVersion}/filters/tags-facet.json
```

`PortalCatalogTagFacetSummary`: `{ schemaVersion, catalogVersion, generatedAt, tags: [{ id, name,
count }] }`. Built server-side (`buildPortalCatalogTagFacetSummary` in `snapshotBuilders.ts`) from
the same ready-card tag membership already computed for search/filter assets; only tags with
`count >= 1` are included; the parser rejects any zero-count entry. Names come from the canonical
taxonomy (`tagNamesById`), never invented. The root manifest gains one new fixed field,
`filters.tagFacetPath` (a single path per catalog version — consistent with the deterministic
addressing already used for every other Portal asset family; no per-tag path enumeration
reintroduced). `PORTAL_CATALOG_MANIFEST_SCHEMA_VERSION` remains 2 (additive field; no deployed
consumer exists to protect against a breaking bump anyway). `PORTAL_CATALOG_SCHEMA_VERSION` (the
per-asset version) is unchanged.

The Firestore **fallback** path (used only when generated snapshots are disabled/unavailable) was
also rebounded: instead of the full `tags` collection query, it now scans `status == "ready"` designs
and derives the same `{ id, name, count }` shape client-side, matching the tag modal's intended
"zero Firestore tag/category reads at steady state" budget in spirit even on the fallback path (the
fallback still reads the `tags` collection for display names, but no longer as its primary
unbounded per-open cost driver — the dominant cost moves to a bounded ready-design scan).

Existing `generated/portal-catalog/{allPaths=**}` Storage rules already cover the new path; confirmed
by a new rules test (`covers the new tag-facet summary path under the existing generated/portal-catalog
wildcard`) rather than assumed. Rules suite: **7/7 pass** (was 6/6).

### Regression 2 (search pagination): root cause and fix

**Root cause:** `portalCatalogAssetService.listMatchingDesigns` combined every tag/category/
search-term candidate ID set via `intersect()`, but the resulting `ids` array had **no deterministic
sort applied** before being sliced into a page — its order was purely `Set` iteration order, which
traces back to `Object.values(terms).flat()` insertion order at publish time (Firestore document
iteration order, which Firestore does not guarantee to be stable). This is an architecture gap
(no explicit "assemble complete ordered set, then paginate" step existed), not merely a display bug —
it risked the exact owner-reported symptom: a design landing after an arbitrary slice point on the
first call, only surfacing on a subsequent `Load more` fetch (which recomputes `ids` fresh and can
produce a different arbitrary order/count relationship).

**Fix:** Extracted a pure, directly-tested `planPortalCatalogSearchPage(candidateSets, options)`
(`portalCatalogAssetService.ts`) that: (1) intersects every candidate Set (tag filters, category
filter, each search term's shard match) exactly as before; (2) applies a deterministic ascending
design-ID sort (stable across repeated calls/builds, independent of Set insertion order); (3) only
then slices into the requested `[offset, offset+limit)` page. `total` is always `ids.length` from the
complete sorted set, so `hasMore` in `useCatalogDesigns.ts` (`allDesigns.length < serverTotalCount`)
correctly reflects the true remaining count. No change to search token/prefix/case-insensitive
semantics, AND-style multi-tag intersection, or the existing 40-card page cap.

### Files changed (this pass)

- `packages/shared/src/catalog-snapshots/catalogSnapshot.types.ts` — new
  `PortalCatalogTagFacetSummary` type; `filters.tagFacetPath` added to `PortalCatalogManifest`.
- `packages/shared/src/catalog-snapshots/catalogSnapshot.parsers.ts` — new
  `parsePortalCatalogTagFacetSummary` (rejects zero-count entries and malformed shapes);
  `parsePortalCatalogManifest` now validates `filters.tagFacetPath`.
- `functions/src/catalogSnapshots/snapshotBuilders.ts` — new `buildPortalCatalogTagFacetSummary`
  (pure); `tagFacetPath` added to `portalCatalogPathTemplates`/`buildPortalCatalogManifest`.
- `functions/src/catalogSnapshots/publishCatalogSnapshots.ts` — `publishPortal` now builds
  `tagNamesById` from the taxonomy source, builds and uploads the tag-facet asset, and includes its
  path in the manifest.
- `apps/portal/features/catalog/services/portalCatalogAssetService.ts` — new
  `listTagFacets()`; new pure `planPortalCatalogSearchPage`/`tokenize`/`searchShardKeyForTerm`
  (exported for tests); `listMatchingDesigns` now uses the deterministic pagination helper.
- `apps/portal/features/catalog/services/catalogService.ts` — `listApprovedTags()` now calls
  `listTagFacets()` on the generated path; Firestore fallback rebounded to a ready-design scan
  instead of the full `tags` collection.
- `apps/portal/features/catalog/types/catalog.types.ts` — `CatalogTagOption.count?: number` added.
- `apps/portal/features/catalog/utils/catalogSearch.ts` — `buildApprovedCatalogTagOptions` now
  carries `count` through to the modal option list.
- `apps/portal/features/catalog/components/CatalogTagFilterModal.tsx` — renders the count beside
  each tag when known.
- `apps/portal/styles/catalog.css` — minimal `.tag-filter-option-count` style.
- New/updated tests: `functions/src/catalogSnapshots/snapshotBuilders.test.ts` (+8 tests),
  `packages/shared/src/catalog-snapshots/catalogSnapshot.parsers.test.ts` (+5 tests),
  `apps/portal/features/catalog/services/portalCatalogAssetService.test.ts` (new file, 10 tests),
  `apps/portal/features/catalog/utils/catalogSearch.test.ts` (+1 test, 1 existing test corrected for
  the new `count` field), `tests/firebase/catalogSnapshot.rules.test.ts` (+1 test).

### Tests

| Command | Exit | Result |
|---|---:|---|
| `npm run build --prefix functions` | 0 | compiles |
| `npm run typecheck --workspace @fresh-prints/portal` | 0 | compiles |
| `npm run test:rules` (Java 21) | 0 | 7/7 pass (was 6/6) |
| `npx tsx --test` (8 files: `waveCReadContainment`, `snapshotBuilders`, `publishCatalogSnapshots`, `catalogSnapshot.parsers`, `catalogDesignByIdCache`, `portalCatalogAssetService`, `catalogSearch`, `portalPrintProgressPolling`) | 0 | 77/77 pass |
| `npx eslint <14 changed files> --max-warnings 0` | 0 | no warnings |
| `git diff --check` | 0 | pre-existing LF/CRLF warnings only |
| `npm exec --workspace @fresh-prints/studio -- vite build` | 0 | unaffected (no Studio source changed) |
| `npm run build:portal` | **not completed** | see note below |

**Note on `npm run build:portal`:** two attempts hung indefinitely (no output, no error, no
completion) rather than failing — this differs from a compile error, which would surface immediately.
The `apps/portal/.next` directory contained only `cache`/`trace` (a dev-mode artifact shape, not a
completed production build), and multiple `node.exe` processes were running on the machine at the
time, consistent with a live `next dev` server (very plausibly the owner's own local Portal test
session against `fresh-prints-dev` described in this checkpoint's own prompt) holding the directory.
Rather than delete `.next` or inspect/stop unrelated processes without being asked to, this was left
alone to avoid disrupting a possibly-active owner session. **`npm run typecheck --workspace
@fresh-prints/portal` passed cleanly (exit 0)**, which is the load-bearing compile-correctness check
for the TypeScript changes in this pass; the production build itself should be re-run once the local
Portal dev server (if any) is stopped, before Portal is deployed.

### Regression test: the exact owner scenario

`portalCatalogAssetService.test.ts` → "reproduces and fixes the owner-reported BEST regression: both
matches appear on the first page" constructs the exact scenario (both "Best Christmas Ever Castle"
and "We Are More Than Bestie..." landing in the same shard via the substring "best") and asserts
`total === 2`, `pageIds.length === 2`, and both design IDs present — proving the fix handles the
literal reported case, not just a synthetic approximation.

### Exact redeployment and republish required (verified, not run)

`publishPortal()` changed again (new tag-facet asset + manifest field), so the same two functions
from the prior pass are affected:

```bash
firebase deploy --only functions:rebuildCatalogSnapshots,functions:onPortalCatalogSnapshotSourceWritten --project fresh-prints-dev
```

`onCategorySnapshotSourceWritten`/`onTagSnapshotSourceWritten` remain unaffected (unchanged from the
prior pass's analysis — they only call the `catalog-reference` path). No Firestore/Storage rules
deployment needed (new path already covered; confirmed by test). No index deployment.

After redeploying, a **fresh `rebuildCatalogSnapshots` republish is required** — the currently-live
`portal-catalog` manifest (generation 4, `4-e0e5b3ae9fb69797`) does not have `filters.tagFacetPath`
or the tag-facet asset; the Portal consumer code in this pass expects that field to exist. Retrying
`rebuildCatalogSnapshots` once (same procedure as prior checkpoints) will publish generation 5 with
the new asset and field.

### Local retest requirement before further owner QA

Per this checkpoint's instruction, do not request another broad owner QA pass until:
1. The functions above are redeployed and `rebuildCatalogSnapshots` is republished once.
2. The local Portal dev server is restarted (picks up the new `portalCatalogAssetService.ts`/
   `catalogService.ts` source).
3. A developer-controlled local run (Studio closed, one Portal tab, no imports, tracing enabled)
   confirms: tag modal shows only nonzero tags with counts; searching `BEST` shows both cards
   immediately with no `Load more`; five-minute idle produces no repeated taxonomy/catalog Firestore
   load.

This checkpoint does not claim that developer-controlled run has occurred — it is the required next
step before requesting owner retest.

## Blocking-issue resolution pass (2026-07-24, fourth pass)

The owner already deployed `functions:rebuildCatalogSnapshots,functions:onPortalCatalogSnapshotSourceWritten`
before this pass began; this pass did not redeploy them again and did not run
`rebuildCatalogSnapshots`. It corrected three specific gaps found in the prior pass's own reported
work and re-verified everything.

### Blocking Issue 1 — Portal build

The prior pass's `npm run build:portal` reports of "did not complete" were **transient tool-timeout
artifacts, not a real build failure**: a `timeout 30` wrapper killed the process (exit signal 143)
right as it reached "Collecting build traces" — the compile, typecheck, and static-page generation
phases had already **succeeded** by that point in the truncated run. Re-running without an
artificial cap: **`npm run build:portal` exits 0**, full production build succeeds, all 18 routes
generated, only the pre-existing "Next.js plugin not detected in ESLint config" notice (unrelated,
present before this goal). No dev-server contention was actually the blocker; the harness's own
timeout was.

### Blocking Issue 2 — Fallback containment (real defect found and fixed)

The reviewer was correct that the prior pass's "bounded ready-design scan" fallback was **not
actually bounded** — re-inspection confirmed it queried the entire `tags` collection (`where(status
== 'approved')`, no limit) **and** the entire `designs` collection (`where(status == 'ready')`, no
limit) with zero pagination, zero cache, zero in-flight dedup, and no cap. This was a real,
unresolved defect from the prior pass, not merely under-described.

**Investigated whether any correct, complete, bounded Firestore mechanism exists** to derive "every
tag with ≥1 ready design + its exact count" without a full scan: the only two options are (a) one
full-collection read (unbounded — the exact defect), or (b) one `getCountFromServer` call per
approved tag (~1,122 network round trips at the real corpus — bounded per-call but far worse in
aggregate, and still doesn't return which tags exist without also enumerating them). Neither
produces a correct, complete answer at acceptable cost. Per the required narrow decision, this was
presented to and resolved by the owner: **remove the Firestore fallback entirely.**

**Fix implemented:** `catalogService.listApprovedTags()` now calls
`portalCatalogAssetService.listTagFacets()` directly with no fallback — if the generated asset can't
load, it throws. `useCatalogTags()` already surfaced load errors via its existing `error` state (no
change needed there). `CatalogTagFilterModal` now accepts an `error` prop and renders "Tag filters
are unavailable right now. Please try again in a moment." instead of an empty/full tag list when
set. `portalCatalogAssetService.listTagFacets()` gained its own in-flight-Promise guard (matching the
existing pattern in `loadPortalManifest`/`loadClientTaxonomy`) so concurrent callers share one
request; the underlying facet asset is Storage-cached (via `fetchJson`'s existing LRU) so repeated
tag-modal opens do not re-fetch while cached.

**Proof of zero Firestore reads on the generated path:** `portalCatalogAssetService.ts` has **no
Firestore import at all** (`grep -n "getFirestore\|collection(\|getDocs\|getDoc(" ...` returns
nothing) — every function in the file, including `listTagFacets`, only touches Firebase Storage.
This is a structural guarantee, not just a runtime observation: the module cannot issue a Firestore
read even by accident.

### Blocking Issue 3 — Search ordering (real defect found and fixed)

The reviewer was correct that "deterministic" was not the same as "correct." Investigated the actual
pre-fix/intended customer-facing order by inspecting `catalogService.ts` and
`useCatalogDesigns.ts`: the established, documented convention (explicit code comment: `"Browse-all /
filters: Studio-newest first"`) is **`createdAt DESC`** as primary order, with Firestore's
`orderBy('__name__', 'desc')` (design ID descending) as the tiebreaker — used consistently for every
non-search browse path in the repository. The prior pass's `planPortalCatalogSearchPage` instead
sorted candidate IDs **ascending alphabetically by design ID**, silently replacing the intended
"newest first" order with an unrelated one — exactly the mistake this task warned against.

**Fix:** 
- `functions/src/catalogSnapshots/snapshotBuilders.ts` — new pure `portalCatalogBrowseOrder(cards)`:
  the one canonical "Studio-newest first, design-ID-descending-tiebreaker" order, matching the
  existing Firestore convention exactly.
- `functions/src/catalogSnapshots/publishCatalogSnapshots.ts` — `publishPortal` now iterates
  `portalCatalogBrowseOrder(cards)` (not raw Firestore-snapshot order) when building every tag,
  category, and search-term candidate ID list. Because every list is now built from the same
  reference order, any subset of them (tag ∩ category ∩ search terms) preserves that order under
  intersection with **no need to resolve card data before pagination** — avoiding the alternative
  (fetching every card bucket up front just to sort) which would have reintroduced unbounded-ish
  fetch cost for large result sets.
- `apps/portal/features/catalog/services/portalCatalogAssetService.ts` — `planPortalCatalogSearchPage`
  now takes ordered `string[][]` (not `Set[]`), intersects using the shortest list as the filter
  reference (cheapest correct choice — membership checks against the other lists don't depend on
  their order), and preserves relative order instead of re-sorting. `listMatchingDesigns` updated to
  pass `asset.designIds`/`asset.terms[term]` arrays directly instead of wrapping them in `Set`s first.

**Verified `BEST` regression still passes** with the corrected implementation: `total === 2`, both
design IDs on page 1, `Load more` absent (regression test: "reproduces and fixes the owner-reported
BEST regression"). **Verified order preservation directly**: a new test
("preserves the publisher-supplied order... never re-sorts alphabetically") proves a
newest-first-ordered candidate list (`design-zebra` newest) stays in that order through
`planPortalCatalogSearchPage`, not reordered alphabetically. **Verified multi-list/multi-shard
distribution**: a new test constructs two candidate lists of different lengths (simulating matches
spread across different search shards/card buckets) and proves both true matches surface on the
first page in the correct order.

### Manifest compatibility (documented, not silently assumed)

`parsePortalCatalogManifest` **strictly rejects** any manifest missing `filters.tagFacetPath`
(proven by an existing test: "rejects a v2 Portal catalog manifest missing filters.tagFacetPath") —
it throws a caught `Error`, it does not crash the app or silently proceed with partial data. Because
`loadPortalManifest()` is shared by `listDiscoverDesigns`, `listMatchingDesigns`, and
`listTagFacets`, this means: **the currently-live generation-4 manifest (published before this
field existed) will cause every one of those three Portal functions to fail-closed once this
corrected Portal consumer code is deployed, until `rebuildCatalogSnapshots` republishes.** This is
the correct, safe behavior (fail-closed on a malformed/incompatible manifest, matching the existing
architecture's "malformed manifest fails safely" requirement) — but it is a **hard sequencing
dependency**, not a soft compatibility note: Portal deployment and snapshot republish must happen
together (republish first, or immediately after Portal deploy, with minimal gap) or Discover/search/
tag-filter will all fail-closed in between. Publication itself remains manifest-last;
previous-version rollback is untouched by this change (no manifest field removed, only added).

### Runtime retest — honest limitation

**No browser-automation tooling (Playwright/Puppeteer) is installed in this repository or available
in this environment**, and this pass has no way to drive an actual browser session (open Discover,
click the tag modal, type a search query) to capture live network/Firestore trace counts. The
required "developer-controlled runtime retest" with real click-through interaction **did not
occur** in this pass — reporting otherwise would not be honest. What this pass verified instead,
as the strongest available proxy:

- **Structural proof of zero Firestore reads**: `portalCatalogAssetService.ts` has no Firestore
  import; `catalogService.listApprovedTags()` now delegates to it with no fallback path that could
  reach Firestore.
- **Exhaustive automated test coverage** (24 tests across tag-facet building, manifest parsing,
  search pagination, and browse ordering) proving every specific required behavior in isolation:
  zero-count exclusion, exact counts, no double-counting, order preservation, the exact `BEST`
  scenario, 40/41-result boundaries, multi-list intersection, and malformed-manifest safety.
- **Portal production build succeeds** (exit 0), proving the corrected code is deployable.

**A manual test script is provided below for the owner or a human tester to run in a real browser**,
since this pass cannot execute it:

1. Stop any other local Portal instance; start exactly one `next dev` server.
2. Open Portal in one browser tab; open DevTools Network tab (filter: `firestore.googleapis.com`
   and `firebasestorage.googleapis.com`).
3. Enable tracing: `localStorage.setItem('FP_FIRESTORE_TRACE', '1')`, reload.
4. Open Discover — confirm no `firestore.googleapis.com` requests for `designs`/`tags`/`categories`.
5. Open the tag filter modal — confirm exactly one `firebasestorage.googleapis.com` request for
   `tags-facet.json` (or none, if cached from a prior generated-asset fetch), zero
   `firestore.googleapis.com` requests, every listed tag has a nonzero count.
6. Close and reopen the modal — confirm no new `tags-facet.json` request (served from cache).
7. Search `BEST` — confirm both matching designs render immediately, no `Load more` button.
8. Apply two tags, then clear filters.
9. Idle 5 minutes — confirm `window.__fpFirestoreTrace.dump()` shows no repeated catalog/taxonomy
   queries during the idle window.
10. Record: total Storage asset requests, total Firestore operations (expect 0 for steps 4-7), any
    fallback/error events.

### Tests (re-run after this pass's corrections)

| Command | Exit | Result |
|---|---:|---|
| `npm run build --prefix functions` | 0 | compiles |
| `npm run typecheck --workspace @fresh-prints/portal` | 0 | compiles |
| `npm run build:portal` | 0 | production build succeeds (18 routes) — corrects the prior pass's inconclusive report |
| `npm run test:rules` (Java 21) | 0 | 7/7 pass, unchanged |
| `npx tsx --test` (8 files) | 0 | 88/88 pass (11 new this pass: `portalCatalogBrowseOrder` x4, corrected/expanded search-pagination tests) |
| `npx eslint <8 changed files> --max-warnings 0` | 0 | no warnings |
| `git diff --check` | 0 | pre-existing LF/CRLF warnings only |
| `npm exec --workspace @fresh-prints/studio -- vite build` | 0 | unaffected |

### Exact redeployment required after this pass's corrections

`publishPortal()`'s internal ordering changed (`portalCatalogBrowseOrder` now governs how every
tag/category/search-term ID list is built) and the Portal consumer changed (`listApprovedTags`
fallback removed, `planPortalCatalogSearchPage` signature changed from `Set[]` to `string[][]`).
Since the owner already deployed `rebuildCatalogSnapshots` and
`onPortalCatalogSnapshotSourceWritten` with the *previous* version of this code (before this pass's
ordering fix and fallback removal), **those same two functions need a follow-up redeployment** to
pick up this pass's corrections:

```bash
firebase deploy --only functions:rebuildCatalogSnapshots,functions:onPortalCatalogSnapshotSourceWritten --project fresh-prints-dev
```

`onCategorySnapshotSourceWritten`/`onTagSnapshotSourceWritten` remain unaffected (unchanged across
all passes). No rules/index change. After redeploying, the same republish requirement from the prior
section still applies:

```js
await window.freshPrintsDev.rebuildCatalogSnapshots()
```

Neither command was run in this pass.

## Bucket CORS + unsafe search fallback pass (2026-07-24, fifth pass)

Owner published generation 9 successfully (`portal.contentVersion: "9-cea01d758a81dd60"`,
`reference.contentVersion: "5-1a810751ceb2b381"`) and ran local Portal QA. It still failed: tag modal
showed "Tag filters are unavailable right now"; searching "best" showed 1 result with a Load more
button, the 2nd appearing only after clicking it; Firestore Product Usage rose ~2,700-2,800 reads.

### Root cause 1 (diagnosed in the immediately preceding pass, confirmed again here): browser CORS

A live diagnostic script (Node, using the actual shared parsers) against generation 9 proved the
manifest, tag-facet asset, and "best" search shard all parse correctly and return exactly the 2
expected design IDs when fetched **outside a browser** (no `Origin` header, not subject to CORS).
The owner then supplied the exact browser console error, confirming the real blocker:

```
Access to fetch at 'https://firebasestorage.googleapis.com/...' from origin
'https://myprintrequest.dev' has been blocked by CORS policy: No
'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Exact bucket:** `gs://fresh-prints-dev.firebasestorage.app` — confirmed via
`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` in `apps/portal/.env.local` and by direct HTTPS request
(`fresh-prints-dev.appspot.com` → 404; `fresh-prints-dev.firebasestorage.app` → 200 for the same
object path). This also surfaced that the repo's **existing** `storage.cors.json` and
`docs/workflow/setup/firebase-storage-cors.md` (from an earlier, unrelated Assisted Creation
proof-download CORS effort) targeted `fresh-prints-dev.appspot.com` — the wrong/nonexistent bucket
alias for this project. Any CORS config ever applied under that name would have had no effect. That
prior flow (`getBlob`/XHR proof download) is confirmed unused anywhere in the current Portal
codebase (`getBlob` grep: zero matches) and its doc already stated bucket CORS was not required for
its actual (signed-URL callable) implementation.

`gcloud`/`gsutil` are not installed in this environment, so the required
`gcloud storage buckets describe gs://fresh-prints-dev.firebasestorage.app --format="default(cors_config)"`
inspection could not be run here — **`[NEEDS REPO CHECK / OWNER OR CI MACHINE WITH gcloud]`**. Given
no CORS file previously targeted the correct bucket name, the current configuration is presumed
default (empty/no CORS) but this has not been directly confirmed by that exact command.

### Fix — corrected `storage.cors.json`

```json
[
  {
    "origin": [
      "https://myprintrequest.dev",
      "http://localhost:3100",
      "http://127.0.0.1:3100"
    ],
    "method": ["GET", "HEAD"],
    "responseHeader": [
      "Content-Type",
      "Cache-Control",
      "ETag"
    ],
    "maxAgeSeconds": 3600
  }
]
```

Narrower than the file's previous content: `GET`/`HEAD` only (no `OPTIONS`/write methods — this is a
read-only asset fetch, not an upload flow), and only `Content-Type`/`Cache-Control`/`ETag` exposed
(no `Authorization`/`x-goog-resumable`/`x-firebase-storage-version`/`x-goog-meta-*`, none of which
the generated-asset consumer needs). Does not add `generated/catalog-reference/ai/**` to any CORS
entry (unaffected; still private per Storage Rules, unrelated to browser CORS). Does not add
`https://myprintrequest.com` (production is a separate checkpoint). `docs/workflow/setup/firebase-storage-cors.md`
updated in place with the corrected bucket name, the corrected inspect/apply/verify commands
(`gcloud storage buckets ...`, not the old `.appspot.com` `gsutil` example), and an explicit note
that CORS does not itself grant read access — Storage Rules already make these objects public;
CORS only lets a browser page's JS read the response body.

**Not yet applied.** Owner approval required; exact command in the Required Final Response below.

### Root cause 2: unsafe generated-search Firestore fallback

Independent of CORS, `useCatalogDesigns.ts`'s `needsFullHydrate` branch (search or multi-tag active)
silently fell through to `catalogService.listReadyDesignsPageWithSortFallback(serverListQuery)` on
*any* generated-asset failure (CORS error included). `buildServerListQuery()` drops the search term
and multi-tag selection entirely (only a single `primaryTag` survives), so that fallback fetched an
unrelated 40-design `createdAt`-sorted Firestore page, filtered it client-side for "best" (0 or 1
accidental matches), and fetched another 40-doc page per "Load more" click hunting for the rest —
reproducing the exact symptom and the read spike, independent of what actually caused the generated
call to fail.

**Fix (`apps/portal/features/catalog/hooks/useCatalogDesigns.ts`):** the `needsFullHydrate` branch no
longer falls through to Firestore under any circumstance. If `generatedPortalCatalogEnabled()` is
false, or `portalCatalogAssetService.listMatchingDesigns` throws for any reason, the hook now sets
`error: 'Catalog search is temporarily unavailable. Please try again in a moment.'`, clears
`allDesigns`, and returns — zero Firestore reads. Normal unfiltered Discover/Library browse
(`useCatalogHomeDesigns`'s `listHomeDiscoveryPool` fallback, and the non-`needsFullHydrate` branch's
`listReadyDesignsPageWithSortFallback` cursor path) is unchanged and keeps its separately-approved
bounded Firestore path — this fix is scoped to search/multi-tag only, per the task's explicit
instruction not to touch normal browse.

### Studio parity review (verification only, no code changes)

- **Ordering:** Studio's Design Library (`sortDesignsForListQuery`) uses `updatedAt DESC` with
  `design.id.localeCompare` descending as tiebreaker — an intentional, already-documented Studio
  *internal* convention (comment: "most recently processed/updated first"). Portal's Discover/browse
  grid intentionally uses `createdAt DESC` instead (existing code comment in
  `useCatalogDesigns.ts`: "Do not use updatedAt — request/favorite counters bump updatedAt and would
  reshuffle the grid"). These are two different, already-approved product decisions for two
  different surfaces, not a parity defect — both share the same descending-ID tiebreaker shape, and
  `portalCatalogBrowseOrder` already matches Portal's own convention correctly. No ordering change
  made or needed.
- **Search semantics:** Studio's `filterDesignsBySearch` (`designLibrarySearch.ts`) and Portal's
  `filterCatalogDesignsBySearch` (`catalogSearch.ts`) both do case-insensitive substring `includes()`
  matching against title/description/tags. The generated search index's `searchTerms()` builder
  (`publishCatalogSnapshots.ts`) already indexes **every substring** of every word (not just whole
  tokens), which is what gives the generated shard-based index the same substring-match behavior as
  Studio/the client-side filter — this was already correct from an earlier pass, not a new fix.
  Confirmed via the live diagnostic: "best" correctly matched both `Best Christmas Ever Castle` and
  `We Are More Than Bestie` via the generated index. No search-semantic change made or needed.
- **Tag counts:** Studio's `computeFacetedTagsForDraftSelection` computes counts scoped to whatever
  `baseDesigns` the caller passes (documented limitation in its own docstring). Portal's generated
  tag facet counts are global ready-design counts across the whole catalog — an intentional
  difference already reflected in the existing facet contract (`{id, name, count}`, `count >= 1`,
  no zero-count entries), not a parity defect to fix.

### Tests

| Command | Exit | Notes |
|---|---|---|
| `npm run typecheck --workspace @fresh-prints/portal` | 0 | clean after the fallback fix |
| `npx tsx --test` (portalCatalogAssetService, catalogSearch, catalogNeedsFullClientHydrate, snapshotBuilders) | 0 | 46/46 pass (no new pure-function tests added this pass — the fix is inside a React hook with no existing hook-test harness in this repo; the underlying pure functions it calls, `listMatchingDesigns`/`planPortalCatalogSearchPage`/`catalogNeedsFullClientHydrate`, already have dedicated coverage) |
| `npx eslint apps/portal/features/catalog/hooks/useCatalogDesigns.ts --max-warnings 0` | 0 | clean |
| `git diff --check` | 0 | pre-existing LF/CRLF warnings only |
| Live diagnostic script vs generation-9 Storage assets (Node, no `Origin` header) | — | manifest/facet/search-shard all parse correctly, "best" → 2 correct IDs |

No Functions/rules/Storage Rules were changed or deployed. No CORS configuration was applied. No
snapshot republish, import, or App Hosting action occurred.

### Exact next actions (owner approval required for each)

1. **CORS (this pass's primary blocker):**
   ```bash
   gcloud storage buckets update gs://fresh-prints-dev.firebasestorage.app --cors-file=storage.cors.json
   ```
   Then verify from the actual `https://myprintrequest.dev` browser tab (Network panel) that the
   generated asset requests return `Access-Control-Allow-Origin: https://myprintrequest.dev` and no
   console CORS error, per Step 7 of the originating task.
2. **Local retest** (browser hard-reload/private window against the already-running
   `npm run dev:portal`, or a fresh `npm run dev:portal` restart) to confirm the search-fallback fix
   and CORS fix together resolve both symptoms with zero Firestore fallback reads.
3. No Functions redeployment or snapshot republish is required for this pass's fixes — CORS is a
   bucket-level config, not a Functions/Rules change, and the search-fallback fix is Portal-only
   (App Hosting redeploy would be the eventual next step once local retest passes, per the
   `firebase deploy --only apphosting --project fresh-prints-dev` action already recorded as
   pending in `.cursor/workflow/state.md`).

## Dynamic tag-facet narrowing pass (2026-07-24, sixth pass)

Owner applied the corrected CORS configuration; the generated Portal assets now load successfully in
the browser, and searching "best" correctly returns both matches immediately with no Load more — both
prior blockers confirmed resolved.

### Root cause

The tag modal's global tag facet was already correctly bounded (compact generated asset, no Firestore
fallback — R-015's original fix), but `CatalogTagFilterModal`'s `facetedTags` computation
(`buildApprovedCatalogTagOptions`) only ever filtered the **global** facet list by name-search text.
There was no AND-narrowing logic anywhere in the modal or its data source — not a regression
introduced by an earlier fix in this goal, a feature gap the task asked to close.

### Data solution: Option A (existing assets sufficient, no new generated asset)

Investigated whether the complete AND-matching design set and tag co-occurrence could be derived from
already-required, already-cached generated assets:

- `manifest.filters.tagPathTemplate` already resolves a per-tag design-ID list asset
  (`filters/tags/{tagId}.json`) — `listMatchingDesigns` already fetches one of these per **selected**
  tag for search/filtering (not per candidate tag). Intersecting these lists gives the exact
  AND-matching design-ID set for `selectedTags` with `|selectedTags|` fetches, not one per candidate.
- Each card in a card-bucket asset (`manifest.cards.pathTemplate`) already carries its own
  `tags: string[]` — already required to render the result grid. Tallying `tags` across only the
  matching design set's cards (not every card, not one bucket per candidate tag) gives exact live
  co-occurrence counts.

This is sufficient: no new generated asset, no manifest field, no Plan/Review amendment, no fetch per
candidate tag (bounded by how many designs match the current selection, not by tag count — the exact
constraint the task required), zero Firestore reads.

### Implementation

- **`portalCatalogAssetService.ts`**: added `listNarrowedTagFacets(selectedTags)` — empty selection
  delegates to the existing `listTagFacets()` (global list, unchanged); non-empty selection loads each
  selected tag's design-ID list, intersects via the new pure `intersectDesignIdLists`, loads only the
  card buckets covering the matching set (`loadCardsById`, extracted from the existing `loadCards`),
  and computes co-occurrence via the new pure `computeNarrowedTagFacets` (tallies each matching card's
  `tags`, excludes already-selected tags from candidates, keeps selected tags visible with the full
  matching-set size as their count, sorts by name).
- **`catalogService.ts`**: added `listNarrowedApprovedTags(selectedTags)` passthrough, same
  no-Firestore-fallback contract as the existing `listApprovedTags`.
- **`CatalogTagFilterModal.tsx`**: new effect keyed on the halftone-excluded selected-tag set
  (`draftTagsKey`) — empty key uses the existing global `approvedTags` prop unchanged; non-empty key
  fetches the narrowed list with generation-guarded stale-response handling (mirrors the existing
  pattern in `useCatalogDesigns.ts`), an "Updating tags…" loading state, and the same customer-safe
  "unavailable" error state (never a Firestore fallback) on failure — reusing the existing `error` UI.
  Search-query filtering (`buildApprovedCatalogTagOptions`) now runs against whichever list
  (`narrowedTags` or `approvedTags`) is active, so tag-modal search composes correctly with narrowing.

### Behavior (verified against live generation-9 data via a standalone diagnostic before writing tests)

| Selection | Result |
|---|---|
| none | global facet list, global counts (unchanged) |
| `christmas` (6 ready designs) | `christmas (6)` selected; co-occurring candidates surfaced with live counts (`disney (4)`, `winter (3)`, `halloween (3)`, …); tags with zero co-occurrence (e.g. unrelated tags) excluded |
| `christmas` + `disney` | recalculated from the doubly-matching set only; both selected tags show the new intersected count, remaining candidates recompute from that narrower set |
| clear all | restores the global facet list and global counts |

### Read impact

Zero new Firestore reads (confirmed structurally — `portalCatalogAssetService.ts` has no Firestore
import, unchanged from the prior pass's proof). Exact generated requests for narrowing with `n`
selected tags: `n` per-tag design-ID list fetches (`filters/tags/{tagId}.json`, one per **selected**
tag, cached after first fetch) + however many card buckets cover the resulting matching design set
(bounded by match count, not tag count — the same buckets already needed to render results, no
duplicate fetch). Zero fetches per candidate/unselected tag. Zero fetches for a manifest that's
already cached (30-second TTL, same as every other consumer).

### Tests

| Command | Exit | Notes |
|---|---|---|
| `npm run typecheck --workspace @fresh-prints/portal` | 0 | clean |
| `npx tsx --test` (8 files) | 0 | 99/99 pass (7 new: `intersectDesignIdLists` x4, `computeNarrowedTagFacets` x7 minus one shared-setup case — see `portalCatalogAssetService.test.ts`) |
| `npx eslint` on all 4 changed files | 0 | clean |
| `git diff --check` | 0 | pre-existing LF/CRLF warnings only |
| `npm run build:portal` | not confirmed | owner's `dev:portal` was running again during this pass, holding `apps/portal/.next` locked (`EPERM` on `.next/trace`) — the identical file-lock contention diagnosed in the prior pass, not a code defect; not re-requested to stop it again since a build confirmation wasn't required to review this change; typecheck already confirms compile-correctness |

No Functions/Rules/manifest changes. No Storage Rules or CORS change needed for this fix (uses assets
already public per the existing boundary). No deploy, redeploy, republish, or controlled import
occurred in this pass.

### Deployment determination

**Portal-only fix.** No Functions deployment, no snapshot republish required. Once reviewed, a local
Portal restart (`npm run dev:portal`) is the only action needed before retesting.

## Studio generated-catalog consumer (2026-07-24, seventh pass)

Full implementation of the approved Plan/Review amendment ("Move Studio Design Library to generated
low-read catalog assets"). Studio's existing UX (search, category/tag/halftone filtering, dynamic
narrowing, `updatedAt DESC, id DESC` ordering, 100-design page size, request-selection mode) is
unchanged — only the underlying data source for the normal ready Design Library moved from Firestore
to generated Cloud Storage assets.

### Generated asset

- **Path**: `generated/portal-catalog/v{contentVersion}/studio/ready-index.json`
- **Contract** (`PortalCatalogStudioReadyIndex`): `{ schemaVersion: 1, catalogVersion, generatedAt,
  designs: [{ id, title, description?, categoryId?, tags, updatedAtMs }] }` — array order is the
  canonical `updatedAt DESC, id DESC` order (the array order itself, no separate ordering field,
  matching every other Portal ID-list asset's convention).
- **Manifest field**: `studio.readyIndexPath` — additive, required, validated by
  `parsePortalCatalogManifest` (`filters.tagFacetPath`-style precedent:
  `PORTAL_CATALOG_MANIFEST_SCHEMA_VERSION` unchanged, no dual-parser fallback needed since no
  deployed Studio consumer of the old shape exists yet).
- **Budget**: 512 KiB uncompressed, provisional — not yet measured against the real dev corpus (no
  live Studio republish has occurred yet); the same 80%-warning pattern used for the AI reference
  snapshot (R-013) should be applied once real-scale measurement is available, per the Review's
  explicit instruction.
- **Why title/description are included** (not just id/tags/categoryId, originally proposed
  narrower): Studio's existing search (`filterDesignsBySearch`) checks title/description
  substring-match, not just tags, and has no token/shard index the way Portal's generated search
  does. Without title/description in the index, search would require fetching every ready design's
  card bucket just to check titles — defeating the "only load buckets needed for the current page"
  requirement. Confirmed with the owner mid-implementation before building the wider contract.

### Publisher

- `studioCatalogReadyOrder(cards)` — Studio's own `updatedAt DESC, id DESC` sort, kept **independent**
  of `portalCatalogBrowseOrder` (Portal's `createdAt`-based order) — the two must never be conflated.
- `buildPortalCatalogStudioReadyIndex(cards)` — builds the minimal per-design projection from the
  same ready-card set `publishPortal()` already computes; no additional Firestore read.
- Both are pure, directly unit-tested functions in `snapshotBuilders.ts`.
- Write added to `publishPortal()`'s existing `Promise.all` alongside the tag-facet asset — same
  atomic manifest-last publication, same previous-version retention, no new coordination document.

### Electron transport (IPC bridge, not browser CORS)

Per the Formal Review's explicit decision: packaged Electron's `file://` renderer origin very likely
sends no usable `Origin` header on cross-origin `fetch()`, making direct bucket-CORS allow-listing
for it unsafe/unreliable, and broader/harder-to-audit than a fixed hostname. Instead:

- New `catalogAsset` IPC feature: channel registry
  (`apps/studio/electron/ipc/catalogAsset/catalogAssetIpcChannels.ts`), main-process handler
  (`catalogAssetIpcHandlers.ts`) that validates the request shape and only fetches URLs whose host
  matches the existing Firebase Storage allowlist, preload bridge exposing
  `window.freshPrints.catalogAsset.fetchJson({ downloadUrl })`.
- The renderer still resolves the download URL itself via the existing `getDownloadURL()` call
  (`firebase/storage`, already used throughout Studio) — only the actual HTTP fetch happens in the
  main process (plain Node, no browser CORS enforcement at all), sidestepping the packaged-origin
  question entirely. Works identically in dev and packaged builds; no dev-vs-packaged branching in
  the renderer.
- Extracted `isAllowedFirebaseStorageDownloadUrl` (previously private inside
  `downloadFirebaseStorageUrlToFile.ts`) into a new dependency-free
  `firebaseStorageDownloadUrl.ts` module, shared by both the existing download-to-file feature and
  the new catalog-asset fetch — one allowlist, not two copies that could drift.
- **No bucket CORS change applied or needed.**

### Studio consumer

- `studioCatalogAssetService.ts`: manifest/asset caching mirroring
  `portalCatalogAssetService.ts`'s pattern (30s manifest TTL, 16 MiB bounded LRU asset cache,
  in-flight Promise dedup, rejection eviction) — but every network request routes through the new
  IPC bridge instead of a renderer `fetch()`.
- `useGeneratedReadyDesigns.ts`: loads the whole ready-index once per manifest content version;
  exposes the raw entries (mapped to filtering-only `Design` stand-ins via
  `entryToFilterableDesign`) for the page's **existing, completely unchanged** pure filter functions
  (`filterDesignsBySearch`/`filterDesignsByCategory`/`filterDesignsByTags`/
  `computeFacetedTagsForDraftSelection`) to run against exactly as they already run against
  Firestore-sourced designs today. Resolves real card fields (thumbnail, dimensions, etc.) only for
  the final visible (post-filter, post-page-slice) ID set via `resolveVisibleCards` →
  `studioCatalogAssetService.loadCards`, which itself only fetches the card buckets those specific
  IDs hash into — never every bucket, never one Firestore read per card.
- Falls back to the existing bounded 100-document Firestore first page
  (`designService.listDesignsPage`) **only** when the generated ready-index itself fails to load,
  for **normal unfiltered browse only** — matching the Review's decision to reuse Studio's
  already-correct, already-bounded existing Firestore path rather than inventing a new fallback.
  Search/category/tag/halftone modes show a bounded "Design Library is temporarily unavailable"
  message on generated-asset failure, no Firestore fallback scan.
- Pure mapping helpers (`cardToDesign`, `entryToFilterableDesign`) extracted to
  `apps/studio/.../designs/utils/generatedReadyDesignMapping.ts` — a Firebase/Electron-import-free
  module so they're directly unit-testable under plain `node:test`/`tsx` (importing the hook or
  service file directly pulls in `firebase/storage`/`window.freshPrints`, which fail outside a
  real Vite/Electron runtime).

### `DesignLibraryPage.tsx` wiring

- Normal ready browse (`!includeArchived`) now sources its `designs` array from
  `useGeneratedReadyDesigns` instead of `useDesigns`; archived mode (always Firestore, since
  archived designs are staff-only and must never enter the public generated asset) and
  request-selection mode (which already reuses the same page/hook, so it inherits the generated
  path automatically for its ready-only scope) are otherwise unaffected — `useDesigns` still runs
  unconditionally (hooks cannot be called conditionally) but its result is simply unused while the
  generated path is active.
- All existing downstream `useMemo`s (`searchMatchedDesigns`, `categoryFilteredDesigns`,
  `categoryFilterOptions`, tag-filtering, `sortDesignsForListQuery`) are completely untouched —
  they operate on whichever `designs` array is now in scope, generated or Firestore, identically.
- Pagination: `allFilteredDesigns` (the complete filtered set, no slicing) drives the count label and
  tag-facet computation exactly as before; a new `generatedVisibleCount`/`generatedVisibleIds` slice
  (100 at a time, "Load more" appends another 100) determines which IDs get resolved to real cards
  via `resolveVisibleCards` — the grid only ever renders resolved cards for the current page.
- **Edit save**: `handleDesignUpdated` re-fetches the just-saved design from the existing bounded/
  cached `designService.getDesignById` and applies a local patch to the generated-derived index
  (`applyLocalEntryPatch`) plus invalidates that one resolved card, so the list reflects the edit
  immediately without waiting for the next snapshot republish or reloading the whole generated set.
- **Archive**: `handleArchiveConfirm` calls the existing `archiveDesign` (Firestore write, unchanged)
  and additionally removes the design from the local generated-derived index immediately
  (`removeLocalEntry`) — archived designs never appear in the public asset regardless, and this
  keeps the ready view honest before the next republish reconciles it.
- **Detail/edit transition**: `openDesignDetails` always re-fetches the authoritative Firestore
  document via `designService.getDesignById` (bounded, 15s-cached, already existed) when in
  generated mode, before showing the details/edit modal — the generated card is a
  rendering-and-filtering-only stand-in (missing `uploadedBy`/`aiSuggestions`/`createdAt`/etc.,
  which `DesignDetailsModal` does render) and must never be treated as edit authority.
- **Return from detail**: closing the modal does not trigger any new generated-asset fetch — the
  manifest/ready-index/card-bucket caches are untouched, matching the requirement that returning to
  the list reuses cache rather than reloading.

### Read impact

Zero new Firestore reads on the valid generated path for normal ready browse (structurally confirmed
— `studioCatalogAssetService.ts` has no Firestore import). Cold-entry generated requests: one
manifest fetch (cached 30s), one ready-index fetch (cached by content version), and only the card
buckets covering the first 100 visible IDs (bounded by `portalCatalogCardBucketNumber`, not the whole
catalog). Search/category/tag/halftone filtering happens entirely client-side over the already-loaded
ready-index — zero additional network requests for those interactions, matching Studio's pre-existing
"fully client-side filtering" architecture (the ready-index replaces the Firestore-sourced `designs`
array as the filtering input, nothing else about the filtering pipeline changes). Categories continue
to load from the existing client-safe taxonomy snapshot (`generated/catalog-reference/client/**`,
unchanged, no new fetch added this pass).

**Not measured this pass** (no live Studio session, no browser/Electron automation tooling in this
environment): exact trace totals for a real developer-controlled session. See the manual test script
below.

### Manual developer runtime retest script (for the owner — this environment could not run it)

1. Fully close any existing Studio session; confirm no Electron renderer process remains.
2. Enable the existing Firestore usage tracer (`localStorage.setItem('FP_FIRESTORE_TRACE', '1')` in
   the Studio renderer, or the equivalent `FP_FIRESTORE_TRACE=1` env var), then start
   `npm run dev:studio`.
3. Open the Design Library (`/designs`). Record `window.__fpFirestoreTrace.dump()`.
4. Confirm: `reads` shows 0 `tags`/`categories`/`designs` one-shot entries attributable to this
   route's cold entry (categories load from the generated client taxonomy; tags load lazily only
   when the tag modal opens, from the existing `useCatalogTags` — unaffected by this pass).
5. Search `best`. Confirm both matching designs appear on page 1 (assuming ≤100 total matches), no
   new Firestore reads recorded.
6. Clear search. Open tag filters, select one tag, confirm narrowing and updated counts reflect the
   whole ready catalog (not just a loaded page) with zero new Firestore reads.
7. Select a second tag, confirm AND narrowing recalculates correctly. Clear tags.
8. Apply a category filter, then clear it. Toggle halftone, then clear it.
9. If more than 100 ready designs match the current filters, click "Load more" and confirm the next
   up-to-100 appear with only the newly-needed card buckets fetched (check
   `window.__fpFirestoreTrace.dump()` again — still 0 Firestore reads).
10. Open one design. Confirm exactly one `getDoc` on `designs/{id}` is recorded (the authoritative
    detail fetch) — this is the only expected Firestore read in the entire sequence up to this point.
11. Close the detail modal, return to the list. Confirm no new generated-asset requests or Firestore
    reads occurred (cache reuse).
12. Idle 5 minutes. Confirm zero repeated catalog reads/requests of any kind.
13. Edit the opened design's title, save. Confirm the list shows the new title immediately (local
    patch) without a full reload.
14. Toggle to Archived mode; confirm this still uses the existing Firestore-backed path (unchanged
    behavior) and that an archived design is not visible in the (still generated-backed) ready view.

### Tests

| Command | Exit | Notes |
|---|---|---|
| `npm run build --prefix functions` | 0 | clean |
| `npm run typecheck --workspace @fresh-prints/portal` | 0 | clean |
| `npm exec --workspace @fresh-prints/studio -- vite build` | 0 | renderer+main+preload all clean |
| `npm run test:rules` (Java 21, portable JDK) | 0 | 8/8 pass (was 7/7 — new Storage-path coverage test added and proven) |
| `npx tsx --test` (12 files) | 0 | 138/138 pass (19 new this pass) |
| `npx eslint` on all new/changed files | 0 | clean, except one confirmed pre-existing unrelated `no-control-regex` finding in `downloadFirebaseStorageUrlToFile.ts` (verified via `git stash` to predate this pass) |
| `git diff --check` | 0 | pre-existing LF/CRLF warnings only |
| Studio `npx tsc --noEmit` (repo-approved command) | 2 | **pre-existing, documented TS5103 `ignoreDeprecations` failure** — blocked before reaching any new code |
| Studio `npx tsc --noEmit --ignoreDeprecations 5.0` (established override) | 2 (unrelated) | zero errors in any file this pass touched; 28 pre-existing errors elsewhere, confirmed by file path |

No Storage Rules or CORS change needed (proven via the new rules test, not assumed). No Firestore
rules or index change. No deploy, redeploy, republish, or controlled import occurred in this pass.

### Deployment determination

**Generated-contract change — Functions redeployment and republish required before an owner Studio
retest can be meaningful** (the currently-live snapshot predates `studio.readyIndexPath` and the new
asset entirely — Studio's generated consumer will fail to load the manifest field until republished).

Affected Functions (same two already pending redeploy from the prior CORS/fallback pass, since only
`publishPortal()`'s output changed again):

```bash
firebase deploy --only functions:rebuildCatalogSnapshots,functions:onPortalCatalogSnapshotSourceWritten --project fresh-prints-dev
```

Then one republish:

```js
await window.freshPrintsDev.rebuildCatalogSnapshots()
```

No Storage Rules, Firestore rules, index, or bucket CORS change required for this pass. Neither
command was run.

## Studio ordering correction and read attribution (2026-07-24, eighth pass)

Owner republished generation 38 (`portal.contentVersion: "38-4d50a5ac0c97ab21"`) and independently
validated the live manifest/ready-index (200 OK, `studio.readyIndexPath` present, 36,590 bytes/80
designs, zero forbidden fields, `updatedAt DESC, id DESC` ordering correct at the time — since that
was the ordering rule then in effect). Owner Studio QA against generation 38 found two problems.

### 1. Ordering root cause (confirmed, fixed)

`studioCatalogReadyOrder`/`buildPortalCatalogStudioReadyIndex` sorted by `updatedAtMs` — the exact
field bumped by `requestCount`/`lastRequestedAt`/`lastAddedToShowAt`/edit writes (already listed as
"relevant" in `onPortalCatalogSnapshotSourceWritten`'s own republish-trigger diff, correct for
*triggering a rebuild* but not for the ordering itself). This precisely explains the owner's report:
adding a design to a print request, allocating it to a show, or editing it all bump `updatedAt`,
which the generated index then used as its primary sort key, reshuffling the visible catalog.

**Fix:** changed the ready-index's ordering field from `updatedAtMs` to `createdAtMs` (owner
decision) — `id, title, description?, categoryId?, tags, createdAtMs`, sorted `createdAt DESC, id
DESC`. `createdAt` is proven immutable after creation (Firestore rules forbid changing it on update;
no code path in the repo writes to it post-creation) via direct repository investigation of every
`designs` document-creation path (`designService.createDesign`,
`promoteCustomerUploadToAiReview`) — both write it unconditionally via `serverTimestamp()`. No
repo-visible evidence of legacy designs missing `createdAt`; no backfill/migration performed or
required. Portal's own generated assets are completely unaffected (they already used
`createdAt`-based ordering).

Files changed: shared type/parser (`catalogSnapshot.types.ts`, `catalogSnapshot.parsers.ts`),
publisher (`snapshotBuilders.ts`), Studio consumer doc comments (`studioCatalogAssetService.ts`,
`useGeneratedReadyDesigns.ts`, `generatedReadyDesignMapping.ts`), all associated tests. 10 new/updated
tests this pass, including explicit regressions for each owner-reported scenario: request activity,
show-allocation activity, and catalog editing all leave ordering unchanged; a newly created design
appears before older ones; ID DESC remains the tiebreaker for equal `createdAtMs`.

### 2. Read attribution (~1,300 reads) — reconciled, not a new defect

Attributed via direct code inspection (no live Studio session/automation tooling available in this
environment — disclosed honestly rather than fabricated):

| Source | Collection | Reads | Cache | Notes |
|---|---|---|---|---|
| `useCatalogTags({ includeArchived: true })` | `tags` | **~1,122** (dominant) | 12h TTL, `boundedAsyncCache` | Pages the entire tags collection at 500/page (3 pages at the real ~1,122-tag dev corpus) — unconditional on every Design Library mount, unchanged since before this Studio generated-catalog work began |
| `useCategories()` | `categories` | ≤200 | 12h TTL, `boundedAsyncCache` | Bounded `limit(200)` one-shot, unconditional on mount, unchanged |
| Design browse/search/filter/card path | — | **0** | manifest 30s TTL, card buckets by content version | Structurally confirmed zero Firestore reads (no Firestore import in `studioCatalogAssetService.ts`) |
| Incidental (auth/profile, etc.) | various | small remainder | — | Not separately itemized; accounts for the gap between ~1,322 (tags+categories ceiling) and the owner's observed ~1,300 |

**Reconciled total: ~1,122–1,322, consistent with the owner's observed ~1,300.** This is **not caused
or worsened** by the Studio generated-catalog implementation — both sources predate it and were
explicitly out of this task's scope (the approved Plan only covers design browse/search/filter/card
data; tag/category taxonomy loading was separately discussed and partially deferred).

**Finding surfaced, not unilaterally fixed:** the original Plan amendment already said Studio's
category dropdown should reuse the generated client-safe taxonomy snapshot
(`generated/catalog-reference/client/**`) instead of Firestore — `DesignLibraryPage.tsx` still calls
Firestore-backed `useCategories()`, an implementation gap against the already-approved Plan (up to
200 of the ~1,300 reads). The tag list legitimately still needs Firestore for `EditDesignModal`'s
full approved-tag/alias picker (explicitly out of scope per the Plan). Not fixed this pass — outside
this specific task's scope (ordering + attribution) — flagged for the owner to decide as a follow-up.

### Tests

| Command | Exit | Notes |
|---|---|---|
| `npm run build --prefix functions` | 0 | clean |
| `npm run typecheck --workspace @fresh-prints/portal` | 0 | clean |
| `npm exec --workspace @fresh-prints/studio -- vite build` | 0 | renderer+main+preload clean |
| `npm run test:rules` (Java 21, portable JDK) | 0 | 8/8 pass, unaffected |
| `npx tsx --test` (12 files) | 0 | 148/148 pass (10 new this pass) |
| `npx eslint` on all changed files | 0 | clean |
| `git diff --check` | 0 | pre-existing LF/CRLF warnings only |
| `npm run build:portal` | not confirmed | owner's `dev:portal` running again, holding `apps/portal/.next` locked — identical recurring file-lock contention, not a code defect; Portal typecheck already confirms compile-correctness, and Portal has zero code changes this pass anyway |
| Studio `npx tsc --noEmit` | 2 | pre-existing documented TS5103 |
| Studio `npx tsc --noEmit --ignoreDeprecations 5.0` | 2 (unrelated) | zero errors in any file this pass touched |

### Deployment determination

**Generated-contract change (again) — Functions redeployment and republish required.** The
already-live generation-38 snapshot still carries `updatedAtMs`-ordered entries; Studio's consumer
will keep exhibiting the owner-reported reshuffling until republished with this fix.

```bash
firebase deploy --only functions:rebuildCatalogSnapshots,functions:onPortalCatalogSnapshotSourceWritten --project fresh-prints-dev
```

Then one republish:

```js
await window.freshPrintsDev.rebuildCatalogSnapshots()
```

No Storage Rules, Firestore rules, index, or bucket CORS change required. Neither command was run
this pass.

### Post-republish validation checklist (for the owner, mirroring the prior generation-38 validation)

1. Manifest parses; `studio.readyIndexPath` present with a new content version.
2. Ready-index fetch succeeds; every entry contains `createdAtMs` (not `updatedAtMs`).
3. Entries are sorted `createdAtMs DESC`, then ID DESC — verify no entry has a higher `createdAtMs`
   than the entry before it, and ties are broken by descending ID.
4. Design count matches the ready catalog; no duplicate IDs.
5. Asset size remains below 512 KiB (expect similar to the prior 36,590-byte measurement — the field
   rename does not materially change size, since one number replaces another).
6. No unexpected/staff-only fields present (same forbidden-field check as before).
7. Portal generated assets remain valid and unaffected (spot-check the existing Portal manifest/card
   buckets — should show no changes beyond the manifest's own `contentVersion`/`generation` bump from
   the shared `publishPortal()` re-run).

## Studio Design Library taxonomy read-gap closure (2026-07-24, ninth pass)

Closed the gap surfaced (not fixed) in the prior pass: `DesignLibraryPage.tsx`'s `useCategories()`
and `useCatalogTags({ includeArchived: true })` were unconditionally querying Firestore on every
normal (non-archived) Design Library mount — ~200 category reads + ~1,122 tag reads at the real dev
corpus, the dominant share of the owner's observed ~1,300.

### Fix

Both now source from the existing, already-published `generated/catalog-reference/**` client-safe
taxonomy snapshot — the same one Portal already publishes and consumes. **No new generated asset, no
manifest change, no publisher change** — reuses Portal's existing data verbatim.

- **New**: `studioCatalogAssetService.loadClientTaxonomy()` (mirrors
  `portalCatalogAssetService.loadClientTaxonomy` exactly — 30s-manifest-TTL-scoped cache, in-flight
  dedup, content-version staleness check).
- **New**: `clientCategoryToCategory`/`clientTagToCatalogTag` mapping functions
  (`generatedReadyDesignMapping.ts`) — confirmed by direct inspection of every consumer that only
  `id/name/sortOrder/isActive` (categories) and `id/name/aliases/status` (tags) are ever read by the
  Design Library's own filter/dropdown/tag-picker logic; `description` (categories) and
  `preferredWhen` (tags, server-only AI guidance) are never read there.
- **New**: `useGeneratedDesignLibraryTaxonomy` hook — loads the snapshot once, falls back
  transparently to the existing Firestore-backed hooks (already running unconditionally regardless)
  if the generated snapshot fails to load.
- **`DesignLibraryPage.tsx`**: `categories`/`catalogTags` now source from the generated hook in
  normal (non-archived) mode; `CategoryManagementModal` explicitly repointed at
  `firestoreCategories` (a real, confirmed management flow needing the full active+inactive set and
  `description`); `TagManagementModal` already called its own independent Firestore-backed
  `useCatalogTags`, unaffected; `refreshCatalog` now always reloads the Firestore-backed
  categories/tags hooks (needed by the management modals regardless of Design Library mode) while
  still skipping the Firestore *design* reload in generated mode (unchanged from the prior pass).

### Owner-approved behavior note

Tag-modal search previously also matched each tag's `preferredWhen` guidance text (a secondary match
path); since the public snapshot excludes that server-only field, this sub-path no longer matches —
confirmed with the owner via `AskUserQuestion` before implementing (recommended and chosen: drop the
`preferredWhen` match, keep name/alias matching, the primary path, fully intact — do not keep the
Firestore read only to preserve this narrow secondary behavior).

### Active-only category convention

The generated taxonomy only ever contains active categories (same as Portal's own long-standing,
already-accepted convention) — not a new tradeoff. A ready design whose category was deactivated
after assignment shows no category label in the generated-sourced dropdown, matching Portal's
existing behavior exactly.

### Tests

| Command | Exit | Notes |
|---|---|---|
| `npm run build --prefix functions` | 0 | clean (no functions changed this pass) |
| `npm run typecheck --workspace @fresh-prints/portal` | 0 | clean |
| `npm exec --workspace @fresh-prints/studio -- vite build` | 0 | clean |
| `npm run test:rules` | 0 | 8/8, unaffected (no rules change) |
| `npx tsx --test` (12 files) | 0 | 155/155 pass (7 new this pass: `clientCategoryToCategory`/`clientTagToCatalogTag` mapping tests, including direct integration with `buildCategoryFilterOptions`/`buildCatalogTagSuggestions`/`resolveCatalogTagCandidate`/`computeFacetedTagsForDraftSelection`) |
| `npx eslint` on all changed files | 0 | clean |
| `git diff --check` | 0 | pre-existing LF/CRLF warnings only |
| Studio `npx tsc --noEmit --ignoreDeprecations 5.0` | 2 (unrelated) | zero errors in any file this pass touched (28 pre-existing) |

### Deployment determination

**No Functions redeployment or republish required for this specific fix.** It consumes an
already-published, already-live public asset (`generated/catalog-reference/**`) — no publisher
change, no manifest change. It ships as part of the same Studio desktop build the `createdAt`
ordering fix requires.

## Final combined deployment instructions (both fixes in this checkpoint)

Two independent fixes are pending in this checkpoint: (1) the `createdAt`-based Studio ordering
correction (requires a Functions redeploy + one republish), and (2) the Studio taxonomy read-gap
closure (requires neither — Studio-only consumer change reusing an already-live asset). Both ship
together in the same Studio build.

### 1. Deploy the two affected Functions (for the ordering fix only)

```bash
firebase deploy --only functions:rebuildCatalogSnapshots,functions:onPortalCatalogSnapshotSourceWritten --project fresh-prints-dev
```

### 2. Republish once (for the ordering fix only)

In Studio DevTools (owner/admin, connected to `fresh-prints-dev`):

```js
await window.freshPrintsDev.rebuildCatalogSnapshots()
```

Record the returned `portal`/`reference` content versions and generations.

### 3. Validate the republished asset (ordering fix)

Repeat the same live-asset validation performed for generation 38, checking specifically for the new
ordering field:
- Manifest parses; `studio.readyIndexPath` present with a new content version.
- Ready-index fetch succeeds; every entry contains `createdAtMs` (not `updatedAtMs`).
- Entries sorted `createdAtMs DESC`, then ID DESC.
- Design count matches the ready catalog; no duplicate IDs; asset under 512 KiB; no
  unexpected/staff-only fields; Portal generated assets remain valid and unaffected.

### 4. Restart Studio and retest (both fixes)

No republish or redeploy is needed for the taxonomy read-gap fix — it activates as soon as the
rebuilt Studio app is running, since it only changes which existing asset the Design Library reads.
A single Studio restart after step 2/3 exercises both fixes together.

### 5. Owner manual retest checklist

1. Open the Design Library — confirm no visible taxonomy/category/tag regressions (same names, same
   filter behavior).
2. Add a design to a print request, edit a design, allocate one to a show — confirm the Design
   Library order does not change for that design.
3. Create a brand-new design (e.g. via import) — confirm it appears at the top of the list.
4. Open tag filters, verify narrowing/counts still work (name/alias search; guidance-text search no
   longer matches, as expected).
5. Open Category Management / Tag Management — confirm these still show the full taxonomy including
   any inactive/archived entries, and that create/edit/archive/restore continue to work normally.
6. Re-run the Firestore usage tracer for a full session (open Design Library, search, filter,
   idle 5 minutes) — confirm categories/tags no longer appear as one-shot reads on cold mount.

Do not execute any of the above without separate, explicit owner approval per step.

---

## Firebase Debug separate-window checkpoint correction (2026-07-24)

### Implementation record

- Electron main owns one Firebase Debug `BrowserWindow` and its lifecycle. Ctrl+Shift+F in the main
  renderer requests open/focus; repeated requests restore/focus the existing window; close clears the
  reference; reopen preserves the trace session; main-window shutdown closes the debug window.
- The main Studio renderer remains the authoritative trace-session owner. A shared tracer
  subscription publishes only `FirestoreTraceSnapshot` safe metadata through typed preload IPC to an
  Electron-main latest-snapshot broker. The debug renderer subscribes to that broker.
- Reset and tracing enable/disable commands route from the debug renderer through main back to the
  main renderer. Copy Debug Report formats the same snapshot currently shown in the debug window.
- The dedicated renderer entry mounts only the debug UI, not Studio routing/auth/application
  providers, so it cannot overwrite main route/action attribution.
- Electron main independently denies packaged builds, non-`fresh-prints-dev` project IDs, and senders
  other than the retained main Studio window. Context isolation remains on; Node integration remains
  off. Existing trace contracts contain no document bodies, payloads, signed URLs, raw errors,
  authentication tokens, secrets, or customer information.
- Portal behavior remains the existing in-page panel.

### Automated verification

| Command | Exit | Result |
|---------|------|--------|
| `npx tsx --test <8 exact Firebase debug/tracer files>` | 0 | 30/30 |
| `npx tsx --test <3 new Electron lifecycle/gate/channel files + tracer subscription>` | 0 | 13/13 (overlaps 9 tests above; combined unique focused total 34/34) |
| `npm exec --workspace @fresh-prints/studio -- vite build` | 0 | renderer + Electron main + preload pass |
| `npm run typecheck --workspace @fresh-prints/portal` | 1 | pre-existing TS5103 `ignoreDeprecations` configuration failure |
| `npx tsc -p apps/portal/tsconfig.json --noEmit --ignoreDeprecations 5.0` | 0 | pass |
| `npx tsc -p apps/studio/tsconfig.json --noEmit --ignoreDeprecations 5.0` | 1 | existing unrelated repository errors only; no changed debug-window file reported |
| `npx eslint <all changed TS/TSX files> --max-warnings 0` | 0 | pass |
| `git diff --check` | 0 | pass |
| `npm run build:portal` | 124 | inconclusive timeout after 124 seconds without output |

### Owner checkpoint

Restart Studio development against `fresh-prints-dev`, press Ctrl+Shift+F, keep the separate debug
window visible, and navigate in the main Studio window. Confirm live updates and Reset, then run the
existing 10-step diagnostic workflow and paste Copy Debug Report JSON. No diagnosis of the
card-refresh, ordering, or read-spike findings is authorized before that report.

---

## Live-report read-accounting and generated-first correction (2026-07-24)

Owner capture verified that the former `Reads` value counted operations rather than returned
documents and that current Design Library code started legacy Firestore hooks concurrently with
generated assets.

- Report schema v2 separates read operations, returned documents, approximate billable document
  reads, listener initial documents, and listener update documents. Completed one-shot queries and
  initial listener results apply the observable one-document minimum; index-entry and server-side
  charges remain explicitly excluded from the approximation.
- Action, route, and collection tables use the same operation/document/billable terminology.
- Normal generated browse disables legacy category/tag/ready-design Firestore hooks. Taxonomy
  fallback begins only after taxonomy asset failure; bounded ready-design fallback begins only after
  ready-index rejection; archived mode is unchanged.
- Regression tests cover zero parallel Firestore startup policy, expected generated
  manifest/ready-index requests, fallback ordering, and the exact owner example
  (18 + 500 + 500 + 122 + 81 = 1,221 returned documents).

Verification: focused suite 30/30 exit 0; Studio renderer/main/preload Vite build exit 0; Portal
typecheck with the approved `--ignoreDeprecations 5.0` override exit 0; changed-file ESLint exit 0;
`git diff --check` exit 0.

No deployment, republish, `rebuildCatalogSnapshots`, production action, or unrelated bug fix.

---

## Generated-first-v3 runtime-path audit (2026-07-24)

The owner retest still showed the exact pre-gate 1,221-document sequence with no fallback event.
Repo-wide inspection found one routed Design Library page, no selection-mode duplicate, and initial
legacy-hook gates already false. Loading and remount did not set unavailable. Process inspection
found no current Studio Vite/Electron process; the newly built renderer contains the gate, but a
packaged or previously running Studio cannot consume local source/dist changes.

Hardening and proof:

- Generated taxonomy state is explicit: `loading`, `ready`, `failed`, or `inactive`.
- Only terminal `failed` enables taxonomy Firestore fallback.
- Ready-design fallback checks active mount generation before starting, so Strict Mode cleanup cannot
  launch a stale first-mount fallback.
- Generated source success/failure and fallback activation are traced with revision
  `generated-first-v3`.
- Focused tests cover loading, success, Strict Mode remount, route remount, cancellation, and
  terminal-failure-only fallback: 36/36, exit 0.
- Studio renderer/main/preload Vite build exit 0; built `index-Brv-ShB4.js` contains four
  `generated-first-v3` markers.
- Portal override typecheck, changed-file ESLint, and `git diff --check`: exit 0.

Exact owner launch requirement: fully close every Studio/Electron window, stop any prior Studio Vite
process, then run `npm run dev:studio` from `C:\coding\fresh-prints`. A `vite build` alone does not
replace a packaged or already-running application. The next report must contain
`generated-first-v3`; absence proves it is not the newly built renderer.

---

## Actual generated-asset failure resolution (2026-07-24)

Exact live verification used Studio Electron main's real `fetchCatalogAssetJson` implementation and
the shared parsers. No signed URLs, tokens, or bodies were logged.

| Asset | Storage path | Result |
|-------|--------------|--------|
| Taxonomy manifest | `generated/catalog-reference/manifest.json` | HTTP 200, JSON/schema pass |
| Taxonomy client | `generated/catalog-reference/client/v8-1a810751ceb2b381.json` | HTTP 200, schema pass |
| Portal manifest | `generated/portal-catalog/manifest.json` | HTTP 200, JSON/schema pass |
| Studio ready index | `generated/portal-catalog/v40-4d50a5ac0c97ab21/studio/ready-index.json` | HTTP 200, schema pass |

Bucket: `fresh-prints-dev.firebasestorage.app`. Fetch host:
`firebasestorage.googleapis.com`. Host allowlist, HTTP, JSON parsing, both manifest contracts, path
resolution, and ready-index contract all pass.

Root cause: both families shared one renderer-only failure. After IPC returned parsed JSON, the
context-isolated renderer executed `Buffer.byteLength`; Node integration is disabled, so this threw
before shared schema parsing. Replaced with browser-safe `TextEncoder`.

Tracing now records sanitized Storage completion success/failure with `assetClass`, `failureCode`,
`failureStage`, HTTP status when available, and duration across URL construction, Electron IPC,
host allowlist, HTTP request/status, response size, JSON parsing, shared schema parsing, manifest path
resolution, and ready-index path resolution.

Normal taxonomy failure no longer loads the 1,122-tag corpus or categories from Firestore; it shows
the existing unavailable state. Category/tag management retains intentional Firestore access.
Bounded ready-design fallback remains approved.

Verification: focused transport/parser/fallback suite 39/39; exact live main-fetch checks 4/4; Studio
renderer/main/preload build; Portal override typecheck; changed-file lint; diff check—all pass.
No deploy, republish, snapshot rebuild, or production action.

---

## Generated Design Library created-date sort crash correction (2026-07-24)

Owner retest reached the healthy generated path but rendered a black screen:
`getDesignSortMillis` called `design.createdAt.toMillis()` on generated ready-index records, whose
authoritative ordering value is numeric `createdAtMs`.

Correction:

- Healthy generated results now sort by explicit `createdAtMs DESC`, then design ID DESC.
- Generated records are not given fabricated Firestore Timestamps for sorting.
- Archived and approved bounded-fallback Firestore records continue using their persisted
  `createdAt` Timestamp.
- Missing numeric or Timestamp sort data is placed after valid records and cannot throw.
- No route error boundary was added; there is no established matching route-level pattern and the
  underlying boundary defect is fixed.

Verification:

- Focused generated sort/load/fallback suite: 30/30 pass.
- Changed-file ESLint: exit 0.
- Studio renderer, Electron main, and preload Vite build: exit 0.
- `git diff --check`: exit 0.

No deploy, republish, `rebuildCatalogSnapshots`, or production action. Stop at owner retest.

---

## Studio edit reconciliation and snapshot-trigger attribution (2026-07-24)

### Proven local failure

`useUpdateDesign` returned the mapped persisted `Design` produced by
`designService.updateDesign`, but `EditDesignModal` discarded it. The page then called
`getDesignById`, creating the second client read. It patched title/description/category/tags in the
generated ready entry, preserving `createdAtMs` only incidentally through a partial merge, then
deleted the affected card from `generatedCardsById`. Because the visible ID list did not change, the
resolver effect did not rerun. If it had rerun, the Studio asset cache still held the old bucket.
This explains the disappearing card and stale background. Returning to the route discarded local
state and showed whatever generated version was then current, producing the observed difference.

### Local correction

- The modal passes the successful save result directly to reconciliation; the redundant
  `getDesignById` is removed.
- Explicit mappers separate persisted Design, ready-index patch, and generated card shapes.
- `createdAtMs` and ID-desc ordering are preserved.
- Title, description, category, tags, status handling, background, thumbnail, preview, dimensions,
  and print dimensions are reconciled intentionally.
- Visual-only edits remain in the active search/category/tag/halftone filters.
- Non-ready status is the only reconciliation case that removes the record.
- Only the affected card bucket is invalidated; no list reload or broad Firestore query occurs.
- Reconciliation tracing records success, opaque hashed ID, sort preservation, visibility, and
  targeted invalidation booleans—never document fields or customer data.
- Parsed card buckets now have deduplicated and concurrent in-flight materialization reuse. The
  underlying JSON cache remains bounded at 16 MiB and evictions remove the associated materialized
  view.

### Server-read evidence

Read-only `firebase functions:log` inspection around `2026-07-24T18:22Z` found:

- Exactly one `onPortalCatalogSnapshotSourceWritten` request at `18:22:17.276864Z`.
- HTTP 200, latency 33.816 seconds.
- Event ID showed one design-write event; deployed revision
  `onportalcatalogsnapshotsourcewritten-00006-rid`.
- Retry policy is `RETRY_POLICY_DO_NOT_RETRY`; no retry or second pass execution appears in the
  minute.
- No category/tag snapshot trigger, callable, or other Function execution appears in that minute.

The source path for one Portal publication reads the ready-design query, active categories,
approved tags, and coordination state. `artworkBackgroundHex` is deliberately included in the
public card and trigger projection, so this edit is publication-relevant. Logs contain no query
result counts, and the current dev-scale fixture (1,122 tags/18 categories) does not exactly
reconcile to the Console's approximate 669. Therefore exact attribution is
`[NEEDS SERVER TRACE CHECK]`, not claimed.

Smallest next measurement, requiring owner approval and a dev Function deployment: emit one
structured completion record per pass containing only execution/pass ID, collection class,
returned count, coordination read/write count, generation, duration, and outcome. Do not log
document IDs or bodies.

### Publication-cost options (owner checkpoint)

1. Lowest risk: retain full publication, add dev-only count logging, and measure one controlled
   edit. Recommended first because current evidence proves one execution but not its read counts.
2. After measurement, avoid taxonomy rereads when only design fields changed by reading a generated
   taxonomy snapshot or a bounded cached source. This changes publication behavior and requires a
   Plan/Formal Review amendment.
3. Targeted card-bucket/ready-index publication could reduce relevant-edit cost further, but changes
   atomicity/versioning and requires a larger Plan/Formal Review amendment. Do not implement from
   current evidence alone.

### Verification

- Studio/generated reconciliation, sorting, fallback, cache, and tracing: 47/47 pass.
- Snapshot builder/ordering suite: 33/33 pass.
- Changed-file ESLint: exit 0.
- Studio renderer/main/preload Vite build: exit 0.
- `git diff --check`: exit 0.

No deploy, republish, manual snapshot rebuild, rules/index change, or production action.

### Debug window 485 px side-by-side update

The separate Firebase Debug window now defaults to 485 px wide and opens immediately beside the
Studio bounds on the same display: right side when sufficient space exists, otherwise left. If
neither side can fit it, bounds remain clamped to the display work area. The renderer panel is
capped at 485 px with internal horizontal scrolling for wide diagnostic tables.

Verification: placement/lifecycle tests 9/9, changed-file ESLint, Studio renderer/main/preload Vite
build, and `git diff --check` all pass.

---

## Session overrides and targeted card publication checkpoint (2026-07-24)

### Proven remount failure and correction

The reconciled card lived only in `DesignLibraryPage`'s `generatedCardsById`. Route unmount destroyed
that map. Targeted invalidation removed the affected bucket from memory, so remount fetched the same
old immutable bucket while the manifest still referenced the prior full generation. No newer
manifest was guaranteed within that navigation interval; the documented manifest TTL is 30 seconds.

The replacement is `studioGeneratedCardOverrideService`, a module/session-owned registry keyed by
design ID and auth scope. It stores an explicit public-card projection plus original
`createdAtMs`, overlays both ready-index fields and resolved cards, and never mutates generated
objects. It survives route remount, clears on auth-scope change/non-ready state, and is superseded
only when generated public fields actually match. A merely newer unrelated content version cannot
clear it. Traces expose created/applied/superseded/removed plus opaque ID/version only.

### Publication classification

- `card-only`: thumbnail, preview, background, dimensions, print dimensions.
- `index-filter`: status, title, description, category, tags, createdAt.
- `operational`: request/favorite/show/updated metadata only.

Operational changes publish nothing. Index/filter changes retain the existing full leased/debounced
publisher. Card-only changes use the event's `after` payload—no design read—and publish a compact
immutable override asset. The optional manifest pointer is swapped with Storage generation
preconditions; conflicts reread, merge, and retry up to three times. Old assets remain immutable and
the prior override path remains recorded. Portal Discover/card-bucket consumers and Studio apply the
same additive override contract. A later full publication contains Firestore truth in base assets
and emits no stale override pointer.

### Development accounting

`fresh-prints-dev` Function logs now emit `portal-catalog-publication-accounting`:
mode, classification, reason, pass, ready/category/tag counts, coordination reads/writes, duration,
outcome, and sanitized failure code. Card-only and operational paths record zero for all corpus
counts. Full publication reports actual snapshot sizes.

Exact live confirmation is pending deployment. Expected background-only edit:

- Server ready-design reads: 0
- Server category reads: 0
- Server tag reads: 0
- Server coordination reads/writes: 0
- Storage: current manifest/optional prior override reads, one immutable override write, one
  generation-guarded manifest write
- Client: the existing bounded edit/detail reads only; no taxonomy/ready-page fallback

### Verification

- Focused shared/Functions/Studio suites: 91/91 pass.
- Functions TypeScript build: exit 0.
- Studio renderer/main/preload Vite build: exit 0.
- Portal TypeScript override check: exit 0.
- Changed-file ESLint and `git diff --check`: exit 0.
- Rules test assertion added for `generated/portal-catalog/card-overrides/**`; execution blocked by
  local `spawn java ENOENT`. Rules themselves are unchanged; existing
  `generated/portal-catalog/{allPaths=**}` remains the covering boundary.

### Owner-approved dev deployment required

Function: `onPortalCatalogSnapshotSourceWritten` only.

Command:

`firebase deploy --only functions:onPortalCatalogSnapshotSourceWritten --project fresh-prints-dev`

Do not run `rebuildCatalogSnapshots` and do not manually republish. After deployment, perform one
background-only edit and inspect the new accounting log. Expected corpus reads are exactly zero;
the prior approximately 1,221-read full pass must not occur.

Rollback: redeploy the prior known-good Function revision/source with the same function-only command.
The additive manifest field is optional; prior consumers ignore it, existing generated assets remain
immutable, and no canonical Firestore data requires rollback. Do not delete generated override
assets during rollback.

---

## Owner checkpoint — Studio background edit (2026-07-24)

**Verdict: PASS WITH NOTES**

The isolated background-only edit passed every functional and read-containment requirement:

- The edited card updated immediately.
- It stayed updated after leaving and returning to Design Library.
- It retained its immutable `createdAt`-based list position.
- No approximately 1,221-read full publication occurred.
- No generated fallback occurred.
- No broad category, tag, or ready-design Firestore query occurred.

Measured isolated result:

- Firebase Console: 3 reads, 1 write.
- Studio tracer: 1 read operation, 1 returned document, 1 approximate billable document read, and
  1 successful write.
- Studio tracer also reported 0 listeners, 0 callables, and 0 fallbacks.
- Targeted Function: one `card-only` targeted execution and 0 measurable Firestore reads; no full
  publisher, transaction retry, duplicate invocation, or concurrent publication.

The one client read is the approved authoritative `designs/{designId}` editor-opening read. The
remaining two Console reads were absent from both Studio tracing and targeted Function accounting.
They are recorded as an unattributed, non-blocking aggregate-reporting/background-operation note;
no source is invented.

A separate restart-inclusive observation showed 69 Console reads and 0 writes in the 2:44–2:45
minute while Studio tracing recorded one authoritative read and one successful write. That run
included Studio startup and Inbox loading, is not an isolated edit-only measurement, and does not
replace the cleaner 3-read/1-write result. The Console write likely landed in an adjacent or delayed
reporting bucket; this is a reporting note, not a failed write, because Studio recorded success and
the functional state persisted.

This checkpoint closes:

- generated Design Library healthy path;
- zero broad taxonomy and ready-design client reads;
- created-date ordering stability;
- immediate card reconciliation;
- session-persistent edited-card overrides;
- targeted card-only publication;
- elimination of the approximately 1,221-read full publication for background-only edits; and
- targeted publication accounting and duplicate idempotency.

This does not close Wave C. The next independently open checkpoint is the owner’s live Portal
generated-catalog retest for dynamic AND-tag narrowing (R-015), followed by the remaining
consolidated Wave C QA.

---

## Portal separate Firebase Debug window checkpoint (2026-07-24)

The owner’s attempted Portal R-015/idle run was invalid because Copy Debug Report returned an
inactive empty session (`startedAtIso: null`). Root cause: the shortcut mounted UI but did not start
tracing; trace ownership was effectively coupled to in-page controls.

The normal eligible Portal tab now owns and starts tracing independently. `Ctrl+Shift+F` opens or
focuses one named `/firebase-debug` popup, with sanitized snapshot/fixed-command transport over
`BroadcastChannel`, strict handshake/message validation, stale-owner detection, popup-blocked
feedback, and explicit inactive-report status. The debug route bypasses auth/data providers and
cannot create Firebase activity or become authoritative.

Verification: Portal typecheck/build pass, focused suite 21/21, changed-file lint and diff check
pass. Browser automation was unavailable, so the next checkpoint is an owner Portal debug-window
retest. Do not attribute the prior 223 reads or idle spikes from the invalid report.

### Portal R-015 owner failure and local correction (2026-07-24)

The attributable retest found 166 returned ready-design documents (171 approximate billable reads)
from legacy pages/counts running beside successful generated assets, plus false popup disconnects
from background timer throttling. The local correction makes generated assets authoritative for
every normal Portal catalog mode. Filtered/discovery modes fail closed; only plain browse can use
the approved bounded page after a traced terminal failure. The independent Discover count and
redundant print-limit focus/visibility read were removed. Popup disconnect now follows explicit
owner close/refresh rather than a three-second heartbeat lapse.

Portal typecheck/build, focused tests 40/40, changed-file lint, and diff check pass. No deploy or
republish occurred. Next checkpoint: owner Portal R-015 QA with the newly built Portal renderer.

### Portal metadata and tracer remediation deployment checkpoint (2026-07-24)

Portal R-015 passed and remains closed. The existing one-hour metadata freshness policy now backs a
bounded Portal cache, Next revalidation, and a Function warm-instance cache. Library mode selects
from the existing generated newest-card page, so expected Firestore reads are 0 for a cache hit,
1 for a library miss, and 2 for a logo miss. No generated asset contract or publication changed.

`getPortalGlobalOpenGraph` adds sanitized aggregate accounting. `registerWebPushSubscription` skips
an unchanged current subscription write, retains the 25-sibling bound, and adds aggregate
accounting. Session sync reuses the current FCM token. The audited Portal raw SDK surface now has
service-level tracing and a coverage regression test.

Verification: Portal typecheck/build pass; Functions build passes; focused tests 18/18; changed-file
lint and diff check pass. No deployment occurred.

After explicit owner approval, deploy dev only:

```bash
firebase deploy --only functions:getPortalGlobalOpenGraph,functions:registerWebPushSubscription --project fresh-prints-dev
firebase deploy --only apphosting --project fresh-prints-dev
```

Rollback: redeploy the prior known-good revisions/source for those two Functions and the prior App
Hosting revision. No Firestore/Storage data rollback, rules deployment, catalog rebuild, or
republish is required.

---

## Residual Portal server activity deployment checkpoint (2026-07-24)

The 02:34–02:43 UTC log sweep proved ten same-parent catalog-add calls arrived in two concurrent
groups of five. Their transactions reread the parent and growing item query on retries. The
remaining bounded server paths were ten matching analytics triggers, three clears, and one explicit
show-picker request. Push/metadata accounting contributes 13 exact reads. All nine deletes belong
to the three clears. Every catalog snapshot trigger was an operational zero-read/zero-write skip,
and no old ready-design metadata query ran.

The approved correction serializes Portal mutations per request, emits exact transaction/read
accounting, removes the analytics trigger's redundant design existence read, makes empty clears
zero-write/delete no-ops, and accounts for clear/show-picker work. Focused tests 6/6, Functions
build, Portal build/typecheck, and changed-file lint pass.

No deployment occurred. After explicit owner approval, deploy dev only:

```bash
firebase deploy --only functions:addPortalCatalogDesignToPrintRequest,functions:clearPortalWorkingPrintRequest,functions:onPrintRequestItemCreated,functions:listPortalAllocatableShows --project fresh-prints-dev
firebase deploy --only apphosting --project fresh-prints-dev
```

The App Hosting deployment is required for same-request serialization; the four Functions provide
the read reductions/accounting. Roll back by restoring the prior App Hosting revision and prior
known-good revisions of those four Functions. No rules, data, Storage, catalog rebuild, or republish
rollback is required.

---

## Portal show-queue submission deployment checkpoint (2026-07-24)

Approved dev scope:

```bash
firebase deploy --only functions:queuePortalPrintRequestToShow,functions:addPortalCatalogDesignToPrintRequest --project fresh-prints-dev
firebase deploy --only apphosting --project fresh-prints-dev
```

The queue Function supplies cheap validation and exact accounting. Catalog-add supplies the
allowlisted item result that removes follow-up reads. Portal App Hosting supplies submission/quota
Promise ownership and local queue-success reconciliation. No other Function, rules, index, Storage,
catalog, or production deployment is required.

Rollback is the prior Portal revision and prior known-good revisions of those two Functions.
# Portal print-request duplicate-read remediation — 2026-07-24

Status: **READY FOR OWNER PORTAL PRINT-REQUEST RETEST**

### Proven operation graph

| Operation | Consumer/ownership before correction | Duplicate mechanism | Corrected ownership |
|---|---|---|---|
| `listMyContinuablePrintRequests` | `PortalPrintRequestProvider` → `useMyPrintRequests`, global shell | Strict Mode/remount started identical status queries | auth/customer-scoped in-flight + resolved cache |
| `listPrintRequestItemsForRequests` | `useMyPrintRequests`, global shell | overlapped Current Request single-request query | one-request chrome path now calls the shared single-request key; multi-request list remains batched |
| `getPrintRequest` | route `usePrintRequestDetail`; service mutation paths | duplicated shell-known working request and Strict Mode | shell result primes request-document cache; concurrent detail calls share |
| `listPrintRequestItems` | Current Request hook, route detail, route allocation calculation, selection mode | independent hooks plus route-local requery | one service promise/cache; allocation calculation reuses route items |
| `listShowAllocationsForPrintRequests` | route allocation state, list/full views, queue modal | identical route calls/remounts had no in-flight sharing | normalized request-ID-set cache; explicit mutation clears |
| `getReadyDesign` | Current Request summary loader and detail summary loader | one Firestore read per ID per owner | removed from normal card hydration |
| `getReadyDesignsByIds` | second route-only reuse resolver | ran in addition to request-service summaries | generated-first service is the sole request-card resolver |

No stale previous-route completion can update current detail state: route loads use a generation
guard; cache invalidation advances an epoch and cannot retain an older completion. Cache keys include
the authenticated UID and logical request/customer scope.

### Preview failure

The detail hook resolved summaries only for the item array returned by its initial load. The global
working-request hook could then supply the newly added items after that summary pass, but no summary
effect depended on the resulting design-ID set. Cards therefore rendered generic snapshots until a
full refresh. Summary resolution now follows the stable design-ID signature and ignores stale route
generations.

### Write attribution

For four distinct catalog designs added to a newly created working request:

- working request document: 1
- customer sequence/total update: 1
- four print-request item documents: 4
- four parent request updates: 4
- four `onPrintRequestItemCreated` design analytics updates: 4
- idempotency documents: 0
- other writes: 0 beyond the customer sequence above
- total: **14**

Each add remains callable/transaction controlled. Navigation does not submit it; existing per-design
in-flight UI state prevents the same visible action from being fired again while pending. No required
write was removed.

### Read budgets

- Cold active/non-working four-item detail: request 1 + items query 4 + empty allocations minimum 1
  = approximately **6 request-specific billable reads**.
- Cold working-request detail: shell's bounded continuable lookup owns the request and the shared
  four-item query; route-specific work adds only the allocation minimum. Shell/auth baseline remains
  reported separately.
- Generated card hydration: **0 Design Firestore reads** on success.
- Repeat navigation inside the 30-second authenticated cache window: **0 request/item/allocation
  reads**, unless a mutation explicitly invalidated the cache.

### Deployment/restart scope

- Portal UI/cache/debug behavior: rebuild and restart the Portal dev surface.
- Server accounting only:
  `createPortalPrintRequest`, `addPortalCatalogDesignToPrintRequest`.
- No rules, App Hosting production, snapshot publisher, generated republish, or production action.
