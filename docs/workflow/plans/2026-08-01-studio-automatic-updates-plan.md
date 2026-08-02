# Plan: Studio automatic updates

| Field | Value |
|-------|-------|
| Date | 2026-08-01 |
| Author | Agent (orchestration Phase C) |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-08-01-studio-automatic-updates-review.md |
| Goal | `studio-automatic-updates` |

---

## Goal

Add secure, credential-free automatic updates to packaged Fresh Prints Studio (Windows primary), with separate stable/prerelease channels, human-gated production publication, and proven A→B update path before the first public-launch installer.

## Background

Orchestration requires Plan + Formal Review before any updater implementation. Reporting-feature production promotion and development owner QA are separate gates and must not be combined into this implementation history.

## Investigation findings (repo evidence)

| # | Topic | Finding |
|---|--------|---------|
| 1 | Electron version | `electron` `^30.0.1` in [`apps/studio/package.json`](apps/studio/package.json); electron-builder pins `electronVersion: "30.5.1"` in [`apps/studio/electron-builder.json5`](apps/studio/electron-builder.json5) |
| 2 | Packaging | `electron-builder` `^24.13.3`; config [`apps/studio/electron-builder.json5`](apps/studio/electron-builder.json5); build script `tsc && vite build && electron-builder` |
| 3 | Windows / NSIS | `win.target` NSIS x64; `oneClick: false`; `perMachine: false`; `allowToChangeInstallationDirectory: true`; `deleteAppDataOnUninstall: false` |
| 4 | App identity / version | `appId`: `com.freshprints.app`; `productName`: `Fresh Prints`; artifact `Fresh Prints-Windows-${version}-Setup.${ext}`; package `version`: **`0.0.0`** (all recent installers used `0.0.0` with filename suffixes) |
| 5 | Main / preload | Main [`apps/studio/electron/main.ts`](apps/studio/electron/main.ts); preload [`apps/studio/electron/preload.ts`](apps/studio/electron/preload.ts); Vite electron plugin → `dist-electron/` |
| 6 | IPC conventions | Namespaced channels e.g. `fresh-prints:app:*` in [`appIpcChannels.ts`](apps/studio/electron/ipc/app/appIpcChannels.ts); allowlist + typed preload bridge |
| 7 | Settings / About UI | [`SettingsPage.tsx`](apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx) exists; **no About/version/update status section today** `[NEEDS REPO CHECK]` for preferred placement vs shell footer |
| 8 | GitHub Actions | **No repository-root `.github/workflows/` present** in this checkout |
| 9 | Repo visibility | Remote `https://github.com/roasted-garlic/freshprints.git`; `gh` CLI unavailable in this environment → **visibility `[NEEDS REPO CHECK]`** (treat as private until confirmed) |
| 10 | Releases without client credentials | If private: GitHub Releases generic provider requires token → **forbidden in client**. Safe options: public binary-only release repo, or Firebase Storage/CDN with public read of update metadata + signed artifacts |
| 11 | Branch protection | Prior workflow docs require protected PR `development`/`feature` → `production`, merge commit only; live protection API not verified this run `[NEEDS REPO CHECK]` |
| 12 | Code signing | No `certificateFile` / `CSC_*` / signing config in electron-builder; prior icon plan explicitly “does not perform code signing” |
| 13 | Signing secrets | None in repo (correct). Must use CI encrypted secrets if signing approved |
| 14 | Artifact naming | `${productName}-Windows-${version}-Setup.${ext}` under `apps/studio/release/${version}/` |
| 15 | Versioning | Stuck at `0.0.0`; human-readable suffixes in filenames historically — **must adopt real semver for updater** |
| 16 | Dev vs prod channels | Feasible via electron-builder `publish` channel / separate feeds; not implemented |
| 17 | CSP / network | Packaged updater needs HTTPS to release host; exact CSP in renderer `[NEEDS REPO CHECK]` |
| 18 | Rollback / downgrade | electron-updater does not auto-downgrade; retain prior installer manually |
| 19 | App data survival | NSIS `deleteAppDataOnUninstall: false`; `userData` for window-state etc. — upgrades should preserve data if install path stable |
| 20 | Admin rights | `perMachine: false` → per-user install; updates typically no admin |

**Not present today:** `electron-updater` dependency; `publish` block; autoUpdater main-process code; release workflow; update UI.

## Critical provider rule

Never embed GitHub PATs, release tokens, or publishing credentials in Studio.

**Recommendation if `freshprints` is private:** use a **separate public binary-release repository** (or public GCS/Firebase Storage feed) containing only installers + `latest.yml` / blockmap — not source. If the main repo is already public, GitHub Releases on the main repo is acceptable without client secrets.

## Scope

### In scope (after owner decisions + Formal Review approval)
- `electron-updater` integration in main + typed IPC + preload
- Settings (or About) update status UI
- electron-builder `publish` + channel config
- Semver bump strategy for Studio
- CI/release workflow (new `.github/workflows/…`) with human gate
- Tests + packaging docs + A→B verification procedure

### Out of scope
- Portal Design Issue Reporting implementation/promotion
- Silent force-install / force-quit
- Domain cutover
- Broad Functions deploys

## Approach (post-approval)

1. Add `electron-updater`; gate all autoUpdater usage on `app.isPackaged` and approved channel env.
2. Main-process update service: check / download / quitAndInstall on explicit user action; debounce; typed events.
3. Preload IPC: `check`, `download`, `install`, `getState`, event subscriptions.
4. Renderer: Settings “Studio updates” section — states: checking, available, downloading (+progress), ready, idle, error.
5. Configure publish provider per owner decision; generate `latest.yml` + SHA-256 recording.
6. Add GitHub Actions workflow: test → build → sign (if approved) → draft/prelease → **human approval** before stable.
7. Prove A→B on prerelease channel before any stable production publish.

## Required owner decisions (stop until approved)

| # | Decision | Recommendation |
|---|----------|----------------|
| 1 | Update provider | Public binary-release repo **or** public Storage/CDN feed if main repo private; GitHub Releases on main repo only if public |
| 2 | Windows code signing | **Required before public launch**; obtain Authenticode cert; CI secrets. Exception only via Formal Review + written acceptance of SmartScreen friction |
| 3 | Production version number | Start **`1.0.0`** for first updater-enabled public Studio (leave `0.0.0` behind) |
| 4 | Channels | **`stable`** + **`prerelease`** isolated; production users only see stable |
| 5 | Release trigger | **Manual workflow_dispatch** (or tag) after checks; not auto-publish from every `production` push |
| 6 | Update files public? | Yes for metadata + installers on the chosen public feed (no source) |
| 7 | Check frequency | On launch + every **4 hours** while running |
| 8 | Download mode | **User-approved download** (notify → user clicks Download) |
| 9 | Restart behavior | User clicks **Restart to Update**; never auto-quit |
| 10 | Postpone | Yes — dismiss notification; re-prompt next check |
| 11 | Mandatory update | **None for v1** |
| 12 | Rollback | Keep prior installer; no auto-downgrade |
| 13 | Prior installers retained | **≥ 2** previous known-good stable installers |
| 14 | UI placement | New **Settings → Studio updates** section (+ optional shell badge) |
| 15 | Dev test channel | Yes — **prerelease** / `fresh-prints-dev` builds never publish to stable |
| 16 | Release notes | Show release-name + notes from feed in update dialog |
| 17 | Actions auto-create release | May create **draft/prerelease** after tests; **stable publish requires human** |
| 18 | Human approval before production publish | **Required** |

## Test strategy (after implement)

- Unit/IPC contract tests for update state machine
- Packaging build with updater metadata
- Manual A→B on prerelease channel (orchestration Phase E checklist)
- Confirm failed feed does not break Studio
- Confirm stable clients never see prerelease

## Human checkpoints

1. Approve owner decisions table (phrase below).
2. Provide signing certificate / CI secrets when implementing.
3. Confirm repository visibility and chosen public feed.

## Risks

- Private GitHub + generic provider → credential leak risk if misconfigured
- Unsigned Windows builds → SmartScreen blocks
- `0.0.0` versioning breaks monotonic updates until semver adopted
- No existing CI workflows → release automation greenfield

## Rollback

Disable updater IPC / omit publish URL; users keep last manual installer.

## Explicit non-actions this planning pass

No implementation, no dependency adds, no production/deploy, no reporting merge.
