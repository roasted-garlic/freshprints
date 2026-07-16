# Signoff: Phase 9A Website-first Etsy Open API rip

| Field | Value |
|-------|-------|
| Date | 2026-07-15 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-15-phase-9a-etsy-website-first-api-rip-plan.md |
| Review | approved via owner plan attachment / direction |
| Test report | docs/workflow/reviews/2026-07-15-phase-9a-etsy-website-first-api-rip-manual-qa.md |
| Final status | **approved** |

---

## Summary

Removed Etsy Open API search from Phase 9A. Portal results are Primary + Broader website search link cards only. Questionnaire + submit / Done / Cancel lifecycle retained. Scraping deferred behind ToS/legal gate (R-010).

---

## Changes Delivered

### Behavior
- No `searchEtsyRecommendations` callable; no in-app listing grid, diagnostics, quota, or Search again
- After submit → results with Etsy website Primary + Broader links
- Trademark copy no longer claims the app uses the Etsy API

### Files Created
- `docs/workflow/plans/2026-07-15-phase-9a-etsy-website-first-api-rip-plan.md`
- `docs/workflow/reviews/2026-07-15-phase-9a-etsy-website-first-api-rip-manual-qa.md`
- This signoff

### Files Modified / Deleted
- Deleted: `searchEtsyRecommendations.ts`, live Etsy client / normalize / rate-limit stack, `EtsyListingCard.tsx`, diagnostics copy util
- Portal wizard / results / service slimmed to link-only
- Shared: removed API keyword builders; trimmed types/constants
- Submit no longer writes `apiKeywords*`

### Documentation Updated
- ADR-FP-087f; DATA_MODEL; BACKEND; SECURITY; RISK_REGISTER (R-010, R-C03); ROADMAP; workflow state; CURRENT-STATE

---

## Tests

### Automated
- `npx tsx --test packages/shared/src/utils/etsyRecommendation*.test.ts` — pass
- `functions` `tsc` / deploy build — pass

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Website-first link results (Primary + Broader, no API grid) | PASS | owner |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-07-15 | Dev only |
| Database migration | N/A | | |
| Design / UX | obtained | 2026-07-15 | Owner PASS |
| Business / policy | obtained | 2026-07-15 | Website-first; scrape deferred |
| Secrets / env | not required | | Secret Manager key left in place unused |

---

## Risks & Known Issues
- R-010: scraping for in-app cards blocked until ToS/counsel approval
- Production Portal not redeployed

---

## Follow-ups
- ~~Optional: delete unused `ETSY_X_API_KEY` from Secret Manager~~ — done 2026-07-15 on `fresh-prints-dev` (see `docs/workflow/reviews/2026-07-15-etsy-open-api-secret-cleanup-ops-note.md`)
- Scraping phase only after documented legal/ToS approval
- Broader Phase 9 (AI / Assisted Creation) remains deferred

---

## Final Status

**approved** — 2026-07-15
