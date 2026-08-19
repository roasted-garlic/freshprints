# Plan: Portal Design Engagement Analytics

| Field | Value |
|-------|-------|
| Date | 2026-08-18 |
| Author | Planning Agent |
| Status | Amendment 2 signed off **approved** |
| Workflow | managed-phase |
| Goal id | `portal-design-engagement-analytics` |
| Related | Original review; Amendment 1 review; Amendment 2: docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-amendment-2-review.md |
| Prerequisite | `portal-add-to-show-unmissable` committed `5d042696ddbc7bce2bc40675e5cae82124e5dc04` on `development` |

---

## Goal

Improve Portal GA4 design-engagement reporting so **canonical public catalog design titles** appear in standard **Views by Page title** reporting for both public share pages and Design Details modal opens — without sending IDs, PII, query strings, or a second share `page_view`.

A valid `/share/design/{id}` visit must emit **exactly one** navigation `page_view` with `page_title` = `Share: {canonical public catalog title}` and `page_path` = `/share/design/{actualPublicCatalogDesignId}`, plus **one** `design_view` (`design_surface=share_page`, unprefixed `design_title`, `content_id` = that public catalog ID).

Opening Design Details for a public catalog design must emit **exactly one virtual** `page_view` (`page_title` = `Modal: {canonical title}`, `page_path` = `/catalog/design/{actualPublicCatalogDesignId}`) **and** **one** `design_view` (`design_surface=modal`, unprefixed title, `content_id` = that ID). Closing the modal sends nothing.

**Owner product decision (Amendment 2):** PUBLIC catalog design IDs may be sent to GA4 for design-engagement analytics only. Request/customer/auth/upload/assisted IDs remain prohibited. ADR-FP-138.

---

## Background

GA4 is live on production (`cb006bd`, App Hosting `fresh-prints-portal-build-2026-08-18-001`) with `send_page_view: false`, a single controller as `page_view` owner, production host gate, and sanitizer titles. Share routes currently report the fixed title **Shared Design** (`portalAnalyticsSanitizer.ts` route rule). Design Details is a modal, so it never creates a navigation `page_view`.

This is a **narrow Phase 10 analytics** goal. Phase 9 stays PARKED. Tag-alias stays queued. Cutover stays CLOSED. Do not reopen the GA4 transmission bug (`gtag('js', new Date())` must remain).

Show-clarity (`portal-add-to-show-unmissable`) is already signed off and committed separately. This goal must not mix those files.

---

## Repo inspection (exact paths)

| Area | Path | Finding |
|------|------|---------|
| Types | `apps/portal/features/analytics/types/portalAnalytics.types.ts` | `page_title` is a fixed sanitizer string. `Gtag` only allows `event` `page_view`. |
| Sanitizer | `apps/portal/features/analytics/services/portalAnalyticsSanitizer.ts` | `/share/design/:id` → title `Shared Design`. Never `document.title`. |
| Service | `apps/portal/features/analytics/services/portalAnalyticsService.ts` | `initializeStream` / `updatePageContext` / `trackPageView` only. `send_page_view: false`; ads flags false. |
| Controller | `apps/portal/features/analytics/hooks/usePortalAnalyticsController.ts` | Sole `page_view` owner. Fires as soon as script+config ready. |
| Boundary / script | `PortalAnalyticsBoundary.tsx`, `PortalAnalyticsScript.tsx` | Stub includes `gtag('js', new Date())`. |
| Host gate | `portalAnalyticsHostGate.ts` | `myprintrequest.com` only. |
| Share route | `apps/portal/app/(app)/share/design/[id]/page.tsx` | SSR `loadPortalDesignShareMeta` → `initialMeta`. |
| Share meta | `portalDesignShareMetaService.ts` | Title is `designs/{id}.title` only when `status === 'ready'` and title is a non-empty string. Public catalog only. |
| Share UI | `ShareDesignPortalPageContent.tsx` | Display: `design?.title ?? initialMeta?.title`. Analytics must use **canonical** `initialMeta.title` (not censored `displayTitle`). |
| Modal | `CatalogDesignDetailsModal.tsx` | `design: CatalogDesign`. Title: `design.title`. Also used from catalog/home/favorites and **account reusable catalog designs** (not customer-upload tiles — those use lightbox). |
| Title length | Studio `designService.ts` `MAX_TITLE_LENGTH = 200` | Cap analytics titles at 200. |

**Readiness:** `initialMeta.title` is available on the share **client** first paint when SSR succeeded, but the **root controller can tick before the share child registers**. Plan a wait: do not emit `Shared Design` then a second `page_view` with the real title.

**Privacy:** Share meta and `CatalogDesign.title` are staff-approved public catalog titles. Customer-upload gallery tiles do not open this details modal. If Implement finds a path where `design.title` is an upload filename, **STOP** `[NEEDS PRODUCT/SECURITY DECISION]`.

---

## Scope

### In Scope

1. Share `page_view`: wait until share surface reports **ready** (approved title) or **unresolved** (not found / invalid). Then emit **one** `page_view`. Ready → override `page_title` with approved catalog title. Unresolved → keep sanitizer `Shared Design`. Path remains `/share/design/:id`.
2. Typed `trackDesignView({ title, surface })` only. Surfaces: `modal` | `share_page`. Params: `design_title`, `design_surface` only.
3. Modal: one `design_view` per open identity (local `design.id` for dedupe, never sent). Close+reopen = new event. Swap A→B = event for B. Lightbox/favorite/qty/auth rerenders = 0 extra. No timers.
4. Valid share: one `design_view` with `share_page` after approved title; dedupe rerenders; none on not-found.
5. Title approval helper: trim, non-empty, ≤200 chars; drop otherwise. Never send IDs, q, returnTo, description, tags, filenames, `document.title`.
6. Tests: existing analytics suite + new wait/title/dedupe tests; Portal typecheck; Portal build; `git diff --check`.
7. Docs: ROADMAP + handoff at phase transitions; no Measurement ID in git.

### Out of Scope

- Generic arbitrary-event API
- Changing host gate, sanitizer path templates, `send_page_view`, ads flags, Enhanced Measurement, bootstrap `js` command
- Production PR / App Hosting / Measurement ID apply
- Phase 9, tag-alias, show-clarity files
- Sending request/customer/auth/upload IDs (Amendment 2 **does** allow PUBLIC catalog design IDs only — ADR-FP-138)
- Popularity dashboards, GA4 console custom dimensions (owner can map `design_title` later)

---

## Approach

1. **Title approval** — `approvePublicCatalogDesignTitle(raw: unknown): string | null` in analytics feature (not catalog UI). Shared by page_view override and `design_view`.

2. **Share title context** — small provider above `PortalAnalyticsBoundary` + app children (`providers.tsx`). Values: `not_share` | `pending` (unused if `not_share` on a share path means wait) | `ready{title}` | `unresolved`. Share page `useLayoutEffect` registers from `initialMeta.title` only; cleanup on unmount.

3. **Controller wait** — if pathname matches `/share/design/[^/]+$` and readiness is not `ready`/`unresolved`, return **without** committing `initialized` / `lastIdentityKey`. When ready, clone sanitizer descriptor and set `title` to approved title. Controller remains sole `page_view` owner. No second owner.

4. **`trackDesignView`** — `portalAnalyticsService.ts`. Fail closed if gtag missing or title unapproved. `Gtag` union adds `design_view` overload only.

5. **Modal hook** — `useCatalogDesignViewAnalytics({ isOpen, designId, title })`. Dedupe ref = last local designId while open; clear when `!isOpen`. Call from `CatalogDesignDetailsModal` only.

6. **Share `design_view`** — in `ShareDesignPortalPageContent`, once per approved `initialMeta.title` (ref keyed locally by `designId`, never sent). No event if meta missing.

---

## CTA / event truth table

| Action | `page_view` | `design_view` |
|--------|-------------|---------------|
| Load `/` | 1 (`Discover`) | 0 |
| Open details modal A | 1 virtual (`Modal: {title}`, `page_path`=/catalog/design/{actualId}) | 1 (`modal`, `content_id`) |
| Rerender / lightbox / qty / favorite | 0 | 0 |
| Swap modal A→B | 1 virtual for B | 1 for B |
| Close modal | 0 (no compensating Catalog view) | 0 |
| Close, reopen A | 1 virtual for A | 1 |
| Valid share SSR title | 1 (`Share: {title}`, `page_path`=/share/design/{actualId}) | 1 (`share_page`, `content_id`) |
| Invalid share | 1 (`Shared Design`) | 0 |

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Analytics + new tests | `npx tsx --test apps/portal/features/analytics/**/*.test.ts` plus new catalog/share tests | yes |
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | Portal has no lint script; note skip | no |
| Build | `npm run build:portal` | yes |
| Whitespace | `git diff --check` | yes |

Prove: sanitizer still templates share path; default title still Shared Design; controller wait; one page_view with override title; trackDesignView param allowlist; modal dedupe; share dedupe; no design id in service payloads.

### Manual / transport

Reuse `docs/workflow/reviews/2026-08-17-portal-ga4-event-transmission-corrective-dev-transport-qa.md`: TEST stream ID in gitignored `.env.local`, `NEXT_PUBLIC_PORTAL_ORIGIN=https://myprintrequest.com`, hosts → `http://myprintrequest.com:3100`. **Never commit the ID.**

Agent cannot apply hosts/admin or a secret Measurement ID. After automated tests, **STOP for owner DEV QA** including `g/collect` proof (same method). Do not fabricate collect results.

---

## Human Checkpoints Anticipated

- [x] Owner DEV QA + local TEST-stream `g/collect` (Amendment 0/1/2). Owner phrase `DEV DESIGN ENGAGEMENT ANALYTICS QA: PASS` 2026-08-18
- [ ] Production deploy — later batched PR with show-clarity; **not this session**

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Two page_views (stub then title) | High | Wait until ready/unresolved; never emit then replace |
| Wait forever on share | High | Unresolved when `initialMeta` has no approved title |
| Stale share title on next route | High | Override only while pathname is share |
| Private title leak | High | `initialMeta.title` / `CatalogDesign.title` only; STOP if upload filenames appear |
| Duplicate design_view | High | Local id ref; no timers |
| Reintroduce missing `js` bootstrap | High | Do not edit stub except if tests require; leave `gtag('js', new Date())` |

---

## Rollback Plan

Revert the analytics commit on `development`. Host gate and production Measurement ID unchanged. No App Hosting this goal.

---

## Documentation Updates Required

- [x] ROADMAP.md current-work / later done note
- [x] Handoff CURRENT-STATE / 13 at signoff (this session stops before signoff)
- [x] ADR-FP-138 — public catalog design IDs permitted in design-engagement analytics only

---

## Open Questions

- [x] None blocking. Title sources are public catalog fields.

---

## Approval

- Review doc: docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-review.md
- Verdict: approved (original). Amendment 1: **approved**. Amendment 2: **approved** — docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-amendment-2-review.md

---

## Amendment 2 — Human-readable surface prefixes + public catalog design IDs (2026-08-18)

Owner DEV QA confirmed Amendment 1 works (modal titles appear in GA4 Page Title reporting). Two further product improvements are **explicitly approved**:

1. Prefix `page_title` with the surface: `Modal: {title}` or `Share: {title}` (exact colon+space format).
2. Put the **actual PUBLIC catalog design ID** in design-related `page_path` / `page_location` and on `design_view.content_id`.

This **replaces** Amendment 1’s literal `/catalog/design/:id` and `/share/design/:id` for **successfully resolved public catalog designs only**.

### Owner decision (must be recorded)

PUBLIC catalog design IDs may be transmitted to GA4 **only** when bound to a successfully resolved public catalog design, in:

- modal virtual page path/location
- valid share page path/location
- `design_view` `content_id`

**Still prohibited:** request IDs, show allocation IDs, customer upload IDs, customer IDs, auth UIDs, assisted-creation IDs, email, username, filename, private artwork metadata, `q`, `returnTo`. `/requests/:id` stays templated. Do **not** flip the sanitizer to “IDs allowed.”

ADR: **ADR-FP-138**.

### Repo check — ID convention

| Source | Convention |
|--------|------------|
| Share/catalog IDs | `isValidPortalDesignShareId` — `^[A-Za-z0-9_-]{1,128}$` in `portalDesignShareUrls.ts` |
| Share URLs | `buildPortalDesignSharePath` uses `encodeURIComponent(id.trim())` |
| Share meta | `PortalDesignShareMeta.designId` is the ID used to load a **ready** public catalog design (not an arbitrary malformed route param) |
| Modal | `CatalogDesign.id` — same public catalog document id; customer-upload tiles still use lightbox, not this modal |

Reuse that validator and encoding. Do not invent an analytics-only ID format.

### Contracts

**Modal pair** (`trackCatalogDesignModalView`): fail closed unless title **and** public catalog ID both approve.

- `page_title` = `Modal: {canonical title}` (prefix on page_title only)
- `page_path` / `page_location` = `{origin}/catalog/design/{encodeURIComponent(id)}`
- `design_view`: unprefixed `design_title`, `design_surface=modal`, `content_id={trimmed id}`
- No `updatePageContext`, no `document.title` / history change, close = 0, same dedupe as Amendment 1

**Valid share** (controller wait remains):

- Register **ready** only when `initialMeta` exists, title approves, and `initialMeta.designId` (or equivalent resolved id) approves. Never treat a not-found route param as public identity.
- One `page_view`: `Share: {title}`, path `/share/design/{encodeURIComponent(id)}` via existing share-path builder
- One `design_view`: unprefixed title, `share_page`, `content_id`
- No Shared Design then titled second hit

**Invalid/not-found share:** one `page_view` with sanitizer `Shared Design` + `/share/design/:id`; **no** `design_view`; **no** raw route ID in path/location/content_id.

### Architecture

Extend the existing share-readiness object to `{ kind: 'ready', title, designId }`. Controller `applySharePageTitle` becomes a share **override** of title+path+location (still after sanitizer; sanitizer default remains `:id`). Modal helper gains a required approved `designId`. `trackDesignView` adds required `contentId` for this event (typed; not a generic param bag).

Do not add a second navigation controller or a generic virtual-page API.

### Tests / manual

Update unit tests for prefixes, real IDs, `content_id`, invalid share, `/requests/:id` + `q`/`returnTo` regression, controller wait, modal dedupe. Then analytics suite, Portal typecheck, touched ESLint, `build:portal` (stop Portal `next-dev` only if it holds `.next`), `git diff --check`. STOP for owner QA on https://myprintrequest.dev. No signoff, no analytics commit, no production PR.

---

## Amendment 1 — Modal Design Views as Virtual Page Views (2026-08-18)

Owner DEV QA found that `design_view` / `design_title` does not appear in GA4 standard **Views by Page title and screen name**. Share-page navigation `page_view` already puts the catalog title in that report. Modal opens currently send only `design_view`.

This amendment **replaces** the original acceptance criterion “modal must NOT create `page_view`.”

### New modal contract

On an intentional Design Details open of a public catalog design, send **both**:

1. Virtual `page_view`
   - `page_title` = canonical public `design.title`
   - `page_path` = `/catalog/design/:id` (literal template; **never** a Firestore id)
   - `page_location` = `{window origin}/catalog/design/:id` (no query, no id)
   - `page_referrer` = sanitized **parent** route path (e.g. `/catalog`), when the sanitizer can produce one
2. `design_view` with `design_title` (same title) and `design_surface=modal`

Do **not** mutate `document.title`. This is analytics-only.

Close: **zero** events. Do **not** send a compensating Catalog `page_view`.

Dedupe (same local `design.id` ref as Amendment 0; never sent): rerender / lightbox / favorite / qty = 0 extra of either event. A→B while still open = one pair for B. Close then later reopen A = one new pair.

### Share page — unchanged

Valid share: exactly one navigation `page_view` (`page_title` = catalog title, `page_path` = `/share/design/:id`) + one `design_view` (`share_page`). No Shared Design then real title. Invalid share: one `Shared Design` `page_view`, no `design_view`.

### Architecture (repo check)

**Existing layering (Amendment 0, uncommitted):**

| Piece | Role |
|-------|------|
| `usePortalAnalyticsController` | Sole **route/navigation** `page_view` owner (`initializeStream` / `updatePageContext` / `trackPageView`) |
| `trackDesignView` | Typed engagement event only |
| `useCatalogDesignViewAnalytics` | Modal identity dedupe; currently calls `trackDesignView` only |
| `catalogDesignViewDedupe` | Open/swap/close identity; no timers |

**Chosen smallest implementation (Formal Review must confirm):**

Add **`trackCatalogDesignModalView({ title, origin, parentPathname, parentSearchParams })`** on `portalAnalyticsService.ts`.

It:

1. Approves the title via existing `approvePublicCatalogDesignTitle` (fail closed).
2. Builds a virtual `PortalAnalyticsPageDescriptor` via a sanitizer helper `buildCatalogDesignModalPageDescriptor` — path is the **constant** `/catalog/design/:id`, never string-interpolated with an id.
3. Calls existing **`trackPageView`** then **`trackDesignView({ surface: 'modal' })`**.
4. Returns true only if **both** succeed.
5. Does **not** call `updatePageContext` or `initializeStream`.
6. Does **not** teach the root controller about modal open/close.

`useCatalogDesignViewAnalytics` becomes the pair owner: on `shouldTrack` and stream-ready, call `trackCatalogDesignModalView` instead of `trackDesignView` alone. Commit the local dedupe id only after a successful pair. Pass `window.location.origin` / pathname / search — never the design id — into the service.

**Rejected alternatives:**

- Routing modal open/close through the root controller (would require virtual identity keys, and a close restore that the owner forbids).
- `updatePageContext` to the virtual path (would stick the stream on the virtual page until the next navigation, and tempt a compensating Catalog update on close).
- Generic `trackVirtualPageView` / arbitrary event API.
- Adding `/catalog/design/:id` to `ROUTE_RULES` as a physical browser-path match (this path is not a real Portal route; it is a content-view template only).

**Ownership distinction to preserve in comments/docs:**

- Root controller = sole owner of **route/navigation** page views.
- Modal design analytics = sole owner of this **explicit virtual design** `page_view` + `design_view` pair.

### Privacy

Same as Amendment 0. Never send design/request/customer ids, email, `q`, `returnTo`, filename, description, tags, `document.title`, or DOM text. Virtual location/path must not contain the raw id even if the parent URL does.

### Out of scope (unchanged)

Host gate, `send_page_view: false`, ads flags, Enhanced Measurement, `gtag('js', new Date())`, Functions/Rules/indexes/App Hosting, Phase 9, tag-alias, show-clarity product files, share wait/title behavior.

### Tests (Amendment 1)

Prove: modal open = one virtual `page_view` + one `design_view`; path `/catalog/design/:id`; title = approved catalog title; location has no raw id; rerender/lightbox/qty/favorite = 0 extra; A→B = one pair for B; close = 0; reopen = new pair; share + root navigation suites still pass.

Commands: analytics `npx tsx --test` file list; Portal typecheck; touched ESLint; `npm run build:portal`; `git diff --check`.

### Manual / transport

STOP for owner DEV QA on the existing TEST stream via **https://myprintrequest.dev** (proven local-only setup). Do not invent `g/collect`. Do not sign off. Do not commit analytics. Do not open a production PR.

