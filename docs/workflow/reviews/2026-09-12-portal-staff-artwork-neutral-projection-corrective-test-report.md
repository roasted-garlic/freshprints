# Staff Artwork Neutral Projection Corrective — Test Report

Date: 2026-09-12
Status: local Implement/Test evidence; DEV cutover pending safe population mechanism.

Passed:

- `npm run build` in `functions` (Functions TypeScript build).
- `npm run typecheck` in `apps/portal`.
- Targeted ESLint for changed Portal/shared/Functions modules.
- `npx tsx --test packages/shared/src/utils/portalPrintRequestItemProjection.test.ts functions/src/updatePortalStaffArtworkPrintRequestItemSize.contract.test.ts functions/src/onPrintRequestItemPortalProjectionWritten.contract.test.ts` — 4/4.
- `npx tsx --test packages/shared/src/utils/printRequestItemSource.test.ts` — 8/8.
- `npx tsx --test tests/firebase/staffArtwork.rules.contract.test.ts` — 2/2, including Portal
  service/detail/card/drawer/Queue-to-Show privacy assertions.
- Staff Artwork Firestore emulator suite — 6/6, including canonical/Staff Artwork customer denial, projection read, and direct item-update denial.
- Staff Artwork Storage emulator suite — 1/1, customer denial and staff access.
- `git diff --check`.

The Portal production build was attempted with `npm run build` in `apps/portal` but could not open the
existing `apps/portal/.next/trace` file (`EPERM`). Portal typecheck and targeted lint pass; no generated
`.next` output was removed and the environment lock was not bypassed.

The existing repository-wide Rules expression-budget baseline remains documented; the focused Staff Artwork suites pass with the same emulator diagnostics seen in earlier work.

Not run: DEV deployment, data population/backfill, Owner DEV QA, Signoff, staging, commit, push, freeze, or production action. The reviewed plan does not provide an executable bounded population mechanism for existing rows, so cutover must stop until that mechanism is specified/approved.
