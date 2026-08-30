# Smart Profile v28 DEV Calibration — Fixture Inventory

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Environment | **fresh-prints-dev** |
| Source | Read-only Firestore sample (`smart-profile-v1`, limit 500 → **75** designs) |
| Script | `functions/scripts/calibration-fixture-inventory-dev-readonly.mjs` |
| Raw output | `docs/workflow/reviews/_calibration-inventory-dev-raw.json` |
| Status | **Candidate set proposed** — owner may swap slots before execution |

---

## Selection method

1. Queried `designs` where `smartProfile.provenance.version == smart-profile-v1` (limit 500; 75 returned).
2. Matched titles against plan archetypes (Highland, Jimothy, Santa, nurse, plant, seasonal, sarcasm, etc.).
3. Identified color-variant pairs by filename/title suffix patterns (`B`/`W`, `_Skeleton`/`_Hand`, `stonernikeswish-*`).
4. **Did not invent IDs** — all IDs below exist in DEV sample as of 2026-08-25T22:02Z.

**Gap:** Catalog may contain additional suitable designs outside the 75-sample. Owner may add/replace via Studio search or re-run inventory script.

**Duplicate excluded:** `bw92yPxUdZlLfcqEr8Mg` (duplicate import of `lcCfstL7rgQcBqrWSstM.png`) — use `Vlsg0P2CbuhTlhVmgYU8` only.

---

## Coverage matrix

| Plan category | Covered by fixture(s) |
|---------------|------------------------|
| Text-only / typography-heavy | `4rG1uHbmqBtOevnDFon6`, `xFrxcn48oXdCmxJCFW9x`, `vMxoB23WlTRIiaTnLkpF` |
| White/light vs dark text (variants) | `keepgrowingB` + `keepgrowingW`; `stonernikeswish-black` + `white` |
| Same-artwork color variants | 3 pairs (see Phase 4 in calibration plan) |
| Text + illustration | `NilC9nqaBALTPgDM1j4q`, `mZWO3Lsra91EhNRNEkhR` |
| Illustration-only | `jnw12AWGtI7bCkM7y9KI`, `Vlsg0P2CbuhTlhVmgYU8` |
| Animals | `yJm2VBRvecPNjx79aSnK`, `6x2LyTvG3ewIePeWHanV`, `QdTEYMNj0GmEk80lPmGq`, `9EGDdQJbi2q15UBqE5Sf` |
| Professions / groups | `mZWO3Lsra91EhNRNEkhR`, `vVimyNMgfF9jEbJSaNSx` |
| Holidays | `W1bwk4jrCoQFn0OiyiSU`, `F3lop71TCy9yEAVktY8s` |
| Sarcasm / humor | `SrDNWipuL0kBj3EuXY2c`, `GIgIAznocv8JJi3gtVCS`, `vMxoB23WlTRIiaTnLkpF` |
| Hobbies / interests | `vVimyNMgfF9jEbJSaNSx`, `ltn0gzs2YGXPADqCejr8` |
| Places | `6x2LyTvG3ewIePeWHanV` (Seattle) |
| Simple designs | `SToRmjOZTLwj5upzjijC`, `9EGDdQJbi2q15UBqE5Sf` |
| Visually complex | `Vlsg0P2CbuhTlhVmgYU8` (stipple), `mN90KyEM2rEOmOXeIbaL` |
| Known Slice 2 cases | Highland, Jimothy, Nurse, Plant Goose, Summer Vibes, Santa-class |

---

## Proposed calibration set (26 designs)

| # | Slot | Design ID | Title | Current prompt | Notes |
|---|------|-----------|-------|----------------|-------|
| 1 | animal_highland | `yJm2VBRvecPNjx79aSnK` | Highland Cow With Bow | v27 | Subject specificity baseline |
| 2 | animal_jimothy | `6x2LyTvG3ewIePeWHanV` | Jimothy Seattle Wildlife… | v27 | Unsupported `people` check |
| 3 | plant_humor | `KI7Ncd1O9JCuX9uCq505` | Oops I Got Another Plant Goose | v27 | Slice 2 QA |
| 4 | profession_nurse | `mZWO3Lsra91EhNRNEkhR` | Nurse Brain Please Don't Interrupt | v27 | Slice 2 QA |
| 5 | holiday_santa | `W1bwk4jrCoQFn0OiyiSU` | I Don't Believe In You Either Santa | v27 | Santa-class humor |
| 6 | seasonal | `ltn0gzs2YGXPADqCejr8` | Summer Vibes Fruits | v27 | Slice 2 QA |
| 7 | color_variant_a | `SrDNWipuL0kBj3EuXY2c` | 3_Sarcastic_HaveTheDayYouDeserve_Skeleton | v27 | Pair with #8 |
| 8 | color_variant_a | `lvTN328EOc9JWazOAs7I` | 3_Sarcastic_HaveTheDayYouDeserve_Hand | v27 | Pair with #7 |
| 9 | color_variant_b | `lbbMZuHQFILqZZmsUWit` | keepgrowingB | v27 | Pair with #10 |
| 10 | color_variant_b | `S9ZeylZt0z0AyA0WFAoX` | keepgrowingW | v27 | Pair with #9 |
| 11 | color_variant_c | `mN90KyEM2rEOmOXeIbaL` | stonernikeswish-black | v27 | Pair with #12 |
| 12 | color_variant_c | `yd2pLu6VsemM2mv9pYUQ` | stonernikeswish-white | v27 | Pair with #11 |
| 13 | complex_illustration | `Vlsg0P2CbuhTlhVmgYU8` | lcCfstL7rgQcBqrWSstM (Grinch stipple) | **v28** | Already on v28; stipple / dark-field |
| 14 | typography_political | `4rG1uHbmqBtOevnDFon6` | OR 05052025 VTN Basic Human Rights… | v27 | Text-dominant |
| 15 | typography_books | `xFrxcn48oXdCmxJCFW9x` | theres no such thing as too many books | v27 | Text-dominant |
| 16 | text_plus_illustration | `NilC9nqaBALTPgDM1j4q` | faith floral design | v27 | Faith + floral |
| 17 | illustration_only | `jnw12AWGtI7bCkM7y9KI` | Book_Reading_Skeleton | v27 | Illustration |
| 18 | hobby_pet | `vVimyNMgfF9jEbJSaNSx` | dog mom social club… | v27 | Hobby / interest |
| 19 | simple_logo | `SToRmjOZTLwj5upzjijC` | HippyRikkylogo | v27 | Simple / logo-like |
| 20 | humor_couple | `F3lop71TCy9yEAVktY8s` | Halloween Couple Shirt… Ghoul | v27 | Complex text + theme |
| 21 | humor_edgy_text | `vMxoB23WlTRIiaTnLkpF` | Lastflyingfuck | v27 | Text-heavy humor |
| 22 | humor_sarcasm | `GIgIAznocv8JJi3gtVCS` | Stop Asking Me Why I'm Crazy - V 4 | v27 | Sarcasm |
| 23 | animal_simple | `9EGDdQJbi2q15UBqE5Sf` | HolyCow | v27 | Simple animal |
| 24 | animal_other | `QdTEYMNj0GmEk80lPmGq` | goat-trans | v27 | Animal / identity |
| 25 | dark_art | `[NEEDS OWNER FIXTURE]` | — | — | Confirm pure dark-art control from DEV library |
| 26 | cream_light_art | `[NEEDS OWNER FIXTURE]` | — | — | Import QA cream PNG; may overlap import corrective |

**Count:** **24 confirmed DEV IDs** (owner approved 2026-08-25; slots #25/#26 skipped as optional).

**Execution result (2026-08-25):** 18 reset/re-enrich completed on v28; **6 blocked** (`ready/approved` — IDs #1–6). See calibration report.

---

## v28 re-run requirement

| Metric | Value |
|--------|-------|
| Fixtures on v28 in sample | 19 total catalog-wide; **1** in proposed set (#13) |
| Fixtures needing reset + Start AI | **23** of 24 confirmed IDs |

All calibration scoring must use profiles generated under **`catalog-enrich-v28`** / **`smart-profile-normalizer-v2`**.

---

## Required core concepts (per-archetype — for hard FAIL checks)

| Archetype | Required concept checks (examples) |
|-----------|-------------------------------------|
| Highland (#1) | `subjects`: highland cow **or** highland (specificity) |
| Jimothy (#2) | `subjects`: raccoon; **must not** require `people` |
| Plant Goose (#3) | `subjects` or `objects`: goose and/or plant |
| Nurse (#4) | `professionsGroups` or `interests`: nurse |
| Text-dominant (#14–15) | At least one text meta when soft check fires |
| Color pairs (#7–12) | Same primary subject/theme across pair (exclude colors) |

Tune required concepts during execution; document in calibration report.

---

## Owner actions before execution

1. **Confirm or adjust** the 26-slot list (swap IDs from raw JSON if preferred).
2. Supply **#25 dark-art control** and **#26 cream/light** if not in inventory.
3. Approve proceeding with **sequential reset + Start AI** on fixture set only.

---

## Explicit non-actions

- No bulk reprocess
- No Slice 5 / 6
- No production
- No refinement signoff from this inventory alone
