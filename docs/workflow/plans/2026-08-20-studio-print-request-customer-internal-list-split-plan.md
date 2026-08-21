# Plan: Separate Studio Customer and Internal Print Request Lists

| Field | Value |
|-------|-------|
| Date | 2026-08-20 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Goal id | `studio-print-request-customer-internal-list-split` |
| Related | docs/workflow/reviews/2026-08-20-studio-print-request-customer-internal-list-split-review.md |

---

## Goal

Separate Fresh Prints Studio `/print-requests` so customer Print Requests and internal Print Requests are no longer mixed in one list. Present two top-level views in the existing workspace — **Customer Requests** (default) and **Internal Requests** — while preserving current lifecycle tabs, search, create actions, deep links, Show Queue attachment, and bounded Firestore query architecture.

This is a Studio UX / query-organization improvement in Phase 6. It is a **new** managed goal. It is not attached to the closed `print-request-shared-sizing-and-queue-integrity` goal.

---

## Background

Checkout confirmed at plan time:

| Item | Value |
|------|-------|
| Checkout | `C:\coding\fresh-prints` |
| Branch | `development` |
| HEAD | `4865c2b` |
| Prior workflow | IDLE — `print-request-shared-sizing-and-queue-integrity` CLOSED (DEV), owner combined QA `PASS` |

Studio Print Requests currently loads one mixed list per lifecycle tab (`Working` / `Queued` / `Printing` / `Printed`). Customer (`isInternal: false`, names like `user-CR001`) and internal (`isInternal: true`, names like `whatnot-IR001`) rows share that list. The owner no longer wants them mixed.

Binding owner decisions for this phase:

- Split is presentation/query organization only.
- Do not change lifecycle, naming, ownership, create/duplicate/sizing/quantity/Add Designs/Show Queue/Portal.
- Do not invent new routes unless architecture requires them (it does not).
- Do not add/deploy a Firestore index silently. If one is required, stop and report.

---

## Investigation findings (current HEAD)

### 1. Exact request-type discriminator

**Persisted field:** `printRequests.isInternal` (`boolean`).

**Not the discriminator:** request name (`CR` / `IR` suffixes), `requestOrigin`, or `customerId` alone.

`requestOrigin` (`studio_internal` \| `studio_customer` \| `portal_customer`, optional) is provenance. Customer Requests must include **both** staff-created Studio customer requests and Portal customer requests. Using `requestOrigin` would require an `in` query or multiple reads. `isInternal == false` already covers both customer origins.

Staff Gang Sheet eligibility elsewhere uses `requestOrigin === "studio_internal"` with a legacy `isInternal` fallback. That rule is unchanged and is not the list-split discriminator.

### 2. Exact type definition

`packages/shared/src/types/printRequest/printRequest.types.ts`:

```ts
export interface PrintRequest {
  id: string;
  name: string;
  customerId?: string;
  isInternal: boolean;
  requestOrigin?: PrintRequestOrigin;
  // ...
}
```

Studio mapper (`printRequestService.mapPrintRequestData`): `isInternal: data.isInternal === true`. Missing/non-true values map to `false` **after a document is loaded**. Firestore `where("isInternal", "==", false)` does **not** match documents that lack the field.

Firestore Rules already require `data.isInternal is bool` on print-request writes (`firestore.rules` `printRequestRequiredFieldsValid` / `isValidPrintRequestAssignment`).

### 3. How internal requests are created

Studio: `printRequestService.createInternalPrintRequest` → transaction `createInternalPrintRequestInTransaction` writes `isInternal: true`, `requestOrigin: "studio_internal"`, generated `{base}-IR{seq}` name.

UI: one create modal with Request type select; `customerMode === "internal"` (form default today).

### 4. How customer requests are created

Studio: `printRequestService.createCustomerPrintRequest` writes `isInternal: false`, `requestOrigin: "studio_customer"`, `{username}-CR{seq}`.

Portal: `functions/src/lib/portalWorkingPrintRequest.ts` writes `isInternal: false`, `requestOrigin: "portal_customer"`. **No Portal code change in this phase.**

### 5–6. Legacy records / fallback

- Current writes always set `isInternal`.
- Rules require a boolean on create/update.
- Loaded docs missing the field are treated as customer (`=== true` is false).
- **Server-side equality queries will omit documents that lack `isInternal`.** Those docs would appear in neither list.
- This phase does **not** scan production, backfill, or migrate. No schema change.
- Repo cannot prove live completeness. Report to owner; do not invent a repair.

### 7. Current list query / filter implementation

Layering (preserved):

```text
PrintRequestsPage
  → usePrintRequests(activeTab)
    → printRequestService.listPrintRequestsPage / countPrintRequests
      → buildPrintRequestListQueryPlan
        → Firestore getDocs / getCountFromServer
```

Current list query: **one** filter, `queueTab == activeTab`, `orderBy updatedAt DESC, __name__ DESC`, page size 50 +1 peek.

Current planner (`buildPrintRequestListQueryPlan`) **throws** if more than one of `status` / `customerId` / `isInternal` / `queueTab` is set:

> `Only one print request list filter can be combined with updatedAt ordering in this phase.`

Optional `isInternal` filter **already exists** in the planner and service options, but the list page does **not** pass it. It is a supported **single** filter (`printRequests.isInternal + updatedAt` index), not combined with `queueTab`.

Client safety nets: `filterPrintRequestsByActiveTab`, `mergePrintRequestsById` (queueTab only). Search is client-side on the loaded page (`filterPrintRequestsByListSearch`).

### 8. Pagination / count behavior

- Page size: `PRINT_REQUEST_LIST_PAGE_SIZE = 50`.
- Counts: `getCountFromServer` per tab `working` / `queued` / `printing` / `printed` — **global**, not split by `isInternal`.
- Working triage chips (Active / Stale / Empty / All) count the **currently loaded page**, not the full corpus.
- Remount cache keys: `list:${activeTab}:page-1`, `counts:${tab}` — no kind in the key today.

### 9. Existing status / lifecycle filters (preserve; do not invent)

URL query params on `/print-requests` (no extra routes):

| Control | Values | Source |
|---------|--------|--------|
| Lifecycle tabs | `working`, `queued`, `printing`, `printed` | `?tab=` |
| Working triage | `active`, `stale`, `empty`, `all` | `?workingFilter=` |
| Selection | request document id | `?requestId=` |

There is **no** Completed tab, no status-string tab bar (`draft` / `active` / etc.), and **no** persisted localStorage preference for these tabs. URL is the source of truth. Do not invent Completed. Do not invent preference persistence.

Default with missing `tab`: **Working**.

### 10. Whether counts are global or filtered

**Global** across customer + internal for each `queueTab`. After this change they must be scoped to the selected kind.

---

## Index requirement — STOP before silent add/deploy

**A new composite index is required** for the correct architecture.

Desired list/count query:

```text
where isInternal == <bool>
where queueTab == <tab>
orderBy updatedAt DESC, __name__ DESC   // list only; count omits orderBy
```

Indexes that exist today (`firestore.indexes.json`):

| Index | Serves this query? |
|-------|--------------------|
| `isInternal ASC, updatedAt DESC` | No (missing `queueTab` and `__name__`) |
| `queueTab ASC, updatedAt DESC, __name__ DESC` | No (missing `isInternal`) |

**Required new index (do not add/deploy until owner approves):**

```txt
printRequests.isInternal ASC, queueTab ASC, updatedAt DESC, __name__ DESC
```

Rejected alternatives:

| Approach | Why rejected |
|----------|----------------|
| Query `queueTab` only, hide the other kind in the component | Owner: prefer indexed discriminator, do not load both types and hide. Pagination/`hasMore` would be wrong (page of 50 mixed ≠ 50 of one kind). Counts would stay mixed unless separately queried. |
| Query `isInternal` only, hide other `queueTab`s client-side | Regresses Wave C exact tab pagination and `getCountFromServer` tab counts. |
| `requestOrigin` filter | Customer list is two origins; `in` queries / extra indexes; not the boolean discriminator. |

**Implement of the dual-filter query must not run against a Firebase project that lacks this index.** Adding the entry to `firestore.indexes.json` is a repo change (not Studio-source-only). Deploying indexes is a separate human action. This phase reports the need and **does not add or deploy the index until the owner approves**.

Count queries use two equality filters without `orderBy`. The same composite should serve them as a prefix; if DEV proves otherwise, stop and report a second index rather than silently adding one.

---

## Scope

### In Scope

- Studio `/print-requests` top-level **Customer Requests | Internal Requests** control
- Default view: Customer Requests when `kind` is absent
- Server-side list + count filter: `isInternal` + existing `queueTab` (after index approval)
- Preserve Working / Queued / Printing / Printed and Working triage
- Preserve client search, scoped to the already-filtered loaded page
- Create-request post-create landing in the matching kind + Working / Empty
- Deep-link / Show Queue / inbox / Design Library open: reconcile kind (and existing tab behavior) so the selected request is not shown under the wrong heading
- Cache keys include kind
- Stale-list guard when switching kind (same pattern as tab switch)
- Focused automated tests listed below, plus sizing and Add Designs regressions
- Docs: WORKFLOWS list organization, DATA_MODEL index list, brief ROADMAP note

### Out of Scope

- Portal behavior, Portal UI, customer uploads, assisted/custom designs
- Request lifecycle, naming, ownership, create payload fields
- Item sizing, 200 DPI floor, 22″ cap, quantities, Duplicate, Add Designs write planner, allocations, production status, completed locking
- Show Queue attach rules (both kinds remain attachable)
- Schema migration, production data repair, Rules changes, Functions changes
- New Studio routes / extra pages
- Invented Completed tab or localStorage tab preference
- Production deploy, index deploy without owner approval
- Creating branches/worktrees (ADR-FP-137)

---

## Affected Areas

### Files / Modules (verified)

Studio Print Requests feature (no invented paths):

| Role | Path |
|------|------|
| Page | `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` |
| List hook | `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts` |
| Service | `apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts` |
| Query planner | `apps/studio/src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.ts` |
| Query planner tests | `apps/studio/src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts` |
| Counts | same hook + `countPrintRequests` in the service |
| Search | `apps/studio/src/renderer/src/features/print-requests/utils/printRequestListSearch.ts` (preserve; list already scoped) |
| Filter safety net | `apps/studio/src/renderer/src/features/print-requests/utils/filterPrintRequestsByActiveTab.ts` (+ tests); new companion filter for `isInternal` or extend this helper |
| Merge / deep-link | `apps/studio/src/renderer/src/features/print-requests/utils/mergePrintRequestsById.ts` (+ tests) |
| Loading derivation | `apps/studio/src/renderer/src/features/print-requests/utils/derivePrintRequestsListLoading.ts` (+ tests) — extend for kind like tab |
| Routes | `apps/studio/src/renderer/src/features/print-requests/constants/printRequestRoutes.ts` (+ tests) |
| Page cache | `apps/studio/src/renderer/src/features/print-requests/services/printRequestsPageReadCache.ts` (keying only; helper unchanged) |
| Tab CSS | `apps/studio/src/renderer/src/styles/components/show-queue.css` (`.print-requests-tab-bar` / `.print-requests-tab-button`) |
| Types | `packages/shared/src/types/printRequest/printRequest.types.ts` (read; no field add) |
| Create | existing modal on `PrintRequestsPage` — keep Internal/Customer select |
| Deep-link callers (kind when known, optional) | `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`; `apps/studio/src/renderer/src/features/staff-inbox/utils/staffInboxNavigation.ts`; `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx`; `apps/studio/src/renderer/src/features/customer-uploads/components/CustomerUploadIntakeSection.tsx` |

Pending owner index approval only:

- `firestore.indexes.json`
- `docs/architecture/DATA_MODEL.md` indexing section

Docs:

- `docs/WORKFLOWS.md` (Print Requests list organization)
- `docs/project/ROADMAP.md` (Phase 6 note)
- Optional ADR in `docs/project/DECISIONS.md` if review wants the discriminator + index recorded

### Architecture Impact

- [x] Details: Same Component → Hook → Service → Firebase SDK. No Firestore in the page. Planner may allow **one additional indexed pair**: `isInternal` + `queueTab`. Other multi-filter combinations stay rejected.

### Security Impact

- [x] None. Same `canViewPrintRequests` / manage permissions. No Rules change. No new public data.

### Data Model Impact

- [x] Details: No new fields, statuses, or collections. Query uses existing `isInternal` + `queueTab`. New composite index is a query-index addition, not a schema migration. No production data repair.

### Backend Impact

- [x] Details: No Functions, env, or Rules. Firestore **index** addition + deploy is required for the dual-filter query and is a human checkpoint. Not Studio-source-only.

### UI / UX Impact

- [x] Details: Studio Print Requests rail. Manual owner QA required (see below).

### Migration Impact

- [x] None for schema/data.
- Forward: after owner approval, add index to `firestore.indexes.json` and deploy indexes to the target Firebase project before relying on the dual-filter query.
- Rollback: revert Studio UI/query to `queueTab`-only; unused composite index is harmless if left in place.

---

## Approach

### UI control and labels

Reuse the existing pill tab pattern (`.print-requests-tab-bar` / `.print-requests-tab-button`), same as Working/Queued/Printing/Printed and Add-to-Show destination tabs. Closest two-way top-level pattern elsewhere is Users `user-directory-tab-bar`; Print Requests should stay on its own tab-button CSS.

Layout inside the existing rail, **no new route**:

```text
[ Customer Requests ] [ Internal Requests ]     ← kind; default Customer
[ Working (n) ] [ Queued (n) ] [ Printing (n) ] [ Printed (n) ]
search + Working triage chips (unchanged)
visible request list
```

Exact labels: **Customer Requests** | **Internal Requests**.

Kind control: `role="tablist"` `aria-label="Request type"`.

Do not put mixed-corpus counts on the kind tabs. Lifecycle tab counts (`Working (n)` …) become kind-scoped.

### URL (not a new path)

Add `kind=customer|internal` via existing `getPrintRequestsPath` / search params.

| Param | Values | Default if omitted |
|-------|--------|--------------------|
| `kind` | `customer`, `internal` | **customer** |
| `tab` | existing | `working` |
| `workingFilter` | existing | `active` when tab is working |
| `requestId` | existing | none |

No localStorage. Switching kind does not write Print Request documents.

### Query / hook

1. After index approval, lift planner restriction **only** for `{ isInternal, queueTab }`.
2. `usePrintRequests(activeTab, isInternal)` passes both into `listPrintRequestsPage` and `countPrintRequests`.
3. Cache keys: `list:${kind}:${tab}:page-1`, `counts:${kind}:${tab}`.
4. Extend `loadedTabRef` / `derivePrintRequestsListLoading` so switching kind cannot paint the previous kind's rows under the new heading (same stale-list bug class as 2026-08-04 tab switch).
5. `filterPrintRequestsByActiveTab` companion: drop rows whose `isInternal` disagrees with the selected kind.
6. `mergePrintRequestsById`: do not merge a fetched request into the wrong kind. Deep-link mismatch is handled by URL reconciliation, not by contaminating the list.
7. `insertCreatedRequestLocally`: insert only when current kind **and** Working match the new request.

Switching kind/tab must not mutate request data or trigger unrelated app reloads.

### Search

Keep client-side search on the loaded page. Because the page query is kind-scoped, Customer search cannot return internal rows and vice versa.

Search **text** persists across kind switch (same as today’s lifecycle tab switch: `listSearchQuery` is independent `useState` and is not cleared on tab change). Results recompute against the new dataset. Existing effect still clears search if it hides the selected in-list request.

### Create

Keep the single modal and Internal/Customer select (current default remains Internal in the form). After success:

- Customer create → `kind=customer`, `tab=working`, `workingFilter=empty`, select new id
- Internal create → `kind=internal`, same tab/filter, select new id

If kind actually changes, do not insert into the old list; let the kind-scoped reload (cache miss or targeted invalidation) load the destination. If kind is unchanged and tab is Working, keep local insert.

### Deep link / selected detail

Do **not** duplicate the detail pane.

`usePrintRequestDetails` already loads by document id. When `requestId` is present:

1. Wait until that request is fetched (do not let canonical-route fallback steal `requestId` while kind is unknown).
2. If `request.isInternal` disagrees with current `kind`, `replace` the URL to the matching kind.
3. Preserve existing tab reconciliation (`queueTab` / current tab rules). Do not show the row under the wrong kind heading.
4. Callers that already know `isInternal` (Show Queue row with a matched request) should pass `kind` in `getPrintRequestsPath` to avoid a flash. Callers with only an id still work via step 1–2.

### Show Queue

No attach-rule changes. Add to Show / Add to Internal Gangsheet stay on the detail pane of whichever request is selected. List split must not hide either type from Show Queue links; reconciliation above covers inbound links.

### Filter order (actual)

```text
kind (isInternal)          ← new, server-side with queueTab
  ↓
queueTab (Working/Queued/Printing/Printed)  ← existing, server-side
  ↓
Working triage (page-local) + search (page-local)
  ↓
visible list
```

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | yes |
| Lint | `npm run lint` | yes (Studio/shared touched) |
| Unit tests | `npx tsx --test` on files below | yes |
| Build | no (not a packaging/release change) | no |
| Integration | no | no |
| E2E | no (manual Studio QA) | no |
| Backend/rules | no (Rules unchanged) | no |
| Portal typecheck | no (Portal out of scope) | no |
| Functions build | no | no |

**Add / extend:**

1. **Query planner** — `{ isInternal: false, queueTab: "working" }` and `{ isInternal: true, queueTab: "queued" }` plan both filters; `{ queueTab, customerId }` and `{ status, isInternal }` still throw; `{ isInternal }` alone still allowed.
2. **Kind filter safety net** — given 3 customer + 2 internal, customer view = 3, internal view = 2; no cross-leak.
3. **Switching** — customer → internal → customer on a mixed fixture: correct ids each time, no duplicates, no implied writes.
4. **Status/`queueTab` scoped to kind** — same statuses on both kinds; filtering working/queued stays kind-scoped.
5. **Search** — query that would match an internal name does not return it from a customer-only list (and reverse).
6. **Routes** — default omitted `kind` → customer; `kind=internal` preserved; `shouldReplacePrintRequestsPath` includes kind; create landing paths.
7. **Merge** — reject mismatched `isInternal` the same way mismatched `queueTab` is rejected.
8. **Loading derivation** — kind mismatch reports loading (no stale paint).
9. **Create classification** — unit-level: `isInternal: false` is customer-list eligible only; `true` is internal-list eligible only (no service/Firestore write tests unless already patterned).

**Regression (must re-run, do not modify behavior):**

- `packages/shared/src/utils/printRequestItemSizing.test.ts` (includes ≥200 DPI floor)
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts` if still covering sizing
- `apps/studio/src/renderer/src/features/print-requests/utils/planPrintRequestDesignSelectionWrites.test.ts` (resized item → Add Designs item-id)
- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestSelectionMode.test.ts`

Lifecycle open/edit/duplicate/remove/attach remain manual QA; automated coverage is the existing item/query tests plus the new list-split tests. Do not add a broad E2E suite.

### Manual

Owner Studio QA after Implement + automated Test (not this Plan/Review stop):

## Manual Test Checkpoint

**Feature / area:** Studio Print Requests customer vs internal lists  
**Why automated tests are insufficient:** Query + URL + rail layout + create landing + Show Queue inbound links need the running Studio app.  
**Environment:** local Studio against DEV Firestore (index must exist first)  
**Prerequisites:** staff login; at least one customer request and one internal request; index deployed to DEV

### Steps

1. Open Studio → Print Requests. → **Expected:** **Customer Requests** selected; no internal `IR###` rows.
2. Switch to Internal Requests. → **Expected:** only internal rows; no customer `CR###` rows.
3. Cycle Customer → Internal → Customer several times. → **Expected:** no extras, missing rows, or data changes.
4. Use Working / Queued / Printing / Printed and Working triage on each kind. → **Expected:** filters still work; counts match the selected kind.
5. Search on Customer, then switch to Internal (and reverse). → **Expected:** results are kind-scoped; search text follows existing persistence (stays unless it hides the selected row).
6. Create one customer request. → **Expected:** lands in Customer Requests, Working/Empty, selected; not in Internal.
7. Create one internal request. → **Expected:** lands in Internal Requests, Working/Empty, selected; not in Customer.
8. Open and edit one request from each list (quantity, valid print size, Add Designs, Duplicate, remove item). → **Expected:** unchanged vs current behavior.
9. Attach each type to Show Queue per existing rules. → **Expected:** both still attachable.
10. From Show Queue (or a `?requestId=` link), open a request of the other kind. → **Expected:** kind heading matches the request; detail is not duplicated; no wrong-list heading.

### Pass criteria

- [ ] Customer and Internal are not mixed
- [ ] Default is Customer Requests
- [ ] Counts/search/filters scoped to kind
- [ ] Create lands in the matching list
- [ ] Deep link reconciles kind
- [ ] Switching lists does not write request data
- [ ] Sizing / Duplicate / Add Designs / Show Queue unchanged
- [ ] No Portal change observed (not in this QA unless owner opens Portal)

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`

Do not use name suffixes as the implementation discriminator. They are visual QA only.

---

## Human Checkpoints Anticipated

- [x] **Owner approval to Implement** (this Plan + Formal Review stop)
- [x] **New composite Firestore index** — approve adding to `firestore.indexes.json` and deploying to the Firebase project used by local Studio **before** the dual-filter query is enabled
- [x] Manual UI/UX QA after Implement/Test
- [ ] Design approval (not required; reuse existing tab pills)
- [ ] Business logic decision (discriminator confirmed from repo: `isInternal`)
- [ ] Production deploy (not this phase)
- [ ] Database migration (none)
- [ ] Auth / external service setup (none)
- [ ] Secrets / env vars (none)

**Index deploy is not silent and is not Studio-source-only.** If the owner rejects the index, stop; do not implement the client-hide fallback in this phase.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Dual-filter query fails without the new index | High | Human checkpoint; do not ship the query first |
| Missing `isInternal` on a legacy doc | Medium | Equality omits it from both lists; no backfill this phase; owner aware |
| Stale list flash on kind switch | High | Reuse loaded-tab loading derivation for kind |
| Canonical route drops deep-linked id before kind reconcile | High | Wait for by-id fetch; then set `kind` |
| Client-filter-only pagination lies | High | Do not take that path |
| Accidental Portal / sizing / Add Designs change | High | Out of scope; re-run those tests; no Portal files |
| Scope creep into Staff Gang Sheet origin rules | Medium | List split uses `isInternal` only; Show Queue eligibility unchanged |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the Studio list/hook/route/CSS/doc changes on `development`. If the index was deployed, leaving it unused is safe. Do not delete production indexes without a separate owner decision.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [x] DATA_MODEL.md — document the new composite index after owner approval
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md — short ADR for list split + `isInternal` discriminator + index (if review agrees)
- [x] WORKFLOWS.md — Print Requests page has Customer vs Internal views, then existing lifecycle tabs
- [x] ROADMAP.md — Phase 6 note
- [x] Other: workflow plan/review artifacts; CURRENT-STATE at signoff only

---

## Open Questions

- [x] Discriminator — resolved from HEAD: `isInternal`
- [ ] **Owner: approve Implement of this plan?**
- [ ] **Owner: approve the new composite index (file + DEV deploy) before the dual-filter query?**
- [ ] Owner: any known `printRequests` docs without `isInternal`? If yes, they will not appear in either equality query until a later repair phase (not this one).

---

## Plan-phase required return

| # | Item | Answer |
|---|------|--------|
| 1 | Discriminator | `printRequests.isInternal: boolean`. Internal = `true`. Customer = `false` (includes `studio_customer` and `portal_customer`). Not name, not `requestOrigin` alone. |
| 2 | Current query path | `PrintRequestsPage` → `usePrintRequests(queueTab)` → `listPrintRequestsPage` / `countPrintRequests` → `buildPrintRequestListQueryPlan({ queueTab })` → `getDocs` / `getCountFromServer` |
| 3 | Server-side `isInternal` filter | Exists as an **optional single** filter. List page does not use it. Combining with `queueTab` is **not** allowed until planner + index change. |
| 4 | Legacy missing discriminator | Mapper treats missing as customer. Firestore equality will omit missing-field docs from both lists. No backfill this phase. |
| 5 | Lifecycle filters to preserve | Working, Queued, Printing, Printed; Working triage Active / Stale / Empty / All |
| 6 | Search | Client-side on loaded page; persist query text across kind switch like tab switch; results kind-scoped because the query is |
| 7 | Counts | Today global per `queueTab` via `getCountFromServer`. After: same API with `isInternal` + `queueTab`. Triage counts stay page-local. |
| 8 | UI control / labels | Existing pill tabs: **Customer Requests \| Internal Requests**, then existing lifecycle tabs |
| 9 | Default | Customer Requests (`kind` omitted or `customer`) |
| 10 | Post-create | Land in matching kind, Working / Empty, request selected |
| 11 | Deep link | Fetch by id; reconcile `kind` (and existing tab rules); do not show under the wrong heading; no second detail page |
| 12 | Files to change | See Affected Areas |
| 13 | Tests to add/change | See Test Strategy |
| 14 | Index required? | **Yes** — `isInternal + queueTab + updatedAt DESC + __name__ DESC`. Do not add/deploy until owner approves. |
| 15 | Rules / Functions / schema | **No.** Index file/deploy is the only backend-adjacent change, and it is gated. |
| 16 | Plan artifact | `docs/workflow/plans/2026-08-20-studio-print-request-customer-internal-list-split-plan.md` |
| 17 | Review artifact | `docs/workflow/reviews/2026-08-20-studio-print-request-customer-internal-list-split-review.md` |
| 18 | Formal Review verdict | See review doc (written in Review phase) |
| 19 | Human checkpoint | **Yes** — Implement + index approval. Manual Studio QA after Test. No production. |

---

## Approval

- Review doc: docs/workflow/reviews/2026-08-20-studio-print-request-customer-internal-list-split-review.md
- Verdict: **approved**
- Implement: **blocked on owner checkpoint** (Implement approval + composite index file/deploy)
