# Plan: whatnot-show-sync

**Status:** Pivoted to a staff-assisted Electron browser import flow (Slice 2), approved and implemented 2026-07-05
**Created:** 2026-07-05
**Updated:** 2026-07-05 — Pivot from server-side Cloud Function scraping (blocked by Cloudflare, Section 7A) to a staff-assisted in-app browser import (Section 7B). Sections 8-26 below describe the **superseded** Cloud-Function-scraping design and are kept for historical record only — see Section 7B for the design that was actually approved and implemented.
**Phase:** Phase 7 — Show Queue / Whatnot show sync (follow-up to `print-runs-foundation`)
**Implementation approved:** Staff-assisted Electron browser import slice, per explicit user approval 2026-07-05. No scheduled Cloud Function, no server-side fetch, no headless browser, no third-party proxy, no new dependency, no Firebase deploy approved.

---

## 1. Goal

Design (not implement) how Fresh Prints Studio will keep the Show Queue (`upcomingShows`) in sync with
the staff's actual Whatnot show schedule, sourced from a **staff-configurable** Whatnot show-list URL
rather than a hardcoded one — while preserving every guarantee `print-runs-foundation` already
established (upsert by `source + whatnotShowId`, never by date/time; never delete; never touch
`showAllocations` or `designs.status`; local planning fields always preserved).

## 2. Phase alignment

`print-runs-foundation` is signed off PASS (`.cursor/workflow/state.md`, `Signoff: PASS`,
2026-07-05). Its `Next Required Step` explicitly names this as the intended follow-up: *"opening a new
managed phase for live Whatnot sync / scheduled Function / manual refresh callable ... which remain
Planned and out of scope until separately approved."* This plan is that phase's Plan step. Per FreshForge
rules, implementation stays blocked until this plan is reviewed and separately approved — and even after
approval, Cloud Functions/production deploys remain their own, further checkpoint (Section 22).

## 3. Current state (verified by direct repo inspection, 2026-07-05)

- **Manual-only today.** `upcomingShowService.upsertUpcomingShow()` (`src/renderer/src/features/upcoming-shows/services/upcomingShowService.ts:309`) is the only way an `upcomingShows` record is created or updated. It is called exclusively from the "Track a Whatnot show" modal after staff paste a URL through `parseWhatnotShowUrl()`. No network fetch of any kind happens anywhere in the current codebase for Whatnot data.
- **URL parsing already exists and is reusable.** `shared/utils/whatnotShowUrl.ts` exports `parseWhatnotShowUrl(rawInput): ParsedWhatnotShowUrl | undefined`, which already: validates the hostname is `whatnot.com` or a subdomain (`/(^|\.)whatnot\.com$/i`), extracts the UUID from a `/live/<uuid>` path segment via a strict regex, normalizes it to lowercase, and rewrites `referringSource` to `fpStudio`. This is a **single-show-URL** parser, not a show-*list*-page parser — it will need a sibling function for the list page, but the domain-validation half of it is directly reusable for the new base-URL setting (Section 12).
- **Upsert semantics are already correct and must not change.** Matching is by `source + whatnotShowId` only (`findMatchingUpcomingShow`, called at `upcomingShowService.ts:320-321`); on match, only `title`, `whatnotUrl`, `scheduledStartAt`, `lastSeenAt`, `updatedBy`, `updatedAt` are written — `status`, `syncStatus`, `notes`, `isArchived`, `productionStatus`, `maxTotalQuantity`, `maxQuantityOverridden`, `allocatedQuantity` are always preserved (doc comment at `upcomingShowService.ts:303-308`). This exact behavior is the contract a sync job must reuse or extend, not replace.
- **`UpcomingShow` fields today** (`shared/types/upcomingShow/upcomingShow.types.ts`): `id, source, whatnotShowId, whatnotUrl?, title?, scheduledStartAt?, status, syncStatus, syncError?, lastSyncedAt?, lastSeenAt?, notes?, isArchived, productionStatus, maxTotalQuantity?, maxQuantityOverridden, allocatedQuantity, createdBy?, updatedBy?, createdAt, updatedAt`. `syncStatus` (`idle|syncing|succeeded|failed`) and `syncError`/`lastSyncedAt` already exist on the type and in Firestore rules validation, but are currently **unused/always `idle`** since nothing automated ever runs.
- **`settings/showQueue` already exists** as a direct-client-write Firestore doc (`showQueueSettingsService.ts`), currently holding only `defaultMaxTotalQuantity` + `updatedBy` (+ `updatedAt`, write-only). Pattern: `getDoc`/`setDoc(..., { merge: true })`, gated by `permissionService.canManageUpcomingShows()` for writes, `isStaff()`-only in `firestore.rules` (`match /settings/showQueue`, lines 767-775, field-validated by `showQueueSettingsFieldsValid()`).
- **Cloud Functions infrastructure exists and is mature** — this is a correction to an assumption in the request. `functions/` is a real, deployed Node 20 / `firebase-functions@^6` codebase (`firebase.json` has a `functions` codebase entry). Seven `onCall` (v2 HTTPS callable) functions exist today: `createTeamUser`, `updateTeamUser`, `enqueueAiEnrichment`, `resetAiEnrichmentForProcessing`, `testAiEnrichmentPlayground`, `testAiEnrichmentTagRerank`, `updateAiEnrichmentSettings`. They use `assertStaffCaller`/`loadCallerProfile` (`functions/src/lib/caller.ts`) for auth, Secret Manager bindings (`secrets: [geminiApiKeySecret]`) for API keys, and `firebase-admin` for privileged Firestore writes. **No scheduled function (`onSchedule`/`pubsub.schedule`) exists anywhere yet.** No HTML-parsing dependency (`cheerio`, `jsdom`, etc.) exists in either `package.json` — only native `fetch` is used today (by the Gemini vision callable), for JSON APIs, never HTML scraping.
- **Security precedent is unambiguous on where secrets/privileged logic must live.** `docs/standards/SECURITY.md` requires provider API keys live only in Firebase Secret Manager bound to Cloud Functions, explicitly forbids them in Firestore fields, renderer env vars, or IPC; and states "UI permission helpers are not a security boundary. Cloud Functions enforce the final rules" (using the `updateTeamUser` callable as the reference pattern). There's no existing exception for "just scrape from Electron main process" — Electron's IPC pattern (`electron/ipc/app/`) is used today only for local OS-level capability (external link window, DevTools, upload tracking), never for outbound network fetches to third-party sites.
- **`shared/utils/externalLinkSafety.ts`** validates only URL *scheme* (`http:`/`https:`), no host — this is a narrower, reusable primitive but not a substitute for the Whatnot-specific host+path allowlist this feature needs.
- **No Firestore index exists for `upcomingShows`** (full unfiltered collection read + client-side sort, per `upcomingShowService.listUpcomingShows()` and `DATA_MODEL.md:1158-1163`, deliberately, due to a prior `orderBy`-excludes-null-schedule bug). This remains true and unaffected by sync — sync is still just upserts into the same collection.

## 4. Product decisions already confirmed (from the request + prior phase)

- A Whatnot show is the print run; `upcomingShows` + `showAllocations` remain the only two collections for this feature; no third collection.
- Whatnot show ID (from the `/live/<uuid>` URL) is the stable key — never date/time, never title.
- Sync must never delete local shows; a show missing from the current scrape gets a status change at most (see Section 15), never `deleteDoc`.
- Sync must never touch `showAllocations`, must never write `printRequests`, must never write `designs.status`.
- Sync must preserve staff-owned planning fields (`notes`, `maxTotalQuantity`, `maxQuantityOverridden`, `productionStatus`, `allocatedQuantity`, `isArchived`) exactly as the manual upsert already does.
- The Whatnot show base URL must be staff-configurable, not hardcoded, defaulting to `https://www.whatnot.com/user/funkyfreshprints/shows`.
- Manual "Add Show" (paste-a-URL) stays as a permanent fallback — never removed.
- No implementation, no live scrape, no Functions deploy, no secrets, no migration/backfill in this planning phase.

## 5. Product decisions still needed (human input required before/at implementation approval)

These cannot be safely decided from the repo alone and must be confirmed by the user before or during
implementation review:

1. **Is a second Whatnot account/base URL ever expected?** The setting is modeled as a single string
   (Section 12) because only one storefront (`funkyfreshprints`) is mentioned. If multiple source URLs
   (e.g. a second seller account) must ever be synced concurrently, the settings shape needs to be a
   list, not a scalar, decided now rather than migrated later.
2. **What should happen to a show that disappears from the scrape *and* still has active
   `showAllocations`?** Section 15 proposes `missing_upstream` (reusing the existing enum value used
   for the same purpose in `UpcomingShowStatus`) with the show and its allocations fully preserved and
   still visible/editable in Studio. Confirm this is the desired staff experience (vs., e.g., a louder
   warning banner) — it directly affects what production staff see when Whatnot cancels/deletes a show
   that Studio already queued print requests against.
3. **Whatnot page structure is unverified.** This plan's fetch/parse strategy (Section 7) is a best
   guess based on the one HTML sample provided. A short, human-supervised verification spike (fetching
   the real page once, by hand, outside of any deployed automation) should happen before implementation
   is approved, so the parser design in this plan can be corrected if wrong. This is explicitly called
   out as a required pre-implementation checkpoint (Section 22).
4. **Sync interval configurability.** The request asks for "1 hour" as the default and mentions an
   "interval setting if needed." Confirm whether staff need to ever change the interval, or whether a
   fixed 1-hour scheduled function (no configurable interval, simpler rules/UI) is acceptable for v1.
5. **Rate-limit/politeness posture toward Whatnot.** Whatnot is a third party with no known public API
   or scraping terms reviewed in this plan. Confirm the user accepts the legal/ToS risk of scraping
   `whatnot.com`, or whether an official API/partnership path should be investigated first. This plan
   does not make that judgment call.
6. **Manual sync rate limiting.** Should the manual "Sync Whatnot shows" button be rate-limited (e.g.
   once per minute) to prevent staff from accidentally hammering Whatnot's servers via repeated clicks?
   Recommended: yes, but the exact cooldown is a product call.

## 6. Configurable Whatnot show base URL — requirement restated

Staff must be able to change the Whatnot show-list URL Studio syncs from, without a code change or
redeploy. Default value: `https://www.whatnot.com/user/funkyfreshprints/shows`. Used identically by
both the scheduled sync and the manual sync button — there must be only one code path that reads this
setting and fetches/parses it, called from both triggers, to avoid the two ever drifting.

## 7. Whatnot page/source analysis plan

**This is the single biggest source of implementation risk and is explicitly marked `[NEEDS VERIFICATION]`.**
The only evidence available is the one HTML snippet supplied with this request. From it:

- The page is a **client-rendered Next.js app** (`data-nimg="fill"`, Tailwind-style utility classes,
  `srcset` generated by an image CDN) — the raw HTML returned by a simple unauthenticated `fetch()`
  **may or may not** contain the show list, depending on whether Whatnot server-side-renders this route
  or hydrates it entirely client-side after a JS bundle runs. The supplied sample *does* contain the
  fully-rendered show cards inline, which is a good sign for SSR/static-generation, but this must be
  verified against a live, freshly-fetched response (not a browser-rendered DOM snapshot, which is what
  was likely captured to produce the attached file) before committing to a plain-HTTP-fetch approach.
- If it **is** present in the raw server response: a plain `fetch(baseUrl)` + HTML parse (Section 13)
  is sufficient — no headless browser needed.
- If it is **not** present in the raw response (fully client-rendered): the options are (a) a headless
  browser (Puppeteer/Playwright) inside a Cloud Function — heavier, slower, more fragile, and a
  materially bigger dependency/cost/security surface than currently exists anywhere in this repo; or
  (b) discovering and calling Whatnot's underlying data API that the client-side JS itself calls
  (visible via browser Network tab inspection) — likely a private/undocumented API, carrying its own
  stability and ToS risk. **Either path is a bigger decision than this plan should make unilaterally**
  — it must be confirmed via the verification spike in Section 22 before implementation proceeds past
  the parser design.
- From the sample, extractable per-card fields (if raw HTML confirms server-rendering):
  - Show URL: `a[href^="/live/"]` → e.g. `/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b?referringSource=profile` (resolve to absolute `https://www.whatnot.com` + path; strip/ignore the query string when extracting the ID, matching `parseWhatnotShowUrl()`'s existing behavior of overwriting `referringSource` anyway).
  - Show ID: the same UUID already matched by `parseWhatnotShowUrl()`'s existing regex — reuse it, don't reimplement.
  - Title: the `<strong>` inside the card whose `title` attribute duplicates its text content (e.g. `title="🔥SUNDAY EVENING DTF Transfers | Low Starts..."`) — note the sample contains mojibake (`â¢`, `ð¥`) from an encoding mismatch in how the file was captured; the **live fetch must be read as UTF-8** and this is expected to resolve to the correct `🔥`/`•` characters when done correctly, not something to "fix" in the parser.
  - Scheduled date/time: a `<div>` badge overlaid on the thumbnail with human-relative text like `"Today 8:00 PM"`, `"Tue 8:00 PM"`, `"Sun, Jul 12, 8:00 PM"` — **not** a machine-readable ISO timestamp or `datetime` attribute anywhere in the sample. This is the second-biggest risk: relative/ambiguous date text ("Today", "Tue", no year on near-term dates) must be parsed against a known "now" and the seller's timezone, which is not stated anywhere on the page. **This needs explicit confirmation of the staff's/seller's timezone assumption** (recommend: a fixed configured timezone in `settings/showQueue`, not the syncing server's local time, not a guess).
- No visible `<script type="application/ld+json">` or other structured-data block in the sample —
  nothing suggests a cleaner structured-data source is available, but this should be re-checked on a
  live fetch (Whatnot may include structured data elsewhere on the page, e.g. in a `__NEXT_DATA__`
  script tag typical of Next.js SSR pages, which — if present — would be **far more reliable** to parse
  than scraping rendered HTML classes/attributes, since Tailwind utility classes and DOM structure are
  far more likely to change without notice than an embedded JSON payload).
- **Recommendation for the verification spike:** fetch the real base URL once by hand (`curl` or
  browser dev tools "view source," not "inspect element"), and specifically check for a
  `<script id="__NEXT_DATA__" type="application/json">` tag — if present, that JSON payload should be
  the actual parse target instead of HTML/CSS selectors, and would substantially de-risk this feature
  against future markup changes.

### 7A. Slice 1 verification spike — RESULTS (2026-07-05)

**Finding: a plain server-side HTTP fetch of the default base URL is blocked before any content is
reachable.** This supersedes every conditional scenario sketched above in Section 7 — the question was
never "is the show list in raw HTML or client-rendered," because the raw response contains neither: it
is a Cloudflare bot-challenge interstitial, not the Whatnot app at all.

**What was done:** a throwaway, non-committed Node script (deleted immediately after use, never part
of the application) validated the default base URL through the new `parseWhatnotShowBaseUrl()`
function (Section 12, implemented in this slice — see `shared/utils/whatnotShowBaseUrl.ts`), then
issued exactly one `fetch()` against the validated URL with `redirect: "manual"` (so any redirect would
be surfaced, not silently followed to a different host) and a standard desktop-browser `User-Agent`
header. No other URL was fetched. No Firestore write occurred. The script and its raw output were
deleted after inspection; nothing from this fetch was committed to the repository.

**Exact result:**
- **HTTP 403 Forbidden**, `Content-Type: text/html; charset=UTF-8`, no `Location` redirect header.
- Response body (5,857 characters) is a **Cloudflare managed-challenge page**, not Whatnot's
  application: `<title>Just a moment...</title>`, a `noscript` fallback reading *"Enable JavaScript and
  cookies to continue,"* a strict `Content-Security-Policy` scoped to `challenges.cloudflare.com`, and
  an inline script assigning `window._cf_chl_opt = {...}` (Cloudflare's client-side JS-challenge
  bootstrap, including per-request nonces/rays/tokens) that loads
  `/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page/v1?ray=...` to complete the challenge in a real
  browser before the origin server ever sees a legitimate request.
- `__NEXT_DATA__`: **absent.** `application/ld+json`: **absent.** `/live/` anchors: **zero.** UUID
  pattern: **not present anywhere in the body.** None of Section 7's structured-data hopes apply,
  because this response never reaches Whatnot's own Next.js app — it is intercepted entirely by
  Cloudflare's edge before origin.
- The raw response was inspected once, confirmed to contain live, single-use Cloudflare
  challenge tokens (`cRay`, `cN`, `cH`, time-scoped `cUPMDTk`/`fa` tokens), and was **not retained** —
  it is not useful as a test fixture (it's not the real page, and its embedded tokens are
  session/time-specific, so keeping it would be pointless and mildly poor hygiene besides).

**Direct answers to the plan's original verification questions (Section "Parser expectations" in the
approval request):**

1. Can the raw response expose show URLs? **No** — the raw response isn't Whatnot's page at all.
2. Can the raw response expose show titles? **No**, same reason.
3. Can the raw response expose scheduled date/time? **No**, same reason.
4. Is there a usable `__NEXT_DATA__` JSON payload? **Not observable** — blocked before reaching the app.
5. Are show URLs stable and parseable as `/live/<showId>`? **Unknown from this fetch** — the existing
   `parseWhatnotShowUrl()` regex is unaffected either way, since it was never exercised against real
   content here; this remains a reasonable assumption based on the one supplied HTML sample, but is
   still unverified against a live response.
6. Can the show ID be extracted with the existing/updated `parseWhatnotShowUrl()`? Not exercised
   against live data in this slice — no live show HTML was obtained to test it against.
7. Is the returned date/time timezone clear? **Not answerable** — no date/time data was ever reached.
8. Is a Cloud Function fetch likely sufficient? **No — a plain, unauthenticated server-side `fetch()`
   is not sufficient on its own.** Cloudflare's bot-mitigation actively distinguishes and blocks this
   exact request shape (no browser JS engine, no cookie jar, no challenge-solving capability).
9. Is browser rendering required? **Very likely yes, in some form** — to get past a Cloudflare
   JS-challenge, the request needs to originate from (or be proxied through) something capable of
   executing JavaScript and completing the challenge, which a bare `fetch()` fundamentally cannot do.
   This does not necessarily mean full Puppeteer/Playwright is the *only* option (see below), but it
   does rule out the plan's original "maybe a plain fetch is enough" hope entirely.
10. Is a new dependency required? **Very likely yes**, for whatever approach is chosen next — none of
    the options below (headless browser, third-party bypass/rendering service, or an official
    integration) are achievable with the app's current dependency set.
11. What parser is safest for implementation slice 2? **None can be recommended yet** — there is no
    parseable content to design a parser against. The next slice must resolve the *access* problem
    before a parser design is meaningful.

**Why this matters for the rest of the plan:** Sections 8–21 of this plan (architecture, scheduled
sync, manual sync, parser/normalizer design, tests) were all written assuming *some* form of raw
content would eventually be reachable via `fetch()`. That assumption is now confirmed false for the
simplest case. The plan's Section 24 (Out of Scope) already listed headless-browser infrastructure as
something requiring its own separate approval "if Section 7's spike proves plain fetching is
insufficient" — that condition has now been met. **This plan cannot proceed to Slice 2 as originally
scoped; it requires a scoped revision addressing the access/bypass problem before parser/sync design
can be finalized.** See the revised recommendation in the Required Output below.

**Options going forward (not decided here — this is a menu for the next approval decision, not a
recommendation to implement any of them yet):**

- **(a) Headless browser in a Cloud Function** (Puppeteer/Playwright with a Chromium binary) — can
  execute Cloudflare's JS challenge like a real browser. Substantial new dependency, larger cold-start
  time/memory/cost footprint than anything currently in `functions/`, and Cloudflare's challenge
  behavior can still adapt to detect headless browsers specifically (this is an ongoing arms race, not
  a one-time fix) — meaning even this approach is not guaranteed durable.
- **(b) A managed scraping/rendering proxy service** (e.g. a third-party API that returns rendered HTML
  or handles Cloudflare bypass) — offloads the arms-race problem to a vendor, but introduces a new
  paid third-party dependency, a new secret (an API key for that service), and a new data-handling
  relationship to evaluate — squarely the kind of decision this plan's Section 23 checkpoints already
  anticipated needing separate approval for.
- **(c) Investigate whether Whatnot has any official/partner data access** (API, data export, seller
  dashboard integration) — would sidestep the entire scraping/bot-detection problem if one exists, but
  requires the user to investigate or reach out to Whatnot directly; this plan has no way to verify
  that from the repo or an unauthenticated fetch.
- **(d) Continue relying on manual "Add Show" only** — the existing, already-shipped fallback
  (`print-runs-foundation`) remains fully functional regardless of what happens with automated sync;
  if none of (a)/(b)/(c) are acceptable, the product may simply continue as-is with manual entry, and
  this whole automated-sync effort could be deprioritized or shelved.

None of (a)/(b)/(c) can be pursued without further explicit approval, per the original request's own
"Not approved" list (no browser automation dependency, no new npm dependencies, no secrets) — this
finding is being reported up for a decision, not acted on unilaterally.

### 7B. Pivot — staff-assisted Electron browser import (2026-07-05, approved and implemented)

**Decision: abandon server-side scraping entirely.** Section 7A proved a plain server-side `fetch()`
cannot reach Whatnot's content at all (Cloudflare managed-challenge 403). Rather than pursue any of
Section 7A's four options (headless browser, third-party proxy, official API investigation, manual-only),
the user chose a fifth path not previously considered: **have a human load the real page in a real
browser, then extract data from that already-rendered page.** This sidesteps the Cloudflare challenge
entirely — a real Electron `BrowserWindow` executing real JavaScript and completing any interactive
challenge is indistinguishable from a normal user's browser, whereas a bare `fetch()` was not.

**Approved workflow:**

1. Staff clicks "Import Whatnot shows" from the Show Queue settings modal.
2. The app opens the configured, validated Whatnot base URL in a dedicated Electron `BrowserWindow`
   (main-process-owned, no Node integration, context isolation on — same security posture as the
   existing `externalLinkWindow.ts` precedent).
3. Staff waits for the page to load normally (and completes any visible challenge/login if Whatnot ever
   presents one) — exactly like a normal user browsing the site.
4. Staff clicks "Import visible shows from open Whatnot page" (a button in the import window's own
   trusted toolbar, not part of the untrusted Whatnot page).
5. The main process runs `webContents.executeJavaScript()` against the **import window's own**
   `webContents` to read the rendered DOM and return a sanitized array of plain-object show candidates
   — never raw HTML, never cookies/session tokens, never anything beyond `{url, title, dateText}` triples.
6. The renderer receives the candidates, normalizes/parses them via new pure `shared/utils/` logic
   (reusing `parseWhatnotShowUrl()` for ID extraction), and classifies each against existing
   `upcomingShows` records (Create / Update / Unchanged / Needs review).
7. Staff reviews a preview list, can uncheck individual candidates, then confirms.
8. Only on confirm does the renderer call `upcomingShowService`-level upsert logic — nothing is written
   to Firestore just because the page loaded or was scanned.

**Why this satisfies every constraint Section 7A's options failed:**

- No new npm dependency — `executeJavaScript()` and `BrowserWindow` are both already-used Electron APIs.
- No headless browser, no third-party proxy, no secrets.
- No server-side component at all — replaces the entire Section 8-18 Cloud Function design.
- Because it's staff-triggered per use (not a background schedule), there is no "hourly sync while the
  app is closed" capability — traded away deliberately in exchange for reliability, per explicit user
  instruction ("This does not need to work while the app is closed... does not need hourly background
  sync"). A lightweight daily reminder banner replaces the scheduled-sync UX instead (Section 7B UI below).

**What is superseded:** Sections 8 (Cloud Function architecture), 9 (scheduled sync), 10 (manual sync
callable), 11 (auto-sync toggle backed by a scheduled trigger), 13's HTML/JSON-fetch-based parser (the
*shape* of the parser output is still reused; the *source* of the raw candidates is not a fetched HTML
string, but DOM-extracted candidates from an already-loaded page), 15's `missing_upstream` transition
(no longer meaningful — there is no periodic "scan" to notice an absence; a show simply stops appearing
in future imports, which is fine, since nothing deletes local shows), 17's Cloud-Function-vs-client-SDK
rules distinction (there is no Cloud Function actor for this feature — all writes are ordinary
staff-attributed client writes, exactly like the existing manual "Add Show" flow), 18 (Functions
deploy), and the recommended implementation slices in Section 26.

**What is reused as-is:** Section 12's `parseWhatnotShowBaseUrl()` validator (unchanged, still the
single source of truth for what base URL may ever be opened/fetched-from), Section 14's upsert contract
(match by `source + whatnotShowId`, preserve staff-owned planning fields — identical rules, just invoked
from a new renderer-side "confirm import" action instead of a Cloud Function), Section 16's additive
Firestore field philosophy (still additive-only, no migration), Section 19's general UI placement
(Show Queue settings area), Section 20's error-handling posture (partial success, human-readable errors,
no leaked internals), and Section 21's test philosophy (pure logic, static fixtures, no live network
access in tests — extraction now happens via a mocked `executeJavaScript()` boundary instead of a mocked
`fetch()`).

**New data model (replaces Section 16's Cloud-Function-oriented fields):**

`upcomingShows` additive fields:
- `sourceBaseUrlSnapshot?: string` — retained from Section 16, same meaning.
- `lastSeenInAssistedImportAt?: Timestamp` — set every time this show appears as a candidate in a
  staff-confirmed import, whether or not any field actually changed value.

`settings/showQueue` additive fields:
- `whatnotShowBaseUrl?: string` — retained from Section 12/16, same meaning and validation.
- `lastWhatnotAssistedImportAt?: Timestamp`
- `lastWhatnotAssistedImportStatus?: "succeeded" | "failed"`
- `lastWhatnotAssistedImportSummary?: { created: number; updated: number; unchanged: number; skipped: number }`
- `lastWhatnotAssistedImportError?: string`

No `autoSyncEnabled`, no `lastSyncAt`/`lastSyncStatus`/`lastSyncSummary`/`lastSyncError` (Section 16's
names) — renamed/scoped to "assisted import" throughout to avoid implying an unattended background
process exists. All fields are written by ordinary staff-attributed client writes (the confirming staff
member's UID), not a service-account sentinel — there is no Cloud Function actor in this design, so
Section 16's `updatedBy` sentinel problem does not arise.

**Firestore rules:** both collections' `hasOnly([...])` allowlists extended for the new fields (Section
17's rules-drift risk still applies), but there is no client-vs-service-account distinction to encode —
every write here is a normal `isStaff()` + `canManageUpcomingShows()` gated client write, identical in
shape to the existing manual "Add Show" path. **Not deployed as part of this phase** — see the Required
Output section for the exact deploy command needed later.

**Reminder/nudge (replaces the scheduled-sync UX):** Show Queue displays a lightweight banner if
`lastWhatnotAssistedImportAt` is missing or older than a calendar day, reading "Reminder: open Whatnot
and import visible shows for today," with an "Import Whatnot shows" button. No OS notifications, no
background timers — purely a render-time check against the loaded settings document.

**Extraction/parsing detail:** `webContents.executeJavaScript()` runs a small, self-contained script
string inside the **import window's own context** (not the main app's renderer, not a preload-injected
API visible to the Whatnot page) that queries `document.querySelectorAll('a[href*="/live/"]')`-style
anchors and reads each card's visible title text/`title` attribute and nearby date/time badge text,
returning a plain JSON-serializable array — Electron structured-clones this back to the main process,
which passes it through IPC to the renderer unchanged. This runs **once, on staff's explicit click**, not
on a timer and not automatically on page load. Date/time text is parsed by the same relative-date logic
originally designed for Section 13 (`"Today H:MM AM/PM"`, `"<Weekday> H:MM AM/PM"`,
`"<Weekday>, <Month> <Day>, H:MM AM/PM"`); anything that doesn't match a known shape is returned as a
"needs review" candidate with the raw text preserved for staff to see, never silently guessed.

## 8. Recommended sync architecture — SUPERSEDED, see Section 7B

**Fetch and parse must happen in a Cloud Function, not the Electron main process, and not the
renderer.** Reasoning:

- Consistent with existing precedent: every privileged/third-party-facing operation in this codebase
  (`createTeamUser`, `enqueueAiEnrichment`, etc.) is a Cloud Function using `firebase-admin` for the
  actual Firestore write, never a direct client write for anything requiring elevated trust.
- A scheduled hourly sync **cannot** run in Electron at all — Electron main process code only runs
  while a staff member's desktop app is open; Cloud Functions' `onSchedule` runs independently of any
  client being open, which is a hard requirement for "sync once every hour" to mean anything.
- Fetching an external third-party site from the Electron main process would require either exposing a
  new, broad "fetch any URL" IPC capability (a new SSRF-shaped attack surface the app doesn't have
  today — `externalLinkSafety.ts` only ever *opens a window*, never fetches and returns body content to
  the renderer) or duplicating parser logic in two runtimes (Electron main *and* a future Cloud
  Function, since the scheduled sync must be server-side regardless). Doing the fetch+parse once, in
  one Cloud Function, and having both the schedule and the manual button invoke that same function,
  avoids duplication and keeps the untrusted-content-parsing logic in exactly one, more auditable place.
- This does **not** conflict with "Electron main process" being the right place for genuinely
  local/OS-level capability (external link windows, filesystem access for import) — scraping a remote
  third-party site is a server-side concern, not an OS-level one.

**Recommended shape (subject to Section 7's outcome):**

```
                    ┌─────────────────────────────┐
  onSchedule        │                             │
  (hourly)  ───────►│   syncWhatnotShowsCore()    │◄─────── onCall
                    │   (shared internal function)│         (manual button)
                    │                             │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │ 1. Read settings/showQueue   │
                    │    .whatnotShowBaseUrl        │
                    │ 2. Validate URL (allowlist)   │
                    │ 3. fetch(baseUrl)              │
                    │ 4. Parse HTML/JSON → shows[]   │
                    │ 5. For each: upsert by         │
                    │    source+whatnotShowId        │
                    │    (reuse existing upsert      │
                    │    field-preservation rules)   │
                    │ 6. Mark shows not seen this run│
                    │    as missing_upstream if      │
                    │    previously scheduled/live   │
                    │ 7. Write sync metadata to       │
                    │    settings/showQueue           │
                    └──────────────────────────────┘
```

Both the scheduled trigger and the callable trigger call one shared internal TypeScript function
(`syncWhatnotShowsCore()`, not exported/callable itself) inside `functions/src/`, so the upsert logic,
field-preservation rules, and error handling exist in exactly one place — mirroring the existing
`functions/src/ai/aiEnrichmentPipeline.ts` pattern of a shared core function invoked by multiple
callables.

## 9. Scheduled sync design — SUPERSEDED, see Section 7B (no scheduled Function exists)

- New file `functions/src/syncWhatnotShows.ts` exporting `syncWhatnotShowsScheduled` via
  `firebase-functions/v2/scheduler`'s `onSchedule("every 1 hours", handler)` (the v2 equivalent of the
  legacy `functions.pubsub.schedule`; matches the `firebase-functions@^6` version already installed).
- No caller/auth context exists for scheduled functions (they run as the Functions service account) —
  it must use `firebase-admin`'s privileged Firestore access directly, exactly like the AI enrichment
  pipeline does today.
- On each run: read `settings/showQueue.whatnotShowBaseUrl` (falling back to the hardcoded default only
  if the setting has genuinely never been set — not silently overriding a staff-configured value),
  fetch/parse (Section 13), upsert each parsed show (Section 14), then write sync summary fields back
  to `settings/showQueue` (Section 20) so Studio can display "last sync: 12 created, 3 updated, 45
  unchanged, 2 errors" without a separate collection.
- Must be wrapped in try/catch such that a single malformed show card, or the whole page failing to
  parse, does not throw an unhandled error that fails the whole function silently from staff's
  perspective — partial success (some shows upserted, one logged parse failure) is preferable to
  all-or-nothing, but a full-page fetch/parse failure (e.g. Whatnot returns a 500, or the expected DOM
  structure is entirely absent) must be recorded as a visible sync error, not swallowed.

## 10. Manual sync design — SUPERSEDED, see Section 7B (no callable Function exists)

- New `onCall` function `syncWhatnotShowsManual` in the same file, using the same
  `assertStaffCaller`/`loadCallerProfile` pattern already used by every other callable
  (`functions/src/lib/caller.ts`) — **staff-only**, matching `permissionService.canManageUpcomingShows()`'s
  existing renderer-side gate for consistency (owner/admin/helper, per `isStaff()` in rules).
  Consider restricting to owner/admin only (mirroring `assertOwnerAdminCaller` in
  `enqueueAiEnrichment.ts`) if the user wants manual sync to be a more privileged action than viewing
  the Show Queue — **product decision needed** (Section 5 does not currently list this, adding it: does
  "helper" get the manual sync button, or only owner/admin?).
- Calls the same `syncWhatnotShowsCore()` as the scheduled function, returns a structured result
  (`{ created: number, updated: number, unchanged: number, errors: string[] }`) so Studio can show an
  immediate, specific summary rather than just "done."
- Studio's `Sync Whatnot shows` button (Section 19) calls this callable via the Firebase client SDK's
  `httpsCallable()`, exactly like existing "Add User" (`createTeamUser`) or AI enrichment triggers do —
  no new IPC/Electron plumbing needed, since calling a Firebase callable is already a renderer-side
  capability used elsewhere in the app.
- Manual sync must work identically whether auto-sync is on or off (explicit requirement) — the toggle
  in Section 11 only gates the *scheduled* trigger's early-exit behavior, never the callable's
  availability.

## 11. Auto-sync toggle design — SUPERSEDED, see Section 7B (replaced by a reminder banner, no toggle)

- New boolean field `autoSyncEnabled` (default `true`) on `settings/showQueue`.
- `syncWhatnotShowsScheduled` (the `onSchedule` function) still *runs* every hour regardless (Cloud
  Scheduler triggers are not cheaply toggleable per-tenant without redeploying the schedule itself, and
  this app has exactly one tenant/business), but reads `autoSyncEnabled` first and exits immediately,
  writing no sync-attempt metadata, if `false` — this is simpler and safer than trying to
  enable/disable the underlying Cloud Scheduler job dynamically, and matches the request's "auto-sync
  on/off toggle" as a *behavioral* switch rather than infrastructure-level.
- The manual callable ignores `autoSyncEnabled` entirely (Section 10).

## 12. Base URL validation design

New shared pure function, `shared/utils/whatnotShowBaseUrl.ts` (sibling to the existing
`whatnotShowUrl.ts`, not a modification of it — the single-show parser and the base-URL validator are
different concerns with different callers: one runs client-side in the "Add Show" modal today, the
other must run in both the renderer, when staff types a base URL into the settings field, **and** in
the Cloud Function, before it ever calls `fetch()` — so it must be a `shared/` pure function usable from
both runtimes, with zero Node-only or DOM-only APIs).

```ts
export interface ParsedWhatnotShowBaseUrl {
  normalizedUrl: string; // e.g. "https://www.whatnot.com/user/funkyfreshprints/shows"
  username: string;      // e.g. "funkyfreshprints"
}

export function parseWhatnotShowBaseUrl(rawInput: string): ParsedWhatnotShowBaseUrl | undefined
```

Validation rules (allowlist, fail-closed — return `undefined` on any mismatch, never throw):

- `protocol === "https:"` only (no `http:`, no other scheme) — stricter than `externalLinkSafety.ts`'s
  `http:`/`https:` pair, because this URL is *fetched server-side*, not merely opened in a window; there
  is no legitimate reason to fetch over plaintext HTTP here.
- `hostname === "www.whatnot.com"` exactly (not merely `*.whatnot.com` like the existing single-show
  parser — the show-list page is specifically under `www.`; tightening this is deliberate and should be
  called out during implementation review in case a mobile/alternate subdomain also serves this page).
- `pathname` matches exactly `^/user/[A-Za-z0-9_.-]+/shows/?$` — a single path segment for the
  username between `/user/` and `/shows`, character class matching Whatnot's own username rules
  observed in the codebase's existing `roasted-garlic`-style git usernames as a loose reference (exact
  Whatnot username character rules are `[NEEDS VERIFICATION]` against Whatnot's actual account-creation
  rules, but the allowlist should start conservative — letters, digits, underscore, period, hyphen —
  and only be loosened later if a real seller username fails validation).
- No query string, no fragment, no port — reject if `search`/`hash`/non-default `port` is present,
  since none of those should ever be legitimate for this specific page type and each is a potential
  SSRF/redirect vector.
- Explicitly reject (all already excluded by the allowlist above, but worth enumerating per the
  request): non-HTTPS schemes, non-`whatnot.com` domains, arbitrary paths, query-driven redirects,
  `javascript:`/`data:`/`file:` schemes, and local/private network addresses (the hostname allowlist
  above already makes this impossible — `www.whatnot.com` can never resolve to a private/local
  address the validator itself would accept, but note the Cloud Function's `fetch()` call should still
  not manually follow redirects to a different host — see the redirect-safety note below).
- **Redirect safety:** even with strict input validation, the fetched URL's *response* could be an
  HTTP redirect to a different host. The fetch implementation (Section 13) must either disable
  redirect-following entirely and treat any redirect response as a sync error, or (if redirects must be
  followed for legitimate reasons, e.g. Whatnot renaming a path) re-validate the final resolved URL
  against the same allowlist before parsing its body — this is a concrete SSRF-hardening detail that
  must not be skipped at implementation time.
- Used in exactly three places: (1) the Show Queue settings form's client-side validation (immediate
  feedback before save), (2) `showQueueSettingsService.updateSettings()`'s payload validation before
  writing to Firestore (defense in depth — never trust the client-side check alone, per
  `SECURITY.md`'s "Never Trust Client Input"), and (3) the Cloud Function, immediately before every
  `fetch()` call, re-validating the *stored* value at sync time (in case a value were ever written by
  some other path, or Firestore rules were ever weakened) rather than trusting that "it was valid when
  saved."

## 13. Parser/normalizer design — PARTIALLY SUPERSEDED, see Section 7B (output shape reused; input is DOM-extracted candidates, not fetched HTML)

Two new pure functions in `shared/utils/whatnotShowListParser.ts` (name and shape depend heavily on
Section 7's verification outcome — this is the most likely section to be revised after the spike):

```ts
export interface ParsedWhatnotShowListEntry {
  whatnotShowId: string;
  whatnotUrl: string;
  title: string;
  scheduledStartAt: Date; // resolved to an absolute instant, not the raw relative text
}

export function parseWhatnotShowListHtml(html: string, baseUrl: string, now: Date): ParsedWhatnotShowListEntry[]
```

- Takes the raw fetched HTML (or, if Section 7's spike finds a `__NEXT_DATA__` JSON payload, a sibling
  `parseWhatnotShowListJson()` instead/in addition) and a `now` parameter (injected, not
  `new Date()` internally) so relative-date resolution ("Today", "Tue") is deterministic and testable.
- Extracts every `/live/<uuid>` anchor, reusing `parseWhatnotShowUrl()`'s existing regex/validation for
  the ID rather than duplicating it — this function's job is finding the *candidate URLs* in the page
  and pairing each with its nearby title/date text, not re-parsing the URL shape.
- Title extraction: prefer the anchor/strong element's `title` attribute over its text content if both
  exist and match (per the sample, they're identical) — the `title` attribute is less likely to contain
  nested markup/emoji-rendering quirks than the visible text node.
- Date/time resolution: this is the highest-risk piece (see Section 7) and needs its own small
  sub-parser handling at minimum: `"Today H:MM AM/PM"`, `"<Weekday> H:MM AM/PM"` (next occurrence of
  that weekday from `now`), and `"<Weekday>, <Month> <Day>, H:MM AM/PM"` (explicit date, year inferred
  as current year unless that would be in the past, in which case next year — a common "no year shown
  for near-term dates" convention). **This entire sub-parser must ship with an extensive test suite
  covering timezone/day-boundary edge cases** (Section 21) before being trusted against production
  data, and its behavior/timezone assumption must be documented inline given how easy it would be to
  silently misparse a show time by an hour or a day.
- If a card's title, URL, or date cannot be confidently parsed, that entry is skipped (not included in
  the returned array) and reported as a parse warning to the caller — never partially upserted with
  guessed/null critical fields.
- Only depends on `shared/utils/whatnotShowUrl.ts` and standard JS (`URL`, `Date`, regex) — no DOM APIs
  (so it can run in a Cloud Function's Node runtime without `jsdom`), which likely means using a
  lightweight HTML-parsing approach (regex-based anchor/attribute extraction, or a minimal dependency
  like `node-html-parser`) rather than assuming a full DOM is available. **Choosing the exact
  HTML-parsing dependency (if any) is an implementation-time decision requiring approval**, since none
  currently exists in either `package.json` (Section 13 dependency note, Section 17).

## 14. Upsert behavior

Reuses `upcomingShowService`'s existing contract, extended for the sync's authority:

- Continue matching by `source: "whatnot"` + `whatnotShowId` only, via the existing
  `findMatchingUpcomingShow()` logic (or its server-side/Admin-SDK equivalent, since the Cloud Function
  cannot import renderer-only code — the matching *logic* should be extracted into `shared/utils/` if
  it isn't already reusable as pure logic, so both the client upsert and the new server-side sync share
  one implementation rather than two copies drifting apart over time).
- On create: set `source`, `whatnotShowId`, `whatnotUrl`, `title`, `scheduledStartAt`,
  `status: "scheduled"`, `syncStatus: "succeeded"`, `lastSyncedAt`, `lastSeenAt`, `notes: undefined`,
  `isArchived: false`, `productionStatus: "open"`, `maxTotalQuantity` (from
  `settings/showQueue.defaultMaxTotalQuantity`, exactly as the manual path already does),
  `maxQuantityOverridden: false`, `allocatedQuantity: 0`, plus the new
  `sourceBaseUrlSnapshot` field (Section 16) recording which base URL produced this record, and
  `createdBy`/`updatedBy` set to a sentinel value identifying the sync job (not a real staff user ID —
  see Section 16 for the exact field/value proposal, since Firestore rules currently require
  `updatedBy == request.auth.uid`, which does not hold for a Cloud-Function-as-service-account write —
  this rules implication is called out explicitly in Section 17).
- On match: update only `title`, `whatnotUrl`, `scheduledStartAt`, `sourceBaseUrlSnapshot`,
  `lastSyncedAt`, `lastSeenAt`, `syncStatus: "succeeded"`, clearing `syncError` — never touch
  `status`, `productionStatus`, `notes`, `maxTotalQuantity`, `maxQuantityOverridden`,
  `allocatedQuantity`, or `isArchived`. If `title`/`scheduledStartAt`/`whatnotUrl` are unchanged from
  the last sync, still update `lastSeenAt`/`lastSyncedAt` (cheap, and needed for Section 15's
  missing-show detection) but this counts as "unchanged" in the summary, not "updated," for the
  staff-facing count.
- Rescheduling (same show ID, new date/time) is therefore automatically handled correctly by the
  existing match-by-ID contract — this was already true for the manual path and needs no new logic,
  just confirmation via a dedicated test (Section 21).

## 15. Missing/canceled/rescheduled show behavior — SUPERSEDED, see Section 7B (no periodic scan; missing_upstream transition not implemented)

- **Rescheduled**: covered by Section 14 — same ID, new `scheduledStartAt`, no special handling needed.
- **Missing from current scrape** (was previously synced with `status` of `scheduled`/`rescheduled`/
  `live`, but its ID does not appear in this run's parsed list): set `status: "missing_upstream"`
  (reusing the existing `UpcomingShowStatus` enum value — no new enum value needed) and `syncStatus:
  "succeeded"` (the *sync itself* succeeded; it's the show's presence that changed) — **never**
  `deleteDoc`, **never** touch `showAllocations`, **never** touch `productionStatus`. This is
  Section 5's decision item 2 — flagged there as needing explicit human confirmation before
  implementation, since it directly affects what staff see for a show with active print-request
  allocations that Whatnot has removed.
- A show already marked `completed`, `canceled`, or `archived` (by staff, manually) that also
  disappears from the scrape should **not** be overwritten to `missing_upstream` — only shows still in
  an "expected to be upcoming" status get this treatment, to avoid clobbering a staff-made lifecycle
  decision with a sync-inferred one.
- If a show later **reappears** in a scrape after being marked `missing_upstream` (e.g. Whatnot's page
  was temporarily broken, or the show was briefly delisted and relisted), the normal match-by-ID upsert
  naturally restores it to `scheduled` — again, no special-case code needed beyond what Section 14
  already does, provided `missing_upstream` is treated as a normal update target rather than a
  terminal state.

## 16. Firestore data model changes

**`upcomingShows`** — additive fields only, all optional so existing documents remain valid without a
migration:

- `sourceBaseUrlSnapshot?: string` — the exact base URL used for the sync that last touched this
  record, for observability/debugging (e.g. "this show came from a base URL that's since been changed
  in settings").
- No other new fields are needed on `upcomingShows` itself — `syncStatus`, `syncError`, `lastSyncedAt`,
  `lastSeenAt` already exist and were provisioned for exactly this feature.
- **Open question flagged for implementation, not resolved here:** `createdBy`/`updatedBy` are
  currently `string` (a Firebase Auth UID) and Firestore rules require
  `request.resource.data.updatedBy == request.auth.uid` on writes. A Cloud Function running as the
  Functions service account via `firebase-admin` **bypasses Firestore rules entirely** (Admin SDK writes
  are not subject to security rules), so this is not a blocking technical problem, but it does mean
  `updatedBy` written by the sync job cannot be a real staff UID. Recommend a sentinel constant (e.g.
  `"system:whatnot-sync"`) and confirm during implementation review whether `updatedBy`'s TS type
  should be loosened to allow this, or whether a separate `lastSyncedBy: "system"`-style field is
  cleaner than overloading `updatedBy`.

**`settings/showQueue`** — additive fields:

- `whatnotShowBaseUrl?: string` — defaults to the hardcoded constant client-side when absent (never
  silently written as a default value into Firestore just because it was read once — only written when
  staff explicitly saves the settings form).
- `autoSyncEnabled?: boolean` — defaults to `true` when absent (same "don't silently persist a default"
  rule).
- `lastSyncAt?: Timestamp`, `lastSyncStatus?: "succeeded" | "failed"`, `lastSyncSummary?: { created: number; updated: number; unchanged: number; errorCount: number }`, `lastSyncError?: string` — written only by the sync job (scheduled or manual), never by the settings-editing UI, so these need their own Firestore rules carve-out (Section 17) distinct from the staff-editable fields.

No changes needed to `showAllocations` or `printRequests` — sync must never touch either.

## 17. Firestore rules/index considerations — SUPERSEDED, see Section 7B (no Cloud Function actor; all writes are ordinary staff client writes)

- `match /upcomingShows/{upcomingShowId}`'s `upcomingShowRequiredFieldsValid()` must be extended to
  allow the new optional `sourceBaseUrlSnapshot` field in its `hasOnly([...])` list (currently a strict
  allowlist of exactly 19 fields — adding a field requires updating this list or writes will be
  rejected outright, which is good default-deny behavior but must be remembered).
- Because Cloud Functions using `firebase-admin` bypass Firestore rules, the sync job's writes are not
  actually gated by these rules at all — but the rules must still correctly describe what the *client*
  is allowed to do (e.g. staff must never be able to directly set `syncStatus: "succeeded"` or forge
  `lastSyncedAt` from the renderer to fake a sync that never happened). Existing rules already require
  `updatedBy == request.auth.uid` for client writes, which naturally prevents the renderer from writing
  sync-attributed fields convincingly — this should be preserved, not loosened.
- `match /settings/showQueue` needs its `showQueueSettingsFieldsValid()` allowlist extended for
  `whatnotShowBaseUrl`, `autoSyncEnabled`, and the `lastSync*` fields — but the `lastSync*` fields
  should probably be **read-only from the client's perspective** (i.e. the rule should reject a client
  write that changes any `lastSync*` field, since only the trusted Cloud Function should ever set them,
  via Admin SDK, bypassing this rule entirely — but if a compromised/buggy client ever attempted to
  write here, the rule should still say no). Concretely: the update rule should assert
  `request.resource.data.lastSyncAt == resource.data.lastSyncAt` (etc. for each sync-owned field)
  whenever the write comes through the client SDK's normal permission path, distinguishing
  staff-editable fields (`whatnotShowBaseUrl`, `autoSyncEnabled`) from sync-owned fields.
- **No new Firestore index is anticipated.** Sync upserts existing `upcomingShows` documents by ID
  after a full unfiltered read (same pattern as `listUpcomingShows()` today) or, more efficiently, a
  single `where("source", "==", "whatnot")` query — either is index-free at current data volumes
  (tens of shows, not thousands) per the existing deliberate no-index decision in `DATA_MODEL.md`.
  If data volume grows enough that a full collection read becomes a real cost concern, that's a
  separate, future optimization, not something to pre-build here.
- **Firestore rules and index changes described in this plan must not be deployed as part of this
  planning phase or its eventual implementation phase without a separate, explicit deploy approval** —
  consistent with `print-runs-foundation`'s still-outstanding rules-deploy checkpoint, which this
  feature would add to, not replace.

## 18. Functions/deploy considerations — SUPERSEDED, see Section 7B (no Cloud Function, no Functions deploy)

- New file(s) under `functions/src/` (e.g. `syncWhatnotShows.ts`, plus the shared parser/validator
  pulled from `shared/utils/` — confirm the Functions build already includes `shared/` in its
  TypeScript path/compile step, since other functions already import from `../../shared/...` based on
  the existing codebase structure using a shared `shared/` directory at the repo root).
- New dependency likely required for HTML parsing (Section 13) — **must be proposed and approved at
  implementation time**, not assumed here. If the Section 7 spike finds a `__NEXT_DATA__` JSON payload,
  no new dependency may be needed at all (native `JSON.parse` suffices), which is the more attractive
  outcome and another reason to do that spike before committing to an HTML-parsing library.
- Deploy commands that would be needed **later**, once implementation is approved and reviewed
  (recorded here for completeness; **not to be run during this planning phase**):
  ```
  cd functions && npm run build
  firebase deploy --only functions:syncWhatnotShowsScheduled,functions:syncWhatnotShowsManual --project fresh-prints-dev
  firebase deploy --only firestore:rules --project fresh-prints-dev   # for the rules changes in Section 17
  ```
- A Cloud Scheduler job is auto-created/managed by Firebase when an `onSchedule` function is deployed —
  no separate manual Cloud Scheduler setup step, but this does mean the scheduled function **starts
  running in production the moment it's deployed**, regardless of the `autoSyncEnabled` Firestore flag
  existing — so deploy order matters: the `autoSyncEnabled` default-safe behavior (Section 11) must be
  implemented and tested *before* the scheduled function is ever deployed, so a first deploy doesn't
  immediately start scraping if the toggle isn't wired up correctly yet.
- Secrets: **none anticipated.** Whatnot's public show-list page requires no API key or auth per the
  request's own framing ("publicly accessible" is asked about in Section 5/Architecture Question 6 of
  the request, and the supplied sample shows no login-wall) — if the verification spike (Section 22)
  finds otherwise, that becomes a new, separate human checkpoint before any further implementation.

## 19. UI changes

All additions to `/show-queue`'s existing settings modal (opened via the gear icon, per
`UpcomingShowsPage.tsx`'s existing `openMaxQuantityModal`-style pattern) or a new adjacent section of
it:

- New text field: **"Whatnot show base URL"**, pre-filled with the current
  `settings/showQueue.whatnotShowBaseUrl` (or the hardcoded default if unset), validated on blur/save
  via `parseWhatnotShowBaseUrl()` (Section 12), with an inline error message
  (e.g. "Must be a `https://www.whatnot.com/user/<name>/shows` URL") if invalid — save button disabled
  until valid, matching the existing `pendingMaxQuantity` validation pattern already in this modal.
- New toggle: **"Automatically sync every hour"**, bound to `autoSyncEnabled`.
- New button: **"Sync Whatnot shows now"** (manual trigger), disabled while a sync is in flight
  (loading state on the callable), calling `syncWhatnotShowsManual` and showing its returned
  summary (`created`/`updated`/`unchanged`/`errors`) as a dismissible success/warning alert, reusing the
  existing `DismissibleSuccessAlert` component already used elsewhere on this page.
- New read-only display: **last sync time, status, and error** (if any), sourced from
  `settings/showQueue.lastSync*` fields, shown near the sync button — mirrors the request's "Studio
  shows last sync time, sync status, and sync error" requirement.
- **Manual "Add Show" (paste-a-URL) stays exactly as-is, unchanged, unremoved** — the new automated
  sync is additive, not a replacement path.
- No changes needed to the show list/detail views themselves beyond what capacity/status display
  (`getDerivedShowStatusDisplay`, etc.) already handles — a synced show is just an `upcomingShows`
  document like any other once created.

## 20. Error handling and observability

- Every sync attempt (scheduled or manual) writes `lastSyncAt`, `lastSyncStatus`, `lastSyncSummary`,
  and `lastSyncError` (cleared to `undefined`/absent on success) to `settings/showQueue` — this is the
  single source of truth Studio's UI reads, no separate sync-log collection needed for v1 (keeps the
  data model minimal; a dedicated `syncLogs` collection could be a future enhancement if per-run
  history beyond "the last run" becomes valuable).
- Per-show upsert failures (e.g. one malformed card) are collected into `lastSyncSummary.errorCount` /
  a capped list of error messages, without failing the entire sync run — one bad card must not prevent
  the other 9 shows from syncing correctly.
- A full-page fetch/parse failure (Whatnot unreachable, page structure totally unrecognized) sets
  `lastSyncStatus: "failed"` with a human-readable `lastSyncError` — never a raw stack trace or
  internal error string surfaced to staff (matching `SECURITY.md`'s general "don't leak internals"
  posture already applied elsewhere, e.g. `formatWriteErrorMessage()` patterns throughout the renderer).
- No secrets, tokens, or PII are ever present in sync error messages (there shouldn't be any secrets
  involved in this feature at all per Section 18, but this is worth stating as an explicit constraint
  for implementation review).

## 21. Test plan

All net-new pure logic must ship with `node:test` unit tests (this repo's established pattern — no new
test framework), specifically:

- `shared/utils/whatnotShowBaseUrl.ts`: valid default URL accepted; valid alternate username accepted;
  rejects `http:`; rejects non-`whatnot.com` host; rejects extra path segments; rejects query string;
  rejects fragment; rejects non-default port; rejects `javascript:`/`data:`/`file:` schemes; rejects
  malformed input without throwing.
- `shared/utils/whatnotShowListParser.ts` (or its final name post-spike): parses a known-good HTML
  fixture (a saved, real fetched sample — sanitized of any account-identifying info beyond what's
  already public) into the expected array of entries; skips a malformed card without throwing; resolves
  `"Today H:MM AM/PM"` correctly against an injected `now`; resolves `"<Weekday> H:MM AM/PM"` to the
  correct next occurrence across a week boundary (e.g. `now` is a Saturday, weekday text is "Sun" —
  must resolve to tomorrow, not six days from now); resolves `"<Weekday>, <Month> <Day>, H:MM AM/PM"`
  with an implied year, including the year-rollover case (e.g. `now` is December, parsed date is
  January — must resolve to next year); handles a title containing emoji/special characters without
  corruption (regression test directly informed by the mojibake seen in the supplied sample, to catch
  an encoding bug early rather than in production).
- Upsert/matching logic (wherever it ends up living once shared between client and Functions code):
  reuses or extends existing `upcomingShowUpsert.test.ts`-style coverage — new case: an existing show's
  `productionStatus`/`notes`/`maxTotalQuantity`/`allocatedQuantity` are unchanged after a sync-triggered
  update that changes only `title`/`scheduledStartAt`.
- Missing-show → `missing_upstream` transition: a show present in a prior sync, absent from the current
  parse, transitions correctly; a show already `completed`/`canceled`/`archived` is *not* transitioned;
  a `missing_upstream` show reappearing is restored to `scheduled` on the next successful match.
- No test requires network access or a live Whatnot fetch — all HTML/JSON fixtures are static,
  checked-in sample files, consistent with this repo's existing test philosophy (pure functions, no
  I/O in unit tests).
- Functions-side tests (if any beyond the shared pure-logic tests above) should follow the existing
  `functions/src/ai/testAiEnrichmentTagRerank.test.ts`-style pattern already established in this repo,
  if the team decides Functions-level integration tests are warranted — likely lower priority than the
  pure-logic coverage above.

## 22. Manual QA plan

To be executed only after implementation is reviewed/approved and deployed to the **dev** project
(`fresh-prints-dev`), never production, per this repo's standing practice:

- Set the base URL in Show Queue settings to the real default; save; confirm validation accepts it.
- Attempt to save an invalid base URL (wrong host, `http:`, extra path) and confirm the UI rejects it
  with a clear message and does not write to Firestore.
- Click "Sync Whatnot shows now"; confirm new shows appear in the Show Queue list with correct title,
  date/time, and Whatnot URL; confirm the summary count matches what was actually created.
- Run manual sync a second time with no changes upstream; confirm the summary shows all "unchanged,"
  no duplicate documents were created, and no existing show's `productionStatus`/`notes`/capacity
  fields changed.
- Manually edit a synced show's capacity/notes/production status in Studio, then re-sync; confirm those
  staff-set fields survive the sync untouched.
- Toggle auto-sync off; confirm the scheduled function's next run (or a forced test invocation, if the
  team has a safe way to trigger it in dev) records no sync attempt while off, and manual sync still
  works while auto-sync is off.
- If feasible in dev, temporarily change the configured base URL to a still-valid-but-different
  Whatnot user's shows URL (if a second test seller account is available) and confirm sync switches to
  that source without deleting previously-synced shows from the original source.
- Confirm no `showAllocations` documents are created, modified, or deleted by any sync run.
- Confirm no `designs.status` field is ever touched by any sync run (grep the diff/audit log if
  possible, or code-review confirmation if a live audit trail isn't available).
- Confirm the dev Firestore rules deploy for this feature's new fields was actually applied before
  testing client-side settings writes (this feature adds to, and depends on, resolving the
  already-outstanding `print-runs-foundation` rules-deploy checkpoint).

## 23. Human checkpoints

Required before/during implementation, each separate from this plan's own review approval:

1. **This plan's review approval** — implementation of any code remains blocked until a human
   approves this document.
2. **The Section 7 verification spike** — a human must fetch the real Whatnot base URL once (by hand,
   outside any automation) and confirm/correct this plan's assumptions about raw-HTML vs.
   client-rendered content and the presence/absence of a `__NEXT_DATA__`-style JSON payload, before
   the parser (Section 13) is implemented against a guess.
3. **Product decisions in Section 5** — at minimum items 2 (missing-show behavior) and 3 (page
   structure, tied to checkpoint 2) must be resolved before implementation; items 1, 4, 5, 6 should
   ideally be resolved too but are lower-risk to defer slightly if needed.
4. **Any new npm dependency** (e.g. an HTML parser) — proposed and approved at implementation time,
   per this repo's standing "no new dependencies without approval" rule.
5. **Firestore rules/index deploy** — planned in Section 17, never deployed automatically; requires the
   same explicit `firebase deploy --only firestore:rules --project fresh-prints-dev` approval pattern
   already used throughout `print-runs-foundation`, and should ideally be bundled with (or scheduled
   right after) that phase's own still-outstanding rules-deploy checkpoint.
6. **Cloud Functions deploy** — `firebase deploy --only functions:...` requires explicit approval,
   separate from the rules deploy, and should only happen after dev-environment manual QA (Section 22)
   passes on the *code*, reviewed and merged, before it can even be manually QA'd (chicken-and-egg
   resolved by: implement → dev-deploy functions with `autoSyncEnabled` effectively forced off or the
   schedule not yet attached → manual-QA the callable and upsert logic thoroughly → only then approve
   attaching/enabling the scheduled trigger in dev → only then consider production).
7. **Production deploy** — entirely separate, later checkpoint; out of scope for this plan and likely
   for the first implementation phase too.
8. **Legal/ToS posture on scraping Whatnot** (Section 5, item 5) — a human product/legal judgment call
   this plan explicitly does not make.

## 24. Out of scope (for this plan and its eventual first implementation slice, unless separately approved)

- Live Whatnot fetch/scrape execution of any kind during this planning phase.
- Any Cloud Functions deploy, scheduled or callable, during this planning phase.
- Any Firebase/Firestore deploy of any kind during this planning phase.
- Any new npm/pip/etc. dependency installation during this planning phase.
- Secrets of any kind (none are currently expected to be needed at all, per Section 18).
- Migration or backfill of any existing `upcomingShows` documents.
- Portal, Custom Requests, ecommerce, payment, shipping, gang-sheet generation, Pensacola export.
- Any write to `designs.status` or the `designs` collection.
- Headless-browser infrastructure (Puppeteer/Playwright) — only to be considered if Section 7's spike
  proves plain HTML/JSON fetching is insufficient, and even then as its own separately-approved
  decision given the meaningfully larger footprint (browser binary, memory/cold-start cost, security
  surface) versus a plain `fetch()`.
- Multi-source-URL support (Section 5, item 1) unless confirmed needed.

## 25. Risks

- **Whatnot markup/behavior is unverified and third-party-controlled** — the single largest risk. Any
  scraping approach is inherently fragile against unannounced page redesigns; this plan mitigates via
  the Section 22 spike, defensive per-card error handling (Section 9/20), and by strongly preferring a
  `__NEXT_DATA__`-style structured payload over CSS-class scraping if one is found.
- **Relative date/time parsing is ambiguous without a stated timezone** — likely the single most
  probable source of a subtle, hard-to-notice bug (an off-by-one-hour or off-by-one-day show time) if
  not tested thoroughly (Section 21) and if the seller's timezone assumption is wrong.
- **Legal/ToS risk of scraping a third-party site** — not a risk this plan can quantify or accept on
  the user's behalf (Section 5, item 5; Section 23, checkpoint 8).
- **Cost/rate-limit risk to Whatnot's servers** — an hourly scheduled fetch plus uncapped manual syncs
  could be seen as abusive traffic; mitigated by a manual-sync cooldown (Section 5, item 6) and a
  conservative, fixed 1-hour schedule rather than a shorter one.
- **Rules/field-allowlist drift** — every new field on `upcomingShows`/`settings/showQueue` must be
  added to the corresponding Firestore rules `hasOnly()` allowlist or writes will be silently rejected;
  this is a known sharp edge in this codebase's existing rules pattern and is easy to forget.
- **Deploy-ordering risk** — Section 18 flags that deploying the scheduled function starts it running
  immediately in whatever project it's deployed to; getting the `autoSyncEnabled` default-safe and the
  deploy sequencing (Section 23, checkpoint 6) wrong could cause an unintended live scrape sooner than
  intended.

## 26. Recommended implementation slices — SUPERSEDED, see Section 7B and the Required Output section below for what was actually implemented

If/when this plan is approved, recommend splitting implementation into reviewable slices rather than
one large PR:

1. **Slice A — spike + shared pure logic only.** Section 7's verification spike; then
   `whatnotShowBaseUrl.ts` and `whatnotShowListParser.ts` (or final names) with full unit test coverage
   against static fixtures. No Cloud Function, no deploy, no UI yet — pure, reviewable, testable logic.
2. **Slice B — Cloud Functions + Firestore rules (dev only).** `syncWhatnotShowsManual` callable and
   `syncWhatnotShowsScheduled` scheduled function, `settings/showQueue` field additions, rules updates
   — deployed to dev only, manually invoked/tested by a human before the scheduled trigger is trusted
   to run unattended.
3. **Slice C — Studio UI.** Settings form fields, manual sync button, last-sync display — wired to the
   already-tested Slice B callable.
4. **Slice D — production rollout.** Separate, later approval; dev soak time recommended between
   Slice B/C landing and any production deploy.

---

## Required output

1. **Plan path created:** `docs/workflow/plans/2026-07-05-whatnot-show-sync-plan.md` (this file).
2. **Recommended architecture:** Cloud Functions only (one shared internal `syncWhatnotShowsCore()`
   invoked by both an `onSchedule` hourly trigger and an `onCall` manual-sync callable); Electron main
   process and the renderer are explicitly *not* recommended for the fetch/parse/write logic — see
   Section 8.
3. **Recommended setting name:** `settings/showQueue.whatnotShowBaseUrl` (string), alongside new
   `autoSyncEnabled` (boolean) and `lastSync*` observability fields on the same document — see
   Sections 11 and 16.
4. **Recommended base URL validation rules:** `https:` only, `hostname === "www.whatnot.com"` exactly,
   `pathname` matching `^/user/[A-Za-z0-9_.-]+/shows/?$`, no query string/fragment/non-default port,
   applied client-side, in the settings-write path, and again immediately before every fetch inside the
   Cloud Function — see Section 12.
5. **Scheduled Cloud Function recommended:** Yes — `onSchedule("every 1 hours", ...)`, reading
   `autoSyncEnabled` and exiting early if disabled — see Sections 9 and 11.
6. **Callable/manual sync Function recommended:** Yes — staff-gated `onCall`, ignoring the
   `autoSyncEnabled` toggle, returning a structured created/updated/unchanged/error summary — see
   Section 10.
7. **Whatnot page parsing requires further verification:** Yes, explicitly and prominently flagged —
   Section 7 is marked `[NEEDS VERIFICATION]` and Section 23 lists the verification spike as a required
   human checkpoint before the parser is implemented against anything more than a guess.
8. **Proposed Firestore field changes:** `upcomingShows.sourceBaseUrlSnapshot?: string` (additive);
   `settings/showQueue.whatnotShowBaseUrl?: string`, `.autoSyncEnabled?: boolean`, `.lastSyncAt?`,
   `.lastSyncStatus?`, `.lastSyncSummary?`, `.lastSyncError?` (all additive) — see Section 16. No
   changes to `showAllocations` or `printRequests`.
9. **Proposed rules/index changes:** Extend both collections' `hasOnly()` field allowlists for the new
   fields; add an update-rule assertion that `lastSync*` fields are client-immutable (sync-owned, only
   ever set via Admin SDK); no new Firestore index anticipated — see Section 17. **Not to be deployed**
   as part of this plan or without separate approval.
10. **Product decisions still needed (original Cloud Function design):** superseded by the Section 7B
    pivot — multi-source-URL support and sync-interval configurability no longer apply (there is no
    schedule); missing-show behavior no longer applies (no periodic scan); ToS/legal posture on scraping
    is moot (a human, not an automated scraper, loads the page); manual-import rate limiting and
    role restriction remain open, low-risk product questions but are not blocking.
11. **Human checkpoints satisfied for the Section 7B slice:** plan pivot approved by explicit user
    instruction 2026-07-05; no new npm dependency was introduced; Firestore rules changes are made
    locally only, not deployed (see the implementation report below for the exact command needed);
    no Cloud Functions deploy, no production deploy — none were part of this slice's scope.
12. **Confirmation of what was implemented:** see the dedicated implementation report,
    `docs/workflow/reviews/2026-07-05-whatnot-show-sync-slice2-test-report.md`, for the full 17-point
    required output (files changed, IPC/BrowserWindow behavior, UI behavior, upsert behavior, tests,
    verification commands, Firestore rules changes and deploy command, manual QA status).
13. **Confirmation of what was NOT done:** no scheduled Cloud Function, no callable Cloud Function, no
    server-side fetch scraper, no third-party proxy, no headless browser, no new npm dependency, no
    secrets, no Firebase/Firestore deploy, no migration/backfill, no Portal/Custom Request/ecommerce/
    shipping/gang-sheet-export/image-mutation work, no `designs.status` write.
