# Tag Management Alerts, Aliases, and AI Prompt Refresh Plan

Date: 2026-06-30

Managed phase: `tag-management-alerts-aliases-and-ai-prompt-refresh`

## Goal

Apply three narrow follow-up fixes:

* make Tag Management success alerts behave like the existing dismissible timed success alerts
* replace comma-separated alias text entry with chip-style token entry matching existing tag-chip UX
* update the AI Processing prompt template to the newly approved category/tag/exclusion wording and inject approved categories and approved tags server-side

## Approved Scope To Preserve

In scope:

* Tag Management success alert UI and closely related catalog-management success alerts if needed for consistency
* alias input UX for approved tag create/edit and suggested-new-tag approval flows
* shared prompt template constants, validation, prompt assembly, and targeted AI prompt tests
* server-side prompt injection for:
  * `{{approved_categories}}`
  * `{{approved_tags}}`
  * `{{excluded_tags}}`

Out of scope:

* no Firebase rules changes
* no tag/category data model changes
* no change away from `designs.tags: string[]`
* no AI auto-approval or auto-creation behavior change
* no deploy during implementation
* no Portal, Print Runs, ecommerce, checkout, shipping, marketplace, or customer Studio work

## Current Repo Findings

* [TagManagementModal.tsx](../../../../src/renderer/src/features/designs/components/TagManagementModal.tsx) and [CategoryManagementModal.tsx](../../../../src/renderer/src/features/designs/components/CategoryManagementModal.tsx) still render plain `auth-message-success` paragraphs instead of the shared dismissible timed success component.
* The shared timed alert already exists in [DismissibleSuccessAlert.tsx](../../../../src/renderer/src/shared/components/DismissibleSuccessAlert.tsx).
* Tag aliases in Tag Management and AI Review suggested-new-tag approval are still entered through plain comma-separated `TextInput` fields.
* The existing chip input pattern already exists in [TagChipInput.tsx](../../../../src/renderer/src/shared/components/TagChipInput.tsx), but it is design-tag specific and will likely need a generic or alias-safe variant.
* The current default AI Processing prompt in [aiEnrichment.constants.ts](../../../../shared/constants/aiEnrichment.constants.ts) only injects `{{excluded_tags}}`.
* The runtime pipeline already loads active categories and approved tags in [aiEnrichmentPipeline.ts](../../../../functions/src/ai/aiEnrichmentPipeline.ts), but only category names and exclusions are passed into the provider prompt path today.
* Prompt validation in [updateAiEnrichmentSettings.ts](../../../../functions/src/updateAiEnrichmentSettings.ts) currently only enforces `{{excluded_tags}}`.

## Architecture Impact

Renderer:

* swap modal success banners to the shared dismissible success alert
* introduce a shared chip-style token editor suitable for tag aliases

Functions/shared:

* extend AI Processing prompt assembly to inject approved category and tag lists server-side
* keep OpenAI prompting and AI output writes server-side

No component should call Firebase directly.

## Data Model Impact

No data model changes.

Approved tags remain the same documents and `designs.tags` remains `string[]`.

## Firebase Impact

No Firestore rules or document schema changes.

Functions code will change for prompt assembly and prompt-template validation, but deployment remains a separate human checkpoint after implementation.

## Security Considerations

* keep existing owner/admin/helper permission behavior unchanged
* keep prompt editing restricted by the current settings permission gates
* keep bulk import owner-only
* do not relax any backend validation

## UI Plan

### Success Alerts

Use [DismissibleSuccessAlert.tsx](../../../../src/renderer/src/shared/components/DismissibleSuccessAlert.tsx) inside Tag Management where success messages are currently plain paragraphs.

If Category Management uses the same raw success pattern in the same catalog-management surface, bring it into parity in the same pass so behavior is consistent.

### Alias Chip Input

Replace plain alias `TextInput` fields with chip-style token entry in:

* Tag Management create/edit
* AI Review suggested-new-tag approval cards

Implementation direction:

* prefer a shared reusable chip input instead of duplicating logic
* keep aliases normalized by existing catalog-tag normalization rules
* preserve lowercase storage, dedupe, and max-length validation

## AI Prompt Plan

Update the default AI Processing prompt template to:

```txt
Analyze the provided image and return only valid JSON with these fields:
description: clear, accurate 1 to 2 sentence description of the design, including visible text, style, colors, and main visual elements.
category: exactly one category from the approved category list.
title: short searchable design title.
tags: up to 8 lowercase single word tags.

Rules:
Use only an approved category. Do not create new categories.
Choose tags from the approved tag list whenever suitable.
Suggest a new tag only when no approved tag accurately describes an important visible element or theme.
Do not use excluded tags.
Tags must be single words, lowercase, reusable, non duplicated, and accurate.
Avoid overly narrow tags unless they are important to finding the design.

Approved categories:
{{approved_categories}}

Approved tags:
{{approved_tags}}

Excluded tags:
{{excluded_tags}}
```

Implementation direction:

* add new shared placeholder constants for approved categories and approved tags
* update prompt validation so saved prompt templates must include all required placeholders
* pass approved category names and approved tag names into the provider prompt builder
* keep final AI tag normalization and suggested-new-tag generation unchanged after model output

## Files Expected To Change

Implementation files:

* `src/renderer/src/features/designs/components/TagManagementModal.tsx`
* `src/renderer/src/features/designs/components/CategoryManagementModal.tsx` if included for alert parity
* `src/renderer/src/features/ai-review/components/AiReviewSuggestedTagsSection.tsx`
* `src/renderer/src/shared/components/TagChipInput.tsx` or a new adjacent shared chip-input variant
* `shared/constants/aiEnrichment.constants.ts`
* `functions/src/ai/providers/AiEnrichmentProvider.ts`
* `functions/src/ai/simpleCatalogEnrichmentPrompt.ts`
* `functions/src/ai/aiEnrichmentPipeline.ts`
* `functions/src/updateAiEnrichmentSettings.ts`
* related tests under `functions/src/ai/` and `src/renderer/src/features/settings/constants/`

Workflow artifacts:

* `.cursor/workflow/state.md`
* `docs/workflow/reviews/2026-06-30-tag-management-alerts-aliases-and-ai-prompt-refresh-test-report.md`
* `docs/workflow/reviews/2026-06-30-tag-management-alerts-aliases-and-ai-prompt-refresh-signoff.md`

## Tests

Targeted:

```bash
npx tsx --test src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts
cd functions && npx tsx --test src/ai/simpleCatalogEnrichmentResponse.test.ts src/ai/providers/openAiVisionEnrichmentProvider.test.ts src/ai/catalogTagResolver.test.ts
```

Add or extend targeted tests for:

* prompt placeholder validation and injection
* default prompt text expectations
* alias chip input or alias normalization paths if touched

Full local checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Manual QA Checklist

* Open Tag Management as owner/admin and confirm success alerts auto-dismiss and can be closed with `X`.
* Confirm bulk import success messages behave the same way.
* Open create/edit tag and confirm aliases are added/removed as chips instead of raw comma-separated text.
* Approve a suggested new tag in AI Review and confirm alias entry behaves the same way.
* In Settings, confirm the default AI Processing prompt shows the new approved category/tag/exclusion template.
* Save settings with the required placeholders intact and confirm validation blocks removing a required placeholder.

## Risks

| Risk | Mitigation |
| --- | --- |
| Reusing the design tag chip input could apply the wrong limits or hints to aliases | Extract or adapt a shared token-chip input that preserves catalog alias rules |
| Prompt placeholder validation could reject existing saved prompts | Keep validation explicit and update default/fallback prompt sources in shared, renderer, and functions together |
| Approved tags list could become too large for prompt size | Use names only, not full alias/guidance metadata, and keep existing prompt length guardrails |
| UI alert swap could reset modal layout unexpectedly | Reuse the existing success alert component without changing modal state flow |

## Review Gate

Implementation must not start until this plan is approved for the managed phase.
