# DEV QA — Studio smoke corrective A–E

| Field | Value |
|-------|-------|
| Date | 2026-08-12 (revised: Studio delivery diagnosis) |
| Branch | `hotfix/studio-smoke-corrective-a-e` |
| Corrective commit | `13e0af88f843571e3f49eae07899c38a23c90fd4` |
| Base | `origin/production` `15c6492322157bf972168635787c8244898bfd9e` |
| Environment | **fresh-prints-dev** only |
| Worktree | `c:\coding\fresh-prints-wt-smoke-ae` |

## Delivery diagnosis (why prior DEV QA showed no Studio changes)

Documented DEV Studio path (`DEPLOYMENT.md`): **local Electron** (`npm run dev:studio`) against `fresh-prints-dev` — packaged installer is **not** required for implementation QA.

Owner’s prior session ran Studio from:

| Item | Value |
|------|-------|
| CWD | `C:\coding\fresh-prints` (main checkout, **not** corrective worktree) |
| Branch | `production` |
| HEAD | `76205da8eeab43c545112f7399522e6b4106a03e` |
| Studio `package.json` version | **1.0.2** |
| A–E Studio sources | **absent** (e.g. no `studioAlgoliaCatalogFacets.ts`, no `canManageShowQueueSettings`) |

Backend DEV deploys alone cannot change Design Library UI / permissionService — those live in the Studio renderer the Electron process loads.

The hotfix commit existed **locally only** (ahead of `origin/production`); it had **not** been pushed. Remote branch `hotfix/studio-smoke-corrective-a-e` was therefore missing on GitHub.

## How to launch the corrective DEV Studio (authoritative)

**Stop** any Studio started from `C:\coding\fresh-prints`.

```powershell
cd c:\coding\fresh-prints-wt-smoke-ae
npm run dev:studio
```

Confirm before testing:

1. Terminal cwd is `c:\coding\fresh-prints-wt-smoke-ae`
2. Startup log shows `@fresh-prints/studio@1.0.3` (worktree version), not `1.0.2`
3. `apps\studio\.env.local` contains only:
   - `VITE_FIREBASE_PROJECT_ID=fresh-prints-dev`
   - `VITE_ALGOLIA_APP_ID=WQ6OPP2E6Z`
   - `VITE_ALGOLIA_INDEX_NAME=portal_catalog_ready_dev`
4. No `fresh-prints-prod` / `portal_catalog_ready_prod` / `Z1FVCM5QUX` in that file

Optional identity check after Electron opens: Show Queue should hide **Settings** for helper; Design Library tag modal should request Algolia facets (not page-local-only counts).

### Not required for this QA

- GitHub Actions `studio-release.yml` prerelease/stable package
- Merge to `development` or `production`
- Studio 1.0.4 stable publish

(Prerelease packaging remains available later via `workflow_dispatch` on a pushed ref if a distributed installer is wanted; local Electron is the documented DEV path.)

## DEV backend (already done)

1. Firestore Rules (`settings/showQueue` → owner/admin write) — **deployed** to `fresh-prints-dev`
2. Functions: `promoteCustomerUploadToAiReview`, `retryCustomerUploadProcessing`, `enqueueAiEnrichment`, `resetAiEnrichmentForProcessing` — **deployed**
3. No Storage deploy; no Algolia settings mutation

## Owner QA checklist

### A/B — Design Library (ready catalog)

- [ ] Open tag filter **before** Load More: a tag that exists only beyond the first page shows the correct full-catalog count
- [ ] Load More does **not** change that tag’s count merely by hydrating more cards
- [ ] Tag-only filter with few matches: Load More hidden/disabled when Algolia result exhausted
- [ ] Multi-page managed filter/search: Load More works until exhausted
- [ ] Text + tag / text + category still work
- [ ] Clear filters restores ordinary Firestore browse Load More
- [ ] Missing Algolia env fails closed (no invented counts)

### D — AI tags (D8-A)

- [ ] Manually assign a catalog tag on a design
- [ ] Re-run AI: same tag is **not** re-suggested; alias-equivalent also suppressed
- [ ] Human tag remains on the design and in AI Review Final Catalog after open/save
- [ ] Genuinely new AI tags still appear (up to 8 **additional**)
- [ ] Halftone / exclusions / category still behave

### E — Helper account (required — not owner)

Sign in as a real `role: helper` user on DEV:

- [ ] Uploaded Designs: **Send to AI Processing** on eligible Pending succeeds
- [ ] Retry/re-run AI where Owner/Admin can
- [ ] AI Review: edit title/description/category/tags/halftone; approve; reject
- [ ] No `permission-denied` on allowed actions
- [ ] **No** Show Queue Settings control
- [ ] Cannot manage users / owner-only settings / taxonomy approve / Whatnot Import Shows
- [ ] Assisted Creation remains helper read-only (ADR-FP-088)

### Regression

- [ ] Owner/Admin Show Queue Settings still works
- [ ] Owner/Admin AI Review unchanged
- [ ] Customer permissions unchanged

## Pass criteria

Reply with `PASS` / `FAIL: …` / `PASS WITH NOTES: …` after helper-account DEV QA on the **worktree** Studio above.
