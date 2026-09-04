# Canary Result — Humor Dominant-Intent Override Reliability (DEV)

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Project | **fresh-prints-dev** |
| Deploy | `docs/workflow/reviews/2026-09-04-humor-dominant-intent-override-reliability-dev-deploy-record.md` |
| Script | `functions/scripts/humor-reliability-canary-dev.mjs` |
| Raw JSON | `docs/workflow/reviews/_humor-reliability-canary-dev-results.json` |
| Overall | **FAIL** — stopped at `#1` run 1/10 |

---

## #1 reliability (7bVlWMFwxECdfHH8VNPB)

| Run | Raw/model category | Final category | PASS/FAIL |
|-----|--------------------|----------------|-----------|
| 1 | (not persisted / null) | **Animals** | **FAIL** |
| 2–10 | not run | — | — |

| Metric | Value |
|--------|-------|
| Funny & Sarcastic count | **0** |
| Non-Funny count | **1** |
| Overall #1 | **FAIL** |

### Run 1 durable evidence (post-enrichment)

| Field | Value |
|-------|-------|
| Prompt / normalizer | catalog-enrich-v33 / smart-profile-normalizer-v6 |
| AI title | F-caw-f Raven |
| Description | Bold, distressed lettering above spells out "F-CAW-F". |
| visibleText | F-CAW-F |
| subjects | raven, bird |
| themes | humor, quirky, animal humor |
| interests | animals, pets, humor |
| searchConcepts | includes **funny bird**, **sarcastic bird**, **raven pun**, **animal pun**, … |
| matchedTags / sug.tags | teentitans, black, white, distressed, typography (no funny/sarcastic tags) |
| aiSuggestions.categoryName | **Animals** |
| Shadow | needs_review (`structured_evidence_gap:subjects:bird`) |
| Ready transition | **NO** |

### Anomaly (investigation)

Local `resolveThemeCategory` with the **same persisted signal bag** (including searchConcepts funny/sarcastic + pun) resolves to **Funny & Sarcastic**.

Deployed enqueue source zip for `00089-kod` **contains** `isJokePrimary` + `buildThemeCategoryResolveInput`.

Therefore live write of Animals despite joke-primary evidence in the final Smart Profile is an unresolved pipeline timing/wiring anomaly: either resolve-time `smartProfileEnrichmentParse` lacked searchConcepts/themes that later appear on the profile, or another resolve-time input difference not durable on the design doc.

**Per owner gate:** stop — do not continue 10×, do not WS4.

Abort reason: `[NEEDS OWNER DECISION — HUMOR RELIABILITY CANARY FAILURE]`

---

## Regressions #9 / #12 / #13

**Not run** (aborted after #1 failure).

---

## Safety

| Item | Result |
|------|--------|
| Automatic Ready | **0** |
| Ready Catalog reprocess | **NO** |
| Autonomous | **OFF** |
| Tags / Rules / production / commit | unchanged / not performed |
