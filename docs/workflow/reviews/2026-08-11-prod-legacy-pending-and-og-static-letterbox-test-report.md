# Test report: Legacy Pending recon tooling + Global OG Static letterbox

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Plan | `docs/workflow/plans/2026-08-11-prod-legacy-pending-and-og-static-letterbox-plan.md` |
| Implementation Review | `docs/workflow/reviews/2026-08-11-prod-legacy-pending-and-og-static-letterbox-implementation-review.md` (**approved**) |
| Status | **passed** (automated + owner manual Static OG QA) |

---

## Commands & results

| Check | Command | Result |
|-------|---------|--------|
| Track A predicates | `node --test functions/scripts/lib/legacyPendingFalsePendingRepairGuard.test.mjs` | **18/18 pass** |
| Track B + OG regressions | `npx tsx --test` letterbox/urls/compose/global OG/shared URL/static resolve | **26/26 pass** |
| Functions build | `npm run build --prefix functions` | **pass** (exit 0) |
| Studio typecheck | `npx tsc -p apps/studio/tsconfig.json --noEmit` | **pass** (exit 0) |
| Lint (focused) | `npx eslint` Studio social settings + OG Functions files | **pass** (exit 0) |
| `git diff --check` (touched scoped files) | scoped paths | **pass** |

### Track A predicate coverage

PASS / SKIP / IDEMPOTENCY matrix including: draft PASS, active/editing, bidding ack, live allocation, canceled-only not live, status changed, donation/other purpose, incompatible lifecycle, not allowlisted, missing request, already `not_eligible`.

### Track B coverage

Static Design + Upload letterbox URLs (not raw); path parser reject; compose 1200×630 regressions; Global OG cache helpers; shared URL builder.

---

## Not run / deferred

| Item | Why |
|------|-----|
| Facebook Scrape Again manual | **PASS** — owner `DEV STATIC OG LETTERBOX QA: PASS` |
| Track A prod dry-run / APPLY | Explicitly deferred (separate gate) |
| Full monorepo lint / full Functions suite | Focused suites sufficient for this corrective; no claim of full sweep |

---

## Notes

- Prior A–H DEV QA PASS does **not** cover Static letterbox (signoff amended).
- Production tip untouched; no Rules/index/App Hosting deploy.
- **DEV deploy (2026-08-11):** `firebase deploy --only functions:getPortalGlobalOpenGraph,functions:getPortalOgShareImage --project fresh-prints-dev` → **Deploy complete** (both Successful update operation).

---

## Manual QA

**Owner:** `DEV STATIC OG LETTERBOX QA: PASS` (2026-08-11)

- CASE A Design Library Static + CASE B Uploaded Static on `https://myprintrequest.dev/`
- Facebook Sharing Debugger Scrape Again — letterbox / full artwork visible
