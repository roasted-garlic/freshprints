# Coordinated Production Portal Build-Input Manifest

## Authoritative final parent M0 Portal input reconciliation — 2026-09-12

The reviewed dirty snapshot contains 388 Portal app/runtime/config/public inputs + 345 shared + 9
show-picker + 5 common/workspace manifests = **747**; digest
`cf8c36d25807fa1195744a9952b1e65d3e923fbaabd6e4df25ab72025db62f2a`. Current status paths under
`apps/portal` are 29 (21 runtime, 8 tests). The source uses projection-preferred
`portalPrintRequestItems` dual-read with bounded canonical fallback; build-003 remains a coupled
rollback anchor after final Rules tightening. No build, App Hosting publication, traffic change, or
production action occurred.

## Authoritative corrected build boundary — 2026-09-12

The prior 725-file manifest was both stale and incomplete: its documented `apps/portal/**` method
omitted nine checked-in public assets, and it omitted the direct `@fresh-prints/show-picker`
workspace dependency. The corrected dirty-snapshot method includes all non-test, non-ignored Portal
runtime/config/public inputs; `packages/shared/src/**`; `packages/show-picker/src/**`; root
`package.json`, `package-lock.json`, and `firebase.json`; and both workspace package manifests.

| Input class | Files |
|---|---:|
| Portal app/runtime/config/public | 388 |
| Shared runtime | 345 |
| Show Picker runtime | 9 |
| Common/workspace manifests | 5 |
| **Total** | **747** |

Digest (sorted path + NUL + raw bytes + NUL):
`cf8c36d25807fa1195744a9952b1e65d3e923fbaabd6e4df25ab72025db62f2a`.

There are 27 dirty Portal status paths (20 runtime, 7 tests). The accepted Staff Artwork projection
contract is enriched preview/title/DPI through `portalPrintRequestItems`; Portal does not read
`staffArtworks` documents. The older Outcome B neutral/no-image section below is historical and was
resolved by the signed-off projection corrective and amendments.

The rollback statement must be amended with the projection cutover: build-003 is a standalone
rollback only while old customer canonical-item reads remain allowed. After final Rules remove those
reads, rollback is coupled—restore transitional/prior Rules before routing traffic to build-003.
No App Hosting build, rollout, traffic change, or production action occurred.

## Authoritative post-Staff-Artwork M0 rerun — 2026-09-12

The earlier input inventory is retained below. The current deterministic manifest is authoritative
for the dirty reconciliation at `development` `a76d8be218571e1260bdb983f86ee5cf86563e1b`.

The manifest includes the sorted, non-test runtime files under `apps/portal/**`, the shared runtime
files under `packages/shared/src/**`, and `package.json`, `package-lock.json`, `firebase.json`, and
`packages/shared/package.json`. It excludes dependency/build/release/generated output, local env
files, logs, and `.test.`/`.spec.` files. Digest algorithm: SHA-256 over each sorted relative path,
NUL, raw file bytes, NUL.

| Input set | Files | Digest |
|---|---:|---|
| Portal app runtime/build inputs | 379 app + 342 shared + 4 common = **725** | `d17fc13606a1357abb7bbeeeecfb546b575d25c35717e835087e3fdafabdbe46` |

The eight changed Portal status paths are `dashboard/page.tsx`, `PrintRequestDetailView.tsx`,
`PortalAdminViewDesignsModal.tsx`, `CurrentRequestDrawer.tsx`, `PortalPrintRequestItemCard.tsx`,
`PortalQueueToShowModal.tsx`, `usePrintRequestDetail.ts`, and `portalPrintRequestService.ts`.
Staff Artwork is customer-safe projection only: ready artwork may render preview/thumbnail and the
source badge/title/DPI, while private Staff Artwork management metadata, customer identity, and raw
Storage paths remain absent. The existing rollback target is Portal build-003. No App Hosting build
or publication occurred.

## Boundary audit — Outcome B / candidate blocked — 2026-09-12

The sentence above is **superseded as an unapproved disposition**. A mechanical source audit against
the accepted neutral no-image contract found runtime drift; this is not documentation-only staleness.
Candidate assembly and the commit/push checkpoint are blocked until a reviewed corrective child is
planned, reviewed, implemented, tested, and signed off.

| Offending source | Evidence | Contract violation |
|---|---|---|
| `apps/portal/features/print-requests/services/portalPrintRequestService.ts:90-118, 251-302` | `mapPrintRequestItem` carries `staffArtworkId` and `titleSnapshot`; `PortalStaffArtworkDocSummary` includes `id`, title, preview/thumbnail paths, background, pixel/print dimensions, approved maxima, upscale state, enhanced Storage path/dimensions, and timestamp. | Staff Artwork ID/title/private metadata cross the Portal DTO boundary. |
| `apps/portal/features/print-requests/services/portalPrintRequestService.ts:331-361` | `loadProductionPixelsForItem` directly calls `getDoc(getPortalDb(), 'staffArtworks', item.staffArtworkId)` for dimensions. | Portal customer directly reads `staffArtworks`; library read is forbidden. |
| `apps/portal/features/print-requests/services/portalPrintRequestService.ts:926-1003` | `getStaffArtworkSummariesForItems` directly reads each `staffArtworks/{id}` document and returns private fields. | Direct per-item Staff Artwork reads and private DTO exposure. |
| `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts:68-70, 121-135, 181-210, 764` | Loads and returns Staff Artwork summaries for request items. | Private summary is retained in Portal state. |
| `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx:138-153, 252-286` | Uses preview/thumbnail Storage paths and calls `catalogStorageService.getDownloadUrlForCatalogPath` for lightbox navigation. | Preview image and Storage-derived URL are exposed. |
| `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx:1040-1097` | Converts Staff Artwork summary into the card `upload` prop, including title, preview/thumbnail paths, background, pixel/DPI inputs, maxima, and enhanced Storage path. | Title, image, DPI, and private Storage metadata reach UI props. |
| `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx:242-260, 919-957, 1094-1108` | Uses Staff Artwork title/fallback, preview path, `CatalogThumbnailPanel`, source badge, and effective DPI badge. | Image/preview, title, and DPI are rendered; source label is `Staff Library`. |
| `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx:542-557` | Derives `/staff-artwork/{staffArtworkId}/preview.webp` and passes it to `CatalogThumbnailPanel`; title fallback is `Staff Artwork`. | Direct Storage path construction and thumbnail resolution in Current Request drawer. |
| `apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx:122-138` | Uses `item.titleSnapshot` for Staff Artwork queue entries. | Private Staff Artwork title can appear in queue UI. |

`useWorkingCurrentRequestItems.ts` does not fetch Staff Artwork summaries, but its raw `workingItems`
still carry the mapped source fields consumed by `CurrentRequestDrawer`. The Portal admin Show Queue
callable is a separate owner/admin DTO and deliberately returns no Staff Artwork `imageUrl`; it is not
the source of this customer-facing defect. No Portal `collection('staffArtworks')` browse was found,
but the two direct `getDoc` reads above still violate the no-read boundary.

No Portal description or customer-association field was observed in these paths, but the Staff Artwork
ID, title, preview/thumbnail paths, image URL resolution, pixel/DPI data, background, and enhanced
Storage metadata do cross the boundary. The smallest corrective scope is a reviewed Portal neutral
projection: retain only `sourceType: 'staff_artwork'`, request item ID, quantity, requested size, and
minimum request state; strip Staff Artwork ID/titleSnapshot and remove all Staff Artwork document and
Storage reads from Portal. The client-side size/DPI validation path must be redesigned to use
request-safe fields or server validation without reading `staffArtworks`.

Status: read-only M0 reconciliation rerun artifact; no App Hosting build or publication was executed.

Rerun snapshot: `development` dirty at `04b9637470a16b0f4d4a1ba9f822fe9df7acca2d`. The signed-off
customer-upload follow-up child is included below; the dirty snapshot is not a release SHA.

## Exact build boundary

Portal candidate input is `apps/portal/**` at the eventual clean candidate SHA, with the App Hosting backend `fresh-prints-portal` (`firebase.json` `rootDir: ./apps/portal`). The checked-in App Hosting ignore set excludes `node_modules`, `.git`, Firebase debug logs, `functions`, `electron`, `dist`, `dist-electron`, and `release`. The workspace lockfile and shared package are release inputs even though they live above `rootDir`.

| Input class | Exact path / rule | Current disposition |
|---|---|---|
| App source | `apps/portal/**` after the App Hosting ignore set | Include at clean candidate SHA |
| Changed Portal runtime source | Paths listed below | Include |
| Shared runtime dependency | `packages/shared/src/**` (maintenance constants plus customer-upload notification/follow-up contracts and helpers) | Include through workspace resolution |
| App config | `apps/portal/package.json`, `apps/portal/tsconfig.json`, `apps/portal/next.config.*` if present, `apps/portal/apphosting.yaml` | Include; package scripts/dependencies are unchanged except source inputs |
| Workspace config | root `package.json`, `package-lock.json`, `firebase.json`, `packages/shared/package.json` | Include/revalidate; root `test:rules` change is validation-only |
| Secret names | The 13 names in the table below | Include names only; values are not in Git or this artifact |
| Validation-only files | Portal contract tests and test fixtures | Run/record; not production runtime inputs |

## Changed Portal runtime paths

| Area | Paths |
|---|---|
| Auth/login continuity | `apps/portal/app/login/page.tsx`; `apps/portal/features/auth/components/CompleteProfileForm.tsx`; `LoginForm.tsx`; `RegisterForm.tsx`; `PortalLoginMaintenanceNotice.tsx`; `features/auth/context/AuthProvider.tsx` |
| Maintenance runtime | `apps/portal/features/maintenance/context/PortalMaintenanceContext.tsx`; `features/maintenance/services/portalMaintenanceService.ts`; `features/maintenance/components/PortalMaintenanceExperience.tsx`; `PortalMaintenanceTestBanner.tsx` |
| Customer shell/navigation | `apps/portal/app/providers.tsx`; `features/navigation/components/PortalAppShell.tsx`; `PortalHeaderActions.tsx`; `PortalSidebar.tsx`; `styles/shell.css` |
| Admin read-only Show Queue | `apps/portal/features/admin-show-queue/components/PortalAdminAuthGate.tsx`; `styles/admin-show-queue.css` |

## Customer-upload follow-up child additions

| Area | Paths / contract |
|---|---|
| Alert/deep link | `apps/portal/features/notifications/services/customerNotificationsService.ts`; `apps/portal/app/(app)/requests/artwork/page.tsx`; deep link query is `permissionRequest=<opaque-token>` |
| Follow-up UI | `apps/portal/features/customer-uploads/components/CustomerUploadCatalogPermissionFollowUpModal.tsx`; `apps/portal/styles/customer-uploads.css` |
| Shared contracts | Customer-notification action token and customer-upload follow-up types/helpers are included through `packages/shared/src/**` and the Function closure |

The Portal flow carries only the opaque permission token in the URL. It does not expose an upload
ID, Storage path, or public Storage URL in a DTO or deep link; the callable returns a short-lived
signed preview URL. Existing Alerts remain compatible, and the rollback target remains **Portal
build-003**.

The admin route is a narrow owner/admin read-only runtime exception. Its signoff is included at `docs/workflow/reviews/2026-09-09-portal-admin-daily-show-queue-signoff.md`; request-design parity remains explicitly excluded from this candidate.

## App Hosting secret names (names only)

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY
NEXT_PUBLIC_PORTAL_ORIGIN
NEXT_PUBLIC_GA_MEASUREMENT_ID
NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH
NEXT_PUBLIC_ALGOLIA_APP_ID
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY
NEXT_PUBLIC_ALGOLIA_INDEX_NAME
```

`apps/portal/apphosting.yaml` currently hashes to `e0516a8752a378b446dd8e82b113861c43a0144d00dba47ac58f58d621c04e2d`; production baseline is `e97085023aad63748b63d7a03ab43dcb43aa5904a02f6073db16d64d0d436e03`. Secret values must not be printed, rotated, or changed in M0.

Selected build metadata hashes (current / `origin/production`) are `apps/portal/package.json`
`66465320b6ce174727e99f0d95f9b1891fa7599d215c37ee7012cdf621c26a2b` /
`75406ef27f4a0a5d43df4634b74faa6b668683fb137f312247bf9ce20c507368`, root `package-lock.json`
`9798441f210f864ff6216cca45e137307e3f2bfccc86c4e4fce6fa3a2cf1ce48` /
`2d239134732ab2be24f8ca0fb1459f2f63348c6f2e4422c86f219f88a79b3344`, and
`apps/portal/tsconfig.json` `1ebc1808fd469c7073cbae1e43fba54c050e5932256fe57f69cc0366abf9690d` /
`da515a35d2d330ea49eb0e6c9f2f01b55e5900c6a311e19c52e4ceb4535f4616`.

## Maintenance and rollback

The maintenance runtime uses the callable-backed resolver and shared maintenance constants; it does not require a Portal rebuild to read a saved heading/message at runtime, but the candidate build still includes the source so the current Portal behavior is reproducible. A production rollback target is **Portal build-003**. No build, restart, hosting deployment, or production setting mutation occurred.

## Exclusions and stop conditions

- Exclude Studio/Electron source, Functions source, Firebase deployment output, `dist`, `dist-electron`, `release`, secrets, and local `.env.*` values.
- Exclude the request-design parity Plan from the candidate until separately reviewed.
- Tests are validation evidence, not browser bundle inputs.
- Do not infer a production App Hosting build or publish from this manifest; regenerate it at the clean SHA and obtain the required owner checkpoint first.
