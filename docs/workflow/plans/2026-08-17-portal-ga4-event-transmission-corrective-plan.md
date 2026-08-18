# Plan: Portal GA4 event transmission corrective

| Field | Value |
|-------|-------|
| Date | 2026-08-17 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-08-17-portal-ga4-event-transmission-corrective-review.md |
| Goal id | `portal-ga4-event-transmission-corrective` |
| Parent | `portal-ga4-production-enablement` (CLOSED — historical `PROD GA4 QA: PASS`; superseded for **collection** by this corrective) |
| Architecture parent | `portal-google-analytics` (2026-07-26/27 inert implementation) |
| Production source | `124c6fa4ad3c86defa8fd61c578b3efeaf6609bb` |
| Live App Hosting | `fresh-prints-portal-build-2026-08-17-002` @ 100% |
| Comparison refs | `origin/production` @ `124c6fa`; `origin/development` @ `3d44cea` (do not FF / do not merge prod into dev as part of this goal) |

---

## Goal

Diagnose and correct the production Portal GA4 condition where `gtag.js` is installed and detected on `https://myprintrequest.com`, but **no GA4 collection requests** (`g/collect` / `google-analytics.com/g/collect`) are transmitted despite real user traffic and zero Realtime activity.

This is a **narrow corrective follow-up** to `portal-ga4-production-enablement`. It must **not** rewrite historical records as though the earlier `PROD GA4 QA: PASS` never occurred. Instead, record a **superseding corrective finding** that tag presence alone is insufficient and that transport must be proven.

---

## Background

### Prior goal (closed, superseded for practical QA)

`portal-ga4-production-enablement` enabled the already-built analytics architecture on production via Secret Manager + `apphosting.yaml` (`NEXT_PUBLIC_GA_MEASUREMENT_ID`, BUILD + RUNTIME). PR **#80** merged at `124c6fa`. App Hosting **`build-2026-08-17-002`** @ 100%. Owner **`PROD GA4 QA: PASS`** (2026-08-17).

That QA validated tag presence / DebugView at the time. **New production evidence supersedes the practical QA conclusion** for collection:

| Observation | Source |
|-------------|--------|
| Google tag checker detects installed Google tag | Owner |
| Other tag-checking tools detect GA4 | Owner |
| Multiple real users/devices on production simultaneously | Owner |
| GA4 Realtime remained at zero | Owner |
| Chrome DevTools Network: ~269 requests over ~1.5 min | Owner |
| Network filter `collect` → **ZERO** requests | Owner |
| Initial load, client navigation, normal interactions — still zero | Owner inference |

**Conclusion:** script is present; **no evidence events are actually transmitted**.

### Architecture (unchanged scope)

Signed-off single-controller design under `apps/portal/features/analytics/**`:

- `PortalAnalyticsScript` — thin loader + stub only
- `PortalAnalyticsBoundary` — `scriptReady` handshake
- `usePortalAnalyticsController` — sole `config` / `page_view` owner
- `portalAnalyticsService` — `initializeStream` / `updatePageContext` / `trackPageView`
- `send_page_view: false` + one manual sanitized `page_view`
- Production-only host gate (`myprintrequest.com` / `www.`)
- Enhanced Measurement OFF (GA4 console — do not change in this goal)

### Repository safety

Separate dirty-checkout cleanup is **parked**. This goal must not reset, stash, clean, or overwrite that work. Analytics source on the dirty checkout **matches** `origin/production` @ `124c6fa` (verified by blob hash).

---

## Plan discovery (read-only — this session)

### A. Reproduced / validated production failure

#### A1. Owner-reported evidence (accepted)

Tag detection passes; **`collect` filter shows zero** during load, navigation, and interaction; Realtime zero with concurrent users.

#### A2. Independent read-only reproduction (this session)

**Method:** headless Chrome + CDP against live `https://myprintrequest.com/` (no manual `gtag()` calls; observe only).

| Check | Result | Evidence |
|-------|--------|----------|
| Production HTML references gtag loader | **YES** | `<link rel="preload" href="https://www.googletagmanager.com/gtag/js?id=<PRODUCTION_MEASUREMENT_ID>">` in fetched HTML |
| Measurement ID HTTP validity | **200 OK** | `curl -I https://www.googletagmanager.com/gtag/js?id=<PRODUCTION_MEASUREMENT_ID>` |
| `window.gtag` exists after hydration | **YES** | CDP: `"gtagType":"function"` |
| `window.dataLayer` exists | **YES** | CDP: `"dataLayerLength":4` |
| GA config enabled on production host | **YES** | dataLayer entry `["config","<PRODUCTION_MEASUREMENT_ID>",{send_page_view:false,...}]` |
| Manual `page_view` queued | **YES** | dataLayer entry `["event","page_view",{page_location,page_path,page_title}]` |
| Standard `js` bootstrap in dataLayer | **NO** | No `["js", Date]` entry; stub text has no `gtag('js'` |
| Portal loader/stub mounted | **YES** | `hasPortalLoader:true`, `hasPortalStub:true` |
| **`g/collect` / analytics.google collect requests (~10s after load)** | **ZERO** | `COLLECT_REQS: []` |
| CSP blocking analytics | **NO CSP header** observed on HTML response |
| Response headers suggest healthy Portal | **200 OK**, Next.js App Hosting |

**Reproduction verdict:** **Confirmed** — production queues `config` + manual `page_view` but emits **zero** collection requests in controlled headless observation, matching owner DevTools evidence.

#### A3. Alternate blockers considered

| Hypothesis | Status | Notes |
|------------|--------|-------|
| Browser extension / ad blocker (owner devices) | Unlikely sole cause | Multiple real users/devices; headless repro also zero collect |
| CSP | **Ruled out** (this session) | No `Content-Security-Policy` response header on `/` |
| Consent mode product gate | **Low probability** | No consent API in Portal code; config processed (gtm.uniqueEventId added). [NEEDS REPO CHECK] GA4 property consent defaults in Admin |
| Wrong / 404 Measurement ID | **Ruled out** | `gtag/js?id=<PRODUCTION_MEASUREMENT_ID>` → HTTP 200; ID embedded in production HTML |
| Host gate disabling analytics | **Ruled out** | dataLayer shows config+page_view → controller ran with `enabled:true` on production host |
| JavaScript exception before analytics | **Not observed** | gtag/dataLayer present; gtm.dom/gtm.load fired |
| Duplicate/replaced gtag stub | **Unlikely** | Single stub pattern; library loaded (gtm.* events) |
| `send_page_view:false` suppressing all hits | **Ruled out as sole cause** | Manual `page_view` **event** is present; Google docs: `event` commands should still send hits |
| Next.js Script lifecycle race | **Secondary factor** | `scriptReady` fires on **stub** `onReady`, not external loader `onLoad`; commands may queue before library install — but library **did** load (gtm.load). Not sufficient alone to explain zero collect |
| **Missing standard `gtag('js', new Date())` bootstrap** | **Primary — confirmed** | See Section E |

---

### B. Live dataLayer sequence (read-only)

Observed on production after hydration (headless Chrome CDP dump, 2026-08-17):

| Order | dataLayer entry | Contains |
|-------|-----------------|----------|
| 1 | `["config","<PRODUCTION_MEASUREMENT_ID>",{...}]` | `send_page_view:false`, ads flags false, sanitized `page_location`/`page_title` |
| 2 | `["event","page_view",{...}]` | sanitized path `/`, title `Discover` |
| 3 | `{event:"gtm.dom",...}` | from loaded gtag library |
| 4 | `{event:"gtm.load",...}` | from loaded gtag library |

**Missing:** any `["js", <Date>]` entry.

**Stub script content (production source):**

```javascript
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.gtag = gtag;
```

No `gtag('js', new Date())`.

---

### C. Script lifecycle trace (production source @ `124c6fa`)

```
RootLayout (Server)
  resolvePortalAnalyticsConfig(process.env)  → enabled on prod host + Measurement ID
  └─ Providers (Client)
       └─ PortalAnalyticsBoundary
            ├─ PortalAnalyticsScript
            │    ├─ next/script id=portal-ga4-loader  src=gtag/js?id=<ID>  strategy=afterInteractive
            │    └─ next/script id=portal-ga4-stub    inline stub ONLY     onReady → setScriptReady(true)
            └─ Suspense
                 └─ usePortalAnalyticsController(config, scriptReady)
                      when scriptReady && !initialized:
                        buildSanitizedAnalyticsPageDescriptor(...)
                        initializeStream() → gtag('config', id, { send_page_view:false, ... })
                        trackPageView()    → gtag('event', 'page_view', ...)
```

#### Lifecycle answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Which script's `onReady` sets `scriptReady`? | **`portal-ga4-stub` inline Script's `onReady`** — not the external loader |
| 2 | Can stub become ready before external library finishes? | **Yes.** Stub executes locally; external `gtag.js` loads asynchronously afterward |
| 3 | Does controller queue config/event before library processes bootstrap? | **Yes.** Controller runs immediately after stub `onReady`; production dataLayer shows **config/event before gtm.load** |
| 4 | Is pre-load queueing supported? | **Only with correct bootstrap order.** Google standard snippet queues `js` **first**, then `config` |
| 5 | Is `gtag('js', new Date())` called anywhere in repo? | **No.** `git grep "gtag('js'" origin/production` → empty |
| 6 | Does external gtag library require/expect `js` bootstrap? | **Yes per Google Tag Platform docs** — official snippet always includes `gtag('js', new Date())` before `gtag('config', ...)` ([Set up the Google tag with gtag.js](https://developers.google.com/tag-platform/gtagjs)) |
| 7 | Can current unit tests pass while zero beacons emit? | **Yes.** All service tests mock `window.gtag` as a push logger; no network layer |
| 8 | Do tests codify incomplete bootstrap? | **Yes.** `PortalAnalyticsScript.test.ts` asserts stub has **no** config/set **and** "only defines dataLayer and the gtag stub function" — implicitly treating missing `js` as correct |

---

### D. Test contract audit (81 analytics tests)

Command (this session): `npx tsx --test` on all six analytics test files → **81/81 pass**.

| Area | Covered today? | Transport-capable? |
|------|----------------|--------------------|
| Sanitizer / PII / route templates | **Yes** (sanitizer tests) | N/A |
| Host gate production-only | **Yes** | N/A |
| Config resolver | **Yes** | N/A |
| `initializeStream` fields / `send_page_view:false` | **Yes** (mock gtag) | **No** — proves push only |
| `updatePageContext` `update:true` | **Yes** (mock) | No |
| `trackPageView` manual event shape | **Yes** (mock) | No |
| Controller init once / scriptReady gate | **Yes** (mock service) | No |
| Stub has no `config`/`set` | **Yes** | **Negative** — does not require `gtag('js',...)` |
| Bootstrap sequence `js → config → event` | **No** | No |
| External script + stub + controller integration | **No** | No |
| Browser `g/collect` emission | **No** | **Gap that allowed ship** |
| Duplicate page_view / EM interaction | Partially (controller identity tests) | No |

**Critical gap:** `PortalAnalyticsScript.test.ts` line 17–20 — *"only defines dataLayer and the gtag stub function"* — **unintentionally codified an incomplete gtag bootstrap** relative to Google's required initialization sequence.

**2026-07-26 architecture plan** explicitly chose stub-only with **no** `gtag('config')` in the loader and unified sequencing in the controller — but did **not** document omitting `gtag('js', new Date())` as an intentional deviation from Google's standard snippet. The omission appears to be an implementation gap, not a reviewed privacy decision.

---

### E. Root cause verdict

## **Primary hypothesis — confirmed non-conformant defect** (Formal Review 2026-08-17: causality strongly supported; **not** fully proven until DEV transport QA shows `g/collect`)

**Production GA4 hits are likely not transmitted because the implementation never enqueues the standard gtag bootstrap command `gtag('js', new Date())` before the controller's `gtag('config', ...)` and `gtag('event', 'page_view', ...)` calls.**

**Direct evidence:**

1. **Live production dataLayer** (this session): contains `config` + `page_view`, **no `js`**, **zero `g/collect` requests**.
2. **Source code** (`PortalAnalyticsScript.tsx` / `PORTAL_GA4_STUB_SCRIPT`): stub only; `git grep` shows **zero** `gtag('js'` anywhere on `origin/production`.
3. **Google Tag Platform standard snippet** requires `gtag('js', new Date())` before `gtag('config', TAG_ID)` for gtag.js installations.
4. **Owner production evidence** aligns: tag checkers see script/HTML; Network `collect` filter empty; Realtime zero under load.
5. **Unit tests pass** because they mock `window.gtag` and never assert transport or bootstrap sequence.

**Important nuance (Formal Review):** Production shows `config` was **processed** by the loaded library (`gtm.uniqueEventId` on the config entry) while **zero** `g/collect` requests were observed. That pattern indicates **processing without transport**, not a failure to queue commands. Missing `js` remains the primary hypothesis because Google's installation snippet requires it and `gtag.js` sets internal readiness (`tD.H`) only via the `js` command.

**Secondary contributing factor (implement belt-and-suspenders; not sole cause):**

- `scriptReady` is tied to **stub** `onReady`, not external loader completion. Production shows library eventually loads (`gtm.load`) but hits still absent — consistent with missing `js` being the primary blocking defect rather than race alone. **Formal Review:** stub `onReady` proves stub execution only, not external loader completion. If bootstrap-only fix fails DEV transport QA, add loader-aware `scriptReady` (Boundary/Script only).

**Formal Review gate:** DEV/browser transport QA with **`g/collect` proof** is **mandatory** before production PR.

**Not root cause (ruled out or out of scope):**

- Measurement ID misconfiguration / 404 loader
- Host gate blocking production
- CSP
- Missing Measurement ID in build (config reached dataLayer with real ID)

---

## Scope

### In scope

- GA4 bootstrap / script lifecycle correction
- Event transmission / manual `page_view` pipeline
- Analytics unit + new transport-aware tests
- Sanitizer preservation (no behavior change)
- Production host gating preservation
- Corrective workflow docs (superseding finding; do not erase historical PASS)
- Future production QA requiring **`g/collect` proof**

### Out of scope

- Google Tag Manager
- Enhanced Measurement console changes
- Ads / remarketing / user IDs / ecommerce
- Phase 10 operational analytics
- Studio analytics
- Functions / Firestore Rules / Storage / indexes / Algolia / Auth / DNS / Search Console
- Portal feature work unrelated to analytics bootstrap
- TD-030 / tag-alias / Phase 9 / repository dirty-checkout cleanup
- Changing Measurement ID (unless Implement discovers ID is wrong — not indicated)
- Changing privacy/consent product decisions
- GA4 console / Secret Manager / App Hosting during **Plan**

---

## Proposed correction (Implement only after Review approval)

**Smallest architecture-preserving fix:**

### 1. Add standard bootstrap to the thin loader (not the controller)

Extend `PORTAL_GA4_STUB_SCRIPT` to enqueue **exactly once per document**:

```javascript
gtag('js', new Date());
```

**Still forbidden in `PortalAnalyticsScript`:**

- `gtag('config', ...)`
- `gtag('event', ...)`
- descriptor computation / route logic

The controller remains the **sole owner** of `config` and manual `page_view`.

**Expected dataLayer order after fix:**

1. `js` (stub execution — before `onReady` fires)
2. `config` (controller, after `scriptReady`)
3. `event page_view` (controller)
4. library processes queue → **`g/collect` requests**

### 2. Optional hardening (Formal Review to confirm)

Move `scriptReady` to fire only when **both**:

- stub executed (`js` enqueued), **and**
- external loader `onLoad` / `onReady` confirms `gtag.js` fetched

Trade-off: delays first hit slightly; reduces race risk. **Recommend implementing if bootstrap-only fix does not produce `g/collect` in DEV transport QA.**

### 3. Do **not**

- Paste Google's full default snippet into `layout.tsx` (would risk second controller / auto pageviews)
- Add GTM
- Move `gtag('config', ...)` into `PortalAnalyticsScript`
- Enable Enhanced Measurement
- Change sanitizer rules

---

## Expected files to touch (Implement)

| File | Change |
|------|--------|
| `apps/portal/features/analytics/components/PortalAnalyticsScript.tsx` | Add `gtag('js', new Date())` to bootstrap constant |
| `apps/portal/features/analytics/components/PortalAnalyticsScript.test.ts` | Require `js` bootstrap; keep no-config guarantee |
| `apps/portal/features/analytics/components/PortalAnalyticsBoundary.tsx` | **Optional:** loader-aware `scriptReady` |
| `apps/portal/features/analytics/hooks/usePortalAnalyticsController.test.ts` | Sequence tests if `scriptReady` semantics change |
| `docs/workflow/reviews/2026-08-17-portal-ga4-event-transmission-corrective-*.md` | Test report, signoff, superseding finding |
| `docs/project/ROADMAP.md` | Corrective banner (additive; preserve GA4 closeout history) |
| `references/project-chatgpt-handoff/*` | **If on branch:** superseding corrective note |
| `.cursor/workflow/state.md` | Workflow progression |

**No expected changes:** `portalAnalyticsService.ts` (config/page_view logic unchanged), `apphosting.yaml`, Secret Manager, sanitizer.

---

## Acceptance criteria

### Implement / Test (pre-production)

1. Bootstrap sequence tests fail on current `124c6fa` code and pass after fix.
2. Exactly one `gtag('js', ...)` per document load.
3. `PortalAnalyticsScript` still contains zero `config`/`event` calls.
4. Controller still sole `config`/`page_view` owner; `send_page_view:false` preserved.
5. All 81 existing analytics tests updated/passing; new sequence + transport tests added.
6. Sanitized paths unchanged (`/requests/:id`, `/share/design/:id`, no `q`/`returnTo`).
7. Host gate unchanged — dev/localhost remain inert.
8. Analytics failure remains non-blocking (no render crash).
9. **DEV/browser transport QA:** with test Measurement ID + production host simulation OR staged preview, Network shows **`g/collect`** after load and after one client navigation.
10. Exactly one manual `page_view` on initial load; one per meaningful navigation.

### Production corrective QA (future human checkpoint — **FAIL if absent**)

1. Network shows GA4 **`g/collect`** requests (not merely `gtag/js` loader).
2. Initial page load → exactly one `page_view` hit with sanitized paths.
3. Client navigation → exactly one additional `page_view`.
4. GA4 DebugView receives events.
5. Realtime shows active user/session during test.
6. Sanitized paths only; no raw IDs / `q` / `returnTo` in hit params.
7. Enhanced Measurement remains OFF.
8. Local/dev remain inert.

**If `g/collect` absent after rollout → FAIL (rollback).**  
**If raw URL context leaks → BLOCKED (rollback).**

---

## Test strategy (future Implement / Test phases)

### Automated (extend existing 81)

| Check | Command | Required |
|-------|---------|----------|
| Analytics unit tests | `npx tsx --test apps/portal/features/analytics/**/*.test.ts` | yes |
| **New:** bootstrap sequence | assert stub includes `gtag('js'`; assert order js before config in integration test | yes |
| **New:** no config in loader | existing thin-component test updated | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Portal build | `npm run build:portal` | yes |
| Lint (analytics paths) | no new lint in `apps/portal/features/analytics/**` | yes |

### DEV / browser transport verification (new — mandatory)

**Purpose:** prevent recurrence of "81 unit tests pass, zero `g/collect`".

**Procedure (Implement/Test doc to detail):**

1. Use owner-approved **test** GA4 stream / Measurement ID (not production secret in repo).
2. Temporarily enable analytics on a **controlled** host (production host simulation via `/etc/hosts` or App Hosting preview with documented env — human checkpoint for secret use).
3. Open Chrome DevTools → Network → filter `collect`.
4. Load `/` → expect **≥1** `google-analytics.com/g/collect` (or regional equivalent) within 5s.
5. Navigate client-side to `/catalog` → expect **additional** collect with sanitized path.
6. Inspect hit query params: no raw request/design IDs; no `q`.
7. Optional: GA4 DebugView with debug_mode for DEV only.

Record exact commands, URLs, hit counts, and sanitized param samples in test report.

### Manual production QA (post-rollout — separate human checkpoints)

See Acceptance criteria above. **Do not sign off on tag detection alone.**

---

## Human checkpoints anticipated

1. Plan approval (this document)
2. Formal Review
3. Implementation
4. DEV/browser transport QA
5. Signoff (dev/test)
6. Production PR independent audit
7. Production PR merge
8. App Hosting rollout authorization
9. Production transport / DebugView / Realtime QA
10. Final corrective Signoff

Production deploy remains **human gated**. Do not modify GA4 console, Secret Manager, or App Hosting during Plan/Review.

---

## Rollback plan

| Layer | Rollback |
|-------|----------|
| Code | Revert corrective commit(s) on development; production PR revert if merged |
| App Hosting | Roll back to prior known-good build: **`fresh-prints-portal-build-2026-08-17-002`** @ `124c6fa` (pre-fix) or last passing transport build after fix |
| GA4 console / Secret Manager | **No changes in this goal** — rollback N/A |
| Data | No schema/data migration |

Rollback trigger: post-rollout production QA **FAIL** (no `g/collect`, duplicate pageviews, raw URL leak, or EM regression).

---

## Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Fix insufficient; still zero collect | high | Optional loader-aware `scriptReady`; DEV transport QA gate before prod PR |
| Duplicate pageviews after fix | medium | Keep `send_page_view:false`; controller identity tests; prod QA counts hits |
| Breaking thin-loader architecture | medium | Only add `js` bootstrap; Formal Review confirms no `config` in script |
| Historical QA confusion | low | Superseding corrective doc; preserve original PASS wording with date |
| Dirty checkout interference | medium | Implement from clean branch/worktree based on `origin/development` or production tip per Review — do not mix cleanup goal |
| Headless false negative for collect | low | Owner real-browser QA remains authoritative; DEV transport uses normal Chrome |

See `.cursor/workflow/risk-checklist.md`.

---

## Documentation updates required

- [ ] Corrective test report + signoff in `docs/workflow/reviews/`
- [ ] Superseding finding note (additive) in ROADMAP / handoff — **do not delete** `PROD GA4 QA: PASS` history
- [ ] `docs/standards/DEPLOYMENT.md` — add note that production GA4 QA must include **`g/collect` proof** (future Implement doc pass)
- [ ] `docs/standards/TESTING.md` — optional: document analytics transport check [NEEDS REPO CHECK]

---

## Open questions / [NEEDS REPO CHECK]

| Item | Status |
|------|--------|
| GA4 property consent mode defaults blocking hits | [NEEDS REPO CHECK] Admin console — unlikely given gtm.load processing |
| Whether loader-aware `scriptReady` is required in addition to `js` bootstrap | Resolve in Implement DEV transport QA |
| Exact Implement branch base (development vs production tip) while dirty checkout persists | Formal Review / owner — **do not** mix dirty-checkout files |
| Handoff files on `origin/development` include GA4 closeout; **local dirty checkout handoff is stale** (TD-030 banner, no GA4 closeout) | Use `origin/development` docs for GA4 history during Review |
| `apps/portal/apphosting.yaml` in **working tree** may differ from `origin/production` (local copy showed GA mapping commented) | Implement must use **`origin/production`** YAML — verified production mapping exists @ `124c6fa` |

---

## Superseding record language (for future Signoff — not applied in Plan)

> **2026-08-17 corrective finding:** Historical `PROD GA4 QA: PASS` for `portal-ga4-production-enablement` validated tag installation. Subsequent production evidence (zero `g/collect`, zero Realtime under load) supersedes the **collection** conclusion. Corrective goal `portal-ga4-event-transmission-corrective` addresses bootstrap/transmission. Original Signoff artifacts remain unchanged.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-17-portal-ga4-event-transmission-corrective-review.md`
- Verdict: approved_with_changes

**PLAN ONLY — STOP for Formal Review. No Implement. No deploy. No GA4 console changes.**
