# Diagnosis: getPortalGlobalOpenGraph prod deploy — discovery timeout

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| PROMOTE_SHA | `8cc014fb23370be6a7ac3672436163a47d390103` |
| Failed command | `firebase deploy --only functions:getPortalGlobalOpenGraph --project fresh-prints-prod` |
| Error | `User code failed to load. Cannot determine backend specification. Timeout after 10000.` |

---

## Production status at diagnosis

| Artifact | Status |
|----------|--------|
| Firestore Rules | **LIVE** on `fresh-prints-prod` |
| Firestore indexes | **LIVE** on `fresh-prints-prod` |
| `getPortalGlobalOpenGraph` | **FAILED** (no remote update) |
| App Hosting | **NOT ATTEMPTED** |

---

## Local reproduction / inspection (at tip)

1. `npm run build` in `functions/` — **OK** (tsc).
2. `node -e "require('./lib/functions/src/index.js')"` — **REQUIRE_OK_MS≈425** (well under 10s).
3. Module timings (cold-ish): admin ≈200ms, OG handler ≈197ms, Algolia exports ≈286ms, compose ≈5ms.
4. `lib/admin.ts` already eagers only Auth/Firestore; Storage is Proxy-lazy; sharp via `lazySharp` / not eagerly loaded by OG compose at import.
5. Diff `f5c0bdb..8cc014f` for Functions is small for `getPortalGlobalOpenGraph` (+ filter helper/tests); also adds **scripts/** cleanup tooling (not on the runtime `main` import graph).
6. No top-level `defineSecret().value()`, network, or async hang found on the discovery path.

## Verdict

**Not a source regression in `getPortalGlobalOpenGraph`.** Same class of Firebase CLI **discovery timeout** already recorded in this repo (e.g. Amendment 9 P3, Stage 1b Algolia, Wave A) — full `index.ts` export graph + admin init can exceed the default **10s** discovery window under deploy load even when cold `require` is sub-second locally.

**Corrective:** retry with elevated `FUNCTIONS_DISCOVERY_TIMEOUT` — **no code change / no PR required** for this failure mode.

## Safe retry (Function only — do not redeploy Rules/indexes; do not App Hosting yet)

```powershell
cd c:\coding\fresh-prints
$env:FUNCTIONS_DISCOVERY_TIMEOUT = '60'
firebase deploy --only functions:getPortalGlobalOpenGraph --project fresh-prints-prod
```

After success: continue App Hosting separately; then Studio + smoke.
