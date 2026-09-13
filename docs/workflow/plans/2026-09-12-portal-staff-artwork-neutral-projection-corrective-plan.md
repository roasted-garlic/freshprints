# Plan: Portal Staff Artwork Neutral Projection Corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Workflow | FreshForge managed phase |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Related signed-off child | `studio-staff-artwork-library-and-print-request-source` |
| Status | `implemented_locally; population amendment prepared_pending_owner_acceptance` |
| Formal Review | `docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-review.md` |
| Authorization | **Owner accepted Plan + Formal Review and authorized Implement → Test → DEV preparation** on 2026-09-12. No production action. |

## 1. Gate and non-negotiable boundaries

This is a corrective child started after the parent M0 Portal boundary audit found Outcome B. This
document is a plan only. No runtime code, Firestore Rules, Storage Rules, indexes, data, Functions,
deployment, migration/backfill, commit, push, candidate freeze, publication, or production action
is authorized until the owner explicitly accepts this Plan and its Formal Review and authorizes
Implement.

The parent coordinated-production candidate remains blocked. The existing 111-path M0 inventory,
manifests, and candidate evidence are historical preparation only and must not be frozen or reused
after this child. After this child signs off, the parent must rerun M0 from a new reviewed snapshot.

## 2. Goal and approved Portal contract

Correct the customer-facing Portal projection for a `staff_artwork` Print Request item. An attached
Staff Artwork item remains visible only as a neutral request row so quantity, requested size, and
request totals/state remain truthful.

Allowed customer-facing fields are:

- neutral text such as `Staff-added artwork`;
- request item identity needed for keys and already-authorized mutations (not Staff Artwork identity);
- quantity;
- requested width/height and `sizeLabel`;
- the minimum request-item/status/timestamp state needed for truthful request UI.

The Portal must not expose or resolve:

- Staff Artwork image, preview, thumbnail, lightbox, or signed/public URL;
- Staff Artwork title, description, or title snapshot;
- `staffArtworkId` or any customer association;
- Staff Artwork Storage paths, background metadata, pixel/source dimensions, effective/approved DPI,
  approved maxima, upscale state, enhanced derivative path, or other private metadata;
- the `staffArtworks` collection or `/staff-artwork/...` namespace.

Studio Staff Artwork management, production/export/gang-sheet resolution, customer association,
maintenance behavior, notification behavior, and other signed-off child behavior remain unchanged.

## 3. Root cause and exact source evidence

The post-Staff-Artwork M0 audit found runtime drift from the accepted neutral projection. The current
Portal reads the customer-owned raw request-item documents and then hydrates the private Staff
Artwork document and its derivatives.

| File and lines | Current behavior | Contract violation |
|---|---|---|
| `apps/portal/features/print-requests/services/portalPrintRequestService.ts:85-125, 242-320` | The Portal item document shape accepts `staffArtworkId` and `titleSnapshot`; `mapPrintRequestItem` returns both for `staff_artwork`. | Private Staff Artwork identity and title cross the Portal DTO/state boundary. |
| `apps/portal/features/print-requests/services/portalPrintRequestService.ts:327-362` | `loadProductionPixelsForItem` calls `getDoc(doc(getPortalDb(), 'staffArtworks', item.staffArtworkId))` to obtain source/enhanced pixels for DPI validation. | Direct customer Staff Artwork read and private dimensions. |
| `apps/portal/features/print-requests/services/portalPrintRequestService.ts:926-1003` | `getStaffArtworkSummariesForItems` reads each `staffArtworks/{id}` and returns title, preview/thumbnail paths, background, dimensions, maxima, upscale, and enhanced metadata. | Direct private reads and broad private DTO exposure. |
| `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts:68-70, 123-143, 181-210, 759-765` | Detail state loads, stores, and returns Staff Artwork summaries. | Private summaries remain in customer Portal state. |
| `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx:112-171, 248-286` | Staff Artwork preview/thumbnail paths enter lightbox navigation and `catalogStorageService.getDownloadUrlForCatalogPath` resolves a URL. | Preview image and Storage URL exposure. |
| `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx:1035-1097` | Staff Artwork summary is converted into the card `upload` prop, including title, paths, background, pixels, maxima, and enhanced path/dimensions. | Private fields reach UI props. |
| `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx:240-260, 919-957, 1093-1108` | The card chooses Staff Artwork title, renders `CatalogThumbnailPanel`, opens a lightbox, and renders effective DPI. | Image/title/DPI are customer-visible. |
| `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx:541-557` | The drawer constructs `/staff-artwork/{id}/preview.webp` and uses the Staff Artwork title. | Direct private path construction and title exposure. |
| `apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx:122-138` | Queue entries use `item.titleSnapshot` for Staff Artwork. | Private title exposure. |

`useWorkingCurrentRequestItems.ts` does not fetch Staff Artwork summaries, but its raw `workingItems`
currently retain the private fields and flow into the drawer. The Portal admin Show Queue callable is
not the defect source: `functions/src/getPortalAdminShowQueueRequestDesigns.ts:99-108` returns no
`imageUrl` for `staff_artwork`, and its label is already generic. It still receives internal source
identity on the trusted staff path; that is not customer Portal state.

## 4. Customer-readable persistence boundary

The private fields are persisted on customer-readable canonical documents today:

- `printRequestItems/{itemId}` stores `sourceType: "staff_artwork"`, `staffArtworkId`, and optional
  `titleSnapshot`. `firestore.rules:2236-2239` allows a customer to read the full item when the
  parent request belongs to that customer. Firestore has no field-level masking, so a React mapper
  alone cannot repair this boundary.
- `staffArtworks/{staffArtworkId}` currently permits a customer `get` of any ready document at
  `firestore.rules:3009-3017`; list is staff-only, but a known ID is sufficient for a read.
- `storage.rules:204-214` currently permits customers to read `preview.webp` and `thumbnail.webp`
  under `/staff-artwork/{staffArtworkId}/`.
- No existing customer-safe Print Request projection or resolver was found. Portal one-shot reads,
  realtime listeners, and item lookup all use the raw `printRequestItems` collection.

Therefore the corrective must change the read boundary, not merely hide fields in React.

## 5. Recommended safe projection architecture

The smallest architecture that preserves the existing Portal realtime behavior while removing private
fields from the customer boundary is a server-maintained, typed projection collection:

1. Add a shared `PortalPrintRequestItem` type and a pure, allowlisted projection helper. The helper
   maps canonical `printRequestItems` server-side to `portalPrintRequestItems/{itemId}`. For
   `staff_artwork`, it emits `sourceType`, the neutral label, quantity, requested size, `sizeLabel`,
   request-safe status/order/timestamps, and no `staffArtworkId`, title snapshot, source-specific
   metadata, or Storage path. Catalog and customer-upload projections retain only the fields their
   existing customer flows require.
2. Add an Admin-SDK `onDocumentWritten("printRequestItems/{itemId}")` synchronizer. Create/update
   writes the sanitized projection; delete removes it. The trigger is idempotent and handles
   at-least-once delivery. It never reads Staff Artwork on behalf of Portal and never writes private
   fields to the projection.
3. Add the required `printRequestId + updatedAt` index and a customer-readable
   `portalPrintRequestItems` Rules match. Projection writes remain Admin-SDK-only. Customer access is
   constrained by ownership of the parent request; staff access remains available for diagnostics.
4. Switch Portal one-shot reads, realtime listeners, item lookup, and update-source lookup to the
   projection collection. Remove the Portal Staff Artwork summary map and every direct
   `staffArtworks`/`staff-artwork` read or URL resolver. The canonical raw collection remains the
   trusted Studio/Functions source for production and is not changed to a lossy shape.
5. Materialize existing canonical request items with the bounded, idempotent Admin-SDK runner
   specified in the population amendment Plan/Formal Review. This is additive only; it does not
   rewrite or delete canonical request items. The amendment is documentation-only until the owner
   accepts it and separately authorizes script implementation, DEV dry-run, and later apply.

This projection is preferred over a callable-only detail response because the current Portal uses a
bounded `onSnapshot` listener for realtime request updates. Replacing it with polling would change
request-sync behavior and leave a larger stale-state window. A client-side mapper alone is rejected
because the raw document is field-readable by the customer.

## 6. Sizing and save behavior

The current Portal reads Staff Artwork pixels only to run client-side `requireSavablePrintRequestItemSize`.
The corrective must not return those pixels, DPI, approved maxima, or enhanced dimensions.

Plan:

- Add a trusted callable (proposed name `updatePortalStaffArtworkPrintRequestItemSize`) that accepts
  only `printRequestId`, `itemId`, requested width/height, and optional standard-size preset key.
  It revalidates the authenticated Portal customer, request ownership/editable state, item source,
  Staff Artwork identity, current Staff Artwork status, active baseline/enhanced private dimensions,
  and `requireSavablePrintRequestItemSize` inside the trusted server transaction. It writes only the
  request-safe size fields and returns an acknowledgment/accepted request values, never source
  dimensions or DPI.
- Keep the existing quantity callable for quantity changes; the Portal service combines it with the
  Staff Artwork size callable when both fields change. Customer direct raw-item updates for
  `staff_artwork` are denied so the trusted callable is the only customer size-write path.
- Staff Artwork cards retain requested-size editing and quantity controls. Aspect locking, where
  needed, uses the already persisted requested width/height ratio rather than source pixels. The
  Staff Artwork row does not render a DPI badge, source-quality warning, source-dimension readout,
  interactive upscale toggle, or source-dependent Standard Size preview. Catalog and customer-upload
  cards retain their current sizing/DPI behavior.
- Server enforcement remains the existing policy: below 200 effective DPI cannot save; 200–299 warns
  where a customer-safe warning is available; 300+ is optimal; either requested side above 22 inches
  is rejected. For Staff Artwork, an invalid source-derived quality result is returned only as a
  customer-safe save error; no numeric private quality is returned. Queue-time trusted validation
  remains unchanged as defense in depth.

## 7. Exact implementation file allowlist

### Portal and shared projection

- `apps/portal/features/print-requests/services/portalPrintRequestService.ts` — consume the safe
  collection, remove Staff Artwork DTO/summary/pixel reads, route Staff Artwork size saves to the
  trusted callable, and preserve catalog/upload behavior.
- `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts` — remove Staff Artwork summary
  state/effects and keep realtime/request reconciliation over the safe item type.
- `apps/portal/features/print-requests/hooks/useWorkingCurrentRequestItems.ts` — type the working
  projection and ensure no private Staff Artwork fields enter drawer aggregate state.
- `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx` — return null for Staff Artwork
  preview resolution, remove private synthetic upload props/lightbox entries, and pass neutral item
  data only.
- `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx` — render the
  neutral no-image row, remove Staff Artwork title/preview/DPI/upscale paths, and preserve quantity/
  requested-size editing.
- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx` — remove canonical
  Staff Artwork path construction and title; render a neutral row.
- `apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx` — use the neutral label
  for Staff Artwork and preserve remaining quantity/size.
- `apps/portal/lib/firebase/collections.ts` — add the safe projection collection constant.
- `packages/shared/src/types/portal/portalPrintRequestItem.types.ts` (new) — typed customer-safe item.
- `packages/shared/src/utils/portalPrintRequestItemProjection.ts` (new) — strict allowlisted mapper,
  neutral Staff Artwork label, and projection tests.

### Trusted Functions, Rules, and indexes

- `functions/src/onPrintRequestItemPortalProjectionWritten.ts` (new) — idempotent projection trigger.
- `functions/src/updatePortalStaffArtworkPrintRequestItemSize.ts` (new) — trusted size validation/write.
- `functions/src/index.ts` — export only the reviewed new Functions.
- `firestore.rules` — deny customer reads of canonical `printRequestItems` and `staffArtworks`, add
  customer-owned read access to `portalPrintRequestItems`, deny direct customer Staff Artwork item
  updates, and preserve staff/owner/admin behavior.
- `storage.rules` — remove customer reads under `/staff-artwork/...`; preserve staff reads and the
  owner/admin source-upload contract.
- `firestore.indexes.json` — add the safe projection query index only if the existing index inventory
  requires it.
- `tests/firebase/staffArtworkPrintRequestItem.rules.test.ts` and
  `tests/firebase/staffArtwork.rules.contract.test.ts` — update stale expectations and add customer
  read/write denial plus projection-boundary coverage.
- New focused Functions/shared/Portal tests alongside the changed modules for projection and sizing.

### Post-signoff documentation and parent evidence

After implementation/Test/Owner DEV QA/Signoff, update the stale Staff Artwork Portal wording in the
authoritative data-model/handoff material and rerun the coordinated-production M0 Portal manifest
generation. The manifest must explicitly state the neutral no-image projection and its digest must be
regenerated by the repository’s manifest method. Do not edit or regenerate that candidate evidence
as part of this Plan/Formal Review-only turn.

## 8. Files explicitly not changing in this child

- Studio Staff Artwork library/upload/processing/selection UI and its signed-off callables.
- Staff Artwork production derivatives, allocation/export/Gang Sheet resolvers, archive/delete, and
  AI Review promotion behavior.
- Catalog Design and Customer Upload source models, processing, retention, or public browse behavior.
- `functions/src/getPortalAdminShowQueueRequestDesigns.ts` and the trusted Portal-admin dashboard
  source-label path, except for regression tests proving its existing neutral Staff Artwork response.
- Customer association/merge behavior, maintenance guard behavior, customer notifications, exports,
  gang sheets, Internal Gang Sheet, and production rollout.
- Candidate commit/push, M1 freeze, production deployment, publication, migration execution, and any
  console action.

## 9. Risks and mitigations

- **Projection lag or missed delivery:** an at-least-once, idempotent write trigger, bounded retry,
  listener convergence tests, and an additive backfill prevent a missing or stale neutral row from
  becoming a permanent request-truth mismatch.
- **Boundary sequencing:** populate projections and verify the query index before switching Portal
  reads; only then deny customer reads of canonical items/Staff Artwork. Rollback keeps canonical
  Studio/Functions data intact and can restore the prior Portal reader only through a separately
  reviewed change.
- **Future field creep:** the shared projection is an explicit allowlist with forbidden-field tests;
  adding a canonical Staff Artwork field cannot implicitly add it to Portal state.
- **Sizing races:** the trusted size callable re-reads the canonical item and current private
  dimensions in one transaction, so archive/enhance changes cannot be bypassed by a stale client
  validation result.
- **Rules/index expression or query failures:** keep the projection Rules predicate narrow, measure
  the new query against the existing expression budget, and retain focused emulator coverage before
  any DEV deployment.
- **Historical rows without a projection:** the bounded idempotent backfill is required for existing
  customer requests; it is additive and separately authorized, with no canonical item rewrite.

## 10. Regression and verification strategy

Focused tests must prove:

1. the projection builder strips `staffArtworkId`, title/description, preview/thumbnail paths,
   background, pixel/source dimensions, approved maxima, effective DPI, enhancement paths/metadata,
   and customer association;
2. Portal service/listeners use only `portalPrintRequestItems` and have zero direct
   `staffArtworks` reads or `/staff-artwork/...` URL resolution;
3. detail, card, drawer, and Queue-to-Show render `Staff-added artwork` with no image/lightbox/title/
   DPI while preserving item quantity, requested width/height, totals, and request state;
4. catalog-design and customer-upload cards retain their current previews, titles, sizing, and
   regressions;
5. Staff Artwork size saves validate privately at the trusted boundary, enforce `<200` rejection,
   permit 200–299 with safe warning semantics, enforce the 22-inch cap, and return no private values;
6. quantity changes, realtime refresh, remove, request detail reload, and Queue-to-Show remain
   truthful when projection writes arrive asynchronously;
7. customer reads of canonical `printRequestItems`, `staffArtworks`, and `/staff-artwork/...` are
   denied, while customer reads of its safe projection succeed and staff/owner/admin behavior remains
   unchanged;
8. projection trigger create/update/delete is idempotent and backfill output is allowlisted;
9. Portal typecheck, focused privacy/projection tests, Functions build, targeted lint, Rules/Storage
   emulator coverage, and `git diff --check` pass.

Owner DEV QA is required before Signoff. QA must cover an existing Staff Artwork-backed request,
manual size/quantity edits, invalid and boundary sizing, refresh/realtime convergence, drawer,
detail, Queue-to-Show, no image/lightbox/network Staff Artwork reads, customer Rules denial, and
catalog/upload regressions.

## 11. Parent impact and exit gates

This child changes Portal runtime, shared types, Functions closure, Firestore/Storage Rules, indexes,
and Portal build inputs. The parent M0 result and current candidate inventory are invalid after any
implementation change.

The child exit sequence is:

`Plan → Formal Review → Implement → Test → Owner DEV QA → Signoff`

After Signoff, return to `coordinated-production-promotion-release-readiness`, rerun M0, regenerate
the Portal/Studio/Functions/shared/Rules/index/config manifests and path inventory, reverify the
neutral Staff Artwork boundary, and only then request:

`OWNER AUTHORIZE REVIEWED POST-STAFF-ARTWORK COORDINATED CANDIDATE COMMIT/PUSH`

## 12. Exact next owner decision

> **OWNER ACCEPT BOUNDED DEV PORTAL PROJECTION POPULATION AMENDMENT + AUTHORIZE SCRIPT IMPLEMENTATION**

The population design is now specified in the dated amendment artifacts below. The owner accepted
the base Plan/Formal Review and authorized Implement → Test → DEV preparation on 2026-09-12, but has
not yet authorized this script implementation. DEV boundary cutover remains stopped; no unreviewed
migration/backfill tool may be invented or run.

## 13. Population amendment artifact

The executable DEV-only population design is recorded in:

`docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-amendment-plan.md`

Its Formal Review is:

`docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-amendment-review.md`

The amendment locks the exact script path, all-canonical-item eligibility scope, deterministic
`__name__` ordering, `PAGE_LIMIT=200` maximum, `START_AFTER_ITEM_ID` one-page cursor contract,
DEV-only guard, dry-run/apply separation, mapper reuse, strict idempotent classification,
fail-closed malformed-row behavior, verification, race handling, cutover sequence, and production
boundary. It does not itself authorize implementation, deployment, or data mutation.
