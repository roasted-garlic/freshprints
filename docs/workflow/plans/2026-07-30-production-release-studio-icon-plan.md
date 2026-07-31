# Plan Amendment: Studio Desktop Icon Alignment (Goal #13 `production-release`)

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Parent goal | `production-release` (Goal #13) |
| Trigger | Owner request: use the exact visual icon currently displayed at the top of the collapsed Studio sidebar as the official Windows application icon throughout the packaged installer, before final owner smoke-test signoff of the white-screen-fix replacement installer. |
| Scope of this phase | Narrow Plan + Formal Review only for this specific packaging/asset change. Does not reopen any other part of the approved `production-release` Plan/Review, and does not re-touch the already-fixed white-screen bug. |

---

## 1. Source of truth (confirmed via source, not guessed)

Traced the collapsed-sidebar icon through the actual render path:

- `apps/studio/src/renderer/src/shared/components/Sidebar.tsx:365-372` — when the sidebar is
  collapsed, it renders `<AppLogo variant="collapsed" ... />`.
- `apps/studio/src/renderer/src/shared/components/AppLogo.tsx:2,42` — `variant="collapsed"`
  resolves its fallback to `studioLogoCollapsedUrl`, imported from
  `../../../../assets/brand/fresh-prints-studio-logo-collapsed.png` (line 2). The actual displayed
  `src` first checks a Firestore-configurable override
  (`useStudioBrandLogoSrc` → `resolveBrandLogoDownloadUrl`), falling back to this bundled asset
  when no custom logo has been uploaded.
- Confirmed via the earlier Phase D bootstrap-inventory research this same session that
  `settings/brandLogos` is unset on the cold-start `fresh-prints-prod` project and uses code
  defaults — meaning **this exact bundled PNG is what actually renders** in the current production
  Studio, not a hypothetical fallback.

**Master source asset:** `apps/studio/src/assets/brand/fresh-prints-studio-logo-collapsed.png` —
an existing, already-committed PNG. Per the task's own instruction ("If the collapsed-sidebar icon
is an existing SVG or image asset, reuse that asset as the master"), no extraction from inline
SVG/component is required — this is already a standalone raster asset.

**Confirmed properties** (via `sharp` metadata inspection): 6387×6405px, PNG, RGBA with alpha
channel (`hasAlpha: true`), no embedded ICC profile. Near-square, high resolution, transparent
background — directly suitable as an icon master without any resize-quality compromise at the
target resolutions.

**Visual confirmation** (direct image read): a circular mark — teal outer ring, magenta inner ring,
black circular field, "FP" in magenta/cyan, "REQUEST" in yellow beneath — matches the Fresh Prints
Studio collapsed-sidebar branding exactly. The "REQUEST" text is part of the existing asset itself,
not something this Plan adds, so it stays (per the task's explicit "no added text unless text is
already part of the collapsed-sidebar icon" rule — this text is already part of it).

**Ruled out as candidates (per the task's explicit exclusion list, confirmed not used):** the full
wordmark (`fresh-prints-studio-logo.png`, the *non*-collapsed variant, used only when the sidebar
is expanded — a different file, correctly not chosen), the previously-missing
`fresh-prints-logo.svg` (confirmed in the prior white-screen-fix pass to never have existed in this
repo's history), any generic/gear/Portal logo (none referenced by the collapsed-sidebar render
path at all).

---

## 2. Existing packaging gap (confirmed, not assumed)

`apps/studio/electron-builder.json5` already references `"icon": "icon.ico"` (line 31, under
`win`) and `"icon": "icon.png"` (line 49, under `linux`) — **but neither file exists anywhere in
`apps/studio/`**. This exactly matches the build-log line observed during both prior Studio
packaging passes this session: `"default Electron icon is used — reason=application icon is not
set"`. This Plan supplies the missing files at the paths the config already expects; it does not
invent a new configuration mechanism.

---

## 3. Fix

### 3.1 Generate the icon assets

1. From the master PNG, produce a properly cropped/padded square source image with sufficient
   breathing room (the existing asset is already circular with transparent padding around it —
   `[NEEDS REPO CHECK — Implementation]` to confirm the existing transparent margin is sufficient
   for Windows' icon-frame conventions at small sizes, or whether a small uniform padding pass is
   needed; this is a mechanical resize/pad step using `sharp`, already a project dependency — no
   new visual design).
2. Generate PNG renditions at 16×16, 24×24, 32×32, 48×48, 64×64, 128×128, and 256×256 using
   `sharp` (already an `apps/studio` dependency, used elsewhere in this codebase — no new
   dependency required for the resize step itself).
3. Combine the multi-resolution PNGs into a single Windows `.ico` container. `sharp` does not write
   `.ico` directly — `[NEEDS REPO CHECK — Implementation]` to select a small, actively-maintained,
   already-repository-compatible tool for this final packaging step (e.g. a well-established
   `.ico`-writer library added as a new devDependency, scoped narrowly to `apps/studio` or the
   repo root, used only at asset-generation time, not at runtime or build time — i.e., this tool
   generates a committed static `.ico` file once, it is not part of the ongoing build pipeline).
   Do not use an undocumented online converter, per the task's explicit instruction.
4. Also generate a `.png` rendition for the `linux` target's `icon.png` (electron-builder's Linux
   `AppImage` target expects a plain PNG, not an `.ico`) — out of this goal's Windows-focused scope
   to *verify* on a real Linux machine, but harmless and consistent to supply since the config
   already references it and the repo has no Linux build/test path today.

### 3.2 Wire the assets into the existing configuration

No new `electron-builder.json5` keys are needed — `win.icon: "icon.ico"` and `linux.icon:
"icon.png"` already point at the correct relative paths (relative to
`apps/studio/electron-builder.json5` itself, i.e. `apps/studio/icon.ico` /
`apps/studio/icon.png`). Simply place the generated files at those exact paths.

### 3.3 `BrowserWindow.icon` (confirmed unnecessary for the packaged Windows taskbar, fixed anyway for dev-mode correctness)

Researched via Electron's own documentation and a corroborating GitHub issue
(electron/electron#28581): on Windows, a packaged app's taskbar/window icon is read from the
**executable's embedded resources** (which electron-builder writes via `rcedit` using
`win.icon`), not from `BrowserWindow`'s `icon` constructor option — that option's effect on
Windows only matters when running the **unpackaged** app (`electron .` / `npm run dev:studio`),
where there is no compiled `.exe` resource to draw from. Setting it in production packaging is
redundant, not required.

However, `apps/studio/electron/main.ts`'s existing `createWindow()` already sets `icon:
path.join(process.env.VITE_PUBLIC ?? RENDERER_DIST, appIconFileName)` where `appIconFileName =
'fresh-prints-logo.svg'` — a file confirmed in the prior white-screen-fix investigation to never
have existed anywhere in this repo's history. This is a genuine, small, in-scope correctness bug
independent of the packaged-Windows-taskbar question (it affects the **dev-mode** window icon,
where `BrowserWindow.icon` *does* matter): point `appIconFileName` at the new PNG rendition
generated in §3.1 instead, so dev-mode (`npm run dev:studio`) also shows the correct icon rather
than silently failing to load a nonexistent file. This is the smallest correction that closes the
gap the task's own instruction asked to confirm ("Confirm whether the Electron `BrowserWindow`
also requires an explicit `icon` path on Windows. Add it only if supported and necessary.") — not
required for packaged Windows behavior, but genuinely necessary for the dev-mode window icon,
which currently silently references a nonexistent file.

---

## 4. Explicit non-goals

- Does not redesign the logo or alter its artwork.
- Does not change the sidebar's visual appearance, layout, or the `AppLogo` component's rendering
  logic.
- Does not touch Portal branding.
- Does not perform code signing.
- Does not touch Firebase configuration, Cloud Functions, Rules, indexes, production data, custom
  domain, or any other already-completed or unrelated deployment-order step.
- Does not re-touch the already-fixed white-screen `manualChunks`/`onwarn` correction — this Plan
  only verifies that fix remains intact after this change, it does not modify it.

---

## 5. Verification (required before commit, all must exit 0 unless noted)

1. Direct visual comparison: the generated icon renditions must match the collapsed-sidebar
   artwork exactly (same colors, same mark, same "REQUEST" text) — no substitution, no redesign.
2. Confirm transparent background preserved at every generated resolution (alpha channel present).
3. Confirm no clipping of the circular mark at 16×16, 32×32, 48×48, and 256×256 specifically (the
   task's named checkpoints) — the mark must not be cropped by the square icon frame at any size.
4. Studio typecheck (`npx tsc --noEmit`)
5. Studio production build (`vite build`) — confirm the white-screen fix's `CIRCULAR_CHUNK`
   `onwarn` hook is still present and the build still completes without that warning (regression
   check on the already-fixed bug, not re-diagnosing it)
6. Complete `electron-builder` packaging — confirm the build log no longer prints "default
   Electron icon is used"
7. Repository lint
8. `git diff --check`
9. Direct inspection of the packaged output: confirm `icon.ico`/`icon.png` were picked up (not
   just that packaging exited 0)
10. Installer file properties display the new icon (owner-observable on Windows; this coding
    agent's sandboxed environment cannot render/screenshot Windows Explorer icon previews reliably
    — same GUI limitation documented in the white-screen-fix Plan — so this is confirmed via the
    owner's retest, not fabricated here)
11. Installed executable, desktop shortcut, Start Menu entry, taskbar (while running), and
    Installed Apps entry all display the new icon — owner-observed, per the same environment
    limitation
12. Sign-in screen still loads (regression check against the white-screen fix)
13. Production Firebase configuration still resolves to `fresh-prints-prod` (regression check,
    re-verified via the same `asar`-extraction method used in the white-screen-fix pass, not
    re-litigated from scratch)
14. Test Data functionality remains absent (regression check, same triple-layer confirmation
    method as the prior pass)

**Windows icon-cache caveat:** per the task's own instruction, a stale Explorer/taskbar icon cache
on the owner's machine could show the *old* (missing/default Electron) icon even after a correct
install, if the owner reuses the same install location without a clean removal or icon-cache
refresh first. The owner retest instructions (§6) must account for this explicitly — do not
conclude the asset failed based solely on a shortcut icon that hasn't refreshed.

---

## 6. Git and release process (same pattern as the white-screen fix)

1. Implement and verify on `development`.
2. Commit and push to `origin/development`.
3. **Stop at the `development` → `production` PR checkpoint.**
4. After the PR is merged, verify the exact production merge commit via `git fetch`/`git rev-parse`.
5. Create the next sequential release-candidate tag (`v1.0.0-rc4` is the most recent recorded tag
   this session — the next tag is `v1.0.0-rc5`, to be confirmed against the live tag list at
   tagging time, not assumed here).
6. Build the replacement installer from that exact verified `production` commit, using the same
   safest env-file-swap procedure as both prior Studio builds this session (backup dev
   `.env.local`, temporarily write production values, build, immediately restore).
7. Give the replacement installer a filename that clearly distinguishes it from `rc4` (e.g.
   suffixed with the new tag name), and preserve the `rc4` installer's identifying information
   (filename, SHA-256) rather than silently overwriting it, consistent with the white-screen fix's
   own installer-preservation practice.
8. **Stop for owner installation and retest** — do not resume Phase G smoke testing signoff until
   the owner confirms the icon appears correctly (accounting for icon-cache staleness) and the
   sign-in screen still loads.

## 7. Rollback

Revert the new/changed files (`apps/studio/icon.ico`, `apps/studio/icon.png`, the small
`appIconFileName` change in `main.ts`, and any new asset-generation devDependency) via normal git
revert. No production Firebase, data, or infrastructure component is touched by this change or its
rollback — isolated to Studio packaging assets only.
