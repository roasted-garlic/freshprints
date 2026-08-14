# Checkpoint: Studio 1.0.3 package/publish (Prefinal A–H + Track B)

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Plan checkpoint | **#9** Studio 1.0.3 package/publish |
| Owner authorization | Proceed with ONLY approved Production Promotion Plan checkpoint #9 (Studio 1.0.3 package/publish) |
| Status | **STOPPED** — PR #59 merged; Studio-release lint failed; test-only fix PR **#60** awaiting production merge; then re-dispatch from **production** |
| Packaging base (pre-bump tip) | `76205da8eeab43c545112f7399522e6b4106a03e` |
| Freeze containment | `3b7a978f324d3c133ead8707ffc51454a20e1f5d` is ancestor of packaging tip (`merge-base --is-ancestor` exit 0) |
| Release prep PR | https://github.com/roasted-garlic/freshprints/pull/59 — **MERGED** as `571f8ee` |
| Lint-fix PR | https://github.com/roasted-garlic/freshprints/pull/60 (`9f9563e`) — **awaiting production merge** |
| Studio version after bump | **1.0.3** (on `origin/production` via #59) |

---

## Preflight

| Check | Result |
|-------|--------|
| `origin/production` tip | `76205da8eeab43c545112f7399522e6b4106a03e` |
| Frozen product contained | **YES** |
| Runtime product vs freeze (`apps/studio`, `functions/src`, `packages/`) excluding tests | **empty** (test-only PR #58 after freeze) |
| Track A repair JSON/docs alter Studio runtime | **No** (docs/JSON only; not in Studio package source) |
| H indexes on `fresh-prints-prod` | **READY**: `purpose ASC + catalogReviewStatus ASC`; `purpose ASC + catalogReviewStatus ASC + createdAt DESC` |
| H / Track B Studio source on tip | Present (intake queries, Algolia Design Library, Portal social meta / Static OG Studio UI) |

---

## Release-mechanism gap found and fixed in PR #59

Established path remains `.github/workflows/studio-release.yml` → draft GitHub Release → **human publish**.

Gap: workflow previously wrote only `PROD_FIREBASE_*` into `apps/studio/.env.local`. **No Algolia secrets existed** in GitHub Actions (`gh secret list` showed Firebase only). Stable 1.0.3 would have shipped without production Algolia, violating the Plan.

PR #59 extends the same `.env.local` injection step to require `PROD_ALGOLIA_*` for stable builds and fail closed unless:

- Firebase project → `fresh-prints-prod`
- Algolia app → `Z1FVCM5QUX`
- Algolia index → `portal_catalog_ready_prod`

Documented in `docs/standards/DEPLOYMENT.md`.

---

## Local verification (worktree @ packaging tip + bump)

| Check | Result |
|-------|--------|
| Studio typecheck (`tsc -p apps/studio --noEmit` after `generate-packaged-build-config` stable) | **PASS** (exit 0) |
| Portal typecheck | **PASS** (exit 0) |
| Focused H tests (intake queries + parity) | **PASS** 11/11 |
| Track B Studio (`portalSocialMetaSettingsService.test.ts`) | **PASS** 2/2 |
| Algolia containment + design library count/search | **PASS** |
| Production exclusion gate (source) | Sidebar uses `isOperationalWipeUiEnabled` (`import.meta.env.DEV` + allowlisted project); packaged prod build does not expose wipe / Catalog Storage Inventory UI |
| Branding icon | `apps/studio/icon.ico` present |
| `git diff --check` | **PASS** (exit 0) |
| Full CI package / installer SHA-256 | **NOT YET** — blocked on secrets + merge + workflow_dispatch |
| Firebase / Algolia / data mutation this gate | **None** |

---

## Lint unblock (2026-08-11 evening)

Studio-release CI failed before packaging at repo lint:

- File: `functions/src/lib/customerUploadCatalogConfirmation.test.ts` ~L127
- Rule: `no-regex-spaces`
- Change: `\n    }` → `\n {4}}` (semantically identical; matches 4-space TX close in `queuePortalPrintRequestToShow.ts`)
- Runtime product: **unchanged**
- Tests: affected file **13/13 PASS**; `npm run lint` **PASS**; `git diff --check` **PASS**
- Commit: `9f9563ea10bfbd1e1313dc5f1e306cfb2e02be2f`
- PR: https://github.com/roasted-garlic/freshprints/pull/60

**Release-workflow correction:** the failed run was dispatched with **Use workflow from: development**. That is **not** acceptable. PR #59’s `PROD_ALGOLIA_*` bake-in is on **production**. After #60 merges, dispatch **only** from production.

Development reconcile: after #60 merges to `production`, open/merge the usual production→development sync PR (do not force-push).

---

## Exact owner actions required (protected)

### A) Add GitHub Actions secrets (search-only — never Admin)

Repository → Settings → Secrets and variables → Actions:

| Secret | Required value |
|--------|----------------|
| `PROD_ALGOLIA_APP_ID` | `Z1FVCM5QUX` |
| `PROD_ALGOLIA_INDEX_NAME` | `portal_catalog_ready_prod` |
| `PROD_ALGOLIA_SEARCH_API_KEY` | Production **search-only** key (same family as Portal `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY` in Secret Manager) |

Optional for future prereleases: `DEV_ALGOLIA_APP_ID`, `DEV_ALGOLIA_SEARCH_API_KEY`, `DEV_ALGOLIA_INDEX_NAME`.

### B) Merge lint-fix PR #60 into `production`

PR #59 is already merged. Confirm tip includes #60 before dispatch.

### C) Dispatch Studio release workflow (**must use production workflow file**)

1. https://github.com/roasted-garlic/freshprints/actions/workflows/studio-release.yml  
2. **Run workflow**  
3. **Use workflow from: `production`** — do **not** use `development`  
4. Git ref to build from: `production` (or exact post-#60 tip SHA)  
5. `release_type`: **`stable`**  
6. `distribution_mode`: **`internal-unsigned`**

### D) Publish draft GitHub Release

Per `DEPLOYMENT.md`: electron-builder creates a **draft**; owner publishes in GitHub UI (SmartScreen expected for unsigned internal builds).

Expected installer name pattern: `Fresh Prints-Windows-1.0.3-Setup.exe` (or `Fresh-Prints-Windows-1.0.3-Setup.exe` per prior releases — confirm from workflow assets).

### E) Reply for agent verification

`STUDIO 1.0.3 PACKAGE: PASS` + workflow run URL + release URL / installer SHA-256 if available.

---

## After package success

**STOP** for owner install + reduced production smoke:

`docs/workflow/reviews/2026-08-11-prefinal-a-h-production-smoke-checklist.md`

Do **not** mark production promotion fully signed off yet. Do **not** begin domain cutover.

---

## Confirmations

- NO Functions / Storage Rules / Firestore Rules / indexes deploy
- NO App Hosting rollout
- NO Algolia mutate / Track A repair
- NO DNS / myprintrequest.com cutover
- NO full DEV QA re-run
