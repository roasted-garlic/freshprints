# Implementation Review: Music & Bands vs Pop Culture dominant-intent corrective

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Reviewer | Implementation / Test Agent |
| Plan | `docs/workflow/plans/2026-09-04-music-vs-pop-dominant-intent-corrective-plan.md` |
| Formal Review | `approved_with_changes` |
| Owner auth | **AUTHORIZE IMPLEMENT — RESOLVER-ONLY** (no v35) |
| Verdict | **approved_with_notes** |
| DEV deploy | **NOT DONE** (this pass) |

---

## Summary

Resolver-only Music-vs-Pop dominant-intent override shipped: exact **Pop Culture & Characters** may yield to **Music & Bands** when durable Smart Profile / copy evidence shows multi-dimension music agreement plus an identity cue, without faith/life-role dominance or strong non-music media/franchise blockers. `professionsGroups` is wired into the generic signal bag. Music category selection uses **name tokens only** (Pop reciprocal descriptions mention Music & Bands and must not match as Music). Prompt remains **v34**; normalizer **v6**; schema **v1**. Tag-retirement compatible (`matchedTags` not required). Focused tests + Functions build PASS. No deploy.

---

## IR checklist (owner-requested)

| # | Item | Result |
|---|------|--------|
| 1 | Verdict | **approved_with_notes** |
| 2 | Exact files changed | See below |
| 3 | Root cause confirmed | Exact Pop match short-circuit; fallback would already pick Music |
| 4 | Exact new resolver branch | `resolveExactMatchWithDominantIntentOverride` → Pop exact + `isMusicDominantOverPop` → `findBestApprovedMusicCategory` |
| 5 | Music signal families | `MUSIC_PRIORITY` + `MUSIC_IDENTITY_TOKENS`; media block `POP_MEDIA_BLOCK_FOR_MUSIC` |
| 6 | professionsGroups wired | **YES** (resolver input + candidateCore + playground + humor profile bag) |
| 7 | matchedTags required | **NO** |
| 8 | works with matchedTags empty | **YES** (fixture) |
| 9 | Pop blockers | cartoon/animation/movie/franchise/gaming/meme/… ≥2 durable hits blocks override |
| 10 | Faith protection | Music override **Pop-exact only**; Faith exact never stolen |
| 11 | life-role protection | `isLifeRoleDominant` (incl. faith) blocks Pop→Music |
| 12 | Judas result | **Music & Bands** (fixture `Wt5eILv4uyCnYNoJI8uZ`-shaped) |
| 13 | Dolly result | **Music & Bands** (sheet-music competitive fixture) |
| 14 | Scooby result | **Pop Culture & Characters** |
| 15 | Faith result | **Faith & Worship** |
| 16 | Inspirational result | **Inspirational Quotes & Affirmations** |
| 17 | other golden regressions | Humor/Animals/Food/Cannabis/Astrology/Family paths still PASS in suite |
| 18 | prompt changed | **NO** |
| 19 | prompt version | **catalog-enrich-v34** |
| 20 | normalizer | **smart-profile-normalizer-v6** |
| 21 | schema | **smart-profile-v1** |
| 22 | tag dependency added | **NO** |
| 23 | tag-retirement compatibility | **YES** |
| 24 | focused tests | **PASS** (41 tests: resolver + smartProfileQuality contract) |
| 25 | Functions build | **PASS** |
| 26 | lint | **PASS** (touched files) |
| 27 | diff-check | **PASS** (LF warnings only) |
| 28 | exact DEV deploy inventory | See below |
| 29 | rollback | Revert resolver/wiring commits + redeploy prior Function revisions |
| 30 | WS4 status | **PASS WITH NOTES** (not closed) |
| 31 | WS5 status | **BLOCKED** |
| 32 | [NEEDS OWNER DECISION] | **None blocking** — next: AUTHORIZE DEV DEPLOY |

---

## Files changed

**Modified**

- `functions/src/ai/catalogThemeCategoryResolver.ts` — Music-vs-Pop override; professionsGroups in signal bag; name-only Music category pick
- `functions/src/ai/catalogThemeCategoryResolver.test.ts` — Judas/Dolly/Scooby/Faith/Inspirational/media fixtures
- `functions/src/ai/aiEnrichmentCandidateCore.ts` — wire `professionsGroups` into resolve input
- `functions/src/ai/aiEnrichmentPlayground.ts` — parity wiring
- `functions/src/ai/smartProfileQuality.contract.test.ts` — assert professionsGroups wiring
- `docs/project/DECISIONS.md` — **ADR-FP-166**
- `docs/standards/TESTING.md` — Music-vs-Pop focused commands

---

## Override shape (implemented)

```
exact Pop Culture & Characters
+ durable musicHits ≥ 2 (excludes matchedTags)
+ music evidence dimensions ≥ 2 (themes / interests / searchConcepts / professionsGroups / title+desc+visibleText)
+ music identity cue (band|album|song|concert|tour|musician|singer|guitar|drums|dj|lyrics|…)
+ not life-role / faith dominant
+ non-music media/franchise durable hits < 2
→ Music & Bands (by category name)
else retain exact Pop
```

**Note:** Selecting Music via name+description token match incorrectly treated Pop (whose description references Music & Bands) as a Music category. Fixed with name-only Music targeting.

---

## Exact DEV deploy inventory (next pass — not deployed now)

Functions bundling resolver / candidate core / playground:

1. `enqueueAiEnrichment`
2. `reprocessReadyDesignWithAi`
3. `onCatalogReprocessJobWritten`
4. `testAiEnrichmentPlayground`
5. `previewCatalogReprocessJob` / `startCatalogReprocessJob` if they bundle the same shared AI path (confirm at deploy time)

Do **not** deploy Rules/Storage/indexes/Hosting/Portal/production. No prompt/settings mutation required for v34.

---

## Notes

- professionsGroups expansion judged safe (additive signal bag; covered by existing + new tests) — no `[NEEDS OWNER DECISION — PROFESSIONSGROUPS RESOLVER EXPANSION]`.
- No `[NEEDS OWNER DECISION — PROMPT CHANGE MAY BE REQUIRED]` — fixtures prove structured evidence sufficient under v34.
- Owner QA after deploy: reprocess `Wt5eILv4uyCnYNoJI8uZ` (expect Music & Bands).
