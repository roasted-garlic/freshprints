# Signoff: Skeletons alone must not tag Halloween

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Plan | docs/workflow/plans/2026-07-17-skeleton-not-halloween-prompt-plan.md |
| Review | docs/workflow/reviews/2026-07-17-skeleton-not-halloween-prompt-review.md |
| Test report | docs/workflow/reviews/2026-07-17-skeleton-not-halloween-prompt-test-report.md |
| Status | **approved_with_notes** |

---

## Summary

Halloween is no longer preferred for skeleton/skull art in prompts, and a deterministic post-filter strips `halloween` when only skeletal signals are present. ADR-FP-091 recorded. No production deploy. Owner **PASS all** (2026-07-17) closes the optional live Gemini smoke note that remained after code signoff — treat owner QA as **PASS** / closed; live re-run after AI Function redeploy remains an operational nicety, not an open checkpoint.

## Where the rule lives

| Layer | Location |
|-------|----------|
| Lean default prompt | `packages/shared/src/constants/aiEnrichment.constants.ts` → `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` |
| Legacy exclusion section | `functions/src/ai/aiTagExclusions.ts` → `buildTagExclusionPromptSection` |
| Post-process | `functions/src/ai/halloweenTagGuard.ts` (wired in `normalizeSimpleCatalogEnrichment`) |

## Exact guidance added

- Do not use / tag `halloween` for skeleton, skull, or bones alone.
- Require additional Halloween cues (jack-o'-lantern, witches, haunted house, visible "Halloween" text, candy corn, clear holiday motif).
- Do not over-block designs that are clearly Halloween.
- Prefer skeleton/bones/spooky/. - never death or skull (skull remains excluded).

## Files touched

- `functions/src/ai/aiTagExclusions.ts`
- `functions/src/ai/aiTagExclusions.test.ts`
- `functions/src/ai/halloweenTagGuard.ts` (new)
- `functions/src/ai/halloweenTagGuard.test.ts` (new)
- `functions/src/ai/simpleCatalogEnrichmentResponse.ts`
- `functions/src/ai/simpleCatalogEnrichmentResponse.test.ts`
- `functions/src/ai/promptParity.test.ts`
- `functions/src/ai/loadAiEnrichmentSettings.test.ts`
- `packages/shared/src/constants/aiEnrichment.constants.ts`
- `docs/project/DECISIONS.md` (ADR-FP-091)
- Workflow plan / review / test / signoff

## Tests

- Unit: 90 passed
- Functions `npm run build`: passed
- Live Gemini: not separately re-run; owner **PASS all** closes optional smoke checkpoint (2026-07-17)

## Manual tests / approvals

- Manual live QA: **PASS** / closed (owner **PASS all**, 2026-07-17)
- Production deploy: not requested / not done

## Redeploy (owner, operational)

```bash
firebase deploy --only functions:enqueueAiEnrichment,functions:testAiEnrichmentPlayground --project fresh-prints-dev
```

Redeploy still needed for live AI path to pick up prompt/guard if not already deployed; that is ops, not an open human checkpoint.

## Risks / follow-ups

- Existing designs keep old tags until AI re-run.
- Custom Firestore prompts keep working via post-filter; default prompt copies auto-migrate.
- Optional: if Halloween is also chosen as an approved **category** name for skeleton-only art, a later category-guard phase may be needed.

## Final status

**approved_with_notes** — code + unit tests complete; optional live smoke closed by owner **PASS all** (2026-07-17).

