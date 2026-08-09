# Authorization / Preflight Record: PR #40 Studio production package

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Authorization | `APPROVE PROD STUDIO PACKAGE: PR40 TIP` |
| Project / tip | **`fresh-prints-prod` source tip** `51db805d2fce6fcb6edee71b1a7f1a9b531fb50f` |
| Studio `package.json` version | **`1.0.0`** |
| Status | **AUTHORIZED / PREFLIGHT PASS WITH BLOCKER — STOP before workflow dispatch** |
| Checkpoint | `docs/workflow/reviews/2026-08-08-pr-40-prod-studio-package-checkpoint.md` |
| Formal Review | **approved** |

---

## Preflight (agent)

| Check | Result |
|-------|--------|
| `origin/production` / `HEAD` | **`51db805…`** (PR #46 tip) |
| Taxonomy disk-cache on tip | **YES** (`taxonomyDiskCache.ts` present) |
| `generate-packaged-build-config` | exit 0 — channel **`stable`** |
| Studio `tsc --noEmit` | exit 0 |
| Updater unit tests | **23/23 pass** |
| `gh` CLI / authenticated dispatch | **NOT AVAILABLE** |
| Firebase / Algolia / App Hosting this pass | **NONE** |

---

## Hard blocker — existing published `v1.0.0`

| Item | Evidence |
|------|----------|
| Git tag `v1.0.0` | Points to **`70c083a…`** (pre–PR #40 tip), **not** `51db805` |
| GitHub Release `v1.0.0` | **Published** (`draft=false`, `prerelease=false`), target `production` |
| Assets | `Fresh-Prints-Windows-1.0.0-Setup.exe`, `.blockmap`, `latest.yml` |

**Conclusion:** Re-running `studio-release.yml` with `release_type=stable` at version **`1.0.0`** against tip `51db805` would collide with a **live published** stable release/tag. That is unsafe for updater provenance and is **not** authorized by this gate.

**Workflow was NOT dispatched.** No installer rebuilt. No tag moved. No release mutated.

---

## Required owner decision (ONE)

### Recommended: version bump then package

Reply:

`APPROVE STUDIO VERSION BUMP: 1.0.1 FOR PR40 TIP`

Then agent (or follow-up) will Plan/Implement a narrow `apps/studio/package.json` version bump to **`1.0.1`**, promote to `production` if needed, and prepare dispatch for a **new** stable draft/release at `1.0.1` from tip `51db805`.

### Alternative (not recommended)

Only if owner explicitly accepts rewriting the published `v1.0.0` release/assets/tag semantics — requires a **separate** destructive-refresh authorization phrase. Do **not** treat the current package phrase as that authorization.

---

## Exact dispatch (after version unblocked — do not run yet)

When version is unique and on production tip:

1. Open `https://github.com/roasted-garlic/freshprints/actions/workflows/studio-release.yml`
2. **Run workflow**
3. Ref: `production` or exact tip SHA
4. `release_type`: **`stable`**
5. `distribution_mode`: owner choice — `internal-unsigned` (staff) or `signed` (if CSC secrets ready)
6. Confirm six `PROD_FIREBASE_*` secrets present; CSC pair both present or both absent

After success: reply `PROD STUDIO PACKAGE: PASS` + run URL / asset names.

---

## Confirmations (this agent pass)

- Owner phrase received
- Preflight **PASS WITH BLOCKER** (published `v1.0.0` collision)
- NO workflow dispatch
- NO version bump
- NO installer / tag / release mutation
- NO Algolia / App Hosting / Firebase

**STOP** pending version decision.
