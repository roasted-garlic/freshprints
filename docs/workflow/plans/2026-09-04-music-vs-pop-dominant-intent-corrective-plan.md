# Plan: Music & Bands vs Pop Culture dominant-intent corrective

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (corrective diagnostic) |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Related Formal Review | `docs/workflow/reviews/2026-09-04-music-vs-pop-dominant-intent-corrective-review.md` |
| Trigger | Owner-found material Music-vs-Pop miss after v34 canaries otherwise PASS |
| Live runtime | `catalog-enrich-v34` / `smart-profile-normalizer-v6` / `smart-profile-v1` · shadow · Autonomous OFF |

---

## Goal

Stop **named band / album / music-identity** designs from finalizing as **Pop Culture & Characters** when a more specific **Music & Bands** category exists and durable Smart Profile evidence shows music as the central buyer intent—without hardcoding artists, building a giant precedence table, or adding tag/reranker dependencies before tag retirement.

---

## Background

Owner v34 taxonomy canaries (Faith, Music/Pop competitive Dolly, Pop Scooby, Inspirational) passed. An additional Ready case remains materially wrong:

| Field | Live DEV evidence |
|-------|-------------------|
| Design ID | **`Wt5eILv4uyCnYNoJI8uZ`** |
| Exact title | **Judas Priest Painkiller** (no design titled “Judas Priest Painkiller Dragon Rider”; dragon/motorcycle are in subjects/objects/searchConcepts) |
| Status | `ready` / `aiReviewStatus: approved` |
| Final category | **Pop Culture & Characters** (`Sn9nmGJvFlIRO4DnFnIB`) |
| Provenance on design | `catalog-enrich-v33` / `smart-profile-normalizer-v6` / `smart-profile-v1` (enriched `2026-09-04T14:27:12Z`) |
| Smart Profile (persisted) | themes: music, heavy metal, iconic · interests: music, heavy metal, rock music, pop culture · visibleText: Judas Priest, PAINKILLER · searchConcepts: band logo, album art, song art, metal band, heavy metal music, rock band, … · subjects: character, dragon · objects: motorcycle, wings |

`rawCategory` is **not persisted** (pipeline deletes `analysis.rawCategory` after resolve). Decision must be reconstructed from resolver behavior + live signals.

---

## Diagnostic answers (source-backed)

### Architecture (confirmed)

Desired flow matches source:

1. Gemini (+ v34 category descriptions when resolved template is DEFAULT) proposes `category` + Smart Profile arrays.
2. `resolveThemeCategory` (`functions/src/ai/catalogThemeCategoryResolver.ts`) validates against approved taxonomy and applies **narrow** dominant-intent overrides.
3. `smart-profile-v1` is **evidence/schema**, not a separate classifier (`buildDesignSmartProfile` after category resolve).

### Trace for `Wt5eILv4uyCnYNoJI8uZ`

| # | Question | Answer |
|---|----------|--------|
| 1 | Raw Gemini category | **Not persisted.** Reconstruct: must have been exact approved name **`Pop Culture & Characters`** (see #6). |
| 2 | Raw persisted separately? | **NO** — `aiEnrichmentCandidateCore` deletes `result.analysis.rawCategory` after resolve; only final `aiSuggestions.categoryName/Id` remains. |
| 3 | Category into resolver | Transient `rawCategory` (inferred: exact Pop) + title/description/visibleText/matchedTags + enrichment-parse subjects/objects/themes/interests/searchConcepts. |
| 4 | Category out of resolver | **Pop Culture & Characters** |
| 5 | Resolver actions | Exact approved-name match **YES**; dominant-intent override **NO** (no Music family); fallback scoring **SKIPPED** because exact matched; category-description tokens used only if scoring/override families run; matchedTags in signal bag but not needed for exact accept; SP dimensions in signal bag for override/fallback only. |
| 6 | Exact branch | `findExactCategoryNameMatch` → `resolveExactMatchWithDominantIntentOverride` → **return exactMatch** (no cannabis/astrology/joke-primary override applies). |
| 7–8 | Music score? | Exact path **does not score**. Replay with **same** SP signals and **no** exact raw → fallback picks **Music & Bands**. Near-raw `"Pop Culture"` also → Music. |
| 9 | Dimensions resolver consumes today | title, description, visibleText, matchedTags, subjects, objects, themes, interests, searchConcepts. **`professionsGroups` not wired** into `ResolveThemeCategoryInput` / `buildThemeCategoryResolveInput` (even though parse/schema have it). |
| 10 | Exact approved answer trusted before Music evidence can correct? | **YES** — exact match short-circuits unless one of the existing override families fires. **There is no Music-vs-Pop override.** |

Replay (DEV taxonomy + live SP on this design):

- `rawCategory = "Pop Culture & Characters"` → Pop  
- `rawCategory` absent / `"Pop Culture"` → **Music & Bands**

So structured music evidence **would win on fallback scoring**; it **lost because exact-match trust skipped scoring**.

### Why v34 descriptions / prompt were insufficient on this case

**Live Music & Bands description** (revision 17 materialization):

> Use for designs centered on music, bands, singers, musicians, concerts, tours, albums, music genres, instruments, DJs, music fans, lyrics-style sayings, and music-lover identity. … Choose Pop Culture & Characters instead when the design is mainly a movie, TV, cartoon, game, meme, or non-music fandom reference.

**Live Pop Culture & Characters description**:

> Use for designs centered on characters, fandoms, movies, TV shows, cartoons, anime, gaming, memes, celebrity-style parody, nostalgia, internet culture, and entertainment references that are not primarily music-based. … Choose Music & Bands instead when the main buyer intent is a band, musician, singer, concert, album, music genre, instrument, or music-lover identity.

Taxonomy wording is **already reciprocal and adequate**. Pop does **not** inadvertently instruct “named bands → Pop”; it explicitly defers music identity to Music & Bands.

Prompt (v34 DEFAULT) has dominant-intent examples for humor, cannabis, astrology>pop, franchise>family — **no** explicit “named band/album/song/tour → Music & Bands, not Pop.” This design’s last stamp is **v33** (names-only). Even under perfect descriptions, **exact-match trust** still locks Gemini’s wrong exact Pop name.

### Options compared

| Option | Verdict |
|--------|---------|
| **A. Taxonomy-description-only** | **Insufficient alone** for this failure mode (wording already correct; exact match bypasses description scoring). Optional polish only. |
| **B. Prompt-only refinement** | Helps Gemini; still fails when model returns exact Pop. Soft alone. |
| **C. Narrow deterministic Music-vs-Pop dominant-intent safeguard** using durable SP signals | **Recommended core** — mirrors humor/astrology/cannabis pattern; tag-retirement compatible if matchedTags not required. |
| **D. Combination** | **Recommended**: **C required** + optional one-line prompt example (belt-and-suspenders). |

---

## Scope

### In Scope

- Narrow resolver safeguard: when exact match is Pop Culture & Characters **and** strong multi-signal music-domain evidence from durable dimensions, override to Music & Bands (if present in approved list).
- Optionally wire `professionsGroups` into resolver signal bag (already on enrichment parse / schema — **not** a schema bump).
- Optional prompt one-liner example → would require **catalog-enrich-v35** (only if chosen).
- Focused unit/contract tests + owner goldens matrix.
- ADR note if behavior becomes architectural.

### Out of Scope

- Implementation in this diagnostic pass (Plan + Review only)
- Artist/band name hardcoding / giant category precedence tables
- Taxonomy mutation this pass (descriptions already OK)
- Faith→Music forcing; tag retirement itself; WS4 closeout; WS5; Autonomous; production; commit/push

---

## Affected Areas

### Files / Modules (expected on implement)

- `functions/src/ai/catalogThemeCategoryResolver.ts` (+ tests)
- `functions/src/ai/aiEnrichmentCandidateCore.ts` — only if wiring `professionsGroups` into `buildThemeCategoryResolveInput`
- Optionally `packages/shared/src/constants/aiEnrichment.constants.ts` — prompt example + version bump to v35
- Optionally version constants / catalog reprocess snapshot if prompt bumped
- `docs/project/DECISIONS.md` — ADR if approved

### Architecture Impact

- [x] Details: Extends existing exact-match dominant-intent second-pass; does not introduce a second classifier; Smart Profile remains evidence.

### Security / Data / UI / Migration

- [x] None material (deterministic pure function; no Rules/Storage; no schema version change expected)

### Backend Impact

- [x] Details: Enrichment Functions that bundle the resolver must redeploy on implement (same inventory family as prior category correctives).

---

## Approach (for later implement — not this pass)

1. Add a **Music priority family** (general tokens: band, bands, album, concert, tour, musician, musicians, singer, guitar, drums, lyrics, metal, rock, country, dj, … — **no artist names**) used for override detection and Music category targeting via existing `findBestApprovedCategoryForFamily` / Music category predicate (name/description tokens: music, band, bands, musician, …).
2. In `resolveExactMatchWithDominantIntentOverride`, after existing cannabis/astrology/humor checks: if exact is Pop **and** music-domain hits ≥ threshold across **independent** durable signals (themes + interests + searchConcepts + visibleText + title/description; optionally professionsGroups) **and** faith/life-role is not dominant **and** franchise-movie/TV/game/cartoon franchise tokens do not dominate → override to Music & Bands.
3. Prefer **agreement across dimensions** over a single token (e.g. require ≥2 distinct music hits **and** at least one explicit music-identity cue from visibleText/title/searchConcepts such as band/album/song/concert/tour/musician — still generic, not Judas Priest).
4. Do **not** require matchedTags / reranker / aliases.
5. Protect Pop goldens: Scooby / Disney / game fandom without music-domain agreement must stay Pop.
6. Protect Faith: do not override Faith exact matches; if Pop exact but faith-dominant life-role signals, do not Music-override.
7. Optional: add one prompt example: named band/album/song/tour merchandise → Music & Bands not Pop → bump to **v35**.
8. Tests first for Judas-shaped fixture (synthetic signals, no artist hardcode in production rule).

### Faith / Music crossover

Default proposed product rule for implement:

- Dominant **faith/worship/scripture** → keep **Faith & Worship** (existing life-role / Faith priority; no Music override of Faith exact).
- Dominant **Christian band / worship-team merchandise** where music identity is primary may remain ambiguous.

Flag: **[NEEDS OWNER DECISION — FAITH VS MUSIC CROSSOVER]** only if owner wants an explicit precedence beyond “do not steal Faith exact matches / faith-dominant Pop cases.”

No schema change expected: **[NEEDS OWNER DECISION — SMART PROFILE SCHEMA CHANGE]** **not** triggered.

---

## Test Strategy

### Automated

| Check | Focus |
|-------|--------|
| Unit | Judas-shaped: exact Pop + multi music SP signals → Music |
| Unit | Scooby / franchise Pop exact + no music agreement → stay Pop |
| Unit | Dolly music-competitive shaped signals → Music (or stay if owner goldens differ) |
| Unit | Faith exact + music incidental → Faith |
| Unit | Humor / cannabis / astrology overrides unchanged |
| Unit | No matchedTags required for Music override |
| Contract | Tag-retirement: override still works with `matchedTags: []` |

### Manual / owner matrix (DEV, after implement+deploy)

| Case | ID | Expected |
|------|-----|----------|
| Failing Music | `Wt5eILv4uyCnYNoJI8uZ` Judas Priest Painkiller | Music & Bands |
| Music competitive | `Ai4Wmfp4Vd6Ady2WCsKC` Dolly sheet music | Music & Bands (owner-reviewed) |
| Pop negative | `0UsPRAh0tggzuX8xwWqq` Scooby | Pop Culture & Characters |
| Faith | `8pSowFU1o1H1EjXBaXaA` Christ cross | Faith & Worship |
| Inspirational | one of `74BdnNQuNWz0N0GaL4CO` / `8QpQFWwwfM21WEimy6Vm` / `FRP1L0K6AKq2hrgGnOxX` | Inspirational Quotes & Affirmations |

Read-only extra candidates (do not mutate in plan phase):

| Kind | Example IDs (DEV Ready sample) |
|------|--------------------------------|
| Band-ish / music parody | `KF9D9kaX7JG7FCT3ONxt` What Deaf Leopard |
| Singer / Dolly fandom | `0iwFC9sf7pGyJZTpxdkQ` Smile… Dolly |
| Cartoon fandom | `3Hu3UUNERz4BPwnx5lt8` Mystery Machine Scooby |
| Movie/Disney | `2Nj95YLaLk6763oTrRZw` Gigi With Disney Characters |
| Game-ish | `xTL6Enr3UzQB1ik0VJnF` Level 7 Unlocked… |
| Instrument-centered Ready | **none found** in 500 Ready sample |

---

## Human Checkpoints

- Owner authorize **Implement** after Formal Review.
- Optional: Faith vs Music crossover product rule.
- Owner taxonomy QA after DEV deploy (Judas + Pop + Faith controls).
- No production / Autonomous / WS5.

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Over-broad Music override steals Pop | Require multi-dimension music agreement + Pop-exact gate; franchise/cartoon/game tokens block |
| Faith crossover | Never override Faith exact; faith-dominant blocks Music-from-Pop |
| Tag retirement | No matchedTags dependency |
| Prompt-only false confidence | Resolver is required |

Rollback: revert resolver override (+ optional prompt) and redeploy prior Functions revisions.

---

## Version impact (implement)

| Layer | If resolver-only (recommended minimum) | If + prompt example |
|-------|----------------------------------------|---------------------|
| Prompt | unchanged **v34** | bump **v35** |
| Normalizer | **no** | **no** |
| Schema `smart-profile-v1` | **no** | **no** |

---

## Tag-retirement compatibility

**YES** for recommended approach: override uses themes/interests/searchConcepts/visibleText/title/description/(optional professionsGroups). Reject any design that requires matchedTags/aliases/reranker.

---

## DEV deploy implications (later)

Redeploy Functions bundling resolver / pipeline (at minimum): `enqueueAiEnrichment`, `reprocessReadyDesignWithAi`, `onCatalogReprocessJobWritten`, and if prompt bumped also settings/playground/preview/start as in v34 inventory. No Rules/Storage/indexes/production.

---

## FreshForge impact classification

| Area | Impact |
|------|--------|
| Starter Surface | No |
| Documentation | Yes (plan/review/ADR) |
| Development History | Workflow artifacts only |

---

## Open questions

1. **[NEEDS OWNER DECISION — FAITH VS MUSIC CROSSOVER]** — accept default (never steal Faith exact / faith-dominant) or specify worship-band precedence?
2. Authorize Implement for resolver-only vs resolver+prompt v35?

---

## Success criteria

- Judas Priest Painkiller resolves to Music & Bands without artist hardcoding.
- Scooby / Disney / game Pop goldens unchanged.
- Faith / Inspirational goldens unchanged.
- Works with `matchedTags: []`.
- WS4 remains PASS WITH NOTES until owner closes; WS5 stays blocked.
