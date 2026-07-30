# Portal Google Analytics (GA4) — Plan

**Managed goal:** `portal-google-analytics`
**Phase:** Plan (Implement is explicitly out of scope this session)
**Roadmap position:** Item #5 of the pre-production sequence
(`docs/project/ROADMAP.md`), queued directly after `firestore-usage-efficiency-wave-c`
(closed 2026-07-27, `PASS WITH NOTES`). Item #6, `production-release`, must not begin
during this goal.

---

## 1. Goal

Design (not implement) a GA4 architecture for Fresh Prints Portal (`apps/portal`) that:

- Records page views correctly under the Next.js App Router (initial load + client-side
  route changes, no duplicates).
- Never loads, calls, or fails in a way that blocks Portal rendering.
- Sends no customer PII, artwork, request, or search content to Google.
- Is fully inert with no Measurement ID configured.
- Has an explicit, narrow plan for environment/hostname gating, CSP impact, and rollback.

No source, config, dependency, environment, Firebase, or CSP change occurs in this phase.

---

## 2. Current state

- `firestore-usage-efficiency-wave-c`: **CLOSED**, `PASS WITH NOTES`
  (`docs/workflow/reviews/2026-07-27-firestore-usage-efficiency-wave-c-signoff.md`).
  Production untouched throughout.
- `portal-google-analytics` has **not been started** anywhere in the repo. Confirmed via
  repo-wide search (Section 3.9): zero implementation, only roadmap/plan references noting
  it as queued/not-started.
- No other managed goal is active. `.cursor/workflow/state.md` and
  `references/project-chatgpt-handoff/CURRENT-STATE.md` both show idle after Wave C
  signoff.
- Handoff docs (`references/project-chatgpt-handoff/*`) are consistent with current repo
  docs for this goal — no discrepancy found requiring a note.

### 2.1 Date-consistency finding (owner-requested check, this amendment pass)

The system date at the time of this amendment is **2026-07-26**. The Wave C signoff
artifact (`docs/workflow/reviews/2026-07-27-firestore-usage-efficiency-wave-c-signoff.md`)
and every `state.md`/`CURRENT-STATE.md` reference to its close are dated **2026-07-27** —
one calendar day **after** this Plan's own filename date and after today's actual system
date at the time of the original Plan/Review pass. This is a **documentation
inconsistency**, not an intentional repository date and not merely a timezone rollover
(a timezone shift would not move a date a full day into the future relative to the
system clock at authoring time). Most likely explanation: the Wave C signoff was authored
in a prior session whose system clock had already advanced to 2026-07-27, and this
goal's Plan/Review were authored in a subsequent session (or the same day, a different
clock read) still reporting 2026-07-26. Both dates are self-consistent *within their own
session* — the Wave C artifacts are internally coherent among themselves, and this
Plan's artifacts are internally coherent among themselves — the mismatch is only at the
boundary between the two goals.

**Disposition:** this is **not** grounds to reopen Wave C (already signed off, closed,
out of this goal's scope) and **not** corrected in this pass — silently rewriting a
historical signoff's date would itself be a worse documentation-integrity problem than
leaving a one-day discrepancy on record. Logged here, and in the Formal Review, as an
observed inconsistency for future housekeeping (e.g. the next time `ROADMAP.md` or
`state.md` is touched for an unrelated reason, a maintainer can normalize the historical
date note if desired). No action taken.

---

## 3. Repository inventory (verified by direct inspection)

### 3.1 Portal root layout — `apps/portal/app/layout.tsx`

Server component (no `'use client'`). Full responsibility:

```tsx
export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const social = await loadPortalGlobalSocialMeta()
  return buildPortalRootMetadata(process.env, { ... })
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: portalThemeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- The only existing inline `<script>` is a theme-init snippet — not analytics, not
  `next/script`.
- Imports and renders `Providers` from `./providers.tsx`.
- This is the correct place to render a `<GoogleAnalyticsScript>`-style component in
  `<head>` (server-renderable metadata/script tag), gated by resolved config before any
  child renders — but the script tag itself must be a client component or use
  `next/script` with `strategy="afterInteractive"` so it does not block hydration.

### 3.2 Portal client providers — `apps/portal/app/providers.tsx`

`'use client'`. Full content:

```tsx
export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showFloatingThemeToggle = !isAuthenticatedAppRoute(pathname);

  useEffect(() => {
    if (pathname !== '/firebase-debug') {
      setFirestoreUsageTraceContext({ app: 'portal', route: pathname });
    }
  }, [pathname]);

  if (pathname === '/firebase-debug') {
    return (<>{children}<FirebaseDebugPanelMount /></>);
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        {showFloatingThemeToggle ? <PortalChrome /> : null}
        {children}
        <FirebaseDebugPanelMount />
      </AuthProvider>
    </ThemeProvider>
  );
}
```

**This is the single most important existing pattern for this goal.** It already:

- Is a client component composed at the exact point every route renders through.
- Reads `usePathname()` and runs a `useEffect` keyed on `pathname` to record a
  route-scoped side effect (`setFirestoreUsageTraceContext`) — structurally identical to
  what a page-view tracker needs to do on every client-side route change.
- Explicitly excludes `/firebase-debug` from a cross-cutting concern — the same pattern
  a GA4 provider would use to exclude any dev-only route.

No React Query / TanStack Query provider exists here (Coding Standards mentions TanStack
Query as available "when appropriate" but Portal does not currently use it in this file).

### 3.3 App-shell layout — `apps/portal/app/(app)/layout.tsx`

`'use client'`. 15 lines: renders `<AuthGate><PortalAppShell>{children}</PortalAppShell></AuthGate>`.
Does not itself call `usePathname`/`useSearchParams`/`useRouter`.

### 3.4 Client-side navigation hook usage (repo-wide grep, `apps/portal`)

37 files use `usePathname`, `useSearchParams`, or `useRouter` from `next/navigation`,
including (non-exhaustive, most relevant):

- `apps/portal/app/providers.tsx` (Section 3.2)
- `apps/portal/features/navigation/components/PortalScrollReset.tsx` — purpose-built to
  run an effect on pathname change (currently for scroll reset). This confirms the
  general "effect keyed on `usePathname()`" pattern is established in this codebase.
  **Scope correction (per Formal Review, Section 28):** this component is mounted in
  `PortalAppShell.tsx`, rendered only via `apps/portal/app/(app)/layout.tsx` — it
  covers `(app)/*` routes (`/catalog`, `/requests`, `/donate`, `/favorites`,
  `/dashboard`, `/custom-designs`) but not `/login`, `/register`, `/complete-profile`,
  `/share/design/*`, or `/firebase-debug`. The proposed `usePortalPageViewTracking`
  mount point is `Providers.tsx` at the true app root (Section 4.1), which covers every
  route including the ones `PortalScrollReset` does not reach. The precedent
  demonstrates the pattern is safe and idiomatic in this codebase, but it does **not**
  by itself prove root-level behavior for every route — Section 19 adds an explicit
  Implement-time verification step for this.
- `apps/portal/features/navigation/components/PortalAppShell.tsx`,
  `PortalSidebar.tsx`, `PortalBottomNav.tsx`, `PortalHeaderActions.tsx`
- `apps/portal/features/auth/components/AuthGate.tsx`,
  `RedirectAuthenticatedFromAuthPages.tsx`, `LoginForm.tsx`, `RegisterForm.tsx`,
  `CompleteProfileForm.tsx`, `GuestAuthGateOverlay.tsx`
- Route-level pages: `requests/[id]/PrintRequestDetailView.tsx`, `requests/page.tsx`,
  `requests/artwork/page.tsx`, `donate/page.tsx`, `catalog/library/page.tsx`,
  `login-required/page.tsx`

No existing consumer reads `useSearchParams()` in a way that this Plan must protect
against duplicate-firing (Section 9 covers the App Router's known
"`usePathname` alone under-fires on query-only changes" nuance explicitly).

### 3.5 Script-loading patterns

- `[NOT FOUND]`: no `next/script` import, no `<Script>` JSX usage anywhere in
  `apps/portal`.
- Only inline script in the whole app is the theme-init snippet (Section 3.1).
- `apps/portal/features/help/components/PortalHelpVideoSection.tsx:37-44` renders
  third-party `<iframe>` embeds (YouTube/Vimeo), normalized to privacy-enhanced domains
  (`www.youtube-nocookie.com`, `player.vimeo.com`) via
  `apps/portal/features/help/utils/portalVideoEmbedUrl.ts`. Not a script tag, but the
  only existing third-party-origin content Portal loads today — relevant only if a
  future CSP is added (Section 13), not to GA4 itself.

**Conclusion: no established script-loading pattern exists. GA4's script tag will be the
first `next/script` usage in Portal.** This Plan uses `next/script` (already a
Next.js-bundled API, not a new dependency) with `strategy="afterInteractive"` — the
documented recommended strategy for analytics scripts that are not needed for the
initial paint and should not block hydration.

### 3.6 Environment variable conventions

`apps/portal/.env.example` (existing conventions):

```txt
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_PORTAL_ORIGIN        # optional/commented
```

Other `NEXT_PUBLIC_*` vars in active use, not in `.env.example`:
`NEXT_PUBLIC_FIREBASE_VAPID_KEY` (web push),
`NEXT_PUBLIC_USE_GENERATED_CATALOG_SNAPSHOTS` (feature flag, default true unless `'false'`).

No `.env.local.example` exists — only `.env.example` (template) and the real,
untracked `.env.local`.

**Proposed convention (Plan-time naming only, not created this phase):**
`NEXT_PUBLIC_GA_MEASUREMENT_ID` — matches the existing `NEXT_PUBLIC_*` + descriptive-name
convention. Absent/empty ⇒ analytics fully inert (Section 8).

### 3.7 Hostname / environment gating — exact existing mechanism

`apps/portal/features/brand/portalSiteMeta.ts`:

```ts
const DEV_PORTAL_ORIGIN = 'https://myprintrequest.dev'
const PROD_PORTAL_ORIGIN = 'https://myprintrequest.com'
const LOCAL_PORTAL_ORIGIN = 'http://localhost:3100'

export function getPortalSiteOrigin(env: PortalSiteEnv = process.env): string {
  // 1. NEXT_PUBLIC_PORTAL_ORIGIN override
  // 2. NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'fresh-prints-dev' -> DEV_PORTAL_ORIGIN
  // 3. NODE_ENV === 'production' && unknown non-dev projectId -> PROD_PORTAL_ORIGIN
  // 4. else -> LOCAL_PORTAL_ORIGIN
}
```

`apps/portal/features/brand/portalSearchIndexing.ts`:

```ts
export const PORTAL_PRODUCTION_SEARCH_HOST = 'myprintrequest.com'

export function isPortalSearchIndexingEnabled(env: PortalSiteEnv = process.env): boolean {
  try {
    const hostname = new URL(getPortalSiteOrigin(env)).hostname.toLowerCase()
    return hostname === PORTAL_PRODUCTION_SEARCH_HOST || hostname === `www.${PORTAL_PRODUCTION_SEARCH_HOST}`
  } catch {
    return false
  }
}
```

This is the **exact, already-approved, fail-closed pattern** (used for SEO indexing) this
Plan reuses for GA4 hostname gating: a pure function taking an env-like object, resolving
origin via the same precedence order, and reducing to a boolean that is `false` for any
host other than the literal production domain (or its `www.` alias). Dev (`.dev`),
localhost, tunnels (`*.trycloudflare.com`), and any unrecognized preview host all
resolve `false`.

### 3.8 CSP / security headers

`[NOT FOUND]` anywhere in `apps/portal` or the Next.js config:

- No `Content-Security-Policy`, `script-src`, `connect-src`, or `X-Frame-Options` header
  in `apps/portal/next.config.ts`, `firebase.json`, or `apphosting.yaml`.
- No `apps/portal/middleware.ts` exists at all.
- The only repo-wide hits for these header names are unrelated static `_headers` files
  under `splash/maintenance/` and `splash/coming-soon/` (a separate static marketing
  site, not Portal) and a Studio Electron IPC shell HTML file — neither is Next.js/Portal
  CSP.

**This materially simplifies the CSP question:** Portal ships with **no CSP today**.
Adding GA4's `googletagmanager.com` / `google-analytics.com` script and beacon origins
does not require relaxing an existing restrictive policy — there is nothing to relax.
**This Plan does not introduce a new CSP as part of adding GA4** (that would be scope
expansion — a security-hardening initiative, not an analytics initiative). If a CSP is
added in a future goal, its `script-src`/`connect-src` must include GA4's origins at
that time; this Plan documents that dependency for the future CSP work rather than
building it now.

### 3.9 `apps/portal/next.config.ts` (full content)

```ts
transpilePackages: [...],
allowedDevOrigins: ['*.trycloudflare.com', 'myprintrequest.dev'],
serverExternalPackages: [...firebase packages],
devIndicators: false,
```

No `headers()` function, no env block, no analytics config. No change needed here for a
`next/script`-based GA4 load (no rewrites/proxying required, no `next.config` change to
allowlist an external script — that's an App Router / CSP concern, not a Next config
concern, and no CSP exists to update per 3.8).

### 3.10 Middleware

`[NOT FOUND]` — `apps/portal/middleware.ts` does not exist.

### 3.11 Firebase App Hosting config

`apps/portal/apphosting.yaml`:

```yaml
runConfig:
  minInstances: 0
  maxInstances: 10
  concurrency: 80
```

No env/secrets section. `firebase.json` apphosting block:

```json
"apphosting": [{
  "backendId": "fresh-prints-portal",
  "rootDir": "./apps/portal",
  "ignore": [...]
}]
```

No inline secrets in either file. App Hosting environment variables for a future
production deploy would be configured via the Firebase Console / `apphosting.yaml`
env section or `firebase apphosting:secrets:set` — **not performed in this Plan phase**;
documented for the later production checkpoint (Section 17).

### 3.12 Privacy / legal / consent pages

`[NOT FOUND]`. No Privacy Policy, Terms, or cookie-notice route/component/Firestore
setting anywhere in `apps/portal` or `docs/`. The only "consent" hit is
`AssistedLibraryListingConsentModal.tsx`, an unrelated design-library-sharing consent
modal (Phase 9 Assisted Creation), not a legal/cookie consent mechanism.

**This is a real gap independent of this goal** — Fresh Prints Portal has no Privacy
Policy today. Section 12/16 flags this as an owner decision: GA4 collects personal data
(IP-derived location, device/browser info) under Google's own processing terms even
under this Plan's minimal-PII design, and most jurisdictions' analytics-disclosure norms
expect *some* privacy notice to exist. This Plan does not draft one (legal-review
recommendation, out of scope), but implementation must not proceed silently past this
gap without an owner decision (Section 12).

### 3.13 Existing analytics/telemetry search (repo-wide)

Zero implementation matches for `gtag(`, `googletagmanager.com`, GA measurement-ID
pattern, `trackEvent`, `telemetry`, `measurementId`, or `page_view` anywhere in
`apps/portal`, `apps/studio`, `functions`, or `packages/shared`. All "analytics"-word
hits are unrelated (`firestoreUsageTrace`, AI tag-suggestion internals). All
"Google Analytics"/"GA4" string hits are doc-only, and all state this goal as **queued /
not started**:

- `docs/project/ROADMAP.md:117,122`
- `docs/workflow/setup/firebase-project-setup.md:72,77` (generic Firebase console
  setup guidance, "Google Analytics is optional for Phase 1")
- `docs/workflow/plans/2026-07-22-portal-seo-foundations-plan.md:25,65,224` (explicitly
  deferred)
- `docs/workflow/plans/2026-07-22-portal-how-to-faq-plan.md:25,52,245` (explicitly
  deferred)
- `docs/workflow/reviews/2026-07-22-portal-seo-foundations-signoff.md:100,150`
- `docs/workflow/reviews/2026-07-23-portal-how-to-faq-signoff.md:103,129`

**Existing analytics dependency: `[NOT FOUND]`.**
**Existing analytics utility: `[NOT FOUND]`.**
**Proposed new dependency: none required** — `next/script` is bundled with the existing
Next.js 15.1.6 dependency already in `apps/portal/package.json`. The GA4 `gtag.js` script
is loaded via URL, not an npm package. **No dependency addition needed for this
architecture**, so no `[NEEDS PLAN/REVIEW APPROVAL]` dependency item is raised.

### 3.14 Error boundary / not-found pages

`[NOT FOUND]` — none of `apps/portal/app/error.tsx`, `not-found.tsx`, or
`global-error.tsx` exist. GA4 script-load failure must therefore be contained entirely
within the analytics module itself (Section 10) — there is no app-level error boundary
to catch or mask an analytics-related exception.

### 3.15 Testing conventions

Per `docs/standards/TESTING.md`: no root `npm test` script; tests run via
`npx tsx --test <files>`. Portal typecheck:
`npm run typecheck --workspace @fresh-prints/portal`. Portal build: `npm run build:portal`.
Lint: `npm run lint`. No `@firebase/rules-unit-testing`-style suite applies here since
this feature touches no Firestore/Storage Rules.

---

## 4. Proposed architecture (rewritten this session — required corrections 1/2)

**This section supersedes every prior version of Sections 4–6c.** A whole-Plan
consistency review found that the architecture as previously written was not
implementable as specified and had two owners contending for the initial page view:

- `apps/portal/app/layout.tsx` is a **Server Component** and cannot call
  `usePathname()`/`useSearchParams()` (both are Client Component hooks) and does not
  receive the current page's `searchParams` prop (only a `page.tsx` in the matched
  route segment does, and the root layout wraps every route, not one). No
  repository-supported server mechanism (header, middleware, undocumented Next.js API)
  provides both pathname and query state to a root layout, and this Plan does not invent
  one. The previous design's Section 16 file-table entry claiming `layout.tsx` would
  "compute the initial `buildSanitizedAnalyticsPageDescriptor(...)` from the current
  request's path" was not achievable as written.
- Section 6 said `usePortalPageViewTracking` fires the initial page view on mount;
  Section 6c.1 said the inline bootstrap script sends the first manual `page_view`
  using a server-resolved `initialDescriptor`. Both cannot be authoritative — this was
  an unresolved dual-ownership conflict, not just a documentation gap.

**Corrected architecture: one root-mounted Client Component controller owns the entire
analytics lifecycle** — initialization and every navigation — through a single state
machine. No Server Component in this design claims to know the current pathname or
search parameters.

### 4.1 Layer boundary (per `docs/standards/CODING_STANDARDS.md` / `ARCHITECTURE.md`)

```
apps/portal/app/layout.tsx (Server Component)
  ↓ resolves env-only config, passes as a prop — never touches pathname/searchParams
apps/portal/app/providers.tsx (Client Component, existing)
  ↓ mounts the analytics boundary once, at the root, wrapped in Suspense
PortalAnalyticsBoundary (new, Client Component, wraps children in <Suspense>)
  ↓
usePortalAnalyticsController (new hook — THE single authoritative owner of the
  entire lifecycle: reads usePathname()/useSearchParams(), builds navigation identity,
  builds the sanitized descriptor, initializes the stream exactly once, sends the
  initial page view exactly once, and sends every subsequent page view)
  ↓
portalAnalyticsSanitizer (pure service — Section 6a: raw nav state → sanitized descriptor + navigation identity)
  ↓
portalAnalyticsService (service — thin wrapper over window.gtag; narrow inputs only)
  ↓
window.gtag (only if the external script loaded successfully)
```

`PortalAnalyticsScript` (the `next/script` loader) is now a genuinely **thin**
component: it only loads the external `gtag.js` file and defines the minimal
`window.dataLayer`/`gtag` stub function. It performs **no** initialization sequencing,
no `gtag('config', ...)` call, and no descriptor computation — all of that now lives in
`usePortalAnalyticsController`, the one authoritative layer.

This is a **new, narrow feature folder** consistent with the existing
`features/<name>/{components,hooks,services,types}` convention:

```
apps/portal/features/analytics/
├── services/
│   ├── portalAnalyticsHostGate.ts     # pure: dedicated production-hostname gate (Section 8)
│   ├── portalAnalyticsConfig.ts       # pure: resolve enabled + measurement ID from env
│   ├── portalAnalyticsSanitizer.ts    # pure: raw pathname/searchParams -> sanitized descriptor + navigation identity (Section 6a)
│   └── portalAnalyticsService.ts      # gtag wrapper: initializeStream/updatePageContext/trackPageView, narrow inputs only
├── hooks/
│   └── usePortalAnalyticsController.ts # THE single authoritative lifecycle owner (Section 6)
├── components/
│   ├── PortalAnalyticsScript.tsx      # 'use client', next/script tag ONLY — no sequencing logic
│   └── PortalAnalyticsBoundary.tsx    # 'use client', Suspense wrapper + mounts the controller hook
└── types/
    └── portalAnalytics.types.ts       # PortalAnalyticsConfig, PortalAnalyticsPageDescriptor, PortalAnalyticsNavigationIdentity, minimal gtag type surface
```

No component ever calls `window.gtag` directly or reads `process.env` directly — only
`portalAnalyticsConfig.ts` reads env, only `portalAnalyticsService.ts` calls `gtag`,
matching the Component → Hook → Service layer rule. `PortalAnalyticsScript` and
`PortalAnalyticsBoundary` remain intentionally thin (script tag; Suspense wrapper) —
all business logic (identity, sanitization, sequencing) lives in the hook and services.

### 4.2 Why a Client Component boundary, and why Suspense

- `usePathname()`/`useSearchParams()` are Client Component-only hooks (Next.js
  documented restriction). The only way to read the current URL for analytics purposes
  is from a Client Component — there is no supported server-side alternative that
  reaches the root layout, and this Plan does not invent one.
- Next.js requires a route that calls `useSearchParams()` from a Client Component to be
  wrapped in a `<Suspense>` boundary, or the production build fails with "Missing
  Suspense boundary with useSearchParams" — confirmed against current Next.js
  documentation during this session (`nextjs.org/docs/messages/missing-suspense-with-csr-bailout`).
  This is a hard build-time requirement, not a style preference: without it,
  `npm run build:portal` (Section 19) would fail once this code exists. `PortalAnalyticsBoundary`
  exists specifically to provide this boundary at the correct point (wrapping only the
  controller, not all of `{children}`, so a missing/slow analytics boundary can never
  delay the rest of the app's hydration).
- A single `AnalyticsProvider` context is **not needed** beyond this — there is no state
  to share across components beyond "is analytics ready," and `window.gtag` is itself
  the global state Google's script manages. The controller hook is a self-contained
  state machine; no other component needs to read analytics state.
- Mounting `PortalAnalyticsBoundary` inside `Providers.tsx` (Section 3.2), rather than
  introducing a second top-level provider, keeps the root composition flat and mirrors
  how `FirebaseDebugPanelMount` is already mounted there.

---

## 5. Single-owner initialization and navigation lifecycle (rewritten this session — required correction 2)

**`usePortalAnalyticsController` is the one, single, authoritative owner of the entire
analytics lifecycle.** No other layer (script component, root layout, a second hook)
independently decides when to initialize the stream or when to send a page view. This
directly satisfies the owner's requirement: "one named layer must be authoritative."

### 5.1 State machine (revised — required correction: script-readiness handshake)

**Correction to this section's earlier version, per an owner-identified runtime race:**
the version of this section below the line once claimed that whichever of
`PortalAnalyticsScript` or the controller hook mounts first "has no effect on
correctness," and that `initializedRef.current` flips to `true` "after a real `gtag`
call is attempted." **Both claims were wrong, and described a genuine bug, not a
harmless timing detail.** `PortalAnalyticsScript` uses `next/script`
`strategy="afterInteractive"` (Section 7), which loads and executes asynchronously,
with no guarantee it runs before the controller's first effect. Because
`initializeStream`/`trackPageView` silently no-op when `window.gtag` is not yet a
function (Section 10 — this is correct, required failure-containment behavior on its
own), and the prior state machine committed `initialized = true` **unconditionally**
after merely *calling* those functions (not after confirming they *did* anything), a
real, reachable sequence existed: controller effect runs before `gtag` exists → both
calls silently no-op → state is committed as "initialized" anyway → the initial
configuration and initial page view are **permanently lost**, since nothing about
`pathname`/`searchParams`/`config` changes when the script becomes ready moments later,
so the effect never re-runs to retry.

**Fix: an explicit script-readiness signal, plus a "commit state only on confirmed
success" rule.** The service functions (Section 6c.2) are revised to return an
explicit `boolean` — `true` only if `window.gtag` existed and the call was actually
made, `false` on no-op — so "the call succeeded" is a directly observable fact, never
inferred from "the function was called." The controller's effect gains a fourth
dependency, `scriptReady` (a boolean owned by `PortalAnalyticsBoundary`, sourced from
`next/script`'s documented `onReady` callback — Section 6c.2), and never attempts
initialization while it is `false`. State (`initialized`, `lastIdentityKey`,
`previousSanitizedPath`) is committed **only** when `initializeStream` returns `true`.

The hook holds exactly three `useRef` values (state machine) plus the `scriptReady`
boolean, which is **owned by `PortalAnalyticsBoundary`**, not the controller itself,
and passed in as a parameter:

```ts
const stateRef = useRef({ initialized: false, lastIdentityKey: null, previousSanitizedPath: null })
// scriptReady is a parameter, not local state — see Section 6c.2 for its owner.
```

On every effect run (keyed on `[pathname, searchParams.toString(), config.enabled,
config.measurementId, scriptReady]`):

```ts
useEffect(() => {
  if (!config.enabled || !config.measurementId) return
  if (pathname === '/firebase-debug') return

  const state = stateRef.current

  if (!state.initialized) {
    // Never attempt initialization until the script/stub is actually ready — doing
    // so would silently no-op (Section 10) and, if state were committed regardless,
    // permanently lose the initial configuration and page view (the exact bug this
    // revision fixes).
    if (!scriptReady) return

    const descriptor = buildSanitizedAnalyticsPageDescriptor({
      pathname, searchParams, previousSanitizedPath: null, origin,
    })

    const initialized = portalAnalyticsService.initializeStream({
      measurementId: config.measurementId, descriptor,
    })
    if (!initialized) return // do NOT commit state on a false/no-op result

    portalAnalyticsService.trackPageView(descriptor)

    const identity = buildNavigationIdentity(pathname, searchParams)
    state.initialized = true
    state.lastIdentityKey = navigationIdentityKey(identity)
    state.previousSanitizedPath = descriptor.path
    return
  }

  // Reached only after initialization has SUCCEEDED at least once — update:true
  // (Section 6c.2) can therefore never run before a successful initial config.
  const identity = buildNavigationIdentity(pathname, searchParams)
  const identityKey = navigationIdentityKey(identity)
  if (identityKey === state.lastIdentityKey) return // not a meaningful navigation

  const descriptor = buildSanitizedAnalyticsPageDescriptor({
    pathname, searchParams, previousSanitizedPath: state.previousSanitizedPath, origin,
  })

  portalAnalyticsService.updatePageContext({ measurementId: config.measurementId, descriptor })
  portalAnalyticsService.trackPageView(descriptor)

  state.lastIdentityKey = identityKey
  state.previousSanitizedPath = descriptor.path
}, [pathname, searchParams.toString(), config.enabled, config.measurementId, scriptReady])
```

**Exact behavior for the scenarios the owner required:**

- **Delayed script readiness (readiness arrives moments after the first effect run):**
  the first run sees `scriptReady === false`, returns immediately, commits nothing. The
  readiness dependency changing to `true` causes the effect to re-run; this second run
  sees `state.initialized === false` and `scriptReady === true`, so it proceeds — using
  the *current* `pathname`/`searchParams` at that moment (Section 5.1's effect always
  reads the latest render's values, never a stale closure), not whatever route was
  current on the first, no-op run. Result: exactly one `initializeStream` call and one
  `trackPageView` call, both using the same, current-route descriptor.
- **Permanently blocked script (`scriptReady` never becomes `true`):** every effect run
  returns at the `if (!scriptReady) return` line. No `initializeStream` call, no
  `trackPageView` call, `state.initialized` remains `false` forever. No error is thrown
  anywhere in this path — Portal continues rendering and navigating normally
  (Section 10).
- **`initializeStream` itself reports failure** (e.g. a transient issue where
  `window.gtag` existed at the readiness check but the call still didn't succeed —
  covered for completeness, not because `next/script`'s `onReady` is expected to be
  unreliable): the `if (!initialized) return` line prevents any state commit. A later
  effect run (any dependency change, including a subsequent navigation) gets another
  chance to initialize correctly, since nothing was falsely marked done.

### 5.2 Why this closes the dual-ownership conflict

- **`PortalAnalyticsScript`** (Section 7) does nothing but load the external
  `gtag.js` file and define the `window.dataLayer`/`gtag` stub function
  (`window.dataLayer = window.dataLayer || []; function gtag(){window.dataLayer.push(arguments)}`)
  — it contains **zero** `gtag('config', ...)` calls, **zero** descriptor computation,
  and is never responsible for sending any page view. **Correction (required
  correction, this session):** it can render before or after the controller hook
  mounts, and this Plan does **not** claim that timing "has no effect on correctness"
  by itself — it matters, which is exactly why Section 5.1's `scriptReady` gate exists.
  What actually guarantees correctness is the combination of (a) the controller never
  attempting initialization while `scriptReady` is `false`, and (b) never committing
  `initialized` state unless `initializeStream` reports success — not an assumption
  that mount order is irrelevant. See Section 6c.2 for exactly how `scriptReady` is
  produced and owned.
- **`Providers.tsx`** does not call any analytics function directly — it only renders
  `<PortalAnalyticsBoundary>` once (Section 4.2), which itself owns the `scriptReady`
  boolean, wraps the controller in the Suspense boundary, and mounts
  `usePortalAnalyticsController`.
- **No inline bootstrap script computes a descriptor server-side** — the entire
  `initialDescriptor` concept computed in `app/layout.tsx` is removed. The controller
  hook computes it client-side, from `usePathname()`/`useSearchParams()`, on its very
  first effect run — the same mechanism used for every later navigation, just gated by
  `initializedRef`.

### 5.3 Guaranteed single initialization, including Strict Mode and re-renders

- **React Strict Mode double-invoke (dev only):** Strict Mode replays effects
  (mount → cleanup → mount again) to surface impure effects. Because `initializedRef`
  is a `useRef` (persists across the replay, unlike `useState`), the second invocation
  sees `initializedRef.current === true` already and takes the "later navigation" branch
  with an *identical* `pathname`/`searchParams` to the first invocation — which means
  `identityKey === lastIdentityKeyRef.current` and the effect returns immediately
  without calling `updatePageContext`/`trackPageView` a second time. **Net result: one
  initialization, one initial page view, even under Strict Mode's replay.**
- **`PortalAnalyticsScript` re-render:** the script component's own re-render (e.g. a
  parent re-render unrelated to navigation) does not remount `next/script` (Section 7's
  existing `id`-based de-duplication, unchanged) and does not affect
  `usePortalAnalyticsController`'s own ref state at all — they are separate components
  with no shared state.
- **`PortalAnalyticsBoundary`/root provider re-render:** re-rendering `Providers.tsx`
  (e.g. from an unrelated `pathname`-driven `showFloatingThemeToggle` change, Section
  3.2) does not remount `PortalAnalyticsBoundary` or `usePortalAnalyticsController` —
  React preserves component identity and hook state across a re-render that does not
  change the component's position in the tree; only an actual unmount/remount (e.g. a
  `key` change) would reset the hook's `useRef`s, and nothing in this architecture ever
  keys `PortalAnalyticsBoundary` on anything that changes during normal navigation.
- **`gtag('config', ...)` runs exactly once for the document lifetime**, full stop — it
  is called only inside the `!initializedRef.current` branch, which can only be true
  once per mount of the controller hook, and the controller hook itself is never
  unmounted/remounted during normal app usage (Section 4.2).

### 5.4 Stream configuration and navigation updates — official mechanism (required correction, "GA4 stream configuration mechanism")

Per this session's re-verification against the official GA4 Configuration reference
(`developers.google.com/analytics/devguides/collection/ga4/reference/config`): the
`config` command itself accepts `page_location`/`page_title`/`page_referrer` directly,
and a subsequent `config` call with `update: true` **merges** new configuration values
into the existing tag configuration **and suppresses the automatic duplicate
`page_view`** that a second bare `config` call would otherwise send. This is the
documented, official mechanism for SPA navigation updates — preferred by this revision
over the previous design's repeated `gtag('set', ...)` calls, since `update: true` is
purpose-built for exactly this "update the stream's page context without
re-initializing or auto-firing a page view" requirement, whereas `set`'s applicability
to automatically-collected lifecycle events was the exact point the third-pass Formal
Review found unconfirmed (Section 6c.4 records this unresolved uncertainty explicitly
rather than assuming `update: true` closes it either — see 6c.4).

```ts
// Initial (Step 1) — services/portalAnalyticsService.ts
export function initializeStream(input: {
  measurementId: string
  descriptor: PortalAnalyticsPageDescriptor
}): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('config', input.measurementId, {
    send_page_view: false,
    page_location: input.descriptor.location,
    page_title: input.descriptor.title,
    ...(input.descriptor.referrer ? { page_referrer: input.descriptor.referrer } : {}),
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  })
}

// Every later navigation (Step 2) — same service file
export function updatePageContext(input: {
  measurementId: string
  descriptor: PortalAnalyticsPageDescriptor
}): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('config', input.measurementId, {
    update: true,
    page_location: input.descriptor.location,
    page_title: input.descriptor.title,
    ...(input.descriptor.referrer ? { page_referrer: input.descriptor.referrer } : {}),
  })
}

// Unchanged from prior revisions — services/portalAnalyticsService.ts
export function trackPageView(descriptor: PortalAnalyticsPageDescriptor): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', 'page_view', {
    page_location: descriptor.location,
    page_path: descriptor.path,
    page_title: descriptor.title,
    ...(descriptor.referrer ? { page_referrer: descriptor.referrer } : {}),
  })
}
```

Requirements satisfied, per the owner's explicit list:

- Initial `config` occurs once (Section 5.1/5.3).
- Initial `config` includes sanitized page context (`page_location`/`page_title`/
  `page_referrer` from the same descriptor used for the initial `trackPageView` call).
- Initial `config` includes `send_page_view: false`.
- Initial `config` explicitly disables both advertising-signal options
  (`allow_google_signals: false`, `allow_ad_personalization_signals: false` — Section
  6c.3's correction, unchanged by this rewrite).
- Navigation updates use `update: true` (never a second bare `config` call, never
  `set`).
- Navigation updates occur before the corresponding manual page view (Section 5.1 step
  2's literal call order: `updatePageContext` then `trackPageView`).
- Updates do not generate automatic page views — this is `update: true`'s documented
  purpose (suppresses the duplicate page view a second `config` call would otherwise
  send).
- No raw browser default is *intentionally* relied upon anywhere in this application's
  own code — every `config`/`event` call this Plan authors passes explicit sanitized
  values. (Whether GA4's own automatically-collected lifecycle events independently
  inherit these values is the separate, still-open question Section 6c.4 addresses —
  this Plan does not claim the mechanism above guarantees that.)
- No arbitrary event-parameter object is accepted from components — `initializeStream`/
  `updatePageContext`/`trackPageView` all accept only `PortalAnalyticsPageDescriptor`
  plus a plain `measurementId` string, never a raw URL or open parameter bag.

---

## 6. Page-view lifecycle (App Router specifics — updated to reference the single controller)

The Next.js App Router does **not** provide a built-in page-view event — this Plan must
define exact semantics, since GA4's own docs assume Pages Router or non-SPA behavior.

- **Initial load:** `usePortalAnalyticsController`'s effect runs on mount (first render
  after hydration, inside the `PortalAnalyticsBoundary`'s `<Suspense>` boundary), reads
  the initial `pathname`/`searchParams`, and — because `initializedRef.current` starts
  `false` — takes the Section 5.1 Step 1 branch: initializes the stream and sends
  exactly one manual page view, both from the identical sanitized descriptor.
- **Client-side route change:** the same controller's effect depends on both
  `usePathname()` and `useSearchParams()` (Next.js's documented combination for
  detecting a full URL change, since `usePathname()` alone does not update on
  query-string-only navigation — e.g. `?discover=popular` on `/catalog`, an existing
  real Portal pattern). Because `initializedRef.current` is now `true`, this takes the
  Section 5.1 Step 2 branch: navigation-identity check, then (if meaningful)
  `updatePageContext` + `trackPageView`.
- **Back/forward navigation:** browser back/forward through the App Router re-renders
  through the same `usePathname`/`useSearchParams` hooks (confirmed existing pattern in
  `PortalScrollReset.tsx`, which already relies on this for scroll-reset-on-navigate) —
  no special-casing needed; the same controller effect fires.
- **Duplicate-prevention (React Strict Mode / remounts / dropped-parameter changes /
  distinct dynamic-segment resources):** fully covered by Section 5.1's navigation
  identity check and Section 5.3's initialization guarantee — see those sections for
  the complete mechanism (this section previously duplicated that logic; it is now
  described once, in Section 5, to avoid the drift that caused earlier review findings).
- **Route groups:** `usePathname()` already returns the resolved public path (e.g. `/`,
  `/catalog`) not the App Router's internal `(app)` group segment — no special handling
  needed for the `(app)` route group.

Excluded from tracking: `/firebase-debug` (matching `Providers.tsx`'s existing explicit
exclusion of that route from `setFirestoreUsageTraceContext`) — the debug route already
gets special-cased in `Providers.tsx`'s pattern, so `usePortalAnalyticsController`
checks for it as the very first line of its effect, before any identity/descriptor work.

---

## 6a. Analytics URL, title, and referrer sanitization (amendment — required correction 1)

**This section supersedes the original design's assumption that `pathname +
searchParams` could be sent to `gtag` directly.** An external owner review correctly
identified that raw `page_location`/`page_path` values, and GA4's own default
`page_title`/`page_referrer` behavior, can leak prohibited data even though Section 12's
privacy boundary already *said* no such data should be sent. This section closes that
gap with an explicit, testable sanitization architecture that sits between route
detection (Section 6) and the `gtag` call (Section 5 step 5/6).

### 6a.1 Verified Portal route inventory

Every Portal App Router route was re-inspected directly (not assumed) for this
amendment. Dynamic segments and every query parameter actually read via
`useSearchParams()` anywhere in `apps/portal` are listed below — no route or parameter
in this table was invented.

| Route pattern | Dynamic segment | Segment contents (verified) | Safe to send? | Sanitized analytics route template |
|---|---|---|---|---|
| `/` | No | — | Yes | `/` |
| `/catalog` | No | — | Yes (path only; see query policy below) | `/catalog` |
| `/catalog/library` | No | — | Yes — this route is a pure client-side redirect shim (`router.replace` to `/catalog?<same query>`); it never itself renders trackable content, but the hook may still observe it for one render before the redirect | `/catalog/library` |
| `/favorites` | No | — | Yes | `/favorites` |
| `/custom-designs/**` (optional catch-all `[[...segments]]`) | No path segment (routing lives entirely in query params) | N/A | Yes (path only; query params below) | `/custom-designs` |
| `/requests` | No | — | Yes (path only; `tab` query below) | `/requests` |
| `/requests/[id]` | **Yes** | `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx:79` — `params.id`, a **Firestore `printRequest` document ID**, used to load one customer's specific request (items, quantities, statuses) | **No** — pseudonymous but request-content-correlated; not public anywhere (no sitemap/share entry) | `/requests/:id` |
| `/requests/artwork` | No | — | Yes (path only; `returnTo`/`from`/`requestId` query below) | `/requests/artwork` |
| `/donate` | No | — | Yes (path only; `returnTo` query below) | `/donate` |
| `/dashboard` | No | — | Yes | `/dashboard` |
| `/help` | No | — | Yes | `/help` |
| `/share/design/[id]` | **Yes** | `apps/portal/app/(app)/share/design/[id]/page.tsx` — a **catalog design ID**, validated `^[A-Za-z0-9_-]{1,128}$`. **Verified same ID space as `apps/portal/app/sitemap.ts`**, which already publicly lists every ready design's ID via `buildPortalDesignSharePath(entry.id)` for SEO | **Yes** — already public via the existing sitemap/share-link SEO work; not newly sensitive in an analytics URL | `/share/design/:id` (template still used for consistent grouping in GA4 reports, even though the raw ID would technically be safe — see 6a.9 for why templating applies uniformly) |
| `/complete-profile` | No | — | Yes (path only; `returnTo` query below) | `/complete-profile` |
| `/register` | No | — | Yes (path only; `returnTo` query below) | `/register` |
| `/login` | No | — | Yes (path only; `returnTo` query below) | `/login` |
| `/login-required` | No | — | Yes (path only; `returnTo` query below) | `/login-required` |
| `/firebase-debug` | No | — | N/A — already excluded entirely (Section 6) | not tracked |

### 6a.2 Verified query-parameter policy

Every distinct query parameter actually read anywhere in `apps/portal` (via
`useSearchParams()` or the underlying URL-state parsers), with its disposition:

| Parameter | Found in | Value | Disposition | Privacy justification |
|---|---|---|---|---|
| `tab` (`/requests`) | `requests/page.tsx` | Fixed enum: `working`\|`queued`\|`printing`\|`printed` | **Allowed unchanged** (allowlisted) | Fixed categorical value, no customer content |
| `upload` | `PrintRequestDetailView.tsx` | Fixed literal `'1'` | **Allowed unchanged** (allowlisted) | Fixed flag, no customer content |
| `from` | `PrintRequestDetailView.tsx`, `requests/artwork/page.tsx`, `CatalogPageContent.tsx` | Fixed enum: `discover`\|`library`\|`requests`\|`working`\|`queued`\|`printing`\|`printed` | **Allowed unchanged** (allowlisted) | Fixed categorical value |
| `mode` (`/catalog`) | `CatalogPageContent.tsx` | Fixed literal `'request-selection'` | **Allowed unchanged** (allowlisted) | Fixed flag |
| `discover` (`/catalog`, `/`) | `CatalogPageContent.tsx`, `packages/shared/src/utils/catalogDiscoveryRanking.ts:51-57` | Fixed enum: `new`\|`popular`\|`mostLiked`\|`recent` (anything else parses to `null`) | **Allowed unchanged** (allowlisted) | Fixed categorical value, verified exhaustive enum |
| `category` (`/catalog`) | `CatalogPageContent.tsx` | A category **document ID** from `listActiveCategories()`, chosen via dropdown — not free text | **Converted to a fixed categorical marker** (`category=present`) rather than sent as the raw ID | The ID itself is low-sensitivity (public taxonomy), but it is still a Firestore document ID and is not required for any page-view-level analytics question this Plan's page-views-only scope needs to answer (Owner Decision 5) — dropped to the fact-of-presence rather than the value, per the "never send raw ... Firestore document identifiers" requirement, which this Plan reads as applying to *all* Firestore doc IDs, not only customer-record ones |
| `q` (`/catalog`) | `CatalogPageContent.tsx` | **Free-text customer search string** | **Dropped entirely** | Explicit requirement: "never send raw customer-entered search text" |
| `designId` (`/catalog`) | `useCatalogDesignDeepLink.ts`, `portalDesignShareUrls.ts` | Catalog design ID (same ID space as `/share/design/[id]`, already public) | **Dropped from the query string, but the resulting deep-link modal state is not itself a route change this Plan tracks separately** — the underlying page remains `/catalog`; no separate page view is generated purely because a modal opened via this param (see 6a.9) | Even though the ID itself is low-sensitivity (public), dropping it avoids inflating `/catalog` into hundreds of distinct tracked variants for no page-view-analytics benefit within this goal's page-views-only scope |
| `requestId` (`/custom-designs/**`, `/requests/artwork`, catalog selection helpers) | `catalogSelectionNavigation.ts`, `etsyRecommendationUrlState.ts` | **Firestore `printRequest` document ID** | **Dropped entirely** | Explicit requirement: "never send raw request ... identifiers" |
| `seedDesignId` (`/catalog`) | `CatalogPageContent.tsx`, `buildCatalogSelectionHref` | Catalog/design ID | **Dropped entirely** (same reasoning as `designId`) | Consistency with `designId` disposition |
| `etsyRecommendationId` | `catalogSelectionNavigation.ts` | Etsy-recommendation-flow record ID | **Dropped entirely** | Not a Firestore `printRequest`/`customer` ID, but still an opaque per-customer-flow record identifier — dropped per the same-spirit "never send raw ... identifiers" requirement |
| `detailTab` (`/custom-designs/**`) | `assistedCreationUrlState.ts` | Fixed enum: `overview`\|`proofs`\|`messages` | **Allowed unchanged** (allowlisted) | Fixed categorical value |
| `flow` (`/custom-designs/**`) | `assistedCreationUrlState.ts`, `etsyRecommendationUrlState.ts` | Fixed enum: `assisted`\|`find`\|`ai` | **Allowed unchanged** (allowlisted) | Fixed categorical value |
| `step` (`/custom-designs/**`) | `assistedCreationUrlState.ts`, `etsyRecommendationUrlState.ts` | Fixed enum of wizard step IDs (assisted-creation steps, or `subject`\|`style`\|`wording`\|`review`\|`results`\|`choose` for the Etsy flow) | **Allowed unchanged** (allowlisted) | Fixed categorical value, verified against `ASSISTED_CREATION_WIZARD_STEPS`/`parseQueryStep` |
| `returnTo` (`/login`, `/register`, `/login-required`, `/complete-profile`, `/donate`, `/requests/artwork`) | `portalReturnUrl.ts` and callers | **A same-origin in-app path that can itself embed another route's own query string** (verified: `PrintRequestDetailView.tsx:352,383` builds values like `returnTo=/requests/${printRequest.id}?tab=working`) | **Dropped entirely** | This is the single highest-risk parameter in the app: it can transitively carry a `/requests/:id` Firestore document ID or (in principle) a future route's free-text query nested one level down. No allowlisting is safe here — the *only* correct policy is unconditional removal, regardless of what it currently contains |

**No `tags` query parameter exists** in this codebase — `selectedTags` in
`CatalogPageContent.tsx` is local component state only, never synced to/from the URL
(confirmed via repository search: zero `searchParams.get('tags')` call sites).

**Default policy for any parameter not in this table:** dropped (fail closed, per
6a.9) — this table is exhaustive as of this inspection, but the sanitizer's
implementation must not assume the table stays exhaustive forever; unlisted parameters
are always dropped, never passed through by default.

### 6a.3 Sanitized page descriptor — required service boundary

A new pure function, `buildSanitizedAnalyticsPageDescriptor`
(`apps/portal/features/analytics/services/portalAnalyticsSanitizer.ts`), is the single
point through which every value reaching `gtag` must pass. Its signature:

```ts
export type PortalAnalyticsPageDescriptor = {
  /** Sanitized route template, e.g. "/requests/:id" — never the raw pathname. */
  path: string
  /** Fixed, non-PII page title derived from the route template — never document.title. */
  title: string
  /** Full sanitized absolute URL built from the resolved origin + sanitized path + allowlisted query. */
  location: string
  /** Sanitized referrer: same-origin sanitized path only, or omitted entirely — never raw document.referrer. */
  referrer: string | undefined
}

export function buildSanitizedAnalyticsPageDescriptor(input: {
  pathname: string
  searchParams: URLSearchParams
  previousSanitizedPath: string | null
  origin: string
}): PortalAnalyticsPageDescriptor
```

Internally, this function:

1. **Replaces dynamic identifiers with route templates** — matches `pathname` against a
   fixed, exhaustive list of route patterns (Section 6a.1's table, encoded as literal
   string/regex pairs, not a dynamic route-scanning mechanism) and substitutes any
   matched dynamic segment with its template token (`:id`). Examples (subject to the
   verified table above, not invented beyond it): `/requests/abc123` → `/requests/:id`;
   `/share/design/xyz789` → `/share/design/:id`.
2. **Strips all query parameters by default**, then re-adds only parameters present in
   the Section 6a.2 allowlist, with their value passed through unchanged (since every
   allowlisted parameter is already a fixed enum/flag by construction — no further
   value-transformation is needed beyond the allowlist membership check itself).
3. **Never includes `q`, `requestId`, `seedDesignId`, `designId`, `etsyRecommendationId`,
   or `returnTo`** — enforced by the allowlist being a closed set (steps 2's "only
   re-add if present in the allowlist" logic structurally cannot leak these; there is no
   separate denylist to keep in sync).
4. **Sets `title` from a fixed, route-template-keyed lookup table** (e.g.
   `{ '/': 'Discover', '/catalog': 'Catalog', '/requests/:id': 'Print Request Detail',
   '/share/design/:id': 'Shared Design' }`), **never** from `document.title` — this
   deliberately diverges from GA4's documented default behavior (which reads
   `document.title` at event-fire time) specifically because `/share/design/[id]`'s
   real `<title>` contains the actual design title (verified:
   `portalDesignShareMetaService.ts` sets `title: meta.title` — the design's real name —
   in that route's metadata), which is prohibited customer/catalog content per Section
   12's boundary even though it is otherwise public-facing SEO content. Using a fixed
   `"Shared Design"` label for every instance of this route avoids sending any specific
   design's name to Google Analytics.
5. **Builds `location` from the sanitized `path` + sanitized query string**, appended to
   the already-resolved Portal origin (`getPortalSiteOrigin`) — never
   `window.location.href`.
6. **Sets `referrer` to the previous *sanitized* path** (tracked via the hook's own
   `useRef`, not the browser's `document.referrer`) when the previous navigation was
   itself an in-app tracked page view, or **omits the field entirely** on the very first
   page view of a session or whenever the browser's referrer would otherwise reflect an
   external/unsanitized source. This directly satisfies the requirement to prevent a
   previous request ID, design ID, search query, or customer-related route from leaking
   through the default referrer mechanism — GA4's default `page_referrer` reads
   `document.referrer`, which for an in-app client-side navigation is the *browser's*
   previous full unsanitized URL (potentially `/requests/abc123?tab=working`); this
   Plan's design never reads `document.referrer` at all.
7. **Fails closed on unknown routes**: if `pathname` does not match any entry in the
   fixed route-template list, `path` resolves to a single generic label (`/other`) and
   `title` resolves to a single generic label (`"Page"`) — the function **never** falls
   back to sending the raw, unmatched pathname. **Query parameters are dropped
   unconditionally for `/other`** (the standing per-route allowlist from step 2 does
   not apply to the unknown-route fallback) — an unrecognized route gets zero query
   parameters, full stop, rather than reusing the allowlist that was designed for known
   routes. This is a defense-in-depth tightening (per second-pass Formal Review, Finding
   4): without it, a future unknown route that happened to reuse an existing allowlisted
   parameter *name* (e.g. its own unrelated `tab` param) could leak that value even
   though the route was never reviewed for that parameter's safety on it. This also
   covers any future route added to Portal without a corresponding update to this
   sanitizer — the safe failure is under-specific analytics data, never leaked raw URLs
   or query values.
8. **Narrow input, narrow output**: the function's return type is a closed
   `PortalAnalyticsPageDescriptor` object with exactly four fields — no method exists
   for a caller to pass through an arbitrary extra field. `portalAnalyticsService`
   (Section 6a.4) accepts only this type, never a raw URL string or a general
   `Record<string, unknown>` event-parameter bag.

### 6a.4 Analytics service — narrowed input (amendment to Section 5/16)

`portalAnalyticsService.trackPageView` is revised from its original
`trackPageView(url: string)` signature to:

```ts
export function trackPageView(descriptor: PortalAnalyticsPageDescriptor): void
```

The service performs **zero** additional data derivation — it only forwards the
already-sanitized `descriptor` fields into `gtag('event', 'page_view', { page_location:
descriptor.location, page_path: descriptor.path, page_title: descriptor.title,
...(descriptor.referrer ? { page_referrer: descriptor.referrer } : {}) })`, guarded by
the existing `typeof window.gtag === 'function'` check (Section 5/10). This closes the
gap the external review identified: the service's input is now **narrow by
construction** (a sanitized descriptor, not a URL or an open parameter bag), so no
future call site can accidentally widen what reaches `gtag` without also changing the
sanitizer.

### 6a.5 De-duplication semantics (third revision — required correction 1, this session)

**Revision history (recorded for the record, not left silent):**

1. The first version of this section de-duplicated directly on the sanitized route
   string. The second Formal Review pass found this under-counted genuine navigations
   between two different dynamic-segment resources (`/requests/abc123` →
   `/requests/xyz789`, both sanitizing to `/requests/:id`).
2. The immediately prior revision fixed that under-counting by de-duplicating on the
   **raw** `pathname + searchParams` state instead, reasoning that GA4 recording
   "duplicate-looking" page views for two different raw URLs that both drop to the same
   sanitized descriptor (e.g. `?q=shirt` → `?q=shirts`, both reported as plain
   `/catalog`) was "acceptable, GA4-normal behavior, not a defect."
3. **The owner has explicitly rejected step 2's reasoning.** The requirement is
   unambiguous: "the implementation must not generate multiple indistinguishable page
   views merely because a dropped query parameter changed." Repeated identical
   `/catalog` page views caused only by search-box typing are **not** acceptable, and
   must not fire. This section is revised a third time to satisfy both the original
   owner requirement (no spurious events from dropped-parameter changes) **and** the
   second Review's requirement (no under-counting between different dynamic-segment
   resources) simultaneously — which step 1 and step 2 each solved only one at a time
   because each used a single, one-dimensional comparison key. The fix is to stop
   trying to satisfy both requirements with one key, and instead use three distinct,
   purpose-built values, exactly as required.

**Final design: three distinct values, three distinct jobs.**

```ts
export type PortalAnalyticsNavigationIdentity = {
  /** Raw pathname (not sanitized) — the only source of "which resource" distinction
   *  for dynamic-segment routes. Never passed to gtag; local to the hook only. */
  rawPathname: string
  /** Only the Section 6a.2-allowlisted categorical query values, normalized (sorted,
   *  fixed key order) so parameter ordering never causes a spurious mismatch.
   *  `category` is reduced to the same fixed presence marker used by the reported
   *  descriptor (Section 6a.2), matching what the descriptor itself would report. */
  normalizedApprovedQuery: string
}

export function buildNavigationIdentity(
  pathname: string,
  searchParams: URLSearchParams,
): PortalAnalyticsNavigationIdentity {
  // Builds normalizedApprovedQuery using the EXACT SAME allowlist table as
  // buildSanitizedAnalyticsPageDescriptor (Section 6a.2/6a.3) — not a second,
  // independently-maintained allowlist. Both functions import the one shared
  // allowlist constant so they can never drift out of sync with each other.
}

function navigationIdentityKey(identity: PortalAnalyticsNavigationIdentity): string {
  return `${identity.rawPathname}?${identity.normalizedApprovedQuery}`
}
```

**Consumption (revised this session — single-controller architecture):** this identity
mechanism is unchanged in substance, but is now evaluated inside
`usePortalAnalyticsController`'s single effect (Section 5.1), not a separately-named
`usePortalPageViewTracking` hook — the whole-Plan consistency correction consolidated
what was previously two candidate owners (a bootstrap script and a hook) into one. See
Section 5.1 for the exact, current effect body; it uses `buildNavigationIdentity`/
`navigationIdentityKey` exactly as shown above, gated additionally by the
`initializedRef` first-run branch that owns initialization.

**The three parts and their exact jobs, per the owner's required structure:**

1. **Local navigation identity** (`PortalAnalyticsNavigationIdentity` /
   `navigationIdentityKey`): determines whether a *meaningful* page-view navigation
   occurred. Used only inside the hook, held only in a `useRef`. **Never passed to
   `gtag`, never logged, never persisted, never traced, never exposed** — it exists
   solely as the hook's own internal comparison key and is discarded on every render
   except for the one `useRef` slot holding the most recent value.
2. **Sanitized analytics descriptor** (`buildSanitizedAnalyticsPageDescriptor`, Section
   6a.3, unchanged by this revision): determines the values reported to Google. Remains
   the only input `portalAnalyticsService.trackPageView` accepts (Section 6a.4,
   unchanged).
3. **Previous sanitized page descriptor** (`previousSanitizedPathRef`): supplies the
   safe internal referrer for the *next* call, per Section 6a.3 step 6. Never reads
   `document.referrer`. This is a value the hook already needed (it existed in the
   prior revision too, threaded as `previousSanitizedPath`); this revision makes its
   role explicit and keeps it strictly separate from the navigation-identity concern
   above — it is never used for the de-duplication comparison.

**Why `rawPathname` (not the full raw `pathname + searchParams.toString()`) is the
distinguishing input, per the owner's explicit rule:** the identity must "include the
raw pathname or another local-only instance value" so that two different values under
the *same* dynamic-segment template are correctly treated as different navigations. Only
the **pathname** portion needs to be raw for this — `/requests/abc123` and
`/requests/xyz789` already differ at the raw-pathname level, with no need to also keep
the query string raw. Keeping the query-string contribution to the identity restricted
to *only the allowlisted, normalized values* (not the full raw query string) is what
directly satisfies "include only normalized, approved categorical query state" and
"exclude every dropped parameter" — if the identity instead used the full raw query
string (as the immediately prior revision did), a `q=shirt` → `q=shirts` change would
change the raw pathname+query combination and incorrectly register as a new navigation,
reproducing exactly the bug the owner is now requiring be fixed.

**Verification against every required outcome:**

| Scenario | `rawPathname` | `normalizedApprovedQuery` | Identity key changes? | Fires? |
|---|---|---|---|---|
| `/catalog?q=shirt` → `/catalog?q=shirts` | `/catalog` (same) | `` (empty both times — `q` is not allowlisted) | No | **No** — matches the owner's required outcome exactly |
| `/catalog?discover=new` → `/catalog?discover=popular` | `/catalog` (same) | `discover=new` → `discover=popular` (different) | Yes | **Yes** — matches the required outcome |
| `/requests/abc123` → `/requests/xyz789` | `/requests/abc123` → `/requests/xyz789` (different) | `` (same, no allowlisted query on this route) | Yes | **Yes** — matches the required outcome, fixes the second Review's Finding 1 |
| `/share/design/abc123` → `/share/design/xyz789` | different | same (no allowlisted query on this route) | Yes | **Yes** — same reasoning, explicitly required by the owner for this route too |
| React Strict Mode double-invoke | same | same | No | **No** |
| No-op parent remount (no URL change) | same | same | No | **No** |
| Unknown route (fails closed in the descriptor, Section 6a.3 step 7) | raw pathname is still whatever it literally is, used only for the *identity* comparison, never sent anywhere | dropped entirely for unknown routes (matching the descriptor's own `/other` query-drop policy, Section 6a.3 step 7) | Depends on whether the raw pathname actually changed | Correctly fires once per genuinely different unknown-route visit, but **only ever reports the fixed `/other` label** via the descriptor — the raw pathname used for the identity comparison is never transmitted or logged anywhere, satisfying "treat an unknown route fail-closed, without transmitting or logging its raw value" |

**Parameter-ordering independence:** `normalizedApprovedQuery` is built by iterating the
Section 6a.2 allowlist in a fixed, defined order (not the order parameters happen to
appear in `searchParams`), so `?tab=working&from=discover` and `?from=discover&tab=working`
produce the identical `normalizedApprovedQuery` string and therefore do not spuriously
register as a new navigation.

**`category`'s identity contribution (corrected wording, per third-pass Formal Review
Finding 1):** the identity uses the exact same fixed presence marker for `category`
that the reported descriptor uses (Section 6a.2: `category=present` vs. absent, never
the raw document ID). This means the identity distinguishes "a category filter is
applied" from "no category filter is applied," but **does not** distinguish one
specific category from another — switching from `category=idA` to `category=idB`
produces the identical `category=present` marker both times, so this specific signal
treats "the customer switched to a different category" the same as "the customer stayed
in the same category." This is an accepted, explicitly scoped limitation for this
goal's page-views-only, no-deep-catalog-analytics scope (Owner Decision 5) — not a
claim that the identity can distinguish between two different real category IDs, which
it cannot with this marker. A future goal wanting to distinguish "moved to a different
category" from "stayed in the same category" as separate trackable navigation events
would need a dedicated, separately-reviewed categorical signal (e.g. templating the
category ID itself, which would require its own privacy review since it is still a
Firestore document ID) — out of scope here. (An earlier draft of this paragraph
incorrectly asserted, in the same breath, that a category-ID change "does change the
identity" — that was a self-contradiction with the presence-marker mechanism actually
described above and with Section 19's own test coverage, and has been removed.)

**Required direct tests (added to Section 19):** every row of the verification table
above becomes an explicit unit test — see Section 19's revised
`usePortalAnalyticsController.test.ts` coverage list.

**Explicit non-goal, unchanged:** search-behavior analytics beyond "did the customer
navigate to or away from a search state" (which is not itself tracked as a distinct
signal in this page-views-only design) remains out of scope — a future custom-event
goal, not a page-view concern.

---

## 6b. GA4 Enhanced Measurement — full feature disabled (revised — required correction 2, this session)

**Chosen authoritative page-view mechanism: manual, application-controlled page views**
(as originally proposed), **not** any GA4 automatic measurement. This Plan's manual
approach is required regardless, because Enhanced Measurement's automatic mechanisms
have no way to apply the Section 6a sanitization (route templating, query
allowlisting, fixed titles, referrer suppression) — every one of them reads raw
`document.location`/`document.title`/`document.referrer`/DOM state at the moment the
automatic event fires, which is exactly the leak this Plan exists to prevent. Manual
tracking is therefore not just preferred but **required** by this Plan's own privacy
boundary.

**Revision (this session):** the prior version of this section disabled only the
single "Page changes based on browser history events" checkbox and explicitly called
the other Enhanced Measurement features (site search, scrolls, outbound clicks, video
engagement, file downloads, form interactions) "unrelated to page-view duplication"
and deferred them as a separate future decision — while the Plan's own Owner Decision 5
simultaneously claimed "page views only." **This was an internal contradiction the
owner correctly rejected.** Site search specifically is not merely "unrelated" — GA4's
Enhanced Measurement Site search feature automatically detects the Portal's own `q`
query parameter (a documented default query-parameter name GA4 looks for) and reports
its value as `search_term` on an automatically generated `view_search_results` event.
This is a **direct violation** of the hard rule that customer-entered search text must
never reach Google — the Section 6a sanitizer only guards the *manual* `page_view`
event this Plan authors; it has no ability to intercept or sanitize an automatically
collected event GA4 generates entirely inside the browser tag itself, independent of
this application's code. The same reasoning extends to every other Enhanced
Measurement feature: each is an automatic, application-code-independent data-collection
path this Plan's sanitizer cannot reach, so "page views only" can only be true if **all**
of them are off, not merely the one that happened to cause visible duplicate page
views.

**Required GA4 property setup checkpoint** (out-of-repository, human-performed, not
executed in this session):

| Item | Detail |
|---|---|
| Exact console setting | GA4 Admin → **Data collection and modification → Data streams → [the production web data stream] → Enhanced measurement (gear icon) → turn the main "Enhanced measurement" switch OFF entirely** (not merely opening advanced settings and unchecking one sub-item — the top-level toggle itself must be off). |
| What must be disabled | **All** Enhanced Measurement automatic collection: page changes based on browser history events, scrolls, outbound clicks, **site search** (including the `q`-parameter-driven `search_term`/`view_search_results` auto-detection), video engagement, file downloads, and form interactions. None of these are deferred or treated as a separate future decision — all are explicitly out of scope for this release (Owner Decision 5, revised) and must be off at the property level, since no application-code sanitizer can intercept them. |
| Who performs it | The owner (or whoever creates/administers the GA4 property, per Owner Decision 6) — this is a Google Analytics console action, not a repository or Firebase action, and is not performed by this session. |
| When it occurs | At GA4 property creation, before the real Measurement ID is ever configured in any deployed environment (i.e. before the production-release checkpoint in Section 21 step 6) — must happen before, not after, real traffic starts flowing, since retroactively de-duplicating or un-collecting already-sent data in GA4 is not possible. |
| How it is verified in DebugView | Using GA4 DebugView (Admin → DebugView, with `gtag('set', 'debug_mode', true)` temporarily enabled on a test session, or a debug browser extension) during manual QA (Section 20): (a) navigate once and confirm **exactly one** `page_view` event per navigation, never two; (b) type into the catalog search box and confirm **no `view_search_results` event appears at all**; (c) scroll a long page, click an outbound link, and (if reachable) trigger a file download or video, and confirm **no** `scroll`/`click`/`video_*`/`file_download` event appears; (d) confirm only this Plan's manual `page_view` events and GA4's unavoidable baseline automatic events (`first_visit`, `session_start`, `user_engagement` — these are not part of the optional Enhanced Measurement feature set and cannot be disabled independently of removing the tag entirely; see Section 6c for how their page-context fields are still sanitized) appear in the event stream. |
| How the owner confirms one initial view + one view per navigation | Same DebugView session: load the app once (confirm exactly one `page_view` at initial load), then perform 3–5 client-side navigations (confirm exactly one new `page_view` per navigation, each showing the sanitized `page_path`/`page_title` values from Section 6a, never a raw path or dynamic title). |
| How it is documented for production release | Recorded in `docs/standards/DEPLOYMENT.md`'s GA4 section (Section 23) as a mandatory pre-launch checklist item — "Enhanced Measurement fully OFF, not just history-tracking" stated explicitly, not implied — and in the eventual Signoff artifact for `production-release` (roadmap item #6) — not this goal's Signoff, since no real property exists yet at this goal's Signoff. |
| How rollback affects the setting | Unsetting `NEXT_PUBLIC_GA_MEASUREMENT_ID` (Section 21.1 rollback) stops this Plan's manual tracking entirely but does **not** touch the GA4 property's console setting — the setting is a one-time property-configuration concern, not a per-deploy toggle, and remains correctly configured (fully off) across any code-level rollback. If the GA4 property itself were ever deleted and recreated, this checkpoint would need to be repeated for the new property, including re-disabling the full Enhanced Measurement switch (it defaults back to fully **on** for any newly created web data stream). |

This requirement is folded into **Owner Decisions 5 and 6** (Section 18) rather than a
separate numbered decision — Decision 5 states the "page views only, Enhanced
Measurement fully off" product/scope decision; Decision 6 carries the exact
out-of-repository console steps, since both concern the same GA4-property-setup action
performed by the same person at the same checkpoint. See the revised Decisions below.

---

## 6c. Global GA4 page-context sanitization and initialization order (new — required correction 3, this session)

**Problem this section fixes:** Section 6a's sanitizer only guards the values passed
into this Plan's own manual `gtag('event', 'page_view', {...})` call. But GA4
automatically attaches page-context parameters (`page_location`, `page_referrer`,
`page_title`) to **every** event it sends, including events this application does not
explicitly author — most importantly the baseline automatically collected lifecycle
events `first_visit`, `session_start`, and `user_engagement`, which GA4 generates on its
own regardless of Enhanced Measurement being fully off (Section 6b) and regardless of
`send_page_view: false`. If the GA4 tag's internal page-context state is never
explicitly overridden, those automatic events fall back to raw, unsanitized
`document.location`/`document.referrer`/`document.title` — silently reintroducing the
exact leak Section 6a exists to prevent, just on a different event name than
`page_view`.

**Mechanism used, per this session's whole-Plan correction ("GA4 stream configuration
mechanism"):** the previous design used repeated `gtag('set', ...)` calls ahead of a
single `gtag('config', ...)` and claimed (with softened certainty after the third-pass
Formal Review) that `set`-scoped values reach automatically-collected events. This
session replaces that mechanism with the **official, documented** `config`/`update:
true` pattern (Section 5.4): the initial `gtag('config', measurementId, {
send_page_view: false, page_location, page_title, page_referrer,
allow_google_signals: false, allow_ad_personalization_signals: false })` call, followed
on every later navigation by `gtag('config', measurementId, { update: true,
page_location, page_title, page_referrer })` — official documentation confirms
`update: true` merges values into the existing configuration and suppresses the
automatic duplicate page view a second bare `config` call would otherwise send. This is
the preferred, officially-documented mechanism for exactly this SPA use case, per the
owner's explicit instruction, and directly determines what this application's own
`page_view`/`config` events report.

**What remains an open, explicitly-gated question — not resolved by switching
mechanisms:** neither `set` nor `config`/`update: true` is documented anywhere found
during this session's research as guaranteed to also apply to GA4's separately,
automatically-collected lifecycle events (`first_visit`, `session_start`,
`user_engagement`), which GA4 generates on its own regardless of Enhanced Measurement
(Section 6b) or `send_page_view`. **This Plan does not claim the mechanism above
guarantees those three events inherit sanitized context.** This is the same open
question the third-pass Formal Review found undocumented for the prior `set`-based
design; switching to `config`/`update: true` does not manufacture new evidence that the
question is resolved, so this Plan continues to treat it as genuinely open rather than
re-asserting confidence the research does not support.

**Required correction 3, this session — the fallback that previously allowed
production enablement despite an unresolved automatic-event leak is removed.** A prior
revision permitted supplying a production Measurement ID if DebugView showed
`first_visit`/`session_start` still carrying raw context, on the reasoning that the
residual leak was "narrower" than not sanitizing at all. **The owner has explicitly
rejected this fallback.** The privacy boundary (Section 12) draws no distinction by
event frequency — "a once-per-session leak still violates the hard privacy boundary."
Section 6c.4 below defines the corrected, hard production gate that replaces the
removed fallback.

### 6c.1 Required initialization order (single-controller mechanism, Section 5.4)

Fully specified in Section 5.4 — the initial `gtag('config', ...)` call (with
`send_page_view: false` and both advertising-signal flags explicitly `false`) and every
subsequent `gtag('config', ..., { update: true })` call both live in
`portalAnalyticsService.ts`, invoked exclusively by `usePortalAnalyticsController`
(Section 5.1). `PortalAnalyticsScript` (Section 7) contains no sequencing logic at
all — it only loads `gtag.js` and defines the `dataLayer`/`gtag` stub. There is no
separate "6c.1 bootstrap script" distinct from Section 5's controller; the two were
unified in this session's correction to remove the dual-ownership conflict (Section 4).

### 6c.2 Service boundary and the script-readiness handshake (revised — required correction, this session)

The previous `setSanitizedPageContext` function (a `gtag('set', ...)` wrapper) is
**removed** and replaced by `initializeStream`/`updatePageContext` (Section 5.4), which
use `gtag('config', ...)` (initial) and `gtag('config', ..., { update: true })`
(subsequent) respectively — both accept only the narrow `PortalAnalyticsPageDescriptor`
type plus a plain `measurementId` string, preserving Section 6a.4's narrowed-input
guarantee for every exported function in this service, including `trackPageView`
(unchanged).

**Explicit success/failure return values (required correction):** all three functions
— `initializeStream`, `updatePageContext`, `trackPageView` — now return a `boolean`:
`true` only if `window.gtag` existed and the call was actually made, `false` if the
existing `typeof window.gtag === 'function'` guard (Section 10) caused a no-op. This
makes "did this call actually reach Google" a directly observable fact the controller
(Section 5.1) can branch on, rather than something inferred from "the function was
called" — which was the root cause of the initialization race this correction fixes.

**Script-readiness ownership:** `PortalAnalyticsBoundary` (not the controller, not
`PortalAnalyticsScript`) owns a `scriptReady` boolean (`useState(false)`), flipped to
`true` by an `onReady` callback passed into `PortalAnalyticsScript`'s stub `<Script>`
tag — `next/script`'s own documented lifecycle callback, which fires once the script
has actually executed (confirmed via current Next.js documentation this session,
distinct from `onLoad`, which cannot be used with `beforeInteractive` and is less
robust to a component that might re-mount after the browser has already cached the
script). `PortalAnalyticsBoundary` passes `scriptReady` into
`usePortalAnalyticsController` as a second parameter, alongside `config`.

**This does not introduce a second lifecycle owner.** `PortalAnalyticsScript` reports
a fact (the stub executed); it makes no decision about `gtag('config', ...)` or any
page view — those decisions remain exclusively inside
`usePortalAnalyticsController`/`portalAnalyticsService`, per Section 4/5's single-owner
requirement. `PortalAnalyticsBoundary` merely relays the boolean from one child
component to another; it never itself calls any analytics service function.

### 6c.3 Advertising and personalization settings — explicit, not implicit

**Correction to the original Plan's claim:** Sections 5 and 12 previously stated that
*not setting* `allow_google_signals`/`allow_ad_personalization_signals` meant those
capabilities were "not enabled." **This was incorrect and is corrected here.** Verified
against current Google Analytics documentation during this session: both parameters
default to `true` at the platform level (Google Signals and ad-personalization
signals are enabled by default for a new GA4 property/stream unless explicitly turned
off). Leaving them unset in this Plan's `gtag` calls would therefore **not** produce the
"no advertising/remarketing/demographic/Google Signals features enabled" outcome the
Plan's own Section 12/26 scope boundary requires — it would leave the platform default
(`true`, enabled) in effect.

**Fix:** both are now set to `false` explicitly, as part of the one initial
`gtag('config', measurementId, { ... allow_google_signals: false,
allow_ad_personalization_signals: false })` call (Section 5.4) — set once, at
initialization, applying for the life of the page. No advertising, remarketing,
demographic, personalization, enhanced-conversion, or user-provided-data feature is
enabled or approved anywhere in this architecture; this explicit `false` setting is the
only correct way to guarantee that, given the platform's own opposite default.

### 6c.4 Hard production gate for automatic-event leakage (new — required correction 3, this session)

**This section replaces the previously-permitted "accept a narrower residual gap"
fallback, which the owner has explicitly rejected.**

**Rule:** if any GA4 event — including `first_visit`, `session_start`,
`user_engagement`, or any other event GA4 generates, whether this application's code
authored it or not — contains any of the following, **production analytics enablement
must remain blocked**, with no exception and no severity threshold based on frequency:

- A raw `/requests/[id]` value
- A raw design ID
- A dynamic design title
- Search text
- A `returnTo` value
- Any request/customer/upload identifier
- Raw, unsanitized `page_location`
- Raw, unsanitized `page_referrer`
- Any other prohibited customer-related value (Section 12)

A once-per-session leak (e.g. `first_visit` firing exactly once and carrying a raw
`page_location`) still violates this rule in full — event frequency is irrelevant to
whether the privacy boundary was crossed.

**DebugView verification outcomes (Section 20's go/no-go step is revised to only these
two, replacing the prior three-outcome design):**

- **PASS:** every relevant event — the manual `page_view` events this Plan's own code
  sends, **and** every automatically-collected event GA4 sends on its own
  (`first_visit`, `session_start`, `user_engagement`, and any other event observed in
  DebugView) — uses sanitized context. No prohibited value from the list above appears
  in any event's parameters.
- **BLOCKED:** one or more events, of any kind, use raw or otherwise prohibited context.
  Production Measurement ID configuration and production analytics collection remain
  blocked. Resolving a BLOCKED outcome requires either (a) an architecture change this
  Plan does not yet specify (out of this goal's scope to design speculatively — would
  require its own Plan/Review pass once the exact failure mode is known), or (b) an
  explicit owner decision **not** to enable GA4 at all for Portal, given the platform's
  own automatic-event behavior cannot be fully controlled by this application's code.

**There is no `PASS WITH ACCEPTED RAW CONTEXT` outcome.** The prior revision's
"documented, non-blocking fallback" language in Section 20 step 6 and Owner Decision 6
sub-step (c) is removed and replaced by this two-outcome gate (Section 20/18 updated to
match, this session).

---

## 7. Script-loading lifecycle (revised this session — `PortalAnalyticsScript` is now thin)

- `next/script` with `strategy="afterInteractive"` — loads after hydration, does not
  block first paint or Time to Interactive, matches "no delay to meaningful rendering"
  acceptance criteria.
- **`PortalAnalyticsScript` contains no sequencing logic** (revised this session,
  Section 4/5): it renders exactly one `next/script` tag loading
  `https://www.googletagmanager.com/gtag/js?id=<measurementId>` plus one small inline
  script that only defines `window.dataLayer = window.dataLayer || []` and the
  `gtag(...args) { window.dataLayer.push(args) }` stub function — no `gtag('config',
  ...)` call, no descriptor computation, nothing route-aware. All of that now lives in
  `usePortalAnalyticsController` (Section 5), which calls `portalAnalyticsService`
  functions once `window.gtag` exists.
- Loaded **exactly once**: `next/script` de-duplicates by its `id` prop across
  navigations within the same document — Next.js's own documented behavior, not custom
  code. `PortalAnalyticsScript` is rendered once (inside `PortalAnalyticsBoundary`,
  mounted from `Providers.tsx`, Section 4.1), never remounted by route changes (route
  changes re-render `{children}`, not the persistent root composition).
- Script failure (network error, ad blocker) surfaces only via `next/script`'s
  `onError` — this Plan wires `onError` to a **silent, sanitized** dev-only console
  warning (`console.warn` guarded by `process.env.NODE_ENV !== 'production'`), never a
  thrown error, never surfaced to the customer, never sent anywhere. **Revised this
  session:** on a permanently blocked/failed script, `scriptReady` (Section 6c.2) never
  becomes `true`, so the controller's `if (!scriptReady) return` guard (Section 5.1)
  means it never even attempts `initializeStream` — this is a stronger guarantee than
  the prior design, which relied only on `initializeStream` itself no-oping.
- **Script readiness** is reported via the stub `<Script>` tag's `onReady` callback
  (Section 6c.2), owned by `PortalAnalyticsBoundary`, never by
  `PortalAnalyticsScript` itself or by polling/timers/DOM inspection — `next/script`'s
  own documented lifecycle callback is the sole readiness source, per the owner's
  explicit instruction not to invent a readiness mechanism when a supported one exists.
- No SSR reference to `window`/`document`/`gtag` — `PortalAnalyticsScript`,
  `PortalAnalyticsBoundary`, `usePortalAnalyticsController`, and `portalAnalyticsService`
  all guard every browser-global access with `typeof window !== 'undefined'` checks,
  consistent with the existing codebase's general SSR-safety pattern (`Providers.tsx`
  runs entirely client-side already).

---

## 8. Environment and hostname gating

**Configuration source of truth:** `portalAnalyticsConfig.ts`, a pure function mirroring
`getPortalSiteOrigin`'s signature (`(env: PortalAnalyticsEnv = process.env) => ...`) so
it is unit-testable without mocking global `process.env`.

```ts
export type PortalAnalyticsEnv = PortalSiteEnv & {
  NEXT_PUBLIC_GA_MEASUREMENT_ID?: string
}

export function resolvePortalAnalyticsConfig(env: PortalAnalyticsEnv = process.env): {
  enabled: boolean
  measurementId: string | null
} {
  const measurementId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || null
  if (!measurementId) return { enabled: false, measurementId: null }
  if (!isPortalAnalyticsHostAllowed(env)) return { enabled: false, measurementId: null }
  return { enabled: true, measurementId }
}
```

Where `isPortalAnalyticsHostAllowed(env)` is a new, analytics-specific wrapper
(`apps/portal/features/analytics/services/portalAnalyticsHostGate.ts`) that resolves
`getPortalSiteOrigin(env)`'s hostname the same way `isPortalSearchIndexingEnabled` does,
independently — see Owner Decision 2 (Section 18) for why this is not a direct call to
the SEO-named function.

- **Missing Measurement ID ⇒ disabled**, regardless of hostname (satisfies "analytics
  remains inactive when absent").
- **Reuses the same underlying hostname-resolution logic as `isPortalSearchIndexingEnabled`**
  (Section 3.7) via a dedicated `isPortalAnalyticsHostAllowed` wrapper (see Owner
  Decision 2, Section 18) rather than either inventing unrelated logic or calling the
  SEO-named function directly — this avoids coupling an analytics concern to an
  SEO-indexing concern while still reusing the already-reviewed, fail-closed,
  production-only gate behavior.
- Preview/tunnel hosts (`*.trycloudflare.com`) and `myprintrequest.dev` both resolve
  `enabled: false` under this gate — satisfies "preview environments do not accidentally
  report as production."
- Local (`localhost:3100`) resolves `enabled: false`.
- **Development strategy is Owner Decision 1** (Section 18) — this Plan's default
  recommendation is "disabled entirely in development," implemented as the natural
  consequence of reusing the production-only gate above, with no separate dev-specific
  GA4 property needed. This is the simplest option and avoids polluting a real GA4
  property with staff/dev traffic without needing a second Measurement ID to manage.

---

## 9. Measurement ID configuration

- Stored as `NEXT_PUBLIC_GA_MEASUREMENT_ID` in App Hosting environment configuration
  (`apphosting.yaml` env section or Firebase Console), **only for the production
  App Hosting backend**, at the later production-release checkpoint — never in
  `fresh-prints-dev`'s App Hosting config, since `isPortalSearchIndexingEnabled` already
  forces it inert there even if accidentally set.
- Not stored in Firestore `settings/*` (explicit instruction, also consistent with
  existing `SECURITY.md` pattern that provider secrets live in env/Secret Manager, not
  Firestore).
- Not a secret (Measurement IDs are public-by-design, embedded in every page's HTML) —
  does not need Firebase Secret Manager, unlike `GEMINI_API_KEY`/`RESEND_API_KEY`.
- `.env.example` gets one new documented line (implementation-phase change, not this
  Plan): `NEXT_PUBLIC_GA_MEASUREMENT_ID=` with a comment noting it's optional and
  production-only.

---

## 10. Failure behavior

| Failure mode | Behavior |
|---|---|
| Measurement ID absent | `PortalAnalyticsScript` renders nothing; hook no-ops. Zero console output. |
| Non-production hostname | Same as absent (Section 8). |
| Script blocked (ad blocker/extension) | `next/script` `onError` fires; dev-only sanitized `console.warn`; no thrown error; page continues rendering normally. |
| `window.gtag` undefined when a page view fires | `portalAnalyticsService.trackPageView` checks `typeof window.gtag === 'function'` first; silent no-op. |
| Network failure fetching `gtag/js` | Same as "script blocked" — `next/script`'s `onError` is the single failure surface for both cases from the app's perspective. |
| SSR / build time | All browser-global access guarded; `next/script` itself is SSR-safe by design (Next.js renders the tag, does not execute it server-side). |

No analytics failure can throw an unhandled exception, no analytics failure is ever
shown to the customer, and no analytics failure blocks navigation (the tracking hook
never awaits anything network-bound — `gtag()` is fire-and-forget by Google's own
design).

---

## 11. Duplicate-event prevention

Covered in detail in Sections 6, 6a.5, and 6b. Summary of the four specific mechanisms:

1. `send_page_view: false` on `gtag('config', ...)` — prevents GA4's own
   automatic-on-script-load initial page view from double-firing alongside this Plan's
   manual tracking.
2. **GA4 Enhanced Measurement's "Page changes based on browser history events" setting
   disabled at the property-setup checkpoint (Section 6b)** — prevents GA4's separate
   automatic *history-change* page-view mechanism from double-firing on every client-side
   App Router navigation. This is distinct from #1: `send_page_view: false` only
   suppresses the one-time page view GA4 would otherwise fire immediately after
   `gtag('config', ...)` runs; it does not affect Enhanced Measurement's ongoing
   history-based auto-tracking, which is a separate GA4 property setting entirely.
3. The Section 6a.5 **navigation identity** guard in `usePortalAnalyticsController`
   (Section 5.1, the single-controller architecture) — prevents React Strict Mode's
   dev-only double-invoke, any no-op remount, and any dropped-parameter-only URL change
   from double-firing, while still correctly firing once per genuine navigation even
   when two different navigations sanitize to the identical templated route (e.g.
   `/requests/abc123` → `/requests/xyz789`, both `/requests/:id`) — the navigation
   identity (raw pathname + normalized allowlisted query) decides *whether* to fire; the
   sanitized descriptor (Section 6a.3) decides only *what* is reported. The same
   `initializedRef` guard (Section 5.3) additionally ensures the *initial* page view is
   sent exactly once, distinct from and in addition to this per-navigation guard.
4. `next/script`'s built-in `id`-based de-duplication — prevents the GA4 loader script
   itself from being injected twice across re-renders of the persistent root layout.

---

## 12. Privacy and consent strategy

**Repository requirement:** none exists today (no consent infrastructure, Section 3.12).

**Google Analytics technical requirement:** GA4 collects, at minimum, IP-derived
approximate location (Google's own IP-anonymization-by-default behavior for EEA-region
traffic), device/browser/OS metadata, and page URLs, even under the minimal-event design
in this Plan.

**Owner product decisions required (Section 18, items 3 and 7)**\:
whether to load immediately under current policy, gate behind a consent banner, or
require legal review before either. This Plan **defaults to recommending** the
narrowest technically-correct option — page-views-only, no advertising features, no
`user_id`, no Google Signals — but does **not** decide the consent-banner question,
since that is a product/legal call outside this Plan's authority.

**PII and prohibited-data boundary (hard constraint, applies regardless of the owner's
consent decision):**

- No names, emails, usernames, customer/request IDs, artwork filenames, design titles,
  or search strings are ever passed as an event parameter. **Amendment: this boundary is
  now enforced structurally, not just asserted** — Section 6a's
  `buildSanitizedAnalyticsPageDescriptor` is the single mandatory choke point between raw
  navigation state and `gtag`, verified against the exhaustive route/query inventory in
  Section 6a.1/6a.2 rather than an unverified general claim that "no route embeds PII."
  In particular: `/requests/[id]`'s Firestore document ID is templated to `/requests/:id`
  (never sent raw); the free-text `q` search parameter is dropped entirely; the `returnTo`
  parameter (which can itself embed a `/requests/:id`-shaped path with its own nested
  query string) is dropped entirely; and `/share/design/[id]`'s dynamic `<title>`
  (confirmed to contain the real design title via `portalDesignShareMetaService.ts`) is
  never used as the analytics `page_title` — a fixed, route-template-keyed title is used
  instead (Section 6a.3 step 4).
- No `user_id` is sent (Owner Decision — Section 18 item 6 covers whether this changes
  later; default is no).
- No advertising/remarketing/demographic/Google Signals features are enabled. Verified
  against current Google Analytics documentation: both `allow_google_signals` and
  `allow_ad_personalization_signals` default to `true` (enabled) at the platform level,
  so this Plan **explicitly sets both to `false`** as part of the one initial
  `gtag('config', measurementId, { ... })` call (Section 5.4/6c.3) — the only correct
  way to guarantee the "no advertising/Google Signals" outcome, given the platform's
  own opposite default. A future goal could opt in to either only with separate
  Plan/Review.
- No session replay, no third-party heatmap script — out of scope entirely, not
  referenced anywhere in this architecture.

---

## 13. CSP and security implications

Per Section 3.8: **no CSP exists in Portal today.** Adding GA4 script/beacon origins
(`https://www.googletagmanager.com`, `https://www.google-analytics.com`,
`https://analytics.google.com`) requires **no CSP relaxation**, because there is no CSP
to relax. This Plan explicitly does **not** introduce a new CSP as a side effect of
adding analytics — that would be an unreviewed, unplanned security-hardening change
bundled into an unrelated feature, which the CLAUDE.md/FreshForge scope rules forbid.

If a future security-hardening goal adds a CSP to Portal, that goal's Plan must include
`script-src https://www.googletagmanager.com`, `connect-src https://www.google-analytics.com
https://analytics.google.com https://www.googletagmanager.com`, and (per Section 3.5)
`frame-src https://www.youtube-nocookie.com https://player.vimeo.com` for the existing
Help video embeds. This Plan records that dependency in
`docs/project/DECISIONS.md`/`RISK_REGISTER.md` (Section 23) so it is not forgotten when
that future goal begins, but does not act on it now.

No `firestore.rules`, `storage.rules`, Cloud Function, or Firestore index change is
required anywhere in this architecture — confirmed, since nothing in this design reads
or writes Firestore/Storage.

---

## 14. Accessibility impact

None. No new visible UI, no new focusable element, no new ARIA surface. The analytics
script and hook produce no DOM output (script tags render outside the accessibility
tree).

---

## 15. Performance impact

- `strategy="afterInteractive"` ensures GA4 never contributes to First Contentful
  Paint / Largest Contentful Paint / Time to Interactive measurements.
- `gtag.js` is Google-hosted and cached across most sites a user visits; no bundle-size
  impact on Portal's own JS bundle (loaded via `<script src>`, not imported/bundled).
- The tracking hook's per-navigation work is O(1): one string comparison, one
  conditional `gtag()` call.
- No additional Firestore/Storage read, write, or Cloud Function invocation is
  introduced anywhere — this is a pure client-side, Google-hosted concern.

---

## 16. Exact proposed files to modify (rewritten this session for the single-controller architecture)

| File | Layer | Change | Why | Tests |
|---|---|---|---|---|
| `apps/portal/features/analytics/services/portalAnalyticsHostGate.ts` (new) | Service | `isPortalAnalyticsHostAllowed(env)` — dedicated analytics hostname gate, independent of `isPortalSearchIndexingEnabled` | Avoids coupling the analytics concern to the SEO-indexing concern under a shared function (Owner Decision 2) | Unit tests mirroring `portalSearchIndexing.test.ts`'s existing coverage shape, `[NEEDS REPO CHECK: confirm exact existing test file name before Implement]` |
| `apps/portal/features/analytics/services/portalAnalyticsConfig.ts` (new) | Service | Pure `resolvePortalAnalyticsConfig(env)` per Section 8, calls `isPortalAnalyticsHostAllowed` | Single source of truth for enabled/measurementId, unit-testable without `process.env` mocking | Env-matrix unit tests: missing ID, dev host, prod host, tunnel host, `www.` prod host |
| `apps/portal/features/analytics/services/portalAnalyticsSanitizer.ts` (new) | Service | Pure `buildSanitizedAnalyticsPageDescriptor(input)` per Section 6a.3 (route templating, query allowlisting, fixed titles, referrer suppression, fail-closed unknown-route handling) **and** `buildNavigationIdentity`/`navigationIdentityKey` per Section 6a.5 (raw pathname + normalized allowlisted-query identity). Both functions import the same shared Section 6a.2 allowlist constant so they cannot drift out of sync. | Single mandatory choke point between raw navigation state and `gtag`; the structural enforcement of the Section 12 privacy boundary, plus the three-part identity/descriptor/referrer separation required for correct de-duplication | Tests per Section 19: every route in Section 6a.1's table templates correctly, every param in Section 6a.2 resolves to its stated disposition, unknown routes/params fail closed, `referrer` never reflects raw `document.referrer`, every row of Section 6a.5's verification table |
| `apps/portal/features/analytics/services/portalAnalyticsService.ts` (new) | Service | `initializeStream(input): boolean`, `updatePageContext(input): boolean`, and `trackPageView(descriptor): boolean` (Section 5.4/6c.2, revised this session to return an explicit boolean) — all three guarded `gtag` calls only, all three accept only `PortalAnalyticsPageDescriptor` (plus a plain `measurementId` string for the first two) | Isolates all `window.gtag` access behind one tested boundary; the boolean return makes "did this call actually reach Google" directly observable by the controller, closing the initialization race the prior unconditional-commit design allowed; `initializeStream` is the ONLY function that ever calls `gtag('config', ...)` without `update: true`; `updatePageContext` uses the official `update: true` mechanism so navigations never re-initialize the stream or auto-fire a duplicate page view; none of the three accepts a raw URL or arbitrary event-parameter object | Tests: no-op AND returns `false` when `gtag` undefined, for all three; `initializeStream` returns `true` and calls `gtag('config', measurementId, {...})` with exactly `send_page_view:false`, sanitized `page_location`/`page_title`/optional `page_referrer`, `allow_google_signals:false`, `allow_ad_personalization_signals:false`, and no other fields; `updatePageContext` returns `true` and calls `gtag('config', measurementId, { update:true, ...sanitized fields })` with no other fields and never `send_page_view`; `trackPageView` returns `true` on success; never throws; rejects (at the type level) any input shape other than the documented ones |
| `apps/portal/features/analytics/hooks/usePortalAnalyticsController.ts` (new — renamed/consolidated from the prior `usePortalPageViewTracking.ts`) | Hook | **The single authoritative owner of the entire analytics lifecycle** (Section 5.1, revised this session for the script-readiness handshake): `usePathname`/`useSearchParams` effect, plus a `scriptReady` parameter (Section 6c.2); excludes `/firebase-debug` first; on first run, returns immediately if `scriptReady` is `false` (never attempts initialization); otherwise builds the initial descriptor and calls `initializeStream`, committing `initialized`/`lastIdentityKey`/`previousSanitizedPath` state **only if `initializeStream` returns `true`**, then calls `trackPageView`; on every later run (reached only after a successful initialization), checks the Section 6a.5 navigation identity, and if meaningful, calls `updatePageContext` + `trackPageView` with a freshly-built descriptor | Consolidates what was previously split across a Server Component root layout, an inline bootstrap script, and a separate hook into one named, authoritative layer; the `scriptReady` gate and success-gated state commit close a real initialization race an owner-identified correction found (Section 33.6/34) | Tests (Section 19): controller run before script readiness commits nothing and calls nothing; readiness flipping false→true without navigation produces exactly one initial `initializeStream`+`trackPageView` pair using the same descriptor; readiness remaining false across repeated renders never initializes; Strict-Mode-style replay after readiness still produces exactly one pair; a repeated readiness-true signal does not duplicate anything; navigation before readiness sends nothing and, once ready, uses the *current* route, not a stale earlier one; `initializeStream` reporting failure commits no state and permits a later successful retry; every row of Section 6a.5's verification table for later navigations; `updatePageContext` always called before `trackPageView` on the same descriptor for navigations 2+; `initializeStream` never called a second time once successful; skips `/firebase-debug`; no-ops when config disabled |
| `apps/portal/features/analytics/components/PortalAnalyticsScript.tsx` (new, now thin — revised this session) | Component (thin) | `'use client'`, renders one `next/script` tag loading `gtag.js` plus one inline script defining only `window.dataLayer`/the `gtag` stub function (Section 7) — **no** `gtag('config', ...)` call, **no** descriptor computation, nothing route-aware; renders nothing when disabled. **Revised this session:** accepts an `onReady` callback prop, wired to the stub `<Script>` tag's `onReady` (`next/script`'s documented lifecycle callback), and otherwise unchanged — this is its only new responsibility, and it still makes no decision about what `onReady` firing *means* | Loads the external script only; all sequencing logic (including deciding what script-readiness means) remains in `usePortalAnalyticsController`/`PortalAnalyticsBoundary`, never here — this component only reports the raw fact that the stub executed | Snapshot/render test: renders null when disabled; renders the script + stub-defining inline script when enabled; asserts the component's source contains **no** `gtag('config'`/`gtag('set'` call, route sanitization, or identity logic of any kind (comment-stripped source check) — a regression test proving sequencing logic never leaks back into this component; asserts the component introduces no `useState`/`useRef` of its own |
| `apps/portal/features/analytics/components/PortalAnalyticsBoundary.tsx` (new, revised this session for the readiness handshake) | Component (thin) | `'use client'`, owns a `scriptReady` `useState(false)` boolean, renders `<PortalAnalyticsScript config={config} onReady={() => setScriptReady(true)} />` and, wrapped in `<Suspense fallback={null}>`, a small inner client component that calls `usePortalAnalyticsController(config, scriptReady)` — the `<Suspense>` boundary is required because `usePortalAnalyticsController` calls `useSearchParams()` (Section 4.2) | Provides the Suspense boundary Next.js requires for any Client Component calling `useSearchParams()` under prerendering, without wrapping the rest of the app's `{children}` in a boundary that could delay hydration; owns the readiness handshake state so neither `PortalAnalyticsScript` nor the controller need to coordinate it themselves | Render test: renders inside a `<Suspense>` without throwing during a simulated static-render pass; renders nothing when config disabled |
| `apps/portal/features/analytics/types/portalAnalytics.types.ts` (new) | Types | `PortalAnalyticsEnv`, `PortalAnalyticsConfig`, `PortalAnalyticsPageDescriptor` (Section 6a.3), `PortalAnalyticsNavigationIdentity` (Section 6a.5), minimal `Gtag` window-global type augmentation covering `'config'`/`'event'`/`'js'` command shapes (no `'set'` command needed — removed per Section 6c's mechanism change) | Strict TypeScript, no `any`, matches Coding Standards | Type-only, covered by `tsc --noEmit` |
| `apps/portal/app/layout.tsx` | Component (existing) | Compute `resolvePortalAnalyticsConfig(process.env)` (a pure function of `process.env` only — **no** pathname/searchParams access, confirmed possible in a Server Component) and pass it as a single `config` prop into `<PortalAnalyticsBoundary config={config} />` inside `<body>` (not `<head>` — `PortalAnalyticsBoundary` is a component tree, not a raw script tag, so it belongs in `<body>` alongside `<Providers>`, consistent with how `next/script` components are conventionally placed), alongside the existing theme-init script in `<head>` | Root layout is the one place guaranteed to render on every request/route; it resolves only **environment-derived** configuration, never claims to know the current URL (Section 4) | Existing SEO/root-layout regression tests must still pass (Section 19) |
| `apps/portal/app/providers.tsx` | Component (existing) | Add `<PortalAnalyticsBoundary config={config} />` (config threaded down from `layout.tsx` as a prop through `Providers`) as one more mounted child alongside the existing `<FirebaseDebugPanelMount />`, guarded the same way the existing `/firebase-debug` branch already is | `Providers` is the one client component guaranteed to mount on every route; mounting the boundary here (not directly in `layout.tsx`) keeps `layout.tsx` from needing to know about `/firebase-debug` exclusion logic, which already lives in `Providers.tsx` | Existing `Providers` tests (if any) plus new boundary-mounting test |
| `apps/portal/.env.example` | Config/docs | Add one documented, empty `NEXT_PUBLIC_GA_MEASUREMENT_ID=` line | Document the new optional var per existing convention | N/A (docs) |

**No proposed new files beyond the `features/analytics/` folder above** — everything is
justified by the layer boundary in Section 4; no additional abstraction (no Zustand
store, no React Context, no TanStack Query) is introduced since none is needed. The two
new components this session (`PortalAnalyticsBoundary`, and the renamed
`usePortalAnalyticsController`) exist specifically to resolve the two blocking
architectural conflicts identified in this correction pass (Section 4) — they are not
speculative additions.

---

## 17. Dependency impact

**None required.** `next/script` ships with the existing `next@^15.1.6` dependency
already in `apps/portal/package.json`. No `npm install` of any kind is proposed. If a
future goal wants a typed analytics SDK wrapper (e.g. `@next/third-parties`'s
`GoogleAnalytics` helper) instead of hand-rolled `next/script` tags, that would be a
`[NEEDS PLAN/REVIEW APPROVAL]` dependency addition — **not proposed here**, since the
hand-rolled approach above satisfies every acceptance criterion with zero new
dependencies and full control over `send_page_view`/consent-mode wiring.

---

## 18. Owner decisions required

1. **Development analytics strategy.** Recommended: disabled entirely (natural result of
   reusing `isPortalSearchIndexingEnabled`, Section 8) — no separate dev GA4 property.
   Consequence of choosing "separate dev property" instead: needs a second env var and
   a more complex config resolver; consequence of "same property with filters": GA4
   property-level traffic filters are configured in the Google Analytics console, not in
   this repo, and would need to be documented as a manual console step at the production
   checkpoint. **Blocks:** no — either choice is compatible with proceeding to
   Implement; only changes `resolvePortalAnalyticsConfig`'s exact logic.

2. **Hostname gating.** Recommended: production hostname only (`myprintrequest.com` /
   `www.myprintrequest.com`). **Per Formal Review finding (Section 28, item 3):**
   `isPortalSearchIndexingEnabled` has exactly four existing consumers today
   (`app/robots.ts`, `portalSiteMeta.ts`, `portalDesignShareMetaService.ts`,
   `portalHelpMeta.ts`), all SEO/metadata-related — reusing it directly for analytics
   gating works functionally (same fail-closed hostname logic) but conflates an
   SEO-indexing concern with an analytics-gating concern under a name that says
   nothing about analytics, so a future change to one could silently affect the other.
   **Revised recommendation:** implement a thin, analytics-specific wrapper (e.g.
   `isPortalAnalyticsHostAllowed(env)`) that calls the same underlying
   `getPortalSiteOrigin` hostname-resolution logic independently, rather than calling
   `isPortalSearchIndexingEnabled` directly — same fail-closed behavior, no shared
   coupling between the two concerns. This is a naming/structure refinement, not a
   logic change; `resolvePortalAnalyticsConfig` (Section 8) should be implemented
   against this dedicated wrapper. **Blocks:** no — either approach can proceed to
   Implement, but the dedicated-wrapper approach is now the Plan's recommended default.

3. **Consent strategy (revised, this session, per the owner's exact required wording):**
   Implement the inert analytics foundation now, **without** a consent banner in this
   goal. Do not configure a real Measurement ID or enable production collection.
   Production analytics remains blocked until privacy disclosure and consent
   requirements are reviewed and explicitly approved. **This decision is settled by the
   owner's instruction, not left open as options (a)/(b)/(c)** — the prior version of
   this Plan presented three unresolved options and recommended one; this revision
   records the owner's actual chosen posture directly. **Blocks:** the inert
   code/tests/typecheck/build/lint may proceed through Implement and Test regardless;
   **does block** any real Measurement ID configuration or production analytics
   collection until privacy disclosure (Decision 7) is separately reviewed and approved.

4. **Test/staff traffic exclusion (revised wording, same substance):** No
   application-level staff exclusion is needed during this goal, because development
   and preview hosts are already disabled by the hostname gate (Decision 2) — there is
   no staff-identification mechanism reachable in Portal (customers/guests only, per
   `ARCHITECTURE.md`) for an application-level filter to key on in the first place. Any
   future GA4 internal-traffic filter (a GA4 property-level "internal traffic" rule
   keyed on IP address) is a **production-property console checkpoint**, configured at
   the same GA4-property-setup step as Decision 6 — not an application identifier this
   Plan's code would need to compute or send. **Blocks:** no.

5. **Event scope (revised, this session, per the owner's exact required wording): page
   views only. Disable Enhanced Measurement completely for the production web data
   stream** (Section 6b — the full top-level Enhanced Measurement switch, not merely
   its history-tracking sub-option). No custom interaction events, no site search
   auto-detection, no scroll/click/video/file-download/form-interaction auto-collection.
   **This is a correction to the prior version of this Plan**, which recommended "page
   views only" while simultaneously deferring the other Enhanced Measurement features as
   "unrelated" and a "separate, later decision" — an internal contradiction, since
   Enhanced Measurement's Site search sub-feature specifically auto-detects Portal's own
   `q` search parameter and would send customer search text to Google regardless of
   anything this Plan's own sanitizer does, making "page views only" false unless
   Enhanced Measurement is fully off. **Blocks:** no for Implement/Test of the inert
   code; **does block** production analytics collection until the full Enhanced
   Measurement switch is confirmed off at the property level (Section 6b, folded into
   Decision 6's checklist).

6. **GA4 property and Measurement ID (revised, this session, per the owner's exact
   required wording):** the owner creates the GA4 property later, at the
   production-release checkpoint (never during this goal's Implement/Test against
   `fresh-prints-dev`), and at that same checkpoint: (a) **disables Enhanced Measurement
   completely** (Section 6b's full-switch-off checklist, not just history-tracking), (b)
   **verifies advertising settings are disabled** — confirms `allow_google_signals` and
   `allow_ad_personalization_signals` are both `false` for the events this Plan's code
   sends (Section 6c.3; these are set by the application code itself, not a separate
   GA4 console toggle, so this verification step is "confirm the deployed code is doing
   this," via DebugView event-parameter inspection, not a console setting to change),
   (c) **runs the Section 6c.4/20 step 6 hard production gate** — inspects every event
   GA4 sends (manual `page_view` events and every automatically-collected event) for
   any prohibited value (Section 6c.4's list). This gate has exactly two outcomes:
   **PASS** (every event uses only sanitized context — proceed to sub-step (d)) or
   **BLOCKED** (any event contains any prohibited value, regardless of frequency —
   production Measurement ID configuration and production analytics collection remain
   blocked; **there is no accept-and-proceed outcome**, correcting the prior revision's
   now-removed "documented, narrower residual gap" fallback), and only on a PASS outcome
   does (d) **supply the production Measurement ID**. **Blocks:** Implement/Test can
   proceed fully without a real ID (the architecture is designed to be inert without
   one); **does block** production analytics collection until all four sub-steps (a)–(d)
   are complete, in that order, with sub-step (c) resulting in a recorded PASS.

7. **Privacy disclosure.** A Privacy Policy and consent determination are required
   before production analytics collection. **This does not block implementation and
   automated testing of the fully inert code** (per Decision 3), **but it blocks real
   production enablement** — consistent with Decision 3's revised wording above.

### 18.1 Summary of what changed in this correction pass (this session)

The owner identified that the prior amendment's Decisions 3, 5, and 6 either left
unresolved options open where the owner had already decided, or contained an internal
contradiction (Decision 5's "page views only" claim alongside Decision 6's original
"only the history-tracking checkbox needs to be off" scope, which is inconsistent with
Site search's automatic `q`-parameter collection). This pass:

- **Decision 3** is revised from three open options to the owner's one settled posture:
  build the inert foundation now, no consent banner in this goal, block real
  Measurement ID/production collection until privacy review separately approves it.
- **Decision 4** is reworded for clarity (no substance change) to explicitly note that
  any future internal-traffic exclusion is a GA4 console-level concern, not an
  application-level identifier.
- **Decision 5** is revised to explicitly require the **full** Enhanced Measurement
  switch off, not merely history-tracking, resolving the contradiction the owner
  identified.
- **Decision 6** is revised to fold in: the full Enhanced Measurement checklist (not
  just history-tracking), an explicit advertising-settings verification step, and the
  DebugView verification checklist from Section 6b — as one ordered sequence of
  sub-steps (a)–(d).
- **Decisions 1, 2, and 7** are **unchanged** in substance from the prior amendment —
  they did not conflict with anything the owner's correction identified.

**Clarification retained from the prior amendment, still true:** the inert
implementation (every file in Section 16, including the Section 6a/6c sanitizer and
`gtag('set',...)` initialization sequence) may be built and fully tested — unit tests,
typecheck, build, lint, and even ad-blocked/absent-config manual QA — without a real
Measurement ID. **No production analytics collection may occur** until all of the
following have separately passed: (a) the privacy-disclosure decision (3/7), (b) a real
GA4 property exists with Enhanced Measurement **fully** disabled and advertising
settings verified (Section 6b/6c.3, Decision 6), and (c) the separate
`production-release` roadmap goal's own deployment checkpoint. This Plan's own
Implement/Test/Signoff phases do not require any of those three to be resolved, since
the architecture ships inert regardless.

---

## 19. Testing strategy

Per `docs/standards/TESTING.md` conventions (`npx tsx --test`, no root `npm test`):

```bash
npm run lint
npm run typecheck --workspace @fresh-prints/portal
npm run build:portal
```

Focused unit tests (new, `npx tsx --test` glob — file names revised this session for
the single-controller architecture):

```bash
npx tsx --test apps/portal/features/analytics/services/portalAnalyticsConfig.test.ts
npx tsx --test apps/portal/features/analytics/services/portalAnalyticsSanitizer.test.ts
npx tsx --test apps/portal/features/analytics/services/portalAnalyticsService.test.ts
npx tsx --test apps/portal/features/analytics/hooks/usePortalAnalyticsController.test.ts
npx tsx --test apps/portal/features/analytics/components/PortalAnalyticsScript.test.ts
```

Required coverage per test file:

- `portalAnalyticsConfig.test.ts`: missing ID ⇒ disabled; dev project id ⇒ disabled;
  prod `NODE_ENV` + unknown project id ⇒ enabled; `NEXT_PUBLIC_PORTAL_ORIGIN` override to
  a tunnel host ⇒ disabled; `www.myprintrequest.com` ⇒ enabled.
- **`portalAnalyticsSanitizer.test.ts` (new, per Formal Review required correction 1) —
  must explicitly cover:**
  - `/requests/<real-id>` (a realistic-looking Firestore-style document ID) never
    appears anywhere in the returned descriptor's `path` or `location` — only
    `/requests/:id` appears.
  - `/share/design/<real-id>` never sends the real identifier — only
    `/share/design/:id` appears, for at least two different real-looking IDs (proving
    it's templated, not coincidentally passed through).
  - Every other verified dynamic/static Portal route from Section 6a.1's table
    round-trips to its exact stated template (one test case per table row).
  - Raw search text (`?q=`) never appears in any returned descriptor field, for
    multiple representative free-text values including ones that look like they could
    be mistaken for a route segment.
  - Unknown/unlisted query parameters (a parameter name not in Section 6a.2's table) are
    dropped — descriptor's `location` contains no trace of them.
  - Only allowlisted categorical query values are ever included, and only using the
    exact allowlisted parameter names from Section 6a.2 (`tab`, `upload`, `from`,
    `mode`, `discover`, `detailTab`, `flow`, `step`; `category` only as the fixed marker
    per Section 6a.2, never the raw ID).
  - `returnTo` — including a value that itself embeds a `/requests/:id`-shaped nested
    path and query string — never appears in any returned descriptor field.
  - `requestId`, `seedDesignId`, `designId`, `etsyRecommendationId` never appear in any
    returned descriptor field, for both templated and non-templated routes.
  - The returned `title` is always one of the fixed route-template-keyed labels; a test
    asserts that for `/share/design/:id` specifically, the title is the fixed generic
    label regardless of what real design title metadata exists elsewhere in the app —
    i.e. the sanitizer itself, called with only `pathname`/`searchParams`, has no way to
    access or leak a real design title, since it is never passed one.
  - An unknown/unmatched route (a pathname not in Section 6a.1's table) resolves to the
    fixed fail-closed `/other` path and `"Page"` title — never the raw pathname.
  - `referrer` is `undefined` on the first call (no previous sanitized path) and equals
    the previous call's sanitized `path` on subsequent calls — never derived from
    `document.referrer` (the function does not accept `document.referrer` as an input at
    all, so there is no code path by which it could leak through).
  - Two raw URLs that sanitize to the same analytics route (e.g. `/catalog?q=shirt` and
    `/catalog?q=shirts`, both sanitizing to plain `/catalog`) produce byte-identical
    descriptors.
  - **`buildNavigationIdentity`/`navigationIdentityKey` (Section 6a.5, this session's
    correction) — every row of the Section 6a.5 verification table as a direct test:**
    `/catalog?q=shirt` → `/catalog?q=shirts` produces the **same** identity key;
    `/catalog?discover=new` → `/catalog?discover=popular` produces a **different**
    identity key; `/requests/abc123` → `/requests/xyz789` produces a **different**
    identity key (proving the Finding-1 fix is preserved even after this session's
    de-duplication redesign); `/share/design/abc123` → `/share/design/xyz789` produces
    a **different** identity key (same reasoning, explicitly required by the owner for
    this route too); `?tab=working&from=discover` and `?from=discover&tab=working`
    produce the **same** identity key (parameter-ordering independence); two different
    `category` document IDs both produce the identity's fixed presence marker, matching
    the descriptor's own `category` handling; an unknown route's raw pathname is used
    only for the identity comparison and is asserted to never appear in the identity
    key's *exported*/returned value in a way a caller could log or transmit (the
    identity type itself has no `toJSON`/serialization path other than the internal
    `navigationIdentityKey` string, which the hook keeps in a `useRef` only).
- `portalAnalyticsService.test.ts`: `window.gtag` undefined ⇒ `initializeStream`,
  `updatePageContext`, and `trackPageView` all no-op, no throw; `window.gtag` present ⇒
  `initializeStream` calls `gtag('config', measurementId, {...})` with exactly
  `send_page_view: false`, sanitized `page_location`/`page_title`/optional
  `page_referrer`, `allow_google_signals: false`, `allow_ad_personalization_signals:
  false`, and no other fields (assert the exact key set, not just that it "contains"
  the right fields); `updatePageContext` calls `gtag('config', measurementId, {
  update: true, ...sanitized fields })` with no other fields and specifically asserts
  `send_page_view` is **absent** from this call (it must never re-suppress/re-enable
  the automatic page view on an update call — only the initial call sets it);
  `trackPageView` calls `gtag('event', 'page_view', {...})` with exactly the
  descriptor's fields; call any of the three while config disabled ⇒ no-op for all;
  **all three functions' TypeScript signatures reject a raw string or an arbitrary
  object at compile time** (a type-only assertion, not a runtime test) — confirms none
  can accept arbitrary event parameters.
- `usePortalAnalyticsController.test.ts` (React Testing Library-style hook test, or a
  pure logic extraction if the repo's existing hook-testing convention is
  lighter-weight — `[NEEDS REPO CHECK: inspect an existing Portal hook test, e.g. one
  under apps/portal/features/*/hooks/*.test.ts, for the established hook-testing
  pattern before Implement]`), covering the full single-controller lifecycle (Section
  5) — **this is the most important test file in the feature, per the owner's required
  test list**:
  - **One initial mount produces exactly one `initializeStream` call and exactly one
    `trackPageView` call** — asserted as call counts of 1 each, not just "was called."
  - **React Strict Mode effect replay still produces exactly one `initializeStream`
    call and one initial `trackPageView` call** — explicit double-invoke simulation
    with identical `pathname`/`searchParams` both times; the second invocation must take
    the "later navigation" branch (Section 5.3), see identical navigation identity, and
    return without any additional service call.
  - **`PortalAnalyticsScript` re-render does not produce another `initializeStream`
    call** — since the script component and the controller hook share no state, this is
    really a test that the controller's own `initializedRef` is unaffected by sibling
    re-renders, simulated by re-rendering the test harness without changing
    `pathname`/`searchParams`.
  - **Root provider (`Providers.tsx`/`PortalAnalyticsBoundary`) re-render does not
    produce another `initializeStream` call** — same mechanism, simulated by
    re-rendering the harness with a changed unrelated prop while `pathname`/
    `searchParams` stay the same.
  - **First client navigation produces exactly one additional `updatePageContext` call
    and one additional `trackPageView` call** (total: 2 calls to each across
    initialization + one navigation).
  - **The initial descriptor and the first page-view descriptor are the same sanitized
    descriptor object** — the controller computes the descriptor once per effect run
    and passes the identical reference/value to both `initializeStream` and
    `trackPageView` (mirrored for `updatePageContext`/`trackPageView` on later
    navigations) — assert this by capturing both call arguments and comparing them for
    deep equality (or reference equality, since the implementation should pass the same
    object), not by assuming it.
  - **The controller does not independently resend the initial page view after
    initialization** — i.e. no code path exists where `trackPageView` fires with the
    *initial* descriptor a second time after the first render; every subsequent call
    must use a freshly-built descriptor for the *current* navigation.
  - Every row of Section 6a.5's verification table for navigations after the first:
    dropped-param-only change does NOT fire; different dynamic-segment value under the
    same template DOES fire (`/requests/abc123` → `/requests/xyz789`,
    `/share/design/abc123` → `/share/design/xyz789`); different allowlisted categorical
    value DOES fire; parameter-ordering changes do NOT fire.
  - `/firebase-debug` ⇒ never calls any service function (checked before both the
    initialization branch and the identity comparison).
  - Disabled config ⇒ never calls any service function, on mount or on any navigation.
  - **No event when `gtag` is unavailable** (covered transitively via the service
    tests, but also asserted at the hook level).
  - **On every firing navigation (after the first), `updatePageContext` is called
    before `trackPageView`, both with the identical descriptor** (Section 5.1 step 2)
    — assert call order and the descriptor argument equality.
  - **No event when consent has not been granted**, if consent gating is selected per
    Owner Decision 3 (test added only if/when that decision requires it — not
    applicable to the inert default architecture, which has no consent gate to test
    yet).
- **`PortalAnalyticsScript.test.ts` (revised this session — the component is now thin) —
  must explicitly cover:**
  - Renders exactly one `next/script` tag for `gtag.js` and one inline script defining
    only `window.dataLayer`/the `gtag` stub function, when enabled.
  - **The rendered inline script contains no `gtag('config'` or `gtag('set'` call of any
    kind** — a direct regression test proving sequencing logic never leaks back into
    this component (this session's architectural correction moved all such logic into
    `usePortalAnalyticsController`/`portalAnalyticsService`).
  - Renders `null`/nothing when `config.enabled` is false — no script tags of any kind.

**Note on Enhanced Measurement duplication (Section 6b):** this cannot be unit-tested
in-repo — it is a GA4 property configuration state that only exists once a real
property is created, outside this repository's test surface. It is verified via GA4
DebugView during manual QA (Section 20), not via `npx tsx --test`. This includes the
**full** Enhanced Measurement switch (not just history-tracking) and Site search's
`q`-parameter auto-detection specifically — none of these can be asserted from
application code, since they are GA4 tag-internal behaviors independent of anything
this repository's code does.

**Critical build-time verification (required this session — Suspense boundary):**
`npm run build:portal` (Section 19's build command, already run for every Portal
change) is itself the authoritative test that `PortalAnalyticsBoundary`'s `<Suspense>`
wrapper is correctly placed — if it is missing or misplaced, the build fails outright
with Next.js's "Missing Suspense boundary with useSearchParams" error (Section 4.2),
not a silent runtime issue. This is why Section 4.2 treats the Suspense requirement as
a hard build-time fact, not a style choice: the existing test command already catches a
regression here without any new tooling.

Existing regression suites that must be rerun (touched shared files):

- Any existing test for `apps/portal/app/providers.tsx` or root layout, if one exists —
  `[NEEDS REPO CHECK: confirm at Implement time via
  Glob apps/portal/app/**/*.test.ts and apps/portal/app/providers.test.ts]`.
- Portal SEO regression tests (`portalSiteMeta`/`portalSearchIndexing` consumers), since
  this Plan reuses but does not modify those functions — rerun to confirm zero
  behavioral change: `[NEEDS REPO CHECK: locate exact test file names under
  apps/portal/features/brand/**/*.test.ts before Implement]`.

Manual/adversarial cases explicitly required before Test-phase signoff:

- Missing `window`/`gtag`, blocked script (simulate via browser ad-blocker or DevTools
  request-blocking), absent configuration (unset env var) — confirms failure containment
  end-to-end, not just at the unit level.
- Prohibited-PII-field check: manually inspect the Network tab's `collect?...` beacon
  request **and** GA4 DebugView's per-event parameter panel (Section 20 steps 10/11)
  for the actual values of `page_location`, `page_path`, `page_title`, and
  `page_referrer` on real navigations to `/requests/[id]` and `/share/design/[id]` with
  real IDs, to confirm no request/customer/design identifier or dynamic design title
  appears in any of the four fields — this is the end-to-end proof that the Section 6a
  sanitizer's unit tests reflect what actually leaves the browser, not just what the
  pure function returns in isolation.

---

## 20. Manual owner QA plan (for the later Test phase — not performed now)

1. Confirm analytics is inactive with no `NEXT_PUBLIC_GA_MEASUREMENT_ID` set (no GA
   network requests in DevTools, no console errors).
2. Set a real or test GA4 Measurement ID in a local `.env.local` against
   `fresh-prints-dev`'s project id — confirm it stays **disabled** (hostname gate),
   proving dev safety before any production exposure.
3. **Before any traffic flows to the test/real GA4 property**, confirm the Section 6b
   property setup checkpoint has been completed **in full**: the top-level **Enhanced
   measurement switch is OFF entirely** for the web data stream being used for this QA
   pass — not merely the history-tracking sub-option (this session's correction; the
   prior QA plan only checked the sub-option).
4. Temporarily override `NEXT_PUBLIC_PORTAL_ORIGIN=https://myprintrequest.com` locally
   (or an equivalent production-like build) to confirm the script loads and **exactly
   one** initial `page_view` fires in GA4 DebugView (not two — confirms step 3's setting
   took effect; two events with different `page_location` shapes means Enhanced
   Measurement's automatic tracking is still active).
5. **In the same DebugView session, inspect the initial `page_view` event's parameters
   and confirm `page_location`/`page_title` already reflect the sanitized initial
   descriptor** (Section 5.4) — this proves the initial `gtag('config', ...)` call's
   own `page_location`/`page_title`/`page_referrer` fields took effect, and that the
   subsequent manual `trackPageView` call reports the same sanitized values.
6. **Hard production gate (Section 6c.4, required this session): inspect every event GA4 sends in this
   session — the manual `page_view` events this Plan's own code sends, and every
   automatically-collected event GA4 sends on its own (`first_visit`, `session_start`,
   `user_engagement`, and any other event observed) — for the prohibited-value list in
   Section 6c.4 (raw request/design IDs, dynamic titles, search text, `returnTo`, raw
   `page_location`/`page_referrer`, any other customer-related value).**
   - **PASS:** every event, of every kind, uses only sanitized context. Record this
     outcome. Production Measurement ID configuration may proceed (subject to every
     other Owner Decision 6 sub-step).
   - **BLOCKED:** any event, of any kind, contains any prohibited value — **regardless
     of how many times that event fires or which event type it is.** There is no
     "narrower residual gap, accept and proceed" outcome. Production Measurement ID
     configuration and production analytics collection remain blocked until either an
     architecture change (a new Plan/Review pass, since this Plan does not speculatively
     design a fix for a failure mode not yet observed) or an explicit owner decision not
     to enable GA4 for Portal at all.
7. Client-side route navigation via the sidebar/bottom nav — confirm exactly one
   `page_view` per navigation in DebugView, no duplicates.
8. **Type into the catalog search box on `/catalog` repeatedly, changing only the search
   text** — confirm **no additional `page_view` fires** in DebugView while typing (this
   session's required correction 1 — repeated dropped-parameter-only changes must
   produce zero additional page views, not merely identical-looking ones), **and**
   confirm **no `view_search_results` event appears at all** (Enhanced Measurement Site
   search fully disabled, this session's required correction 2).
9. Browser back/forward — confirm correct, non-duplicated page views.
10. Public catalog and share pages (`/catalog`, `/catalog/library`, `/share/design/[id]`
    with a real design ID) — **in DebugView, inspect the actual `page_path` and
    `page_title` values for the `/share/design/[id]` visit and confirm they read
    `/share/design/:id` and the fixed generic title, never the real design's ID or
    name.** Additionally, navigate from one design's share page directly to a
    *different* design's share page and confirm **two separate** `page_view` events
    fire (proving the Section 6a.5 navigation-identity fix applies to this route too,
    not only `/requests/[id]`).
11. Authentication pages (`/login`, `/register`, `/complete-profile`, `/login-required`),
    including at least one visit reached via a `returnTo`-carrying link (e.g. clicking
    "Sign in" from `/requests/[id]`) — **in DebugView, confirm the `returnTo` value never
    appears in `page_location` for the `/login` visit.**
12. Print request pages (`/requests`, `/requests/[id]` with a real request ID,
    `/requests/artwork`) — **in DebugView, inspect `page_path`/`page_location` for the
    `/requests/[id]` visit and confirm they read `/requests/:id`, never the real request
    ID.** Additionally, navigate from one print request's detail page directly to a
    *different* request's detail page and confirm **two separate** `page_view` events
    fire (the direct end-to-end proof for the Finding-1 fix, Section 6a.5).
13. FAQ and How To (`/help`), including confirming Vimeo/YouTube iframes still load
    correctly (unrelated to GA4, but confirms no regression given the shared root
    layout change).
14. Simulate an ad-blocked/script-failure state (uBlock/DevTools request blocking) —
    confirm Portal renders and navigates normally with zero user-visible error.
15. **Scroll a long page to the bottom, click an outbound link (if any exists on the
    page being tested), and attempt a file download or video interaction if reachable**
    — confirm **no** `scroll`/`click`/`video_start`/`video_progress`/`video_complete`/
    `file_download` event appears in DebugView (Enhanced Measurement fully disabled,
    this session's required correction 2 — not merely "unrelated to page-view
    duplication" as an earlier draft of this Plan incorrectly characterized these
    features).
16. **In DebugView, open the parameter/collected-data panel for any event in this QA
    session and confirm `allow_google_signals` and `allow_ad_personalization_signals`
    both show as disabled/`false`** (this session's required correction 3 — the
    application code sets these explicitly; this step confirms the deployed code is
    doing so, since these are not separate GA4 console toggles to check independently).
17. Google Analytics DebugView or Realtime report — for every event in this QA pass,
    confirm by inspecting the actual `page_location`, `page_path`, `page_title`, and
    `page_referrer` values (not just that "events arrived") that no prohibited
    identifier, design title, request name, username, or free-text search content
    appears in any of the four fields.
18. Consent behavior — not applicable this goal (Owner Decision 3: no consent banner is
    built in this goal); skip.
19. Production-hostname gating — confirm a `fresh-prints-dev`-configured build never
    sends events even with a valid Measurement ID present, per step 2.
20. Preview/tunnel exclusion — load Portal via the `*.trycloudflare.com` tunnel URL,
    confirm no analytics network activity.

---

## 21. Rollout sequence

1. Implement in a local branch against `fresh-prints-dev` env, with
   `NEXT_PUBLIC_GA_MEASUREMENT_ID` unset (fully inert) — confirms zero regression risk
   during normal development.
2. Automated tests (Section 19) pass; typecheck/build/lint clean.
3. **Owner approval checkpoint** for Owner Decisions 1–7 above (Section 18), especially
   Decision 3 (consent), before any real Measurement ID is introduced anywhere.
4. Manual QA (Section 20) using a temporary/test Measurement ID and a
   production-hostname-simulated local build — never against the real, final production
   property at this stage.
5. Signoff phase closes this managed goal with analytics code merged but **still inert**
   in every deployed environment (no real Measurement ID configured anywhere yet).
6. **Separate, later checkpoint** (part of `production-release`, not this goal): owner
   supplies the real GA4 Measurement ID, configures it in the production App Hosting
   backend's environment settings, and production deploy proceeds under its own
   human-approved release process.

### 21.1 Rollback sequence

- **Pre-production-deploy rollback:** revert the `apps/portal/features/analytics/`
  folder and the two edited files (`layout.tsx`, `providers.tsx`) via normal git
  revert — no Firebase/Firestore/Storage state exists to unwind, since this feature
  touches none of those.
- **Post-production-deploy rollback:** unset `NEXT_PUBLIC_GA_MEASUREMENT_ID` in the
  production App Hosting environment and redeploy (or redeploy the prior revision) —
  the architecture's own inert-when-absent design (Section 8) makes this a
  single-variable, zero-code-change rollback. No data migration, no Firestore
  document to revert, no Cloud Function to redeploy.

---

## 22. Human checkpoints

1. This Plan and its Formal Review (this session).
2. Owner Decisions 1–7 (Section 18), especially Decision 3/7 (consent/privacy — may
   require legal review before Implement of the consent-gating pieces, though the
   inert-by-default script/hook code can be built either way).
3. Any dependency addition — none proposed, so N/A unless Review or a later phase
   revisits Section 17.
4. Real Measurement ID creation/provisioning and its entry into any environment
   configuration (dev or production) — separate from code Implement.
5. Production App Hosting deployment and production Measurement ID configuration —
   explicitly deferred to the separate `production-release` roadmap goal (#6), never
   bundled into this goal's Implement/Test/Signoff.

---

## 23. Documentation updates required (later phases)

- `.cursor/workflow/state.md` — Plan/Review completion entry (this session, Section 25).
- `references/project-chatgpt-handoff/CURRENT-STATE.md` — same (this session).
- `docs/project/ROADMAP.md` — update item #5's status from "Queued" to "Plan complete,
  pending owner decisions" (or equivalent) at Implement kickoff, not required to edit
  in this Plan-only session beyond what Section 25 already covers via state files.
- `docs/project/DECISIONS.md` — new ADR once Owner Decisions 1–7 are answered (e.g.
  "ADR-FP-1xx: Portal Google Analytics architecture and consent posture").
- `docs/project/RISK_REGISTER.md` — new entry for the CSP-dependency note (Section 13)
  and the no-existing-privacy-policy gap (Section 3.12), so both are tracked even
  though neither is resolved in this Plan-only phase.
- `docs/architecture/ARCHITECTURE.md` — brief addition noting the `features/analytics/`
  folder once implemented, mirroring how other generated/feature systems are documented.
- `docs/standards/SECURITY.md` — brief addition once implemented, documenting the
  Measurement-ID-is-not-a-secret classification and the hostname-gating security
  posture, consistent with how other provider integrations are documented there.
- `docs/standards/DEPLOYMENT.md` — brief addition for the production Measurement ID
  configuration step, consistent with how other Portal env vars are documented there.
- Plan (this document), Formal Review (below), later Test artifact, later Signoff
  artifact — all in `docs/workflow/plans/` / `docs/workflow/reviews/` per convention.

---

## 24. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Analytics ships before a Privacy Policy exists | Owner Decision 3/7 gates Implement of any consent-requiring path; Plan flags this explicitly rather than silently proceeding |
| Double-counted or missed page views under App Router | `send_page_view: false` + single-controller manual tracking + navigation-identity de-dupe + `usePathname`+`useSearchParams` combination (Section 5/6/11) |
| Script failure degrading Portal UX | Every failure path is a silent no-op (Section 10); no thrown errors, no blocking behavior |
| Accidental production-like reporting from dev/preview | Reuses the same already-approved, fail-closed hostname-resolution logic behind `isPortalSearchIndexingEnabled` via a dedicated `isPortalAnalyticsHostAllowed` wrapper (Section 8) instead of inventing a new, less-proven check or coupling directly to the SEO-named gate |
| Scope creep into a full CSP implementation | Explicitly deferred (Section 13); documented as a future dependency, not built now |
| Scope creep into custom event tracking / ecommerce | Explicitly out of scope (Section 18 item 5); page views only |
| PII leakage via URL paths, dynamic titles, or the browser referrer | Structural sanitization choke point (Section 6a): route templating, query allowlisting against a verified exhaustive parameter inventory, fixed non-dynamic titles, referrer suppression — never an unverified general claim |
| Double-counting from GA4's own automatic history-based page-view tracking (separate from the `send_page_view:false` mitigation) | Explicit GA4 property setup checkpoint (Section 6b) requiring the **full** Enhanced Measurement switch off, verified via DebugView before any real traffic |
| Spurious duplicate-looking page views from dropped-parameter-only URL changes (e.g. search-box typing) | Section 6a.5's three-part design: navigation identity (raw pathname + normalized allowlisted query) determines whether to fire, strictly excluding dropped parameters — corrected in this session after an earlier revision incorrectly treated repeated identical events as acceptable |
| Site search text (`q`) auto-collected by GA4 Enhanced Measurement independent of this app's own sanitizer | Full Enhanced Measurement switch disabled (Section 6b/18 Decision 5/6), not merely the history-tracking sub-option — corrected in this session after an earlier revision incorrectly deferred Site search as "unrelated" |
| Automatically collected lifecycle events (`first_visit`, `session_start`, `user_engagement`) inheriting raw, unsanitized page context — an open question, not a solved one | This application's own `config`/`update:true` calls (Section 5.4/6c) always pass sanitized values; whether GA4's separate automatic events independently inherit them is explicitly unresolved and gated by the Section 6c.4 hard production PASS/BLOCKED test — no "accept a narrower gap" fallback exists (corrected this session, replacing a prior revision's now-removed fallback) |
| Advertising/Google Signals features enabled by GA4's own default (`true`) despite the Plan's "disabled" intent | `allow_google_signals`/`allow_ad_personalization_signals` explicitly set to `false` as part of the one initial `gtag('config', ...)` call (Section 5.4/6c.3) — corrected after an earlier revision incorrectly claimed leaving them unset was sufficient |
| Root layout claiming to know the current pathname/searchParams, which a Server Component cannot do | Removed entirely — `app/layout.tsx` resolves only environment-derived config; all URL-aware logic lives in a Client Component (`PortalAnalyticsBoundary`/`usePortalAnalyticsController`), wrapped in the Suspense boundary Next.js requires (Section 4) |
| Two candidate owners (bootstrap script vs. hook) for the initial page view, an unresolved conflict | Consolidated into one authoritative controller hook (`usePortalAnalyticsController`, Section 5) that owns both initialization and every navigation; `PortalAnalyticsScript` is now script-loading only |

---

## 25. Documentation updates performed this session

`.cursor/workflow/state.md` and `references/project-chatgpt-handoff/CURRENT-STATE.md`
are updated in this same pass to record: `portal-google-analytics` Managed Phase
started, Plan complete, Formal Review complete (verdict recorded), Implement
**not started**, pending the Owner Decisions in Section 18.

---

## 26. Explicit out-of-scope list (restated from the task brief, unchanged)

Any implementation; adding/removing packages; editing source/config/CSP/security
headers; creating a GA4 property or GTM container; populating a Measurement ID;
changing environment variables, Firebase config, Firestore/Storage Rules, indexes,
Cloud Functions; deploying Portal or Firebase resources; modifying production;
production release planning; analytics dashboards in Studio/Portal; Phase 10 business
dashboards; tracking individual customer behavior/PII/artwork/request contents/design
titles/search text; ecommerce events; advertising/remarketing/Google Signals; session
replay; third-party heatmaps; customer profiling; silent scope expansion.

---

## 27. Implementation stop condition

**Implement must not begin** until:

1. This Plan's Formal Review (`docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md`)
   returns `approved` or `approved_with_changes` with all findings resolved, **and**
2. The owner has answered Owner Decisions 1–7 (Section 18), or explicitly instructs
   proceeding with this Plan's stated recommended defaults for each.

No implementation occurs in this session regardless of the Review verdict, per the
task's explicit phase boundary (Plan → Formal Review only, this session).

---

## 28. Formal Review resolution

Formal Review completed: **`approved_with_changes`**. Full review artifact:
`docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md`.

Every review finding was resolved directly in this Plan:

1. **`PortalScrollReset.tsx` citation overstatement** — corrected in Section 3.4/6 to
   accurately scope that precedent to the `(app)` route-group shell rather than
   implying it proves root-level (`Providers.tsx`) behavior.
2. **`isPortalSearchIndexingEnabled` reuse conflating SEO and analytics gating** —
   resolved by introducing a dedicated `isPortalAnalyticsHostAllowed` wrapper (Section 8,
   Section 16 file table, Owner Decision 2 in Section 18) that reuses the same
   underlying fail-closed hostname-resolution logic without coupling to the
   SEO-specific function.
3. **Root-level Suspense-safety for `useSearchParams()` not explicitly verified** —
   noted as an Implement-time verification step (Section 19) rather than an assumed
   fact; not a blocking architectural gap per the Review's own assessment.
4. **Stale `ROADMAP.md` status row for the already-closed Wave C goal** — logged as a
   non-blocking housekeeping note (folded into Section 2.1's date-consistency finding
   in the second amendment pass) rather than corrected in this Plan session, since it
   concerns a different, already-signed-off goal.
5. **Pre-existing large uncommitted diff unrelated to this goal** — Review confirmed
   via direct repository inspection that this Plan session touched only this one new
   Plan document; no action required.

No finding required a change to the Plan's core architecture, scope, or Owner Decision
list. Implement remains blocked on Owner Decisions 1–7 per Section 27.

---

## 29. Amendment (2026-07-26, second pass) — analytics URL/title/referrer sanitization and GA4 Enhanced Measurement duplication

An external owner review identified two material omissions in the Plan as it stood
after Section 28's resolution: (1) the original design would have sent raw
`pathname + searchParams` toward `gtag`, which could leak the `/requests/[id]` Firestore
document ID, free-text search strings, the `returnTo` parameter (which can itself embed
a nested request ID and query string), and — via GA4's default `page_title` behavior —
`/share/design/[id]`'s real, dynamic design-title `<title>` value; and (2) the Plan's
`send_page_view: false` mitigation only addresses GA4's one-time auto-page-view on
script load, not GA4 web data streams' separate, on-by-default Enhanced Measurement
"Page changes based on browser history events" setting, which would double-count every
App Router client-side navigation if left enabled.

**Both are resolved in this amendment:**

1. **Section 6a** (new) adds a verified, exhaustive Portal route inventory (Section
   6a.1) and query-parameter policy (Section 6a.2), built from direct repository
   inspection (not invented), and a structural sanitization service,
   `buildSanitizedAnalyticsPageDescriptor` (Section 6a.3), that is now the **only** path
   by which any value reaches `gtag` — replacing the original `trackPageView(url:
   string)` signature with a narrowed `trackPageView(descriptor:
   PortalAnalyticsPageDescriptor)` (Section 6a.4). De-duplication is now explicitly
   defined as operating on the *sanitized* route, not the raw navigation state (Section
   6a.5), with justification for why raw-state de-duplication would have been a latent
   bug (dropped-parameter changes would have fired spurious identical-looking events).
2. **Section 6b** (new) documents the exact GA4 console setting, who performs it, when,
   how it's verified in DebugView, and how it's documented for production release and
   affected by rollback — folded into a revised **Owner Decision 6** (Section 18) rather
   than a new numbered decision, since both concerns share the same out-of-repository
   actor and checkpoint.
3. **Section 19** (testing) gained an entire new required test file
   (`portalAnalyticsSanitizer.test.ts`) with per-route and per-parameter coverage
   matching the Section 6a.1/6a.2 tables exactly, plus expanded coverage in the service
   and hook test files for the narrowed input type and sanitized-route de-duplication.
4. **Section 20** (manual QA) gained explicit DebugView field-inspection steps for
   `/requests/[id]` and `/share/design/[id]` with real IDs, and a `returnTo`-carrying
   navigation, plus the Enhanced Measurement verification step before any real traffic
   flows.
5. **Section 2.1** (new) records the date-consistency finding: the Wave C signoff's
   2026-07-27 date is one day ahead of this Plan's 2026-07-26 filename date and the
   system clock at the time of this amendment — logged as an observed documentation
   inconsistency between two different sessions' artifacts, not corrected (would require
   rewriting a closed goal's historical record, which is out of this goal's scope) and
   not grounds to reopen Wave C.

No change was required to the Plan's overall phase boundary, roadmap position, or
Owner Decisions 1, 2, 4, 5, 7 — see Section 18.1 for the itemized explanation of what
changed vs. what didn't.

---

## 30. Second Formal Review resolution

A second, independent Formal Review pass (separate context from both the Section 29
amendment's author and the first Formal Review) verified this amendment against source
and returned **`approved_with_changes`**, finding one blocking defect the amendment
itself introduced while fixing the owner's original two concerns, plus several
non-blocking notes. Full review:
`docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md`.

**Blocking finding, resolved in this Plan:** Section 6a.5's original sanitized-route-only
de-duplication design would have silently suppressed a real page view when a customer
navigated between two different dynamic-segment resources that template to the same
string (e.g. `/requests/abc123` → `/requests/xyz789`, both `/requests/:id`, with no
allowlisted query parameter to distinguish them) — an under-counting defect, not a
hypothetical. **Resolved** by revising Section 6a.5 to a two-tier comparison: the
`useRef` guard now compares **raw** `pathname+searchParams` state to decide *whether* a
navigation occurred (fixing the under-counting — raw state genuinely differs between
two different request IDs), while the sanitized descriptor (Section 6a.3/6a.4) is still
the only thing ever reported to `gtag` (preserving the original privacy fix). Section
11, the Section 16 file table's hook-test description, and Section 19's test list were
all updated to match the revised design, including a new explicit test proving the
Finding-1 scenario no longer under-counts.

**Non-blocking findings, all resolved or acknowledged:**

- Stale "Section 27a"/"Section 32" cross-references — corrected to their actual target
  sections (Section 2.1 and Section 23 respectively).
- Defense-in-depth note on the `/other` fail-closed fallback reusing the standing query
  allowlist — tightened so `/other` drops all query parameters unconditionally, never
  reusing the per-known-route allowlist.
- Route/query inventory accuracy, sanitizer architecture soundness, Enhanced Measurement
  checkpoint plausibility, test completeness, Owner Decisions revision correctness,
  date-consistency handling, no-implementation confirmation, and production-safety
  retention were all independently verified against source and found correct — no
  changes required for these.

Every finding from the second Formal Review pass has now been resolved directly in this
Plan. Implement remains blocked on Owner Decisions 1–7 (Section 18) as before; the
Finding-1 de-duplication defect that would have been an **additional** blocker is now
resolved by the Section 6a.5 revision above, not merely accepted as a known limitation.

---

## 31. Third correction pass (this session) — three material conflicts identified by the owner, all resolved directly in the Plan

After the second Formal Review pass (Section 30), the owner reviewed the Plan again and
identified three remaining material conflicts, all resolved in this pass:

1. **Navigation de-duplication (Section 6a.5, third revision).** The prior revision
   (from the second correction pass) de-duplicated on raw navigation state and
   explicitly reframed "dropped-parameter-only changes still fire, but produce
   identical descriptors" as acceptable GA4 behavior. **The owner rejected this
   reframing outright** — the original requirement ("must not generate multiple
   indistinguishable page views merely because a dropped query parameter changed") was
   never satisfied by that design; it was reasoned around, not met. This session
   replaced the raw-state comparison with a purpose-built three-part design: a **local
   navigation identity** (raw pathname + normalized allowlisted-query state only, never
   transmitted or logged) that decides *whether* to fire; the **sanitized analytics
   descriptor** (Section 6a.3, unchanged) that decides *what* is reported; and the
   **previous sanitized page descriptor** that supplies the safe referrer. This
   satisfies both requirements simultaneously — dropped-parameter-only changes no
   longer fire at all, while different dynamic-segment values under the same template
   still correctly fire as distinct navigations (preserving the second Review's
   Finding-1 fix). Verified against every required outcome in a table (Section 6a.5)
   and covered by new direct tests (Section 19).

2. **Full Enhanced Measurement disablement (Section 6b, revised).** The prior version
   disabled only "Page changes based on browser history events" and explicitly
   characterized Site search, scrolls, outbound clicks, video engagement, file
   downloads, and form interactions as "unrelated" and deferrable — while Owner
   Decision 5 simultaneously claimed "page views only." **This was an internal
   contradiction**: GA4 Enhanced Measurement's Site search feature auto-detects
   Portal's own `q` query parameter and reports customer search text as `search_term` on
   an automatic `view_search_results` event, entirely independent of this Plan's own
   sanitizer, which cannot intercept a GA4-tag-internal automatic event. Section 6b now
   requires the **entire top-level Enhanced Measurement switch** be turned off, not a
   sub-checkbox, folded into revised Owner Decisions 5 and 6 with an explicit,
   testable DebugView checklist (no `view_search_results`, no scroll/click/video/
   file-download/form events).

3. **Global GA4 page-context sanitization and initialization order (new Section 6c).**
   The Plan previously sanitized only the manually-authored `page_view` event's
   parameters. Automatically collected lifecycle events (`first_visit`,
   `session_start`, `user_engagement`) — which GA4 generates regardless of Enhanced
   Measurement or `send_page_view` — would still inherit raw
   `document.location`/`document.title`/`document.referrer` unless the tag's *global*
   page-context state is itself overridden first. Verified against current official
   Google Analytics documentation (not memory) that `gtag('set', {...})` is the
   documented mechanism for values that apply to all subsequent events, with the
   highest-precedence `event`-scope parameters (Section 6a.4) still overriding per-call
   as before. Section 6c specifies the required ordering: build the initial sanitized
   descriptor → `gtag('set', ...)` the sanitized page context → `gtag('set', {
   allow_google_signals: false, allow_ad_personalization_signals: false })` →
   `gtag('config', ...)` → manual sanitized `page_view`; every subsequent navigation
   calls `setSanitizedPageContext` (new) before `trackPageView` (unchanged), updating
   context without ever reinitializing the stream. **Separately corrected**: an earlier
   version of this Plan (Section 12) incorrectly claimed leaving
   `allow_google_signals`/`allow_ad_personalization_signals` unset meant they were "not
   enabled" — verified against current documentation that both default to `true`
   (enabled) at the platform level, so this Plan now sets both explicitly to `false`.

All three corrections are cross-referenced into the file table (Section 16), Owner
Decisions (Section 18, items 3/5/6 revised with the owner's exact required wording),
automated tests (Section 19, new `buildNavigationIdentity` coverage,
`setSanitizedPageContext` coverage, a new `PortalAnalyticsScript.test.ts` asserting
script-order and explicit `false` ad-signal values), manual QA (Section 20, expanded
DebugView steps for full Enhanced Measurement verification and ad-signal inspection),
and the Risks table (Section 24).

No implementation, dependency, environment, Firebase, or Google Analytics property
change occurred in this pass — this remains a Plan-document-only correction.

---

## 32. Third Formal Review resolution

A third independent Formal Review pass (separate context from the third correction
pass's author and from both prior Formal Reviews) verified the third correction pass
against source and current Google Analytics documentation, and returned
**`approved_with_changes`**, finding two blocking wording/certainty issues (no
architecture changes required). Full review:
`docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md`.

**Both blocking findings resolved directly in this Plan:**

1. **Section 6a.5's `category` identity-contribution paragraph was self-contradictory**
   — it asserted in one sentence that switching category IDs "does change the
   identity," then admitted the opposite in the same paragraph. **Resolved**: the
   paragraph is rewritten to state only the correct, consistent behavior (the identity
   uses a presence/absence marker for `category`, matching the descriptor exactly, and
   does not distinguish one category ID from another) — removing the contradictory
   clause entirely rather than trying to reconcile two incompatible claims.

2. **Section 6c's claim that `gtag('set', ...)`-before-`config` sanitizes
   automatically-collected events (`first_visit`/`session_start`/`user_engagement`) was
   overstated as "verified official mechanism,"** when official documentation is
   actually silent on this specific point and one adjacent source suggests the opposite
   for the two named events. **Resolved at the time**: Section 6c's certainty language
   was softened to accurately describe what is and is not confirmable, explicitly noting
   the contrary adjacent evidence, and reframing the mechanism as "harmless to implement
   regardless, correct for every event this Plan's own code explicitly parameterizes,
   and an open question for the two named automatic events specifically." Section 20
   step 6 and Owner Decision 6 sub-step (c) were, **at that point in the Plan's
   history**, revised into an explicit go/no-go test with a documented, non-blocking
   fallback (accept a narrower residual gap) if the automatic events turned out not to
   inherit the sanitized context — rather than a confirmation of an already-settled
   fact.

   **Note (superseded by Section 33.3 — flagged during the subsequent whole-Plan
   Formal Review, resolved in this same pass):** the "documented, non-blocking fallback
   (accept a narrower residual gap)" described immediately above was itself later
   rejected by the owner in the whole-Plan consistency review recorded in Section 33.
   It is **no longer the Plan's operative design** — Section 6c.4, Section 20 step 6,
   and Owner Decision 6 sub-step (c) now all describe a hard, two-outcome PASS/BLOCKED
   gate with **no** accept-and-proceed path. This paragraph is retained as a historical
   record of what Section 32's original resolution was at the time it was written, not
   as a description of the Plan's current behavior — see Section 6c.4/33.3 for the
   current, correct gate.

Every non-blocking finding from the third review (ad-signal defaults confirmed
accurate; `event`>`config`>`set` precedence confirmed; navigation de-duplication
mechanism confirmed correct by tracing the actual logic; Enhanced Measurement
full-disable requirement confirmed concrete and testable; Section 19/20 coverage
confirmed complete; Owner Decisions wording confirmed correct; no implementation
occurred) required no changes.

No implementation, dependency, environment, Firebase, or Google Analytics property
change occurred in this pass. Implement remains blocked on Owner Decisions 1–7
(Section 18), unchanged by this review's findings — both resolved issues were
documentation-accuracy corrections to the Plan itself, not new owner-facing decisions.

---

## 33. Whole-Plan architecture correction (this session) — Owner Decisions 1–7 approved; three implementation blockers resolved

The owner approved Owner Decisions 1–7 as recorded in Section 18 (with the corrections
below applied), subject to a whole-Plan consistency review finding three
implementation blockers the prior amendment-scoped Formal Review passes (Sections 28,
30, 32) had not covered, since each of those reviews was scoped only to its own
amendment, not the Plan as a whole.

### 33.1 Blocking correction 1 — root layout could not construct the initial descriptor

**Problem:** `apps/portal/app/layout.tsx` is a Server Component. It cannot call
`usePathname()`/`useSearchParams()` (Client Component-only hooks) and does not receive
the current page's `searchParams` prop (only a `page.tsx` does, per route segment).
Section 16's file table previously claimed `layout.tsx` would compute the initial
`buildSanitizedAnalyticsPageDescriptor(...)` "from the current request's path" — not
achievable as specified, and this Plan does not invent an unsupported mechanism to make
it appear possible.

**Resolution:** ownership of the initial sanitized descriptor moved entirely to a new
root-mounted Client Component, `PortalAnalyticsBoundary` (Section 4.1/16), which wraps
the analytics controller in the `<Suspense>` boundary Next.js requires for any Client
Component calling `useSearchParams()` under prerendering (confirmed via current Next.js
documentation, Section 4.2 — this is a hard build-time requirement, not a style
choice). `app/layout.tsx` now only resolves `resolvePortalAnalyticsConfig(process.env)`
— a pure function of environment variables alone — and passes it as a prop. It never
claims to know the current pathname or search parameters.

### 33.2 Blocking correction 2 — two contending owners for the initial page view

**Problem:** Section 6 said the tracking hook fires the initial page view on mount;
Section 6c.1 said the inline bootstrap script sends it. Both could not be authoritative
simultaneously — an unresolved dual-ownership conflict, not a documentation gap.

**Resolution:** a single new hook, `usePortalAnalyticsController` (renamed/consolidated
from the removed `usePortalPageViewTracking`, Section 5), is now the **one** authoritative
owner of the entire lifecycle: it reads the current URL, builds the navigation identity
and sanitized descriptor, initializes the GA4 stream exactly once (`initializedRef`
guard, Section 5.3), sends the initial page view exactly once, and handles every later
navigation through the same effect. `PortalAnalyticsScript` (Section 7) is now reduced to
loading `gtag.js` and defining the `dataLayer`/`gtag` stub — it contains no
`gtag('config', ...)` call and no descriptor computation. Required tests (Section 19)
directly prove: exactly one `initializeStream` + `trackPageView` call across Strict Mode
replay, script re-render, and root-provider re-render; the initial and first-page-view
descriptors are identical; the controller never resends the initial page view later.

### 33.3 Blocking correction 3 — the accepted-raw-context production fallback is removed

**Problem:** a prior revision permitted supplying a production Measurement ID even if
DebugView showed `first_visit`/`session_start` still carrying raw, unsanitized page
context, reasoning the residual leak was "narrower" than the pre-fix state.

**Resolution:** Section 6c.4 (new) defines a hard, two-outcome production gate — **PASS**
(every event, including every automatically-collected one, uses only sanitized
context) or **BLOCKED** (any event contains any prohibited value, regardless of
frequency). There is no `PASS WITH ACCEPTED RAW CONTEXT` outcome. Section 20 step 6 and
Owner Decision 6 sub-step (c) are both revised to this two-outcome gate. This Plan
still does not claim the `config`/`update:true` mechanism (Section 5.4, replacing the
prior `gtag('set', ...)`-based mechanism per the owner's explicit preference for the
official, documented SPA configuration pattern) is confirmed to reach automatically-
collected events — that remains an open, explicitly-flagged question, but one that is
now gated by a hard block rather than an acceptable-fallback path.

### 33.4 GA4 stream configuration mechanism — switched to the official `config`/`update: true` pattern

Per the owner's explicit instruction and this session's verification against the
official GA4 Configuration reference: the previous `gtag('set', ...)`-repeated-calls
mechanism is replaced by the documented `config`/`update: true` pattern (Section 5.4) —
initial `gtag('config', measurementId, { send_page_view: false, page_location,
page_title, page_referrer, allow_google_signals: false,
allow_ad_personalization_signals: false })`, then every later navigation's
`gtag('config', measurementId, { update: true, page_location, page_title,
page_referrer })`, which officially merges values and suppresses the automatic
duplicate page view a second bare `config` call would otherwise send.

### 33.5 Files, tests, and Owner Decisions updated to match

Section 16's file table is rewritten: `usePortalAnalyticsController.ts` (renamed,
consolidated), `PortalAnalyticsBoundary.tsx` (new), `PortalAnalyticsScript.tsx` (now
thin), `portalAnalyticsService.ts` (now exports `initializeStream`/`updatePageContext`/
`trackPageView`, no `setSanitizedPageContext`), `portalAnalytics.types.ts` (no `'set'`
command type needed). Section 19 gained the owner's full required test list, including
the single most important new test: proving Strict Mode replay, script re-render, and
root-provider re-render all produce exactly one initial `initializeStream`/
`trackPageView` call pair. Section 20 gained the two-outcome hard gate. Owner Decision 6
(Section 18) is revised to reference the hard gate instead of the removed fallback.

No implementation, dependency, environment, Firebase, or Google Analytics property
change occurred during this correction pass — this remains a Plan-document-only
architecture correction, pending a whole-Plan independent Formal Review (recorded
separately once complete, per this session's required next step).

---

## 34. Implementation correction — script-readiness handshake fixes a real initialization race (this session)

After Implement completed and passed an independent implementation review, a final
owner review of the shipped code (not just the Plan) found one blocking runtime defect
the prior implementation review did not catch, since it exercised only the "script
already ready" case: **the controller could permanently lose the initial GA
configuration and page view if its first effect run happened before the
`afterInteractive` script had executed.**

### 34.1 Root cause, confirmed in the actual shipped code

- `PortalAnalyticsScript` uses `next/script` `strategy="afterInteractive"` — loads and
  executes asynchronously, with no guarantee of running before a React effect.
- `portalAnalyticsService`'s three functions correctly no-op when `window.gtag` is not
  yet a function (required, correct failure-containment behavior on its own).
- The controller's state machine, however, previously committed
  `state.initialized = true` (and the navigation identity / referrer state)
  **unconditionally** after merely *calling* `initializeStream`/`trackPageView` — not
  after confirming either call actually did anything.
- Net effect: controller effect runs before `gtag` exists → both calls silently no-op
  → state is falsely marked "initialized" anyway → nothing about
  `pathname`/`searchParams`/`config` changes when the script becomes ready moments
  later, so the effect never re-runs to retry → the initial configuration and initial
  page view are **permanently lost**, and a later navigation could attempt
  `updatePageContext({ update: true })` against a stream that was never actually
  initialized.

### 34.2 Fix — an explicit readiness signal, plus a success-gated commit rule

1. **`portalAnalyticsService.ts`'s three exported functions
   (`initializeStream`/`updatePageContext`/`trackPageView`) now return an explicit
   `boolean`** — `true` only if `window.gtag` existed and the call was made, `false`
   on no-op. This makes "did this call succeed" directly observable, not inferred.
2. **`PortalAnalyticsScript.tsx` now accepts an `onReady` prop**, wired to the stub
   `<Script>` tag's `onReady` — `next/script`'s own documented lifecycle callback
   (confirmed against current Next.js documentation this session, distinct from
   `onLoad`) — rather than any invented polling/timer/DOM-inspection mechanism.
3. **`PortalAnalyticsBoundary.tsx` now owns a `scriptReady` `useState(false)` boolean**,
   flipped to `true` by that `onReady` callback, and passes it into
   `usePortalAnalyticsController` as a second parameter.
4. **`usePortalAnalyticsController`'s state machine (Section 5.1) is revised**: it
   never attempts initialization while `scriptReady` is `false`, and commits
   `initialized`/`lastIdentityKey`/`previousSanitizedPath` **only when
   `initializeStream` returns `true`**. `updatePageContext` is only ever reached after
   a successful initialization, so it can never run before the stream's initial
   configuration.

None of this introduces a second lifecycle owner: `PortalAnalyticsScript` and
`PortalAnalyticsBoundary` only report a fact (the stub executed); every decision about
`gtag('config', ...)` calls and page views remains exclusively inside
`usePortalAnalyticsController`/`portalAnalyticsService`, unchanged from Section 4/5's
single-owner requirement.

### 34.3 Plan sections corrected

Section 5.1 (state machine — the effect body and its behavioral guarantees), Section
5.2 (the "whichever mounts first has no effect on correctness" claim — corrected, since
that claim described the very bug being fixed), Section 6c.2 (service boundary —
boolean returns, readiness ownership), Section 7 (script-loading lifecycle — readiness
reporting), and Section 16 (file table — updated signatures/responsibilities for
`portalAnalyticsService.ts`, `usePortalAnalyticsController.ts`,
`PortalAnalyticsScript.tsx`, `PortalAnalyticsBoundary.tsx`).

### 34.4 Files changed (implementation, this session)

- `apps/portal/features/analytics/services/portalAnalyticsService.ts` — three
  functions now return `boolean`.
- `apps/portal/features/analytics/services/portalAnalyticsService.test.ts` — updated
  to assert the new return values.
- `apps/portal/features/analytics/hooks/usePortalAnalyticsController.ts` — rewritten
  per Section 5.1's corrected state machine; `usePortalAnalyticsController` now takes a
  second `scriptReady` parameter.
- `apps/portal/features/analytics/hooks/usePortalAnalyticsController.test.ts` —
  rewritten with the full required regression-test list (Section 34.5).
- `apps/portal/features/analytics/components/PortalAnalyticsScript.tsx` — added the
  `onReady` prop, wired to the stub script's `onReady`.
- `apps/portal/features/analytics/components/PortalAnalyticsScript.test.ts` — added a
  comment-stripped source-inspection regression test proving the component still
  contains no sequencing/identity logic and introduces no state of its own.
- `apps/portal/features/analytics/components/PortalAnalyticsBoundary.tsx` — now owns
  the `scriptReady` state and threads it through.

No dependency, environment, Firebase, GA4 property, or production action occurred.

### 34.5 Regression tests added, per the owner's required list

All ten required scenarios are covered in
`usePortalAnalyticsController.test.ts`: controller run before readiness (no calls, no
commit); readiness false→true without navigation (exactly one init pair, same
descriptor); readiness remaining false across repeated renders (never initializes);
Strict-Mode-style replay after readiness (still exactly one pair); readiness firing
more than once (no duplicate init/page view); navigation before readiness followed by
readiness on a later route (only the current route becomes the one initial page view,
no stale earlier route emitted); navigation after successful initialization
(`updatePageContext` before `trackPageView`, init not repeated);
`initializeStream` reporting failure (no state committed, a later retry can still
succeed); permanently blocked script (repeated ticks across several routes, never
initializes); and the thin-component guarantee (`PortalAnalyticsScript`'s source
contains no sequencing/identity logic and introduces no `useState`/`useRef`).

### 34.6 Verification (all independently re-run this pass; exact results, corrected lint characterization)

```
npx tsx --test apps/portal/features/analytics/services/*.test.ts apps/portal/features/analytics/hooks/*.test.ts apps/portal/features/analytics/components/*.test.ts
# tests 81, pass 81, fail 0
EXIT_CODE=0

npm run typecheck --workspace @fresh-prints/portal
EXIT_CODE=0

npm run build:portal
✓ Compiled successfully; 19/19 pages generated; no Suspense build error
EXIT_CODE=0

npm run lint
✖ 41 problems (31 errors, 10 warnings) — all pre-existing, none in apps/portal/features/analytics/
or the two wiring files (layout.tsx/providers.tsx)
EXIT_CODE=1
```

**Correction to the prior implementation review's lint claim:** the earlier
implementation-review pass reported `npm run lint` as "exit 0." Re-verified this
session with a direct, unambiguous exit-code capture: the repository's lint script
(`eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`) uses
`--max-warnings 0`, so its **true, deterministic exit code is `1`** whenever any
warning exists anywhere in the repository — and 10 pre-existing, unrelated warnings do.
The **problem count and file list are identical** to the prior run (41 problems, same
files, zero in this goal's files) — only the previously-reported exit code was wrong.
This does not change any substantive finding: zero new lint problems were introduced by
this goal in either the original Implement pass or this correction pass.

No implementation occurred before this correction passed its own new independent
Implementation Review (recorded separately, per this session's required next step). No
real Measurement ID, GA4 property, Firebase, deployment, App Hosting, or production
action occurred at any point in this correction pass.
