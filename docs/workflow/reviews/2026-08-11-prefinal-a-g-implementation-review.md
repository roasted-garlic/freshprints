# Implementation Review: Pre-final A–G correctives

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Reviewer | Implementation Review (independent checklist vs Formal Review constraints 1–20) |
| Plan | docs/workflow/plans/2026-08-11-prefinal-portal-search-and-global-og-corrective-plan.md |
| Formal Review | docs/workflow/reviews/2026-08-11-prefinal-portal-search-and-global-og-corrective-plan-review.md |
| Production base | `913329caefa5cf5041b269da1e5192424d0b95c6` |
| Verdict | **approved_with_notes** |

---

## Branches / commits

| PR | Branch | Tip commit |
|----|--------|------------|
| PR-Portal (A+B+G) | `fix/prefinal-a-g-portal-wt` | `e618a87` |
| PR-OG (C+D) | `fix/prefinal-a-g-og` | `9d2144d` |
| PR-Intake (E) | `fix/prefinal-a-g-intake` | `684717b` |
| PR-Quota (F3) | `fix/prefinal-a-g-quota` | `e7d6863` (feature `d33f085` + chore drop state) |

---

## Binding constraints 1–20

| # | Constraint | Status | Evidence |
|---|------------|--------|----------|
| 1 | Studio Algolia parity `prefixLast` | **pass** | Shared helper used by Studio `studioAlgoliaCatalogSearchService` |
| 2 | Stale-q vs local test | **pass** | `shouldApplyCatalogUrlSearchToLocal` + CatalogPageContent wiring + tests |
| 3 | Category/syncLibraryUrl | **pass** | `syncLibraryUrl` sets `lastSelfPushedQRef`; category still applied on echo |
| 4 | Static Image resolved asset | **pass** | `PortalStaticOgImageSnapshot` + finalize at Save |
| 5 | Storage Rules gate if new path | **pass / checkpoint** | `storage.rules` changed in OG PR — **human deploy checkpoint** |
| 6 | Bust Function + Portal OG caches | **pass** | `invalidatePortalGlobalOpenGraphCache` on update; Portal `?v=` + 60s TTL |
| 7 | Portal brand default strings | **pass** | `PORTAL_APP_NAME` / `PORTAL_DEFAULT_DESCRIPTION` / shared defaults Whatnot |
| 8 | Verify Save via Function JSON | **noted** | Manual post-deploy; primary verification path documented |
| 9 | Donate pending; attach not | **pass** | `submitForStaffReview` true/false + tests |
| 10 | Review after successful allocation | **pass** | Queue TX + `onShowAllocationCreated` |
| 11 | Portal TX + onCreate | **pass** | Both wired |
| 12 | No Rules relaxation; no migration; one-way | **pass** | Docs + code |
| 13 | Cap L unchanged | **pass** | F3 no Cap L changes |
| 14 | Donate day refund on hard delete | **pass** | `refundDonationFinalizeQuota` in delete TX |
| 15 | Portal self-delete own+blockers | **pass** | `previewPortalCustomerUploadDeletion` / `deletePortalCustomerUpload` |
| 16 | Donate quota UI refresh | **pass** | Gallery delete → quota refresh path |
| 17 | Keep concurrency/size/batch | **pass** | Untouched |
| 18 | About owner copy | **pass** | `PORTAL_HELP_ABOUT_PARAGRAPHS` |
| 19 | Single About panel + Whatnot CTA | **pass** | Unchanged panel wiring |
| 20 | Bundled FAQ + Studio FAQ checkpoint | **pass / checkpoint** | Bundled FAQ updated; **manual** if live `settings/portalHelp` overrides |

---

## Test summary (automated this session)

| Area | Result |
|------|--------|
| A/B shared + Portal containment | pass |
| G About/FAQ | pass |
| E confirmation + queue wiring | pass (13) |
| C/D social meta + Portal OG cache tests | pass (28) |
| F3 refund + deletion contracts | pass (16) |
| Portal `tsc --noEmit` (portal-wt) | pass |
| Functions `tsc` (intake/quota/og) | pass (no new errors reported in focused runs) |
| Studio `tsc` | **notes** — existing `packagedBuildConfig` missing in env (pre-existing) |

---

## Deploy / mutate confirmations

- No App Hosting / Functions / Rules **deploy** performed
- No Algolia settings/data mutation
- No migration/backfill
- Storage Rules **source changed** in OG PR (not deployed)
- New Function exports (Quota): `previewPortalCustomerUploadDeletion`, `deletePortalCustomerUpload`
- OG: helpers in `portalStaticOgImage.ts` (no new public HTTPS export beyond existing update/get)

---

## Manual checkpoints (owner)

1. Studio FAQ content if production `settings/portalHelp` overrides bundled `what-is-print-request`
2. Storage Rules deploy with OG PR
3. Functions deploy wave(s) for OG + Intake + Quota
4. App Hosting for Portal PRs

---

## Verdict

Implementation matches approved Plan under Formal Review constraints. **approved_with_notes** for Storage Rules deploy gate, Studio FAQ content check, and pre-existing Studio packagedBuildConfig typecheck noise.

**Do not deploy until owner merge/deploy approval.**
