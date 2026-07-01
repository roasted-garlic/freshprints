# AI Default Prompt Text Refresh Plan

## Goal

Replace the code-default AI Processing prompt template with the exact prompt text provided by the user, while preserving the required server-side placeholders:

- `{{approved_categories}}`
- `{{approved_tags}}`
- `{{excluded_tags}}`

## Scope

In scope:

- Update the shared default AI prompt template string.
- Keep placeholder validation unchanged unless the new text requires a structural adjustment.
- Update durable docs that describe the default prompt contract so they match the new saved/code fallback text.
- Run focused validation for the shared prompt constant and standard local checks.

Out of scope:

- Changing AI parser behavior, category resolution, tag normalization, or suggested-tag validation.
- Firebase deploys, Functions deploys, secret changes, or environment changes.
- UI layout or Settings UX changes.

## Current Finding

The current default prompt already includes:

- approved category placeholder usage
- approved tag placeholder usage
- excluded tag placeholder usage
- recognizable IP rules

It does not fully match the user-provided text. The largest deltas are:

- missing explicit `Text extraction rules` section
- slightly different wording around scanning the full approved tag list
- slightly different wording around recognizable-property handling

## Proposed Implementation

1. Replace `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` in `shared/constants/aiEnrichment.constants.ts` with the exact approved prompt text.
2. Keep the three required placeholders intact so existing validation and runtime prompt assembly continue to work.
3. Update durable documentation references that describe the default prompt expectations at a high level.
4. Run focused tests/checks:

```powershell
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

If there is an existing focused prompt-constant test, run it as well; otherwise rely on the standard checks.

## Architecture Impact

Low. This is a shared constant update used by:

- renderer Settings fallback/default display
- Functions fallback/default prompt loading
- prompt-template save validation

No layer ownership changes.

## Data Model Impact

None. No schema or persisted field changes.

## Firebase Impact

None for local implementation. Production behavior changes only after a future Functions deploy, which remains a human checkpoint.

## Security Considerations

- No secret handling changes.
- No new external calls.
- Prompt remains server-validated for required placeholders.

## Risks

| Risk | Mitigation |
| --- | --- |
| Prompt text accidentally drops a required placeholder | Keep validation in place and verify the literal placeholders remain present |
| Docs drift from code default | Update the main durable prompt-description docs in the same phase |
| Existing saved settings differ from new default | Acceptable; this phase updates the code default/fallback, not existing stored prompt documents |

## Success Criteria

- The shared default AI prompt exactly matches the user-provided text.
- All three required placeholders remain present.
- Local checks pass or failures are documented honestly.
- Durable docs describing the default prompt are updated to match the new default.
