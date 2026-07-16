# Review: Restore Etsy Open API search (link-first)

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-16-etsy-open-api-restore-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Plan correctly restores server-side Open API search under the existing link-first Portal layout, forbids scrape re-add, keeps admin suggestion overlays, and hardens copy so fallback/link CTAs do not say “Etsy.” Security posture matches prior foundation (secret-bound callable, no client keywords). Proceed to implement with the required changes below.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Open API only; no scrape; dev-only |
| Architecture alignment | pass | Hook → service → callable → Open API |
| Security impact addressed | pass | Secret Manager; soft-fail; rate limits; URL sanitize |
| Data model impact addressed | pass | Rebuild keywords from answers; rate-limit writes resume |
| Backend impact addressed | pass | Callable + secret re-wire documented |
| Test strategy adequate | pass | Unit + manual QA |
| Human checkpoints identified | pass | Secret set + UI PASS/FAIL |
| Roadmap alignment | pass | Phase 9A product correction |
| Documentation plan | pass | ADR-FP-087l + BACKEND/DATA_MODEL |
| No silent scope expansion | pass | Diagnostics UI explicitly out |

---

## Architecture Review

**Findings:**
- Restoring prior callable stack is preferred over inventing a new vendor path.
- Listing grid belongs below polished Primary/Broader cards.

**Required changes:**
- [x] Prefer rebuilding `apiKeywords` from request `answers` at search time (do not require rewriting submit fields this phase).
- [x] Align Open API keyword digital term with current builders (`png` only — no `digital download` token).

---

## Security Review

**Findings:**
- API key must never ship to Portal; bind only to `searchEtsyRecommendations`.
- Soft-fail when secret missing avoids hard 500s and secret leakage.
- Rate-limit collection remains client deny-all (already in rules).

**Required changes:**
- [x] User-facing unavailable/empty messages must not include secret names or raw Etsy error bodies.
- [x] Do not print secret values in chat, docs, or deploy logs summaries.

**Human approval needed before production:**
- [x] Production deploy — out of scope / forbidden this phase

---

## Data Model Review

**Findings:**
- No migration; optional legacy `apiKeywords*` ignored.

**Required changes:**
- [x] Update DATA_MODEL to state Open API search is live again; scrape remains removed.

---

## Backend Review

**Findings:**
- Secret was deleted from `fresh-prints-dev`; deploy alone may yield soft empty until owner re-sets secret.

**Required changes:**
- [x] After deploy, record whether secret is configured (boolean only) and ops command name without values.

---

## Testing Review

**Findings:**
- Normalize + query-builder unit tests required; Portal listing path needs manual QA.

**Required changes:**
- [x] Manual QA checklist must verify “no Etsy” in link/fallback CTAs and warning about elaborate queries.

---

## Documentation Review

**Findings:**
- Need ADR-FP-087l superseding 087f product path while preserving 087j (no scrape).

---

## Required Changes (if approved_with_changes)

1. Rebuild API keywords from answers at search; digital term = `png` only.
2. Soft-fail unavailable when secret missing; links remain usable.
3. Copy audit: link cards + empty/fallback messaging avoid the word “Etsy”; trademark statement may remain.
4. Document secret re-set status without values; deploy `fresh-prints-dev` only.
5. Keep admin suggestion overlays (087k) untouched functionally.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Owner product decision is clear; security and architecture align with prior approved Open API foundation. Conditional approval encodes copy, soft-fail, and keyword-alignment constraints for implement.

---

## Next Step

Implement approved scope with required changes; then automated tests + deploy to `fresh-prints-dev` + manual QA checkpoint.
