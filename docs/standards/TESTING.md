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
   - **Designs + prints** — designs + print requests + sequences (extra catalog confirm).
   - **All (-) Designs** — all ops targets except Designs (keeps catalog docs + design Storage; includes upcoming shows, uploads, Etsy, custom requests, etc.).
3. To wipe the catalog, use **Designs + prints** or select **Designs** → extra confirm modal → type `WIPE TEST DATA`.
4. Type `WIPE TEST DATA` to confirm any wipe.
5. Reload Studio and Portal pages so lists refresh; sequences restart at `…-CR001` / `…-IR001`.
6. Wipe of print requests / show-queue attachments / upcoming shows also clears `staffInboxAcks` (inbox Done history).
7. Print-request or attachments-only wipe also zeros each kept upcoming show’s `allocatedQuantity`, resets queue `productionStatus` from `full` / `printing` / `fully_printed` / `completed` → `open`, and clears print timer fields so Show Queue looks empty and allocatable again (`archived` / `canceled` are left alone).

### Portal Design Library discovery

1. Deploy `onPrintRequestItemCreated` so Portal/Studio item creates update `requestCount` / `lastRequestedAt`.
2. Browse `/catalog`: New This Week / Popular / Recently Requested rails; no My requests header button.
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

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-07-18 | Test Data Reset presets + short labels; Custom/Etsy wipe expand side leftovers (incl. overlays) |
| 2026-07-18 | Test Data Reset preset: All (-) Designs |
| 2026-07-10 | Staff inbox acks in Firestore; wipe clears staffInboxAcks |
| 2026-07-10 | Test Data Reset page + wipeOperationalTestData callable |
| 2026-07-08 | Phase 8 closeout — Portal commands, monorepo test paths |
| 2026-06-24 | Initial Fresh Prints testing doc (intake) |
