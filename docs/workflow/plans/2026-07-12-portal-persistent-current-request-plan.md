# Plan: Portal Persistent Current Request (Cart-Style Flow)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Author | Planning Agent |
| Status | approved_with_changes — see review |
| Workflow | managed-phase |
| Managed goal | `portal-persistent-current-request` |
| Roadmap | Phase 8 Portal UX fast-follow |
| Environment | `fresh-prints-dev` only |
| Related | Parent upload complete: `docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-parent-signoff.md` |
| Prerequisite | `portal-customer-artwork-upload` parent signed off (2026-07-12) |

---

## Goal

Redesign the Fresh Prints Portal customer request experience so customers always experience one persistent **Current Request**, can add catalog designs or request artwork from anywhere in the Portal without entering selection mode, and use the existing request details page (**Review Request**) to configure sizes, quantities, duplicates, and show selection.

This is an ecommerce-*feeling* shopping flow for print requests — **not** checkout, payment, shipping, or orders.

---

## Background

- ADR-FP-071 already enforces one working (`draft`/`editing`) request per Portal customer.
- ADR-FP-067 / catalog add currently navigates into Design Library **selection mode** (`?mode=request-selection&requestId=…`) after seeding an item.
- Customer artwork upload is a near-fullscreen **modal** opened from request detail via `?upload=1` (`buildRequestUploadHref`) — not a dedicated route.
- ROADMAP deferred “always-on working request / always-in-selection immersive browse” until after artwork-upload parent signoff — that gate is now closed.
- Owner product prompt (2026-07-12) defines the target UX: header basket + Upload Artwork, drawer summary, direct-add browsing, dedicated request-artwork page, Review Request details, Add Request to Show, lazy empty Current Request.

---

## Scope

### In Scope

1. Portal-level **Current Request** state (virtual empty when no Firestore doc; lazy create on first persistent action).
2. Authenticated header: **Upload Artwork** + **Current Request** basket with total-print-quantity badge + attention count.
3. Responsive Current Request drawer/sheet (summary only; no full resizer).
4. Catalog/Discover **direct-add** without selection mode; immediate persistence; aggregate qty across size variants; primary-variant increment rule.
5. Dedicated **Upload Artwork for Printing** Portal page reusing existing trusted upload pipeline.
6. Request details refined as **Review Request** (preserve qty/size/duplicate/DPI/show queue).
7. Safe migration off Portal selection mode as the normal path; Studio selection mode unchanged.
8. Docs + ADR for the customer-flow redesign; explicit request-artwork vs future-donation separation.
9. Automated + manual tests per acceptance criteria; deploy to `fresh-prints-dev` only if Functions/rules change (prefer no callable contract changes).

### Out of Scope

- Payment, shipping, checkout, tax, addresses, ecommerce orders
- Future **image donation** workflow (no donation UI, records, checkbox, or mixed inbox)
- Production deploy
- Studio request-selection mode changes (unless a shared-contract regression requires a narrow fix — must be called out in review)
- Customer-editable request names (auto-naming remains)
- Immersive/fullscreen alternate browse presentation (optional future; not required)
- Changing DPI floors, upload limits, or attach confirm semantics from r7
- Phase 9 Custom Requests

---

## Part A — Repository audit (verified)

### Lifecycle (lazy creation confirmed)

| Event | Creates working request? |
|-------|--------------------------|
| Login / `PortalPrintRequestProvider` mount | **No** — lists existing requests only |
| FAB Start with 0 continuable | **Yes** — `createPortalPrintRequest` |
| Add to request with 0 continuable | **Yes** — create then add item |
| Upload attach with 0 continuable | **Yes** — `resolveOrCreateWorkingPrintRequestInTransaction` |
| Continuable already exists | **No** — continue / attach to it (ADR-FP-071) |

**Plan decision:** Keep lazy creation. Virtual empty Current Request in UI; create only on first persistent action. Do not create empty docs on login.

### Verified paths (key)

| Concern | Path |
|---------|------|
| Create callable | `functions/src/createPortalPrintRequest.ts` |
| One-working server gate | `functions/src/lib/portalWorkingPrintRequest.ts` |
| Shared one-working helpers | `packages/shared/src/utils/portalOneWorkingPrintRequest.ts` |
| Continuable status | `packages/shared/src/utils/portalPrintRequestListTabs.ts` |
| Portal list + create hook | `apps/portal/features/print-requests/hooks/useMyPrintRequests.ts` |
| App-wide provider | `apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx` |
| Start/continue flow | `apps/portal/features/print-requests/hooks/usePrintRequestCreationFlow.ts` |
| Add design flow (selection entry) | `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.ts` |
| Selection mode hook | `apps/portal/features/print-requests/hooks/usePortalPrintRequestSelectionMode.ts` |
| Selection URL builders | `apps/portal/features/print-requests/utils/catalogSelectionNavigation.ts` |
| Catalog browse UI | `apps/portal/features/catalog/pages/CatalogHomePageContent.tsx`, `CatalogPageContent.tsx` |
| Design cards | `apps/portal/features/catalog/components/CatalogDesignCard.tsx` |
| Print request service | `apps/portal/features/print-requests/services/portalPrintRequestService.ts` |
| Duplicate callable | `functions/src/duplicatePortalPrintRequestItem.ts` |
| Detail view | `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx` |
| Item card (qty/size/DPI) | `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx` |
| Sizing/DPI shared | `packages/shared/src/utils/printRequestItemSizing.ts` |
| Upload modal | `apps/portal/features/customer-uploads/components/CustomerUploadPanel.tsx` |
| Upload attach callable | `functions/src/confirmCustomerUploadsAndAttachToRequest.ts` |
| Queue to show | `functions/src/queuePortalPrintRequestToShow.ts` + `PortalQueueToShowModal.tsx` |
| List tab derivation | `packages/shared/src/utils/printRequestListGrouping.ts` |
| Auth shell / header | `apps/portal/features/navigation/components/PortalAppShell.tsx`, `PortalAppHeader.tsx` |
| Unused header slot | `PortalHeaderActions.tsx` (**not wired** — candidate for basket/upload) |
| Basket/cart UI today | **[NOT FOUND]** — selection tray is closest |

### Current upload route

Today: `/requests/[id]?upload=1` opens modal on detail. **Proposed dedicated route:** `/requests/artwork` (beneath requests area; not generic `/uploads`).

### Primary variant rule (define — no existing field)

**Canonical primary catalog variant** for a `designId` on a working request:

1. Among items with `resolvePrintRequestItemSourceType === 'catalog_design'` and matching `designId`,
2. Choose the earliest by `createdAt` ascending (then `id` ascending as tie-break).
3. Re-adding from catalog increments that item’s quantity only; later duplicates (other sizes) unchanged.

No new persisted “primary” field required for v1. Document in ADR + unit tests.

---

## Affected Areas

### Files / Modules (expected — refine during implement)

**New (Portal)**
- `apps/portal/features/print-requests/hooks/useCurrentRequest.ts` (or extend context) — working request + items + aggregates
- `apps/portal/features/print-requests/utils/currentRequestAggregates.ts` (+ tests) — totals, primary variant, attention counts, grouping
- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx` (+ styles)
- `apps/portal/features/navigation/components/` — wire Upload + basket into header/shell
- `apps/portal/app/(app)/requests/artwork/page.tsx` — dedicated upload page
- Shared/UI copy constants for Current Request terminology

**Modified (Portal)**
- `PortalPrintRequestContext.tsx` / `useMyPrintRequests.ts` — expose `currentRequest` (continuable[0] or virtual empty)
- `useAddDesignToRequestFlow.ts` — direct persist + stay on page; stop entering selection mode as default
- `CatalogDesignCard.tsx`, Discover/Library pages — Add / “In Current Request · Qty N”
- `CatalogPageContent.tsx` — deprecate normal dependence on selection mode
- `PrintRequestDetailView.tsx` — Review Request presentation; link to `/requests/artwork`; remove need for full modal embed
- `catalogSelectionNavigation.ts` — artwork route helpers; selection hrefs become legacy
- `PortalBottomNav.tsx` / start modals — align with Current Request (no “start new” when working exists)

**Shared**
- Aggregate helpers may live in `packages/shared/src/utils/` if Studio-safe and reusable; otherwise Portal-only with thin shared tests for primary-variant rule

**Functions**
- Prefer **no** new callables. Reuse `createPortalPrintRequest`, `resolveOrCreateWorkingPrintRequestInTransaction`, `confirmCustomerUploadsAndAttachToRequest`, `duplicatePortalPrintRequestItem`, `queuePortalPrintRequestToShow`
- Only touch Functions if a concurrency/stale-state gap requires a server helper — justify in implement notes

### Architecture Impact
- [x] Details: Extend Component → Hook → Service. Centralize Current Request in provider/hook. No Firebase in components. No custom REST API.

### Security Impact
- [x] Details: Keep server-authoritative one-working, upload validation, and show queue. Client aggregates are display-only. No secrets. No production rule relaxations planned.

### Data Model Impact
- [x] Details: **No new collections.** Prefer no new required fields. Optional ADR note only. Primary variant is derived, not stored. If implement discovers need for `duplicatedFromItemId`, stop and revise plan — not assumed in v1.

### Backend Impact
- [x] Details: Prefer client Firestore item writes already used by Portal catalog add + existing callables. Deploy Functions to `fresh-prints-dev` only if changed.

### UI / UX Impact
- [x] Details: Header, drawer, catalog cards, dedicated artwork page, Review Request polish. Manual UI checkpoint required (desktop + mobile).

### Migration Impact
- [x] Forward: Stop routing normal browse into selection mode; keep legacy `?mode=request-selection` readable temporarily; redirect/retire after stable; move upload entry to `/requests/artwork`.
- [x] Rollback: Feature-flag or restore selection-mode entry from Add CTA if regress; selection mode code retained until Part G cleanup.

---

## Approach (implementation parts)

### Part B — Shared Current Request foundation

1. Extend `PortalPrintRequestProvider` (or nested hook) to expose:
   - `workingRequest: PrintRequest | null` (continuable; expect 0–1)
   - `items` subscription when working id exists
   - `isVirtualEmpty` when authenticated and no working doc
   - Aggregates: distinct design count, total print qty, attention count, per-design totals, primary item id map
2. Ensure create paths converge: add catalog, upload attach, explicit create all use existing ADR-FP-071 gates.
3. After successful `queuePortalPrintRequestToShow`, clear local current-request view to virtual empty (list query will drop continuable); guard double-submit in existing queue hook.
4. Unit-test aggregates + primary variant selection.

### Part C — Header + Current Request drawer

1. Wire authenticated header (and mobile equivalent) with Upload Artwork → `/requests/artwork` and basket button.
2. Badge = **total print quantity** (not distinct designs). Empty basket still visible (qty 0).
3. Drawer: right-side desktop; near-full-screen sheet mobile. Summary rows grouped by design (variants listed). Actions: remove line, Review Request, link to `/requests` history. Primary CTA label: **Review Request** (never Checkout).
4. Show attention summary when count > 0.

### Part D — Catalog / Discover direct-add

1. Change Add CTA to persist immediately via service (`addPrintRequestItem` or qty++ on primary) without navigating to selection mode.
2. Preserve search/filter/scroll/carousel state (no route change on add).
3. Card states: Add vs `In Current Request · Qty N` (aggregate).
4. Success toast/feedback; debounce/guard double-clicks.
5. Stop default use of `enterSelectionWithSeed` / `buildCatalogSelectionHref` from normal browse.
6. Discover rails, library, search, category filters, design details modal — all share Current Request quantities.

### Part E — Dedicated Request Artwork page

1. Add `apps/portal/app/(app)/requests/artwork/page.tsx`.
2. Reuse `CustomerUploadPanel` / `useCustomerUploadBatch` as page content (refactor modal shell → page layout).
3. Copy: **Upload Artwork for Printing** + supporting sentence tying to Current Request / show printing.
4. After confirm+attach: update Current Request state; success summary with Review Request / Continue browsing; do **not** auto-queue show or auto-publish catalog.
5. Detail page keeps shortcut link; remove dependency on full embedded upload UI once page is primary.
6. Explicitly **no** donation language or controls.

### Part F — Review Request page

1. Heading/summary: Review Request; `N designs · M total prints`.
2. Preserve qty, resize, aspect lock, DPI rules (ADR-FP-075), duplicate-for-size, remove-one-variant, upload-backed items, show picker, **Add Request to Show**.
3. Group variants visually where helpful without merging records.
4. Post-queue confirmation copy resets Current Request messaging.

### Part G — Compatibility cleanup

1. Legacy selection-mode routes: keep readable briefly; redirect or retire once direct-add proven.
2. Remove obsolete pending-selection workarounds only after tests prove unused.
3. Update docs: ROADMAP, ARCHITECTURE, DECISIONS (ADR), customer workflow / feature inventory, handoff CURRENT-STATE.
4. Confirm Studio selection mode untouched.

**Subphase split:** Prefer **one** managed implementation pass with Parts B→G sequential commits. If Review finds risk too high, split into two approved subphases: (1) B+C+D foundation+catalog, (2) E+F+G artwork page + cleanup — without changing product intent.

---

## ADR recommendation

**New ADR required** (e.g. ADR-FP-076): Portal Persistent Current Request — cart-style UX; lazy empty request; direct-add without selection mode; dedicated `/requests/artwork` for printing uploads; terminology; separation from future donations; Studio selection mode unchanged.

Update DECISIONS.md during implement/signoff.

---

## Terminology (customer-facing)

| Use | Avoid |
|-----|--------|
| Current Request | Cart checkout / Order |
| Review Request / Request Details | Checkout |
| Upload Artwork for Printing | Donate / Upload for library only |
| Add Request to Show | Place order / Purchase / Shipping |

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Lint | `npm run lint` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Portal build | `npm run build:portal` | yes |
| Shared unit | `npx tsx --test packages/shared/src/**/*.test.ts` (or narrower globs per TESTING.md) | yes |
| Portal unit | `npx tsx --test apps/portal/**/*.test.ts` | yes |
| Functions build | `cd functions && npm run build` | if Functions change |
| Functions unit | `npx tsx --test functions/src/**/*.test.ts` | if Functions change |

**New/updated unit coverage (minimum):**
- One-working resolution + virtual empty
- Lazy create triggers (no create on load)
- Aggregate quantity / distinct designs
- Primary variant selection + increment
- Multi size variants not merged
- Attention count derivation
- Queue success → empty current request
- Double-click / stale guards where logic is pure
- Legacy selection-mode compatibility helpers
- Artwork page route/helpers

### Manual

Full desktop + mobile checkpoint covering owner-provided 24 steps (empty request → add → aggregate → duplicate → upload page → DPI → queue → reset → multi-tab → Studio selection unchanged → no donation UI). Artifact under `docs/workflow/reviews/`.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (required before signoff)
- [ ] Design approval — covered by manual checkpoint
- [ ] Business logic decision — terminology/donation boundary locked in this plan; escalate only if conflict
- [ ] Production deploy — **out of scope**
- [ ] Database migration — none planned
- [ ] Auth / external service setup — none
- [ ] Secrets / env — none

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Broad Portal UX surface regressions | high | Parts B→G; keep selection mode until D proven; manual checkpoint |
| Duplicate working requests (tabs/devices) | high | Keep server ADR-FP-071 transaction; client block + error handling |
| Stale drawer after queue | medium | Rely on list listener; optimistic clear + refetch |
| Catalog scroll/filter reset | medium | In-place mutations; no navigation on add |
| Accidental donation conflation | medium | Dedicated route + copy; no donation controls |
| Scope too large for one pass | medium | Review may split into two subphases |
| Studio selection regression | low | Do not touch Studio request-selection code |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

- Revert Portal PR / restore selection-mode entry on Add CTA and `?upload=1` modal path.
- No production deploy in this phase — rollback is git revert on `fresh-prints-dev` deploys only if Functions touched.

---

## Documentation Updates Required

- [ ] ARCHITECTURE.md — Portal Current Request surfaces
- [ ] DATA_MODEL.md — only if contracts change (prefer none)
- [ ] BACKEND.md — only if callables change
- [ ] TESTING.md — new Portal unit globs / manual notes
- [ ] DECISIONS.md — new ADR
- [ ] ROADMAP.md — mark this fast-follow in progress → complete at signoff
- [ ] Feature inventory / handoff CURRENT-STATE / 13-recent / 05-workflows
- [ ] Explicit request-artwork vs future-donation note in customer workflow docs

---

## Open Questions

- [x] Upload route: **`/requests/artwork`** (verified need; chosen to stay under requests and avoid `/uploads`)
- [x] Lazy vs eager: **lazy** (verified)
- [x] Primary variant: **earliest catalog-backed item by createdAt** (defined above)
- [ ] None blocking — Review may require subphase split

---

## Acceptance Criteria

(See owner prompt — all must be met at signoff.)

### Boundaries (must hold)
- No payment/shipping; no donation workflow; no production deploy; no Studio selection rewrite; no `designs.status` production writes; upload + queue remain server-authoritative.

---

## Binding review changes (2026-07-12)

From `docs/workflow/reviews/2026-07-12-portal-persistent-current-request-review.md` (**approved_with_changes**):

1. Single item-subscription owner for working-request items (provider/hook shared by drawer, catalog, detail).
2. Pure attention util + tests (DPI &lt;200, 200–299 warn, upload processing/failed, missing/invalid size).
3. No silent new persisted fields for primary variant; revise plan if needed.
4. Artwork attach uses existing resolve-or-create / create callables — document chosen path in implement notes.
5. Unit test: re-add increments primary only when a second size variant exists; manual checks for Studio selection + no donation copy.
6. Part G: do not delete selection-mode until direct-add manual criteria pass.

## Approval

- Review doc: `docs/workflow/reviews/2026-07-12-portal-persistent-current-request-review.md`
- Verdict: **approved_with_changes**
