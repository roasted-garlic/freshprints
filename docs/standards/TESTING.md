# Testing

> Fresh Prints testing expectations and commands.

---

## Overview

Fresh Prints is a **two-app monorepo**: Fresh Prints Studio (Electron + Vite + React) and Fresh Prints Portal (Next.js), with shared packages and Firebase Cloud Functions. Run applicable checks before signoff on code changes.

---

## Required Checks Before Signoff

| Check | Command | When required |
|-------|---------|---------------|
| Lint | `npm run lint` | Code or config changes affecting TS/TSX |
| Studio typecheck | `npx tsc --noEmit` (from `apps/studio/`) | Studio/shared type changes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | Portal changes |
| Functions build | `npm --prefix functions run build` | Functions changes |
| Studio Vite build | `npx vite build` (from `apps/studio/`) | Studio build-affecting changes |
| Portal build | `npm run build:portal` | Portal release or build changes |
| Studio installer | `npm run build:studio` | Electron packaging changes |
| Unit tests | `npx tsx --test` (see below) | Logic changes with tests |

**Never claim tests passed unless they were actually run.**

---

## Commands Reference

### Lint

```bash
npm run lint
```

ESLint over TypeScript and TSX in Studio, Portal, and shared packages.

### Typecheck

```bash
npm --prefix apps/studio exec tsc -- --noEmit
npm run typecheck --workspace @fresh-prints/portal
npm --prefix functions run build
```

### Full unit test sweep

```bash
npx tsx --test packages/shared/src/**/*.test.ts apps/studio/src/**/*.test.ts apps/studio/electron/**/*.test.ts apps/portal/**/*.test.ts
```

On Windows PowerShell, run tests per directory or use the repo's documented sweep pattern from workflow state (82 test files as of 2026-07-08, post symmetric-apps-monorepo move).

There is **no** root `npm test` script — invoke `npx tsx --test` explicitly.

### Firestore read diagnostics (development only)

The Studio and Portal client tracer is disabled by default. In the browser or Electron renderer
console, enable it and reload:

```js
localStorage.setItem('FP_FIRESTORE_TRACE', '1')
```

Inspect the safe metadata-only trace with:

```js
window.__fpFirestoreTrace.summary()
window.__fpFirestoreTrace.dump()
```

The trace includes query signatures, route/source ownership, trigger reasons, listener lifecycle,
one-shot counts, and returned-document totals. It must never include document bodies, customer
data, prompts, tokens, or secrets. Disable it with
`localStorage.removeItem('FP_FIRESTORE_TRACE')` and reload.

Focused regression command:

```bash
npx tsx --test packages/shared/src/utils/firestoreUsageTrace.test.ts apps/studio/src/renderer/src/features/firebase/utils/createSharedFirestoreSubscription.test.ts
```

AI enrichment reference-read diagnostics are structured Functions logs only. Correlate
`pipeline.invocation.*`, `pipeline.terminal`, `reference_cache.*`, and `reference_query.*` by
`invocationId`; do not add Firestore reads solely to produce diagnostics.

### Etsy recommendations (Phase 9A)

```bash
npx tsx --test packages/shared/src/utils/etsyRecommendation*.test.ts
npx tsx --test functions/src/lib/etsy/*.test.ts
npm --prefix functions run build
npm run typecheck --workspace @fresh-prints/portal
npm run build:portal
```

Do not make live Etsy API calls from unit tests. Inject a mock Etsy client.

### Provider-neutral email and proof notices

```bash
npx tsx --test packages/shared/src/constants/emailProviders.constants.test.ts functions/src/lib/email/email.test.ts apps/studio/src/renderer/src/features/permissions/services/permissionService.emailProviders.test.ts
npm --prefix functions run build
npx vite build
```

Run the Vite build from `apps/studio`. Automated tests inject a mock transport and must never send
live email. Before signoff, also run targeted Assisted Creation tests, rules alignment/emulator
checks, lint, and the applicable Studio typecheck. Live Resend delivery, first/revised proof,
invitation regression, owner-only Settings visibility, and CTA routing require a manual checkpoint.

```bash
npx tsx --test functions/src/lib/customerUpload*.test.ts functions/src/lib/confirmCustomerUpload*.test.ts packages/shared/src/utils/printAssetResolution.test.ts packages/shared/src/constants/storageRulesAlignment.test.ts
npm --prefix functions run build
npm run typecheck --workspace @fresh-prints/portal
npm run build:portal
```

### Portal public browse (#13)

```bash
npx tsx --test apps/portal/features/auth/utils/*.test.ts packages/shared/src/constants/storageRulesAlignment.test.ts packages/shared/src/constants/firestoreRulesPublicCatalogAlignment.test.ts
npm run typecheck --workspace @fresh-prints/portal
```

There is **no** `@firebase/rules-unit-testing` suite yet. After **human-approved** rules deploy to a confirmed project id (`fresh-prints-dev` first), record a manual permission matrix in the Test report: guest read ready design / active category / approved tag / ready thumbnail+preview **allow**; non-ready design, originals, upcomingShows, and guest writes **deny**. Manual UI QA: guest catalog browse + login CTAs + signed-in regression.

Backend smoke (dev only):

```bash
node functions/scripts/smoke-customer-upload-subphase-b.mjs
node functions/scripts/smoke-customer-upload-subphase-c.mjs
node functions/scripts/smoke-customer-upload-subphase-d.mjs
node functions/scripts/smoke-customer-upload-subphase-e.mjs
node functions/scripts/smoke-customer-upload-subphase-f.mjs
node functions/scripts/smoke-customer-upload-subphase-g.mjs

# Abandoned cleanup (owner/admin; optional dryRun)
# Via Studio callable or Firebase console test — cleanupAbandonedCustomerUploads

# Operational wipe includes target customerUploads (fresh-prints-dev allowlist only)
```

Portal upload UI: `apps/portal/features/customer-uploads/`. After Sub-phase D, upload-backed requests can queue to show; Studio gang/export resolve upload production PNGs.

### Build

```bash
npm run build:studio    # tsc + vite + electron-builder
npm run build:portal    # Next.js production build
```

### Dev (manual testing)

```bash
npm run dev            # Studio + Portal together
npm run dev:studio     # Electron + Vite only (Sharp derivative self-test is on-demand via IPC, not automatic on cold start)
npm run dev:portal     # Next.js on port 3100 only
```

---

## Manual Testing

UI, Electron IPC, Firebase integration, and visual design often require manual verification. Use `.cursor/skills/manual-test-checkpoint` and record results in workflow signoff docs.

Setup guides: `docs/workflow/setup/`

### Test Data Reset (dev only)

Studio sidebar **Test Data** (`/test-data-reset`) — **owner** on `fresh-prints-dev` only, and only in **development Studio builds** (`npm run dev`). Production Studio packages do not expose the UI. Admins cannot wipe.

1. Deploy `wipeOperationalTestData` if not already deployed (redeploy after wipe-expansion changes).
2. Prefer presets for common intents:
   - **Print Requests** — `printRequests` + sequences + design stats (keeps upcoming shows; clears staff inbox acks).
   - **Etsy** — search docs + rate limits + suggestion overlays + pending suggestion requests + inert leftovers (`etsyRecommendationConfig`, `etsyWebsiteSearchCache`, `customRequestEtsySearchRateLimits`).
   - **Custom Requests** — Assisted Creation docs/Storage + `assistedCreationUpdateAcks`, `customerNotifications`, `emailDeliveryJobs`, legacy `customRequests`.
   - **Customer Uploads** — upload docs/ops + `customer-uploads/` Storage.
   - **Legacy print-limit counters** — optional cleanup of `printRequestDesignDailyLimits`. These
     counters are no longer written or enforced; deleting them does not change current limit `L`,
     customer room, or show capacity. Print Requests, Select all, and All (-) Designs continue to
     include this cleanup target.
   - **AI Processing** — selective delete of AI Processing page designs only (`aiProcessingDesigns`: imported/processing pending, needs review, rejected) + those designs’ Storage; **keeps** ready Design Library and archived designs. Does not require print-request wipe or catalog confirm modal.
   - **Designs + prints** — designs + print requests + sequences (extra catalog confirm). Mutually exclusive with AI Processing in the UI toggle.
   - **All (-) Designs** — all ops targets except full Designs (includes AI Processing selective wipe; keeps ready catalog docs + full design Storage prefixes).
3. To wipe the catalog, use **Designs + prints** or select **Designs** → extra confirm modal → type `WIPE TEST DATA`.
4. Type `WIPE TEST DATA` to confirm any wipe.
5. Reload Studio and Portal pages so lists refresh; sequences restart at `…-CR001` / `…-IR001`.
6. Wipe of print requests / show-queue attachments / upcoming shows also clears `staffInboxAcks` (inbox Done history).
7. Print-request or attachments-only wipe also zeros each kept upcoming show’s `allocatedQuantity`, resets queue `productionStatus` from `full` / `printing` / `fully_printed` / `completed` → `open`, and clears print timer fields so Show Queue looks empty and allocatable again (`archived` / `canceled` are left alone).

### Portal Design Library discovery

1. Deploy `onPrintRequestItemCreated` so Portal/Studio item creates update `requestCount` / `lastRequestedAt` (Popular).
2. Deploy `onShowAllocationCreated` so queue-to-show / Studio Add to Show sets `lastAddedToShowAt` / `showAddCount` (Recently Requested).
3. Browse `/catalog`: New This Week / Popular / Recently Requested rails; no My requests header button.
3. View all → `?discover=new|popular|recent` hides rails and sorts/filters the grid; Back to discovery clears it.
4. Selection mode shows the same rails above the selection grid.

### Staff inbox (Firestore acks)

1. Deploy `firestore:rules` (and `wipeOperationalTestData` if wipe expansion not yet deployed).
2. Mark an Open item Done → appears under Done; second Studio session for the same user should match.
3. Wipe print-request stack → Done list clears; refill a portal show to full → Open + toast again.

---

## CI Expectations

`[TBD — document when CI is configured]`

Local commands should mirror CI where possible.

### Wave C snapshot and rules verification

```bash
npx tsx --test functions/src/catalogSnapshots/snapshotBuilders.test.ts packages/shared/src/catalog-snapshots/catalogSnapshot.parsers.test.ts apps/portal/features/catalog/services/catalogDesignByIdCache.test.ts apps/portal/features/print-requests/utils/portalPrintProgressPolling.test.ts
npm run build --prefix functions
npm run typecheck --workspace @fresh-prints/portal
npm run test:rules
```

`npm run test:rules` uses the official `@firebase/rules-unit-testing` harness and Firestore/Storage
emulators. Java must be installed and on `PATH`; inability to spawn Java is an environment failure,
not a rules pass. Snapshot tests must cover projection parity/no AI guidance in client output,
schema rejection, deterministic versions, asset budgets, manifest-last behavior, bounded generated
pages, cache dedupe/rejection eviction/invalidation, and polling stop/backoff.

**Java version:** Firebase CLI 15.x requires **Java 21 or newer** to run the emulators
(`firebase-tools no longer supports Java version before 21` on older JDKs). If a machine has no
system Java and no admin rights are available, a user-scoped portable JDK works without any system
changes: download an Eclipse Temurin 21 build for the platform, extract it to a user-writable
directory (e.g. `%USERPROFILE%\.local-jdk` on Windows), and set `JAVA_HOME`/prepend `PATH` for the
current shell only — no installer, no registry changes, no elevation. Confirm with `java -version`
before running `npm run test:rules`.

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-07-29 | Test Data Reset: relabeled obsolete Cap A data as optional Legacy print-limit counters cleanup; active limit `L`, customer room, and show capacity are unaffected |
| 2026-07-23 | `npm run test:rules` requires Java 21+ (Firebase CLI 15.x); documented user-scoped portable-JDK setup with no admin rights |
| 2026-07-21 | Test Data Reset: AI Processing selective designs wipe preset/target |
| 2026-07-18 | Test Data Reset presets + short labels; Custom/Etsy wipe expand side leftovers (incl. overlays) |
| 2026-07-18 | Test Data Reset preset: All (-) Designs |
| 2026-07-10 | Staff inbox acks in Firestore; wipe clears staffInboxAcks |
| 2026-07-10 | Test Data Reset page + wipeOperationalTestData callable |
| 2026-07-08 | Phase 8 closeout — Portal commands, monorepo test paths |
| 2026-06-24 | Initial Fresh Prints testing doc (intake) |
