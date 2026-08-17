# Plan: Portal Design Details / share Add-to-request quantity parity (TD-030)

| Field | Value |
|-------|-------|
| Date | 2026-08-16 |
| Author | Planning Agent |
| Status | complete |
| Workflow | managed-phase |
| Goal | `portal-details-share-add-to-request-quantity-parity` |
| Related | TD-030; Stage 1b-C signoff `docs/workflow/reviews/2026-08-07-stage-1b-c-algolia-owner-qa-signoff.md`; cutover Wave 4 `docs/workflow/reviews/2026-08-16-myprintrequest-com-cutover-wave-4-result.md` |
| Branch | `development` |

---

## Goal

Authenticated Portal customers see the **same Working Request quantity controls** used on Discover/catalog cards when a design is already in the Working Request — on **Design Details** and on **`/share/design/{id}`**. After a successful add, “Add to request” must reconcile immediately into that stepper. Guests stay login-gated. No new quantity-control implementation.

Cutover (`myprintrequest.com`) is **CLOSED**. Do not reopen it. Phase 9 remains parked. No production App Hosting rollout in this goal.

---

## Background

TD-030 was deferred from Stage 1b-C owner QA (PASS WITH NOTES). Wave 4 domain smoke (2026-08-16) **reconfirmed** the share-page half on live `https://myprintrequest.com/share/design/{id}`: after add, the CTA stays “Add to request.”

Repo inspection (2026-08-16) shows the defect is **not** a missing stepper component. Discover/catalog already switch via `CatalogSelectionCard` + `CatalogRequestQuantityControls`. Design Details **already accepts and renders** those controls when parents pass membership + handlers. The share page computes membership and **ignores it**.

---

## Root cause / current-state inventory

### Parity baseline (do not change)

| Piece | File | Behavior |
|-------|------|----------|
| Qty stepper | `apps/portal/features/catalog/components/CatalogRequestQuantityControls.tsx` | Shared +/- / trash-at-1 / commit-0-remove |
| Catalog/Discover cards | `apps/portal/features/catalog/components/CatalogSelectionCard.tsx` | `isSelected` → stepper; else Add |
| Membership + qty | `currentRequestAggregates.quantityByDesignId` / `primaryQuantityByDesignId` from `packages/shared/src/utils/currentRequestAggregates.ts` | Derived from Working Request items in `PortalPrintRequestContext` |
| Add / set qty / remove | `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.ts` | Optimistic working-items patch; no extra Firestore listener on the card |
| Working items | `useWorkingCurrentRequestItems` via print-request context | Existing listener/load path |

### Design Details (partially already done)

| Piece | File |
|-------|------|
| Modal | `apps/portal/features/catalog/components/CatalogDesignDetailsModal.tsx` |
| `showQuantityControls` | `isInCurrentRequest && onQuantityChange && onRemoveFromRequest` |
| Wired parents | `CatalogHomePageContent.tsx`, `CatalogPageContent.tsx`, `FavoritesPageContent.tsx`, `AccountArtworkGallery.tsx` |
| Tests | `CatalogDesignDetailsRequestQty.test.ts` (source-level; asserts parents pass handlers) |

**Inventory conclusion for A:** Modal + Discover/Library/Favorites/Account already pass `isInCurrentRequest`, `currentRequestQuantity`, `addDesignFlow.setQuantity`, `addDesignFlow.removeDesign`. If owner still sees Add-after-add on **modal** in DEV QA, that is an aggregate/reconcile lag to fix in the same add-flow path — not a second stepper. Do not rewrite the modal.

### `/share/design/{id}` (the remaining hole)

| Piece | File |
|-------|------|
| SSR / OG / canonical | `apps/portal/app/(app)/share/design/[id]/page.tsx` — `generateMetadata` + `loadPortalDesignShareMeta`; **do not change** except if a type-only import is required (expected: **none**) |
| Client shell | `apps/portal/features/catalog/pages/ShareDesignPortalPageContent.tsx` |

Share page already:

- Uses `useAddDesignToRequestFlow` + `currentRequestAggregates`
- Computes `isInCurrentRequest` from `quantityByDesignId`
- Always renders the Add button for authenticated users (lines ~290–300)
- Does **not** import `CatalogRequestQuantityControls`
- Does **not** call `addDesignFlow.setQuantity` / `removeDesign`

That is the Wave 4 defect.

### Backend / deploy

**None.** No Rules, Functions, indexes, Storage, Algolia, Auth, DNS, App Hosting.

---

## Scope

### In Scope

- Wire share page primary CTA to the same Add vs `CatalogRequestQuantityControls` split as Design Details.
- Use existing `currentRequestAggregates` + `addDesignFlow.addDesign` / `setQuantity` / `removeDesign`.
- Confirm Design Details parents still pass membership/qty; fix only if a real gap remains (missing handler, wrong aggregate field).
- Tests: share-page source assertions + keep/extend details wiring tests.
- Owner DEV QA checklist (below). Stop before production promotion.

### Out of Scope

- myprintrequest.com DNS/cutover, GA4, Search Console, announcement
- Algolia, Rules, Functions, indexes, schema, Studio, Phase 9
- Sizing/DPI, Add to Show, catalog search/filter, favorites, OG redesign
- New Firestore listeners or a parallel qty component
- Broad Portal request-flow refactor
- Production App Hosting rollout

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/catalog/pages/ShareDesignPortalPageContent.tsx` (**primary**)
- `apps/portal/features/catalog/components/CatalogDesignDetailsRequestQty.test.ts` (extend) **or** adjacent `ShareDesignPortalPageContent` source test
- Possibly no change to `CatalogDesignDetailsModal.tsx` if inventory holds
- Docs: ROADMAP, TECH_DEBT TD-030 (at signoff if both surfaces pass), workflow artifacts

### Architecture Impact

- [x] None (reuse existing component + context aggregates)

### Security Impact

- [x] Details: guests must not see Working Request qty or private item state. Share page already gates Add behind `isAuthenticated`; qty controls only when authenticated **and** in-request.

### Data Model Impact

- [x] None

### Backend Impact

- [x] None

### UI / UX Impact

- [x] Details: share page CTA matches Discover cards / Design Details. Manual DEV QA required.

### Migration Impact

- [x] None

---

## Approach

1. **Share page (required):** In `ShareDesignPortalPageContent` primary action row, mirror Design Details:
   - Guest → existing “Sign in to add to a request”
   - Authenticated + `isInCurrentRequest` → `CatalogRequestQuantityControls` with `quantity` from `primaryQuantityByDesignId ?? quantityByDesignId` (same as modal parents), `onQuantityChange={addDesignFlow.setQuantity}`, `onRemove={addDesignFlow.removeDesign}`, `canAddPrints` / exhausted title from the flow
   - Authenticated + not in request → existing Add button (`addDesignFlow.addDesign`)
2. **Do not** add `onSnapshot` / extra `getDoc` on the share page. Membership comes from context aggregates already loaded for signed-in Portal.
3. **Do not** change `page.tsx` SSR metadata.
4. **Details:** Re-read parent wiring during implement; only patch if a parent omits handlers or uses a stale membership source. Prefer zero modal diff.
5. **No new shared wrapper** unless share and modal would otherwise copy a large block; prefer calling `CatalogRequestQuantityControls` directly (same as the modal).
6. Tests: source-level (existing project pattern) asserting share page imports/renders `CatalogRequestQuantityControls` when in-request, keeps guest Sign-in, does not add Firestore subscribe in the page component.
7. **STOP** after DEV tests + owner DEV QA. Production promotion is a **separate** owner phrase (see Signoff / promotion).

### Read / listener impact

- **No new listeners.** Share page already consumes `usePortalPrintRequests()` aggregates.
- After add, existing optimistic working-item patch in `useAddDesignToRequestFlow` should flip `quantityByDesignId` so the CTA swaps without a reload. Refresh reconstructs via existing working-items load.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | `npm run lint` | yes (Portal TSX touched) |
| Unit tests | `npx tsx --test apps/portal/features/catalog/components/CatalogDesignDetailsRequestQty.test.ts` (+ new share source test if split) | yes |
| Build | `npm run build:portal` | yes |
| `git diff --check` | `git diff --check` | yes |
| Integration / E2E / rules | — | no |

### Manual

Owner DEV QA on localhost Portal (`npm run dev:portal` → `http://localhost:3100`) against `fresh-prints-dev`. Checklist in Human Checkpoints.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (DEV QA)
- [x] Production deploy — **STOP**; separate phrase after this goal’s DEV signoff
- [ ] Design approval — N/A
- [ ] Database migration — N/A
- [ ] Auth / external service — N/A
- [ ] Secrets — N/A

### Owner DEV QA checklist

1. Login as a customer.
2. Open a Discover/catalog design; confirm card qty controls still work.
3. Open Design Details for a design **not** in the request → Add → CTA becomes qty **without** closing the modal.
4. Change quantity, close modal, reopen → quantity persists.
5. Open `/share/design/{id}` for a design **not** in the request → Add → CTA becomes qty immediately.
6. Change quantity on the share page, refresh → quantity persists.
7. Open a shared design **already** in the request → qty controls immediately.
8. Logged-out share page still public; request action remains Sign in.
9. No obvious console errors.
10. Share metadata/page rendering not broken (title/description/preview still show).

Reply: `DEV TD-030 QA: PASS` / `FAIL` / `PASS WITH NOTES`.

### Production promotion (after DEV signoff — **not this implement pass**)

Exact later phrase (do not run now):

```
AUTHORIZE PROD APP HOSTING ROLLOUT: TD-030 QTY PARITY
```

Target: `fresh-prints-portal` on `fresh-prints-prod` from an authorized `production` tip. No DNS/cutover.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Share page add does not optimistic-update aggregates | Medium | Same `addDesign` path as cards; if QA fails, fix flow not a new listener |
| Qty on share writes wrong variant | Low | Use `primaryQuantityByDesignId` like details parents |
| Guest sees request state | High | Qty only when `isAuthenticated && isInCurrentRequest` |
| Accidental SSR/OG break | Medium | Do not edit `page.tsx` metadata |
| Scope creep into details rewrite | Medium | Details already wired; confirm only |
| Production deploy during this goal | High | Forbidden; separate phrase |

---

## Rollback Plan

Revert the share-page (and any details) commit on `development`. No backend rollback. Production unchanged until a later rollout.

---

## Documentation Updates Required

- [x] ROADMAP.md (goal status)
- [x] TECH_DEBT.md TD-030 — **only at signoff if both surfaces pass**
- [ ] DEPLOYMENT.md — only if a promotion record is added later
- [x] Other: workflow plan/review/test/signoff; CURRENT-STATE / 13-recent at signoff

---

## Open Questions

- [x] None blocking. Backend/deploy = **none**.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-16-portal-details-share-add-to-request-quantity-parity-review.md`
- Verdict: **approved** (2026-08-16)
