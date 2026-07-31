# Plan Amendment: Production Studio White-Screen Remediation (Goal #13 `production-release`)

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Parent goal | `production-release` (Goal #13) |
| Trigger | Owner installed the first production Studio installer (`Fresh Prints-Windows-0.0.0-Setup.exe`, SHA-256 `c4ef01b57b7b01c89d94102d4b3af4cf22988a1b1640c62950c55983d58e0720`) and reported a permanent white screen — installer completes, window opens, sign-in UI never appears. |
| Scope of this phase | Narrow Plan + Formal Review only for this specific fix. Does not reopen any other part of the approved `production-release` Plan/Review. |

---

## 1. Root cause (confirmed via real runtime evidence, not guessed)

**Failure reproduction:** This sandboxed environment cannot host a real Electron/Chromium GUI
process (the packaged `.exe` exits silently within seconds across multiple launch methods, exit
code 0, zero output, no Windows Event Viewer entry — a genuine environment limitation, not the
bug). The owner ran the installed executable directly with `--enable-logging` on their own machine
and captured the actual failure:

```
Uncaught TypeError: Cannot read properties of undefined (reading 'createContext')
  at file:///.../resources/app.asar/dist/assets/vendor-9Mud9pNT.js:65
```

**Confirmed NOT the cause (ruled out with direct evidence):**
- Firebase environment injection — extracted the actual packaged `app.asar` via `npx asar extract`
  and confirmed the real `firebaseConfig` embedded in `index-DzJ5KK7r.js` correctly resolves to
  `PROJECT_ID:"fresh-prints-prod"`, `AUTH_DOMAIN:"fresh-prints-prod.firebaseapp.com"`, and a
  non-empty `AIzaSy...`-prefixed API key. The two `fresh-prints-dev` string occurrences found in
  the same bundle are unrelated: one is the hardcoded `OPERATIONAL_WIPE_ALLOWED_PROJECT_IDS =
  ["fresh-prints-dev"]` allowlist constant, the other is a debug-UI label string — neither affects
  which project the app actually connects to.
- Packaged asset paths — the packaged `dist/index.html` (extracted directly from `app.asar`) uses
  correct relative script/link paths (`./assets/...`), not the absolute paths seen in the
  *source* `apps/studio/index.html` (Vite rewrites these during build as expected).
- Preload path/config — `main.ts`'s `loadFile`/preload path logic is correct and packaging-aware;
  not implicated by the actual error (a preload failure would show a different, preload-specific
  error, not a renderer bundle exception at a specific line).

**Confirmed root cause:** `apps/studio/vite.config.ts`'s `manualChunks` function (lines 58-84)
uses `id.includes('node_modules/react')` to decide whether a dependency belongs in the
`react-vendor` chunk. This is a **substring match, not a package-boundary match** — it correctly
catches `react` and `react-dom` themselves, but it does **not** catch `scheduler`, the internal
package `react-dom` depends on at runtime for its concurrent-mode scheduler. `scheduler` has no
"react" substring in its path, so it falls through to the generic `vendor` bucket instead.

Direct extraction confirms this: `scheduler` is present in the packaged `vendor-9MUd9pNT.js`
chunk, absent from `react-vendor-B-OSQFcj.js`. The Vite build log itself warned about this exact
condition and was not treated as blocking:

```
Circular chunk: vendor -> react-vendor -> vendor. Please adjust the manual chunk logic for these chunks.
```

`react-dom` (in `react-vendor`) requires `scheduler` (in `vendor`) at module-evaluation time;
depending on chunk load order, one chunk executes before the other has finished initializing,
producing `React.createContext` (or an equivalent React API) being called against an
`undefined` reference — a permanent renderer-side crash with no DOM fallback, which is exactly a
white screen: `main.tsx`'s `ReactDOM.createRoot(...).render(...)` never runs because the module
graph throws before reaching that line.

**Why local dev never caught it:** Vite's dev server (`npm run dev`) does not apply Rollup's
`manualChunks` splitting at all — that logic only runs during `vite build` (production build),
which is why `npm run dev:studio` has always worked correctly regardless of this misconfiguration.

**Why `npm run build:studio` "succeeding" (exit 0) did not catch it:** Rollup treats a circular
chunk dependency as a **warning**, not a build failure — the build log literally printed the exact
warning quoted above, but nothing in the existing verification suite (`tsc --noEmit`, `electron-builder`
exit code, or any existing test) inspects Rollup's build warnings or actually launches the packaged
output. The previous Phase F verification checked "does the build/package exit 0" but never
verified "does the packaged app actually render," which is exactly the gap this Plan closes.

**Secondary, non-fatal finding (same evidence-gathering pass):** the owner also observed a
packaging warning for a missing image: `Failed to load image from:
.../resources/app.asar/dist/fresh-prints-logo.svg`. Source: `apps/studio/index.html`'s
`<link rel="icon" href="/fresh-prints-logo.svg">` uses an absolute path, which Vite does not
rewrite (only `<script>`/`<link rel="stylesheet">` module references get path-rewritten during
build — a plain favicon `<link>` is left as-is). Under the packaged app's `file://` base, this
absolute path fails to resolve to the actual asset inside `app.asar`. This is a **real bug** but
does **not** cause the white screen (a broken favicon does not block script execution or React
rendering) — it is fixed in the same pass since it's a one-line, obviously-correct, zero-risk
change discovered by the same evidence-gathering, not because it's required to unblock the crash.

---

## 2. Fix

### 2.1 Manual-chunk correction (the actual white-screen fix)

In `apps/studio/vite.config.ts`'s `manualChunks` function, change the React-detection condition
from a substring match against `node_modules/react` to an exact-package-boundary check that also
explicitly includes `scheduler` (and any other React-internal runtime dependency landing outside
package-name substring matching) in the same chunk as `react`/`react-dom`. The safest correction
that preserves the existing chunk-naming scheme:

```ts
manualChunks(id) {
  if (!id.includes('node_modules')) {
    return undefined
  }

  const reactRuntimePackages = [
    'node_modules/react/',
    'node_modules/react-dom/',
    'node_modules/scheduler/',
  ]
  if (reactRuntimePackages.some((pkg) => id.includes(pkg))) {
    return 'react-vendor'
  }

  // ... existing firebase-* branches unchanged ...

  return 'vendor'
}
```

Using a trailing `/` after each package name turns this into a real package-boundary check (no
longer a bare substring match), so `react-router-dom`, `react-error-boundary`, or any other
differently-named package that happens to contain "react" no longer accidentally matches — while
`node_modules/react/`, `node_modules/react-dom/`, and `node_modules/scheduler/` are matched
precisely. `[NEEDS REPO CHECK — Implementation]`: confirm no other React-internal runtime package
(e.g. a differently-versioned `use-sync-external-store` shim actually shipped as its own
`node_modules` entry, not merely React's own bundled copy) also needs explicit inclusion — verified
by re-inspecting the rebuilt `vendor`/`react-vendor` chunk contents after the fix, not assumed.

### 2.2 Favicon path correction (same pass, unrelated bug, zero risk)

In `apps/studio/index.html`, change `<link rel="icon" type="image/svg+xml"
href="/fresh-prints-logo.svg" />` to a relative path (`href="./fresh-prints-logo.svg"` or
equivalent) so it resolves correctly under the packaged app's `file://` base, matching the pattern
Vite already produces correctly for script/stylesheet tags. `[NEEDS REPO CHECK —
Implementation]`: confirm the actual asset's location in `apps/studio/public/` (or wherever it is
sourced from) to use the exact correct relative path, not guessed.

### 2.3 Packaged-runtime regression protection

The core gap this incident exposed is not just the chunk-splitting bug itself, but that **nothing
in the existing verification suite actually launches the packaged output and confirms it renders**.
Add a lightweight, packaging-aware regression check to Phase F's own verification steps (documented
process change, not necessarily new automated test code — `[NEEDS REPO CHECK — Implementation]`
whether a genuinely automated packaged-launch smoke check is practical in this environment given
the GUI-launch limitation discovered during this incident's evidence-gathering, or whether the
correct durable protection is a **build-time failure on Rollup circular-chunk warnings** instead,
which is fully automatable and would have caught this exact bug without requiring a real display).
Preferred approach, pending Implementation's confirmation: fail the build (non-zero exit) on any
Rollup `Circular chunk` warning via Rollup's `onwarn` hook, since that is deterministic, requires no
GUI, and directly targets the actual failure class.

---

## 3. Explicit non-goals

- Does not touch Portal, Cloud Functions, Rules, indexes, production data, custom domain, email
  providers, categories, or catalog snapshots.
- Does not change any Firebase configuration (already confirmed correct).
- Does not restore Test Data functionality.
- Does not change any application feature behavior — this is a build-configuration correction only.

---

## 4. Verification (required before commit, all must exit 0 unless noted)

1. Studio typecheck (`npx tsc --noEmit`)
2. Studio renderer production build (`vite build`) — **and** confirm the "Circular chunk" warning
   is no longer emitted (direct evidence the fix worked, not just that the build didn't crash)
3. Electron main/preload build (part of the same `vite build` invocation per current config)
4. Complete Studio `electron-builder` packaging (`npm run build:studio`)
5. Repository lint
6. `git diff --check`
7. Direct inspection of the packaged output: extract the new `app.asar` and confirm `scheduler`
   now appears in `react-vendor`, not `vendor`
8. Launch the unpacked packaged executable — `[NEEDS REPO CHECK — Implementation]`: this sandboxed
   environment could not sustain a GUI process during evidence-gathering; if that limitation
   persists, this step becomes an owner-side verification step instead (see §6), not skipped
   silently
9. Install the generated installer into a clean/test location and launch — owner-side, per above
10. Confirm the sign-in UI renders (owner-observed)
11. Confirm no renderer/main/preload error (owner-observed, or captured via `--enable-logging` if
    any residual issue appears)
12. Confirm production project resolution is `fresh-prints-prod` (already independently confirmed
    correct in §1; re-confirm unchanged after the fix, not re-litigated)
13. Confirm no localhost/dev/tunnel/emulator endpoint present
14. Confirm Test Data UI is absent (unchanged by this fix; re-confirm the existing triple-layer
    protection is still intact)

## 5. Rollback

Revert `apps/studio/vite.config.ts` and `apps/studio/index.html` to their pre-fix state via normal
git revert; no other component is touched, so rollback is a single, isolated, low-risk operation.
No production Firebase, data, or infrastructure component is affected by this fix or its rollback.

## 6. Production PR requirement and replacement-installer procedure

1. Implement and verify on `development`.
2. Commit and push to `development`.
3. **Stop at the `development` → `production` PR checkpoint** — do not merge, do not build the
   replacement installer, until the owner confirms the PR is merged and the exact production
   commit is verified via `git fetch`/`git rev-parse` (same pattern as every prior promotion in
   this goal).
4. Create the next release-candidate tag per the repository's current sequence (`v1.0.0-rc3` is the
   most recent recorded tag per prior session state — `[NEEDS REPO CHECK — Implementation]` to
   confirm the exact next tag name at the time of tagging, not assumed here).
5. Build the replacement installer from that exact verified `production` commit, following the
   same safest env-file-swap procedure used for the original build (backup dev `.env.local`,
   temporarily write production values, build, restore).
6. Produce a **new** installer artifact (a new build will naturally get new content-hash asset
   filenames from Vite; do not overwrite the original failed installer file — preserve it, its
   filename, and its SHA-256 for the incident record).
7. Give the owner the exact retest steps: fully quit the failed Studio app if still open, install
   the replacement build, launch it, confirm the sign-in screen appears, log in with the production
   owner account already bootstrapped on `fresh-prints-prod`, report `PASS` / `PASS WITH NOTES: ...`
   / `FAIL: ...`.
8. **Stop after the owner retest checkpoint.** Do not resume the broader Phase G smoke test until
   launch and login both pass.
