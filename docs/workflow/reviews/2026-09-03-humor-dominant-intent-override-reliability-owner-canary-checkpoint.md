# Manual Test Checkpoint — Owner Humor Reliability Canary

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Feature | Humor dominant-intent override reliability — DEV live canary |
| Environment | **fresh-prints-dev** |
| Deploy | `docs/workflow/reviews/2026-09-04-humor-dominant-intent-override-reliability-dev-deploy-record.md` |
| Canary result | `docs/workflow/reviews/2026-09-04-humor-dominant-intent-override-reliability-canary-result.md` |
| Signoff | `docs/workflow/reviews/2026-09-04-category-dominant-intent-and-humor-reliability-signoff.md` |
| Live versions | **catalog-enrich-v33** / **smart-profile-normalizer-v6** / **smart-profile-v1** |
| Mode | **shadow** · Autonomous **OFF** |
| Agent overall (pre-owner) | FAIL at run 1/10 (Animals) |
| **Owner decision** | **`OWNER ACCEPTED WITH NOTES`** (2026-09-04) |

---

## Owner acceptance

Owner does **not** continue debugging F-CAW-F variance.

- Design `7bVlWMFwxECdfHH8VNPB`: Animals is semantically reasonable (bird/raven); Funny & Sarcastic preferred but not required for automation block.
- Discovery via title/description/subjects/objects/themes/searchConcepts remains sufficient.
- Known limitation: strong joke-primary designs may occasionally retain another plausible exact category.
- No further humor tokens / threshold lowers / hardcodes / instrumentation / prompt bump / Needs Review broadening.
- Policy: plausible suboptimal category alone ≠ Needs Review (**ADR-FP-163**).

Corrective closed **approved_with_notes**. WS4 inventory/Preview may proceed. **No Autonomous. No WS4 Start** until separate owner auth.

---

## #1 — 10 consecutive runs (historical)

| Run | Final category | Result |
|-----|----------------|--------|
| 1 | Animals | FAIL vs prior 10/10 Funny gate |
| 2–10 | not run | — |

Superseded by owner acceptance with notes.

---

## Regressions

| # | Expected | Result |
|---|----------|--------|
| 9 / 12 / 13 | Cannabis / Astrology / Pop Culture | Prior Gate A OK; not re-run after humor deploy (owner accepted limitation) |
