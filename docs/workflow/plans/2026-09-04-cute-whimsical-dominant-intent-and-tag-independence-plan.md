# Plan: Cute & Whimsical dominant-intent + legacy tag independence gate

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (diagnostic → Plan + Formal Review only) |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Related Formal Review | `docs/workflow/reviews/2026-09-04-cute-whimsical-dominant-intent-and-tag-independence-review.md` |
| Prior signoff | Music-vs-Pop **approved_with_notes** (`2026-09-04-music-vs-pop-dominant-intent-corrective-signoff.md`) |
| Live runtime | `catalog-enrich-v34` / `smart-profile-normalizer-v6` / `smart-profile-v1` · shadow · Autonomous OFF |

---

## Goal

Determine why a clearly whimsical Highland cow design finalizes as **Animals**, whether legacy `matchedTags` materially drive category decisions (tag-retirement risk), and recommend the smallest scalable next corrective—**without implementing** in this pass.

---

## Background

Owner Music-vs-Pop QA **PASS**. New case: Highland cow with exaggerated cute/whimsical aesthetic expected as **Cute & Whimsical**, not **Animals**.

Architecture reminder (unchanged):

- `catalog-enrich-v34` — single vision call → copy + category proposal + Smart Profile evidence  
- `smart-profile-v1` — schema/evidence (not a second classifier)  
- `smart-profile-normalizer-v6` — deterministic normalize  
- `resolveThemeCategory` — trusted final category  
- **No second AI call authorized**

---

## Diagnostic answers

### Highland cow identity

| Field | Live DEV |
|-------|----------|
| Design ID | **`swcJl3RvjTFsf5hp04Ze`** |
| Title | Highland Cow With Flowers And Bow |
| Status | `imported` / `aiReviewStatus: needs_review` |
| Suggested title | Highland Cow |
| Prompt provenance | **catalog-enrich-v34** |
| Final / suggested category | **Animals** (`qhGPaAHPOOmPe7PvQvi0`) |
| Tags | cartoon, country, western |

Smart Profile (matches owner report): subjects cow / Highland cow; objects flowers, bow, daisies; styles cartoon, cute, whimsical, illustration, detailed, hand-drawn; themes cute, animal humor, country life, whimsical; interests animals, country life, pets; searchConcepts Highland cattle, Scottish cow, animal lover, farm, cute animal, flower crown, childlike, thoughtful, livestock.

### Trace

| # | Question | Answer |
|---|----------|--------|
| 1 | Raw Gemini category | **Not persisted.** Reconstruct: exact approved name **Animals** (final = Animals; exact-match path). |
| 2 | Final category | **Animals** |
| 3 | Resolver branch | `findExactCategoryNameMatch("Animals")` → `resolveExactMatchWithDominantIntentOverride` → **return exactMatch** (no Cute override exists; no humor/cannabis/astrology/Music path applies) |
| 4 | Exact-match trust | **YES** |
| 5 | Fallback bypassed | **YES** (exact short-circuit) |
| 6 | Fallback if no exact | Still **Animals** (replay with `rawCategory` omitted; with and without tags) |
| 7 | Cute & Whimsical considered? | **NO — category does not exist in live taxonomy** |
| 8–9 | Animals vs Cute evidence | Animals wins on durable cow/highland/animals/farm tokens; Cute N/A (missing). Rough Animals token-overlap remains high with tags removed. |
| 10 | SP dimensions available | subjects, objects, themes, interests, professionsGroups, searchConcepts, title, description, visibleText, matchedTags; **styles exist on profile but are NOT wired into resolver** |
| 11 | Consumed | Yes for wired fields; **styles ignored** |
| 12 | matchedTags affect? | Tags present but **do not change** exact or fallback outcome for this design |

### Same pattern as Music-vs-Pop?

| Aspect | Music-vs-Pop (Judas) | Highland cow |
|--------|----------------------|--------------|
| Exact broader/wrong category | Yes (Pop) | Yes (Animals) |
| Fallback would pick desired category | **Yes** (Music) | **No** — desired category **absent**; fallback still Animals |
| Taxonomy wording supports desired | Music/Pop reciprocal OK | Animals description **explicitly claims** highland cows + “cute animal art” |

**Conclusion:** Shares exact-match trust, but is **not** the same failure mode. Primary blockers: (1) **Cute & Whimsical missing from active taxonomy**, (2) Animals description claims this subject family, (3) whimsical **styles not in resolver signal bag**.

### Live taxonomy descriptions

**Animals** (revision 17):

> Use this category when an animal is the main subject, strongest visual theme, or primary reason someone would buy the design. Strong signals include … cows, highland cows, … and cute animal art. Examples include … highland cow graphics… Choose this when the animal drives the design; choose the stronger buyer-intent category when the animal is secondary to a holiday, sport, job, family role, cause, western theme, or recognizable pop culture reference.

**Cute & Whimsical:**

> **[ABSENT]** — not in materialization (25 categories) and not in `categories` collection under cute/whims names.

Active names include Animals, Funny & Sarcastic, Kids & Baby, Floral & Nature, Western & Country, etc. — no Cute & Whimsical.

### Options compared

| Option | Verdict |
|--------|---------|
| A. Taxonomy description refinement only | Insufficient alone until Cute category **exists**; Animals wording currently pulls cute highland cows into Animals |
| B. Prompt refinement only | Soft; still exact-match Animals; cannot name a missing category |
| C. Pair-specific Animals→Cute override | Premature — **no approved Cute target**; would hardcode a missing category |
| D. Generalized exact-match structured-evidence second pass | Promising **after** Cute exists + styles/themes whimsical evidence is durable; must stay thresholded, not a 25-way keyword war |
| E. No change / accept Animals | Rejects owner product intent for this aesthetic family |

**Recommended sequence (smallest scalable):**

1. **Owner taxonomy action (human):** create/activate **Cute & Whimsical** with reciprocal wording vs Animals (and list protected domains).  
2. Optionally refine Animals description so “cute animal art / highland cow” is not an automatic Animals claim when whimsical aesthetic dominates.  
3. Then implement the **smallest resolver change**: either (a) wire `styles` into the durable signal bag + bounded Cute-vs-Animals (or generalized) exact-match challenge using themes/styles/searchConcepts—**not tags**, or (b) if after taxonomy+descriptions Gemini already lands Cute reliably, prefer prompt/taxonomy-only and avoid new override.  
4. **Do not** add a second AI call.

### Protected domains (when Cute exists)

Cute must not steal Faith, Inspirational, Music, Occupations/School, Sports, Holiday/Seasonal, Family, Cannabis, Astrology, etc. when those domains dominate. Pattern: Pop→Music-style gate (only challenge certain exact matches; require multi-dimension aesthetic evidence; domain/life-role blockers).

---

## Legacy tag influence audit

Method: deterministic `resolveThemeCategory` replay on live DEV designs — **A** with live `aiSuggestions.tags`, **B** with `matchedTags: []`. No Firestore mutation. Raw for exact replay = live final category (raw not persisted). Artifact: `docs/workflow/reviews/_cute-whimsical-tag-independence-audit-dev.json`.

| Case | ID | Exact w/ tags | Exact w/o tags | Fallback w/ tags | Fallback w/o tags | Changed? |
|------|-----|---------------|----------------|------------------|-------------------|----------|
| Highland cow | `swcJl3RvjTFsf5hp04Ze` | Animals | Animals | Animals | Animals | **NO** |
| Judas | `Wt5eILv4uyCnYNoJI8uZ` | Music & Bands | Music & Bands | (see note) | same | **NO** |
| Dolly | `Ai4Wmfp4Vd6Ady2WCsKC` | Music & Bands | Music & Bands | Music & Bands | Music & Bands | **NO** |
| Scooby | `0UsPRAh0tggzuX8xwWqq` | Pop | Pop | Animals* | Animals* | **NO** |
| Faith | `8pSowFU1o1H1EjXBaXaA` | Faith & Worship | Faith & Worship | Faith & Worship | Faith & Worship | **NO** |
| Inspirational | `74BdnNQuNWz0N0GaL4CO` | Inspirational… | Inspirational… | Inspirational… | Inspirational… | **NO** |
| Humor/Animals F-CAW-F | `7bVlWMFwxECdfHH8VNPB` | Animals | Animals | Animals | Animals | **NO** |
| Cannabis | `w4w0E66YWioBYTkR0aIH` | Cannabis & 420 | Cannabis & 420 | Cannabis & 420 | Cannabis & 420 | **NO** |
| Family-ish dad design | `EBK8d0skHLCXtHssIr9C` | Funny & Sarcastic | Funny & Sarcastic | Funny & Sarcastic | Funny & Sarcastic | **NO** |
| Nurse occupation | `mZWO3Lsra91EhNRNEkhR` | Occupations | Occupations | School & Education* | School & Education* | **NO** |

\*Fallback with non-exact raw can differ from live exact path; **tag removal did not change** either column.

**Classification: `LEGACY TAG INFLUENCE: NON-MATERIAL`**

- `matchedTags` **are consumed** by the generic signal bag (and humor structure helpers)  
- Removing them did **not** change final category on these goldens  
- Music-vs-Pop override already excludes tags from its durable evidence bag  
- **Tag-independence is NOT a prerequisite blocker** for continuing Cute planning  
- Still recommended (later workstream): eventually remove matchedTags from category scoring for cleanliness—not required before Cute taxonomy work

**Not** `[LEGACY TAG DEPENDENCY BLOCKER]`.

---

## Scope

### In Scope (this pass)

- Music-vs-Pop owner PASS + Signoff (separate artifacts)  
- Highland trace + tag A/B audit  
- Plan + Formal Review recommendations  

### Out of Scope

- Implementation, deploy, taxonomy mutation, tag removal, second AI call, prompt/schema/normalizer bumps, WS4 closeout, WS5, production, commit/push

---

## Approach (future implement — gated)

1. Owner confirms/adds **Cute & Whimsical** to active taxonomy + reciprocal Animals wording.  
2. Re-run Highland (and similar) under v34; measure whether Gemini already proposes Cute.  
3. If still Animals-exact: design **bounded** exact-match challenge (prefer generalized thresholded second-pass over endless pair tables); wire **styles** into durable signals; protect domain categories; prove `matchedTags: []`.  
4. Tests + DEV deploy inventory (same enrichment Function family as Music-vs-Pop).

### Version impact (if later implement)

| Layer | Expected |
|-------|----------|
| Prompt | Prefer **no** bump; only if taxonomy+resolver insufficient → owner-gated v35 |
| Normalizer | **no** |
| Schema | **no** (styles already on profile) |

---

## Test Strategy (future)

- Highland → Cute after taxonomy+corrective  
- Literal wildlife / breed photography-style Animals stays Animals  
- Scooby/Faith/Music/Occupations/Holiday protections  
- `matchedTags: []` parity  
- No second AI call  

---

## Human Checkpoints

- **[NEEDS OWNER DECISION — CUTE & WHIMSICAL TAXONOMY]** — Add/activate category + approve Animals reciprocal wording before resolver implement.  
- Authorize Implement only after Formal Review + taxonomy readiness.  
- No WS5 / Autonomous.

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Implement override without category | Forbidden — Formal Review blocks |
| Style-over-domain theft | Domain blockers; Pop-exact-style gating |
| Tag-assisted calibration | Audit shows NON-MATERIAL; still test empty tags |

Rollback (later): revert resolver/taxonomy edits; redeploy prior Functions.

---

## WS4 / WS5

| Item | Status |
|------|--------|
| WS4 | **PASS WITH NOTES** — Music-vs-Pop signed off; Cute/taxonomy diagnostic open — **do not close** |
| WS5 | **BLOCKED** |

---

## Success criteria for this diagnostic pass

- Highland ID and branch traced  
- Tag influence classified NON-MATERIAL  
- Missing Cute category flagged for owner  
- Plan + Formal Review recommend correct sequence  
- No implementation  

---

## Open questions

1. **[NEEDS OWNER DECISION — CUTE & WHIMSICAL TAXONOMY]** Create/activate category now? Exact name and description?  
2. After taxonomy exists, prefer taxonomy+prompt-only first, or proceed directly to bounded resolver challenge?
