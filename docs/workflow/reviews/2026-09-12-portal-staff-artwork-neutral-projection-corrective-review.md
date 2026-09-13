# Formal Review: Portal Staff Artwork Neutral Projection Corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Workflow | FreshForge managed phase |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Related signed-off child | `studio-staff-artwork-library-and-print-request-source` |
| Plan | `docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-plan.md` |
| Verdict | **`approved_with_changes` — owner accepted and authorized Implement → Test → DEV preparation on 2026-09-12; population amendment reviewed separately and awaiting owner acceptance** |

## Review boundary

This Formal Review covered the corrective plan. The owner accepted it and authorized Implement → Test
→ DEV preparation on 2026-09-12. Production, staging, commit, push, freeze, publication, and
data migration/backfill execution remain forbidden.

The parent coordinated-production candidate remains blocked until this child completes
Implement → Test → Owner DEV QA → Signoff and the parent reruns M0.

## 1. Executive assessment and root cause

The accepted Staff Artwork product contract is a neutral, no-image customer projection. The current
Portal implementation instead treats a `staff_artwork` item like an upload-backed artwork record.
It reads the customer-readable raw request item, extracts `staffArtworkId` and `titleSnapshot`,
reads `staffArtworks/{id}`, resolves preview/thumbnail paths to Storage URLs, renders the artwork
and title, and calculates/displays DPI from private pixels.

This is runtime drift (Outcome B), not stale manifest wording. Candidate assembly must remain stopped.

## 2. Evidence and exact fields exposed

| Source | Evidence | Exposure |
|---|---|---|
| `apps/portal/features/print-requests/services/portalPrintRequestService.ts:85-125` | `PrintRequestItemDocumentData` accepts `staffArtworkId`/`titleSnapshot`; `PortalStaffArtworkDocSummary` defines `id`, `title`, preview/thumbnail paths, background, source/print dimensions, maxima, upscale state, enhanced path/dimensions, and timestamp. | Private identity, title, Storage paths, background, pixels, maxima, and enhancement metadata are typed for Portal. |
| `.../portalPrintRequestService.ts:242-320` | `mapPrintRequestItem` returns `sourceType: "staff_artwork"`, `staffArtworkId`, and `titleSnapshot`. | Staff Artwork ID/title enter Portal item state. |
| `.../portalPrintRequestService.ts:327-362` | `loadProductionPixelsForItem` reads `staffArtworks/{staffArtworkId}` and its processing/enhanced pixel fields. | Direct Firestore Staff Artwork read; private source dimensions used for client DPI validation. |
| `.../portalPrintRequestService.ts:926-1003` | `getStaffArtworkSummariesForItems` reads each Staff Artwork document and returns all summary fields. | Direct per-item reads and private summary DTO. |
| `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts:68-70, 123-143, 181-210, 759-765` | Hydrates and returns Staff Artwork summary map. | Private data persists in React state and is passed downstream. |
| `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx:112-171, 248-286` | Staff preview/thumbnail path is selected; `catalogStorageService.getDownloadUrlForCatalogPath` resolves it for the lightbox. | Preview image and signed/public Storage URL are exposed. |
| `.../PrintRequestDetailView.tsx:1035-1097` | Summary is converted into the card `upload` prop with title, paths, background, dimensions, maxima, and enhanced metadata. | Private fields reach UI props. |
| `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx:240-260, 919-957, 1093-1108` | Title fallback, `CatalogThumbnailPanel`, lightbox, source badge, and effective DPI badge are rendered. | Image/title/DPI are customer-visible; source is labelled `Staff Library`. |
| `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx:541-557` | Calls `getStaffArtworkPreviewStoragePath` and constructs `/staff-artwork/{id}/preview.webp`; uses `titleSnapshot`. | Private path and title are exposed in Current Request. |
| `apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx:122-138` | Uses `titleSnapshot` for Staff Artwork. | Private title can appear while queuing. |

No Portal description or customer-association field was observed in these paths. No broad
`collection('staffArtworks')` browse was found, but direct known-ID reads still violate the contract.
The Portal-admin Show Queue callable deliberately returns `{}` for a Staff Artwork preview and a
generic `Staff-added artwork` label; it is not the customer-facing defect source.

## 3. Customer-readable persistence and Rules/Storage impact

The privacy problem exists below React:

- `printRequestItems/{itemId}` persists `sourceType`, `staffArtworkId`, and optional `titleSnapshot`.
  `firestore.rules:2236-2239` allows a customer to read the complete document when its parent
  `printRequests/{id}` belongs to that customer. Firestore reads are document-granular; a mapper
  cannot redact fields after the document has crossed the boundary.
- `firestore.rules:3009-3017` permits customer `get` of a ready `staffArtworks/{id}` document.
  List is staff-only, but a known request-item ID is enough to read it.
- `storage.rules:204-214` permits customer reads of `preview.webp` and `thumbnail.webp` below
  `/staff-artwork/{staffArtworkId}/`.
- No existing trusted customer-safe request-item projection was found. Portal reads and its bounded
  realtime listener all query the raw `printRequestItems` collection.

The review therefore requires a real boundary change: a server-maintained safe projection collection
(`portalPrintRequestItems`) with customer-owned read Rules, while canonical `printRequestItems` and
Staff Artwork remain private/staff sources. Customer direct reads of the canonical item and direct
Staff Artwork Firestore/Storage reads must be denied. Staff/owner/admin access and all production
resolvers remain unchanged.

## 4. Architecture verdict

The plan’s projection design is accepted conditionally because it is the smallest repository-
consistent option that preserves the current `onSnapshot` realtime behavior:

1. A shared typed allowlist maps the canonical item to a `PortalPrintRequestItem`. For Staff Artwork,
   the projection contains only neutral source/label, request item identity, quantity, requested size,
   and minimum state. It cannot contain Staff Artwork identity, title, path, dimensions, DPI,
   background, enhancement, or association.
2. An Admin-SDK `onDocumentWritten("printRequestItems/{itemId}")` trigger creates/updates/deletes the
   projection idempotently. This covers Studio writes, trusted callable writes, and customer-safe
   convergence without allowing clients to write projection documents.
3. Portal detail, queue, drawer, and realtime/list reads use only `portalPrintRequestItems`. The
   existing catalog and customer-upload summaries remain source-specific and unchanged.
4. Existing projection documents are populated by the bounded, idempotent Admin-SDK runner defined
   in the population amendment artifacts. It is additive and does not rewrite/delete canonical
   request items. No backfill is run until the amendment is accepted and the separate apply
   checkpoint is granted.

A callable-only response was not selected: it would replace the current realtime listener or require
   polling. A client-only mapper was rejected because the complete raw document is customer-readable.
Moving private identity out of canonical request items was also rejected for this child because it
would fan out through every Studio/Functions production resolver and alter the signed-off source
model.

## 5. Sizing-validation verdict

The current client reads Staff Artwork pixel dimensions solely to enforce the shared save policy and
display DPI. The plan correctly removes that read and removes source-quality/DPI UI from Staff
Artwork rows.

The accepted implementation condition is a trusted size-write callable (proposed
`updatePortalStaffArtworkPrintRequestItemSize`) that:

- authenticates the Portal customer and checks request ownership/editable state;
- reads the canonical item and Staff Artwork privately in Admin SDK;
- selects baseline/enhanced private dimensions according to the item’s enhancement mode;
- calls the existing shared `requireSavablePrintRequestItemSize` policy;
- atomically writes only requested width/height, `sizeLabel`, optional preset, and audit timestamps;
- returns no Staff Artwork ID, pixels, source dimensions, DPI, maxima, path, or enhancement metadata.

The existing quantity callable remains the quantity authority. Customer direct canonical-item updates
for `staff_artwork` are denied so a size cannot bypass the trusted check. Queue-time validation stays
as defense in depth. The Staff Artwork card retains quantity and requested-size editing, with aspect
locking derived only from already persisted requested dimensions; source-dependent DPI, upscale, and
Standard Size preview controls are not rendered. Catalog and customer-upload sizing remains unchanged.

This preserves the policy (`<200` cannot save, `200–299` warning where safe, `300+` optimal, and
either side `>22in` rejected) without returning private source-quality data.

## 6. Exact implementation file allowlist

### Portal/shared

- `apps/portal/features/print-requests/services/portalPrintRequestService.ts`
- `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts`
- `apps/portal/features/print-requests/hooks/useWorkingCurrentRequestItems.ts`
- `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx`
- `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx`
- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx`
- `apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx`
- `apps/portal/lib/firebase/collections.ts`
- `packages/shared/src/types/portal/portalPrintRequestItem.types.ts` (new)
- `packages/shared/src/utils/portalPrintRequestItemProjection.ts` (new)

### Trusted backend and boundary

- `functions/src/onPrintRequestItemPortalProjectionWritten.ts` (new)
- `functions/src/updatePortalStaffArtworkPrintRequestItemSize.ts` (new)
- `functions/src/index.ts`
- `firestore.rules`
- `storage.rules`
- `firestore.indexes.json` (safe projection query index, if required by the existing index inventory)
- `tests/firebase/staffArtworkPrintRequestItem.rules.test.ts`
- `tests/firebase/staffArtwork.rules.contract.test.ts`
- new focused projection, callable, Rules/Storage, and Portal component/service tests alongside the
  modules above.

## 7. Files explicitly not changing

- Studio Staff Artwork library/upload/processing/selection UI and signed-off callables.
- Staff Artwork production derivatives, source-aware allocation/export/Gang Sheet resolvers,
  archive/delete, AI Review promotion, and customer merge/association behavior.
- Catalog Design and Customer Upload source models, processing, retention, previews, and sizing.
- `functions/src/getPortalAdminShowQueueRequestDesigns.ts` and the trusted Portal-admin dashboard
  implementation, except regression assertions for their existing neutral Staff Artwork response.
- Customer notifications, maintenance behavior, exports, Internal Gang Sheet, production rollout,
  candidate commit/push, M1 freeze, and production/console actions.

## 8. Test and Owner DEV QA gate

The implementation cannot pass review without evidence for all of the following:

- strict projection tests strip Staff Artwork ID/title/description, image/path, background, pixel/source
  dimensions, DPI/maxima, enhancement metadata, and customer association;
- static/source tests prove Portal has no `staffArtworks` reads and no `/staff-artwork/...` URL
  construction/resolution;
- card, detail, drawer, and Queue-to-Show tests show `Staff-added artwork`, no image/lightbox/title/
  DPI, and preserve quantity/requested size/totals/state;
- catalog-design and customer-upload previews/titles/DPI/sizing regressions pass;
- trusted sizing tests cover private baseline/enhanced validation, `<200`, `200–299`, `300+`, `22in`,
  malformed/missing source, ownership/status, and no-private-field responses;
- realtime/list/reload/remove/queue tests prove projection convergence and no stale private state;
- Firestore emulator proves customer denial for canonical `printRequestItems` and `staffArtworks`,
  customer-owned safe projection reads, direct Staff Artwork item-write denial, and unchanged staff/
  owner/admin behavior;
- Storage emulator proves customer denial for `/staff-artwork/...` and unchanged staff access;
- trigger idempotence/backfill allowlist tests pass;
- Functions build, Portal typecheck, targeted lint, focused privacy/projection tests, Rules/Storage
  emulator tests, and `git diff --check` pass.

Owner DEV QA is mandatory before Signoff and must exercise an existing Staff Artwork request through
detail, Current Request, quantity/size edits, invalid/boundary saves, realtime refresh, Queue-to-Show,
and network/Rules checks showing no private Firestore or Storage read.

## 9. Risks and mitigations

- **Eventual-consistency gap:** the trigger/backfill pair is idempotent and retryable; Portal tests
  must prove optimistic state and realtime convergence while the projection catches up.
- **Cutover ordering:** projection index/data must be ready before customer reads of canonical items
  and Staff Artwork are denied. The cutover is reversible at source level and does not rewrite the
  canonical Studio/Functions model.
- **Privacy regression by future fields:** the projection helper is strict allowlist-only and static
  tests reject every forbidden Staff Artwork field/path/read.
- **Concurrent Staff Artwork changes during resize:** the callable re-reads source state and validates
  in the trusted transaction, avoiding client-side time-of-check/time-of-use races.
- **Rules/query budget:** the new customer projection predicate and index must be checked in the
  emulator and against existing Firestore expression/query limits before DEV deployment.

## 10. Parent M0 and release impact

This corrective changes Portal runtime, shared types, Functions closure, Rules/Storage, indexes, and
Portal build inputs. The current parent M0 manifests and 111-path inventory become stale as soon as
implementation changes land. After Signoff, the parent must:

1. rerun M0 from a new reviewed development snapshot;
2. regenerate the Portal, Studio, Functions/shared, Rules/Storage, index, config/data, and path
   manifests and digests;
3. update the authoritative Portal manifest to explicitly say Staff Artwork is neutral/no-image;
4. reverify the Portal boundary and only then request
   `OWNER AUTHORIZE REVIEWED POST-STAFF-ARTWORK COORDINATED CANDIDATE COMMIT/PUSH`.

No candidate freeze, commit, push, publication, deployment, migration/backfill execution, or
production action is authorized by this review.

## 11. Verdict and exact next owner decision

**Verdict: `approved_with_changes` — conditional.** The plan is technically acceptable only if the
implementation uses the server-maintained safe projection, trusted Staff Artwork sizing write,
customer Rules/Storage denial, bounded projection population, and the required regression/Owner DEV
QA gates above. This verdict is not implementation authorization.

The exact next owner decision for the base runtime scope was:

> **OWNER ACCEPT PLAN + FORMAL REVIEW AND AUTHORIZE IMPLEMENT**

That decision was provided on 2026-09-12. The runtime scope was implemented locally. DEV cutover is
now governed by the separately reviewed population amendment, which must be accepted before the
population script is implemented.

## 12. Population amendment review

The missing executable DEV population design is reviewed in:

`docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-amendment-review.md`

The matching Plan Amendment is:

`docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-amendment-plan.md`

The amendment Formal Review verdict is `approved_with_changes`: it is implementation-ready after
explicit owner acceptance, but it authorizes no script implementation, deployment, data mutation,
QA, Signoff, staging, commit, push, freeze, or production action. The immediate checkpoint is:

> **OWNER ACCEPT BOUNDED DEV PORTAL PROJECTION POPULATION AMENDMENT + AUTHORIZE SCRIPT IMPLEMENTATION**
