# Canary Result — Category Dominant-Intent Calibration (Gate A + Four Designs)

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Project | **fresh-prints-dev** |
| Deploy | `docs/workflow/reviews/2026-09-03-category-dominant-intent-calibration-dev-deploy-record.md` |
| Live pipeline | **catalog-enrich-v33** / **smart-profile-normalizer-v6** / **smart-profile-v1** |
| Mode | **shadow** |
| Autonomous | **OFF** |
| Method | `enqueueAiEnrichment` with `rerunFromReview` when Needs Review (plain enqueue if pending) |
| Scripts | `functions/scripts/category-dominant-intent-canary-dev.mjs`, `category-dominant-intent-canary-1-rerun-dev.mjs` |
| Raw JSON | `_category-dominant-intent-canary-dev-results.json`, `_category-dominant-intent-gate-a-9-dev-result.json`, `_category-dominant-intent-canary-1-rerun.json` |

---

## Gate A — #9 cache attribution

| Field | Value |
|-------|-------|
| Design | `1Ws0T9fivryest6IUSbt` |
| Taxonomy meta revision | **11** (`ready: true`) |
| `Cannabis & 420` in materialization | **YES** |
| `Astrology & Zodiac` in materialization | **YES** |
| Category count | 21 |
| Prompt / normalizer after | v33 / v6 |
| Primary after | **Cannabis & 420** |
| Alternatives | `[]` (Funny & Sarcastic optional alt absent — note only) |
| Shadow | `needs_review` — `structured_evidence_gap:objects:cannabis leaves` |
| Ready transition | **NO** |
| Cache attribution | **B** — category-calibration logic was also required (cache-only not proven as sole prior cause; historical TTL possible but not re-created) |

---

## Four-design canary

| Slot | ID | AI title | Primary | Alts | Shadow | Expected | Suite result | Latest note |
|------|-----|----------|---------|------|--------|----------|--------------|-------------|
| #1 | `7bVlWMFwxECdfHH8VNPB` | F-caw-f Raven | see note | `[]` | shadow wouldAutoApprove | Funny & Sarcastic | **FAIL** (`Food & Drink`) | **Re-run PASS** → Funny & Sarcastic |
| #9 | `1Ws0T9fivryest6IUSbt` | Just Hit It Swoosh | Cannabis & 420 | `[]` | needs_review (object gap) | Cannabis & 420 | **PASS** | — |
| #12 | `7BjqFQIhkavo80sv5kCp` | Aries … Ram | Astrology & Zodiac | `[]` | needs_review (stars gap) | Astrology & Zodiac | **PASS** | — |
| #13 | `E2fVUzTL8Smx0gXaGqUZ` | I Am Their Father … | Pop Culture & Characters | `[]` | needs_review (subject/object gaps) | Pop Culture & Characters | **PASS** | Not Family |

### #1 intermittency (important)

Humor exact-match override currently fires only when the model’s exact approved category is **Animals**.

| Run | Model path outcome | Primary |
|-----|-------------------|---------|
| Suite canary | exact `Food & Drink` (bad model pick) + funny/sarcastic tags | **Food & Drink** — FAIL (override not Animals-gated) |
| Immediate re-run | description includes “humorous”; tags funny/sarcastic | **Funny & Sarcastic** — PASS |

Live #1 **latest** state for owner QA: **Funny & Sarcastic** (v33/v6).

**Anomaly:** `#1` is not deterministic across model variance; Animals-only humor override gap remains.

---

## Quality / regression spot-check (canary evidence)

| Check | Result |
|-------|--------|
| Title quality | Acceptable (F-caw-f Raven; Just Hit It Swoosh; Aries trait title; Father/Vader title) |
| Description / visibleText | No OCR-dump regression observed on these four |
| Subject canonicalization | raven / empty or cannabis leaves objects — no F-CAW-F glue subject |
| #13 Family regression | **PASS** — stayed Pop Culture |
| Ready auto transitions | **0** |
| Family/Faith/Teacher bulk recheck | Not re-run live; automated goldens remain from IR |

---

## Taxonomy cache cost

Architecture verification only (no load experiment): revision-aware meta peek is live in deployed source; Gate A succeeded with current revision **11** containing Cannabis & 420. No extra full-corpus read experiment performed.

---

## Safety

| Item | Result |
|------|--------|
| Automatic Ready | **0** |
| Ready Catalog reprocess | **NO** |
| Autonomous | **OFF** |
| Tags / matchedTags / Algolia / Rules / Storage / indexes / migration / production / commit | **unchanged / not performed** |

---

## WS4 note (for next checkpoint)

WS2 Ready baseline was v32/v6-oriented (359 eligible; 13 already v32/v6; 346 stale). After this corrective, any future WS4 Ready reconciliation must target **catalog-enrich-v33 / smart-profile-normalizer-v6**, not blindly the prior v32 plan. **WS4 remains blocked** until owner category canary disposition.

---

## Overall agent assessment

**PASS WITH NOTES** pending owner QA:

- #9 / #12 / #13 solid on expected primaries
- #1 latest PASS but suite showed Food & Drink fail → needs owner call on whether Animals-only humor override is acceptable or needs follow-up calibration
