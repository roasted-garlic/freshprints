# Plan: Customer Request, Show Discovery & Search Correctives

| Field | Value |
|-------|-------|
| Date | 2026-08-22 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Managed goal | `customer-request-show-discovery-and-search-correctives` |
| Related | docs/workflow/reviews/2026-08-22-customer-request-show-discovery-and-search-correctives-review.md |

---

## Goal

Deliver five coordinated Fresh Prints improvements: (1) Studio **Convert to Internal Request** for eligible customer requests, (2) Internal Gang Sheet **Mark Complete** reconciliation so Internal Print Requests reach **Printed** when production is done, (3) Portal username registration usability with Whatnot guidance and precise validation, (4) Portal **Show Designs** calendar + catalog gallery for upcoming shows, and (5) case/separator-insensitive Design Library search on Portal and Studio.

Roadmap alignment: Phase 6 Print Requests, Phase 7 Show Queue / Internal Gang Sheets, Phase 8 Portal fast-follow, Phase 4 Design Library search corrective. **Phase 9 is out of scope.**

---

## Background

Workflow is **IDLE** after `studio-release-latest-and-final-copy-gates` (Studio 1.0.8 published). This package captures owner-requested correctives and fast-follow features without production deploy, Studio publish, or Phase 9 work.

Repo inspection (2026-08-22) confirms:

- No existing Customer → Internal conversion flow; `isInternal` + `requestOrigin` are immutable in practice via Rules.
- Internal Gang Sheet completion (`completeStaffGangSheetAndOpenNext`) closes the sheet cycle only — it does **not** mark allocations `done` or reconcile print requests.
- Username lowercase-only is **intentional** across shared validator, Firestore Rules, and reservation doc IDs — but Portal HTML `pattern` blocks mixed-case input before server validation and messaging is poor.
- No Portal **Show Designs** route; cross-customer show lineup requires a new trusted callable.
- Design Library case bug is in **client post-filter** tag matching when `catalogTags` is empty; separator normalization is not implemented anywhere.

---

## Proposed workstream structure

All five workstreams remain in **one approved plan package**. Implementation is split into **three sequential waves** to keep review/deploy risk bounded:

| Wave | Workstreams | Rationale |
|------|-------------|-----------|
| **Wave 1 — Production correctives** | WS2, WS5 | Isolated bug fixes + shared search contract; no schema migration |
| **Wave 2 — Portal discovery & UX** | WS3, WS4 | Portal + new callables; independent of conversion |
| **Wave 3 — Conversion workflow** | WS1 | Schema + trusted mutation; E2E test depends on WS2 |

Waves may ship as separate DEV QA checkpoints; production promotion remains owner-gated per wave.

---

## Root-cause findings

### WS2 — Internal Gang Sheet completion

**Root cause (high confidence):** `completeStaffGangSheetAndOpenNext` (`functions/src/completeStaffGangSheetAndOpenNext.ts`) only updates `upcomingShows` (mark completed + open next cycle). It never:

1. Sets related `showAllocations` to terminal `done`,
2. Invokes `markPrintRequestCompletedIfFullyPrinted` / `reconcileCompletedPrintRequest`,
3. Sets `printRequests.status` to `completed`.

Allocations remain `pending` after attach → `derivePrintRequestListTab` → **Queued**, not **Printed**. Whatnot shows use `upcomingShowService.markShowPrintingFinished`, which performs the full finish + reconciliation path (`apps/studio/.../upcomingShowService.ts` ~1838+).

**Contributing factor:** C-SHARED design intentionally bypasses production timer for `staff_gang_sheet`; reconciliation was documented as “reuse with staff-specific step” but only the next-cycle step shipped.

### WS3 — Username usability

**Finding:** Lowercase-only is **architecturally required**, not accidental:

| Layer | Enforcement |
|-------|-------------|
| `packages/shared/src/utils/customerUsername.ts` | `normalizeCustomerUsername()` → trim + `toLowerCase()`; pattern `^[a-z0-9]...$` |
| `firestore.rules` | `isValidCustomerUsername()` same lowercase pattern |
| `customerUsernames/{username}` | Doc ID = normalized username (case-insensitive uniqueness) |
| Portal `RegisterForm.tsx` / `CompleteProfileForm.tsx` | HTML `pattern="[a-z0-9]..."` **blocks uppercase before submit** |
| `registerCustomer.ts` | `alreadyExists("That customer username is already taken.")` on reservation collision |

**UX root cause:** Portal exposes lowercase as a typing constraint (HTML pattern + static hint) instead of accepting natural capitalization and normalizing on submit. Error messages from server are generic when mapped through auth layer.

**No change to reservation doc ID strategy or CR### naming** — display may show user’s typed casing only if we add a separate display field; **recommended: normalize on submit, store lowercase, improve copy**.

### WS5 — Design Library search

**Root cause:** Client post-filter uses case-insensitive `title`/`description` but **case-sensitive** tag `includes()` when `catalogTags` is empty:

- Studio: `designLibrarySearch.ts` line 63 — `tag.includes(normalizedQuery)` without lowercasing tag
- Portal: `catalogSearch.ts` line 74 — same pattern

Studio managed (Algolia) search returns hits, then `useDesignLibraryManagedSearch` post-filters via `designMatchesSearchQuery` → mixed-case legacy tags drop valid hits (e.g. `Mindful` tag, query `mindful`).

Portal Algolia path skips client re-filter (`useCatalogDesigns.ts`); Firestore browse fallback has the same tag bug. **Separator-insensitive matching is not implemented** on either surface.

**Studio Design ID search** (`designLibraryExactIdSearch.ts`) is independent and must remain unchanged.

---

## WS1 — Convert Customer Request to Internal Request

### Current schema / lifecycle

- **Types:** `packages/shared/src/types/printRequest/printRequest.types.ts`
- **Statuses:** `draft` | `active` | `editing` | `completed` | `archived`
- **Discriminators:** `isInternal`, `requestOrigin` (`portal_customer` | `studio_customer` | `studio_internal`)
- **List tabs:** `derivePrintRequestListTab()` — `completed` or printed qty ≥ requested → `printed`; allocations → `queued`/`printing`
- **Portal one-working-request gate:** continuable = `draft` | `editing` only (`portalWorkingPrintRequest.ts`, `isPortalContinuablePrintRequestStatus`)
- **Sequences:** customer `customers.nextPrintRequestSequence` (CR###); internal `counters/printRequests.nextInternalRequestSequence` (IR###)
- **Item copy pattern:** `duplicatePrintRequestItem` in Studio/Portal services (reference fields, no Storage duplication)
- **Metrics:** `requestCountApplied` on items — must not re-run on conversion copy

**No `closureKind` or conversion linkage fields exist today.**

### Proposed model (no data migration)

Add optional fields on `printRequests` (both directions auditable):

```ts
closureKind?: "converted_to_internal";
convertedToInternalRequestId?: string;
convertedFromCustomerRequestId?: string;
convertedAt?: Timestamp;
convertedBy?: string;
```

**Customer request terminal treatment:**

- Set `status: "archived"` (excluded from Studio operational tabs via `isPrintRequestIncludedInListTabs`)
- Set `closureKind: "converted_to_internal"` + `convertedToInternalRequestId`
- **Do not** set `status: "completed"` (that means printed)
- Cancel remaining non-terminal `showAllocations` on the customer request **only when eligibility allows** (see below); never silently re-home active show allocations

**Internal request creation:**

- New doc via existing internal sequence rules (`createInternalPrintRequestInTransaction` pattern)
- `requestOrigin: "studio_internal"`, `isInternal: true`
- Copy items in same transaction: preserve `designId`, `customerUploadId`, `sourceType`, `quantity`, sizes, `titleSnapshot`, `sortOrder`, `notes`; **omit** `requestCountApplied`; **do not** increment catalog request metrics
- Set `convertedFromCustomerRequestId` on internal request
- Default internal base name from customer username snapshot or staff-provided base name in modal

**Portal presentation:**

- Customer request remains in `listMyPrintRequests` history (all statuses loaded)
- Extend tab grouping / detail label: **“Converted to Internal Request · Closed”** when `closureKind === "converted_to_internal"`
- Map to **Printed** tab for history browsing OR dedicated closed chip on detail — **product default: Printed tab (terminal history)** with explicit closure label (not “Completed/Printed”)

**Studio presentation:**

- Action on Customer Request detail: **Convert to Internal Request** (confirm modal)
- Show link to created internal request on success
- Hide action when ineligible or already converted (idempotent: if `closureKind` set, show status not button)

### Eligibility (repo-derived)

Conversion **allowed** when all true:

| Rule | Source |
|------|--------|
| `isInternal === false` | customer/guest request |
| `requestOrigin` is `portal_customer` or `studio_customer` | not already internal |
| `closureKind` absent | not already converted |
| No allocations with status `in_progress`, `printed`, or `done` on any show | active production |
| No linked Whatnot show in `productionStatus === "printing"` with allocations for this request | `upcomingShows` + allocations query |
| Staff has print-request manage permission | Studio permission service |

Conversion **with automatic cleanup** when:

- Only `pending` (and optionally `queued`) allocations exist → cancel them atomically in conversion transaction with audit fields

Conversion **rejected** when:

- Any allocation `in_progress` / `printed` / `done`
- Request already `completed` or `archived` with other closure
- Concurrent conversion in progress (transaction idempotency key on customer request)

### Implementation approach

1. **Shared types + validation** — `packages/shared/src/types/printRequest/`, closure helpers, eligibility pure functions + tests
2. **Trusted callable** — `convertCustomerPrintRequestToInternal` in `functions/src/` (Admin SDK transaction):
   - Eligibility checks
   - Create internal request + copy items
   - Archive customer request + linkage fields
   - Cancel eligible allocations
   - Idempotent retry if internal already created for same customer request
3. **Studio UI** — `PrintRequestsPage.tsx` / detail actions; call via traced Functions wrapper
4. **Portal copy** — `PrintRequestCard.tsx`, `PrintRequestDetailView.tsx`, tab grouping helper
5. **Rules** — staff-only writes for new fields; customers read own closure metadata
6. **ADR** — `docs/project/DECISIONS.md` ADR for conversion semantics

### Idempotency

- Callable checks `convertedToInternalRequestId`; if set and target exists → return existing IDs (`alreadyConverted: true`)
- Transaction uses customer request doc as serialization point

---

## WS2 — Internal Gang Sheet completion reconciliation

### Approach

Extend staff completion to mirror Whatnot finish **for allocations on the completed sheet only**:

1. In `completeStaffGangSheetAndOpenNext` transaction (or immediate follow-up Admin batch in same callable):
   - Query `showAllocations` where `upcomingShowId == completedShowId` and status in finishable set (`pending`, `queued`, `in_progress` per `FINISHABLE_ALLOCATION_STATUSES`)
   - Set `status: "done"` + finish audit fields (match `markShowPrintingFinished` batch shape)
2. Collect distinct `printRequestId`s from affected allocations
3. For each ID, run shared reconciliation (`reconcileCompletedPrintRequest` logic) server-side:
   - Complete internal request only when **all** allocations across **all** sheets for that request are terminal printed/done/canceled
   - Partial sheet completion must **not** complete split requests

**Preferred architecture:** Extract shared `finishShowAllocationsAndReconcilePrintRequests(showId, actorId)` in `functions/src/lib/` (or `packages/shared` pure + Functions wrapper) reused by:

- Staff callable (new path)
- Optionally future Studio client path (keep Studio calling callable for helpers permission parity)

**Idempotency:** Re-running Mark Complete on completed sheet returns existing successor; allocation `done` writes are no-ops if already terminal; `markPrintRequestCompletedIfFullyPrinted` already handles `already_terminal`.

### Regression scope

- Do **not** change `markShowPrintingFinished` behavior for Whatnot shows
- Never write `designs.status`
- Customer requests unaffected except WS1 E2E path

### E2E test case (automated)

`Customer Request → Convert to Internal → allocate to Internal Gang Sheet → Mark Complete → Internal Request Printed` while customer request shows **Converted/Closed**.

---

## WS3 — Username usability & Whatnot recommendation

### Contract decision

**Keep lowercase canonical storage and case-insensitive uniqueness.** Remove **typing** friction, not architectural normalization.

### Changes

| Area | Change |
|------|--------|
| Portal registration + complete-profile | Remove restrictive HTML `pattern`; accept mixed case; `normalizeCustomerUsername()` on submit |
| Hint copy | Recommend: “Use your Whatnot username if you can. It helps us match your print requests to you during live shows.” (optional, not required) |
| Requirements affordance | Compact “Requirements” `<details>` or info button (match `portal-field-hint` / assisted-creation hint patterns) listing length, allowed chars, start/end rules |
| Client validation | Call shared `validateCustomerUsername()` before submit; surface **specific** `error` string |
| Server | Map reservation collision to stable code/message; ensure `registerCustomer` errors propagate |
| Studio Edit Customer | Align hint/validation messaging if username editable there |

### Tests

- `customerUsername.test.ts` — mixed case input normalizes; reserved/taken/length/char errors
- Portal form unit tests for mapped error strings (if test file exists; else shared validator coverage)

**No Firestore Rules change** if stored value remains lowercase matching `isValidCustomerUsername`.

---

## WS4 — Portal Show Designs

### Navigation & routes

| Item | Path |
|------|------|
| Nav entry | `apps/portal/features/navigation/constants/portalNavItems.ts` — label **Show Designs** |
| Routes | `apps/portal/app/(app)/shows/page.tsx` (calendar), `apps/portal/app/(app)/shows/[showId]/page.tsx` (gallery) |
| Icons | `PortalNavIcon.tsx`, sidebar + `PortalBottomNav.tsx` |

**Auth default:** Authenticated customers (matches `listPortalAllocatableShows`). Guest public browse is **out of scope** unless owner approves during review — plan default **auth-required** to reuse existing show list callable.

### Show scope

| Scope | Behavior |
|-------|----------|
| Upcoming + today | Primary discovery; allocatable + scheduled future |
| Recent past | Reuse `shouldIncludePortalCalendarShow` window (current month − 2) for calendar highlights only |
| Canceled/archived shows | Exclude from calendar |
| `staff_gang_sheet` | Exclude (existing calendar rule) |

### Calendar

- Reuse `@fresh-prints/show-picker` (`ShowPicker.tsx`, `buildShowPickerOptions.ts`) in **browse mode**
- Extend `listPortalAllocatableShows` response **or** add `listPortalShowDesignCalendar` callable returning per-show:
  - `showId`, `scheduledStartAt`, `productionStatus`
  - `uniquePublicCatalogDesignCount` (distinct `designId` where `sourceType === catalog_design` and design is `ready`)
- Count = unique design identities, not quantities; no per-customer data

### Gallery

- On show select → `listPortalShowCatalogDesigns` callable → ordered `designId[]` + optional card snapshots
- Client hydrate via `catalogService.getReadyDesignsByIds()`
- Reuse `CatalogSelectionCard`, `CatalogDesignDetailsModal`, `CatalogRequestQuantityControls`, `useAddDesignToRequestFlow`
- Deduplicate by `designId`; show logged-in customer’s Working Request quantities only

### Privacy / read boundary

**New callable: `listPortalShowCatalogDesigns`**

Server-only reads:

1. `upcomingShows/{id}` — verify Portal-visible Whatnot show
2. `showAllocations` where `upcomingShowId == id`, `status != canceled`
3. Filter: `sourceType !== customer_upload`, require `designId`
4. Hydrate `designs/{id}` — keep only `status === ready`
5. Return public `CatalogDesign`-shaped DTOs only

**Never return:** `customerId`, `printRequestId`, `customerUploadId`, usernames, per-customer quantities, private upload paths.

**Private upload subcase:** Do not show another customer’s upload. Optionally show **own** upload back to same customer only if `designId` resolves to ready catalog — upload-only allocations are excluded.

### Indexes

Likely existing: `showAllocations` composite on `upcomingShowId` + `status`. Confirm in `firestore.indexes.json`; add only if query planner requires.

---

## WS5 — Case/separator-insensitive search

### Shared normalization contract

New module: `packages/shared/src/utils/catalogSearchNormalization.ts`

```ts
// Strip whitespace, underscore, hyphen; lowercase — for substring matching only (not fuzzy)
export function normalizeCatalogSearchToken(value: string): string;

export function catalogSearchTokensMatch(haystack: string, needle: string): boolean;
```

**Separator set (documented):** space, `_`, `-` (and runs thereof). No punctuation stripping beyond those separators.

**Searchable fields (unchanged scope):**

| Surface | Fields |
|-------|--------|
| Portal client filter | title, description, tags |
| Studio client filter | title, description, tags, design id (exact-id path unchanged) |
| Algolia `searchText` | title, description, categoryName, tag names, aliases (index builder unchanged initially) |

### Integration

1. Update `designLibrarySearch.ts` and `catalogSearch.ts` to use shared helper for title/description/tags
2. Studio managed search post-filter (`designMatchesSearchQuery`) — fixes Algolia stale-hit filter too
3. Portal Firestore browse fallback — same helper
4. Portal Algolia: **client post-filter** hydrated results when search query non-empty (narrow addition to `useCatalogDesigns` or Algolia service) for separator parity without reindex
5. Tag suggestion filters (`filterTagsBySearch`, `buildCatalogTagOptions`) — use normalization

**Algolia reindex:** **Not required** for Wave 1 if client post-filter covers active queries. Optional follow-up: add `searchTextNormalized` field + index setting — document as deferred unless owner wants index-level matching.

**Studio Design ID search:** No change to `looksLikeDesignDocumentId` / `fetchVisibleExactIdDesign`.

---

## Affected files (expected)

### WS1 — Conversion

| Path | Change |
|------|--------|
| `packages/shared/src/types/printRequest/printRequest.types.ts` | Closure + linkage fields |
| `packages/shared/src/utils/printRequestConversion*.ts` | Eligibility, labels (new) |
| `functions/src/convertCustomerPrintRequestToInternal.ts` | New callable |
| `functions/src/index.ts` | Export |
| `firestore.rules` | Closure field validation |
| `apps/studio/.../print-requests/pages/PrintRequestsPage.tsx` | Convert action |
| `apps/studio/.../print-requests/services/printRequestService.ts` | Callable client |
| `apps/portal/.../PrintRequestCard.tsx`, `PrintRequestDetailView.tsx` | Closed copy |
| `packages/shared/src/utils/portalPrintRequestListTabs.ts` | Closed tab grouping |
| `docs/architecture/DATA_MODEL.md` | Conversion fields |
| `docs/project/DECISIONS.md` | ADR |

### WS2 — Gang sheet completion

| Path | Change |
|------|--------|
| `functions/src/completeStaffGangSheetAndOpenNext.ts` | Allocation finish + reconciliation |
| `functions/src/lib/showCompletionReconciliation.ts` | Extract shared server reconciliation (new) |
| `packages/shared/src/utils/showCompletionReconciliation.ts` | Shared pure eligibility (may extend existing Studio util) |
| `functions/src/completeStaffGangSheetAndOpenNext.test.ts` | New tests |
| `apps/studio/.../upcoming-shows/pages/UpcomingShowsPage.tsx` | Copy tweak if needed |

### WS3 — Username

| Path | Change |
|------|--------|
| `apps/portal/features/auth/components/RegisterForm.tsx` | UX + validation |
| `apps/portal/features/auth/components/CompleteProfileForm.tsx` | Same |
| `packages/shared/src/utils/customerUsername.ts` | Sharper error messages if needed |
| `functions/src/registerCustomer.ts` | Error code stability |
| `packages/shared/src/utils/customerUsername.test.ts` | New/extended |

### WS4 — Show Designs

| Path | Change |
|------|--------|
| `apps/portal/app/(app)/shows/**` | New pages |
| `apps/portal/features/show-designs/**` | Feature module (new) |
| `apps/portal/features/navigation/constants/portalNavItems.ts` | Nav item |
| `functions/src/listPortalShowCatalogDesigns.ts` | New callable |
| `functions/src/listPortalAllocatableShows.ts` | Optional design counts |
| `packages/shared/src/types/portal/listPortalShowCatalogDesigns.types.ts` | DTOs |
| `apps/portal/features/print-requests/services/portalShowSelectionService.ts` | Client wrapper |

### WS5 — Search

| Path | Change |
|------|--------|
| `packages/shared/src/utils/catalogSearchNormalization.ts` | New |
| `packages/shared/src/utils/catalogSearchNormalization.test.ts` | New |
| `apps/studio/.../designs/utils/designLibrarySearch.ts` | Use shared |
| `apps/portal/features/catalog/utils/catalogSearch.ts` | Use shared |
| `apps/portal/features/catalog/hooks/useCatalogDesigns.ts` | Algolia post-filter |
| `apps/studio/.../designs/hooks/useDesignLibraryManagedSearch.ts` | Verify post-filter path |

---

## Impact summary

| Area | WS1 | WS2 | WS3 | WS4 | WS5 |
|------|-----|-----|-----|-----|-----|
| Schema change | Yes (optional fields) | No | No | No | No |
| Firestore Rules | Yes | Maybe (allocation finish writes) | No | Yes (callable-only reads) | No |
| Indexes | Unlikely | Unlikely | No | Confirm allocation query | No |
| Cloud Functions | Yes | Yes | Maybe (errors) | Yes | No |
| Algolia reindex | No | No | No | No | **No** (client post-filter) |
| Portal build | Yes | No | Yes | Yes | Yes |
| Studio build | Yes | Yes (if client copy only) | No | No | Yes |

---

## Backward compatibility

- New `printRequests` fields optional — old clients ignore
- Existing requests without `closureKind` behave unchanged
- Username storage remains lowercase — existing customers unaffected
- Search normalization broadens matches — no removal of precision filters
- Show Designs is additive navigation

**No backfill migration** unless owner approves separate checkpoint.

---

## Test strategy

### Automated

| Check | Command | Waves |
|-------|---------|-------|
| Lint | `npm run lint` | All |
| Studio typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | 1, 3 |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 2, 5 |
| Functions build | `npm --prefix functions run build` | 1, 2, 3 |
| Studio Vite build | `npx vite build` (from `apps/studio/`) | 1, 3 |
| Portal build | `npm run build:portal` | 2 |
| Unit tests | `npx tsx --test` on touched `*.test.ts` | All |
| `git diff --check` | whitespace | All |

**Focused new tests:**

- `catalogSearchNormalization.test.ts` — case + separator matrix (`mindful`, `butt hole`/`butthole`, no fuzzy `kill`/`will`)
- `printRequestConversionEligibility.test.ts`
- `completeStaffGangSheetAndOpenNext.test.ts` — allocation done + partial multi-sheet request
- `customerUsername.test.ts` — capitalization + error strings
- `listPortalShowCatalogDesigns.test.ts` — privacy filter (no uploads, dedupe)
- Integration-style test for WS1+WS2 E2E path (Functions or shared pure orchestration)

### Manual DEV QA checklist

1. **WS2:** Internal request on gang sheet → Mark Complete → appears under Printed; refresh persists; repeat Mark Complete idempotent
2. **WS2 regression:** Whatnot Finish still completes customer requests; split request across two shows not premature
3. **WS5:** Portal + Studio `mindful` finds `Mindful`; separator cases; Studio full design ID still works
4. **WS3:** Register with `SarahSmith` → stores `sarahsmith`; Whatnot hint visible; specific errors for taken/short/invalid char
5. **WS4:** Show Designs nav; calendar counts; gallery dedupes; add/qty controls; no other customer qty; no private uploads visible
6. **WS1:** Convert eligible portal customer request; CR sequence not recycled; customer starts new CR###; converted label in Portal; internal IR### created with items; reject when printing

---

## Human checkpoints

| # | Trigger |
|---|---------|
| 1 | **Plan review** (this document) before implementation |
| 2 | Schema/closure product wording if Portal tab placement disputed |
| 3 | DEV manual QA per wave |
| 4 | Production Functions deploy (WS1, WS2, WS4 callables) |
| 5 | Production App Hosting rollout (Portal WS3, WS4, WS5) |
| 6 | Studio publish (WS1, WS2, WS5) — separate `APPROVE STUDIO PUBLISH` |
| 7 | Any Algolia reindex if later chosen |

---

## Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Conversion cancels show allocations unexpectedly | High | Strict eligibility; confirm modal lists allocation impact |
| Staff completion marks wrong requests printed | High | Bound reconciliation to sheet ID + full-request qty check |
| Show Designs leaks PII | High | Server-side DTO review; Security Agent review; no client allocation queries |
| Search normalization causes false positives | Medium | Separator-only normalization; unit tests for negative cases |
| Username pattern removal allows invalid server rejects | Low | Client pre-validate with shared helper |
| Wave 3 blocked on Wave 1 E2E | Low | Document wave order |

---

## Rollback plan

- **Functions:** Redeploy prior Functions bundle; conversion callable unused until Studio ships
- **Portal:** Roll back App Hosting build
- **Studio:** Prior Studio release; conversion button absent in old build
- **Schema:** New fields inert if callers rolled back

---

## Documentation updates

- [x] `DATA_MODEL.md` — conversion fields, Show Designs callables
- [x] `BACKEND.md` — new callables
- [x] `DECISIONS.md` — ADR conversion + search normalization
- [x] `STYLE_GUIDE.md` — Show Designs nav label (if needed)
- [ ] `TESTING.md` — add focused test paths if new suites warrant

---

## Open questions

- [ ] **Portal tab placement** for converted requests: Printed tab with closure chip vs separate “Closed” section — **default: Printed tab + explicit closure label** [NEEDS HUMAN INPUT if rejected]
- [ ] **Show Designs guest access** — default auth-only [NEEDS HUMAN INPUT for public browse]
- [ ] **Conversion with pending Whatnot allocations** — auto-cancel vs hard block — **default: auto-cancel pending/queued only; block in_progress+** [confirm at review]

---

## Acceptance criteria mapping

| Criterion group | Plan section |
|-----------------|--------------|
| Customer → Internal conversion | WS1 |
| Internal Gang Sheet completion | WS2 |
| Username | WS3 |
| Show Designs | WS4 |
| Search | WS5 |
| Verification commands | Test strategy |

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-22-customer-request-show-discovery-and-search-correctives-review.md`
- Verdict: pending
