# Findings: Portal first-load tab spinner (localhost:3100)

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| App | `apps/portal` (Next.js, port 3100) |
| Scope | Investigate prolonged browser document “loading” on **first** navigation — including plain `http://localhost:3100` (not tunnel HMR) |
| Code changes | Small mitigation in Admin OG meta path (see “Mitigation shipped”) |

---

## Verdict

The tab spinner tracks a **slow document response**, not leftover HMR WebSockets and not client Firestore after paint.

**Primary cause:** root (and page) `generateMetadata` awaits `loadPortalGlobalSocialMeta()`, which uses Firebase **Admin** Firestore + Storage. On local Next without usable ADC, Admin RPCs hang ~10–20s probing credentials before failing. That delay is **TTFB** — Chrome keeps the tab throbber spinning until the HTML document finishes.

Measured (cold-ish local `next dev`, PowerShell `Invoke-WebRequest`):

| URL | Status | Time |
|-----|--------|------|
| `http://localhost:3100/` | 200 | **~15.7–19.8 s** |
| `http://localhost:3100/login` | 200 | **~15.4 s** |
| `http://localhost:3100/favicon.ico` | 200 | **~4 ms** |

Home and login both call `loadPortalGlobalSocialMeta`. Favicon does not. Same ballpark on both pages ⇒ shared server metadata path, not catalog client bootstrap alone.

---

## Spinner distinction

| Symptom | Evidence | Likely cause here |
|---------|----------|-------------------|
| **A. Tab spinner until first HTML / long TTFB** | Document request pending 15s+; favicon instant; `/` and `/login` equally slow | **Confirmed:** blocking `generateMetadata` → Admin social meta |
| **B. Page shows UI (or “Loading your account…”) but spinner continues** | Would need Network: document already 200/`complete`, yet throbber on | Unlikely for Firestore `onSnapshot` / XHR after load; HMR `wss://…/_next/webpack-hmr` is **not** the primary local cause (owner already isolated tunnel HMR) |
| **C. UI loading after document complete** | AuthGate “Loading your account…” then catalog “Loading designs…” | Real, but separate from **tab** spinner — client auth + Firestore after HTML arrives |

**AuthGate** (`apps/portal/features/auth/components/AuthGate.tsx`) blocks shell paint until `isInitialBootstrap` / `initializing` / `loading-profile` clear. That explains a **blank / “Loading your account…”** first paint for guests and signed-in users, but it runs **after** HTML. It does not explain a 15s pending **document** request.

---

## Root cause hypotheses (ranked)

### 1. Blocking global OG meta via Firebase Admin (HIGH — evidenced)

| Item | Detail |
|------|--------|
| Files | `apps/portal/app/layout.tsx` (`generateMetadata` → `loadPortalGlobalSocialMeta`); also `login` / `register` pages |
| Service | `apps/portal/features/brand/portalGlobalSocialMetaService.ts` |
| Admin | `apps/portal/lib/firebase/admin.ts` — `initializeApp({ projectId, storageBucket })` succeeds whenever public Firebase env is set; comment claims “null when local without ADC” but **does not check credentials** |
| Work per request | (1) settings doc read, (2) query up to **40** ready designs, (3) Storage **signed URL** |
| Dev vs prod | `revalidate = 3600` helps hosted ISR; **`next dev` re-runs meta often** — hang is felt on every local first load |
| Contrast | Per-design share meta (`portalDesignShareMetaService.ts`) prefers Cloud Function `getPortalDesignShareOpenGraph` so local share works without ADC. **Global** OG never got that escape hatch. |

### 2. AuthGate + AuthProvider bootstrap (MEDIUM for perceived load, LOW for tab throbber)

| Item | Detail |
|------|--------|
| Files | `AuthProvider.tsx` (`configurePersistence` then `onAuthStateChanged` then profile `getDoc`s); `AuthGate.tsx` |
| Effect | Delays shell/catalog mount; sequential profile reads when signed in |
| Not | Document Network time of ~15s |

### 3. Catalog home client fan-out (MEDIUM after paint)

| Item | Detail |
|------|--------|
| Files | `CatalogHomePageContent.tsx`, `useCatalogHomeDesigns`, `useCatalogCategories`, `countReadyDesigns` |
| Effect | Rails stay on “Loading designs…” until Firestore client queries finish |
| Not | Initial document TTFB |

### 4. Shell providers (LOW for guests)

| Item | Detail |
|------|--------|
| Files | `PortalAppShell.tsx` → print requests, favorites, notifications |
| Guests | Favorites / notifications / print-request lists no-op without `customer` |
| Push SW | `portalWebPushService` registers only when push sync runs for authenticated customers — not first guest load |

### 5. Tunnel / HMR WebSocket (OUT for this report)

Already documented: tunnel `wss` HMR noise; use localhost for reload. Does not explain 15s document for `/` and `/login`.

### 6. Fonts / middleware / service worker on every page (LOW)

No `next/font` / Google Fonts preload found; no `middleware.ts`; messaging SW route exists but is not registered on anonymous first paint.

---

## DevTools Network checklist

Filter / watch:

1. **Document** for `localhost:3100/` (or `/login`) — Timing → Waiting (TTFB). Expect multi-second if regression returns.
2. **Name contains** `firestore.googleapis.com` / `securetoken` / `identitytoolkit` — client auth + data **after** document (hypothesis C).
3. **WS** `_next/webpack-hmr` — ignore for tab-spinner root cause on localhost.
4. **`getPortalDesignShareOpenGraph`** — share routes only; not home global meta.
5. **`/api/firebase-messaging-sw`** — should be absent on cold guest home.
6. Compare **favicon.ico** (should be fast) vs document (slow = server meta).

Server terminal: watch for long pause before “Compiled /” / request log lines when loading `/`.

---

## Recommended fixes (narrow, impact order)

1. **Do not block HTML on hung Admin OG** — timeout or skip Admin when credentials are unavailable locally; fall back to static brand OG (same as today’s eventual fallback, without the hang). *(Mitigation shipped — see below.)*
2. **Optional follow-up (managed item):** expose global OG via a small public Function (mirror share meta) so local/prod crawlers get Studio title/image without Portal Admin ADC; keep `revalidate` for hosted.
3. **AuthGate:** paint public shell (`/`, `/catalog/**`) before auth settles (skeleton chrome) — UX only; separate from TTFB.
4. **Do not** broad-refactor catalog/Firestore or add Studio cache toggles for this.

---

## Mitigation shipped

| Change | Why |
|--------|-----|
| `apps/portal/lib/firebase/admin.ts` — skip Admin init unless `GOOGLE_APPLICATION_CREDENTIALS`, cloud markers (`K_SERVICE` / `FIREBASE_CONFIG` / …), or `PORTAL_ADMIN_FORCE=1` | Prevents local Next from creating an Admin app that hangs on first RPC |
| `apps/portal/features/brand/portalGlobalSocialMetaService.ts` — 1.5s budget around Admin social meta | Belt-and-suspenders if Admin is available but slow/hung |

### Post-fix timings (same probe)

| URL | Before | After |
|-----|--------|-------|
| `/` | ~15.7–19.8 s | **~1.6 s** |
| `/login` | ~15.4 s | **~1.6 s** |

Remaining ~1–2s is ordinary Next `dev` compile/SSR — not the Admin credential hang. Local OG uses brand defaults unless ADC / `PORTAL_ADMIN_FORCE=1`. Hosted App Hosting should still enable Admin via Cloud Run / Firebase env markers — spot-check OG on `myprintrequest.dev` after next deploy.

---

## Recommended next step for owner

1. Hard-refresh `http://localhost:3100/` and confirm tab spinner no longer sits ~15s on first paint.
2. If Studio global OG must be previewed locally, set `GOOGLE_APPLICATION_CREDENTIALS` (or `PORTAL_ADMIN_FORCE=1` with working ADC) — otherwise rely on hosted `myprintrequest.dev` for OG QA.
3. Optionally queue a small managed item: “Portal global OG without local Admin hang” (Function path + keep ISR).

---

## Related prior notes

- `#11` OG work: local Admin without ADC fell back to site defaults (WhatsApp FAIL then Function for **share** meta).
- Workflow state: `#13` signed off; this investigation is orthogonal polish / next candidate.
