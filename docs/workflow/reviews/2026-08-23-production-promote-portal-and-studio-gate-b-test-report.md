# Gate B Test Report — production-promote-portal-and-studio-2026-08-23

| Field | Value |
|-------|-------|
| Date | 2026-08-23 |
| Phase | Gate B (release prep on `development`) |
| Goal | `production-promote-portal-and-studio-2026-08-23` |
| Status | **passed_with_notes** |

---

## Owner authorizations recorded

| Phrase | Result |
|--------|--------|
| `APPROVE PRODUCTION RELEASE PLAN: production-promote-portal-and-studio-2026-08-23` | Obtained |
| `CONFIRM DEV SIGNOFF FOR PROMOTION: customer-request-show-discovery-and-search-correctives + our-shows-page-ux-and-print-request-actions` | Obtained |

Retrospective DEV Signoffs:

- `docs/workflow/reviews/2026-08-22-customer-request-show-discovery-and-search-correctives-signoff.md` — **approved**
- `docs/workflow/reviews/2026-08-23-our-shows-page-ux-and-print-request-actions-signoff.md` — **approved**

---

## Studio 1.0.9 pin verification

| Surface | Value |
|---------|-------|
| `apps/studio/package.json` | `1.0.9` |
| `.github/workflows/studio-release.yml` | finalize expects `1.0.9`; Mac stable gate string `1.0.9` |
| `.github/workflows/studio-release-signing-policy.test.ts` | asserts `1.0.9` |
| `package-lock.json` workspace `apps/studio` | `1.0.9` |
| Tag `v1.0.9` | not created (publish later) |
| Local electron-builder output | `release/1.0.9/Fresh-Prints-Windows-1.0.9-Setup.exe` |

---

## Commands run

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Diff hygiene | `git diff --check` | 0 | Pass |
| Signing-policy tests | `npx tsx --test .github/workflows/studio-release-signing-policy.test.ts` | 0 | **27/27** |
| Focused regressions | `npx tsx --test` (search, gang sheet, conversion, discovery, IPC, etc.) | 0 | **114/114** (after test fix) |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | Pass |
| Studio typecheck | `cd apps/studio && npx tsc --noEmit` | 0 | Pass |
| Functions build | `npm --prefix functions run build` | 0 | Pass |
| Root lint | `npm run lint` | 0 | Pass (after lint fixes) |
| Studio Vite build | `cd apps/studio && npx vite build` | 0 | Pass |
| Portal production build | `npm run build:portal` | 0 | Pass (after stopping locked `dev:portal`) |
| Studio packaging | `npm run build:studio` | 0 | Pass — Windows NSIS `1.0.9` |

### Not run / N/A

| Check | Reason |
|-------|--------|
| Firestore rules unit suite | No dedicated rules unit harness change required beyond Functions/rules source already in RC |
| Production Firebase / App Hosting / Studio dispatch | Explicitly out of Gate B |

---

## Release-blocking fixes applied (in scope)

1. **`portalShowDiscovery.test.ts`** — `findShowsThisWeekWithDesigns` fixture used a Sunday `now` with an in-week show placed earlier in the week (not upcoming). Mid-week `now` + upcoming in-week show; also asserts past same-week shows are excluded.
2. **Lint (`max-warnings 0`)** — Moved `GANG_SHEET_LAYOUT_MODE_OPTIONS` / `getGangSheetLayoutModeOption` to `gangSheetLayoutModeOptions.ts`; removed unused `applyCacheStatus` dep from `refreshCacheStatus`.
3. **Portal build EPERM** — Environment: stopped local `dev:portal` / Next processes locking `apps/portal/.next/trace`; rebuild succeeded. Not an application-logic defect.

---

## Verdict

**Gate B passed.** Release candidate ready on `development` after commit/push. **STOP** at production PR checkpoint — no merge, Firebase, App Hosting, or Studio publish.
