# Test Report: Studio view of Etsy Open API search results

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-07-20-studio-etsy-api-results-view-plan.md |
| Implementation | Session (uncommitted) |
| Overall | **passed** |

---

## Summary

Automated unit tests for the shared Open API search core passed (12/12 with related normalize tests). Functions `tsc` build passed. Studio UI + snapshot persist + staff callable are implemented. Functions deployed to **fresh-prints-dev** (2026-07-20). Owner Studio manual QA: **PASS** (2026-07-20).

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Typecheck | `npm run build --prefix functions` | 0 | pass | Includes new staff callable + core |
| Lint | — | — | skip | Not run for whole monorepo this phase |
| Unit tests | `npx tsx --test functions/src/lib/etsy/etsyRecommendationApiSearchCore.test.ts functions/src/lib/etsy/normalizeEtsyListings.test.ts` | 0 | pass | 12 tests |
| Build | same as typecheck (functions) | 0 | pass | |
| Integration | — | — | skip | No emulator harness for this slice |
| E2E | — | — | skip | Not configured |
| Backend/rules | — | — | skip | No rules change (client writes still denied) |

---

## Failures (if any)

None in automated checks.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Full ESLint | Narrow phase; no IDE lints on touched Studio/Functions files |
| Studio Electron build | Soft-reload sufficient for QA |
| Functions live call | Requires human deploy of secret-bound callables |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Studio View / Fetch API results | **PASS** | Owner (2026-07-20) |
| Functions deploy `fresh-prints-dev` | **PASS** | Deployed 2026-07-20; confirmed via QA |

### Soft-reload / restart notes

1. **Functions (required for Fetch / Refresh and Portal snapshot writes):**
   ```bash
   firebase deploy --only functions:searchEtsyRecommendations,functions:staffSearchEtsyRecommendationApiResults --project fresh-prints-dev
   ```
2. **Studio:** soft-reload the Electron renderer or restart `npm run dev:studio` so the Etsy detail panel picks up the new UI.
3. **Portal (optional):** soft-reload if verifying that a customer “Search again” also writes `lastApiSearch` without staff Fetch.

## Manual Test Checkpoint

**Feature / area:** Studio Custom Designs → Etsy → View API results  
**Why automated tests are insufficient:** Staff UI + live Etsy Open API + secret-bound callable  
**Environment:** local Studio against `fresh-prints-dev`  
**Prerequisites:** Staff login; Functions deploy above; at least one `etsyRecommendationRequests` row (e.g. “axolotl, boat, chef”)

### Steps
1. Open **Custom Designs → Etsy** → select a saved search → **Expected:** answers + Best match / broader website cards still work.
2. Click **View API results** → **Expected:** panel opens; if no snapshot yet, empty-state copy; if snapshot exists, status / keywords / listing cards.
3. Click **Fetch API results** (or **Refresh**) → **Expected:** listings (or empty/unavailable) appear; keywords/strategy shown when available; Firestore `lastApiSearch` populated (optional console check).
4. Click **View listing** on a card → **Expected:** listing opens externally.
5. Confirm website **Open on Etsy** / **Browse more** still open public search URLs (unchanged).

### Pass criteria
- [x] View / Fetch / Refresh work for staff without errors
- [x] Listing cards reflect Open API results (not only website links)
- [x] Website browse cards unchanged
- [x] No API key visible in UI or Firestore snapshot fields

### Owner reply
- **PASS** (2026-07-20)

---

## Recommendations

- Consider adding a thin Studio mapping unit test if the service grows.
- Production deploy of the new secret-bound callable remains a separate human gate.

---

## Signoff Readiness
- [x] All required automated checks pass OR failures documented
- [x] Manual tests complete OR checkpoint pending
- [x] Ready for signoff phase

**Next step:** signoff (complete) — see `docs/workflow/reviews/2026-07-20-studio-etsy-api-results-view-signoff.md`
