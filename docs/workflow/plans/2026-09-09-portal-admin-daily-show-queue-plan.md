# Plan: Portal admin daily Show Queue

| Field | Value |
|---|---|
| Date | 2026-09-09 |
| Managed goal | `portal-admin-daily-show-queue` |
| Status | **amended — awaiting Formal Review Amendment** |
| Workflow boundary | Plan Amendment → Formal Review Amendment only; **no implementation, deploy, commit, or push** |
| Related Formal Review Amendment | `docs/workflow/reviews/2026-09-09-portal-admin-show-queue-dashboard-amendment-review.md` |
| Repository baseline | Original plan at `d108ba2f`; amendment based on post-DEV-QA local Portal state + deployed DEV Function |

## Goal

Add one narrow, read-only Fresh Prints Portal route where active `owner` and `admin` users can operate a **mobile-first upcoming-show Show Queue dashboard** without opening Studio. It remains part of the existing two-application platform; it is neither a third admin app nor a replacement for Studio production controls.

### Owner product amendment (2026-09-09 DEV re-QA)

Owner DEV re-QA confirmed the loading corrective works and the page loads, but **withholds final QA acceptance** because the current **single operational-day flattened queue** presentation is too limited.

**Superseded for acceptance:** the v1 “current operational day → all shows as stacked cards with inline item lists” presentation and its identifier-free artwork-excluded item expansion.

**Preserved foundations (do not regress):**

- Route `/admin/show-queue`, isolated `PortalAdminShell`, owner/admin-only auth/session isolation
- Helper/customer/guest denial; no customer providers; no mutations
- America/Chicago operational timezone helper (still used for display formatting)
- Portal load-lifecycle corrective (`mountedRef` re-arm, settlement, coalescing)
- Firestore Rules / Storage Rules unchanged; no production; no commit/push in this amendment turn

**New acceptance shape:** collapsible upcoming-shows sidebar → auto-select next upcoming show → selected-show stats/capacity dashboard → PR summary list → lazy read-only **View Designs** modal with images.

---

## Amendment: Upcoming-show dashboard (authoritative for remaining work)

### 1. Owner amendment summary

Amend the existing Portal Admin Show Queue from a day-scoped queue dump into a clean mobile-first operational dashboard:

1. Collapsible admin sidebar of canonical upcoming Show Queue shows
2. Default selection of the next upcoming show
3. Selected-show header with Design Qty / Print Qty / PR Qty / capacity
4. Scannable Print Request cards (no inline item expansion)
5. Read-only **View Designs** modal with artwork previews (catalog + customer upload), lazy-loaded

This remains a **narrow Portal staff exception**, not a Studio clone and not a general staff Portal.

### 2. Sidebar architecture

Extend `PortalAdminShell` with an admin-only left rail + main content region.

| Desktop | Mobile |
|---|---|
| Collapsible left sidebar (reuse Portal sidebar visual tokens/classes) | Off-canvas by default; Menu/Shows trigger in admin header; closes after selection |

**Must not** mount `PortalAppShell`, customer nav items, Favorites / Current Request / notifications / print-request providers, bottom nav, or customer account chrome.

### 3. Sidebar code-reuse strategy

| Approach | Decision |
|---|---|
| Mount `PortalSidebar` / `PortalAppShell` | **Forbidden** — customer nav + provider coupling |
| Extract heavy shared React primitive from `PortalSidebar` | **Not required** for one admin surface; high coupling risk |
| Compose `PortalAdminShowSidebar` inside `PortalAdminShell` | **Selected** — reuse `.portal-sidebar*` CSS tokens/drawer patterns and optionally a **local** drawer context (separate storage key from customer collapse if needed) |
| Neutral tokens | Reuse `--portal-sidebar-width`, divider, link-active, scrim, edge-tab visual language from `shell.css` / `tokens.css` |

Formal Review confirms: visual reuse yes; component reuse of customer `PortalSidebar` no.

### 4–8. Upcoming membership, default selection, ordering, horizon, selected state

**Canonical membership (repo truth):**

Reuse Studio Whatnot **Upcoming** schedule-tab semantics, not the prior operational-day window as the primary list:

1. Surface: `isWhatnotQueueSurfaceShow` → `whatnot` **or** `dev_fixture`
2. Portal DEV gate retained: include `dev_fixture` **only** when Functions project is `fresh-prints-dev` (production must never list fixtures even if present)
3. Exclude `staff_gang_sheet` (separate Studio surface)
4. Schedule: `getShowScheduleTab(show, now) === "upcoming"` → `scheduledStartAt > now`, **or** missing schedule treated as upcoming (`packages/shared/src/utils/showScheduleGrouping.ts`)
5. **Exclude Past** schedule-tab shows from the admin sidebar list
6. Do **not** add new filters on `isArchived`, `status`, or `productionStatus` for membership (parity with Studio Upcoming rail code). Expose lifecycle badges for clarity.
7. Studio **Needs Attention** / Past tabs are **out of this amendment** unless the owner later expands scope.

**Horizon:** Studio `listUpcomingShows` is an **unbounded** collection read with **no** “next N days / next N shows” limit. There is therefore **no invented horizon**. Portal admin reuses the same Upcoming membership set. List payloads are **show metadata only** (title, schedule, light badges); full allocation graphs load only for the selected show.

**Ordering:** `scheduledStartAt` ascending; missing schedule last; stable id tie-break — matching `sortUpcomingShowsForDisplay`.

**Default selected show:** reuse `resolveVisibleShowSelection(visibleShows, null)` → **first entry** of that sorted Upcoming list (earliest upcoming / unscheduled-last). Owner does not manually pick “today.”

**Selected-show state:**

- Client holds `selectedShowId` (see identifier strategy)
- Changing selection requests that show’s dashboard DTO (cached in component state only)
- Empty list → empty state; no fake selection
- If selected show disappears on Refresh → fall back via `resolveVisibleShowSelection`
- Active `printing` shows that are still Upcoming remain selectable like Studio; past+printing Needs Attention is not in this list

**America/Chicago** remains the display timezone for dates/times (ADR-FP-187). Upcoming membership uses absolute `scheduledStartAt` vs server `now`, not calendar-day bucketing.

### 9–13. Required stat definitions (mechanical)

All stats are computed from **authoritative `showAllocations` for the selected show**, not guessed UI copy.

#### Design Qty

**Definition:** count of **distinct design/upload identities** among **non-canceled** allocations for the selected show.

Identity key:

- `catalog_design` → `designId` (required for uniqueness; if missing, fall back to allocation row id so unknown rows still count once)
- `customer_upload` → `customerUploadId` (same fallback)

**Rationale:** Owner wants “how many different designs are attached.” Studio PR card “Design(s)” currently uses **allocation row count** (`group.allocations.length`), which **double-counts** splits of the same design. This amendment deliberately uses **unique identity** to avoid split double-counting. Document the divergence from Studio card wording in ADR amendment.

Canceled rows do **not** contribute. Split rows of the same design count as **1**.

#### Print Qty

**Definition:** sum of `allocatedQuantity` for allocations with `status !== "canceled"`.

Equals the canonical show capacity numerator / denormalized `upcomingShows.allocatedQuantity` contract (`recalculateShowAllocatedQuantity`). Moved/requeued source rows are canceled history and are excluded. Destination rows count on the destination show only.

#### PR Qty

**Definition:** count of distinct `printRequestId` values that have **at least one non-canceled** allocation on the selected show.

Canceled-only history groups are **not** counted in PR Qty (may still appear as optional compact history later; v1 amendment list focuses on active attached PRs). Splits across multiple rows of the same PR count as **1 PR**.

#### Capacity

Reuse shared helpers — **do not invent a second formula**:

| Piece | Source |
|---|---|
| Denominator | `upcomingShows.maxTotalQuantity` (undefined = uncapped Whatnot) |
| Numerator | Print Qty above (= non-canceled allocated sum) |
| Assessment | `assessShowCapacity({ maxTotalQuantity, allocatedQuantity })` |
| Percent | `getShowCapacityPercent` → may exceed 100; **undefined** if max missing or `<= 0` |
| Bar width | Visual clamp `Math.min(100, percent)` only (Studio detail bar parity) |
| Labels | Prefer shared `formatCapacityUsedLabel` / over-max copy (`N over max`) |

Display: progress bar + numeric percent when defined + text like `42 of 60 used` (or Studio “No max set” / over-max wording). Do **not** clamp away truthful over-capacity in the numeric percent/label.

### 14. Print Request list fields

Main list shows **PR summaries only** — **no** expanded item/design lists.

Minimum fields per active attached PR card:

- Print Request name (`requestNameSnapshot` / request doc)
- Customer / Internal / unknown kind label
- Safe customer identity label when customer (`@username` else display name) — same minimization as v1
- Design count for that PR (unique non-canceled identities within the PR’s allocations on this show)
- Print quantity for that PR (non-canceled sum)
- Compact status/progress summary (e.g. counts by active statuses, or derived short label)
- **View Designs** action

Mobile-first cards; no dense Studio tables; no mutation controls.

### 15–18. View Designs modal + image strategies

**Modal fields (read-only), per item for the selected show + selected PR:**

- Image thumbnail/preview
- Title (`designTitleSnapshot` or generic upload title policy)
- Quantity
- Width × height when present
- `sizeLabel` when present
- Allocation status when useful
- Origin label `standard` | `requeued` | `moved` (no raw lineage IDs)

Canceled items: either omit from modal by default or show in a clearly separated history section; Formal Review prefers **active (non-canceled) items first**; canceled optional/collapsed.

#### Catalog image strategy

- Prefer **thumbnail** derivative (`/thumbnails/{designId}.webp`, 320×320) for modal grid; preview only if thumbnail missing
- **Never** return originals for this modal
- Server resolves `designs/{designId}.thumbnailPath` / `previewPath` via Admin SDK
- Return **short-lived signed download URL** + `expiresAtMs` (reuse assisted-creation TTL pattern: **15 minutes**) — do not put durable Storage paths in the client DTO
- Ready public derivatives exist in Rules, but Portal admin still must not client-query `designs` (ADR isolation); callable remains the boundary

#### Customer-upload image strategy

- Server loads `customerUploads/{id}` from allocation `customerUploadId`
- Sign `thumbnailStoragePath` (fallback `previewStoragePath`) with the **same 15-minute** Admin `getSignedUrl` pattern used by `customerGetAssistedCreationApprovedProofDownloadUrl`
- **Never** return raw Storage paths, source/production paths, or durable URLs
- Authz: active owner/admin only on every invocation; verify the upload is referenced by an allocation on the authorized show/PR pair before signing
- Helpers/customers/guests cannot obtain these URLs through the new API even though Studio Rules already allow helper Storage reads

This is an **explicit ADR-FP-187 privacy expansion** (artwork was previously excluded) and requires ADR amendment + Formal Review approval before implementation.

### 19. Identifier / reference strategy

Original DTO was identifier-free. Navigation now requires stable refs.

| Ref | Proposal | Notes |
|---|---|---|
| `showId` | Firestore `upcomingShows` document id | Accepted as admin navigation ref; every callable re-authorizes and re-loads |
| `printRequestId` | Firestore print request id | Accepted only as input to modal callable **after** proving allocation linkage to `showId` |
| Customer / design / upload / allocation ids | **Not** returned in list/dashboard DTOs | Upload/design ids used server-side only while minting signed URLs |
| Opaque HMAC tokens | Not required if authz is correct | Security is authorization, not hiding staff-known show/request ids |

UI may hold `showId` / `printRequestId` in memory for selection/modal; still no customer browser Firestore reads of private collections.

### 20–22. Callable architecture (selected: Option B)

| Option | Verdict |
|---|---|
| A — extend daily flattened day DTO | Rejected — wrong navigation shape; forces artwork/items into day payload |
| B — narrow callables + lazy modal | **Selected** |
| C — other | Not needed |

**Proposed callables (final export names must follow repo conventions):**

1. **`getPortalAdminUpcomingShowQueueDashboard`** (bootstrap / refresh / show switch)
   - Auth: active owner/admin (same `assertPortalAdminQueueCaller` pattern)
   - Input: `{}` **or** `{ showId?: string }`
   - Output: `{ shows: ShowListItem[]; selectedShowId: string | null; selected: SelectedShowDashboard | null }`
   - `shows[]`: title, scheduledStartAtMs, light lifecycle badges, optional tiny capacity hint — **no** PR/item/artwork
   - `selected`: title, schedule, Design/Print/PR qty, capacity block, `requests[]` summaries **without items**
   - When `showId` omitted/invalid: server picks default via `resolveVisibleShowSelection`

2. **`getPortalAdminShowQueueRequestDesigns`** (lazy modal)
   - Input: `{ showId: string; printRequestId: string }`
   - Output: item rows + short-lived image URLs + expiresAt
   - Verifies caller; verifies allocations exist for that show+request; signs only authorized derivative paths

**Disposition of `getPortalAdminDailyShowQueue`:** stop calling it from Portal; keep or remove export in the same Function deploy slice after review (prefer retire from Portal client immediately; Function cleanup may remove or leave temporarily unused — Formal Review: remove from Portal; Function may replace/repurpose in same DEV deploy authorization). Redeploy of Functions is **likely required**.

### Lazy-load strategy

- Initial page: dashboard callable once (list + default selected show summaries)
- Show switch: dashboard callable with `showId` (or client cache of last responses — component-local only; Refresh always refetches)
- View Designs: modal callable **only on open**; do not prefetch all PRs
- Close/reopen: may refetch or reuse in-memory modal result until Refresh/show change clears it
- Switching shows **must clear** modal state to prevent stale PR artwork

### Expected read shapes

**Initial / Refresh / show switch (dashboard):**

1. Caller profile read
2. Bounded upcoming-show discovery (prefer query `scheduledStartAt > now` **plus** inclusion path for unscheduled Whatnot-surface shows, matching Studio sort semantics; avoid silent `orderBy` exclusion of missing schedules)
3. For **selected show only**: allocations `where upcomingShowId == selected` (all statuses for correct canceled exclusion math)
4. Batched `printRequests` gets for distinct active PR ids on that show

**Modal:**

1. Caller profile
2. Allocations for `showId` filtered to `printRequestId` (or query both fields if indexed; otherwise filter in memory from show allocations already authorized)
3. Distinct catalog `designs` / `customerUploads` docs for derivative paths
4. Sign thumbnail URLs (no browser Storage SDK required)

No realtime listeners, no polling, no uncontrolled N+1 from the browser.

### 23. Refresh behavior

Explicit Refresh remains. It refreshes:

- Upcoming show list
- Defaulting/selection validity
- Selected-show stats + PR summaries

Modal artwork reloads when the modal is opened (or on explicit refresh while open). Preserve the Portal load-lifecycle corrective exactly unless a narrow refactor is required for the new hook shape.

### 24–26. Mobile behavior

- Sidebar: off-canvas default; large Menu/Shows control; selected show highlighted; close on select; large tap targets
- Dashboard order: title/date → capacity → quick stats → PR list
- Modal: large thumbs, vertical scroll, max-height, easy close, no horizontal overflow, accessible targets
- No hover-only controls; no desktop-only tables

### 27. Loading / error / empty states

| State | Behavior |
|---|---|
| Initial load | Skeleton/status until dashboard settles |
| Empty upcoming list | Clear empty copy; no phantom selection |
| Selected show with zero active PRs | Show header/stats at zero; empty PR list copy |
| Dashboard error | Retryable error; do not spin forever |
| Modal loading/error | Contained in modal; closing cancels UX wait |
| Auth denial | Existing admin gate behaviors |

### 28. Tests (eventual implementation)

- Auth matrix unchanged (owner/admin allow; helper/customer/guest/inactive deny) on **every** new/changed callable
- Membership/default-selection fixtures (upcoming/past/unscheduled/dev_fixture gate/staff exclusion)
- Stat fixtures: unique designs with splits; canceled excluded from Print/Design/PR qty; capacity uncapped / full / over
- Modal: catalog + upload signing authz; cross-show/PR IDOR denied; no path leakage; helper denied
- Portal: sidebar selection, mobile drawer, modal open/close, show-switch clears modal, Refresh, Strict Mode lifecycle regression suite preserved/extended
- Contract tests: no customer providers in admin shell; no PortalSidebar customer mount

### 29–30. DEV deployment impact and rollback

| Item | Amendment impact |
|---|---|
| Function changes | **YES** — new/changed callables; Portal stops using daily DTO |
| Additional Function | **YES** — at least the designs/modal callable (dashboard may replace daily) |
| Existing DEV Function redeploy | **YES likely** |
| Firestore Rules | **NO** |
| Storage Rules | **NO** (Admin signed URLs; no Rules widen) |
| Indexes | **NO expected** if queries stay single-field; confirm before deploy |
| New dependencies | **NO** |
| Portal App Hosting | Still localhost DEV QA |
| Production | Untouched |

Rollback: revert Portal to previous admin UI; leave/disable new callables (read-only). Signed URLs expire naturally.

### 31. ADR-FP-187 amendment

**Required: YES.** Amend to:

- Upcoming-show dashboard (not day dump) as the accepted Portal admin surface
- Minimal `showId` / `printRequestId` navigation refs under callable authz
- Owner/admin-only short-lived signed derivative URLs for View Designs
- Explicit continued bans: helpers, customer providers, mutations, Rules changes, originals, path leakage

### 32. Unresolved owner decisions

| ID | Decision | Default if owner silent at implement auth |
|---|---|---|
| None blocking for membership/horizon | Horizon reused from Studio Upcoming (unbounded metadata list) | Proceed with Studio Upcoming membership |
| Optional product preference | Include Studio **Needs Attention** (past+printing) shows in sidebar? | **No** — Upcoming only unless owner says otherwise |
| Optional product preference | Show canceled-only PR history on main list? | **No** — active attached PRs only; canceled items optional in modal |
| Design Qty vs Studio card wording | Unique designs vs allocation row count | **Unique non-canceled identities** (documented divergence) |

No `[NEEDS OWNER DECISION: ADMIN UPCOMING SHOW LIST HORIZON]` — canonical unbounded Upcoming membership already exists.

---

## Original plan sections below

The following sections document the **original** daily-queue foundation (auth, shell isolation, Option A callable, Rules posture). They remain historical context. **Presentation, DTO shape, and artwork policy for acceptance are superseded by the Amendment section above.** Auth/shell/Rules/read-only boundaries remain in force unless the Amendment explicitly changes them.

## Scope

### In scope

- A private, mobile-responsive Portal daily Show Queue visibility route for active `owner` and `admin` users only.
- A trusted, minimal, read-only callable DTO derived from existing production authority.
- The smallest Portal auth/session amendment needed to admit the two authorized staff roles to the isolated route while keeping customer flows customer-only.
- Explicit loading, error, empty, and manual Refresh states.
- Tests, DEV deployment inventory, rollback instructions, and an ADR for the deliberate Portal-role exception.

### Out of scope

- Every Portal mutation and every Studio production control, including start/pause/resume/finish, recovery, allocation edits, exports, gang sheets, request/show edits, or account changes.
- `helper`, `customer`, guest, native-mobile, third-app, App Hosting deployment, Studio publish, production action, Maintenance Mode, Smart Profile backfill/readiness work, and retained legacy-tag cleanup.

## Repository findings

### Current Portal authentication and shell behavior

The current Portal is deliberately customer-only in code, not merely in documentation.

- `apps/portal/features/auth/context/AuthProvider.tsx` loads the authoritative `users/{uid}` document, rejects every role other than `customer` at lines 100–130, labels it `staff-account`, and then calls `finalizeBlockedLogin`, which signs the Firebase user out at lines 283–305.
- A customer session then requires `customers/{customerId}` by `userId`; it loads and subscribes to that document, and assumes customer fields throughout `PortalAppShell` providers.
- `apps/portal/app/(app)/layout.tsx` always composes `AuthGate` with `PortalAppShell`. That shell mounts Current Request, print-request, favorites, notifications, account, sidebar, and bottom-nav providers. It is not safe to reuse for a staff-only route.
- Customer callables use `requirePortalCustomer`, which independently requires `users/{uid}.role === "customer"` plus a linked, active customer document. This is a useful existing server-side customer-flow boundary.
- `users/{uid}` self-read is already Rules-allowed, so an active owner/admin can read only their own authoritative profile during bootstrap. Private Show Queue collections are currently Rules-readable by all active staff, including helpers.

**Exact discovered issue:** an owner/admin can authenticate with Firebase Auth today, but Portal deliberately turns that valid session into `staff-account` and signs it out before it can reach any route. A direct Portal shell would also mount customer-only providers and flows that expect `customer` data.

### Current Studio Show Queue authority and semantics

- Studio’s queue surface is `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`; it uses `upcomingShows`, then a per-show `showAllocations` subscription through `upcomingShowService`.
- `isWhatnotQueueSurfaceShow` defines the Show Queue surface as `whatnot` and DEV-only `dev_fixture` shows. `staff_gang_sheet` is a distinct Studio surface and must not be folded into this daily Show Queue page.
- Studio groups all allocations for a show by `printRequestId`; request groups sort by newest allocation `createdAt` descending (`groupAllocationsByRequest`). It renders all allocation statuses, treating `canceled` rows as history and non-canceled rows as attached work.
- Allocation state is authoritative on `showAllocations`: `pending`, `queued`, `in_progress`, `printed`, `done`, and `canceled`. It is never inferred from a design. `upcomingShows.allocatedQuantity` is a non-canceled allocation total for show-level display.
- Split work stays as separate allocation rows. A Did Not Print requeue creates a new target allocation with `requeuedFromAllocationId`; a normal move uses `movedFromAllocationId`; the source row remains canceled history. These IDs must not leave the trusted DTO.
- New allocation rows already snapshot `requestNameSnapshot`, source type, safe sizing, and `designTitleSnapshot`. `buildShowAllocationSourceFields` guarantees a title snapshot for new catalog or upload rows. A request read is still needed to distinguish Customer vs Internal and derive the minimum customer identity label.
- Studio does not define a stable explicit sort for allocation rows inside a request group. The eventual callable will use a deterministic server-only `createdAt ASC, document-id ASC` item order and document it as Portal presentation order; it does not alter queue membership.

### Existing documentation/code discrepancy

`upcomingShowService.listUpcomingShows` comments that it lists non-archived shows, but its actual current implementation maps the complete collection and does not filter `isArchived`, `status`, or `productionStatus`. The Studio Show Queue surface likewise filters by source, not those lifecycle fields. For parity, the eventual DTO must preserve current code membership and return lifecycle fields for clear presentation; it must not silently “fix” this discrepancy in this small feature. Formal Review records this as a documentation follow-up/fixture requirement.

## Controlled architecture amendment

### Route and shell

The exact v1 route is **`/admin/show-queue`**. Implement it via a Next App Router `(admin)` route group so the public path stays `/admin/show-queue` while it receives a dedicated `PortalAdminShell`.

The shell contains only the Portal brand, the label **Admin · Show Queue**, current staff display name, theme support already provided by root providers, and Sign out. It must not mount `PortalPrintRequestProvider`, `FavoritesProvider`, `PortalNotificationsProvider`, `CurrentRequestDrawer`, customer sidebar/bottom nav, upload panels, or account/customer mutation providers.

Navigation is **direct URL only for v1**. Adding an owner/admin navigation item to the customer shell would increase the customer/staff branching surface with no operational need. The isolated shell makes the page usable on desktop and mobile without exposing a staff entry in normal Portal navigation.

### Session model and route guards

Extend the Portal auth state with a discriminated session mode based only on the already-authoritative loaded `UserProfile`, for example `guest`, `customer`, `portal_admin`, or `staff_denied`. Do not use client-supplied roles or Firebase custom claims as authority.

| Direct URL / sign-in case | Required behavior |
|---|---|
| Active owner | `portal_admin`; `PortalAdminAuthGate` renders the queue and callable is allowed. |
| Active admin | Same as owner. |
| Helper | Preserve the current staff-denial/sign-out behavior; no customer bootstrap, no admin shell, callable denies. |
| Active customer | Existing customer session stays intact, but `PortalAdminAuthGate` renders a safe Access denied page with a Browse link; no queue request. |
| Guest | Redirect to `/login?returnTo=/admin/show-queue`; no queue request. |
| Inactive/disabled owner or admin | Treat as unavailable and sign out; callable fresh-loads the profile and denies. |

The existing `(app)` `AuthGate` must become explicitly customer-only. A `portal_admin` session reaching any normal customer route must be redirected to `/admin/show-queue` before `PortalAppShell` mounts. Post-auth routing must preserve a safe admin `returnTo` only for a `portal_admin` session; owner/admin login without a safe admin return target lands on `/admin/show-queue`. A customer carrying that return target cannot enter the route and instead lands on normal browse. The existing safe same-origin `returnTo` validation remains in force.

The profile subscription must re-evaluate role and `isActive` changes, not just active status: owner/admin → helper/customer/inactive immediately removes the admin session; logout clears the DTO from component state. No `customers/{id}` read or subscription runs for a staff session.

## Operational day — owner decision required

`scheduledStartAt` is an absolute timestamp, but no shared Show Queue operational-day helper or business timezone exists. Studio’s `groupShowsByDate`, show calendar utilities, and relevant Portal calendar code use browser-local date methods; that would produce different day contents for staff in different locations. America/Chicago is explicitly canonical for customer-upload quotas, but the repository says that timezone is unrelated to Show Queue cutoff math and does not establish it as the Show Queue day.

`[NEEDS OWNER DECISION: SHOW QUEUE OPERATIONAL DAY TIMEZONE]`

After the owner selects the business zone, create one shared pure helper (and tests) that returns an IANA-zone calendar key plus the inclusive/exclusive instant window `[dayStart, nextDayStart)`, including DST transitions. The callable—not the browser—uses that helper and a server `now` to select `scheduledStartAt >= dayStart` and `< nextDayStart`. Portal displays the returned canonical date label/timezone and formats show times in that same zone. It must never choose browser-local time.

## Canonical membership and presentation contract

For the selected operational-day window, include every valid current Studio Show Queue-surface show whose `scheduledStartAt` is in the window:

1. `source === "whatnot"`; and `source === "dev_fixture"` only when running against `fresh-prints-dev`.
2. Exclude `staff_gang_sheet`, because Studio separates that production lane from the Show Queue surface.
3. Preserve current Studio code behavior for `isArchived`, show `status`, and `productionStatus`; expose lifecycle state instead of adding a new hidden filter. The later documentation reconciliation is separate from this goal.
4. Sort shows by scheduled time ascending, with a server-only stable tiebreaker. Multiple matching shows receive separate, clearly labeled show sections.
5. For each show, load every `showAllocations` row and group by Print Request. Include `canceled` history in the DTO so a source move/requeue cannot be misrepresented, but visually separate canceled rows from current production work. `pending`/`queued`/`in_progress` remain active work; `printed`/`done` remain completed-today state.
6. Do not duplicate lifecycle logic. Extract only a genuinely app-neutral pure grouping/operational-day utility into `packages/shared` if no existing helper covers it; never import Studio components/renderers into Portal.

The no-show state is **“No Show Queue scheduled for this operational day.”** A day with matching shows but no non-canceled allocations is not a no-show day: show the show card and **“No current allocations”** while retaining any compact canceled history.

### Minimum UI fields

The v1 mobile-first presentation is one compact card section per show:

- Show title (fallback `Untitled show`), scheduled time, show lifecycle/status, production status, and useful non-canceled quantity/row totals.
- Request name, `Customer request` or `Internal request` label, and for Customer requests one server-derived identity label (prefer `@username`, otherwise display name). Do not return both names or a customer ID.
- Per allocation item: catalog design title or the generic label **Customer upload**, source label, allocation status, allocated quantity, persisted width/height when captured, and `sizeLabel` when present.
- A small status/count summary and a collapsed/history treatment for canceled rows; a neutral `requeued`/`moved` origin label derives from lineage without returning raw lineage IDs.
- A large Refresh control, loading skeleton/status, clear retryable error, and concise empty state. No action/menu/links that mutate or open customer flows.

Customer-upload artwork previews, Storage paths/URLs, raw filenames, upload IDs, design IDs, allocation IDs, customer IDs, request IDs, email, notes, payment fields, auth metadata, and show identifiers are excluded. No `customerUploads`, `designs`, or `printRequestItems` documents are read for v1. The generic Customer upload label is intentionally less specific than a private filename; it is enough to identify the source without exposing private artwork or filename metadata.

### Proposed shared DTO

Create an explicit shared request/response type, with an empty request object and a response shaped approximately as follows (final names must follow repository conventions):

```ts
interface PortalAdminDailyShowQueueResponse {
  operationalDay: { dateKey: string; timeZone: string; generatedAtMs: number };
  totals: { showCount: number; attachedQuantity: number; activeWorkQuantity: number };
  shows: Array<{
    title: string;
    scheduledStartAtMs: number;
    showStatus: UpcomingShowStatus;
    productionStatus: ShowProductionStatus;
    isArchived: boolean;
    attachedQuantity: number;
    activeWorkQuantity: number;
    requests: Array<{
      name: string;
      kind: 'customer' | 'internal' | 'unknown';
      customerIdentityLabel?: string;
      attachedQuantity: number;
      activeWorkQuantity: number;
      items: Array<{
        label: string;
        source: 'catalog_design' | 'customer_upload';
        status: ShowAllocationStatus;
        quantity: number;
        printWidthInches?: number;
        printHeightInches?: number;
        sizeLabel?: string;
        origin: 'standard' | 'requeued' | 'moved';
      }>;
    }>;
  }>;
}
```

The DTO intentionally has no document identifiers. It returns only values required to render the read-only daily view. Missing/deleted request documents must not erase authoritative allocation history: retain the allocation’s name snapshot, set `kind: 'unknown'`, and omit customer identity.

## Authorization architecture decision

### Option comparison

| Criterion | Option A — owner/admin callable DTO | Option B — Portal direct Firestore reads with Rules |
|---|---|---|
| Least privilege / privacy | Returns a purpose-built field-minimized DTO only. | Current Rules expose full private collection documents to any active staff client. |
| Helper denial | Fresh server role lookup can deny helper. | Not possible without changing shared Studio Rules because `isStaff()` includes helper. |
| Customer/guest denial | Callable requires Firebase Auth then authoritative role. | Would need multiple broad collection Rules branches and query correctness. |
| Data exposure | No raw request/customer/upload/design/allocation docs reach Portal. | Client must receive raw documents or broaden Rules to reach related data. |
| Testability | Handler role matrix and DTO allowlist are direct unit/contract tests. | Requires Rules tests plus queries that must remain aligned with Studio. |
| Reads and maintenance | One bounded server composition; no browser fan-out/cache of private records. | Multi-collection browser services, Rules coupling, and more accidental-surface risk. |

**Selected architecture: Option A.** Add a new `getPortalAdminDailyShowQueue` callable. It verifies `request.auth.uid`, loads `users/{uid}` with `loadCallerProfile`, and permits only active `owner`/`admin` using the existing owner/admin permission pattern. The role check is fresh on every invocation; client gates are UX only. The callable accepts no show, request, role, date, or field-selection input.

**Firestore Rules impact: NO.** Existing `users/{uid}` self-read supports bootstrap. Existing direct private-collection Rules must remain unchanged because Studio helpers legitimately need them. The new callable uses Admin SDK and does not widen Portal reads.

## Read/query shape and refresh behavior

The server performs one bounded composition per initial load or explicit Refresh:

1. One authoritative caller-profile read.
2. One `upcomingShows` timestamp-range query for the resolved day, then source/lifecycle mapping/filtering in the trusted function. It avoids an `orderBy` exclusion hazard and sorts the selected results in memory.
3. `ceil(S / 30)` `showAllocations.where('upcomingShowId', 'in', chunk)` queries for `S` qualifying shows and `A` returned allocation rows, including canceled history.
4. Batched `getAll` reads for `R` unique `printRequests` only, chunked to a documented safe reference count. These supply `isInternal` and one identity label; no per-row fetches.

Approximate returned-document reads are `1 + show-query results + A + R`; query/RPC count is `2 + ceil(S / 30) + ceil(R / batchSize)`. There is no item/design/customer/upload hydration, no N-per-card browser fetch, no realtime listener, no interval polling, and no claimed dollar estimate. The function logs only aggregate, non-PII DEV read accounting if existing logging conventions support it.

Use load-on-open plus an explicit, coalesced **Refresh** button. Do not add periodic refresh, visibility refresh, realtime listeners, persistent browser caching, or an App Hosting cache for private DTO data. Keep only component-local data; clear it on unmount/session change.

**Firestore index impact: NO.** The selected timestamp range and each single-field `in` allocation query use single-field indexes; no compound query is planned. Reconfirm with emulator/DEV error output before any deploy rather than adding an index speculatively.

## Proposed implementation slices and ownership

| Layer | Proposed files / responsibility |
|---|---|
| Shared | New typed `packages/shared/src/types/portal/...` DTO; a pure operational-day/grouping helper only after the timezone decision; unit tests including DST and allocation lifecycle fixtures. |
| Functions | New `functions/src/getPortalAdminDailyShowQueue.ts`, a focused composition helper/test, and export from `functions/src/index.ts`; reuse `loadCallerProfile`, existing errors, shared status types, and allocation snapshots. |
| Portal service/hook | New `apps/portal/features/admin-show-queue/services/...` callable service via `callTracedFunction`, plus hook/state that owns initial load, manual refresh, and error handling. Components never call Firebase directly. |
| Portal UI | New `features/admin-show-queue` page/components and admin-only responsive CSS using existing tokens/components; `(admin)/admin/show-queue/page.tsx` and isolated layout/shell. |
| Portal auth | Amend `AuthProvider`, `auth.types`, post-auth redirect behavior, and customer/admin guards to support the narrow session mode and prevent staff from mounting customer providers. |
| Docs | Add an ADR to `docs/project/DECISIONS.md`; update Architecture, Security, Backend, Data Model/API surface, Testing, and deployment documentation only where the implemented behavior changes them. |

No new dependency, persisted collection, `dailyShowQueue` cache, secret, environment variable, Firebase Auth provider, database migration, or Studio renderer import is planned.

## Tests and manual QA for the eventual implementation

### Automated

- Functions handler/composition tests: active owner/admin allowed; helper/customer/anonymous/inactive denied; malformed/non-empty input denied; day boundary/DST fixtures; zero/multiple shows; source exclusion; canceled, split, printed, and requeued/moved allocation fixtures; missing request fallback; exact DTO allowlist proves excluded IDs, email, upload/artwork metadata, and arbitrary documents never return.
- Portal auth/route tests: admin direct route, owner/admin post-login target, guest login return, helper rejection, customer denial without logout, staff-to-customer-route isolation, role/inactivation session invalidation, and no customer-only provider in admin layout.
- Portal page tests: loading, error/retry, no-show, show-with-zero-current-work, multiple-show grouping/order, customer/internal labels, dimensions/quantities/statuses, canceled history, manual refresh coalescing, and responsive/card accessibility contracts.
- Shared tests: operational-day helper selected timezone/DST behavior and grouping/sorting/lifecycle helpers if introduced.
- Regression commands chosen from `docs/standards/TESTING.md`: focused Node tests, `npm run typecheck --workspace @fresh-prints/portal`, Portal test suite, `npm --prefix functions run build`, and the applicable Portal build. Run Rules tests only as a regression check if the eventual review changes Rules; no Rules change is presently planned.

### Manual owner DEV QA

1. On local Portal against `fresh-prints-dev`, sign in as owner and admin at `/admin/show-queue` → each sees only the daily read-only queue and Refresh.
2. Sign in as helper → rejected/signed out; direct callable invocation denied.
3. Sign in as customer → `/admin/show-queue` is denied while normal browse, request, upload, account, and Current Request behaviors remain unchanged.
4. Open direct URL as guest → login with safe return works only for owner/admin.
5. Verify no controls mutate a show/request/allocation and no customer shell/nav/drawer appears.
6. Verify multiple same-day shows, no-show day, canceled/requeued/split fixture rows, quantities, dimensions, and mobile layout.
7. Change an allowed staff user to inactive/another role → Portal session loses access and callable denies on refresh.

## Eventual DEV deployment inventory

| Item | Required? | Notes |
|---|---:|---|
| New Cloud Function deploy to `fresh-prints-dev` | Yes | `getPortalAdminDailyShowQueue`, only after implementation review and owner DEV authorization. |
| Firestore Rules deploy | No | Callable boundary avoids a Rules change. |
| Firestore index deploy | No | Confirm actual query shape before deploy. |
| Portal App Hosting deployment | No for DEV | DEV Portal is localhost-only by binding policy. |
| Local Portal QA | Yes | Local `dev:portal` against the DEV Firebase project. |
| Studio publish | No | No Studio source/runtime change is intended. |
| Eventual production Function + Portal App Hosting release | Yes, separately | Only after reviewed `development` → `production` promotion and explicit owner production authorization. |

## Risks and mitigations

| Risk | Mitigation / rollback |
|---|---|
| Portal customer-only architecture is broadened accidentally | Discriminated session mode, separate route group/shell, customer-only guard, and structural tests proving customer providers are absent. Revert the auth route slice and Portal deploy together. |
| Client-side gating leaks queue data | Callable fresh-loads `users/{uid}` role and returns a minimal DTO; helper/customer/guest tests are mandatory. |
| Timezone/DST selects inconsistent shows | Do not implement until owner selects zone; shared server helper plus DST tests. |
| Studio parity drifts | Reuse current authoritative collections/snapshots; fixtures cover canceled/split/requeue semantics; do not create a persisted read model. |
| Read amplification / stale data | Bounded day graph query, no per-item hydration/listener/polling, manual refresh only, component-local cache. |
| Private artwork/identity leak | Exclude raw IDs, email, filenames, images, paths, and URLs; return one derived identity label and generic upload label only. |
| Callable rollback needed | It is read-only and writes no data. Remove Portal route access/deploy the previous Portal build; retain the function until a later reviewed cleanup, avoiding a broken old client. |

## Documentation and ADR plan

An ADR is required because the documented platform strategy says Portal is customer-only. The ADR will record the deliberate, narrow exception: active owner/admin may use one read-only Portal route backed by a server-authorized minimal DTO; helpers remain excluded and normal customer flows remain isolated. It must not redefine Portal as a general staff application.

The implementation pass will reconcile the `listUpcomingShows` non-archived documentation comment with observed code only through a separately reviewed documentation/code decision; this page must not disguise that broader discrepancy.

## Owner decision resolved

1. **America/Chicago** is the owner-selected canonical IANA business timezone for the Show Queue
   operational day window and display. The implementation uses timezone-aware calendar boundaries,
   never browser-local time, server machine time, fixed UTC offsets, or manual CST/CDT arithmetic.

## Implementation checkpoint

**Plan Amendment complete. Formal Review Amendment required next.**

Do **not** implement the dashboard amendment until the owner authorizes after Formal Review.

Expected post-review checkpoint:

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT PORTAL ADMIN SHOW QUEUE DASHBOARD AMENDMENT]`

Historical checkpoints (already completed for the original daily slice): timezone decision, local implementation, DEV Function deploy of `getPortalAdminDailyShowQueue`, Owner DEV QA FAIL (loading), Portal lifecycle corrective, Owner DEV re-QA product amendment request.
