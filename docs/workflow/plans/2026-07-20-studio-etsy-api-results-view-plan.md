# Plan: Studio view of Etsy Open API search results

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-20-studio-etsy-api-results-view-review.md |
| Parks | Small Managed #12 (manual QA / Functions deploy pending) |

---

## Goal

Studio staff reviewing a Custom Designs → **Etsy** saved search can open what the **Etsy Open API** returned for that request (listing cards + keywords used)—not only the public website “Open on Etsy” / “Browse more on Etsy” links.

## Background

Phase 9A (ADR-FP-087l / ADR-FP-087n) stores questionnaire answers, `canonicalQuery`, and website search URLs on `etsyRecommendationRequests`. In-app listing cards come from callable `searchEtsyRecommendations` and are **ephemeral on the response**—not written to the request doc (`DATA_MODEL.md`). Studio’s Etsy detail pane therefore cannot show API results today.

Owner need: for requests like “axolotl, boat, chef”, staff should inspect the same API result set the customer’s Portal previews used (or a staff-triggered refresh when no snapshot exists yet).

## Scope

### In Scope

1. Persist a bounded **last Open API search snapshot** on `etsyRecommendationRequests` when Portal `searchEtsyRecommendations` completes (ok / empty / unavailable).
2. Staff-only callable to **fetch/refresh** Open API results for a request (any status), write the same snapshot, return listings—so legacy docs and completed searches work after Functions deploy without waiting for the customer.
3. Studio Etsy detail UI: action to **View API results** (inline panel or modal) showing keywords/strategy/status/time + listing cards with external listing links; empty state + **Fetch API results** when no snapshot.
4. Shared types + docs (`DATA_MODEL`, `BACKEND`, ADR).
5. Focused automated tests for snapshot write / staff auth seam where practical.

### Out of Scope

- Changing Portal customer listing UI or website browse cards.
- Staff mutations of answers / Done / Cancel on Etsy searches.
- Reintroducing website scrape.
- Production Functions/rules deploy (dev only in this phase; human gate).
- Backfill of historical searches without a staff fetch.
- Persisting raw Etsy HTTP payloads or API keys.

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/types/etsyRecommendation/*` — snapshot type + staff action types
- `functions/src/searchEtsyRecommendations.ts` — write snapshot after search
- `functions/src/staffSearchEtsyRecommendationApiResults.ts` (new) + `functions/src/index.ts` export
- `functions/src/lib/etsy/*` — shared persist helper if useful
- `apps/studio/.../EtsyRecommendationRequestsSection.tsx` + service/types + CSS
- `docs/architecture/DATA_MODEL.md`, `BACKEND.md`, `docs/project/DECISIONS.md`, `SECURITY.md` (brief)

### Architecture Impact

- [x] Details: Services/callables own Open API + Admin writes; Studio UI reads Firestore snapshot and calls staff callable only. No Portal UI layer change required beyond existing search path writing snapshot server-side.

### Security Impact

- [x] Details:
  - Snapshot written only via Admin SDK (client writes remain denied).
  - Staff callable: `assertStaffCaller` (owner/admin/helper per existing staff gate); bind `ETSY_X_API_KEY` secret like Portal search; never return the key.
  - Do not charge customer preview quota for staff fetch.
  - Snapshot contains public listing URLs/images/titles only (already shown to customers).
  - Staff-only UI; customers already can read own request doc (snapshot visible to owner customer is acceptable—same data they saw).

### Data Model Impact

- [x] Details: Additive optional field on `etsyRecommendationRequests`:

```ts
lastApiSearch?: {
  searchedAt: Timestamp;
  status: "ok" | "empty" | "unavailable";
  apiKeywordsUsed?: string;
  keywordStrategy?: "focused" | "fallback";
  listings: EtsyRecommendationListing[]; // max DISPLAY_LIMIT (12)
}
```

No schemaVersion bump required (optional field; readers ignore if absent).

### Backend Impact

- [x] Details:
  - Extend `searchEtsyRecommendations` to persist `lastApiSearch` (best-effort log on write failure; still return listings to customer).
  - New callable `staffSearchEtsyRecommendationApiResults({ requestId })` → search + persist + return (reuse keyword builders + normalize; allow any request status; soft-fail unavailable if secret missing).
  - Deploy to `fresh-prints-dev` required for live QA (human).

### UI / UX Impact

- [x] Details: Studio Custom Designs → Etsy detail pane: “View API results” expands a panel (or modal) under the browse cards. Show API keywords + strategy when present. Listing cards open via `desktopAppService.openExternalLink`. Match existing Studio customer-requests styling; avoid inventing a new design system.

### Migration Impact

- [x] None (additive field).
- [x] Forward: new searches and staff fetches populate `lastApiSearch`.
- [x] Rollback: stop writing field; UI treats missing as empty. Old docs without field remain valid.

---

## Approach

1. Add shared `EtsyRecommendationApiSearchSnapshot` (+ staff request/response types).
2. Extract small Admin helper `persistEtsyRecommendationApiSearchSnapshot(requestId, snapshot)` used by Portal search and staff callable.
3. After Portal search builds response, persist snapshot (including empty/unavailable).
4. Implement staff callable: load request by id; rebuild keywords from answers; run same search/normalize path; do **not** call customer rate-limit charge; persist; return.
5. Studio service: map `lastApiSearch` on list items; add `fetchApiResults(requestId)` via httpsCallable.
6. Studio detail: button + panel with listings; Fetch/Refresh control; loading/error states.
7. Update docs + ADR-FP-087o (or next free ADR id under 087 family).
8. Tests: unit test persist helper and/or staff path with mock Etsy client; Studio mapping if thin enough.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck / unit (functions + shared) | existing package scripts for touched packages | yes |
| Lint | if configured for touched paths | yes if exists |
| Unit tests | new/updated tests for snapshot persist / staff auth soft seams | yes |
| Build | Studio/functions as practical | no (manual soft-reload OK) |
| Integration / E2E | — | no |
| Backend/rules | no rules change expected | document |

### Manual

- Soft-reload Studio after renderer changes.
- Deploy Functions to `fresh-prints-dev` (human): `searchEtsyRecommendations` + new staff callable.
- Open Custom Designs → Etsy → select a search → View API results → Fetch if empty → confirm listings/keywords; Open listing link; confirm website browse cards unchanged.
- Confirm non-staff cannot call staff callable (spot-check via code review / optional negative test).

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (Studio Etsy detail)
- [x] Functions deploy to `fresh-prints-dev` (security-sensitive secret-bound callable)
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars (reuse existing `ETSY_X_API_KEY`; no new secret)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Doc size growth from listings | low | Cap at DISPLAY_LIMIT (12); normalized fields only |
| Snapshot ≠ live Etsy after time | low | Label “Last API search” + timestamp; staff Refresh updates |
| Staff fetch burns Etsy API quota | medium | Staff-only; no customer quota charge; soft-fail; narrow UI |
| Legacy requests empty until fetch | low | Empty state + Fetch button |
| Write failure after customer search | low | Best-effort persist; log warn |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert Functions + Studio UI; leave orphan `lastApiSearch` fields (harmless). Undeploy staff callable if needed.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [x] DATA_MODEL.md
- [x] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md (ADR)
- [x] SECURITY.md (staff callable + snapshot note)

---

## Open Questions

- [x] None — binding defaults: persist last search; staff refresh for any status; no customer quota on staff fetch; Studio inline panel (not separate route).

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-20-studio-etsy-api-results-view-review.md
- Verdict: approved_with_changes (implemented)
