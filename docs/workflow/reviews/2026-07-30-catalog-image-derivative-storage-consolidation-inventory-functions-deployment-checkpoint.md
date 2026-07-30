# Deployment Checkpoint: `inventoryCatalogImageStorage`

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Goal | `catalog-image-derivative-storage-consolidation` (Goal #12) |
| Status | **Deployed to `fresh-prints-dev`.** Execution requires an owner/admin-authenticated call — see "Actual Deployment Result" and "Running the Inventory" below. |
| Callable | `inventoryCatalogImageStorage` |
| Source file | `functions/src/inventoryCatalogImageStorage.ts` |

---

## Actual Deployment Result

| Item | Value |
|---|---|
| Command 1 | `firebase use fresh-prints-dev` — exit 0 |
| Command 2 | `firebase deploy --only functions:inventoryCatalogImageStorage` — exit 0 |
| Firebase project targeted | `fresh-prints-dev` |
| Result | `functions[inventoryCatalogImageStorage(us-central1)] Successful create operation.` |
| Region / runtime / generation | us-central1, Node.js 20, 2nd Gen |
| Deployment timestamp | 2026-07-30T04:13:23Z (UTC) |
| Scope confirmation | Only `inventoryCatalogImageStorage` was deployed — confirmed via the `--only functions:inventoryCatalogImageStorage` flag and the CLI's own single-function "Successful create operation" output naming exactly that function and no other |
| Other resources touched | None — no Storage Rules, Firestore Rules/indexes, App Hosting, or other Functions were deployed; no migration/backfill ran; no Storage object was touched; production (`fresh-prints-prod`) was never targeted |

Exported-name verification performed before deployment: confirmed `export const
inventoryCatalogImageStorage = onCall(...)` in `functions/src/inventoryCatalogImageStorage.ts:93`
and `export { inventoryCatalogImageStorage } from "./inventoryCatalogImageStorage";` in
`functions/src/index.ts:15` — names match exactly, deployment proceeded.

---

## Running the Inventory (owner/admin authentication required)

`inventoryCatalogImageStorage` is an `onCall` Cloud Function gated by `request.auth` plus a
Firestore `users/{uid}` role check (`owner`/`admin` only) — this is Firebase Auth-level
authentication from a real signed-in staff account, entirely separate from `firebase` CLI project
login. No such credential exists in the environment that prepared this checkpoint, so the callable
could not be invoked from here. **The owner (or any signed-in owner/admin Studio session) can run
it directly.**

### Option A — Studio browser DevTools console (fastest, no code change)

1. Open Fresh Prints Studio, signed in as an owner or admin, pointed at `fresh-prints-dev`.
2. Open DevTools (Electron renderer) → Console.
3. Paste and run:

```js
const { getFunctions, httpsCallable } = await import("firebase/functions");
const { getApps } = await import("firebase/app");
const functions = getFunctions(getApps()[0]);
const call = httpsCallable(functions, "inventoryCatalogImageStorage");
const result = await call({});
console.log(JSON.stringify(result.data, null, 2));
copy(JSON.stringify(result.data, null, 2)); // copies the full report to your clipboard
```

4. Paste the resulting JSON back for analysis, or save it to a file and share the path.

This uses the exact same `httpsCallable`/`getFunctions` pattern already used by every other Studio
admin callable (e.g. `purgeArchivedDesignAssetsService.ts`), just invoked ad hoc from the console
instead of through a dedicated UI button — no new Studio UI was built for this, consistent with
this checkpoint's read-only, no-new-permanent-surface scope.

### Option B — dedicated Studio dev-console button (not built in this checkpoint)

A small Settings/Dev-only button following `PurgeArchivedDesignAssetsDialog.tsx`'s exact pattern
could be added in a future Implement pass if repeated re-runs become desirable — out of scope for
this checkpoint, which only proposes/deploys the callable itself.

---

## Purpose

The Plan/Review/checkpoint work cannot report real `fresh-prints-dev` Storage inventory totals
because this development environment has no Google Application Default Credentials configured
(confirmed by a direct failed `firebase-admin` connection attempt). This artifact proposes
deploying **only** the already-built, already-unit-tested, dry-run-only inventory callable so the
owner (or any authenticated owner/admin session) can run it directly against real data. **No other
Function, Rule, or asset is proposed for deployment.**

---

## Independent Review of `inventoryCatalogImageStorage`

Conducted as a focused, line-by-line review of the actual current source
(`functions/src/inventoryCatalogImageStorage.ts`) and its pure dependency
(`packages/shared/src/utils/catalogImageStorageInventory.ts`), not a description of intent.

### 1. Authorization — confirmed owner/staff restricted

```ts
if (!request.auth?.uid) {
  throw unauthenticated();
}
const caller = await loadCallerProfile(request.auth.uid);
assertStaffCaller(caller);   // requires isActive + role in [owner, admin, helper]
assertOwnerAdmin(caller);    // further narrows to role in [owner, admin] only
```

Confirmed: an unauthenticated request, an inactive staff account, a `helper`-role account, or any
`customer`-role account (Portal users) are all rejected before any Storage or Firestore read
occurs. This exact double-gate sequence (`assertStaffCaller` then a narrower
`assertOwnerAdmin`/`assertOwnerCaller`) is the established pattern in this codebase, confirmed
identical to `purgeIdleCustomerUploadFullSize.ts` and `purgeArchivedDesignAssets.ts`.

### 2. Read-only — confirmed, no write operation exists in the file

A full-file grep for every Firestore/Storage write primitive
(`.delete(`, `.update(`, `.set(`, `.create(`, `.copy(`, `.save(`, `.write(`, `FieldValue`) returned
**zero matches**. The callable only calls `bucket.getFiles()` (metadata listing) and
`collection().get()` (Firestore reads). This is structurally impossible to make write anything
without adding new code — there is no code path that could accidentally mutate data.

### 3. Confirmed owner/staff restricted

See #1 — `role in [owner, admin]` only, with an active-account check. No path exists for a
`customer` or `helper` account to reach the Storage/Firestore read logic.

### 4. Confirmed read-only

See #2.

### 5. Confirmed no delete, update, migration, or backfill capability

No delete/update code exists in this file at all (see #2). There is no `dryRun: false` branch —
unlike `purgeIdleCustomerUploadFullSize.ts`/`purgeArchivedDesignAssets.ts`, which accept a
`dryRun` flag and have a real-delete branch guarded by it, this callable has **no delete branch to
guard** — the response type itself is `{ dryRun: true; ... }`, a literal `true`, not a boolean,
making a future accidental "flip dryRun to false" refactor a type error rather than a silent
behavior change.

### 6. Confirmed no exposure of private download URLs, artwork content, secrets, or customer PII

- **No signed/download URL generation**: grep for `getSignedUrl`, `getDownloadURL`, `publicUrl`,
  `makePublic` returned zero matches.
- **No artwork bytes downloaded**: `bucket.getFiles()` returns only object metadata (name, size,
  timestamps) — the file's own doc comment states this explicitly ("Metadata-only listing (no
  bytes downloaded)"), and no `.download()`/`createReadStream()` call exists anywhere in the file.
- **No PII fields read or returned**: the Firestore projections built from `designs` and
  `customerUploads` docs include only `designId`/`uploadId` (opaque generated Firestore document
  IDs, not customer identifiers), `status`, Storage **paths** (already staff-visible per
  `storage.rules`'s existing `isStaff()` read grants on `/originals/`, `/thumbnails/`,
  `/previews/`), byte sizes, and timestamps. No `email`, `customerId`, `customerUid`,
  `displayName`, `title`, `description`, or `originalFilename` field is read or included in the
  response at any point (confirmed via grep across both files — zero matches for any of these
  field names).
- **Storage paths are not sensitive in themselves**: they follow the canonical
  `{designId}.{ext}` naming convention with no embedded customer information, and staff already
  have read access to the full contents of these paths per existing Storage Rules.

### Additional finding surfaced during this review (fixed, not merely noted)

The original draft of this callable queried
`customerUploads.where("promotedDesignId", "!=", null)` to find promotion records for cool-off
cross-referencing. Independent review found this was a **new query pattern with no precedent in
this codebase** — every other callable that needs this information
(`promoteCustomerUploadToAiReview.ts`, `excludeCustomerUploadFromCatalog.ts`,
`restoreCustomerUploadCatalogEligibility.ts`, `purgePromotedDonationFullSize.ts`) instead queries
an equality filter on `catalogReviewStatus == "sent_to_ai_review"` (or reads the full doc and
checks `typeof data.promotedDesignId === "string"` in application code) — never a `!=` filter on
`promotedDesignId` itself. A Firestore `!=` filter silently **excludes documents where the field is
absent entirely** (as opposed to explicitly stored as `null`), which would have made the cool-off
scan quietly incomplete for any upload document that never had the field written at all (a
plausible state for very old/legacy customer-upload documents). **This has been corrected** to
mirror `purgePromotedDonationFullSize.ts`'s exact established query
(`catalogReviewStatus == "sent_to_ai_review"`) before this deployment proposal was written — the
version described in this checkpoint reflects the corrected code, re-verified via
`npm run build` (exit 0) and the full 14-test `catalogImageStorageInventory.test.ts` suite
(unaffected by this shell-level fix, since the pure classification logic never changed) still
passing.

---

## Post-Review Addition (same checkpoint, before this proposal)

During preparation of this checkpoint, the callable's scanned families were found to be missing
`/generated/catalog-reference/**` and `/generated/portal-catalog/**` — required by the owner's
inventory report shape. Added: metadata-only listing (no bytes downloaded, same pattern as the
existing per-design families) of both prefixes, reported via a new `generatedAssetTotals` field
aggregated by prefix (object count / total bytes / average bytes), deliberately **not** run
through the per-design referenced/orphaned/purged classifier since generated manifests have no
single `designId` to cross-reference. Two new unit tests added; full 16-test suite passing;
`npm run build` and Portal typecheck re-verified at exit 0 after this addition.

## Exact Files Included in the Proposed Deployment

Deploying `functions:inventoryCatalogImageStorage` bundles (per Firebase Functions' full-codebase
predeploy build, exactly as documented in Goal #11's own deployment checkpoint precedent) the
entire compiled `functions/src` + `packages/shared/src` tree, but **only creates/updates the one
named Cloud Function** — no other already-deployed function's live code is touched. The specific
source files this callable's own logic depends on:

- `functions/src/inventoryCatalogImageStorage.ts` (the callable itself)
- `packages/shared/src/utils/catalogImageStorageInventory.ts` (pure classification logic)
- `packages/shared/src/constants/design/designStoragePaths.ts` (`DESIGN_STORAGE_ROOTS`)
- `packages/shared/src/constants/customerUpload/customerUploadCollections.constants.ts`
  (`CUSTOMER_UPLOAD_COLLECTIONS`)
- `functions/src/lib/admin.ts`, `functions/src/lib/caller.ts`, `functions/src/lib/errors.ts`
  (shared infrastructure, long-stable, used by many existing deployed callables already)
- `functions/src/index.ts` (adds the new export line only)

Consistent with this repository's established pre-deployment conflict-check practice (see Goal
#11's deployment checkpoint), this dependency closure was traced and confirmed to include no
unrelated pre-existing uncommitted files.

---

## Deployment Command Used (executed, see "Actual Deployment Result" above)

```
firebase use fresh-prints-dev
firebase deploy --only functions:inventoryCatalogImageStorage
```

## Scope Restrictions (honored)

- Deployed **only** `functions:inventoryCatalogImageStorage` — confirmed via CLI output.
- No other Function was deployed.
- No Storage Rules were deployed.
- No Firestore Rules or indexes were deployed.
- No App Hosting was deployed.
- Production (`fresh-prints-prod`) was never targeted.

---

## Status

**Deployed to `fresh-prints-dev` per explicit owner approval, 2026-07-30T04:13:23Z.** Only
`inventoryCatalogImageStorage` was created; no other resource was touched. Actual execution of the
inventory (a real invocation against live `fresh-prints-dev` Storage/Firestore) requires an
owner/admin-authenticated call from Studio — see "Running the Inventory" above. No delete/update/
migration capability exists in this callable at any point past or present.
