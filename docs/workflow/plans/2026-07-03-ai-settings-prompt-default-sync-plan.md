# Plan — AI Settings Prompt Default Sync

- **Date:** 2026-07-03
- **Mode:** Managed Phase
- **Goal slug:** `ai-settings-prompt-default-sync`
- **Roadmap phase:** Phase 5 AI Processing maintenance
- **Gate:** Plan → **Review (STOP here)** → Implement → Test → Signoff
- **Human checkpoint:** Firebase Functions deploy remains a separate human checkpoint after approval
  and testing. No deploy is performed in this phase.

---

## 1. Goal

The previous `ai-business-context-prompt` phase added the v21 business-context paragraph to the
shipped default AI Processing prompt, but the Settings prompt editor still shows a saved Firestore
`settings/aiEnrichment.promptTemplate` when one exists. If that saved value is the old shipped
default, the user opens Settings and does not see the new paragraph.

Fix the Settings experience so the v21 paragraph is visible in the prompt editor when the saved
prompt is only a stale copy of the previous default, while preserving truly custom prompts.

---

## 2. Scope

### In scope

- Add a known previous-default prompt constant for the v20 shipped prompt.
- Treat a saved prompt that exactly matches that previous default (after whitespace/line-ending
  normalization) as stale default content and resolve it to the current
  `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`.
- Apply that same resolution in both places that read prompt settings:
  - renderer Settings UI (`resolveClientPromptTemplate`)
  - Cloud Functions settings loader (`resolveAiPromptTemplate`)
- Add an explicit owner-only prompt-editor action to load the current default prompt into the
  textarea. This gives staff a deliberate way to update even if their saved prompt is custom.
- Add focused tests proving:
  - old default resolves to current v21 default in the renderer path
  - old default resolves to current v21 default in the Functions path
  - a custom valid prompt is still preserved

### Out of scope

- No automatic Firestore write or data migration.
- No Firebase Functions deploy.
- No prompt wording change beyond the already-approved v21 default.
- No category resolver, tag resolver, reranker, suggestion-authoring, category data, or tag data
  changes.
- No secrets, rules, indexes, seed writes, migrations, or production console actions.

---

## 3. Design

Create a shared helper around prompt-template normalization:

```txt
saved prompt missing/invalid required placeholders → current default
saved prompt equals known old shipped default → current default
saved prompt is valid custom text → keep saved prompt
```

This is intentionally narrow. It fixes stale saved defaults without silently overwriting custom
owner-authored prompts.

The Settings prompt editor also gets a secondary action, `Use current default`, which sets the
textarea draft to the current default prompt. Saving remains explicit through the existing
`Save AI enrichment settings` button and existing callable authorization.

---

## 4. Expected Files

| File | Change |
|---|---|
| `shared/constants/aiEnrichment.constants.ts` | Add previous-default prompt constant and stale-default detection helper. |
| `src/renderer/src/features/settings/services/aiEnrichmentSettingsService.ts` | Resolve stale saved default to current v21 default. |
| `functions/src/ai/loadAiEnrichmentSettings.ts` | Resolve stale saved default to current v21 default for actual AI Processing. |
| `src/renderer/src/features/settings/pages/SettingsPage.tsx` | Add `Use current default` action in the unlocked prompt editor. |
| `src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts` | Add renderer resolver coverage. |
| `functions/src/ai/loadAiEnrichmentSettings.test.ts` | Add Functions resolver coverage. |
| `.cursor/workflow/state.md` | Track this managed phase. |

---

## 5. Acceptance Criteria

- [ ] If `settings/aiEnrichment.promptTemplate` is the previous shipped default, Settings displays
      the current v21 default prompt with the business-context paragraph.
- [ ] Actual AI Processing also resolves that stale saved default to the current v21 default.
- [ ] Valid custom owner-authored prompts are not silently replaced.
- [ ] Prompt editor offers an explicit `Use current default` action.
- [ ] No Firestore writes happen unless the owner/admin clicks the existing save button.
- [ ] No deploy, secrets, rules, seed writes, migrations, or resolver/tag pipeline changes.
- [ ] Focused tests pass.
- [ ] Root typecheck, lint, and `git diff --check` pass.

---

## 6. Testing Plan

- `npx tsx --test src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts`
- `npx tsx --test functions/src/ai/loadAiEnrichmentSettings.test.ts`
- `npx tsc --noEmit`
- `npm run lint`
- `git diff --check`

Optional after approval: run `npx vite build` if the UI edit touches enough surface to warrant a
bundle check.

---

## 7. Risks

- A user may have intentionally saved a prompt identical to the old default. In practice that is
  stale default content, so resolving it to the new default is the desired behavior.
- A user with a custom prompt that lacks the v21 paragraph will still see their custom prompt until
  they explicitly choose `Use current default` or edit it manually. This is intentional; the app
  should not silently overwrite custom production prompt text.

---

## 8. Review Decision Needed

Approve this plan to implement the stale-default resolver plus the prompt-editor `Use current
default` action.
