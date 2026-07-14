# Plan: Suggested new tags policy settings

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-14-suggested-new-tags-policy-settings-review.md |

---

## Goal

Add a Studio AI Enrichment setting that controls **when** Suggested New Tags are allowed (last-resort policy), with a **Balanced** default that surfaces a few high-value suggestions without overwhelming review. Keep Suggested-tag quality (author) and Tag reranker as separate knobs. No approved-tag list injection.

## Background

Owner has Tag reranker + Suggested-tag quality on Auto, but suggestions rarely appear because the hardcoded last-resort gate suppresses them at 4+ approved matches. Owner wants a tunable setting to test Strict / Balanced / Generous without code changes.

## Scope

### In Scope
- Shared policy enum: `off` | `strict` | `balanced` | `generous` | `always`
- Default: **`balanced`** (allow when approved ≤ 4 and unmatched ≥ 1; hard-cap **3** suggestions)
- Wire policy through `loadAiEnrichmentSettings` / `updateAiEnrichmentSettings` / Studio settings UI + Firestore settings doc
- Use policy inside `resolveAiCatalogTags` + pipeline/playground callers
- Rename UI label: “Suggested-tag quality” → **Suggested-tag writing** (clarify vs new control)
- New UI control: **Suggested new tags** with presets + hints
- Unit tests for policy evaluation + resolver behavior under each policy
- Deploy updated callable(s) to `fresh-prints-dev`

### Out of Scope
- Injecting approved tag names into the vision prompt
- Changing default tag rerank / suggestion-author modes (owner already set Auto in UI)
- AI Review “show rejected candidates” transparency panel (follow-up)
- Production deploy

---

## Affected Areas

### Files / Modules (expected)
- `packages/shared/src/constants/aiEnrichment.constants.ts` (+ small util/tests)
- `functions/src/ai/catalogTagResolver.ts` (+ tests)
- `functions/src/ai/aiEnrichmentPipeline.ts`
- `functions/src/ai/aiEnrichmentPlayground.ts`
- `functions/src/ai/loadAiEnrichmentSettings.ts` (+ tests)
- `functions/src/updateAiEnrichmentSettings.ts`
- Studio: `aiEnrichmentSettingsConstants.ts`, service, hook, `SettingsPage.tsx`, tests
- Docs: SECURITY/DATA_MODEL or DECISIONS brief note if settings fields listed; ROADMAP on signoff

### Architecture Impact
- [x] Details: settings → pipeline resolution only; no new collections

### Security Impact
- [x] Details: same owner/admin-only `updateAiEnrichmentSettings`; validate enum server-side

### Data Model Impact
- [x] Details: optional field `settings/aiEnrichment.suggestedNewTagsPolicy` (string enum). Missing → Balanced default.

### Backend Impact
- [x] Details: load/update settings + tag resolver gate

### UI / UX Impact
- [x] Details: Settings AI Enrichment dropdown; rename author label

### Migration Impact
- [x] Forward: no migration; unset docs resolve to Balanced (behavior change from previous hardcoded Strict)
- [x] Rollback: set policy to `strict` in Settings, or revert code

---

## Approach

1. Add shared `SUGGESTED_NEW_TAGS_POLICIES`, default `balanced`, `resolveSuggestedNewTagsPolicy`, `evaluateSuggestedNewTagsPolicy` (allow + maxSuggestions).
2. Policy semantics:
   - **off** — never suggest (max 0)
   - **strict** — current `isSuggestedTagsLastResort` (≤2; or 3 all-weak + ≥2 unmatched); max 5 via room
   - **balanced** — approved ≤ 4 && unmatched ≥ 1; max **3**
   - **generous** — approved ≤ 6 && unmatched ≥ 1; max **5**
   - **always** — unmatched ≥ 1 (ignore coverage); max **5** (testing)
3. Pass `suggestedNewTagsPolicy` into `resolveAiCatalogTags`; gate + hard-cap remaining room.
4. Persist/load/save through existing settings path; Studio dropdown next to author/rerank.
5. Keep `isSuggestedTagsLastResort` as the Strict implementation (or thin wrapper) for tests/compat.
6. Deploy `updateAiEnrichmentSettings` + enrichment entrypoints that bundle the resolver (dev).

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Unit | shared policy + `catalogTagResolver` tests | yes |
| Unit | `loadAiEnrichmentSettings` / Studio constants resolve | yes |
| Build | `npm run build` in `functions/` | yes |
| Typecheck | Studio/portal if touched | Studio yes |

### Manual
- [x] Settings: change Suggested new tags policy, Save, reload persists
- [x] Process a design under Balanced vs Strict — suggestions appear more often under Balanced without flooding

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review (settings + one AI run comparison)
- [ ] Production deploy

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Balanced default changes existing Strict behavior | medium | Document; owner can set Strict immediately |
| Always floods review | low | Cap 5; label as testing |

---

## Rollback Plan

Set policy to `strict` in Settings, or revert PR / redeploy prior functions.

---

## Documentation Updates Required
- [x] DECISIONS or SECURITY settings note (brief)
- [x] ROADMAP on signoff

---

## Open Questions
- [x] None — product choices locked in prior chat

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-14-suggested-new-tags-policy-settings-review.md
- Verdict: approved
