# Plan: Phase 8 Slice 3 — Portal Customer Print Requests

| Field | Value |
|-------|-------|
| Date | 2026-07-07 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | `docs/workflow/plans/2026-07-07-phase-8-portal-foundation-plan.md` (Slice 3) |

---

## Goal

Enable authenticated Portal customers to **create, view, and edit their own print requests** — add catalog designs with quantity, revisit draft requests, and see a mobile-first list/detail UI. Requests are written with `requestOrigin: "portal_customer"` and follow existing CR naming (`{username}-CR{sequence}`).

**Slice 3 exit:** Customer creates a print request from the catalog, adds designs with quantity, and finds it again on the Requests tab.

---

## Background

- Phase 8 Slices 0–2 are complete. User verified Slice 2 catalog UI on mobile (including filter layout fix).
- Shared types already define `portal_customer` origin; Firestore rules validate the value but **only staff** can read/write `printRequests` and `printRequestItems` today.
- Studio's `createCustomerPrintRequestInTransaction` (`printRequestService.ts`) is the reference for sequence allocation, naming, and payload shape — but writes `studio_customer` and requires staff permissions.
- Customers cannot update `customers/{id}` (sequence counters) under current rules — **callable required** for atomic create.
- `firestore.indexes.json` already has `printRequests: customerId + updatedAt DESC` — no new index needed for list queries.

---

## Scope

### In Scope

**Backend — Cloud Function**

1. New callable `createPortalPrintRequest` (authenticated, `role: customer`):
   - Resolve linked `customers/{id}` where `userId == auth.uid`
   - Transaction: increment `nextPrintRequestSequence`, bump `totalPrintRequests`, create `printRequests/{id}` with `requestOrigin: "portal_customer"`, `status: "draft"`, `itemCount: 0`, CR name via `formatCustomerPrintRequestName`
   - Reuse shared validation helpers where possible (`functions/src/lib/`)
   - Optional `notes` field on create

**Backend — Firestore rules**

2. Helper functions:
   - `customerOwnsPrintRequest(printRequestId)` — load parent, verify `customerId` matches caller's linked customer doc
   - `isCustomerEditablePrintRequestStatus(status)` — `draft` or `editing` only
   - `isPortalCustomerPrintRequest(data)` — `requestOrigin == "portal_customer"`, `isInternal == false`, `customerId` set

3. `printRequests` customer rules:
   - **Read:** own requests (`customerId` matches linked customer)
   - **Update:** own requests in editable status; **only** `itemCount`, `notes`, `updatedBy`, `updatedAt` may change (immutable name, origin, sequence, status, customerId)
   - **Create/delete:** deny direct client create/delete (create via callable; delete deferred)

4. `printRequestItems` customer rules:
   - **Read:** item's parent request is owned by caller
   - **Create:** parent owned + editable status + `isReadyDesign(designId)` + `addedBy == auth.uid` + valid item schema; default `status: "pending"`
   - **Update:** parent owned + editable status; allow `quantity`, sizing fields (`printWidthInches`, `printHeightInches`, `sizeLabel`), `notes`, `sortOrder`, `updatedAt` — **not** `status`, `designId`, `printRequestId`, `addedBy`, production timestamps
   - **Delete:** parent owned + editable status

5. Deploy rules to **dev** (human checkpoint).

**Portal — feature module** (`apps/portal/features/print-requests/`)

6. **Services:** `portalPrintRequestService.ts`
   - `createPrintRequest(notes?)` → callable
   - `listMyPrintRequests()` → query `where customerId == linkedCustomerId orderBy updatedAt desc`
   - `getPrintRequest(id)`, `listPrintRequestItems(printRequestId)`
   - `addPrintRequestItem`, `updatePrintRequestItem`, `removePrintRequestItem` — direct Firestore writes (rules-enforced)
   - Sizing: reuse `@fresh-prints/shared` `resolveInitialPrintRequestItemSize`, `assessPrintRequestItemSize`, `MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES`

7. **Hooks:** `useMyPrintRequests`, `usePrintRequestDetail`, `useCreatePrintRequest`

8. **Pages / UI:**
   - Replace `/requests` placeholder with list (cards: name, item count, updated date, draft badge)
   - `/requests/[id]` detail: item list with thumbnails, quantity edit, remove item, add designs CTA
   - "New request" flow from Requests tab (creates empty draft, navigates to detail)
   - Catalog integration: **"Add to request"** on design details modal — pick existing draft or create new, then add item with default size from design
   - Mobile-first styles in `apps/portal/styles/requests.css`
   - Empty states and error handling consistent with catalog patterns

9. **Tests:**
   - Unit tests for any new Portal pure utils (e.g. request list sorting helpers if extracted)
   - Callable validation tests in `functions/src/lib/` (mirror `registerCustomerValidation.test.ts` pattern)

### Out of Scope (Slice 3)

- Slice 4 progress tracking / allocation badges (read-only queue state)
- Customer delete/archive of requests
- Customer-initiated status transitions (`draft` → `active` happens via staff show allocation in Studio)
- Show allocation, gang sheet, import, AI, design status changes
- `designs.requestCount` increment from Portal (Studio bumps on add; defer to follow-up callable or trigger — document as low-risk analytics gap)
- Payments, checkout, custom requests (Phase 9)
- App Hosting production deploy

---

## Affected Areas

### Files / Modules (expected)

| Area | Paths |
|------|-------|
| Cloud Function | `functions/src/createPortalPrintRequest.ts`, `functions/src/index.ts`, `functions/src/lib/createPortalPrintRequestValidation.ts` |
| Firestore rules | `firestore.rules` |
| Portal feature | `apps/portal/features/print-requests/**` |
| Portal pages | `apps/portal/app/(app)/requests/page.tsx`, `apps/portal/app/(app)/requests/[id]/page.tsx` |
| Catalog hook-up | `apps/portal/features/catalog/components/CatalogDesignDetailsModal.tsx` |
| Portal styles | `apps/portal/styles/requests.css`, `apps/portal/app/globals.css` |
| Shared (read-only reuse) | `packages/shared/src/utils/printRequestNaming.ts`, `printRequestItemSizing.ts`, types |

### Architecture Impact

- [x] Portal gains a print-requests feature module following catalog/auth patterns (services → hooks → components → pages).
- Portal must not import Studio renderer or Electron code.
- Callable owns cross-collection create; item mutations stay in Portal services with rules as the security boundary.

### Security Impact

- [x] New customer write surface on `printRequests` (narrow update) and `printRequestItems` (CRUD on editable drafts).
- Callable verifies `role: customer` and linked customer doc before create.
- Rules enforce ownership, `portal_customer` origin on created docs (via callable), ready-design check, editable status gate.
- Customers cannot read/write other customers' requests, staff collections, or mutate item/request production status.
- **Security Agent review required before rules deploy.**

### Data Model Impact

- [x] No new collections or fields. Uses existing `printRequests`, `printRequestItems`, `customers` counters.
- Writes `requestOrigin: "portal_customer"` as documented in `DATA_MODEL.md`.

### Backend Impact

- [x] One new callable function; deploy to dev with human approval.
- No new env vars beyond existing Firebase/Functions setup.

### UI / UX Impact

- [x] New mobile-first Requests list + detail flows; catalog "Add to request" action.
- Manual UX review checkpoint before Slice 3 signoff.

### Migration Impact

- [x] None. Forward-compatible; no backfill.

---

## Approach

### Step 1 — Callable `createPortalPrintRequest`

1. Add validation module (notes length, auth required).
2. Implement transaction mirroring `createCustomerPrintRequestInTransaction` but:
   - Assert caller is customer (`users/{uid}.role == "customer"`)
   - Load customer by `userId == auth.uid` (not by passed customerId — prevent impersonation)
   - Set `requestOrigin: "portal_customer"`
3. Export from `functions/src/index.ts`.
4. Add unit tests for validation.

### Step 2 — Firestore rules

1. Add helper to resolve customer's linked `customerId` from auth (query pattern: rules use `get()` on customer doc if we store lookup — **prefer**: helper that reads `customers` where `userId == auth.uid`; Firestore rules can't query, so use **customer doc id passed in token custom claims OR** store `customerId` on `users/{uid}` document).

**Decision:** Check if `users/{uid}` has `customerId` field. If not, add optional `customerId` on user doc at registration (already may exist) OR use `get(/databases/.../customers/{customerId})` only when customerId is on the request resource matching a `get(users/uid).customerId` link.

Inspect `registerCustomer` — does it set customerId on user doc?

I'll note in plan: verify user→customer link. Portal uses `getCustomerByUserId` query. For rules, options:
- A) Add `customerId` to `users/{uid}` at registration (if not present)
- B) Use collection group query (not in rules)
- C) Pass customerId in writes and verify via `get(customers/{id}).userId == auth.uid`

Option C works for rules on printRequests where resource.data.customerId is verified against customer doc's userId field.

Helper: `function customerOwnsRequestData(data) { return isCustomer() && get(/databases/$(database)/documents/customers/$(data.customerId)).data.userId == request.auth.uid; }`

5. Implement read/update/create/delete rules per scope above.
6. Keep staff rules unchanged (staff paths remain primary).

### Step 3 — Portal services and hooks

1. Scaffold `features/print-requests/services/portalPrintRequestService.ts`.
2. Wire callable via existing Portal Firebase functions pattern (check how auth callables are invoked in portal).
3. Implement list/detail/item CRUD.
4. Add hooks with loading/error states.

### Step 4 — Portal UI

1. Requests list page with "New request" FAB/button.
2. Request detail page with item management.
3. Extend catalog design modal with "Add to request" (sub-modal or inline picker for draft requests).
4. Styles matching Portal shell + catalog patterns.

### Step 5 — Verification and deploy checklist

1. Automated checks (typecheck, lint, build, tests).
2. Human: deploy function + rules to dev; manual E2E on phone via tunnel.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Studio typecheck | `npx tsc --noEmit` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | `npm run lint` | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Callable validation tests | `npx tsx --test functions/src/lib/createPortalPrintRequestValidation.test.ts` | yes |
| Portal unit tests | As added under `apps/portal/features/print-requests/` | yes |
| Studio build | `npm run build:studio` | yes |
| Portal build | `npm run build:portal` | yes |
| Full shared/Studio test sweep | `npx tsx --test` on existing suites | yes |

### Manual

- [ ] Portal: create new request from Requests tab → lands on detail with CR name
- [ ] Portal: add design from catalog modal → item appears on request with default size
- [ ] Portal: edit quantity, remove item on draft request
- [ ] Portal: list shows multiple requests sorted by recent
- [ ] Studio: staff still sees portal-created request with "Customer Submitted" origin badge
- [ ] Security: second customer account cannot read first customer's requests (dev test)
- [ ] Mobile viewport via Cloudflare tunnel

---

## Human Checkpoints Anticipated

- [ ] Deploy `createPortalPrintRequest` function to `fresh-prints-dev`
- [ ] Deploy updated `firestore:rules` to `fresh-prints-dev`
- [ ] Manual mobile E2E (create → add design → revisit)
- [ ] Production deploy — separate approval (not Slice 3)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Rules too permissive (cross-customer access) | High | Ownership helper via `customers/{id}.userId`; security review; dev negative test |
| Sequence race on concurrent creates | Medium | Callable transaction (same as Studio) |
| `designs.requestCount` not incremented from Portal | Low | Document gap; add trigger/callable in follow-up if needed for analytics |
| Item add fails rules on sizing fields | Medium | Mirror Studio payload shape exactly; unit test validation |
| Customer edits request after staff queues it | Medium | Rules block updates unless status is `draft` or `editing` |
| Duplicate Portal/Studio service logic | Medium | Reuse `@fresh-prints/shared` utils; keep Portal service thin |

---

## Rollback Plan

- Redeploy prior `firestore.rules` from git.
- Disable/remove `createPortalPrintRequest` export; redeploy functions.
- Portal UI revert leaves placeholder page (no data migration).

---

## Documentation Updates Required

- [ ] `docs/architecture/BACKEND.md` — document `createPortalPrintRequest` callable
- [ ] `docs/architecture/DATA_MODEL.md` — note Portal writes `portal_customer` (if not already explicit enough)
- [ ] `docs/standards/TESTING.md` — Portal print request test commands if new
- [ ] Phase 8 signoff doc (after Slice 4)

---

## Open Questions

- [ ] **Add to request UX:** inline picker of open drafts vs. always create new — **default: show picker when drafts exist, else create new** (matches Studio mental model).
- [ ] **Sizing on Portal:** use design default print width only (no custom size picker in Slice 3) — **default: yes**, same as `resolveInitialPrintRequestItemSize` default path.
- [ ] **Notes field:** expose optional notes on create/detail — **default: yes** (optional textarea).

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-07-phase-8-portal-slice3-print-requests-review.md`
- Verdict: pending
